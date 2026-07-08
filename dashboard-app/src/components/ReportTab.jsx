import { useState, useMemo } from 'react';
import { fmt, monthLabel, P } from '../utils/format';
import { summarizeMonthly, summarizeDaily, getFiscalYear } from '../utils/dataProcessor';

// Temporarily hidden — flip back to true to re-enable the Anomaly Flags section.
const SHOW_ANOMALIES = false;
// Temporarily hidden — flip back to true to re-enable KPI trend sparklines.
const SHOW_SPARKLINES = false;

const fmtN = n => (n == null || n === 0) ? '—' : n.toLocaleString('en-IN');
const pct  = (n, d) => d > 0 ? (n / d * 100).toFixed(1) + '%' : '—';
const fiscalLabel = y => y ? `FY ${y}-${String(Number(y) + 1).slice(-2)}` : '';
const isoDate = d => d.toISOString().slice(0, 10);
const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
// invert = true for metrics where a decrease is the improvement (cost, wastage)
const deltaFor = (curr, prev, invert = false) => {
  if (prev == null || prev === 0) return null;
  const p = (curr - prev) / prev * 100;
  return { pct: p, positive: invert ? p <= 0 : p >= 0 };
};
// KPI top accent bar reflects the metric's trend: green if improving, red if
// worsening, neutral gray when there's no prior period to compare against.
const colorForDelta = delta => !delta ? '#8892a4' : delta.positive ? P.green : P.red;

// ── Anomaly detection — flags rows that fall outside normal bounds ────────
// Thresholds match the color-coding already used elsewhere in the dashboard
// (margin < 25% = 'negative', wastage% > 5% = 'negative' in ProductionTab).
function rowFlagIcons(sales, wastage, profit, avgSales) {
  if (!sales || sales <= 0) return [];
  const icons = [];
  const wastagePct = (wastage || 0) / sales * 100;
  const margin = (profit || 0) / sales * 100;
  if (wastagePct > 5) icons.push({ icon: '⚠️', title: `Wastage ${wastagePct.toFixed(1)}% of sales`, severity: wastagePct });
  if (margin < 25) icons.push({ icon: '📉', title: `Margin ${margin.toFixed(1)}% — below target`, severity: 25 - margin });
  if (avgSales > 0 && sales < avgSales * 0.5) {
    icons.push({ icon: '🔻', title: `Sales ${fmt(sales)} — well below period average`, severity: (avgSales - sales) / avgSales * 100 });
  }
  return icons;
}

function findAnomalies(rows, rowType, avgSales) {
  if (!rows.length) return [];
  const salesField = rowType === 'monthly' ? 'total' : 'total_sales';
  const flags = [];
  rows.forEach(r => {
    const label = rowType === 'monthly' ? monthLabel(r.month) : r.date;
    rowFlagIcons(r[salesField], r.wastage, r.profit, avgSales).forEach(f => flags.push({ ...f, label, detail: f.title }));
  });
  return flags.sort((a, b) => b.severity - a.severity);
}

