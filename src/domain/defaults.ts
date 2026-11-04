import type { Attack, Attacker, Enemy, Hit, Workspace } from './types';

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const blankAttacker = (): Attacker => ({
  name: '',
  attribute: 'fire',
  plus: false,
  attackType: 'magic',
  atkMode: 'battle',
  battleAtk: 0,
  troopAtk: 0,
  supportAtk: 0,
  ownDef: 0,
  comboBuddyAtk1: 0,
  comboBuddyAtk2: 0,
  tau: { active: false, weak: 1, superWeak: 1 },
});

export const blankAttack = (): Attack => ({
  kind: 'soulOfCombos',
  power: 0,
  normalPowerOverride: false,
  variant: 'normal',
  // Confirmed for the tested Epic Milim override; other characters can differ.
  ultimateBonus: 40,
  target: 'single',
  comboMultiplier: 1,
  matchup: 'auto',
  popup: 'none',
  crit: false,
  superCrit: false,
  pierce: 'off',
  synergy: 'off',
  aegis: 'off',
});

export const blankEnemy = (): Enemy => ({
  confirmed: {},
  name: '',
  attribute: 'wind',
  def: 0,
  physRes: 0,
  magicRes: 0,
  stunned: false,
  enamored: false,
  guard: 'none',
});

export const blankHit = (): Hit => ({ id: newId(), attacker: blankAttacker(), attack: blankAttack(), effects: {}, confirmed: {}, observed: 0 });

export function defaultWorkspace(): Workspace {
  const hit = blankHit();
  return { version: 6, highlightRequired: true, enemy: blankEnemy(), hits: [hit], activeHitId: hit.id };
}
