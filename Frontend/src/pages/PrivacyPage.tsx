import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import './PrivacyPage.css';

const EFFECTIVE_DATE = 'April 6, 2026';

export default function PrivacyPage() {
  return (
    <div className="privacy-page">
      <a href="#privacy-main" className="skip-link">
        Skip to main content
      </a>
      <PublicHeader />

      <main id="privacy-main" className="privacy-main">
        <div className="privacy-wrap">

          {/* ── Hero ── */}
          <header className="privacy-page-header">
            <p className="privacy-page-header__eyebrow">Legal</p>
            <h1>Privacy Policy</h1>
            <p className="privacy-page-header__meta">
              Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Harbor of Hope, Inc. (501(c)(3))
            </p>
            <p className="privacy-page-header__lede">
              Harbor of Hope is a US-based nonprofit providing trauma-informed safehouses
              and rehabilitation services for minor survivors of abuse in the Philippines.
              This policy explains what personal data we collect, how we use it, and the
              choices you have. It is written to align with the EU General Data Protection
              Regulation (GDPR) and applicable US laws.
            </p>
          </header>

          {/* ── Table of contents ── */}
          <nav className="privacy-toc" aria-label="Policy sections">
            <p className="privacy-toc__title">Contents</p>
            <ol>
              <li><a href="#p-controller">1. Who we are</a></li>
              <li><a href="#p-collect">2. Data we collect</a></li>
              <li><a href="#p-use">3. How we use your data</a></li>
              <li><a href="#p-cookies">4. Cookies</a></li>
              <li><a href="#p-sharing">5. Sharing &amp; disclosure</a></li>
              <li><a href="#p-transfers">6. International transfers</a></li>
              <li><a href="#p-retention">7. Retention</a></li>
              <li><a href="#p-rights">8. Your rights</a></li>
              <li><a href="#p-security">9. Security</a></li>
              <li><a href="#p-children">10. Children's privacy</a></li>
              <li><a href="#p-changes">11. Changes</a></li>
              <li><a href="#p-contact">12. Contact us</a></li>
            </ol>
          </nav>

          <article className="privacy-article">

            {/* 1. Who we are */}
            <section id="p-controller" className="privacy-section">
              <h2>1. Who we are</h2>
              <p>
                <strong>Harbor of Hope, Inc.</strong> is a 501(c)(3) nonprofit corporation
                organized under the laws of the United States. We operate residential
                safehouses and rehabilitation programs for minor survivors of sexual and
                physical abuse in the Philippines.
              </p>
              <p>
                For the purposes of the GDPR, Harbor of Hope, Inc. is the <strong>data
                controller</strong> for personal data collected through this website and our
                donor, volunteer, and staff platforms.
              </p>
              <div className="privacy-callout">
                <p>
                  <strong>Privacy contact:</strong>{' '}
                  <a href="mailto:privacy@harborofhope.org">privacy@harborofhope.org</a>
                  <br />
                  Harbor of Hope, Inc. · United States
                </p>
              </div>
            </section>

            {/* 2. Data we collect */}
            <section id="p-collect" className="privacy-section">
              <h2>2. Data we collect</h2>

              <h3>Donors and supporters</h3>
              <ul>
                <li>
                  <strong>Identity data:</strong> first name, last name, display name.
                </li>
                <li>
                  <strong>Contact data:</strong> email address, mailing address (for tax
                  receipts).
                </li>
                <li>
                  <strong>Donation history:</strong> gift amounts, dates, campaign
                  attribution, and payment method type (we do not store full card numbers —
                  payments are processed by PCI-DSS-certified third-party processors).
                </li>
                <li>
                  <strong>Communication preferences:</strong> opt-in or opt-out status for
                  updates and newsletters.
                </li>
              </ul>

              <h3>Staff and volunteers</h3>
              <ul>
                <li>
                  Account credentials (email address; passwords are hashed, never stored
                  in plaintext).
                </li>
                <li>Role assignment and access logs for internal systems.</li>
              </ul>

              <h3>Website visitors</h3>
              <ul>
                <li>
                  Technical logs: IP address, browser type and version, referring URL,
                  pages viewed, and timestamps. These are collected automatically by our
                  hosting infrastructure and are retained for security and troubleshooting.
                </li>
                <li>
                  Cookie data as described in{' '}
                  <a href="#p-cookies">Section 4</a>.
                </li>
              </ul>

              <p>
                We do <strong>not</strong> knowingly collect sensitive personal data
                (racial origin, health, religious belief) from donors or website visitors.
                Resident and case-management data is governed by a separate, internal
                data-handling policy and is never published or shared beyond authorized
                program staff.
              </p>
            </section>

            {/* 3. How we use data */}
            <section id="p-use" className="privacy-section">
              <h2>3. How we use your data</h2>
              <p>
                We process personal data only where a lawful basis applies under GDPR
                Article 6:
              </p>
              <ul>
                <li>
                  <strong>Performance of a contract</strong> (Art. 6(1)(b)) — processing
                  and acknowledging donations you initiate; creating and maintaining a donor
                  account at your request.
                </li>
                <li>
                  <strong>Legal obligation</strong> (Art. 6(1)(c)) — issuing tax receipts;
                  satisfying US IRS and Philippine regulatory reporting requirements;
                  complying with child-protection laws.
                </li>
                <li>
                  <strong>Legitimate interests</strong> (Art. 6(1)(f)) — securing and
                  improving our systems; detecting and preventing fraud; sending donor
                  stewardship updates where we have an existing relationship (with opt-out
                  available at any time). Our legitimate interests are balanced against your
                  rights and do not override them.
                </li>
                <li>
                  <strong>Consent</strong> (Art. 6(1)(a)) — marketing newsletters and
                  non-essential cookies, where we obtain your explicit agreement.
                </li>
              </ul>
              <p>
                We do <strong>not</strong> use your data for automated profiling that
                produces legal or similarly significant effects.
              </p>
            </section>

            {/* 4. Cookies */}
            <section id="p-cookies" className="privacy-section">
              <h2>4. Cookies</h2>
              <p>
                A cookie is a small text file placed on your device. We use cookies for
                the following purposes:
              </p>

              <h3>Strictly necessary (no consent required)</h3>
              <ul>
                <li>
                  <strong>Authentication token</strong> — stores a short-lived session
                  token after you log in to the donor or staff portal. Without this cookie
                  the portal cannot function. It expires when you close your browser or
                  after 8 hours, whichever comes first.
                </li>
              </ul>

              <h3>Functional / preference (requires consent)</h3>
              <ul>
                <li>
                  <strong><code>cookie_consent</code></strong> — remembers whether you
                  accepted or declined non-essential cookies. Persists for 1 year. This
                  cookie is always set regardless of your choice so we can honor your
                  preference on future visits.
                </li>
              </ul>

              <h3>Managing cookies</h3>
              <p>
                You can change your cookie preferences at any time by clicking
                "Cookie Settings" in the footer. You may also configure your browser to
                block or delete cookies; note that doing so may prevent the portal from
                functioning correctly.
              </p>
              <p>
                We do <strong>not</strong> use advertising, tracking, or third-party
                analytics cookies.
              </p>
            </section>

            {/* 5. Sharing */}
            <section id="p-sharing" className="privacy-section">
              <h2>5. Sharing &amp; disclosure</h2>
              <p>
                <strong>We do not sell, rent, or trade personal data to any third party,
                ever.</strong>
              </p>
              <p>We share data only in the following limited circumstances:</p>
              <ul>
                <li>
                  <strong>Service providers (processors):</strong> cloud hosting, email
                  delivery, and payment processing partners who act on our instructions
                  under data-processing agreements. They are not permitted to use your data
                  for their own purposes.
                </li>
                <li>
                  <strong>Legal requirements:</strong> when disclosure is required by law,
                  subpoena, court order, or to protect the safety of our residents or
                  staff.
                </li>
                <li>
                  <strong>Organizational transfers:</strong> if Harbor of Hope merges with
                  or transfers operations to another nonprofit, data may transfer subject to
                  equivalent privacy protections. We will provide notice.
                </li>
              </ul>
            </section>

            {/* 6. International transfers */}
            <section id="p-transfers" className="privacy-section">
              <h2>6. International transfers</h2>
              <p>
                Harbor of Hope is headquartered in the United States and operates programs
                in the Philippines. Personal data may be stored on servers hosted in the
                United States. If you are located in the European Economic Area (EEA) or
                the United Kingdom, your data is transferred to the US under one or more of
                the following safeguards:
              </p>
              <ul>
                <li>
                  European Commission Standard Contractual Clauses (SCCs) with our
                  processors.
                </li>
                <li>
                  Adequacy decisions where applicable.
                </li>
              </ul>
              <p>
                You may request a copy of the applicable safeguards by contacting us at the
                address in Section 12.
              </p>
            </section>

            {/* 7. Retention */}
            <section id="p-retention" className="privacy-section">
              <h2>7. Retention</h2>
              <ul>
                <li>
                  <strong>Donor records</strong> are kept for 7 years from the date of the
                  last donation to satisfy US tax and nonprofit reporting requirements.
                </li>
                <li>
                  <strong>Account data</strong> is deleted within 30 days of an account
                  closure request, except where retention is required by law.
                </li>
                <li>
                  <strong>Technical logs</strong> are retained for up to 90 days for
                  security purposes, then deleted.
                </li>
                <li>
                  <strong>Cookie consent records</strong> are kept for the duration of the
                  consent (1 year).
                </li>
              </ul>
              <p>
                Case-management and resident data are governed by a separate internal
                retention schedule that complies with Philippine child-protection statutes
                and is not described on this public page.
              </p>
            </section>

            {/* 8. Your rights */}
            <section id="p-rights" className="privacy-section">
              <h2>8. Your rights</h2>
              <p>
                Depending on your location, you may have the following rights under GDPR
                or equivalent law:
              </p>
              <ul>
                <li>
                  <strong>Access</strong> — obtain a copy of the personal data we hold
                  about you.
                </li>
                <li>
                  <strong>Rectification</strong> — ask us to correct inaccurate data.
                </li>
                <li>
                  <strong>Erasure ("right to be forgotten")</strong> — request deletion,
                  subject to our legal-retention obligations.
                </li>
                <li>
                  <strong>Restriction</strong> — ask us to limit processing in certain
                  circumstances.
                </li>
                <li>
                  <strong>Portability</strong> — receive your data in a machine-readable
                  format where processing is based on consent or contract.
                </li>
                <li>
                  <strong>Objection</strong> — object to processing based on legitimate
                  interests or for direct marketing.
                </li>
                <li>
                  <strong>Withdraw consent</strong> — at any time, without affecting
                  lawfulness of prior processing.
                </li>
              </ul>
              <div className="privacy-callout">
                <p>
                  To exercise any of these rights, email{' '}
                  <a href="mailto:privacy@harborofhope.org">privacy@harborofhope.org</a>{' '}
                  with "Privacy Request" in the subject line. We will respond within 30
                  days and may ask you to verify your identity. You also have the right to
                  lodge a complaint with your local supervisory authority (e.g., your
                  national Data Protection Authority within the EEA or UK ICO).
                </p>
              </div>
            </section>

            {/* 9. Security */}
            <section id="p-security" className="privacy-section">
              <h2>9. Security</h2>
              <p>
                We implement technical and organizational security measures proportionate
                to the sensitivity of the data, including:
              </p>
              <ul>
                <li>TLS encryption for all data in transit.</li>
                <li>Hashed, salted storage of passwords.</li>
                <li>Role-based access controls limiting staff access to what their
                  role requires.</li>
                <li>Regular access reviews and audit logging on sensitive systems.</li>
              </ul>
              <p>
                No method of electronic storage or transmission is 100% secure. In the
                event of a data breach that is likely to result in high risk to your rights
                and freedoms, we will notify you and relevant supervisory authorities as
                required by law.
              </p>
            </section>

            {/* 10. Children's privacy */}
            <section id="p-children" className="privacy-section">
              <h2>10. Children's privacy</h2>
              <p>
                This public website and donor portal are intended for adults. We do not
                knowingly collect personal data from children under 13 (or the applicable
                minimum age in your jurisdiction) through this website. If you believe we
                have inadvertently collected such data, please contact us immediately so we
                can delete it.
              </p>
              <p>
                Data relating to the minor residents in our care is held under strict
                confidentiality, accessible only to authorized program staff, and managed
                in accordance with Philippine Republic Act No. 7610 (Special Protection of
                Children Against Abuse) and related child-protection statutes.{' '}
                <strong>It is never published or included in public-facing systems.</strong>
              </p>
            </section>

            {/* 11. Changes */}
            <section id="p-changes" className="privacy-section">
              <h2>11. Changes to this policy</h2>
              <p>
                We may update this policy as our practices evolve or as laws change. We
                will update the effective date at the top of this page. For material
                changes we will provide prominent notice on the site or by email to
                registered donors and staff at least 14 days before the change takes
                effect.
              </p>
            </section>

            {/* 12. Contact */}
            <section id="p-contact" className="privacy-section">
              <h2>12. Contact us</h2>
              <p>
                Questions, requests, or concerns about this policy or our data practices:
              </p>
              <div className="privacy-callout">
                <p>
                  <strong>Harbor of Hope, Inc.</strong><br />
                  Privacy &amp; Data Protection<br />
                  <a href="mailto:privacy@harborofhope.org">privacy@harborofhope.org</a>
                </p>
              </div>
              <p style={{ marginTop: 16 }}>
                <Link to="/">Return to the homepage</Link>
              </p>
            </section>

          </article>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
