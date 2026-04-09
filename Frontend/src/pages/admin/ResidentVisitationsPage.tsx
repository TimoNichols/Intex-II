import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import ResidentSubNav from "../../components/ResidentSubNav";
import { apiDelete, apiGet, apiPost, apiPut } from "../../api/client";
import type { Paged, ResidentDetail, VisitationRow } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";

type VisitForm = {
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string;
  familyMembersPresent: string;
  purpose: string;
  observations: string;
  familyCooperationLevel: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string;
  visitOutcome: string;
};

const EMPTY_FORM: VisitForm = {
  visitDate: "",
  socialWorker: "",
  visitType: "Family",
  locationVisited: "",
  familyMembersPresent: "",
  purpose: "",
  observations: "",
  familyCooperationLevel: "",
  safetyConcernsNoted: false,
  followUpNeeded: false,
  followUpNotes: "",
  visitOutcome: "",
};

export default function ResidentVisitationsPage() {
  const { id } = useParams();
  const residentId = id ? parseInt(id, 10) : NaN;
  const { roles } = useAuth();
  const isAdmin = roles.includes("Admin");
  const [r, setR] = useState<ResidentDetail | null>(null);
  const [rows, setRows] = useState<VisitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<VisitForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VisitationRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visQ, setVisQ] = useState('');
  const [visFilterStatus, setVisFilterStatus] = useState('');
  const [visSort, setVisSort] = useState('date-desc');

  const displayVisitations = useMemo(() => {
    const s = visQ.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (s && !(
        (row.visitorPurpose ?? row.visitType ?? '').toLowerCase().includes(s) ||
        (row.location ?? row.locationVisited ?? '').toLowerCase().includes(s)
      )) return false;
      const st = row.status ?? row.visitOutcome ?? '';
      if (visFilterStatus && st !== visFilterStatus) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const ad = new Date(a.visitDate ?? a.date ?? '').getTime();
      const bd = new Date(b.visitDate ?? b.date ?? '').getTime();
      return visSort === 'date-asc' ? ad - bd : bd - ad;
    });
    return list;
  }, [rows, visQ, visFilterStatus, visSort]);

  const loadData = useCallback(async (cancelledRef?: { value: boolean }) => {
    if (Number.isNaN(residentId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [res, vis] = await Promise.all([
        apiGet<ResidentDetail>(`/api/residents/${residentId}`),
        apiGet<Paged<VisitationRow> | VisitationRow[]>(`/api/residents/${residentId}/home-visitations?take=200`),
      ]);
      if (!cancelledRef?.value) {
        setR(res);
        setRows(Array.isArray(vis) ? vis : vis.items);
      }
    } catch {
      if (!cancelledRef?.value) {
        setR(null);
        setError("Failed to load");
      }
    } finally {
      if (!cancelledRef?.value) setLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    const cancelled = { value: false };
    void loadData(cancelled);
    return () => { cancelled.value = true; };
  }, [loadData]);

  async function handleDeleteConfirm() {
    if (!pendingDelete?.visitationId || isDeleting) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/residents/${residentId}/home-visitations/${pendingDelete.visitationId}`);
      setRows((prev) => prev.filter((row) => row.visitationId !== pendingDelete.visitationId));
      setPendingDelete(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setSaveSuccess(null);
  }

  function startEdit(row: VisitationRow) {
    setEditingId(row.visitationId ?? null);
    setForm({
      visitDate: row.visitDate ?? row.date ?? "",
      socialWorker: row.socialWorker ?? "",
      visitType: row.visitType ?? row.visitorPurpose ?? "Family",
      locationVisited: row.locationVisited ?? row.location ?? "",
      familyMembersPresent: row.familyMembersPresent ?? "",
      purpose: row.visitorPurpose ?? row.purpose ?? "",
      observations: row.observations ?? "",
      familyCooperationLevel: row.familyCooperationLevel ?? "",
      safetyConcernsNoted: Boolean(row.safetyConcernsNoted),
      followUpNeeded: Boolean(row.followUpNeeded),
      followUpNotes: row.followUpNotes ?? "",
      visitOutcome: row.visitOutcome ?? row.status ?? "",
    });
    setSaveError(null);
    setSaveSuccess(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (Number.isNaN(residentId)) return;
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      const payload = {
        visitDate: form.visitDate || null,
        socialWorker: form.socialWorker || null,
        visitType: form.visitType || null,
        locationVisited: form.locationVisited || null,
        familyMembersPresent: form.familyMembersPresent || null,
        purpose: form.purpose || null,
        observations: form.observations || null,
        familyCooperationLevel: form.familyCooperationLevel || null,
        safetyConcernsNoted: form.safetyConcernsNoted,
        followUpNeeded: form.followUpNeeded,
        followUpNotes: form.followUpNotes || null,
        visitOutcome: form.visitOutcome || null,
      };
      if (editingId) {
        await apiPut<void>(`/api/residents/${residentId}/home-visitations/${editingId}`, payload);
        setSaveSuccess("Visitation updated.");
      } else {
        await apiPost<{ visitationId: number }>(`/api/residents/${residentId}/home-visitations`, payload);
        setSaveSuccess("Visitation created.");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save visitation.");
    } finally {
      setSaving(false);
    }
  }

  if (Number.isNaN(residentId)) {
    return (
      <AdminPageShell title="Resident not found">
        <Link to="/residents" className="admin-btn admin-btn--ghost">Back to residents</Link>
      </AdminPageShell>
    );
  }

  if (loading) {
    return (
      <AdminPageShell title="Visitations" description="Loading…">
        <p className="admin-loading">Loading…</p>
      </AdminPageShell>
    );
  }

  if (!r || error) {
    return (
      <AdminPageShell title="Resident not found">
        <Link to="/residents" className="admin-btn admin-btn--ghost">Back to residents</Link>
      </AdminPageShell>
    );
  }

  return (
    <>
    <AdminPageShell
      title="Visitations"
      description={`Home Visitation: field and family visits · ${r.displayCode ?? r.displayName}`}
      breadcrumbs={[
        { label: "Residents", to: "/residents" },
        { label: r.displayCode ?? r.displayName ?? `Resident #${r.residentId}`, to: `/residents/${r.residentId}` },
        { label: "Visitations" },
      ]}
    >
      <ResidentSubNav />

      {isAdmin ? (
        <form className="admin-card" style={{ marginBottom: 16 }} onSubmit={onSubmit}>
          <h2 className="admin-card__title">
            {editingId ? "Edit visitation" : "New home visitation"}
          </h2>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="hv-date">Visit date</label>
              <input
                id="hv-date"
                type="date"
                value={form.visitDate}
                onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                required
              />
            </div>
            <div className="admin-field">
              <label htmlFor="hv-worker">Social worker</label>
              <input
                id="hv-worker"
                value={form.socialWorker}
                onChange={(e) => setForm((f) => ({ ...f, socialWorker: e.target.value }))}
                placeholder="Assigned social worker"
              />
            </div>
            <div className="admin-field">
              <label htmlFor="hv-type">Visit type</label>
              <select
                id="hv-type"
                value={form.visitType}
                onChange={(e) => setForm((f) => ({ ...f, visitType: e.target.value }))}
              >
                <option value="Family">Family</option>
                <option value="Field">Field</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Safety check">Safety check</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="hv-location">Location visited</label>
              <input
                id="hv-location"
                value={form.locationVisited}
                onChange={(e) => setForm((f) => ({ ...f, locationVisited: e.target.value }))}
                placeholder="e.g., Family home, Barangay hall"
              />
            </div>
            <div className="admin-field">
              <label htmlFor="hv-family">Family members present</label>
              <input
                id="hv-family"
                value={form.familyMembersPresent}
                onChange={(e) => setForm((f) => ({ ...f, familyMembersPresent: e.target.value }))}
                placeholder="Names of family members present"
              />
            </div>
            <div className="admin-field">
              <label htmlFor="hv-cooperation">Family cooperation level</label>
              <select
                id="hv-cooperation"
                value={form.familyCooperationLevel}
                onChange={(e) => setForm((f) => ({ ...f, familyCooperationLevel: e.target.value }))}
              >
                <option value="">— select —</option>
                <option value="High">High</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low</option>
                <option value="Hostile">Hostile</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="hv-outcome">Visit outcome</label>
              <select
                id="hv-outcome"
                value={form.visitOutcome}
                onChange={(e) => setForm((f) => ({ ...f, visitOutcome: e.target.value }))}
              >
                <option value="">— select —</option>
                <option value="Completed">Completed</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Safety concern">Safety concern</option>
              </select>
            </div>
          </div>
          <div className="admin-field" style={{ marginTop: 12 }}>
            <label htmlFor="hv-purpose">Purpose of visit</label>
            <textarea
              id="hv-purpose"
              value={form.purpose}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              placeholder="Describe the purpose of this home visitation."
              required
            />
          </div>
          <div className="admin-field" style={{ marginTop: 12 }}>
            <label htmlFor="hv-observations">Observations</label>
            <textarea
              id="hv-observations"
              value={form.observations}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              placeholder="Document key observations from the visit."
            />
          </div>
          <div className="admin-field" style={{ marginTop: 12 }}>
            <label htmlFor="hv-followup-notes">Follow-up notes</label>
            <textarea
              id="hv-followup-notes"
              value={form.followUpNotes}
              onChange={(e) => setForm((f) => ({ ...f, followUpNotes: e.target.value }))}
              placeholder="Actions, referrals, and next steps."
            />
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={form.safetyConcernsNoted}
                onChange={(e) => setForm((f) => ({ ...f, safetyConcernsNoted: e.target.checked }))}
              />
              Safety concern noted
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={form.followUpNeeded}
                onChange={(e) => setForm((f) => ({ ...f, followUpNeeded: e.target.checked }))}
              />
              Follow-up needed
            </label>
          </div>
          {saveError && (
            <p className="admin-alert admin-alert--error" role="alert">{saveError}</p>
          )}
          {saveSuccess && <p className="admin-alert admin-alert--success">{saveSuccess}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update visitation" : "Add visitation"}
            </button>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={startCreate} disabled={saving}>
              Clear
            </button>
          </div>
        </form>
      ) : (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-muted)" }}>
            You can view home visitation history. Admin role is required to create or edit entries.
          </p>
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input type="search" className="admin-search"
          placeholder="Search by purpose or location…" value={visQ} onChange={(e) => setVisQ(e.target.value)} />
        <select className="admin-search" style={{ maxWidth: 180 }} value={visFilterStatus}
          onChange={(e) => setVisFilterStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="Completed">Completed</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Safety concern">Safety concern</option>
        </select>
        <select className="admin-search" style={{ maxWidth: 180 }} value={visSort}
          onChange={(e) => setVisSort(e.target.value)} aria-label="Sort visitations">
          <option value="date-desc">Date (newest first)</option>
          <option value="date-asc">Date (oldest first)</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Visitor / purpose</th>
              <th>Location</th>
              <th>Status</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayVisitations.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={isAdmin ? 5 : 4}>
                  {rows.length === 0 ? 'No visitations on file.' : 'No visitations match this search.'}
                </td>
              </tr>
            ) : (
              displayVisitations.map((row, i) => (
                <tr key={`${row.visitationId ?? row.date ?? row.visitDate ?? i}-${i}`}>
                  <td>{row.date ?? row.visitDate ?? "N/A"}</td>
                  <td>{row.visitorPurpose ?? row.visitType ?? "N/A"}</td>
                  <td>{row.location ?? row.locationVisited ?? "N/A"}</td>
                  <td>
                    <span className="admin-pill">
                      {row.status ?? row.visitOutcome ?? (row.safetyConcernsNoted ? "Safety concern" : "Recorded")}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      {row.visitationId ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="admin-btn admin-btn--ghost admin-btn--sm"
                            type="button"
                            onClick={() => startEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            className="admin-btn admin-btn--danger admin-btn--sm"
                            type="button"
                            onClick={() => { setSaveError(null); setPendingDelete(row); }}
                            aria-label={`Delete visitation from ${row.date ?? row.visitDate ?? "this date"}`}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>

    <ConfirmDeleteModal
      isOpen={pendingDelete !== null}
      itemName={
        pendingDelete
          ? `visitation from ${pendingDelete.date ?? pendingDelete.visitDate ?? "this date"}`
          : ''
      }
      isConfirming={isDeleting}
      onConfirm={handleDeleteConfirm}
      onCancel={() => { if (!isDeleting) setPendingDelete(null); }}
    />
    </>
  );
}
