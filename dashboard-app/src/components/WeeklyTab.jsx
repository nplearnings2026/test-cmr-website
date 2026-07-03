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
        return { day:DAY_NAMES[i], sales:r.total_sales||0, inward:r.inward||0, outward:r.outward||0, wastage:r.wastage||0 };
      });
    }
    return { currMon, prevMon, currWeek:slice(currMon), prevWeek:slice(prevMon) };
  }, [daily]);

  const tot = (w,k) => w.reduce((s,d) => s+d[k], 0);
  const kpis = [
    { label:'Sales',            color:P.purple, c:tot(currWeek,'sales'),   p:tot(prevWeek,'sales')   },
    { label:'Material Inward',  color:P.blue,   c:tot(currWeek,'inward'),  p:tot(prevWeek,'inward')  },
    { label:'Material Outward', color:P.red,    c:tot(currWeek,'outward'), p:tot(prevWeek,'outward') },
    { label:'Wastage',          color:P.yellow, c:tot(currWeek,'wastage'), p:tot(prevWeek,'wastage') },
  ];

  function badge(c,p) {
    if (!p) return null;
    const pct = (c-p)/p*100;
    const cls = pct>0 ? 'wc-up' : pct<0 ? 'wc-dn' : 'wc-flat';
    return <span className={`wkpi-change ${cls}`}>{pct>0?'+':''}{pct.toFixed(1)}% vs prev week</span>;
  }

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
