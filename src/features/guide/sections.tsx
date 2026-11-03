import type { ReactNode } from 'react';
import { hrefFor } from '../../app/router';
import { CHART_TEXT } from '../../domain/attributes';
import { CATEGORY_LABEL, CATEGORY_ORDER, CATEGORY_PLACE, EFFECT_TYPES } from '../../domain/effects';
import { FIELD_HELP, type FieldKey } from '../../domain/fields';
import { Card, ConfidenceBadge } from '../../components/layout';
import css from './guide.module.css';

const img = (name: string) => `${import.meta.env.BASE_URL}guide/${name}`;
/** width/height are the image's real size, so the page reserves the right space before it loads. */
function Figure({ src, alt, width = 1100, height = 490, children }: { src: string; alt: string; width?: number; height?: number; children: ReactNode }) {
  return (
    <figure className={css.figure}>
      <img src={img(src)} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
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
          weakness result. Saved confirmations are remembered. Older setups retain their values and ask for confirmation once.
        </p>
        <ol>
          <li>
            <b>Attacker:</b> copy the attribute, attack type and current <b>Battle ATK</b>. Enter the attached support character’s own ATK if Synergy triggered.
          </li>
          <li>
            <b>Attack:</b> copy the damage percentage from the soul actually used, choose its version, and select the special hits and Weak Point popup that
            appeared. Ordinary souls use 100% base power unless their attack is replaced. Enter the eligible finisher damage factor separately from the displayed
            chain BONUS.
          </li>
          <li>
            <b>Enemy:</b> copy the current attribute, DEF and attack resistances, including minus signs.
          </li>
          <li>
            <b>Buffs &amp; debuffs:</b> enter applicable damage and power effects. Include equipment and EX abilities, but do not add a bonus twice. For Super
            hits, keep positive and negative entries in separate rows.
          </li>
        </ol>
        <p>
          Enter the observed damage under <b>Check a real hit</b>. A matching allowed roll shows that this setup can reproduce the hit. It does not prove the
          actual random draw or uniquely validate every input. Add a separate hit for each attack you want to total.
        </p>
        <p>
          Not sure where a value is shown in the game? See <a href={hrefFor('guide', 'ways')}>Two ways to collect the values</a>.
        </p>
      </div>
    </Card>
  );
}

/** A real hit (2026-11-02, Milim’s Ultimate Soul of Combos on a Tornado Spider): every input and where it was read. */
const WORKED_EXAMPLE: [string, string, string][] = [
  ['Battle ATK', '28,203', 'Battle info panel'],
  ['Support character ATK (Synergy)', '6,886', 'Kokuyo’s own character page — before the battle'],
  ['Dark ATK UP', '120%', 'Battle Effect List'],
  ['Damage vs. Wind enemies', '106%', 'Battle Effect List (the protector’s Divine Protection)'],
  ['Damage % · Soul of Combos damage UP', '1080% · 40%', 'The Ultimate Soul of Combos — tap it in battle'],
  ['Critical power UP', '40 + 32 + 12 = 84%', '40% battle Effect List · 32% detailed stats and 12% EX ability — before the battle'],
  ['Pierce power UP', '12 + 15 = 27%', '12% detailed stats — before the battle · 15% battle Effect List (Kokuyo’s trait)'],
  ['Synergy power UP', '40%', 'Battle Effect List'],
  ['True Attribute Unbound', '×1.3, turns 3–5', 'Milim’s skill page — before the battle'],
  ['Enemy', 'Wind · DEF 3,413 · magic −20%', 'Enemy info panel'],
];

