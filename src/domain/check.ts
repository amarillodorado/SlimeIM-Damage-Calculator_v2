import { computeHit, ROLL_MAX, ROLL_MID, ROLL_MIN, type HitInput } from './engine';

/**
 * Compare a damage number the game showed with the calculation.
 * The game draws one of 200 variance rolls (0.9900 … 1.0099), so only some
 * integers are possible. A matching roll establishes compatibility with these
 * inputs, not the game's actual draw or a unique explanation of the hit.
 */

export interface KnownFactor {
  factor: number;
  causes: string;
}

/** Multipliers players often forget or add twice. */
export const KNOWN_FACTORS: KnownFactor[] = [
  { factor: 1.05, causes: 'a separate +5% factor' },
  { factor: 1.1, causes: 'an eligible four-soul finisher (110%) or a separate +10% factor; the displayed chain BONUS is a gauge bonus' },
  { factor: 1.2, causes: 'True Attribute Unbound (if its listed factor is ×1.2) or a separate +20% factor' },
  { factor: 1.25, causes: 'Ultimate Soul of Combos bonus on an attribute advantage (+0.4: ×1.6 → ×2.0)' },
  { factor: 1.3, causes: 'Critical (×1.3) or True Attribute Unbound (Super Weak Point ×1.3)' },
  {
    factor: 1.5,
    causes: 'EX Soul of Combos (enter the soul’s displayed %), a resolved 150% combo bonus or a natural attribute advantage',
  },
  { factor: 1.6, causes: 'attribute advantage with a "+" attribute (×1.6)' },
  { factor: 1.8, causes: 'Ultimate Soul of Combos (enter the % shown on the Ultimate Soul of Combos, ×1.8 of the normal one)' },
  { factor: 2, causes: 'a resolved 200% combo bonus or a separate +100% factor' },
];

export type CheckStatus = 'exact' | 'inRange' | 'low' | 'high';

export interface CheckResult {
  status: CheckStatus;
  /** Variance rolls (e.g. 0.9923) that produce exactly the observed number. */
  rolls: number[];
  min: number;
  max: number;
  /** Observed ÷ calculated (centre roll). >1: the game did more damage. */
  ratio: number;
  /** Known multipliers that would explain the gap (calculation too low: multiply; too high: divide). */
  suggestions: string[];
}

export function checkObserved(input: HitInput, observed: number): CheckResult {
  const values: number[] = [];
  for (let k = ROLL_MIN; k <= ROLL_MAX; k++) values.push(computeHit(input, k).damage);
  const min = values[0]!;
  const max = values[values.length - 1]!;
  const mid = values[ROLL_MID - ROLL_MIN]!;
  const rolls = values.flatMap((v, i) => (v === observed ? [(ROLL_MIN + i) / 10000] : []));
  const ratio = mid > 0 ? observed / mid : 0;

  let status: CheckStatus;
  if (rolls.length) status = 'exact';
  else if (observed >= min && observed <= max) status = 'inRange';
  else status = observed < min ? 'low' : 'high';

  const suggestions: string[] = [];
  if (status === 'low' || status === 'high') {
    const gap = status === 'high' ? ratio : 1 / ratio;
    for (const f of KNOWN_FACTORS) {
      if (Math.abs(gap / f.factor - 1) <= 0.015)
        suggestions.push(`A factor near ×${f.factor} could explain part of the gap — check ${f.causes}. This is a possibility, not an identified cause.`);
    }
    const pct = Math.round((gap - 1) * 1000) / 10;
    suggestions.push(
      status === 'high'
        ? `The observed hit is about ${pct}% above the nominal prediction. Check stats, effect timing and eligibility, equipment, EX abilities and soul effects; do not add an unsupported bonus just to fit the number.`
        : `The nominal prediction is about ${pct}% above the observed hit. Check stats, inactive effects and double counting (for example detailed stats and the battle effect list).`,
    );
  }
  return { status, rolls, min, max, ratio, suggestions };
}
