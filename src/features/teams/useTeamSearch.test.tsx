// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultWorkspace } from '../../domain/defaults';
import { toInput } from '../../domain/engine';
import { useTeamSearch } from './useTeamSearch';
import type { SearchMessage } from '../../domain/teamSearch';
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: SearchMessage }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  send(data: SearchMessage) {
    this.onmessage?.({ data });
  }
}
const ws = defaultWorkspace();
function Harness({ cost = 0 }: { cost?: number }) {
  const search = useTeamSearch({ base: toInput(ws.hits[0]!, ws.enemy), pool: [], size: 1, maxCost: cost });
  return (
    <>
      <button onClick={search.start}>Compare</button>
      <button onClick={search.cancel}>Cancel</button>
      <output>
        {search.status}:{search.progress.visited}
      </output>
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  FakeWorker.instances = [];
});
describe('worker lifecycle', () => {
  it('reports progress, cancels and ignores late messages from an older search', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const user = userEvent.setup();
    const view = render(<Harness />);
    await user.click(screen.getByText('Compare'));
    const old = FakeWorker.instances[0]!;
    act(() => old.send({ type: 'progress', progress: { visited: 25, total: 100, eligible: 25 } }));
    expect(screen.getByRole('status')).toHaveTextContent('running:25');
    await user.click(screen.getByText('Cancel'));
    expect(old.terminate).toHaveBeenCalled();
    act(() => old.send({ type: 'done', result: { results: [], visited: 100, total: 100, eligible: 100 } }));
    expect(screen.getByRole('status')).toHaveTextContent('cancelled');
    await user.click(screen.getByText('Compare'));
    view.rerender(<Harness cost={40} />);
    expect(FakeWorker.instances[1]!.terminate).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('idle');
    view.rerender(<Harness cost={0} />);
    expect(screen.getByRole('status')).toHaveTextContent('idle');
  });
});
