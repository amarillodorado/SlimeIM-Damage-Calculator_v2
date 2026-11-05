import { EFFECT_BY_ID } from './effects';
import { damageAt, type HitInput } from './engine';
import type { AttackType, AttributeFilter, EffectTypeId, EffectValues, Proc, TargetType } from './types';

export interface UnitEffect {
  type: EffectTypeId;
  value: number;
  attribute: AttributeFilter;
  /** Missing scopes in older saves mean the user must verify applicability. */
  attackType?: AttackType | 'any';
  target?: TargetType | 'any';
}

/** Selected special-hit outcomes supplied by a buff provider for this hit. */
export interface UnitTriggers {
  crit?: boolean;
  pierce?: boolean;
  synergy?: boolean;
  aegis?: boolean;
}

export interface SupportUnit {
  id: string;
  name: string;
  /** Stored library entries can be excluded from comparisons without deleting them. */
  enabled?: boolean;
  skillCost: number;
  icon?: string;
  effects: UnitEffect[];
  triggers: UnitTriggers;
  note?: string;
}

export interface TeamResult {
  units: SupportUnit[];
  cost: number;
  damage: number;
}

export const MAX_COMBINATIONS = 250_000;

const enable = (mode: Proc, on?: boolean): Proc => (on && mode === 'off' ? 'normal' : mode);

/** Attribute-bound effects (“damage vs. wind enemies”, “dark ATK”) only count for that attribute. */
function matchesAttribute(e: UnitEffect, input: HitInput): boolean {
  if (e.attackType && e.attackType !== 'any' && e.attackType !== input.attacker.attackType) return false;
  if (e.target && e.target !== 'any' && e.target !== input.attack.target) return false;
  const bound = EFFECT_BY_ID[e.type].attribute;
  if (!bound || e.attribute === 'any') return true;
  return e.attribute === (bound === 'enemy' ? input.enemy.attribute : input.attacker.attribute);
}

/** The hit plus the units' effects (same types add up) and special hits (OR). */
export function applyUnits(base: HitInput, units: SupportUnit[]): HitInput {
  const effects: EffectValues = { ...base.effects };
  const effectEntries = { ...base.effectEntries };
  let attack = base.attack;
  units.forEach((u) => {
    for (const e of u.effects) {
      if (!matchesAttribute(e, base)) continue;
      const entries = effectEntries[e.type] ?? [effects[e.type] ?? 0];
      effectEntries[e.type] = [...entries, e.value];
      effects[e.type] = effectEntries[e.type]!.reduce((sum, value) => sum + value, 0);
    }
    attack = {
      ...attack,
      crit: attack.crit || !!u.triggers.crit,
      pierce: enable(attack.pierce, u.triggers.pierce),
      synergy: enable(attack.synergy, u.triggers.synergy),
      aegis: enable(attack.aegis, u.triggers.aegis),
    };
  });
  return { ...base, attack, effects, effectEntries };
}

export function* combinations<T>(items: T[], size: number, start = 0, picked: T[] = []): Generator<T[]> {
  if (picked.length === size) {
    yield picked.slice();
    return;
  }
  for (let i = start; i <= items.length - (size - picked.length); i++) {
    picked.push(items[i]!);
    yield* combinations(items, size, i + 1, picked);
    picked.pop();
  }
}

export function countCombinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** Every team of exactly `size` units whose skill cost fits `maxCost` (0 = no limit), best first. */
export function rankTeams(base: HitInput, pool: SupportUnit[], size: number, maxCost: number): TeamResult[] {
  pool = pool.filter((unit) => unit.enabled !== false);
  if (size < 1 || size > pool.length || countCombinations(pool.length, size) > MAX_COMBINATIONS) return [];
  const results: TeamResult[] = [];
  for (const units of combinations(pool, size)) {
    const cost = units.reduce((sum, u) => sum + u.skillCost, 0);
    if (maxCost > 0 && cost > maxCost) continue;
    results.push({ units, cost, damage: damageAt(applyUnits(base, units)) });
  }
  return results.sort((a, b) => b.damage - a.damage || a.cost - b.cost);
}
