import { ATTRIBUTE_LABEL } from '../../domain/attributes';
import type { HitSummary } from '../../domain/engine';
import { hrefFor } from '../../app/router';
import { AttributePicker } from '../../components/AttributePicker';
import { Field } from '../../components/Field';
import { NumberInput, Segmented, Switch, TextInput } from '../../components/inputs';
import { Card } from '../../components/layout';
import ui from '../../components/ui.module.css';
import css from './calculator.module.css';
import { EffectField } from './EffectField';
import { fmtInt, fmtPct } from './format';
import { useActiveHit } from './useCalculator';

export function AttackerCard({ result }: { result?: HitSummary }) {
  const { hit, setAttacker, confirmInput } = useActiveHit();
  const a = hit.attacker;
  const atkPct = hit.effects.atkPct ?? 0;

  return (
    <Card
      step={1}
      id="attacker"
      title="Attacker"
      collapsible
      summary={[
        a.name.trim() || 'Attacker',
        `${ATTRIBUTE_LABEL[a.attribute]}${a.plus ? '+' : ''} ${a.attackType === 'magic' ? 'magic' : 'physical'}`,
        `ATK ${fmtInt(result?.battleAtk ?? a.battleAtk)}${a.atkMode === 'build' ? ' (from pre-battle)' : ''}`,
        a.tau.active ? 'True Attribute Unbound' : '',
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      <Field help="attribute" inputKey="attacker.attribute" group wide>
        {() => (
          <AttributePicker
            ariaLabel="Attribute"
            value={a.attribute}
            plus={a.plus}
            onChange={(attribute) => setAttacker({ attribute })}
            onPlusChange={(plus) => setAttacker({ plus })}
          />
        )}
      </Field>
      <div className={`${ui.grid} ${css.identityGrid}`}>
        <Field label="Name (optional)">
          {(id) => <TextInput id={id} value={a.name} placeholder="Attacker name" onChange={(name) => setAttacker({ name })} />}
        </Field>
        <Field help="attackType" inputKey="attacker.attackType" group>
          {() => (
            <Segmented
              ariaLabel="Attack type"
              value={a.attackType}
              onChange={(attackType) => setAttacker({ attackType })}
              options={[
                { value: 'physical', label: 'Physical' },
                { value: 'magic', label: 'Magic' },
              ]}
            />
          )}
        </Field>
      </div>

      <div className={css.atkBox}>
        <div className={css.atkHead}>
          <h3>ATK</h3>
          <a href={hrefFor('guide', 'atk')} className={css.explain}>
            Which one should I use?
          </a>
        </div>
        <Field label="How do you enter ATK?" inputKey="attacker.atkMode" group wide>
          {() => (
            <Segmented
              ariaLabel="How do you enter ATK?"
              value={a.atkMode}
              onChange={(atkMode) => setAttacker({ atkMode })}
              options={[
                { value: 'battle', label: 'Battle ATK', sub: 'recommended' },
                { value: 'build', label: 'Pre-battle ATK', sub: 'estimate' },
              ]}
            />
          )}
        </Field>
        {a.atkMode === 'battle' ? (
          <>
            <p className={css.explain}>
              Read <b>ATK on the battle info panel</b>. It already includes ordinary ATK-stat effects, equipment and attached support stats. Enter separate
              attack-power and damage bonuses below.
            </p>
            <div className={ui.grid}>
              <Field help="battleAtk" inputKey="attacker.battleAtk">
                {(id) => (
                  <NumberInput
                    id={id}
                    value={a.battleAtk}
                    onChange={(battleAtk) => setAttacker({ battleAtk })}
                    onConfirm={(filled) => confirmInput('attacker.battleAtk', filled)}
                  />
                )}
              </Field>
            </div>
          </>
        ) : (
          <>
            <p className={css.explain}>
              Planning estimate: the <b>ATK under your character on the troop screen</b> (Status Attributes), plus every “Increased ATK by X%” it gets in battle
              — the Divine Protection’s too, the troop screen leaves it out. Use Battle ATK to check a real hit.
            </p>
            <div className={ui.grid}>
              <Field help="troopAtk" inputKey="attacker.troopAtk">
                {(id) => (
                  <NumberInput
                    id={id}
                    value={a.troopAtk}
                    onChange={(troopAtk) => setAttacker({ troopAtk })}
                    onConfirm={(filled) => confirmInput('attacker.troopAtk', filled)}
                  />
                )}
              </Field>
              <EffectField type="atkPct" />
            </div>
            {result && result.stats.length > 0 && (
              <div className={css.atkChain} aria-live="polite">
                <span>Troop {fmtInt(result.preBattleAtk ?? 0)}</span>
                {atkPct !== 0 && <span>{fmtPct(atkPct)}</span>}
                <span className={css.atkResult}>= Battle ATK {fmtInt(result.battleAtk)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {hit.attack.synergy !== 'off' && (
        <div className={ui.grid}>
          <Field help="supportAtk" inputKey="attacker.supportAtk" note="Required by the selected Synergy outcome.">
            {(id) => (
              <NumberInput
                id={id}
                value={a.supportAtk}
                onChange={(supportAtk) => setAttacker({ supportAtk })}
                onConfirm={(filled) => confirmInput('attacker.supportAtk', filled)}
              />
            )}
          </Field>
        </div>
      )}

      <div className={css.atkBox}>
        <div className={css.atkHead}>
          <Switch
            label="True Attribute Unbound active"
            description="Only “+” characters, during the turns on their skill page"
            checked={a.tau.active}
            onChange={(active) => setAttacker({ tau: { ...a.tau, active } })}
          />
        </div>
        {a.tau.active && !a.plus && (
          <p className={ui.note}>True Attribute Unbound requires a “+” attribute. Choose the eligible attribute above or switch this effect off.</p>
        )}
        {a.tau.active && hit.attack.popup === 'none' && (
          <p className={ui.note}>Choose Weak Point or Super Weak Point under Weakness result in step 2, or switch True Attribute Unbound off.</p>
        )}
        {a.tau.active && a.plus && hit.attack.popup !== 'none' && (
          <div className={ui.grid}>
            {hit.attack.popup === 'weak' ? (
              <Field help="tau" inputKey="attacker.tau.weak" label="Weak Point damage ×">
                {(id) => (
                  <NumberInput
                    id={id}
                    decimal
                    value={a.tau.weak}
                    max={10}
                    onChange={(weak) => setAttacker({ tau: { ...a.tau, weak } })}
                    onConfirm={(filled) => confirmInput('attacker.tau.weak', filled)}
                  />
                )}
              </Field>
            ) : (
              <Field help="tau" inputKey="attacker.tau.superWeak" label="Super Weak Point damage ×">
                {(id) => (
                  <NumberInput
                    id={id}
                    decimal
                    value={a.tau.superWeak}
                    max={10}
                    onChange={(superWeak) => setAttacker({ tau: { ...a.tau, superWeak } })}
                    onConfirm={(filled) => confirmInput('attacker.tau.superWeak', filled)}
                  />
                )}
              </Field>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
