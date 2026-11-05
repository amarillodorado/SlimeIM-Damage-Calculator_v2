import { searchTeams, type SearchMessage, type SearchRequest } from '../../domain/teamSearch';

const worker = self as unknown as { onmessage: ((event: MessageEvent<SearchRequest>) => void) | null; postMessage: (message: SearchMessage) => void };
worker.onmessage = (event) => {
  void searchTeams(event.data, (progress) => worker.postMessage({ type: 'progress', progress }))
    .then((result) => {
      if (result) worker.postMessage({ type: 'done', result });
    })
    .catch((error: unknown) =>
      worker.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Comparison failed. Check the inputs and retry.' }),
    );
};
