import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import { apiGet } from "../../api/client";
import type { Paged, ResidentListItem, SafehouseOption } from "../../api/types";

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

  return (
    <AdminPageShell
      title="Residents"
      description="Caseload Inventory — filter and manage full resident case records."
      actions={
        <Link to="/residents/new" className="admin-btn admin-btn--primary">
          Add resident
        </Link>
      }
    >
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div className="admin-field" style={{ margin: 0, flex: "1 1 200px" }}>
            <label className="sr-only" htmlFor="res-search">
              Search residents
            </label>
            <input
              id="res-search"
              className="admin-search"
              style={{ maxWidth: "none", width: "100%" }}
              placeholder="Search case number, internal code, referring agency…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
            />
          </div>
          <div className="admin-field" style={{ margin: 0, minWidth: 180 }}>
            <label htmlFor="res-status">Case status</label>
            <select id="res-status" value={caseStatus} onChange={(e) => setCaseStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Transferred">Transferred</option>
            </select>
          </div>
          <div className="admin-field" style={{ margin: 0, minWidth: 180 }}>
            <label htmlFor="res-safehouse">Safehouse</label>
            <select id="res-safehouse" value={safehouseId} onChange={(e) => setSafehouseId(e.target.value)}>
              <option value="all">All safehouses</option>
              {safehouses.map((s) => (
                <option key={s.safehouseId} value={String(s.safehouseId)}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="admin-field" style={{ margin: 0, minWidth: 180 }}>
            <label htmlFor="res-category">Case category</label>
            <select id="res-category" value={caseCategory} onChange={(e) => setCaseCategory(e.target.value)}>
              <option value="all">All categories</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Foundling">Foundling</option>
              <option value="Surrendered">Surrendered</option>
              <option value="Neglected">Neglected</option>
            </select>
          </div>
          <div className="admin-field" style={{ margin: 0, minWidth: 180 }}>
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
          <table className="admin-table">
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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: "var(--ink-muted)" }}>
                    No residents match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.residentId}>
                    <td>
                      <Link to={`/residents/${r.residentId}`}>
                        {r.caseControlNo ?? r.displayName ?? r.displayCode ?? `#${r.residentId}`}
                      </Link>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--ink-soft)",
                          marginTop: 2,
                        }}
                      >
                        #{r.residentId}
                      </div>
                    </td>
                    <td>{r.internalCode ?? "—"}</td>
                    <td>{r.safehouse}</td>
                    <td>{r.caseStatus ?? r.phase ?? "—"}</td>
                    <td>{r.caseCategory ?? "—"}</td>
                    <td>{r.assignedSocialWorker ?? r.socialWorker ?? "—"}</td>
                    <td>{r.admissionDate ?? r.updated ?? "—"}</td>
                    <td>{r.currentRiskLevel ?? "N/A"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>
              {total === 0 ? "0 results" : `${skip + 1}-${Math.min(skip + take, total)} of ${total}`}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="admin-btn admin-btn--ghost" disabled={skip <= 0} onClick={() => setSkip((v) => Math.max(0, v - take))}>Previous</button>
              <button className="admin-btn admin-btn--ghost" disabled={skip + take >= total} onClick={() => setSkip((v) => v + take)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
