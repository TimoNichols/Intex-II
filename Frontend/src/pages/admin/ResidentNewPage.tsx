import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';

export default function ResidentNewPage() {
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(true);
  }

  return (
    <AdminPageShell
      title="Add resident"
      description="Intake form placeholder. Wire fields to your API and validation rules from policy."
      breadcrumbs={[
        { label: 'Residents', to: '/residents' },
        { label: 'New' },
      ]}
      actions={
        <Link to="/residents" className="admin-btn admin-btn--ghost">
          Cancel
        </Link>
      }
    >
      {done ? (
        <div className="admin-card">
          <p style={{ margin: '0 0 16px', fontSize: 15 }}>Sample intake saved locally only (demo).</p>
          <Link to="/residents" className="admin-btn admin-btn--primary">
            Return to caseload
          </Link>
        </div>
      ) : (
        <form className="admin-card" onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="rn-safehouse">Safehouse</label>
              <select id="rn-safehouse" name="safehouse" required defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                <option>North Harbor</option>
                <option>Lakeside</option>
                <option>Riverside</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="rn-phase">Initial phase</label>
              <select id="rn-phase" name="phase" defaultValue="Intake">
                <option>Intake</option>
                <option>Active care</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="rn-sw">Assign social worker</label>
              <select id="rn-sw" name="sw" required defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                <option>Sam Okonkwo</option>
                <option>Jordan Lee</option>
                <option>Alex Rivera</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="rn-ref">Referral source</label>
              <input id="rn-ref" name="referral" placeholder="Agency / hotline / law enforcement" />
            </div>
          </div>
          <div className="admin-field" style={{ marginTop: 18 }}>
            <label htmlFor="rn-notes">Intake notes (non-PHI for demo)</label>
            <textarea id="rn-notes" name="notes" placeholder="High-level case flags only in this preview…" />
          </div>
          <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: 20 }}>
            Create resident record
          </button>
        </form>
      )}
    </AdminPageShell>
  );
}
