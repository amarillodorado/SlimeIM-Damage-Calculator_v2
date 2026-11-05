import { normalizeUnits } from './normalize';
import type { SupportUnit } from './teams';

export type ProviderView = 'list' | 'grid';
export interface ProviderSelection {
  id: string;
  included: boolean;
}
export interface ProviderLibrary {
  version: 1;
  providers: SupportUnit[];
  pools: Record<string, ProviderSelection[]>;
  views: { pool: ProviderView; library: ProviderView };
}

/** Inclusion belongs to a test pool, never to the shared provider definition. */
export function libraryProvider(unit: SupportUnit): SupportUnit {
  const result = { ...unit };
  delete result.enabled;
  return result;
}

export function testPool(library: ProviderLibrary, hitId: string): ProviderSelection[] {
  return Array.isArray(library.pools[hitId]) ? library.pools[hitId] : [];
}

/** Seed once, preserving every existing build and its edits. */
export function createProviderLibrary(presets: SupportUnit[], legacy: unknown, hitIds: string[]): ProviderLibrary {
  const saved = normalizeUnits(legacy);
  const ids = new Set(saved.map((unit) => unit.id));
  const providers = [...saved, ...presets.filter((unit) => !ids.has(unit.id))].map(libraryProvider);
  return {
    version: 1,
    providers,
    pools: Object.fromEntries(hitIds.map((id) => [id, saved.map((unit) => ({ id: unit.id, included: unit.enabled !== false }))])),
    views: { pool: 'list', library: 'grid' },
  };
}

const isRecord = (raw: unknown): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null && !Array.isArray(raw);

/** Restoring an empty library must not seed deleted presets again. */
export function normalizeProviderLibrary(raw: unknown): ProviderLibrary {
  const source = isRecord(raw) ? raw : {};
  const providers = normalizeUnits(source.providers).map(libraryProvider);
  const ids = new Set(providers.map((unit) => unit.id));
  const rawPools = isRecord(source.pools) ? source.pools : {};
  const pools = Object.fromEntries(
    Object.entries(rawPools).map(([hitId, entries]) => {
      const seen = new Set<string>();
      const selections = (Array.isArray(entries) ? entries : []).flatMap((entry): ProviderSelection[] => {
        if (!isRecord(entry) || typeof entry.id !== 'string' || !ids.has(entry.id) || seen.has(entry.id)) return [];
        seen.add(entry.id);
        return [{ id: entry.id, included: entry.included !== false }];
      });
      return [hitId, selections];
    }),
  );
  const views = isRecord(source.views) ? source.views : {};
  return {
    version: 1,
    providers,
    pools,
    views: { pool: views.pool === 'grid' ? 'grid' : 'list', library: views.library === 'list' ? 'list' : 'grid' },
  };
}

export function poolProviders(library: ProviderLibrary, hitId: string, includedOnly = false): SupportUnit[] {
  const byId = new Map(library.providers.map((unit) => [unit.id, unit]));
  return testPool(library, hitId).flatMap((entry) => {
    const unit = byId.get(entry.id);
    return unit && (!includedOnly || entry.included) ? [unit] : [];
  });
}

export function addToTestPool(library: ProviderLibrary, hitId: string, ids: string[]): ProviderLibrary {
  const pool = testPool(library, hitId);
  const seen = new Set(pool.map((entry) => entry.id));
  const available = new Set(library.providers.map((unit) => unit.id));
  const additions = ids.flatMap((id): ProviderSelection[] => {
    if (seen.has(id) || !available.has(id)) return [];
    seen.add(id);
    return [{ id, included: true }];
  });
  return { ...library, pools: { ...library.pools, [hitId]: [...pool, ...additions] } };
}

export function removeFromTestPool(library: ProviderLibrary, hitId: string, id: string): ProviderLibrary {
  return { ...library, pools: { ...library.pools, [hitId]: testPool(library, hitId).filter((entry) => entry.id !== id) } };
}

/** A confirmed Library deletion also removes references from every test pool. */
export function deleteLibraryProvider(library: ProviderLibrary, id: string): ProviderLibrary {
  return {
    ...library,
    providers: library.providers.filter((unit) => unit.id !== id),
    pools: Object.fromEntries(Object.entries(library.pools).map(([hitId, pool]) => [hitId, pool.filter((entry) => entry.id !== id)])),
  };
}
