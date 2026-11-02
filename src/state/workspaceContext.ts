import { createContext, useContext } from 'react';
import type { Hit, Workspace } from '../domain/types';
import type { WorkspaceAction } from './workspaceReducer';

export interface WorkspaceContextValue {
  workspace: Workspace;
  activeHit: Hit;
  dispatch: (action: WorkspaceAction) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
