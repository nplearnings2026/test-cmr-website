import React from 'react';
import { fmt } from '../utils/format';

export default function DailyTab({ summary, daily }) {
  const latestDay = (daily && daily.length) ? daily[daily.length - 1] : null;
  // Use latest available daily record values for these tiles (no aggregation)
  const procMetrics = [
    { key: 'Daily',      amount: latestDay ? latestDay.total_sales : null, details: [{ label: 'Date', value: latestDay ? latestDay.date : null }] },
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

  // Yesterday's per-metric values (from processed daily record)
  const yesterdayISO = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
  const yesterdayDay = (daily && daily.length) ? daily.find(r => r.date === yesterdayISO) : null;
  const yesterdayMetrics = [
    { key: 'Daily',      amount: yesterdayDay ? yesterdayDay.total_sales : null, details: [{ label: 'Date', value: yesterdayDay ? yesterdayDay.date : yesterdayISO }] },
    { key: 'Inward',     amount: yesterdayDay ? yesterdayDay.inward : null, details: [{ label: 'Qty', value: yesterdayDay ? yesterdayDay.inward_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.inward : null }] },
    { key: 'Outward',    amount: yesterdayDay ? yesterdayDay.outward : null, details: [{ label: 'Qty', value: yesterdayDay ? yesterdayDay.outward_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.outward : null }] },
    { key: 'Gumming',    amount: yesterdayDay ? yesterdayDay.gumming : null, details: [{ label: 'Rolls', value: yesterdayDay ? yesterdayDay.gm_rolls : null }, { label: 'Qty', value: yesterdayDay ? yesterdayDay.gm_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.gumming : null }] },
    { key: 'Slitting',   amount: yesterdayDay ? yesterdayDay.slitting : null, details: [{ label: 'Rolls', value: yesterdayDay ? yesterdayDay.sl_rolls : null }, { label: 'Qty', value: yesterdayDay ? yesterdayDay.sl_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.slitting : null }] },
    { key: 'Color',      amount: yesterdayDay ? yesterdayDay.color : null, details: [{ label: 'Rolls', value: yesterdayDay ? yesterdayDay.cl_rolls : null }, { label: 'Qty', value: yesterdayDay ? yesterdayDay.cl_qty : null }, { label: 'Wastage', value: yesterdayDay ? yesterdayDay.cl_waste : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.color : null }] },
    { key: 'Die Punch',  amount: yesterdayDay ? yesterdayDay.diepunch : null, details: [{ label: 'Qty', value: yesterdayDay ? yesterdayDay.dp_qty : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.diepunch : null }] },
    { key: 'Ready Roll', amount: yesterdayDay ? yesterdayDay.readyroll : null, details: [{ label: 'Rolls', value: yesterdayDay ? yesterdayDay.rr_rolls : null }, { label: 'Pieces', value: yesterdayDay ? yesterdayDay.rr_pcs : null }, { label: 'Amount', value: yesterdayDay ? yesterdayDay.readyroll : null }] },
  ];

  return (
    <div>
      <p className="section">Yesterday — Daily &amp; Production</p>
      <div className="proc-grid" style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:12, marginBottom:16 }}>
        {yesterdayMetrics.map(m => (
          <div key={m.key} className="proc-tile card" style={{ padding:12 }}>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{m.key}</div>
            <div style={{ fontSize:18, fontWeight:600, marginTop:6 }}>{m.amount != null ? fmt(m.amount) : '—'}</div>
            {m.details && m.details.length > 0 && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--muted)', display:'grid', gap:4 }}>
                {m.details.map((d, i) => (
                  d.value != null && <div key={i}><strong style={{ color:'var(--text)' }}>{d.label}:</strong> <span style={{ marginLeft:6 }}>{typeof d.value === 'number' ? (d.label.toLowerCase().includes('amount') ? fmt(d.value) : d.value) : d.value}</span></div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="section">Totals — Aggregate</p>
      <div className="proc-grid" style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:12, marginBottom:16 }}>
        {procMetrics.map(m => (
          <div key={m.key} className="proc-tile card" style={{ padding:12 }}>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{m.key}</div>
            <div style={{ fontSize:18, fontWeight:600, marginTop:6 }}>{m.amount != null ? fmt(m.amount) : '—'}</div>
            {m.details && m.details.length > 0 && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--muted)', display:'grid', gap:4 }}>
                {m.details.map((d, i) => (
                  d.value != null && <div key={i}><strong style={{ color:'var(--text)' }}>{d.label}:</strong> <span style={{ marginLeft:6 }}>{typeof d.value === 'number' ? (d.label.toLowerCase().includes('amount') ? fmt(d.value) : d.value) : d.value}</span></div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
