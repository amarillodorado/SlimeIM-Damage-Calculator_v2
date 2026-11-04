**Reference scope:** this document records the native client investigation. It is not a list of all features implemented by the website. Current supported paths and interface limitations are described in REQUIREMENTS.md and the in-app Guide. Historical numerical matches support their documented setups and do not establish the actual RNG draw or every unseen input.

# ISEKAI Memories damage recovery — supplied Android 5.0.20

The client **does calculate damage**. The recovered common attack kernel agrees algebraically with `0.2 × (2 × effective ATK − effective DEF)`, but the native code uses a different arithmetic sequence, multiple distinct pre/post-defense modifier families, special-hit transforms, and explicit rounding/caps. Treating every displayed buff as a multiplier on ATK is incorrect.

This report separates **confirmed in code**, **inferred**, and **not found**. It recovers the common Physics/Magic path and documents the other identified paths. It does **not** claim complete emulation of every condition, barrier, skill-validity rule or game mode. The Python API takes already-resolved stats/factors; remaining limits are listed below.

## Artifact identity and evidence conventions

**Confirmed in code/files:** package `com.bandainamcoent.tensuramrkww`, manifest `versionName=5.0.20`, `versionCode=66634`; Unity **2022.3.62f2** at `assets/bin/Data/globalgamemanagers+0x30`; ARM64 IL2CPP and metadata version31. The prompt's estimated4.0.4x is not the supplied build. Both supplied metadata copies are identical. There is no evidence here that older versions have identical coefficients or caps. See [artifact hashes/version evidence](tooling/ARTIFACT_VERSIONS.md).

Addresses in the reports are **ELF RVAs**, not live-process addresses. In this binary's `il2cpp` code section, file offset = RVA−0x4000. Other sections require the ELF segment mapping. Ghidra's import uses an image base of0x100000: its displayed address is RVA+0x100000. Initial exports with the wrong base are marked invalid and excluded. Sources are native ARM64 instructions, dumper names/signatures, and verified decoded tables—not the dummy DLLs' empty method bodies.

The four source APKs were extracted from the supplied XAPK. No game files were downloaded. [WORK_LOG.md](reports/WORK_LOG.md) records tools, failures, corrections and reproducible scripts.

Japanese mechanic names follow the request's terminology. The supplied localization tables are En/Fr/Ko/Zh; literal Japanese label-to-row matches were not independently verified. Native names, official English labels and numerical behavior are sourced separately.

## 1. Exact raw kernel and stat inputs

**Confirmed in code:** `Tempest.BattleDamageReceiveParam.GetATK`0xBC744C8, `GetAttackValue`0xBC80D3C, `GetDEF`0xBC7424C, `GetDamageValue`0xBC747CC. Detailed instruction RVAs: [CORE_DAMAGE.md](reports/CORE_DAMAGE.md).

Let `V(c,p)` denote the character's resolved integer value of `MasterParameterType p`. Let `N=10000`, `plus(x)=max(0,1+x/N)` and `minus(x)=max(0,1−x/N)`.

Before the kernel, the attack-value helper forms

\[
S=V_{\mathrm{effective}}(a,\mathrm{Attack})
 + C_{\mathrm{assist}} + K_{\mathrm{ownDEF}}
 +0.02V_{\mathrm{effective}}(buddy_1,\mathrm{Attack})
 +0.02V_{\mathrm{effective}}(buddy_2,\mathrm{Attack}).
\]

Absent buddies contribute0. Cooperation with an assist contributes `assistATK×0.4`, or `×0.55` for super cooperation. DEF-critical/堅閃 contributes `attackerDEF×0.4`, or `×0.55` for its super variant. These are **extra attack inputs**, in addition to the later cooperation/DEF-critical damage-power factors. Native helpers0xBC81194/0xBC814FC; numerical masters are `battle.defcritical.revision.value=4000`, `battle.super.cooperation.adjustment=5500`, `battle.super.defcritical.adjustment=5500`. See [SPECIAL_DAMAGE.md](reports/SPECIAL_DAMAGE.md), [MASTER_DATA.md](reports/MASTER_DATA.md).

Define

\[
E=S P_{300},\qquad A=E/3,\qquad D=V(r,\mathrm{Defense}) P_{400},\qquad R=k/10000.
\]

