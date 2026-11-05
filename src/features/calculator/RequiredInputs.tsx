import { getMissingRequirements } from '../../domain/requirements';
import { Switch } from '../../components/inputs';
import { useWorkspace } from '../../state/workspaceContext';
import ui from '../../components/ui.module.css';
import { focusRequiredInput } from './focusRequiredInput';

export function RequiredInputs() {
  const { workspace, activeHit, dispatch } = useWorkspace();
  const missing = getMissingRequirements(activeHit, workspace.enemy);
  return (
    <section className={ui.guidance} aria-label="Required input guidance">
      <Switch
        label="Highlight required inputs"
        checked={workspace.highlightRequired !== false}
        onChange={(value) => dispatch({ type: 'setHighlightRequired', value })}
      />
      <p>Confirm each required choice, including preselected choices. Enter a value or use Confirm value for numeric inputs.</p>
      <div className={ui.guidanceStatus}>
        <span>
          {missing.length
            ? `${missing.length} input${missing.length === 1 ? ' still needs' : 's still need'} confirmation`
            : 'All required inputs confirmed for this setup'}
        </span>
        {missing[0] && (
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => focusRequiredInput(missing[0]!.key)}>
            Go to next required input
          </button>
        )}
      </div>
    </section>
  );
}
