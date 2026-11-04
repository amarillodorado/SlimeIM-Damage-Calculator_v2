// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultWorkspace } from '../../domain/defaults';
import { getRequirements } from '../../domain/requirements';
import type { InputKey, Workspace } from '../../domain/types';
import { STORAGE_KEYS } from '../../state/storage';
import { WorkspaceProvider } from '../../state/WorkspaceProvider';
import { CalculatorPage } from './CalculatorPage';

const result = () => document.querySelector('#result output')!.textContent;
const field = (key: InputKey) => document.querySelector(`[data-input-key="${key}"]`)!;
const selected = (name: string, option: string | RegExp) => within(screen.getByRole('radiogroup', { name })).getByRole('radio', { name: option });

function completeOrb(): Workspace {
  const ws = defaultWorkspace();
  ws.enemy = { ...ws.enemy, attribute: 'fire', def: 5000 };
  const hit = ws.hits[0]!;
  hit.attacker.battleAtk = 10000;
  hit.attack = { ...hit.attack, kind: 'soul', power: 100 };
  for (const requirement of getRequirements(hit, ws.enemy)) {
    const owner = requirement.key.startsWith('enemy.') ? ws.enemy : hit;
    owner.confirmed = { ...owner.confirmed, [requirement.key]: true };
  }
  return ws;
}

