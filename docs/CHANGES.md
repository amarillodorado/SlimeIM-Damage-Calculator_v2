# Setup labels — version 6.5.1

- Renamed numbered calculator entries and their add, duplicate, remove, total, guidance and Teams references to Setup. In-game hit terminology and saved-data fields are unchanged.

# Recovered Super Critical constants — version 6.5.0

- Decoded the newly supplied official MasterBattleDefineValue table and verified its embedded SHA-256. Super Critical now uses its confirmed base 1.5 and favorable-bonus scale 1.3 automatically.
- Removed manual Super Critical coefficient controls and required-field prompts. Old saved/share coefficient overrides are superseded by the recovered constants while preserving outcomes, signed buff sources and other setup values.
- Retained separate positive and negative effect entries: Super Critical amplifies favorable bonuses by 30%; Super Pierce, Synergy and Aegis amplify them by 20%.
- Confirmed the tested Epic Milim enhanced override supplies a 40% Ultimate affinity addition. It remains editable because other characters/upgrades can differ.
- Preserved the supplied repository's analytics code and dependency. Native RVAs, table row IDs/offsets and payload hashes are recorded in MECHANICS_6_4.md.

# Confirmed damage families — version 6.4.0

- Restored Super Critical as an explicit outcome. Its recovered formula replaces ordinary Critical, preserves signed sources and requires two verified manual multipliers because the live defaults remain unresolved. Missing values block calculation instead of assuming another mechanic’s constants.
- Added separate matching “+” ATK, damage, resistance and damage-resistance effect fields for all seven attributes. They multiply independently after their ordinary counterparts and do not apply to ordinary attacks.
- Clarified “all enhanced attribute damage resistance” and “all targets”: use the matching “+” damage-resistance field once; enemy application scope does not imply an AoE-only attack restriction.
- Preserved the newly supplied repository changes, including its analytics implementation and dependency. Saved setups and provider files support the new effect IDs.
- Documented the native RVAs, official master/localization sources, tools used and actual REA 6.8.0 trial limits in MECHANICS_6_4.md.

Validation: 160 tests, TypeScript and production build passed. Browser verified the four Dark+ inputs, their absence for ordinary Dark, blank/required Super Critical coefficients and release of those fields when Critical is off.

# Provider backups — version 6.3.0

- Added Import providers and Export providers in Teams. JSON imports validate the whole file, add new IDs, update matching IDs and preserve unrelated entries; reimporting a file avoids duplicate entries.
- Providers now save immediately in browser storage with accurate success/failure feedback. Leaving Teams or reloading preserves the saved list.
- Aligned editor, storage and file limits; preserved full 60-character names and signed decimal effects, and repaired duplicate stored IDs.
- Documented portable backups, formats, limits and storage belonging to the current browser and website address.

Validation: 130 tests, TypeScript and production build passed. Browser verified real JSON import/export, retention of existing providers, signed/scoped effects and restoration after reload.
## Dynamic combination-rules sentence — 2026-11-03

- The Combination rules summary now updates from the selected provider count and skill-point limit, including singular/plural wording and the unlimited case.
- Kept exactly one dynamic summary sentence and one separate general explanation sentence. Combination selection and damage calculations are unchanged.

## Teams explanation — 2026-11-03

- Clarified the workflow: fix one attacker, enemy and soul attack in Calculator, then compare combinations from a pool of buff providers. Only the fixed attacker’s selected attack is scored.
- Explained that combinations use exactly the selected number of distinct providers. The skill-point limit is an upper bound, not a requirement to spend every point; 0 means unlimited.
- Clarified each provider’s complete effect set and total entered skill cost, shared base effects, ranking order and the absence of automatic individual-skill or repeated-use optimization. Calculation behavior is unchanged.

## Weakness result label — 2026-11-03

- Renamed Popup on the hit to Weakness result in the selector, accessible name, required-input messages and help directions.
- Updated True Attribute Unbound instructions and Guide references to use the selected weakness result. Damage logic and saved input keys are unchanged.

## Weak Point explanation — 2026-11-03

- Added the attribute-side and matching Physical/Magic weakness conditions to the field help and Guide, including a conditions table and official guide link.
- Added the reported magic Milim example: an applicable damage-to-Wind protection bonus against a Wind enemy weak only to Physical gives Weak Point. Super Weak Point also requires Magic weakness.
- Clarified that weakness results do not replace the natural base attribute multiplier. The selector label and damage calculation are unchanged; Weakness result is proposed as a clearer label.

## Soul Combos heading — 2026-11-03

- Named the normal-soul combo selector Soul Combos, including required-input messages, the calculation trace and Guide references.
- Clarified: choose None for 1–3 soul combos and for souls that are not finishers. Individual attacks remain souls.

