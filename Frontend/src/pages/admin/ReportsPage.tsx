import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminPageShell from "../../components/AdminPageShell";
import { apiGet, publicGet } from "../../api/client";
import type { MonthlyMetricPoint, Paged, ResidentListItem } from "../../api/types";

// ── local types ──────────────────────────────────────────────
type DonationMonthlyPoint = { month: string; total: number; count: number };
type SafehousePerf = {
  name: string;
  region: string;
  totalResidents: number;
  activeResidents: number;
  reintegratedCount: number;
};
type ReintegrationStatus = { status: string; count: number };

// ── helpers ──────────────────────────────────────────────────
function fmtMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function fmtPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(98,165,209,0.3)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  fontSize: 13,
};

const STATUS_COLORS: Record<string, string> = {
  Successful: "#3d7fa8",
  Reintegrated: "#3d7fa8",
  Completed: "#3d7fa8",
  "In Progress": "#62a5d1",
  Ongoing: "#62a5d1",
  Pending: "#a8d4ec",
  "Not Set": "#d1dde6",
};

function statusColor(s: string) {
  return STATUS_COLORS[s] ?? "#82c0de";
}

// ── chart card wrapper ────────────────────────────────────────
function ChartCard({
  title,
  lede,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  lede: string;
  loading: boolean;
  error: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-card" style={{ marginBottom: 32 }}>
      <h2 className="admin-card__title" style={{ marginBottom: 4 }}>
        {title}
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.55 }}>
        {lede}
      </p>
      {loading ? (
        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Loading…</p>
      ) : error ? (
        <p style={{ color: "var(--color-danger, #c0392b)", fontSize: 14 }}>
          Could not load data.
        </p>
      ) : empty ? (
        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>No data available yet.</p>
      ) : (
        children
      )}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────
