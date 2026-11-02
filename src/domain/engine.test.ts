import { describe, expect, it } from 'vitest';
import { chartMatchup } from './attributes';
import { checkObserved } from './check';
import { blankAttack, blankAttacker, blankEnemy } from './defaults';
import { lightningBatExample, verifiedExample } from '../test/fixtures';
import { ClrDecimal } from './decimal';
import { effectLabel } from './effects';
import { calculateHit, ceilDamage, damageAt, effectApplies, kernel, ratioDelta, superRate, toInput, type HitInput } from './engine';
import type { Attack, Attacker, EffectValues, Enemy } from './types';

/** A neutral 100% soul with nothing else, so DAMAGE_FORMULA.md examples map 1:1. */
function hit(attacker: Partial<Attacker>, attack: Partial<Attack> = {}, effects: EffectValues = {}, enemy: Partial<Enemy> = {}): HitInput {
  return {
    attacker: { ...blankAttacker(), attribute: 'fire', ...attacker },
    attack: { ...blankAttack(), kind: 'soul', power: 100, ...attack },
    enemy: { ...blankEnemy(), attribute: 'fire', ...enemy },
    effects,
  };
}

describe('kernel and rounding', () => {
  it('ignores stored buddy ATKs outside eligible five/six-card finishers', () => {
    const attacker = { battleAtk: 10000, comboBuddyAtk1: 5000, comboBuddyAtk2: 5000 };
    expect(damageAt(hit(attacker, { comboMultiplier: 1 }, {}, { def: 5000 }))).toBe(3000);
    expect(damageAt(hit(attacker, { comboMultiplier: 1.1 }, {}, { def: 5000 }))).toBe(3300);
    expect(damageAt(hit(attacker, { comboMultiplier: 1.5 }, {}, { def: 5000 }))).toBe(4620);
  });
  it('equals 0.2 × (2 × attack − DEF) and never goes below 0', () => {
    expect(kernel(10000 / 3, 5000, 10000)).toBeCloseTo(3000, 9);
    expect(kernel(1000 / 3, 50000, 10000)).toBe(0);
    expect(kernel(0, 100, 10000)).toBe(0);
  });
  it('ceilings genuine fractions without an epsilon snap, and returns at least 1', () => {
    expect(ceilDamage(2999.0000001)).toBe(3000);
    expect(ceilDamage(3000.0000000000005)).toBe(3001);
    expect(damageAt(hit({ battleAtk: 1000 }, {}, {}, { def: 50000 }))).toBe(1);
  });
});

describe('DAMAGE_FORMULA.md §9 examples', () => {
  const base = { battleAtk: 10000 };
  const def = { def: 5000 };
  it('ATK 10,000 vs DEF 5,000 → 3,000 (range 2,970–3,030)', () => {
    const r = calculateHit(hit(base, {}, {}, def));
    expect([r.min, r.damage, r.max]).toEqual([2970, 3000, 3030]);
  });
  it('critical ×1.3 → 3,900', () => expect(damageAt(hit(base, { crit: true }, {}, def))).toBe(3900));
  it('pierce adds 6% ATK then ×1.5 → 5,400', () => expect(damageAt(hit(base, { pierce: 'normal' }, { piercePower: 50 }, def))).toBe(5400));
  it('skill 4.75×, combo 1.5×, advantage 1.5× → 32,063', () =>
    expect(damageAt(hit(base, { power: 475, comboPosition: 5, comboMultiplier: 1.5 }, {}, { ...def, attribute: 'earth' }))).toBe(32063));
});

describe('verified hit (run 1, 2026-11-01)', () => {
  const ws = verifiedExample();
  const input = toInput(ws.hits[0]!, ws.enemy);
  it('reproduces the game: 340,865 is one of the possible rolls', () => {
    const r = calculateHit(input);
    expect(r.damage).toBe(343489);
    expect(r.min).toBeLessThanOrEqual(340865);
    expect(r.max).toBeGreaterThanOrEqual(340865);
    expect(damageAt(input, 9923)).toBe(340865);
  });
  it('uses the battle ATK and ignores the ATK % already included in it', () => {
    const r = calculateHit(input);
    expect(r.battleAtk).toBe(22149);
    expect(input.effects.atkPct).toBe(56);
    expect(effectApplies('atkPct', input)).toEqual({ applies: false, reason: 'Already in the battle ATK' });
  });
  it('gives the same result when ATK is built from pre-battle values', () => {
    const build: HitInput = { ...input, attacker: { ...input.attacker, atkMode: 'build', characterAtk: 7234 + 78 } };
    const r = calculateHit(build);
    expect(r.preBattleAtk).toBe(14198);
    expect(r.battleAtk).toBe(22149);
    expect(r.damage).toBe(343489);
  });
});

