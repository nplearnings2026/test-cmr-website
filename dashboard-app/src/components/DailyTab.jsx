import React from 'react';
import { fmt } from '../utils/format';

function getISO(offsetDays = 0) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function DailyTab({ summary, daily }) {
  const todayISO = getISO(0);
  const yesterdayISO = getISO(-1);
  const todayDay = (daily && daily.length) ? daily.find(r => r.date === todayISO) : null;
  const yesterdayDay = (daily && daily.length) ? daily.find(r => r.date === yesterdayISO) : null;

  const dayMetrics = [
    {
      key: 'Today',
      amount: todayDay ? todayDay.total_sales : null,
      details: [
        { label: 'Date', value: todayDay ? todayDay.date : todayISO },
        { label: 'Sales', value: todayDay ? fmt(todayDay.total_sales) : null },
        { label: 'Inward', value: todayDay ? fmt(todayDay.inward) : null },
        { label: 'Outward', value: todayDay ? fmt(todayDay.outward) : null },
      ],
    },
    {
      key: 'Yesterday',
      amount: yesterdayDay ? yesterdayDay.total_sales : null,
      details: [
        { label: 'Date', value: yesterdayDay ? yesterdayDay.date : yesterdayISO },
        { label: 'Sales', value: yesterdayDay ? fmt(yesterdayDay.total_sales) : null },
        { label: 'Inward', value: yesterdayDay ? fmt(yesterdayDay.inward) : null },
        { label: 'Outward', value: yesterdayDay ? fmt(yesterdayDay.outward) : null },
      ],
    },
  ];

  const procMetrics = [
    { key: 'Daily',      amount: latestDay ? latestDay.total_sales : null, details: [{ label: 'Date', value: latestDay ? latestDay.date : null }] },
    { key: 'Inward',     amount: summary.total_inward,  details: [
        { label: 'Qty',    value: summary.total_inward_qty || summary.inward_qty || null },
        { label: 'Amount', value: summary.total_inward }
      ] },
    { key: 'Outward',    amount: summary.total_outward, details: [
        { label: 'Qty',    value: summary.total_outward_qty || summary.outward_qty || null },
        { label: 'Amount', value: summary.total_outward }
      ] },
    { key: 'Gumming',    amount: summary.total_gumming, details: [{ label: 'Rolls', value: summary.gm_rolls }, { label: 'Qty', value: summary.gm_qty }, { label: 'Amount', value: summary.total_gumming }] },
    { key: 'Slitting',   amount: summary.total_slitting, details: [{ label: 'Rolls', value: summary.sl_rolls }, { label: 'Qty', value: summary.sl_qty }, { label: 'Amount', value: summary.total_slitting }] },
    { key: 'Color',      amount: summary.total_color,    details: [{ label: 'Rolls', value: summary.cl_rolls }, { label: 'Qty', value: summary.cl_qty }, { label: 'Wastage', value: summary.cl_waste }, { label: 'Amount', value: summary.total_color }] },
    { key: 'Die Punch',  amount: summary.total_diepunch, details: [{ label: 'Qty', value: summary.dp_qty }, { label: 'Amount', value: summary.total_diepunch }] },
    { key: 'Ready Roll', amount: summary.total_readyroll,details: [{ label: 'Rolls', value: summary.rr_rolls }, { label: 'Pieces', value: summary.rr_pcs }, { label: 'Amount', value: summary.total_readyroll }] },
  ];

  return (
    <div>
      <p className="section">Daily &amp; Production Totals</p>
      <div className="proc-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 }}>
        {dayMetrics.map(m => (
          <div key={m.key} className="proc-tile card" style={{ padding:12 }}>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{m.key}</div>
            <div style={{ fontSize:18, fontWeight:600, marginTop:6 }}>{m.amount != null ? fmt(m.amount) : '—'}</div>
            {m.details && m.details.length > 0 && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--muted)', display:'grid', gap:4 }}>
                {m.details.map((d, i) => (
                  d.value != null && <div key={i}><strong style={{ color:'var(--text)' }}>{d.label}:</strong> <span style={{ marginLeft:6 }}>{d.value}</span></div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
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
