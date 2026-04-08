import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { apiDelete, apiGet, apiPost } from '../../api/client';
import type { AdminUserRow } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

const ROLES = ['Donor', 'Staff', 'Admin'] as const;
type RoleOption = (typeof ROLES)[number];

const PASSWORD_HINT =
  'Min 12 characters with uppercase, lowercase, number, and special character (e.g. !@#$).';

type InviteForm = {
  email: string;
  displayName: string;
  password: string;
  role: RoleOption;
  supporterId: string;
};

export default function UsersPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '', displayName: '', password: '', role: 'Donor', supporterId: '',
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  function openInvite() {
    setInviteForm({ email: '', displayName: '', password: '', role: 'Donor', supporterId: '' });
    setInviteError(null);
    setShowInvite(true);
  }

  async function handleInviteSubmit(e: FormEvent) {
    e.preventDefault();
    setInviteSubmitting(true);
    setInviteError(null);
    try {
      const body: Record<string, unknown> = {
        email: inviteForm.email,
        password: inviteForm.password,
        role: inviteForm.role,
        displayName: inviteForm.displayName || null,
        supporterId: inviteForm.role === 'Donor' && inviteForm.supporterId.trim()
          ? Number(inviteForm.supporterId)
          : null,
      };
      const newUser = await apiPost<AdminUserRow>('/api/admin/users', body);
      setUsers((prev) => [...prev, newUser]);
      setShowInvite(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setInviteSubmitting(false);
    }
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
          <button type="button" className="admin-btn admin-btn--primary" onClick={openInvite}>
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

      {showInvite && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: 12, padding: 32, width: '100%',
            maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Add user</h2>
            <p style={{ margin: '0 0 24px', color: 'var(--ink-muted)', fontSize: 14 }}>
              Creates an account and assigns the selected role immediately.
            </p>

            {inviteError && (
              <p style={{ color: '#c53030', marginBottom: 16, fontSize: 14 }} role="alert">
                {inviteError}
              </p>
            )}

            <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                Email <span style={{ color: '#c53030' }}>*</span>
                <input
                  type="email" required autoComplete="off"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                Display name
                <input
                  type="text" autoComplete="off"
                  value={inviteForm.displayName}
                  onChange={(e) => setInviteForm((f) => ({ ...f, displayName: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                Password <span style={{ color: '#c53030' }}>*</span>
                <input
                  type="password" required autoComplete="new-password"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                />
                <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>{PASSWORD_HINT}</span>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                Role <span style={{ color: '#c53030' }}>*</span>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as RoleOption }))}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>

              {inviteForm.role === 'Donor' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                  Link to existing supporter ID <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>(optional — leave blank to create new)</span>
                  <input
                    type="number" min={1} placeholder="e.g. 25"
                    value={inviteForm.supporterId}
                    onChange={(e) => setInviteForm((f) => ({ ...f, supporterId: e.target.value }))}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                  />
                </label>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button" className="admin-btn admin-btn--ghost"
                  onClick={() => setShowInvite(false)} disabled={inviteSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={inviteSubmitting}>
                  {inviteSubmitting ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