The exact native operation sequence is:

```text
if A != Decimal.Zero:
    q = (D / A) * Decimal(300)
else:
    q = Decimal.Zero
fraction = (Decimal(300) - q) / Decimal(1500)
adjustment = A * fraction
raw = (A + adjustment) * R
raw = max(Decimal.Zero, raw)
```

For nonzero A, the **inferred real-number simplification of that confirmed code** is

\[
raw=\max\left(0,(1.2A-0.2D)R\right)
   =\max\left(0,0.2(2E-D)R\right).
\]

The zero-attack branch returns0. Preserve the unsimplified sequence for finite-precision reproduction; the game uses `System.Decimal`, not ordinary binary32/binary64 arithmetic for this kernel. No integer rounding occurs inside these four helpers.

### The four multiplier families

**Confirmed in code:** these families have separate application points. Each applicable category within a family multiplies the others; values of the same parameter aggregate before conversion to a factor.

| Family | Typical IDs | Operation / position | Consumer |
|---|---|---|---|
| Attack power | physical300, magic301, single302, all303, attack elements309–316, enhanced1501–1507 | `plus(value)` products form P300, before DEF subtraction | `BattleCharacter.GetEffectRate`0xBC26C54 |
| Resistance increasing DEF | physical401, magic402, single403, all404, elements410–417, enhanced1508–1514 | `plus(value)` products form P400, multiplying DEF | `GetResistRate`0xBC27120 |
| Damage power | physical500, magic501, single502, all503, elements508–515, enhanced1515–1521 | `plus(value)` products after raw kernel | `GetDamageEffectRate`0xBC24FAC |
| Damage resistance | physical600, magic601, single602, all603, elements608–615, enhanced1522–1528 | `minus(value)` products after raw kernel; special616 has its own eligibility | `GetDamageResistRate`0xBC264F4 |

Counter parameters306/407/506/606 apply for qualifying counter triggers. Target and attack-type predicates select a single/all and physical/magic factor as applicable. Ordinary-element and enhanced-element factors are **separate products**. Extra postkernel factors include damage against receiver conditions1200–1202 (one additive condition factor), receiver-element1300–1306/1810, and receiver-element/attack-type weakness1307–1315. Full ID tables and native lookups are in [PIPELINE_REFINEMENTS.md](reports/PIPELINE_REFINEMENTS.md).

**Not found:** a separate MDEF base-stat parameter in this damage path. Both physical and magical hits read `Defense=2`; their different resistance/damage-resistance factors are separate. This does not imply identical damage against every physical/magical target.

### Same-type stat buffs and their rounding

**Confirmed in code:** `BattleCharacterParameter.GetValue`0xBC394D4 adds base, equipment, normal buffs, receiver-element buffs and floor buffs. Valid same-parameter entries use the original base; each delta is calculated and rounded before summation. `CalculateTargetBuffsValue`0x61A28C4, `CalculateBuffValue`0xBC3ACA0, `CalculateCeilingValueRate`0xB3A03A8 establish:

```text
C(value, bp) = ceil(value * bp / 10000)
Ratio entry delta = C(originalBase, V + C(V, conditionalMagnification))
Value entry delta = V + C(V, conditionalMagnification)
effectiveStat = base + equipment + sum(each valid entry delta) + other stat deltas
```

HP is at least1; ATK/DEF are at least0. Specialized executor-scaled and some condition-damage effects have additional branches. For example, baseATK1001 plus two distinct valid10% Ratio entries yields1203; one20% entry yields1202. This is a **derived example**, not an observed battle.

The aggregation loop does not split skill/trait or temporary/infinite sources. **Not established universally:** whether every displayed pair survives upstream merge/replacement/validity rules as two simultaneous entries. Thus the community's grouping is supported at the valid-entry sum stage, with a per-entry rounding qualification.

## 2. Exact common attack-path order

**Confirmed in code:** enclosing method `BattleDamageReceiveParam.CalculateAttackDamage`0xBC6F434. This is the source of the order below. Each named helper is expanded in the linked reports; a helper boundary is not a claim that all of its eligibility rules have been emulated in Python.

