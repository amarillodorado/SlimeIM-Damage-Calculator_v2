import { describe, expect, it } from 'vitest';
import type { SupportUnit } from './teams';
import { exportProviderFile, mergeProviders, parseProviderFile } from './providerFiles';
import { MAX_PROVIDER_EFFECTS, MAX_PROVIDER_NAME } from './providerLimits';

const unit = (id = 'a', patch: Partial<SupportUnit> = {}): SupportUnit => ({
  id,
  name: 'Provider',
  skillCost: 80,
  effects: [{ type: 'soulDmg', value: 20, attribute: 'any' }],
  triggers: {},
  ...patch,
});
const parse = (value: unknown) => parseProviderFile(JSON.stringify(value));

describe('portable provider files', () => {
  it('round-trips signed sources, scoped effects, outcomes, local images and notes without combining entries', () => {
    const source = unit('scoped', {
      name: 'Scoped provider',
      icon: 'units/Provider_5.png',
      note: 'Keep positive and negative sources separate.',
      effects: [
        { type: 'piercePower', value: 100, attribute: 'any', attackType: 'magic', target: 'single' },
        { type: 'piercePower', value: -50.5, attribute: 'any', attackType: 'magic', target: 'single' },
        { type: 'vsAttribute', value: 106, attribute: 'wind', attackType: 'any', target: 'all' },
      ],
      triggers: { crit: true, pierce: false, synergy: true, aegis: false },
    });
    const backup = exportProviderFile([source]);
    expect(JSON.parse(backup)).toMatchObject({ format: 'slimeim-buff-providers', version: 1 });
    expect(parseProviderFile(backup)).toEqual([source]);
  });

  it('accepts older raw arrays and fills missing optional scopes and outcomes', () => {
    const restored = parseProviderFile('\uFEFF' + JSON.stringify([unit()]));
    expect(restored[0]!.effects).toEqual([{ type: 'soulDmg', value: 20, attribute: 'any', attackType: 'any', target: 'any' }]);
    expect(restored[0]!.triggers).toEqual({ crit: false, pierce: false, synergy: false, aegis: false });
    expect(parse([])).toEqual([]);
    expect(parseProviderFile(exportProviderFile([]))).toEqual([]);
  });

  it('rejects malformed JSON, wrong formats, unsupported versions and unexpected envelope fields', () => {
    expect(() => parseProviderFile('{')).toThrow(/valid JSON/);
    const envelope = { format: 'slimeim-buff-providers', version: 1, providers: [] };
    expect(() => parse({ ...envelope, format: 'another-app' })).toThrow(/not a Slime IM/);
    expect(() => parse({ ...envelope, version: 2 })).toThrow(/version/);
    expect(() => parse({ ...envelope, version: '1' })).toThrow(/version/);
    expect(() => parse({ ...envelope, providers: null })).toThrow(/providers array/);
    expect(() => parse({ ...envelope, futureData: true })).toThrow(/unsupported field/);
  });

  it('rejects invalid identity and cost values instead of truncating or coercing them', () => {
    const invalid = [
      unit('', {}),
      unit(' '.repeat(2)),
      unit('a'.repeat(65)),
      unit('a', { name: ' ' }),
      unit('a', { name: 'n'.repeat(MAX_PROVIDER_NAME + 1) }),
      unit('a', { skillCost: -1 }),
      unit('a', { skillCost: 1.5 }),
      unit('a', { skillCost: 10000 }),
      { ...unit(), skillCost: '80' },
      { ...unit(), skillCost: null },
      { ...unit(), futureData: 'do not lose this' },
    ];
    for (const entry of invalid) expect(() => parse([entry])).toThrow();
    expect(() => parseProviderFile('[{"id":"a","name":"A","skillCost":1e999,"effects":[]}]')).toThrow(/skillCost/);
  });

  it('rejects unknown effect types, invalid restrictions and nonnumeric or out-of-range effect values', () => {
    const base = { type: 'soulDmg', value: 20, attribute: 'any' };
    const invalid = [
      { ...base, type: 'future-buff' },
      { ...base, value: '20' },
      { ...base, value: 100001 },
      { ...base, value: -100001 },
      { ...base, attribute: 'banana' },
      { ...base, attackType: 'both' },
      { ...base, target: 'enemy' },
      { ...base, unknown: 'extra' },
    ];
    for (const entry of invalid) expect(() => parse([{ ...unit(), effects: [entry] }])).toThrow();
    expect(() => parse([{ ...unit(), effects: null }])).toThrow(/effects/);
  });

  it('validates outcome flags, notes and local-only image paths', () => {
    const invalid = [
      { ...unit(), triggers: { crit: 1 } },
      { ...unit(), triggers: { superCritical: true } },
      { ...unit(), triggers: null },
      unit('a', { icon: 'https://example.com/p.png' }),
      unit('a', { icon: 'units/../secret.png' }),
      unit('a', { note: 'x'.repeat(121) }),
    ];
    for (const entry of invalid) expect(() => parse([entry])).toThrow();
  });

  it('round-trips a large Library without provider-count or backup-size caps', () => {
    const providers = Array.from({ length: 5000 }, (_, index) => unit(String(index)));
    const backup = exportProviderFile(providers);
    expect(new TextEncoder().encode(backup).byteLength).toBeGreaterThan(1024 * 1024);
    expect(parseProviderFile(backup).map((provider) => provider.id)).toEqual(providers.map((provider) => provider.id));
  });

  it('rejects duplicate IDs and invalid effect lists without silently dropping records', () => {
    expect(() => parse([unit('same'), unit('same', { name: 'Different provider' })])).toThrow(/duplicate ID/);
    expect(() => parse([unit('effects', { effects: Array.from({ length: MAX_PROVIDER_EFFECTS + 1 }, () => unit().effects[0]!) })])).toThrow(/at most 20/);
  });

  it('merges an exported file repeatedly without duplicating unchanged providers', () => {
    const incoming = parseProviderFile(exportProviderFile([unit('a'), unit('b')]));
    const first = mergeProviders([], incoming);
    expect([first.added, first.updated, first.unchanged]).toEqual([2, 0, 0]);
    const second = mergeProviders(first.providers, incoming);
    expect([second.added, second.updated, second.unchanged]).toEqual([0, 0, 2]);
    expect(second.providers).toHaveLength(2);
  });

  it('updates matching IDs in place, appends new providers and never mutates either source list', () => {
    const current = [unit('a'), unit('other')];
    const incoming = [unit('a', { skillCost: 40, effects: [] }), unit('new')];
    const beforeCurrent = structuredClone(current),
      beforeIncoming = structuredClone(incoming);
    const merged = mergeProviders(current, incoming);
    expect(merged.providers.map((provider) => provider.id)).toEqual(['a', 'other', 'new']);
    expect(merged.providers[0]!.skillCost).toBe(40);
    expect([merged.added, merged.updated, merged.unchanged]).toEqual([1, 1, 0]);
    expect(current).toEqual(beforeCurrent);
    expect(incoming).toEqual(beforeIncoming);
    expect(merged.providers[1]).not.toBe(current[1]);
    expect(merged.providers[2]!.effects).not.toBe(incoming[1]!.effects);
  });

  it('keeps different provider IDs even when their names and effects match', () => {
    const merged = mergeProviders([unit('first')], [unit('second')]);
    expect(merged.providers.map((provider) => provider.id)).toEqual(['first', 'second']);
    expect(merged.added).toBe(1);
  });

  it('appends to large Libraries while preserving existing entries and allowing updates', () => {
    const current = Array.from({ length: 250 }, (_, index) => unit(String(index)));
    const before = structuredClone(current);
    expect(mergeProviders(current, [unit('additional')]).providers).toHaveLength(251);
    expect(current).toEqual(before);
    const update = mergeProviders(current, [unit('0', { skillCost: 1 })]);
    expect(update.providers).toHaveLength(250);
    expect(update.updated).toBe(1);
    expect(mergeProviders(current, []).providers).toHaveLength(250);
  });
});
