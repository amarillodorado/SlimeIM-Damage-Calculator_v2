# Slime IM Damage Calculator

A browser-local damage calculator and buff-combination comparison tool for **SLIME – ISEKAI Memories**. It implements supported parts of the damage path recovered from the supplied 5.0.20 client. The guide identifies assumptions and unsupported mechanics.

- **Calculator:** enter current Battle ATK, enemy DEF/resistances, the used soul, applicable effects and the special-hit outcomes that occurred. See the nominal-roll result, the full 200-roll variance range and the calculation trace.
- **Check a real hit:** test whether any allowed roll reproduces recorded damage. A match shows compatibility with the supplied setup; it does not identify the actual random draw or prove each input independently.
- **Several setups:** enter each attack separately and sum their results. Select the applicable Soul Combos setting for each eligible hit.
- **Teams:** keep one attacker, enemy and selected soul attack fixed in Calculator, then add candidate buff providers. Teams tests every combination of exactly the chosen number of providers and ranks the attacker’s damage. Their combined skill cost must stay within the skill-point limit; unspent points are allowed and 0 means no limit. Each provider contributes its entered effects at its total entered cost. Verify skill conditions and legal stacking; skill choices, repeated uses and turn order are not optimized automatically.
- **Guide:** where to read inputs, how to avoid double counting, supported effect categories and limitations.

First-time visitors see one built-in illustrative Super Critical setup: 10,000 ATK, 5,000 enemy DEF, separate +100% / −50% Critical Power sources, and 6,900 calculated damage. This example is included in the application source and production build. Existing saved workspaces are restored instead. Use **Clear** for a blank setup, or **Load example** to open the demonstration again with Undo/recovery available. Historical recorded battle examples remain test fixtures only. Your own inputs are remembered in this browser. A share link contains the entire Calculator workspace and retains the selected setup; invalid links leave current work unchanged and show an error.

## Workspace backups and recovery

Calculator shows whether saving in this browser succeeded. Edits save immediately. **Export workspace** downloads a versioned `slimeim-workspace.json` backup containing every setup, the enemy, confirmations, signed sources and selected setup. **Import workspace** validates the whole file before replacing anything. These files are separate from provider backups.

Loading a workspace or valid share link, clearing, and deleting a setup retain a previous-workspace recovery snapshot. **Restore previous workspace** remains available after reopening the site if browser saving succeeded. Undo messages last 5 seconds and pause while hovered or focused. Setup deletion undo restores the deleted setup without discarding edits to the others.

**Required-input guidance:** Highlight required inputs starts on. Confirm the highlighted choices, including choices already selected by default, and enter or explicitly confirm the required numeric values. Missing values keep the calculation unavailable; turning off highlighting does not disable these checks. Synergy asks for support ATK, Aegis asks for own battle DEF, and True Attribute Unbound asks only for the factor matching the selected weakness result. Ordinary souls default to100% power, with an optional advanced override. Saved confirmations and separate buff-source entries are preserved, including in share links. Older setups keep their values and require confirmation once after this update.

### Portable example

The source includes [an example workspace](examples/super-critical-workspace.json). After starting the app, choose **Calculator → Import workspace** and select that file. It loads one illustrative Super Critical setup: 10,000 ATK, 5,000 enemy DEF, and separate +100% / −50% Critical Power sources. The expected damage is **6,900** (range **6,831–6,969**). These are demonstration values, not a recorded in-game test.

Browser saves belong to that browser and website address, including the port. Copying the source code does not transfer them. To move your own setups, export a workspace on the old website and import it on the new one. The built-in example now loads automatically when no workspace is saved, and **Load example** also opens it without an import. Copying without `node_modules` is supported: `npm install` recreates dependencies, and the startup scripts also install them when needed.

## Save and transfer buff providers

Teams keeps a **Provider Library** and a separate **Test pool** for each Calculator setup. Choose **Add from Library**, search by name or buff, select providers by their portraits, and add them together. Icon buttons switch between list and grid views. The Library, test pools and view choices save immediately in this browser for the same website address.

