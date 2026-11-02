import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import ui from './ui.module.css';

/**
 * "i" button that opens an explanation as an overlay (top layer), so opening it
 * never moves the surrounding layout. Desktop: a panel next to the button.
 * Phones: a bottom sheet (CSS). Uses the Popover API (light dismiss, Escape);
 * browsers without it get a small fallback with the same behaviour.
 */

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const SHEET_QUERY = '(max-width: 640px)';
const EDGE = 12;
const OFFSET = 8;

function placeNear(button: HTMLElement, panel: HTMLElement) {
  if (typeof window.matchMedia === 'function' && window.matchMedia(SHEET_QUERY).matches) {
    panel.style.removeProperty('top');
    panel.style.removeProperty('left');
    return;
  }
  const r = button.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const w = panel.offsetWidth || 340;
  const h = panel.offsetHeight;
  const left = Math.min(Math.max(EDGE, r.left + r.width / 2 - w / 2), vw - w - EDGE);
  const below = r.bottom + OFFSET;
  const above = r.top - h - OFFSET;
  const top = below + h <= vh - EDGE || above < EDGE ? below : above;
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
}

export function HelpPopover({ title, children }: { title: string; children: ReactNode }) {
  const id = `help-${useId().replace(/[^\w-]/g, '')}`;
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const place = useCallback(() => {
    if (button.current && panel.current) placeNear(button.current, panel.current);
  }, []);

  // Stay attached to the button while the page scrolls or the window resizes.
  useEffect(() => {
    if (!open) return;
    place();
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, place]);

  // Fallback only: what the Popover API does natively (Escape, click outside).
  useEffect(() => {
    if (supportsPopover || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const trigger = supportsPopover ? { popoverTarget: id } : { onClick: () => setOpen((o) => !o) };
  const close = supportsPopover ? { popoverTarget: id, popoverTargetAction: 'hide' as const } : { onClick: () => setOpen(false) };

  const content = (
    <>
      <div className={ui.popoverHead}>
        <strong>{title}</strong>
        <button type="button" className={ui.popoverClose} aria-label="Close explanation" {...close}>
          <Icon name="close" size={16} />
        </button>
      </div>
      {children}
    </>
  );

  return (
    <>
      <button ref={button} type="button" className={ui.infoButton} aria-label={`Explain ${title}`} aria-expanded={open} aria-controls={id} {...trigger}>
        <Icon name="info" size={16} />
      </button>
      {supportsPopover ? (
        <div
          ref={panel}
          id={id}
          popover="auto"
          role="dialog"
          aria-label={title}
          className={ui.popover}
          onBeforeToggle={(e) => {
            if (e.newState === 'open') place();
          }}
          onToggle={(e) => setOpen(e.newState === 'open')}
        >
          {content}
        </div>
      ) : (
        open && (
          <div ref={panel} id={id} role="dialog" aria-label={title} className={`${ui.popover} ${ui.popoverFallback}`}>
            {content}
          </div>
        )
      )}
    </>
  );
}
