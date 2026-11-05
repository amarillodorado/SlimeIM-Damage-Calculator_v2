# Production fixes — v6.6.0

This update improves workspace recovery, comparison responsiveness, accessibility and release validation.

| Finding | Change                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F01     | Existing files formatted; local `check` now includes the CI formatting gate.                                                                                                                                 |
| F02     | Versioned, structurally validated shares; encoding/size/decompression limits; invalid links show an error without loading or replacing data. Valid legacy links remain supported.                            |
| F03     | Explicit Compare action, background worker, progress bar, cancellation and stale-result protection; bounded best-150 result storage. A yielding fallback supports environments without workers.              |
| F04     | Independent nested special-hit layouts, wrapping actions and narrow-screen stacking replace the conflicting subgrid.                                                                                         |
| F05     | Provider editor uses visible labels, full-width effect names and stacked phone controls.                                                                                                                     |
| F06     | Effect help describes normal and Super branches and their signed contributions; Guide calls power/resistance multipliers by their correct name.                                                              |
| F07     | Incomplete/error entries show a dash in tabs and explicit status in summaries; partial totals identify excluded setups.                                                                                      |
| F08     | Shared payloads retain setup IDs and the active selection; workspace backups do too.                                                                                                                         |
| F09     | Immediate workspace persistence with save-failure feedback, page-hide flush, complete JSON backups and previous-workspace recovery.                                                                          |
| F10     | UI additions stop at 100 sources per effect; external over-limit data is rejected atomically. Older over-limit storage is preserved for consolidation instead of silently truncated.                         |
| F11     | Setup tabs support arrow/Home/End navigation, linked panel semantics and roving tab stops; field state/instructions are programmatically associated with controls.                                           |
| F12     | Targeted `@typescript-eslint/typescript-estree` override uses patched minimatch 11.0.1 or later. The existing ESLint minimatch 3 branch is not changed. npm audit reported zero findings after installation. |
| F13     | Observed-hit differences use unsigned magnitudes with more/less wording and the prediction as denominator consistently.                                                                                      |

Additional requested changes:

- Temporary Undo for setup deletion; previous Calculator workspace recovery survives reload when storage is available. Hover/focus pauses the 5-second Undo message.
- Separate Calculator workspace and buff-provider JSON exports/imports.
- Persistent provider inclusion switches; excluding a provider preserves its library entry and exported settings.
- Page error boundary with retry and full reload recovery, outside the persisted workspace state.
- Missing provider icons fall back to initials.
- Normal souls retain their automatic 100% baseline and optional verified replacement override.
- The long worked battle example in the Guide is collapsed initially.
- An explicitly cleared Ultimate addition remains unknown through reload/share, rather than being silently filled with 40% again.

## Why Super hits preserve opposite signs

Super Critical scales favorable power/resistance contributions by **1.3**. Super Pierce, Synergy and Aegis use **1.2**. Unfavorable contributions stay unchanged. A positive power UP or enemy resistance DOWN is favorable; power DOWN or enemy resistance UP is negative in these inputs.

For example, Super Critical with +100% power and −50% power uses `1.5 + 1.3 × 1.00 − 0.50 = 2.30`. Entering their net +50% alone would instead give `1.5 + 1.3 × 0.50 = 2.15`, which loses information. Same-sign sources can be added together in one entry. Multiple entries are only necessary when opposite signs coexist; separate power and enemy-resistance fields also identify which kind of effect was read.

The Super variants' attack additions are separate from these power multipliers: Super Pierce adds 100% of Battle ATK at its stage; Super Synergy and Aegis use 55% of support ATK and own DEF respectively.

## Terminology and scope

Target selection controls which single-target/AoE-specific effects apply. Changing it alone does not grant a damage multiplier. “All targets” in a debuff description identifies its recipients and does not imply that only AoE attacks benefit.

“Soul Combos” remains the finisher control; “Weakness result” remains the observed Weak/Super Weak selection. Confidence labels retain the distinction between recovered-client support, compatibility with observed damage, and an assumption. Unsupported mechanics remain identified so the interface does not imply a complete legal turn/skill simulator.

Tests execute before release and in CI; they are not application entry points and are not copied to the static `dist/` deployment. Static hosting serves only `dist/`, not the test runner or development dependency tree.

## Validation scope

Validation completed on 2026-11-05: `npm run check` passed lint, formatting, types, all **184 tests in 18 files**, and the production build in the actual repository. The dependency installation reported **zero vulnerabilities**. The built assets contain the separate comparison worker and no checked test-only markers. Git attributes now enforce the formatter's LF source/documentation line endings on Windows checkouts, retaining CRLF for batch files.

Regression tests cover invalid shares/imports, transfer of selection and signed sources, size limits, recovery, incomplete summaries, keyboard tabs, storage failure, provider inclusion/undo/icon fallback, search ranking/progress/cancellation and stale-worker messages. Existing damage fixtures remain regression checks. Production browser checks verify the separate worker asset and responsive special-hit/editor layouts. A real 60-provider search completed all 34,220 three-provider combinations; invalid-share protection and selected-setup sharing were also checked in the browser.

The test runner uses the supported `threads` pool with one worker and per-file isolation retained. A Windows `forks` startup timeout prevented one test file from starting during validation; thread workers avoid that process-startup bottleneck without suppressing errors, disabling tests or removing isolation. See the [Vitest pool documentation](https://vitest.dev/config/pool).

This update does not add provider-specific Super proc enablement, legal buff replacement/turn sequencing, cross-tab conflict merging, a full character database, or new damage paths. A formal screen-reader audit, physical-device keyboard testing and verification on a deployed host remain separate release checks. No new in-game mechanics experiment is implied by the software tests.
