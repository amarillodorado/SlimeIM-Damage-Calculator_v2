import { describe, expect, it } from 'vitest';
import { defaultWorkspace } from './defaults';
import { getMissingRequirements, getRequirements, isHitComplete } from './requirements';
import { normalizeWorkspace } from './normalize';
import type { Workspace } from './types';
import { updateAttack, updateAttacker, workspaceReducer } from '../state/workspaceReducer';
import { decodeWorkspace, encodeWorkspace } from '../state/share';
import { damageAt, toInput } from './engine';

function entered(): Workspace {
  const ws = defaultWorkspace();
  ws.hits[0]!.attacker.battleAtk = 10000;
  ws.hits[0]!.attack.power = 600;
  ws.enemy.attribute = 'fire';
  ws.enemy.def = 5000;
  for (const row of getRequirements(ws.hits[0]!, ws.enemy)) {
    const confirmations = row.key.startsWith('enemy.') ? ws.enemy.confirmed! : ws.hits[0]!.confirmed!;
    confirmations[row.key] = true;
  }
  return ws;
}

describe('required input contract', () => {
  it('keeps defaults unconfirmed and highlighting enabled', () => {
    const ws = defaultWorkspace();
    const missing = getMissingRequirements(ws.hits[0]!, ws.enemy);
    expect(ws.highlightRequired).toBe(true);
    expect(missing.map((row) => row.key)).toContain('attack.kind');
    expect(missing.map((row) => row.key)).toContain('attacker.battleAtk');
    expect(missing.find((row) => row.key === 'attack.power')?.message).toMatch(/valid/);
  });

  it('requires conditional stats, with an explicit zero distinct from no answer', () => {
    const ws = entered(),
      hit = ws.hits[0]!;
    expect(isHitComplete(hit, ws.enemy)).toBe(true);
    hit.attack.synergy = 'normal';
    expect(getMissingRequirements(hit, ws.enemy).map((row) => row.key)).toEqual(['attacker.supportAtk']);
    hit.confirmed!['attacker.supportAtk'] = true;
    expect(isHitComplete(hit, ws.enemy)).toBe(true);
    hit.attack.aegis = 'normal';
    expect(getMissingRequirements(hit, ws.enemy).map((row) => row.key)).toEqual(['attacker.ownDef']);
    hit.confirmed!['attacker.ownDef'] = true;
    expect(isHitComplete(hit, ws.enemy)).toBe(true);
    delete ws.enemy.confirmed!['enemy.magicRes'];
    expect(getMissingRequirements(hit, ws.enemy).map((row) => row.key)).toEqual(['enemy.magicRes']);
  });

  it('requests only the active ATK mode and selected TAU factor', () => {
    const ws = entered(),
      hit = ws.hits[0]!;
    hit.attacker.atkMode = 'build';
    const build = getRequirements(hit, ws.enemy).map((row) => row.key);
    expect(build).toContain('attacker.troopAtk');
    expect(build).not.toContain('attacker.battleAtk');
    expect(build).not.toContain('attacker.supportAtk');
    hit.attacker.tau.active = true;
    hit.attack.popup = 'superWeak';
    expect(getMissingRequirements(hit, ws.enemy).find((row) => row.key === 'attacker.attribute')?.message).toContain('“+”');
    hit.attacker.plus = true;
    const tau = getRequirements(hit, ws.enemy).map((row) => row.key);
    expect(tau).toContain('attacker.tau.superWeak');
    expect(tau).not.toContain('attacker.tau.weak');
  });

  it('changes the required finisher stats without making ordinary power a typing task', () => {
    const ws = entered();
    const hit = updateAttack(ws.hits[0]!, { kind: 'soul' });
    expect(hit.attack.power).toBe(100);
    expect(getRequirements(hit, ws.enemy).map((row) => row.key)).not.toContain('attack.power');
    expect(getRequirements(hit, ws.enemy).map((row) => row.key)).not.toContain('attacker.comboBuddyAtk1');
    const finisher = updateAttack(hit, { comboMultiplier: 1.5 });
    expect(getRequirements(finisher, ws.enemy).map((row) => row.key)).toContain('attacker.comboBuddyAtk1');
    expect(getRequirements(finisher, ws.enemy).map((row) => row.key)).toContain('attacker.comboBuddyAtk2');
  });

  it('acknowledges an already selected choice but resets power on real kind/version changes', () => {
    const ws = entered(),
      hit = ws.hits[0]!;
    delete hit.confirmed!['attack.variant'];
    const same = updateAttack(hit, { variant: 'normal' });
    expect(same.confirmed?.['attack.variant']).toBe(true);
    expect(same.attack.power).toBe(600);
    const ultimate = updateAttack(same, { variant: 'ultimate' });
    expect(ultimate.attack.power).toBe(0);
    expect(ultimate.confirmed?.['attack.power']).toBeUndefined();
    const orb = updateAttack(ultimate, { kind: 'soul' });
    expect(orb.attack.power).toBe(100);
    expect(orb.attack.normalPowerOverride).toBe(false);
    const override = updateAttack(orb, { normalPowerOverride: true, power: 100 });
    expect(override.confirmed?.['attack.power']).toBeUndefined();
  });

  it('does not confirm default TAU factors when enabling the nested toggle', () => {
    const ws = entered(),
      hit = ws.hits[0]!;
    const next = updateAttacker(hit, { tau: { ...hit.attacker.tau, active: true } });
    expect(next.confirmed?.['attacker.tau.weak']).toBeUndefined();
    expect(next.confirmed?.['attacker.tau.superWeak']).toBeUndefined();
  });

  it('retains confirmed inputs and preference on save, without trusting legacy defaults', () => {
    const ws = entered();
    ws.highlightRequired = false;
    const restored = normalizeWorkspace(JSON.parse(JSON.stringify(ws)));
    expect(isHitComplete(restored.hits[0]!, restored.enemy)).toBe(true);
    expect(restored.highlightRequired).toBe(false);
    const legacy = normalizeWorkspace({ enemy: ws.enemy, hits: [{ attacker: ws.hits[0]!.attacker, attack: ws.hits[0]!.attack }] });
    expect(isHitComplete(legacy.hits[0]!, legacy.enemy)).toBe(false);
    expect(legacy.hits[0]!.attacker.battleAtk).toBe(10000);
    const cleared = workspaceReducer(restored, { type: 'clear' });
    expect(cleared.highlightRequired).toBe(false);
    expect(isHitComplete(cleared.hits[0]!, cleared.enemy)).toBe(false);
  });

  it('preserves signed calculation sources and confirmations through a share link', async () => {
    const ws = entered(),
      hit = ws.hits[0]!;
    hit.attack = { ...hit.attack, kind: 'soul', power: 100, pierce: 'super', comboMultiplier: 1 };
    hit.effects.piercePower = 50;
    hit.effectEntries = { piercePower: [100, -50] };
    hit.confirmed!['attack.comboMultiplier'] = true;
    const before = damageAt(toInput(hit, ws.enemy));
    const restored = (await decodeWorkspace(await encodeWorkspace(ws)))!;
    expect(restored.hits[0]!.effectEntries?.piercePower).toEqual([100, -50]);
    expect(damageAt(toInput(restored.hits[0]!, restored.enemy))).toBe(before);
    expect(isHitComplete(restored.hits[0]!, restored.enemy)).toBe(true);
  });

  it('requires the Ultimate addition only on the eligible advantageous branch', () => {
    const ws = entered(),
      hit = ws.hits[0]!;
    hit.attack.variant = 'ultimate';
    expect(getRequirements(hit, ws.enemy).map((row) => row.key)).not.toContain('attack.ultimateBonus');
    hit.attacker.attribute = 'dark';
    ws.enemy.attribute = 'light';
    expect(getMissingRequirements(hit, ws.enemy).map((row) => row.key)).toContain('attack.ultimateBonus');
    hit.attack.ultimateBonus = 40;
    hit.confirmed!['attack.ultimateBonus'] = true;
    expect(isHitComplete(hit, ws.enemy)).toBe(true);
  });
});
