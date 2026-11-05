import { useMemo, useState } from 'react';
import { ATTRIBUTE_LABEL } from '../../domain/attributes';
import { EFFECT_BY_ID, EFFECT_TYPES } from '../../domain/effects';
import { calculateHit, toInput } from '../../domain/engine';
import { comparisonRequirements } from '../../domain/comparisonRequirements';
import { getMissingRequirements } from '../../domain/requirements';
import { createProviderLibrary, libraryProvider, normalizeProviderLibrary, poolProviders } from '../../domain/providerLibrary';
import { MAX_PROVIDER_COST, MAX_PROVIDER_EFFECTS, MAX_PROVIDER_EFFECT_VALUE, MAX_PROVIDER_NAME } from '../../domain/providerLimits';
import { countCombinations, MAX_COMBINATIONS, type SupportUnit, type UnitEffect, type UnitTriggers } from '../../domain/teams';
import { MAX_RANKED_TEAMS } from '../../domain/teamSearch';
import { useTeamSearch } from './useTeamSearch';
import { ATTRIBUTES, type AttributeFilter, type EffectTypeId } from '../../domain/types';
import { hrefFor } from '../../app/router';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { NumberInput, Segmented, Select, Switch, TextInput } from '../../components/inputs';
import { Card, Dialog } from '../../components/layout';
import ui from '../../components/ui.module.css';
import { loadJSON, STORAGE_KEYS, usePersistentState } from '../../state/storage';
import { useWorkspace } from '../../state/workspaceContext';
import { attackLabel, fmtInt, fmtPct, hitLabel } from '../calculator/format';
import { useActiveHit } from '../calculator/useCalculator';
import { PRESET_UNITS } from './presets';
import { Avatar } from './ProviderDisplay';
import { ProviderManager } from './ProviderManager';
import css from './teams.module.css';

interface TeamSettings {
  size: number;
  maxCost: number;
}

