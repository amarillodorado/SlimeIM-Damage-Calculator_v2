import { blankAttack, blankAttacker, blankEnemy, defaultWorkspace, newId } from './defaults';
import { EFFECT_BY_ID } from './effects';
import { MAX_PROVIDERS, MAX_PROVIDER_COST, MAX_PROVIDER_EFFECTS, MAX_PROVIDER_EFFECT_VALUE, MAX_PROVIDER_NAME, MAX_PROVIDER_NOTE } from './providerLimits';
import type { SupportUnit, UnitEffect } from './teams';
import {
  ATTRIBUTES,
  EFFECT_TYPE_IDS,
  INPUT_KEYS,
  type Attack,
  type Attacker,
  type EffectEntries,
  type EffectValues,
  type Enemy,
  type Hit,
  type InputConfirmations,
  type Workspace,
} from './types';

/**
 * Validation for anything that comes from outside the app (browser storage,
 * share links, hand-edited JSON). Invalid parts fall back to defaults; it never throws.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const num = (v: unknown, fallback: number, min = -1e12, max = 1e12) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const str = (v: unknown, fallback = '', maxLength = 80) => (typeof v === 'string' ? v.slice(0, maxLength) : fallback);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

const ATTRIBUTE_FILTER = [...ATTRIBUTES, 'any'] as const;
const PROC = ['off', 'normal', 'super'] as const;

function confirmations(raw: unknown): InputConfirmations {
  if (!isObj(raw)) return {};
  return Object.fromEntries(INPUT_KEYS.filter((key) => raw[key] === true).map((key) => [key, true]));
}

function attacker(raw: unknown): Attacker {
  const b = blankAttacker();
  if (!isObj(raw)) return b;
  const tau = isObj(raw.tau) ? raw.tau : {};
  return {
    name: str(raw.name),
    attribute: oneOf(raw.attribute, ATTRIBUTES, b.attribute),
    plus: bool(raw.plus, b.plus),
    attackType: oneOf(raw.attackType, ['physical', 'magic'] as const, b.attackType),
    atkMode: oneOf(raw.atkMode, ['battle', 'build'] as const, b.atkMode),
    battleAtk: num(raw.battleAtk, b.battleAtk, 0),
    // The older character + support ATK is not a troop ATK, so pre-battle setups ask for it again.
    troopAtk: num(raw.troopAtk, b.troopAtk, 0),
    supportAtk: num(raw.supportAtk, b.supportAtk, 0),
    ownDef: num(raw.ownDef, b.ownDef, 0),
    comboBuddyAtk1: num(raw.comboBuddyAtk1, 0, 0),
    comboBuddyAtk2: num(raw.comboBuddyAtk2, 0, 0),
    tau: {
      active: bool(tau.active, b.tau.active),
      weak: num(tau.weak, b.tau.weak, 0, 10),
      superWeak: num(tau.superWeak, b.tau.superWeak, 0, 10),
    },
  };
}

function attack(raw: unknown): Attack {
  const b = blankAttack();
  if (!isObj(raw)) return b;
  const kind = raw.kind === 'skill' ? 'soul' : oneOf(raw.kind, ['soulOfCombos', 'soul'] as const, b.kind);
  const power = num(raw.power, kind === 'soul' ? 100 : b.power, 0, 100000);
  const normalPowerOverride = bool(raw.normalPowerOverride, kind === 'soul' && power !== 100);
  return {
    // v6.0 had a 'skill' hit type (damaging battle skills); it is treated as a normal orb now.
    kind,
    power: kind === 'soul' && !normalPowerOverride ? 100 : power,
    // Preserve an old explicit nonstandard orb power for review, not as a silent baseline.
    normalPowerOverride,
    variant: oneOf(raw.variant, ['normal', 'ex', 'ultimate'] as const, b.variant),
    // Missing, empty or invalid saved values fall back to the 40% default.
    ultimateBonus: num(raw.ultimateBonus, b.ultimateBonus ?? 40, -100, 1000),
    target: oneOf(raw.target, ['single', 'all'] as const, b.target),
    comboMultiplier: num(raw.comboMultiplier, 1, 0, 1000),
    matchup: oneOf(raw.matchup, ['auto', 'advantage', 'neutral', 'disadvantage'] as const, b.matchup),
    popup: oneOf(raw.popup, ['none', 'weak', 'superWeak'] as const, b.popup),
    crit: bool(raw.crit, b.crit),
    pierce: oneOf(raw.pierce, PROC, b.pierce),
    synergy: oneOf(raw.synergy, PROC, b.synergy),
    aegis: oneOf(raw.aegis, PROC, b.aegis),
  };
}

function enemy(raw: unknown): Enemy {
  const b = blankEnemy();
  if (!isObj(raw)) return b;
  return {
    confirmed: confirmations(raw.confirmed),
    name: str(raw.name),
    attribute: oneOf(raw.attribute, ATTRIBUTES, b.attribute),
    def: num(raw.def, b.def, 0),
    physRes: num(raw.physRes, b.physRes, -1000, 1000),
    magicRes: num(raw.magicRes, b.magicRes, -1000, 1000),
    stunned: bool(raw.stunned, b.stunned),
    enamored: bool(raw.enamored, b.enamored),
    guard: oneOf(raw.guard, ['none', 'guard', 'superGuard'] as const, b.guard),
  };
}

function unitEffect(raw: unknown): UnitEffect | null {
  if (!isObj(raw)) return null;
  const type = oneOf(raw.type, EFFECT_TYPE_IDS, 'rate');
  if (raw.type !== type) return null;
  return {
    type,
    value: num(raw.value, 0, -MAX_PROVIDER_EFFECT_VALUE, MAX_PROVIDER_EFFECT_VALUE),
    attribute: oneOf(raw.attribute, ATTRIBUTE_FILTER, 'any'),
    attackType: oneOf(raw.attackType, ['any', 'physical', 'magic'] as const, 'any'),
    target: oneOf(raw.target, ['any', 'single', 'all'] as const, 'any'),
  };
}

/**
 * Buff values: one total per type. Saves from before 2026-11-01 kept a list of
 * entries (with source, on/off switch and attribute); those are added up per
 * type, skipping switched-off entries and other attributes.
 */
