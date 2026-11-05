import { useId, type CSSProperties } from 'react';
import { ATTRIBUTE_LABEL } from '../domain/attributes';
import { ATTRIBUTES, type Attribute } from '../domain/types';
import { useFieldAccessibility } from './fieldAccessibility';
import { Icon } from './Icon';
import { Switch } from './inputs';
import css from './AttributePicker.module.css';

export function AttributePicker({
  value,
  onChange,
  ariaLabel,
  plus = false,
  onPlusChange,
}: {
  value: Attribute;
  onChange: (attribute: Attribute) => void;
  ariaLabel: string;
  plus?: boolean;
  onPlusChange?: (plus: boolean) => void;
}) {
  const name = useId();
  const accessibility = useFieldAccessibility();
  return (
    <div className={css.picker}>
      <div className={css.options} role="radiogroup" aria-label={ariaLabel} {...accessibility}>
        {ATTRIBUTES.map((attribute) => (
          <label key={attribute} className={css.option} style={{ '--attribute-color': `var(--attr-${attribute})` } as CSSProperties}>
            <input type="radio" name={name} value={attribute} checked={attribute === value} onClick={() => onChange(attribute)} onChange={() => {}} />
            <span className={css.symbol}>
              <Icon name={attribute} size={24} />
            </span>
            <span>
              {ATTRIBUTE_LABEL[attribute]}
              {plus ? '+' : ''}
            </span>
          </label>
        ))}
      </div>
      {onPlusChange && <Switch label="+ attribute" checked={plus} onChange={onPlusChange} />}
    </div>
  );
}
