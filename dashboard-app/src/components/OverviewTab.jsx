import { Chart } from 'react-chartjs-2';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { fmt, monthLabel, P, MONTH_COLORS, getChartTheme } from '../utils/format';

const yL   = v => '₹' + (v / 100_000).toFixed(1) + 'L';
const yPct = v => v + '%';


function KpiCard({ label, value, sub, color, badge }) {
  return (
    <div className="kpi" style={{ '--kc': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {badge && <span className={`kpi-badge ${badge.cls}`}>{badge.text}</span>}
    </div>
  );
}

export default function OverviewTab({ summary, monthly, daily, theme }) {
  const { GRID, TICK, LEG, BASE_TIP } = getChartTheme(theme);
  const labels = monthly.map(m => monthLabel(m.month));

  // ── c1: Revenue stacked + Margin % line ─────────────────────────────
  const c1 = {
    data: {
      labels,
      datasets: [
        { type:'bar',  label:'Label',    data:monthly.map(m=>m.label),  backgroundColor:'rgba(108,99,255,.75)', stack:'rev', yAxisID:'y' },
        { type:'bar',  label:'Roll',     data:monthly.map(m=>m.roll),   backgroundColor:'rgba(0,212,170,.75)',  stack:'rev', yAxisID:'y' },
        { type:'bar',  label:'Direct',   data:monthly.map(m=>m.dsales), backgroundColor:'rgba(255,159,67,.75)', stack:'rev', yAxisID:'y' },
        { type:'line', label:'Margin %', data:monthly.map(m=>m.margin), borderColor:P.yellow, backgroundColor:'transparent', tension:.4, pointRadius:5, yAxisID:'y2' },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:LEG, tooltip:{ ...BASE_TIP, mode:'index' } },
      scales:{
        x:  { stacked:true, grid:GRID, ticks:TICK },
        y:  { stacked:true, grid:GRID, ticks:{ ...TICK, callback:yL } },
        y2: { position:'right', grid:{ display:false }, ticks:{ ...TICK, callback:yPct } },
      },
    },
  };

  // ── c2: Mfg Cost bars + Cost% + Wastage% lines ──────────────────────
  const c2 = {
    data: {
      labels,
      datasets: [
        { type:'bar',  label:'Mfg Cost',  data:monthly.map(m=>m.mfgcost),    backgroundColor:'rgba(255,107,107,.6)', borderColor:P.red,    borderWidth:1, yAxisID:'y' },
        { type:'line', label:'Cost %',    data:monthly.map(m=>m.cost_pct),   borderColor:P.teal,   backgroundColor:'transparent', tension:.4, pointRadius:4, yAxisID:'y2' },
        { type:'line', label:'Wastage %', data:monthly.map(m=>m.wastage_pct),borderColor:P.yellow, backgroundColor:'transparent', tension:.4, pointRadius:4, yAxisID:'y2' },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:LEG, tooltip:{ ...BASE_TIP, mode:'index' } },
      scales:{
        x:  { grid:GRID, ticks:TICK },
        y:  { grid:GRID, ticks:{ ...TICK, callback:yL } },
        y2: { position:'right', grid:{ display:false }, ticks:{ ...TICK, callback:yPct } },
      },
    },
  };

  // ── c3: MoM Growth % line ────────────────────────────────────────────
  const growthData = monthly.map(m => m.mom_growth);
  const ptColors   = growthData.map(v => v == null ? '#8892a4' : v >= 0 ? P.green : P.red);
  const c3 = {
    data: {
      labels,
      datasets:[{
        label:'MoM Growth %', data:growthData,
        borderColor:P.purple, backgroundColor:'rgba(108,99,255,.1)',
        tension:.4, pointRadius:6, fill:true,
        pointBackgroundColor:ptColors, pointBorderColor:ptColors,
      }],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:LEG, tooltip:BASE_TIP },
      scales:{ x:{ grid:GRID, ticks:TICK }, y:{ grid:GRID, ticks:{ ...TICK, callback:yPct } } },
    },
  };

  // ── c4: Sales mix 100% stacked ───────────────────────────────────────
  const c4 = {
    data:{
      labels,
      datasets:[
        { label:'Label %',  data:monthly.map(m=>m.label_pct),  backgroundColor:'rgba(108,99,255,.85)', stack:'s' },
        { label:'Roll %',   data:monthly.map(m=>m.roll_pct),   backgroundColor:'rgba(0,212,170,.85)',  stack:'s' },
        { label:'Direct %', data:monthly.map(m=>m.dsales_pct), backgroundColor:'rgba(255,159,67,.85)', stack:'s' },
      ],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:LEG, tooltip:{ ...BASE_TIP, mode:'index' } },
      scales:{
        x:{ stacked:true, grid:GRID, ticks:TICK },
        y:{ stacked:true, grid:GRID, ticks:{ ...TICK, callback:yPct }, max:100 },
      },
    },
  };

  // ── c5: Cost % + Wastage % bars ──────────────────────────────────────
  const c5 = {
    data:{
      labels,
      datasets:[
        { label:'Cost %',    data:monthly.map(m=>m.cost_pct),    backgroundColor:'rgba(255,107,107,.7)', borderColor:P.red,    borderWidth:1, borderRadius:4 },
        { label:'Wastage %', data:monthly.map(m=>m.wastage_pct), backgroundColor:'rgba(255,209,102,.7)', borderColor:P.yellow, borderWidth:1, borderRadius:4 },
      ],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:LEG, tooltip:BASE_TIP },
      scales:{ x:{ grid:GRID, ticks:TICK }, y:{ grid:GRID, ticks:{ ...TICK, callback:yPct } } },
    },
  };

  // ── c6: Production process doughnut ─────────────────────────────────
  const c6 = {
    data:{
      labels:['Gumming','Slitting','Color','Die Punch','Ready Roll'],
      datasets:[{
        data:[summary.total_gumming, summary.total_slitting, summary.total_color, summary.total_diepunch, summary.total_readyroll],
        backgroundColor:[P.purple, P.teal, P.orange, P.yellow, P.pink],
        borderColor:'#1a1d27', borderWidth:2, hoverOffset:10,
      }],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ ...LEG, position:'bottom' }, tooltip:BASE_TIP },
      cutout:'62%',
    },
  };

  // ── KPI cards — exact match with dashboard.html ───────────────────────
  const s = summary;
  const pct1 = (n, d) => d > 0 ? (n / d * 100).toFixed(1) + '% of revenue' : '—';
  const pct2 = (n, d) => d > 0 ? (n / d * 100).toFixed(2) + '% of revenue' : '—';
  const bestMargMonth = monthLabel(s.best_margin_month);

  const kpis = [
    { label:'Total Revenue',     value:fmt(s.total_sales),   sub:`${s.date_range.from} – ${s.date_range.to}`, color:P.purple },
    { label:'Total Profit',      value:fmt(s.total_profit),  sub:'Net of mfg costs', color:P.teal,
      badge:{ text: s.overall_margin + '% avg margin', cls:'bg' } },
    { label:'Mfg Cost',          value:fmt(s.total_mfgcost), sub:pct1(s.total_mfgcost, s.total_sales), color:P.yellow },
    { label:'Label Sales',       value:fmt(s.total_label),   sub:pct1(s.total_label,   s.total_sales), color:P.purple },
    { label:'Roll Sales',        value:fmt(s.total_roll),    sub:pct1(s.total_roll,    s.total_sales), color:P.teal   },
    { label:'Direct Sales',      value:fmt(s.total_dsales),  sub:pct1(s.total_dsales,  s.total_sales), color:P.orange },
    { label:'Raw Material In',   value:fmt(s.total_inward),  sub:'Total inward value',  color:P.blue  },
    { label:'Goods Out',         value:fmt(s.total_outward), sub:'Total outward value', color:P.red   },
    { label:'Ready Roll Wastage',value:fmt(s.rr_waste), sub:pct2(s.rr_waste, s.total_sales), color:P.red,
      badge:{ text: 'Best margin: ' + bestMargMonth, cls:'bg' } },
  ];

  // ── Monthly table grand totals ────────────────────────────────────────
  const grandDays  = monthly.reduce((s,m) => s + m.days, 0);
  const grandTotal = summary.total_sales;
  const grandMargin = grandTotal > 0 ? (summary.total_profit / grandTotal * 100).toFixed(1) + '%' : '—';
  const grandAvg   = grandDays > 0 ? fmt(grandTotal / grandDays) : '—';

  return (
    <div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(9,minmax(0,1fr))' }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      <p className="section">Revenue &amp; Profitability</p>
      <div className="charts-3">
        <div className="card">
          <div className="card-title">Monthly Revenue &amp; Profit Margin</div>
          <div className="card-sub">Stacked revenue by category (₹) with margin % trend line</div>
          <div className="chart-wrap"><Chart type="bar" data={c1.data} options={c1.options} /></div>
        </div>
        <div className="card">
          <div className="card-title">Monthly Mfg Cost &amp; Wastage</div>
          <div className="card-sub">Absolute mfg cost (₹) with cost % and wastage % trend lines</div>
          <div className="chart-wrap"><Chart type="bar" data={c2.data} options={c2.options} /></div>
        </div>
      </div>

      <p className="section">Monthly Summary</p>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th><th>Label Sales</th><th>Roll Sales</th><th>Direct</th>
              <th>Total Sales</th><th>Profit</th><th>Margin %</th><th>Mfg Cost</th>
              <th>Inward</th><th>Outward</th><th>Wastage</th><th>Avg Daily</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map(m => (
              <tr key={m.month}>
                <td>{monthLabel(m.month)}</td>
                <td>{fmt(m.label)}</td><td>{fmt(m.roll)}</td><td>{fmt(m.dsales)}</td>
                <td>{fmt(m.total)}</td><td>{fmt(m.profit)}</td>
                <td className={m.margin>=35?'positive':m.margin>=25?'neutral':'negative'}>{m.margin}%</td><td>{fmt(m.mfgcost)}</td>
                <td>{fmt(m.inward)}</td><td>{fmt(m.outward)}</td><td>{fmt(m.wastage)}</td>
                <td>{fmt(m.avg_daily_sales)}</td>
              </tr>
            ))}
            <tr>
              <td>Total / Avg</td>
              <td>{fmt(summary.total_label)}</td><td>{fmt(summary.total_roll)}</td><td>{fmt(summary.total_dsales)}</td>
              <td>{fmt(summary.total_sales)}</td><td>{fmt(summary.total_profit)}</td>
              <td className="positive">{grandMargin}</td><td>{fmt(summary.total_mfgcost)}</td>
              <td>{fmt(summary.total_inward)}</td><td>{fmt(summary.total_outward)}</td><td>{fmt(summary.total_wastage)}</td>
              <td>{grandAvg}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="section">Sales Mix &amp; Growth</p>
      <div className="charts-2">
        <div className="card">
          <div className="card-title">Month-over-Month Revenue Growth %</div>
          <div className="card-sub">% change vs prior month (green = growth, red = decline)</div>
          <div className="chart-wrap"><Line data={c3.data} options={c3.options} /></div>
        </div>
        <div className="card">
          <div className="card-title">Sales Mix % by Month</div>
          <div className="card-sub">Label / Roll / Direct as % of monthly revenue</div>
          <div className="chart-wrap"><Bar data={c4.data} options={c4.options} /></div>
        </div>
      </div>

      <div className="charts-2">
        <div className="card">
          <div className="card-title">Mfg Cost % &amp; Wastage % by Month</div>
          <div className="card-sub">Cost and wastage as % of monthly revenue</div>
          <div className="chart-wrap"><Bar data={c5.data} options={c5.options} /></div>
        </div>
        <div className="card">
          <div className="card-title">Production Process Mix</div>
          <div className="card-sub">Total value share across production stages (₹)</div>
          <div className="chart-wrap"><Doughnut data={c6.data} options={c6.options} /></div>
        </div>
      </div>
    </div>
  );
}
