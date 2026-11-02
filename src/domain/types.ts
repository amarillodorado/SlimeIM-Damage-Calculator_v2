/**
 * Domain model of one damage calculation.
 *
 * A workspace holds one enemy and one or more hits. Every hit has its own
 * attacker, attack settings and buff values, so an orb chain with several
 * characters can be added up against the same enemy.
 */

export const ATTRIBUTES = ['fire', 'water', 'wind', 'earth', 'space', 'light', 'dark'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export type AttackType = 'physical' | 'magic';
export type TargetType = 'single' | 'all';

/** soulOfCombos = the secret skill orb; soul = a normal orb (every other orb). */
export type HitKind = 'soulOfCombos' | 'soul';
export type SoulVariant = 'normal' | 'ex' | 'ultimate';

/** From the attribute chart. `auto` derives it from attacker and enemy attribute. */
export type MatchupChoice = 'auto' | 'advantage' | 'neutral' | 'disadvantage';
export type Matchup = Exclude<MatchupChoice, 'auto'>;

/** The popup the game showed on the hit. Only selects True Attribute Unbound and weak-point bonuses. */
export type Popup = 'none' | 'weak' | 'superWeak';

export type Proc = 'off' | 'normal' | 'super';
export type Guard = 'none' | 'guard' | 'superGuard';

/** battle = ATK read from the battle screen; build = pre-battle ATK + ATK effects. */
export type AtkMode = 'battle' | 'build';
export type ComboPosition = 1 | 2 | 3 | 4 | 5 | 6;

/** Explicit acknowledgements are separate from default numeric/choice values. */
export const INPUT_KEYS = [
  'attacker.attribute',
  'attacker.attackType',
  'attacker.atkMode',
  'attacker.battleAtk',
  'attacker.characterAtk',
  'attacker.addSupportAtk',
  'attacker.supportAtk',
  'attacker.ownDef',
  'attacker.tau.weak',
  'attacker.tau.superWeak',
  'attacker.comboBuddyAtk1',
  'attacker.comboBuddyAtk2',
  'attack.kind',
  'attack.power',
  'attack.variant',
  'attack.target',
  'attack.popup',
  'attack.crit',
  'attack.pierce',
  'attack.synergy',
  'attack.aegis',
  'attack.comboMultiplier',
  'attack.ultimateBonus',
  'enemy.attribute',
  'enemy.def',
  'enemy.physRes',
  'enemy.magicRes',
  'enemy.guard',
] as const;
export type InputKey = (typeof INPUT_KEYS)[number];
export type InputConfirmations = Partial<Record<InputKey, boolean>>;

export interface TrueAttributeUnbound {
  active: boolean;
  weak: number;
  superWeak: number;
}

export interface Attacker {
  name: string;
  attribute: Attribute;
  /** "+" attribute such as Dark+ or Space+. */
  plus: boolean;
  attackType: AttackType;
  atkMode: AtkMode;
  battleAtk: number;
  characterAtk: number;
  /** Support character's ATK from its own character page (Synergy partner). */
  supportAtk: number;
  /** Pre-battle mode: add the support character's ATK to the character ATK. */
  addSupportAtk: boolean;
  /** Own DEF, only used by Aegis. */
  ownDef: number;
  /** Optional ATKs of the two other qualifying combo attackers; not attached supports. */
  comboBuddyAtk1?: number;
  comboBuddyAtk2?: number;
  tau: TrueAttributeUnbound;
}

export interface Attack {
  kind: HitKind;
  /** Damage % shown on the card that was used (EX/Ultimate cards already show the boosted %, e.g. 1080). */
  power: number;
  /** Ordinary orb baseline is 100%; an explicitly enabled override may replace it. */
  normalPowerOverride?: boolean;
  variant: SoulVariant;
  /**
   * Ultimate Soul of Combos “greatly increases damage to weak attributes”: added to the
   * attribute multiplier on a natural advantage. The supplied global fallback is
   * 140%; a positive character-specific resolved input can replace it.
   */
  ultimateBonus: number | null;
  target: TargetType;
  /** Position in the orb chain; only normal orbs get the chain bonus. */
  comboPosition: ComboPosition;
  /** Native finisher factor (1, 1.1, 1.5, 2); the displayed chain BONUS is not this value. */
  comboMultiplier?: number;
  matchup: MatchupChoice;
  popup: Popup;
  crit: boolean;
  pierce: Proc;
  synergy: Proc;
  aegis: Proc;
}

export interface Enemy {
  confirmed?: InputConfirmations;
  name: string;
  attribute: Attribute;
  def: number;
  /** Attack resistances exactly as shown on the enemy info panel (e.g. -20). */
  physRes: number;
  magicRes: number;
  stunned: boolean;
  enamored: boolean;
  guard: Guard;
}

/** For attribute-bound team effects ("damage done to wind enemies", "dark ATK"). */
export type AttributeFilter = Attribute | 'any';

/**
 * Buffs and debuffs of one hit: the total per effect type, in % (flat ATK in points).
 * Missing types are 0. Attribute-bound types mean the attribute of this hit
 * ("damage vs. attribute enemies" = vs. the current enemy's attribute).
 */
export type EffectValues = Partial<Record<EffectTypeId, number>>;
/** Separate sources preserve per-entry stat rounding and signed Super-hit contributions. */
export type EffectEntries = Partial<Record<EffectTypeId, number[]>>;

export interface Hit {
  confirmed?: InputConfirmations;
  id: string;
  attacker: Attacker;
  attack: Attack;
  effects: EffectValues;
  effectEntries?: EffectEntries;
  /** Damage the game showed, for "check a real hit". 0 = not entered. */
  observed: number;
}

export interface Workspace {
  /** Visual guidance preference; completeness rules always remain active. */
  highlightRequired?: boolean;
  version: 6;
  enemy: Enemy;
  hits: Hit[];
  activeHitId: string;
}

export const EFFECT_TYPE_IDS = [
  'atkPct',
  'atkFlat',
  'typeAtk',
  'elementAtk',
  'targetAtk',
  'defDown',
  'typeResDown',
  'elementResDown',
  'targetResDown',
  'vsAttribute',
  'typeDmg',
  'elementDmg',
  'targetDmg',
  'soulDmg',
  'ultimateSoulDmg',
  'soulsDmg',
  'stunStrike',
  'enamorStrike',
  'typeDmgResDown',
  'elementDmgResDown',
  'targetDmgResDown',
  'soulDmgResDown',
  'weakDmg',
  'superWeakDmg',
  'comboDmg',
  'dragonEye',
  'partyDmg',
  'critDmg',
  'critResDown',
  'piercePower',
  'pierceResDown',
  'synergyPower',
  'synergyResDown',
  'aegisPower',
  'aegisResDown',
  'guardPen',
  'rate',
  'counterPower',
  'ownDefense',
  'enemyStatus',
] as const;
export type EffectTypeId = (typeof EFFECT_TYPE_IDS)[number];
