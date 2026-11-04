import { blankHit, defaultWorkspace, newId } from '../domain/defaults';
import {
  INPUT_KEYS,
  type Attack,
  type Attacker,
  type Enemy,
  type Hit,
  type InputConfirmations,
  type InputKey,
  type Workspace,
} from '../domain/types';

export type WorkspaceAction =
  | { type: 'updateHit'; id: string; update: (hit: Hit) => Hit }
  | { type: 'updateEnemy'; patch: Partial<Enemy> }
  | { type: 'selectHit'; id: string }
  | { type: 'addHit'; mode: 'duplicate' | 'blank' }
  | { type: 'removeHit'; id: string }
  | { type: 'load'; workspace: Workspace }
  | { type: 'clear' }
  | { type: 'confirmInput'; key: InputKey; confirmed: boolean; hitId?: string }
  | { type: 'setHighlightRequired'; value: boolean };

export const MAX_HITS = 12;

const invalidate = (confirmed: InputConfirmations, keys: InputKey[]) => {
  for (const key of keys) delete confirmed[key];
};
const contextualKeys: InputKey[] = ['attack.popup', 'attack.ultimateBonus', 'attacker.tau.weak', 'attacker.tau.superWeak'];

/** User edits also acknowledge the edited value; selecting the current choice counts. */
export function updateAttacker(hit: Hit, patch: Partial<Attacker>): Hit {
  const confirmed = { ...hit.confirmed };
  for (const key of INPUT_KEYS) {
    if (!key.startsWith('attacker.') || key.startsWith('attacker.tau.')) continue;
    const field = key.slice('attacker.'.length);
    if (Object.hasOwn(patch, field)) confirmed[key] = true;
  }
  if (Object.hasOwn(patch, 'plus')) confirmed['attacker.attribute'] = true;
  if ((patch.attribute !== undefined && patch.attribute !== hit.attacker.attribute) || (patch.plus !== undefined && patch.plus !== hit.attacker.plus))
    invalidate(confirmed, contextualKeys);
  // A TAU on/off edit carries its other nested values, but does not confirm them.
  if (patch.tau?.weak !== undefined && patch.tau.weak !== hit.attacker.tau.weak) confirmed['attacker.tau.weak'] = true;
  if (patch.tau?.superWeak !== undefined && patch.tau.superWeak !== hit.attacker.tau.superWeak) confirmed['attacker.tau.superWeak'] = true;
  return { ...hit, attacker: { ...hit.attacker, ...patch }, confirmed };
}

export function updateAttack(hit: Hit, patch: Partial<Attack>): Hit {
  const confirmed = { ...hit.confirmed };
  for (const key of INPUT_KEYS) {
    if (key.startsWith('attack.') && Object.hasOwn(patch, key.slice('attack.'.length))) confirmed[key] = true;
  }
  let attack = { ...hit.attack, ...patch };
  if (patch.superCrit === true) attack.crit = true;
  if (patch.crit === false) attack.superCrit = false;
  if (patch.kind !== undefined && patch.kind !== hit.attack.kind) {
    attack = { ...attack, power: patch.kind === 'soul' ? 100 : 0, normalPowerOverride: false };
    invalidate(confirmed, ['attack.power', 'attack.variant', 'attack.comboMultiplier', ...contextualKeys]);
    if (patch.kind === 'soulOfCombos') attack.variant = 'normal';
  } else if (patch.variant !== undefined && patch.variant !== hit.attack.variant && attack.kind === 'soulOfCombos') {
    attack.power = 0;
    invalidate(confirmed, ['attack.power', 'attack.ultimateBonus']);
  }
  if (patch.normalPowerOverride !== undefined && patch.normalPowerOverride !== hit.attack.normalPowerOverride) {
    if (!patch.normalPowerOverride && attack.kind === 'soul') attack.power = 100;
    invalidate(confirmed, ['attack.power']);
  }
  if (patch.comboMultiplier !== undefined && patch.comboMultiplier !== hit.attack.comboMultiplier)
    invalidate(confirmed, ['attacker.comboBuddyAtk1', 'attacker.comboBuddyAtk2']);
  return { ...hit, attack, confirmed };
}

export function workspaceReducer(state: Workspace, action: WorkspaceAction): Workspace {
  switch (action.type) {
    case 'updateHit':
      return { ...state, hits: state.hits.map((h) => (h.id === action.id ? action.update(h) : h)) };
    case 'updateEnemy': {
      const confirmed = { ...state.enemy.confirmed };
      for (const key of INPUT_KEYS) {
        if (key.startsWith('enemy.') && Object.hasOwn(action.patch, key.slice('enemy.'.length))) confirmed[key] = true;
      }
      const changedAttribute = action.patch.attribute !== undefined && action.patch.attribute !== state.enemy.attribute;
      return {
        ...state,
        enemy: { ...state.enemy, ...action.patch, confirmed },
        hits: changedAttribute
          ? state.hits.map((hit) => {
              const next = { ...hit.confirmed };
              invalidate(next, contextualKeys);
              return { ...hit, confirmed: next };
            })
          : state.hits,
      };
    }
    case 'confirmInput': {
      if (action.key.startsWith('enemy.'))
        return { ...state, enemy: { ...state.enemy, confirmed: { ...state.enemy.confirmed, [action.key]: action.confirmed } } };
      const id = action.hitId ?? state.activeHitId;
      return { ...state, hits: state.hits.map((hit) => (hit.id === id ? { ...hit, confirmed: { ...hit.confirmed, [action.key]: action.confirmed } } : hit)) };
    }
    case 'setHighlightRequired':
      return { ...state, highlightRequired: action.value };
    case 'selectHit':
      return state.hits.some((h) => h.id === action.id) ? { ...state, activeHitId: action.id } : state;
    case 'addHit': {
      if (state.hits.length >= MAX_HITS) return state;
      const active = state.hits.find((h) => h.id === state.activeHitId) ?? state.hits[0]!;
      const hit: Hit =
        action.mode === 'blank'
          ? blankHit()
          : {
              ...structuredClone(active),
              id: newId(),
              observed: 0,
              confirmed: { ...active.confirmed, 'attack.comboMultiplier': false, 'attacker.comboBuddyAtk1': false, 'attacker.comboBuddyAtk2': false },
            };
      return { ...state, hits: [...state.hits, hit], activeHitId: hit.id };
    }
    case 'removeHit': {
      if (state.hits.length <= 1) return state;
      const index = state.hits.findIndex((h) => h.id === action.id);
      const hits = state.hits.filter((h) => h.id !== action.id);
      const activeHitId = state.activeHitId === action.id ? hits[Math.max(0, index - 1)]!.id : state.activeHitId;
      return { ...state, hits, activeHitId };
    }
    case 'load':
      return action.workspace;
    case 'clear':
      return { ...defaultWorkspace(), highlightRequired: state.highlightRequired ?? true };
  }
}
