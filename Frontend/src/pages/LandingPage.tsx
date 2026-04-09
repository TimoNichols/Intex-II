import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RevealOnScroll from '../components/RevealOnScroll';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import { publicGet } from '../api/client';
import type { MissionCard, PublicImpactResponse } from '../api/types';

const SAFEHOUSES_BY_REGION = [
  {
    region: 'Luzon',
    houses: [
      { city: 'Quezon City', capacity: 8, occupancy: 8 },
      { city: 'Baguio City', capacity: 11, occupancy: 9 },
    ],
  },
  {
    region: 'Visayas',
    houses: [
      { city: 'Cebu City', capacity: 10, occupancy: 8 },
      { city: 'Iloilo City', capacity: 12, occupancy: 12 },
      { city: 'Bacolod', capacity: 12, occupancy: 12 },
      { city: 'Tacloban', capacity: 9, occupancy: 7 },
    ],
  },
  {
    region: 'Mindanao',
    houses: [
      { city: 'Davao City', capacity: 9, occupancy: 9 },
      { city: 'Cagayan de Oro', capacity: 8, occupancy: 6 },
      { city: 'General Santos', capacity: 6, occupancy: 6 },
    ],
  },
];

/** Shown when `metric_payload_json` omits these blocks so layout matches the original home page. */
const FALLBACK_MISSION_CARDS: MissionCard[] = [
  {
    title: 'Safe Homes',
    description:
      'We operate certified safehouses that provide secure, nurturing environments where girls can heal away from danger and instability.',
    iconKey: 'home',
  },
  {
    title: 'Trauma-Informed Care',
    description:
      "Licensed social workers deliver culturally sensitive counseling, group therapy, and individualized intervention plans designed around each resident's needs.",
    iconKey: 'heart',
  },
  {
    title: 'Path to Reintegration',
    description:
      'Through education, vocational training, and family reconnection, we help each girl build the skills and confidence to thrive independently.',
    iconKey: 'refresh',
  },
];

const FALLBACK_TRUST_STRIP = [
  'Verified 501(c)(3)',
  'Secure Transactions',
  'Annual Impact Report',
];

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

