import { describe, expect, it } from 'vitest';
import { bestNextEffects } from './advisor';
import { checkObserved } from './check';
import { blankAttack, blankAttacker, blankEnemy } from './defaults';
import { verifiedExample } from '../test/fixtures';
import { damageAt, toInput, type HitInput } from './engine';
import { normalizeUnits, normalizeWorkspace } from './normalize';
import { applyUnits, combinations, countCombinations, rankTeams, type SupportUnit } from './teams';

const example = () => {
  const ws = verifiedExample();
  return toInput(ws.hits[0]!, ws.enemy);
};

const neutralHit = (): HitInput => ({
  attacker: { ...blankAttacker(), attribute: 'fire', battleAtk: 10000 },
  attack: { ...blankAttack(), power: 100 },
  enemy: { ...blankEnemy(), attribute: 'fire', def: 5000 },
  effects: {},
});

describe('checkObserved', () => {
  it('finds the exact roll of the verified hit', () => {
    const r = checkObserved(example(), 340865);
    expect(r.status).toBe('exact');
    expect(r.rolls).toEqual([0.9923]);
  });
  it('explains a gap with known multipliers', () => {
    const input = example();
    const noTau = { ...input, attacker: { ...input.attacker, tau: { ...input.attacker.tau, active: false } } };
    const r = checkObserved(noTau, 340865);
    expect(r.status).toBe('high');
    expect(r.suggestions.join(' ')).toContain('True Attribute Unbound');
  });
  it('reports too-high calculations', () => {
    expect(checkObserved(example(), 200000).status).toBe('low');
  });
});

describe('bestNextEffects', () => {
  it('only suggests effects that apply and sorts by gain', () => {
    const rows = bestNextEffects(example(), damageAt(example()));
    expect(rows.length).toBeGreaterThan(2);
    expect(rows.map((r) => r.type)).not.toContain('critDmg'); // no Critical on this hit
    expect(rows.map((r) => r.type)).not.toContain('atkPct'); // battle ATK mode
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.gain).toBeGreaterThanOrEqual(rows[i]!.gain);
  });
  it('includes a better target-damage effect instead of limiting advice to a fixed subset', () => {
    const input = neutralHit();
    input.effects = {
      typeAtk: 100,
      elementAtk: 100,
      vsAttribute: 100,
      typeDmg: 100,
      elementDmg: 100,
      soulDmg: 100,
      typeResDown: 100,
      typeDmgResDown: 100,
      soulDmgResDown: 100,
    };
    const current = damageAt(input);
    const rows = bestNextEffects(input, current);
    expect(current).toBe(1024000);
    expect(rows.find((row) => row.type === 'targetDmg')?.gain).toBeCloseTo(0.1, 10);
    expect(rows[0]!.gain).toBeGreaterThan(0.09);
    expect(rows.map((row) => row.type)).not.toContain('atkFlat');
  });
  it('compares a new ATK entry with per-entry rounding in build mode', () => {
    const input = neutralHit();
    input.attacker = { ...input.attacker, atkMode: 'build', characterAtk: 1001, addSupportAtk: false };
    input.enemy.def = 0;
    input.effects = { atkPct: 10 };
    input.effectEntries = { atkPct: [10] };
    const rows = bestNextEffects(input, damageAt(input), 100);
    const atk = rows.find((row) => row.type === 'atkPct');
    expect(atk?.gain).toBeCloseTo(482 / 441 - 1, 10);
    expect(input.effectEntries.atkPct).toEqual([10]);
  });
});

describe('teams', () => {
  const unit = (id: string, skillCost: number, value: number): SupportUnit => ({
    id,
    name: id,
    skillCost,
    effects: [{ type: 'soulDmg', value, attribute: 'any' }],
    triggers: {},
  });
  it('enumerates combinations', () => {
    expect([...combinations([1, 2, 3], 2)]).toEqual([
      [1, 2],
      [1, 3],
      [2, 3],
    ]);
    expect(countCombinations(10, 3)).toBe(120);
  });
  it('ranks teams within the skill point limit', () => {
    const pool = [unit('a', 40, 10), unit('b', 80, 50), unit('c', 80, 30)];
    const r = rankTeams(example(), pool, 2, 120);
    expect(r.map((t) => t.units.map((u) => u.id).join('+'))).toEqual(['a+b', 'a+c']);
  });
  it('adds unit effects to the hit, attribute-bound ones only for that attribute', () => {
    const team: SupportUnit = {
      id: 't',
      name: 't',
      skillCost: 0,
      effects: [
        { type: 'soulDmg', value: 10, attribute: 'any' },
        { type: 'vsAttribute', value: 20, attribute: 'wind' },
        { type: 'vsAttribute', value: 50, attribute: 'fire' },
      ],
      triggers: {},
    };
    const r = applyUnits(example(), [team]);
    expect(r.effects.soulDmg).toBe(50); // 40 from the hit + 10
    expect(r.effects.vsAttribute).toBe(126); // 106 + 20 vs. the wind enemy; the fire bonus doesn't count
  });
  it('does not apply magic-only effects to physical attacks', () => {
    const input = neutralHit();
    input.attacker.attackType = 'physical';
    const magic: SupportUnit = {
      id: 'magic',
      name: 'Magic provider',
      skillCost: 0,
      effects: [{ type: 'typeAtk', value: 100, attribute: 'any', attackType: 'magic' }],
      triggers: {},
    };
    expect(damageAt(applyUnits(input, [magic]))).toBe(3000);
    const magicInput = { ...input, attacker: { ...input.attacker, attackType: 'magic' as const } };
    expect(damageAt(applyUnits(magicInput, [magic]))).toBe(7000);
  });
  it('respects single-target and all-target effect restrictions', () => {
    const input = neutralHit();
    const single: SupportUnit = {
      id: 'single',
      name: 'Single-target provider',
      skillCost: 0,
      effects: [{ type: 'targetDmg', value: 100, attribute: 'any', target: 'single' }],
      triggers: {},
    };
    expect(damageAt(applyUnits(input, [single]))).toBe(6000);
    expect(damageAt(applyUnits({ ...input, attack: { ...input.attack, target: 'all' } }, [single]))).toBe(3000);
  });
  it('preserves separate positive and negative contributions for Super hits', () => {
    const input = neutralHit();
    input.attack.pierce = 'super';
    input.effects = { piercePower: 50 };
    input.effectEntries = { piercePower: [100, -50] };
    const provider: SupportUnit = {
      id: 'pierce',
      name: 'Pierce provider',
      skillCost: 0,
      effects: [{ type: 'piercePower', value: 10, attribute: 'any' }],
      triggers: {},
    };
    const result = applyUnits(input, [provider]);
    expect(result.effects.piercePower).toBe(60);
    expect(result.effectEntries?.piercePower).toEqual([100, -50, 10]);
    expect(damageAt(result)).toBe(23660); // (3000 + 10000) × (1 + 1.2 × 1.1 − 0.5)
    expect(input.effectEntries.piercePower).toEqual([100, -50]);
  });
});

