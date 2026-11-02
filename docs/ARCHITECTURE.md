# Architecture

The application is a static React + TypeScript + Vite site. Domain modules calculate a selected resolved hit; the UI collects inputs, displays traces and stores the workspace locally.

- `src/domain/types.ts`: workspace, attacker, attack and effect data.
- `src/domain/decimal.ts`: signed 96-bit, scale 0–28 Decimal arithmetic matching the recovered numerical path.
- `src/domain/engine.ts`: supported damage pipeline, effect applicability, final ceiling and trace.
- `src/domain/effects.ts` / `fields.ts`: English labels, descriptive examples, field help and confidence.
- `src/domain/check.ts`: all 200 allowed variance rolls and compatible candidate results.
- `src/domain/advisor.ts`: comparisons across supported applicable percentage effects.
- `src/domain/teams.ts`: conditional buff-combination enumeration and ranking.
- `src/domain/defaults.ts`: blank constructors and one-hit clean startup. No historical battle presets.
- `src/domain/normalize.ts`: validation of saved and shared inputs.
- `src/test/fixtures.ts`: historical numerical fixtures, imported only by tests.
- `src/state`: reducer/context, browser storage and share-link encoding.
- `src/features`: calculator, team comparison and generic guide.

## Numerical rules

Keep intermediate damage and multiplier arithmetic in Decimal until final ceiling. The ordinary Pierce addition is the recovered binary64 ×0.06 followed by its Decimal conversion. Separate Super positive/negative queries must not be reconstructed from a single net total when both signs coexist. Independent ratio-stat entries are rounded separately.

UI formatting may convert values for display, but display rounding must not feed back into the calculation. The nominal roll is 1.0000; it is not a probability-weighted expected-damage calculation. Multi-hit totals sum entered resolved hits and their extrema, not a joint probability distribution.

## State and compatibility

The current workspace storage key is `slimeim.v6.1.workspace`. It starts the updated application clean without deleting older browser data. New fields are normalized from missing values with safe defaults. Shared setups must retain separate effect entries so a round trip cannot alter Super rates or stat rounding.

## Copy and confidence

The interface reports candidate RNG rolls and compatibility, not recovered draws or uniquely proven inputs. Help must distinguish supported native rules, observations from a particular setup, and explicit assumptions. Avoid claiming that every game buff or damage path is modeled.

## Checks

Run the project's type checks, domain/component tests and production build after changes. Tests include clean startup and restoration of user inputs, supported numerical regressions and formerly failing edge cases. Passing tests does not establish all game skills.