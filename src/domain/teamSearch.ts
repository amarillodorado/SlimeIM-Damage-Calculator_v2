import { damageAt, type HitInput } from './engine';
import { applyUnits, combinations, countCombinations, MAX_COMBINATIONS, type SupportUnit, type TeamResult } from './teams';

export const MAX_RANKED_TEAMS = 150;
export interface SearchProgress {
  visited: number;
  total: number;
  eligible: number;
}
export interface SearchResult extends SearchProgress {
  results: TeamResult[];
}
export type SearchMessage = { type: 'progress'; progress: SearchProgress } | { type: 'done'; result: SearchResult } | { type: 'error'; message: string };
export interface SearchRequest {
  base: HitInput;
  pool: SupportUnit[];
  size: number;
  maxCost: number;
}
const compare = (a: TeamResult, b: TeamResult) => b.damage - a.damage || a.cost - b.cost;

/** Keep only the best results, preserving enumeration order for equal damage/cost. */
function insertBest(results: TeamResult[], next: TeamResult) {
  let lo = 0,
    hi = results.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (compare(next, results[mid]!) < 0) hi = mid;
    else lo = mid + 1;
  }
  if (lo >= MAX_RANKED_TEAMS) return;
  results.splice(lo, 0, next);
  if (results.length > MAX_RANKED_TEAMS) results.pop();
}

/** Used in a worker; bounded yielding also keeps the no-worker fallback responsive. */
export async function searchTeams(
  request: SearchRequest,
  onProgress: (p: SearchProgress) => void,
  cancelled: () => boolean = () => false,
): Promise<SearchResult | null> {
  const { base, size, maxCost } = request;
  const pool = request.pool.filter((unit) => unit.enabled !== false);
  const total = countCombinations(pool.length, size);
  if (!Number.isInteger(size) || size < 1 || size > 5 || total > MAX_COMBINATIONS)
    throw new Error('Choose a supported provider count and a smaller comparison.');
  const results: TeamResult[] = [];
  let visited = 0,
    eligible = 0,
    lastYield = performance.now(),
    lastReport = lastYield;
  onProgress({ visited, total, eligible });
  for (const units of combinations(pool, size)) {
    if (cancelled()) return null;
    const cost = units.reduce((sum, unit) => sum + unit.skillCost, 0);
    visited++;
    if (maxCost <= 0 || cost <= maxCost) {
      const damage = damageAt(applyUnits(base, units));
      eligible++;
      insertBest(results, { units, cost, damage });
    }
    if (visited % 25 === 0 && performance.now() - lastYield >= 12) {
      if (performance.now() - lastReport >= 100) {
        onProgress({ visited, total, eligible });
        lastReport = performance.now();
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      lastYield = performance.now();
    }
  }
  if (cancelled()) return null;
  return { results, visited, total, eligible };
}
