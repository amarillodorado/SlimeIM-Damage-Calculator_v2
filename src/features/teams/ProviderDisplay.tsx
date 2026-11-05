import { useState, type ReactNode } from 'react';
import { ATTRIBUTE_LABEL } from '../../domain/attributes';
import { EFFECT_BY_ID } from '../../domain/effects';
import type { ProviderView } from '../../domain/providerLibrary';
import type { SupportUnit, UnitTriggers } from '../../domain/teams';
import { Icon } from '../../components/Icon';
import ui from '../../components/ui.module.css';
import css from './providers.module.css';

const HUES = [200, 260, 330, 20, 140, 45, 290, 170];
const TRIGGER_LABEL: Record<keyof UnitTriggers, string> = { crit: 'Critical', pierce: 'Pierce', synergy: 'Synergy', aegis: 'Aegis' };

export function Avatar({ unit, size = 40 }: { unit: SupportUnit; size?: number }) {
  const [failedIcon, setFailedIcon] = useState<string>();
  if (unit.icon && unit.icon !== failedIcon)
    return (
      <img
        className={css.avatar}
        src={`${import.meta.env.BASE_URL}${unit.icon}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailedIcon(unit.icon)}
      />
    );
  const hue = HUES[[...unit.name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % HUES.length];
  const initials = unit.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
  return (
    <span className={`${css.avatar} ${css.initials}`} style={{ width: size, height: size, background: `hsl(${hue} 65% 45%)` }} aria-hidden="true">
      {initials || '?'}
    </span>
  );
}

export function ProviderEffects({ unit }: { unit: SupportUnit }) {
  return (
    <div className={css.effects}>
      {unit.effects.map((effect, index) => (
        <span key={index} className={`${css.effect} ${effect.value < 0 ? css.negative : ''}`}>
          {EFFECT_BY_ID[effect.type].label}
          {effect.attackType && effect.attackType !== 'any' ? ` (${effect.attackType})` : ''}
          {effect.target && effect.target !== 'any' ? ` (${effect.target === 'single' ? 'single-target' : 'all-target'})` : ''}
          {effect.attribute !== 'any' ? ` (${ATTRIBUTE_LABEL[effect.attribute]})` : ''} {effect.value > 0 ? '+' : ''}
          {effect.value}%
        </span>
      ))}
      {(Object.keys(TRIGGER_LABEL) as (keyof UnitTriggers)[])
        .filter((trigger) => unit.triggers[trigger])
        .map((trigger) => (
          <span key={trigger} className={css.effect}>
            {TRIGGER_LABEL[trigger]}
          </span>
        ))}
      {unit.note && <p className={ui.note}>{unit.note}</p>}
      {unit.effects.length === 0 && !Object.values(unit.triggers).some(Boolean) && <span className={ui.note}>No effects entered.</span>}
    </div>
  );
}

export function ProviderViewToggle({ value, onChange, label }: { value: ProviderView; onChange: (view: ProviderView) => void; label: string }) {
  return (
    <div className={css.viewToggle} role="group" aria-label={`${label} view`}>
      {(['list', 'grid'] as const).map((view) => (
        <button
          key={view}
          type="button"
          className={ui.iconButton}
          aria-label={`${label} ${view} view`}
          title={`${view === 'list' ? 'List' : 'Grid'} view`}
          aria-pressed={value === view}
          onClick={() => onChange(view)}
        >
          <Icon name={view} />
        </button>
      ))}
    </div>
  );
}

export function ProviderCollection({
  units,
  view,
  checked,
  disabled,
  label,
  status,
  onToggle,
  actions,
  muteUnchecked = false,
}: {
  units: SupportUnit[];
  view: ProviderView;
  checked: (unit: SupportUnit) => boolean;
  disabled?: (unit: SupportUnit) => boolean;
  label: (unit: SupportUnit) => string;
  status?: (unit: SupportUnit) => string;
  onToggle: (unit: SupportUnit, checked: boolean) => void;
  actions: (unit: SupportUnit) => ReactNode;
  muteUnchecked?: boolean;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  return (
    <ul className={`${css.collection} ${view === 'grid' ? css.grid : css.list}`} data-mute-unchecked={muteUnchecked}>
      {units.map((unit) => (
        <li key={unit.id} className={css.provider} data-checked={checked(unit)}>
          <div className={css.providerTop}>
            <label className={css.selection}>
              <input
                type="checkbox"
                checked={checked(unit)}
                disabled={disabled?.(unit)}
                aria-label={label(unit)}
                onChange={(event) => onToggle(unit, event.currentTarget.checked)}
              />
              <Avatar unit={unit} size={view === 'grid' ? 64 : 40} />
              <span className={css.identity}>
                <b>{unit.name}</b>
                <span>
                  {unit.skillCost} SP{status && <> · {status(unit)}</>}
                </span>
              </span>
            </label>
            <div className={`${css.actions} ${css.providerActions}`} role="group" aria-label={`${unit.name} actions`}>
              {actions(unit)}
            </div>
          </div>
          <div className={css.providerTools}>
            <button
              type="button"
              className={`${ui.button} ${ui.ghost} ${css.effectToggle}`}
              aria-label={`Show effects for ${unit.name}`}
              aria-expanded={expanded.includes(unit.id)}
              onClick={() => setExpanded((current) => (current.includes(unit.id) ? current.filter((id) => id !== unit.id) : [...current, unit.id]))}
            >
              <Icon name="chevronDown" size={14} /> Effects
            </button>
          </div>
          {expanded.includes(unit.id) && <ProviderEffects unit={unit} />}
        </li>
      ))}
    </ul>
  );
}
