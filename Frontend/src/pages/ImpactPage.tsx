import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
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
} from 'recharts';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import { publicGet } from '../api/client';
import type {
  MonthlyMetricPoint,
  ProgramAreaAllocation,
  RegionOccupancy,
} from '../api/types';
import './ImpactPage.css';

/* ─── helpers ─────────────────────────────────────────────── */
function fmtMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  if (!y || !mo) return m;
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  });
}

function fmtPeso(n: number) {
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

const PROGRAM_COLORS: Record<string, string> = {
  Education:   '#62a5d1',
  Wellbeing:   '#3d7fa8',
  Operations:  '#2a5f80',
  Transport:   '#82c0de',
  Maintenance: '#a8d4ec',
  Outreach:    '#c4e3f4',
};

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid rgba(98,165,209,0.3)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: 13,
};

/* ─── component ───────────────────────────────────────────── */
export default function ImpactPage() {
  const [metrics, setMetrics] = useState<MonthlyMetricPoint[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(false);

  const [occupancy, setOccupancy] = useState<RegionOccupancy[]>([]);
  const [occupancyLoading, setOccupancyLoading] = useState(true);
  const [occupancyError, setOccupancyError] = useState(false);

  const [allocations, setAllocations] = useState<ProgramAreaAllocation[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(true);
  const [allocationsError, setAllocationsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    publicGet<MonthlyMetricPoint[]>('/api/public/monthly-metrics')
      .then((d) => { if (!cancelled) setMetrics(d); })
      .catch(() => { if (!cancelled) setMetricsError(true); })
      .finally(() => { if (!cancelled) setMetricsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    publicGet<RegionOccupancy[]>('/api/public/safehouses/occupancy')
      .then((d) => { if (!cancelled) setOccupancy(d); })
      .catch(() => { if (!cancelled) setOccupancyError(true); })
      .finally(() => { if (!cancelled) setOccupancyLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    publicGet<ProgramAreaAllocation[]>('/api/public/donations/by-program')
      .then((d) => { if (!cancelled) setAllocations(d); })
      .catch(() => { if (!cancelled) setAllocationsError(true); })
      .finally(() => { if (!cancelled) setAllocationsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const metricsChartData = useMemo(
    () => metrics.map((m) => ({ ...m, monthLabel: fmtMonth(m.month) })),
    [metrics],
  );

  const tickInterval = Math.max(0, Math.floor(metricsChartData.length / 10) - 1);

  const occupancyChartData = useMemo(
    () => occupancy.map((r) => ({
      region: r.region,
      Capacity: r.totalCapacity,
      Occupied: r.totalOccupancy,
      safehouseCount: r.safehouseCount,
      fillPct: r.totalCapacity > 0 ? r.totalOccupancy / r.totalCapacity : 0,
    })),
    [occupancy],
  );

  const allocationChartData = useMemo(
    () => allocations.map((a) => ({ area: a.programArea, total: a.totalAllocated })),
    [allocations],
  );

  const maxAllocation = allocationChartData.length
    ? Math.max(...allocationChartData.map((d) => d.total))
    : 0;

  return (
    <div className="impact-page">
      <a href="#impact-main" className="skip-link">Skip to main content</a>
      <PublicHeader />

      <main id="impact-main">

        {/* ── Hero ── */}
        <section className="impact-hero">
          <div className="impact-hero__inner">
            <span className="impact-hero__eyebrow">Public transparency</span>
            <h1>Your gifts at work</h1>
            <p>
              Harbor of Hope publishes high-level outcomes and fund utilization so donors can
              see how collective generosity translates into safe homes, therapy, and education,
              without exposing resident identities.
            </p>
          </div>
        </section>

        {/* ── Section 1: Resident Progress Trends ── */}
        <section className="impact-section impact-section--tint" aria-labelledby="metrics-heading">
          <div className="impact-section__inner">
            <h2 id="metrics-heading" className="impact-section__title">
              Resident progress over time
            </h2>
            <p className="impact-section__lede">
              Monthly network-wide averages for education progress and health score across all
              nine Harbor of Hope safe houses. Each point aggregates all active residents for that month.
            </p>

            {metricsLoading ? (
              <p className="impact-placeholder" aria-live="polite">Loading metrics…</p>
            ) : metricsError ? (
              <p className="impact-placeholder" role="alert">Could not load metrics.</p>
            ) : metricsChartData.length === 0 ? (
              <p className="impact-placeholder">No metrics data available yet.</p>
            ) : (
              <div className="impact-chart-card">
                <div className="impact-chart-legend-row">
                  <span className="impact-legend-dot" style={{ background: '#62a5d1' }} />
                  <span className="impact-legend-label">Education Progress (%)</span>
                  <span className="impact-legend-dot" style={{ background: '#f59e0b' }} />
                  <span className="impact-legend-label">Health Score (0 to 4, right axis)</span>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={metricsChartData} margin={{ top: 8, right: 52, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: '#4a5568' }}
                      tickMargin={6}
                      interval={tickInterval}
                    />
                    <YAxis
                      yAxisId="edu"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#4a5568' }}
                      width={44}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <YAxis
                      yAxisId="health"
                      orientation="right"
                      domain={[0, 4]}
                      tick={{ fontSize: 11, fill: '#4a5568' }}
                      width={36}
                      tickCount={5}
                      tickFormatter={(v: number) => v.toFixed(1)}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => {
                        const n = Number(value);
                        const nm = String(name ?? '');
                        if (nm === 'Education Progress') return [`${n.toFixed(1)}%`, nm];
                        if (nm === 'Health Score') return [n.toFixed(2), nm];
                        return [value, nm];
                      }}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { monthLabel?: string } | undefined;
                        return row?.monthLabel ?? '';
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
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Regional Occupancy ── */}
        <section className="impact-section" aria-labelledby="occupancy-heading">
          <div className="impact-section__inner">
            <h2 id="occupancy-heading" className="impact-section__title">
              Safehouse occupancy by region
            </h2>
            <p className="impact-section__lede">
              Current resident occupancy compared to total bed capacity across the three
              Philippine island groups we serve.
            </p>

            {occupancyLoading ? (
              <p className="impact-placeholder" aria-live="polite">Loading occupancy data…</p>
            ) : occupancyError ? (
              <p className="impact-placeholder" role="alert">Could not load occupancy data.</p>
            ) : occupancyChartData.length === 0 ? (
              <p className="impact-placeholder">No occupancy data available.</p>
            ) : (
              <div className="impact-chart-card">
                <div className="impact-chart-legend-row">
                  <span className="impact-legend-dot" style={{ background: '#daeef8', border: '1px solid #b0d8ee' }} />
                  <span className="impact-legend-label">Total Capacity</span>
                  <span className="impact-legend-dot" style={{ background: '#62a5d1' }} />
                  <span className="impact-legend-label">Current Occupancy</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={occupancyChartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    barCategoryGap="36%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" vertical={false} />
                    <XAxis
                      dataKey="region"
                      tick={{ fontSize: 14, fill: '#1a2533', fontWeight: 600 }}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#4a5568' }}
                      width={36}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name, item) => {
                        const nm = String(name ?? '');
                        const payload = item?.payload as { safehouseCount?: number } | undefined;
                        if (nm === 'Capacity')
                          return [`${value} beds (${payload?.safehouseCount} houses)`, 'Total Capacity'];
                        return [`${value} residents`, 'Current Occupancy'];
                      }}
                    />
                    <Bar dataKey="Capacity" fill="#daeef8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Occupied" radius={[4, 4, 0, 0]}>
                      {occupancyChartData.map((entry) => (
                        <Cell
                          key={entry.region}
                          fill={entry.fillPct >= 0.95 ? '#2a5f80' : '#62a5d1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="impact-occupancy-stats">
                  {occupancyChartData.map((r) => (
                    <div key={r.region} className="impact-occ-stat">
                      <span className="impact-occ-stat__region">{r.region}</span>
                      <span className="impact-occ-stat__pct">
                        {Math.round(r.fillPct * 100)}% full
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 3: Donations by Program Area ── */}
        <section className="impact-section impact-section--tint" aria-labelledby="allocations-heading">
          <div className="impact-section__inner">
            <h2 id="allocations-heading" className="impact-section__title">
              Where program funds go
            </h2>
            <p className="impact-section__lede">
              Cumulative donation allocations by program area across all safehouses and campaigns
              since 2023, in Philippine Peso (PHP).
            </p>

            {allocationsLoading ? (
              <p className="impact-placeholder" aria-live="polite">Loading fund data…</p>
            ) : allocationsError ? (
              <p className="impact-placeholder" role="alert">Could not load fund data.</p>
            ) : allocationChartData.length === 0 ? (
              <p className="impact-placeholder">No allocation data available.</p>
            ) : (
              <div className="impact-chart-card">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    layout="vertical"
                    data={allocationChartData}
                    margin={{ top: 4, right: 100, left: 8, bottom: 4 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#4a5568' }}
                      tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
                      domain={[0, maxAllocation * 1.1]}
                    />
                    <YAxis
                      type="category"
                      dataKey="area"
                      tick={{ fontSize: 13, fill: '#1a2533', fontWeight: 500 }}
                      width={92}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: unknown) => [fmtPeso(Number(value)), 'Total Allocated']}
                    />
                    <Bar
                      dataKey="total"
                      radius={[0, 4, 4, 0]}
                      label={{
                        position: 'right',
                        fontSize: 12,
                        fill: '#4a5568',
                        formatter: (v: unknown) => fmtPeso(Number(v)),
                      }}
                    >
                      {allocationChartData.map((entry) => (
                        <Cell
                          key={entry.area}
                          fill={PROGRAM_COLORS[entry.area] ?? '#62a5d1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="impact-section" aria-labelledby="impact-story-heading">
          <div className="impact-section__inner impact-cta">
            <h2 id="impact-story-heading" className="impact-section__title">
              Help us sustain this work
            </h2>
            <p>
              Every contribution funds trauma-informed care and long-term reintegration support.
              Thank you for standing with survivors.
            </p>
            <Link to="/donate" className="impact-cta__btn">Donate</Link>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
