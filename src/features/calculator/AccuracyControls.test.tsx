// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { blankHit, defaultWorkspace } from '../../domain/defaults';
import { normalizeWorkspace } from '../../domain/normalize';
import { getRequirements } from '../../domain/requirements';
import type { Workspace } from '../../domain/types';
import { WorkspaceProvider } from '../../state/WorkspaceProvider';
import { CalculatorPage } from './CalculatorPage';

const example = (): Workspace => {
  const ws = defaultWorkspace();
  ws.enemy.attribute = 'fire';
  ws.enemy.def = 5000;
  ws.hits[0]!.attacker.battleAtk = 10000;
  ws.hits[0]!.attack = { ...ws.hits[0]!.attack, kind: 'soul', power: 100 };
  return confirmRequirements(ws);
};
function confirmRequirements(ws: Workspace): Workspace {
  for (const hit of ws.hits) {
    for (const requirement of getRequirements(hit, ws.enemy)) {
      const owner = requirement.key.startsWith('enemy.') ? ws.enemy : hit;
      owner.confirmed = { ...owner.confirmed, [requirement.key]: true };
    }
  }
  return ws;
}
const show = (initial: Workspace) =>
  render(
    <WorkspaceProvider initial={initial}>
      <CalculatorPage />
    </WorkspaceProvider>,
  );
const damage = () => document.querySelector('#result output')!.textContent;
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('accuracy inputs', () => {
  it('keeps simultaneous Super Pierce power UP and DOWN separate', async () => {
    const user = userEvent.setup();
    show(example());
    await user.click(within(screen.getByRole('radiogroup', { name: 'Pierce' })).getByRole('radio', { name: 'Super' }));
    const power = screen.getByRole('group', { name: 'Pierce power UP' });
    const first = within(power).getByRole('spinbutton', { name: 'Pierce power UP source 1' });
    await user.clear(first);
    await user.type(first, '100');
    await user.click(within(power).getByRole('button', { name: 'Add Pierce power UP source' }));
    await user.type(within(power).getByRole('spinbutton', { name: 'Pierce power UP source 2' }), '-50');
    expect(damage()).toBe('22,100');
  });

  it('estimates the ATK from the troop ATK and one Increased ATK % field', async () => {
    const ws = defaultWorkspace();
    ws.enemy.attribute = 'fire';
    ws.hits[0]!.attacker.atkMode = 'build';
    ws.hits[0]!.attacker.troopAtk = 1001;
    ws.hits[0]!.attack = { ...ws.hits[0]!.attack, kind: 'soul', power: 100 };
    const user = userEvent.setup();
    show(confirmRequirements(ws));
    expect(screen.queryByRole('button', { name: /Add .* source/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Support character ATK')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Increased ATK %'), '20');
    expect(damage()).toBe('481'); // 1,001 + 201 = 1,202 ATK
    expect(screen.getByText('Troop 1,001')).toBeInTheDocument();
  });

  it('uses an explicit combo multiplier and optional qualifying buddies', async () => {
    const ws = example();
    ws.hits[0]!.attack.kind = 'soul';
    const user = userEvent.setup();
    show(ws);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Soul Combos' })).getByRole('radio', { name: /150%/ }));
    await user.type(screen.getByLabelText('Combo attacker 1 ATK'), '5000');
    await user.type(screen.getByLabelText('Combo attacker 2 ATK'), '5000');
    expect(damage()).toBe('4,620');
    expect(screen.queryByText('Orb position (optional)')).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Orb in the chain' })).not.toBeInTheDocument();
  });

  it('restores signed entries even when their net is zero', () => {
    const ws = example();
    ws.hits[0]!.attack.pierce = 'super';
    ws.hits[0]!.effectEntries = { piercePower: [100, -100] };
    const restored = normalizeWorkspace(JSON.parse(JSON.stringify(ws)));
    expect(restored.hits[0]!.effectEntries?.piercePower).toEqual([100, -100]);
    show(restored);
    expect(damage()).toBe('15,600');
  });

  it('shows an input error for an undefined inverse-Q calculation', () => {
    const ws = example();
    ws.hits[0]!.attack.popup = 'weak';
    ws.hits[0]!.effects.vsAttribute = -100;
    show(ws);
    expect(screen.getByRole('alert')).toHaveTextContent('Check the inputs');
    expect(screen.getByRole('alert')).toHaveTextContent('above zero');
  });

  it('excludes an unfilled hit from the damage total', () => {
    const ws = example();
    ws.hits.push(blankHit());
    show(ws);
    expect(damage()).toBe('3,000');
    expect(screen.queryByText('Total of 2 hits')).not.toBeInTheDocument();
    expect(screen.getByText(/Complete the remaining 1 hit to calculate a total/)).toBeInTheDocument();
  });
});
