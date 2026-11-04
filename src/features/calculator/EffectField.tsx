import { EFFECT_BY_ID, effectLabel } from '../../domain/effects';
import { toInput } from '../../domain/engine';
import type { EffectTypeId } from '../../domain/types';
import { Field } from '../../components/Field';
import { NumberInput } from '../../components/inputs';
import ui from '../../components/ui.module.css';
import css from './calculator.module.css';
import { useWorkspace } from '../../state/workspaceContext';
import { useActiveHit } from './useCalculator';

/**
 * One buff or debuff of the hit being edited: the total of that type, labelled
 * for this hit (“Damage vs. Wind enemies”, “Dark ATK UP”). The “i” shows how
 * the game words it, so players can match the text they see.
 */
export function EffectField({ type }: { type: EffectTypeId }) {
  const { hit, setEffect, setEffectEntries } = useActiveHit();
  const { workspace } = useWorkspace();
  const t = EFFECT_BY_ID[type];
  const label = effectLabel(type, toInput(hit, workspace.enemy));
  const superType =
    (hit.attack.crit && hit.attack.superCrit && ['critDmg', 'critResDown'].includes(type)) ||
    (hit.attack.pierce === 'super' && ['piercePower', 'pierceResDown'].includes(type)) ||
    (hit.attack.synergy === 'super' && ['synergyPower', 'synergyResDown'].includes(type)) ||
    (hit.attack.aegis === 'super' && ['aegisPower', 'aegisResDown'].includes(type));
  // One field with the total per type; only Super hits need separate UP and DOWN rows.
  const separate = superType;
  const entries = hit.effectEntries?.[type] ?? [hit.effects[type] ?? 0];
  return (
    <Field
      label={label}
      group={separate}
      info={{ label, game: t.examples, where: t.where, use: t.effect, confidence: t.confidence }}
      note={
        separate
          ? `${['critDmg', 'critResDown'].includes(type) ? 'Super Critical boosts bonuses by 30%' : 'Super boosts bonuses by 20%'}; keep positive and negative effects separate. Effects with the same sign can share one entry.${type.endsWith('ResDown') ? ' Enter resistance UP as a negative value.' : ' Enter power DOWN as a negative value.'}`
          : undefined
      }
    >
      {(id) =>
        separate ? (
          <div className={css.stack}>
            {entries.map((value, index) => (
              <div className={css.effectEntry} key={index}>
                <NumberInput
                  id={`${id}-${index}`}
                  ariaLabel={`${label} source ${index + 1}`}
                  decimal
                  allowNegative
                  min={-100000}
                  max={100000}
                  value={value}
                  suffix="%"
                  onChange={(next) =>
                    setEffectEntries(
                      type,
                      entries.map((entry, i) => (i === index ? next : entry)),
                    )
                  }
                />
                <button
                  type="button"
                  className={ui.iconButton}
                  aria-label={`Remove ${label} source ${index + 1}`}
                  onClick={() =>
                    setEffectEntries(
                      type,
                      entries.filter((_, i) => i !== index),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className={ui.button} onClick={() => setEffectEntries(type, [...entries, 0])}>
              Add {label} source
            </button>
          </div>
        ) : (
          <NumberInput
            id={id}
            decimal
            allowNegative
            min={-100000}
            max={100000}
            value={hit.effects[type] ?? 0}
            suffix="%"
            onChange={(value) => setEffect(type, value)}
          />
        )
      }
    </Field>
  );
}
