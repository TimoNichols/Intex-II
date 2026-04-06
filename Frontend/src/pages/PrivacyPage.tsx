import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import './PrivacyPage.css';

export default function PrivacyPage() {
  return (
    <div className="privacy-page">
      <a href="#privacy-main" className="skip-link">
        Skip to main content
      </a>
      <PublicHeader />

      <main id="privacy-main" className="privacy-main">
        <article className="privacy-article">
          <header className="privacy-article__header">
            <h1>Privacy policy</h1>
            <p className="privacy-meta">Last updated: April 6, 2026 · Harbor of Hope (501(c)(3))</p>
            <p className="privacy-lede">
              This policy describes how we collect, use, and protect personal data when you use our website, donor tools, and
              related services. It is written to align with GDPR expectations for transparency, lawful bases, and data subject
              rights. Replace placeholder legal text with counsel-approved language before production launch.
            </p>
          </header>

          <section id="controller">
            <h2>1. Data controller</h2>
            <p>
              Harbor of Hope is the controller for personal data processed in connection with this site and our programs.
              Contact: <strong>privacy@harborofhope.org</strong> (sample address).
            </p>
          </section>

          <section id="data-we-collect">
            <h2>2. Data we collect</h2>
            <ul>
              <li>
                <strong>Donors &amp; supporters:</strong> name, email, billing details (via payment processor), gift history, and
                communication preferences.
              </li>
              <li>
                <strong>Website visitors:</strong> technical logs (IP address, browser type, pages viewed) and optional cookies
                if enabled.
              </li>
              <li>
                <strong>Staff &amp; volunteers:</strong> account identifiers, role, audit logs for access to sensitive systems.
              </li>
            </ul>
          </section>

          <section id="purposes">
            <h2>3. Purposes and lawful bases (GDPR)</h2>
            <p>We process data only where a lawful basis applies, for example:</p>
            <ul>
              <li>
                <strong>Contract / steps prior to contract</strong> — processing donations you initiate.
              </li>
              <li>
                <strong>Legitimate interests</strong> — securing our services, analytics at aggregate level, and stewardship
                communications (with opt-out where required).
              </li>
              <li>
                <strong>Legal obligation</strong> — tax receipts, regulatory reporting, and child-safety mandates where
                applicable.
              </li>
              <li>
                <strong>Consent</strong> — marketing emails and non-essential cookies, where we ask explicitly.
              </li>
            </ul>
          </section>

          <section id="retention">
            <h2>4. Retention</h2>
            <p>
              We keep data only as long as needed for the purposes above, including statutory retention for financial records.
              Clinical and case-management data follow separate, stricter policies and are not described in full on this public
              page.
            </p>
          </section>

          <section id="sharing">
            <h2>5. Processors and international transfers</h2>
            <p>
              We use vetted service providers (hosting, email, payments). Where data leaves the EEA/UK, we rely on appropriate
              safeguards such as Standard Contractual Clauses. A current list of sub-processors should be linked here in
              production.
            </p>
          </section>

          <section id="rights">
            <h2>6. Your rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul>
              <li>Access, rectify, or erase your personal data</li>
              <li>Restrict or object to certain processing</li>
              <li>Data portability where applicable</li>
              <li>Withdraw consent without affecting prior lawful processing</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p>
              To exercise rights, email <strong>privacy@harborofhope.org</strong>. We will verify requests in line with security
              policy.
            </p>
          </section>

          <section id="security">
            <h2>7. Security</h2>
            <p>
              We implement administrative, technical, and organizational measures appropriate to the sensitivity of data,
              including encryption in transit, access controls, and staff training. No method of transmission is 100% secure.
            </p>
          </section>

          <section id="children">
            <h2>8. Children</h2>
            <p>
              This public website is not directed at children for data collection. Program-related data for minors is handled
              under strict confidentiality and applicable child-protection law.
            </p>
          </section>

          <section id="changes">
            <h2>9. Changes</h2>
            <p>We may update this policy and will revise the &quot;Last updated&quot; date. Material changes will be highlighted on the site or by email where appropriate.</p>
          </section>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
