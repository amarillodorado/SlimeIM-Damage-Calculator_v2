import { normalizeWorkspace } from './normalize';
import { ATTRIBUTES, EFFECT_TYPE_IDS, INPUT_KEYS, type Workspace } from './types';

export const MAX_EFFECT_SOURCES = 100;
export const MAX_WORKSPACE_BYTES = 1024 * 1024;
export const WORKSPACE_FORMAT = 'slimeim-workspace';
type RecordValue = Record<string, unknown>;
const object = (v: unknown): v is RecordValue => typeof v === 'object' && v !== null && !Array.isArray(v);
function fail(name: string): never {
  throw new Error(`Invalid workspace: ${name}. Your current workspace has not been changed.`);
}
function record(v: unknown, name: string): RecordValue {
  return object(v) ? v : fail(`${name} must be an object`);
}
function number(v: unknown, name: string, min = -1e12, max = 1e12) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(`${name} is out of range`);
}
function options(v: unknown, values: readonly string[], name: string) {
  if (typeof v !== 'string' || !values.includes(v)) fail(`${name} has an unsupported value`);
}
function text(v: unknown, name: string, max = 80) {
  if (typeof v !== 'string' || v.length > max) fail(`${name} must be text of at most ${max} characters`);
}
function booleans(raw: RecordValue, keys: string[], name: string) {
  for (const key of keys) if (raw[key] !== undefined && typeof raw[key] !== 'boolean') fail(`${name}.${key} must be true or false`);
}
function confirmations(v: unknown) {
  if (v === undefined) return;
  const r = record(v, 'confirmations');
  for (const [key, value] of Object.entries(r))
    if (!(INPUT_KEYS as readonly string[]).includes(key) || typeof value !== 'boolean') fail('unsupported input confirmation');
}