```text
variance = GetRandomRate(Damage RNG stream9)          # drawn before the other rolls
create Damage; initialize HP/SP and effect flags
roll cooperation / super cooperation and DEF-critical / super DEF-critical if allowed
D = receiver.Defense * receiver.GetResistRate(...)
A = GetAttackValue(...) * attacker.GetEffectRate(...) / 3
d = GetDamageValue(A,D,variance)
d = OverrideSkillEffectDamageValue(d, forSameParty=false)
d *= attacker.GetDamageEffectRate(...)
d *= receiver.GetDamageResistRate(...)
d = GetConditionDefense(d, receiver)
d = GetComboDamageValue(d, cardAttackType, attacker)
roll critical / supercritical if allowed; d *= chosen critical factor
roll guard / superguard if allowed; d *= chosen guard factor
d *= clamp0((10000 + adjusted(BuffAttack + eligible BuffAttackUltimate))/10000)
d = GetSkillEffectValue(d, skillEffectAttack, increaseValue, ...)  # multiply or replace
d *= eligible BuffAttackWhole factor
d *= eligible subsequent-hit distribution factor
if supercounter: d *= GetSuperCounterRate(...)
roll penetration / superpenetration if allowed; d = chosen penetration transform(d)
if cooperation and assist exists: d *= chosen cooperation factor
if DEF-critical: d *= chosen DEF-critical factor
resolve base affinity, overrides and Weak/SuperWeak classification
d *= GetElementCoefficient(...)
if SuperWeak and applicable field effect: d *= its rate
if pursuit effect applies: d *= clamp0(pursuitValue/10000)
if qualifying ultimate enhanced-element weakness: d *= its coefficient
d *= shared late damage-multiple group
if same-party branch: d = OverrideSkillEffectDamageValue(d, forSameParty=true)
d = CalculateElementHPBarrier(d, ...)
d = GetFinalDamageValue(d, ...)
ExecuteAbsorbDamageIfNeeded(ref d, ...)
ExecuteAddHealingAttackBuffIfNeeded(...)
Damage.SetValue(d, flags, battleManager)             # global cap and blocking
```

Heal, special-point, condition damage and system-effect branches do not automatically use this entire pipeline. Master base type `AttackerNoBuffValue=1` bypasses attacker buff components at specified getters. Skill `Fix=1` replaces the preceding damage with the skill value; ordinary `MultiByCharacterAttack=0` multiplies by `(Value+increase)/10000` and then invokes active-skill correction. Receiver-HP-ratio attacks use the early/late override helper. See [MAIN_PIPELINE.md](reports/MAIN_PIPELINE.md), [FINALIZATION.md](reports/FINALIZATION.md), [PIPELINE_REFINEMENTS.md](reports/PIPELINE_REFINEMENTS.md).

The late group selects the first eligible DragonEye73 and first NewLordAmbition78 conditions, plus applicable party damage-rate and skill-chain factors. It forms `1 + sum(factor_i−1)`, **not their product**. DragonEye/NewLordAmbition are omitted for pursuit and Active skills. Multiple copies are not summed by this first-match selection.

Three further branches are **confirmed in code** and expanded in [BARRIER_AND_SKILL_BRANCHES.md](reports/BARRIER_AND_SKILL_BRANCHES.md):

- `GetCorrectionActiveSkillDamage`0xBC81E6C applies a separate0.9 multiplication immediately after ordinary skill-power multiplication for qualifying PvP active-damage effects against the other party (receiver Ally0/Enemy1). It tests the effect's `IsActiveDamageSkill` flag; Fix skills bypass it.
- `GetUltimateEnhancedElementWeaknessCoefficient`0xBC79C34 returns `(10000+1000+statusboardAttributeEnhancement8+attacker318−receiver419+[SuperWeak?1000:0])/10000` for Weak/SuperWeak, otherwise1. It is separately gated by the attacker's `IsEnableUltimateEnhancedElement` state, not merely an enhanced element enum. No local zero clamp is applied.
- `CalculateElementHPBarrier`0xBC7A0B8 runs before final ceiling. A matching primary/added element consumes `max(1,Int64(Ceiling(d)))` barrierHP, clamped at0, while returning HP damage d unchanged. A nonmatching hit returns `d−d*(condition.value/10000)` without consuming barrierHP or a local zero clamp. The ordinary main call passes false for forced-weakness override. No barrier, depleted barrier or blocked/evaded attack bypasses this arithmetic. The Python helper supports the arithmetic with resolved element matching and returns the barrier's afterHP/state separately.

