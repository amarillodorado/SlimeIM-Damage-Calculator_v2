/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { defaultWorkspace, blankHit } from './defaults';
import { normalizeWorkspace } from './normalize';
import { decodeWorkspace, encodeWorkspace, MAX_SHARE_CHARACTERS } from '../state/share';
import { exportWorkspaceFile, parseWorkspaceFile, validateWorkspaceData, MAX_EFFECT_SOURCES } from './workspaceFiles';
import { getRequirements } from './requirements';
import { calculateHit, toInput } from './engine';
import { summaryText } from '../features/calculator/format';
const legacyCode = (value: unknown) => 'j' + btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('workspace safety and transfer', () => {
  it('rejects compressed payloads that expand beyond the byte limit', async () => {
    const compressed = deflateRawSync('a'.repeat(1024 * 1024 + 1));
    const code = 'z' + compressed.toString('base64url');
    expect(await decodeWorkspace(code)).toBeUndefined();
  });
  it.each([{}, null, [], { hits: [] }, { hits: [{}], enemy: {} }])('rejects wrong-shaped shared data: %j', async (value) => {
    const code = legacyCode(value);
    expect(await decodeWorkspace(code)).toBeUndefined();
  });
  it('rejects unsupported encodings, versions, corrupted and excessive input', async () => {
    expect(await decodeWorkspace('x' + btoa('{}'))).toBeUndefined();
    expect(await decodeWorkspace('zcorrupted')).toBeUndefined();
    expect(await decodeWorkspace('j' + 'a'.repeat(MAX_SHARE_CHARACTERS))).toBeUndefined();
    const ws = defaultWorkspace();
    expect(await decodeWorkspace('j' + btoa(JSON.stringify({ ...ws, version: 99 })))).toBeUndefined();
    expect(() => parseWorkspaceFile(JSON.stringify({ format: 'slimeim-workspace', version: 999, workspace: ws }))).toThrow(/unsupported/);
  });
  it('round-trips every setup, active selection, confirmations, signed sources and an unknown Ultimate bonus', async () => {
    const ws = defaultWorkspace();
    const second = blankHit();
    second.attack = { ...second.attack, crit: true, superCrit: true, ultimateBonus: null };
    second.effectEntries = { critDmg: [100, -50] };
    second.effects = { critDmg: 50 };
    second.confirmed = { 'attack.crit': true };
    ws.hits.push(second);
    ws.activeHitId = second.id;
    const restored = await decodeWorkspace(await encodeWorkspace(ws));
    expect(restored).toEqual(normalizeWorkspace(ws));
    expect(parseWorkspaceFile(exportWorkspaceFile(ws))).toEqual(restored);
    expect(restored?.activeHitId).toBe(second.id);
    expect(restored?.hits[1]?.attack.ultimateBonus).toBeNull();
  });
  it('still accepts valid legacy links without an envelope or setup IDs', async () => {
    const ws = defaultWorkspace();
    const { activeHitId: _active, ...legacy } = ws;
    void _active;
    const restored = await decodeWorkspace(
      legacyCode({
        ...legacy,
        hits: legacy.hits.map(({ id: _id, ...hit }) => {
          void _id;
          return hit;
        }),
      }),
    );
    expect(restored?.hits).toHaveLength(1);
  });
  it('does not silently truncate old storage and rejects transfers above the editor limit', async () => {
    const ws = defaultWorkspace();
    ws.hits[0]!.effectEntries = { critDmg: Array.from({ length: MAX_EFFECT_SOURCES + 1 }, () => 1) };
    expect(normalizeWorkspace(ws).hits[0]?.effectEntries?.critDmg).toHaveLength(MAX_EFFECT_SOURCES + 1);
    expect(() => validateWorkspaceData(ws)).toThrow(/at most 100/);
    await expect(encodeWorkspace(ws)).rejects.toThrow(/at most 100/);
    ws.hits[0]!.effectEntries!.critDmg!.pop();
    expect((await decodeWorkspace(await encodeWorkspace(ws)))?.hits[0]?.effectEntries?.critDmg).toHaveLength(MAX_EFFECT_SOURCES);
  });
  it('rejects invalid nested values atomically', () => {
    const ws = defaultWorkspace();
    ws.hits[0]!.attacker.battleAtk = Infinity;
    expect(() => exportWorkspaceFile(ws)).toThrow(/out of range/);
    expect(() => parseWorkspaceFile('{')).toThrow(/valid JSON/);
    expect(() => parseWorkspaceFile(JSON.stringify({ format: 'slimeim-buff-providers', version: 1, providers: [] }))).toThrow(/unsupported/);
  });
  it('labels incomplete summaries and totals without exporting placeholder zero damage', () => {
    const ws = defaultWorkspace();
    const hit = ws.hits[0]!;
    hit.attacker.battleAtk = 10000;
    hit.attack.kind = 'soul';
    hit.attack.power = 100;
    for (const r of getRequirements(hit, ws.enemy)) {
      if (r.key.startsWith('enemy.')) ws.enemy.confirmed = { ...ws.enemy.confirmed, [r.key]: true };
      else hit.confirmed = { ...hit.confirmed, [r.key]: true };
    }
    const calculated = calculateHit(toInput(hit, ws.enemy));
    ws.hits.push(blankHit());
    const text = summaryText(ws, new Map([[hit.id, calculated]]));
    expect(text).toContain('Setup 2: Incomplete');
    expect(text).toContain('Partial damage of 1 complete setups');
    expect(text).not.toContain('Setup 2: 0');
  });
});
