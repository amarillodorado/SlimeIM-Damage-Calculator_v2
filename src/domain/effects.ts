import { ATTRIBUTE_LABEL } from './attributes';
import type { AttackType, Attribute, EffectTypeId, TargetType } from './types';

/**
 * Catalogue of every effect type. It is the single source for the engine
 * (which group a value belongs to), the calculator's fields and the Guide.
 * Same type values add up; different types multiply (DAMAGE_FORMULA.md §1).
 */

/** verified = compatible with a recorded setup, not proof of every branch; client = recovered code/data; assumed = unconfirmed interpretation. */
export type Confidence = 'verified' | 'client' | 'assumed' | 'none';

/** Also where the field sits in the calculator (see CATEGORY_PLACE). */
export type EffectCategory = 'damage' | 'attackPower' | 'enemy' | 'late' | 'special' | 'hit' | 'stat' | 'noEffect';

export interface EffectType {
  id: EffectTypeId;
  category: EffectCategory;
  label: string;
  /** How the game words it (battle effect list, skill or equipment text). */
  examples: string[];
  where: string;
  /** What it does to the damage, in plain words. */
  effect: string;
  /** Effect only counts for one attribute: of the attacker or of the enemy. */
  attribute?: 'attacker' | 'enemy';
  confidence: Confidence;
  /** Rare: the calculator hides the field until “All types” is opened, unless it has a value. */
  advanced?: boolean;
}

export const CATEGORY_LABEL: Record<EffectCategory, string> = {
  damage: 'Damage UP',
  attackPower: 'Attack power (before DEF)',
  enemy: 'Enemy defense',
  late: 'Late bonus (added together)',
  special: 'Critical, Pierce, Synergy, Aegis',
  hit: 'Weak points and soul chain',
  stat: 'ATK stat (pre-battle mode only)',
  noEffect: "Doesn't change your damage",
};

/** Where the fields of each category are in the calculator. */
export const CATEGORY_PLACE: Record<EffectCategory, string> = {
  damage: 'Step 4 · Buffs & debuffs → Damage UP',
  attackPower: 'Step 4 · Buffs & debuffs → Attack power',
  enemy: 'Step 4 · Buffs & debuffs → Enemy defense',
  late: 'Step 4 · Buffs & debuffs → Late bonus (under “All types”)',
  special: 'Step 2 · Attack → right under Critical, Pierce, Synergy or Aegis',
  hit: 'Step 2 · Attack → under the special hit, popup or Soul Combos',
  stat: 'Step 1 · Attacker → Pre-battle ATK',
  noEffect: 'Nowhere — skip it',
};

export const CATEGORY_ORDER: EffectCategory[] = ['damage', 'attackPower', 'enemy', 'late', 'special', 'hit', 'stat', 'noEffect'];

/** Groups of the “Buffs & debuffs” card, in order. */
export const BUFF_CATEGORIES: EffectCategory[] = ['damage', 'attackPower', 'enemy', 'late'];

