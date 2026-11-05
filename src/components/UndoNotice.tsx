import { useEffect, useEffectEvent, useState } from 'react';
import ui from './ui.module.css';

export interface UndoMessage {
  id: number;
  text: string;
  undo: () => void;
}
/** Hover/focus pauses dismissal. Replaced workspaces also have persistent recovery. */
export function UndoNotice({ notice, onDismiss }: { notice: UndoMessage | null; onDismiss: () => void }) {
  return notice ? <ActiveUndoNotice key={notice.id} notice={notice} onDismiss={onDismiss} /> : null;
}

function ActiveUndoNotice({ notice, onDismiss }: { notice: UndoMessage; onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const dismiss = useEffectEvent(onDismiss);
  useEffect(() => {
    if (hovered || focused) return;
    const timer = window.setTimeout(() => dismiss(), 5000);
    return () => window.clearTimeout(timer);
  }, [hovered, focused]);
  return (
    <div
      className={ui.undoNotice}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <span role="status">{notice.text}</span>
      <button className={ui.button} type="button" onClick={notice.undo}>
        Undo
      </button>
      <button className={ui.iconButton} type="button" aria-label="Dismiss undo message" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
