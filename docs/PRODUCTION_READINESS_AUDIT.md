# Production readiness audit

**Project:** Slime IM Damage Calculator v6.5.1

**Audited revision:** `e2fd258` on `main`

**Date:** 2026-11-04

**Scope:** Calculator, Teams, Guide, persistence, transfer, responsive layout, accessibility, build and release checks.

This is an audit and implementation backlog. No application code was changed, deployed or committed. The browser tests used synthetic data on an isolated localhost origin, separate from the existing website's saved data.

## Release assessment

**The core calculator is in good shape, but I would resolve the P1 findings before calling this production ready.** The production build, TypeScript check, lint and all 156 existing tests pass. However, the actual CI formatting gate fails, an invalid shared workspace can replace saved work with a blank setup, and a supported Teams search can synchronously block interaction for several seconds.

The audit found presentation and data-handling bugs rather than a demonstrated regression in the supported damage formula. Passing the tests establishes agreement with the current model and recorded fixtures; it does not independently prove every mechanic against a new game run or a newer game client.

Priority definitions:

- **P1:** address before public release: release failure, loss of saved work, or substantial responsiveness problem.
- **P2:** fix for a reliable, understandable release: misleading output, mobile layout, accessibility, persistence or consistency issue.
- **P3:** useful improvement; decide based on product scope.

Evidence labels used below: **Browser reproduced**, **Diagnostic reproduced**, **Confirmed in source**, and **Inferred risk**. An inferred failure is not presented as a reproduced incident.

## Findings at a glance

| ID  | Priority | Finding                                                                             | Evidence                                              |
| --- | -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| F01 | P1       | CI fails its formatting gate                                                        | Command reproduced                                    |
| F02 | P1       | Wrong-shaped shared JSON replaces the workspace with defaults and is auto-saved     | Browser + diagnostic reproduced                       |
| F03 | P1       | Teams computes large allowed searches synchronously on the UI thread                | Source + timed diagnostic                             |
| F04 | P2       | Super Critical controls overflow a 320px viewport                                   | Browser reproduced                                    |
| F05 | P2       | Provider effect editor hides important labels on narrow screens                     | Browser reproduced                                    |
| F06 | P2       | Effect help describes ordinary mechanics while Super is selected                    | Browser reproduced + source                           |
| F07 | P2       | Incomplete setups become numerical zeroes in copied summaries and some tabs         | Browser reproduced                                    |
| F08 | P2       | Shared links do not preserve the selected setup                                     | Browser reproduced                                    |
| F09 | P2       | Calculator save failures have no feedback or recovery path                          | Confirmed in source; failure not simulated in browser |
| F10 | P2       | Unbounded source-entry UI conflicts with a 100-entry restore limit                  | Diagnostic reproduced                                 |
| F11 | P2       | Setup tabs lack expected keyboard behavior; required-state semantics are incomplete | Browser + source                                      |
| F12 | P2       | Development dependency audit reports a moderate advisory chain                      | npm audit reproduced                                  |
| F13 | P2       | Lower observed damage is described using both a minus sign and “less”               | Browser reproduced                                    |

## Detailed findings

### F01 — CI cannot currently pass

`npm run format:check` fails on 20 files. The workflow explicitly runs that command, even though `npm run check` does not. A successful local `check` therefore does not establish that the repository will pass CI.

**Sources:** [CI workflow](../.github/workflows/ci.yml), line 22; [package scripts](../package.json); Prettier output.

Affected files: `docs/ARCHITECTURE.md`, `docs/CHANGES.md`, `docs/MECHANICS_6_4.md`, `docs/VERIFICATION.md`, `package.json`, `src/domain/effects.ts`, `src/domain/engine.ts`, `src/domain/enhancedEffects.test.ts`, `src/domain/fields.ts`, `src/domain/providerFiles.test.ts`, `src/domain/providerFiles.ts`, `src/domain/requirements.ts`, `src/domain/superCritical.test.ts`, `src/features/calculator/AttackCard.tsx`, `src/features/calculator/EnemyCard.tsx`, `src/features/guide/sections.tsx`, `src/features/teams/ProviderFiles.test.tsx`, `src/features/teams/TeamsPage.tsx`, `src/state/storage.test.tsx`, `src/state/workspaceReducer.ts`.