**Confirmed in code:** after finalization, absorption can replace the stored hit with **healing**, rather than negate the same damage. `ExecuteAbsorbDamageIfNeeded`0xBC7A8D0 requires the entry's `afterHp>=1`, absorption enabled, and Physics/Magic type. A nonzero threshold requires strict `d < maxHP×condition.value/10000`; threshold0 bypasses that test. It replaces d with `maxHP×condition.value2/10000`, changes type to Heal2, and performs no second ceiling. Updated Heal type bypasses later physical miss/invincibility zeroing and follows the healing-block branch instead. The supplied absorption effect has threshold0 and value2=500 (5%maxHP). [ABSORPTION.md](reports/ABSORPTION.md) gives all RVAs, gates and the actual table row. The model supports this with resolved condition/HP inputs; its scalar is a stored value, not automatically an HP-loss amount.

## 3. Critical, penetration, cooperation and DEF-critical

**Confirmed in code:** use signed aggregate values in basis points. Let p/r be the power/resistance pair.

| Mechanic | Regular expression | p / r IDs | Method RVA |
|---|---|---|---|
| Critical | `max(0,(13000+p−r)/10000)` | 304 / 405 | `GetCriticalRate`0xBC75FC4 |
| Penetration | `(d + Decimal(double(V(a,Attack))*0.06)) × max(0,(10000+p−r)/10000)` | 305 / 406 | `CalculatePenetrationDamageValue`0xBC77B64 |
| Cooperation / Synergy | `max(0,(10000+p−r)/10000)` | 317 / 418 | `CalculateCooperationDamageRate`0xBC7855C |
| DEF-critical / Aegis | `max(0,(10000+p−r)/10000)` | 319 / 420 | `CalculateDefCriticalRate`0xBC78EAC |

Power UP and corresponding resistance DOWN add within these rates. The penetration addition is made **after** earlier skill/combo/crit modifiers, before its own rate, and **after** raw DEF subtraction/RNG. The code does not replace the ordinary kernel with a general “ignore all DEF” formula. Its additive term is unaffected by the earlier variance/crit/skill multipliers.

For super variants, obtain separate Positive/Negative getter contributions and define `Ap=max(attackerPositive,0)`, `An=min(attackerNegative,0)`, `Rp=max(receiverPositive,0)`, `Rn=min(receiverNegative,0)`. For super cooperation and super DEF-critical, the supplied masters reduce the rate to

\[
\max\left(0,\frac{10000+1.2(Ap-Rn)+An-Rp}{10000}\right).
\]

Super penetration uses that same form for its305/406 pair and transforms `(d+V(a,Attack)×1.0)×rate`. The 1.0 is the supplied `battle.super.penetration.adjustment=10000`; regular penetration's0.06 should not be reused. Super cooperation/DEF-critical also change their added ATK input from40% to55%, as described above. Sources: helpers0xBC77384/0xBC77E9C/0xBC787EC and [master rows](reports/MASTER_DATA.md).

Only the favorable `Ap−Rn` term is amplified by1.2; power debuffs and resistance buffs are not universally scaled by1.2.

**Confirmed in code and newly supplied master data:** supercritical `GetCriticalSuperRate`0xBC759EC uses

`max(0,(15000 + (Ap−Rn)×13000/10000 + An−Rp)/10000)`.

Its keys `battle.rate.critical.common.coefficient` and `battle.rate.critical.up.effect.coefficient` come from `MasterBattleDefineValue` through `BattleDefineValue.GetLong`. The user-supplied, hash-verified cache payload contains row8700000008 at decoded offset0x1d4 with15000, and row8700000009 at0x16c with13000; both carry release label `3.0.20_system_common`. The base is therefore1.5 and favorable Critical Power UP / Critical Resistance DOWN contributions are scaled by1.3. Negative power and positive resistance remain outside that scaling. Super Critical replaces ordinary Critical. [Full payload and native evidence](validation/supplied_shared_recovery/supercritical/RECOVERED_SUPER_CRITICAL.md).

