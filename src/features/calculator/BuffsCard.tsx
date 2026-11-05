import { useState } from 'react';
import { BUFF_CATEGORIES, CATEGORY_LABEL, EFFECT_TYPES, effectLabel, type EffectType } from '../../domain/effects';
import { effectApplies, toInput } from '../../domain/engine';
import { hrefFor } from '../../app/router';
import { Card } from '../../components/layout';
import ui from '../../components/ui.module.css';
import { useWorkspace } from '../../state/workspaceContext';
import css from './calculator.module.css';
import { EffectField } from './EffectField';
import { fmtPct } from './format';
import { useActiveHit } from './useCalculator';

/**
 * Every other buff and debuff as a fixed field, sorted into groups. Fields that
 * can't count for this hit are hidden (e.g. Soul of Combos damage on a normal
 * orb). Matching attribute types are always visible; other rare types stay
 * behind “All types” unless they have a value.
 */
export function BuffsCard() {
  const { hit } = useActiveHit();
  const { workspace } = useWorkspace();
  const [showAll, setShowAll] = useState(false);
  const input = toInput(hit, workspace.enemy);

  const applicable = EFFECT_TYPES.filter((t) => BUFF_CATEGORIES.includes(t.category) && effectApplies(t.id, input).applies);
  const shown = (t: EffectType) => showAll || !t.advanced || Boolean(t.attribute) || (hit.effects[t.id] ?? 0) !== 0;
  const hidden = applicable.filter((t) => !shown(t)).length;
  const entered = applicable.filter((t) => hit.effects[t.id]);
  const summary = entered.length
    ? [
        ...entered.slice(0, 3).map((t) => `${effectLabel(t.id, input)} ${fmtPct(hit.effects[t.id] ?? 0)}`),
        entered.length > 3 ? `+${entered.length - 3} more` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : 'No buffs entered';

  return (
    <Card
      step={4}
      id="buffs"
      title="Buffs & debuffs"
      collapsible
      summary={summary}
      subtitle={
        <>
          The total per type from the battle effect list, equipment, EX abilities and the Soul of Combos — same types add up. Critical, Pierce, Synergy and
          Aegis buffs are in step 2, right under their special hit. <a href={hrefFor('guide', 'effects')}>Which field is it?</a>
        </>
      }
      actions={
        (hidden > 0 || showAll) && (
          <button type="button" className={`${ui.button} ${ui.ghost}`} aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Fewer types' : `All types (+${hidden})`}
          </button>
        )
      }
    >
      {BUFF_CATEGORIES.map((c) => {
        const types = applicable.filter((t) => t.category === c && shown(t));
        if (!types.length) return null;
        return (
          <section key={c} className={css.buffGroup} aria-labelledby={`buffs-${c}`}>
            <h3 className={ui.groupTitle} id={`buffs-${c}`}>
              {CATEGORY_LABEL[c]}
            </h3>
            <div className={ui.grid}>
              {types.map((t) => (
                <EffectField key={t.id} type={t.id} />
              ))}
            </div>
          </section>
        );
      })}
      {hit.attacker.plus && <p className={ui.note}>Ordinary and “+” attribute effects have separate fields and multiply independently.</p>}
    </Card>
  );
}