describe('Ultimate hit on a neutral attribute (run 3, 2026-11-01)', () => {
  const ws = verifiedExample();
  const input = toInput(ws.hits[1]!, ws.enemy);
  const r = calculateHit(input);
  const factor = (id: string) => r.steps.find((s) => s.id === id)?.factor;
  it('takes the 1080% from the card as it is; Dark vs. Wind gets no Ultimate bonus', () => {
    expect(factor('skill')).toBe(10.8);
    expect(factor('crit')).toBeCloseTo(2.14, 12); // 1.3 + 84% critical power
    expect(factor('matchup')).toBeUndefined(); // neutral ×1
  });
  it('reproduces the game exactly: 1,132,561 is roll 0.9984', () => {
    expect([r.min, r.damage, r.max]).toEqual([1123053, 1134372, 1145577]);
    expect(checkObserved(input, 1132561).rolls).toEqual([0.9984]);
    // With the 64% critical power the screens show, no roll fits.
    expect(checkObserved({ ...input, effects: { ...input.effects, critDmg: 64 } }, 1132561).status).toBe('high');
  });
});

describe('Ultimate hit on an attribute advantage (run 4, 2026-11-01)', () => {
  const ws = lightningBatExample();
  const input = toInput(ws.hits[0]!, ws.enemy);
  const r = calculateHit(input);
  const factor = (id: string) => r.steps.find((s) => s.id === id)?.factor;
  it('adds the Ultimate bonus to Dark+ vs. Light: ×1.6 → ×2.0', () => {
    expect(factor('matchup')).toBeCloseTo(2, 12);
    expect(factor('card')).toBeCloseTo(2.2, 12); // card 20% + 100%, added together
    expect(factor('pierce')).toBeCloseTo(1.72, 12); // 12% pierce power + 60% enemy pierce resistance DOWN
  });
  it('reproduces the game exactly: 2,731,896 is roll 1.0056', () => {
    expect([r.min, r.damage, r.max]).toEqual([2689636, 2716726, 2743544]);
    expect(checkObserved(input, 2731896).rolls).toEqual([1.0056]);
    expect(checkObserved({ ...input, attack: { ...input.attack, ultimateBonus: 0 } }, 2731896).status).toBe('high');
  });
});

describe('estimated pre-battle ATK', () => {
  it('retains individual percentage entries for native per-entry rounding', () => {
    expect(14198 + ratioDelta(14198, 56)).toBe(22149); // run 1: 50% + 6%
    expect(14198 + ratioDelta(14198, 50)).toBe(21297); // run 2: trait inactive
    expect(13462 + ratioDelta(13462, 56)).toBe(21001); // Rimuru, run 2
    const input = hit({ atkMode: 'build', characterAtk: 1001, addSupportAtk: false }, {}, { atkPct: 20 }, { def: 0 });
    input.effectEntries = { atkPct: [10, 10] };
    expect(calculateHit(input).battleAtk).toBe(1203);
    expect(damageAt(input)).toBe(482);
  });
  it('does not let a flat delta increase the ratio-entry base', () => {
    const r = calculateHit(hit({ atkMode: 'build', characterAtk: 7000, supportAtk: 3000, addSupportAtk: true }, {}, { atkFlat: 100, atkPct: 10 }));
    expect(r.preBattleAtk).toBe(10000);
    expect(r.battleAtk).toBe(11100);
  });
});

