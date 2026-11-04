import { useMemo, type ReactNode } from 'react';
import { ATTRIBUTE_LABEL, chartMatchup, MATCHUP_LABEL } from '../../domain/attributes';
import type { ClrDecimal } from '../../domain/decimal';
import { getAttributeFactor, MATCHUP_BASE, PLUS_ADVANTAGE_BONUS, toInput, type AttributeFactor } from '../../domain/engine';
import type { HitKind, InputKey, MatchupChoice, Popup, Proc, SoulVariant, TargetType } from '../../domain/types';
import { Field } from '../../components/Field';
import { NumberInput, Segmented, Select, Switch, type Option } from '../../components/inputs';
import { Card } from '../../components/layout';
import ui from '../../components/ui.module.css';
import { useWorkspace } from '../../state/workspaceContext';
import css from './calculator.module.css';
import { EffectField } from './EffectField';
import { attackLabel, hitTags } from './format';
import { useActiveHit } from './useCalculator';

const KIND_OPTIONS: Option<HitKind>[] = [
  { value: 'soulOfCombos', label: 'Soul of Combos', sub: 'secret skill' },
  { value: 'soul', label: 'Normal soul', sub: 'every other soul' },
];
const VARIANT_OPTIONS: Option<SoulVariant>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'ex', label: 'EX' },
  { value: 'ultimate', label: 'Ultimate' },
];
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
  { value: 'super', label: 'Super' },
];
const FINISHER_OPTIONS: Option<number>[] = [
  { value: 1, label: 'None', sub: '100%' },
  { value: 1.1, label: '4 souls', sub: '110%' },
  { value: 1.5, label: '5 souls', sub: '150%' },
  { value: 2, label: '6 souls', sub: '200%' },
];
/** A special hit: its switch and — while it is on — the buffs that only count for it. How it works is in Guide → Popups & special hits. */
function SpecialHit({
  inputKey,
  title,
  control,
  active,
  children,
}: {
  inputKey: InputKey;
  title: string;
  control: ReactNode;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Field inputKey={inputKey} label={title} group wide>
      {() => (
        <div className={`${css.special} ${active ? css.specialOn : ''}`}>
          <div className={css.specialControl}>{control}</div>
          {active && <div className={ui.grid}>{children}</div>}
        </div>
      )}
    </Field>
  );
}

const nonZero = (d: ClrDecimal) => d.compare(0) !== 0;
const short = (d: ClrDecimal) => String(Number(d.toNumber().toFixed(4)));

/** “= 1.5 + 0.1 (Dark+) + 0.4 (Ultimate) = ×2”: the resolved attribute factor in one line. */
function attributeLine(f: AttributeFactor, attribute: string): string {
  const parts: [ClrDecimal, string][] = [
    [f.enhanced, `${attribute}+`],
    [f.ultimate, 'Ultimate'],
    [f.weak, 'Weakness Strike'],
    [f.superWeak, 'Super Weakness Strike'],
  ];
  const added = parts.filter(([d]) => nonZero(d));
  if (!added.length) return `= ×${short(f.factor)}`;
  const terms = added.map(([d, label]) => (d.compare(0) < 0 ? `− ${short(d.neg())} (${label})` : `+ ${short(d)} (${label})`));
  return `= ${short(f.base)} ${terms.join(' ')} = ×${short(f.factor)}`;
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
      subtitle="The soul you used, what popped up on the hit, and the buffs of each special hit."
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
            note="Choose the version first. Enter the percentage shown for that version below; this selection does not multiply it again. Changing versions clears the old percentage."
          >
            {() => <Segmented ariaLabel="Soul of Combos version" value={k.variant} options={VARIANT_OPTIONS} onChange={(variant) => setAttack({ variant })} />}
          </Field>
        )}
        {k.kind === 'soulOfCombos' && (
          <Field help="power" inputKey="attack.power">
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
            note="The supplied character table confirms 40% for level-120 [Armored Dragonoid] Milim: it adds 0.4 to affinity. Other characters and upgrades can differ; use their applicable value."
          >
            {(id) => (
              <NumberInput
                id={id}
                decimal
                allowNegative
                value={k.ultimateBonus}
                placeholder="e.g. 40"
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
            Ordinary soul base power: <b>{k.normalPowerOverride ? `${k.power}% (override)` : '100%'}</b>. The game may not show damage details for this
            attack.
          </p>
          <Switch
            label="Override normal soul power"
            description="Advanced: only for a verified replacement attack"
            checked={!!k.normalPowerOverride}
            onChange={(normalPowerOverride) => setAttack({ normalPowerOverride, power: normalPowerOverride ? k.power : 100 })}
          />
          {k.normalPowerOverride && (
            <Field help="power" inputKey="attack.power" label="Normal soul power override">
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
            label="Soul Combos"
            inputKey="attack.comboMultiplier"
            group
            wide
            note="Choose None for 1–3 soul combos and for souls that are not finishers. Only the last eligible normal soul gets a finisher bonus. Selected secret skills count toward chain length; the displayed chain BONUS concerns gauge points."
          >
            {() => (
              <Segmented
                ariaLabel="Soul Combos"
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
        </div>
      )}

      <Field
        help="matchup"
        wide
        note={
          <span className={css.factorLine}>{affinity.value ? attributeLine(affinity.value, ATTRIBUTE_LABEL[a.attribute]) : `= ? · ${affinity.error}`}</span>
        }
      >
        {(id) => <Select id={id} value={k.matchup} options={matchupOptions} onChange={(matchup) => setAttack({ matchup })} />}
      </Field>
      <Field help="popup" inputKey="attack.popup" group wide>
        {() => (
          <div className={css.stack}>
            <Segmented ariaLabel="Weakness result" value={k.popup} options={POPUP_OPTIONS} onChange={(popup) => setAttack({ popup })} />
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
              active={k.crit}
              control={
                <Segmented ariaLabel="Critical" value={!k.crit ? 'off' : k.superCrit ? 'super' : 'normal'} options={critOptions} onChange={(c) => setAttack({ crit: c !== 'off', superCrit: c === 'super' })} />
              }
            >
              <EffectField type="critDmg" />
              <EffectField type="critResDown" />
              {k.superCrit && (
                <p className={ui.note}>
                  Super Critical uses a 1.5 base factor and boosts Critical Power UP and enemy Critical Resistance DOWN bonuses by 30%.
                  Power DOWN and resistance UP keep their original values. These verified constants apply automatically.
                </p>
              )}
            </SpecialHit>
            <SpecialHit
              inputKey="attack.pierce"
              title="Pierce"
              active={k.pierce !== 'off'}
              control={<Segmented ariaLabel="Pierce" value={k.pierce} options={procOptions} onChange={(pierce) => setAttack({ pierce })} />}
            >
              <EffectField type="piercePower" />
              <EffectField type="pierceResDown" />
            </SpecialHit>
            <SpecialHit
              inputKey="attack.synergy"
              title="Synergy"
              active={k.synergy !== 'off'}
              control={<Segmented ariaLabel="Synergy" value={k.synergy} options={procOptions} onChange={(synergy) => setAttack({ synergy })} />}
            >
              <EffectField type="synergyPower" />
              <EffectField type="synergyResDown" />
            </SpecialHit>
            <SpecialHit
              inputKey="attack.aegis"
              title="Aegis"
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