// ── Auto-generated narrative summary ───────────────────────────────────────
function buildNarrative(s, prevS, salesRows, anomalyCount) {
  const sentences = [];
  const topCategory = [...salesRows].sort((a, b) => b.amount - a.amount)[0];
  const topShare = topCategory ? pct(topCategory.amount, s.total_sales) : null;
  const revDelta = deltaFor(s.total_sales, prevS?.total_sales);

  sentences.push(
    revDelta
      ? `Revenue ${revDelta.pct >= 0 ? 'grew' : 'declined'} ${Math.abs(revDelta.pct).toFixed(1)}% vs the prior period to ${fmt(s.total_sales)}${topCategory ? `, led by ${topCategory.label} (${topShare} of revenue)` : ''}.`
      : `Revenue for this period was ${fmt(s.total_sales)}${topCategory ? `, led by ${topCategory.label} (${topShare} of revenue)` : ''}.`
  );

  const profitDelta = deltaFor(s.total_profit, prevS?.total_profit);
  sentences.push(
    `Profit came in at ${fmt(s.total_profit)} (${s.overall_margin}% margin)${profitDelta ? `, ${profitDelta.pct >= 0 ? 'up' : 'down'} ${Math.abs(profitDelta.pct).toFixed(1)}% vs prior` : ''}.`
  );

  const wastageDelta = deltaFor(s.total_wastage, prevS?.total_wastage, true);
  if (wastageDelta) {
    sentences.push(`Wastage ${wastageDelta.pct >= 0 ? 'increased' : 'decreased'} ${Math.abs(wastageDelta.pct).toFixed(1)}% vs prior, now ${pct(s.total_wastage, s.total_sales)} of revenue.`);
  }

  sentences.push(anomalyCount > 0 ? `${anomalyCount} item${anomalyCount > 1 ? 's' : ''} flagged for review below.` : 'No anomalies flagged for this period.');
  return sentences.join(' ');
}

const VIEWS = [
  { id: 'weekly',   label: 'Weekly' },
  { id: 'monthly',  label: 'Monthly' },
  { id: 'yearly',   label: 'Yearly' },
];

const PROCESSES = [
  { key: 'gumming',   label: 'Gumming',    color: P.purple },
  { key: 'slitting',  label: 'Slitting',   color: P.teal   },
  { key: 'color',     label: 'Color',      color: P.blue   },
  { key: 'diepunch',  label: 'Die Punch',  color: P.orange },
  { key: 'readyroll', label: 'Ready Roll', color: P.pink   },
];

