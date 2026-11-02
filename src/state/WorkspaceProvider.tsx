import { useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { defaultWorkspace } from '../domain/defaults';
import { normalizeWorkspace } from '../domain/normalize';
import type { Workspace } from '../domain/types';
import { loadJSON, saveJSON, STORAGE_KEYS } from './storage';
import { WorkspaceContext } from './workspaceContext';
import { workspaceReducer } from './workspaceReducer';

export function WorkspaceProvider({ children, initial }: { children: ReactNode; initial?: Workspace }) {
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, () => {
    if (initial) return initial;
    const saved = loadJSON(STORAGE_KEYS.workspace);
    return saved === undefined ? defaultWorkspace() : normalizeWorkspace(saved);
  });

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveJSON(STORAGE_KEYS.workspace, workspace), 250);
    return () => clearTimeout(timer.current);
  }, [workspace]);

  const value = useMemo(
    () => ({ workspace, dispatch, activeHit: workspace.hits.find((h) => h.id === workspace.activeHitId) ?? workspace.hits[0]! }),
    [workspace],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
