import { describe, expect, it } from 'vitest';
import { addToTestPool, createProviderLibrary, deleteLibraryProvider, normalizeProviderLibrary, poolProviders, removeFromTestPool } from './providerLibrary';
import type { SupportUnit } from './teams';

const unit = (id: string, enabled?: boolean): SupportUnit => ({ id, name: id, skillCost: 40, effects: [], triggers: {}, enabled });

describe('provider library and test pools', () => {
  it('migrates existing builds and inclusion choices without letting presets replace edits', () => {
    const edited = { ...unit('preset', false), skillCost: 65 };
    const library = createProviderLibrary([unit('preset'), unit('other')], [edited, unit('custom')], ['first', 'second']);
    expect(library.providers.map((provider) => [provider.id, provider.skillCost, provider.enabled])).toEqual([
      ['preset', 65, undefined],
      ['custom', 40, undefined],
      ['other', 40, undefined],
    ]);
    expect(poolProviders(library, 'first', true).map((provider) => provider.id)).toEqual(['custom']);
    expect(library.pools.first).toEqual(library.pools.second);
  });

  it('keeps pool removal local and allows readding a provider from the library', () => {
    let library = createProviderLibrary([unit('preset')], undefined, []);
    library = addToTestPool(library, 'first', ['preset', 'preset', 'missing']);
    library = addToTestPool(library, 'second', ['preset']);
    library = removeFromTestPool(library, 'first', 'preset');
    expect(poolProviders(library, 'first')).toEqual([]);
    expect(poolProviders(library, 'second')).toHaveLength(1);
    expect(library.providers).toHaveLength(1);
    expect(addToTestPool(library, 'first', ['preset']).pools.first).toEqual([{ id: 'preset', included: true }]);
  });

  it('deletes a bundled provider from every pool and does not reseed it after reload', () => {
    let library = createProviderLibrary([unit('preset')], undefined, []);
    library = addToTestPool(addToTestPool(library, 'first', ['preset']), 'second', ['preset']);
    library = normalizeProviderLibrary(JSON.parse(JSON.stringify(deleteLibraryProvider(library, 'preset'))));
    expect(library.providers).toEqual([]);
    expect(library.pools).toEqual({ first: [], second: [] });
  });

  it('migrates and restores large Libraries and test pools without truncating entries', () => {
    const saved = Array.from({ length: 250 }, (_, i) => unit(`custom-${i}`));
    const library = createProviderLibrary([unit('preset')], saved, ['first']);
    expect(library.providers.map((provider) => provider.id)).toEqual([...saved.map((provider) => provider.id), 'preset']);
    const restored = normalizeProviderLibrary(JSON.parse(JSON.stringify(library)));
    expect(restored.providers).toHaveLength(251);
    expect(poolProviders(restored, 'first')).toHaveLength(250);
    expect(addToTestPool(restored, 'first', ['preset']).pools.first).toHaveLength(251);
  });

  it('restores view choices and drops duplicate or dangling pool references', () => {
    const library = normalizeProviderLibrary({
      providers: [unit('one', false)],
      pools: { first: [{ id: 'one', included: false }, { id: 'one' }, { id: 'gone' }] },
      views: { pool: 'grid', library: 'list' },
    });
    expect(library.views).toEqual({ pool: 'grid', library: 'list' });
    expect(library.pools.first).toEqual([{ id: 'one', included: false }]);
    expect(poolProviders(library, 'first', true)).toEqual([]);
    expect(library.providers[0]!.enabled).toBeUndefined();
  });
});
