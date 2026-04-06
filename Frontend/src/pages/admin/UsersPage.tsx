import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { mockStaffUsers } from '../../admin/mockData';

export default function UsersPage() {
  return (
    <AdminPageShell
      title="User management"
      description="Staff accounts, roles, and activation state. Replace mock rows with directory sync or admin API."
      actions={
        <button type="button" className="admin-btn admin-btn--primary">
          Invite user
        </button>
      }
    >
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mockStaffUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <span className={`admin-pill${u.status === 'Invited' ? ' admin-pill--muted' : ''}`}>{u.status}</span>
                </td>
                <td>
                  <Link to="/settings" className="admin-btn admin-btn--ghost" style={{ padding: '6px 12px', fontSize: 13 }}>
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