**Recommendation:** make a formatting-only change, and include formatting in the documented local release command. Keep formatting changes separate from arithmetic changes for review.

**Acceptance:** `npm ci`, lint, format check, type check, tests and production build all pass on a clean checkout using the CI Node version.

### F02 — Invalid shared data can overwrite saved work

**Reproduction:** start with a complete setup producing 3,000 damage. Open `#/calculator?s=je30` on the same origin. The code is plain JSON `{}` encoded in the app's supported `j` format. The app accepts it, replaces the setup with a blank workspace, removes the URL parameter and auto-saves the replacement. No invalid-link message appears.

This is different from malformed JSON: parsing failure returns `undefined`, whereas a JSON value with the wrong structure is normalized into a valid-looking default workspace. Both paths also remove the share code without useful feedback.

**Sources:** [share decoder](../src/state/share.ts), lines 49–55; [workspace normalization](../src/domain/normalize.ts), lines 191–202; [share-loading effect](../src/app/App.tsx), lines 31–45; [workspace auto-save](../src/state/WorkspaceProvider.tsx), lines 17–21.

**Recommendation:** validate a versioned share envelope and required structure before normalization. Reject invalid data without dispatching `load`; show a clear error and preserve the current workspace. Provide a recoverable previous-workspace snapshot when loading a valid replacement. Also limit encoded/decompressed size and accept only recognized encoding prefixes. The missing size limits are a code-review resilience concern; no oversized-payload exploit was tested.

**Acceptance:** `{}`, `null`, missing/empty setup arrays, unsupported versions/prefixes, corrupted compressed data and excessive input leave current work unchanged and show an error. Valid links still restore confirmations, signed effects and all setups.

### F03 — Teams can freeze during supported searches

`rankTeams` enumerates, evaluates, stores and sorts results synchronously. It runs inside a render-time `useMemo` whenever its inputs change. Showing the first 15 results does not reduce the calculation cost. The 250,000-combination guard prevents larger searches, but allows expensive searches below that threshold.

Synthetic benchmark, three providers per combination, one effect per provider, unlimited budget:

| Candidate providers | Evaluated combinations | Elapsed on this machine |
| ------------------- | ---------------------- | ----------------------- |
| 12                  | 220                    | 81 ms                   |
| 30                  | 4,060                  | 483 ms                  |
| 60                  | 34,220                 | 3,298 ms                |

These are diagnostic Node timings, **not mobile browser timings**. The source establishes that the same synchronous search runs on the browser's main thread. For scale, 33 providers taken five at a time permits 237,336 combinations; that case was not timed. More effects per provider can add work.

**Sources:** [Teams page](../src/features/teams/TeamsPage.tsx), lines 271–310; [search implementation](../src/domain/teams.ts), lines 36, 74–103. Diagnostic inputs/results are retained in the audit artifacts listed below.

**Recommendation:** use a worker or bounded asynchronous chunks with progress and cancellation; avoid restarting a large search on every edit. Keep the best results incrementally and prune unaffordable branches. A deliberate Compare button is a reasonable initial safeguard. Do not merely raise the cap. The current cap is also applied before budget filtering, so it can reject a large candidate pool with very few affordable combinations.

**Acceptance:** supported large searches keep typing, scrolling and cancellation responsive; stale searches cannot replace newer results; small-search rankings remain identical, including cost tie-breaking.

### F04 — Super Critical creates horizontal page overflow

At a 320×740 viewport, enable Super Critical. The long `Add Enemy critical resistance DOWN source` button forces the nested grid wider than the available space. Measured document width was 353px versus a 305px client width (the viewport includes its scrollbar). A blank calculator at the same width did not overflow.

**Sources:** [EffectField](../src/features/calculator/EffectField.tsx), lines 40–94; [button styling](../src/components/ui.module.css), lines 596–608; [effect-entry layout](../src/features/calculator/calculator.module.css), line 177 onward. Evidence: [320px overflow screenshot](../../reversy/analysis/production_audit/screenshots/320-super-critical-overflow.jpg).

**Recommendation:** shorten the visible action to “Add source”, retain a descriptive accessible name, allow wrapping and use `min-width: 0` on nested grid/flex children. Inspect all four Super branches, including long resistance names.

