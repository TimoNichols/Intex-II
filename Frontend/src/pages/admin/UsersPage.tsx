import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { mockStaffUsers } from '../../admin/mockData';

// Local shape for the page's user list.
// Replace with your API response type once the backend is wired up.
type StaffUser = (typeof mockStaffUsers)[number];

export default function UsersPage() {
  // Holds the user currently queued for deletion, or null when the modal is closed.
  const [pendingDelete, setPendingDelete] = useState<StaffUser | null>(null);

  // Local copy so we can remove rows optimistically without a real API yet.
  const [users, setUsers] = useState(mockStaffUsers);

  function handleDeleteClick(user: StaffUser) {
    setPendingDelete(user);
  }

  function handleDeleteConfirm() {
    if (!pendingDelete) return;

    // TODO: call DELETE /api/users/:id here and await the response before
    // removing the row, so the UI reflects actual server state.
    setUsers((prev) => prev.filter((u) => u.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  function handleDeleteCancel() {
    setPendingDelete(null);
  }

  return (
    <>
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
                <th>
                  {/* visually hidden label for the actions column */}
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span
                      className={`admin-pill${
                        u.status === 'Invited' ? ' admin-pill--muted' : ''
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Link
                        to="/settings"
                        className="admin-btn admin-btn--ghost"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                      >
                        Manage
                      </Link>
                      <button
                        type="button"
                        className="admin-btn"
                        style={{
                          padding: '6px 12px',
                          fontSize: 13,
                          background: '#fff5f5',
                          color: '#c53030',
                          border: '1px solid rgba(197, 48, 48, 0.3)',
                        }}
                        onClick={() => handleDeleteClick(u)}
                        aria-label={`Delete user ${u.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPageShell>

      {/*
       * Rendered outside AdminPageShell so the modal sits at the root of this
       * component's subtree and the backdrop covers the entire viewport.
       */}
      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        itemName={pendingDelete?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
