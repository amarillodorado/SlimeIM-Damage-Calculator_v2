// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceProvider } from '../../state/WorkspaceProvider';
import { STORAGE_KEYS } from '../../state/storage';
import type { ProviderLibrary } from '../../domain/providerLibrary';
import { defaultWorkspace } from '../../domain/defaults';
import TeamsPage from './TeamsPage';

const show = () =>
  render(
    <WorkspaceProvider>
      <TeamsPage />
    </WorkspaceProvider>,
  );
const stored = (): ProviderLibrary => JSON.parse(localStorage.getItem(STORAGE_KEYS.providerLibrary)!);
const openLibrary = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Add from Library' }));
  return screen.getByRole('dialog', { name: 'Provider Library' });
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('provider Library and test-pool workflow', () => {
  it('adds a batch from the bundled Library and keeps inclusion, search and expanded effects across icon view changes', async () => {
    const user = userEvent.setup();
    const view = show();
    const library = await openLibrary(user);
    expect(within(library).getByRole('button', { name: 'Export providers' })).toBeEnabled();
    await user.click(within(library).getByRole('checkbox', { name: 'Add Violet WM' }));
    await user.click(within(library).getByRole('checkbox', { name: 'Add Aqua' }));
    await user.click(within(library).getByRole('button', { name: 'Add 2 providers' }));
    await user.click(screen.getByRole('checkbox', { name: 'Include Aqua in comparisons' }));
    await user.click(screen.getByRole('button', { name: 'Show effects for Violet WM' }));
    const query = screen.getByRole('textbox', { name: 'Find a provider' });
    await user.type(query, 'Violet');
    const grid = screen.getByRole('button', { name: 'Test pool grid view' });
    expect(grid).toHaveTextContent('');
    await user.click(grid);
    expect(grid).toHaveAttribute('aria-pressed', 'true');
    expect(query).toHaveValue('Violet');
    expect(screen.getByRole('button', { name: 'Show effects for Violet WM' })).toHaveAttribute('aria-expanded', 'true');
    await user.clear(query);
    expect(screen.getByRole('checkbox', { name: 'Include Aqua in comparisons' })).not.toBeChecked();
    expect(stored().providers.find((unit) => unit.id === 'aqua')!.enabled).toBeUndefined();
    view.unmount();
    show();
    expect(screen.getByRole('button', { name: 'Test pool grid view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: 'Include Aqua in comparisons' })).not.toBeChecked();
  });

  it('removes from the test pool immediately and leaves the provider available to add again', async () => {
    const user = userEvent.setup();
    show();
    let library = await openLibrary(user);
    await user.click(within(library).getByRole('checkbox', { name: 'Add Aqua' }));
    await user.click(within(library).getByRole('button', { name: 'Add 1 provider' }));
    await user.click(screen.getByRole('button', { name: 'Remove Aqua from test pool' }));
    expect(screen.queryByRole('checkbox', { name: 'Include Aqua in comparisons' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stored().providers.some((unit) => unit.id === 'aqua')).toBe(true);
    library = await openLibrary(user);
    expect(within(library).getByRole('checkbox', { name: 'Add Aqua' })).toBeEnabled();
  });

  it('confirms Library deletion, supports cancel, and keeps deleted bundled providers deleted on reload', async () => {
    const user = userEvent.setup();
    const view = show();
    let library = await openLibrary(user);
    await user.click(within(library).getByRole('checkbox', { name: 'Add Violet WM' }));
    await user.click(within(library).getByRole('button', { name: 'Add 1 provider' }));
    library = await openLibrary(user);
    await user.click(within(library).getByRole('button', { name: 'Delete Violet WM from Library' }));
    let confirmation = screen.getByRole('dialog', { name: 'Delete provider from Library?' });
    expect(confirmation).toHaveTextContent('every test pool');
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(stored().providers.some((unit) => unit.id === 'violet-wm')).toBe(true);
    await user.click(within(library).getByRole('button', { name: 'Delete Violet WM from Library' }));
    confirmation = screen.getByRole('dialog', { name: 'Delete provider from Library?' });
    await user.click(within(confirmation).getByRole('button', { name: 'Delete provider' }));
    expect(stored().providers.some((unit) => unit.id === 'violet-wm')).toBe(false);
    expect(Object.values(stored().pools).flat()).toEqual([]);
    view.unmount();
    show();
    library = await openLibrary(user);
    expect(within(library).queryByRole('button', { name: 'Delete Violet WM from Library' })).not.toBeInTheDocument();
    expect(stored().providers).toHaveLength(9);
  });

  it('searches the entire Library rather than only the current page', async () => {
    const user = userEvent.setup();
    show();
    const library = await openLibrary(user);
    expect(within(library).queryByRole('checkbox', { name: 'Add Milim V2 NYB' })).not.toBeInTheDocument();
    await user.type(within(library).getByRole('textbox', { name: 'Search Library' }), 'Milim');
    expect(within(library).getByRole('checkbox', { name: 'Add Milim V2 NYB' })).toBeInTheDocument();
  });

  it('combines Library effect filters and search without losing staged selections across views', async () => {
    const user = userEvent.setup();
    show();
    const library = await openLibrary(user);
    const filters = within(library).getByRole('group', { name: 'Library filters' });
    const effect = within(filters).getByRole('combobox', { name: 'Effect' });
    await user.selectOptions(effect, 'critDmg');
    expect(within(library).queryByRole('checkbox', { name: 'Add Aqua' })).not.toBeInTheDocument();
    await user.click(within(library).getByRole('checkbox', { name: 'Add Violet WM' }));
    await user.selectOptions(effect, 'piercePower');
    await user.click(within(library).getByRole('checkbox', { name: 'Add Aqua' }));
    await user.type(within(library).getByRole('textbox', { name: 'Search Library' }), 'Aqua');
    await user.click(within(library).getByRole('button', { name: 'Library list view' }));
    expect(effect).toHaveValue('piercePower');
    expect(within(library).getByRole('checkbox', { name: 'Add Aqua' })).toBeChecked();
    expect(within(library).getByRole('button', { name: 'Add 2 providers' })).toBeEnabled();
    await user.click(within(filters).getByRole('button', { name: 'Clear filters' }));
    expect(effect).toHaveValue('all');
    expect(within(library).getByRole('textbox', { name: 'Search Library' })).toHaveValue('');
    expect(within(library).getByRole('checkbox', { name: 'Add Violet WM' })).toBeChecked();
    await user.click(within(library).getByRole('button', { name: 'Add 2 providers' }));
    expect(screen.getByRole('checkbox', { name: 'Include Violet WM in comparisons' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Include Aqua in comparisons' })).toBeChecked();
  });

  it('filters Library membership by the current test pool even when a provider is excluded', async () => {
    const user = userEvent.setup();
    show();
    let library = await openLibrary(user);
    await user.click(within(library).getByRole('checkbox', { name: 'Add Aqua' }));
    await user.click(within(library).getByRole('button', { name: 'Add 1 provider' }));
    await user.click(screen.getByRole('checkbox', { name: 'Include Aqua in comparisons' }));
    library = await openLibrary(user);
    const membership = within(library).getByRole('combobox', { name: 'Test pool' });
    await user.selectOptions(membership, 'inPool');
    expect(within(library).getByRole('checkbox', { name: 'Already in test pool Aqua' })).toBeDisabled();
    expect(within(library).queryByRole('checkbox', { name: 'Add Violet WM' })).not.toBeInTheDocument();
    await user.selectOptions(membership, 'available');
    expect(within(library).queryByRole('checkbox', { name: 'Already in test pool Aqua' })).not.toBeInTheDocument();
    expect(within(library).getByRole('checkbox', { name: 'Add Violet WM' })).toBeEnabled();
  });

  it('applies filters across every Library page and returns to the first filtered page', async () => {
    const user = userEvent.setup();
    show();
    const library = await openLibrary(user);
    await user.click(within(library).getByRole('navigation', { name: 'Library pages at top' }).querySelector('button:last-child')!);
    expect(within(library).getByRole('checkbox', { name: 'Add Milim V2 NYB' })).toBeInTheDocument();
    await user.selectOptions(within(library).getByRole('combobox', { name: 'Effect' }), 'elementAtk');
    expect(within(library).getByRole('checkbox', { name: 'Add Hinata WoM' })).toBeInTheDocument();
    await user.selectOptions(within(library).getByRole('combobox', { name: 'Attribute' }), 'fire');
    await user.selectOptions(within(library).getByRole('combobox', { name: 'Attack type' }), 'magic');
    expect(within(library).getByRole('checkbox', { name: 'Add Hinata WoM' })).toBeInTheDocument();
    await user.selectOptions(within(library).getByRole('combobox', { name: 'Effect' }), 'guaranteed:aegis');
    expect(within(library).getByText('No providers match these filters or search.')).toBeInTheDocument();
    await user.click(within(library).getByRole('button', { name: 'Clear filters' }));
    expect(within(library).getByRole('checkbox', { name: 'Add Violet WM' })).toBeInTheDocument();
  });

  it('supports large collections and keeps the top and bottom pagers synchronized', async () => {
    const workspace = defaultWorkspace();
    const providers = Array.from({ length: 75 }, (_, index) => ({
      id: `provider-${index}`,
      name: `Provider ${index}`,
      skillCost: 40,
      effects: [],
      triggers: {},
    }));
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(workspace));
    localStorage.setItem(
      STORAGE_KEYS.providerLibrary,
      JSON.stringify({
        version: 1,
        providers,
        pools: { [workspace.activeHitId]: providers.map((provider) => ({ id: provider.id, included: true })) },
        views: { pool: 'list', library: 'grid' },
      }),
    );
    const user = userEvent.setup();
    show();
    await user.click(within(screen.getByRole('navigation', { name: 'Test pool pages at top' })).getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('checkbox', { name: 'Include Provider 8 in comparisons' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation', { name: 'Test pool pages at bottom' })).getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('checkbox', { name: 'Include Provider 0 in comparisons' })).toBeInTheDocument();
    const library = await openLibrary(user);
    expect(within(library).getByRole('button', { name: 'Create provider' })).toBeEnabled();
    expect(within(library).queryByText(/Bundled community presets/)).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation', { name: 'Library pages at top' })).getByRole('button', { name: 'Next' }));
    expect(within(library).getByRole('checkbox', { name: 'Already in test pool Provider 8' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation', { name: 'Library pages at bottom' })).getByRole('button', { name: 'Previous' }));
    expect(within(library).getByRole('checkbox', { name: 'Already in test pool Provider 0' })).toBeInTheDocument();
    expect(stored().providers).toHaveLength(75);
    expect(stored().pools[workspace.activeHitId]).toHaveLength(75);
  });
});
