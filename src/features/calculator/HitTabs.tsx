import type { HitSummary } from '../../domain/engine';
import { Icon } from '../../components/Icon';
import ui from '../../components/ui.module.css';
import { useWorkspace } from '../../state/workspaceContext';
import { MAX_HITS } from '../../state/workspaceReducer';
import css from './calculator.module.css';
import { fmtInt, hitLabel } from './format';

/** One tab per damage setup; the enemy is shared. */
export function HitTabs({ results }: { results: Map<string, HitSummary> }) {
  const { workspace, activeHit, dispatch } = useWorkspace();
  const full = workspace.hits.length >= MAX_HITS;
  return (
    <div className={css.hitBar}>
      <div className={css.hits} role="tablist" aria-label="Setups">
        {workspace.hits.map((h, i) => (
          <button
            key={h.id}
            type="button"
            role="tab"
            aria-selected={h.id === activeHit.id}
            className={css.hitTab}
            onClick={() => dispatch({ type: 'selectHit', id: h.id })}
          >
            <span className={css.hitTabName}>{hitLabel(h, i)}</span>
            <span className={css.hitTabDamage}>{(results.get(h.id)?.battleAtk ?? 0) > 0 ? fmtInt(results.get(h.id)?.damage ?? 0) : '—'}</span>
          </button>
        ))}
      </div>
      <div className={css.hitActions}>
        <button
          type="button"
          className={ui.iconButton}
          disabled={full}
          aria-label="Duplicate setup"
          title="Duplicate setup"
          onClick={() => dispatch({ type: 'addHit', mode: 'duplicate' })}
        >
          <Icon name="duplicate" />
        </button>
        <button
          type="button"
          className={ui.iconButton}
          disabled={full}
          aria-label="Add empty setup"
          title="Add empty setup"
          onClick={() => dispatch({ type: 'addHit', mode: 'blank' })}
        >
          <Icon name="plus" />
        </button>
        <button
          type="button"
          className={ui.iconButton}
          disabled={workspace.hits.length <= 1}
          aria-label="Remove setup"
          title="Remove setup"
          onClick={() => dispatch({ type: 'removeHit', id: activeHit.id })}
        >
          <Icon name="trash" />
        </button>
      </div>
    </div>
  );
}