function effects(raw: unknown, a: Attacker, e: Enemy): EffectValues {
  const out: EffectValues = {};
  const add = (type: (typeof EFFECT_TYPE_IDS)[number], value: number) => {
    if (value !== 0 && EFFECT_BY_ID[type].category !== 'noEffect') out[type] = num((out[type] ?? 0) + value, 0, -100000, 100000);
  };
  if (Array.isArray(raw)) {
    for (const r of raw.slice(0, 100)) {
      const entry = unitEffect(r);
      if (!entry || (isObj(r) && r.enabled === false)) continue;
      const bound = EFFECT_BY_ID[entry.type].attribute;
      if (bound && entry.attribute !== 'any' && entry.attribute !== (bound === 'enemy' ? e.attribute : a.attribute)) continue;
      add(entry.type, entry.value);
    }
  } else if (isObj(raw)) {
    for (const type of EFFECT_TYPE_IDS) add(type, num(raw[type], 0, -100000, 100000));
  }
  return out;
}

export function normalizeHit(raw: unknown, enemyOfHit: Enemy = blankEnemy()): Hit {
  const r = isObj(raw) ? raw : {};
  const a = attacker(r.attacker);
  const totals = effects(r.effects, a, enemyOfHit);
  const effectEntries: EffectEntries = {};
  if (isObj(r.effectEntries)) {
    for (const type of EFFECT_TYPE_IDS) {
      const rawEntries = r.effectEntries[type];
      if (!Array.isArray(rawEntries) || EFFECT_BY_ID[type].category === 'noEffect') continue;
      const entries = rawEntries.slice(0, 100).map((entry) => num(entry, 0, -100000, 100000));
      effectEntries[type] = entries;
      const total = entries.reduce((sum, value) => sum + value, 0);
      if (total === 0) delete totals[type];
      else totals[type] = total;
    }
  } else if (Array.isArray(r.effects)) {
    // Legacy entry-list saves can preserve their original signs and rounding.
    for (const type of EFFECT_TYPE_IDS) delete totals[type];
    for (const rawEntry of r.effects.slice(0, 100)) {
      if (!isObj(rawEntry) || rawEntry.enabled === false) continue;
      const entry = unitEffect(rawEntry);
      if (!entry || EFFECT_BY_ID[entry.type].category === 'noEffect') continue;
      const bound = EFFECT_BY_ID[entry.type].attribute;
      if (bound && entry.attribute !== 'any' && entry.attribute !== (bound === 'enemy' ? enemyOfHit.attribute : a.attribute)) continue;
      if (entry.attackType && entry.attackType !== 'any' && entry.attackType !== a.attackType) continue;
      const target = attack(r.attack).target;
      if (entry.target && entry.target !== 'any' && entry.target !== target) continue;
      (effectEntries[entry.type] ??= []).push(entry.value);
      totals[entry.type] = (totals[entry.type] ?? 0) + entry.value;
      if (totals[entry.type] === 0) delete totals[entry.type];
    }
  }
  return {
    id: str(r.id, '', 64) || newId(),
    attacker: a,
    attack: attack(r.attack),
    effects: totals,
    effectEntries,
    observed: num(r.observed, 0, 0),
    confirmed: confirmations(r.confirmed),
  };
}

