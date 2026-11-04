# Slime IM Damage Calculator

A browser-local damage calculator and buff-combination comparison tool for **SLIME – ISEKAI Memories**. It implements supported parts of the damage path recovered from the supplied 5.0.20 client. The guide identifies assumptions and unsupported mechanics.

- **Calculator:** enter current Battle ATK, enemy DEF/resistances, the used soul, applicable effects and the special-hit outcomes that occurred. See the nominal-roll result, the full 200-roll variance range and the calculation trace.
- **Check a real hit:** test whether any allowed roll reproduces recorded damage. A match shows compatibility with the supplied setup; it does not identify the actual random draw or prove each input independently.
- **Several setups:** enter each attack separately and sum their results. Select the applicable Soul Combos setting for each eligible hit.
- **Teams:** keep one attacker, enemy and selected soul attack fixed in Calculator, then add candidate buff providers. Teams tests every combination of exactly the chosen number of providers and ranks the attacker’s damage. Their combined skill cost must stay within the skill-point limit; unspent points are allowed and 0 means no limit. Each provider contributes its entered effects at its total entered cost. Verify skill conditions and legal stacking; skill choices, repeated uses and turn order are not optimized automatically.
- **Guide:** where to read inputs, how to avoid double counting, supported effect categories and limitations.

The calculator starts with one blank setup. The historical battle examples are test fixtures only and are not loaded into the app. Your own inputs are then remembered in this browser; use **Clear** for a fresh run. The new workspace storage key starts clean without deleting older saved data. A share link opens the setup explicitly encoded in that link.

**Required-input guidance:** Highlight required inputs starts on. Confirm the highlighted choices, including choices already selected by default, and enter or explicitly confirm the required numeric values. Missing values keep the calculation unavailable; turning off highlighting does not disable these checks. Synergy asks for support ATK, Aegis asks for own battle DEF, and True Attribute Unbound asks only for the factor matching the selected weakness result. Ordinary souls default to100% power, with an optional advanced override. Saved confirmations and separate buff-source entries are preserved, including in share links. Older setups keep their values and require confirmation once after this update.

## Save and transfer buff providers

Teams saves your candidate providers automatically in this browser for the same website address. The page shows whether saving succeeded. Changes are saved immediately, including when leaving Teams.

Use **Export providers** to download `slimeim-buff-providers.json`. Use **Import providers** to load that backup: new provider IDs are added, matching IDs are updated, and unrelated providers remain. Importing the same file again does not create duplicates. Invalid files leave the current list unchanged.

Exports include provider names, effects, skill costs, restrictions and guaranteed outcomes. They do not include the Calculator setup or combination rules. Use a JSON backup to move providers to a different browser or localhost address. A library supports up to 60 providers, each with up to 20 effects.

## Run locally

1. Install [Node.js](https://nodejs.org/) LTS.
2. **Windows:** double-click `start.bat`. **macOS / Linux:** run `sh start.sh`.
3. Stop the local server with Ctrl+C when finished.

## Development

```bash
npm install
npm start
npm run dev
npm test
npm run typecheck
npm run build
```

`npm run build` writes the static site to `dist/`. `npm run check` runs the project's combined lint, type, test and build checks. No account or application server is required. Inputs stay in browser storage; share links carry the selected setup in the URL fragment.

## Before checking a battle

Use **Battle ATK** from the same turn as the hit. Ordinary ATK-stat buffs are already included. Estimated pre-battle mode is for planning: it starts from the ATK on the troop screen (Status Attributes) and adds all battle ATK % together, rounded up once. For Super Pierce, Super Synergy and Super Aegis, preserve simultaneous positive and negative sources separately.

The result is conditional on the entered hit outcomes and effect eligibility. Barriers, absorption, direct-damage battle skills, counterattacks, multi-hit distribution, damage over time and Vengeance are outside this interface. Super Critical uses the recovered 1.5 base and 1.3 favorable-bonus multiplier automatically. Older saved manual coefficients are superseded by these verified constants; signed buff sources and other setup values are retained. Ordinary and “+” attribute ATK, damage, resistance and damage-resistance effects have separate fields and multiply independently; “+” fields apply only to matching “+” attacks and are available under **All types**.

## Documentation

- [Verification procedure](docs/VERIFICATION.md)
- [Requirements and scope](docs/REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Provider backups](docs/PROVIDERS.md)
- [Super Critical, “+” effects and investigation tools](docs/MECHANICS_6_4.md)
- [Client-recovery reference](docs/DAMAGE_FORMULA.md)

## Static hosting

Build with `npm run build` and serve `dist/` on a static host. Asset URLs are relative, so sub-path hosting is supported. The included Docker configuration serves the build with nginx (`$PORT`, default 8080).

Vercel Web Analytics is integrated with the React SDK. Enable Web Analytics for the project in the Vercel dashboard, then deploy the app. Page views use `/calculator`, `/teams` and `/guide`; calculator inputs, share codes and guide anchors are excluded from these paths. Local development uses analytics debug mode.

## Credits

Fan-made; not affiliated with WFS or Bandai Namco Entertainment. Game screenshots and unit icons belong to their owners. Community preset skill values should be checked in-game before relying on a ranking.
