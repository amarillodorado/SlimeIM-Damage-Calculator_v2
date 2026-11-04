import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_LABEL } from './attributes';
import { blankAttack, blankAttacker, blankEnemy } from './defaults';
import { effectLabel } from './effects';
import { calculateHit, damageAt, effectApplies, type HitInput } from './engine';
import { normalizeWorkspace } from './normalize';
import { exportProviderFile, parseProviderFile } from './providerFiles';
import type { SupportUnit } from './teams';
import { ATTRIBUTES, type EffectTypeId, type EffectValues } from './types';

const ENHANCED: EffectTypeId[] = ['enhancedElementAtk', 'enhancedElementDmg', 'enhancedElementResDown', 'enhancedElementDmgResDown'];

function input(effects: EffectValues = {}, plus = true): HitInput {
  return {
    attacker: { ...blankAttacker(), attribute: 'dark', plus, battleAtk: 10000 },
    attack: { ...blankAttack(), kind: 'soul', power: 100 },
    enemy: { ...blankEnemy(), attribute: 'dark', def: 5000 },
    effects,
  };
}

describe('separate enhanced attribute factors', () => {
  it('multiplies ordinary and enhanced resistance reductions separately before the kernel', () => {
    const hit = input({ elementResDown: 20, enhancedElementResDown: 30 });
    const result = calculateHit(hit);
    expect(result.effectiveDef).toBe(2800); // 5000 × .8 × .7, not 5000 × .5
    expect(result.damage).toBe(3440);
    expect(damageAt(input({ enhancedElementResDown: 30 }))).toBe(3300);
    expect(result.damage).not.toBe(3500);
  });

  it('keeps enhanced damage resistance after the kernel instead of lowering DEF', () => {
    const resistance = calculateHit(input({ enhancedElementResDown: 30 }));
    const damageResistance = calculateHit(input({ enhancedElementDmgResDown: 30 }));
    expect(resistance.effectiveDef).toBe(3500);
    expect(damageResistance.effectiveDef).toBe(5000);
    expect([resistance.damage, damageResistance.damage]).toEqual([3300, 3900]);
    expect(damageAt(input({ elementDmgResDown: 20, enhancedElementDmgResDown: 30 }))).toBe(4680);
  });

  it('multiplies ordinary and enhanced ATK and damage UP at their respective stages', () => {
    const attack = calculateHit(input({ elementAtk: 20, enhancedElementAtk: 30 }));
    expect(attack.attackValue).toBe(15600); // 10000 × 1.2 × 1.3
    expect(attack.damage).toBe(5240);
    expect(damageAt(input({ elementDmg: 20, enhancedElementDmg: 30 }))).toBe(4680);
    expect(damageAt(input({ elementAtk: 20, enhancedElementAtk: 30, elementDmg: 20, enhancedElementDmg: 30 }))).toBe(8175);
  });

  it('ignores all enhanced fields for an ordinary attack without ignoring ordinary fields', () => {
    const ordinary = input(Object.fromEntries(ENHANCED.map((id) => [id, 50])), false);
    expect(damageAt(ordinary)).toBe(3000);
    for (const id of ENHANCED) expect(effectApplies(id, ordinary)).toEqual({ applies: false, reason: 'Requires the matching “+” attack attribute' });
    expect(damageAt(input({ elementResDown: 20, enhancedElementResDown: 30 }, false))).toBe(3200);
  });

  it('clamps each enhanced factor separately', () => {
    expect(calculateHit(input({ enhancedElementResDown: 120 })).effectiveDef).toBe(0);
    expect(damageAt(input({ enhancedElementDmgResDown: -120 }))).toBe(1);
    expect(calculateHit(input({ enhancedElementAtk: -120 })).attackValue).toBe(0);
    expect(damageAt(input({ enhancedElementDmg: -120 }))).toBe(1);
  });

  it.each(ATTRIBUTES)('names and enables all four %s+ fields for a matching enhanced attack', (attribute) => {
    const hit = input();
    hit.attacker.attribute = attribute;
    hit.enemy.attribute = attribute;
    const label = ATTRIBUTE_LABEL[attribute];
    expect(ENHANCED.map((id) => effectLabel(id, hit))).toEqual([
      `${label}+ ATK UP`, `${label}+ damage UP`, `${label}+ resistance DOWN`, `${label}+ damage resistance DOWN`,
    ]);
    for (const id of ENHANCED) expect(effectApplies(id, hit).applies).toBe(true);
    hit.effects.enhancedElementResDown = 30;
    expect(damageAt(hit)).toBe(3300);
  });

  it('preserves enhanced effects in normalized workspaces and portable provider files', () => {
    const effects = { enhancedElementAtk: 20, enhancedElementDmg: 30, enhancedElementResDown: 40, enhancedElementDmgResDown: 50 };
    const hit = input(effects);
    const restored = normalizeWorkspace({ enemy: hit.enemy, hits: [{ id: 'enhanced', attacker: hit.attacker, attack: hit.attack, effects }] });
    expect(restored.hits[0]!.effects).toEqual(effects);
    const providers: SupportUnit[] = [{ id: 'enhanced-provider', name: 'Enhanced effects', skillCost: 80,
      effects: ENHANCED.map((type) => ({ type, value: effects[type as keyof typeof effects], attribute: 'dark', attackType: 'magic', target: 'single' })), triggers: {} }];
    expect(parseProviderFile(exportProviderFile(providers))[0]!.effects).toEqual(providers[0]!.effects);
  });
});
