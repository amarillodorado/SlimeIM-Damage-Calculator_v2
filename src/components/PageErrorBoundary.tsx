import { Component, type ReactNode } from 'react';
import ui from './ui.module.css';

export class PageErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className={ui.card} role="alert">
        <h2>This page could not load</h2>
        <p>
          Your workspace and providers are kept. Check your connection, then retry. If a new website version was published, reload to get its current files.
        </p>
        <div className={ui.fileActions}>
          <button type="button" className={ui.button} onClick={this.props.onRetry}>
            Retry page
          </button>
          <button type="button" className={ui.button} onClick={() => window.location.reload()}>
            Reload website
          </button>
        </div>
      </section>
    );
  }
}
