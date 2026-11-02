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

export function CalculatorPage() {
  const { activeHit } = useWorkspace();
  const { byHit, total, error } = useResults();
  const result = byHit.get(activeHit.id)!;

  return (
    <div className={css.page}>
      <div className={css.inputs}>
        <RequiredInputs />
        <HitTabs results={byHit} />
        <AttackerCard result={result} />
        <AttackCard />
        <EnemyCard />
        <BuffsCard />
      </div>
      {error ? (
        <section className={ui.card} role="alert">
          <h2>Check the inputs</h2>
          <p>{error}</p>
          <p>Correct the affected hit before calculating a result or total.</p>
        </section>
      ) : (
        <ResultPanel result={result} byHit={byHit} total={total} />
      )}
    </div>
  );
}