const show = (initial?: Workspace) =>
  render(
    <WorkspaceProvider initial={initial}>
      <CalculatorPage />
    </WorkspaceProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('required-input guidance', () => {
  it('starts the Ultimate addition at 40%, previews the factor and recalculates after a change', async () => {
    const ws = completeOrb(),
      hit = ws.hits[0]!;
    hit.attacker = { ...hit.attacker, attribute: 'dark', plus: true };
    ws.enemy.attribute = 'light';
    hit.attack = { ...hit.attack, kind: 'soulOfCombos', power: 100, variant: 'ultimate' };
    for (const item of getRequirements(hit, ws.enemy)) {
      const owner = item.key.startsWith('enemy.') ? ws.enemy : hit;
      owner.confirmed = { ...owner.confirmed, [item.key]: true };
    }
    const user = userEvent.setup();
    show(ws);
    const bonus = screen.getByLabelText('Ultimate bonus vs. weak attributes');
    expect(bonus).toHaveValue(40);
    expect(screen.getByText('= 1.5 + 0.1 (Dark+) + 0.4 (Ultimate) = ×2')).toBeInTheDocument();
    expect(result()).toBe('6,000');
    await user.clear(bonus);
    expect(result()).toBe('—');
    expect(bonus).toHaveValue(null);
    await user.type(bonus, '60');
    expect(screen.getByText('= 1.5 + 0.1 (Dark+) + 0.6 (Ultimate) = ×2.2')).toBeInTheDocument();
    expect(result()).toBe('6,600');
  });

  it('shows the enhanced normal-soul advantage as 1.6 without an Ultimate input', () => {
    const ws = completeOrb(),
      hit = ws.hits[0]!;
    hit.attacker = { ...hit.attacker, attribute: 'dark', plus: true };
    ws.enemy.attribute = 'light';
    show(ws);
    expect(screen.getByLabelText('Base attribute matchup')).toBeInTheDocument();
    expect(screen.getByText('= 1.5 + 0.1 (Dark+) = ×1.6')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ultimate bonus vs. weak attributes')).not.toBeInTheDocument();
    expect(result()).toBe('4,800');
  });

  it('asks for a valid secret percentage instead of offering a dead-end Confirm button at zero', async () => {
    const ws = completeOrb(),
      hit = ws.hits[0]!;
    hit.attack = { ...hit.attack, kind: 'soulOfCombos', power: 0 };
    hit.confirmed = { ...hit.confirmed, 'attack.variant': true };
    const user = userEvent.setup();
    show(ws);
    expect(screen.queryByRole('button', { name: 'Confirm Damage % on the soul' })).not.toBeInTheDocument();
    expect(field('attack.power')).toHaveTextContent('above 0%');
    expect(result()).toBe('—');
    await user.type(screen.getByLabelText('Damage % on the soul'), '600');
    expect(result()).toBe('18,000');
    expect(field('attack.power')).not.toHaveAttribute('data-required', 'true');
  });

  it('confirms a valid saved secret percentage without requiring it to be retyped', async () => {
    const ws = completeOrb(),
      hit = ws.hits[0]!;
    hit.attack = { ...hit.attack, kind: 'soulOfCombos', power: 600 };
    hit.confirmed = { ...hit.confirmed, 'attack.variant': true };
    const user = userEvent.setup();
    show(ws);
    expect(result()).toBe('—');
    await user.click(screen.getByRole('button', { name: 'Confirm Damage % on the soul' }));
    expect(result()).toBe('18,000');
    expect(screen.queryByRole('button', { name: 'Confirm Damage % on the soul' })).not.toBeInTheDocument();
  });

  it('starts enabled, highlights unanswered choices, and accepts the already selected option', async () => {
    const user = userEvent.setup();
    show();
    expect(screen.getByRole('switch', { name: 'Highlight required inputs' })).toBeChecked();
    expect(field('attack.kind')).toHaveAttribute('data-required', 'true');
    expect(selected('Hit type', /Soul of Combos/)).toBeChecked();
    await user.click(selected('Hit type', /Soul of Combos/));
    expect(field('attack.kind')).not.toHaveAttribute('data-required', 'true');
    expect(result()).toBe('—');
    expect(screen.getAllByText(/required inputs? remaining/i).length).toBeGreaterThan(0);
  });

  it('hides guidance when disabled while keeping an incomplete calculation unavailable', async () => {
    const user = userEvent.setup();
    show();
    expect(document.querySelectorAll('[data-required="true"]').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('switch', { name: 'Highlight required inputs' }));
    expect(document.querySelectorAll('[data-required="true"]')).toHaveLength(0);
    expect(result()).toBe('—');
    expect(screen.queryByText('Check a real hit')).not.toBeInTheDocument();
  });

  it('distinguishes a cleared numeric value from an explicitly confirmed zero resistance', async () => {
    const ws = completeOrb();
    delete ws.enemy.confirmed!['enemy.magicRes'];
    const user = userEvent.setup();
    show(ws);
    expect(field('enemy.magicRes')).toHaveAttribute('data-required', 'true');
    expect(result()).toBe('—');
    await user.click(screen.getByLabelText('Magic resistance'));
    await user.click(selected('Critical', 'Off'));
    expect(field('enemy.magicRes')).toHaveAttribute('data-required', 'true');
    expect(result()).toBe('—');
    await user.clear(screen.getByLabelText('Magic resistance'));
    await user.click(screen.getByRole('button', { name: 'Confirm Magic resistance' }));
    expect(screen.getByLabelText('Magic resistance')).toHaveValue(0);
    expect(result()).toBe('3,000');
    await user.clear(screen.getByLabelText('Battle ATK'));
    expect(field('attacker.battleAtk')).toHaveAttribute('data-required', 'true');
    expect(result()).toBe('—');
    await user.type(screen.getByLabelText('Battle ATK'), '10000');
    expect(result()).toBe('3,000');
  });

  it('calculates a fresh ordinary hit only after its required values and choices are confirmed', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByLabelText('Attribute'));
    await user.selectOptions(screen.getByLabelText('Enemy attribute'), 'fire');
    await user.click(selected('Attack type', 'Magic'));
    await user.click(selected('How do you enter ATK?', /Battle ATK/));
    await user.click(selected('Hit type', /Normal soul/));
    await user.click(selected('Target', 'Single'));
    await user.click(selected('Soul Combos', /100%/));
    await user.click(selected('Weakness result', 'None'));
    for (const name of ['Critical', 'Pierce', 'Synergy', 'Aegis']) await user.click(selected(name, 'Off'));
    await user.click(selected('Enemy guard', 'No Guard'));
    await user.type(screen.getByLabelText('Battle ATK'), '10000');
    await user.type(screen.getByLabelText('Enemy DEF'), '5000');
    expect(result()).toBe('—');
    expect(field('enemy.magicRes')).toHaveAttribute('data-required', 'true');
    await user.click(screen.getByRole('button', { name: 'Confirm Magic resistance' }));
    expect(result()).toBe('3,000');
    expect(document.querySelectorAll('[data-required="true"]')).toHaveLength(0);
  });

  it('requires support ATK for Synergy and own DEF for Aegis, then releases the inactive requirement', async () => {
    const user = userEvent.setup();
    show(completeOrb());
    expect(result()).toBe('3,000');
    expect(screen.queryByLabelText('Support character ATK')).not.toBeInTheDocument();
    await user.click(selected('Synergy', 'On'));
    expect(field('attacker.supportAtk')).toHaveAttribute('data-required', 'true');
    expect(result()).toBe('—');
    await user.type(screen.getByLabelText('Support character ATK'), '5000');
    expect(result()).toBe('3,800');
    await user.click(selected('Aegis', 'On'));
    expect(field('attacker.ownDef')).toHaveAttribute('data-required', 'true');
    expect(result()).toBe('—');
    await user.type(screen.getByLabelText('Your DEF'), '5000');
    expect(result()).toBe('4,600');
    await user.click(selected('Aegis', 'Off'));
    expect(screen.queryByLabelText('Your DEF')).not.toBeInTheDocument();
    expect(result()).toBe('3,800');
    await user.click(selected('Aegis', 'On'));
    expect(field('attacker.ownDef')).not.toHaveAttribute('data-required', 'true');
    expect(result()).toBe('4,600');
  });

  it('uses the normal-soul baseline after leaving a secret and offers the supported Critical modes', async () => {
    const ws = completeOrb();
    const hit = ws.hits[0]!;
    hit.attack = { ...hit.attack, kind: 'soulOfCombos', power: 600 };
    for (const requirement of getRequirements(hit, ws.enemy)) {
      const owner = requirement.key.startsWith('enemy.') ? ws.enemy : hit;
      owner.confirmed = { ...owner.confirmed, [requirement.key]: true };
    }
    const user = userEvent.setup();
    show(ws);
    expect(result()).toBe('18,000');
    expect(screen.getByLabelText('Damage % on the soul')).toHaveValue(600);
    await user.click(selected('Hit type', /Normal soul/));
    expect(screen.queryByLabelText('Damage % on the soul')).not.toBeInTheDocument();
    expect(screen.getByText(/Ordinary soul base power:/)).toHaveTextContent('100%');
    await user.click(selected('Soul Combos', /100%/));
    // Changing the kind requires reconfirming its popup; choose the retained None.
    await user.click(selected('Weakness result', 'None'));
    expect(result()).toBe('3,000');
    expect(within(screen.getByRole('radiogroup', { name: 'Critical' })).getByRole('radio', { name: 'Super' })).toBeInTheDocument();
  });

  it('uses verified Super Critical constants automatically without adding required inputs', async () => {
    const user = userEvent.setup();
    show(completeOrb());
    await user.click(selected('Critical', 'Super'));
    expect(result()).toBe('4,500');
    expect(screen.queryByLabelText('Super Critical base multiplier')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Super Critical positive-bonus multiplier')).not.toBeInTheDocument();
    expect(screen.getByText(/Super Critical uses a 1.5 base factor/)).toBeInTheDocument();
    await user.click(selected('Critical', 'On'));
    expect(result()).toBe('3,900');
    expect(screen.queryByLabelText('Super Critical base multiplier')).not.toBeInTheDocument();
  });

  it('requests only the active TAU popup factor', async () => {
    const ws = completeOrb();
    ws.hits[0]!.attacker.plus = true;
    ws.hits[0]!.attack.popup = 'superWeak';
    const user = userEvent.setup();
    show(ws);
    await user.click(screen.getByRole('switch', { name: /True Attribute Unbound active/ }));
    expect(screen.queryByLabelText('Weak Point damage ×')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Super Weak Point damage ×')).toBeInTheDocument();
    expect(field('attacker.tau.superWeak')).toHaveAttribute('data-required', 'true');
    expect(result()).toBe('—');
    await user.clear(screen.getByLabelText('Super Weak Point damage ×'));
    await user.type(screen.getByLabelText('Super Weak Point damage ×'), '1.3');
    expect(result()).toBe('3,900');
  });

  it('remembers confirmed selections when the saved workspace is reopened', async () => {
    const user = userEvent.setup();
    const view = show();
    await user.click(selected('Hit type', /Soul of Combos/));
    expect(field('attack.kind')).not.toHaveAttribute('data-required', 'true');
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.workspace) ?? '{}');
      expect(saved.hits?.[0]?.confirmed?.['attack.kind']).toBe(true);
    });
    view.unmount();
    show();
    expect(field('attack.kind')).not.toHaveAttribute('data-required', 'true');
    expect(result()).toBe('—');
  });
});
