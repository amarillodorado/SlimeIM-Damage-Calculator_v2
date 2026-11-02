import { useEffect, useRef, useState } from 'react';

// Storage can be missing or throw (private mode, blocked site data); the app works without it.
export function loadJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full */
  }
}

/** useState that is restored from and (debounced) saved to localStorage. */
export function usePersistentState<T>(key: string, init: () => T, normalize: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    const raw = loadJSON(key);
    return raw === undefined ? init() : normalize(raw);
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveJSON(key, value), 250);
    return () => clearTimeout(timer.current);
  }, [key, value]);
  return [value, setValue] as const;
}

export const STORAGE_KEYS = {
  workspace: 'slimeim.v6.1.workspace',
  units: 'slimeim.v6.units',
  teamSettings: 'slimeim.v6.teamSettings',
} as const;
