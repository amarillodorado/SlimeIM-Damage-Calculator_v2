# Requirements and scope

The tool helps players reproduce a supported hit from independently recorded battle inputs and compare applicable buff combinations. It is based on the supplied client-recovery reference, with user-facing assumptions stated explicitly.

## Required behavior

- Start with one blank hit and no observed damage, character name or seeded battle effects.
- Remember the user's subsequent inputs. Clear resets the current workspace; share links load only the encoded setup.
- Prefer current Battle ATK for real-hit checks. Ordinary ATK-stat effects must not be counted again.
- Label pre-battle ATK reconstruction as an estimate; preserve each independent percentage source for per-entry rounding.
- Keep the recovered Decimal arithmetic and final ceiling; do not snap genuine fractions to nearby integers.
- Preserve simultaneous positive and negative power/resistance contributions for modeled Super hits.
- Use the percentage displayed on the card actually used; do not apply EX/Ultimate power twice.
- Use an explicitly resolved ordinary-orb combo multiplier; do not infer a universal bonus table from position alone.
- Report a numerical match as compatibility at candidate roll(s), never proof of the actual RNG draw or of every input.
- Compare all supported eligible percentage effects in the advice feature, while explaining that skill availability/costs and complete game legality are not assessed there.
- Use official English names where known, with clearly descriptive help for aliases.
- Label every input and provide help about its location, included effects and limitations.

## Team comparison

A team entry is a set of buff contributions and selected special-hit outcomes. Rankings are conditional on those effects being applicable, active together and legally stackable. Restrict effects by their modeled attribute, attack type and target scope where provided. A skill-point budget is a sum of the entered costs, not a turn-by-turn simulation of changing costs or activation sequences.

Community presets are convenience data and require in-game verification. They are not an authenticated character database.

## Unsupported paths and open checks

Super Critical's formula was recovered, but two numeric coefficients were not recovered from the supplied files. The interface does not simulate direct-damage battle skills, counterattacks, multi-hit distribution, barriers, absorption, damage over time or Vengeance. It does not roll proc chances.

The exact pre-battle stat composition, generic ordinary-orb damage grouping and upstream combo eligibility need further controlled battle checks. Native implementation coverage is broader than this interface; the research reference is not a feature checklist.

## Validation

Maintain meaningful regression tests for confirmed arithmetic and UI behavior. Record independent battle inputs and uncertainties separately. Do not select unknown bonuses merely to force a recorded damage number to match.