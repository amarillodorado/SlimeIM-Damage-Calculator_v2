import { useCallback, useMemo } from 'react';
import { calculateHit, toInput, type HitSummary } from '../../domain/engine';
import { getMissingRequirements, type Requirement } from '../../domain/requirements';
import type { Attack, Attacker, EffectTypeId, Hit, InputKey } from '../../domain/types';
import { updateAttack, updateAttacker } from '../../state/workspaceReducer';
import { useWorkspace } from '../../state/workspaceContext';

/** Results of every hit plus the total, recomputed whenever the workspace changes. */
export function useResults() {
  const { workspace } = useWorkspace();
  return useMemo(() => {
    const byHit = new Map<string, HitSummary>();
    const missingByHit = new Map<string, Requirement[]>();
    let completeCount = 0;
    let damage = 0;
    let min = 0;
    let max = 0;
    let error: string | undefined;
    for (const hit of workspace.hits) {
      const missing = getMissingRequirements(hit, workspace.enemy);
      missingByHit.set(hit.id, missing);
      const empty: HitSummary = {
        damage: 0,
        min: 0,
        max: 0,
        battleAtk: hit.attacker.battleAtk,
        attackValue: 0,
        effectiveDef: 0,
        matchup: 'neutral',
        stats: [],
        steps: [],
      };
      if (missing.length) {
        byHit.set(hit.id, empty);
        continue;
      }
      try {
        const r = calculateHit(toInput(hit, workspace.enemy));
        byHit.set(hit.id, r);
        completeCount++;
        damage += r.damage;
        min += r.min;
        max += r.max;
      } catch (cause) {
        if (!(cause instanceof RangeError)) throw cause;
        error ??= `${hit.attacker.name || 'A hit'}: ${cause.message}`;
        byHit.set(hit.id, empty);
      }
    }
    return { byHit, missingByHit, completeCount, total: { damage, min, max }, error };
  }, [workspace]);
}

/** Typed updaters for the hit being edited. */
export function useActiveHit() {
  const { activeHit, dispatch } = useWorkspace();
  const update = useCallback((fn: (h: Hit) => Hit) => dispatch({ type: 'updateHit', id: activeHit.id, update: fn }), [activeHit.id, dispatch]);
  const setAttacker = useCallback((patch: Partial<Attacker>) => update((h) => updateAttacker(h, patch)), [update]);
  const setAttack = useCallback((patch: Partial<Attack>) => update((h) => updateAttack(h, patch)), [update]);
  const confirmInput = useCallback(
    (key: InputKey, confirmed = true) => dispatch({ type: 'confirmInput', key, confirmed, hitId: activeHit.id }),
    [dispatch, activeHit.id],
  );
  const setEffect = useCallback(
    (type: EffectTypeId, value: number) =>
      update((h) => {
        const effects = { ...h.effects, [type]: value };
        if (value === 0) delete effects[type];
        const effectEntries = { ...h.effectEntries };
        delete effectEntries[type];
        return { ...h, effects, effectEntries };
      }),
    [update],
  );
  const setEffectEntries = useCallback(
    (type: EffectTypeId, entries: number[]) =>
      update((h) => {
        const values = entries.filter(Number.isFinite);
        const total = values.reduce((sum, value) => sum + value, 0);
        const effects = { ...h.effects, [type]: total };
        if (total === 0) delete effects[type];
        return { ...h, effects, effectEntries: { ...h.effectEntries, [type]: values } };
      }),
    [update],
  );
  const setObserved = useCallback((observed: number) => update((h) => ({ ...h, observed })), [update]);
  return { hit: activeHit, setAttacker, setAttack, setEffect, setEffectEntries, setObserved, confirmInput };
}
