import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { apiDelete, apiGet } from '../../api/client';
import type { AdminUserRow } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

export default function UsersPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AdminUserRow[]>('/api/admin/users');
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function handleDeleteClick(user: AdminUserRow) {
    setPendingDelete(user);
    setActionError(null);
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await apiDelete(`/api/admin/users/${encodeURIComponent(pendingDelete.id)}`);
      setUsers((prev) => prev.filter((u) => u.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  function handleDeleteCancel() {
    setPendingDelete(null);
  }

  if (!isAdmin) {
    return (
      <AdminPageShell
        title="User management"
        description="Only administrators can view and manage staff accounts."
      >
        <p style={{ color: 'var(--ink-muted)' }}>
          You do not have permission to access this page. Contact an administrator if you need access.
        </p>
        <Link to="/dashboard" className="admin-btn admin-btn--ghost" style={{ marginTop: 16, display: 'inline-block' }}>
          Back to dashboard
        </Link>
      </AdminPageShell>
    );
  }

  return (
    <>
      <AdminPageShell
        title="User management"
        description="Staff accounts and roles from ASP.NET Identity."
        actions={
          <button type="button" className="admin-btn admin-btn--primary">
            Invite user
          </button>
        }
      >
        {actionError && (
          <p style={{ color: '#c53030', marginBottom: 12 }} role="alert">
            {actionError}
          </p>
        )}
        {loading && <p style={{ color: 'var(--ink-muted)' }}>Loading users…</p>}
        {error && (
          <p style={{ color: '#c53030' }} role="alert">
            {error}
          </p>
        )}
        {!loading && !error && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>
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
                        className={`admin-pill${u.status === 'Invited' ? ' admin-pill--muted' : ''}`}
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
        )}
      </AdminPageShell>

      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        itemName={pendingDelete?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
