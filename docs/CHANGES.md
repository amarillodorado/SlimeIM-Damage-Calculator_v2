# Calculation corrections — version 6.2.2

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
