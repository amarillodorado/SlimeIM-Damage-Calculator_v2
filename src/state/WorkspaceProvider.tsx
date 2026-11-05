import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { exampleWorkspace } from '../domain/exampleWorkspace';
import { normalizeWorkspace } from '../domain/normalize';
import type { Workspace } from '../domain/types';
import { loadJSON, saveJSON, STORAGE_KEYS, type SaveState } from './storage';
import { WorkspaceContext } from './workspaceContext';
import { workspaceReducer, type WorkspaceAction } from './workspaceReducer';
import { validateWorkspaceData } from '../domain/workspaceFiles';
import type { UndoMessage } from '../components/UndoNotice';

export function WorkspaceProvider({ children, initial }: { children: ReactNode; initial?: Workspace }) {
  const [workspace, setWorkspace] = useState(() => {
    if (initial) return initial;
    const saved = loadJSON(STORAGE_KEYS.workspace);
    return saved === undefined ? exampleWorkspace() : normalizeWorkspace(saved);
  });

  const current = useRef(workspace);
  const [saveState, setSaveState] = useState<SaveState>('saving');
  const [recovery, setRecovery] = useState<Workspace | null>(() => {
    try {
      return validateWorkspaceData(loadJSON(STORAGE_KEYS.recovery));
    } catch {
      return null;
    }
  });
  const [recoverySaved, setRecoverySaved] = useState(true);
  const [notice, setNotice] = useState<UndoMessage | null>(null);
  const noticeId = useRef(0);
  const dismissNotice = useCallback(() => setNotice(null), []);

  // Commit immediately, like provider saving. No pending debounce is lost when the page exits.
  useLayoutEffect(() => {
    setSaveState(saveJSON(STORAGE_KEYS.workspace, workspace) ? 'saved' : 'unavailable');
  }, [workspace]);
  useEffect(() => {
    const flush = () => {
      saveJSON(STORAGE_KEYS.workspace, current.current);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const remember = useCallback((previous: Workspace) => {
    setRecovery(previous);
    setRecoverySaved(saveJSON(STORAGE_KEYS.recovery, previous));
  }, []);
  const commit = useCallback((next: Workspace) => {
    current.current = next;
    setWorkspace(next);
  }, []);
  const dispatch = useCallback(
    (action: WorkspaceAction) => {
      const previous = current.current;
      const next = workspaceReducer(previous, action);
      if (next === previous) return;
      if (action.type === 'load' || action.type === 'clear' || action.type === 'removeHit') {
        remember(previous);
        const deletedIndex = action.type === 'removeHit' ? previous.hits.findIndex((hit) => hit.id === action.id) : -1;
        const deleted = previous.hits[deletedIndex];
        setNotice({
          id: ++noticeId.current,
          text: deleted
            ? 'Setup removed.'
            : action.type === 'clear'
              ? 'Workspace cleared.'
              : 'Workspace loaded. Your previous workspace is available to restore.',
          undo: () => {
            const restored = deleted ? workspaceReducer(current.current, { type: 'restoreHit', hit: deleted, index: deletedIndex }) : previous;
            if (restored === current.current) return;
            remember(current.current);
            commit(restored);
            setNotice(null);
          },
        });
      }
      commit(next);
    },
    [commit, remember],
  );
  const recoverPrevious = useCallback(() => {
    if (recovery) dispatch({ type: 'load', workspace: recovery });
  }, [recovery, dispatch]);

  const value = {
    workspace,
    dispatch,
    activeHit: workspace.hits.find((h) => h.id === workspace.activeHitId) ?? workspace.hits[0]!,
    saveState,
    recoveryAvailable: !!recovery,
    recoverySaved,
    recoverPrevious,
    notice,
    dismissNotice,
  };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
