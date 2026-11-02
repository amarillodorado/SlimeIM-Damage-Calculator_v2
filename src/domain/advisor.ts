import { damageAt, effectApplies, type HitInput } from './engine';
import { EFFECT_TYPES } from './effects';
import type { EffectTypeId } from './types';

/** Compare every modeled percentage effect whose condition the hit meets. */
const CANDIDATES: EffectTypeId[] = EFFECT_TYPES.filter((effect) => effect.category !== 'noEffect' && !effect.flat).map((effect) => effect.id);

export const ADVISOR_STEP = 10;

export interface AdvisorRow {
  type: EffectTypeId;
  gain: number;
}

export function bestNextEffects(input: HitInput, current: number, limit = 6): AdvisorRow[] {
  if (!Number.isFinite(current) || current <= 0) return [];
  const rows: AdvisorRow[] = [];
  for (const type of CANDIDATES) {
    if (!effectApplies(type, input).applies) continue;
    // A new buff is a new entry. Keep existing signed entries intact for Super
    // hits and keep ATK entries separate for their individual stat rounding.
    const entries = input.effectEntries?.[type] ?? [input.effects[type] ?? 0];
    let next: number;
    try {
      next = damageAt({
        ...input,
        effects: { ...input.effects, [type]: (input.effects[type] ?? 0) + ADVISOR_STEP },
        effectEntries: { ...input.effectEntries, [type]: [...entries, ADVISOR_STEP] },
      });
    } catch (error) {
      // A prospective buff can overflow even when the base hit is valid.
      // Ignore only known numeric-input failures; programming errors still surface.
      const numericRange = error instanceof RangeError && /overflow|Division by zero|decimal|Pierce ATK|Variance roll|Weak Point/.test(error.message);
      const numericType = error instanceof TypeError && /^(Enter a finite number|Invalid decimal:)/.test(error.message);
      if (numericRange || numericType) continue;
      throw error;
    }
    const gain = next / current - 1;
    if (gain > 0.00005) rows.push({ type, gain });
  }
  return rows.sort((a, b) => b.gain - a.gain).slice(0, limit);
}
