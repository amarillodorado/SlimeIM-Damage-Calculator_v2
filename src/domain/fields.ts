import type { Confidence } from './effects';

/** Shared help for calculator inputs and the guide. */
export interface FieldHelp {
  label: string;
  where: string;
  includes?: string;
  use: string;
  example?: string;
  game?: string[];
  confidence?: Confidence;
  image?: { src: string; alt: string };
}

const HELP = {
  battleAtk: {
    label: 'Battle ATK',
    where: 'In battle, tap the attacker and read its current ATK.',
    includes: 'The ATK-stat effects already reflected in this panel, including active stat buffs and the current loadout.',
    use: 'Copy it on the turn of the hit. Do not add ordinary Increased ATK effects again. Attack-power and damage-power effects use their separate fields.',
  },
  characterAtk: {
    label: 'Character ATK',
    where: 'Character page → Status Attributes, outside battle.',
    includes: 'The character-page total for that loadout.',
    use: 'Used only in estimated pre-battle mode. Character-page totals do not establish the native original base for every stat buff; compare the estimated result with the battle panel.',
  },
  supportAtk: {
    label: 'Support character ATK',
    where: 'Open the own status page of the attached support character, the small card below the attacker in the troop.',
    use: 'Ordinary Synergy adds 40% of this value to the attack input; Super Synergy uses 55%. Use the same loadout as the recorded hit. This is different from the other attackers in an eligible combo.',
  },
  addSupportAtk: {
    label: 'Support ATK in pre-battle ATK',
    where: 'Attached support character’s status page.',
    use: 'Optionally adds its ATK to the estimate. The exact pre-battle composition is not fully established, so this is not an exact substitute for the displayed Battle ATK.',
  },
  attribute: {
    label: 'Attribute',
    where: 'Battle information panel or character page.',
    use: 'Selects the natural matchup and the attribute-specific field names. Choose the “+” version only when the character has it; eligible advantage matchups gain an additional 0.1.',
  },
  attackType: {
    label: 'Attack type',
    where: 'Battle information panel → Attack Type.',
    use: 'Selects the physical or magic resistance and the attack-type-specific effects.',
  },
  tau: {
    label: 'True Attribute Unbound',
    where: 'Character page → Skill → True Attribute Unbound.',
    use: 'Enable only during its listed turns and conditions. Copy the Weak Point and Super Weak Point factors for this character. The selected observed popup chooses the factor.',
  },
  ownDef: {
    label: 'Your DEF',
    where: 'Attacker’s battle information panel.',
    use: 'Aegis adds 40% of this DEF to the attack input; Super Aegis adds 55%. Use the current effective DEF, not an unbuffed character-page value.',
  },
  kind: {
    label: 'Hit type',
    where: 'The attack card actually used.',
    use: 'Soul of Combos is the secret-skill orb. Normal orb is another soul attack. Enter supported buffs from battle skills under Buffs & debuffs; direct-damage battle skills are not modeled here.',
  },
  power: {
    label: 'Damage % on the card',
    where: 'Open the card or skill description for the attack version used.',
    includes: 'Use the displayed percentage. A displayed EX/Ultimate percentage already includes that version’s power boost.',
    use: 'For a secret skill, enter the actual selected card percentage, such as 600 for 600%. EX/Ultimate power is already included in that displayed percentage. Ordinary orbs use the recovered 100% baseline automatically; use the advanced override only for a verified replacement attack.',
  },
  variant: {
    label: 'Soul of Combos version',
    where: 'The card title: Soul of Combos, EX Soul of Combos or Ultimate Soul of Combos.',
    use: 'Choose the version first, then enter the percentage displayed on that version’s card. Normal and EX use the entered percentage without an extra version multiplier. Ultimate additionally enables Ultimate-only damage effects and its natural-advantage weakness addition. Changing versions clears the previous percentage to avoid reusing the wrong card power.',
  },
  ultimateBonus: {
    label: 'Ultimate bonus vs. weak attributes',
    where:
      'The character’s resolved Ultimate weakness addition. This starts unknown because the supplied 140% global fallback is not a verified per-character value.',
    use: 'Enter 40 for an addition of 0.4: an enhanced advantage then becomes 1.5 + 0.1 + 0.4 = 2.0, before other weakness effects. A value of 140 instead produces 3.0. This is not a universal 40% constant. The supported attacking-Ultimate branch adds it only on natural advantage; a forced Weak Point popup on a neutral matchup does not activate it.',
    confidence: 'client',
  },
  comboPosition: {
    label: 'Orb in the chain',
    where: 'The attack’s position in the selected soul chain.',
    use: 'Optional identification only. Select the applicable Combo finisher separately: None for 1–3 selected cards and non-finishers, or 4/5/6 cards for the last eligible normal orb. Selected secret skills count toward chain length. The displayed chain BONUS concerns gauge points, not this damage factor.',
  },
  matchup: {
    label: 'Base attribute matchup',
    where: 'In-game attribute help chart.',
    use: 'Auto uses Fire → Earth → Space → Wind → Water → Fire; Light and Dark beat each other. Natural advantage is 1.5, or 1.6 with the eligible enhanced adjustment. This selector shows the base only. Ultimate and weakness contributions are included in the separate Resolved attribute factor readout; do not multiply the base factor again.',
    image: { src: 'guide/attribute-chart.webp', alt: 'In-game attribute matchup chart' },
  },
  popup: {
    label: 'Popup on the hit',
    where: 'The Weak Point! or Super Weak Point! text shown on the hit.',
    use: 'Selects eligible weakness effects and True Attribute Unbound. It does not replace the natural attribute matchup.',
  },
  specialHits: {
    label: 'Special hits',
    where: 'Hit popups such as Critical, Pierce, Synergy and Aegis.',
    use: 'Select the outcome that occurred. Rate effects are chances, not damage-power factors. Super Critical is unavailable because its two numeric coefficients were not recovered from the supplied files. For other Super hits, keep simultaneous positive and negative sources separate.',
  },
  enemyDef: {
    label: 'Enemy DEF',
    where: 'In battle, tap the enemy and read its current DEF.',
    includes: 'DEF-stat changes already reflected in that panel.',
    use: 'Use the value on the turn of the hit. Do not add a DEF debuff again if it is already included.',
  },
  enemyRes: {
    label: 'Attack resistances',
    where: 'Enemy information panel → Attack Resistances.',
    includes: 'Resistance changes already reflected in that panel.',
    use: 'Copy physical and magic values with their signs. A −20% attack resistance scales the DEF term by 0.8. Separate damage resistance is a different category.',
  },
  enemyStatus: {
    label: 'Enemy status',
    where: 'Enemy information panel → Effect List.',
    use: 'Enables the supported Stun Strike / Enamor Strike conditions. Merely applying Enamor does not supply a damage multiplier without an applicable effect.',
  },
  guard: {
    label: 'Enemy guard',
    where: 'Guard or Super Guard popup on the hit.',
    use: 'Ordinary Guard uses a 0.5 base factor and Super Guard 0.1. Applicable Guard Penetration is added inside this factor.',
  },
  observed: {
    label: 'Damage the game showed',
    where: 'The damage number on the recorded hit.',
    use: 'Tests whether the supplied setup can reproduce the observation at an allowed variance roll. A match does not uniquely prove each input or recover the actual random draw.',
  },
} satisfies Record<string, FieldHelp>;

export type FieldKey = keyof typeof HELP;
export const FIELD_HELP: Record<FieldKey, FieldHelp> = HELP;