Other fixed factors confirmed in code: guard `(5000+p307−r408)/10000`, superguard `(1000+p308−r409)/10000`, supercounter `(20000+p306−r407)/10000`, all clamped nonnegative; combo types Retsu/Sou/Zetsu use1.1/1.5/2.0 plus the applicable801 bonus. [SPECIAL_DAMAGE.md](reports/SPECIAL_DAMAGE.md) gives exact operand roles and instruction addresses.

**General combo selection confirmed in the Pic3 follow-up:** only the last attackable normal card receives a finisher: four selected cards→Retsu1.1, five→Sou1.5, six→Zetsu2. Selected secret skills count toward these thresholds. Chains of one–three cards retain1.0 and no buddy ATK contributions. Parameter801 is added only if the base finisher factor exceeds1; card position alone does not enable it. The displayed chain BONUS uses a separate gauge-point family (three cards1.10) and must not be copied as the damage factor. Full selection/pseudocode/RVAs: [COMBO_CODE.md](validation/pic3/COMBO_CODE.md).

**Roster versus conditional EX parameters confirmed in the Pic3 follow-up:** the character-page aggregate is `PcParameter.total`; `PartyMainParameter.CalculateTotal` separately adds `ExStatusboardParameter` at0xAE23EFC. Formation-dependent CharacterIdGroup EX abilities query the party's main characters and add the panel parameter value at0xB3734C0. Do not add equipment again on top of the displayed aggregate, but do add a qualifying separate EX contribution. [CRITICAL_SOURCE.md](validation/pic3/CRITICAL_SOURCE.md) gives the general pipeline and all activation branches inspected.

## 4. Affinity, weakness, guide-related effects and cards

**Confirmed in code and supplied tables:** natural weakness coefficient1.5; resistance0.7; neutral1.0. `MasterElementTypeExtension.GetCoefficient`0xAD5372C, `MasterBattleConfig.element_week_effect=15000`, `element_resist_effect=7000`.

The ordinary cycle is Earth→Space→Wind→Water→Fire→Earth; the reverse adjacent matchup resists. Light/Dark are mutually weak without corresponding resistance. Enhanced elements use their base group for matchup classification. Time has a separate code branch. Added elements are combined by the classifier, not by multiplying independent affinity factors; a distinct added element can remove a primary resistance. Full chart and edge conditions: [PIPELINE_REFINEMENTS.md](reports/PIPELINE_REFINEMENTS.md).

On **actual natural WeekType1**, an enhanced attack adds0.1 (`battle.rate.enhanced.element.add.weak.damage=1000`) and an Epic effect adds its provided rate or fallback1.4 (`battle.rate.epic.add.weak.damage=14000`). A forced-weak override can select the1.5 base without passing the natural-weak gate for those additions. Do not give every forced weakness the enhanced/Epic additions.

Let Eaff be that base affinity and Q be the attacker factor against the receiver's element (1300–1306/1810), already multiplied in the postkernel damage-power stage. For Weak/SuperWeak:

\[
C=\max\left(0,Eaff+\frac{a_{1400}-r_{1401}}{10000}\min(1/Q,1)
    +\mathbf1_{SuperWeak}\frac{a_{1402}-r_{1403}}{10000}\right).
\]

The complete pipeline multiplies **Q earlier and C later**. For Q≥1, absent clamping, ordinary weakness simplifies to `Q×Eaff + (a1400−r1401)/10000`; this is not a universal sum of all affinity/guide/weakness percentages. The helper actually divides by Q; no invented Q=0 fallback is supplied. Source `GetElementCoefficient`0xBC7953C.

The precise Japanese 加護の導 label-to-field association remains unverified. `Pc.EpicAddWeakDamageRate` is a confirmed affinity input; receiver-element Q is a separate confirmed input. They must not be treated as interchangeable merely because a community description uses “guide.” Particular subsets of these terms are additive, as the equations show.

Card `BuffAttack=0` and eligible `BuffAttackUltimate=8` values combine before one conditional card-power factor. `BuffAttackWhole=11` is a separate later factor. Subsequent hits with `BuffMultipleHit=12`, index i>0 and total N, use `max(0,(1+b/10000)/(N−1)+T[i])`, with `T=[0,.01,.016,.024,.026,.03]`. Pursuit skips this distribution; invalid indices are checked. `BattleDamageEngineConfig..cctor`0xBC614DC supplies T, not a master table.

