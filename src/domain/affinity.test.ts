import { describe, expect, it } from 'vitest';
import { defaultWorkspace } from './defaults';
import { calculateHit, getAttributeFactor, toInput } from './engine';
import { normalizeWorkspace } from './normalize';
import { getMissingRequirements, getRequirements, isHitComplete } from './requirements';
import type { SoulVariant } from './types';

function setup(plus = true, variant: SoulVariant = 'ultimate', ultimateBonus: number | null = 40) {
  const ws = defaultWorkspace(),
    hit = ws.hits[0]!;
  hit.attacker = { ...hit.attacker, attribute: 'dark', plus, battleAtk: 10000 };
  hit.attack = { ...hit.attack, power: 100, variant, ultimateBonus, popup: 'superWeak' };
  ws.enemy = { ...ws.enemy, attribute: 'light', def: 5000 };
  return { ws, hit, input: toInput(hit, ws.enemy) };
}

describe('shared resolved attribute factor', () => {
  it.each([
    { plus: true, variant: 'normal' as const, bonus: null, factor: 1.6, damage: 4800 },
    { plus: true, variant: 'ultimate' as const, bonus: 40, factor: 2, damage: 6000 },
    { plus: true, variant: 'ultimate' as const, bonus: 140, factor: 3, damage: 9000 },
    { plus: false, variant: 'normal' as const, bonus: null, factor: 1.5, damage: 4500 },
    { plus: false, variant: 'ultimate' as const, bonus: 40, factor: 1.9, damage: 5700 },
  ])('resolves plus=$plus variant=$variant bonus=$bonus without changing the base advantage', ({ plus, variant, bonus, factor, damage }) => {
    const { input } = setup(plus, variant, bonus);
    const resolved = getAttributeFactor(input),
      result = calculateHit(input);
    expect(resolved.base.toNumber()).toBe(1.5);
    expect(resolved.factor.toNumber()).toBe(factor);
    expect(result.damage).toBe(damage);
    expect(result.steps.find((step) => step.id === 'matchup')?.factor).toBe(factor);
  });

  it('exposes exact additive components for the same calculation used by damage', () => {
    const { input } = setup();
    const resolved = getAttributeFactor(input);
    expect([resolved.base, resolved.enhanced, resolved.ultimate, resolved.weak, resolved.superWeak].map((part) => part.toNumber())).toEqual([
      1.5, 0.1, 0.4, 0, 0,
    ]);
    expect(resolved.factor.toNumber()).toBe(2);
  });

  it('retains the separate damage-vs-attribute factor and weakness normalization', () => {
    const { input } = setup();
    input.effects = { vsAttribute: 100, weakDmg: 80, superWeakDmg: 20 };
    const resolved = getAttributeFactor(input);
    expect(resolved.weak.toNumber()).toBe(0.4);
    expect(resolved.superWeak.toNumber()).toBe(0.2);
    expect(resolved.factor.toNumber()).toBe(2.6);
    expect(calculateHit(input).damage).toBe(15600);
  });

  it('does not add an Ultimate bonus to an ordinary orb or a neutral secret attack', () => {
    const { input } = setup();
    input.attack.kind = 'soul';
    input.attack.ultimateBonus = null;
    expect(getAttributeFactor(input).factor.toNumber()).toBe(1.6);
    input.attack.kind = 'soulOfCombos';
    input.enemy.attribute = 'fire';
    expect(getAttributeFactor(input).factor.toNumber()).toBe(1);
    expect(calculateHit(input).damage).toBe(3000);
  });

  it('does not silently turn an unknown eligible Ultimate input into zero or a fallback', () => {
    const { input } = setup(true, 'ultimate', null);
    expect(() => getAttributeFactor(input)).toThrow(/resolved Ultimate affinity addition/);
    expect(() => calculateHit(input)).toThrow(RangeError);
  });

  it('keeps inverse-Q invalidity checks and the final nonnegative affinity clamp', () => {
    const { input } = setup();
    input.effects.vsAttribute = -100;
    expect(() => getAttributeFactor(input)).toThrow(/Weak Point hit/);
    input.effects = { weakDmg: -400 };
    expect(getAttributeFactor(input).factor.toNumber()).toBe(0);
    expect(calculateHit(input).damage).toBe(1);
  });
});

describe('unknown Ultimate addition state', () => {
  it('starts genuinely unknown and remains required after confirming without a value', () => {
    expect(defaultWorkspace().hits[0]!.attack.ultimateBonus).toBeNull();
    const { ws, hit } = setup(true, 'ultimate', null);
    for (const requirement of getRequirements(hit, ws.enemy)) {
      const owner = requirement.key.startsWith('enemy.') ? ws.enemy : hit;
      owner.confirmed = { ...owner.confirmed, [requirement.key]: true };
    }
    expect(getMissingRequirements(hit, ws.enemy).map((row) => row.key)).toEqual(['attack.ultimateBonus']);
    expect(isHitComplete(hit, ws.enemy)).toBe(false);
    hit.attack.ultimateBonus = 40;
    expect(isHitComplete(hit, ws.enemy)).toBe(true);
  });

  it.each([40, 140])('preserves an explicit saved addition of%d', (bonus) => {
    const { ws } = setup(true, 'ultimate', bonus);
    expect(normalizeWorkspace(JSON.parse(JSON.stringify(ws))).hits[0]!.attack.ultimateBonus).toBe(bonus);
  });

  it('preserves null and does not invent a value for missing or invalid imported input', () => {
    const { ws } = setup(true, 'ultimate', null);
    expect(normalizeWorkspace(JSON.parse(JSON.stringify(ws))).hits[0]!.attack.ultimateBonus).toBeNull();
    const raw = { ...ws, hits: [{ ...ws.hits[0], attack: { ...ws.hits[0]!.attack, ultimateBonus: undefined } }] };
    expect(normalizeWorkspace(raw).hits[0]!.attack.ultimateBonus).toBeNull();
    expect(normalizeWorkspace({ ...raw, hits: [{ attack: { ultimateBonus: 'unknown' } }] }).hits[0]!.attack.ultimateBonus).toBeNull();
  });
});
