import { ATTRIBUTE_LABEL, resolveMatchup } from './attributes';
import { EFFECT_BY_ID } from './effects';
import {
  type ClrDecimal,
  decimal as D,
  maxDecimal as maxD,
  minDecimal as minD,
  plusDecimal as plusD,
  minusDecimal as minusD,
  normalPierceAddition,
  ONE,
  ZERO,
} from './decimal';
import { EFFECT_TYPE_IDS, type Attack, type Attacker, type EffectTypeId, type EffectValues, type Enemy, type Hit, type Matchup } from './types';

/**
 * One Physics/Magic hit, in the order of BattleDamageReceiveParam.CalculateAttackDamage
 * (DAMAGE_FORMULA.md §2). All percentages are plain numbers (40 = 40%).
 */

export const ROLL_MIN = 9900;
export const ROLL_MID = 10000;
export const ROLL_MAX = 10099;
export const DAMAGE_CAP = 500_000_000_000;

export const CRIT_BASE = 1.3;
// MasterBattleDefineValue IDs 8700000008 / 8700000009: 15000 / 13000 basis points.
export const SUPER_CRIT_BASE = 1.5;
export const SUPER_CRIT_POWER_SCALE = 1.3;
export const PIERCE_ATK_SHARE = { normal: 0.06, super: 1 } as const;
export const ASSIST_SHARE = { normal: 0.4, super: 0.55 } as const;
export const GUARD_BASE = { guard: 0.5, superGuard: 0.1 } as const;
export const MATCHUP_BASE: Record<Matchup, number> = { advantage: 1.5, neutral: 1, disadvantage: 0.7 };
export const PLUS_ADVANTAGE_BONUS = 0.1;

export interface HitInput {
  attacker: Attacker;
  attack: Attack;
  enemy: Enemy;
  effects: EffectValues;
  effectEntries?: Partial<Record<EffectTypeId, number[]>>;
}

export const toInput = (hit: Hit, enemy: Enemy): HitInput => ({
  attacker: hit.attacker,
  attack: hit.attack,
  enemy,
  effects: hit.effects,
  effectEntries: hit.effectEntries,
});

/** max(0, 1 + x) — attack power, resistance and damage power groups. */
export const plus = (pct: number) => plusD(pct).toNumber();
/** max(0, 1 − x) — damage resistance group (a DOWN debuff is a negative resistance). */
export const minus = (pct: number) => minusD(pct).toNumber();

/** Ratio stat buff: ceil(base × bp / 10000), each entry separately. */
export const ratioDelta = (base: number, pct: number) => D(base).mul(D(pct).div(100)).ceil().toNumber();

export function kernel(attack: number, def: number, roll: number): number {
  return kernelFromA(D(attack), D(def), roll).toNumber();
}
function kernelFromA(attack: ClrDecimal, defense: ClrDecimal, roll: number): ClrDecimal {
  if (!Number.isInteger(roll) || roll < ROLL_MIN || roll > ROLL_MAX) throw new RangeError('Variance roll must be an integer from 9900 to 10099');
  const q = attack.compare(0) === 0 ? ZERO : defense.div(attack).mul(300);
  return maxD(0, attack.add(attack.mul(D(300).sub(q).div(1500))).mul(D(roll).div(10000)));
}

const regularDecimalRate = (base: number, power: ClrDecimal, resistDown: ClrDecimal) => maxD(0, D(base).add(power.add(resistDown).div(100)));
export const regularRate = (base: number, power: number, resistDown: number) => regularDecimalRate(base, D(power), D(resistDown)).toNumber();

/** Super Pierce, Synergy and Aegis amplify favourable contributions by 1.2. */
function superDecimalRate(power: number[], resistDown: number[]): ClrDecimal {
  const all = [...power, ...resistDown];
  const favourable = all.reduce((s, x) => s.add(maxD(x, 0)), ZERO);
  const unfavourable = all.reduce((s, x) => s.add(minD(x, 0)), ZERO);
  return maxD(0, ONE.add(favourable.mul('1.2').add(unfavourable).div(100)));
}
export function superRate(power: number, resistDown: number, powerEntries: number[] = [power], resistanceEntries: number[] = [resistDown]): number {
  return superDecimalRate(powerEntries, resistanceEntries).toNumber();
}