## 5. Constants, rounding, clamps and RNG

All rows here are **confirmed in code**, with numerical master values from verified payloads where noted.

| Item | Exact behavior/value | Source |
|---|---|---|
| Raw kernel | divisor3, ratio coefficients300 and1500; clamp raw≥0 | `GetATK`0xBC744C8; `GetDamageValue`0xBC747CC |
| Damage RNG | integer k in `[9900,10100)`, rate k/10000; 200 points0.9900…1.0099 | `GetRandomRate`0xBC72DFC; `CountNextRandom.GetRandomRate`0xBA95A90; `System.Random.Next`0x9B47264 |
| Proc RNG | chance≤0 false, ≥10000 true; otherwise `Next(0,10000)<chance`; extreme cases draw no RNG | `CountNextRandom.isHit`0xBA95A34 |
| Buff delta | individual ceilings, then summation against original base | `CalculateCeilingValueRate`0xB3A03A8; `CalculateBuffValue`0xBC3ACA0 |
| Final ordinary attack | Ceiling(d), then max1, then positive skill-specific max if present | `GetFinalDamageValue`0xBC7A48C |
| Same-party Active/Special | if damage≥currentHP, replace withHP−1 after prior minimum; can yield0 | same helper |
| Global cap | normal/high both500,000,000,000 in supplied snapshot | `GetDamageLimit`0xBC9CC28; Define IDs7000022030/2031 |
| Storage lower bound | −2147483648; miss/invincibility/multi-block can then force0 | `Damage.SetValue`0xBC6CED8 |
| Stored type | Decimal, not integer | `SetValue`, 16-byte write at0xBC6D250 |
| Applied physical/magical HP loss | Decimal→Int64 truncation toward0, then negative HP delta; HP bounded separately | `GetAddDamageValue`0xBC6B5DC; `SetAfterHp`0xBC6BFB4 |
| Floating damage text | Ceiling for nonnegative, Floor for negative, then Int64 | `UIBattleDamagePresenter.<playDamage>.MoveNext`0xB94ADAC |
| LongRound utility | nearest integer, midpoint away from0; only at its actual callers | `MathExtend.LongRound`0xA0F5A4C |

Final ordinary damage is usually already integral, so display and HP loss agree. **Inferred observable consequence:** if a separate later branch leaves a positive fraction, floating text can show its ceiling while actual HP loss truncates. No live fractional-hit observation was supplied. [FINALIZATION.md](reports/FINALIZATION.md) traces both consumers.

## 6. 来撃 / FutureAttack and other damage paths

**Confirmed in code/master:** FutureAttack is separate from the ATK−DEF kernel:

\[
D_{future}=\operatorname{clamp}\left(\left\lceil V(affected,Attack)\times0.5\times stacks\right\rceil,0,99{,}999{,}999\right).
\]

There is no DEF or random draw in `CalcConditionDamageValueForFutureAttack`0xBC7D6E4. Its activation helper computes `clamp(5−currentTotalTurn,0,5)` and permits damage when that result<1; the exact scheduled turn phase should be checked separately rather than translating this automatically to “turn6.” Stack limit99 and consumption0 are supplied master values. Immunity and condition-resistance gates are separate. Official English localization is **Vengeance**. Association with the user's Japanese 来撃 term is **inferred** because the supplied localization set has no Japanese text. Sources and rows: [FINALIZATION.md](reports/FINALIZATION.md), [MASTER_DATA.md](reports/MASTER_DATA.md).

Burning, poison, divine punishment, despair, healing attack, JudgmentHour and HP-ratio effects have separate helpers. The generic condition-damage resistance617 applies only to a selected set of condition-damage types and has its own minimum1 branch. Charm-conditioned incoming damage defense1804 shares an additive condition-defense coefficient with the recognized other condition-defense types. These paths are documented where traced; the common-hit Python function does not pretend to implement all of them.

## 7. Complete supplied buff table

Every one of the **13,955 supplied MasterBuffEffect rows /110 actual parameter types** is represented in:

