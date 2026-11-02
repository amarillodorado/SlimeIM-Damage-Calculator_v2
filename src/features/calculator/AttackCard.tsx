import { useMemo, type ReactNode } from 'react';
import { chartMatchup, MATCHUP_LABEL } from '../../domain/attributes';
import { ASSIST_SHARE, CRIT_BASE, getAttributeFactor, MATCHUP_BASE, PIERCE_ATK_SHARE, PLUS_ADVANTAGE_BONUS, toInput } from '../../domain/engine';
import type { ComboPosition, HitKind, InputKey, MatchupChoice, Popup, Proc, SoulVariant, TargetType } from '../../domain/types';
import { Field } from '../../components/Field';
import { NumberInput, Segmented, Select, Switch, type Option } from '../../components/inputs';
import { Card } from '../../components/layout';
import ui from '../../components/ui.module.css';
import { useWorkspace } from '../../state/workspaceContext';
import css from './calculator.module.css';
import { EffectField } from './EffectField';
import { attackLabel, fmtInt, hitTags } from './format';
import { useActiveHit } from './useCalculator';

const KIND_OPTIONS: Option<HitKind>[] = [
  { value: 'soulOfCombos', label: 'Soul of Combos', sub: 'secret skill' },
  { value: 'soul', label: 'Normal orb', sub: 'every other orb' },
];
const VARIANT_OPTIONS: Option<SoulVariant>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'ex', label: 'EX' },
  { value: 'ultimate', label: 'Ultimate' },
];
const COMBO_OPTIONS: Option<ComboPosition>[] = ([1, 2, 3, 4, 5, 6] as const).map((position) => ({ value: position, label: String(position) }));
const POPUP_OPTIONS: Option<Popup>[] = [
  { value: 'none', label: 'None' },
  { value: 'weak', label: 'Weak Point!' },
  { value: 'superWeak', label: 'Super Weak Point!' },
];
const procOptions: Option<Proc>[] = [
  { value: 'off', label: 'Off' },
  { value: 'normal', label: 'On' },
  { value: 'super', label: 'Super' },
];
const critOptions: Option<Proc>[] = [
  { value: 'off', label: 'Off' },
  { value: 'normal', label: 'On' },
];
const FINISHER_OPTIONS: Option<number>[] = [
  { value: 1, label: 'None', sub: '100%' },
  { value: 1.1, label: '4 cards', sub: '110%' },
  { value: 1.5, label: '5 cards', sub: '150%' },
  { value: 2, label: '6 cards', sub: '200%' },
];
const pct = (share: number) => `${Math.round(share * 100)}%`;

/** A special hit: its switch, what it does and — while it is on — the buffs that only count for it. */
function SpecialHit({
  inputKey,
  title,
  description,
  control,
  active,
  children,
}: {
  inputKey: InputKey;
  title: string;
  description: string;
  control: ReactNode;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Field inputKey={inputKey} label={title} group wide>
      {() => (
        <div className={`${css.special} ${active ? css.specialOn : ''}`}>
          <div className={css.specialHead}>
            <div className={css.specialText}>
              <p className={css.explain}>{description}</p>
            </div>
            <div className={css.specialControl}>{control}</div>
          </div>
          {active && <div className={ui.grid}>{children}</div>}
        </div>
      )}
    </Field>
  );
}

