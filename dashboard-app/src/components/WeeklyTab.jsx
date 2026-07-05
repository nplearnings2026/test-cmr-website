import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { fmt, P, getChartTheme } from '../utils/format';

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function isoDate(d) { return d.toISOString().slice(0,10); }
function fmtRange(mon) {
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const o = { month:'short', day:'numeric' };
  return mon.toLocaleDateString('en-IN',o) + ' – ' + sun.toLocaleDateString('en-IN',o);
}

export default function WeeklyTab({ daily, theme }) {
  const { GRID, TICK, LEG, BASE_TIP } = getChartTheme(theme);
  const { currMon, prevMon, currWeek, prevWeek } = useMemo(() => {
    const latest = daily.reduce((m,r) => r.date > m ? r.date : m, '');
    const ld = new Date(latest + 'T00:00:00');
    const fromMon = ld.getDay()===0 ? 6 : ld.getDay()-1;
    const currMon = new Date(ld); currMon.setDate(ld.getDate()-fromMon);
    const prevMon = new Date(currMon); prevMon.setDate(currMon.getDate()-7);

    const lk = {};
    daily.forEach(r => { lk[r.date] = r; });

    function slice(mon) {
      return Array.from({length:7}, (_,i) => {
        const d = new Date(mon); d.setDate(mon.getDate()+i);
        const r = lk[isoDate(d)] || {};
        return { 
          day:DAY_NAMES[i], 
          sales:r.total_sales||0, 
          inward:r.inward||0, 
          outward:r.outward||0, 
          wastage:r.wastage||0,
          gumming:r.gumming||0,
          slitting:r.slitting||0,
          color:r.color||0,
          diepunch:r.diepunch||0,
          readyroll:r.readyroll||0,
          inward_qty:r.inward_qty||0,
          outward_qty:r.outward_qty||0,
          gm_qty:r.gm_qty||0,
          sl_qty:r.sl_qty||0,
          cl_qty:r.cl_qty||0,
          dp_qty:r.dp_qty||0,
          rr_pcs:r.rr_pcs||0,
          label_sales: r.label_sales || 0,
          dsales: r.dsales || 0,
          roll_sales: r.roll_sales || 0,
          label_qty: r.label_qty || 0,
          dsales_qty: r.dsales_qty || 0,
          roll_qty: r.roll_qty || 0,
          label_mfgcost: r.label_mfgcost || 0,
          dsales_mfgcost: r.dsales_mfgcost || 0,
          roll_mfgcost: r.roll_mfgcost || 0,
        };
      });
    }
    return { currMon, prevMon, currWeek:slice(currMon), prevWeek:slice(prevMon) };
  }, [daily]);

  const tot = (w,k) => w.reduce((s,d) => s+d[k], 0);
  const kpis = [
    { label:'Material Inward',  color:'#8892a4', c:tot(currWeek,'inward'),   p:tot(prevWeek,'inward'),   qtyC: tot(currWeek,'inward_qty'),   qtyP: tot(prevWeek,'inward_qty')   },
    { label:'Material Outward', color:'#8892a4', c:tot(currWeek,'outward'),  p:tot(prevWeek,'outward'),  qtyC: tot(currWeek,'outward_qty'),  qtyP: tot(prevWeek,'outward_qty')  },    
    { label:'Gumming',          color:'#8892a4', c:tot(currWeek,'gumming'),  p:tot(prevWeek,'gumming'),  qtyC: tot(currWeek,'gm_qty'),       qtyP: tot(prevWeek,'gm_qty')       },
    { label:'Slitting',         color:'#8892a4', c:tot(currWeek,'slitting'), p:tot(prevWeek,'slitting'), qtyC: tot(currWeek,'sl_qty'),      qtyP: tot(prevWeek,'sl_qty')      },
    { label:'Color',            color:'#8892a4', c:tot(currWeek,'color'),    p:tot(prevWeek,'color'),    qtyC: tot(currWeek,'cl_qty'),      qtyP: tot(prevWeek,'cl_qty')      },
    { label:'Die Punch',        color:'#8892a4', c:tot(currWeek,'diepunch'), p:tot(prevWeek,'diepunch'), qtyC: tot(currWeek,'dp_qty'),      qtyP: tot(prevWeek,'dp_qty')      },
    { label:'Ready Roll',       color:'#8892a4', c:tot(currWeek,'readyroll'),p:tot(prevWeek,'readyroll'),qtyC: tot(currWeek,'rr_pcs'),      qtyP: tot(prevWeek,'rr_pcs')      },
    { label:'Wastage',          color:P.yellow,  c:tot(currWeek,'wastage'),  p:tot(prevWeek,'wastage')  },
  ];

  function badge(c,p) {
    if (!p) return null;
    const pct = (c-p)/p*100;
    const cls = pct>0 ? 'wc-up' : pct<0 ? 'wc-dn' : 'wc-flat';
    return <span className={`wkpi-change ${cls}`}>{pct>0?'+':''}{pct.toFixed(1)}% vs prev week</span>;
  }

  // Compute aggregated sales breakdowns for the week
  const currSalesBreak = [
    { k: 'Label Sales', amount: tot(currWeek, 'label_sales'), qty: tot(currWeek, 'label_qty'), mfg: tot(currWeek, 'label_mfgcost') },
    { k: 'Direct Sales', amount: tot(currWeek, 'dsales'), qty: tot(currWeek, 'dsales_qty'), mfg: tot(currWeek, 'dsales_mfgcost') },
    { k: 'Rolls Sales', amount: tot(currWeek, 'roll_sales'), qty: tot(currWeek, 'roll_qty'), mfg: tot(currWeek, 'roll_mfgcost') },
  ];

  const prevSalesBreak = [
    { k: 'Label Sales', amount: tot(prevWeek, 'label_sales'), qty: tot(prevWeek, 'label_qty'), mfg: tot(prevWeek, 'label_mfgcost') },
    { k: 'Direct Sales', amount: tot(prevWeek, 'dsales'), qty: tot(prevWeek, 'dsales_qty'), mfg: tot(prevWeek, 'dsales_mfgcost') },
    { k: 'Rolls Sales', amount: tot(prevWeek, 'roll_sales'), qty: tot(prevWeek, 'roll_qty'), mfg: tot(prevWeek, 'roll_mfgcost') },
  ];

  // Chart: curr = solid colour, prev = same colour at 20% opacity
  function wChart(key, color) {
    return {
      labels: DAY_NAMES,
      datasets: [
        { label:'Current Week', data:currWeek.map(d=>d[key]), backgroundColor:color+'cc', borderColor:color, borderWidth:1, borderRadius:4 },
        { label:'Prev Week',    data:prevWeek.map(d=>d[key]), backgroundColor:color+'33', borderColor:color+'66', borderWidth:1, borderRadius:4 },
      ],
    };
  }

  const chartOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:LEG, tooltip:{ ...BASE_TIP, callbacks:{ label:ctx=>' '+ctx.dataset.label+': '+fmt(ctx.raw) } } },
    scales:{
      x:{ grid:GRID, ticks:TICK },
      y:{ grid:GRID, ticks:{ ...TICK, callback: v=>'₹'+(v/100_000).toFixed(1)+'L' }, beginAtZero:true },
    },
  };

  return (
    <div>
      {/* Week badges */}
      <div className="weekly-header">
        <div className="week-badge week-badge-curr">
          <div className="week-badge-label">Current Week</div>
          <div className="week-badge-dates">{fmtRange(currMon)}</div>
        </div>
        <div className="week-badge week-badge-prev">
          <div className="week-badge-label">Previous Week</div>
          <div className="week-badge-dates">{fmtRange(prevMon)}</div>
        </div>
      </div>

      {/* Sales breakdown tiles */}
      <div className="charts-2">
        <div>
          {currSalesBreak.length > 0 && (
            <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:16 }}>
              {currSalesBreak.map(s => (
                <div key={s.k} className="kpi sales-green" style={{ '--kc':'#22c55e' }}>
                  <div className="kpi-label">{s.k}</div>
                  <div className="kpi-value">
                    {s.amount != null ? fmt(s.amount) : '—'}
                    {(() => {
                      const prev = prevSalesBreak.find(x => x.k === s.k)?.amount || 0;
                      if (prev === 0 && s.amount > 0) return <span className={`kpi-badge bg`}>New</span>;
                      if (prev === 0) return null;
                      const pct = (s.amount - prev) / prev * 100;
                      const cls = pct > 0 ? 'bg' : pct < 0 ? 'rb' : '';
                      return <span className={`kpi-badge ${cls}`}>{pct>0?'+':''}{pct.toFixed(1)}%</span>;
                    })()}
                  </div>
                  <div className="kpi-sub">
                    <div>
                      Qty: {s.qty != null ? s.qty : '—'}
                      {['Label Sales','Direct Sales','Rolls Sales'].includes(s.k) && (() => {
                        const prevQty = prevSalesBreak.find(x => x.k === s.k)?.qty;
                        if (prevQty == null || prevQty === 0 || s.qty == null) return null;
                        if (s.qty > prevQty) return <span style={{ marginLeft: 6 }}>▲</span>;
                        if (s.qty < prevQty) return <span style={{ marginLeft: 6 }}>▼</span>;
                        return <span style={{ marginLeft: 6 }}>→</span>;
                      })()}
                    </div>
                    <div>Mfg: {s.mfg != null ? fmt(s.mfg) : '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          {prevSalesBreak.length > 0 && (
            <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:16 }}>
              {prevSalesBreak.map(s => (
                <div key={s.k} className="kpi sales-yellow" style={{ '--kc':'#f59e0b' }}>
                  <div className="kpi-label">{s.k}</div>
                  <div className="kpi-value">{s.amount != null ? fmt(s.amount) : '—'}</div>
                  <div className="kpi-sub">
                    <div>Qty: {s.qty != null ? s.qty : '—'}</div>
                    <div>Mfg: {s.mfg != null ? fmt(s.mfg) : '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="wkpi-grid">
        {kpis.map(k => (
          <div key={k.label} className="wkpi" style={{ '--wc':k.color }}>
            <div className="wkpi-label">{k.label}</div>
            <div className="wkpi-row">
              <div>
                <div className="wkpi-col-label">Current Week</div>
                <div className="wkpi-col-val">{fmt(k.c)}</div>
              </div>
              <div>
                <div className="wkpi-col-label">Prev Week</div>
                <div className="wkpi-col-val" style={{ color:'var(--muted)' }}>{fmt(k.p)}</div>
              </div>
            </div>
            {k.qtyC != null && k.qtyP != null && (
              <div className="wkpi-row">
                <div>
                  <div className="wkpi-col-label">Qty</div>
                  <div className="wkpi-col-val">{k.qtyC}</div>
                </div>
                <div>
                  <div className="wkpi-col-label">Qty</div>
                  <div className="wkpi-col-val" style={{ color:'var(--muted)' }}>{k.qtyP}</div>
                </div>
              </div>
            )}
            {badge(k.c, k.p)}
          </div>
        ))}
      </div>

      {/* Charts */}
      <p className="section">Daily Sales vs Previous Week</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Sales (₹) — Day by Day</div>
          <div className="card-sub">Current week (solid) vs previous week (muted)</div>
          <div className="chart-wrap"><Bar data={wChart('sales',P.purple)} options={chartOpts} /></div>
        </div>
        <div className="card">
          <div className="card-title">Wastage (₹) — Day by Day</div>
          <div className="card-sub">Daily waste losses: current vs previous week</div>
          <div className="chart-wrap"><Bar data={wChart('wastage',P.yellow)} options={chartOpts} /></div>
        </div>
      </div>

      <p className="section">Daily Material Flow vs Previous Week</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Material Inward (₹) — Day by Day</div>
          <div className="card-sub">Incoming material value: current vs previous week</div>
          <div className="chart-wrap"><Bar data={wChart('inward',P.blue)} options={chartOpts} /></div>
        </div>
        <div className="card">
          <div className="card-title">Material Outward (₹) — Day by Day</div>
          <div className="card-sub">Outgoing material value: current vs previous week</div>
          <div className="chart-wrap"><Bar data={wChart('outward',P.red)} options={chartOpts} /></div>
        </div>
      </div>
    </div>
  );
}