describe('attribute matchup', () => {
  it('follows Fire → Earth → Space → Wind → Water → Fire and Light ⇄ Dark', () => {
    expect(chartMatchup('space', 'wind')).toBe('advantage');
    expect(chartMatchup('wind', 'space')).toBe('disadvantage');
    expect(chartMatchup('dark', 'wind')).toBe('neutral');
    expect(chartMatchup('light', 'dark')).toBe('advantage');
    expect(chartMatchup('dark', 'light')).toBe('advantage');
    expect(chartMatchup('fire', 'light')).toBe('neutral');
  });
  it('adds 0.1 for "+" attributes on an advantage', () => {
    const plain = damageAt(hit({ battleAtk: 10000, attribute: 'space' }, {}, {}, { def: 5000, attribute: 'wind' }));
    const plus = damageAt(hit({ battleAtk: 10000, attribute: 'space', plus: true }, {}, {}, { def: 5000, attribute: 'wind' }));
    expect(plain).toBe(4500);
    expect(plus).toBe(4800);
  });
  it('applies True Attribute Unbound only with a popup and while active', () => {
    const tau = { active: true, weak: 1.2, superWeak: 1.3 };
    const a = { battleAtk: 10000, tau };
    expect(damageAt(hit(a, { popup: 'superWeak' }, {}, { def: 5000 }))).toBe(3900);
    expect(damageAt(hit(a, { popup: 'weak' }, {}, { def: 5000 }))).toBe(3600);
    expect(damageAt(hit(a, { popup: 'none' }, {}, { def: 5000 }))).toBe(3000);
    expect(damageAt(hit({ ...a, tau: { ...tau, active: false } }, { popup: 'superWeak' }, {}, { def: 5000 }))).toBe(3000);
  });
});

describe('groups and special hits', () => {
  const a = { battleAtk: 10000, supportAtk: 5000 };
  const e = { def: 5000 };
  it('synergy adds 40% support ATK before DEF and multiplies after', () => expect(damageAt(hit(a, { synergy: 'normal' }, { synergyPower: 20 }, e))).toBe(4560));
  it('super rates amplify only the favourable part', () => {
    expect(superRate(50, 50)).toBeCloseTo(2.2, 12);
    expect(superRate(-20, -30)).toBeCloseTo(0.5, 12);
  });
  it('stun and enamor strike add together', () =>
    expect(damageAt(hit(a, {}, { stunStrike: 30, enamorStrike: 30 }, { ...e, stunned: true, enamored: true }))).toBe(4800));
  it('uses a resolved combo multiplier, not an inferred multiplier from position', () => {
    expect(damageAt(hit(a, { comboPosition: 3 }, {}, e))).toBe(3000);
    expect(damageAt(hit(a, { comboPosition: 3, comboMultiplier: 1.1 }, {}, e))).toBe(3300);
    expect(damageAt(hit(a, { comboPosition: 1 }, { comboDmg: 10 }, e))).toBe(3000);
    expect(damageAt(hit(a, { comboPosition: 3, comboMultiplier: 1 }, { comboDmg: 10 }, e))).toBe(3000);
    expect(damageAt(hit(a, { comboPosition: 4, comboMultiplier: 1.1 }, { comboDmg: 10 }, e))).toBe(3600);
  });
  it('gives the chain bonus to normal orbs only, not to Soul of Combos', () => {
    const soc = hit(a, { kind: 'soulOfCombos', comboPosition: 3 }, { comboDmg: 10 }, e);
    expect(damageAt(soc)).toBe(3000);
    expect(effectApplies('comboDmg', soc).reason).toBe('Normal orbs only');
  });
  it('takes the card % as shown and adds the Ultimate bonus only on an attribute advantage', () => {
    // EX/Ultimate cards show the boosted %, so nothing is multiplied again.
    expect(damageAt(hit(a, { kind: 'soulOfCombos', power: 150, variant: 'ex' }, {}, e))).toBe(4500);
    const ult = { kind: 'soulOfCombos' as const, power: 100, variant: 'ultimate' as const, ultimateBonus: 40 };
    const dark = { ...a, attribute: 'dark' as const };
    const light = { ...e, attribute: 'light' as const };
    expect(damageAt(hit(dark, ult, {}, light))).toBe(5700); // × (1.5 + 0.4)
    expect(damageAt(hit(dark, { ...ult, variant: 'normal' }, {}, light))).toBe(4500);
    expect(damageAt(hit(dark, { ...ult, kind: 'soul' }, {}, light))).toBe(4500);
    expect(damageAt(hit(dark, { ...ult, popup: 'superWeak' }, {}, e))).toBe(3000); // Dark vs. Fire: neutral, no bonus
  });
  it('late group adds up instead of multiplying', () => {
    const late = { dragonEye: 20, partyDmg: 10 };
    expect(damageAt(hit(a, {}, late, e))).toBe(3900); // 3000 × 1.3, not × 1.2 × 1.1
  });
  it('names attribute and type buffs after this hit', () => {
    const input = hit({ ...a, attribute: 'dark', attackType: 'magic' }, { target: 'single' }, { vsAttribute: 100 }, { ...e, attribute: 'wind' });
    expect(damageAt(input)).toBe(6000);
    expect(effectLabel('vsAttribute', input)).toBe('Damage vs. Wind enemies');
    expect(effectLabel('elementAtk', input)).toBe('Dark ATK UP');
    expect(effectLabel('typeAtk', input)).toBe('M-ATK UP');
    expect(effectLabel('typeResDown', input)).toBe('Magic resistance DOWN');
    expect(effectLabel('targetDmg', input)).toBe('Single-target damage UP');
  });
  it('only counts buffs whose condition the hit meets', () => {
    expect(damageAt(hit(a, { kind: 'soul' }, { soulDmg: 50 }, e))).toBe(3000);
    expect(damageAt(hit(a, { kind: 'soulOfCombos' }, { soulDmg: 50 }, e))).toBe(4500);
    expect(effectApplies('critDmg', hit(a)).reason).toBe('No Critical on this hit');
    expect(effectApplies('stunStrike', hit(a, {}, {}, { stunned: false })).reason).toBe('Enemy is not stunned');
  });
  it('effects that never change damage are ignored', () => {
    const input = hit(a, {}, { rate: 100, ownDefense: 25 }, e);
    expect(damageAt(input)).toBe(3000);
    expect(effectApplies('rate', input).reason).toBe("Doesn't change damage");
  });
});

