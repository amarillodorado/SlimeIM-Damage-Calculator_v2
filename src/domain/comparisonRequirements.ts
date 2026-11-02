import { getMissingRequirements } from './requirements';
import type { SupportUnit } from './teams';
import type { Enemy, Hit } from './types';

/** Validate dependencies introduced by any provider that can enter a legal combination. */
export function comparisonRequirements(hit: Hit, enemy: Enemy, pool: SupportUnit[], size: number, maxCost: number) {
  const possible =
    pool.length < size
      ? []
      : pool.filter((unit, index) => {
          if (maxCost <= 0) return true;
          const others = pool
            .filter((_, i) => i !== index)
            .map((u) => u.skillCost)
            .sort((a, b) => a - b)
            .slice(0, size - 1);
          return unit.skillCost + others.reduce((sum, cost) => sum + cost, 0) <= maxCost;
        });
  const attack = { ...hit.attack };
  if (possible.some((unit) => unit.triggers.synergy) && attack.synergy === 'off') attack.synergy = 'normal';
  if (possible.some((unit) => unit.triggers.aegis) && attack.aegis === 'off') attack.aegis = 'normal';
  const candidate = { ...hit, attack };
  const missing = getMissingRequirements(candidate, enemy);
  return {
    missing,
    needsSupport: attack.synergy !== 'off' || (hit.attacker.atkMode === 'build' && hit.attacker.addSupportAtk),
    needsDef: attack.aegis !== 'off',
  };
}
