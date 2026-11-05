import { describe, expect, it } from 'vitest';
import { blankAttack, blankAttacker, blankEnemy } from './defaults';
import { calculateHit, damageAt, getSuperCriticalFactor, superCriticalRate, type HitInput } from './engine';
import type { Attack } from './types';

function setup(attack: Partial<Attack> = {}): HitInput {
  return {
    attacker: { ...blankAttacker(), battleAtk: 10000, attribute: 'fire' },
    attack: { ...blankAttack(), kind: 'soul', power: 100, crit: true, superCrit: true, ...attack },
    enemy: { ...blankEnemy(), attribute: 'fire', def: 5000 },
    effects: {},
  };
}

describe('Super Critical with recovered official coefficients', () => {
  it('uses the verified 1.5 base without requiring player coefficient inputs', () => {
    const input = setup();
    expect(getSuperCriticalFactor(input).toNumber()).toBe(1.5);
    expect(damageAt(input)).toBe(4500);
  });

  it('uses a 1.3 favorable-bonus scale and replaces ordinary Critical', () => {
    const input = setup();
    input.effects = { critDmg: 40, critResDown: 10 };
    const result = calculateHit(input);
    expect(getSuperCriticalFactor(input).toNumber()).toBe(2.15);
    expect(result.damage).toBe(6450);
    expect(result.steps.filter((step) => step.id === 'crit')).toEqual([expect.objectContaining({ label: 'Super Critical', factor: 2.15, value: 6450 })]);
    expect(result.steps.find((step) => step.id === 'crit')!.detail).not.toContain('null');
  });

  it('keeps unfavorable power and resistance sources unscaled', () => {
    const input = setup();
    input.effects = { critDmg: 40, critResDown: 20 };
    input.effectEntries = { critDmg: [60, -20], critResDown: [30, -10] };
    expect(getSuperCriticalFactor(input).toNumber()).toBe(2.37);
    expect(damageAt(input)).toBe(7110);
    expect(damageAt({ ...input, effectEntries: undefined })).toBe(6840);
  });

  it('preserves the signs of sources whose net total is zero', () => {
    const input = setup();
    input.effectEntries = { critDmg: [100, -100] };
    expect(getSuperCriticalFactor(input).toNumber()).toBe(1.8);
    expect(damageAt(input)).toBe(5400);
  });

  it('clamps a negative resolved factor and applies the final minimum damage', () => {
    const input = setup();
    input.effects.critDmg = -200;
    expect(getSuperCriticalFactor(input).toNumber()).toBe(0);
    expect(damageAt(input)).toBe(1);
  });

  it('ignores obsolete manual coefficients carried by older inputs', () => {
    const input = setup();
    const legacyAttack = { ...input.attack, superCritBase: 9, superCritPowerScale: 9 };
    expect(damageAt({ ...input, attack: legacyAttack })).toBe(4500);
  });

  it('keeps ordinary Critical unchanged', () => {
    const input = setup({ superCrit: false });
    input.effects = { critDmg: 40, critResDown: 10 };
    expect(damageAt(input)).toBe(5400);
    expect(calculateHit(input).steps.find((step) => step.id === 'crit')).toEqual(expect.objectContaining({ label: 'Critical', factor: 1.8 }));
  });

  it('ignores a stale Super flag while ordinary Critical is off', () => {
    const input = setup({ crit: false });
    expect(damageAt(input)).toBe(3000);
    expect(calculateHit(input).steps.some((step) => step.id === 'crit')).toBe(false);
  });

  // Explicit coefficients here are synthetic Decimal oracles, not user overrides.
  // Expected strings were captured from System.Decimal using the native BP order.
  it.each([
    {
      base: 1.2345678901234567,
      scale: 1.2345678901234567,
      power: [12345.678901234567, -2345.678901234567],
      resistance: [12345.678901234567, -345.678901234567],
      expected: '279.15256493020880775319351135',
    },
    {
      base: 0.1234567890123456,
      scale: 9.87654321098765,
      power: [99999.99999999999, -12345.678901234567],
      resistance: [33333.33333333333, -123.45678901234567],
      expected: '13044.156381203408568694238535',
    },
  ])('matches the low-level .NET Decimal oracle: $expected', ({ base, scale, power, resistance, expected }) => {
    expect(superCriticalRate(base, scale, power, resistance).toString()).toBe(expected);
  });
});
