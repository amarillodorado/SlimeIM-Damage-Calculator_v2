import type { SupportUnit, UnitEffect, UnitTriggers } from './teams';
import { ATTRIBUTES, EFFECT_TYPE_IDS } from './types';
import { MAX_PROVIDER_COST, MAX_PROVIDER_EFFECTS, MAX_PROVIDER_EFFECT_VALUE, MAX_PROVIDER_NAME, MAX_PROVIDER_NOTE } from './providerLimits';

const FORMAT = 'slimeim-buff-providers';
const VERSION = 1;
const MAX_ID = 64;
type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);

function record(value: unknown, path: string): RecordValue {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`);
  return value;
}

function knownFields(value: RecordValue, allowed: readonly string[], path: string) {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown !== undefined) throw new Error(`${path} contains an unsupported field: ${unknown}.`);
}

function nonemptyString(value: unknown, max: number, path: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${path} must contain 1–${max} characters and cannot be blank.`);
  return value;
}

function choice<T extends string>(value: unknown, choices: readonly T[], path: string, fallback?: T): T {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new Error(`${path} has an unsupported value.`);
  return value as T;
}

function effect(value: unknown, path: string): UnitEffect {
  const raw = record(value, path);
  knownFields(raw, ['type', 'value', 'attribute', 'attackType', 'target'], path);
  const type = choice(raw.type, EFFECT_TYPE_IDS, `${path}.type`);
  if (typeof raw.value !== 'number' || !Number.isFinite(raw.value) || Math.abs(raw.value) > MAX_PROVIDER_EFFECT_VALUE)
    throw new Error(`${path}.value must be a finite number between −${MAX_PROVIDER_EFFECT_VALUE} and ${MAX_PROVIDER_EFFECT_VALUE}.`);
  return {
    type,
    value: raw.value,
    attribute: choice(raw.attribute, [...ATTRIBUTES, 'any'] as const, `${path}.attribute`, 'any'),
    attackType: choice(raw.attackType, ['any', 'physical', 'magic'] as const, `${path}.attackType`, 'any'),
    target: choice(raw.target, ['any', 'single', 'all'] as const, `${path}.target`, 'any'),
  };
}

function triggers(value: unknown, path: string): UnitTriggers {
  const raw = value === undefined ? {} : record(value, path);
  const keys = ['crit', 'pierce', 'synergy', 'aegis'] as const;
  knownFields(raw, keys, path);
  const result: UnitTriggers = {};
  for (const key of keys) {
    if (raw[key] !== undefined && typeof raw[key] !== 'boolean') throw new Error(`${path}.${key} must be true or false.`);
    result[key] = raw[key] === true;
  }
  return result;
}

function provider(value: unknown, index: number): SupportUnit {
  const path = `Provider ${index + 1}`;
  const raw = record(value, path);
  knownFields(raw, ['id', 'name', 'skillCost', 'icon', 'effects', 'triggers', 'note', 'enabled'], path);
  if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') throw new Error(`${path}.enabled must be true or false.`);
  const id = nonemptyString(raw.id, MAX_ID, `${path}.id`);
  const name = nonemptyString(raw.name, MAX_PROVIDER_NAME, `${path}.name`);
  if (typeof raw.skillCost !== 'number' || !Number.isInteger(raw.skillCost) || raw.skillCost < 0 || raw.skillCost > MAX_PROVIDER_COST)
    throw new Error(`${path}.skillCost must be a whole number between 0 and ${MAX_PROVIDER_COST}.`);
  if (!Array.isArray(raw.effects) || raw.effects.length > MAX_PROVIDER_EFFECTS)
    throw new Error(`${path}.effects must be an array of at most ${MAX_PROVIDER_EFFECTS} effects.`);
  if (raw.icon !== undefined && (typeof raw.icon !== 'string' || !/^units\/[\w.-]+\.png$/.test(raw.icon)))
    throw new Error(`${path}.icon must be a local units/*.png image path.`);
  if (raw.note !== undefined && (typeof raw.note !== 'string' || raw.note.length > MAX_PROVIDER_NOTE))
    throw new Error(`${path}.note must be text of at most ${MAX_PROVIDER_NOTE} characters.`);
  return {
    id,
    name,
    ...(raw.enabled === undefined ? {} : { enabled: raw.enabled as boolean }),
    skillCost: raw.skillCost,
    ...(raw.icon === undefined ? {} : { icon: raw.icon as string }),
    effects: raw.effects.map((entry, effectIndex) => effect(entry, `${path}, effect ${effectIndex + 1}`)),
    triggers: triggers(raw.triggers, `${path}.triggers`),
    ...(raw.note === undefined ? {} : { note: raw.note as string }),
  };
}

/** Strict validation rejects the whole list rather than dropping or truncating entries. */
function providerList(value: unknown): SupportUnit[] {
  if (!Array.isArray(value)) throw new Error('The file must contain a providers array.');
  const result = value.map(provider);
  const seen = new Set<string>();
  for (const unit of result) {
    if (seen.has(unit.id)) throw new Error(`The provider file contains a duplicate ID: ${unit.id}.`);
    seen.add(unit.id);
  }
  return result;
}

/** Accept the versioned format or an older raw provider array; do not alter current data on failure. */
export function parseProviderFile(text: string): SupportUnit[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('The provider file is not valid JSON.');
  }
  if (Array.isArray(parsed)) return providerList(parsed);
  const envelope = record(parsed, 'The provider file');
  if (envelope.format !== FORMAT) throw new Error('This is not a Slime IM buff-provider file.');
  if (envelope.version !== VERSION) throw new Error('This provider file version is not supported.');
  knownFields(envelope, ['format', 'version', 'providers'], 'The provider file');
  return providerList(envelope.providers);
}

/** A portable backup contains provider data only, without the Calculator setup or comparison rules. */
export function exportProviderFile(providers: SupportUnit[]): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, providers: providerList(providers) }, null, 2) + '\n';
}

export interface ProviderMergeResult {
  providers: SupportUnit[];
  added: number;
  updated: number;
  unchanged: number;
}

/** Import by stable ID: update existing entries in place, append new entries, and preserve other providers. */
export function mergeProviders(current: SupportUnit[], incoming: SupportUnit[]): ProviderMergeResult {
  const providers = providerList(current);
  const imported = providerList(incoming);
  const positions = new Map(providers.map((unit, index) => [unit.id, index]));
  let added = 0,
    updated = 0,
    unchanged = 0;
  for (const unit of imported) {
    const index = positions.get(unit.id);
    if (index === undefined) {
      positions.set(unit.id, providers.length);
      providers.push(unit);
      added++;
    } else if (JSON.stringify(providers[index]) === JSON.stringify(unit)) {
      unchanged++;
    } else {
      providers[index] = unit;
      updated++;
    }
  }
  return { providers, added, updated, unchanged };
}