## Soul terminology — 2026-11-03

- Renamed the normal-soul chain selector to Soul, with 4 souls / 5 souls / 6 souls options.
- Standardized player-facing labels, help, validation, traces, summaries, Guide captions and active usage documentation on soul/souls. Normal soul and Damage % on the soul replace the previous terms.
- Character support portraits and website sections are described by those names. Calculation logic and saved input keys are unchanged.

## Remove orb position — 2026-11-03

- Removed the optional Orb position control, its tags and trace labels, and automatic position changes when copying a hit. Combo finisher and its damage calculation remain unchanged.
- Removed obsolete position help and data fields. Older saved setups and share links still load; their unused position value is ignored.
- Single/AoE behavior is unchanged: switching it alone does not change Calculator damage; it changes target-specific field labels and filters applicable buffs in Teams. Ordinary normal orbs use Single.

## Wording clarifications — 2026-11-03

- Clarified that Troop ATK is the combined lineup total, including the protector’s flat ATK contribution; Divine Protection’s percentage ATK boost is entered separately. Updated the shared help and Guide consistently.
- Removed the inline Magic Attack Resistance requirement explanation. The used badge, validation and help remain available.
- Target and optional orb-position controls are unchanged. Ordinary player orbs use Single; orb position labels the hit and does not determine its damage or combo-finisher factor.

# Interface and guide — version 6.2.3

- Special hits in the Attack card show only their switch and, while on, their power and resistance fields. The formula texts with example values were removed; Guide → Popups & special hits explains each special hit.
- The resolved attribute factor is a single line under the matchup selector, for example “= 1.5 + 0.1 (Dark+) + 0.4 (Ultimate) = ×2”.
- New Guide section “Two ways to collect the values”: battle screens versus pre-battle screens, what the battle screens never show, and a worked example of a real hit (4,134,209) with the source of every input. The ATK section shows a real base (14,689 + 92% = 28,203).
- Guide figures are crops of the 2026-11-02 screenshots and keep their own aspect ratio. Unused older figures were removed.
- The Ultimate bonus vs. weak attributes starts at 40% again: it matched both recorded Ultimate hits on a weaker attribute exactly. Missing or invalid saved values also become 40%; the field still has to be confirmed. The 140% client fallback is no longer mentioned in the app.
- “Damage % on the card” shows one hint instead of two (only the required-input message remains). Removed the “Based on client 5.0.20 …” footer line.
- Pre-battle ATK starts from one value: the ATK under the character on the troop screen (Status Attributes), which already contains equipment, the support character and EX abilities, but not the Divine Protection’s ATK boost. Character ATK, Add support ATK and flat ATK are gone; Support character ATK only appears for Synergy. Older pre-battle setups ask for the troop ATK once.
- Pre-battle ATK: one “Increased ATK %” field for all lines added up (Divine Protection, supporting protections, protection skills, traits); only Super hits keep separate UP/DOWN rows. The game adds the % and rounds up once: 14,689 + 92% = 28,203 and 14,689 + 70% = 24,972 fit only that way, so older separate ATK rows are now added before rounding.
- Guide: the troop screen’s Status Attributes (troop ATK) and Skills (enchantments, EX ability effects and traits in tabs), with a new figure.
- Required-input messages keep ATK and DEF in capitals (“Enter a valid troop ATK.”). The header shows v6.2.3.

Validation: 108 tests, TypeScript, ESLint and production build passed.

## Version 6.2.2 — calculation corrections

- Clarified Base attribute matchup versus Resolved attribute factor. The latter uses the same exact Decimal helper as the engine and shows the additive contributions.
- Removed the140% Ultimate prefill. The addition starts genuinely blank/unknown; a naturally advantageous supported Ultimate requires a supplied value. Saved explicit40/140 entries are preserved.
- Documented enhanced normal advantage1.6, the resolved40% Ultimate example2.0, and the140% fallback example3.0. No universal40% or fixed2.0 advantage is assumed.
- Rechecked the official native path and master fallback:14000 is raw data added as1.4, with no hidden−1 or overall cap2. Actual per-character4000 data remains unrecovered; the measured Milim value is supported by observations.

Validation:108 tests, TypeScript, ESLint and production build passed. Tests cover unknown/blank input, saved values, exact factor components and unchanged recorded damage cases.

## Version 6.2.1

- Do not offer Confirm value for an invalid number. A secret-skill percentage of0 now asks explicitly for a percentage above0; valid typed entries confirm automatically, while valid saved values can still be confirmed without retyping.
- Present the secret-skill version before its percentage, with an explanation that the selection does not multiply the percentage again. Changing version still clears the old percentage to prevent reusing the wrong card power.
- Explain beside the active enemy resistance why it is required: Magic attacks use Magic Attack Resistance, Physical attacks use Physical Attack Resistance, and a known0% is valid.
- Expand Guide → Where to find values with a prominent explanation of modifiers missing from the battle Effect List, source locations and the roster aggregate + separate qualifying EX + active-effect recipe. Clarify which ATK/DEF contributions are already included in battle totals.

