import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import { apiGet, apiPost } from "../../api/client";
import type { SafehouseOption } from "../../api/types";

export default function ResidentNewPage() {
  const [safehouses, setSafehouses] = useState<SafehouseOption[]>([]);
  const [form, setForm] = useState({
    caseControlNo: "",
    internalCode: "",
    safehouseId: "",
    caseStatus: "Active",
    caseCategory: "Neglected",
    assignedSocialWorker: "",
    dateOfAdmission: "",
    currentRiskLevel: "Medium",
    reintegrationStatus: "Not Started",
    referralSource: "",
    initialCaseAssessment: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<SafehouseOption[]>("/api/safehouses");
        if (!cancelled) setSafehouses(data);
      } catch {
        if (!cancelled) setSafehouses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost<{ residentId: number }>("/api/residents", {
        caseControlNo: form.caseControlNo || null,
        internalCode: form.internalCode || null,
        safehouseId: form.safehouseId ? Number(form.safehouseId) : null,
        caseStatus: form.caseStatus,
        caseCategory: form.caseCategory,
        assignedSocialWorker: form.assignedSocialWorker || null,
        dateOfAdmission: form.dateOfAdmission || null,
        currentRiskLevel: form.currentRiskLevel,
        reintegrationStatus: form.reintegrationStatus,
        referralSource: form.referralSource || null,
        initialCaseAssessment: form.initialCaseAssessment || null,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create resident.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageShell
      title="Add resident"
      description="Create a new resident case record."
      breadcrumbs={[{ label: "Residents", to: "/residents" }, { label: "New" }]}
      actions={
        <Link to="/residents" className="admin-btn admin-btn--ghost">
          Cancel
        </Link>
      }
    >
      {done ? (
        <div className="admin-card">
          <p style={{ margin: "0 0 16px", fontSize: 15 }}>
            Resident created successfully.
          </p>
          <Link to="/residents" className="admin-btn admin-btn--primary">
            Return to caseload
          </Link>
        </div>
      ) : (
        <form className="admin-card" onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="rn-case-control">Case control no</label>
              <input id="rn-case-control" value={form.caseControlNo} onChange={(e) => setForm((v) => ({ ...v, caseControlNo: e.target.value }))} placeholder="C####" />
            </div>
            <div className="admin-field">
              <label htmlFor="rn-internal">Internal code</label>
              <input id="rn-internal" value={form.internalCode} onChange={(e) => setForm((v) => ({ ...v, internalCode: e.target.value }))} placeholder="LS-####" />
            </div>
            <div className="admin-field">
              <label htmlFor="rn-safehouse">Safehouse</label>
              <select id="rn-safehouse" required value={form.safehouseId} onChange={(e) => setForm((v) => ({ ...v, safehouseId: e.target.value }))}>
                <option value="" disabled>
                  Select…
                </option>
                {safehouses.map((s) => (
                  <option key={s.safehouseId} value={String(s.safehouseId)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="rn-status">Case status</label>
              <select id="rn-status" value={form.caseStatus} onChange={(e) => setForm((v) => ({ ...v, caseStatus: e.target.value }))}>
                <option>Active</option>
                <option>Closed</option>
                <option>Transferred</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="rn-category">Case category</label>
              <select id="rn-category" value={form.caseCategory} onChange={(e) => setForm((v) => ({ ...v, caseCategory: e.target.value }))}>
                <option>Neglected</option>
                <option>Surrendered</option>
                <option>Abandoned</option>
                <option>Foundling</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="rn-sw">Assign social worker</label>
              <input id="rn-sw" value={form.assignedSocialWorker} onChange={(e) => setForm((v) => ({ ...v, assignedSocialWorker: e.target.value }))} placeholder="SW-##" />
            </div>
            <div className="admin-field">
              <label htmlFor="rn-admission-date">Admission date</label>
              <input id="rn-admission-date" type="date" value={form.dateOfAdmission} onChange={(e) => setForm((v) => ({ ...v, dateOfAdmission: e.target.value }))} />
            </div>
            <div className="admin-field">
              <label htmlFor="rn-risk">Current risk level</label>
              <select id="rn-risk" value={form.currentRiskLevel} onChange={(e) => setForm((v) => ({ ...v, currentRiskLevel: e.target.value }))}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="rn-reintegration">Reintegration status</label>
              <select id="rn-reintegration" value={form.reintegrationStatus} onChange={(e) => setForm((v) => ({ ...v, reintegrationStatus: e.target.value }))}>
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="rn-ref">Referral source</label>
              <input id="rn-ref" value={form.referralSource} onChange={(e) => setForm((v) => ({ ...v, referralSource: e.target.value }))} placeholder="Agency / hotline / law enforcement" />
            </div>
          </div>
          <div className="admin-field" style={{ marginTop: 18 }}>
            <label htmlFor="rn-notes">Initial case assessment</label>
            <textarea id="rn-notes" value={form.initialCaseAssessment} onChange={(e) => setForm((v) => ({ ...v, initialCaseAssessment: e.target.value }))} placeholder="For reunification / continued care / urgent stabilization..." />
          </div>
          {error && <p role="alert" style={{ color: "#c53030" }}>{error}</p>}
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            style={{ marginTop: 20 }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Create resident record"}
          </button>
        </form>
      )}
    </AdminPageShell>
  );
}
