// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { defaultWorkspace, blankHit } from '../../domain/defaults';
import { getRequirements } from '../../domain/requirements';
import { exportWorkspaceFile } from '../../domain/workspaceFiles';
import { STORAGE_KEYS } from '../../state/storage';
import { WorkspaceProvider } from '../../state/WorkspaceProvider';
import { CalculatorPage } from './CalculatorPage';
import TeamsPage from '../teams/TeamsPage';

vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));
function completeWorkspace() {
  const ws = defaultWorkspace();
  const hit = ws.hits[0]!;
  hit.attacker.attribute = 'fire';
  hit.attacker.battleAtk = 10000;
  hit.attacker.attackType = 'physical';
  hit.attack.kind = 'soul';
  hit.attack.power = 100;
  ws.enemy.attribute = 'fire';
  ws.enemy.def = 5000;
  for (const r of getRequirements(hit, ws.enemy)) {
    const owner = r.key.startsWith('enemy.') ? ws.enemy : hit;
    owner.confirmed = { ...owner.confirmed, [r.key]: true };
  }
  return ws;
}
const output = () => document.querySelector('#result output')?.textContent;
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#/calculator');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('production calculator workflows', () => {
  it('preserves current work when a shared link has the wrong shape', async () => {
    const ws = completeWorkspace();
    window.history.replaceState(null, '', '#/calculator?s=je30');
    render(
      <WorkspaceProvider initial={ws}>
        <App />
      </WorkspaceProvider>,
    );
    expect(await screen.findByText(/This shared workspace is invalid/)).toHaveTextContent('preserved');
    expect(output()).toBe('3,000');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.workspace)!).hits[0].attacker.battleAtk).toBe(10000);
  });
  it('imports a workspace with its selection and can restore the previous workspace after reopening', async () => {
    const initial = completeWorkspace();
    const imported = completeWorkspace();
    const second = structuredClone(imported.hits[0]!);
    second.id = 'second-imported';
    second.attacker.name = 'Imported setup';
    second.attacker.battleAtk = 20000;
    imported.hits.push(second);
    imported.activeHitId = second.id;
    const json = exportWorkspaceFile(imported);
    const file = new File([json], 'workspace.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => json });
    const user = userEvent.setup();
    const view = render(
      <WorkspaceProvider initial={initial}>
        <App />
      </WorkspaceProvider>,
    );
    await user.upload(screen.getByLabelText('Import Calculator workspace from JSON'), file);
    expect(await screen.findByText(/Workspace imported/)).toBeInTheDocument();
    expect(output()).toBe('7,000');
    expect(screen.getByRole('tab', { name: /Imported setup/ })).toHaveAttribute('aria-selected', 'true');
    expect(localStorage.getItem(STORAGE_KEYS.recovery)).toBeTruthy();
    view.unmount();
    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Restore previous workspace' }));
    expect(output()).toBe('3,000');
    expect(screen.getAllByRole('tab')).toHaveLength(1);
  });
  it('rejects invalid imports without changing data or recovery', async () => {
    const user = userEvent.setup();
    const file = new File(['{}'], 'invalid.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => '{}' });
    render(
      <WorkspaceProvider initial={completeWorkspace()}>
        <CalculatorPage />
      </WorkspaceProvider>,
    );
    await user.upload(screen.getByLabelText('Import Calculator workspace from JSON'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent('has not been changed');
    expect(output()).toBe('3,000');
    expect(localStorage.getItem(STORAGE_KEYS.recovery)).toBeNull();
  });
  it('shows failed saving while keeping current inputs usable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota', 'QuotaExceededError');
    });
    render(
      <WorkspaceProvider initial={completeWorkspace()}>
        <CalculatorPage />
      </WorkspaceProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Battle ATK' }), { target: { value: '20000' } });
    expect(output()).toBe('7,000');
  });
  it('supports arrow/Home/End setup keys and undoes deletion', async () => {
    const ws = completeWorkspace();
    const second = structuredClone(ws.hits[0]!);
    second.id = 'second';
    second.attacker.name = 'Second';
    ws.hits.push(second);
    const user = userEvent.setup();
    render(
      <WorkspaceProvider initial={ws}>
        <App />
      </WorkspaceProvider>,
    );
    screen.getAllByRole('tab')[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Second/ })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'setup-tab-1');
    await user.keyboard('{Home}');
    expect(screen.getAllByRole('tab')[0]).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getAllByRole('tab')[1]).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Remove setup' }));
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: /Second/ })).toHaveAttribute('aria-selected', 'true');
  });
  it('associates missing numeric state with the input, and hides incomplete tab damage', () => {
    const ws = completeWorkspace();
    ws.hits[0]!.attack.synergy = 'normal';
    render(
      <WorkspaceProvider initial={ws}>
        <CalculatorPage />
      </WorkspaceProvider>,
    );
    const input = screen.getByRole('spinbutton', { name: 'Support character ATK' });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/awaiting confirmation/);
    expect(screen.getByRole('tab')).toHaveTextContent('—');
    expect(output()).toBe('—');
  });
  it('caps source creation and explains Super mode in its help', async () => {
    const ws = completeWorkspace();
    const hit = ws.hits[0]!;
    hit.attack.crit = true;
    hit.attack.superCrit = true;
    hit.effectEntries = { critDmg: Array(100).fill(1) };
    const user = userEvent.setup();
    render(
      <WorkspaceProvider initial={ws}>
        <CalculatorPage />
      </WorkspaceProvider>,
    );
    const group = screen.getByRole('group', { name: 'Critical power UP' });
    expect(within(group).getByRole('button', { name: 'Add Critical power UP source' })).toBeDisabled();
    await user.click(within(group).getByRole('button', { name: 'Explain Critical power UP' }));
    expect(screen.getByText(/Super mode is selected/)).toHaveTextContent('1.3');
  });
  it('describes lower observed damage without a redundant negative sign', () => {
    const ws = completeWorkspace();
    ws.hits[0]!.observed = 2000;
    render(
      <WorkspaceProvider initial={ws}>
        <CalculatorPage />
      </WorkspaceProvider>,
    );
    expect(screen.getByText(/The game did/)).toHaveTextContent('33.3% less than predicted');
    expect(screen.getByText(/The observed hit is about/)).toHaveTextContent('33.3% below');
  });
  it('excludes providers, removes them silently from a pool, and allows adding them back from the Library', async () => {
    localStorage.setItem(
      STORAGE_KEYS.units,
      JSON.stringify([
        {
          id: 'provider-one',
          name: 'First provider',
          skillCost: 10,
          effects: [{ type: 'elementAtk', value: 10, attribute: 'any' }],
          triggers: {},
          icon: 'units/missing.png',
        },
      ]),
    );
    localStorage.setItem(STORAGE_KEYS.teamSettings, JSON.stringify({ size: 1, maxCost: 0 }));
    const user = userEvent.setup();
    render(
      <WorkspaceProvider initial={completeWorkspace()}>
        <TeamsPage />
      </WorkspaceProvider>,
    );
    const image = document.querySelector('img[src$="units/missing.png"]')!;
    fireEvent.error(image);
    expect(document.querySelector('img[src$="units/missing.png"]')).toBeNull();
    expect(screen.getByText('FP')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Compare combinations' }));
    await waitFor(() => expect(screen.getByText(/Comparison complete/)).toBeInTheDocument());
    await user.click(screen.getByRole('checkbox', { name: 'Include First provider in comparisons' }));
    expect(Object.values(JSON.parse(localStorage.getItem(STORAGE_KEYS.providerLibrary)!).pools).flat()).toContainEqual({ id: 'provider-one', included: false });
    expect(screen.getByRole('button', { name: 'Compare combinations' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Remove First provider from test pool' }));
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.queryByText(/First provider removed/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add from Library' }));
    await user.click(screen.getByRole('checkbox', { name: 'Add First provider' }));
    await user.click(screen.getByRole('button', { name: 'Add 1 provider' }));
    expect(screen.getByRole('checkbox', { name: 'Include First provider in comparisons' })).toBeChecked();
  });
  it('does not show zero damage for an added incomplete setup', () => {
    const ws = completeWorkspace();
    ws.hits.push(blankHit());
    render(
      <WorkspaceProvider initial={ws}>
        <CalculatorPage />
      </WorkspaceProvider>,
    );
    expect(screen.getAllByRole('tab')[1]).toHaveTextContent('—');
  });
});
