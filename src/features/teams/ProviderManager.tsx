import { useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { EFFECT_BY_ID, EFFECT_TYPES } from '../../domain/effects';
import { ATTRIBUTE_LABEL } from '../../domain/attributes';
import { ATTRIBUTES } from '../../domain/types';
import { DEFAULT_LIBRARY_FILTERS, providerMatchesLibraryFilters, type ProviderLibraryFilters, type ProviderEffectFilter } from '../../domain/providerFilters';
import { newId } from '../../domain/defaults';
import { exportProviderFile, mergeProviders, parseProviderFile } from '../../domain/providerFiles';
import {
  addToTestPool,
  deleteLibraryProvider,
  libraryProvider,
  poolProviders,
  removeFromTestPool,
  testPool,
  type ProviderLibrary,
} from '../../domain/providerLibrary';
import type { SupportUnit } from '../../domain/teams';
import { downloadJSON } from '../../components/download';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { Select, TextInput } from '../../components/inputs';
import { Card, Dialog } from '../../components/layout';
import ui from '../../components/ui.module.css';
import type { SaveState } from '../../state/storage';
import { ProviderCollection, ProviderViewToggle } from './ProviderDisplay';
import css from './providers.module.css';

const PAGE_SIZE = 8;
const EFFECT_FILTER_OPTIONS: { value: ProviderEffectFilter; label: string }[] = [
  { value: 'all', label: 'All effects' },
  { value: 'guaranteed:crit', label: 'Guaranteed Critical' },
  { value: 'guaranteed:pierce', label: 'Guaranteed Pierce' },
  { value: 'guaranteed:synergy', label: 'Guaranteed Synergy' },
  { value: 'guaranteed:aegis', label: 'Guaranteed Aegis' },
  ...EFFECT_TYPES.filter((type) => type.category !== 'stat' && type.category !== 'noEffect').map((type) => ({ value: type.id, label: type.label })),
];
type InclusionFilter = 'all' | 'included' | 'excluded';
const matches = (unit: SupportUnit, query: string) =>
  `${unit.name} ${unit.effects.map((effect) => EFFECT_BY_ID[effect.type].label).join(' ')} ${Object.keys(unit.triggers)
    .filter((key) => unit.triggers[key as keyof typeof unit.triggers])
    .map((key) => (key === 'crit' ? 'critical' : key))
    .join(' ')}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());

function Pagination({ page, total, onChange, label }: { page: number; total: number; onChange: (page: number) => void; label: string }) {
  if (total <= PAGE_SIZE) return null;
  return (
    <nav className={css.pagination} aria-label={label}>
      <span className={css.status}>
        Page {page + 1} of {Math.ceil(total / PAGE_SIZE)} · {total} providers
      </span>
      <div className={css.actions}>
        <button type="button" className={ui.button} disabled={page === 0} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button type="button" className={ui.button} disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}

export function ProviderManager({
  library,
  setLibrary,
  hitId,
  saveState,
  onEdit,
}: {
  library: ProviderLibrary;
  setLibrary: Dispatch<SetStateAction<ProviderLibrary>>;
  hitId: string;
  saveState: SaveState;
  onEdit: (unit: SupportUnit) => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<SupportUnit | null>(null);
  const [poolQuery, setPoolQuery] = useState('');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryFilters, setLibraryFilters] = useState(DEFAULT_LIBRARY_FILTERS);
  const [filter, setFilter] = useState<InclusionFilter>('all');
  const [poolPage, setPoolPage] = useState(0);
  const [libraryPage, setLibraryPage] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [fileMessage, setFileMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const entries = testPool(library, hitId);
  const inclusion = new Map(entries.map((entry) => [entry.id, entry.included]));
  const units = useMemo(() => poolProviders(library, hitId), [library, hitId]);
  const includedCount = entries.filter((entry) => entry.included).length;
  const filteredPool = units.filter((unit) => matches(unit, poolQuery) && (filter === 'all' || inclusion.get(unit.id) === (filter === 'included')));
  const filteredLibrary = library.providers.filter(
    (unit) => matches(unit, libraryQuery) && providerMatchesLibraryFilters(unit, libraryFilters, inclusion.has(unit.id)),
  );
  const hasLibraryFilters =
    Boolean(libraryQuery) ||
    Object.keys(DEFAULT_LIBRARY_FILTERS).some(
      (key) => libraryFilters[key as keyof ProviderLibraryFilters] !== DEFAULT_LIBRARY_FILTERS[key as keyof ProviderLibraryFilters],
    );
  const updateLibraryFilter = <K extends keyof ProviderLibraryFilters>(key: K, value: ProviderLibraryFilters[K]) => {
    setLibraryFilters((current) => ({ ...current, [key]: value }));
    setLibraryPage(0);
  };
  const currentPoolPage = Math.min(poolPage, Math.max(0, Math.ceil(filteredPool.length / PAGE_SIZE) - 1));
  const currentLibraryPage = Math.min(libraryPage, Math.max(0, Math.ceil(filteredLibrary.length / PAGE_SIZE) - 1));
  const libraryIds = useMemo(() => new Set(library.providers.map((unit) => unit.id)), [library.providers]);
  const pendingIds = pending.filter((id) => libraryIds.has(id) && !inclusion.has(id));
  const closeLibrary = () => {
    setLibraryOpen(false);
    setPending([]);
  };
  const setView = (key: 'pool' | 'library', view: 'list' | 'grid') => setLibrary((current) => ({ ...current, views: { ...current.views, [key]: view } }));

  const removeFromPool = (unit: SupportUnit) => {
    setLibrary((current) => removeFromTestPool(current, hitId, unit.id));
  };

  const exportProviders = (providers = library.providers) => {
    try {
      downloadJSON(exportProviderFile(providers), providers.length === 1 ? 'slimeim-buff-provider.json' : 'slimeim-buff-providers.json');
      setFileMessage(null);
    } catch (error) {
      setFileMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not export providers. Please try again.' });
    }
  };

  const importProviders = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setFileMessage(null);
    setIsImporting(true);
    try {
      const incoming = parseProviderFile(await file.text()).map(libraryProvider);
      const merged = mergeProviders(library.providers, incoming);
      if (merged.added || merged.updated) setLibrary((current) => ({ ...current, providers: merged.providers }));
      setFileMessage({ kind: 'success', text: `Import complete: ${merged.added} added, ${merged.updated} updated, ${merged.unchanged} unchanged.` });
    } catch (error) {
      setFileMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not read this provider file. Try another JSON file.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Card
        title="Test pool"
        subtitle="Add providers from the Library, then include or exclude them between combination runs. Removing one here keeps it in the Library."
        actions={<ProviderViewToggle label="Test pool" value={library.views.pool} onChange={(view) => setView('pool', view)} />}
      >
        <div className={css.toolbar}>
          <p className={css.status} role="status">
            {includedCount} included · {entries.length - includedCount} excluded · {entries.length} in this test pool
          </p>
          <button
            type="button"
            className={`${ui.button} ${ui.primary}`}
            onClick={() => {
              setLibraryOpen(true);
              setPending([]);
            }}
          >
            <Icon name="plus" /> Add from Library
          </button>
        </div>
        <div className={css.filters}>
          <Field label="Find a provider">
            {(id) => (
              <TextInput
                id={id}
                value={poolQuery}
                placeholder="Name or buff…"
                onChange={(query) => {
                  setPoolQuery(query);
                  setPoolPage(0);
                }}
              />
            )}
          </Field>
          <Field label="Show">
            {(id) => (
              <Select<InclusionFilter>
                id={id}
                value={filter}
                options={[
                  { value: 'all', label: 'All added' },
                  { value: 'included', label: 'Included' },
                  { value: 'excluded', label: 'Excluded' },
                ]}
                onChange={(value) => {
                  setFilter(value);
                  setPoolPage(0);
                }}
              />
            )}
          </Field>
        </div>
        <Pagination label="Test pool pages at top" page={currentPoolPage} total={filteredPool.length} onChange={setPoolPage} />
        {filteredPool.length ? (
          <ProviderCollection
            units={filteredPool.slice(currentPoolPage * PAGE_SIZE, (currentPoolPage + 1) * PAGE_SIZE)}
            view={library.views.pool}
            muteUnchecked
            checked={(unit) => inclusion.get(unit.id) === true}
            label={(unit) => `Include ${unit.name} in comparisons`}
            onToggle={(unit, included) =>
              setLibrary((current) => ({
                ...current,
                pools: { ...current.pools, [hitId]: testPool(current, hitId).map((entry) => (entry.id === unit.id ? { ...entry, included } : entry)) },
              }))
            }
            actions={(unit) => (
              <button
                type="button"
                className={ui.iconButton}
                aria-label={`Remove ${unit.name} from test pool`}
                title="Remove from test pool"
                onClick={() => removeFromPool(unit)}
              >
                <Icon name="close" />
              </button>
            )}
          />
        ) : (
          <p className={css.empty}>
            {units.length ? 'No providers match this search or filter.' : 'Your test pool is empty. Choose providers from the Library to start.'}
          </p>
        )}
        <Pagination label="Test pool pages at bottom" page={currentPoolPage} total={filteredPool.length} onChange={setPoolPage} />
        <p className={ui.note} role={saveState === 'unavailable' ? 'alert' : 'status'}>
          {saveState === 'saved'
            ? 'Library and test pools saved automatically in this browser.'
            : saveState === 'unavailable'
              ? 'Browser storage is unavailable. Export your Library to keep a backup before leaving this page.'
              : 'Saving Library and test pools…'}
        </p>
      </Card>

      <Dialog
        open={libraryOpen}
        onClose={closeLibrary}
        title="Provider Library"
        actions={<ProviderViewToggle label="Library" value={library.views.library} onChange={(view) => setView('library', view)} />}
        footer={
          <div className={css.footer}>
            <span className={css.status} aria-live="polite">
              {pendingIds.length} selected to add
            </span>
            <div className={css.actions}>
              <button
                type="button"
                className={`${ui.button} ${ui.primary}`}
                disabled={!pendingIds.length || isImporting}
                onClick={() => {
                  setLibrary((current) => addToTestPool(current, hitId, pendingIds));
                  closeLibrary();
                }}
              >
                Add {pendingIds.length || ''} provider{pendingIds.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        }
      >
        <div className={css.libraryBody}>
          <div className={css.toolbar}>
            <div className={css.actions}>
              <button
                type="button"
                className={ui.button}
                disabled={isImporting}
                onClick={() => onEdit({ id: newId(), name: '', skillCost: 80, effects: [{ type: 'soulDmg', value: 0, attribute: 'any' }], triggers: {} })}
              >
                <Icon name="plus" /> Create provider
              </button>
              <button type="button" className={ui.button} disabled={isImporting} onClick={() => fileInput.current?.click()}>
                <Icon name="arrowUp" />
                {isImporting ? 'Importing…' : 'Import providers'}
              </button>
              <button type="button" className={ui.button} disabled={isImporting || !library.providers.length} onClick={() => exportProviders()}>
                <Icon name="arrowDown" /> Export providers
              </button>
            </div>
          </div>
          <input ref={fileInput} type="file" hidden accept=".json,application/json" aria-label="Import buff providers from JSON" onChange={importProviders} />
          {fileMessage && (
            <p className={ui.note} role={fileMessage.kind === 'error' ? 'alert' : 'status'}>
              {fileMessage.text}
            </p>
          )}
          <Field label="Search Library" wide>
            {(id) => (
              <TextInput
                id={id}
                value={libraryQuery}
                placeholder="Search names or buffs…"
                onChange={(query) => {
                  setLibraryQuery(query);
                  setLibraryPage(0);
                }}
              />
            )}
          </Field>
          <div className={css.libraryFilters} role="group" aria-label="Library filters">
            <div className={css.libraryFilterHeading}>
              <h3 className={ui.groupTitle}>Filters</h3>
              <button
                type="button"
                className={`${ui.button} ${ui.ghost}`}
                disabled={!hasLibraryFilters}
                onClick={() => {
                  setLibraryFilters(DEFAULT_LIBRARY_FILTERS);
                  setLibraryQuery('');
                  setLibraryPage(0);
                }}
              >
                Clear filters
              </button>
            </div>
            <Field label="Effect">
              {(id) => (
                <Select<ProviderEffectFilter>
                  id={id}
                  value={libraryFilters.effect}
                  options={EFFECT_FILTER_OPTIONS}
                  onChange={(value) => updateLibraryFilter('effect', value)}
                />
              )}
            </Field>
            <Field label="Attribute">
              {(id) => (
                <Select<ProviderLibraryFilters['attribute']>
                  id={id}
                  value={libraryFilters.attribute}
                  options={[{ value: 'any', label: 'All attributes' }, ...ATTRIBUTES.map((value) => ({ value, label: ATTRIBUTE_LABEL[value] }))]}
                  onChange={(value) => updateLibraryFilter('attribute', value)}
                />
              )}
            </Field>
            <Field label="Attack type">
              {(id) => (
                <Select<ProviderLibraryFilters['attackType']>
                  id={id}
                  value={libraryFilters.attackType}
                  options={[
                    { value: 'any', label: 'All attack types' },
                    { value: 'physical', label: 'Physical' },
                    { value: 'magic', label: 'Magic' },
                  ]}
                  onChange={(value) => updateLibraryFilter('attackType', value)}
                />
              )}
            </Field>
            <Field label="Test pool">
              {(id) => (
                <Select<ProviderLibraryFilters['pool']>
                  id={id}
                  value={libraryFilters.pool}
                  options={[
                    { value: 'all', label: 'All providers' },
                    { value: 'available', label: 'Not added yet' },
                    { value: 'inPool', label: 'Already added' },
                  ]}
                  onChange={(value) => updateLibraryFilter('pool', value)}
                />
              )}
            </Field>
          </div>
          <Pagination label="Library pages at top" page={currentLibraryPage} total={filteredLibrary.length} onChange={setLibraryPage} />
          {filteredLibrary.length ? (
            <ProviderCollection
              units={filteredLibrary.slice(currentLibraryPage * PAGE_SIZE, (currentLibraryPage + 1) * PAGE_SIZE)}
              view={library.views.library}
              checked={(unit) => inclusion.has(unit.id) || pendingIds.includes(unit.id)}
              disabled={(unit) => isImporting || inclusion.has(unit.id)}
              label={(unit) => `${inclusion.has(unit.id) ? 'Already in test pool' : 'Add'} ${unit.name}`}
              status={(unit) => (inclusion.has(unit.id) ? 'In test pool' : pendingIds.includes(unit.id) ? 'Selected' : 'Available')}
              onToggle={(unit, selected) => setPending((current) => (selected ? [...current, unit.id] : current.filter((id) => id !== unit.id)))}
              actions={(unit) => (
                <>
                  <button
                    type="button"
                    className={ui.iconButton}
                    disabled={isImporting}
                    aria-label={`Edit ${unit.name}`}
                    title="Edit provider"
                    onClick={() => onEdit(unit)}
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    className={ui.iconButton}
                    disabled={isImporting}
                    aria-label={`Export ${unit.name}`}
                    title="Export provider"
                    onClick={() => exportProviders([unit])}
                  >
                    <Icon name="arrowDown" size={16} />
                  </button>
                  <button
                    type="button"
                    className={ui.iconButton}
                    disabled={isImporting}
                    aria-label={`Delete ${unit.name} from Library`}
                    title="Delete from Library"
                    onClick={() => setDeleting(unit)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </>
              )}
            />
          ) : (
            <p className={css.empty}>
              {library.providers.length
                ? 'No providers match these filters or search.'
                : 'Your Library is empty. Create a provider or import a provider backup.'}
            </p>
          )}
          <Pagination label="Library pages at bottom" page={currentLibraryPage} total={filteredLibrary.length} onChange={setLibraryPage} />
        </div>
      </Dialog>

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete provider from Library?"
        footer={
          <>
            <button type="button" className={ui.button} onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={`${ui.button} ${css.danger}`}
              onClick={() => {
                if (deleting) {
                  setLibrary((current) => deleteLibraryProvider(current, deleting.id));
                  setPending((current) => current.filter((id) => id !== deleting.id));
                }
                setDeleting(null);
              }}
            >
              Delete provider
            </button>
          </>
        }
      >
        <p className={css.deleteMessage}>
          Delete <b>{deleting?.name}</b> from your Library? This also removes it from every test pool. You can add it again by importing a provider backup.
        </p>
      </Dialog>
    </>
  );
}
