import { useWorkspace } from '../../state/workspaceContext';
import ui from '../../components/ui.module.css';
import { AttackCard } from './AttackCard';
import { AttackerCard } from './AttackerCard';
import { BuffsCard } from './BuffsCard';
import css from './calculator.module.css';
import { EnemyCard } from './EnemyCard';
import { HitTabs } from './HitTabs';
import { ResultPanel } from './ResultPanel';
import { useResults } from './useCalculator';
import { RequiredInputs } from './RequiredInputs';
import { WorkspaceTools } from './WorkspaceTools';

export function CalculatorPage() {
  const { activeHit, workspace } = useWorkspace();
  const { byHit, total, error } = useResults();
  const result = byHit.get(activeHit.id)!;

  return (
    <div className={css.page}>
      <div className={css.inputs}>
        <WorkspaceTools />
        <RequiredInputs />
        <HitTabs results={byHit} />
        <div
          className={css.inputs}
          role="tabpanel"
          id="setup-panel"
          aria-labelledby={`setup-tab-${workspace.hits.findIndex((hit) => hit.id === activeHit.id)}`}
          tabIndex={0}
        >
          <AttackerCard result={result} />
          <AttackCard />
          <EnemyCard />
          <BuffsCard />
        </div>
      </div>
      {error ? (
        <section className={ui.card} role="alert">
          <h2>Check the inputs</h2>
          <p>{error}</p>
          <p>Correct the affected setup before calculating a result or total.</p>
        </section>
      ) : (
        <ResultPanel result={result} byHit={byHit} total={total} />
      )}
    </div>
  );
}
