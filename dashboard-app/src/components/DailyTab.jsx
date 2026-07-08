import React from 'react';
import { fmt, P } from '../utils/format';

const pct = (n, d) => d > 0 ? (n / d * 100).toFixed(1) + '%' : '—';
const roundQty = v => v == null ? v : Math.round(v);
// invert = true for metrics where a decrease is the improvement (cost, wastage)
const deltaFor = (curr, prev, invert = false) => {
  if (prev == null || prev === 0) return null;
  const p = (curr - prev) / prev * 100;
  return { pct: p, positive: invert ? p <= 0 : p >= 0 };
};
// KPI top accent bar reflects the metric's trend: green if improving, red if
// worsening, neutral gray when there's no prior period to compare against.
const colorForDelta = delta => !delta ? '#8892a4' : delta.positive ? P.green : P.red;

function KpiCard({ label, value, sub, color, delta }) {
  return (
    <div className="kpi" style={{ '--kc': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {delta && (
        <span className={`kpi-badge ${delta.positive ? 'bg' : 'rb'}`}>
          {delta.pct > 0 ? '▲' : delta.pct < 0 ? '▼' : '→'} {Math.abs(delta.pct).toFixed(1)}% vs yesterday
        </span>
      )}
    </div>
  );
}

export default function DailyTab({ summary, daily, rawDaily }) {
  const sourceDaily = (rawDaily && rawDaily.length) ? rawDaily : daily;
  const sortedDaily = sourceDaily ? [...sourceDaily].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const latestDay = sortedDaily.length ? sortedDaily[sortedDaily.length - 1] : null;
  const yesterdayDay = sortedDaily.length > 1 ? sortedDaily[sortedDaily.length - 2] : null;
  const prevForYesterday = sortedDaily.length > 2 ? sortedDaily[sortedDaily.length - 3] : null;

  // Production & logistics — one tile per category, Today vs Yesterday side by side
  // (mirrors WeeklyTab's wkpi-grid Current/Prev Week tiles)
  const dailyProcKpis = [
    { label: 'Material Inward',  color: '#8892a4', c: latestDay?.inward    || 0, p: yesterdayDay?.inward    || 0, qtyC: latestDay?.inward_qty  ?? null, qtyP: yesterdayDay?.inward_qty  ?? null },
    { label: 'Material Outward', color: '#8892a4', c: latestDay?.outward   || 0, p: yesterdayDay?.outward   || 0, qtyC: latestDay?.outward_qty ?? null, qtyP: yesterdayDay?.outward_qty ?? null },
    { label: 'Gumming',          color: '#8892a4', c: latestDay?.gumming   || 0, p: yesterdayDay?.gumming   || 0, qtyC: latestDay?.gm_qty      ?? null, qtyP: yesterdayDay?.gm_qty      ?? null },
    { label: 'Slitting',         color: '#8892a4', c: latestDay?.slitting  || 0, p: yesterdayDay?.slitting  || 0, qtyC: latestDay?.sl_qty      ?? null, qtyP: yesterdayDay?.sl_qty      ?? null },
    { label: 'Color',            color: '#8892a4', c: latestDay?.color     || 0, p: yesterdayDay?.color     || 0, qtyC: latestDay?.cl_qty      ?? null, qtyP: yesterdayDay?.cl_qty      ?? null },
    { label: 'Die Punch',        color: '#8892a4', c: latestDay?.diepunch  || 0, p: yesterdayDay?.diepunch  || 0, qtyC: latestDay?.dp_qty      ?? null, qtyP: yesterdayDay?.dp_qty      ?? null },
    { label: 'Ready Roll',       color: '#8892a4', c: latestDay?.readyroll || 0, p: yesterdayDay?.readyroll || 0, qtyC: latestDay?.rr_pcs      ?? null, qtyP: yesterdayDay?.rr_pcs      ?? null },
    { label: 'Wastage',          color: P.yellow,  c: latestDay?.wastage   || 0, p: yesterdayDay?.wastage   || 0 },
  ];

  function procBadge(c, p) {
    if (!p) return null;
    const change = (c - p) / p * 100;
    const cls = change > 0 ? 'wc-up' : change < 0 ? 'wc-dn' : 'wc-flat';
    return <span className={`wkpi-change ${cls}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}% vs yesterday</span>;
  }

  const yesterdaySalesBreak = yesterdayDay ? [
    { k: 'Label Sales', amount: yesterdayDay.label_sales, qty: yesterdayDay.label_qty, mfg: yesterdayDay.label_mfgcost },
    { k: 'Direct Sales', amount: yesterdayDay.dsales, qty: yesterdayDay.dsales_qty, mfg: yesterdayDay.dsales_mfgcost },
    { k: 'Rolls Sales', amount: yesterdayDay.roll_sales,  qty: yesterdayDay.roll_qty,  mfg: yesterdayDay.roll_mfgcost },
  ] : [];

  const todaySalesBreak = latestDay ? [
    { k: 'Label Sales', amount: latestDay.label_sales, qty: latestDay.label_qty, mfg: latestDay.label_mfgcost },
    { k: 'Direct Sales', amount: latestDay.dsales, qty: latestDay.dsales_qty, mfg: latestDay.dsales_mfgcost },
    { k: 'Rolls Sales', amount: latestDay.roll_sales,  qty: latestDay.roll_qty,  mfg: latestDay.roll_mfgcost },
  ] : [];

  const revDelta    = latestDay ? deltaFor(latestDay.total_sales, yesterdayDay?.total_sales) : null;
  const profitDelta = latestDay ? deltaFor(latestDay.profit, yesterdayDay?.profit) : null;
  const costDelta   = latestDay ? deltaFor(latestDay.mfgcost, yesterdayDay?.mfgcost, true) : null;
  const wastageDelta= latestDay ? deltaFor(latestDay.wastage, yesterdayDay?.wastage, true) : null;
  const colorWasteDelta = latestDay ? deltaFor(latestDay.cl_waste, yesterdayDay?.cl_waste, true) : null;
  const rrWasteDelta    = latestDay ? deltaFor(latestDay.rr_waste, yesterdayDay?.rr_waste, true) : null;

  const execKpis = latestDay ? [
    { label: 'Total Revenue', value: fmt(latestDay.total_sales), sub: latestDay.date, color: colorForDelta(revDelta),
      delta: revDelta },
    { label: 'Total Profit',  value: fmt(latestDay.profit), sub: `${latestDay.margin}% margin`, color: colorForDelta(profitDelta),
      delta: profitDelta },
    { label: 'Mfg Cost',      value: fmt(latestDay.mfgcost), sub: pct(latestDay.mfgcost, latestDay.total_sales) + ' of revenue', color: colorForDelta(costDelta),
      delta: costDelta },
    { label: 'Total Wastage', value: fmt(latestDay.wastage), sub: pct(latestDay.wastage, latestDay.total_sales) + ' of revenue', color: colorForDelta(wastageDelta),
      delta: wastageDelta },
    { label: 'Color Waste',      value: fmt(latestDay.cl_waste), sub: pct(latestDay.cl_waste, latestDay.wastage) + ' of wastage', color: colorForDelta(colorWasteDelta),
      delta: colorWasteDelta },
    { label: 'Ready Roll Waste', value: fmt(latestDay.rr_waste), sub: pct(latestDay.rr_waste, latestDay.wastage) + ' of wastage', color: colorForDelta(rrWasteDelta),
      delta: rrWasteDelta },
  ] : [];

  return (
    <div>
      <div className="weekly-header">
        <div className="week-badge week-badge-curr">
          <div className="week-badge-label">Today — Daily &amp; Production</div>
          <div className="week-badge-dates">{latestDay ? latestDay.date : ''}</div>
        </div>
        <div className="week-badge week-badge-prev">
          <div className="week-badge-label">Yesterday — Daily &amp; Production</div>
          <div className="week-badge-dates">{yesterdayDay ? yesterdayDay.date : ''}</div>
        </div>
      </div>

      {execKpis.length > 0 && (
        <>
          <p className="section">Executive Summary</p>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))' }}>
            {execKpis.map(k => <KpiCard key={k.label} {...k} />)}
          </div>
        </>
      )}

      <div className="charts-2">
        <div>

          {todaySalesBreak.length > 0 && (
            <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:16 }}>
              {todaySalesBreak.map(s => (
                <div key={s.k} className="kpi sales-today" style={{ '--kc':P.blue }}>
                  <div className="kpi-label">{s.k}{(s.k === 'Label' || s.k === 'Rolls' || s.k === 'Direct Sales')}</div>
                  <div className="kpi-value">{s.amount != null ? fmt(s.amount) : '—'}</div>
                  <div className="kpi-sub">
                    {/* Added Trend Indicator Here */}
                    <div>
                        Qty: {s.qty != null ? roundQty(s.qty) : '—'}
                        {(s.k === 'Label Sales' || s.k === 'Rolls Sales' || s.k === 'Direct Sales') && (() => {
                            const prevQty = yesterdayDay ? (s.k === 'Label Sales' ? yesterdayDay.label_qty : s.k === 'Direct Sales' ? yesterdayDay.dsales_qty : yesterdayDay.roll_qty) : null;
                            if (prevQty == null || s.qty == null) return <span style={{ marginLeft: 6 }}>—</span>;

                            let indicator = '';
                            if (s.qty > prevQty) {
                                indicator = <span style={{ color:'var(--success)', marginRight: 4}}>▲</span>; // Using 'success' class for visual consistency, though general style is used above
                            } else if (s.qty < prevQty) {
                                indicator = <span style={{ color:'var(--danger)', marginRight: 4}}>▼</span>;
                            } else {
                                indicator = <span style={{ color:'var(--secondary)', marginLeft: 6 }}>→</span>;
                            }
                            return indicator;
                        })()}
                    </div>
                    <div>Mfg: {s.mfg != null ? fmt(s.mfg) : '—'}</div>
                  </div>
                  {(() => {
                    const prev = yesterdayDay ? (s.k === 'Label Sales' ? yesterdayDay.label_sales : s.k === 'Direct Sales' ? yesterdayDay.dsales : yesterdayDay.roll_sales) : null;
                    if (prev == null) return null;
                    if (prev === 0 && s.amount > 0) return <span className="kpi-badge bg">New</span>;
                    const d = deltaFor(s.amount, prev);
                    if (!d) return null;
                    return (
                      <span className={`kpi-badge ${d.positive ? 'bg' : 'rb'}`}>
                        {d.pct > 0 ? '▲' : d.pct < 0 ? '▼' : '→'} {Math.abs(d.pct).toFixed(1)}% vs yesterday
                      </span>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>

          {yesterdaySalesBreak.length > 0 && (
            <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:16 }}>
              {yesterdaySalesBreak.map(s => (
                    <div key={s.k} className="kpi sales-yesterday" style={{ '--kc':P.yellow }}>
                      <div className="kpi-label">{s.k}{(s.k === 'Label Sales' || s.k === 'Rolls Sales' || s.k === 'Direct Sales')}</div>
                      <div className="kpi-value">{s.amount != null ? fmt(s.amount) : '—'}</div>
                      <div className="kpi-sub">
                        <div>Qty: {s.qty != null ? roundQty(s.qty) : '—'}</div>
                        <div>Mfg: {s.mfg != null ? fmt(s.mfg) : '—'}</div>
                      </div>
                    </div>
                  ))}
            </div>
          )}
        </div>
      </div>

      <p className="section">Production &amp; Logistics — Today vs Yesterday</p>
      <div className="wkpi-grid">
        {dailyProcKpis.map(k => (
          <div key={k.label} className="wkpi" style={{ '--wc': k.color }}>
            <div className="wkpi-label">{k.label}</div>
            <div className="wkpi-row">
              <div>
                <div className="wkpi-col-label">Today</div>
                <div className="wkpi-col-val">{fmt(k.c)}</div>
              </div>
              <div>
                <div className="wkpi-col-label">Yesterday</div>
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
    </div>
  );
}
