import { useState, useEffect, useCallback, useMemo } from 'react';
import { processRecords, summarizeMonthly } from './utils/dataProcessor';
import OverviewTab    from './components/OverviewTab';
import DailyTab       from './components/DailyTab';
import MonthlyTab     from './components/MonthlyTab';
import WeeklyTab      from './components/WeeklyTab';
import ProductionTab  from './components/ProductionTab';
import YoYTab         from './components/YoYTab';
import ReportTab      from './components/ReportTab';

const AVAILABLE_YEARS = ['2024', '2025', '2026'];
const getCurrentFiscalYear = () => {
  const d = new Date();
  return d.getMonth() >= 3 ? String(d.getFullYear()) : String(d.getFullYear() - 1);
};
const currentFiscalYear = getCurrentFiscalYear();
const fiscalLabel = y => `FY ${y}-${String(Number(y) + 1).slice(-2)}`;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FISCAL_MONTHS = ['04','05','06','07','08','09','10','11','12','01','02','03'];
// Temporarily hidden — flip back to true to re-enable the Report tab's custom From/To date filter.
const SHOW_REPORT_DATE_FILTER = false;

export default function App() {
  const [activeTab, setActiveTab]   = useState('overview');
  const [data,      setData]        = useState(null);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState(null);
  const [updatedAt, setUpdatedAt]   = useState(null);
  const [selYear,   setSelYear]     = useState(currentFiscalYear);
  const [selMonth,  setSelMonth]    = useState('');
  const [theme,     setTheme]       = useState(() => localStorage.getItem('dash-theme') || 'dark');
  const [fullData,  setFullData]    = useState(null);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo,   setReportTo]   = useState('');

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
  const monthsForYear = useMemo(() => {
    if (!data) return [];
    // When a specific fiscal year is selected, only include months
    // that belong to that fiscal year (monthly entries include `fiscalYear`).
    const months = selYear
      ? Array.from(new Set(data.monthly.filter(m => (m.fiscalYear || '').toString() === selYear).map(m => m.month.slice(5))))
      : Array.from(new Set(data.monthly.map(m => m.month.slice(5))));
    return months.sort((a, b) => FISCAL_MONTHS.indexOf(a) - FISCAL_MONTHS.indexOf(b));
  }, [data, selYear]);

  function handleYearChange(y) { setSelYear(y); setSelMonth(''); }

  // ── Filtered data passed to all tabs (month-only, year is handled server-side) ──
  const filtered = useMemo(() => {
    if (!data) return null;

    let monthly = data.monthly;
    let daily   = data.daily;

    if (selMonth) { monthly = monthly.filter(m => m.month.slice(5) === selMonth);  daily = daily.filter(d => d.date.slice(5, 7) === selMonth); }

    // Recompute summary totals from filtered monthly
    const summary = {
      ...data.summary,
      ...summarizeMonthly(monthly),
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
    { id: 'daily',       label: 'Daily' },
    { id: 'weekly',      label: 'Weekly' },
    { id: 'monthly',     label: 'Monthly' },
    { id: 'yoy',         label: 'Year over Year' },
    { id: 'production',  label: 'Production' },
    { id: 'report',      label: 'Report' },
  ];

  const isFiltered = selMonth || selYear !== currentFiscalYear;

  return (
    <div className="app">
      {/* ── Header ── */}
      <div className="app-header">
        <div>
          <h1>Manufacturing Operations Dashboard</h1>
          {filtered && (
            <p className="subtitle">
              Production &amp; sales &bull; {selYear ? fiscalLabel(selYear) : `${filtered.summary.date_range.from} – ${filtered.summary.date_range.to}`}
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

      {/* ── Global filter bar (hidden on Daily, Weekly, and YoY tabs) ── */}
      {data && !['daily','weekly','yoy'].includes(activeTab) && (
        <div className="filter-bar">
          <label>Year</label>
          <select className="filter-select" value={selYear} onChange={e => handleYearChange(e.target.value)}>
            <option value="">All Years</option>
            {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{`FY ${y}-${String(Number(y) + 1).slice(-2)}`}</option>)}
          </select>

          <label>Month</label>
          <select className="filter-select" value={selMonth} onChange={e => setSelMonth(e.target.value)} disabled={!selYear}>
            <option value="">All Months</option>
            {monthsForYear.map(mo => (
              <option key={mo} value={mo}>{MONTH_NAMES[parseInt(mo, 10) - 1]}</option>
            ))}
          </select>

          {SHOW_REPORT_DATE_FILTER && activeTab === 'report' && (
            <>
              <label>From</label>
              <input type="date" className="filter-date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
              <label>To</label>
              <input type="date" className="filter-date" value={reportTo} onChange={e => setReportTo(e.target.value)} />
              {(reportFrom || reportTo) && (
                <button className="filter-reset" onClick={() => { setReportFrom(''); setReportTo(''); }}>Clear Dates</button>
              )}
            </>
          )}

          {isFiltered && (
            <button className="filter-reset" onClick={() => { setSelYear(currentFiscalYear); setSelMonth(''); }}>Reset</button>
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
          {activeTab === 'daily' && (
            <DailyTab
              summary={filtered.summary}
              monthly={filtered.monthly}
              daily={filtered.daily}
              rawDaily={fullData?.daily || data.daily}
              theme={theme}
            />
          )}
          {activeTab === 'monthly' && (
            <MonthlyTab monthly={filtered.monthly} fullMonthly={fullData?.monthly || data.monthly} theme={theme} />
          )}
          {activeTab === 'weekly' && (
            <WeeklyTab daily={fullData?.daily || data.daily} theme={theme} />
          )}
          {activeTab === 'production' && (
            <ProductionTab summary={filtered.summary} monthly={filtered.monthly} theme={theme} />
          )}
          {activeTab === 'report' && fullData && (
            <ReportTab
              fullMonthly={fullData.monthly}
              fullDaily={fullData.daily}
              currentFiscalYear={currentFiscalYear}
              selYear={selYear}
              selMonth={selMonth}
              dateFrom={reportFrom}
              dateTo={reportTo}
              theme={theme}
            />
          )}
          {activeTab === 'report' && !fullData && (
            <div className="loading-overlay"><div className="spinner" /><p>Loading all years…</p></div>
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
