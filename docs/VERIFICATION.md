# Checking an independently recorded hit

A numerical match means that at least one of the 200 allowed variance rolls reproduces the observation under the supplied setup. It does **not** reveal the actual draw, uniquely identify all multipliers, or establish unseen equipment/trait sources.

Historical battle inputs are retained only in `src/test/fixtures.ts` for numerical regression checks. The application starts blank and has no example-loading action.

## Record the inputs first

For one hit, save:

1. The attacker's current battle ATK, DEF if Aegis occurred, attribute and attack type.
2. The attached support's own character-page ATK if Synergy occurred, with the same loadout.
3. The enemy's current DEF, physical/magic attack resistances and applicable status effects.
4. The used soul's displayed damage percentage, version and soul effects.
5. The active effect lists, equipment, EX abilities and other conditional power bonuses.
6. The damage number and the observed Critical/Pierce/Synergy/Aegis and Weak Point popups.
7. For an ordinary soul, the resolved combo multiplier and any qualifying combo-buddy inputs.

Use the values on the turn of the hit. Avoid adding ordinary ATK buffs over the displayed Battle ATK, debuffs over current enemy values that already include them, or the same source from both detailed stats and an effect-list line.

## Enter and compare

- Start with **Clear**. Enter the recorded values before adjusting anything to match damage.
- Preserve separate positive and negative power/resistance contributions for Super hits.
- If using estimated pre-battle ATK, enter the troop screen ATK and the total ATK % from the battle effect list, then compare the result with the battle panel.
- Enter the observed damage under **Check a real hit**. The checker reports candidate rolls, an in-range mismatch, or a difference outside the predicted range.
- Treat suggested missing multipliers as hypotheses. Do not call an unexplained fitted bonus a confirmed equipment or trait value.

## Controlled follow-up runs

Change one known factor at a time. Useful comparisons include the same skill with and without one power buff, ordinary versus Super special-hit outcomes, neutral versus advantageous affinity, and a changed enemy DEF. Keep other inputs fixed and record new panels if conditions change.

An exact match on several independently documented setups supports more of the model than one fitted setup. A mismatch may reflect an input issue, an unsupported path, incorrect effect eligibility, or a model error. Record the evidence and the setup link so those possibilities can be separated.

## Automated validation scope

The tests retain known regression fixtures and independent counterexamples for Decimal rounding, mixed Super contributions, per-entry stat rounding, candidate-roll ambiguity, advice coverage and clean startup. Passing tests establishes those cases only; it does not certify every game skill or future client update.