export function TwoWays() {
  return (
    <Card
      id="guide-ways"
      title="Two ways to collect the values"
      subtitle="Every hit needs values from the battle and values from before the battle. You choose where you read the rest."
    >
      <div className={css.prose}>
        <p>
          <b>Battle values</b> change during the fight: active buffs and their turns, the enemy’s current DEF and resistances, the soul you used and the popups
          on the hit. Only the battle screens show them. <b>Setup values</b> are fixed before the fight: character and support stats, equipment, EX abilities,
          detailed stats, protector and traits. The character pages show all of them; the battle screens only show part of them.
        </p>
      </div>
      <div className={css.two}>
        <div className={`${css.option} ${css.recommended}`}>
          <h3>A · From the battle screens</h3>
          <ol>
            <li>
              Tap your character in battle. The <b>Battle ATK</b> already contains every ATK bonus — from the setup and from active buffs.
            </li>
            <li>Copy the active buffs from the Effect List, the enemy’s DEF and resistances, the soul you used and the popups on the hit.</li>
            <li>
              Then add what the battle never shows: detailed-stat powers, EX abilities with a condition, the support’s ATK and True Attribute Unbound (see
              below).
            </li>
          </ol>
          <p>
            Least work and the most reliable ATK. Take the screenshots on the turn of the hit — buffs start and end every turn. Best for checking a hit you
            recorded.
          </p>
        </div>
        <div className={css.option}>
          <h3>B · From the pre-battle screens</h3>
          <ol>
            <li>
              Troop screen → <b>Status Attributes</b>: copy the ATK under your character. This lineup total includes equipment, the attached support character,
              applicable EX abilities and the protector’s flat ATK contribution. The Divine Protection’s percentage ATK boost is not included.
            </li>
            <li>Add every “Increased ATK by X%” it gets in battle: Divine Protection, supporting protections, protection skills (each use) and traits.</li>
            <li>
              Add the same powers, EX abilities and soul values as in A — and the battle buffs you plan to use on that turn. Troop screen → <b>Skills</b> lists
              the enchantments, EX ability effects and traits of the whole troop in tabs.
            </li>
          </ol>
          <p>
            Works without a battle, but every % and power has to be looked up and the battle buffs have to be planned. Best for planning a team or a turn before
            you fight.
          </p>
        </div>
      </div>
      <div className={css.prose}>
        <h3>What the battle screens never show</h3>
        <ul>
          <li>
            <b>Detailed stats</b> (character page → Info): Critical Damage, Pierce Power, Synergy Power, Aegis Power. They already contain equipment bonuses
            such as the Claws’ critical power +12% twice — don’t add those again.
          </li>
          <li>
            <b>EX abilities with a condition</b>, for example “increases critical damage by 12% when Rimuru Tempest is assigned to a battle slot”. They count in
            battle but are not part of the detailed stats.
          </li>
          <li>
            <b>The support character’s own ATK</b>, which Synergy adds 40% of. Open the support’s character page.
          </li>
          <li>
            <b>True Attribute Unbound:</b> its active turns and both factors are only on the skill page.
          </li>
        </ul>
        <p>
          <b>Quickest lookup:</b> on the troop screen, <b>Skills</b> shows the equipment enchantments, EX ability effects and traits of the whole troop in
          separate tabs, so you don’t have to open every character page.
        </p>
        <h3>Worked example: Milim’s Ultimate on a Tornado Spider</h3>
        <p>Every input of one real hit and where it was read. The game showed 4,134,209; the calculator gives exactly that number (roll 1.0042).</p>
      </div>
      <div className={css.tableWrap}>
        <table className={css.table}>
          <thead>
            <tr>
              <th scope="col">Input</th>
              <th scope="col">Value</th>
              <th scope="col">Read from</th>
            </tr>
          </thead>
          <tbody>
            {WORKED_EXAMPLE.map(([input, value, source]) => (
              <tr key={input}>
                <th scope="row">{input}</th>
                <td className={css.num}>{value}</td>
                <td>{source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={css.prose}>
        <h3>During the battle</h3>
      </div>
      <div className={css.gallery}>
        <Figure src="battle-info-milim.webp" width={842} height={909} alt="Battle info panel: Milim, Dark+ magic, ATK 28,203">
          <b>Battle info</b> (tap your character): ATK 28,203 already includes every ATK bonus.
        </Figure>
        <Figure
          src="battle-effects-milim.webp"
          width={842}
          height={909}
          alt="Battle Effect List: damage to wind 106%, ATK 92%, synergy power 40%, pierce power 15%"
        >
          <b>Effect List:</b> damage vs. Wind 106%, ATK 92% (already in the Battle ATK), Synergy Power 40% and Pierce Power 15% from Kokuyo’s trait.
        </Figure>
        <Figure
          src="battle-effects-milim-2.webp"
          width={842}
          height={909}
          alt="Battle Effect List: critical rate 100%, critical power 40%, space and dark ATK 120%"
        >
          <b>Effect List, further down:</b> Critical Power 40% and Dark ATK 120% for this turn. Rates only decide whether a special hit happens.
        </Figure>
        <Figure src="enemy-tornado-spider.webp" width={842} height={909} alt="Enemy info: Tornado Spider, wind, DEF 3,413, magic resistance −20%">
          <b>Enemy info:</b> attribute, DEF 3,413 and magic resistance −20%. Enamor and the seals don’t change your damage.
        </Figure>
        <Figure src="ultimate-card-milim.webp" width={900} height={423} alt="Ultimate Soul of Combos: 1080% damage, increases damage by 40%">
          <b>The soul you used:</b> 1080% as shown (the ×1.8 is already in it) and its own effect, damage +40%.
        </Figure>
        <Figure src="hit-popups-milim.webp" width={900} height={413} alt="Hit popups: Super Weak Point, Pierce, Critical, Synergy and 4,134,209 damage">
          <b>Popups on the hit:</b> Super Weak Point, Pierce, Critical and Synergy — select exactly these. Check a real hit compares the number.
        </Figure>
      </div>
      <div className={css.prose}>
        <h3>Before the battle</h3>
      </div>
      <div className={css.gallery}>
        <Figure
          src="troop-screen.webp"
          width={900}
          height={394}
          alt="Troop screen: protector with two supporting protectors, battle characters with their support characters"
        >
          <b>Troop:</b> the protector on the left with two supporting protectors below it; every battle character has its support character below it.
        </Figure>
        <Figure
          src="troop-stats-milim.webp"
          width={651}
          height={759}
          alt="Troop screen after Status Attributes: HP 22,417, ATK 9,682, DEF 7,918 under Milim; Skills button below"
        >
          <b>Troop ATK:</b> Status Attributes switches the numbers under each character to HP, ATK and DEF. Use this lineup total for pre-battle mode; it includes equipment,
          the attached support character, applicable EX abilities and the protector’s flat ATK contribution. The Divine Protection’s percentage ATK boost is
          not included. <b>Skills</b> lists the troop’s enchantments, EX
          ability effects and traits.
        </Figure>
        <Figure src="character-page-milim.webp" width={764} height={779} alt="Character page: Milim, ATK 7,234">
          <b>Character page:</b> attribute and attack type. Its ATK 7,234 is the character alone — pre-battle mode uses the troop ATK instead.
        </Figure>
        <Figure src="support-page-kokuyo.webp" width={764} height={779} alt="Support character page: Kokuyo, ATK 6,886">
          <b>Support character:</b> Kokuyo’s own ATK 6,886 — Synergy adds 40% of it.
        </Figure>
        <Figure src="detailed-stats-milim.webp" width={794} height={753} alt="Detailed stats: critical damage 32%, pierce power 12%">
          <b>Detailed stats</b> (Info): Critical Damage 32% and Pierce Power 12% — never shown in battle.
        </Figure>
        <Figure src="ex-ability-milim.webp" width={863} height={845} alt="EX abilities: Individual Mercy critical damage +12%, Magic Mercy ATK +190">
          <b>EX abilities:</b> Individual Mercy adds 12% critical damage while Rimuru is in a battle slot. Magic Mercy’s flat ATK is already in the troop ATK
          and the Battle ATK.
        </Figure>
        <Figure src="equipment-milim.webp" width={863} height={573} alt="Equipment: Claws of Shadowy Twilight, critical power +12% twice, pierce power +12%">
          <b>Equipment:</b> the Claws’ critical power +12% twice and pierce power +12% are already part of the detailed stats.
        </Figure>
        <Figure src="tau-milim.webp" width={863} height={325} alt="True Attribute Unbound: turns 3 to 5, Weak Point ×1.2, Super Weak Point ×1.3">
          <b>True Attribute Unbound</b> (skill page): turns 3–5, ×1.2 on a Weak Point and ×1.3 on a Super Weak Point.
        </Figure>
        <Figure
          src="protector-elmesia.webp"
          width={863}
          height={836}
          alt="Divine Protection: damage to wind enemies +106% for Divine General, magic characters ATK and DEF +25%"
        >
          <b>Protector:</b> +106% damage to Wind enemies for Divine General members and +25% ATK/DEF for magic characters.
        </Figure>
        <Figure src="protection-skill-elmesia.webp" width={863} height={646} alt="Protection skill: ATK +14% for all allies until the end of battle">
          <b>Protection skill:</b> +14% ATK for all allies until the end of the battle, each time it is used — one reason the Battle ATK grows during a fight.
        </Figure>
        <Figure
          src="supporting-protection-guy.webp"
          width={863}
          height={836}
          alt="Supporting protector: Supporting Divine Protection, speed-type magic characters ATK +14%"
        >
          <b>Supporting protector:</b> only its “Supporting Divine Protection” line counts (here +14% ATK for speed-type magic characters), not its main
          protection.
        </Figure>
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
            <li>
              Troop screen → press <b>Status Attributes</b> until HP, ATK and DEF show, and copy the ATK under your character. This lineup total includes equipment, the attached support character,
              applicable EX abilities and the protector’s flat ATK contribution. The Divine Protection’s percentage ATK boost is not included.
            </li>
            <li>
              Add up every “Increased ATK by X%” the character gets in battle — Divine Protection, supporting protections, protection skills (each use), traits
              — and enter the total.
            </li>
            <li>Once in battle, compare the result with the battle panel.</li>
          </ol>
          <p>For planning. Read the troop ATK in the troop you fight with: another support, protector or teammate changes it.</p>
        </div>
      </div>
      <div className={css.prose}>
        <p>
          <b>Attack power is separate:</b> attribute ATK and M-ATK / P-ATK scale the attack input in a later group. Enter them under Attack power rather than
          adding them to the displayed Battle ATK.
        </p>
        <h3>Example from a real battle</h3>
        <p>
          Milim’s Effect List showed one line, “Increased ATK by 92%”: 25% + 14% + 11% from the protections and 3 × 14% from the protection skill. Her ATK
          before these was 14,689, already including the lineup’s flat ATK contributions. Use the displayed troop total rather than reconstructing each
          contribution. Adding the combined 92% ATK increase and rounding up once gives exactly the battle panel:
        </p>
        <div className={css.calcLine}>
          <span>Base 14,689</span>
          <span>+92% → +13,514</span>
          <span className={css.result}>= 28,203 Battle ATK</span>
        </div>
        <p>
          In another battle the same base with 64% + 6% gave 24,972, again exactly; rounding each % line separately would not fit. The troop screen’s ATK
          already contains the EX abilities but none of the 92%, so pre-battle mode starts from it and adds the %.
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
    <Card id="guide-values" title="Where to find values" subtitle="Every input: where it is in the game, what it already contains and how it is used.">
      <div className={css.prose}>
        <p>
          Screenshots of each place, and which values only exist outside the battle, are in{' '}
          <a href={hrefFor('guide', 'ways')}>Two ways to collect the values</a>. Check the conditions of every bonus (attribute, force, attack type, turns, HP,
          formation) and enter a bonus only once — a detailed stat and an Effect List line can describe the same source.
        </p>
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
          An Ultimate Soul of Combos “greatly increases damage to weak attributes”: on a natural advantage it adds its bonus to this base. The default 40%
          matched both recorded Ultimate hits on a weaker attribute and gives <b>1.5 + 0.1 + 0.4 = ×2.0</b> with a “+” attribute. A Weak Point popup on a
          neutral matchup does not activate it. The Base attribute matchup selector shows the base; the “=” line below it adds the “+”, Ultimate and Weakness
          Strike contributions. TAU is a separate factor.
        </p>
        <h3>Weak Point and Super Weak Point</h3>
        <p>
          Attribute-side weakness can come from the natural matchup or an applicable protection bonus such as “damage to Wind enemies UP”. The protection
          bonus must apply to this attacker and the enemy’s attribute. Super Weak Point also requires the enemy to be weak to the attack type actually used:
          Physical for a physical attacker, Magic for a magic attacker. Check the enemy’s corresponding Attack Resistance; the recovered client requires
          −20% or lower for this attack-type condition.
        </p>
        <div className={css.tableWrap}>
          <table className={css.table} aria-label="Weak Point conditions">
            <thead>
              <tr>
                <th scope="col">Attribute-side weakness</th>
                <th scope="col">Weak to your attack type</th>
                <th scope="col">Weakness message</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Yes</td><td>Yes</td><td>Super Weak Point</td></tr>
              <tr><td>Yes</td><td>No</td><td>Weak Point</td></tr>
              <tr><td>No</td><td>Yes or no</td><td>No weakness message</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          <b>Example:</b> magic Milim with an applicable damage-to-Wind protection bonus shows <b>Weak Point</b> against a Wind enemy weak only to Physical.
          If the enemy is also weak to Magic, the result is <b>Super Weak Point</b>. The protection bonus supplies the attribute-side condition; the enemy’s
          Physical weakness does not satisfy the Magic condition for Milim.
        </p>
        <p>
          Under Weakness result, select the outcome observed in battle. A neutral Dark-to-Wind matchup stays at base ×1 even when the protection bonus enables a weakness message;
          enter the damage-to-Wind bonus separately. Apply eligible Weakness Strike effects and True Attribute Unbound through the selected result, without
          adding another natural-attribute multiplier. The <a href="https://ten-sura-m.bn-ent.net/beginner/faq/" target="_blank" rel="noreferrer">official game guide</a>
          {' '}also explains how protection bonuses against an enemy attribute can make it count as a weakness.
        </p>
        <h3>Special hits: Critical, Pierce, Synergy, Aegis</h3>
        <p>
          Switch on the ones whose popup appeared. Their power and the enemy’s resistance DOWN are entered right below each switch in the Attack section; this is
          what they do to the damage:
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
            Select the observed outcome under Weakness result to apply eligible Weakness Strike effects and the appropriate True Attribute Unbound factor. Do not add another
            natural-affinity multiplier just because a popup appeared.
          </dd>
          <dt>Rates</dt>
          <dd>Proc rates decide whether an outcome happens. This calculator evaluates selected outcomes and does not roll their chances.</dd>
        </dl>
      </div>
      <div className={css.gallery}>
        <Figure src="hit-popups-milim.webp" width={900} height={413} alt="Hit popups: Super Weak Point, Pierce, Critical, Synergy and 4,134,209 damage">
          <b>Popups:</b> this hit had a Super Weak Point plus Pierce, Critical and Synergy — all four are selected in the calculator.
        </Figure>
        <Figure
          src="ex-card-diablo.webp"
          width={900}
          height={423}
          alt="EX Soul of Combos of Diablo: increases weakness strike of Divine General characters by 50%"
        >
          <b>Weakness Strike</b> comes from skills like this one. It only counts on hits with a Weak Point or Super Weak Point popup.
        </Figure>
      </div>
    </Card>
  );
}

export function ComboGuide() {
  return (
    <Card id="guide-combo" title="Combo bonus" subtitle="The displayed chain BONUS and the damage finisher factor are separate values.">
      <div className={css.prose}>
        <p>
          Choose None (100%) under Soul Combos for 1–3 soul combos and for souls that are not finishers. The displayed 3 COMBO / BONUS 110% does not give that attack
          10% more damage; the client has a separate gauge-point bonus. Select the Soul Combos setting that applies to this attack.
        </p>
        <p>
          Only the last eligible normal soul gains the finisher factor in a chain of four, five or six souls: select the matching 110%, 150% or 200% option.
          Selected secret skills count toward the chain length. Other hits stay at 100%. Combo damage UP adds to this factor only when the base finisher exceeds
          100%.
        </p>
        <p>
          Eligible five- and six-soul finishers add 2% of each of two other attackers’ ATKs. Use the advanced combo-buddy inputs only for those finishers; these
          attackers are separate from the attached Synergy support.
        </p>
        <p>Soul of Combos attacks do not use the ordinary-soul combo inputs in this calculator.</p>
      </div>
      <div className={css.gallery}>
        <Figure src="combo-bonus.webp" alt="Soul bar with three selected souls, 3 COMBO and BONUS 110%">
          <b>3 COMBO · BONUS 110%:</b> this bonus fills the gauge. In a chain of three, every soul still does 100% damage — choose None as the finisher.
        </Figure>
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
      <div className={css.gallery}>
        <Figure src="tau-milim.webp" width={863} height={325} alt="True Attribute Unbound: turns 3 to 5, Weak Point ×1.2, Super Weak Point ×1.3">
          <b>Example:</b> active on turns 3–5 only. On turn 2 or turn 6 switch it off, even with a Super Weak Point popup.
        </Figure>
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
    'Damage-power/resistance groups, condition effects, resolved combo, Critical, Guard, eligible soul effects and the soul’s displayed damage percentage.',
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
          <li>Save the attacker and enemy battle panels, active effect lists, used soul and the damage/popup screenshot.</li>
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
    ['Soul', 'An attack selected in battle; includes normal souls and Soul of Combos.'],
    ['Soul of Combos', 'The secret-skill soul; copy its displayed damage percentage.'],
    ['EX / Ultimate Soul of Combos', 'Use the damage percentage displayed on the version actually used. Eligible Ultimate weakness bonuses are separate.'],
    [
      'Battle skill',
      'A skill activated with skill points. Enter its supported buffs here; direct-damage battle skills are outside this calculator’s modeled hit types.',
    ],
    ['Attached support character', 'The character below a battle character in the troop. Its own ATK is the Synergy support input.'],
    ['Buff provider', 'A candidate source of buffs or enemy debuffs for the fixed attacker and enemy in Teams. Each entry contributes its entered effects at its total skill cost. This is separate from the attached support slot.'],
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
          <b>Planning limits:</b> pre-battle ATK composition is estimated. The generic ordinary-soul damage category is an explicit grouping assumption. A team
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
