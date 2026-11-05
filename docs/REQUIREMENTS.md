# Requirements and scope

The tool helps players reproduce a supported hit from independently recorded battle inputs and compare applicable buff combinations. It is based on the supplied client-recovery reference, with user-facing assumptions stated explicitly.

## Required behavior

- Start first-time visitors with one fully specified, fictional Super Critical example from the application source, with no observed damage. Restore an existing saved workspace instead of replacing it with the example.
- Clear creates a blank setup and keeps it blank after reopening. Load example restores the demonstration on demand with previous-workspace recovery.
- Remember the user's subsequent inputs; share links load the entire encoded workspace and selected setup.
- Show matching ordinary and “+” attribute ATK, damage, resistance and damage-resistance fields directly, without requiring All types. Attribute resistance refers to the attacker’s attribute even when the enemy has a different one.
- Prefer current Battle ATK for real-hit checks. Ordinary ATK-stat effects must not be counted again.
- Label pre-battle ATK reconstruction as an estimate; it starts from the troop screen ATK and adds the summed battle ATK %, rounded up once.
- Keep the recovered Decimal arithmetic and final ceiling; do not snap genuine fractions to nearby integers.
- Preserve simultaneous positive and negative power/resistance contributions for modeled Super hits.
- Use the percentage displayed on the soul actually used; do not apply EX/Ultimate power twice.
- Use an explicitly resolved ordinary-soul combo multiplier; do not infer a universal bonus table from position alone.
- Report a numerical match as compatibility at candidate roll(s), never proof of the actual RNG draw or of every input.
- Compare all supported eligible percentage effects in the advice feature, while explaining that skill availability/costs and complete game legality are not assessed there.
- Use official English names where known, with clearly descriptive help for aliases.
- Label every input and provide help about its location, included effects and limitations.

## Team comparison

The Calculator’s selected attacker, enemy and soul attack form one fixed base setup. Candidate providers contribute buff/debuff effects and selected guaranteed special-hit outcomes to that attack; their own attacks are not scored. Teams evaluates every combination of exactly the selected number of distinct provider entries, each used once. Each entry contributes its applicable entered effects at its total entered skill cost.

The skill-point limit is an upper bound on the sum of provider costs: combinations may leave points unspent, and 0 means no limit. Results are sorted by the fixed attacker’s calculated damage, then by lower cost on a damage tie. Individual skill selection, repeated casts, point recovery and activation order are not optimized. Rankings require the entered effects to be applicable, active together and legally stackable; modeled attribute, attack-type and target restrictions are applied.

Community presets are convenience data and require in-game verification. They are not an authenticated character database.

The Provider Library and each Calculator setup's Test pool are saved immediately in browser storage with success/failure feedback. Searchable portrait selection supports batch additions and icon-only list/grid views. Unchecking excludes a provider from that pool; pool removal is immediate and preserves its Library entry. Library deletion requires confirmation and removes references from every pool. Bundled presets are seeded once and can be edited, exported or deleted. JSON export/import transfers Library definitions; import validates the whole file, updates matching IDs, adds new IDs and preserves unrelated entries without automatically adding them to a pool. Invalid files leave existing data intact. See [provider backups](PROVIDERS.md) for formats and limits.

## Unsupported paths and open checks

Super Critical uses the recovered 1.5 base and 1.3 favorable-bonus multiplier automatically. It replaces the ordinary Critical factor; signed sources remain separate. The obsolete manual coefficient fields in old saved setups and share links are discarded in favor of these verified game constants. The interface does not simulate direct-damage battle skills, counterattacks, multi-hit distribution, barriers, absorption, damage over time or Vengeance. It does not roll proc chances.

Ordinary and matching “+” attribute ATK, damage, resistance and damage-resistance effects form separate multiplicative factors. The extra “+” effects are ignored for ordinary attacks and survive saved setups and provider JSON import/export.

The exact pre-battle stat composition, generic ordinary-soul damage grouping and upstream combo eligibility need further controlled battle checks. Native implementation coverage is broader than this interface; the research reference is not a feature checklist.

## Validation

Maintain meaningful regression tests for confirmed arithmetic and UI behavior. Record independent battle inputs and uncertainties separately. Do not select unknown bonuses merely to force a recorded damage number to match.