export const EFFECT_TYPES: EffectType[] = [
  // ---------- Damage UP (after DEF) ----------
  {
    id: 'vsAttribute',
    category: 'damage',
    label: 'Damage vs. attribute enemies',
    examples: [
      'Increased Damage done to wind attribute enemies by 106% (Forever)',
      'Divine Protection: increases damage done by … to wind attribute enemies by 106%',
    ],
    where: 'Battle effect list, Divine Protection, protector skills',
    effect: 'Multiplies the damage against enemies of that attribute: +106% → ×2.06.',
    attribute: 'enemy',
    confidence: 'verified',
  },
  {
    id: 'soulDmg',
    category: 'damage',
    label: 'Soul of Combos damage UP',
    examples: ['Increases damage by 40% (Forever) — effect list of the Soul of Combos', 'Increases Soul of Combos damage until the end of battle by 10%'],
    where: 'Tap the Soul of Combos in the soul bar; battle skills (e.g. Omniscient Order)',
    effect: 'Only for Soul of Combos hits. All values add up, then multiply: +40% → ×1.4.',
    confidence: 'verified',
  },
  {
    id: 'soulsDmg',
    category: 'damage',
    label: 'Soul damage UP',
    examples: ["Increases Octagram Demon Lord Force character souls' damage by 15%"],
    where: 'Battle skills',
    effect: 'Counted for every soul of those characters and added to Soul of Combos damage UP. Assumption: it shares the Soul of Combos damage group.',
    confidence: 'assumed',
    advanced: true,
  },
  {
    id: 'ultimateSoulDmg',
    category: 'damage',
    label: 'Ultimate Soul of Combos damage UP',
    examples: ['Ultimate Soul of Combos damage UP'],
    where: 'Skills, traits',
    effect: 'Only for Ultimate Soul of Combos; added to Soul of Combos damage UP.',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'typeDmg',
    category: 'damage',
    label: 'Magic / Physical damage UP',
    examples: ['Magic damage UP', 'Physical damage UP'],
    where: 'Battle effect list, skills',
    effect: 'Damage UP for your attack type. Applied after DEF, so it is a separate multiplier from M-ATK / P-ATK.',
    confidence: 'client',
  },
  {
    id: 'elementDmg',
    category: 'damage',
    label: 'Attribute damage UP',
    examples: ['Dark damage UP'],
    where: 'Battle effect list, skills',
    effect: 'Damage UP for one attack attribute. Applied after DEF.',
    attribute: 'attacker',
    confidence: 'client',
  },
  {
    id: 'enhancedElementDmg',
    category: 'damage',
    label: '+ attribute damage UP',
    examples: ['Dark+ damage UP'],
    where: 'Battle effect list, skills',
    effect: 'Only for the matching “+” attack attribute. Applied after DEF as a separate multiplier from ordinary attribute damage UP.',
    attribute: 'attacker',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'targetDmg',
    category: 'damage',
    label: 'Single-target / AoE damage UP',
    examples: ['Single-target attack damage UP'],
    where: 'Battle effect list, skills',
    effect: 'Damage UP for single-target or for AoE attacks (pick the one that matches the hit).',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'stunStrike',
    category: 'damage',
    label: 'Stun Strike (vs. stunned)',
    examples: ['Increases damage against stunned enemies'],
    where: 'Skills, traits',
    effect: 'Only while the enemy is stunned. Added together with Enamor Strike, then multiplied.',
    confidence: 'client',
  },
  {
    id: 'enamorStrike',
    category: 'damage',
    label: 'Enamor Strike (vs. enamored)',
    examples: ['Increases damage against enamored enemies'],
    where: 'Skills, traits',
    effect: 'Only while the enemy is enamored. Added together with Stun Strike, then multiplied.',
    confidence: 'client',
  },
  {
    id: 'weakDmg',
    category: 'hit',
    label: 'Weakness Strike',
    examples: ['Weakness Strike', 'Increases weak point damage'],
    where: 'Skills, traits',
    effect:
      'Only on hits with a Weak Point / Super Weak Point popup. Added to the attribute multiplier (reduced by “damage vs. attribute enemies”, as in the game).',
    confidence: 'client',
  },
  {
    id: 'superWeakDmg',
    category: 'hit',
    label: 'Super Weakness Strike',
    examples: ['Increases super weak point damage'],
    where: 'Skills, traits',
    effect: 'Only on hits with a Super Weak Point popup. Added to the attribute multiplier.',
    confidence: 'client',
  },
  {
    id: 'comboDmg',
    category: 'hit',
    label: 'Combo damage UP',
    examples: ['Combo damage UP'],
    where: 'Skills, traits',
    effect: 'Adds to an eligible ordinary-soul finisher factor above 100%. It does not affect a 1–3-soul chain or a non-finisher. Enter it separately from the base 110%/150%/200% finisher factor.',
    confidence: 'client',
  },
  {
    id: 'dragonEye',
    category: 'late',
    label: "Dragon's Eye / Lord's Ambition (Ultimate)",
    examples: ["Dragon's Eye", "Lord's Ambition (Ultimate)"],
    where: 'Status effects of specific characters',
    effect: 'Late bonus, added (not multiplied) with party damage.',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'partyDmg',
    category: 'late',
    label: 'Party / skill-chain damage',
    examples: ['Party damage UP'],
    where: 'Event and party effects',
    effect: "Late bonus, added (not multiplied) with Dragon's Eye / Lord's Ambition (Ultimate).",
    confidence: 'client',
    advanced: true,
  },

  // ---------- Special hits ----------
  {
    id: 'synergyPower',
    category: 'special',
    label: 'Synergy power UP',
    examples: [
      'Increased Synergy Power by 40% (Forever)',
      'Synergy power +12% when equipped by magic type',
      'Increases synergy power by 12% (EX ability)',
      'Synergy Power 20% (detailed stats)',
    ],
    where: 'Battle effect list, equipment, EX abilities, detailed stats',
    effect: 'Only when Synergy triggers: × (1 + synergy power). +40% → ×1.4.',
    confidence: 'verified',
  },
  {
    id: 'piercePower',
    category: 'special',
    label: 'Pierce power UP',
    examples: ['Pierce power +12% (equipment)', 'Increases own pierce power by 15% (Soul Combo trait)', 'Pierce Power 12% (detailed stats)'],
    where: 'Equipment, traits, detailed stats',
    effect: 'Only when Pierce triggers: (damage + 6% ATK) × (1 + pierce power).',
    confidence: 'verified',
  },
  {
    id: 'critDmg',
    category: 'special',
    label: 'Critical power UP',
    examples: [
      'Increased Critical Power by 40% (Turns Remaining: 1)',
      'Critical power +12% when equipped by magic type',
      'Increases critical damage by 8% (EX ability)',
      'Critical Damage 24% (detailed stats)',
    ],
    where: 'Battle effect list, equipment, EX abilities, detailed stats (“Critical Damage”)',
    effect:
      'Only on ordinary Critical hits: × (1.3 + power / 100 + enemy resistance DOWN / 100). Add distinct applicable sources; do not count the same equipment or detailed-stat value twice.',
    confidence: 'client',
  },
  {
    id: 'critResDown',
    category: 'special',
    label: 'Enemy critical resistance DOWN',
    examples: ['Critical Resistance DOWN'],
    where: 'Enemy effect list',
    effect: 'Added to critical power. Negative if the enemy has critical resistance UP.',
    confidence: 'client',
  },
  {
    id: 'pierceResDown',
    category: 'special',
    label: 'Enemy pierce resistance DOWN',
    examples: ['Pierce Resistance DOWN'],
    where: 'Enemy effect list',
    effect: 'Added to pierce power. Negative if the enemy has pierce resistance UP.',
    confidence: 'client',
  },
  {
    id: 'synergyResDown',
    category: 'special',
    label: 'Enemy synergy resistance DOWN',
    examples: ['Synergy Resistance DOWN'],
    where: 'Enemy effect list',
    effect: 'Added to synergy power. Negative if the enemy has synergy resistance UP.',
    confidence: 'client',
  },
  {
    id: 'aegisPower',
    category: 'special',
    label: 'Aegis power UP',
    examples: ['Aegis Power 10% (detailed stats)'],
    where: 'Detailed stats, skills',
    effect: 'Only when Aegis (DEF critical) triggers: × (1 + aegis power).',
    confidence: 'client',
  },
  {
    id: 'aegisResDown',
    category: 'special',
    label: 'Enemy aegis resistance DOWN',
    examples: ['Aegis Resistance DOWN'],
    where: 'Enemy effect list',
    effect: 'Added to aegis power.',
    confidence: 'client',
  },

  // ---------- Attack power (before DEF) ----------
  {
    id: 'elementAtk',
    category: 'attackPower',
    label: 'Attribute ATK UP',
    examples: ['Increases dark ATK for all allies including rearguard by 120% (Turns: 1)', 'Increases space ATK … by 120%'],
    where: 'Battle skills, effect list',
    effect: 'Separate multiplier on your attack before DEF. Only for attacks of that attribute.',
    attribute: 'attacker',
    confidence: 'client',
  },
  {
    id: 'enhancedElementAtk',
    category: 'attackPower',
    label: '+ attribute ATK UP',
    examples: ['Dark+ ATK UP'],
    where: 'Battle skills, effect list',
    effect: 'Only for the matching “+” attack attribute. Multiplies the attack input before DEF, separately from ordinary attribute ATK UP.',
    attribute: 'attacker',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'typeAtk',
    category: 'attackPower',
    label: 'M-ATK / P-ATK UP',
    examples: ["Increases all allies' M-ATK by 8% at start of turn"],
    where: 'Traits, skills, effect list',
    effect: 'Magic or physical attack power. Separate multiplier before DEF (not part of the ATK stat).',
    confidence: 'client',
  },
  {
    id: 'targetAtk',
    category: 'attackPower',
    label: 'Single-target / AoE ATK UP',
    examples: ['Single-target ATK UP'],
    where: 'Skills, effect list',
    effect: 'Attack power for single-target or AoE attacks. Separate multiplier before DEF.',
    confidence: 'client',
    advanced: true,
  },

  // ---------- ATK stat ----------
  {
    id: 'atkPct',
    category: 'stat',
    label: 'Increased ATK %',
    examples: [
      'Increased ATK by 92% (Forever)',
      'Increased ATK by 6% (Trait)',
      "Divine Protection: increases magic characters' ATK and DEF by 25%",
      'Protection skill: increases ATK for all allies including rearguard until the end of battle by 14%',
    ],
    where: 'Battle effect list (one line, already added up); before the battle: Divine Protection, supporting protections, protection skills, traits',
    effect:
      'Raises the ATK stat. Enter every “Increased ATK by X%” the character has in battle, added up — the troop ATK contains none of them, not even the Divine Protection’s. E.g. 25% + 14% + 11% from the protections + 3 × 14% from the protection skill = 92%. The game adds them up and rounds the ATK up once. Equipment and EX abilities are already in the troop ATK. Already included in the Battle ATK, so it only counts in pre-battle mode.',
    confidence: 'verified',
  },

  // ---------- Enemy debuffs ----------
  {
    id: 'defDown',
    category: 'enemy',
    label: 'Enemy DEF DOWN',
    examples: ['DEF DOWN'],
    where: 'Your skills; enemy effect list',
    effect: 'Lowers the enemy DEF stat. Only add it if the DEF you entered was read before the debuff.',
    confidence: 'client',
  },
  {
    id: 'typeResDown',
    category: 'enemy',
    label: 'Enemy magic / physical resistance DOWN',
    examples: ['Magic Resistance DOWN'],
    where: 'Your skills; enemy effect list',
    effect: 'Subtracts the entered DOWN amount from attack resistance (only if that change is not already reflected in the enemy panel).',
    confidence: 'client',
  },
  {
    id: 'elementResDown',
    category: 'enemy',
    label: 'Enemy attribute resistance DOWN',
    examples: ['Dark Resistance DOWN'],
    where: 'Your skills; enemy effect list',
    effect: "Lowers the enemy's resistance to your attack attribute; multiplies its DEF.",
    attribute: 'attacker',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'enhancedElementResDown',
    category: 'enemy',
    label: 'Enemy + attribute resistance DOWN',
    examples: ['Dark+ Resistance DOWN'],
    where: 'Your skills; enemy effect list',
    effect: 'Only for the matching “+” attack attribute. Lowers the effective DEF term, separately from ordinary attribute resistance DOWN; do not add the two percentages together.',
    attribute: 'attacker',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'targetResDown',
    category: 'enemy',
    label: 'Enemy single-target / AoE resistance DOWN',
    examples: ['Single-target Resistance DOWN'],
    where: 'Your skills',
    effect: 'Multiplies the enemy DEF.',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'typeDmgResDown',
    category: 'enemy',
    label: 'Enemy magic / physical damage resistance DOWN',
    examples: ['Magic Damage Resistance DOWN'],
    where: 'Your skills',
    effect: 'Applied after DEF: +30% → ×1.3. Different from resistance DOWN, which lowers DEF.',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'elementDmgResDown',
    category: 'enemy',
    label: 'Enemy attribute damage resistance DOWN',
    examples: ['Dark Damage Resistance DOWN'],
    where: 'Your skills',
    effect: 'Applied after DEF for attacks of that attribute.',
    attribute: 'attacker',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'enhancedElementDmgResDown',
    category: 'enemy',
    label: 'Enemy + attribute damage resistance DOWN',
    examples: ['Dark+ Damage Resistance DOWN'],
    where: 'Your skills; enemy effect list',
    effect: 'Only for the matching “+” attack attribute. Applied after DEF as a separate multiplier from ordinary attribute damage resistance DOWN. An “all enhanced attributes” effect includes this attribute once; “all targets” describes the enemies affected and does not make it an AoE-only bonus.',
    attribute: 'attacker',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'targetDmgResDown',
    category: 'enemy',
    label: 'Enemy single-target / AoE damage resistance DOWN',
    examples: ['Single-target Damage Resistance DOWN'],
    where: 'Your skills',
    effect: 'Applied after DEF.',
    confidence: 'client',
    advanced: true,
  },
  {
    id: 'soulDmgResDown',
    category: 'enemy',
    label: 'Enemy Secret Skill Damage Resistance DOWN',
    examples: ['Secret Skill Damage Resistance DOWN'],
    where: 'Your skills',
    effect: 'Only for Soul of Combos hits; applied after DEF.',
    confidence: 'client',
  },
  {
    id: 'guardPen',
    category: 'enemy',
    label: 'Guard penetration',
    examples: ['Guard penetration +6% when equipped by magic type', 'Guard Penetration 6% (detailed stats)'],
    where: 'Equipment, detailed stats',
    effect: 'Only when the enemy guards: more damage gets through (guard ×0.5 + 6%).',
    confidence: 'client',
  },

  // ---------- No effect on your damage ----------
  {
    id: 'rate',
    category: 'noEffect',
    label: 'Pierce / Synergy / Critical / Aegis rate',
    examples: ['Increased Pierce Rate by 100% (Turns Remaining: 1)', 'Increased Synergy Rate by 100%'],
    where: 'Battle effect list',
    effect: 'Only the chance that the special hit happens. Switch the special hit on if the popup appeared instead.',
    confidence: 'none',
  },
  {
    id: 'counterPower',
    category: 'noEffect',
    label: 'Counter power',
    examples: ['Counter power +6% when equipped by magic type'],
    where: 'Equipment, detailed stats',
    effect: 'Only for counterattacks (not modelled).',
    confidence: 'none',
  },
  {
    id: 'ownDefense',
    category: 'noEffect',
    label: 'Your DEF / damage resistance',
    examples: [
      'Increased DEF by 25% (Forever)',
      'Attribute Damage Resistance +35%',
      'single-target attack damage resistance of all allies is increased by 30%',
    ],
    where: 'Battle effect list, traits',
    effect: 'Protects you; does not change your damage (your DEF only matters for Aegis).',
    confidence: 'none',
  },
  {
    id: 'enemyStatus',
    category: 'noEffect',
    label: 'Enamor amount / seal resistance UP',
    examples: ['Enamor Effect Amount: 30%', 'Seal Critical, Pierce, and Synergy Resistance UP'],
    where: 'Protector skills, enemy effect list',
    effect: 'These status amounts and seal flags are not scalar damage bonuses. Enter any applicable condition-based damage or resistance effect separately.',
    confidence: 'verified',
  },
];