**Acceptance:** no document-level horizontal scroll at 320px, 390px or equivalent zoomed layouts, with long labels and multiple sources.

### F05 — Mobile provider editing is difficult to read

At 320px, effect and attack-type selectors measured approximately 88px wide and target selectors 110px. Their displayed values truncate to fragments such as “Attrib…”, “Any a…” and “Any targ…”. Accessible labels exist, but sighted users have no clear visible label for several of these controls. Save/cancel remains usable; the problem is understanding the effect's restrictions before saving.

**Sources:** [provider editor](../src/features/teams/TeamsPage.tsx); [editor grid](../src/features/teams/teams.module.css), lines 257–265. Evidence: [320px provider editor screenshot](../../reversy/analysis/production_audit/screenshots/320-provider-editor.jpg).

**Recommendation:** stack controls at phone widths with visible labels: Effect, Value, Attribute, Attack type and Target type. Let long effect names use the full row. Preserve the modal's working actions and scrolling.

**Acceptance:** users can identify every selected effect and restriction at 320px without opening each dropdown just to read its current value.

### F06 — Super-mode help contradicts the selected calculation

With Super Critical selected, opening Critical power UP help still says “Only on ordinary Critical hits” and shows the ordinary `1.3 + …` formula. The nearby Super note and calculation instead correctly use the recovered 1.5 base and 1.3 favorable-contribution scaling. Other effect descriptions also explain ordinary Pierce/Synergy/Aegis without their Super behavior.

**Sources:** [effect descriptions](../src/domain/effects.ts), especially entries around lines 213–286; [EffectField help construction](../src/features/calculator/EffectField.tsx), lines 27–39. The Guide's general special-hit section describes the Super variants, but the immediate field help does not.

**Recommendation:** make help outcome-aware or explicitly explain both variants. Use “power/resistance multiplier” consistently: the Guide formula table currently calls the post-Pierce Synergy/Aegis terms “rates”, although proc rates are explicitly excluded from this calculator.

**Acceptance:** help agrees with the selected normal/Super branch and trace, including favorable versus unfavorable contributions. No field suggests entering a proc chance as damage power.

### F07 — Incomplete calculations leak zeroes into other outputs

The main result correctly shows `—` and the missing-input list. However, Copy summary stays enabled and exports placeholder zeroes as if they were calculated damage. A blank workspace produced:

```text
Slime IM Damage Calc — Enemy (Wind, DEF 0, res 0% / 0%)
Setup 1: 0 (0–0) · Soul of Combos 0%
```

Separately, a setup with Battle ATK entered but newly missing support ATK/DEF displayed `0` in its tab while the main result showed `—`. Mixed complete/incomplete summaries can therefore present a misleading total.

**Sources:** [placeholder results](../src/features/calculator/useCalculator.ts), lines 13–43; [summary formatter](../src/features/calculator/format.ts), lines 34–47; [copy action](../src/features/calculator/ResultPanel.tsx), line 209; [tab damage label](../src/features/calculator/HitTabs.tsx), line 27.

**Recommendation:** use the same completeness/error state for tabs, summaries and totals as for the main result. Either mark entries “Incomplete — N inputs remaining” or disable numerical copying until the relevant setup is complete. Sharing an unfinished workspace can remain useful if its incomplete state is preserved.

**Acceptance:** no incomplete or calculation-error placeholder is represented as a valid numerical result; mixed workspaces explicitly identify excluded setups.

### F08 — Sharing changes the active setup

Create two complete setups producing 3,000 and 7,000. Select the second, copy Share link and open it. Both setups and their 10,000 combined total survive, but the first setup becomes selected and the main result opens at 3,000.

**Source:** [compact share payload](../src/state/share.ts), lines 22–35, drops IDs without storing an active index; [normalizer](../src/domain/normalize.ts), line 201, falls back to the first setup.

**Recommendation:** serialize the selected setup's index or another stable reference compatible with regenerated IDs. Clarify that a share link contains the **whole Calculator workspace**, not only the selected setup; README currently uses selected-setup wording in places. Providers and Teams rules are not included.

