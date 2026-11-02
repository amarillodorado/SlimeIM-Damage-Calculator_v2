import { useEffect } from 'react';
import { hrefFor } from '../../app/router';
import css from './guide.module.css';
import {
  AtkGuide,
  ComboGuide,
  DoubleCounting,
  EffectsReference,
  FormulaGuide,
  Glossary,
  Limits,
  PopupsGuide,
  QuickStart,
  TauGuide,
  VerifiedGuide,
  WhereToFind,
} from './sections';

const SECTIONS: [string, string][] = [
  ['start', 'Quick start'],
  ['atk', 'ATK: two ways'],
  ['values', 'Where to find values'],
  ['double', 'Avoid double counting'],
  ['effects', 'All effect types'],
  ['popups', 'Popups & attributes'],
  ['combo', 'Combo bonus'],
  ['tau', 'True Attribute Unbound'],
  ['formula', 'How it’s calculated'],
  ['verified', 'Checking a hit'],
  ['glossary', 'Glossary'],
  ['limits', 'Limits'],
];

export default function GuidePage({ section }: { section?: string }) {
  useEffect(() => {
    if (!section) return;
    document.getElementById(`guide-${section}`)?.scrollIntoView({ block: 'start' });
  }, [section]);

  return (
    <div className={css.page}>
      <nav className={css.toc} aria-label="Guide sections">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={hrefFor('guide', id)} aria-current={section === id ? 'true' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <div className={css.content}>
        <QuickStart />
        <AtkGuide />
        <WhereToFind />
        <DoubleCounting />
        <EffectsReference />
        <PopupsGuide />
        <ComboGuide />
        <TauGuide />
        <FormulaGuide />
        <VerifiedGuide />
        <Glossary />
        <Limits />
      </div>
    </div>
  );
}
