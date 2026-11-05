import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchTeams, type SearchMessage, type SearchProgress, type SearchRequest, type SearchResult } from '../../domain/teamSearch';

type SearchState = {
  status: 'idle' | 'running' | 'done' | 'cancelled' | 'error';
  progress: SearchProgress;
  result?: SearchResult;
  error?: string;
  key: string;
};
const empty = { visited: 0, total: 0, eligible: 0 };
export function useTeamSearch({ base, pool, size, maxCost }: SearchRequest) {
  const key = useMemo(() => JSON.stringify({ base, pool, size, maxCost }), [base, pool, size, maxCost]);
  const [state, setState] = useState<SearchState>({ status: 'idle', progress: empty, key });
  const generation = useRef(0);
  const worker = useRef<Worker | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
  }, []);
  useEffect(() => {
    setState({ status: 'idle', progress: empty, key });
    return stop;
  }, [key, stop]);
  const cancel = useCallback(() => {
    stop();
    setState((s) => ({ status: 'cancelled', progress: s.progress, key }));
  }, [stop, key]);
  const start = () => {
    stop();
    const id = generation.current;
    setState({ status: 'running', progress: empty, key });
    const receive = (message: SearchMessage) => {
      if (generation.current !== id) return;
      if (message.type === 'progress') setState({ status: 'running', progress: message.progress, key });
      if (message.type === 'done') {
        stop();
        setState({ status: 'done', progress: message.result, result: message.result, key });
      }
      if (message.type === 'error') {
        stop();
        setState({
          status: 'error',
          progress: empty,
          error: `Cannot calculate these combinations. ${message.message} Check the providers and base setup, then retry.`,
          key,
        });
      }
    };
    if (typeof Worker !== 'undefined') {
      try {
        const task = new Worker(new URL('./teams.worker.ts', import.meta.url), { type: 'module' });
        worker.current = task;
        task.onmessage = (event: MessageEvent<SearchMessage>) => receive(event.data);
        task.onerror = () => receive({ type: 'error', message: 'The comparison worker could not load. Retry the comparison or reload the website.' });
        task.postMessage({ base, pool, size, maxCost });
      } catch {
        receive({ type: 'error', message: 'The comparison worker could not start. Reload the website and retry.' });
      }
    } else {
      void searchTeams(
        { base, pool, size, maxCost },
        (progress) => receive({ type: 'progress', progress }),
        () => generation.current !== id,
      )
        .then((result) => {
          if (result) receive({ type: 'done', result });
        })
        .catch((error: unknown) => receive({ type: 'error', message: error instanceof Error ? error.message : 'Unexpected calculation failure.' }));
    }
  };
  const visible: SearchState = state.key === key ? state : { status: 'idle', progress: empty, key };
  return { ...visible, start, cancel };
}
