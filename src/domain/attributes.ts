import type { Attribute, Matchup, MatchupChoice } from './types';

export const ATTRIBUTE_LABEL: Record<Attribute, string> = {
  fire: 'Fire',
  water: 'Water',
  wind: 'Wind',
  earth: 'Earth',
  space: 'Space',
  light: 'Light',
  dark: 'Dark',
};

/**
 * Each basic attribute is strong against the next one:
 * Fire → Earth → Space → Wind → Water → Fire (DAMAGE_FORMULA.md §4).
 * Light and Dark are strong against each other.
 * Run 2 (Space+ vs Wind behaving like an advantage) is consistent with this direction.
 */
const STRONG_AGAINST: Record<Attribute, Attribute[]> = {
  fire: ['earth'],
  earth: ['space'],
  space: ['wind'],
  wind: ['water'],
  water: ['fire'],
  light: ['dark'],
  dark: ['light'],
};

export function chartMatchup(attacker: Attribute, enemy: Attribute): Matchup {
  if (STRONG_AGAINST[attacker].includes(enemy)) return 'advantage';
  // Light/Dark have no resistance counterpart; basic attributes resist the reverse direction.
  if (attacker !== 'light' && attacker !== 'dark' && STRONG_AGAINST[enemy].includes(attacker)) return 'disadvantage';
  return 'neutral';
}

export function resolveMatchup(choice: MatchupChoice, attacker: Attribute, enemy: Attribute): Matchup {
  return choice === 'auto' ? chartMatchup(attacker, enemy) : choice;
}

export const MATCHUP_LABEL: Record<Matchup, string> = {
  advantage: 'Advantage',
  neutral: 'Neutral',
  disadvantage: 'Disadvantage',
};

export const CHART_TEXT = 'Fire → Earth → Space → Wind → Water → Fire (each beats the next) · Light ⇄ Dark';
