import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import { publicGet } from '../api/client';
import type { PublicImpactResponse, PublicStatItem, PublicUtilizationItem } from '../api/types';
import './ImpactPage.css';

export default function ImpactPage() {
  const [impact, setImpact] = useState<PublicImpactResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    publicGet<PublicImpactResponse>('/api/public/impact')
      .then((data) => {
        if (!cancelled) setImpact(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setImpact(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const publicStats =
    impact?.impactStats?.length && !loading && !error
      ? impact.impactStats.map((s: PublicStatItem) => ({ value: s.value, label: s.label }))
      : null;

  const utilization =
    impact?.utilization?.length && !loading && !error
      ? impact.utilization.map((u: PublicUtilizationItem) => ({ label: u.label, pct: u.pct }))
      : null;

  const heroLead = impact?.summaryText ?? null;

  const defaultHeroCopy =
    'Harbor of Hope publishes high-level outcomes and fund utilization so donors can see how collective generosity translates into safe homes, therapy, and education — without exposing resident identities.';

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
              {loading ? (
                <span aria-live="polite">Loading…</span>
              ) : error ? (
                <span role="alert">Impact content could not be loaded. Please try again later.</span>
              ) : (
                heroLead ?? defaultHeroCopy
              )}
            </p>
          </div>
        </section>

        <section className="impact-section" aria-labelledby="impact-stats-heading">
          <div className="impact-section__inner">
            <h2 id="impact-stats-heading" className="impact-section__title">
              Program reach
            </h2>
            {loading ? (
              <p style={{ color: 'var(--ink-muted)' }} aria-live="polite">Loading statistics…</p>
            ) : error ? (
              <p style={{ color: 'var(--ink-muted)' }} role="alert">No published statistics available.</p>
            ) : publicStats?.length ? (
              <div className="impact-stat-grid">
                {publicStats.map((s) => (
                  <div key={s.label} className="impact-stat">
                    <div className="impact-stat__value">{s.value}</div>
                    <div className="impact-stat__label">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--ink-muted)' }}>
                No published impact statistics yet. Check back after the next transparency snapshot is published.
              </p>
            )}
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
            {loading ? (
              <p style={{ color: 'var(--ink-muted)' }} aria-live="polite">Loading utilization…</p>
            ) : error ? (
              <p style={{ color: 'var(--ink-muted)' }} role="alert">No utilization breakdown available.</p>
            ) : utilization?.length ? (
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
            ) : (
              <p style={{ color: 'var(--ink-muted)' }}>
                No published fund utilization breakdown yet.
              </p>
            )}
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
