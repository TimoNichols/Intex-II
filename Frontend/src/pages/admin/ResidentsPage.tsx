import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import { apiGet } from "../../api/client";
import type { Paged, ResidentListItem, SafehouseOption } from "../../api/types";

function normalizeTone(value?: string | null): "low" | "medium" | "high" | "critical" | "muted" {
  const v = (value ?? "").toLowerCase();
  if (v.includes("critical")) return "critical";
  if (v.includes("high")) return "high";
  if (v.includes("medium")) return "medium";
  if (v.includes("low")) return "low";
  return "muted";
}

export default function ResidentsPage() {
  const [caseStatus, setCaseStatus] = useState<string>("all");
  const [safehouseId, setSafehouseId] = useState<string>("all");
  const [caseCategory, setCaseCategory] = useState<string>("all");
  const [risk, setRisk] = useState<string>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ResidentListItem[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseOption[]>([]);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const take = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("take", String(take));
        params.set("skip", String(skip));
        if (q.trim()) params.set("q", q.trim());
        if (caseStatus !== "all") params.set("caseStatus", caseStatus);
        if (safehouseId !== "all") params.set("safehouseId", safehouseId);
        if (caseCategory !== "all") params.set("caseCategory", caseCategory);
        if (risk !== "all") params.set("currentRiskLevel", risk);
        const data = await apiGet<Paged<ResidentListItem>>(`/api/residents?${params}`);
        if (!cancelled) {
          setRows(data.items);
          setTotal(data.total);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load residents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseCategory, caseStatus, q, risk, safehouseId, skip]);

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

  useEffect(() => {
    setSkip(0);
  }, [q, caseStatus, safehouseId, caseCategory, risk]);

  const activeFilterCount = [caseStatus, safehouseId, caseCategory, risk].filter((v) => v !== "all").length + (q.trim() ? 1 : 0);
  const canClearFilters = activeFilterCount > 0;

  function clearFilters() {
    setCaseStatus("all");
    setSafehouseId("all");
    setCaseCategory("all");
    setRisk("all");
    setQ("");
  }

  return (
    <AdminPageShell
      title="Caseload Inventory"
      description="Core case management for resident demographics, classification, referrals, and reintegration tracking."
      actions={
        <Link to="/residents/new" className="admin-btn admin-btn--primary">
          Add resident
        </Link>
      }
    >
      <div className="admin-stat-grid" style={{ marginBottom: 20 }}>
        <div className="admin-stat">
          <div className="admin-stat__value">{total}</div>
          <div className="admin-stat__label">Residents matching filters</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{activeFilterCount}</div>
          <div className="admin-stat__label">Active filters</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{Math.floor(skip / take) + 1}</div>
          <div className="admin-stat__label">Current page</div>
        </div>
      </div>

      <div className="admin-card caseload-filters">
        <div className="caseload-filters__top">
          <h2>Find the right case quickly</h2>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={clearFilters}
            disabled={!canClearFilters}
            aria-disabled={!canClearFilters}
          >
            Clear filters
          </button>
        </div>
        <div className="caseload-filters__grid">
          <div className="admin-field caseload-filters__search">
            <label className="sr-only" htmlFor="res-search">
              Search residents
            </label>
            <input
              id="res-search"
              className="admin-search"
              placeholder="Search case number, internal code, referring agency…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="res-status">Case status</label>
            <select id="res-status" value={caseStatus} onChange={(e) => setCaseStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Transferred">Transferred</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="res-safehouse">Safehouse</label>
            <select id="res-safehouse" value={safehouseId} onChange={(e) => setSafehouseId(e.target.value)}>
              <option value="all">All safehouses</option>
              {safehouses.map((s) => (
                <option key={s.safehouseId} value={String(s.safehouseId)}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="res-category">Case category</label>
            <select id="res-category" value={caseCategory} onChange={(e) => setCaseCategory(e.target.value)}>
              <option value="all">All categories</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Foundling">Foundling</option>
              <option value="Surrendered">Surrendered</option>
              <option value="Neglected">Neglected</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="res-risk">Risk</label>
            <select id="res-risk" value={risk} onChange={(e) => setRisk(e.target.value)}>
              <option value="all">All risk levels</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-card caseload-tip">
        <p>
          Open any resident case to access section pages for <strong>Process Recording</strong>,{" "}
          <strong>Home Visitation</strong>, and <strong>Case Conferences</strong>. Quick links are also available in
          each row.
        </p>
      </div>

      {loading && (
        <p style={{ color: "var(--ink-muted)" }}>Loading residents…</p>
      )}
      {error && (
        <p style={{ color: "#c53030" }} role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--caseload">
            <thead>
              <tr>
                <th>Case #</th>
                <th>Internal</th>
                <th>Safehouse</th>
                <th>Case status</th>
                <th>Case category</th>
                <th>Assigned SW</th>
                <th>Admission date</th>
                <th>Risk</th>
                <th>Case tools</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ color: "var(--ink-muted)" }}>
                    No residents match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.residentId}>
                    <td className="caseload-cell-case">
                      <Link to={`/residents/${r.residentId}`} className="caseload-case-link">
                        {r.caseControlNo ?? r.displayName ?? r.displayCode ?? `#${r.residentId}`}
                      </Link>
                      <div className="caseload-meta">Resident ID #{r.residentId}</div>
                    </td>
                    <td className="caseload-mono">{r.internalCode ?? "—"}</td>
                    <td>{r.safehouse}</td>
                    <td>
                      <span className={`admin-pill admin-pill--status-${normalizeTone(r.caseStatus ?? r.phase)}`}>
                        {r.caseStatus ?? r.phase ?? "—"}
                      </span>
                    </td>
                    <td>{r.caseCategory ?? "—"}</td>
                    <td>
                      <div>{r.assignedSocialWorker ?? r.socialWorker ?? "—"}</div>
                      {r.reintegrationStatus ? <div className="caseload-meta">Reintegration: {r.reintegrationStatus}</div> : null}
                    </td>
                    <td>{r.admissionDate ?? r.updated ?? "—"}</td>
                    <td>
                      <span className={`admin-pill admin-pill--status-${normalizeTone(r.currentRiskLevel)}`}>
                        {r.currentRiskLevel ?? "N/A"}
                      </span>
                    </td>
                    <td>
                      <div className="caseload-tools">
                        <Link to={`/residents/${r.residentId}`} className="admin-pill admin-pill--tool">
                          Overview
                        </Link>
                        <Link to={`/residents/${r.residentId}/process-recordings`} className="admin-pill admin-pill--tool">
                          Process Recording
                        </Link>
                        <Link to={`/residents/${r.residentId}/visitations`} className="admin-pill admin-pill--tool">
                          Home Visitation
                        </Link>
                        <Link to={`/residents/${r.residentId}/conferences`} className="admin-pill admin-pill--tool">
                          Case Conferences
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="caseload-pagination">
            <span>
              {total === 0 ? "0 results" : `${skip + 1}-${Math.min(skip + take, total)} of ${total}`}
            </span>
            <div>
              <button
                className="admin-btn admin-btn--ghost"
                disabled={skip <= 0}
                onClick={() => setSkip((v) => Math.max(0, v - take))}
              >
                Previous
              </button>
              <button
                className="admin-btn admin-btn--ghost"
                disabled={skip + take >= total}
                onClick={() => setSkip((v) => v + take)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
