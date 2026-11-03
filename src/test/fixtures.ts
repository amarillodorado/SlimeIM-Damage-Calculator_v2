import { blankAttack, newId } from '../domain/defaults';
import type { Hit, Workspace } from '../domain/types';

// Historical regression inputs only. Never imported by the application.
/**
 * Hits recorded on 2026-11-01 on a Tornado Ant, both reproduced exactly:
 * run 1, Milim's Soul of Combos (340,865), and run 3, her Ultimate Soul of
 * Combos (1,132,561). Dark vs. Wind is neutral, so the Ultimate bonus doesn't count.
 */
export function verifiedExample(): Workspace {
  const run1: Hit = {
    id: newId(),
    attacker: {
      name: 'Milim · run 1',
      attribute: 'dark',
      plus: true,
      attackType: 'magic',
      atkMode: 'battle',
      battleAtk: 22149,
      troopAtk: 0,
      supportAtk: 6886,
      ownDef: 13249,
      tau: { active: true, weak: 1.2, superWeak: 1.3 },
    },
    attack: {
      kind: 'soulOfCombos',
      power: 600,
      variant: 'normal',
      ultimateBonus: 40,
      target: 'single',
      matchup: 'auto',
      popup: 'superWeak',
      crit: false,
      pierce: 'normal',
      synergy: 'normal',
      aegis: 'off',
    },
    effects: {
      vsAttribute: 106, // Divine Protection (Elmesia)
      soulDmg: 40, // Soul of Combos card
      synergyPower: 40, // effect list (Forever)
      piercePower: 12, // equipment, not shown in battle
      atkPct: 56, // 50% effect list + 6% trait; already in the battle ATK
    },
    observed: 340865,
  };
  const run3: Hit = {
    id: newId(),
    attacker: { ...run1.attacker, name: 'Milim · run 3', tau: { ...run1.attacker.tau } },
    // The Ultimate card shows 1080% (600% × 1.8).
    attack: { ...run1.attack, power: 1080, variant: 'ultimate', crit: true },
    effects: {
      vsAttribute: 106,
      soulDmg: 30, // Ultimate Soul of Combos card
      synergyPower: 30,
      piercePower: 12,
      critDmg: 84, // 40% effect list + 12% + 12% equipment + 20% no screen shows (runs 3 and 4 both need it)
      atkPct: 56,
    },
    observed: 1132561,
  };
  return {
    version: 6,
    enemy: { name: 'Tornado Ant', attribute: 'wind', def: 1875, physRes: 0, magicRes: -20, stunned: false, enamored: true, guard: 'none' },
    hits: [run1, run3],
    activeHitId: run1.id,
  };
}

/**
 * Run 4 (2026-11-01): Milim's Ultimate Soul of Combos on a Lightning Bat. Dark
 * beats Light. This fixture uses a fitted 40% character override (source not
 * independently established), so it checks arithmetic compatibility only.
 */
export function lightningBatExample(): Workspace {
  const hit: Hit = {
    id: newId(),
    attacker: {
      name: 'Milim · run 4',
      attribute: 'dark',
      plus: true,
      attackType: 'magic',
      atkMode: 'battle',
      battleAtk: 24137,
      troopAtk: 0,
      supportAtk: 6886,
      ownDef: 13249,
      tau: { active: true, weak: 1.2, superWeak: 1.3 },
    },
    attack: { ...blankAttack(), power: 1080, ultimateBonus: 40, variant: 'ultimate', popup: 'superWeak', crit: true, pierce: 'normal', synergy: 'normal' },
    effects: {
      soulDmg: 120, // card: 20% (Forever) + 100% (1 turn)
      synergyPower: 20,
      piercePower: 12, // equipment
      pierceResDown: 60, // enemy: “Decreased Pierce Resistance by 60%”
      critDmg: 84, // 40% effect list + 12% + 12% equipment + 20% no screen shows
      atkPct: 70, // 64% + 6%, already in the battle ATK
    },
    observed: 2731896,
  };
  return {
    version: 6,
    enemy: { name: 'Lightning Bat', attribute: 'light', def: 5179, physRes: 0, magicRes: -20, stunned: false, enamored: true, guard: 'none' },
    hits: [hit],
    activeHitId: hit.id,
  };
}
