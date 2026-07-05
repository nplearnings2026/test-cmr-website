const v = x => (x != null && x !== '') ? parseFloat(x) : 0;
const round1 = n => Math.round(n * 10) / 10;

export function getFiscalYear(ym) {
  const [year, month] = ym.split('-').map(Number);
  return month >= 4 ? String(year) : String(year - 1);
}

export function processRecords(records) {
  // ── Daily records ────────────────────────────────────────────────────────
  const daily = records.map(r => {
    const label_sales = v(r.sls_labelamount);
    const roll_sales  = v(r.sls_rollamount);
    const dsales      = v(r.sls_dsalesamount);
    const sheet_sales = v(r.sls_sheetamount);
    const total_sales = label_sales + roll_sales + dsales + sheet_sales;

    const mfgcost = v(r.sls_labelmfgcost) + v(r.sls_rollmfgcost)
                  + v(r.sls_sheetmfgcost) + v(r.sls_dsalesmfgcost);
    const profit  = v(r.sls_labelprfls) + v(r.sls_rollprfls)
                  + v(r.sls_sheetprfls) + v(r.sls_dsalesprfls);
    const margin  = total_sales > 0 ? round1(profit / total_sales * 100) : 0;

    const inward  = v(r.inwardamount);
    const outward = v(r.outwardamount);
    const inward_qty  = v(r.inwardqty ?? r.inward_qty ?? r.inwardQty);
    const outward_qty = v(r.outwardqty ?? r.outward_qty ?? r.outwardQty);
    const wastage = Math.max(0, v(r.colorwastage)) + Math.max(0, v(r.readyrollwastage));

    return {
      date: r.date,
      total_sales, label_sales, sheet_sales, roll_sales, dsales,
      // per-component qty and mfg costs (if present in source)
      label_qty: v(r.sls_labelqty ?? r.sls_label_qty ?? r.sls_labelQty),
      roll_qty:  v(r.sls_rollqty ?? r.sls_roll_qty ?? r.sls_rollQty),
      sheet_qty: v(r.sls_sheetqty ?? r.sls_sheet_qty ?? r.sls_sheetQty),
      dsales_qty: v(r.sls_dsalesqty ?? r.sls_dsales_qty ?? r.sls_dsalesQty),
      label_mfgcost: v(r.sls_labelmfgcost),
      roll_mfgcost:  v(r.sls_rollmfgcost),
      sheet_mfgcost: v(r.sls_sheetmfgcost),
      dsales_mfgcost: v(r.sls_dsalesmfgcost),
      profit, mfgcost, margin,
      inward, outward, wastage,
      inward_qty, outward_qty,
      // production process amounts (for overview charts)
      gumming  : v(r.gummingamount),
      slitting : v(r.slittingamount),
      color    : v(r.coloramount),
      diepunch : v(r.diepunchamount),
      readyroll: v(r.readyrollamount),
      // detailed production fields
      gm_rolls : v(r.gummingroll),
      gm_qty   : v(r.gummingqty),
      sl_rolls : v(r.slittingroll),
      sl_qty   : v(r.slittingqty),
      cl_rolls : v(r.colorroll),
      cl_qty   : v(r.colorqty),
      cl_waste : Math.max(0, v(r.colorwastage)),
      dp_qty   : v(r.diepunchqty),
      rr_rolls : v(r.readyrollroll),
      rr_pcs   : v(r.readyrollpcs),
      rr_waste : Math.max(0, v(r.readyrollwastage)),
      rr_waste_per_pcs: v(r.readyrollwastageperpcs),
      rr_waste_perc   : v(r.readyrollwastageperc),
    };
  });

  // ── Monthly rollup ───────────────────────────────────────────────────────
  const monthMap = {};
  daily.forEach(d => {
    const m = d.date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = {
      month: m, total: 0, label: 0, roll: 0, dsales: 0,
      mfgcost: 0, profit: 0, inward: 0, outward: 0, wastage: 0,
      inward_qty: 0, outward_qty: 0,
      gumming: 0, slitting: 0, color: 0, diepunch: 0, readyroll: 0,
      gm_rolls:0, gm_qty:0,
      sl_rolls:0, sl_qty:0,
      cl_rolls:0, cl_qty:0, cl_waste:0,
      dp_qty:0,
      rr_rolls:0, rr_pcs:0, rr_waste:0,
      days: 0,
    };
    const mo = monthMap[m];
    mo.fiscalYear = getFiscalYear(m);
    mo.total   += d.total_sales; mo.label   += d.label_sales; mo.roll    += d.roll_sales;
    mo.dsales  += d.dsales;      mo.mfgcost += d.mfgcost;     mo.profit  += d.profit;
    mo.inward  += d.inward;      mo.outward += d.outward;     mo.wastage += d.wastage;
    mo.inward_qty  += d.inward_qty || 0; mo.outward_qty += d.outward_qty || 0;
    mo.gumming += d.gumming; mo.slitting += d.slitting; mo.color += d.color;
    mo.diepunch+= d.diepunch; mo.readyroll+= d.readyroll;
    mo.gm_rolls += d.gm_rolls; mo.gm_qty   += d.gm_qty;
    mo.sl_rolls += d.sl_rolls; mo.sl_qty   += d.sl_qty;
    mo.cl_rolls += d.cl_rolls; mo.cl_qty   += d.cl_qty; mo.cl_waste += d.cl_waste;
    mo.dp_qty   += d.dp_qty;
    mo.rr_rolls += d.rr_rolls; mo.rr_pcs   += d.rr_pcs; mo.rr_waste += d.rr_waste;
    if (d.total_sales > 0) mo.days++;
  });

  const monthly = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  monthly.forEach((m, i) => {
    m.margin          = m.total > 0 ? round1(m.profit  / m.total * 100) : 0;
    m.label_pct       = m.total > 0 ? round1(m.label   / m.total * 100) : 0;
    m.roll_pct        = m.total > 0 ? round1(m.roll    / m.total * 100) : 0;
    m.dsales_pct      = m.total > 0 ? round1(m.dsales  / m.total * 100) : 0;
    m.cost_pct        = m.total > 0 ? round1(m.mfgcost / m.total * 100) : 0;
    m.wastage_pct     = m.total > 0 ? round1(m.wastage / m.total * 100) : 0;
    m.avg_daily_sales = m.days > 0  ? m.total / m.days : 0;
    m.mom_growth      = i > 0 && monthly[i - 1].total > 0
      ? round1((m.total - monthly[i - 1].total) / monthly[i - 1].total * 100)
      : null;
    // per-roll averages
    m.gm_avg_per_roll = m.gm_rolls > 0 ? Math.round(m.gumming  / m.gm_rolls) : 0;
    m.sl_avg_per_roll = m.sl_rolls > 0 ? Math.round(m.slitting / m.sl_rolls) : 0;
    m.cl_avg_per_roll = m.cl_rolls > 0 ? Math.round(m.color    / m.cl_rolls) : 0;
    m.rr_avg_per_roll = m.rr_rolls > 0 ? Math.round(m.readyroll/ m.rr_rolls) : 0;
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  const tot = f => daily.reduce((s, d) => s + (d[f] || 0), 0);
  const totalSales  = tot('total_sales');
  const totalProfit = tot('profit');
  const best        = monthly.reduce((b, m) => m.total  > (b?.total  || 0) ? m : b, null);
  const bestMargin  = monthly.reduce((b, m) => m.margin > (b?.margin || 0) ? m : b, null);

  const summary = {
    total_sales       : totalSales,
    total_profit      : totalProfit,
    total_mfgcost     : tot('mfgcost'),
    overall_margin    : totalSales > 0 ? round1(totalProfit / totalSales * 100) : 0,
    total_label       : tot('label_sales'),
    total_roll        : tot('roll_sales'),
    total_dsales      : tot('dsales'),
    total_inward      : tot('inward'),
    total_outward     : tot('outward'),
    total_inward_qty  : tot('inward_qty'),
    total_outward_qty : tot('outward_qty'),
    total_wastage     : tot('wastage'),
    total_gumming     : tot('gumming'),
    total_slitting    : tot('slitting'),
    total_color       : tot('color'),
    total_diepunch    : tot('diepunch'),
    total_readyroll   : tot('readyroll'),
    // production detail totals
    gm_rolls  : tot('gm_rolls'),  gm_qty    : tot('gm_qty'),
    sl_rolls  : tot('sl_rolls'),  sl_qty    : tot('sl_qty'),
    cl_rolls  : tot('cl_rolls'),  cl_qty    : tot('cl_qty'),  cl_waste: tot('cl_waste'),
    dp_qty    : tot('dp_qty'),
    rr_rolls  : tot('rr_rolls'),  rr_pcs    : tot('rr_pcs'),  rr_waste: tot('rr_waste'),
    best_month        : best?.month || '',
    best_margin_month : bestMargin?.month || '',
    date_range: {
      from  : daily[0]?.date || '',
      to    : daily[daily.length - 1]?.date || '',
      days  : daily.length,
      months: monthly.length,
    },
  };

  return { summary, daily, monthly };
}
