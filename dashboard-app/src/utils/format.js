export function fmt(n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 10_000_000) return '₹' + (n / 10_000_000).toFixed(2) + ' Cr';
  if (abs >= 100_000)    return '₹' + (n / 100_000).toFixed(2) + ' L';
  if (abs >= 1_000)      return '₹' + (n / 1_000).toFixed(1) + ' K';
  return '₹' + n.toFixed(0);
}

export function monthLabel(ym) {
  if (!ym) return '';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [year, month] = ym.split('-');
  return (MONTHS[parseInt(month, 10) - 1] || '') + ' ' + year;
}

// Exact palette from dashboard.html
export const P = {
  purple : '#6c63ff',
  teal   : '#00d4aa',
  red    : '#ff6b6b',
  yellow : '#ffd166',
  orange : '#ff9f43',
  blue   : '#48dbfb',
  pink   : '#ff6eb4',
  green  : '#22c55e',
};

export const MONTH_COLORS = ['#6c63ff','#00d4aa','#ffd166','#ff9f43','#48dbfb','#ff6eb4'];

export const GRID = { color: 'rgba(255,255,255,0.05)' };
export const TICK = { color: '#8892a4' };
export const LEG  = { labels: { color: '#e2e8f0', boxWidth: 12, font: { size: 11 } } };

export const BASE_TIP = {
  backgroundColor : '#1a1d27',
  borderColor     : '#2a2f45',
  borderWidth     : 1,
  titleColor      : '#e2e8f0',
  bodyColor       : '#8892a4',
};

export function getChartTheme(theme) {
  const light = theme === 'light';
  return {
    GRID    : { color: light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)' },
    TICK    : { color: light ? '#64748b' : '#8892a4' },
    LEG     : { labels: { color: light ? '#334155' : '#e2e8f0', boxWidth: 12, font: { size: 11 } } },
    BASE_TIP: {
      backgroundColor : light ? '#ffffff' : '#1a1d27',
      borderColor     : light ? '#e2e8f0' : '#2a2f45',
      borderWidth     : 1,
      titleColor      : light ? '#1e293b' : '#e2e8f0',
      bodyColor       : light ? '#64748b' : '#8892a4',
    },
  };
}
