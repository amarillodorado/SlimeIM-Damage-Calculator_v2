import { EFFECT_BY_ID } from './effects';
import type { SupportUnit, UnitTriggers } from './teams';
import type { AttackType, AttributeFilter, EffectTypeId } from './types';

export type ProviderEffectFilter = 'all' | EffectTypeId | `guaranteed:${keyof UnitTriggers}`;
export interface ProviderLibraryFilters {
  effect: ProviderEffectFilter;
  attribute: AttributeFilter;
  attackType: AttackType | 'any';
  pool: 'all' | 'available' | 'inPool';
}

export const DEFAULT_LIBRARY_FILTERS: ProviderLibraryFilters = { effect: 'all', attribute: 'any', attackType: 'any', pool: 'all' };

/** Scope filters describe an effect that can benefit the chosen attribute/attack type. */
export function providerMatchesLibraryFilters(unit: SupportUnit, filters: ProviderLibraryFilters, inPool: boolean): boolean {
  if (filters.pool === 'available' && inPool) return false;
  if (filters.pool === 'inPool' && !inPool) return false;

  if (filters.effect.startsWith('guaranteed:')) {
    const trigger = filters.effect.slice('guaranteed:'.length) as keyof UnitTriggers;
    return unit.triggers[trigger] === true;
  }
  if (filters.effect === 'all') {
    if (filters.attribute === 'any' && filters.attackType === 'any') return true;
    // Guaranteed outcomes have no attribute or attack-type restriction in the provider model.
    if (Object.values(unit.triggers).some(Boolean)) return true;
  }

  // All selected conditions must match the same effect, rather than different skills.
  return unit.effects.some(
    (effect) =>
      effect.value !== 0 &&
      (filters.effect === 'all' || effect.type === filters.effect) &&
      (filters.attribute === 'any' || !EFFECT_BY_ID[effect.type].attribute || effect.attribute === 'any' || effect.attribute === filters.attribute) &&
      (filters.attackType === 'any' || !effect.attackType || effect.attackType === 'any' || effect.attackType === filters.attackType),
  );
}
