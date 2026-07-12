import { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { fmt, monthLabel, P, MONTH_COLORS, getChartTheme } from '../utils/format';

const yL   = v => '₹' + (v / 100_000).toFixed(1) + 'L';
const yPct = v => v + '%';
const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const roundQty = v => v == null ? v : Math.round(v);
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

function ExecKpiCard({ label, value, sub, color, delta, deltaLabel = 'vs prior month' }) {
  return (
    <div className="kpi" style={{ '--kc': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {delta && (
        <span className={`kpi-badge ${delta.positive ? 'bg' : 'rb'}`}>
          {delta.pct > 0 ? '▲' : delta.pct < 0 ? '▼' : '→'} {Math.abs(delta.pct).toFixed(1)}% {deltaLabel}
        </span>
      )}
    </div>
  );
}

function MetricTile({ color, title, children }) {
  return (
    <div className="tile" style={{ '--tc': color }}>
      <div className="tile-title">{title}</div>
      {children}
    </div>
  );
}

export default function MonthlyTab({ monthly, fullMonthly, theme }) {
  const { GRID, TICK, LEG, BASE_TIP } = getChartTheme(theme);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = latest month
  const labels = monthly.map(m => monthLabel(m.month));

  // ── Shared options ───────────────────────────────────────────────────
  const moneyOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:LEG, tooltip:BASE_TIP },
    scales:{ x:{ grid:GRID, ticks:TICK }, y:{ grid:GRID, ticks:{ ...TICK, callback:yL } } },
  };
  const pctOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:LEG, tooltip:BASE_TIP },
    scales:{ x:{ grid:GRID, ticks:TICK }, y:{ grid:GRID, ticks:{ ...TICK, callback:yPct } } },
  };

  // ── Chart datasets ───────────────────────────────────────────────────
  const m1 = { labels, datasets:[{ label:'Revenue', data:monthly.map(m=>m.total),  backgroundColor:'rgba(108,99,255,.8)', borderRadius:4 }] };
  const m2 = { labels, datasets:[{ label:'Profit',  data:monthly.map(m=>m.profit), backgroundColor:'rgba(0,212,170,.7)', borderColor:P.teal, borderWidth:1, borderRadius:4 }] };

  const m3 = {
    labels,
    datasets:[{
      label:'Margin %',
      data:monthly.map(m=>m.margin),
      backgroundColor:monthly.map(m => m.margin>=35 ? 'rgba(34,197,94,.7)' : 'rgba(255,209,102,.7)'),
      borderColor:monthly.map(m => m.margin>=35 ? P.green : P.yellow),
      borderWidth:2, borderRadius:6,
    }],
  };

  const m4 = {
    labels,
    datasets:[
      { label:'Label %',  data:monthly.map(m=>m.label_pct),  backgroundColor:'rgba(108,99,255,.85)', stack:'s' },
      { label:'Roll %',   data:monthly.map(m=>m.roll_pct),   backgroundColor:'rgba(0,212,170,.85)',  stack:'s' },
      { label:'Direct %', data:monthly.map(m=>m.dsales_pct), backgroundColor:'rgba(255,159,67,.85)', stack:'s' },
    ],
  };

  const m5 = {
    labels,
    datasets:[
      { label:'Inward',  data:monthly.map(m=>m.inward),  backgroundColor:'rgba(72,219,251,.7)', borderColor:P.blue, borderWidth:1, borderRadius:4 },
      { label:'Outward', data:monthly.map(m=>m.outward), backgroundColor:'rgba(255,107,107,.7)', borderColor:P.red,  borderWidth:1, borderRadius:4 },
    ],
  };

  const growthPts = monthly.map(m => m.mom_growth);
  const m6 = {
    labels,
    datasets:[{
      label:'MoM Growth %',
      data:growthPts,
      borderColor:P.purple, backgroundColor:'rgba(108,99,255,.1)', tension:.4, fill:true, pointRadius:5,
      pointBackgroundColor:growthPts.map(v => v==null ? '#8892a4' : v>=0 ? P.green : P.red),
      pointBorderColor:    growthPts.map(v => v==null ? '#8892a4' : v>=0 ? P.green : P.red),
    }],
  };

  const m7 = {
    labels,
    datasets:[{
      label:'Wastage',
      data:monthly.map(m=>m.wastage),
      backgroundColor:monthly.map((_,i) => MONTH_COLORS[i%MONTH_COLORS.length]+'cc'),
      borderColor:     monthly.map((_,i) => MONTH_COLORS[i%MONTH_COLORS.length]),
      borderWidth:2, borderRadius:6,
    }],
  };

  const m8 = {
    labels,
    datasets:[{
      label:'Wastage % of Revenue',
      data:monthly.map(m=>m.wastage_pct),
      backgroundColor:monthly.map((_,i) => MONTH_COLORS[i%MONTH_COLORS.length]+'bb'),
      borderColor:     monthly.map((_,i) => MONTH_COLORS[i%MONTH_COLORS.length]),
      borderWidth:2, borderRadius:6,
    }],
  };

  // ── Metric tiles helpers ─────────────────────────────────────────────
  const maxOf  = f => Math.max(...monthly.map(m => m[f]), 1);
  const pct100 = (v, mx) => Math.min(100, Math.round(v / mx * 100));

  // ── Monthly navigation ────────────────────────────────────────────────
  const allMonths    = (fullMonthly?.length ? fullMonthly : monthly);
  const selMonthIdx  = allMonths.length - 1 + monthOffset;
  const latestMonth  = allMonths[selMonthIdx]     || null;
  const prevMonth    = allMonths[selMonthIdx - 1] || null;
  const hasPrevMonth = selMonthIdx > 0;
  const hasNextMonth = monthOffset < 0;
  const revDelta    = latestMonth ? deltaFor(latestMonth.total, prevMonth?.total) : null;
  const profitDelta = latestMonth ? deltaFor(latestMonth.profit, prevMonth?.profit) : null;
  const costDelta   = latestMonth ? deltaFor(latestMonth.mfgcost, prevMonth?.mfgcost, true) : null;
  const wastageDelta= latestMonth ? deltaFor(latestMonth.wastage, prevMonth?.wastage, true) : null;
  const colorWasteDelta = latestMonth ? deltaFor(latestMonth.cl_waste, prevMonth?.cl_waste, true) : null;
  const rrWasteDelta    = latestMonth ? deltaFor(latestMonth.rr_waste, prevMonth?.rr_waste, true) : null;

  const execKpis = latestMonth ? [
    { label: 'Total Revenue', value: fmt(latestMonth.total),   sub: monthLabel(latestMonth.month), color: colorForDelta(revDelta),
      delta: revDelta },
    { label: 'Total Profit',  value: fmt(latestMonth.profit),  sub: `${latestMonth.margin}% margin`, color: colorForDelta(profitDelta),
      delta: profitDelta },
    { label: 'Mfg Cost',      value: fmt(latestMonth.mfgcost), sub: `${latestMonth.cost_pct}% of revenue`, color: colorForDelta(costDelta),
      delta: costDelta },
    { label: 'Total Wastage', value: fmt(latestMonth.wastage), sub: `${latestMonth.wastage_pct}% of revenue`, color: colorForDelta(wastageDelta),
      delta: wastageDelta },
    { label: 'Color Waste',      value: fmt(latestMonth.cl_waste), sub: pct(latestMonth.cl_waste, latestMonth.wastage) + ' of wastage', color: colorForDelta(colorWasteDelta),
      delta: colorWasteDelta },
    { label: 'Ready Roll Waste', value: fmt(latestMonth.rr_waste), sub: pct(latestMonth.rr_waste, latestMonth.wastage) + ' of wastage', color: colorForDelta(rrWasteDelta),
      delta: rrWasteDelta },
  ] : [];

  // Sales breakdown — Label/Direct/Rolls Sales, This Month vs Prior Month
  // (mirrors DailyTab/WeeklyTab's Today-Yesterday / Current-Prev Week tiles)
  const thisMonthSalesBreak = latestMonth ? [
    { k: 'Label Sales',  amount: latestMonth.label,  qty: latestMonth.label_qty,  mfg: latestMonth.label_mfgcost },
    { k: 'Direct Sales', amount: latestMonth.dsales, qty: latestMonth.dsales_qty, mfg: latestMonth.dsales_mfgcost },
    { k: 'Rolls Sales',  amount: latestMonth.roll,   qty: latestMonth.roll_qty,   mfg: latestMonth.roll_mfgcost },
  ] : [];

  const priorMonthSalesBreak = prevMonth ? [
    { k: 'Label Sales',  amount: prevMonth.label,  qty: prevMonth.label_qty,  mfg: prevMonth.label_mfgcost },
    { k: 'Direct Sales', amount: prevMonth.dsales, qty: prevMonth.dsales_qty, mfg: prevMonth.dsales_mfgcost },
    { k: 'Rolls Sales',  amount: prevMonth.roll,   qty: prevMonth.roll_qty,   mfg: prevMonth.roll_mfgcost },
  ] : [];

  // Production & logistics — one tile per category, This Month vs Prior Month
  // (mirrors DailyTab/WeeklyTab's wkpi-grid tiles)
  const monthlyProcKpis = latestMonth ? [
    { label: 'Material Inward',  color: '#8892a4', c: latestMonth.inward    || 0, p: prevMonth?.inward    || 0, qtyC: latestMonth.inward_qty  ?? null, qtyP: prevMonth?.inward_qty  ?? null },
    { label: 'Material Outward', color: '#8892a4', c: latestMonth.outward   || 0, p: prevMonth?.outward   || 0, qtyC: latestMonth.outward_qty ?? null, qtyP: prevMonth?.outward_qty ?? null },
    { label: 'Gumming',          color: '#8892a4', c: latestMonth.gumming   || 0, p: prevMonth?.gumming   || 0, qtyC: latestMonth.gm_qty      ?? null, qtyP: prevMonth?.gm_qty      ?? null },
    { label: 'Slitting',         color: '#8892a4', c: latestMonth.slitting  || 0, p: prevMonth?.slitting  || 0, qtyC: latestMonth.sl_qty      ?? null, qtyP: prevMonth?.sl_qty      ?? null },
    { label: 'Color',            color: '#8892a4', c: latestMonth.color     || 0, p: prevMonth?.color     || 0, qtyC: latestMonth.cl_qty      ?? null, qtyP: prevMonth?.cl_qty      ?? null },
    { label: 'Die Punch',        color: '#8892a4', c: latestMonth.diepunch  || 0, p: prevMonth?.diepunch  || 0, qtyC: latestMonth.dp_qty      ?? null, qtyP: prevMonth?.dp_qty      ?? null },
    { label: 'Ready Roll',       color: '#8892a4', c: latestMonth.readyroll || 0, p: prevMonth?.readyroll || 0, qtyC: latestMonth.rr_pcs      ?? null, qtyP: prevMonth?.rr_pcs      ?? null },
    { label: 'Wastage',          color: P.yellow,  c: latestMonth.wastage   || 0, p: prevMonth?.wastage   || 0 },
  ] : [];

  function procBadge(c, p) {
    if (!p) return null;
    const change = (c - p) / p * 100;
    const cls = change > 0 ? 'wc-up' : change < 0 ? 'wc-dn' : 'wc-flat';
    return <span className={`wkpi-change ${cls}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}% vs prior month</span>;
  }

  return (
    <div>
      {/* ── Monthly navigation (always at top, same layout as Daily/Weekly) ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button className="week-nav-btn" onClick={() => setMonthOffset(o => o-1)} disabled={!hasPrevMonth}>&#8592; Prev Month</button>
        <div className="weekly-header" style={{ flex:1, marginBottom:0 }}>
          <div className="week-badge week-badge-curr">
            <div className="week-badge-label">{monthOffset === 0 ? 'Latest Month' : 'Selected Month'}</div>
            <div className="week-badge-dates">{latestMonth ? monthLabel(latestMonth.month) : '—'}</div>
          </div>
          {prevMonth && (
            <div className="week-badge week-badge-prev">
              <div className="week-badge-label">Previous Month</div>
              <div className="week-badge-dates">{monthLabel(prevMonth.month)}</div>
            </div>
          )}
        </div>
        <button className="week-nav-btn" onClick={() => setMonthOffset(o => o+1)} disabled={!hasNextMonth}>Next Month &#8594;</button>
      </div>

      {execKpis.length > 0 && (
        <>
          <p className="section">Executive Summary</p>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>
            {execKpis.map(k => <ExecKpiCard key={k.label} {...k} />)}
          </div>
        </>
      )}

      {thisMonthSalesBreak.length > 0 && (
        <>
          <p className="section">Sales Breakdown — This Month vs Prior Month</p>
          <div className="charts-2">
            <div>
              <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:16 }}>
                {thisMonthSalesBreak.map(s => (
                  <div key={s.k} className="kpi sales-today" style={{ '--kc':P.blue }}>
                    <div className="kpi-label">{s.k}</div>
                    <div className="kpi-value">{s.amount != null ? fmt(s.amount) : '—'}</div>
                    <div className="kpi-sub">
                      <div>Qty: {s.qty != null ? roundQty(s.qty) : '—'}</div>
                      <div>Mfg: {s.mfg != null ? fmt(s.mfg) : '—'}</div>
                    </div>
                    {(() => {
                      const prev = priorMonthSalesBreak.find(x => x.k === s.k)?.amount;
                      if (prev == null) return null;
                      if (prev === 0 && s.amount > 0) return <span className="kpi-badge bg">New</span>;
                      const d = deltaFor(s.amount, prev);
                      if (!d) return null;
                      return (
                        <span className={`kpi-badge ${d.positive ? 'bg' : 'rb'}`}>
                          {d.pct > 0 ? '▲' : d.pct < 0 ? '▼' : '→'} {Math.abs(d.pct).toFixed(1)}% vs prior month
                        </span>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:16 }}>
                {priorMonthSalesBreak.map(s => (
                  <div key={s.k} className="kpi sales-yesterday" style={{ '--kc':P.yellow }}>
                    <div className="kpi-label">{s.k}</div>
                    <div className="kpi-value">{s.amount != null ? fmt(s.amount) : '—'}</div>
                    <div className="kpi-sub">
                      <div>Qty: {s.qty != null ? roundQty(s.qty) : '—'}</div>
                      <div>Mfg: {s.mfg != null ? fmt(s.mfg) : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {monthlyProcKpis.length > 0 && (
        <>
          <p className="section">Production &amp; Logistics — This Month vs Prior Month</p>
          <div className="wkpi-grid">
            {monthlyProcKpis.map(k => (
              <div key={k.label} className="wkpi" style={{ '--wc': k.color }}>
                <div className="wkpi-label">{k.label}</div>
                <div className="wkpi-row">
                  <div>
                    <div className="wkpi-col-label">This Month</div>
                    <div className="wkpi-col-val">{fmt(k.c)}</div>
                  </div>
                  <div>
                    <div className="wkpi-col-label">Prior Month</div>
                    <div className="wkpi-col-val" style={{ color: 'var(--muted)' }}>{fmt(k.p)}</div>
                  </div>
                </div>
                {k.qtyC != null && k.qtyP != null && (
                  <div className="wkpi-row">
                    <div>
                      <div className="wkpi-col-label">Qty</div>
                      <div className="wkpi-col-val">{roundQty(k.qtyC)}</div>
                    </div>
                    <div>
                      <div className="wkpi-col-label">Qty</div>
                      <div className="wkpi-col-val" style={{ color: 'var(--muted)' }}>{roundQty(k.qtyP)}</div>
                    </div>
                  </div>
                )}
                {procBadge(k.c, k.p)}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Metric tiles */}
      <p className="section">Month-wise Snapshot</p>
      <div className="tile-grid">
        {/* ① Revenue */}
        <MetricTile color={P.purple} title="① Revenue & Growth">
          {monthly.map(m => {
            const w = pct100(m.total, maxOf('total'));
            const badge = m.mom_growth==null ? null : m.mom_growth>=0
              ? <span className="tile-badge badge-green">+{m.mom_growth}%</span>
              : <span className="tile-badge badge-red">{m.mom_growth}%</span>;
            return (
              <div key={m.month} className="tile-row">
                <span className="tile-month">{monthLabel(m.month)}</span>
                <div className="tile-bar-wrap"><div className="tile-bar" style={{ width:w+'%', background:P.purple }} /></div>
                <span className="tile-val">{fmt(m.total)}{badge}</span>
              </div>
            );
          })}
        </MetricTile>

        {/* ② Profitability */}
        <MetricTile color={P.green} title="② Profitability">
          {monthly.map(m => {
            const w   = pct100(m.profit, maxOf('profit'));
            const cls = m.margin>=35 ? 'badge-green' : 'badge-yellow';
            return (
              <div key={m.month} className="tile-row">
                <span className="tile-month">{monthLabel(m.month)}</span>
                <div className="tile-bar-wrap"><div className="tile-bar" style={{ width:w+'%', background:P.green }} /></div>
                <span className="tile-val">{fmt(m.profit)}<span className={`tile-badge ${cls}`}>{m.margin}%</span></span>
              </div>
            );
          })}
        </MetricTile>

        {/* ③ Mfg Cost */}
        <MetricTile color={P.red} title="③ Manufacturing Cost">
          {monthly.map(m => {
            const w = pct100(m.mfgcost, maxOf('mfgcost'));
            return (
              <div key={m.month} className="tile-row">
                <span className="tile-month">{monthLabel(m.month)}</span>
                <div className="tile-bar-wrap"><div className="tile-bar" style={{ width:w+'%', background:P.red }} /></div>
                <span className="tile-val">{fmt(m.mfgcost)}&nbsp;<span style={{ color:'var(--muted)', fontSize:'.7rem' }}>{m.cost_pct}%</span></span>
              </div>
            );
          })}
        </MetricTile>

        {/* ④ Sales Mix */}
        <MetricTile color={P.orange} title="④ Sales Mix">
          {monthly.map(m => (
            <div key={m.month} style={{ marginBottom:10 }}>
              <div style={{ fontSize:'.72rem', color:'var(--muted)', marginBottom:4 }}>{monthLabel(m.month)}</div>
              <div className="mix-bar">
                <div style={{ width:m.label_pct+'%',  background:P.purple }} title={`Label ${m.label_pct}%`} />
                <div style={{ width:m.roll_pct+'%',   background:P.teal }}   title={`Roll ${m.roll_pct}%`} />
                <div style={{ width:m.dsales_pct+'%', background:P.orange }} title={`Direct ${m.dsales_pct}%`} />
              </div>
            </div>
          ))}
          <div className="mix-legend">
            {[['Label',P.purple],['Roll',P.teal],['Direct',P.orange]].map(([l,c]) => (
              <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'.68rem', color:'var(--muted)' }}>
                <span className="mix-dot" style={{ background:c }} />{l}
              </span>
            ))}
          </div>
        </MetricTile>

        {/* ⑤ Inventory Flow */}
        <MetricTile color={P.blue} title="⑤ Inventory Flow">
          {monthly.map(m => {
            const mx  = Math.max(maxOf('inward'), maxOf('outward'), 1);
            const inP = pct100(m.inward, mx);
            const ouP = pct100(m.outward, mx);
            return (
              <div key={m.month} style={{ marginBottom:10 }}>
                <div style={{ fontSize:'.72rem', color:'var(--muted)', marginBottom:4 }}>{monthLabel(m.month)}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, fontSize:'.7rem' }}>
                  <span style={{ width:30, color:'var(--muted)' }}>In</span>
                  <div className="tile-bar-wrap" style={{ flex:1 }}><div className="tile-bar" style={{ width:inP+'%', background:P.blue }} /></div>
                  <span className="tile-val" style={{ width:72 }}>{fmt(m.inward)}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'.7rem' }}>
                  <span style={{ width:30, color:'var(--muted)' }}>Out</span>
                  <div className="tile-bar-wrap" style={{ flex:1 }}><div className="tile-bar" style={{ width:ouP+'%', background:P.red }} /></div>
                  <span className="tile-val" style={{ width:72 }}>{fmt(m.outward)}</span>
                </div>
              </div>
            );
          })}
        </MetricTile>

        {/* ⑥ Wastage */}
        <MetricTile color={P.yellow} title="⑥ Wastage">
          {monthly.map(m => {
            const w = pct100(m.wastage, maxOf('wastage'));
            return (
              <div key={m.month} className="tile-row">
                <span className="tile-month">{monthLabel(m.month)}</span>
                <div className="tile-bar-wrap"><div className="tile-bar" style={{ width:w+'%', background:P.yellow }} /></div>
                <span className="tile-val">{fmt(m.wastage)}&nbsp;<span style={{ color:'var(--muted)', fontSize:'.7rem' }}>{m.wastage_pct}%</span></span>
              </div>
            );
          })}
        </MetricTile>
      </div>

      {/* Charts */}
      <p className="section">Revenue &amp; Profitability</p>
      <div className="charts-2">
        <div className="card"><div className="card-title">Monthly Revenue</div><div className="chart-wrap-sm"><Bar data={m1} options={moneyOpts} /></div></div>
        <div className="card"><div className="card-title">Monthly Profit</div><div className="chart-wrap-sm"><Bar data={m2} options={moneyOpts} /></div></div>
      </div>
      <div className="charts-2">
        <div className="card"><div className="card-title">Profit Margin %</div><div className="chart-wrap-sm"><Bar data={m3} options={pctOpts} /></div></div>
        <div className="card"><div className="card-title">MoM Revenue Growth %</div><div className="chart-wrap-sm"><Line data={m6} options={pctOpts} /></div></div>
      </div>

      <p className="section">Sales Mix &amp; Inventory</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Sales Mix %</div>
          <div className="chart-wrap-sm">
            <Bar data={m4} options={{ ...pctOpts, scales:{ x:{ stacked:true, grid:GRID, ticks:TICK }, y:{ stacked:true, grid:GRID, ticks:{ ...TICK, callback:yPct }, max:100 } } }} />
          </div>
        </div>
        <div className="card"><div className="card-title">Inventory Flow</div><div className="chart-wrap-sm"><Bar data={m5} options={moneyOpts} /></div></div>
      </div>

      <p className="section">Wastage &amp; Efficiency</p>
      <div className="charts-2">
        <div className="card"><div className="card-title">Monthly Wastage (₹)</div><div className="chart-wrap-sm"><Bar data={m7} options={moneyOpts} /></div></div>
        <div className="card"><div className="card-title">Wastage as % of Revenue</div><div className="chart-wrap-sm"><Bar data={m8} options={pctOpts} /></div></div>
      </div>
    </div>
  );
}
