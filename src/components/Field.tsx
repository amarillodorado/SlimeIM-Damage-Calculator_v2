import { useContext, useId, type ReactNode } from 'react';
import { FIELD_HELP, type FieldHelp, type FieldKey } from '../domain/fields';
import { getMissingRequirements, getRequirements, type Requirement } from '../domain/requirements';
import type { InputKey } from '../domain/types';
import { WorkspaceContext } from '../state/workspaceContext';
import { HelpPopover } from './HelpPopover';
import { ConfidenceBadge } from './layout';
import ui from './ui.module.css';

interface FieldProps {
  /** Help entry from the catalogue; provides the label and the "i" explanation. */
  help?: FieldKey;
  /** Help that isn't in the catalogue (effect fields). */
  info?: FieldHelp;
  label?: string;
  /** Small marker next to the label (e.g. "used by this hit"). */
  badge?: ReactNode;
  /** Extra line below the control (computed values, warnings). */
  note?: ReactNode;
  wide?: boolean;
  /** Label a group of controls (radio groups, switches) instead of a single input. */
  group?: boolean;
  /** A shared validation key; highlights and readiness use the same requirement rules. */
  inputKey?: InputKey;
  /** Teams can introduce a conditional requirement absent from the base hit. */
  pendingRequirement?: Requirement;
  children: (id: string) => ReactNode;
}

/**
 * Label, control and optional note. Inside `ui.grid` the three parts sit on
 * shared rows (CSS subgrid), so wrapped labels or a note in one field never
 * push the inputs of its neighbours out of line. The explanation opens as an
 * overlay and doesn't change the layout at all.
 */
export function Field({ help, info, label, badge, note, wide, group, inputKey, pendingRequirement, children }: FieldProps) {
  const id = useId();
  const context = useContext(WorkspaceContext);
  const required =
    pendingRequirement ?? (context && inputKey ? getRequirements(context.activeHit, context.workspace.enemy).find((r) => r.key === inputKey) : undefined);
  const missing =
    pendingRequirement ??
    (context && inputKey ? getMissingRequirements(context.activeHit, context.workspace.enemy).find((r) => r.key === inputKey) : undefined);
  const highlighted = Boolean(missing && context?.workspace.highlightRequired !== false);
  const entry = info ?? (help ? FIELD_HELP[help] : undefined);
  const text = label ?? entry?.label ?? '';

  const body = (
    <>
      <div className={ui.labelRow}>
        {group ? (
          <span className={ui.label} id={`${id}-label`}>
            {text}
          </span>
        ) : (
          <label className={ui.label} htmlFor={id}>
            {text}
          </label>
        )}
        {badge}
        {highlighted && <span className={ui.requiredBadge}>Required</span>}
        {missing && !missing.message && required?.kind === 'number' && context && inputKey && (
          <button
            type="button"
            className={ui.confirmButton}
            aria-label={`Confirm ${text}`}
            onClick={() => context.dispatch({ type: 'confirmInput', key: inputKey, confirmed: true, hitId: context.activeHit.id })}
          >
            Confirm value
          </button>
        )}
        {entry && (
          <HelpPopover title={text}>
            <dl className={ui.helpList}>
              {entry.game && (
                <>
                  <dt>In the game</dt>
                  {entry.game.map((g) => (
                    <dd key={g}>“{g}”</dd>
                  ))}
                </>
              )}
              <dt>Where</dt>
              <dd>{entry.where}</dd>
              {entry.includes && (
                <>
                  <dt>Already includes</dt>
                  <dd>{entry.includes}</dd>
                </>
              )}
              <dt>Use</dt>
              <dd>{entry.use}</dd>
              {entry.example && (
                <>
                  <dt>Example</dt>
                  <dd>{entry.example}</dd>
                </>
              )}
            </dl>
            {entry.confidence && <ConfidenceBadge value={entry.confidence} />}
            {entry.image && (
              <img
                className={ui.helpImage}
                src={`${import.meta.env.BASE_URL}${entry.image.src}`}
                alt={entry.image.alt}
                width={640}
                height={481}
                loading="lazy"
              />
            )}
          </HelpPopover>
        )}
      </div>
      {children(id)}
      {(note || missing?.message) && (
        <div className={ui.note}>
          {missing?.message && <p className={ui.requiredNote}>{missing.message}</p>}
          {note && <div>{note}</div>}
        </div>
      )}
    </>
  );

  const className = `${ui.field} ${wide ? ui.wide : ''} ${highlighted ? ui.requiredField : ''}`;
  return group ? (
    <div
      className={className}
      role="group"
      aria-labelledby={`${id}-label`}
      data-input-key={inputKey}
      data-required={highlighted || undefined}
      data-incomplete={Boolean(missing) || undefined}
    >
      {body}
    </div>
  ) : (
    <div className={className} data-input-key={inputKey} data-required={highlighted || undefined} data-incomplete={Boolean(missing) || undefined}>
      {body}
    </div>
  );
}