/**
 * Low-level GetCriticalSuperRate algebra (0xBC759EC), preserving the native
 * basis-point sequence. Explicit coefficients support independent Decimal oracles;
 * player calculations use the recovered constants in getSuperCriticalFactor.
 */
export function superCriticalRate(base: number, powerScale: number, power: number[], resistanceDown: number[]): ClrDecimal {
  if (typeof base !== 'number' || !Number.isFinite(base) || typeof powerScale !== 'number' || !Number.isFinite(powerScale))
    throw new RangeError('Super Critical coefficients must be finite numbers.');
  const positive = (entries: number[]) => entries.reduce((sum, value) => sum.add(maxD(value, 0)), ZERO);
  const negative = (entries: number[]) => entries.reduce((sum, value) => sum.add(minD(value, 0)), ZERO);
  // UI resistance DOWN signs are the inverse of native receiver-resistance signs.
  const ap = positive(power).mul(100);
  const an = negative(power).mul(100);
  const rp = negative(resistanceDown).mul(-100);
  const rn = positive(resistanceDown).mul(-100);
  const commonCoefficient = D(base).mul(10000);
  const upCoefficient = D(powerScale).mul(10000);
  const favorable = ap.sub(rn).mul(upCoefficient).div(10000);
  return maxD(0, commonCoefficient.add(favorable).add(an).sub(rp).div(10000));
}

/** Official MasterBattleDefineValue coefficients: base 1.5, favorable bonuses 1.3. */
export function getSuperCriticalFactor(input: HitInput): ClrDecimal {
  return superCriticalRate(SUPER_CRIT_BASE, SUPER_CRIT_POWER_SCALE, sourceEntries(input, 'critDmg'), sourceEntries(input, 'critResDown'));
}

/** No tolerance snapping: genuine fractions must always round upward. */
export function ceilDamage(value: number): number {
  return D(value).ceil().toNumber();
}

// ---------------------------------------------------------------------------
// Which effect types can count for this hit
// ---------------------------------------------------------------------------

export interface Applicability {
  applies: boolean;
  reason?: string;
}

/**
 * Whether the hit meets the effect's condition (hit type, special hit, popup,
 * enemy state …). The calculator only shows the fields of types that apply.
 */
export function effectApplies(type: EffectTypeId, input: HitInput): Applicability {
  if (EFFECT_BY_ID[type].category === 'noEffect') return { applies: false, reason: "Doesn't change damage" };
  const { attacker: a, attack: k, enemy: e } = input;
  const soc = k.kind === 'soulOfCombos';
  switch (type) {
    case 'enhancedElementAtk':
    case 'enhancedElementDmg':
    case 'enhancedElementResDown':
    case 'enhancedElementDmgResDown':
      return a.plus ? { applies: true } : { applies: false, reason: 'Requires the matching “+” attack attribute' };
    case 'atkPct':
      return a.atkMode === 'battle' ? { applies: false, reason: 'Already in the battle ATK' } : { applies: true };
    case 'soulDmg':
    case 'soulDmgResDown':
      return soc ? { applies: true } : { applies: false, reason: 'Soul of Combos only' };
    case 'ultimateSoulDmg':
      return soc && k.variant === 'ultimate' ? { applies: true } : { applies: false, reason: 'Ultimate Soul of Combos only' };
    case 'critDmg':
    case 'critResDown':
      return k.crit ? { applies: true } : { applies: false, reason: 'No Critical on this hit' };
    case 'piercePower':
    case 'pierceResDown':
      return k.pierce !== 'off' ? { applies: true } : { applies: false, reason: 'No Pierce on this hit' };
    case 'synergyPower':
    case 'synergyResDown':
      return k.synergy !== 'off' ? { applies: true } : { applies: false, reason: 'No Synergy on this hit' };
    case 'aegisPower':
    case 'aegisResDown':
      return k.aegis !== 'off' ? { applies: true } : { applies: false, reason: 'No Aegis on this hit' };
    case 'guardPen':
      return e.guard !== 'none' ? { applies: true } : { applies: false, reason: 'Enemy does not guard' };
    case 'stunStrike':
      return e.stunned ? { applies: true } : { applies: false, reason: 'Enemy is not stunned' };
    case 'enamorStrike':
      return e.enamored ? { applies: true } : { applies: false, reason: 'Enemy is not enamored' };
    case 'weakDmg':
      return k.popup !== 'none' ? { applies: true } : { applies: false, reason: 'Needs a Weak Point popup' };
    case 'superWeakDmg':
      return k.popup === 'superWeak' ? { applies: true } : { applies: false, reason: 'Needs a Super Weak Point popup' };
    case 'comboDmg':
      if (k.kind !== 'soul') return { applies: false, reason: 'Normal souls only' };
      return (k.comboMultiplier ?? 1) > 1 ? { applies: true } : { applies: false, reason: 'Needs an eligible soul finisher above 100%' };
    default:
      return { applies: true };
  }
}

