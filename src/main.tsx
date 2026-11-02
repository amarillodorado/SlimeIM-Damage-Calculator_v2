import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { WorkspaceProvider } from './state/WorkspaceProvider';
import './styles/tokens.css';
import './styles/base.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </StrictMode>,
);
