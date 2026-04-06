import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';

export default function DonorNewPage() {
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(true);
  }

  return (
    <AdminPageShell
      title="Add donor"
      description="Create a supporter record. Saves locally only until the API is connected."
      breadcrumbs={[
        { label: 'Donors', to: '/donors' },
        { label: 'New' },
      ]}
      actions={
        <Link to="/donors" className="admin-btn admin-btn--ghost">
          Cancel
        </Link>
      }
    >
      {done ? (
        <div className="admin-card">
          <p style={{ margin: '0 0 16px', fontSize: 15 }}>Sample form submitted — no data was sent to a server.</p>
          <Link to="/donors" className="admin-btn admin-btn--primary">
            Return to donor list
          </Link>
        </div>
      ) : (
        <form className="admin-card" onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="dn-name">Display name</label>
              <input id="dn-name" name="name" required autoComplete="name" />
            </div>
            <div className="admin-field">
              <label htmlFor="dn-email">Email</label>
              <input id="dn-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="admin-field">
              <label htmlFor="dn-phone">Phone</label>
              <input id="dn-phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="admin-field">
              <label htmlFor="dn-type">Donor type</label>
              <select id="dn-type" name="type" defaultValue="Individual">
                <option>Individual</option>
                <option>Foundation</option>
                <option>Corporate</option>
                <option>Anonymous</option>
              </select>
            </div>
          </div>
          <div className="admin-field" style={{ marginTop: 18 }}>
            <label htmlFor="dn-notes">Internal notes</label>
            <textarea id="dn-notes" name="notes" placeholder="Solicitation preferences, recognition name, etc." />
          </div>
          <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: 20 }}>
            Save donor
          </button>
        </form>
      )}
    </AdminPageShell>
  );
}