/* ─── Component ────────────────────────────────────────────── */
export default function LandingPage() {
  const [impact, setImpact] = useState<PublicImpactResponse | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicGet<PublicImpactResponse>('/api/public/impact')
      .then((data) => {
        if (!cancelled) setImpact(data);
      })
      .catch(() => {
        if (!cancelled) setImpact(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const hero = impact?.landingHero;
  const missionSection = impact?.missionSection;
  const displayMissionCards =
    impact?.missionCards?.length ? impact.missionCards : FALLBACK_MISSION_CARDS;
  const displayTrustStrip =
    impact?.trustStrip?.length ? impact.trustStrip : FALLBACK_TRUST_STRIP;

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
            </div>
          </RevealOnScroll>
        </section>

        {/* ── Mission Cards (API overrides copy when published in snapshot JSON) ── */}
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
              <p className="section-subtitle">
                {missionSection?.subtitle ??
                  'Our three pillars guide every decision we make — from the design of our safehouses to the training of our staff and the structure of our programs.'}
              </p>
            </div>
            <div className="mission__grid">
              {displayMissionCards.map((item) => (
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

        {/* ── Impact Stats ── */}
        <section
          id="impact"
          className="impact"
          aria-labelledby="impact-heading"
        >
          <RevealOnScroll className="impact__inner">
            <div className="impact__panel">
              <div className="impact__header">
                <span className="section-label">Our Impact</span>
                <h2 id="impact-heading" className="section-title">
                  Numbers that represent real lives
                </h2>
              </div>
              <div className="impact__cta">
                <Link to="/impact" className="btn-primary">
                  See how we are making a difference <IconArrowRight />
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </section>

        {/* ── Philippines Safehouses ── */}
        <section
          id="safehouses"
          className="section philippines-section"
          aria-labelledby="philippines-heading"
        >
          <RevealOnScroll className="section__inner">
            <div className="philippines__header">
              <span className="section-label">Our Reach</span>
              <h2 id="philippines-heading" className="section-title">
                Safe Houses Across the Philippines
              </h2>
              <p className="section-subtitle">
                We operate 9 certified Lighthouse Safe Houses spanning all three major island groups Luzon, Visayas, and Mindanao providing secure shelter and trauma informed care to young women throughout the nation.
              </p>
            </div>

            <div className="philippines__summary" role="list" aria-label="Safehouse network overview">
              <div className="philippines__summary-stat" role="listitem">
                <span className="philippines__summary-num">9</span>
                <span className="philippines__summary-label">Safe Houses</span>
              </div>
              <div className="philippines__summary-stat" role="listitem">
                <span className="philippines__summary-num">85</span>
                <span className="philippines__summary-label">Total Capacity</span>
              </div>
              <div className="philippines__summary-stat" role="listitem">
                <span className="philippines__summary-num">3</span>
                <span className="philippines__summary-label">Regions Covered</span>
              </div>
            </div>

            <div className="philippines__layout">
              <div className="philippines__map-col">
                <div className="philippines__map-wrapper">
                  <img
                    src="/images/Phil-modified.png"
                    alt="Map of the Philippines highlighting Luzon, Visayas, and Mindanao safehouse regions"
                    className="philippines__image"
                  />
                  <svg
                    className="philippines__overlay"
                    viewBox="0 0 2752 1536"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                  >
                    <defs>
                      <filter id="region-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="32" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Luzon — large northern island */}
                    <path
                      className={`region-highlight region-highlight--luzon${hoveredRegion === 'Luzon' ? ' active' : ''}`}
                      d="M 1320,105 Q 1410,70 1505,68 Q 1600,65 1660,108 Q 1720,150 1740,225 Q 1760,300 1753,385 Q 1745,470 1718,545 Q 1690,620 1615,675 Q 1540,730 1460,725 Q 1380,720 1320,665 Q 1260,610 1228,530 Q 1195,450 1190,360 Q 1185,270 1208,205 Q 1230,140 1320,105 Z"
                    />
                    {/* Visayas — central island cluster */}
                    <path
                      className={`region-highlight region-highlight--visayas${hoveredRegion === 'Visayas' ? ' active' : ''}`}
                      d="M 1140,780 Q 1180,710 1340,698 Q 1500,685 1610,690 Q 1720,695 1810,723 Q 1900,750 1935,810 Q 1970,870 1950,930 Q 1930,990 1825,1020 Q 1720,1050 1585,1048 Q 1450,1045 1325,1008 Q 1200,970 1150,910 Q 1100,850 1140,780 Z"
                    />
                    {/* Mindanao — large southern island */}
                    <path
                      className={`region-highlight region-highlight--mindanao${hoveredRegion === 'Mindanao' ? ' active' : ''}`}
                      d="M 1430,1105 Q 1460,1030 1580,1015 Q 1700,1000 1835,1008 Q 1970,1015 2050,1053 Q 2130,1090 2145,1170 Q 2160,1250 2120,1330 Q 2080,1410 1960,1443 Q 1840,1475 1715,1468 Q 1590,1460 1510,1408 Q 1430,1355 1415,1268 Q 1400,1180 1430,1105 Z"
                    />
                  </svg>
                </div>
              </div>
              <div className="philippines__regions">
                {SAFEHOUSES_BY_REGION.map((r) => {
                  const totalCap = r.houses.reduce((s, h) => s + h.capacity, 0);
                  const totalOcc = r.houses.reduce((s, h) => s + h.occupancy, 0);
                  const pct = Math.round((totalOcc / totalCap) * 100);
                  return (
                    <article
                      key={r.region}
                      className={`region-card${hoveredRegion === r.region ? ' region-card--active' : ''}`}
                      onMouseEnter={() => setHoveredRegion(r.region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                    >
                      <div className="region-card__header">
                        <h3 className="region-card__name">{r.region}</h3>
                        <span className="region-card__badge">
                          {r.houses.length} safe {r.houses.length === 1 ? 'house' : 'houses'}
                        </span>
                      </div>
                      <div className="region-card__stats">
                        <div className="region-stat">
                          <span className="region-stat__num">{totalOcc}</span>
                          <span className="region-stat__label">Residents</span>
                        </div>
                        <div className="region-stat">
                          <span className="region-stat__num">{totalCap}</span>
                          <span className="region-stat__label">Capacity</span>
                        </div>
                        <div className="region-stat">
                          <span className="region-stat__num">{pct}%</span>
                          <span className="region-stat__label">Occupied</span>
                        </div>
                      </div>
                      <div
                        className="region-card__bar"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${r.region} occupancy ${pct}%`}
                      >
                        <div className="region-card__bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="region-card__cities" aria-label={`Cities in ${r.region}`}>
                        {r.houses.map((h) => (
                          <span key={h.city} className="city-tag">{h.city}</span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </RevealOnScroll>
        </section>

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
              Our safehouses are filling up quickly as more young women need a secure place to
              heal and we are running out of room to say yes. Your support helps us expand
              capacity, stand up additional shelter, and create the space every girl deserves
              when she reaches out for help.
            </p>
            <Link to="/donate" className="btn-primary" aria-label="Donate to Harbor of Hope">
              Donate Today <IconArrowRight />
            </Link>
            <div className="donor-cta__trust" role="list" aria-label="Donor trust indicators">
              {displayTrustStrip.map((item) => (
                <span key={item} className="trust-item" role="listitem">
                  <IconCheck /> {item}
                </span>
              ))}
            </div>
          </RevealOnScroll>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
