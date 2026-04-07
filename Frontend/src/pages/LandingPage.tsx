import { Link } from 'react-router-dom';
import RevealOnScroll from '../components/RevealOnScroll';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';

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

/* ─── Data ─────────────────────────────────────────────────── */
const missionItems = [
  {
    icon: <IconHome />,
    title: 'Safe Homes',
    description:
      'We operate certified safehouses that provide secure, nurturing environments where girls can heal away from danger and instability.',
  },
  {
    icon: <IconHeart />,
    title: 'Trauma-Informed Care',
    description:
      "Licensed social workers deliver culturally sensitive counseling, group therapy, and individualized intervention plans designed around each resident's needs.",
  },
  {
    icon: <IconRefreshCw />,
    title: 'Path to Reintegration',
    description:
      'Through education, vocational training, and family reconnection, we help each girl build the skills and confidence to thrive independently.',
  },
];

const stats = [
  { number: '340+', label: 'Girls Served' },
  { number: '12',   label: 'Active Safehouses' },
  { number: '218',  label: 'Successful Reintegrations' },
  { number: '7',    label: 'Years of Service' },
];

const steps = [
  {
    title: 'Referral & Intake',
    desc: 'Cases are referred by social welfare agencies, law enforcement, or community partners. Our team conducts an initial safety assessment within 24 hours.',
  },
  {
    title: 'Assessment & Planning',
    desc: 'A dedicated social worker completes a full case assessment and develops a personalized care and reintegration plan in collaboration with the resident.',
  },
  {
    title: 'The Healing Journey',
    desc: 'Residents participate in counseling sessions, educational programs, life skills training, and health services at a pace that respects their recovery.',
  },
  {
    title: 'Reintegration Support',
    desc: 'When ready, we facilitate family reunification or placement in a safe community setting, with follow-up monitoring to ensure lasting stability.',
  },
];

/* ─── Component ────────────────────────────────────────────── */
export default function LandingPage() {
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
              501(c)(3) Nonprofit Organization
            </div>
            <h1 id="hero-heading">
              Restoring Safety.<br />
              <em>Rebuilding Lives.</em>
            </h1>
            <p className="hero__sub">
              We provide safe homes, trauma-informed care, and a clear path forward for
              girls who have survived abuse and trafficking because every child deserves
              safety, dignity, and a future full of possibility.
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

        {/* ── Mission Cards ── */}
        <section
          id="mission"
          className="section mission"
          aria-labelledby="mission-heading"
        >
          <RevealOnScroll className="section__inner reveal-on-scroll--stagger-mission">
            <div className="mission__header">
              <span className="section-label">Our Mission</span>
              <h2 id="mission-heading" className="section-title">
                Everything a child needs to heal
              </h2>
              <p className="section-subtitle">
                Our three pillars guide every decision we make — from the design of our
                safehouses to the training of our staff and the structure of our programs.
              </p>
            </div>
            <div className="mission__grid">
              {missionItems.map(item => (
                <article key={item.title} className="mission-card">
                  <div className="mission-card__icon" aria-hidden="true">
                    {item.icon}
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
          <RevealOnScroll className="impact__inner reveal-on-scroll--stagger-impact">
            <div className="impact__header">
              <span className="section-label">Our Impact</span>
              <h2 id="impact-heading" className="section-title">
                Numbers that represent real lives
              </h2>
            </div>
            <div className="impact__grid" role="list">
              {stats.map(stat => (
                <div key={stat.label} className="stat-card" role="listitem">
                  <div className="stat-card__number" aria-label={`${stat.number} ${stat.label}`}>
                    {stat.number}
                  </div>
                  <div className="stat-card__label" aria-hidden="true">{stat.label}</div>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </section>

        {/* ── How It Works ── */}
        <section
          id="how-it-works"
          className="section how"
          aria-labelledby="how-heading"
        >
          <RevealOnScroll className="section__inner reveal-on-scroll--stagger-how">
            <div className="how__layout">
              <div>
                <div className="how__header">
                  <span className="section-label">The Journey</span>
                  <h2 id="how-heading" className="section-title">
                    How we walk alongside every resident
                  </h2>
                  <p className="section-subtitle">
                    Recovery is not a single event — it's a carefully supported journey.
                    Here's how we guide each girl from crisis to confidence.
                  </p>
                </div>
                <ol className="how__steps" aria-label="Program steps">
                  {steps.map((step, i) => (
                    <li key={step.title} className="step">
                      <div className="step__number" aria-hidden="true">{i + 1}</div>
                      <div className="step__content">
                        <h3>{step.title}</h3>
                        <p>{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Pull quote panel */}
              <aside className="how__visual" aria-label="Resident testimonial">
                <blockquote>
                  <p className="how__visual-quote">
                    "I didn't believe I had a future. The staff here showed me, step by
                    step, that I could have one. Now I'm finishing secondary school and
                    I know who I am."
                  </p>
                  <footer>
                    <cite className="how__visual-attr">— Former resident, age 17</cite>
                  </footer>
                </blockquote>
                <div className="how__visual-tags" aria-label="Program areas">
                  {['Education', 'Counseling', 'Life Skills', 'Family Support', 'Health & Wellness'].map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </aside>
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
              Every donation directly funds safe housing, counseling sessions, and
              educational resources for girls in our care. No marketing budget. No
              intermediaries. 100% of program funds reach the residents we serve.
            </p>
            <Link to="/donate" className="btn-primary" aria-label="Donate to Harbor of Hope">
              Donate Today <IconArrowRight />
            </Link>
            <div className="donor-cta__trust" role="list" aria-label="Donor trust indicators">
              {[
                'Verified 501(c)(3)',
                'Secure Transactions',
                'Annual Impact Report',
              ].map(item => (
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
