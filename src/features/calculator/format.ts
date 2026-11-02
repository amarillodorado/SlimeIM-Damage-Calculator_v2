import { ATTRIBUTE_LABEL } from '../../domain/attributes';
import type { HitSummary } from '../../domain/engine';
import type { Hit, Workspace } from '../../domain/types';

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtFactor = (f: number) => `×${f >= 10 ? f.toFixed(1) : f.toFixed(2)}`;
export const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${(Math.round(n * 10) / 10).toLocaleString('en-US')}%`;

export const hitLabel = (hit: Hit, index: number) => hit.attacker.name.trim() || `Hit ${index + 1}`;

/** Popups and special hits of a hit, as the game names them. */
export function hitTags(hit: Hit): string[] {
  const k = hit.attack;
  const tags: string[] = [];
  if (k.popup === 'weak') tags.push('Weak Point');
  if (k.popup === 'superWeak') tags.push('Super Weak Point');
  if (k.crit) tags.push('Critical');
  if (k.pierce !== 'off') tags.push(k.pierce === 'super' ? 'Super Pierce' : 'Pierce');
  if (k.synergy !== 'off') tags.push(k.synergy === 'super' ? 'Super Synergy' : 'Synergy');
  if (k.aegis !== 'off') tags.push(k.aegis === 'super' ? 'Super Aegis' : 'Aegis');
  if (k.kind === 'soul' && k.comboPosition > 1) tags.push(`Orb ${k.comboPosition}`);
  return tags;
}

export function attackLabel(hit: Hit): string {
  const k = hit.attack;
  if (k.kind === 'soulOfCombos') {
    const v = k.variant === 'ex' ? 'EX ' : k.variant === 'ultimate' ? 'Ultimate ' : '';
    return `${v}Soul of Combos ${k.power}%`;
  }
  return `Normal orb ${k.power}%`;
}

/** Plain-text summary for Discord and chats. */
export function summaryText(ws: Workspace, results: Map<string, HitSummary>): string {
  const e = ws.enemy;
  const lines = [`Slime IM Damage Calc — ${e.name || 'Enemy'} (${ATTRIBUTE_LABEL[e.attribute]}, DEF ${fmtInt(e.def)}, res ${e.physRes}% / ${e.magicRes}%)`];
  let total = 0;
  ws.hits.forEach((h, i) => {
    const r = results.get(h.id);
    if (!r) return;
    total += r.damage;
    const tags = hitTags(h);
    lines.push(`${hitLabel(h, i)}: ${fmtInt(r.damage)} (${fmtInt(r.min)}–${fmtInt(r.max)}) · ${attackLabel(h)}${tags.length ? ' · ' + tags.join(', ') : ''}`);
  });
  if (ws.hits.length > 1) lines.push(`Total: ${fmtInt(total)}`);
  return lines.join('\n');
}
