import { useMemo, useState } from 'react';
import { ATTRIBUTE_LABEL } from '../../domain/attributes';
import { newId } from '../../domain/defaults';
import { EFFECT_BY_ID, EFFECT_TYPES } from '../../domain/effects';
import { calculateHit, toInput } from '../../domain/engine';
import { comparisonRequirements } from '../../domain/comparisonRequirements';
import { getMissingRequirements } from '../../domain/requirements';
import { normalizeUnits } from '../../domain/normalize';
import { countCombinations, MAX_COMBINATIONS, rankTeams, type SupportUnit, type UnitEffect, type UnitTriggers } from '../../domain/teams';
import { ATTRIBUTES, type AttributeFilter, type EffectTypeId } from '../../domain/types';
import { hrefFor } from '../../app/router';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { NumberInput, Segmented, Select, Switch, TextInput } from '../../components/inputs';
import { Card, Dialog } from '../../components/layout';
import ui from '../../components/ui.module.css';
import { STORAGE_KEYS, usePersistentState } from '../../state/storage';
import { useWorkspace } from '../../state/workspaceContext';
import { attackLabel, fmtInt, fmtPct, hitLabel } from '../calculator/format';
import { useActiveHit } from '../calculator/useCalculator';
import { PRESET_UNITS } from './presets';
import css from './teams.module.css';

interface TeamSettings {
  size: number;
  maxCost: number;
}

const PAGE = 15;
const HUES = [200, 260, 330, 20, 140, 45, 290, 170];
const TRIGGER_LABEL: Record<keyof UnitTriggers, string> = { crit: 'Critical', pierce: 'Pierce', synergy: 'Synergy', aegis: 'Aegis' };
const TYPE_OPTIONS = EFFECT_TYPES.filter((t) => t.category !== 'noEffect' && t.category !== 'stat').map((t) => ({ value: t.id, label: t.label }));
const ATTRIBUTE_FILTER_OPTIONS = [
  { value: 'any' as AttributeFilter, label: 'Any attribute' },
  ...ATTRIBUTES.map((a) => ({ value: a as AttributeFilter, label: ATTRIBUTE_LABEL[a] })),
];
const ATTACK_SCOPE_OPTIONS = [
  { value: 'any' as const, label: 'Any attack type' },
  { value: 'physical' as const, label: 'Physical only' },
  { value: 'magic' as const, label: 'Magic only' },
];
const TARGET_SCOPE_OPTIONS = [
  { value: 'any' as const, label: 'Any target type' },
  { value: 'single' as const, label: 'Single-target only' },
  { value: 'all' as const, label: 'All-target only' },
];

/** Return a player-facing message for known numerical input failures only. */
function calculationInputError(error: unknown): string | null {
  const numericRange = error instanceof RangeError && /overflow|Division by zero|decimal|Pierce ATK|Variance roll|Weak Point/.test(error.message);
  const numericType = error instanceof TypeError && /^(Enter a finite number|Invalid decimal:)/.test(error.message);
  if (!numericRange && !numericType) return null;
  const message = (error as Error).message;
  if (/Weak Point/.test(message)) return message;
  if (/overflow|out of range|too long/.test(message)) return 'The entered stats or effect values are too large. Reduce them and try again.';
  if (/Division by zero/.test(message)) return 'An entered effect creates a zero divisor. Check the base hit and effect values.';
  return 'Check that every stat and effect contains a valid finite number.';
}

function Avatar({ unit, size = 36 }: { unit: SupportUnit; size?: number }) {
  if (unit.icon) return <img className={css.avatar} src={`${import.meta.env.BASE_URL}${unit.icon}`} alt="" width={size} height={size} loading="lazy" />;
  const hue = HUES[[...unit.name].reduce((s, c) => s + c.charCodeAt(0), 0) % HUES.length];
  const initials = unit.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <span className={`${css.avatar} ${css.avatarText}`} style={{ width: size, height: size, background: `hsl(${hue} 65% 45%)` }} aria-hidden="true">
      {initials || '?'}
    </span>
  );
}

