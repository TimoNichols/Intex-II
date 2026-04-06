import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ResidentSubNav from '../../components/ResidentSubNav';
import { getResidentById } from '../../admin/mockData';

const rows = [
  { date: '2026-04-04', visitor: 'Guardian (supervised)', location: 'On-site family room', status: 'Completed' },
  { date: '2026-04-11', visitor: 'DCF caseworker', location: 'Conference room B', status: 'Scheduled' },
  { date: '2026-03-22', visitor: 'Legal advocate', location: 'Virtual', status: 'Completed' },
];

export default function ResidentVisitationsPage() {
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
      title="Visitations"
      description={`Home and professional visits · ${r.displayName}`}
      breadcrumbs={[
        { label: 'Residents', to: '/residents' },
        { label: r.displayName, to: `/residents/${encodeURIComponent(r.id)}` },
        { label: 'Visitations' },
      ]}
    >
      <ResidentSubNav />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Visitor / purpose</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.date}</td>
                <td>{row.visitor}</td>
                <td>{row.location}</td>
                <td>
                  <span className="admin-pill">{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
