import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import ResidentSubNav from "../../components/ResidentSubNav";
import { apiDelete, apiGet, apiPost, apiPut } from "../../api/client";
import type { Paged, ProcessRecordingRow, ResidentDetail } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";

type RecordingForm = {
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  sessionDurationMinutes: string;
  emotionalStateObserved: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  concernsFlagged: boolean;
};

const EMPTY_FORM: RecordingForm = {
  sessionDate: "",
  socialWorker: "",
  sessionType: "Individual",
  sessionDurationMinutes: "",
  emotionalStateObserved: "",
  sessionNarrative: "",
  interventionsApplied: "",
  followUpActions: "",
  concernsFlagged: false,
};

export default function ResidentProcessRecordingsPage() {
  const { id } = useParams();
  const residentId = id ? parseInt(id, 10) : NaN;
  const { roles } = useAuth();
  const isAdmin = roles.includes("Admin");
  const [r, setR] = useState<ResidentDetail | null>(null);
  const [rows, setRows] = useState<ProcessRecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RecordingForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [pendingDeleteRecording, setPendingDeleteRecording] = useState<ProcessRecordingRow | null>(null);
  const [isDeletingRecording, setIsDeletingRecording] = useState(false);
  const [recQ, setRecQ] = useState('');
  const [recFilterType, setRecFilterType] = useState('');
  const [recSort, setRecSort] = useState('date-desc');

  const loadData = useCallback(async (cancelledRef?: { value: boolean }) => {
    if (Number.isNaN(residentId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [res, rec] = await Promise.all([
        apiGet<ResidentDetail>(`/api/residents/${residentId}`),
        apiGet<Paged<ProcessRecordingRow> | ProcessRecordingRow[]>(
          `/api/residents/${residentId}/process-recordings?take=200`,
        ),
      ]);
      if (!cancelledRef?.value) {
        setR(res);
        setRows(Array.isArray(rec) ? rec : rec.items);
      }
    } catch {
      if (!cancelledRef?.value) {
        setR(null);
        setError("Failed to load data");
      }
    } finally {
      if (!cancelledRef?.value) setLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    const cancelled = { value: false };
    void loadData(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [loadData]);

  async function handleDeleteRecordingConfirm() {
    if (!pendingDeleteRecording?.recordingId || isDeletingRecording) return;
    setIsDeletingRecording(true);
    try {
      await apiDelete(`/api/residents/${residentId}/process-recordings/${pendingDeleteRecording.recordingId}`);
      setRows((prev) => prev.filter((row) => row.recordingId !== pendingDeleteRecording.recordingId));
      setPendingDeleteRecording(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsDeletingRecording(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setSaveSuccess(null);
  }

  function startEdit(row: ProcessRecordingRow) {
    setEditingId(row.recordingId ?? null);
    setForm({
      sessionDate: row.sessionDate ?? row.date ?? "",
      socialWorker: row.socialWorker ?? row.clinician ?? "",
      sessionType: row.sessionType ?? "Individual",
      sessionDurationMinutes: row.sessionDurationMinutes ? String(row.sessionDurationMinutes) : "",
      emotionalStateObserved: row.emotionalStateObserved ?? "",
      sessionNarrative: row.sessionNarrative ?? row.narrative ?? "",
      interventionsApplied: row.interventionsApplied ?? "",
      followUpActions: row.followUpActions ?? "",
      concernsFlagged: Boolean(row.concernsFlagged),
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
        sessionDate: form.sessionDate || null,
        socialWorker: form.socialWorker || null,
        sessionType: form.sessionType || null,
        sessionDurationMinutes: form.sessionDurationMinutes ? Number(form.sessionDurationMinutes) : null,
        emotionalStateObserved: form.emotionalStateObserved || null,
        sessionNarrative: form.sessionNarrative || null,
        interventionsApplied: form.interventionsApplied || null,
        followUpActions: form.followUpActions || null,
        concernsFlagged: form.concernsFlagged,
      };
      if (editingId) {
        await apiPut<void>(`/api/residents/${residentId}/process-recordings/${editingId}`, payload);
        setSaveSuccess("Process recording updated.");
      } else {
        await apiPost<{ recordingId: number }>(`/api/residents/${residentId}/process-recordings`, payload);
        setSaveSuccess("Process recording created.");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save process recording.");
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
      <AdminPageShell title="Process recordings" description="Loading…">
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
      title="Process recordings"
      description={`Process Recording: counseling session log · ${r.displayCode ?? r.displayName}`}
      breadcrumbs={[
        { label: "Residents", to: "/residents" },
        { label: r.displayCode ?? r.displayName ?? `Resident #${r.residentId}`, to: `/residents/${r.residentId}` },
        { label: "Process recordings" },
      ]}
    >
      <ResidentSubNav />
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink-muted)" }}>
          Session records are shown newest-first. Use this form to document counseling entries with the required
          social work fields.
        </p>
      </div>
      {isAdmin ? (
        <form className="admin-card" style={{ marginBottom: 16 }} onSubmit={onSubmit}>
          <h2 className="admin-card__title">
            {editingId ? "Edit process recording" : "New process recording"}
          </h2>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="pr-session-date">Session date</label>
              <input
                id="pr-session-date"
                type="date"
                value={form.sessionDate}
                onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))}
                required
              />
            </div>
            <div className="admin-field">
              <label htmlFor="pr-worker">Social worker</label>
              <input
                id="pr-worker"
                value={form.socialWorker}
                onChange={(e) => setForm((f) => ({ ...f, socialWorker: e.target.value }))}
                placeholder="Assigned social worker"
                required
              />
            </div>
            <div className="admin-field">
              <label htmlFor="pr-type">Session type</label>
              <select
                id="pr-type"
                value={form.sessionType}
                onChange={(e) => setForm((f) => ({ ...f, sessionType: e.target.value }))}
              >
                <option value="Individual">Individual</option>
                <option value="Group">Group</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="pr-duration">Duration (minutes)</label>
              <input
                id="pr-duration"
                type="number"
                min={0}
                step={5}
                value={form.sessionDurationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, sessionDurationMinutes: e.target.value }))}
                placeholder="e.g., 60"
              />
            </div>
          </div>
          <div className="admin-form-grid" style={{ marginTop: 12 }}>
            <div className="admin-field">
              <label htmlFor="pr-emotional">Emotional state observed</label>
              <input
                id="pr-emotional"
                value={form.emotionalStateObserved}
                onChange={(e) => setForm((f) => ({ ...f, emotionalStateObserved: e.target.value }))}
                placeholder="Calm, anxious, withdrawn, etc."
              />
            </div>
          </div>
          <div className="admin-field" style={{ marginTop: 12 }}>
            <label htmlFor="pr-narrative">Narrative summary</label>
            <textarea
              id="pr-narrative"
              value={form.sessionNarrative}
              onChange={(e) => setForm((f) => ({ ...f, sessionNarrative: e.target.value }))}
              placeholder="Summarize the counseling session and key observations."
              required
            />
          </div>
          <div className="admin-field" style={{ marginTop: 12 }}>
            <label htmlFor="pr-interventions">Interventions applied</label>
            <textarea
              id="pr-interventions"
              value={form.interventionsApplied}
              onChange={(e) => setForm((f) => ({ ...f, interventionsApplied: e.target.value }))}
              placeholder="Describe interventions used in this session."
            />
          </div>
          <div className="admin-field" style={{ marginTop: 12 }}>
            <label htmlFor="pr-followup">Follow-up actions</label>
            <textarea
              id="pr-followup"
              value={form.followUpActions}
              onChange={(e) => setForm((f) => ({ ...f, followUpActions: e.target.value }))}
              placeholder="Next actions, referrals, and timeline."
            />
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <input
              type="checkbox"
              checked={form.concernsFlagged}
              onChange={(e) => setForm((f) => ({ ...f, concernsFlagged: e.target.checked }))}
            />
            Safety concern flagged
          </label>
          {saveError && (
            <p className="admin-alert admin-alert--error" role="alert">
              {saveError}
            </p>
          )}
          {saveSuccess && <p className="admin-alert admin-alert--success">{saveSuccess}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update recording" : "Add recording"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={startCreate}
              disabled={saving}
            >
              Clear
            </button>
          </div>
        </form>
      ) : (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-muted)" }}>
            You can view process recording history. Admin role is required to create or edit entries.
          </p>
        </div>
      )}
      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input type="search" className="admin-search"
          placeholder="Search by clinician or type…" value={recQ} onChange={(e) => setRecQ(e.target.value)} />
        <select className="admin-search" style={{ maxWidth: 170 }} value={recFilterType}
          onChange={(e) => setRecFilterType(e.target.value)} aria-label="Filter by session type">
          <option value="">All session types</option>
          <option value="Individual">Individual</option>
          <option value="Group">Group</option>
        </select>
        <select className="admin-search" style={{ maxWidth: 180 }} value={recSort}
          onChange={(e) => setRecSort(e.target.value)} aria-label="Sort recordings">
          <option value="date-desc">Date (newest first)</option>
          <option value="date-asc">Date (oldest first)</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Session type</th>
              <th>Clinician</th>
              <th>Emotional state</th>
              <th>Duration</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const s = recQ.trim().toLowerCase();
              let list = rows.filter((row) => {
                if (s && !(
                  (row.clinician ?? row.socialWorker ?? '').toLowerCase().includes(s) ||
                  (row.sessionType ?? '').toLowerCase().includes(s)
                )) return false;
                if (recFilterType && (row.sessionType ?? '') !== recFilterType) return false;
                return true;
              });
              list = [...list].sort((a, b) => {
                const ad = new Date(a.sessionDate ?? a.date ?? '').getTime();
                const bd = new Date(b.sessionDate ?? b.date ?? '').getTime();
                return recSort === 'date-asc' ? ad - bd : bd - ad;
              });
              if (list.length === 0) return (
                <tr className="admin-empty-row">
                  <td colSpan={isAdmin ? 6 : 5}>
                    {rows.length === 0 ? 'No process recordings on file.' : 'No recordings match this search.'}
                  </td>
                </tr>
              );
              return list.map((row, i) => (
                <tr key={`${row.recordingId ?? row.date ?? row.sessionDate ?? i}-${i}`}>
                  <td>{row.date ?? row.sessionDate ?? "N/A"}</td>
                  <td>{row.sessionType ?? "N/A"}</td>
                  <td>{row.clinician ?? row.socialWorker ?? "N/A"}</td>
                  <td>{row.emotionalStateObserved ?? "N/A"}</td>
                  <td>{row.duration ?? (row.sessionDurationMinutes ? `${row.sessionDurationMinutes} min` : "N/A")}</td>
                  {isAdmin && (
                    <td>
                      {row.recordingId ? (
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
                            onClick={() => { setSaveError(null); setPendingDeleteRecording(row); }}
                            aria-label={`Delete recording from ${row.date ?? row.sessionDate ?? "this date"}`}
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
              ));
            })()}
          </tbody>
        </table>
        {rows.some((x) => x.narrative || x.sessionNarrative || x.interventionsApplied || x.followUpActions) && (
          <div className="admin-card" style={{ marginTop: 16 }}>
            {rows.map((row, i) =>
              row.narrative || row.sessionNarrative || row.interventionsApplied || row.followUpActions ? (
                <div key={`n-${i}`} style={{ marginBottom: 12 }}>
                  <strong>{row.date ?? row.sessionDate ?? "N/A"}</strong>
                  {(row.narrative || row.sessionNarrative) && (
                    <p style={{ margin: "4px 0 0" }}>
                      <strong>Narrative:</strong> {row.narrative ?? row.sessionNarrative}
                    </p>
                  )}
                  {row.interventionsApplied && (
                    <p style={{ margin: "4px 0 0" }}>
                      <strong>Interventions:</strong> {row.interventionsApplied}
                    </p>
                  )}
                  {row.followUpActions && (
                    <p style={{ margin: "4px 0 0" }}>
                      <strong>Follow-up:</strong> {row.followUpActions}
                    </p>
                  )}
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </AdminPageShell>

    <ConfirmDeleteModal
      isOpen={pendingDeleteRecording !== null}
      itemName={
        pendingDeleteRecording
          ? `recording from ${pendingDeleteRecording.date ?? pendingDeleteRecording.sessionDate ?? "this date"}`
          : ''
      }
      isConfirming={isDeletingRecording}
      onConfirm={handleDeleteRecordingConfirm}
      onCancel={() => { if (!isDeletingRecording) setPendingDeleteRecording(null); }}
    />
    </>
  );
}
