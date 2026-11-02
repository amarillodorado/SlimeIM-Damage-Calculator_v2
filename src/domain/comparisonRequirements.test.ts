import { describe, expect, it } from 'vitest';
import { defaultWorkspace } from './defaults';
import { comparisonRequirements } from './comparisonRequirements';
import { getRequirements } from './requirements';
import type { SupportUnit } from './teams';

function entered() {
  const ws = defaultWorkspace(),
    hit = ws.hits[0]!;
  hit.attack = { ...hit.attack, kind: 'soul', power: 100 };
  hit.attacker.battleAtk = 10000;
  ws.enemy.def = 5000;
  for (const item of getRequirements(hit, ws.enemy)) {
    const owner = item.key.startsWith('enemy.') ? ws.enemy : hit;
    owner.confirmed = { ...owner.confirmed, [item.key]: true };
  }
  return ws;
}
const provider = (id: string, triggers: SupportUnit['triggers'], skillCost = 10): SupportUnit => ({ id, name: id, skillCost, triggers, effects: [] });

describe('comparison input requirements', () => {
  it('blocks a blank base instead of ranking minimum-one damage', () => {
    const ws = defaultWorkspace();
    expect(comparisonRequirements(ws.hits[0]!, ws.enemy, [provider('critical', { crit: true })], 1, 0).missing.length).toBeGreaterThan(0);
  });
  it('requires stats newly introduced by a provider and accepts explicit zero', () => {
    const ws = entered(),
      hit = ws.hits[0]!;
    const pool = [provider('synergy', { synergy: true }), provider('aegis', { aegis: true })];
    expect(comparisonRequirements(hit, ws.enemy, pool, 1, 0).missing.map((r) => r.key)).toEqual(['attacker.supportAtk', 'attacker.ownDef']);
    hit.confirmed = { ...hit.confirmed, 'attacker.supportAtk': true, 'attacker.ownDef': true };
    expect(comparisonRequirements(hit, ws.enemy, pool, 1, 0).missing).toEqual([]);
  });
  it('does not demand a stat for a provider excluded by the budget', () => {
    const ws = entered();
    const pool = [provider('cheap', {}), provider('costly synergy', { synergy: true }, 100)];
    const result = comparisonRequirements(ws.hits[0]!, ws.enemy, pool, 1, 20);
    expect(result.needsSupport).toBe(false);
    expect(result.missing).toEqual([]);
  });
  it('checks exact combination size when deciding whether a provider is affordable', () => {
    const ws = entered();
    const pool = [provider('synergy', { synergy: true }, 20), provider('other', {}, 20)];
    expect(comparisonRequirements(ws.hits[0]!, ws.enemy, pool, 2, 30).needsSupport).toBe(false);
    expect(comparisonRequirements(ws.hits[0]!, ws.enemy, pool, 2, 40).needsSupport).toBe(true);
  });
});