describe('independent native arithmetic regressions', () => {
  it('keeps real sub-integer damage that the former floating tolerance removed', () => {
    const input = hit(
      { battleAtk: 31386 },
      { power: 911 },
      { typeAtk: 52, elementAtk: 187, targetAtk: 298, typeDmg: 193, elementDmg: 236, targetDmg: 147 },
      { def: 4297 },
    );
    expect(damageAt(input, 9984)).toBe(48019282);
  });
  it('keeps simultaneous favourable and unfavourable Super Pierce sources separate', () => {
    const input = hit({ battleAtk: 10000 }, { pierce: 'super' }, { piercePower: 50 }, { def: 5000 });
    input.effectEntries = { piercePower: [100, -50] };
    expect(superRate(50, 0, [100, -50], [0])).toBe(1.7);
    expect(damageAt(input)).toBe(22100);
  });
  it('preserves separate enemy resistance UP and DOWN in super rates too', () => {
    // Resistance DOWN is positive in this player-facing input model.
    expect(superRate(0, 50, [0], [100, -50])).toBe(1.7);
  });
  it('adds explicitly supplied eligible buddy ATK separately from the attached support', () => {
    const input = hit({ battleAtk: 10000, comboBuddyAtk1: 5000, comboBuddyAtk2: 5000 }, { comboMultiplier: 1.5 }, {}, { def: 5000 });
    expect(damageAt(input)).toBe(4620);
    expect(damageAt({ ...input, attack: { ...input.attack, kind: 'soulOfCombos' } })).toBe(3000);
  });
  it('does not prematurely cast exact Decimal intermediate values to numbers', () => {
    const d = new ClrDecimal('48019281.000003543288722227198');
    expect(d.ceil().toString()).toBe('48019282');
    expect(new ClrDecimal('1').div('3').mul('3').toString()).toBe('0.9999999999999999999999999999');
  });
  it('retains the CLR scale limit and ties-to-even behavior', () => {
    expect(new ClrDecimal('1.00000000000000000000000000005').toString()).toBe('1');
    expect(new ClrDecimal('1.00000000000000000000000000015').toString()).toBe('1.0000000000000000000000000002');
    expect(() => new ClrDecimal('79228162514264337593543950335').add(1)).toThrow(/overflow/);
  });
  it('reports an invalid zero receiver-element factor on a weak-point input', () => {
    expect(() => damageAt(hit({ battleAtk: 10000 }, { popup: 'weak' }, { vsAttribute: -100 }, { def: 5000 }))).toThrow(/above zero/);
  });
});
