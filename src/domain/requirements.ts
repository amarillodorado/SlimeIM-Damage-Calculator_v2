import { resolveMatchup } from './attributes';
import type { Enemy, Hit, InputKey } from './types';

export interface Requirement {
  key: InputKey;
  label: string;
  kind: 'choice' | 'number';
  /** A value/eligibility problem, rather than just an unconfirmed default. */
  message?: string;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value: unknown) => finite(value) && value >= 0;

/** One contract drives field highlights, result readiness and comparisons. */
export function getRequirements(hit: Hit, enemy: Enemy): Requirement[] {
  const { attacker: a, attack: k } = hit;
  const rows: Requirement[] = [];
  const add = (key: InputKey, label: string, kind: Requirement['kind'] = 'choice', message?: string) => {
    const previous = rows.find((row) => row.key === key);
    if (previous) {
      if (message) previous.message = message;
    } else rows.push({ key, label, kind, ...(message ? { message } : {}) });
  };
  const number = (key: InputKey, label: string, valid: boolean, invalidMessage?: string) =>
    add(key, label, 'number', valid ? undefined : (invalidMessage ?? `Enter a valid ${label.toLowerCase()}.`));

  add('attacker.attribute', 'Attacker attribute');
  add('attacker.attackType', 'Attack type');
  add('attacker.atkMode', 'ATK input mode');
  if (a.atkMode === 'battle') number('attacker.battleAtk', 'Battle ATK', nonnegative(a.battleAtk));
  else {
    number('attacker.characterAtk', 'Character ATK', nonnegative(a.characterAtk));
    add('attacker.addSupportAtk', 'Add support ATK');
  }
  if (k.synergy !== 'off' || (a.atkMode === 'build' && a.addSupportAtk)) number('attacker.supportAtk', 'Support character ATK', nonnegative(a.supportAtk));
  if (k.aegis !== 'off') number('attacker.ownDef', 'Your DEF', nonnegative(a.ownDef));

  add('attack.kind', 'Hit type');
  add('attack.target', 'Target');
  if (k.kind === 'soulOfCombos') {
    add('attack.variant', 'Soul of Combos version');
    number(
      'attack.power',
      'Damage % on the card',
      finite(k.power) && k.power > 0,
      'Enter a valid secret-skill damage percentage above 0%, such as 600%. A valid entry is confirmed automatically.',
    );
    if (k.variant === 'ultimate' && resolveMatchup(k.matchup, a.attribute, enemy.attribute) === 'advantage')
      number(
        'attack.ultimateBonus',
        'Ultimate bonus vs. weak attributes',
        finite(k.ultimateBonus),
        'Enter the resolved Ultimate affinity addition for this character. 40% means +0.4; it is not a universal default.',
      );
  } else {
    const combo = k.comboMultiplier ?? 1;
    add('attack.comboMultiplier', 'Combo finisher', 'choice', [1, 1.1, 1.5, 2].includes(combo) ? undefined : 'Choose a supported combo finisher.');
    if (k.normalPowerOverride) number('attack.power', 'Normal orb power override', finite(k.power) && k.power > 0);
    else if (k.power !== 100) add('attack.power', 'Normal orb power', 'number', 'Normal orbs use 100% unless an explicit power override is enabled.');
    if (combo === 1.5 || combo === 2) {
      number('attacker.comboBuddyAtk1', 'Combo attacker 1 ATK', nonnegative(a.comboBuddyAtk1));
      number('attacker.comboBuddyAtk2', 'Combo attacker 2 ATK', nonnegative(a.comboBuddyAtk2));
    }
  }
  add('attack.popup', 'Popup on the hit');
  add('attack.crit', 'Critical');
  add('attack.pierce', 'Pierce');
  add('attack.synergy', 'Synergy');
  add('attack.aegis', 'Aegis');
  if (a.tau.active) {
    if (!a.plus) add('attacker.attribute', 'Attacker attribute', 'choice', 'True Attribute Unbound requires a “+” attribute, or turn it off.');
    if (k.popup === 'none') add('attack.popup', 'Popup on the hit', 'choice', 'Select the Weak Point popup for True Attribute Unbound, or turn it off.');
    else if (a.plus) {
      const superWeak = k.popup === 'superWeak';
      const factor = superWeak ? a.tau.superWeak : a.tau.weak;
      number(
        superWeak ? 'attacker.tau.superWeak' : 'attacker.tau.weak',
        superWeak ? 'Super Weak Point damage factor' : 'Weak Point damage factor',
        finite(factor) && factor > 0 && factor <= 10,
      );
    }
  }
  add('enemy.attribute', 'Enemy attribute');
  number('enemy.def', 'Enemy DEF', nonnegative(enemy.def));
  if (a.attackType === 'magic') number('enemy.magicRes', 'Magic resistance', finite(enemy.magicRes));
  else number('enemy.physRes', 'Physical resistance', finite(enemy.physRes));
  add('enemy.guard', 'Enemy guard');
  return rows;
}

export function getMissingRequirements(hit: Hit, enemy: Enemy): Requirement[] {
  return getRequirements(hit, enemy).filter((row) => {
    const confirmed = row.key.startsWith('enemy.') ? enemy.confirmed : hit.confirmed;
    return confirmed?.[row.key] !== true || row.message !== undefined;
  });
}

export const isHitComplete = (hit: Hit, enemy: Enemy) => getMissingRequirements(hit, enemy).length === 0;