describe('normalize', () => {
  it('returns a clean empty workspace for invalid input', () => {
    expect(normalizeWorkspace(null).hits).toHaveLength(1);
    expect(normalizeWorkspace({ hits: [] }).enemy.name).toBe('');
    expect(normalizeWorkspace(null).hits[0]!.attacker.battleAtk).toBe(0);
  });
  it('repairs invalid values and duplicate ids', () => {
    const ws = normalizeWorkspace({
      enemy: { def: 'x', attribute: 'banana', magicRes: -20 },
      hits: [
        {
          id: 'same',
          attacker: { battleAtk: -5, attribute: 'dark' },
          attack: { comboPosition: 9, popup: 'superWeak' },
          effects: { nope: 5, soulDmg: 40, critDmg: 'x', rate: 100 },
        },
        { id: 'same' },
      ],
      activeHitId: 'missing',
    });
    expect(ws.enemy.def).toBe(0);
    expect(ws.enemy.attribute).toBe('wind');
    expect(ws.enemy.magicRes).toBe(-20);
    expect(ws.hits[0]!.attacker.battleAtk).toBe(0);
    expect(ws.hits[0]!.attack.comboPosition).toBe(1);
    expect(ws.hits[0]!.attack.popup).toBe('superWeak');
    expect(ws.hits[0]!.effects).toEqual({ soulDmg: 40 });
    expect(ws.hits[0]!.id).not.toBe(ws.hits[1]!.id);
    expect(ws.activeHitId).toBe(ws.hits[0]!.id);
  });
  it('adds up effect lists from older saves per type', () => {
    const ws = normalizeWorkspace({
      enemy: { attribute: 'wind' },
      hits: [
        {
          attacker: { attribute: 'dark' },
          effects: [
            { type: 'critDmg', value: 40, attribute: 'any', source: 'effect list', enabled: true },
            { type: 'critDmg', value: 12, attribute: 'any' },
            { type: 'critDmg', value: 12, attribute: 'any', enabled: false },
            { type: 'vsAttribute', value: 106, attribute: 'wind' },
            { type: 'vsAttribute', value: 60, attribute: 'fire' },
            { type: 'rate', value: 100, attribute: 'any' },
          ],
        },
      ],
    });
    expect(ws.hits[0]!.effects).toEqual({ critDmg: 52, vsAttribute: 106 });
  });
  it('turns the removed battle-skill hit type into a normal orb', () => {
    const ws = normalizeWorkspace({ hits: [{ attack: { kind: 'skill', power: 300 } }] });
    expect(ws.hits[0]!.attack.kind).toBe('soul');
    expect(ws.hits[0]!.attack.power).toBe(300);
  });
  it('keeps only safe unit icons', () => {
    const units = normalizeUnits([
      { name: 'X', icon: 'javascript:alert(1)' },
      { name: 'Y', icon: 'units/Aqua.png' },
    ]);
    expect(units[0]!.icon).toBeUndefined();
    expect(units[1]!.icon).toBe('units/Aqua.png');
  });
  it('preserves safe attack-type and target restrictions', () => {
    const units = normalizeUnits([
      {
        name: 'Scoped',
        effects: [
          { type: 'typeAtk', value: 30, attribute: 'any', attackType: 'magic', target: 'single' },
          { type: 'typeDmg', value: 20, attribute: 'any', attackType: 'invalid', target: 'invalid' },
        ],
      },
    ]);
    expect(units[0]!.effects[0]).toMatchObject({ attackType: 'magic', target: 'single' });
    expect(units[0]!.effects[1]).toMatchObject({ attackType: 'any', target: 'any' });
  });
});
