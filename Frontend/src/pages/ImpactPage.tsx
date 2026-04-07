import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import { publicGet } from '../api/client';
import type { PublicImpactResponse, PublicStatItem, PublicUtilizationItem } from '../api/types';
import './ImpactPage.css';

const fallbackPublicStats: { value: string; label: string }[] = [
  { value: '340+', label: 'Girls served since launch' },
  { value: '87¢', label: 'Of each program dollar to direct care (YTD)' },
  { value: '218', label: 'Successful reintegrations' },
  { value: '12', label: 'Certified safehouses' },
];

const fallbackUtilization = [
  { label: 'Safe housing & residential', pct: 42 },
  { label: 'Counseling & clinical', pct: 28 },
  { label: 'Education & life skills', pct: 18 },
  { label: 'Health & coordination', pct: 12 },
];

export default function ImpactPage() {
  const [publicStats, setPublicStats] = useState(fallbackPublicStats);
  const [utilization, setUtilization] = useState(fallbackUtilization);
  const [heroLead, setHeroLead] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicGet<PublicImpactResponse>('/api/public/impact')
      .then((data) => {
        if (cancelled) return;
        if (data.impactStats?.length) {
          setPublicStats(
            data.impactStats.map((s: PublicStatItem) => ({ value: s.value, label: s.label })),
          );
        }
        if (data.utilization?.length) {
          setUtilization(
            data.utilization.map((u: PublicUtilizationItem) => ({ label: u.label, pct: u.pct })),
          );
        }
        if (data.summaryText) setHeroLead(data.summaryText);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="impact-page">
      <a href="#impact-main" className="skip-link">
        Skip to main content
      </a>
      <PublicHeader />

      <main id="impact-main">
        <section className="impact-hero">
          <div className="impact-hero__inner">
            <span className="impact-hero__eyebrow">Public transparency</span>
            <h1>Your gifts at work</h1>
            <p>
              {heroLead ??
                'Harbor of Hope publishes high-level outcomes and fund utilization so donors can see how collective generosity translates into safe homes, therapy, and education — without exposing resident identities.'}
            </p>
          </div>
        </section>

        <section className="impact-section" aria-labelledby="impact-stats-heading">
          <div className="impact-section__inner">
            <h2 id="impact-stats-heading" className="impact-section__title">
              Program reach
            </h2>
            <div className="impact-stat-grid">
              {publicStats.map((s) => (
                <div key={s.label} className="impact-stat">
                  <div className="impact-stat__value">{s.value}</div>
                  <div className="impact-stat__label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="impact-section impact-section--tint" aria-labelledby="impact-funds-heading">
          <div className="impact-section__inner">
            <h2 id="impact-funds-heading" className="impact-section__title">
              Where program funds go
            </h2>
            <p className="impact-section__lede">
              Illustrative split for the current fiscal period. Final audited figures appear in the annual report.
            </p>
            <div className="impact-bars" role="list">
              {utilization.map((u) => (
                <div key={u.label} className="impact-bar-row" role="listitem">
                  <div className="impact-bar-row__label">{u.label}</div>
                  <div className="impact-bar-row__track" aria-hidden="true">
                    <div className="impact-bar-row__fill" style={{ width: `${u.pct}%` }} />
                  </div>
                  <div className="impact-bar-row__pct">{u.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="impact-section" aria-labelledby="impact-story-heading">
          <div className="impact-section__inner impact-cta">
            <h2 id="impact-story-heading" className="impact-section__title">
              Help us sustain this work
            </h2>
            <p>
              Every contribution funds trauma-informed care and long-term reintegration support. Thank you for standing with
              survivors.
            </p>
            <Link to="/donate" className="impact-cta__btn">
              Donate
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
