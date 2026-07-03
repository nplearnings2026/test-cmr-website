import { useState, useEffect, useCallback, useMemo } from 'react';
import { processRecords } from './utils/dataProcessor';
import OverviewTab    from './components/OverviewTab';
import MonthlyTab     from './components/MonthlyTab';
import WeeklyTab      from './components/WeeklyTab';
import ProductionTab  from './components/ProductionTab';
import YoYTab         from './components/YoYTab';

const AVAILABLE_YEARS = ['2024', '2025', '2026'];
const CURRENT_YEAR   = String(new Date().getFullYear());
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const round1 = n => Math.round(n * 10) / 10;

export default function App() {
  const [activeTab, setActiveTab]   = useState('overview');
  const [data,      setData]        = useState(null);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState(null);
  const [updatedAt, setUpdatedAt]   = useState(null);
  const [selYear,   setSelYear]     = useState(CURRENT_YEAR);
  const [selMonth,  setSelMonth]    = useState('');
  const [theme,     setTheme]       = useState(() => localStorage.getItem('dash-theme') || 'dark');
  const [fullData,  setFullData]    = useState(null);

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
    localStorage.setItem('dash-theme', theme);
  }, [theme]);

  // Fetch all years once for the YoY tab
  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(json => { if (json.success) setFullData(processRecords(json.data)); })
      .catch(console.error);
  }, []);

  const fetchData = useCallback(async (doRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const yearParam = selYear ? `year=${selYear}` : '';
      const refreshParam = doRefresh ? 'refresh=1' : '';
      const qs = [yearParam, refreshParam].filter(Boolean).join('&');
      const url = qs ? `/api/data?${qs}` : '/api/data';
      const res  = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'API returned failure');
      setData(processRecords(json.data));
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter options ─────────────────────────────────────────────────────
  const monthsForYear = useMemo(
    () => data ? data.monthly.map(m => m.month.slice(5)) : [],
    [data],
  );

  function handleYearChange(y) { setSelYear(y); setSelMonth(''); }

  // ── Filtered data passed to all tabs (month-only, year is handled server-side) ──
  const filtered = useMemo(() => {
    if (!data) return null;

    let monthly = data.monthly;
    let daily   = data.daily;

    if (selMonth) { monthly = monthly.filter(m => m.month.slice(5) === selMonth);  daily = daily.filter(d => d.date.slice(5, 7) === selMonth); }

    // Recompute summary totals from filtered monthly
    const sum = f => monthly.reduce((s, m) => s + (m[f] || 0), 0);
    const totalSales  = sum('total');
    const totalProfit = sum('profit');
    const best        = monthly.reduce((b, m) => m.total  > (b?.total  || 0) ? m : b, null);
    const bestMargin  = monthly.reduce((b, m) => m.margin > (b?.margin || 0) ? m : b, null);

    const summary = {
      ...data.summary,
      total_sales    : totalSales,
      total_profit   : totalProfit,
      total_mfgcost  : sum('mfgcost'),
      overall_margin : totalSales > 0 ? round1(totalProfit / totalSales * 100) : 0,
      total_label    : sum('label'),
      total_roll     : sum('roll'),
      total_dsales   : sum('dsales'),
      total_inward   : sum('inward'),
      total_outward  : sum('outward'),
      total_wastage  : sum('wastage'),
      total_gumming  : sum('gumming'),
      total_slitting : sum('slitting'),
      total_color    : sum('color'),
      total_diepunch : sum('diepunch'),
      total_readyroll: sum('readyroll'),
      gm_rolls: sum('gm_rolls'), gm_qty  : sum('gm_qty'),
      sl_rolls: sum('sl_rolls'), sl_qty  : sum('sl_qty'),
      cl_rolls: sum('cl_rolls'), cl_qty  : sum('cl_qty'), cl_waste: sum('cl_waste'),
      dp_qty  : sum('dp_qty'),
      rr_rolls: sum('rr_rolls'), rr_pcs  : sum('rr_pcs'), rr_waste: sum('rr_waste'),
      best_month        : best?.month        || '',
      best_margin_month : bestMargin?.month  || '',
      date_range: {
        from  : daily[0]?.date || data.summary.date_range.from,
        to    : daily[daily.length - 1]?.date || data.summary.date_range.to,
        days  : daily.length,
        months: monthly.length,
      },
    };

    return { summary, daily, monthly };
  }, [data, selYear, selMonth]);

  const TABS = [
    { id: 'overview',    label: 'Overview' },
    { id: 'monthly',     label: 'Monthly Metrics' },
    { id: 'weekly',      label: 'Weekly Comparison' },
    { id: 'production',  label: 'Production' },
    { id: 'yoy',         label: 'Year over Year' },
  ];

  const isFiltered = selMonth || selYear !== CURRENT_YEAR;

  return (
    <div className="app">
      {/* ── Header ── */}
      <div className="app-header">
        <div>
          <h1>Manufacturing Operations Dashboard</h1>
          {filtered && (
            <p className="subtitle">
              Production &amp; sales &bull; {filtered.summary.date_range.from} – {filtered.summary.date_range.to}
              &bull; {filtered.summary.date_range.days} days &bull; {filtered.summary.date_range.months} months
            </p>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
          <button className="refresh-btn" onClick={() => fetchData(true)} disabled={loading}>
            <span className="refresh-icon">⟳</span>
            {loading ? 'Loading…' : 'Refresh'}
            {updatedAt && !loading && (
              <span className="refresh-time">{updatedAt.toLocaleTimeString()}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Global filter bar (hidden on YoY tab) ── */}
      {data && activeTab !== 'yoy' && (
        <div className="filter-bar">
          <label>Year</label>
          <select className="filter-select" value={selYear} onChange={e => handleYearChange(e.target.value)}>
            <option value="">All Years</option>
            {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <label>Month</label>
          <select className="filter-select" value={selMonth} onChange={e => setSelMonth(e.target.value)} disabled={!selYear}>
            <option value="">All Months</option>
            {monthsForYear.map(mo => (
              <option key={mo} value={mo}>{MONTH_NAMES[parseInt(mo, 10) - 1]}</option>
            ))}
          </select>

          {isFiltered && (
            <button className="filter-reset" onClick={() => { setSelYear(CURRENT_YEAR); setSelMonth(''); }}>Reset</button>
          )}
          {filtered && (
            <span className="filter-count">
              {filtered.monthly.length} month{filtered.monthly.length !== 1 ? 's' : ''}
              {selMonth ? ' · filtered' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── States ── */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Loading data…</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-box">
          <strong>Failed to load data:</strong> {error}
          <button className="retry-btn" onClick={fetchData}>Retry</button>
        </div>
      )}

      {/* ── Tab content ── */}
      {!loading && filtered && (
        <>
          {activeTab === 'overview' && (
            <OverviewTab summary={filtered.summary} monthly={filtered.monthly} theme={theme} />
          )}
          {activeTab === 'monthly' && (
            <MonthlyTab monthly={filtered.monthly} theme={theme} />
          )}
          {activeTab === 'weekly' && (
            <WeeklyTab daily={filtered.daily} theme={theme} />
          )}
          {activeTab === 'production' && (
            <ProductionTab summary={filtered.summary} monthly={filtered.monthly} theme={theme} />
          )}
          {activeTab === 'yoy' && fullData && (
            <YoYTab monthly={fullData.monthly} theme={theme} />
          )}
          {activeTab === 'yoy' && !fullData && (
            <div className="loading-overlay"><div className="spinner" /><p>Loading all years…</p></div>
          )}
        </>
      )}
    </div>
  );
}
