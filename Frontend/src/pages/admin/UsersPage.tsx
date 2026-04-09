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
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (!pendingDelete || isDeleting) return;
    setActionError(null);
    setIsDeleting(true);
    try {
      await apiDelete(`/api/admin/users/${encodeURIComponent(pendingDelete.id)}`);
      setUsers((prev) => prev.filter((u) => u.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDeleteCancel() {
    if (isDeleting) return;
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
          <p className="admin-alert admin-alert--error" role="alert">
            {actionError}
          </p>
        )}
        {loading && <p className="admin-loading">Loading users…</p>}
        {error && (
          <p className="admin-alert admin-alert--error" role="alert">
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
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                        >
                          Manage
                        </Link>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger admin-btn--sm"
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
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {showInvite && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false); }}
        >
          <div className="admin-modal">
            <h2 className="admin-modal__title">Add user</h2>
            <p className="admin-modal__desc">
              Creates an account and assigns the selected role immediately.
            </p>

            {inviteError && (
              <p className="admin-alert admin-alert--error" role="alert">
                {inviteError}
              </p>
            )}

            <form onSubmit={handleInviteSubmit} className="admin-stack">
              <div className="admin-field">
                <label htmlFor="invite-email">
                  Email <span style={{ color: '#c53030' }}>*</span>
                </label>
                <input
                  id="invite-email"
                  type="email" required autoComplete="off"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="admin-field">
                <label htmlFor="invite-display">Display name</label>
                <input
                  id="invite-display"
                  type="text" autoComplete="off"
                  value={inviteForm.displayName}
                  onChange={(e) => setInviteForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>

              <div className="admin-field">
                <label htmlFor="invite-password">
                  Password <span style={{ color: '#c53030' }}>*</span>
                </label>
                <input
                  id="invite-password"
                  type="password" required autoComplete="new-password"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                />
                <span style={{ color: 'var(--ink-muted)', fontSize: 12, display: 'block', marginTop: 4 }}>{PASSWORD_HINT}</span>
              </div>

              <div className="admin-field">
                <label htmlFor="invite-role">
                  Role <span style={{ color: '#c53030' }}>*</span>
                </label>
                <select
                  id="invite-role"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as RoleOption }))}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {inviteForm.role === 'Donor' && (
                <div className="admin-field">
                  <label htmlFor="invite-supporter">
                    Link to existing supporter ID{' '}
                    <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>(optional, leave blank to create new)</span>
                  </label>
                  <input
                    id="invite-supporter"
                    type="number" min={1} placeholder="e.g. 25"
                    value={inviteForm.supporterId}
                    onChange={(e) => setInviteForm((f) => ({ ...f, supporterId: e.target.value }))}
                  />
                </div>
              )}

              <div className="admin-modal__footer">
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
