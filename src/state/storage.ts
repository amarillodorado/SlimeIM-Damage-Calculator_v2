import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Storage can be missing or throw (private mode, blocked site data); the app works without it.
export function loadJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveJSON(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return false;
    localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export type SaveState = 'saving' | 'saved' | 'unavailable';

/** Restore browser state; immediate mode saves each commit before navigation can unmount it. */
export function usePersistentState<T>(key: string, init: () => T, normalize: (raw: unknown) => T, options?: { immediate?: boolean }) {
  const [value, setValue] = useState<T>(() => {
    const raw = loadJSON(key);
    return raw === undefined ? init() : normalize(raw);
  });
  const [saveState, setSaveState] = useState<SaveState>('saving');
  const immediate = options?.immediate === true;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useLayoutEffect(() => {
    if (immediate) setSaveState(saveJSON(key, value) ? 'saved' : 'unavailable');
  }, [key, value, immediate]);

  useEffect(() => {
    if (immediate) return;
    clearTimeout(timer.current);
    setSaveState('saving');
    timer.current = setTimeout(() => setSaveState(saveJSON(key, value) ? 'saved' : 'unavailable'), 250);
    return () => clearTimeout(timer.current);
  }, [key, value, immediate]);
  return [value, setValue, saveState] as const;
}

export const STORAGE_KEYS = {
  workspace: 'slimeim.v6.1.workspace',
  units: 'slimeim.v6.units',
  teamSettings: 'slimeim.v6.teamSettings',
} as const;
