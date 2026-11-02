import { useCallback, useEffect, useState } from 'react';

export type Page = 'calculator' | 'teams' | 'guide';

export interface Route {
  page: Page;
  /** Guide section anchor, e.g. "atk". */
  section?: string;
  /** Share code from "?s=…". */
  share?: string;
}

/** Hash routes (#/teams, #/guide/atk, #/calculator?s=…) work on any static host without server rewrites. */
export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = clean.split('?');
  const [first, second] = path.split('/');
  const share = new URLSearchParams(query).get('s') ?? undefined;
  const page: Page = first === 'teams' || first === 'guide' ? first : 'calculator';
  return { page, section: page === 'guide' && second ? second : undefined, share };
}

export const hrefFor = (page: Page, section?: string) => `#/${page}${section ? `/${section}` : ''}`;

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((page: Page, section?: string) => {
    location.hash = hrefFor(page, section);
  }, []);
  return { route, navigate };
}
