import { useRef, useState, type ChangeEvent } from 'react';
import { downloadJSON } from '../../components/download';
import { exportWorkspaceFile, MAX_WORKSPACE_BYTES, parseWorkspaceFile } from '../../domain/workspaceFiles';
import { useWorkspace } from '../../state/workspaceContext';
import ui from '../../components/ui.module.css';
import { exampleWorkspace } from '../../domain/exampleWorkspace';

export function WorkspaceTools() {
  const { workspace, dispatch, saveState, recoveryAvailable, recoverySaved, recoverPrevious } = useWorkspace();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_WORKSPACE_BYTES) throw new Error('Choose a workspace JSON file no larger than 1 MB.');
      const incoming = parseWorkspaceFile(await file.text());
      dispatch({ type: 'load', workspace: incoming });
      setMessage({ error: false, text: 'Workspace imported. Use Undo or Restore previous workspace to go back.' });
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : 'Could not import this workspace. Current work was preserved.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={ui.workspaceTools} aria-label="Workspace backup and saving">
      <div className={ui.fileActions}>
        <button
          type="button"
          className={ui.button}
          disabled={busy}
          onClick={() => {
            dispatch({ type: 'load', workspace: exampleWorkspace() });
            setMessage({ error: false, text: 'Illustrative example loaded: 6,900 damage. Use Undo or Restore previous workspace to go back.' });
          }}
        >
          Load example
        </button>
        <button
          type="button"
          className={ui.button}
          disabled={busy}
          onClick={() => {
            try {
              downloadJSON(exportWorkspaceFile(workspace), 'slimeim-workspace.json');
              setMessage({ error: false, text: 'Workspace exported.' });
            } catch (error) {
              setMessage({ error: true, text: error instanceof Error ? error.message : 'Could not export workspace.' });
            }
          }}
        >
          Export workspace
        </button>
        <button type="button" className={ui.button} disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? 'Importing…' : 'Import workspace'}
        </button>
        <button type="button" className={ui.button} disabled={!recoveryAvailable || busy} onClick={recoverPrevious}>
          Restore previous workspace
        </button>
        <input
          type="file"
          ref={fileInput}
          hidden
          accept=".json,application/json"
          aria-label="Import Calculator workspace from JSON"
          onChange={(event) => void importFile(event)}
        />
      </div>
      {saveState !== 'saved' && (
        <p className={ui.note} role={saveState === 'unavailable' ? 'alert' : 'status'}>
          {saveState === 'unavailable' ? 'Unable to save in this browser. Export your workspace before leaving to keep your changes.' : 'Saving workspace…'}
        </p>
      )}
      {!recoverySaved && (
        <p className={ui.note} role="alert">
          The previous workspace is available during this session, but its recovery snapshot could not be saved. Export a backup before leaving.
        </p>
      )}
      <p className={ui.note}>
        Workspace backups include the enemy, every setup, confirmations and selected setup. Buff providers have their own export in Teams.
      </p>
      {message && (
        <p className={ui.note} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