**Acceptance:** reopening a shared workspace selects the same setup and displays the same main result, confirmations and trace.

### F09 — Calculator persistence is less reliable than provider persistence

Providers correctly show whether local saving succeeded. Calculator uses a separate 250ms debounce and ignores the boolean returned by `saveJSON`; blocked/quota-limited storage therefore has no user-visible failure state. This difference is confirmed in source; a browser quota failure was not induced during this audit. Existing storage tests cover the provider hook's failure handling, not Calculator feedback.

The debounce has no explicit page-hide flush, so the most recent edit can also be lost if the page exits before the timer fires. That lifecycle outcome is an inferred risk. Cross-tab reconciliation is absent; concurrent tabs are another case to test before promising durable storage.

**Sources:** [WorkspaceProvider](../src/state/WorkspaceProvider.tsx), lines 17–21; [storage helpers and provider persistence](../src/state/storage.ts), lines 13–52; [provider persistence tests](../src/state/storage.test.tsx).

**Recommendation:** add Saved/Saving/Unable to save status for Calculator, preserve in-memory input on failure, and offer complete workspace JSON export/import. Flush or otherwise safely persist committed edits on page exit. Add a recovery snapshot/undo for replacement and deletion. Explain that storage is per browser and website address, not a cloud backup.

**Acceptance:** simulated blocked/quota storage produces honest feedback; reload/exit retains the latest committed change; exported work restores all setups, confirmations, selected setup and signed sources.

### F10 — Source entries can silently disappear on restore

The Super-source editor allows unlimited additions, while normalization only retains the first 100 entries per effect. A diagnostic workspace with 101 entries of +1% Critical Power produced 8,439 before sharing and 8,400 after decoding its own shared link. This is an edge case, not a typical combat loadout, but it breaks round-trip integrity.

**Sources:** [unbounded Add source](../src/features/calculator/EffectField.tsx), line 91; [source normalization](../src/domain/normalize.ts), line 157.

**Recommendation:** enforce a consistent UI/storage/share limit and explain it, or remove silent truncation. Same-sign sources may be consolidated safely for these Super formulas, but positive and negative sources must remain separate.

**Acceptance:** every workspace the UI can create either round-trips exactly or receives a blocking, non-destructive validation message before data would be dropped.

### F11 — Keyboard and required-input accessibility need work

**Browser reproduced:** ArrowRight on the first selected setup tab neither moved focus nor selected the next setup. Source uses `role="tablist"` / `role="tab"` without roving tab stops, arrow/Home/End handling, or a corresponding linked tab panel. Native segmented radio controls are separate and already benefit from native keyboard behavior.

**Source confirmed:** required badges and missing-input messages are visible, but individual numeric inputs do not receive associated required/error descriptions (`aria-required`, appropriate `aria-invalid`, `aria-describedby`). Accessible names exist; this is about conveying state and guidance, not an unlabeled-input claim.

