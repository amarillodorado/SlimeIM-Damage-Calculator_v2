import { describe, expect, it } from 'vitest';
import { DEFAULT_LIBRARY_FILTERS, providerMatchesLibraryFilters } from './providerFilters';
import type { SupportUnit } from './teams';

const unit: SupportUnit = {
  id: 'scoped',
  name: 'Scoped',
  skillCost: 40,
  triggers: {},
  effects: [
    { type: 'elementAtk', value: 50, attribute: 'fire', attackType: 'physical' },
    { type: 'elementAtk', value: 60, attribute: 'water', attackType: 'magic' },
    { type: 'critDmg', value: 0, attribute: 'any' },
  ],
};

describe('provider Library filters', () => {
  it('requires effect, attribute and attack scope to match one effect', () => {
    const filters = { ...DEFAULT_LIBRARY_FILTERS, effect: 'elementAtk' as const, attribute: 'fire' as const, attackType: 'magic' as const };
    expect(providerMatchesLibraryFilters(unit, filters, false)).toBe(false);
    expect(providerMatchesLibraryFilters(unit, { ...filters, attackType: 'physical' }, false)).toBe(true);
    expect(providerMatchesLibraryFilters(unit, { ...DEFAULT_LIBRARY_FILTERS, effect: 'critDmg' }, false)).toBe(false);
  });

  it('includes unrestricted effects for a specific attribute and attack type', () => {
    const unrestricted = { ...unit, effects: [{ type: 'elementAtk' as const, value: 50, attribute: 'any' as const }] };
    expect(
      providerMatchesLibraryFilters(unrestricted, { ...DEFAULT_LIBRARY_FILTERS, effect: 'elementAtk', attribute: 'dark', attackType: 'magic' }, false),
    ).toBe(true);
  });

  it('filters pool membership independently of inclusion', () => {
    expect(providerMatchesLibraryFilters(unit, { ...DEFAULT_LIBRARY_FILTERS, pool: 'available' }, true)).toBe(false);
    expect(providerMatchesLibraryFilters(unit, { ...DEFAULT_LIBRARY_FILTERS, pool: 'inPool' }, true)).toBe(true);
    expect(providerMatchesLibraryFilters(unit, { ...DEFAULT_LIBRARY_FILTERS, pool: 'inPool' }, false)).toBe(false);
  });

  it('finds guaranteed outcomes separately from percentage effects', () => {
    const guarantee = { ...unit, effects: [], triggers: { crit: true } };
    expect(
      providerMatchesLibraryFilters(guarantee, { ...DEFAULT_LIBRARY_FILTERS, effect: 'guaranteed:crit', attribute: 'fire', attackType: 'magic' }, false),
    ).toBe(true);
    expect(providerMatchesLibraryFilters(guarantee, { ...DEFAULT_LIBRARY_FILTERS, effect: 'guaranteed:pierce' }, false)).toBe(false);
    expect(providerMatchesLibraryFilters(guarantee, { ...DEFAULT_LIBRARY_FILTERS, effect: 'critDmg' }, false)).toBe(false);
  });
});