/** Value of each type that counts for this hit (0 otherwise). */
function sourceEntries(input: HitInput, id: EffectTypeId): number[] {
  return input.effectEntries?.[id] ?? [input.effects[id] ?? 0];
}
function collect(input: HitInput): (id: EffectTypeId) => ClrDecimal {
  const totals = new Map<EffectTypeId, ClrDecimal>();
  for (const id of EFFECT_TYPE_IDS) {
    if (effectApplies(id, input).applies)
      totals.set(
        id,
        sourceEntries(input, id).reduce((sum, value) => sum.add(value), ZERO),
      );
  }
  return (id) => totals.get(id) ?? ZERO;
}

export interface AttributeFactor {
  matchup: Matchup;
  base: ClrDecimal;
  enhanced: ClrDecimal;
  ultimate: ClrDecimal;
  weak: ClrDecimal;
  superWeak: ClrDecimal;
  factor: ClrDecimal;
}

/** Shared affinity calculation for damage and its preview, in the native addition order. */
export function getAttributeFactor(input: HitInput): AttributeFactor {
  const { attacker: a, attack: k, enemy: e } = input;
  const t = collect(input);
  const matchup = resolveMatchup(k.matchup, a.attribute, e.attribute);
  const base = D(MATCHUP_BASE[matchup]);
  let factor = base;
  const enhanced = matchup === 'advantage' && a.plus ? D(PLUS_ADVANTAGE_BONUS) : ZERO;
  if (enhanced.compare(0)) factor = factor.add(enhanced);
  let ultimate = ZERO;
  if (k.kind === 'soulOfCombos' && k.variant === 'ultimate' && matchup === 'advantage') {
    if (typeof k.ultimateBonus !== 'number' || !Number.isFinite(k.ultimateBonus))
      throw new RangeError('Enter the resolved Ultimate affinity addition for this character before calculating an advantageous Ultimate hit.');
    ultimate = D(k.ultimateBonus).div(100);
    factor = factor.add(ultimate);
  }
  let weak = ZERO;
  if (k.popup !== 'none') {
    const q = plusD(t('vsAttribute'));
    if (q.compare(0) === 0) throw new RangeError('A Weak Point hit needs a damage-vs-attribute factor above zero. Check the entered effects.');
    weak = t('weakDmg')
      .div(100)
      .mul(minD(ONE.div(q), ONE));
    factor = factor.add(weak);
  }
  const superWeak = k.popup === 'superWeak' ? t('superWeakDmg').div(100) : ZERO;
  if (k.popup === 'superWeak') factor = factor.add(superWeak);
  return { matchup, base, enhanced, ultimate, weak, superWeak, factor: maxD(factor, 0) };
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

export interface StatLine {
  id: string;
  label: string;
  detail: string;
  value: number;
}

export interface Step {
  id: string;
  label: string;
  detail: string;
  factor?: number;
  value: number;
}

export interface HitResult {
  damage: number;
  battleAtk: number;
  /** Pre-battle mode: ATK before % effects. */
  preBattleAtk?: number;
  attackValue: number;
  effectiveDef: number;
  matchup: Matchup;
  stats: StatLine[];
  steps: Step[];
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const signed = (n: number) => `${n < 0 ? '−' : '+'} ${Math.abs(n)}%`;
const join = (base: string, parts: [number, string][]) => [base, ...parts.filter(([n]) => n !== 0).map(([n, l]) => `${signed(n)} ${l}`)].join(' ');

export function computeHit(input: HitInput, roll: number = ROLL_MID, trace = false): HitResult {
  const { attacker: a, attack: k, enemy: e } = input;
  const t = collect(input);
  const n = (id: EffectTypeId) => t(id).toNumber();
  const stats: StatLine[] = [],
    steps: Step[] = [];
  const soc = k.kind === 'soulOfCombos';
  let battleAtk: ClrDecimal, preBattleAtk: ClrDecimal | undefined;
  if (a.atkMode === 'battle') {
    battleAtk = maxD(0, a.battleAtk);
    if (trace) stats.push({ id: 'atk', label: 'Battle ATK', detail: 'from the battle info panel (includes active ATK buffs)', value: battleAtk.toNumber() });
  } else {
    // The troop screen ATK already holds the character, its support, equipment and EX abilities.
    // The battle adds all “Increased ATK” % together and rounds up once: 14,689 + 92% = 28,203 and
    // 14,689 + 70% = 24,972 fit only that way; rounding each % separately fits no base.
    preBattleAtk = maxD(0, a.troopAtk);
    battleAtk = maxD(0, preBattleAtk.add(preBattleAtk.mul(t('atkPct').div(100)).ceil()));
    if (trace) {
      stats.push({
        id: 'preAtk',
        label: 'Troop ATK',
        detail: 'from the troop screen',
        value: preBattleAtk.toNumber(),
      });
      stats.push({
        id: 'atk',
        label: 'Estimated battle ATK',
        detail: 'plus the Increased ATK %, rounded up',
        value: battleAtk.toNumber(),
      });
    }
  }

  const assist = k.synergy === 'off' ? ZERO : D(a.supportAtk).mul(ASSIST_SHARE[k.synergy]);
  const aegisAdd = k.aegis === 'off' ? ZERO : D(a.ownDef).mul(ASSIST_SHARE[k.aegis]);
  const hasBuddies = !soc && [1.5, 2].includes(k.comboMultiplier ?? 1);
  const buddy1 = hasBuddies ? D(a.comboBuddyAtk1 ?? 0).mul('0.02') : ZERO;
  const buddy2 = hasBuddies ? D(a.comboBuddyAtk2 ?? 0).mul('0.02') : ZERO;
  // GetAttackRateBase multiplies target, attack type and element in this order.
  const attackPower = plusD(t('targetAtk'))
    .mul(plusD(t('typeAtk')))
    .mul(plusD(t('elementAtk')))
    .mul(plusD(t('enhancedElementAtk')));
  const attackValue = battleAtk.add(assist).add(aegisAdd).add(buddy1).add(buddy2).mul(attackPower);
  const defDelta = sourceEntries(input, 'defDown').reduce((sum, value) => sum.add(D(e.def).mul(D(value).neg().div(100)).ceil()), ZERO);
  const defStat = maxD(0, D(e.def).add(defDelta));
  const shownRes = a.attackType === 'physical' ? e.physRes : e.magicRes;
  const resistance = plusD(t('targetResDown').neg())
    .mul(plusD(D(shownRes).sub(t('typeResDown'))))
    .mul(plusD(t('elementResDown').neg()))
    .mul(plusD(t('enhancedElementResDown').neg()));
  const effectiveDef = defStat.mul(resistance);
  if (trace) {
    if (assist.compare(0))
      stats.push({
        id: 'assist',
        label: '+ Synergy partner',
        detail: `${ASSIST_SHARE[k.synergy as 'normal' | 'super'] * 100}% of support ATK ${fmt(a.supportAtk)}`,
        value: assist.toNumber(),
      });
    if (aegisAdd.compare(0))
      stats.push({ id: 'aegisAdd', label: '+ Aegis', detail: `${ASSIST_SHARE[k.aegis as 'normal' | 'super'] * 100}% of your DEF`, value: aegisAdd.toNumber() });
    if (buddy1.compare(0) || buddy2.compare(0))
      stats.push({
        id: 'buddies',
        label: '+ Combo buddies',
        detail: '2% of each explicitly supplied eligible buddy ATK',
        value: buddy1.add(buddy2).toNumber(),
      });
    stats.push({ id: 'attack', label: 'Attack value', detail: `× ${attackPower.toString()} attack power`, value: attackValue.toNumber() });
    stats.push({
      id: 'def',
      label: 'Enemy DEF',
      detail: n('defDown') ? 'with separately entered DEF changes' : 'from the enemy info panel',
      value: defStat.toNumber(),
    });
    stats.push({ id: 'effDef', label: 'Effective DEF', detail: `× ${resistance.toString()} resistance`, value: effectiveDef.toNumber() });
  }

  let d = kernelFromA(attackValue.div(3), effectiveDef, roll);
  const push = (id: string, label: string, detail: string, factor?: ClrDecimal) => {
    if (trace) steps.push({ id, label, detail, factor: factor?.toNumber(), value: d.toNumber() });
  };
  push('kernel', 'Base damage', `(2 × ${fmt(attackValue.toNumber())} − ${fmt(effectiveDef.toNumber())}) × 0.2 × ${roll / 10000}`);

  // Form the complete native damage-effect rate before multiplying raw damage.
  const condition = plusD(t('stunStrike').add(t('enamorStrike')));
  const q = plusD(t('vsAttribute'));
  const dmgUp = plusD(t('targetDmg'))
    .mul(plusD(t('typeDmg')))
    .mul(plusD(t('elementDmg')))
    .mul(plusD(t('enhancedElementDmg')))
    .mul(condition)
    .mul(q);
  d = d.mul(dmgUp);
  if (dmgUp.compare(1))
    push('dmgUp', 'Damage power', `type, target and attribute power; condition strikes; damage vs. ${ATTRIBUTE_LABEL[e.attribute]} enemies`, dmgUp);
  const dmgRes = minusD(t('targetDmgResDown').neg())
    .mul(minusD(t('typeDmgResDown').neg()))
    .mul(minusD(t('elementDmgResDown').neg()))
    .mul(minusD(t('enhancedElementDmgResDown').neg()))
    .mul(soc ? minusD(t('soulDmgResDown').neg()) : ONE);
  d = d.mul(dmgRes);
  if (dmgRes.compare(1)) push('dmgRes', 'Damage resistance DOWN', 'separate target, attack-type, attribute and eligible secret-skill factors', dmgRes);

  const comboBase = D(k.comboMultiplier ?? 1);
  const combo = soc ? ONE : maxD(0, comboBase.add(comboBase.compare(1) > 0 ? t('comboDmg').div(100) : ZERO));
  d = d.mul(combo);
  if (combo.compare(1)) push('combo', 'Soul Combos', `entered base ${comboBase.mul(100).toString()}% + separately entered eligible combo damage`, combo);
  if (k.crit) {
    const crit = k.superCrit ? getSuperCriticalFactor(input) : regularDecimalRate(CRIT_BASE, t('critDmg'), t('critResDown'));
    d = d.mul(crit);
    push(
      'crit',
      k.superCrit ? 'Super Critical' : 'Critical',
      k.superCrit
        ? `base ${SUPER_CRIT_BASE}; favorable power/resistance ×${SUPER_CRIT_POWER_SCALE}; penalties unscaled`
        : join('1.3', [
            [n('critDmg'), 'critical power'],
            [n('critResDown'), 'res DOWN'],
          ]),
      crit,
    );
  }
  if (e.guard !== 'none') {
    const guard = maxD(0, D(GUARD_BASE[e.guard]).add(t('guardPen').div(100)));
    d = d.mul(guard);
    push('guard', e.guard === 'guard' ? 'Enemy Guard' : 'Enemy Super Guard', 'base guard factor + guard penetration', guard);
  }
  const cardUp = (soc ? t('soulDmg') : ZERO).add(t('soulsDmg')).add(soc && k.variant === 'ultimate' ? t('ultimateSoulDmg') : ZERO);
  const card = plusD(cardUp);
  d = d.mul(card);
  if (card.compare(1)) push('card', soc ? 'Soul of Combos damage UP' : 'Soul damage UP', `1 + ${cardUp.toString()}% (added together)`, card);
  const skill = D(k.power).div(100);
  d = d.mul(skill);
  push('skill', soc ? 'Soul of Combos power' : 'Soul power', `${k.power}% from the selected soul`, skill);

  const specialRate = (power: EffectTypeId, resistance: EffectTypeId, superHit: boolean) =>
    superHit ? superDecimalRate(sourceEntries(input, power), sourceEntries(input, resistance)) : regularDecimalRate(1, t(power), t(resistance));
  if (k.pierce !== 'off') {
    const added = k.pierce === 'super' ? battleAtk : normalPierceAddition(battleAtk);
    const rate = specialRate('piercePower', 'pierceResDown', k.pierce === 'super');
    d = d.add(added).mul(rate);
    push('pierce', k.pierce === 'super' ? 'Super Pierce' : 'Pierce', `(+ ${added.toString()} ATK-based damage, ignores DEF) × ${rate.toString()}`, rate);
  }
  if (k.synergy !== 'off') {
    const rate = specialRate('synergyPower', 'synergyResDown', k.synergy === 'super');
    d = d.mul(rate);
    push('synergy', k.synergy === 'super' ? 'Super Synergy' : 'Synergy', 'power and resistance entries resolved separately', rate);
  }
  if (k.aegis !== 'off') {
    const rate = specialRate('aegisPower', 'aegisResDown', k.aegis === 'super');
    d = d.mul(rate);
    push('aegis', k.aegis === 'super' ? 'Super Aegis' : 'Aegis', 'power and resistance entries resolved separately', rate);
  }

  const { matchup, factor: element } = getAttributeFactor(input);
  d = d.mul(element);
  if (element.compare(1) || matchup !== 'neutral')
    push('matchup', 'Attribute matchup', `${matchup}; eligible enhanced, Ultimate and weakness additions`, element);
  if (a.tau.active && k.popup !== 'none') {
    const factor = D(k.popup === 'superWeak' ? a.tau.superWeak : a.tau.weak);
    d = d.mul(factor);
    push('tau', 'True Attribute Unbound', k.popup === 'superWeak' ? 'Super Weak Point' : 'Weak Point', factor);
  }
  const lateSum = t('dragonEye').add(t('partyDmg'));
  if (lateSum.compare(0)) {
    const late = ONE.add(lateSum.div(100));
    d = d.mul(late);
    push('late', 'Late bonus', `1 + ${lateSum.toString()}% (added together)`, late);
  }
  const damage = minD(DAMAGE_CAP, maxD(1, d.ceil())).toNumber();
  if (trace) steps.push({ id: 'final', label: 'Final damage', detail: 'Decimal ceiling, minimum 1, then damage cap', value: damage });
  return {
    damage,
    battleAtk: battleAtk.toNumber(),
    preBattleAtk: preBattleAtk?.toNumber(),
    attackValue: attackValue.toNumber(),
    effectiveDef: effectiveDef.toNumber(),
    matchup,
    stats,
    steps,
  };
}

export interface HitSummary extends HitResult {
  min: number;
  max: number;
}

/** Centre roll with the full trace, plus the lowest and highest variance roll. */
export function calculateHit(input: HitInput): HitSummary {
  const mid = computeHit(input, ROLL_MID, true);
  return { ...mid, min: computeHit(input, ROLL_MIN).damage, max: computeHit(input, ROLL_MAX).damage };
}

export const damageAt = (input: HitInput, roll: number = ROLL_MID) => computeHit(input, roll).damage;
