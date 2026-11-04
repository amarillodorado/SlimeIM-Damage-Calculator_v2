import { useEffect, useMemo, useRef, useState } from 'react';
import { bestNextEffects, ADVISOR_STEP } from '../../domain/advisor';
import { checkObserved } from '../../domain/check';
import { effectLabel } from '../../domain/effects';
import { toInput, type HitSummary } from '../../domain/engine';
import { getMissingRequirements } from '../../domain/requirements';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { NumberInput } from '../../components/inputs';
import { Card } from '../../components/layout';
import ui from '../../components/ui.module.css';
import { encodeWorkspace } from '../../state/share';
import { useWorkspace } from '../../state/workspaceContext';
import css from './calculator.module.css';
import { attackLabel, fmtFactor, fmtInt, fmtPct, hitLabel, hitTags, summaryText } from './format';
import { useActiveHit } from './useCalculator';
import { focusRequiredInput } from './focusRequiredInput';

interface Props {
  result: HitSummary;
  byHit: Map<string, HitSummary>;
  total: { damage: number; min: number; max: number };
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('Copy this:', text);
    return false;
  }
}

function CheckHit({ result }: { result: HitSummary }) {
  const { hit, setObserved } = useActiveHit();
  const { workspace } = useWorkspace();
  const check = useMemo(() => (hit.observed > 0 ? checkObserved(toInput(hit, workspace.enemy), hit.observed) : null), [hit, workspace.enemy]);

  return (
    <Card title="Check a real hit" subtitle="Test whether this setup can reproduce the recorded damage.">
      <Field help="observed">{(id) => <NumberInput id={id} value={hit.observed} placeholder="Observed damage" onChange={setObserved} />}</Field>
      {check && (
        <div
          className={`${css.checkResult} ${check.status === 'exact' ? css.checkExact : check.status === 'inRange' ? css.checkClose : css.checkOff}`}
          role="status"
        >
          {check.status === 'exact' && (
            <>
              <strong>
                <Icon name="check" /> Exact match
              </strong>
              <span>
                Matching candidate roll{check.rolls.length === 1 ? '' : 's'}: {check.rolls.map((r) => r.toFixed(4)).join(', ')}. This setup can reproduce the
                hit. The match does not establish the actual random draw or uniquely prove every input.
              </span>
            </>
          )}
          {check.status === 'inRange' && (
            <>
              <strong>
                <Icon name="alert" /> Inside the range, but not an exact value
              </strong>
              <span>
                {fmtInt(hit.observed)} lies between {fmtInt(check.min)} and {fmtInt(check.max)}, but no allowed roll reproduces it with this setup. Recheck the
                inputs and whether the attack uses a supported damage path.
              </span>
            </>
          )}
          {(check.status === 'low' || check.status === 'high') && (
            <>
              <strong>
                <Icon name="alert" /> The game did {fmtPct((check.ratio - 1) * 100)} {check.status === 'high' ? 'more' : 'less'}
              </strong>
              <span>
                Calculated {fmtInt(result.damage)} ({fmtInt(check.min)}–{fmtInt(check.max)}), the game showed {fmtInt(hit.observed)}. Possible explanations to
                investigate:
              </span>
              <ul>
                {check.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function Advisor({ result }: { result: HitSummary }) {
  const { hit } = useActiveHit();
  const { workspace } = useWorkspace();
  const input = useMemo(() => toInput(hit, workspace.enemy), [hit, workspace.enemy]);
  const rows = useMemo(() => bestNextEffects(input, result.damage), [input, result.damage]);
  if (!rows.length) return null;
  const top = rows[0]!.gain;
  return (
    <Card
      title="Best next buff"
      subtitle={`Compares +${ADVISOR_STEP}% of each supported, applicable percentage effect for this selected outcome. Skill availability and activation costs are not considered.`}
    >
      <ol className={css.advisor}>
        {rows.map((r) => (
          <li key={r.type}>
            <span>{effectLabel(r.type, input)}</span>
            <span className={css.bar} aria-hidden="true">
              <span style={{ width: `${Math.max(4, (r.gain / top) * 100)}%` }} />
            </span>
            <span className={css.gain}>{fmtPct(r.gain * 100)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function ResultPanel({ result, byHit, total }: Props) {
  const { workspace, activeHit, dispatch } = useWorkspace();
  const [message, setMessage] = useState('');
  const panel = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const index = workspace.hits.findIndex((h) => h.id === activeHit.id);
  const tags = hitTags(activeHit);
  const missing = getMissingRequirements(activeHit, workspace.enemy);
  const hasInput = missing.length === 0;
  const incompleteHits = workspace.hits.filter((hit) => getMissingRequirements(hit, workspace.enemy).length > 0).length;

  // On phones the result sits below the inputs; the floating bar hides while it is on screen.
  useEffect(() => {
    const el = panel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { rootMargin: '0px 0px -120px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };

  const share = async () => {
    const code = await encodeWorkspace(workspace);
    const ok = await copy(`${location.origin}${location.pathname}#/calculator?s=${code}`);
    if (ok) flash('Link copied');
  };

  return (
    <aside className={css.results} id="result" aria-label="Result" ref={panel}>
      <section className={`${ui.card} ${css.hero}`} aria-labelledby="result-title">
        <span className={css.heroLabel} id="result-title">
          {hitLabel(activeHit, index)} · {attackLabel(activeHit)}
        </span>
        <output className={css.heroValue} aria-live="polite">
          {hasInput ? fmtInt(result.damage) : '—'}
        </output>
        <span className={css.heroRange}>
          {hasInput ? (
            <>
              {fmtInt(result.min)} – {fmtInt(result.max)} <span className={css.muted}>variance 0.9900–1.0099</span>
            </>
          ) : (
            `${missing.length} required input${missing.length === 1 ? '' : 's'} remaining`
          )}
        </span>
        {!hasInput && (
          <ul className={ui.missingInputs} aria-label="Missing required inputs">
            {missing.map((item) => (
              <li key={item.key}>
                <button type="button" onClick={() => focusRequiredInput(item.key)}>
                  {item.label}
                </button>
                {item.message && <small>{item.message}</small>}
              </li>
            ))}
          </ul>
        )}
        {tags.length > 0 && (
          <div className={css.tags}>
            {tags.map((t) => (
              <span key={t} className={css.tag}>
                {t}
              </span>
            ))}
          </div>
        )}
        {hasInput && workspace.hits.length > 1 && incompleteHits === 0 && (
          <div className={css.total}>
            <span>Total of {workspace.hits.length} setups</span>
            <strong>
              {fmtInt(total.damage)}{' '}
              <span className={css.muted}>
                ({fmtInt(total.min)}–{fmtInt(total.max)})
              </span>
            </strong>
          </div>
        )}
        {hasInput && workspace.hits.length > 1 && incompleteHits > 0 && (
          <p className={ui.note}>
            Complete the remaining {incompleteHits} {incompleteHits === 1 ? 'setup' : 'setups'} to calculate a total.
          </p>
        )}
        <div className={css.heroActions}>
          <button
            type="button"
            className={`${ui.button} ${ui.ghost}`}
            onClick={async () => (await copy(summaryText(workspace, byHit))) && flash('Summary copied')}
          >
            <Icon name="copy" /> Copy summary
          </button>
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => void share()}>
            <Icon name="share" /> Share link
          </button>
          <button
            type="button"
            className={`${ui.button} ${ui.ghost}`}
            onClick={() => window.confirm('Clear all setups and the enemy?') && dispatch({ type: 'clear' })}
          >
            <Icon name="reset" /> Clear
          </button>
        </div>
        <span className="sr-only" role="status">
          {message}
        </span>
        {message && <span className={ui.note}>{message}</span>}
      </section>

      {hasInput && <CheckHit result={result} />}

      {hasInput && (
        <Card title="How it’s calculated" subtitle="In the game’s order. Green = more damage, red = less.">
          <dl className={css.stats}>
            {result.stats.map((s) => (
              <div key={s.id} className={css.stat}>
                <dt>
                  {s.label}
                  <small>{s.detail}</small>
                </dt>
                <dd>{fmtInt(s.value)}</dd>
              </div>
            ))}
          </dl>
          <ol className={css.steps}>
            {result.steps.map((s) => (
              <li key={s.id} className={`${css.stepRow} ${s.id === 'final' ? css.finalRow : ''}`}>
                <span className={css.stepText}>
                  <span className={css.stepLabel}>{s.label}</span>
                  <small>{s.detail}</small>
                </span>
                {s.factor !== undefined && (
                  <span className={`${css.factor} ${s.factor > 1 ? css.up : s.factor < 1 ? css.down : ''}`}>{fmtFactor(s.factor)}</span>
                )}
                <span className={css.stepValue}>{fmtInt(s.value)}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {hasInput && <Advisor result={result} />}

      <button
        type="button"
        className={css.mobileBar}
        data-hidden={visible}
        aria-hidden={visible}
        tabIndex={visible ? -1 : 0}
        onClick={() => panel.current?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className={css.mobileBarLabel}>{workspace.hits.length > 1 ? 'Setup / total' : 'Damage'}</span>
        <span className={css.mobileBarValue}>
          {hasInput ? fmtInt(result.damage) : '—'}
          <small>
            {hasInput
              ? workspace.hits.length > 1 && incompleteHits === 0
                ? `Total ${fmtInt(total.damage)}`
                : `${fmtInt(result.min)}–${fmtInt(result.max)}`
              : `${missing.length} required input${missing.length === 1 ? '' : 's'} remaining`}
          </small>
        </span>
        <Icon name="arrowDown" />
      </button>
    </aside>
  );
}
