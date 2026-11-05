// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadJSON, saveJSON, STORAGE_KEYS, usePersistentState } from './storage';

const normalize = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((name): name is string => typeof name === 'string') : []);

function ProviderHarness({ immediate = true }: { immediate?: boolean }) {
  const [providers, setProviders, saveState] = usePersistentState(STORAGE_KEYS.units, () => [] as string[], normalize, { immediate });
  return (
    <>
      <button onClick={() => setProviders((previous) => [...previous, 'New provider'])}>Add provider</button>
      <output aria-label="Providers">{providers.join(', ')}</output>
      <output aria-label="Save state">{saveState}</output>
    </>
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('browser provider persistence', () => {
  it('retains a committed edit when the page immediately unmounts and reopens', () => {
    localStorage.setItem(STORAGE_KEYS.units, JSON.stringify(['Existing provider']));
    const view = render(<ProviderHarness />);
    expect(screen.getByLabelText('Providers')).toHaveTextContent('Existing provider');
    fireEvent.click(screen.getByRole('button', { name: 'Add provider' }));
    expect(loadJSON(STORAGE_KEYS.units)).toEqual(['Existing provider', 'New provider']);
    view.unmount();
    render(<ProviderHarness />);
    expect(screen.getByLabelText('Providers')).toHaveTextContent('Existing provider, New provider');
    expect(screen.getByLabelText('Save state')).toHaveTextContent('saved');
  });

  it('reports failed storage honestly while retaining the current in-memory changes', () => {
    const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    render(<ProviderHarness />);
    expect(screen.getByLabelText('Save state')).toHaveTextContent('unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Add provider' }));
    expect(screen.getByLabelText('Providers')).toHaveTextContent('New provider');
    expect(screen.getByLabelText('Save state')).toHaveTextContent('unavailable');
    expect(loadJSON(STORAGE_KEYS.units)).toBeUndefined();
    save.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Add provider' }));
    expect(screen.getByLabelText('Save state')).toHaveTextContent('saved');
    expect(loadJSON(STORAGE_KEYS.units)).toEqual(['New provider', 'New provider']);
  });

  it('handles blocked storage reads and writes without making the form unusable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    render(<ProviderHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add provider' }));
    expect(screen.getByLabelText('Providers')).toHaveTextContent('New provider');
    expect(screen.getByLabelText('Save state')).toHaveTextContent('unavailable');
  });

  it('preserves the default debounce for other persistent state', () => {
    vi.useFakeTimers();
    render(<ProviderHarness immediate={false} />);
    act(() => vi.advanceTimersByTime(200));
    expect(loadJSON(STORAGE_KEYS.units)).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Add provider' }));
    act(() => vi.advanceTimersByTime(249));
    expect(loadJSON(STORAGE_KEYS.units)).toBeUndefined();
    expect(screen.getByLabelText('Save state')).toHaveTextContent('saving');
    act(() => vi.advanceTimersByTime(1));
    expect(loadJSON(STORAGE_KEYS.units)).toEqual(['New provider']);
    expect(screen.getByLabelText('Save state')).toHaveTextContent('saved');
  });
});

describe('JSON browser storage helpers', () => {
  it('reports serialization failure without replacing the previous saved value', () => {
    expect(saveJSON('existing', { safe: true })).toBe(true);
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(saveJSON('existing', circular)).toBe(false);
    expect(loadJSON('existing')).toEqual({ safe: true });
  });
});