function Sparkline({ data, color }) {
  const vals = (data || []).map(v => v || 0);
  if (vals.length < 2) return null;
  const w = 120, h = 28;
  const max = Math.max(...vals), min = Math.min(...vals);
  const range = (max - min) || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - ((v - min) / range) * h]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function KpiCard({ label, value, sub, color, delta, trend }) {
  return (
    <div className="kpi" style={{ '--kc': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {delta && (
        <span className={`kpi-badge ${delta.positive ? 'bg' : 'rb'}`}>
          {delta.pct > 0 ? '▲' : delta.pct < 0 ? '▼' : '→'} {Math.abs(delta.pct).toFixed(1)}% vs prior
        </span>
      )}
      {SHOW_SPARKLINES && trend && (
        <div className="kpi-spark"><Sparkline data={trend} color={color} /></div>
      )}
    </div>
  );
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function levelFor(flagCount) {
  return flagCount === 0 ? 'ok' : flagCount === 1 ? 'warn' : 'bad';
}

// Heatmap view for the Anomaly Flags section — daily rows render as a
// Mon–Sun calendar grid, monthly rows (Yearly view) render as a 12-tile grid.
function CalendarHeatmap({ rows, rowType, avgSales }) {
  if (rowType === 'monthly') {
    return (
      <div className="cal-grid cal-grid-months">
        {rows.map(m => {
          const flags = rowFlagIcons(m.total, m.wastage, m.profit, avgSales);
          return (
            <div
              key={m.month}
              className={`cal-cell cal-${levelFor(flags.length)}`}
              title={flags.length ? flags.map(f => f.title).join(' • ') : `${monthLabel(m.month)} — no anomalies`}
            >
              {monthLabel(m.month)}
            </div>
          );
        })}
      </div>
    );
  }

  if (!rows.length) return <p className="report-note">No data to display.</p>;

  const byDate = {};
  rows.forEach(r => { byDate[r.date] = r; });
  const sortedDates = Object.keys(byDate).sort();
  const first = new Date(sortedDates[0] + 'T00:00:00');
  const last  = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');
  const firstMon = new Date(first);
  firstMon.setDate(first.getDate() - (first.getDay() === 0 ? 6 : first.getDay() - 1));
  const totalWeeks = Math.ceil((Math.round((last - firstMon) / 86400000) + 1) / 7);

  const weeks = Array.from({ length: totalWeeks }, (_, w) => (
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(firstMon); day.setDate(firstMon.getDate() + w * 7 + d);
      const iso = isoDate(day);
      return { iso, row: byDate[iso] };
    })
  ));

  return (
    <div className="cal-wrap">
      <div className="cal-grid cal-dow-row">
        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="cal-grid cal-week-row">
          {week.map(({ iso, row }) => {
            if (!row) return <div key={iso} className="cal-cell cal-empty" />;
            const flags = rowFlagIcons(row.total_sales, row.wastage, row.profit, avgSales);
            return (
              <div
                key={iso}
                className={`cal-cell cal-${levelFor(flags.length)}`}
                title={flags.length ? flags.map(f => f.title).join(' • ') : `${iso} — no anomalies`}
              >
                {Number(iso.slice(8, 10))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function ReportTab({ fullMonthly, fullDaily, currentFiscalYear, selYear, selMonth, dateFrom, dateTo }) {
  const [view, setView] = useState('yearly');
  const [anomalyView, setAnomalyView] = useState('list');
  const generatedAt = new Date().toLocaleString('en-IN');
  const hasCustomRange = !!(dateFrom && dateTo);

  // ── Custom date range — overrides Weekly/Monthly/Yearly when both dates are set ──
  const customView = useMemo(() => {
    if (!hasCustomRange) return null;
    const rangeDaily = fullDaily.filter(d => d.date >= dateFrom && d.date <= dateTo);

    // Prior period — an equal-length window immediately before the selected range
    const rangeDays = Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1;
    const priorToDate = new Date(dateFrom + 'T00:00:00'); priorToDate.setDate(priorToDate.getDate() - 1);
    const priorFromDate = new Date(priorToDate); priorFromDate.setDate(priorToDate.getDate() - rangeDays + 1);
    const priorFrom = isoDate(priorFromDate), priorTo = isoDate(priorToDate);
    const priorRangeDaily = fullDaily.filter(d => d.date >= priorFrom && d.date <= priorTo);

    return {
      title: 'Custom Range Report', subtitle: `${dateFrom} – ${dateTo}`, note: null,
      summary: summarizeDaily(rangeDaily), rows: rangeDaily, rowType: 'daily',
      prevSummary: summarizeDaily(priorRangeDaily), prevLabel: `${priorFrom} – ${priorTo}`,
    };
  }, [fullDaily, hasCustomRange, dateFrom, dateTo]);

  // ── Build the three scoped views ───────────────────────────────────────
  const viewData = useMemo(() => {
    // Yearly — whichever fiscal year is selected in the filter bar
    const yearlyFY = selYear || currentFiscalYear;
    const yearlyMonthly = fullMonthly.filter(m => (m.fiscalYear || getFiscalYear(m.month)) === yearlyFY);
    const yearlyFallback = !selYear;

    // Monthly — whichever month is selected in the filter bar
    const monthsInScope = selYear ? yearlyMonthly : fullMonthly;
    const targetMonth = selMonth
      ? monthsInScope.find(m => m.month.slice(5) === selMonth)
      : monthsInScope[monthsInScope.length - 1];
    const monthlyFallback = !selMonth;
    const monthlyDaily = targetMonth ? fullDaily.filter(d => d.date.slice(0, 7) === targetMonth.month) : [];

    // Prior month — for the Monthly comparison (search all months, since Apr's
    // prior month, March, sits in the previous fiscal year)
    const prevMonthStr = targetMonth ? shiftMonth(targetMonth.month, -1) : null;
    const prevMonthRow = prevMonthStr ? fullMonthly.find(m => m.month === prevMonthStr) : null;

    // Prior fiscal year — for the Yearly comparison
    const priorFY = String(Number(yearlyFY) - 1);
    const priorYearlyMonthly = fullMonthly.filter(m => (m.fiscalYear || getFiscalYear(m.month)) === priorFY);

    // Weekly — the calendar week (Mon–Sun) immediately before the current one,
    // plus the week before that for comparison
    const latest = fullDaily.reduce((m, d) => (d.date > m ? d.date : m), '');
    let weekDaily = [], weekFrom = '', weekTo = '';
    let priorWeekDaily = [], priorWeekFrom = '', priorWeekTo = '';
    if (latest) {
      const ld = new Date(latest + 'T00:00:00');
      const fromMon = ld.getDay() === 0 ? 6 : ld.getDay() - 1;
      const currMon = new Date(ld); currMon.setDate(ld.getDate() - fromMon);
      const prevMon = new Date(currMon); prevMon.setDate(currMon.getDate() - 7);
      const prevSun = new Date(prevMon); prevSun.setDate(prevMon.getDate() + 6);
      weekFrom = isoDate(prevMon); weekTo = isoDate(prevSun);
      weekDaily = fullDaily.filter(d => d.date >= weekFrom && d.date <= weekTo);

      const prevMon2 = new Date(prevMon); prevMon2.setDate(prevMon.getDate() - 7);
      const prevSun2 = new Date(prevMon2); prevSun2.setDate(prevMon2.getDate() + 6);
      priorWeekFrom = isoDate(prevMon2); priorWeekTo = isoDate(prevSun2);
      priorWeekDaily = fullDaily.filter(d => d.date >= priorWeekFrom && d.date <= priorWeekTo);
    }

    return {
      weekly: {
        title: 'Weekly Report', subtitle: `Previous Week • ${weekFrom} – ${weekTo}`, note: null,
        summary: summarizeDaily(weekDaily), rows: weekDaily, rowType: 'daily',
        prevSummary: summarizeDaily(priorWeekDaily), prevLabel: `${priorWeekFrom} – ${priorWeekTo}`,
      },
      monthly: {
        title: 'Monthly Report',
        subtitle: targetMonth ? monthLabel(targetMonth.month) : 'No data',
        note: monthlyFallback ? 'No month selected in the filter bar — showing the most recent available month.' : null,
        summary: targetMonth ? summarizeMonthly([targetMonth]) : summarizeMonthly([]),
        rows: monthlyDaily, rowType: 'daily',
        prevSummary: summarizeMonthly(prevMonthRow ? [prevMonthRow] : []), prevLabel: prevMonthRow ? monthLabel(prevMonthRow.month) : null,
      },
      yearly: {
        title: 'Yearly Report', subtitle: fiscalLabel(yearlyFY),
        note: yearlyFallback ? 'No year selected in the filter bar — showing the current fiscal year.' : null,
        summary: summarizeMonthly(yearlyMonthly), rows: yearlyMonthly, rowType: 'monthly',
        prevSummary: summarizeMonthly(priorYearlyMonthly), prevLabel: fiscalLabel(priorFY),
      },
    };
  }, [fullMonthly, fullDaily, currentFiscalYear, selYear, selMonth]);

  const v = customView || viewData[view];
  const s = v.summary;
  const prevS = v.prevSummary;

  // Trend series for sparklines — drawn from the same rows already used for
  // the performance table (daily points for Weekly/Monthly/Custom, monthly
  // points for Yearly), so no extra data fetching is needed.
  const revenueField = v.rowType === 'monthly' ? 'total' : 'total_sales';
  const trendOf = field => v.rows.map(r => r[field] || 0);

  // Average revenue per row in scope — used to flag rows well below average
  const rowsWithSales = v.rows.filter(r => (r[revenueField] || 0) > 0);
  const avgSales = rowsWithSales.length ? rowsWithSales.reduce((a, r) => a + r[revenueField], 0) / rowsWithSales.length : 0;

  const revDelta    = deltaFor(s.total_sales, prevS?.total_sales);
  const profitDelta = deltaFor(s.total_profit, prevS?.total_profit);
  const costDelta   = deltaFor(s.total_mfgcost, prevS?.total_mfgcost, true);
  const wastageDelta= deltaFor(s.total_wastage, prevS?.total_wastage, true);
  const colorWasteDelta = deltaFor(s.cl_waste, prevS?.cl_waste, true);
  const rrWasteDelta    = deltaFor(s.rr_waste, prevS?.rr_waste, true);

  const kpis = [
    { label: 'Total Revenue', value: fmt(s.total_sales),   sub: `${s.date_range.from} – ${s.date_range.to}`, color: colorForDelta(revDelta),
      delta: revDelta, trend: trendOf(revenueField) },
    { label: 'Total Profit',  value: fmt(s.total_profit),  sub: `${s.overall_margin}% margin`,                color: colorForDelta(profitDelta),
      delta: profitDelta, trend: trendOf('profit') },
    { label: 'Mfg Cost',      value: fmt(s.total_mfgcost), sub: pct(s.total_mfgcost, s.total_sales) + ' of revenue', color: colorForDelta(costDelta),
      delta: costDelta, trend: trendOf('mfgcost') },
    { label: 'Total Wastage', value: fmt(s.total_wastage), sub: pct(s.total_wastage, s.total_sales) + ' of revenue', color: colorForDelta(wastageDelta),
      delta: wastageDelta, trend: trendOf('wastage') },
    { label: 'Color Waste',      value: fmt(s.cl_waste), sub: pct(s.cl_waste, s.total_wastage) + ' of wastage', color: colorForDelta(colorWasteDelta),
      delta: colorWasteDelta, trend: trendOf('cl_waste') },
    { label: 'Ready Roll Waste', value: fmt(s.rr_waste), sub: pct(s.rr_waste, s.total_wastage) + ' of wastage', color: colorForDelta(rrWasteDelta),
      delta: rrWasteDelta, trend: trendOf('rr_waste') },
  ];

  const salesRows = [
    { label: 'Label Sales',  color: P.purple, amount: s.total_label  },
    { label: 'Roll Sales',   color: P.teal,   amount: s.total_roll   },
    { label: 'Direct Sales', color: P.orange, amount: s.total_dsales },
  ];

  const productionRows = [
    { label: 'Gumming',    color: P.purple, amount: s.total_gumming,   rolls: s.gm_rolls, qty: s.gm_qty, wastage: null },
    { label: 'Slitting',   color: P.teal,   amount: s.total_slitting,  rolls: s.sl_rolls, qty: s.sl_qty, wastage: null },
    { label: 'Color',      color: P.blue,   amount: s.total_color,    rolls: s.cl_rolls, qty: s.cl_qty, wastage: s.cl_waste },
    { label: 'Die Punch',  color: P.orange, amount: s.total_diepunch, rolls: null,       qty: s.dp_qty, wastage: null },
    { label: 'Ready Roll', color: P.pink,   amount: s.total_readyroll,rolls: s.rr_rolls, qty: s.rr_pcs, wastage: s.rr_waste },
  ];
  const totalProductionAmount = productionRows.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Efficiency ratios — normalize totals by time and by production volume
  const totalRolls     = (s.gm_rolls || 0) + (s.sl_rolls || 0) + (s.cl_rolls || 0) + (s.rr_rolls || 0);
  const totalWasteRolls= (s.cl_rolls || 0) + (s.rr_rolls || 0);
  const totalWasteAmt  = (s.cl_waste || 0) + (s.rr_waste || 0);
  const periodDays     = s.date_range.days || 1;
  const efficiencyRows = [
    { label: 'Avg Daily Revenue', value: fmt(s.total_sales / periodDays) },
    { label: 'Avg Daily Profit',  value: fmt(s.total_profit / periodDays) },
    { label: 'Revenue per Roll',  value: totalRolls > 0 ? fmt(s.total_sales / totalRolls) : '—' },
    { label: 'Cost per Roll',     value: totalRolls > 0 ? fmt(s.total_mfgcost / totalRolls) : '—' },
    { label: 'Wastage per Roll',  value: totalWasteRolls > 0 ? fmt(totalWasteAmt / totalWasteRolls) : '—' },
  ];

  const anomalies = findAnomalies(v.rows, v.rowType, avgSales);
  const narrative = buildNarrative(s, prevS, salesRows, anomalies.length);

  return (
    <div className="report">
      <div className="report-subtabs no-print">
        {VIEWS.map(t => (
          <button
            key={t.id}
            className={`report-subtab-btn${!hasCustomRange && view === t.id ? ' active' : ''}`}
            onClick={() => setView(t.id)}
            disabled={hasCustomRange}
          >
            {t.label}
          </button>
        ))}
        {hasCustomRange && (
          <span className="report-subtab-btn active" style={{ cursor: 'default' }}>Custom Range</span>
        )}
        <button className="refresh-btn" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>
          <span className="refresh-icon">🖨</span> Print / Save as PDF
        </button>
      </div>

      <div className="report-head">
        <h2>{v.title}</h2>
        <p className="subtitle">
          <i>{v.subtitle} {v.prevLabel && <>  Compared to {v.prevLabel} </> }</i>
            <br></br>#Report Date: {generatedAt}#
        </p>
        {v.note && <p className="report-note">{v.note}</p>}
      </div>

      <p className="section">Summary</p>
      <p className="report-narrative">{narrative}</p>

      <p className="section">Executive Summary</p>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      <p className="section">Efficiency Ratios</p>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
        {efficiencyRows.map(k => <KpiCard key={k.label} label={k.label} value={k.value} color={P.blue} />)}
      </div>

      <p className="section">Sales Breakdown</p>
      <div className="tbl-wrap">
        <table className="no-last-highlight">
          <thead>
            <tr><th style={{ textAlign: 'left' }}>Category</th><th>Amount</th><th>% of Revenue</th></tr>
          </thead>
          <tbody>
            {salesRows.map(r => (
              <tr key={r.label}>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block', flexShrink: 0 }} />
                    {r.label}
                  </span>
                </td>
                <td>{fmt(r.amount)}</td>
                <td>{pct(r.amount, s.total_sales)}</td>
              </tr>
            ))}
            <tr>
              <td>Total Revenue</td>
              <td>{fmt(s.total_sales)}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="section">Production Summary</p>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Process</th>
              <th>Amount</th><th>Rolls</th><th>Qty / Pcs</th><th>Wastage</th>
            </tr>
          </thead>
          <tbody>
            {productionRows.map(r => (
              <tr key={r.label}>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block', flexShrink: 0 }} />
                    {r.label}
                  </span>
                </td>
                <td>{fmt(r.amount)}</td>
                <td>{fmtN(r.rolls)}</td>
                <td>{fmtN(r.qty)}</td>
                <td>{r.wastage != null ? fmt(r.wastage) : '—'}</td>
              </tr>
            ))}
            <tr>
              <td>Total</td>
              <td>{fmt(totalProductionAmount)}</td>
              <td>—</td>
              <td>—</td>
              <td>{fmt(totalWasteAmt)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="section">Breakdown by Process ({v.rowType === 'monthly' ? 'Monthly' : 'Daily'}, ₹)</p>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{v.rowType === 'monthly' ? 'Month' : 'Date'}</th>
              {PROCESSES.map(p => <th key={p.key}>{p.label}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {v.rows.map(r => {
              const rowTotal = PROCESSES.reduce((sum, p) => sum + (r[p.key] || 0), 0);
              const rowKey = v.rowType === 'monthly' ? r.month : r.date;
              const rowLabel = v.rowType === 'monthly' ? monthLabel(r.month) : r.date;
              return (
                <tr key={rowKey}>
                  <td>{rowLabel}</td>
                  {PROCESSES.map(p => <td key={p.key}>{fmt(r[p.key])}</td>)}
                  <td>{fmt(rowTotal)}</td>
                </tr>
              );
            })}
            {v.rows.length === 0 && (
              <tr><td colSpan={PROCESSES.length + 2} style={{ textAlign: 'center', color: 'var(--muted)' }}>No data available</td></tr>
            )}
            <tr>
              <td>Total</td>
              {PROCESSES.map(p => <td key={p.key}>{fmt(s['total_' + p.key])}</td>)}
              <td>{fmt(totalProductionAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {SHOW_ANOMALIES && (
        <>
          <div className="section-row no-print">
            <p className="section" style={{ margin: 0, border: 'none', padding: 0 }}>Anomaly Flags</p>
            <div className="anomaly-view-toggle">
              <button className={`report-subtab-btn small${anomalyView === 'list' ? ' active' : ''}`} onClick={() => setAnomalyView('list')}>List</button>
              <button className={`report-subtab-btn small${anomalyView === 'calendar' ? ' active' : ''}`} onClick={() => setAnomalyView('calendar')}>Calendar</button>
            </div>
          </div>
          <p className="section only-print">Anomaly Flags</p>

          {anomalies.length === 0 ? (
            <p className="report-note" style={{ color: 'var(--green)' }}>No anomalies detected in this period.</p>
          ) : anomalyView === 'list' ? (
            <div className="anomaly-list">
              {anomalies.slice(0, 8).map((a, i) => (
                <div key={i} className="anomaly-item">
                  <span className="anomaly-icon">{a.icon}</span>
                  <span className="anomaly-label">{a.label}</span>
                  <span className="anomaly-detail">{a.detail}</span>
                </div>
              ))}
              {anomalies.length > 8 && <p className="report-note">+{anomalies.length - 8} more not shown.</p>}
            </div>
          ) : (
            <>
              <CalendarHeatmap rows={v.rows} rowType={v.rowType} avgSales={avgSales} />
              <div className="cal-legend">
                <span><span className="cal-legend-swatch cal-ok" /> No anomalies</span>
                <span><span className="cal-legend-swatch cal-warn" /> 1 flag</span>
                <span><span className="cal-legend-swatch cal-bad" /> 2+ flags</span>
              </div>
            </>
          )}
        </>
      )}

      <p className="section">{v.rowType === 'monthly' ? 'Monthly Performance' : 'Daily Performance'}</p>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{v.rowType === 'monthly' ? 'Month' : 'Date'}</th>
              <th>Total Sales</th><th>Profit</th><th>Margin %</th><th>Mfg Cost</th><th>Wastage</th>
            </tr>
          </thead>
          <tbody>
            {v.rowType === 'monthly' ? v.rows.map(m => (
              <tr key={m.month}>
                <td>{monthLabel(m.month)}</td>
                <td>{fmt(m.total)}</td>
                <td>{fmt(m.profit)}</td>
                <td className={m.margin >= 35 ? 'positive' : m.margin >= 25 ? 'neutral' : 'negative'}>{m.margin}%</td>
                <td>{fmt(m.mfgcost)}</td>
                <td>{fmt(m.wastage)}</td>
              </tr>
            )) : v.rows.map(d => {
              const margin = d.total_sales > 0 ? Math.round(d.profit / d.total_sales * 1000) / 10 : 0;
              return (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{fmt(d.total_sales)}</td>
                  <td>{fmt(d.profit)}</td>
                  <td className={margin >= 35 ? 'positive' : margin >= 25 ? 'neutral' : 'negative'}>{margin}%</td>
                  <td>{fmt(d.mfgcost)}</td>
                  <td>{fmt(d.wastage)}</td>
                </tr>
              );
            })}
            {v.rows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>No data available</td></tr>
            )}
            <tr>
              <td>Total / Avg</td>
              <td>{fmt(s.total_sales)}</td>
              <td>{fmt(s.total_profit)}</td>
              <td className="positive">{s.overall_margin}%</td>
              <td>{fmt(s.total_mfgcost)}</td>
              <td>{fmt(s.total_wastage)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
