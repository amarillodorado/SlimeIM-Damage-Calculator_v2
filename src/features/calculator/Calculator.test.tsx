// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultWorkspace } from '../../domain/defaults';
import { getRequirements } from '../../domain/requirements';
import type { Workspace } from '../../domain/types';
import { STORAGE_KEYS } from '../../state/storage';
import { WorkspaceProvider } from '../../state/WorkspaceProvider';
import GuidePage from '../guide/GuidePage';
import { CalculatorPage } from './CalculatorPage';

function ordinaryInput(): Workspace {
  const ws = defaultWorkspace();
  ws.enemy = { ...ws.enemy, attribute: 'fire', def: 5000 };
  ws.hits[0]!.attacker = { ...ws.hits[0]!.attacker, name: 'Own recorded hit', battleAtk: 10000 };
  ws.hits[0]!.attack = { ...ws.hits[0]!.attack, kind: 'soul', power: 100 };
  for (const requirement of getRequirements(ws.hits[0]!, ws.enemy)) {
    const owner = requirement.key.startsWith('enemy.') ? ws.enemy : ws.hits[0]!;
    owner.confirmed = { ...owner.confirmed, [requirement.key]: true };
  }
  return ws;
}
function renderCalculator(initial?: Workspace) {
  return render(
    <WorkspaceProvider initial={initial}>
      <CalculatorPage />
    </WorkspaceProvider>,
  );
}
const heroValue = () => document.querySelector('#result output')!.textContent;

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('clean calculator workspace', () => {
  it('starts with one blank hit and no example-loading action', () => {
    // The old default workspace must not silently load after this update.
    const old = ordinaryInput();
    old.hits[0]!.attacker.name = 'Old seeded example';
    localStorage.setItem('slimeim.v6.workspace', JSON.stringify(old));
    renderCalculator();
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getAllByLabelText('Name (optional)')[0]!).toHaveValue('');
    expect(screen.getByLabelText('Battle ATK')).toHaveValue(0);
    expect(heroValue()).toBe('—');
    expect(screen.getAllByText(/required inputs? remaining/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Verified example/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Exact match')).not.toBeInTheDocument();
    expect(localStorage.getItem('slimeim.v6.workspace')).not.toBeNull();
  });

  it('restores the user’s own current workspace', () => {
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(ordinaryInput()));
    renderCalculator();
    expect(screen.getAllByLabelText('Name (optional)')[0]!).toHaveValue('Own recorded hit');
    expect(screen.getByLabelText('Battle ATK')).toHaveValue(10000);
    expect(heroValue()).toBe('3,000');
  });

  it('reports compatible candidate rolls without claiming to recover the actual draw', async () => {
    const user = userEvent.setup();
    renderCalculator(ordinaryInput());
    await user.type(screen.getByLabelText('Damage the game showed'), '3000');
    expect(screen.getByText('Exact match')).toBeInTheDocument();
    expect(screen.getByText(/Matching candidate rolls:/)).toHaveTextContent('0.9997');
    expect(screen.getByText(/does not establish the actual random draw/)).toBeInTheDocument();
    expect(screen.queryByText(/Every multiplier.*is right/)).not.toBeInTheDocument();
  });

  it('clears the current attacker, enemy, effects and observed damage', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderCalculator(ordinaryInput());
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getAllByLabelText('Name (optional)')[0]!).toHaveValue('');
    expect(screen.getByLabelText('Battle ATK')).toHaveValue(0);
    expect(heroValue()).toBe('—');
    expect(screen.getAllByRole('tab')).toHaveLength(1);
  });

  it('adds a separate hit and displays its total', async () => {
    const user = userEvent.setup();
    renderCalculator(ordinaryInput());
    await user.click(screen.getByRole('button', { name: /Add a hit \(copy/ }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Combo finisher' })).getByRole('radio', { name: /100%/ }));
    expect(screen.getByText('Total of 2 hits')).toBeInTheDocument();
    expect(screen.getByText('6,000')).toBeInTheDocument();
  });

  it('shows ordinary Critical controls and calculates the selected outcome', async () => {
    const user = userEvent.setup();
    renderCalculator(ordinaryInput());
    const crit = screen.getByRole('radiogroup', { name: 'Critical' });
    expect(within(crit).queryByRole('radio', { name: 'Super' })).not.toBeInTheDocument();
    await user.click(within(crit).getByRole('radio', { name: 'On' }));
    expect(heroValue()).toBe('3,900');
    const power = screen.getByLabelText('Critical power UP');
    await user.clear(power);
    await user.type(power, '20');
    expect(heroValue()).toBe('4,500');
  });

  it('opens Battle ATK help and closes it with Escape', async () => {
    const user = userEvent.setup();
    renderCalculator(ordinaryInput());
    const button = screen.getByRole('button', { name: 'Explain Battle ATK' });
    await user.click(button);
    expect(screen.getByRole('dialog', { name: 'Battle ATK' })).toHaveTextContent('Do not add ordinary Increased ATK effects again');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Battle ATK' })).not.toBeInTheDocument();
  });

  it('labels every visible number input', () => {
    renderCalculator(ordinaryInput());
    for (const input of screen.getAllByRole('spinbutton')) expect(input).toHaveAccessibleName();
  });
});

describe('generic guide', () => {
  it('explains both ATK modes and candidate-roll limits without loading examples', () => {
    render(
      <WorkspaceProvider>
        <GuidePage />
      </WorkspaceProvider>,
    );
    expect(screen.getByRole('heading', { name: 'ATK: two ways to enter it' })).toBeInTheDocument();
    expect(screen.getByText('A · Battle ATK')).toBeInTheDocument();
    expect(screen.getByText('B · Estimated pre-battle ATK')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Checking a recorded hit' })).toBeInTheDocument();
    expect(screen.queryByText(/Load runs|Load run 4/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Milim/)).not.toBeInTheDocument();
  });
});
