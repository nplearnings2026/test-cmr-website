import { Bar, Line } from 'react-chartjs-2';
import { fmt, monthLabel, P, MONTH_COLORS, getChartTheme } from '../utils/format';

const yL   = v => '₹' + (v / 100_000).toFixed(1) + 'L';
const yPct = v => v + '%';

function MetricTile({ color, title, children }) {
  return (
    <div className="tile" style={{ '--tc': color }}>
      <div className="tile-title">{title}</div>
      {children}
    </div>
  );
}

export default function MonthlyTab({ monthly, theme }) {
  const { GRID, TICK, LEG, BASE_TIP } = getChartTheme(theme);
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

  return (
    <div>
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