const PAGE = 15;
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
  if (/Division by zero/.test(message)) return 'An entered effect creates a zero divisor. Check the base setup and effect values.';
  return 'Check that every stat and effect contains a valid finite number.';
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
            <Field label="Name">
              {(id) => (
                <TextInput id={id} value={draft.name} maxLength={MAX_PROVIDER_NAME} placeholder="e.g. Shion (Summer)" onChange={(name) => set({ name })} />
              )}
            </Field>
            <Field label="Skill cost" note="Total SP cost of the skills represented by this provider’s effects.">
              {(id) => <NumberInput id={id} value={draft.skillCost} max={MAX_PROVIDER_COST} suffix="SP" onChange={(skillCost) => set({ skillCost })} />}
            </Field>
          </div>
          <h3 className={ui.groupTitle}>Effects to use together</h3>
          <p className={ui.note}>
            Enter the buffs and enemy debuffs you plan to use together from this provider, and their total skill cost above. Copy each effect separately,
            including its attack-type, target and attribute restrictions. Only applicable effects are added to the fixed attack.
          </p>
          <p className={ui.note}>
            Target restrictions describe the attack that benefits. “All targets” in a debuff description means the enemies receiving it, not that only AoE
            attacks benefit. For an “all enhanced attributes” effect, choose the “+” effect type and Any attribute.
          </p>
          <ul className={css.editorList}>
            {draft.effects.map((e, i) => (
              <li key={i} className={css.editorRow}>
                <Field label="Effect" wide>
                  {(id) => (
                    <Select<EffectTypeId>
                      id={id}
                      ariaLabel={`Effect type ${i + 1}`}
                      value={e.type}
                      options={TYPE_OPTIONS}
                      onChange={(type) => setEffect(i, { type })}
                    />
                  )}
                </Field>
                <Field label="Value">
                  {(id) => (
                    <NumberInput
                      id={id}
                      ariaLabel={`Effect value ${i + 1}`}
                      value={e.value}
                      decimal
                      min={-MAX_PROVIDER_EFFECT_VALUE}
                      max={MAX_PROVIDER_EFFECT_VALUE}
                      allowNegative
                      suffix="%"
                      onChange={(value) => setEffect(i, { value })}
                    />
                  )}
                </Field>
                <button
                  type="button"
                  className={ui.iconButton}
                  aria-label={`Remove effect ${i + 1}`}
                  onClick={() => set({ effects: draft.effects.filter((_, j) => j !== i) })}
                >
                  <Icon name="trash" />
                </button>
                {EFFECT_BY_ID[e.type].attribute && (
                  <Field label="Attribute">
                    {(id) => (
                      <Select<AttributeFilter>
                        id={id}
                        ariaLabel={`Attribute restriction ${i + 1}`}
                        value={e.attribute}
                        options={ATTRIBUTE_FILTER_OPTIONS}
                        onChange={(attribute) => setEffect(i, { attribute })}
                      />
                    )}
                  </Field>
                )}
                <Field label="Attack type">
                  {(id) => (
                    <Select<NonNullable<UnitEffect['attackType']>>
                      id={id}
                      ariaLabel={`Attack type restriction ${i + 1}`}
                      value={e.attackType ?? 'any'}
                      options={ATTACK_SCOPE_OPTIONS}
                      onChange={(attackType) => setEffect(i, { attackType })}
                    />
                  )}
                </Field>
                <Field label="Target type">
                  {(id) => (
                    <Select<NonNullable<UnitEffect['target']>>
                      id={id}
                      ariaLabel={`Target restriction ${i + 1}`}
                      value={e.target ?? 'any'}
                      options={TARGET_SCOPE_OPTIONS}
                      onChange={(target) => setEffect(i, { target })}
                    />
                  )}
                </Field>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={ui.button}
            disabled={draft.effects.length >= MAX_PROVIDER_EFFECTS}
            onClick={() => set({ effects: [...draft.effects, { type: 'soulDmg', value: 0, attribute: 'any' }] })}
          >
            <Icon name="plus" /> Add effect
          </button>
          {draft.effects.length >= MAX_PROVIDER_EFFECTS && <p className={ui.note}>A provider can contain up to {MAX_PROVIDER_EFFECTS} effects.</p>}
          <h3 className={ui.groupTitle}>Special-hit outcomes for this setup</h3>
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
  const [library, setLibrary, providerSaveState] = usePersistentState(
    STORAGE_KEYS.providerLibrary,
    () =>
      createProviderLibrary(
        PRESET_UNITS,
        loadJSON(STORAGE_KEYS.units),
        workspace.hits.map((hit) => hit.id),
      ),
    normalizeProviderLibrary,
    { immediate: true },
  );
  const candidates = useMemo(() => poolProviders(library, activeHit.id, true), [library, activeHit.id]);
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
    () => comparisonRequirements(activeHit, workspace.enemy, candidates, settings.size, settings.maxCost),
    [activeHit, workspace.enemy, candidates, settings.size, settings.maxCost],
  );
  const baseCalculation = useMemo(() => {
    if (baseMissing.length)
      return {
        damage: null,
        error: `Confirm ${baseMissing.length} required base-setup input${baseMissing.length === 1 ? '' : 's'} in the Calculator before comparing providers.`,
      };
    try {
      return { damage: calculateHit(base).damage, error: null };
    } catch (error) {
      const message = calculationInputError(error);
      if (message === null) throw error;
      return { damage: null, error: `Cannot calculate the base setup. ${message} Edit the base setup before comparing providers.` };
    }
  }, [base, baseMissing]);
  const baseDamage = baseCalculation.damage;
  const total = countCombinations(candidates.length, settings.size);
  const tooMany = total > MAX_COMBINATIONS;
  const ranking = useTeamSearch({ base, pool: candidates, size: settings.size, maxCost: settings.maxCost });
  const requirementError = requirements.missing.length
    ? `Required for the selected providers: ${requirements.missing.map((item) => item.label).join(', ')}. Confirm these values before comparing combinations.`
    : null;
  const comparisonError = requirementError || ranking.error;
  const results = ranking.result?.results ?? [];
  const index = workspace.hits.findIndex((h) => h.id === activeHit.id);

  const save = (unit: SupportUnit) => {
    const provider = libraryProvider(unit);
    setLibrary((current) => ({
      ...current,
      providers: current.providers.some((entry) => entry.id === provider.id)
        ? current.providers.map((entry) => (entry.id === provider.id ? provider : entry))
        : [...current.providers, provider],
    }));
    setEditing(null);
  };

  return (
    <div className={css.page}>
      <div className={css.column}>
        <Card
          title="Fixed attacker and enemy"
          subtitle="Set up one attacker, one enemy and the selected soul attack in Calculator. Teams keeps that setup fixed and compares which buff-provider combination produces the most damage for that attack."
          actions={
            <a className={`${ui.button} ${ui.ghost}`} href={hrefFor('calculator')}>
              <Icon name="edit" /> Edit in Calculator
            </a>
          }
        >
          <p className={css.summary}>
            <b>{hitLabel(activeHit, index)}</b> · {attackLabel(activeHit)} vs. <b>{workspace.enemy.name || 'enemy'}</b> (DEF {fmtInt(workspace.enemy.def)})
            <br />
            Damage before added providers: <b>{baseDamage === null ? '—' : fmtInt(baseDamage)}</b>
          </p>
          <p className={ui.note}>
            Effects entered in Calculator apply to every combination. Add only the extra provider effects below to avoid counting them twice. Results show this
            attacker’s selected attack; the providers’ own attacks are not included.
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
                  note="Needed by Synergy in the base setup or a selected provider."
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
                  note="Needed by Aegis in the base setup or a selected provider."
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

        <ProviderManager library={library} setLibrary={setLibrary} hitId={activeHit.id} saveState={providerSaveState} onEdit={setEditing} />
      </div>

      <div className={`${css.column} ${css.sticky}`}>
        <Card title="Combination rules">
          <p className={ui.note} aria-live="polite" aria-atomic="true">
            Compare combinations of exactly {settings.size} buff {settings.size === 1 ? 'provider' : 'providers'}
            {settings.maxCost > 0 ? ` costing at most ${fmtInt(settings.maxCost)} SP in total.` : ' with no skill-point limit.'}
          </p>
          <p className={ui.note}>Each provider contributes its applicable entered effects once to the fixed attack, and combinations are ranked by damage.</p>
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
            <Field label="Skill point limit" note="0 = no limit.">
              {(id) => <NumberInput id={id} value={settings.maxCost} suffix="SP" onChange={(maxCost) => setSettings((s) => ({ ...s, maxCost }))} />}
            </Field>
          </div>
        </Card>
        <Card
          title="Ranked buff combinations"
          subtitle={
            baseCalculation.error
              ? 'Edit the base setup to calculate buff combinations.'
              : comparisonError
                ? 'The comparison is unavailable until the calculation inputs are corrected.'
                : tooMany
                  ? `${fmtInt(total)} combinations is too many — remove providers or choose a smaller combination.`
                  : candidates.length < settings.size
                    ? `Include at least ${settings.size} providers in the comparison.`
                    : ranking.status === 'done'
                      ? `${fmtInt(ranking.result?.eligible ?? 0)} of ${fmtInt(total)} combinations fit the rules. Showing the best ${Math.min(MAX_RANKED_TEAMS, results.length)}. Highest damage first; lower skill cost breaks ties. All effects must be valid and active together.`
                      : 'Choose providers and rules, then compare. Editing inputs cancels an older search and clears its results.'
          }
        >
          <div className={css.fileActions}>
            <button
              type="button"
              className={`${ui.button} ${ui.primary}`}
              disabled={!!baseCalculation.error || !!requirementError || tooMany || total === 0 || ranking.status === 'running'}
              onClick={() => {
                setShown(PAGE);
                ranking.start();
              }}
            >
              Compare combinations
            </button>
            {ranking.status === 'running' && (
              <button type="button" className={ui.button} onClick={ranking.cancel}>
                Cancel comparison
              </button>
            )}
          </div>
          {ranking.status === 'running' && (
            <div className={css.progressBox}>
              <p role="status">Calculating combinations…</p>
              <progress aria-label="Combination search progress" max={Math.max(1, total)} value={ranking.progress.visited} />
              <p>
                {Math.floor((ranking.progress.visited / Math.max(1, total)) * 100)}% · {fmtInt(ranking.progress.visited)} / {fmtInt(total)} checked ·{' '}
                {fmtInt(ranking.progress.eligible)} fit the budget
              </p>
            </div>
          )}
          {ranking.status === 'cancelled' && (
            <p className={ui.note} role="status">
              Comparison cancelled. No partial ranking is shown. Press Compare combinations to start again.
            </p>
          )}
          {ranking.status === 'done' && (
            <p className={ui.note} role="status">
              Comparison complete: {fmtInt(ranking.progress.visited)} combinations checked.
            </p>
          )}
          {comparisonError && (
            <p role="alert" className={ui.note}>
              {comparisonError}
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
