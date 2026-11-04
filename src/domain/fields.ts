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
  troopAtk: {
    label: 'Troop ATK',
    where: 'Troop screen → press Status Attributes below the troop until HP, ATK and DEF show under each character → the ATK under your character.',
    includes:
      'Your character’s combined lineup ATK, including equipment, the attached support character (the small portrait below it), applicable EX abilities and the protector’s flat ATK contribution. The Divine Protection’s percentage ATK boost is not included.',
    use: 'Used only in pre-battle mode. Read it in the troop you fight with: another support, protector or teammate changes it. Then enter every “Increased ATK by X%” the character gets in battle in Increased ATK %, the Divine Protection’s boost included.',
    confidence: 'assumed',
  },
  supportAtk: {
    label: 'Support character ATK',
    where: 'Open the attached support character’s own page; its portrait appears below your character in the troop.',
    use: 'Only for Synergy: ordinary Synergy adds 40% of this value to the attack input, Super Synergy 55%. Use the support’s own ATK, not the troop ATK. This is different from the other attackers in an eligible combo.',
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
    use: 'Enable only during its listed turns and conditions. Copy the Weak Point and Super Weak Point factors for this character. The selected weakness result chooses the factor.',
  },
  ownDef: {
    label: 'Your DEF',
    where: 'Attacker’s battle information panel.',
    use: 'Aegis adds 40% of this DEF to the attack input; Super Aegis adds 55%. Use the current effective DEF, not an unbuffed character-page value.',
  },
  kind: {
    label: 'Hit type',
    where: 'The soul used for this attack.',
    use: 'Soul of Combos uses the character’s secret skill. Choose Normal soul for other attack souls. Enter supported buffs from battle skills under Buffs & debuffs; direct-damage battle skills are not modeled here.',
  },
  power: {
    label: 'Damage % on the soul',
    where: 'Open the soul or skill description for the attack version used.',
    includes: 'Use the displayed percentage. A displayed EX/Ultimate percentage already includes that version’s power boost.',
    use: 'For a secret skill, enter the actual selected soul percentage, such as 600 for 600%. EX/Ultimate power is already included in that displayed percentage. Ordinary souls use the recovered 100% baseline automatically; use the advanced override only for a verified replacement attack.',
  },
  variant: {
    label: 'Soul of Combos version',
    where: 'The soul’s name: Soul of Combos, EX Soul of Combos or Ultimate Soul of Combos.',
    use: 'Choose the version first, then enter the percentage displayed for that version. Normal and EX use the entered percentage without an extra version multiplier. Ultimate additionally enables Ultimate-only damage effects and its natural-advantage weakness addition. Changing versions clears the previous percentage to avoid reusing the wrong soul power.',
  },
  ultimateBonus: {
    label: 'Ultimate bonus vs. weak attributes',
    where: 'Ultimate Soul of Combos: “Greatly increases damage to weak attributes”. The game shows no number.',
    use: 'Counts only when your attribute beats the enemy’s, not because of a Weak Point result on a neutral matchup. The supplied master data confirms 40% for level-120 [Armored Dragonoid] Milim: with Dark+, 1.5 + 0.1 + 0.4 = 2.0. Other recovered Epic overrides include 10%. Use the value for your character’s active upgrade; the 40% starting value is not universal.',
    example: 'Milim (Dark+) vs. Gold Bat (Light): ×1.6 → ×2.0.',
    confidence: 'client',
  },
  matchup: {
    label: 'Base attribute matchup',
    where: 'In-game attribute help chart.',
    use: 'Auto uses Fire → Earth → Space → Wind → Water → Fire; Light and Dark beat each other. Natural advantage is 1.5, or 1.6 with the eligible enhanced adjustment. This selector shows the base only. The “=” line below adds the Ultimate and weakness contributions and shows the resulting factor; do not multiply the base factor again. True Attribute Unbound is a separate factor.',
    image: { src: 'guide/attribute-chart.webp', alt: 'In-game attribute matchup chart' },
  },
  popup: {
    label: 'Weakness result',
    where: 'The Weak Point! or Super Weak Point! text shown on the hit.',
    use: 'Select None, Weak Point or Super Weak Point as shown on the attack. Attribute-side weakness can come from the natural matchup or an applicable protection bonus against the enemy’s attribute. Super Weak Point also requires weakness to the attack type you use: Physical for a physical attacker, Magic for a magic attacker. Attribute-side weakness alone gives Weak Point; attack-type weakness alone gives no weakness message. This selects eligible weakness effects and True Attribute Unbound without replacing the natural attribute matchup.',
    example: 'Magic Milim with an applicable damage-to-Wind protection bonus against a Wind enemy weak only to Physical shows Weak Point. Super Weak Point additionally requires weakness to Magic.',
  },
  specialHits: {
    label: 'Special hits',
    where: 'Hit popups such as Critical, Pierce, Synergy and Aegis.',
    use: 'Select the outcome that occurred; its power and resistance fields then appear below it. Rate effects are chances, not damage-power factors. How each special hit changes the damage is explained in Guide → Popups & special hits. Super Critical replaces ordinary Critical: base factor 1.5, with favorable power and resistance bonuses multiplied by 1.3. These constants apply automatically. For Super hits, keep simultaneous positive and negative sources separate.',
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
