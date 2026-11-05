// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { PageErrorBoundary } from './PageErrorBoundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('offers recovery and can render the retried page without clearing its parent data', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Page({ failed }: { failed: boolean }) {
    if (failed) throw new Error('Temporary page failure');
    return <p>Recovered page</p>;
  }
  function Harness() {
    const [retry, setRetry] = useState(0);
    return (
      <>
        <input aria-label="Saved outside page" defaultValue="Kept" />
        <PageErrorBoundary key={retry} onRetry={() => setRetry((n) => n + 1)}>
          <Page failed={retry === 0} />
        </PageErrorBoundary>
      </>
    );
  }
  const user = userEvent.setup();
  render(<Harness />);
  expect(screen.getByRole('alert')).toHaveTextContent('This page could not load');
  await user.click(screen.getByRole('button', { name: 'Retry page' }));
  expect(screen.getByText('Recovered page')).toBeInTheDocument();
  expect(screen.getByLabelText('Saved outside page')).toHaveValue('Kept');
});