- [buff_groups.csv](buff_groups.csv): one row per actual parameter type, group, arithmetic, stage, exact method/RVA or table field, status and unresolved details.
- [all_buff_effect_rows_with_groups.csv](all_buff_effect_rows_with_groups.csv): every effect record joined to its group, preserving ID, signed value, ValueType, timing, growth, caps, target, source offset and official English name.
- [BUFF_GROUPS.md](reports/BUFF_GROUPS.md): readable complete table and coverage counts.

All110 IDs now have a **native-confirmed group, consumer or flag assignment**. This is not a claim that every subsystem's complete numerical behavior is solved: unresolved columns retain HP/cure arithmetic, replay eligibility and upstream validity. Super Critical's two coefficients are now recovered from the separately supplied cache table. Some rows concern resource/cost or conditional-application systems rather than a direct damage multiplier. Existence/identity of all rows is table-confirmed. `MasterBuffType` means Buff/Debuff/Remove; it is not a list of mechanical power IDs. Four Remove records target removal and must not automatically be summed as scalar buffs. Card/condition/system effects have separate tables and do not all appear in MasterBuffEffect.

## 8. Comparison with the supplied AppMedia hypothesis

| Hypothesis | Finding / status |
|---|---|
| `(2×ATK−DEF)×0.2` | **Matches algebraically** for nonzero effective ATK after the actual input modifiers. Native order is the unsimplified Decimal calculation above. |
| ±1% variance | **Nearly matches:** exact grid0.9900…1.0099, upper1.0100 excluded. It occurs in the raw kernel, before penetration's additive term. |
| Different categories multiply | **Supported for the traced categories**, with distinct pre-DEF ATK, pre-DEF DEF, postkernel damage-power and damage-resistance families. Several explicitly additive card/late/condition groups are exceptions. |
| Same-category values add first | **Valid-entry contributions add**, but Ratio stat entries can ceil individually before summation. Upstream replacement/validity can affect coexistence. |
| Timed/infinite and skill/trait combine | The common sum loop has no such source split. **Universal pairwise coexistence is not established** by that loop alone. |
| 奥義/極奥義 soul-power UP add | **Supported** by card BuffAttack0+eligible BuffAttackUltimate8 before the shared factor. Applicability follows card type and conditions. |
| Crit powerUP + crit resistanceDOWN add; similar special pairs | **Confirmed** for the regular critical/pierce/cooperation/DEF-critical power factors. Super variants split signed contributions. |
| All weakness/affinity/guide bonuses form one additive group | **Not established as a universal rule:** native uses additive Eaff inputs, an earlier receiver-element Q factor, and inverse-Q normalization. The exact Japanese guide-label mapping is not independently verified; the recovered field-level equations are above. |
| Pierce ignoresDEF | **Not a universal DEF bypass:** the normal kernel still includesDEF; a later ATK-based term has no DEF subtraction. |
| Super cooperation multiplies both power/resistance by1.2 | **Qualified:** only favorable powerUP/resistanceDOWN contributions are amplified; adverse terms stay outside. Super assist contribution is55%, versus regular40%. |
| 来撃50% per charge afterturn5 | **50%, stack/cap and activation parameter5 confirmed**. Affected character's ATK is used; exact turn phase follows the condition scheduler. |

This compares with the hypothesis supplied in the request; it does not assert that a currently published wiki page uses identical wording.

## 9. Python implementation and examples

[damage_formula.py](damage_formula.py) implements the recovered common Physics/Magic factor sequence, raw kernel, special-rate helpers, common stat buffs, attack additions, final rounding/caps, fixed-skill replacement, resolved HP-base overrides, elemental-barrier arithmetic and absorption conversion. It includes helpers for weakness normalization, ultimate enhanced weakness and FutureAttack; a qualifying active-skill correction is a separate factor operation. [clr_decimal.py](clr_decimal.py) models signed96-bit coefficients with scale0…28 and nearest-even scale reduction. Inputs are resolved stats/factors and applicability, not arbitrary unit/skill IDs.

```python
from damage_formula import Hit, calculate_damage
damage = calculate_damage(Hit(10000, 5000,
    factors={"critical": "1.3"}))  # 3900
```

**Derived model examples**, with roll10000 and all unlisted factors1; these are not observed game battles:

