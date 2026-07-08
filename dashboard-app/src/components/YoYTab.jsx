import { Bar, Line } from 'react-chartjs-2';
import { fmt, P, getChartTheme } from '../utils/format';

const FISCAL_MONTHS = ['04','05','06','07','08','09','10','11','12','01','02','03'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEAR_COLORS = { '2024': P.purple, '2025': P.teal, '2026': P.orange };
const yColor      = y => YEAR_COLORS[y] || P.blue;
const getFiscalYear = ym => {
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(5));
  return month >= 4 ? String(year) : String(year - 1);
};
const fiscalLabel = y => `FY ${y}-${String(Number(y) + 1).slice(-2)}`;

const round1 = n => Math.round(n * 10) / 10;
const pct = (n, d) => d > 0 ? (n / d * 100).toFixed(1) + '%' : '—';
// invert = true for metrics where a decrease is the improvement (cost, wastage)
const deltaFor = (curr, prev, invert = false) => {
  if (prev == null || prev === 0) return null;
  const p = (curr - prev) / prev * 100;
  return { pct: p, positive: invert ? p <= 0 : p >= 0 };
};
// KPI top accent bar reflects the metric's trend: green if improving, red if
// worsening, neutral gray when there's no prior period to compare against.
const colorForDelta = delta => !delta ? '#8892a4' : delta.positive ? P.green : P.red;