/** Validate external input before tolerant storage migration. Broken imports must never become blank workspaces. */
export function validateWorkspaceData(value: unknown): Workspace {
  const r = record(value, 'workspace');
  if (r.version !== undefined && r.version !== 6) fail('unsupported workspace version');
  booleans(r, ['highlightRequired'], 'workspace');
  if (!Array.isArray(r.hits) || r.hits.length < 1 || r.hits.length > 12) fail('provide 1–12 setups');
  const enemy = record(r.enemy, 'enemy');
  text(enemy.name, 'enemy.name');
  options(enemy.attribute, ATTRIBUTES, 'enemy.attribute');
  number(enemy.def, 'enemy.def', 0);
  number(enemy.physRes, 'enemy.physRes', -1000, 1000);
  number(enemy.magicRes, 'enemy.magicRes', -1000, 1000);
  options(enemy.guard, ['none', 'guard', 'superGuard'], 'enemy.guard');
  booleans(enemy, ['stunned', 'enamored'], 'enemy');
  for (const key of ['stunned', 'enamored']) if (typeof enemy[key] !== 'boolean') fail(`enemy.${key} must be true or false`);
  confirmations(enemy.confirmed);
  for (const [index, item] of r.hits.entries()) {
    const h = record(item, `setup ${index + 1}`);
    if (h.id !== undefined) text(h.id, 'setup ID', 64);
    const a = record(h.attacker, 'attacker');
    text(a.name, 'attacker.name');
    options(a.attribute, ATTRIBUTES, 'attacker.attribute');
    options(a.attackType, ['physical', 'magic'], 'attack type');
    options(a.atkMode, ['battle', 'build'], 'ATK mode');
    for (const key of ['battleAtk', 'supportAtk', 'ownDef']) number(a[key], `attacker.${key}`, 0);
    for (const key of ['troopAtk', 'comboBuddyAtk1', 'comboBuddyAtk2']) if (a[key] !== undefined) number(a[key], `attacker.${key}`, 0);
    booleans(a, ['plus'], 'attacker');
    if (typeof a.plus !== 'boolean') fail('attacker.plus must be true or false');
    if (a.atkMode === 'build') number(a.troopAtk, 'troop ATK', 0);
    const tau = record(a.tau, 'True Attribute Unbound');
    booleans(tau, ['active'], 'TAU');
    if (typeof tau.active !== 'boolean') fail('TAU.active must be true or false');
    number(tau.weak, 'TAU weak factor', 0, 10);
    number(tau.superWeak, 'TAU Super Weak factor', 0, 10);
    const k = record(h.attack, 'attack');
    options(k.kind, ['soul', 'soulOfCombos'], 'soul type');
    options(k.variant, ['normal', 'ex', 'ultimate'], 'version');
    number(k.power, 'soul power', 0, 100000);
    if (k.ultimateBonus !== undefined && k.ultimateBonus !== null) number(k.ultimateBonus, 'Ultimate bonus', -100, 1000);
    if (k.comboMultiplier !== undefined) number(k.comboMultiplier, 'combo multiplier', 0, 1000);
    options(k.target, ['single', 'all'], 'target');
    options(k.matchup, ['auto', 'advantage', 'neutral', 'disadvantage'], 'matchup');
    options(k.popup, ['none', 'weak', 'superWeak'], 'weakness result');
    for (const key of ['pierce', 'synergy', 'aegis']) options(k[key], ['off', 'normal', 'super'], key);
    booleans(k, ['crit', 'superCrit', 'normalPowerOverride'], 'attack');
    if (typeof k.crit !== 'boolean') fail('Critical must be true or false');
    for (const [key, v] of Object.entries(record(h.effects, 'effects'))) {
      if (!(EFFECT_TYPE_IDS as readonly string[]).includes(key)) fail(`unknown effect ${key}`);
      number(v, key, -100000 * MAX_EFFECT_SOURCES, 100000 * MAX_EFFECT_SOURCES);
    }
    if (h.effectEntries !== undefined) {
      for (const [key, entries] of Object.entries(record(h.effectEntries, 'effect sources'))) {
        if (!(EFFECT_TYPE_IDS as readonly string[]).includes(key)) fail(`unknown source type ${key}`);
        if (!Array.isArray(entries) || entries.length > MAX_EFFECT_SOURCES)
          fail(`each effect supports at most ${MAX_EFFECT_SOURCES} sources; combine same-sign sources first`);
        for (const entry of entries) number(entry, `${key} source`, -100000, 100000);
      }
    }
    if (h.observed !== undefined) number(h.observed, 'observed damage', 0);
    confirmations(h.confirmed);
  }
  if (r.activeHitId !== undefined) {
    text(r.activeHitId, 'active setup ID', 64);
    if (!r.hits.some((hit) => object(hit) && hit.id === r.activeHitId)) fail('the selected setup does not exist');
  }
  return normalizeWorkspace(r);
}

export function workspaceEnvelope(workspace: Workspace) {
  return { format: WORKSPACE_FORMAT, version: 1, workspace: validateWorkspaceData(workspace) };
}
export function parseWorkspaceValue(value: unknown, allowLegacy = false): Workspace {
  const envelope = record(value, 'file');
  if (envelope.format === undefined && allowLegacy) return validateWorkspaceData(envelope);
  if (envelope.format !== WORKSPACE_FORMAT || envelope.version !== 1) fail('unsupported workspace file format or version');
  if (Object.keys(envelope).some((key) => !['format', 'version', 'workspace'].includes(key))) fail('unsupported file fields');
  return validateWorkspaceData(envelope.workspace);
}
export function exportWorkspaceFile(workspace: Workspace): string {
  const json = JSON.stringify(workspaceEnvelope(workspace), null, 2) + '\n';
  if (new TextEncoder().encode(json).byteLength > MAX_WORKSPACE_BYTES) fail('workspace exceeds the 1 MB limit');
  return json;
}
export function parseWorkspaceFile(text: string): Workspace {
  if (new TextEncoder().encode(text).byteLength > MAX_WORKSPACE_BYTES) fail('file exceeds the 1 MB limit');
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return fail('the file is not valid JSON');
  }
  return parseWorkspaceValue(value);
}