export const EFFECT_BY_ID = Object.fromEntries(EFFECT_TYPES.map((t) => [t.id, t])) as Record<EffectTypeId, EffectType>;

interface LabelContext {
  attacker: { attribute: Attribute; attackType: AttackType };
  attack: { target: TargetType };
  enemy: { attribute: Attribute };
}

/** The field label for this hit, in the words of the game: “Damage vs. Wind enemies”, “Dark ATK UP”, “M-ATK UP” … */
export function effectLabel(id: EffectTypeId, c: LabelContext): string {
  const attribute = ATTRIBUTE_LABEL[c.attacker.attribute];
  const type = c.attacker.attackType === 'physical' ? 'Physical' : 'Magic';
  const target = c.attack.target === 'all' ? 'AoE' : 'Single-target';
  switch (id) {
    case 'vsAttribute':
      return `Damage vs. ${ATTRIBUTE_LABEL[c.enemy.attribute]} enemies`;
    case 'typeDmg':
      return `${type} damage UP`;
    case 'elementDmg':
      return `${attribute} damage UP`;
    case 'enhancedElementDmg':
      return `${attribute}+ damage UP`;
    case 'targetDmg':
      return `${target} damage UP`;
    case 'typeAtk':
      return c.attacker.attackType === 'physical' ? 'P-ATK UP' : 'M-ATK UP';
    case 'elementAtk':
      return `${attribute} ATK UP`;
    case 'enhancedElementAtk':
      return `${attribute}+ ATK UP`;
    case 'targetAtk':
      return `${target} ATK UP`;
    case 'typeResDown':
      return `${type} resistance DOWN`;
    case 'elementResDown':
      return `${attribute} resistance DOWN`;
    case 'enhancedElementResDown':
      return `${attribute}+ resistance DOWN`;
    case 'targetResDown':
      return `${target} resistance DOWN`;
    case 'typeDmgResDown':
      return `${type} damage res. DOWN`;
    case 'elementDmgResDown':
      return `${attribute} damage res. DOWN`;
    case 'enhancedElementDmgResDown':
      return `${attribute}+ damage resistance DOWN`;
    case 'targetDmgResDown':
      return `${target} damage res. DOWN`;
    default:
      return EFFECT_BY_ID[id].label;
  }
}
