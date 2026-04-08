import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RevealOnScroll from '../components/RevealOnScroll';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import { publicGet } from '../api/client';
import type { PublicImpactResponse, PublicStatItem } from '../api/types';

/* ─── SVG Icon Components ──────────────────────────────────── */
const IconHome = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconHeart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const IconRefreshCw = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);


const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

function MissionCardIcon({ iconKey }: { iconKey: string | null | undefined }) {
  if (iconKey === 'heart') return <IconHeart />;
  if (iconKey === 'refresh') return <IconRefreshCw />;
  return <IconHome />;
}

function mapLandingStats(api: PublicStatItem[] | null | undefined) {
  if (!api?.length) return null;
  return api.map((s) => ({ number: s.value, label: s.label }));
}

/* ─── Component ────────────────────────────────────────────── */
export default function LandingPage() {
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

  const stats = mapLandingStats(impact?.landingStats ?? null);
  const hero = impact?.landingHero;
  const missionSection = impact?.missionSection;
  const missionCards = impact?.missionCards?.length ? impact.missionCards : null;
  const journeySection = impact?.journeySection;
  const journeySteps = impact?.journeySteps?.length ? impact.journeySteps : null;
  const testimonial = impact?.testimonial?.quote ? impact.testimonial : null;
  const programTags = impact?.programTags?.length ? impact.programTags : null;
  const trustStrip = impact?.trustStrip?.length ? impact.trustStrip : null;
  const showJourneyBlock = Boolean(journeySteps?.length || testimonial || programTags?.length);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <PublicHeader />

      <main id="main-content">
        {/* ── Hero ── */}
        <section id="home" className="hero" aria-labelledby="hero-heading">
          <RevealOnScroll className="hero__inner">
            <div className="hero__eyebrow" aria-hidden="true">
              <span className="hero__eyebrow-dot" />
              {hero?.eyebrow ?? '501(c)(3) Nonprofit Organization'}
            </div>
            <h1 id="hero-heading">
              {hero?.titleLine1 || hero?.titleEmphasis ? (
                <>
                  {hero.titleLine1 && (
                    <>
                      {hero.titleLine1}
                      <br />
                    </>
                  )}
                  {hero.titleEmphasis ? <em>{hero.titleEmphasis}</em> : null}
                </>
              ) : (
                <>
                  Restoring Safety.<br />
                  <em>Rebuilding Lives.</em>
                </>
              )}
            </h1>
            <p className="hero__sub">
              {hero?.sub ??
                'We provide safe homes, trauma-informed care, and a clear path forward for girls who have survived abuse and trafficking because every child deserves safety, dignity, and a future full of possibility.'}
            </p>
            <div className="hero__actions">
              <Link to="/donate" className="btn-primary">
                Donate Now <IconArrowRight />
              </Link>
              <a href="#how-it-works" className="btn-outline">
                Learn More
              </a>
            </div>
          </RevealOnScroll>
        </section>

        {/* ── Mission Cards (DB-driven when published in snapshot JSON) ── */}
        {missionCards && (
          <section
            id="mission"
            className="section mission"
            aria-labelledby="mission-heading"
          >
            <RevealOnScroll className="section__inner reveal-on-scroll--stagger-mission">
              <div className="mission__header">
                <span className="section-label">{missionSection?.sectionLabel ?? 'Our Mission'}</span>
                <h2 id="mission-heading" className="section-title">
                  {missionSection?.heading ?? 'Everything a child needs to heal'}
                </h2>
                {missionSection?.subtitle ? (
                  <p className="section-subtitle">{missionSection.subtitle}</p>
                ) : null}
              </div>
              <div className="mission__grid">
                {missionCards.map((item) => (
                  <article key={item.title} className="mission-card">
                    <div className="mission-card__icon" aria-hidden="true">
                      <MissionCardIcon iconKey={item.iconKey} />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </RevealOnScroll>
          </section>
        )}

        {/* ── Impact Stats ── */}
        <section
          id="impact"
          className="impact"
          aria-labelledby="impact-heading"
        >
          <RevealOnScroll className="impact__inner reveal-on-scroll--stagger-impact">
            <div className="impact__header">
              <span className="section-label">Our Impact</span>
              <h2 id="impact-heading" className="section-title">
                Numbers that represent real lives
              </h2>
            </div>
            {loading ? (
              <p style={{ color: 'var(--ink-muted)' }} aria-live="polite">Loading impact metrics…</p>
            ) : error ? (
              <p style={{ color: 'var(--ink-muted)' }} role="alert">
                Impact metrics could not be loaded. Try again later or visit the{' '}
                <Link to="/impact">Impact dashboard</Link>.
              </p>
            ) : stats?.length ? (
              <div className="impact__grid" role="list">
                {stats.map((stat) => (
                  <div key={stat.label} className="stat-card" role="listitem">
                    <div className="stat-card__number" aria-label={`${stat.number} ${stat.label}`}>
                      {stat.number}
                    </div>
                    <div className="stat-card__label" aria-hidden="true">{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--ink-muted)' }}>
                Published impact figures will appear here when available. See the{' '}
                <Link to="/impact">Impact dashboard</Link> for the latest transparency snapshot.
              </p>
            )}
          </RevealOnScroll>
        </section>

        {/* ── How It Works + testimonial (DB-driven when published) ── */}
        {showJourneyBlock && (
          <section
            id="how-it-works"
            className="section how"
            aria-labelledby="how-heading"
          >
            <RevealOnScroll className="section__inner reveal-on-scroll--stagger-how">
              <div
                className="how__layout"
                style={
                  journeySteps?.length
                    ? undefined
                    : { gridTemplateColumns: '1fr', maxWidth: 640, margin: '0 auto' }
                }
              >
                {journeySteps?.length ? (
                  <div>
                    <div className="how__header">
                      <span className="section-label">{journeySection?.sectionLabel ?? 'The Journey'}</span>
                      <h2 id="how-heading" className="section-title">
                        {journeySection?.heading ?? 'How we walk alongside every resident'}
                      </h2>
                      {journeySection?.subtitle ? (
                        <p className="section-subtitle">{journeySection.subtitle}</p>
                      ) : null}
                    </div>
                    <ol className="how__steps" aria-label="Program steps">
                      {journeySteps.map((step, i) => (
                        <li key={`${step.title}-${i}`} className="step">
                          <div className="step__number" aria-hidden="true">{i + 1}</div>
                          <div className="step__content">
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : journeySection && (testimonial || programTags?.length) ? (
                  <div className="how__header">
                    <span className="section-label">{journeySection.sectionLabel ?? 'The Journey'}</span>
                    <h2 id="how-heading" className="section-title">
                      {journeySection.heading ?? 'How we walk alongside every resident'}
                    </h2>
                    {journeySection.subtitle ? (
                      <p className="section-subtitle">{journeySection.subtitle}</p>
                    ) : null}
                  </div>
                ) : null}

                {(testimonial || programTags?.length) && (
                  <aside className="how__visual" aria-label="Resident testimonial">
                    {testimonial && (
                      <blockquote>
                        <p className="how__visual-quote">{testimonial.quote}</p>
                        {testimonial.attribution ? (
                          <footer>
                            <cite className="how__visual-attr">— {testimonial.attribution}</cite>
                          </footer>
                        ) : null}
                      </blockquote>
                    )}
                    {programTags?.length ? (
                      <div className="how__visual-tags" aria-label="Program areas">
                        {programTags.map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </aside>
                )}
              </div>
            </RevealOnScroll>
          </section>
        )}

        {/* ── Donor CTA ── */}
        <section
          id="donate"
          className="donor-cta"
          aria-labelledby="donate-heading"
        >
          <RevealOnScroll className="donor-cta__inner reveal-on-scroll--stagger-donate">
            <div className="donor-cta__icon" aria-hidden="true">
              <IconHeart />
            </div>
            <h2 id="donate-heading">Your generosity changes everything</h2>
            <p>
              Every donation directly funds safe housing, counseling sessions, and
              educational resources for girls in our care. No marketing budget. No
              intermediaries. 100% of program funds reach the residents we serve.
            </p>
            <Link to="/donate" className="btn-primary" aria-label="Donate to Harbor of Hope">
              Donate Today <IconArrowRight />
            </Link>
            {trustStrip && (
              <div className="donor-cta__trust" role="list" aria-label="Donor trust indicators">
                {trustStrip.map((item) => (
                  <span key={item} className="trust-item" role="listitem">
                    <IconCheck /> {item}
                  </span>
                ))}
              </div>
            )}
          </RevealOnScroll>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