**Sources:** [HitTabs](../src/features/calculator/HitTabs.tsx), lines 14–30; [Field](../src/components/Field.tsx), lines 47–137; [NumberInput](../src/components/inputs.tsx), lines 30–63. Expected tab interaction is described by the [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

**Recommendation:** implement the tab pattern or use a simpler navigation pattern with correct semantics. Associate required-state explanations with inputs and announce meaningful readiness/result changes without excessive live updates. Perform a screen-reader and keyboard-only pass.

Small missing-input links also merit a touch-target review, but this audit does **not** claim a formal WCAG failure from size alone: WCAG 2.2 AA uses a 24px target criterion with exceptions and spacing provisions, not a universal 44px minimum. See [the W3C explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

**Acceptance:** keyboard users can select every setup predictably; assistive technology communicates missing required values and their instructions; modal/help focus remains usable. This audit is not an accessibility certification.

### F12 — Moderate development dependency advisory

`npm audit --json` reported seven moderate package findings arising from the development-tool dependency chain through `typescript-eslint` / `@typescript-eslint/*` to `minimatch`. The underlying advisory is [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), a CPU/memory amplification issue; the advisory identifies `11.0.1` as patched for the affected modern range. `npm audit --omit=dev --json` reported **zero production dependency findings** at audit time.

These are seven affected package entries in a dependency chain, not seven demonstrated website vulnerabilities. The installed linter toolchain is not shipped as the browser application's runtime code.

**Recommendation:** update to a compatible patched toolchain, inspect the resulting lockfile and rerun checks. Do not blindly apply `npm audit fix --force`: the audit suggestion included a major toolchain version change/downgrade.

**Acceptance:** the development advisory is resolved or explicitly tracked with its actual exposure, with no lint/build/test regressions. Recheck dependencies at release because advisory state changes over time.

### F13 — Observed-hit comparison wording is ambiguous

For calculated damage 4,600 and observed damage 3,000, the UI says “The game did -34.8% less”. Use either “34.8% less” or “Difference from prediction: −34.8%”. A minus sign plus “less” obscures the direction. The additional explanation uses another denominator (“prediction is 53.3% above observed”); both numbers are mathematically compatible but unnecessarily difficult to compare.

**Source:** [CheckHit comparison](../src/features/calculator/ResultPanel.tsx), lines 73–81; `fmtPct` in [format.ts](../src/features/calculator/format.ts), line 7.

**Recommendation:** use one stated denominator throughout the main comparison. Keep the existing caveat that a matching roll demonstrates compatibility rather than proving all inputs.

**Acceptance:** above/below cases use clear positive magnitudes or explicitly signed differences, with the reference value explained consistently.

## Feature coverage and what currently works

“Tests” below means the existing automated suite passed. “Reviewed” means code inspection, not every permutation exercised in a real browser.

| Feature                                  | Coverage and outcome                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh start, no loaded battle example    | Browser + UI tests: one blank setup, guidance enabled, no computed result. Guide examples remain informational.                                                                                                                                                                       |
| Required-input confirmation              | Browser + UI/domain tests: explicit choice confirmation works, known zero is distinct from unanswered, disabling highlights keeps validation active. Preserve this requested behavior.                                                                                                |
| Battle ATK vs. pre-battle estimate       | UI/domain tests + review: Battle ATK avoids re-adding ATK-stat boosts; pre-battle mode uses troop ATK and the combined percentage. Pre-battle remains an estimate.                                                                                                                    |
| Physical/magic and ordinary/+ attributes | UI/domain tests + review: dynamic labels, relevant enemy resistance, ordinary/+ stages and applicability branches covered.                                                                                                                                                            |
| Normal souls                             | Browser + tests: 100% baseline works without entering power; advanced replacement override is separate.                                                                                                                                                                               |
| Normal/EX/Ultimate Soul of Combos        | Browser + tests: entered power is not multiplied by the version twice; switching versions clears power and requests a new value. Ultimate advantage behavior has domain/UI tests.                                                                                                     |
| Ultimate starting bonus                  | Tests + review: default is 40%; saved explicit values such as 140% remain explicit values. The Guide correctly says 40% is character/upgrade specific, not universal.                                                                                                                 |
| Soul Combos and buddy ATK                | Domain/UI tests: eligible finisher factors, normal-soul-only applicability and five/six-soul buddy additions covered. No orb-position selector is needed.                                                                                                                             |
| Weakness result, matchup, TAU            | Domain/UI tests + review: separate affinity/result concepts, conditional active TAU factor, Ultimate natural-advantage requirement and invalid inverse-factor handling covered.                                                                                                       |
| Critical and Super Critical              | Browser + domain/UI tests: base result 3,000 → ordinary Critical 3,900 → Super Critical 4,500. Super +100% power / −50% power in separate sources gave 6,900. Help/layout findings F04/F06 remain.                                                                                    |
| Pierce/Synergy/Aegis and Super variants  | Domain/UI tests cover additions, order and sign-separated scaling. Browser confirmed Synergy requests support ATK and Aegis requests own DEF; 5,000 each on the neutral baseline produced 4,600.                                                                                      |
| Buff/debuff fields, statuses, guard      | Domain tests + reviewed conditional UI: same-group sums, distinct multipliers, ordinary/+ stages, stun/enamor and guard branches covered. These were not all individually clicked in the browser.                                                                                     |
| Decimal arithmetic, variance, clamps     | Domain tests pass, including fractional ceilings, Decimal scale behavior, min damage, invalid inputs and historical fixtures. Do not replace with simplified floating-point algebra as a cosmetic cleanup.                                                                            |
| Multiple setups and total                | Browser + tests: add, duplicate, remove and shared enemy work. Source enforces 12 setups; the full cap was reviewed rather than manually clicked through. Incomplete tabs/summary need F07.                                                                                           |
| Result trace / best next buff            | Browser + tests: trace updates and advisor sorts applicable +10% effects. Advisor correctly warns it ignores skill availability and cost.                                                                                                                                             |
| Check a real hit                         | Browser + tests: observed 3,000 returned exact candidate rolls, with a non-proof caveat. Higher/lower/range branches covered by tests; wording needs F13.                                                                                                                             |
| Clear                                    | UI test passed; implementation reviewed. Native confirmation path was not separately exercised in the audit browser.                                                                                                                                                                  |
| Copy summary / share link                | Browser: copying and valid multi-setup transfer work. Invalid input, completeness and selected-setup findings F02/F07/F08 remain. Clipboard-denied fallback reviewed, not browser-tested.                                                                                             |
| Saved Calculator workspace               | Browser + UI tests: reload restores data and confirmations. Failure feedback and edge round trips need F09/F10.                                                                                                                                                                       |
| Provider create/edit/remove/presets      | Browser created two providers; editor/delete/preset code reviewed. Unverified presets are opt-in and visibly warned. Mobile editor needs F05.                                                                                                                                         |
| Provider autosave                        | Browser: both providers survive route changes and reload. Tests cover immediate save, blocked storage and quota/serialization failure feedback.                                                                                                                                       |
| Provider export/import                   | Real browser JSON download and re-import: 0 added, 0 updated, 2 unchanged. UI/domain tests cover new/update merges, preserving unrelated providers, malformed JSON, unsupported versions, size/record limits and atomic rejection. Not every invalid-file case was manually uploaded. |
| Provider restrictions and outcomes       | Domain tests cover attribute, physical/magic, single/AoE restrictions, signed contributions and conditionally required stats. Providers can enable ordinary outcomes; provider-specific Super outcomes are not modeled.                                                               |
| Team size, cost and dynamic rules        | Browser + tests: exact size changes sentence, 0 budget means unlimited, cost cap excludes unaffordable combinations, combined ranking works. Two synthetic buffs produced 4,081 at cost 50; the retained Decimal order can differ from rearranged algebra by one point.               |
| Ranking order / Show more / guard        | Sorting and limit reviewed; budget ranking covered by tests. Show more is presentation pagination, not computation pagination (F03). A large paginated library was not exhaustively browsed.                                                                                          |
| Guide / help / routes                    | Browser: Calculator/Teams/Guide navigation, ATK deep link, help open/close, 22 Guide images loaded without broken images. Content and confidence caveats reviewed; F06 and small terminology improvements remain.                                                                     |
| Responsive layout                        | Browser at desktop 1280px, tablet 768px, phone 390px and narrow 320px. Blank Calculator and Guide did not overflow horizontally; Super fields and provider editor need fixes.                                                                                                         |
| Analytics / static hosting               | Build/config reviewed: page paths exclude shared codes/inputs from configured analytics paths; hash routing and relative assets support static hosting. Deployed analytics, headers and subpath hosting were not verified against a live host.                                        |

## Improvements, missing capabilities and confusing controls

These are recommendations, not all release blockers.

| Priority        | Recommendation                                                                                    | Reason and boundary                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2              | Add Undo for provider/setup deletion and a previous-workspace recovery snapshot                   | These actions persist immediately or shortly afterward. A reversible action is less disruptive than repeated confirmation dialogs.                                                                                                          |
| P2              | Add complete workspace JSON backup, separate from provider export                                 | Provider backup is already strong. Users also need portable backup of Calculator inputs; make the two export scopes explicit.                                                                                                               |
| P2              | Add a candidate enabled/disabled toggle independent of the saved provider library                 | Currently a saved custom provider participates in the candidate pool until removed. Users should not have to delete a reusable build to exclude it temporarily.                                                                             |
| P2 if supported | Model provider-specific Super outcomes, or clearly state they must already be fixed in Calculator | Provider triggers are booleans for ordinary outcomes. A Super base outcome applies to every candidate; it cannot represent a Super-enabling provider's incremental value. Do not advertise optimization of these providers until supported. |
| P2              | Add a recoverable error boundary with Retry for lazy page-load/render failures                    | `Suspense` handles loading, not failure. A failed Guide/Teams chunk can otherwise leave an unhandled error. This is a source-derived resilience risk, not a reproduced outage.                                                              |
| P3              | Preserve an explicitly cleared Ultimate bonus as blank across reload/share                        | `null` currently normalizes back to 40. A diagnostic reproduced this; the field remains unconfirmed, so it does not silently validate a result. Distinguish absent legacy data (default) from intentionally unknown input.                  |
| P3              | Show value provenance/reset for the Ultimate bonus                                                | Label “Starting value: 40%, verify character/upgrade” and provide Reset. Do not rewrite all saved 140% entries automatically: an explicit saved value is different from a default.                                                          |
| P3              | Clarify combined damage versus comparing alternatives                                             | Setup totals intentionally sum attacks. If users use setups as alternatives, the sum is not their best option. Label it “Combined damage of complete setups” or provide a clear compare view later.                                         |
| P3              | Make scope changes conspicuous                                                                    | Existing generic effect values relabel when the attacker/enemy attribute changes. A review notice helps prevent an old Wind bonus being mistaken for a newly entered Fire bonus.                                                            |
| P3              | Add a fallback for missing imported local provider icons                                          | Safe `units/*.png` paths are validated syntactically, but a nonexistent file can still render a broken avatar. Fall back to the existing initials avatar.                                                                                   |
| P3              | Add a small browser regression suite to CI                                                        | Cover share round trips, invalid-share preservation, setup completeness in exports, provider transfer, keyboard tabs and 320px overflow. Existing jsdom/domain tests do not catch these presentation/integration failures.                  |

Controls/content worth simplifying:

- **Keep the signed Super sources:** they have a real numerical purpose because favorable and unfavorable contributions scale differently. They can be presented as positive/negative totals with optional source detail rather than an unlimited stack of unexplained rows.
- **Keep Normal soul power automatic at 100%.** Put the replacement override in an Advanced area. Do not require users to invent a damage percentage for an ordinary soul.
- **Target affects conditional effects, not an unconditional damage multiplier.** For an ordinary single-target soul, Single can be the normal path; keep AoE available only where the modeled attack actually supports it, or move unusual overrides to Advanced. Do not remove target logic from secret skills/provider restrictions.
- **Move manual matchup overrides to Advanced.** Auto should remain the obvious default; a forced advantage is easy to mistake for an extra multiplier.
- **Keep “Soul Combos” and “Weakness result”.** “Soul type” would be clearer than “Hit type” for choosing Normal soul versus Soul of Combos. Use “popup” only when describing the actual text displayed by the game, rather than as the field name.
- **Collapse the long worked example in the Guide.** It is useful evidence, but users seeking one field should not have to scroll through a full battle record. The clean calculator start already meets the request to remove a preloaded Milim example.
- **Keep confidence and scope warnings.** Generic soul-damage grouping remains an assumption, and community presets remain unverified. A polished interface should not imply that every legal skill sequence or game path has been solved.

Not needed for the first release: accounts, a backend, a full character database, proc-chance simulation, turn-by-turn skill optimization, or every unsupported damage path. Offline installation/service-worker behavior is not required unless offline use is promised. Add these only with a defined use case; they would substantially expand the current fixed-attack calculator's scope.

## Build, dependency and deployment verification

The audited source was compared by hash with the retained local stage: 127 selected source/documentation/public/config/workflow files matched before testing. Commands ran in that stage so generated builds and temporary probes did not modify the user repository.

| Check                                  | Result                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| TypeScript project build / type check  | Pass                                                                                                           |
| ESLint                                 | Pass                                                                                                           |
| Existing automated tests, one worker   | **156 passed, 13 files**                                                                                       |
| Initial default-worker test attempt    | Five worker startup timeouts under machine load; not assertion failures. The complete one-worker rerun passed. |
| Production Vite build                  | Pass, 66 modules                                                                                               |
| Prettier format check                  | **Fail: 20 files**, F01                                                                                        |
| Production dependency audit            | 0 findings at audit time                                                                                       |
| Full dependency audit                  | 7 moderate chain findings, F12                                                                                 |
| Built-site HTTP / browser smoke test   | HTTP 200; Chromium/IAB flows above exercised                                                                   |
| Browser console during exercised flows | No captured warnings/errors                                                                                    |
| Docker                                 | Configuration reviewed; Docker executable unavailable, so image build/runtime not verified                     |

Build sizes: entry JavaScript approximately 328.42 kB / 102.50 kB gzip; lazy Teams chunk 24.20 / 8.37 kB; lazy Guide chunk 37.27 / 10.82 kB; CSS 26.74 / 5.87 kB. These are build artifacts, not a Lighthouse score or network-load benchmark.

Before deployment, run the full CI sequence on a clean checkout and smoke-test the actual target host: HTTPS, root/subpath asset loading, direct hash links, refreshing all pages, cache behavior after a new release, and analytics behavior with blockers. The nginx template has long-lived immutable caching for hashed assets and no-cache HTML; preserve that separation. Choose host security headers compatible with the static application and verify them on the deployed response rather than claiming they are already present. No deployed environment was supplied for this audit.

## Implementation order and release checklist

1. **Protect work and restore a green release gate:** F02 strict share validation/recovery, F01 formatting and consistent local/CI checks.
2. **Make supported comparisons responsive:** F03 worker/chunking/cancellation or a bounded manual comparison flow.
3. **Make output trustworthy:** F07 incomplete/error status everywhere, F08 selected-setup round trip, F06/F13 help and comparison wording, F09 save feedback and backup, F10 consistent limits.
4. **Finish interaction quality:** F04/F05 narrow layouts, F11 keyboard/required-state semantics, undo and candidate exclusion.
5. **Validate the release:** resolve/track F12, add focused browser regressions, complete cross-browser/device and target-host checks.

Release acceptance:

- [ ] All required CI commands pass from a clean install.
- [ ] Invalid links cannot replace current work; valid links round-trip calculations and selection.
- [ ] Incomplete/invalid setups never appear as calculated zero damage in any output.
- [ ] Calculator and provider save failures are visible, and backups can be restored.
- [ ] Large allowed Teams searches remain interactive and cancellable.
- [ ] All special-hit forms and provider editing remain readable at 320px and zoomed layouts.
- [ ] Keyboard-only navigation and a screen-reader pass are complete.
- [ ] Existing arithmetic fixtures remain unchanged unless a separately evidenced mechanics correction is approved.
- [ ] Chromium, Firefox, Safari/iOS and Android smoke tests are recorded; a real phone numeric keyboard is checked.
- [ ] The deployed host, cache behavior and intended analytics configuration are verified.

## Evidence and limits

Retained local audit artifacts are outside the application source in [the audit workspace](../../reversy/analysis/production_audit/): `inventory.json`, `probe-results.json`, the temporary diagnostic source copied as `production.test.ts`, synthetic provider export/invalid fixtures, and screenshots. The diagnostic file is an audit record, not a new test installed in the application's suite. Its import paths refer to the staged project layout.

Visual evidence:

- [320px Super Critical overflow](../../reversy/analysis/production_audit/screenshots/320-super-critical-overflow.jpg)
- [320px provider editor](../../reversy/analysis/production_audit/screenshots/320-provider-editor.jpg)
- [768px Guide](../../reversy/analysis/production_audit/screenshots/768-guide.jpg)
- [Desktop calculator baseline](../../reversy/analysis/production_audit/screenshots/desktop-calculator.jpg)

These evidence links use the supplied local folder layout and are not hosted website assets. Export/copy the evidence directory with this report if sharing it elsewhere.

This audit did not include a formal accessibility certification, penetration test, live-host assessment, Docker execution, real-device keyboards, screen-reader session, Safari/Firefox session, or new in-game damage experiment. It did not download APKs or change recovered game data. Tested calculations concern the app's declared common-hit model; direct-damage battle skills, counters, barriers, absorption, multi-hit distribution, damage over time, Vengeance and legal turn/stacking optimization remain outside its declared scope. No claim is made that every possible combination of inputs has been exercised.