export function AttackCard() {
  const { hit, setAttack, setAttacker, confirmInput } = useActiveHit();
  const { workspace } = useWorkspace();
  const k = hit.attack;
  const a = hit.attacker;
  const affinity = useMemo(() => {
    try {
      return { value: getAttributeFactor(toInput(hit, workspace.enemy)), error: undefined };
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return { value: null, error: error.message };
    }
  }, [hit, workspace.enemy]);

  const auto = chartMatchup(a.attribute, workspace.enemy.attribute);
  const advantage = (k.matchup === 'auto' ? auto : k.matchup) === 'advantage';
  const factor = (m: keyof typeof MATCHUP_BASE) => MATCHUP_BASE[m] + (m === 'advantage' && a.plus ? PLUS_ADVANTAGE_BONUS : 0);
  const matchupOptions: Option<MatchupChoice>[] = [
    { value: 'auto', label: `Auto from attributes: ${MATCHUP_LABEL[auto]} ×${factor(auto)}` },
    { value: 'advantage', label: `Advantage ×${factor('advantage')}` },
    { value: 'neutral', label: 'Neutral ×1' },
    { value: 'disadvantage', label: 'Disadvantage ×0.7' },
  ];

  return (
    <Card
      step={2}
      id="attack"
      title="Attack"
      collapsible
      subtitle="The orb you used, what popped up on the hit, and the buffs of each special hit."
      summary={[attackLabel(hit), ...hitTags(hit)].join(' · ')}
    >
      <Field help="kind" inputKey="attack.kind" group wide>
        {() => <Segmented ariaLabel="Hit type" value={k.kind} options={KIND_OPTIONS} onChange={(kind) => setAttack({ kind })} />}
      </Field>

      <div className={ui.grid}>
        {k.kind === 'soulOfCombos' && (
          <Field
            help="variant"
            inputKey="attack.variant"
            group
            note="Choose the version first. Enter the percentage shown on that version’s card below; this selection does not multiply it again. Changing versions clears the old percentage."
          >
            {() => <Segmented ariaLabel="Soul of Combos version" value={k.variant} options={VARIANT_OPTIONS} onChange={(variant) => setAttack({ variant })} />}
          </Field>
        )}
        {k.kind === 'soulOfCombos' && (
          <Field
            help="power"
            inputKey="attack.power"
            note="Type the actual selected card percentage, for example 600 for 600%. Valid entries are confirmed automatically."
          >
            {(id) => (
              <NumberInput
                id={id}
                max={100000}
                value={k.power}
                suffix="%"
                onChange={(power) => setAttack({ power })}
                onConfirm={(filled) => confirmInput('attack.power', filled)}
              />
            )}
          </Field>
        )}
        {k.kind === 'soulOfCombos' && k.variant === 'ultimate' && advantage && (
          <Field
            help="ultimateBonus"
            inputKey="attack.ultimateBonus"
            note="Enter the resolved addition for this character: 40% means +0.4 in the attribute factor. The client’s 140% fallback is not a verified value for every character."
          >
            {(id) => (
              <NumberInput
                id={id}
                decimal
                allowNegative
                value={k.ultimateBonus}
                placeholder="Enter resolved bonus"
                suffix="%"
                onChange={(ultimateBonus) => setAttack({ ultimateBonus })}
                onEmpty={() => setAttack({ ultimateBonus: null })}
                onConfirm={(filled) => confirmInput('attack.ultimateBonus', filled)}
              />
            )}
          </Field>
        )}
        <Field label="Target" inputKey="attack.target" group>
          {() => (
            <Segmented<TargetType>
              ariaLabel="Target"
              value={k.target}
              onChange={(target) => setAttack({ target })}
              options={[
                { value: 'single', label: 'Single' },
                { value: 'all', label: 'All (AoE)' },
              ]}
            />
          )}
        </Field>
      </div>

      {k.kind === 'soul' && (
        <div className={css.stack}>
          <p className={ui.note}>
            Ordinary orb base power: <b>{k.normalPowerOverride ? `${k.power}% (override)` : '100%'}</b>. The game may not show a card-details panel for this
            attack.
          </p>
          <Switch
            label="Override normal orb power"
            description="Advanced: only for a verified replacement attack"
            checked={!!k.normalPowerOverride}
            onChange={(normalPowerOverride) => setAttack({ normalPowerOverride, power: normalPowerOverride ? k.power : 100 })}
          />
          {k.normalPowerOverride && (
            <Field help="power" inputKey="attack.power" label="Normal orb power override">
              {(id) => (
                <NumberInput
                  id={id}
                  max={100000}
                  value={k.power}
                  suffix="%"
                  onChange={(power) => setAttack({ power })}
                  onConfirm={(filled) => confirmInput('attack.power', filled)}
                />
              )}
            </Field>
          )}
          <Field
            label="Combo finisher"
            inputKey="attack.comboMultiplier"
            group
            wide
            note="Choose None for 1–3 cards and non-finishers. Only the last eligible normal orb gets a finisher bonus. Selected secret skills count toward chain length; the displayed chain BONUS concerns gauge points."
          >
            {() => (
              <Segmented
                ariaLabel="Combo finisher"
                value={k.comboMultiplier ?? 1}
                options={FINISHER_OPTIONS}
                onChange={(comboMultiplier) => setAttack({ comboMultiplier })}
              />
            )}
          </Field>
          {(k.comboMultiplier ?? 1) > 1 && (
            <div className={ui.grid}>
              <EffectField type="comboDmg" />
            </div>
          )}
          {(k.comboMultiplier === 1.5 || k.comboMultiplier === 2) && (
            <div className={css.stack}>
              <p className={ui.note}>
                Enter the two other attackers selected for this finisher. Each adds 2% of ATK before DEF. These are separate from the attached Synergy support;
                confirm zero only when that buddy is absent.
              </p>
              <div className={ui.grid}>
                <Field label="Combo attacker 1 ATK" inputKey="attacker.comboBuddyAtk1">
                  {(id) => (
                    <NumberInput
                      id={id}
                      max={1e12}
                      value={a.comboBuddyAtk1 ?? 0}
                      onChange={(comboBuddyAtk1) => setAttacker({ comboBuddyAtk1 })}
                      onConfirm={(filled) => confirmInput('attacker.comboBuddyAtk1', filled)}
                    />
                  )}
                </Field>
                <Field label="Combo attacker 2 ATK" inputKey="attacker.comboBuddyAtk2">
                  {(id) => (
                    <NumberInput
                      id={id}
                      max={1e12}
                      value={a.comboBuddyAtk2 ?? 0}
                      onChange={(comboBuddyAtk2) => setAttacker({ comboBuddyAtk2 })}
                      onConfirm={(filled) => confirmInput('attacker.comboBuddyAtk2', filled)}
                    />
                  )}
                </Field>
              </div>
            </div>
          )}
          <details>
            <summary>Orb position (optional)</summary>
            <Field help="comboPosition" group wide>
              {() => (
                <Segmented
                  ariaLabel="Orb in the chain"
                  value={k.comboPosition}
                  options={COMBO_OPTIONS}
                  onChange={(comboPosition) => setAttack({ comboPosition })}
                />
              )}
            </Field>
          </details>
        </div>
      )}

      <Field help="matchup" wide>
        {(id) => <Select id={id} value={k.matchup} options={matchupOptions} onChange={(matchup) => setAttack({ matchup })} />}
      </Field>
      <div className={css.atkBox} role="group" aria-label="Attribute factor explanation">
        {affinity.value ? (
          <>
            <p>
              <strong>Resolved attribute factor: ×{affinity.value.factor.toString()}</strong>
            </p>
            <p className={ui.note}>
              Base {affinity.value.base.toString()}
              {affinity.value.enhanced.compare(0) !== 0 && <> · enhanced {affinity.value.enhanced.toString()}</>}
              {affinity.value.ultimate.compare(0) !== 0 && <> · Ultimate {affinity.value.ultimate.toString()}</>}
              {affinity.value.weak.compare(0) !== 0 && <> · Weakness Strike {affinity.value.weak.toString()}</>}
              {affinity.value.superWeak.compare(0) !== 0 && <> · Super Weakness Strike {affinity.value.superWeak.toString()}</>}
            </p>
            <p className={ui.note}>These contributions add within one attribute factor. True Attribute Unbound is applied separately.</p>
          </>
        ) : (
          <p className={ui.note}>{affinity.error}</p>
        )}
      </div>
      <Field help="popup" inputKey="attack.popup" group wide>
        {() => (
          <div className={css.stack}>
            <Segmented ariaLabel="Popup on the hit" value={k.popup} options={POPUP_OPTIONS} onChange={(popup) => setAttack({ popup })} />
            {k.popup !== 'none' && (
              <div className={ui.grid}>
                <EffectField type="weakDmg" />
                {k.popup === 'superWeak' && <EffectField type="superWeakDmg" />}
              </div>
            )}
          </div>
        )}
      </Field>

      <Field help="specialHits" group wide>
        {() => (
          <div className={css.specials}>
            <SpecialHit
              inputKey="attack.crit"
              title="Critical"
              description={`× (${CRIT_BASE} + Critical Power bonus + enemy resistance DOWN), with percentages converted to fractions`}
              active={k.crit}
              control={
                <Segmented ariaLabel="Critical" value={k.crit ? 'normal' : 'off'} options={critOptions} onChange={(c) => setAttack({ crit: c === 'normal' })} />
              }
            >
              <EffectField type="critDmg" />
              <EffectField type="critResDown" />
            </SpecialHit>
            <SpecialHit
              inputKey="attack.pierce"
              title="Pierce"
              description={`Adds ${pct(PIERCE_ATK_SHARE.normal)} of your battle ATK, ignoring DEF (Super: ${pct(PIERCE_ATK_SHARE.super)}), then applies Pierce Power and enemy resistance. Super boosts favorable contributions by ×1.2.`}
              active={k.pierce !== 'off'}
              control={<Segmented ariaLabel="Pierce" value={k.pierce} options={procOptions} onChange={(pierce) => setAttack({ pierce })} />}
            >
              <EffectField type="piercePower" />
              <EffectField type="pierceResDown" />
            </SpecialHit>
            <SpecialHit
              inputKey="attack.synergy"
              title="Synergy"
              description={`Adds ${pct(ASSIST_SHARE.normal)} of support ATK ${fmtInt(a.supportAtk)} (Super: ${pct(ASSIST_SHARE.super)}), then applies Synergy Power and enemy resistance. Super boosts favorable contributions by ×1.2.`}
              active={k.synergy !== 'off'}
              control={<Segmented ariaLabel="Synergy" value={k.synergy} options={procOptions} onChange={(synergy) => setAttack({ synergy })} />}
            >
              <EffectField type="synergyPower" />
              <EffectField type="synergyResDown" />
            </SpecialHit>
            <SpecialHit
              inputKey="attack.aegis"
              title="Aegis"
              description={`Adds ${pct(ASSIST_SHARE.normal)} of your DEF (Super: ${pct(ASSIST_SHARE.super)}), then applies Aegis Power and enemy resistance. Super boosts favorable contributions by ×1.2.`}
              active={k.aegis !== 'off'}
              control={<Segmented ariaLabel="Aegis" value={k.aegis} options={procOptions} onChange={(aegis) => setAttack({ aegis })} />}
            >
              <Field help="ownDef" inputKey="attacker.ownDef">
                {(id) => (
                  <NumberInput
                    id={id}
                    value={a.ownDef}
                    onChange={(ownDef) => setAttacker({ ownDef })}
                    onConfirm={(filled) => confirmInput('attacker.ownDef', filled)}
                  />
                )}
              </Field>
              <EffectField type="aegisPower" />
              <EffectField type="aegisResDown" />
            </SpecialHit>
          </div>
        )}
      </Field>
    </Card>
  );
}
