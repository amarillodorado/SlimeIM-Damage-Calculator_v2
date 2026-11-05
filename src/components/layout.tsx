import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Confidence } from '../domain/effects';
import type { Attribute } from '../domain/types';
import { loadJSON, saveJSON } from '../state/storage';
import { Icon } from './Icon';
import ui from './ui.module.css';

const COLLAPSED_KEY = 'slimeim.v6.collapsed';

/** Remembers per card id whether it is collapsed (a per-browser convenience). */
function useCollapsed(id: string | undefined, enabled: boolean) {
  const [collapsed, setCollapsed] = useState(() => {
    if (!enabled || !id) return false;
    const saved = loadJSON(COLLAPSED_KEY);
    return typeof saved === 'object' && saved !== null && (saved as Record<string, unknown>)[id] === true;
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled || !id) return;
    const saved = loadJSON(COLLAPSED_KEY);
    saveJSON(COLLAPSED_KEY, { ...(typeof saved === 'object' && saved !== null ? saved : {}), [id]: collapsed });
  }, [collapsed, enabled, id]);
  return [collapsed, () => setCollapsed((c) => !c)] as const;
}

interface CardProps {
  step?: number;
  title: string;
  subtitle?: ReactNode;
  /** Shown instead of the subtitle while the card is collapsed. */
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
  collapsible?: boolean;
}

export function Card({ step, title, subtitle, summary, actions, children, id, collapsible = false }: CardProps) {
  const [collapsed, toggle] = useCollapsed(id, collapsible);
  const titleId = id ? `${id}-title` : undefined;
  const bodyId = id ? `${id}-body` : undefined;
  const stepBadge = step !== undefined && (
    <span className={ui.step} aria-hidden="true">
      {step}
    </span>
  );
  const line = collapsed ? summary : subtitle;

  return (
    <section className={`${ui.card} ${collapsed ? ui.collapsed : ''}`} id={id} aria-labelledby={titleId}>
      <header className={ui.cardHead}>
        {collapsible ? (
          // Accordion pattern: the heading contains the toggle button.
          <h2 className={ui.cardHeading} id={titleId}>
            <button type="button" className={ui.cardToggle} aria-expanded={!collapsed} aria-controls={bodyId} onClick={toggle}>
              {stepBadge}
              <span className={ui.cardTitle}>{title}</span>
              <Icon name="chevronDown" className={ui.chevron} />
            </button>
          </h2>
        ) : (
          <h2 className={ui.cardHeading} id={titleId}>
            {stepBadge}
            <span className={ui.cardTitle}>{title}</span>
          </h2>
        )}
        {actions && !collapsed && <div className={ui.cardActions}>{actions}</div>}
      </header>
      {line && <p className={`${ui.cardSub} ${step !== undefined ? ui.indented : ''} ${collapsed ? ui.cardSummary : ''}`}>{line}</p>}
      <div id={bodyId} className={ui.cardBody} hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  verified: 'Observed match',
  client: 'Client analysis',
  assumed: 'Assumption',
  none: 'No damage effect',
};

export function ConfidenceBadge({ value, short }: { value: Confidence; short?: boolean }) {
  const label = CONFIDENCE_LABEL[value];
  return (
    <span className={`${ui.badge} ${ui[value]}`} title={label}>
      {value === 'verified' && <Icon name="check" size={12} />}
      {short ? label.split(' ')[0] : label}
    </span>
  );
}

export function AttributeDot({ attribute }: { attribute: Attribute }) {
  return <span className={ui.attrDot} style={{ background: `var(--attr-${attribute})` }} aria-hidden="true" />;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    // Clicking the backdrop (the dialog element itself) closes it; Escape is handled natively.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={ui.dialog}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className={ui.dialogInner}>
          <header className={ui.dialogHead}>
            <h2>{title}</h2>
            <div className={ui.dialogActions}>
              {actions}
              <button type="button" className={ui.iconButton} aria-label="Close" onClick={onClose}>
                <Icon name="close" />
              </button>
            </div>
          </header>
          <div className={ui.dialogBody}>{children}</div>
          {footer && <footer className={ui.dialogFoot}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
