import { lazy, Suspense, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Icon, type IconName } from '../components/Icon';
import { CalculatorPage } from '../features/calculator/CalculatorPage';
import { decodeWorkspace } from '../state/share';
import { useWorkspace } from '../state/workspaceContext';
import styles from './app.module.css';
import { hrefFor, useHashRoute, type Page } from './router';

// The guide and the team simulator are only loaded when opened.
const GuidePage = lazy(() => import('../features/guide/GuidePage'));
const TeamsPage = lazy(() => import('../features/teams/TeamsPage'));

const NAV: { page: Page; label: string; icon: IconName }[] = [
  { page: 'calculator', label: 'Calculator', icon: 'calculator' },
  { page: 'teams', label: 'Teams', icon: 'teams' },
  { page: 'guide', label: 'Guide', icon: 'guide' },
];

const TITLES: Record<Page, string> = {
  calculator: 'Damage calculator',
  teams: 'Buff combination comparison',
  guide: 'Guide',
};

export function App() {
  const { route, navigate } = useHashRoute();
  const { dispatch } = useWorkspace();
  const analyticsPath = `/${route.page}`;

  // A share link (#/calculator?s=…) replaces the current workspace once.
  useEffect(() => {
    if (!route.share) return;
    let cancelled = false;
    void decodeWorkspace(route.share).then((ws) => {
      if (cancelled) return;
      if (ws) dispatch({ type: 'load', workspace: ws });
      history.replaceState(null, '', hrefFor('calculator'));
      navigate('calculator');
    });
    return () => {
      cancelled = true;
    };
  }, [route.share, dispatch, navigate]);

  useEffect(() => {
    document.title = `${TITLES[route.page]} · Slime IM Damage Calc`;
    if (route.page !== 'guide' || !route.section) window.scrollTo({ top: 0 });
  }, [route.page, route.section]);

  return (
    <>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <a className={styles.brand} href={hrefFor('calculator')}>
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={34} height={34} />
            <span className={styles.brandText}>
              <strong>Slime IM Damage Calc</strong>
              <span>ISEKAI Memories · v6.5.1</span>
            </span>
          </a>
          <nav className={styles.nav} aria-label="Main">
            {NAV.map((n) => (
              <a key={n.page} className={styles.navLink} href={hrefFor(n.page)} aria-current={route.page === n.page ? 'page' : undefined}>
                <Icon name={n.icon} />
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className={styles.main} tabIndex={-1}>
        <Suspense fallback={<p className={styles.loading}>Loading…</p>}>
          {route.page === 'calculator' && <CalculatorPage />}
          {route.page === 'teams' && <TeamsPage />}
          {route.page === 'guide' && <GuidePage section={route.section} />}
        </Suspense>
        <footer className={styles.footer}>Fan-made tool, not affiliated with Bandai Namco.</footer>
      </main>

      <nav className={styles.bottomNav} aria-label="Main">
        {NAV.map((n) => (
          <a key={n.page} className={styles.bottomLink} href={hrefFor(n.page)} aria-current={route.page === n.page ? 'page' : undefined}>
            <Icon name={n.icon} size={22} />
            {n.label}
          </a>
        ))}
      </nav>
      {/* Track hash-based pages without including share codes or guide anchors. */}
      <Analytics route={analyticsPath} path={analyticsPath} mode={import.meta.env.DEV ? 'development' : 'production'} />
    </>
  );
}
