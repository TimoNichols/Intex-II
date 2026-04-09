import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { apiDelete, apiGet, apiPost, apiPut } from '../../api/client';
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

// ── Edit User Modal ───────────────────────────────────────────────────────
interface EditUserModalProps {
  user: AdminUserRow;
  onClose: () => void;
  onSaved: (updated: AdminUserRow) => void;
}

function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const [displayName, setDisplayName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<RoleOption>(
    (ROLES as readonly string[]).includes(user.role) ? (user.role as RoleOption) : 'Donor',
  );
  const [newPassword, setNewPassword] = useState('');
  const [supporterId, setSupporterId] = useState(user.supporterId?.toString() ?? '');
  const [clearSupporterId, setClearSupporterId] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPut<AdminUserRow>(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        displayName: displayName.trim() || null,
        email: email.trim() || null,
        role,
        newPassword: newPassword.trim() || null,
        supporterId: role === 'Donor' && supporterId.trim() ? Number(supporterId) : null,
        clearSupporterId: role === 'Donor' && clearSupporterId,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal" style={{ maxWidth: 500 }}>
        <h2 className="admin-modal__title">Edit user</h2>
        <p className="admin-modal__desc">{user.email}</p>

        {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}

        <form onSubmit={handleSubmit} className="admin-stack">
          <div className="admin-field">
            <label htmlFor="eu-name">Display name</label>
            <input id="eu-name" type="text" autoComplete="off"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="admin-field">
            <label htmlFor="eu-email">Email</label>
            <input id="eu-email" type="email" required autoComplete="off"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="admin-field">
            <label htmlFor="eu-role">Role</label>
            <select id="eu-role" value={role} onChange={(e) => setRole(e.target.value as RoleOption)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {role === 'Donor' && (
            <div className="admin-field">
              <label htmlFor="eu-supporter">Supporter ID</label>
              <input id="eu-supporter" type="number" min={1} placeholder="e.g. 25"
                value={supporterId} onChange={(e) => { setSupporterId(e.target.value); setClearSupporterId(false); }} />
              {user.supporterId && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={clearSupporterId}
                    onChange={(e) => { setClearSupporterId(e.target.checked); if (e.target.checked) setSupporterId(''); }}
                    style={{ width: 'auto', accentColor: '#62a5d1' }} />
                  Unlink current supporter record
                </label>
              )}
            </div>
          )}

          <div className="admin-field">
            <label htmlFor="eu-password">Reset password <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(leave blank to keep current)</span></label>
            <input id="eu-password" type="password" autoComplete="new-password"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password…" />
            <span style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'block', marginTop: 4 }}>
              {PASSWORD_HINT}
            </span>
          </div>

          <div className="admin-modal__footer">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [q, setQ] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

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

  const displayUsers = useMemo(() => {
    let list = [...users];
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    if (filterRole) list = list.filter((u) => u.role === filterRole);
    if (filterStatus) list = list.filter((u) => u.status === filterStatus);
    const [field, dir] = sortBy.split('-');
    list.sort((a, b) => {
      const av = field === 'email' ? a.email : field === 'role' ? a.role : a.name;
      const bv = field === 'email' ? b.email : field === 'role' ? b.role : b.name;
      return dir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    return list;
  }, [users, q, filterRole, filterStatus, sortBy]);

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
        {/* ── Controls ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <label className="sr-only" htmlFor="users-search">Search users</label>
          <input id="users-search" type="search" className="admin-search"
            placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="admin-search" style={{ maxWidth: 150 }} value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="admin-search" style={{ maxWidth: 160 }} value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Locked">Locked</option>
            <option value="Invited">Invited</option>
          </select>
          <select className="admin-search" style={{ maxWidth: 190 }} value={sortBy}
            onChange={(e) => setSortBy(e.target.value)} aria-label="Sort by">
            <option value="name-asc">Name (A→Z)</option>
            <option value="name-desc">Name (Z→A)</option>
            <option value="email-asc">Email (A→Z)</option>
            <option value="role-asc">Role</option>
          </select>
        </div>

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
                {displayUsers.map((u) => (
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
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          onClick={() => { setEditingUser(u); setActionError(null); }}
                          aria-label={`Edit user ${u.name}`}
                        >
                          Manage
                        </button>
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

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
            setEditingUser(null);
          }}
        />
      )}

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
