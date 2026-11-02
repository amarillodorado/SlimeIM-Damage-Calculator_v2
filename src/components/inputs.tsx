import { useEffect, useId, useState, type ReactNode } from 'react';
import ui from './ui.module.css';

const parse = (text: string): number | null => {
  const t = text.trim().replace(',', '.');
  if (t === '' || t === '-' || t === '.') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

interface NumberInputProps {
  id?: string;
  value: number | null;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  /** Signed fields get the keyboard with a minus key on phones. */
  allowNegative?: boolean;
  /** Decimal factors such as 1.16. */
  decimal?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  /** True only for an explicitly entered, finite numeric value; empty remains unanswered. */
  onConfirm?: (filled: boolean) => void;
  /** Optional unknown-value handling for fields whose cleared state is genuinely blank. */
  onEmpty?: () => void;
}

export function NumberInput({ id, value, onChange, suffix, min, max, allowNegative, decimal, ariaLabel, placeholder, onConfirm, onEmpty }: NumberInputProps) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  // Follow outside changes (reset, loaded links) without fighting the user's typing.
  useEffect(() => {
    setDraft((d) => (value === null ? '' : parse(d) === value ? d : String(value)));
  }, [value]);

  const floor = allowNegative ? min : (min ?? 0);
  const clamp = (n: number) => Math.min(max ?? 1e12, Math.max(floor ?? -1e12, decimal ? n : Math.trunc(n)));
  return (
    <div className={`${ui.inputWrap} ${suffix ? ui.hasSuffix : ''}`}>
      <input
        id={id}
        className={ui.input}
        type="number"
        inputMode={allowNegative ? undefined : 'decimal'}
        step={decimal ? 'any' : 1}
        min={floor}
        max={max}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parse(e.target.value);
          if (e.target.value.trim() === '' && onEmpty) onEmpty();
          else if (n !== null) onChange(clamp(n));
          onConfirm?.(e.target.value.trim() !== '' && n !== null && !['-', '.'].includes(e.target.value.trim()));
        }}
        onBlur={() => {
          setDraft(value === null ? '' : String(value));
        }}
        onFocus={(e) => e.target.select()}
        onWheel={(e) => e.currentTarget.blur()}
      />
      {suffix && (
        <span className={ui.suffix} aria-hidden="true">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxLength = 60,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  maxLength?: number;
}) {
  return (
    <input
      id={id}
      className={`${ui.input} ${ui.textInput}`}
      type="text"
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoComplete="off"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export interface Option<T extends string | number> {
  value: T;
  label: string;
  sub?: string;
  /** Shown but not selectable (e.g. a mechanic the calculator can't compute yet). */
  disabled?: boolean;
  title?: string;
}

/** Radio group styled as a segmented control; native radios give arrow-key support. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const name = useId();
  return (
    <div className={ui.seg} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <label key={String(o.value)} className={`${ui.segOption} ${o.value === value ? ui.segOn : ''} ${o.disabled ? ui.segDisabled : ''}`} title={o.title}>
          <input type="radio" name={name} checked={o.value === value} disabled={o.disabled} onClick={() => onChange(o.value)} onChange={() => {}} />
          <span>{o.label}</span>
          {o.sub && (
            <small>
              <span className="sr-only">, </span>
              {o.sub}
            </small>
          )}
        </label>
      ))}
    </div>
  );
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  hideLabel,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hideLabel?: boolean;
}) {
  return (
    <label className={ui.switch}>
      <input type="checkbox" role="switch" checked={checked} aria-label={hideLabel ? label : undefined} onChange={(e) => onChange(e.target.checked)} />
      <span className={ui.track} aria-hidden="true" />
      {!hideLabel && (
        <span className={ui.switchText}>
          {label}
          {description && (
            <small>
              <span className="sr-only">, </span>
              {description}
            </small>
          )}
        </span>
      )}
    </label>
  );
}

export function Select<T extends string>({
  id,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  id?: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <select
      id={id}
      className={ui.select}
      value={value}
      aria-label={ariaLabel}
      onClick={(e) => onChange(e.currentTarget.value as T)}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
