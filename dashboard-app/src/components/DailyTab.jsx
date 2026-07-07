import React from 'react';
import { fmt } from '../utils/format';

export default function DailyTab({ summary, daily, rawDaily }) {
  const sourceDaily = (rawDaily && rawDaily.length) ? rawDaily : daily;
  const sortedDaily = sourceDaily ? [...sourceDaily].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const latestDay = sortedDaily.length ? sortedDaily[sortedDaily.length - 1] : null;
  const yesterdayDay = sortedDaily.length > 1 ? sortedDaily[sortedDaily.length - 2] : null;
  const prevForYesterday = sortedDaily.length > 2 ? sortedDaily[sortedDaily.length - 3] : null;

  const pctChange = (curr, prev) => {
    if (prev == null || prev === 0) return null;
    return (curr - prev) / prev * 100;
  };
  // Use latest available daily record values for these tiles (no aggregation) from the full daily dataset
  const procMetrics = [
    { key: 'Daily',      amount: latestDay ? latestDay.total_sales : null, details: [
        { label: 'Label', value: latestDay ? latestDay.label_sales : null },
        { label: 'Sheet', value: latestDay ? latestDay.sheet_sales : null },
        { label: 'Rolls', value: latestDay ? latestDay.roll_sales : null }
      ] },
    { key: 'Inward',     amount: latestDay ? latestDay.inward : null, details: [
        { label: 'Qty',    value: latestDay ? latestDay.inward_qty : null },
        { label: 'Amount', value: latestDay ? latestDay.inward : null }
      ] },
    { key: 'Outward',    amount: latestDay ? latestDay.outward : null, details: [
        { label: 'Qty',    value: latestDay ? latestDay.outward_qty : null },
        { label: 'Amount', value: latestDay ? latestDay.outward : null }
      ] },
    { key: 'Gumming',    amount: latestDay ? latestDay.gumming : null, details: [{ label: 'Rolls', value: latestDay ? latestDay.gm_rolls : null }, { label: 'Qty', value: latestDay ? latestDay.gm_qty : null }, { label: 'Amount', value: latestDay ? latestDay.gumming : null }] },
    { key: 'Slitting',   amount: latestDay ? latestDay.slitting : null, details: [{ label: 'Rolls', value: latestDay ? latestDay.sl_rolls : null }, { label: 'Qty', value: latestDay ? latestDay.sl_qty : null }, { label: 'Amount', value: latestDay ? latestDay.slitting : null }] },
    { key: 'Color',      amount: latestDay ? latestDay.color : null,    details: [{ label: 'Rolls', value: latestDay ? latestDay.cl_rolls : null }, { label: 'Qty', value: latestDay ? latestDay.cl_qty : null }, { label: 'Wastage', value: latestDay ? latestDay.cl_waste : null }, { label: 'Amount', value: latestDay ? latestDay.color : null }] },
    { key: 'Die Punch',  amount: latestDay ? latestDay.diepunch : null, details: [{ label: 'Qty', value: latestDay ? latestDay.dp_qty : null }, { label: 'Amount', value: latestDay ? latestDay.diepunch : null }] },
    { key: 'Ready Roll', amount: latestDay ? latestDay.readyroll : null,details: [{ label: 'Rolls', value: latestDay ? latestDay.rr_rolls : null }, { label: 'Pieces', value: latestDay ? latestDay.rr_pcs : null }, { label: 'Amount', value: latestDay ? latestDay.readyroll : null }] },
  ];

  // Yesterday is the prior available record in the full daily series
  const greyKeys = new Set(['Inward', 'Outward', 'Gumming', 'Slitting', 'Color', 'Die Punch', 'Ready Roll']);

  const yesterdayMetrics = [
    { key: 'Daily',      amount: yesterdayDay ? yesterdayDay.total_sales : null, details: [
        { label: 'Label', value: yesterdayDay ? yesterdayDay.label_sales : null },
        { label: 'Sheet', value: yesterdayDay ? yesterdayDay.sheet_sales : null },
        { label: 'Rolls', value: yesterdayDay ? yesterdayDay.roll_sales : null }
      ] },
    { key: 'Inward',     amount: yesterdayDay ? yesterdayDay.inward : null, details: [{ label: 'Qty', value: yesterdayDay ? yesterdayDay.inward_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.inward : null }] },
    { key: 'Outward',    amount: yesterdayDay ? yesterdayDay.outward : null, details: [{ label: 'Qty', value: yesterdayDay ? yesterdayDay.outward_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.outward : null }] },
    { key: 'Gumming',    amount: yesterdayDay ? yesterdayDay.gumming : null, details: [{ label: 'Rolls', value: yesterdayDay ? yesterdayDay.gm_rolls : null }, { label: 'Qty', value: yesterdayDay ? yesterdayDay.gm_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.gumming : null }] },
    { key: 'Slitting',   amount: yesterdayDay ? yesterdayDay.slitting : null, details: [{ label: 'Rolls', value: yesterdayDay ? yesterdayDay.sl_rolls : null }, { label: 'Qty', value: yesterdayDay ? yesterdayDay.sl_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.slitting : null }] },
    { key: 'Color',      amount: yesterdayDay ? yesterdayDay.color : null, details: [{ label: 'Rolls', value: yesterdayDay ? yesterdayDay.cl_rolls : null }, { label: 'Qty', value: yesterdayDay ? yesterdayDay.cl_qty : null }, { label: 'Wastage', value: yesterdayDay ? yesterdayDay.cl_waste : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.color : null }] },
    { key: 'Die Punch',  amount: yesterdayDay ? yesterdayDay.diepunch : null, details: [{ label: 'Qty', value: yesterdayDay ? yesterdayDay.dp_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.diepunch : null }] },
    { key: 'Ready Roll', amount: yesterdayDay ? yesterdayDay.readyroll : null, details: [{ label: 'Rolls', value: yesterdayDay ? yesterdayDay.rr_rolls : null }, { label: 'Pieces', value: yesterdayDay ? yesterdayDay.rr_pcs : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.readyroll : null }] },
  ];

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
      <div className="charts-2">
        <div>

          {todaySalesBreak.length > 0 && (
            <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:16 }}>
              {todaySalesBreak.map(s => (
                <div key={s.k} className="kpi sales-green" style={{ '--kc':'#22c55e' }}>
                  <div className="kpi-label">{s.k}{(s.k === 'Label' || s.k === 'Rolls' || s.k === 'Direct Sales')}</div>
                  <div className="kpi-value">
                    {s.amount != null ? fmt(s.amount) : '—'}
                    {(() => {
                      const prev = yesterdayDay ? (s.k === 'Label Sales' ? yesterdayDay.label_sales : s.k === 'Direct Sales' ? yesterdayDay.dsales : yesterdayDay.roll_sales) : null;
                      if (prev == null) return null;
                      if (prev === 0 && s.amount > 0) return <span className={`kpi-badge bg`}>New</span>;
                      const p = pctChange(s.amount, prev);
                      if (p == null) return null;
                      const cls = p > 0 ? 'bg' : p < 0 ? 'rb' : '';
                      return <span className={`kpi-badge ${cls}`}>{p>0?'+':''}{p.toFixed(1)}%</span>;
                    })()}
                  </div>
                  <div className="kpi-sub">
                    {/* Added Trend Indicator Here */}
                    <div>
                        Qty: {s.qty != null ? s.qty : '—'}
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
                </div>
              ))}
            </div>
          )}

          <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(4,minmax(0,1fr))' }}>
            {procMetrics.map(m => (
              <div key={m.key} className="kpi" style={{ '--kc': greyKeys.has(m.key) ? '#8892a4' : '#22c55e' }}>
                <div className="kpi-label">{m.key}</div>
                <div className="kpi-value">{m.amount != null ? fmt(m.amount) : '—'}</div>
                    {m.details && m.details.length > 0 && (
                      <div className="kpi-sub">
                        {m.details.map((d, i) => (
                          d.value != null && <div key={i}><strong>{d.label}:</strong> <span>{typeof d.value === 'number' ? (d.label.toLowerCase().includes('amount') ? fmt(d.value) : d.value) : d.value}</span></div>
                        ))}
                      </div>
                    )}
                    {/* Removed percent-change badge for main Daily KPI (today) */}
              </div>
            ))}
          </div>
        </div>

        <div>

          {yesterdaySalesBreak.length > 0 && (
            <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:16 }}>
              {yesterdaySalesBreak.map(s => (
                    <div key={s.k} className="kpi sales-yellow" style={{ '--kc':'#f59e0b' }}>
                      <div className="kpi-label">{s.k}{(s.k === 'Label Sales' || s.k === 'Rolls Sales' || s.k === 'Direct Sales')}</div>
                      <div className="kpi-value">{s.amount != null ? fmt(s.amount) : '—'}</div>
                      <div className="kpi-sub">
                        <div>Qty: {s.qty != null ? s.qty : '—'}</div>
                        <div>Mfg: {s.mfg != null ? fmt(s.mfg) : '—'}</div>
                      </div>
                    </div>
                  ))}
            </div>
          )}

          <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(4,minmax(0,1fr))' }}>
            {yesterdayMetrics.map(m => (
              <div key={m.key} className="kpi" style={{ '--kc': greyKeys.has(m.key) ? '#8892a4' : '#f59e0b' }}>
                <div className="kpi-label">{m.key}</div>
                <div className="kpi-value">{m.amount != null ? fmt(m.amount) : '—'}</div>
                {m.details && m.details.length > 0 && (
                  <div className="kpi-sub">
                    {m.details.map((d, i) => (
                      d.value != null && <div key={i}><strong>{d.label}:</strong> <span>{typeof d.value === 'number' ? (d.label.toLowerCase().includes('amount') ? fmt(d.value) : d.value) : d.value}</span></div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
