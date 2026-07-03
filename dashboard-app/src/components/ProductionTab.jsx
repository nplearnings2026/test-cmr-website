import { Bar } from 'react-chartjs-2';
import { fmt, monthLabel, P, MONTH_COLORS, getChartTheme } from '../utils/format';

const fmtN = n => (n == null || n === 0) ? '—' : n.toLocaleString('en-IN');

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi" style={{ '--kc': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

const PROCESSES = [
  { key: 'gumming',   label: 'Gumming',    color: P.purple },
  { key: 'slitting',  label: 'Slitting',   color: P.teal   },
  { key: 'color',     label: 'Color',      color: P.blue   },
  { key: 'diepunch',  label: 'Die Punch',  color: P.orange },
  { key: 'readyroll', label: 'Ready Roll', color: P.pink   },
];

export default function ProductionTab({ summary, monthly, theme }) {
  const { GRID, TICK, LEG, BASE_TIP } = getChartTheme(theme);

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: LEG,
      tooltip: { ...BASE_TIP, callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.raw) } },
    },
    scales: {
      x: { grid: GRID, ticks: TICK },
      y: { grid: GRID, ticks: { ...TICK, callback: v => '₹' + (v / 100_000).toFixed(1) + 'L' } },
    },
  };
  // ── Per-process summary rows ─────────────────────────────────────────
  const rows = [
    {
      label    : 'Gumming',
      color    : P.purple,
      amount   : summary.total_gumming,
      rolls    : summary.gm_rolls,
      qty      : summary.gm_qty,
      qty_unit : 'pcs',
      avg_roll : summary.gm_rolls > 0 ? Math.round(summary.total_gumming / summary.gm_rolls) : 0,
      wastage  : null,
      waste_pct: null,
    },
    {
      label    : 'Slitting',
      color    : P.teal,
      amount   : summary.total_slitting,
      rolls    : summary.sl_rolls,
      qty      : summary.sl_qty,
      qty_unit : 'pcs',
      avg_roll : summary.sl_rolls > 0 ? Math.round(summary.total_slitting / summary.sl_rolls) : 0,
      wastage  : null,
      waste_pct: null,
    },
    {
      label    : 'Color',
      color    : P.blue,
      amount   : summary.total_color,
      rolls    : summary.cl_rolls,
      qty      : summary.cl_qty,
      qty_unit : 'pcs',
      avg_roll : summary.cl_rolls > 0 ? Math.round(summary.total_color / summary.cl_rolls) : 0,
      wastage  : summary.cl_waste,
      waste_pct: summary.total_color > 0 ? (summary.cl_waste / summary.total_color * 100).toFixed(1) : null,
    },
    {
      label    : 'Die Punch',
      color    : P.orange,
      amount   : summary.total_diepunch,
      rolls    : null,
      qty      : summary.dp_qty,
      qty_unit : 'punches',
      avg_roll : summary.dp_qty > 0 ? Math.round(summary.total_diepunch / summary.dp_qty) : 0,
      wastage  : null,
      waste_pct: null,
    },
    {
      label    : 'Ready Roll',
      color    : P.pink,
      amount   : summary.total_readyroll,
      rolls    : summary.rr_rolls,
      qty      : summary.rr_pcs,
      qty_unit : 'pcs',
      avg_roll : summary.rr_rolls > 0 ? Math.round(summary.total_readyroll / summary.rr_rolls) : 0,
      wastage  : summary.rr_waste,
      waste_pct: summary.total_readyroll > 0 ? (summary.rr_waste / summary.total_readyroll * 100).toFixed(1) : null,
    },
  ];

  // Monthly trend chart (all 5 stacked/grouped)
  const monthlyChartData = {
    labels: monthly.map(m => monthLabel(m.month)),
    datasets: PROCESSES.map(p => ({
      label           : p.label,
      data            : monthly.map(m => m[p.key]),
      backgroundColor : p.color + '99',
      borderColor     : p.color,
      borderWidth     : 1,
      borderRadius    : 4,
    })),
  };

  const monthlyChartOpts = {
    ...barOpts,
    plugins: { ...barOpts.plugins, legend: LEG, tooltip: { ...BASE_TIP, mode: 'index' } },
  };

  // Monthly breakdown data per process
  const wastageChartData = {
    labels: monthly.map(m => monthLabel(m.month)),
    datasets: [
      { label:'Color Wastage',    data:monthly.map(m=>m.cl_waste), backgroundColor:P.blue+'99',   borderColor:P.blue,   borderWidth:1, borderRadius:4 },
      { label:'Ready Roll Wastage',data:monthly.map(m=>m.rr_waste),backgroundColor:P.pink+'99',   borderColor:P.pink,   borderWidth:1, borderRadius:4 },
    ],
  };

  return (
    <div>
      {/* ── Top KPI row ───────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard label="Gumming Amount"    value={fmt(summary.total_gumming)}   sub={`${fmtN(summary.gm_rolls)} rolls`}  color={P.purple} />
        <KpiCard label="Gumming Qty"       value={fmtN(summary.gm_qty)}          sub="pcs processed"                      color={P.purple} />
        <KpiCard label="Slitting Amount"   value={fmt(summary.total_slitting)}  sub={`${fmtN(summary.sl_rolls)} rolls`}  color={P.teal}   />
        <KpiCard label="Slitting Qty"      value={fmtN(summary.sl_qty)}          sub="pcs processed"                      color={P.teal}   />
        <KpiCard label="Color Amount"      value={fmt(summary.total_color)}     sub={`${fmtN(summary.cl_rolls)} rolls`}  color={P.blue}   />
        <KpiCard label="Color Wastage"     value={fmt(summary.cl_waste)}        sub="total losses"                        color={P.red}    />
        <KpiCard label="Die Punch Amount"  value={fmt(summary.total_diepunch)}  sub={`${fmtN(summary.dp_qty)} punches`}  color={P.orange} />
        <KpiCard label="Ready Roll Amount" value={fmt(summary.total_readyroll)} sub={`${fmtN(summary.rr_rolls)} rolls`}  color={P.pink}   />
        <KpiCard label="RR Wastage"        value={fmt(summary.rr_waste)}        sub={`${fmtN(summary.rr_pcs)} pcs`}      color={P.yellow} />
      </div>

      {/* ── Process Summary Table ─────────────────────────────────────── */}
      <p className="section">Production Process Summary</p>
      <div className="tbl-wrap">
        <table className="no-last-highlight">
          <thead>
            <tr>
              <th style={{ textAlign:'left' }}>Process</th>
              <th>Total Amount</th>
              <th>Rolls</th>
              <th>Qty / Pcs</th>
              <th>Avg per Roll</th>
              <th>Wastage</th>
              <th>Wastage %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label}>
                <td>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:r.color, display:'inline-block', flexShrink:0 }} />
                    {r.label}
                  </span>
                </td>
                <td>{fmt(r.amount)}</td>
                <td>{fmtN(r.rolls)}</td>
                <td>{fmtN(r.qty)}{r.qty ? <span style={{ color:'var(--muted)', fontSize:'.7rem', marginLeft:4 }}>{r.qty_unit}</span> : ''}</td>
                <td>{r.avg_roll ? fmt(r.avg_roll) : '—'}</td>
                <td>{r.wastage != null ? fmt(r.wastage) : '—'}</td>
                <td className={r.waste_pct != null ? (parseFloat(r.waste_pct) > 5 ? 'negative' : parseFloat(r.waste_pct) > 2 ? 'neutral' : 'positive') : ''}>
                  {r.waste_pct != null ? r.waste_pct + '%' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Monthly Breakdown Table ───────────────────────────────────── */}
      <p className="section">Monthly Breakdown by Process (Amount ₹)</p>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign:'left' }}>Month</th>
              {PROCESSES.map(p => <th key={p.key}>{p.label}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map(m => {
              const total = m.gumming + m.slitting + m.color + m.diepunch + m.readyroll;
              return (
                <tr key={m.month}>
                  <td>{monthLabel(m.month)}</td>
                  {PROCESSES.map(p => <td key={p.key}>{fmt(m[p.key])}</td>)}
                  <td>{fmt(total)}</td>
                </tr>
              );
            })}
            <tr>
              <td>Total</td>
              {PROCESSES.map(p => (
                <td key={p.key}>{fmt(summary['total_' + p.key])}</td>
              ))}
              <td>{fmt(summary.total_gumming + summary.total_slitting + summary.total_color + summary.total_diepunch + summary.total_readyroll)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Charts ───────────────────────────────────────────────────── */}
      <p className="section">Monthly Production Trends</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Process Amount by Month</div>
          <div className="card-sub">All five processes — monthly ₹ value</div>
          <div className="chart-wrap"><Bar data={monthlyChartData} options={monthlyChartOpts} /></div>
        </div>
        <div className="card">
          <div className="card-title">Color &amp; Ready Roll Wastage</div>
          <div className="card-sub">Monthly wastage losses by process</div>
          <div className="chart-wrap"><Bar data={wastageChartData} options={{ ...barOpts, plugins:{ ...barOpts.plugins, legend:LEG, tooltip:{ ...BASE_TIP, mode:'index' } } }} /></div>
        </div>
      </div>
    </div>
  );
}
