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

describe('calculator startup and saved workspaces', () => {
  it('starts with one complete built-in example on a first visit', () => {
    // The old default workspace must not silently load after this update.
    const old = ordinaryInput();
    old.hits[0]!.attacker.name = 'Old seeded example';
    localStorage.setItem('slimeim.v6.workspace', JSON.stringify(old));
    renderCalculator();
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getAllByLabelText('Name (optional)')[0]!).toHaveValue('Example - Super Critical');
    expect(screen.getByLabelText('Battle ATK')).toHaveValue(10000);
    expect(heroValue()).toBe('6,900');
    expect(screen.getByText('All required inputs confirmed for this setup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load example' })).toBeInTheDocument();
    expect(screen.getByLabelText('Critical power UP source 1')).toHaveValue(100);
    expect(screen.getByLabelText('Critical power UP source 2')).toHaveValue(-50);
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

  it('selects attacker and enemy attributes independently and preserves the + choice across attribute changes', async () => {
    const user = userEvent.setup();
    renderCalculator(ordinaryInput());
    const attacker = within(screen.getByRole('radiogroup', { name: 'Attribute' }));
    const enemy = within(screen.getByRole('radiogroup', { name: 'Enemy attribute' }));
    await user.click(screen.getByRole('switch', { name: '+ attribute' }));
    expect(attacker.getByRole('radio', { name: 'Fire+' })).toBeChecked();
    await user.click(attacker.getByRole('radio', { name: 'Dark+' }));
    await user.click(enemy.getByRole('radio', { name: 'Water' }));
    expect(attacker.getByRole('radio', { name: 'Dark+' })).toBeChecked();
    expect(enemy.getByRole('radio', { name: 'Water' })).toBeChecked();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.workspace)!);
    expect(saved.hits[0].attacker).toMatchObject({ attribute: 'dark', plus: true });
    expect(saved.enemy.attribute).toBe('water');
    await user.click(screen.getByRole('switch', { name: '+ attribute' }));
    expect(attacker.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('confirms the current attribute and supports native arrow-key selection', async () => {
    const user = userEvent.setup();
    renderCalculator(defaultWorkspace());
    const attacker = screen.getByRole('radiogroup', { name: 'Attribute' });
    expect(attacker).toHaveAttribute('aria-invalid', 'true');
    await user.click(within(attacker).getByRole('radio', { name: 'Fire' }));
    expect(attacker).not.toHaveAttribute('aria-invalid');
    await user.keyboard('{ArrowRight}');
    const water = within(attacker).getByRole('radio', { name: 'Water' });
    expect(water).toBeChecked();
    expect(water).toHaveFocus();
    expect(within(screen.getByRole('radiogroup', { name: 'Enemy attribute' })).getByRole('radio', { name: 'Wind' })).toBeChecked();
  });

  it('loads the built-in example on demand and can recover the previous workspace', async () => {
    const user = userEvent.setup();
    renderCalculator(ordinaryInput());
    await user.click(screen.getByRole('button', { name: 'Load example' }));
    expect(heroValue()).toBe('6,900');
    expect(screen.getByLabelText('Battle ATK')).toHaveValue(10000);
    await user.click(screen.getByRole('button', { name: 'Restore previous workspace' }));
    expect(heroValue()).toBe('3,000');
    expect(screen.getAllByLabelText('Name (optional)')[0]!).toHaveValue('Own recorded hit');
  });

  it('keeps a cleared workspace blank after reopening rather than seeding again', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = renderCalculator();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    view.unmount();
    renderCalculator();
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getAllByLabelText('Name (optional)')[0]!).toHaveValue('');
    expect(heroValue()).toBe('—');
  });

  it('shows matching Fire and Fire+ resistance fields without All types against Water', async () => {
    const ws = ordinaryInput();
    ws.hits[0]!.attacker.plus = true;
    ws.enemy.attribute = 'water';
    const user = userEvent.setup();
    renderCalculator(ws);
    expect(screen.getByLabelText('Fire resistance DOWN')).toBeVisible();
    expect(screen.getByLabelText('Fire+ resistance DOWN')).toBeVisible();
    expect(screen.getByLabelText('Fire damage res. DOWN')).toBeVisible();
    expect(screen.getByLabelText('Fire+ damage resistance DOWN')).toBeVisible();
    expect(screen.getByLabelText('Fire+ ATK UP')).toBeVisible();
    expect(screen.getByLabelText('Fire+ damage UP')).toBeVisible();
    expect(screen.queryByLabelText('Water resistance DOWN')).not.toBeInTheDocument();
    const before = heroValue();
    await user.type(screen.getByLabelText('Fire+ resistance DOWN'), '20');
    expect(heroValue()).not.toBe(before);
  });

  it('keeps ordinary attribute resistance visible while excluding inapplicable enhanced effects', () => {
    const ws = ordinaryInput();
    ws.enemy.attribute = 'water';
    renderCalculator(ws);
    expect(screen.getByLabelText('Fire resistance DOWN')).toBeVisible();
    expect(screen.getByLabelText('Fire damage res. DOWN')).toBeVisible();
    expect(screen.queryByLabelText('Fire+ resistance DOWN')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Fire+ damage resistance DOWN')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Duplicate setup' }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Soul Combos' })).getByRole('radio', { name: /100%/ }));
    expect(screen.getByText('Total of 2 setups')).toBeInTheDocument();
    expect(screen.getByText('6,000')).toBeInTheDocument();
  });

  it('shows ordinary Critical controls and calculates the selected outcome', async () => {
    const user = userEvent.setup();
    renderCalculator(ordinaryInput());
    const crit = screen.getByRole('radiogroup', { name: 'Critical' });
    expect(within(crit).getByRole('radio', { name: 'Super' })).toBeInTheDocument();
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
  it('explains both ways to collect values, both ATK modes and candidate-roll limits without loading examples', () => {
    render(
      <WorkspaceProvider>
        <GuidePage />
      </WorkspaceProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Two ways to collect the values' })).toBeInTheDocument();
    expect(screen.getByText('A · From the battle screens')).toBeInTheDocument();
    expect(screen.getByText('B · From the pre-battle screens')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What the battle screens never show' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ATK: two ways to enter it' })).toBeInTheDocument();
    expect(screen.getByText('A · Battle ATK')).toBeInTheDocument();
    expect(screen.getByText('B · Estimated pre-battle ATK')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Special hits: Critical, Pierce, Synergy, Aegis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Checking a recorded hit' })).toBeInTheDocument();
    // The worked example is explanation only: nothing can be loaded into the calculator from the guide.
    expect(screen.queryByText(/Load runs|Load run 4/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load|example/i })).not.toBeInTheDocument();
  });
});
