import type { ReactNode } from 'react';
import { CHART_TEXT } from '../../domain/attributes';
import { CATEGORY_LABEL, CATEGORY_ORDER, CATEGORY_PLACE, EFFECT_TYPES } from '../../domain/effects';
import { FIELD_HELP, type FieldKey } from '../../domain/fields';
import { Card, ConfidenceBadge } from '../../components/layout';
import css from './guide.module.css';

const img = (name: string) => `${import.meta.env.BASE_URL}guide/${name}`;
function Figure({ src, alt, children }: { src: string; alt: string; children: ReactNode }) {
  return (
    <figure className={css.figure}>
      <img src={img(src)} alt={alt} width={1100} height={490} loading="lazy" decoding="async" />
      <figcaption>{children}</figcaption>
    </figure>
  );
}

export function QuickStart() {
  return (
    <Card id="guide-start" title="Quick start" subtitle="Enter one recorded hit, then compare it with the calculation.">
      <div className={css.prose}>
        <p>
          Highlight required inputs starts on. Click a required choice even if it is already selected, and enter or explicitly confirm numeric values. Missing
          inputs remain listed beside the result; calculation starts automatically when this hit is complete. Turning highlighting off keeps these checks
          active. Synergy requires support ATK, Aegis requires your current DEF, and True Attribute Unbound requires only the factor matching the selected
          popup. Saved confirmations are remembered. Older setups retain their values and ask for confirmation once.
        </p>
        <ol>
          <li>
            <b>Attacker:</b> copy the attribute, attack type and current <b>Battle ATK</b>. Enter the attached support character’s own ATK if Synergy triggered.
          </li>
          <li>
            <b>Attack:</b> copy the damage percentage from the card actually used, choose its version, and select the special hits and Weak Point popup that
            appeared. Ordinary orbs use 100% base power unless their attack is replaced. Enter the eligible finisher damage factor separately from the displayed
            chain BONUS.
          </li>
          <li>
            <b>Enemy:</b> copy the current attribute, DEF and attack resistances, including minus signs.
          </li>
          <li>
            <b>Buffs &amp; debuffs:</b> enter applicable damage and power effects. Include equipment and EX abilities, but do not add a bonus twice. For Super
            hits, preserve separate positive and negative entries; pre-battle ATK also needs each percentage entry separately.
          </li>
        </ol>
        <p>
          Enter the observed damage under <b>Check a real hit</b>. A matching allowed roll shows that this setup can reproduce the hit. It does not prove the
          actual random draw or uniquely validate every input. Add a separate hit for each attack you want to total.
        </p>
      </div>
    </Card>
  );
}

export function AtkGuide() {
  return (
    <Card id="guide-atk" title="ATK: two ways to enter it" subtitle="Use Battle ATK for checking a real hit; pre-battle reconstruction is an estimate.">
      <div className={css.two}>
        <div className={`${css.option} ${css.recommended}`}>
          <h3>A · Battle ATK</h3>
          <ol>
            <li>Tap the attacker in battle and copy the current ATK.</li>
            <li>Do not add ordinary ATK-stat buffs again: they are already reflected in this displayed value.</li>
            <li>Enter attack-power and damage-power effects in their own fields; they are different from the ATK stat.</li>
          </ol>
          <p>Read the stat on the same turn and under the same conditions as the hit. An expired trait or a changed formation can change the value.</p>
        </div>
        <div className={css.option}>
          <h3>B · Estimated pre-battle ATK</h3>
          <ol>
            <li>Enter the character-page ATK and, if applicable, the attached support’s ATK.</li>
            <li>Enter every ordinary ATK percentage source as a separate entry. Each entry is rounded up separately.</li>
            <li>Enter flat ATK additions separately and compare the result with the actual battle panel.</li>
          </ol>
          <p>
            The character-page totals do not establish the exact original base used by every native stat entry. This mode is for planning and can differ from
            the in-battle value even when its per-entry rounding is correct.
          </p>
        </div>
      </div>
      <div className={css.prose}>
        <h3>Why separate ATK entries matter</h3>
        <p>
          A base of 1,001 with two independent +10% entries gives 1,001 + 101 + 101 = <b>1,203</b>. Combining them into one +20% entry would give <b>1,202</b>.
          Keep the sources separate.
        </p>
        <p>
          <b>Attack power is separate:</b> attribute ATK and M-ATK / P-ATK scale the attack input in a later group. Enter them under Attack power rather than
          adding them to the displayed Battle ATK.
        </p>
      </div>
    </Card>
  );
}

