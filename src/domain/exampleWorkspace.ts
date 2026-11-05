import { defaultWorkspace } from './defaults';
import { getRequirements } from './requirements';
import type { Workspace } from './types';

/** Fictional, fully specified tutorial input. First visits and Load example use the same source data. */
export function exampleWorkspace(): Workspace {
  const workspace = defaultWorkspace();
  workspace.enemy = { ...workspace.enemy, name: 'Example enemy', attribute: 'fire', def: 5000 };
  const hit = workspace.hits[0]!;
  hit.attacker = { ...hit.attacker, name: 'Example - Super Critical', attackType: 'physical', battleAtk: 10000 };
  hit.attack = { ...hit.attack, kind: 'soul', power: 100, crit: true, superCrit: true };
  hit.effects = { critDmg: 50 };
  hit.effectEntries = { critDmg: [100, -50], critResDown: [0] };
  for (const requirement of getRequirements(hit, workspace.enemy)) {
    const owner = requirement.key.startsWith('enemy.') ? workspace.enemy : hit;
    owner.confirmed = { ...owner.confirmed, [requirement.key]: true };
  }
  return workspace;
}