| Inputs | Output |
|---|---:|
| effective ATK10000, effective DEF5000 | 3000 |
| effective ATK15000, effective DEF5000 | 5000 |
| first example, regular critical factor1.3 | 3900 |
| first example, pierce addition600 and pierce rate1.5 | 5400 |
| first example, skill4.75×, combo1.5×, affinity1.5× | 32063 |

Twelve targeted tests passed. A deterministic254-case comparison with real .NET System.Decimal produced **zero numerical mismatches** for the raw kernel, final ceiling/minimum and tested normal-pierce double conversion, over input magnitudes through10^12. See [decimal_validation.json](validation/decimal_validation.json) and the reproducible oracle script. This is not proof of every CLR extreme/overflow behavior or an in-game end-to-end validation. Normal-pierce's binary64 cast helper documents its tested domain; the exact converted Decimal can be passed directly.

**Subsequent in-game check:** the user's supplied Milim screenshot shows 340,865. With equipment Pierce Power +12%, the model produces exactly 340,865 at permitted roll 0.9923, with range 340,082–346,863. The user subsequently explicitly confirmed exactly +12% Pierce Power, not Pierce Rate, with no other Pierce Power bonuses; this is user-confirmed input rather than an independently visible or code-confirmed loadout stat. True Attribute Unbound 1.3 is included once; the user confirmed the normal 600% skill, not 1.8× Ultimate. The actual RNG draw remains unknown. [SCREENSHOT_CHECK.md](validation/SCREENSHOT_CHECK.md) contains the complete calculation, source images and remaining setup qualifications. A native recheck also corrected an inherited source label: synergy uses the support's `total`, not `baseParameter`; its 40% arithmetic is unchanged.

## 10. Client/server conclusion and remaining gaps

**Confirmed in native code:** the client derives damage locally, computes HP deltas, collects totals, serializes battle action history and sends finish requests. Start data supplies RNG seeds. For example, `BattleState.<RequestQuestFinishAsync>.MoveNext`0xB50C0F8 calls local total getters, `BattleActionTableManager.ToJson`, then `QuestDomainService.RequestFinishQuestAsync`; applied HP is copied by `BattleCharacter.SetCurrentHp`0xBC214D0. [CLIENT_SERVER_EVIDENCE.md](reports/CLIENT_SERVER_EVIDENCE.md) gives individual call-instruction RVAs and protocol field offsets.

**Not found:** server implementation or proof of its validation/re-simulation rules. Uploading totals/history supports the possibility of validation; it does not establish its exact policy. The damage formula is not merely an opaque server result displayed by this client.

Remaining explicit limits:

1. The previously missing Super Critical coefficients are resolved:15000 and13000 in the verified supplied `MasterBattleDefineValue` table. Their live release-filter state has not been directly captured; table rows and native lookup/consumer behavior are confirmed separately.
2. The base bundle's large `catalog.bytes` has been decoded and its embedded SHA-256 verified. The user subsequently supplied both identified cache payloads: `MasterBattleDefineValue` matches the original catalog hash, while `MasterPcEnhancedElementOverride` is a newer content hash. The enhanced table has475 parsed rows with `EpicAddWeakDamageRate` values0,1000,4000; resolving the correct character/level override and eligibility remains necessary before applying a particular row universally.
3. Upstream buff merging/replacement/coexistence and release-label filtering have not been exhaustively emulated. Supplied table values are a snapshot, not proof that every row is active in every battle.
4. The common-hit Python API does not resolve barrier condition selection/element matching, absorption eligibility, all condition/system damage formulas, skill growth/correction eligibility, or battle scheduling. Barrier arithmetic is implemented with resolved inputs; other identified helper positions and remaining limitations are recorded. Do not use it as a complete battle simulator.
5. One supplied battle hit now has an exact reproduction using user-confirmed equipment Pierce Power, described above. Other stated setup qualifications remain, and the actual RNG draw was not extracted. More independently recorded builds/hits are needed to validate other branches. [IN_GAME_TEST_PLAN.md](IN_GAME_TEST_PLAN.md) isolates the remaining coefficients and checks the recovered rules without downloading other clients.

The complete source trail is the reports, annotated native disassembly, verified table exports, dumper output and saved Ghidra project under `analysis/`. Claims above should be read at their stated scope rather than as a claim that every game mechanic has been fully recovered.
