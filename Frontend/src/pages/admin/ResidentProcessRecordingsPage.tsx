import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ResidentSubNav from '../../components/ResidentSubNav';
import { getResidentById } from '../../admin/mockData';

const rows = [
  { date: '2026-04-01', type: 'Individual therapy', clinician: 'Licensed SW', duration: '50 min' },
  { date: '2026-03-28', type: 'Group — coping skills', clinician: 'Licensed SW', duration: '90 min' },
  { date: '2026-03-21', type: 'Family systems (phone)', clinician: 'Licensed SW', duration: '30 min' },
];

export default function ResidentProcessRecordingsPage() {
  const { id } = useParams();
  const r = getResidentById(id);

  if (!r) {
    return (
      <AdminPageShell title="Resident not found">
        <Link to="/residents">Back</Link>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Process recordings"
      description={`Therapy and structured session log · ${r.displayName}`}
      breadcrumbs={[
        { label: 'Residents', to: '/residents' },
        { label: r.displayName, to: `/residents/${encodeURIComponent(r.id)}` },
        { label: 'Process recordings' },
      ]}
    >
      <ResidentSubNav />
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>
          Row-level security and note content will load from your API. Shown entries are static samples.
        </p>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Session type</th>
              <th>Clinician</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.date}</td>
                <td>{row.type}</td>
                <td>{row.clinician}</td>
                <td>{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