function UnitChips({ unit }: { unit: SupportUnit }) {
  return (
    <div className={css.chips}>
      {unit.effects.map((effect, index) => {
        const { type, attribute, value } = effect;
        return (
          <span key={index} className={`${css.chip} ${value < 0 ? css.neg : ''}`}>
            {EFFECT_BY_ID[type].label}
            {effect.attackType && effect.attackType !== 'any' ? ` (${effect.attackType})` : ''}
            {effect.target && effect.target !== 'any' ? ` (${effect.target === 'single' ? 'single-target' : 'all-target'})` : ''}
            {attribute !== 'any' ? ` (${ATTRIBUTE_LABEL[attribute]})` : ''} {value > 0 ? '+' : ''}
            {value}%
          </span>
        );
      })}
      {(Object.keys(TRIGGER_LABEL) as (keyof UnitTriggers)[])
        .filter((t) => unit.triggers[t])
        .map((t) => (
          <span key={t} className={`${css.chip} ${css.trigger}`}>
            {TRIGGER_LABEL[t]}
          </span>
        ))}
    </div>
  );
}

function UnitEditor({ unit, onSave, onClose }: { unit: SupportUnit | null; onSave: (u: SupportUnit) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<SupportUnit | null>(unit);
  const [shown, setShown] = useState<SupportUnit | null>(unit);
  if (unit !== shown) {
    setShown(unit);
    setDraft(unit);
  }
  const set = (patch: Partial<SupportUnit>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setEffect = (i: number, patch: Partial<UnitEffect>) => draft && set({ effects: draft.effects.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  return (
    <Dialog
      open={!!unit}
      onClose={onClose}
      title={unit?.name ? `Edit ${unit.name}` : 'New buff provider'}
      footer={
        <>
          <button type="button" className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`${ui.button} ${ui.primary}`}
            disabled={!draft?.name.trim()}
            onClick={() => draft && onSave({ ...draft, name: draft.name.trim(), effects: draft.effects.filter((e) => e.value !== 0) })}
          >
            Save provider
          </button>
        </>
      }
    >
      {draft && (
        <div className={css.column}>
          <div className={ui.grid}>
            <Field label="Name">{(id) => <TextInput id={id} value={draft.name} placeholder="e.g. Shion (Summer)" onChange={(name) => set({ name })} />}</Field>
            <Field label="Skill cost">{(id) => <NumberInput id={id} value={draft.skillCost} suffix="SP" onChange={(skillCost) => set({ skillCost })} />}</Field>
          </div>
          <h3 className={ui.groupTitle}>Effects this provider gives</h3>
          <p className={ui.note}>
            Copy each effect separately, including its attack-type, target and attribute restrictions. Only enter effects that can be active together on this
            hit.
          </p>
          <ul className={css.editorList}>
            {draft.effects.map((e, i) => (
              <li key={i} className={css.editorRow}>
                <Select<EffectTypeId> ariaLabel="Effect type" value={e.type} options={TYPE_OPTIONS} onChange={(type) => setEffect(i, { type })} />
                <NumberInput ariaLabel="Value" value={e.value} allowNegative suffix="%" onChange={(value) => setEffect(i, { value })} />
                <button
                  type="button"
                  className={ui.iconButton}
                  aria-label="Remove effect"
                  onClick={() => set({ effects: draft.effects.filter((_, j) => j !== i) })}
                >
                  <Icon name="trash" />
                </button>
                {EFFECT_BY_ID[e.type].attribute && (
                  <Select<AttributeFilter>
                    ariaLabel="Attribute"
                    value={e.attribute}
                    options={ATTRIBUTE_FILTER_OPTIONS}
                    onChange={(attribute) => setEffect(i, { attribute })}
                  />
                )}
                <Select<NonNullable<UnitEffect['attackType']>>
                  ariaLabel={`Attack type restriction ${i + 1}`}
                  value={e.attackType ?? 'any'}
                  options={ATTACK_SCOPE_OPTIONS}
                  onChange={(attackType) => setEffect(i, { attackType })}
                />
                <Select<NonNullable<UnitEffect['target']>>
                  ariaLabel={`Target restriction ${i + 1}`}
                  value={e.target ?? 'any'}
                  options={TARGET_SCOPE_OPTIONS}
                  onChange={(target) => setEffect(i, { target })}
                />
              </li>
            ))}
          </ul>
          <button type="button" className={ui.button} onClick={() => set({ effects: [...draft.effects, { type: 'soulDmg', value: 0, attribute: 'any' }] })}>
            <Icon name="plus" /> Add effect
          </button>
          <h3 className={ui.groupTitle}>Special-hit outcomes for this hit</h3>
          <p className={ui.note}>Enable an outcome only if this provider guarantees it under the selected conditions. Proc chances are not simulated.</p>
          <div className={ui.grid}>
            {(Object.keys(TRIGGER_LABEL) as (keyof UnitTriggers)[]).map((t) => (
              <Switch key={t} label={TRIGGER_LABEL[t]} checked={!!draft.triggers[t]} onChange={(v) => set({ triggers: { ...draft.triggers, [t]: v } })} />
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}

export default function TeamsPage() {
  const { workspace, activeHit } = useWorkspace();
  const { setAttacker, confirmInput } = useActiveHit();
  const [pool, setPool] = usePersistentState<SupportUnit[]>(STORAGE_KEYS.units, () => [], normalizeUnits);
  const [settings, setSettings] = usePersistentState<TeamSettings>(
    STORAGE_KEYS.teamSettings,
    () => ({ size: 3, maxCost: 0 }),
    (raw) => {
      const r = (raw ?? {}) as Partial<TeamSettings>;
      return { size: Math.min(5, Math.max(1, Number(r.size) || 3)), maxCost: Math.max(0, Number(r.maxCost) || 0) };
    },
  );
  const [editing, setEditing] = useState<SupportUnit | null>(null);
  const [shown, setShown] = useState(PAGE);

  const base = useMemo(() => toInput(activeHit, workspace.enemy), [activeHit, workspace.enemy]);
  const baseMissing = useMemo(() => getMissingRequirements(activeHit, workspace.enemy), [activeHit, workspace.enemy]);
  const requirements = useMemo(
    () => comparisonRequirements(activeHit, workspace.enemy, pool, settings.size, settings.maxCost),
    [activeHit, workspace.enemy, pool, settings.size, settings.maxCost],
  );
  const baseCalculation = useMemo(() => {
    if (baseMissing.length)
      return {
        damage: null,
        error: `Confirm ${baseMissing.length} required base-hit input${baseMissing.length === 1 ? '' : 's'} in the Calculator before comparing providers.`,
      };
    try {
      return { damage: calculateHit(base).damage, error: null };
    } catch (error) {
      const message = calculationInputError(error);
      if (message === null) throw error;
      return { damage: null, error: `Cannot calculate the base hit. ${message} Edit the base hit before comparing providers.` };
    }
  }, [base, baseMissing]);
  const baseDamage = baseCalculation.damage;
  const total = countCombinations(pool.length, settings.size);
  const tooMany = total > MAX_COMBINATIONS;
  const ranking = useMemo(() => {
    if (tooMany || baseCalculation.error) return { results: [], error: null };
    if (requirements.missing.length)
      return {
        results: [],
        error: `Required for the selected providers: ${requirements.missing.map((item) => item.label).join(', ')}. Confirm these values before comparing combinations.`,
      };
    try {
      return { results: rankTeams(base, pool, settings.size, settings.maxCost), error: null };
    } catch (error) {
      const message = calculationInputError(error);
      if (message === null) throw error;
      // Abort the comparison rather than silently excluding an uncomputable
      // combination and presenting an incomplete ranking as the best result.
      return { results: [], error: `Cannot calculate these combinations. ${message} Check the providers and base hit, then try again.` };
    }
  }, [base, pool, settings, tooMany, baseCalculation.error, requirements]);
  const results = ranking.results;
  const inPool = new Set(pool.map((u) => u.id));
  const index = workspace.hits.findIndex((h) => h.id === activeHit.id);

  const toggle = (u: SupportUnit) => setPool((p) => (p.some((x) => x.id === u.id) ? p.filter((x) => x.id !== u.id) : [...p, u]));
  const save = (u: SupportUnit) => {
    setPool((p) => (p.some((x) => x.id === u.id) ? p.map((x) => (x.id === u.id ? u : x)) : [...p, u]));
    setEditing(null);
  };

  return (
    <div className={css.page}>
      <div className={css.column}>
        <Card
          title="Base hit"
          subtitle="Compares buff combinations on the selected hit. It does not simulate a full battle, skill timing or proc probabilities."
          actions={
            <a className={`${ui.button} ${ui.ghost}`} href={hrefFor('calculator')}>
              <Icon name="edit" /> Edit
            </a>
          }
        >
          <p className={css.summary}>
            <b>{hitLabel(activeHit, index)}</b> · {attackLabel(activeHit)} vs. <b>{workspace.enemy.name || 'enemy'}</b> (DEF {fmtInt(workspace.enemy.def)})
            <br />
            Damage before added providers: <b>{baseDamage === null ? '—' : fmtInt(baseDamage)}</b>
          </p>
          {baseCalculation.error && (
            <p role="alert" className={ui.note}>
              {baseCalculation.error}
            </p>
          )}
          {(requirements.needsSupport || requirements.needsDef) && (
            <div className={ui.grid}>
              {requirements.needsSupport && (
                <Field
                  help="supportAtk"
                  inputKey="attacker.supportAtk"
                  pendingRequirement={requirements.missing.find((r) => r.key === 'attacker.supportAtk')}
                  note="Needed by Synergy in the base hit or a selected provider."
                >
                  {(id) => (
                    <NumberInput
                      id={id}
                      value={activeHit.attacker.supportAtk}
                      onChange={(supportAtk) => setAttacker({ supportAtk })}
                      onConfirm={(filled) => confirmInput('attacker.supportAtk', filled)}
                    />
                  )}
                </Field>
              )}
              {requirements.needsDef && (
                <Field
                  help="ownDef"
                  inputKey="attacker.ownDef"
                  pendingRequirement={requirements.missing.find((r) => r.key === 'attacker.ownDef')}
                  note="Needed by Aegis in the base hit or a selected provider."
                >
                  {(id) => (
                    <NumberInput
                      id={id}
                      value={activeHit.attacker.ownDef}
                      onChange={(ownDef) => setAttacker({ ownDef })}
                      onConfirm={(filled) => confirmInput('attacker.ownDef', filled)}
                    />
                  )}
                </Field>
              )}
            </div>
          )}
        </Card>

        <Card title="Buff providers" subtitle="Choose characters whose skills can affect this hit, or enter their effects and restrictions yourself.">
          <div className={css.presets}>
            {PRESET_UNITS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={css.preset}
                aria-pressed={inPool.has(p.id)}
                aria-label={`${p.name}, ${p.skillCost} SP`}
                onClick={() => toggle(p)}
              >
                <Avatar unit={p} size={40} />
                <span className={css.presetName}>{p.name}</span>
                <span className={css.presetCost}>{p.skillCost} SP</span>
              </button>
            ))}
          </div>
          <p className={ui.note}>
            Community Beta 4 presets are unverified. Check skill values, costs, restrictions and stacking in game. Older presets may have unspecified
            restrictions.
          </p>
          <button
            type="button"
            className={`${ui.button} ${ui.primary} ${ui.block}`}
            onClick={() => setEditing({ id: newId(), name: '', skillCost: 80, effects: [{ type: 'soulDmg', value: 0, attribute: 'any' }], triggers: {} })}
          >
            <Icon name="plus" /> Create provider
          </button>
          <h3 className={ui.groupTitle}>Pool ({pool.length})</h3>
          {pool.length === 0 ? (
            <p className={css.empty}>No buff providers yet.</p>
          ) : (
            <ul className={css.pool}>
              {pool.map((u) => (
                <li key={u.id} className={css.poolItem}>
                  <Avatar unit={u} />
                  <div className={css.poolMain}>
                    <span>
                      <b>{u.name}</b> <span className={css.muted}>{u.skillCost} SP</span>
                    </span>
                    <UnitChips unit={u} />
                  </div>
                  <button type="button" className={ui.iconButton} aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                    <Icon name="edit" />
                  </button>
                  <button
                    type="button"
                    className={ui.iconButton}
                    aria-label={`Remove ${u.name}`}
                    onClick={() => setPool((p) => p.filter((x) => x.id !== u.id))}
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Combination rules">
          <div className={ui.grid}>
            <Field label="Providers per combination" group>
              {() => (
                <Segmented
                  ariaLabel="Providers per combination"
                  value={settings.size}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
                  onChange={(size) => setSettings((s) => ({ ...s, size }))}
                />
              )}
            </Field>
            <Field label="Skill point limit" note="0 = no limit">
              {(id) => <NumberInput id={id} value={settings.maxCost} suffix="SP" onChange={(maxCost) => setSettings((s) => ({ ...s, maxCost }))} />}
            </Field>
          </div>
        </Card>
      </div>

      <div className={`${css.column} ${css.sticky}`}>
        <Card
          title="Ranked buff combinations"
          subtitle={
            baseCalculation.error
              ? 'Edit the base hit to calculate buff combinations.'
              : ranking.error
                ? 'The comparison is unavailable until the calculation inputs are corrected.'
                : tooMany
                  ? `${fmtInt(total)} combinations is too many — remove providers or choose a smaller combination.`
                  : pool.length < settings.size
                    ? `Add at least ${settings.size} providers to the pool.`
                    : `${fmtInt(results.length)} of ${fmtInt(total)} combinations fit the rules. Rankings assume all entered effects are valid and active together.`
          }
        >
          {ranking.error && (
            <p role="alert" className={ui.note}>
              {ranking.error}
            </p>
          )}
          {results.length > 0 && (
            <ol className={css.ranking}>
              {results.slice(0, shown).map((r, i) => (
                <li key={r.units.map((u) => u.id).join('+')} className={`${css.rank} ${i === 0 ? css.best : ''}`}>
                  <span className={css.rankNo}>{i + 1}</span>
                  <span className={css.avatars}>
                    {r.units.map((u) => (
                      <Avatar key={u.id} unit={u} size={30} />
                    ))}
                  </span>
                  <span className={css.rankMain}>
                    <b>{r.units.map((u) => u.name).join(', ')}</b>
                    <span className={css.muted}>{r.cost} SP</span>
                  </span>
                  <span className={css.rankDamage}>
                    <b>{fmtInt(r.damage)}</b>
                    <small>{fmtPct((r.damage / Math.max(1, baseDamage ?? 0) - 1) * 100)}</small>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {results.length > shown && (
            <button type="button" className={`${ui.button} ${ui.block}`} onClick={() => setShown((n) => n + PAGE)}>
              Show more ({fmtInt(results.length - shown)} left)
            </button>
          )}
        </Card>
      </div>

      <UnitEditor unit={editing} onSave={save} onClose={() => setEditing(null)} />
    </div>
  );
}
