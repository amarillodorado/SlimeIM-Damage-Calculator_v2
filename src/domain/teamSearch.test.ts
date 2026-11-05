import { describe, expect, it } from 'vitest';
import { defaultWorkspace } from './defaults';
import { toInput } from './engine';
import { rankTeams, type SupportUnit } from './teams';
import { MAX_RANKED_TEAMS, searchTeams } from './teamSearch';

const base = () => {
  const ws = defaultWorkspace();
  const h = ws.hits[0]!;
  h.attacker.battleAtk = 10000;
  h.attack.kind = 'soul';
  h.attack.power = 100;
  return toInput(h, ws.enemy);
};
const unit = (i: number): SupportUnit => ({
  id: String(i),
  name: `Provider ${i}`,
  skillCost: (i % 4) * 10,
  effects: [{ type: 'elementAtk', value: i % 7, attribute: 'any' }],
  triggers: {},
});
describe('responsive team search', () => {
  it('returns the same ranking and cost tie-breaks as exhaustive search', async () => {
    const pool = Array.from({ length: 8 }, (_, i) => unit(i));
    const result = await searchTeams({ base: base(), pool, size: 3, maxCost: 40 }, () => {});
    expect(result?.results).toEqual(rankTeams(base(), pool, 3, 40));
    expect(result?.visited).toBe(56);
    expect(result?.eligible).toBe(result?.results.length);
  });
  it('excludes disabled library entries and preserves their data', async () => {
    const disabled = { ...unit(5), enabled: false };
    const pool = [unit(1), disabled];
    const result = await searchTeams({ base: base(), pool, size: 1, maxCost: 0 }, () => {});
    expect(result?.total).toBe(1);
    expect(result?.results.flatMap((r) => r.units.map((u) => u.id))).toEqual(['1']);
    expect(pool[1]).toEqual(disabled);
  });
  it('limits stored results while counting all eligible teams and reporting progress', async () => {
    const pool = Array.from({ length: 12 }, (_, i) => unit(i));
    const updates: number[] = [];
    const result = await searchTeams({ base: base(), pool, size: 3, maxCost: 0 }, (p) => updates.push(p.visited));
    expect(result?.eligible).toBe(220);
    expect(result?.results).toHaveLength(MAX_RANKED_TEAMS);
    expect(result?.results).toEqual(rankTeams(base(), pool, 3, 0).slice(0, MAX_RANKED_TEAMS));
    expect(updates[0]).toBe(0);
  });
  it('cancels without returning a partial ranking', async () => {
    let cancel = false;
    const result = await searchTeams(
      { base: base(), pool: Array.from({ length: 20 }, (_, i) => unit(i)), size: 3, maxCost: 0 },
      () => {
        cancel = true;
      },
      () => cancel,
    );
    expect(result).toBeNull();
  });
});