In the Library, use **Export providers** to download a JSON backup, or a provider's export icon for a single entry. Bundled presets can be exported, edited and deleted like custom providers. **Import providers** adds new IDs, updates matching IDs and preserves unrelated providers. Reimporting the same file does not create duplicates. Invalid files leave the Library unchanged. Imported entries can then be added to a test pool.

Exports include provider names, effects, skill costs, restrictions and guaranteed outcomes. They do not include Calculator setups, test-pool selections or combination rules. Use a JSON backup to move providers to a different browser or localhost address. Libraries and test pools have no fixed provider-count limit. Each provider supports up to 20 effects. Top and bottom pagination keep large collections easy to browse.

Uncheck a provider in the Test pool to exclude it from the next comparison. Removing it from the pool is immediate and keeps its Library entry, where it can be added again. Deleting from the Library requires confirmation and removes the provider from all test pools; deleted presets stay deleted after reload. Existing saved builds and inclusion choices migrate automatically. After choosing providers and rules, press **Compare combinations**. A background worker reports progress and supports cancellation; changing inputs invalidates the previous search. All combinations within the 250,000 search limit are checked, with the best 150 retained for display. No partial ranking is presented as a completed result.

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

`npm run build` writes the static site to `dist/`. `npm run check` runs lint, formatting, type, test and build checks, matching the CI gates. Tests use one isolated thread worker to avoid repeated Windows process startups and limit machine-load sensitivity. Tests and development dependencies are not included in `dist/`; only modules imported by the application, the comparison worker and public assets are deployed. No account or application server is required. Inputs stay in browser storage; share links carry the entire workspace in the URL fragment.

## Before checking a battle

Use **Battle ATK** from the same turn as the hit. Ordinary ATK-stat buffs are already included. Estimated pre-battle mode is for planning: it starts from the ATK on the troop screen (Status Attributes) and adds all battle ATK % together, rounded up once. For Super Pierce, Super Synergy and Super Aegis, preserve simultaneous positive and negative sources separately.

The result is conditional on the entered hit outcomes and effect eligibility. Barriers, absorption, direct-damage battle skills, counterattacks, multi-hit distribution, damage over time and Vengeance are outside this interface. Super Critical uses the recovered 1.5 base and 1.3 favorable-bonus multiplier automatically. Older saved manual coefficients are superseded by these verified constants; signed buff sources and other setup values are retained. Matching ordinary and “+” attribute ATK, damage, resistance and damage-resistance fields are visible directly in **Buffs & debuffs** and multiply independently. The “+” fields apply only to “+” attackers. Resistance DOWN refers to the incoming attack attribute: for Fire+ attacking Water, use the Fire and Fire+ resistance fields. Other uncommon effects remain under **All types**.

## Documentation

- [Verification procedure](docs/VERIFICATION.md)
- [Requirements and scope](docs/REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Provider backups](docs/PROVIDERS.md)
- [Super Critical, “+” effects and investigation tools](docs/MECHANICS_6_4.md)
- [Client-recovery reference](docs/DAMAGE_FORMULA.md)
- [Production fixes and validation](docs/PRODUCTION_FIXES_6_6.md)

## Static hosting

Build with `npm run build` and serve `dist/` on a static host. Asset URLs are relative, so sub-path hosting is supported. The included Docker configuration serves the build with nginx (`$PORT`, default 8080).

Vercel Web Analytics is integrated with the React SDK. Enable Web Analytics for the project in the Vercel dashboard, then deploy the app. Page views use `/calculator`, `/teams` and `/guide`; calculator inputs, share codes and guide anchors are excluded from these paths. Local development uses analytics debug mode.

## Credits

Fan-made; not affiliated with WFS or Bandai Namco Entertainment. Game screenshots and unit icons belong to their owners. Community preset skill values should be checked in-game before relying on a ranking.