export function normalizeWorkspace(raw: unknown): Workspace {
  if (!isObj(raw) || !Array.isArray(raw.hits) || raw.hits.length === 0) return defaultWorkspace();
  const e = enemy(raw.enemy);
  const hits = raw.hits.slice(0, 12).map((h) => normalizeHit(h, e));
  // Duplicate ids (hand-edited data) would break React keys and selection.
  const seen = new Set<string>();
  for (const h of hits) {
    if (seen.has(h.id)) h.id = newId();
    seen.add(h.id);
  }
  const activeHitId = typeof raw.activeHitId === 'string' && hits.some((h) => h.id === raw.activeHitId) ? raw.activeHitId : hits[0]!.id;
  return { version: 6, highlightRequired: bool(raw.highlightRequired, true), enemy: e, hits, activeHitId };
}

export function normalizeUnits(raw: unknown): SupportUnit[] {
  if (!Array.isArray(raw)) return [];
  const units = raw.slice(0, MAX_PROVIDERS).flatMap((u): SupportUnit[] => {
    if (!isObj(u) || typeof u.name !== 'string') return [];
    const t = isObj(u.triggers) ? u.triggers : {};
    return [
      {
        id: str(u.id, '', 64) || newId(),
        name: str(u.name, 'Unit', MAX_PROVIDER_NAME),
        skillCost: num(u.skillCost, 0, 0, MAX_PROVIDER_COST),
        icon: typeof u.icon === 'string' && /^units\/[\w.-]+\.png$/.test(u.icon) ? u.icon : undefined,
        effects: Array.isArray(u.effects)
          ? u.effects
              .slice(0, MAX_PROVIDER_EFFECTS)
              .map(unitEffect)
              .filter((e): e is UnitEffect => e !== null)
          : [],
        triggers: { crit: bool(t.crit, false), pierce: bool(t.pierce, false), synergy: bool(t.synergy, false), aegis: bool(t.aegis, false) },
        note: typeof u.note === 'string' ? u.note.slice(0, MAX_PROVIDER_NOTE) : undefined,
      },
    ];
  });
  const seen = new Set<string>();
  for (const unit of units) {
    while (!unit.id.trim() || seen.has(unit.id)) unit.id = newId();
    seen.add(unit.id);
  }
  return units;
}
