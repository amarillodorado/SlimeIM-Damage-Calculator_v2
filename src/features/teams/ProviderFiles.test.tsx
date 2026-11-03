// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportUnit } from '../../domain/teams';
import { STORAGE_KEYS } from '../../state/storage';
import { WorkspaceProvider } from '../../state/WorkspaceProvider';
import TeamsPage from './TeamsPage';

const unit = (id: string, name: string, value = 25): SupportUnit => ({
  id,
  name,
  skillCost: 40,
  effects: [{ type: 'piercePower', value, attribute: 'any', attackType: 'magic', target: 'single' }],
  triggers: { crit: false, pierce: true, synergy: false, aegis: false },
});

function providerFile(providers: SupportUnit[], text?: string): File {
  const contents = text ?? JSON.stringify({ format: 'slimeim-buff-providers', version: 1, providers });
  const file = new File([contents], 'providers.json', { type: 'application/json' });
  // jsdom does not implement Blob.text() in every bundled version.
  Object.defineProperty(file, 'text', { value: async () => contents });
  return file;
}

const stored = (): SupportUnit[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.units) ?? '[]');
const show = () => render(<WorkspaceProvider><TeamsPage /></WorkspaceProvider>);

const originalCreateURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalCreateURL) Object.defineProperty(URL, 'createObjectURL', originalCreateURL);
  else Reflect.deleteProperty(URL, 'createObjectURL');
  if (originalRevokeURL) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeURL);
  else Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('buff provider file controls', () => {
  it('merges an import, saves it immediately and imports the same file again without duplicates', async () => {
    const original = unit('edit-me', 'Old build');
    const unrelated = unit('keep-me', 'Unrelated build', 15);
    localStorage.setItem(STORAGE_KEYS.units, JSON.stringify([original, unrelated]));
    const updated = { ...unit('edit-me', 'Updated build', -10), skillCost: 65, note: 'Signed effect retained' };
    const added = unit('add-me', 'New build', 50);
    const user = userEvent.setup();
    show();
    expect(screen.getByText('Saved automatically in this browser for this website address.')).toBeInTheDocument();
    const upload = screen.getByLabelText('Import buff providers from JSON');
    const file = providerFile([updated, added]);
    await user.upload(upload, file);
    expect(await screen.findByText('Import complete: 1 added, 1 updated, 0 unchanged.')).toBeInTheDocument();
    expect(screen.getByText('Updated build')).toBeInTheDocument();
    expect(screen.getByText('Unrelated build')).toBeInTheDocument();
    expect(screen.getByText('New build')).toBeInTheDocument();
    expect(screen.queryByText('Old build')).not.toBeInTheDocument();
    expect(stored()).toEqual([updated, unrelated, added]);

    await user.upload(upload, file);
    expect(await screen.findByText('Import complete: 0 added, 0 updated, 2 unchanged.')).toBeInTheDocument();
    expect(stored()).toEqual([updated, unrelated, added]);
  });

  it('reports a malformed file without altering existing providers or their saved data', async () => {
    const existing = unit('keep-me', 'Keep this build');
    localStorage.setItem(STORAGE_KEYS.units, JSON.stringify([existing]));
    const user = userEvent.setup();
    show();
    const before = localStorage.getItem(STORAGE_KEYS.units);
    await user.upload(screen.getByLabelText('Import buff providers from JSON'), providerFile([], '{"providers":'));
    await waitFor(() => {
      expect(screen.getAllByRole('alert').some((element) => /JSON/i.test(element.textContent ?? ''))).toBe(true);
    });
    expect(screen.getByText('Keep this build')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.units)).toBe(before);
    expect(stored()).toEqual([existing]);
  });

  it('exports the current provider pool as versioned JSON with costs, scopes and signed effects', async () => {
    const providers = [unit('one', 'First build', -15), unit('two', 'Second build', 50)];
    localStorage.setItem(STORAGE_KEYS.units, JSON.stringify(providers));
    let exported: Blob | undefined;
    const createURL = vi.fn((blob: Blob) => { exported = blob; return 'blob:provider-download'; });
    const revokeURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeURL });
    const downloads: { href: string; filename: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ href: this.href, filename: this.download });
    });
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('button', { name: 'Export providers' }));
    expect(createURL).toHaveBeenCalledOnce();
    expect(downloads).toEqual([{ href: 'blob:provider-download', filename: 'slimeim-buff-providers.json' }]);
    expect(exported?.type).toBe('application/json');
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exported!);
    });
    expect(JSON.parse(text)).toMatchObject({ format: 'slimeim-buff-providers', version: 1, providers });
    await waitFor(() => expect(revokeURL).toHaveBeenCalledWith('blob:provider-download'), { timeout: 2000 });
  });

  it('disables export for an empty provider pool', () => {
    show();
    expect(screen.getByRole('button', { name: 'Export providers' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Import providers' })).toBeEnabled();
  });
});