Validation:92 automated tests, TypeScript, ESLint and production build passed. Regression cases cover invalid0% power and confirmation of a valid saved600% power.

## Version 6.2

- Added Highlight required inputs, enabled by default. Required choices can be confirmed by clicking the already-selected option. Numeric values distinguish an unanswered default from an explicitly confirmed zero.
- One shared requirement definition drives field highlights, calculation availability, real-hit checks, totals and Teams comparisons. Synergy requires support ATK; Aegis requires own DEF; TAU requests only its applicable factor. Turning highlighting off preserves validation.
- Results list missing inputs and provide links that open/focus the relevant field. A complete-looking multi-hit total is withheld until every hit is complete.
- Removed Super Critical from the controls; its unsupported status remains documented in the Guide.
- Normal orbs use the100% baseline automatically, with an optional advanced override. Switching from secret skill to ordinary orb resets the power; changing secret version requests its actual percentage again.
- Replaced manual combo percentages with the native finisher choices. The two buddy ATK contributions are gated to eligible five/six-card finishers, including when old values remain saved.
- Confirmations and the visual preference persist with the workspace. Existing values are retained for review; no examples are added. Share links now preserve separate calculation sources and confirmations.
- Teams checks prerequisites introduced by providers and exposes the missing support-ATK/own-DEF inputs directly. Providers excluded by the configured budget do not introduce unused requirements.

Validation:90 tests passed, TypeScript compilation, ESLint and the production build passed. Browser checks covered confirming a selected option, the full new-hit flow, conditional Aegis DEF, known-zero resistance, and guidance-off calculation blocking.

## Version 6.1.1

- Corrected combo guidance: the displayed chain BONUS is used for gauge points and must not be copied as a damage factor. A three-card chain stays at 100% damage; the last eligible normal orb gains 110%/150%/200% only in a four/five/six-card chain. Selected secret skills count toward chain length.
- Corrected Combo damage UP eligibility to the native rule: the base finisher factor must exceed 100%. Being the second or third card alone does not enable it.
- Clarified that the two 2% buddy ATK additions belong to eligible five/six-card finishers, and that ordinary orb base power is 100% in the recovered base attack data even when the GUI has no details panel. Enhanced/transformed attack replacements still require their own data.

Validation: all 68 tests, TypeScript compilation and the production build passed. The user's Pic3 normal Milim secret, normal Rimuru secret and Milim ordinary-orb results reproduce exactly at permitted variance rolls with the documented inputs. No example was added to startup.

## Version 6.1

- Replaced binary floating-point damage calculations and epsilon snapping with the recovered 96-bit CLR Decimal arithmetic. Final damage uses a true ceiling.
- Preserved independent sources for ATK-stat rounding and simultaneous positive/negative Super Pierce, Super Synergy and Super Aegis contributions.
- Added explicit combo-bonus input and optional qualifying combo-attacker ATKs. Orb position no longer invents a multiplier.
- Expanded buff advice to all supported applicable percentage categories. Buff-provider entries can retain physical/magic and single/all-target restrictions.
- Changed exact-hit feedback to matching **candidate** rolls and compatible inputs. Gap suggestions are hypotheses, not identified hidden bonuses.
- Corrected official English names and misleading claims about direct-damage skills, missing Super Critical coefficients, and estimated pre-battle ATK.
- The supplied client snapshot's default Ultimate weakness addition is 140 percentage points; a positive character-specific value can replace it. The input is a resolved addition to verify for the character. The historical fitted 40% value is no longer presented as universal game data.
- Removed the Milim/other historical example-loading actions and production fixtures. First launch uses one empty hit. True Attribute Unbound factors start at neutral ×1 until entered.
- Version 6.1 uses a fresh workspace storage key to prevent the old seeded example from reappearing. Older browser data is retained; new user-entered setups continue to save normally.
- Added clear input errors for undefined calculations instead of crashing the page. Unfilled hits do not add minimum-one damage to a total.

Validation: 68 automated tests, TypeScript compilation and production build passed. Browser checks covered blank startup, separate signed Super Pierce entries (22,100), and a mobile viewport without horizontal overflow. Historical battle cases are retained only in tests. Independent controlled in-game runs are still needed to check further skills and input eligibility.

For your next run, use **Battle ATK** from the same turn as the hit, copy the enemy's current DEF/resistances, and enter each applicable bonus once. For an eligible finisher, enter its base damage factor separately from Combo damage UP; the displayed chain BONUS is a gauge modifier.