export default function ReportsPage() {
  // 1. Donation trend
  const [donations, setDonations] = useState<DonationMonthlyPoint[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [donationsError, setDonationsError] = useState(false);

  // 2. Resident outcome metrics (reuse public endpoint)
  const [metrics, setMetrics] = useState<MonthlyMetricPoint[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(false);

  // 3. Safehouse performance
  const [safehouses, setSafehouses] = useState<SafehousePerf[]>([]);
  const [safehousesLoading, setSafehousesLoading] = useState(true);
  const [safehousesError, setSafehousesError] = useState(false);

  // 4. Reintegration breakdown
  const [reintegration, setReintegration] = useState<ReintegrationStatus[]>([]);
  const [reintegrationLoading, setReintegrationLoading] = useState(true);
  const [reintegrationError, setReintegrationError] = useState(false);

  // 5. Drill-down panel
  const [drillStatus, setDrillStatus] = useState<string | null>(null);
  const [drillResidents, setDrillResidents] = useState<ResidentListItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<DonationMonthlyPoint[]>("/api/reports/donations/monthly")
      .then((d) => { if (!cancelled) setDonations(d); })
      .catch(() => { if (!cancelled) setDonationsError(true); })
      .finally(() => { if (!cancelled) setDonationsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    publicGet<MonthlyMetricPoint[]>("/api/public/monthly-metrics")
      .then((d) => { if (!cancelled) setMetrics(d); })
      .catch(() => { if (!cancelled) setMetricsError(true); })
      .finally(() => { if (!cancelled) setMetricsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGet<SafehousePerf[]>("/api/reports/safehouses/performance")
      .then((d) => { if (!cancelled) setSafehouses(d); })
      .catch(() => { if (!cancelled) setSafehousesError(true); })
      .finally(() => { if (!cancelled) setSafehousesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGet<ReintegrationStatus[]>("/api/reports/residents/reintegration")
      .then((d) => { if (!cancelled) setReintegration(d); })
      .catch(() => { if (!cancelled) setReintegrationError(true); })
      .finally(() => { if (!cancelled) setReintegrationLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!drillStatus) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrillStatus(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drillStatus]);

  function handleBarClick(data: { status: string }) {
    setDrillStatus(data.status);
    setDrillResidents([]);
    setDrillLoading(true);
    apiGet<Paged<ResidentListItem>>(
      `/api/residents?reintegrationStatus=${encodeURIComponent(data.status)}&take=500`,
    )
      .then((res) => setDrillResidents(res.items))
      .catch(() => setDrillResidents([]))
      .finally(() => setDrillLoading(false));
  }

  const donationChartData = useMemo(
    () => donations.map((d) => ({ ...d, monthLabel: fmtMonth(d.month) })),
    [donations],
  );

  const metricsChartData = useMemo(
    () => metrics.map((m) => ({ ...m, monthLabel: fmtMonth(m.month) })),
    [metrics],
  );

  const metricTickInterval = Math.max(0, Math.floor(metricsChartData.length / 10) - 1);
  const donationTickInterval = Math.max(0, Math.floor(donationChartData.length / 10) - 1);

  const reintegrationChartData = useMemo(
    () => reintegration.map((r) => ({ status: r.status, count: r.count })),
    [reintegration],
  );

  const maxReintegration = reintegrationChartData.length
    ? Math.max(...reintegrationChartData.map((d) => d.count))
    : 0;

  return (
    <AdminPageShell
      title="Reports & Analytics"
      description="Live charts drawn from the Harbor of Hope database — donation trends, resident outcomes, safehouse comparisons, and reintegration rates."
    >
      {/* ── 1. Reintegration Breakdown ── */}
      <ChartCard
        title="Reintegration status breakdown"
        lede="Current resident count by reintegration status — shows the pipeline from active cases to successful community reintegration."
        loading={reintegrationLoading}
        error={reintegrationError}
        empty={reintegrationChartData.length === 0}
      >
        <ResponsiveContainer width="100%" height={Math.max(220, reintegrationChartData.length * 44)}>
          <BarChart
            layout="vertical"
            data={reintegrationChartData}
            margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#4a5568" }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="status"
              tick={{ fontSize: 12, fill: "#1a2533" }}
              width={100}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown) => [String(value), "Residents"]}
            />
            <Bar
              dataKey="count"
              name="Residents"
              radius={[0, 4, 4, 0]}
              style={{ cursor: "pointer" }}
              onClick={(data) => handleBarClick(data as unknown as { status: string })}
              label={{
                position: "right",
                fontSize: 12,
                fill: "#4a5568",
              }}
            >
              {reintegrationChartData.map((entry) => (
                <Cell key={entry.status} fill={statusColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p style={{ marginTop: 12, fontSize: 12, color: "var(--ink-soft)" }}>
          Total residents: {reintegration.reduce((s, r) => s + r.count, 0).toLocaleString()} ·
          Max (single status): {maxReintegration.toLocaleString()}
        </p>
      </ChartCard>
      {/* ── 2. Donation Trends ── */}
      <ChartCard
        title="Monthly donation revenue"
        lede="Total monetary donations received each month (Philippine Peso). Hover a point to see the gift count."
        loading={donationsLoading}
        error={donationsError}
        empty={donationChartData.length === 0}
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={donationChartData}
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="donationGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#62a5d1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#62a5d1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "#4a5568" }}
              tickMargin={6}
              interval={donationTickInterval}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#4a5568" }}
              width={64}
              tickFormatter={(v: number) =>
                v >= 1_000_000 ? `₱${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`
              }
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown, _name: unknown, item: unknown) => {
                const payload = (item as { payload?: { count?: number } })?.payload;
                return [
                  `${fmtPeso(Number(value))} · ${payload?.count ?? 0} gift${(payload?.count ?? 0) !== 1 ? "s" : ""}`,
                  "Donations",
                ] as [string, string];
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Monthly Total"
              stroke="#62a5d1"
              strokeWidth={2.5}
              fill="url(#donationGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 3. Resident Outcome Metrics ── */}
      <ChartCard
        title="Resident outcome metrics over time"
        lede="Monthly network-wide averages for education progress (%) and health score (0–4) across all safehouses."
        loading={metricsLoading}
        error={metricsError}
        empty={metricsChartData.length === 0}
      >
        <div style={{ display: "flex", gap: 20, marginBottom: 12, fontSize: 12, color: "var(--ink-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 3, background: "#62a5d1", display: "inline-block", borderRadius: 2 }} />
            Education Progress (%)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 3, background: "#f59e0b", display: "inline-block", borderRadius: 2 }} />
            Health Score (right axis)
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={metricsChartData} margin={{ top: 8, right: 52, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "#4a5568" }}
              tickMargin={6}
              interval={metricTickInterval}
            />
            <YAxis
              yAxisId="edu"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#4a5568" }}
              width={44}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              yAxisId="health"
              orientation="right"
              domain={[0, 4]}
              tick={{ fontSize: 11, fill: "#4a5568" }}
              width={36}
              tickCount={5}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown, name: unknown) => {
                const n = Number(value);
                const nm = String(name ?? "");
                if (nm === "Education Progress") return [`${n.toFixed(1)}%`, nm] as [string, string];
                if (nm === "Health Score") return [n.toFixed(2), nm] as [string, string];
                return [String(value), nm] as [string, string];
              }}
              labelFormatter={(_label, payload) => {
                const row = (payload as { payload?: { monthLabel?: string } }[])?.[0]?.payload;
                return row?.monthLabel ?? "";
              }}
            />
            <Line
              yAxisId="edu"
              type="monotone"
              dataKey="avgEducationProgress"
              name="Education Progress"
              stroke="#62a5d1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
            <Line
              yAxisId="health"
              type="monotone"
              dataKey="avgHealthScore"
              name="Health Score"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 4. Safehouse Performance ── */}
      <ChartCard
        title="Safehouse performance comparison"
        lede="Total residents served, currently active, and successfully reintegrated, grouped by safehouse."
        loading={safehousesLoading}
        error={safehousesError}
        empty={safehouses.length === 0}
      >
        <div style={{ display: "flex", gap: 20, marginBottom: 12, fontSize: 12, color: "var(--ink-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: "#daeef8", border: "1px solid #b0d8ee", display: "inline-block", borderRadius: 3 }} />
            Total residents
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: "#62a5d1", display: "inline-block", borderRadius: 3 }} />
            Active now
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: "#2a5f80", display: "inline-block", borderRadius: 3 }} />
            Reintegrated
          </span>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(260, safehouses.length * 44)}>
          <BarChart
            layout="vertical"
            data={safehouses}
            margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
            barCategoryGap="28%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#4a5568" }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "#1a2533" }}
              width={110}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown, name: unknown) => [String(value), String(name ?? "")]}
            />
            <Bar dataKey="totalResidents" name="Total residents" fill="#daeef8" radius={[0, 3, 3, 0]} />
            <Bar dataKey="activeResidents" name="Active now" fill="#62a5d1" radius={[0, 3, 3, 0]} />
            <Bar dataKey="reintegratedCount" name="Reintegrated" fill="#2a5f80" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Reintegration drill-down panel ── */}
      {drillStatus !== null && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setDrillStatus(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 1000,
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Residents with status: ${drillStatus}`}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              maxWidth: "90vw",
              background: "#fff",
              zIndex: 1001,
              boxShadow: "-4px 0 32px rgba(0,0,0,0.14)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid var(--border, #e5e7eb)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Reintegration status
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2533" }}>
                  {drillStatus}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrillStatus(null)}
                aria-label="Close panel"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  fontSize: 18,
                  color: "var(--ink-muted)",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {drillLoading ? (
                <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Loading…</p>
              ) : drillResidents.length === 0 ? (
                <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                  No residents found for this status.
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {drillResidents.map((resident) => (
                    <li
                      key={resident.residentId}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid var(--border, #e5e7eb)",
                        background: "#fafbfc",
                      }}
                    >
                      <Link
                        to={`/residents/${resident.residentId}`}
                        onClick={() => setDrillStatus(null)}
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "#2a5f80",
                          textDecoration: "none",
                        }}
                      >
                        {resident.displayCode ?? resident.caseControlNo ?? `Resident #${resident.residentId}`}
                      </Link>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 3 }}>
                        {resident.safehouse ?? "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {!drillLoading && drillResidents.length > 0 && (
              <div
                style={{
                  padding: "12px 24px",
                  borderTop: "1px solid var(--border, #e5e7eb)",
                  fontSize: 12,
                  color: "var(--ink-muted)",
                }}
              >
                {drillResidents.length} resident{drillResidents.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