function ExecKpiCard({ label, value, sub, color, delta }) {
  return (
    <div className="kpi" style={{ '--kc': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {delta && (
        <span className={`kpi-badge ${delta.positive ? 'bg' : 'rb'}`}>
          {delta.pct > 0 ? '▲' : delta.pct < 0 ? '▼' : '→'} {Math.abs(delta.pct).toFixed(1)}% vs prior year
        </span>
      )}
    </div>
  );
}

export default function YoYTab({ monthly, theme }) {
  const { GRID, TICK, LEG, BASE_TIP } = getChartTheme(theme);

  // ── Group by year ────────────────────────────────────────────────────
  const years = [...new Set(monthly.map(m => m.fiscalYear || getFiscalYear(m.month)))].sort();
  const byYear = {};
  years.forEach(y => (byYear[y] = {}));
  monthly.forEach(m => {
    const fy = m.fiscalYear || getFiscalYear(m.month);
    byYear[fy][m.month.slice(5)] = m;
  });

  // ── Annual totals ────────────────────────────────────────────────────
  const annuals = years.map(y => {
    const ms    = Object.values(byYear[y]);
    const moKeys= Object.keys(byYear[y]).sort();
    const sum   = f => ms.reduce((s, m) => s + (m[f] || 0), 0);
    const total = sum('total');
    const profit= sum('profit');
    const cost  = sum('mfgcost');
    return {
      year     : y,
      total, profit, cost,
      margin   : total > 0 ? round1(profit / total * 100) : 0,
      cost_pct : total > 0 ? round1(cost   / total * 100) : 0,
      label    : sum('label'),
      roll     : sum('roll'),
      dsales   : sum('dsales'),
      inward   : sum('inward'),
      outward  : sum('outward'),
      wastage  : sum('wastage'),
      wastage_pct: total > 0 ? round1(sum('wastage') / total * 100) : 0,
      gumming  : sum('gumming'),
      slitting : sum('slitting'),
      color    : sum('color'),
      diepunch : sum('diepunch'),
      readyroll: sum('readyroll'),
      cl_waste : sum('cl_waste'),
      rr_waste : sum('rr_waste'),
      months   : ms.length,
      moKeys,
    };
  });

  const latestAnnual = annuals[annuals.length - 1];
  const priorAnnual  = annuals.length > 1 ? annuals[annuals.length - 2] : null;
  const revDelta    = latestAnnual ? deltaFor(latestAnnual.total, priorAnnual?.total) : null;
  const profitDelta = latestAnnual ? deltaFor(latestAnnual.profit, priorAnnual?.profit) : null;
  const costDelta   = latestAnnual ? deltaFor(latestAnnual.cost, priorAnnual?.cost, true) : null;
  const wastageDelta= latestAnnual ? deltaFor(latestAnnual.wastage, priorAnnual?.wastage, true) : null;
  const colorWasteDelta = latestAnnual ? deltaFor(latestAnnual.cl_waste, priorAnnual?.cl_waste, true) : null;
  const rrWasteDelta    = latestAnnual ? deltaFor(latestAnnual.rr_waste, priorAnnual?.rr_waste, true) : null;

  const execKpis = latestAnnual ? [
    { label: 'Total Revenue', value: fmt(latestAnnual.total), sub: fiscalLabel(latestAnnual.year), color: colorForDelta(revDelta),
      delta: revDelta },
    { label: 'Total Profit',  value: fmt(latestAnnual.profit), sub: `${latestAnnual.margin}% margin`, color: colorForDelta(profitDelta),
      delta: profitDelta },
    { label: 'Mfg Cost',      value: fmt(latestAnnual.cost), sub: `${latestAnnual.cost_pct}% of revenue`, color: colorForDelta(costDelta),
      delta: costDelta },
    { label: 'Total Wastage', value: fmt(latestAnnual.wastage), sub: `${latestAnnual.wastage_pct}% of revenue`, color: colorForDelta(wastageDelta),
      delta: wastageDelta },
    { label: 'Color Waste',      value: fmt(latestAnnual.cl_waste), sub: pct(latestAnnual.cl_waste, latestAnnual.wastage) + ' of wastage', color: colorForDelta(colorWasteDelta),
      delta: colorWasteDelta },
    { label: 'Ready Roll Waste', value: fmt(latestAnnual.rr_waste), sub: pct(latestAnnual.rr_waste, latestAnnual.wastage) + ' of wastage', color: colorForDelta(rrWasteDelta),
      delta: rrWasteDelta },
  ] : [];

  // ── Comparable-period growth between two consecutive years ───────────
  // Sums only the months present in BOTH years for a fair comparison.
  function comparableGrowth(prevA, currA, field) {
    const common = prevA.moKeys.filter(mo => byYear[currA.year][mo]);
    if (!common.length) return { pct: null, label: null };
    const prevSum = common.reduce((s, mo) => s + (byYear[prevA.year][mo]?.[field] || 0), 0);
    const currSum = common.reduce((s, mo) => s + (byYear[currA.year][mo]?.[field] || 0), 0);
    const pct = prevSum > 0 ? round1((currSum - prevSum) / prevSum * 100) : null;
    const N   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sortedCommon = common.slice().sort((a, b) => FISCAL_MONTHS.indexOf(a) - FISCAL_MONTHS.indexOf(b));
    const label = sortedCommon.length === 12
      ? 'full year'
      : `${N[parseInt(sortedCommon[0],10)-1]}–${N[parseInt(sortedCommon[sortedCommon.length-1],10)-1]} (${sortedCommon.length}mo)`;
    return { pct, label };
  }

  // Pre-compute growth for each year vs its predecessor (last two years used for table)
  const yoyGrowth = annuals.map((a, i) => {
    if (i === 0) return {};
    const prev = annuals[i - 1];
    return {
      total    : comparableGrowth(prev, a, 'total'),
      profit   : comparableGrowth(prev, a, 'profit'),
      margin   : comparableGrowth(prev, a, 'margin'),
      cost     : comparableGrowth(prev, a, 'mfgcost'),
      cost_pct : comparableGrowth(prev, a, 'cost_pct'),
      inward   : comparableGrowth(prev, a, 'inward'),
      outward  : comparableGrowth(prev, a, 'outward'),
      wastage  : comparableGrowth(prev, a, 'wastage'),
      wastage_pct: comparableGrowth(prev, a, 'wastage_pct'),
      gumming  : comparableGrowth(prev, a, 'gumming'),
      slitting : comparableGrowth(prev, a, 'slitting'),
      color    : comparableGrowth(prev, a, 'color'),
      diepunch : comparableGrowth(prev, a, 'diepunch'),
      readyroll: comparableGrowth(prev, a, 'readyroll'),
    };
  });

  // Latest growth (last year vs second-to-last)
  const latestGrowth = yoyGrowth[yoyGrowth.length - 1] || {};

  // ── Shared chart options ─────────────────────────────────────────────
  const moneyOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: LEG, tooltip: { ...BASE_TIP, mode: 'index' } },
    scales: {
      x: { grid: GRID, ticks: TICK },
      y: { grid: GRID, ticks: { ...TICK, callback: v => '₹' + (v / 100_000).toFixed(1) + 'L' } },
    },
  };
  const pctOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: LEG, tooltip: { ...BASE_TIP, mode: 'index' } },
    scales: {
      x: { grid: GRID, ticks: TICK },
      y: { grid: GRID, ticks: { ...TICK, callback: v => v + '%' } },
    },
  };

  // ── Monthly comparison charts ────────────────────────────────────────
  const makeMonthlyDataset = (field, alpha = 'cc') =>
    years.map(y => ({
      label           : fiscalLabel(y),
      data            : FISCAL_MONTHS.map(mo => byYear[y][mo]?.[field] ?? null),
      backgroundColor : yColor(y) + alpha,
      borderColor     : yColor(y),
      borderWidth     : 1,
      borderRadius    : 4,
      spanGaps        : false,
    }));

  const makeLineDataset = field =>
    years.map(y => ({
      label    : fiscalLabel(y),
      data     : FISCAL_MONTHS.map(mo => byYear[y][mo]?.[field] ?? null),
      borderColor     : yColor(y),
      backgroundColor : 'transparent',
      tension  : 0.4,
      pointRadius: 4,
      spanGaps : false,
    }));

  // ── Annual bar charts ────────────────────────────────────────────────
  const annualBarData = field => ({
    labels: years.map(fiscalLabel),
    datasets: [{
      label: field === 'total' ? 'Revenue' : field === 'profit' ? 'Profit' : 'Mfg Cost',
      data            : annuals.map(a => a[field]),
      backgroundColor : years.map(y => yColor(y) + 'cc'),
      borderColor     : years.map(yColor),
      borderWidth     : 1,
      borderRadius    : 6,
    }],
  });

  const annualOpts = {
    ...moneyOpts,
    plugins: { ...moneyOpts.plugins, tooltip: { ...BASE_TIP } },
  };

  return (
    <div>
      {execKpis.length > 0 && (
        <>
          <p className="section">Executive Summary</p>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>
            {execKpis.map(k => <ExecKpiCard key={k.label} {...k} />)}
          </div>
        </>
      )}

      {/* ── Annual summary cards ────────────────────────────────────── */}
      <p className="section">Annual Summary</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${years.length}, 1fr)`, gap: 14, marginBottom: 24 }}>
        {annuals.map((a, i) => {
          const g       = yoyGrowth[i]?.total;
          const growth  = g?.pct ?? null;
          return (
            <div key={a.year} className="card" style={{ borderTop: `3px solid ${yColor(a.year)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: yColor(a.year) }}>{fiscalLabel(a.year)}</span>
                {growth != null && (
                  <div style={{ textAlign: 'right' }}>
                    <span className={`kpi-badge ${growth >= 0 ? 'bg' : 'rb'}`}>
                      {growth >= 0 ? '+' : ''}{growth}% YoY
                    </span>
                    {g?.label && <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 2 }}>{g.label}</div>}
                  </div>
                )}
              </div>
              {[
                ['Revenue',   fmt(a.total)],
                ['Profit',    fmt(a.profit)],
                ['Margin',    <span className={a.margin>=35?'positive':a.margin>=25?'neutral':'negative'}>{a.margin}%</span>],
                ['Mfg Cost',  fmt(a.cost)  + ` (${a.cost_pct}%)`],
                ['Inward',    fmt(a.inward)],
                ['Outward',   fmt(a.outward)],
                ['Wastage',   fmt(a.wastage) + ` (${a.wastage_pct}%)`],
                ['Months',    a.months],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '.8rem' }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Annual trend line charts ────────────────────────────────── */}
      <p className="section">Annual Trends</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Revenue &amp; Profit — Annual Trend</div>
          <div className="card-sub">Year-on-year revenue and profit (₹)</div>
          <div className="chart-wrap">
            <Line
              data={{
                labels: years.map(fiscalLabel),
                datasets: [
                  {
                    label: 'Revenue',
                    data: annuals.map(a => a.total),
                    borderColor: P.purple, backgroundColor: 'rgba(108,99,255,.12)',
                    tension: 0.35, pointRadius: 6, pointHoverRadius: 8, fill: true,
                    yAxisID: 'y',
                  },
                  {
                    label: 'Profit',
                    data: annuals.map(a => a.profit),
                    borderColor: P.teal, backgroundColor: 'rgba(0,212,170,.08)',
                    tension: 0.35, pointRadius: 6, pointHoverRadius: 8, fill: true,
                    yAxisID: 'y',
                  },
                ],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: LEG, tooltip: { ...BASE_TIP } },
                scales: {
                  x: { grid: GRID, ticks: TICK },
                  y: { grid: GRID, ticks: { ...TICK, callback: v => '₹' + (v / 100_000).toFixed(1) + 'L' } },
                },
              }}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Margin % &amp; Wastage % — Annual Trend</div>
          <div className="card-sub">Year-on-year profitability and wastage rates</div>
          <div className="chart-wrap">
            <Line
              data={{
                labels: years.map(fiscalLabel),
                datasets: [
                  {
                    label: 'Margin %',
                    data: annuals.map(a => a.margin),
                    borderColor: P.teal, backgroundColor: 'rgba(0,212,170,.1)',
                    tension: 0.35, pointRadius: 6, pointHoverRadius: 8, fill: false,
                  },
                  {
                    label: 'Wastage %',
                    data: annuals.map(a => a.wastage_pct),
                    borderColor: P.red, backgroundColor: 'rgba(255,107,107,.1)',
                    tension: 0.35, pointRadius: 6, pointHoverRadius: 8, fill: false,
                  },
                ],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: LEG, tooltip: { ...BASE_TIP } },
                scales: {
                  x: { grid: GRID, ticks: TICK },
                  y: { grid: GRID, ticks: { ...TICK, callback: v => v + '%' } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Detailed comparison table ────────────────────────────────── */}
      <p className="section">Year-over-Year Detailed Comparison</p>
      <div className="tbl-wrap">
        <table className="no-last-highlight">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Metric</th>
              {years.map(y => <th key={y} style={{ color: yColor(y) }}>{fiscalLabel(y)}</th>)}
              {years.length >= 2 && <th>YoY Growth</th>}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Total Revenue',  field: 'total',    fmt: fmt },
              { label: 'Total Profit',   field: 'profit',   fmt: fmt },
              { label: 'Margin %',       field: 'margin',   fmt: v => v + '%', cls: v => v>=35?'positive':v>=25?'neutral':'negative' },
              { label: 'Mfg Cost',       field: 'cost',     fmt: fmt },
              { label: 'Cost %',         field: 'cost_pct', fmt: v => v + '%' },
              { label: 'Material In',    field: 'inward',   fmt: fmt },
              { label: 'Material Out',   field: 'outward',  fmt: fmt },
              { label: 'Wastage',        field: 'wastage',  fmt: fmt },
              { label: 'Wastage %',      field: 'wastage_pct', fmt: v => v + '%', cls: v => v>5?'negative':v>2?'neutral':'positive' },
            ].map(row => {
              const g      = latestGrowth[row.field];
              const growth = g?.pct ?? null;
              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  {annuals.map(a => (
                    <td key={a.year} className={row.cls ? row.cls(a[row.field]) : ''}>
                      {row.fmt(a[row.field])}
                    </td>
                  ))}
                  {years.length >= 2 && (
                    <td className={growth == null ? '' : growth >= 0 ? 'positive' : 'negative'}>
                      {growth != null ? (growth >= 0 ? '+' : '') + growth + '%' : '—'}
                      {g?.label && <span style={{ fontSize:'.65rem', color:'var(--muted)', display:'block' }}>{g.label}</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Monthly revenue & profit comparison ─────────────────────── */}
      <p className="section">Monthly Revenue Comparison</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Revenue by Month — Year over Year</div>
          <div className="card-sub">Same fiscal months compared across years</div>
          <div className="chart-wrap">
            <Bar data={{ labels: FISCAL_MONTHS.map(mo => MONTH_NAMES[parseInt(mo, 10) - 1]), datasets: makeMonthlyDataset('total') }} options={moneyOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Profit by Month — Year over Year</div>
          <div className="card-sub">Monthly profit compared across years</div>
          <div className="chart-wrap">
            <Bar data={{ labels: FISCAL_MONTHS.map(mo => MONTH_NAMES[parseInt(mo, 10) - 1]), datasets: makeMonthlyDataset('profit', '99') }} options={moneyOpts} />
          </div>
        </div>
      </div>

      {/* ── Margin & wastage comparison ──────────────────────────────── */}
      <p className="section">Margin &amp; Wastage Trends</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Margin % by Month — Year over Year</div>
          <div className="card-sub">Profitability trend across the same months each year</div>
          <div className="chart-wrap">
            <Line data={{ labels: FISCAL_MONTHS.map(mo => MONTH_NAMES[parseInt(mo, 10) - 1]), datasets: makeLineDataset('margin') }} options={pctOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Wastage % by Month — Year over Year</div>
          <div className="card-sub">Wastage as % of revenue — month by month</div>
          <div className="chart-wrap">
            <Line data={{ labels: FISCAL_MONTHS.map(mo => MONTH_NAMES[parseInt(mo, 10) - 1]), datasets: makeLineDataset('wastage_pct') }} options={pctOpts} />
          </div>
        </div>
      </div>

      {/* ── Annual totals bar charts ─────────────────────────────────── */}
      <p className="section">Annual Totals Comparison</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Annual Revenue &amp; Profit</div>
          <div className="card-sub">Total revenue and profit per year</div>
          <div className="chart-wrap">
            <Bar
              data={{ labels: years.map(fiscalLabel), datasets: [
                { label:'Revenue', data:annuals.map(a=>a.total),  backgroundColor:years.map(y=>yColor(y)+'cc'), borderColor:years.map(yColor), borderWidth:1, borderRadius:6 },
                { label:'Profit',  data:annuals.map(a=>a.profit), backgroundColor:years.map(y=>yColor(y)+'55'), borderColor:years.map(yColor), borderWidth:1, borderRadius:6 },
              ]}}
              options={annualOpts}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Annual Mfg Cost &amp; Wastage</div>
          <div className="card-sub">Manufacturing cost and wastage per year</div>
          <div className="chart-wrap">
            <Bar
              data={{ labels: years.map(fiscalLabel), datasets: [
                { label:'Mfg Cost', data:annuals.map(a=>a.cost),    backgroundColor:years.map(()=>P.red+'cc'),    borderColor:P.red,    borderWidth:1, borderRadius:6 },
                { label:'Wastage',  data:annuals.map(a=>a.wastage), backgroundColor:years.map(()=>P.yellow+'cc'), borderColor:P.yellow, borderWidth:1, borderRadius:6 },
              ]}}
              options={annualOpts}
            />
          </div>
        </div>
      </div>

      {/* ── Production process comparison ────────────────────────────── */}
      <p className="section">Production Process — Annual Comparison</p>
      <div className="tbl-wrap">
        <table className="no-last-highlight">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Process</th>
              {years.map(y => <th key={y} style={{ color: yColor(y) }}>{fiscalLabel(y)}</th>)}
              {years.length >= 2 && <th>YoY Growth</th>}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Gumming',   field: 'gumming',   color: P.purple },
              { label: 'Slitting',  field: 'slitting',  color: P.teal   },
              { label: 'Color',     field: 'color',     color: P.blue   },
              { label: 'Die Punch', field: 'diepunch',  color: P.orange },
              { label: 'Ready Roll',field: 'readyroll', color: P.pink   },
            ].map(row => {
              const g      = latestGrowth[row.field];
              const growth = g?.pct ?? null;
              return (
                <tr key={row.label}>
                  <td>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:row.color, display:'inline-block' }} />
                      {row.label}
                    </span>
                  </td>
                  {annuals.map(a => <td key={a.year}>{fmt(a[row.field])}</td>)}
                  {years.length >= 2 && (
                    <td className={growth == null ? '' : growth >= 0 ? 'positive' : 'negative'}>
                      {growth != null ? (growth >= 0 ? '+' : '') + growth + '%' : '—'}
                      {g?.label && <span style={{ fontSize:'.65rem', color:'var(--muted)', display:'block' }}>{g.label}</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
