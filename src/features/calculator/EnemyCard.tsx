import { ATTRIBUTE_LABEL } from '../../domain/attributes';
import type { Enemy, Guard } from '../../domain/types';
import { AttributePicker } from '../../components/AttributePicker';
import { Field } from '../../components/Field';
import { NumberInput, Segmented, Switch, TextInput } from '../../components/inputs';
import { Card } from '../../components/layout';
import ui from '../../components/ui.module.css';
import { useWorkspace } from '../../state/workspaceContext';
import css from './calculator.module.css';
import { fmtInt } from './format';
import { useActiveHit } from './useCalculator';

export function EnemyCard() {
  const { workspace, activeHit, dispatch } = useWorkspace();
  const { confirmInput } = useActiveHit();
  const e = workspace.enemy;
  const set = (patch: Partial<Enemy>) => dispatch({ type: 'updateEnemy', patch });
  const usesMagic = activeHit.attacker.attackType === 'magic';
  const used = (
    <span className={ui.labelBadge} title="This setup uses this resistance">
      used
    </span>
  );

  return (
    <Card
      step={3}
      id="enemy"
      title="Enemy"
      collapsible
      subtitle={workspace.hits.length > 1 ? 'Shared by all setups.' : undefined}
      summary={[
        e.name.trim() || 'Enemy',
        ATTRIBUTE_LABEL[e.attribute],
        `DEF ${fmtInt(e.def)}`,
        `${e.physRes}% physical / ${e.magicRes}% magic`,
        e.stunned ? 'stunned' : '',
        e.enamored ? 'enamored' : '',
        e.guard === 'guard' ? 'Guard' : e.guard === 'superGuard' ? 'Super Guard' : '',
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      <Field help="attribute" inputKey="enemy.attribute" label="Enemy attribute" group wide>
        {() => <AttributePicker ariaLabel="Enemy attribute" value={e.attribute} onChange={(attribute) => set({ attribute })} />}
      </Field>
      <div className={`${ui.grid} ${css.identityGrid}`}>
        <Field label="Name (optional)">{(id) => <TextInput id={id} value={e.name} placeholder="e.g. Tornado Ant" onChange={(name) => set({ name })} />}</Field>
        <Field help="enemyDef" inputKey="enemy.def">
          {(id) => <NumberInput id={id} value={e.def} onChange={(def) => set({ def })} onConfirm={(filled) => confirmInput('enemy.def', filled)} />}
        </Field>
        <Field
          help="enemyRes"
          inputKey="enemy.physRes"
          label="Physical resistance"
          badge={!usesMagic ? used : undefined}
          note={!usesMagic ? 'Required because this attacker uses Physical. Copy the enemy’s Physical Attack Resistance; a known 0% is valid.' : undefined}
        >
          {(id) => (
            <NumberInput
              id={id}
              decimal
              value={e.physRes}
              suffix="%"
              allowNegative
              onChange={(physRes) => set({ physRes })}
              onConfirm={(filled) => confirmInput('enemy.physRes', filled)}
            />
          )}
        </Field>
        <Field help="enemyRes" inputKey="enemy.magicRes" label="Magic resistance" badge={usesMagic ? used : undefined}>
          {(id) => (
            <NumberInput
              id={id}
              decimal
              value={e.magicRes}
              suffix="%"
              allowNegative
              onChange={(magicRes) => set({ magicRes })}
              onConfirm={(filled) => confirmInput('enemy.magicRes', filled)}
            />
          )}
        </Field>
      </div>
      <Field help="enemyStatus" group wide>
        {() => (
          <div className={css.inline}>
            <Switch label="Stunned" checked={e.stunned} onChange={(stunned) => set({ stunned })} />
            <Switch label="Enamored" checked={e.enamored} onChange={(enamored) => set({ enamored })} />
          </div>
        )}
      </Field>
      <Field help="guard" inputKey="enemy.guard" group wide>
        {() => (
          <Segmented<Guard>
            ariaLabel="Enemy guard"
            value={e.guard}
            onChange={(guard) => set({ guard })}
            options={[
              { value: 'none', label: 'No Guard' },
              { value: 'guard', label: 'Guard', sub: '×0.5' },
              { value: 'superGuard', label: 'Super Guard', sub: '×0.1' },
            ]}
          />
        )}
      </Field>
    </Card>
  );
}