function HelpRow({ k }: { k: FieldKey }) {
  const h = FIELD_HELP[k];
  return (
    <tr>
      <th scope="row">{h.label}</th>
      <td>{h.where}</td>
      <td>{h.includes ?? '—'}</td>
      <td>
        {h.use}
        {h.example && <div className={css.quote}>{h.example}</div>}
      </td>
    </tr>
  );
}
export function WhereToFind() {
  return (
    <Card id="guide-values" title="Where to find values" subtitle="Screenshots show the location of fields; copy the values from your own run.">
      <div className={css.prose}>
        <h3>Bonuses missing from the battle Effect List</h3>
        <p>
          The battle Effect List is not a complete inventory of damage modifiers. Character-page totals, equipment effects and qualifying EX abilities can
          contribute without a separate line there. A bonus being active before the fight does not by itself tell you whether to enter it again.
        </p>
        <ul>
          <li>
            <b>ATK and DEF:</b> use the current battle-panel values. Applicable ordinary stat contributions are already included; do not add equipment or
            generic ATK/DEF buffs again.
          </li>
          <li>
            <b>Critical Damage, Pierce Power, Synergy Power and Aegis Power:</b> open the attacker’s character-page Info/detailed-status panel. Start with the
            displayed aggregate, then add separate qualifying special-power EX contributions and active power buffs.
          </li>
          <li>
            <b>Equipment:</b> open each equipped item’s effect details and check its attack-type/attribute conditions. A bonus already included in the detailed
            aggregate must not be added a second time.
          </li>
          <li>
            <b>EX abilities:</b> inspect the character’s EX Ability details and verify unlock, target and formation conditions. Qualifying formation-dependent
            EX power is added separately from the roster aggregate. Ordinary ATK/DEF EX contributions are already reflected when using current battle stats.
          </li>
          <li>
            <b>Card damage:</b> open the selected Soul of Combos card and inspect its Effect List. Its card damage bonuses may be separate from the attacker’s
            battle Effect List.
          </li>
          <li>
            <b>Protection, traits and TAU:</b> check the protection/character skill pages. Match the stated attribute, force, turn, HP and formation conditions;
            ordinary stat bonuses may already be in battle totals while separate attack-power/damage effects need their own fields.
          </li>
        </ul>
        <p>
          For example, a detailed Critical Damage aggregate of 32%, a separate qualifying EX bonus of 12% and an active Critical Power buff of 40% give
          <b> 84% Critical power UP</b>. The equipment already represented in the 32% is not added again.
        </p>
      </div>
      <div className={css.gallery}>
        <Figure src="battle-info.webp" alt="Battle character information panel">
          <b>Battle info:</b> current ATK, DEF, attribute and attack type.
        </Figure>
        <Figure src="support-page.webp" alt="Attached support character status page">
          <b>Support character:</b> open its own character page for the ATK used by Synergy.
        </Figure>
        <Figure src="enemy-info.webp" alt="Enemy information and attack resistances">
          <b>Enemy info:</b> current DEF and physical/magic attack resistances.
        </Figure>
        <Figure src="soul-of-combos.webp" alt="Soul of Combos card damage and effects">
          <b>Attack card:</b> copy its displayed damage percentage and applicable card effects. Do not multiply a displayed EX/Ultimate percentage a second
          time.
        </Figure>
        <Figure src="hidden-equipment.webp" alt="Equipment effect descriptions">
          <b>Equipment:</b> check power bonuses and their conditions. A detailed stat and an effect-list line may describe the same source.
        </Figure>
        <Figure src="true-attribute-unbound.webp" alt="True Attribute Unbound activation turns and damage multipliers">
          <b>True Attribute Unbound:</b> copy the activation turns and both factors from the character’s skill page.
        </Figure>
      </div>
      <div className={css.tableWrap}>
        <table className={css.table}>
          <thead>
            <tr>
              <th scope="col">Input</th>
              <th scope="col">Where in the game</th>
              <th scope="col">Already includes</th>
              <th scope="col">How it is used</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(FIELD_HELP) as FieldKey[]).map((k) => (
              <HelpRow key={k} k={k} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function DoubleCounting() {
  return (
    <Card id="guide-double" title="Avoid double counting">
      <div className={css.prose}>
        <ul>
          <li>
            <b>Battle ATK and ordinary ATK buffs:</b> the displayed Battle ATK already reflects those buffs.
          </li>
          <li>
            <b>Current enemy DEF / resistance:</b> if the panel already reflects a debuff, do not enter that same debuff again.
          </li>
          <li>
            <b>Detailed stats, equipment and effect-list lines:</b> identify the source. The same bonus can appear in more than one place.
          </li>
          <li>
            <b>Rate versus power:</b> a rate changes the chance of a special hit; power changes damage after that outcome has been selected.
          </li>
          <li>
            <b>Conditional skills:</b> check turns, HP, formation, attack type, target type and attribute. This calculator does not determine every skill’s
            eligibility for you.
          </li>
        </ul>
      </div>
    </Card>
  );
}

export function EffectsReference() {
  return (
    <Card id="guide-effects" title="Supported effect types" subtitle="Game wording and descriptive examples for the categories this calculator supports.">
      {CATEGORY_ORDER.map((c) => (
        <section key={c} className={css.prose} style={{ maxWidth: 'none' }}>
          <h3>{CATEGORY_LABEL[c]}</h3>
          <p>
            <b>Enter in:</b> {CATEGORY_PLACE[c]}
          </p>
          <div className={css.effectCards}>
            {EFFECT_TYPES.filter((t) => t.category === c).map((t) => (
              <article key={t.id} className={css.effectCard}>
                <h4>
                  {t.label} <ConfidenceBadge value={t.confidence} short />
                </h4>
                {t.examples.map((e) => (
                  <span key={e} className={css.quote}>
                    {e}
                  </span>
                ))}
                <span>
                  <b>Where:</b> {t.where}
                </span>
                <span>{t.effect}</span>
              </article>
            ))}
          </div>
        </section>
      ))}
    </Card>
  );
}

export function PopupsGuide() {
  return (
    <Card id="guide-popups" title="Popups, special hits and attributes">
      <div className={css.prose}>
        <p>{CHART_TEXT}.</p>
        <p>
          Natural advantage is ×1.5, disadvantage ×0.7, and otherwise ×1. An eligible “+” attribute adds 0.1 on an advantage. A Weak Point popup does not by
          itself replace that natural matchup.
        </p>
        <p>
          An eligible attacking Ultimate adds its resolved weakness bonus to this base. For an enhanced advantage, an entered 40% gives
          <b> 1.5 + 0.1 + 0.4 = ×2.0</b>; 140% gives <b>×3.0</b>. Advantage is therefore not universally ×2. The 140% value in the supplied client is a global
          fallback, not a verified value for each character. The input starts blank and requires a resolved value. The Base attribute matchup selector and
          Resolved attribute factor readout distinguish the base from the applied result. Other weakness effects can modify that result, and TAU is a separate
          factor.
        </p>
        <dl className={css.dl}>
          <dt>Critical</dt>
          <dd>× (1.3 + Critical Power / 100 + enemy Critical Resistance DOWN / 100).</dd>
          <dt>Pierce</dt>
          <dd>
            Adds 6% of the attacker’s Battle ATK after the preceding damage factors, then applies Pierce Power and resistance. This added term ignores DEF; the
            preceding damage still uses DEF.
          </dd>
          <dt>Synergy</dt>
          <dd>
            Adds 40% of the attached support’s ATK before attack-power factors and DEF subtraction, then applies the Synergy power/resistance factor later.
          </dd>
          <dt>Aegis</dt>
          <dd>Adds 40% of the attacker’s own DEF to the attack input, then applies its power/resistance factor.</dd>
          <dt>Super variants</dt>
          <dd>
            Super Pierce adds 100% of Battle ATK. Super Synergy and Super Aegis use 55% for their attack additions. Their favorable power/resistance
            contributions are scaled by 1.2; unfavorable contributions are not. Keep simultaneous UP and DOWN sources separate.
          </dd>
          <dt>Weak Point / Super Weak Point</dt>
          <dd>
            Select the observed popup to apply eligible Weakness Strike effects and the appropriate True Attribute Unbound factor. Do not add another
            natural-affinity multiplier just because a popup appeared.
          </dd>
          <dt>Rates</dt>
          <dd>Proc rates decide whether an outcome happens. This calculator evaluates selected outcomes and does not roll their chances.</dd>
        </dl>
      </div>
    </Card>
  );
}

export function ComboGuide() {
  return (
    <Card id="guide-combo" title="Combo bonus" subtitle="The displayed chain BONUS and the damage finisher factor are separate values.">
      <div className={css.prose}>
        <p>
          Choose None (100%) under Combo finisher for a chain of one, two or three selected cards. The displayed 3 COMBO / BONUS 110% does not give that attack
          10% more damage; the client has a separate gauge-point bonus. The calculator does not infer a bonus from the position number.
        </p>
        <p>
          Only the last eligible normal orb gains the finisher factor in a chain of four, five or six cards: select the matching 110%, 150% or 200% option.
          Selected secret skills count toward the chain length. Other hits stay at 100%. Combo damage UP adds to this factor only when the base finisher exceeds
          100%.
        </p>
        <p>
          Eligible five- and six-card finishers add 2% of each of two other attackers’ ATKs. Use the advanced combo-buddy inputs only for those finishers; these
          attackers are separate from the attached Synergy support.
        </p>
        <p>Soul of Combos attacks do not use the ordinary-orb combo inputs in this calculator.</p>
      </div>
    </Card>
  );
}

export function TauGuide() {
  return (
    <Card id="guide-tau" title="True Attribute Unbound">
      <div className={css.prose}>
        <ol>
          <li>Find the effect on the character’s skill page.</li>
          <li>Copy its activation turns and the Weak Point / Super Weak Point factors.</li>
          <li>Enable it only while its conditions are met, then select the observed popup.</li>
        </ol>
        <p>Use the actual factors for that character. Do not assume every “+” character has the same turns or multipliers.</p>
      </div>
    </Card>
  );
}

const ORDER: [string, string][] = [
  ['Attack input', 'Battle ATK plus eligible Synergy, Aegis and combo-buddy additions; then attack-power groups.'],
  ['Effective DEF', 'Current enemy DEF and applicable pre-DEF resistance factors.'],
  [
    'Base damage',
    'The recovered Decimal sequence simplifies to max(0, (2 × attack input − effective DEF) × 0.2 × R). R is one of 200 rolls from 0.9900 through 1.0099.',
  ],
  [
    'Before Pierce',
    'Damage-power/resistance groups, condition effects, resolved combo, Critical, Guard, eligible card effects and the card’s displayed damage percentage.',
  ],
  ['Pierce', 'Add its ATK-based term, then apply its power/resistance factor.'],
  ['After Pierce', 'Synergy and Aegis rates, affinity and weakness effects, True Attribute Unbound, and supported late additive effects.'],
  ['Final damage', 'Round up once at the final damage stage, minimum 1, with the modeled global cap.'],
];
export function FormulaGuide() {
  return (
    <Card
      id="guide-formula"
      title="How the damage is calculated"
      subtitle="The supported common-hit path preserves Decimal arithmetic and the recovered order."
    >
      <div className={css.tableWrap}>
        <table className={css.table}>
          <tbody>
            {ORDER.map(([step, text], i) => (
              <tr key={step}>
                <td className={css.num}>{i + 1}</td>
                <th scope="row">{step}</th>
                <td>{text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={css.prose}>
        The compact base expression is for explanation. The implementation keeps the original sequence because finite-precision Decimal operations can differ
        from an algebraically rearranged expression.
      </p>
    </Card>
  );
}

export function VerifiedGuide() {
  return (
    <Card id="guide-verified" title="Checking a recorded hit" subtitle="Record independent inputs before looking for a matching damage value.">
      <div className={css.prose}>
        <ol>
          <li>Save the attacker and enemy battle panels, active effect lists, used card and the damage/popup screenshot.</li>
          <li>Check equipment, EX abilities and any conditional effect not visible in the battle list.</li>
          <li>Enter the observed damage. The checker tests all 200 allowed variance rolls.</li>
          <li>A match means the model and supplied inputs are compatible with that observation. Several different setups can produce the same number.</li>
          <li>If there is a gap, treat suggested missing multipliers as hypotheses. Do not select an unexplained bonus solely to force a match.</li>
        </ol>
        <p>
          Change one independently known input or buff for the next run. Multiple controlled runs are more informative than fitting several unknowns to one hit.
          Historical regression inputs are kept in tests and are not loaded into the calculator.
        </p>
      </div>
    </Card>
  );
}

export function Glossary() {
  const terms: [string, string][] = [
    ['Orb / soul', 'An attack card selected in battle.'],
    ['Soul of Combos', 'The secret-skill orb; copy its displayed damage percentage.'],
    ['EX / Ultimate Soul of Combos', 'Use the damage percentage displayed on the version actually used. Eligible Ultimate weakness bonuses are separate.'],
    [
      'Battle skill',
      'A skill activated with skill points. Enter its supported buffs here; direct-damage battle skills are outside this calculator’s modeled hit types.',
    ],
    ['Attached support character', 'The character below a battle character in the troop. Its own ATK is the Synergy support input.'],
    ['Buff provider', 'A character or skill contributing effects in the team comparison. This is not the attached support slot.'],
    [
      'Critical Power / Critical Damage',
      'Critical Power is official buff wording; Critical Damage is used for the detailed stat. Identify duplicate sources before adding values.',
    ],
    ['Variance roll', 'One allowed base-damage multiplier from 0.9900 to 1.0099. A matching candidate is not an extracted RNG draw.'],
  ];
  return (
    <Card id="guide-glossary" title="Glossary">
      <dl className={css.dl}>
        {terms.map(([t, d]) => (
          <div key={t} style={{ display: 'contents' }}>
            <dt>{t}</dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function Limits() {
  return (
    <Card id="guide-limits" title="Limits and open questions">
      <div className={css.prose}>
        <p>
          <b>Unsupported paths:</b> Super Critical’s two coefficients were not recovered from the supplied files. Counterattacks, multi-hit distribution,
          barriers, absorption, damage over time, Vengeance and direct-damage battle skills are not simulated by this interface.
        </p>
        <p>
          <b>Planning limits:</b> pre-battle ATK composition is estimated. The generic ordinary-orb damage category is an explicit grouping assumption. A team
          ranking compares selected, applicable effects under the entered budget; it does not validate every game restriction, buff replacement rule, activation
          sequence or proc chance.
        </p>
        <p>
          <b>Confidence labels:</b> <ConfidenceBadge value="verified" /> compatible with a recorded setup; <ConfidenceBadge value="client" /> supported by
          recovered client code/data; <ConfidenceBadge value="assumed" /> an interpretation requiring further checks. A recorded match does not prove all
          branches or unseen inputs.
        </p>
      </div>
    </Card>
  );
}
