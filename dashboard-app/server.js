import express   from 'express';
import fs        from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3001;

// ── Data source — toggle by commenting/uncommenting one of the two blocks ──

// OPTION 1: Local JSON files — one per year (2024.json, 2025.json, 2026.json)
const DATA_DIR = join(__dirname, 'json');
const AVAILABLE_YEARS = ['2024', '2025', '2026'];
const CRM_URL  = 'https://crm.artisanventures.in/api/dailysummary';
const USERCODE = 'e1668ef';
const USERNM   = '9974544222';

const getFiscalYear = date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return month >= 4 ? String(year) : String(year - 1);
};

const getFiscalYearStart = fy => `${fy}-04-01`;

app.get('/api/data', async (req, res) => {
  try {
    const { year, refresh } = req.query;

    // If refresh requested, update the requested year's file (default: current year)
    if (refresh) {
      const targetYear = year || getFiscalYear(new Date());
      const FILE = join(DATA_DIR, `${targetYear}.json`);

      let existing = { data: [] };
      if (fs.existsSync(FILE)) {
        try {
          const raw = await fs.promises.readFile(FILE, 'utf8');
          existing = JSON.parse(raw || '{"data":[]}');
        } catch (e) {
          console.error('[API] Error parsing year file:', e.message);
        }
      }

      const latestDate = existing.data && existing.data.length
        ? existing.data.map(d => d.date).filter(Boolean).sort().slice(-1)[0]
        : null;

      const today = new Date().toISOString().slice(0, 10);
      let fetchFrom;
      if (!latestDate) fetchFrom = getFiscalYearStart(targetYear);
      else {
        const next = new Date(latestDate);
        next.setDate(next.getDate() + 1);
        fetchFrom = next.toISOString().slice(0, 10);
      }

      if (fetchFrom > today) {
        console.log('[API] No new data to fetch; returning existing file content');
        return res.json({ success: 1, data: existing.data });
      }

      const body = new URLSearchParams({ date1: fetchFrom, date2: today, usercode: USERCODE, usernm: USERNM, getreport: 'Print' }).toString();
      const response = await fetch(CRM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/*;q=0.9',
          'User-Agent': 'CRM-Dashboard/1.0',
        },
        body,
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text();
        console.error(`[API] CRM responded ${response.status}:`, text.substring(0, 1000));
        return res.status(502).json({ success: 0, error: `CRM responded ${response.status}`, details: text.substring(0, 2000) });
      }
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[API] CRM returned non-JSON response (probably HTML):', text.substring(0, 1000));
        return res.status(502).json({ success: 0, error: 'CRM returned non-JSON response', details: text.substring(0, 2000) });
      }

      const crmJson = await response.json();
      const newData = Array.isArray(crmJson.data) ? crmJson.data : [];

      // Merge existing + new, dedupe by date (new entries override)
      const byDate = new Map();
      (existing.data || []).forEach(d => { if (d && d.date) byDate.set(d.date, d); });
      newData.forEach(d => { if (d && d.date) byDate.set(d.date, d); });

      const merged = Array.from(byDate.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      merged.forEach((item, idx) => { item.no = idx + 1; });

      try {
        await fs.promises.writeFile(FILE, JSON.stringify({ data: merged }, null, 2), 'utf8');
        console.log(`[API] Updated ${FILE} with ${newData.length} new records (total ${merged.length})`);
      } catch (e) {
        console.error('[API] Error writing year file:', e.message);
      }

      return res.json({ success: 1, data: merged, message: `Fetched ${newData.length} new rows` });
    }

    // Default: return one or more year files concatenated.
    // If a fiscal year is requested (year=YYYY), include that calendar year
    // and the next calendar year so Apr->Mar months are available, then
    // filter records to the requested fiscal year using `getFiscalYear()`.
    const yearsToLoad = year ? [year, String(Number(year) + 1)] : (AVAILABLE_YEARS || ['2024','2025','2026']);
    let allData = [];
    for (const y of yearsToLoad) {
      const file = join(DATA_DIR, `${y}.json`);
      if (fs.existsSync(file)) {
        try {
          const json = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (Array.isArray(json.data)) allData = allData.concat(json.data);
        } catch (e) {
          console.error('[API] Error parsing', file, e.message);
        }
      } else {
        console.warn(`[API] File not found: ${y}.json`);
      }
    }

    if (year) {
      allData = allData.filter(d => d && d.date && getFiscalYear(d.date) === year);
    }

    console.log(`[API] Loaded ${allData.length} records for: ${year ? `FY ${year}` : yearsToLoad.join(', ')}`);
    res.json({ success: 1, data: allData });
  } catch (err) {
    console.error('[API] Error:', err.message);
    res.status(500).json({ success: 0, error: err.message });
  }
});

// OPTION 2: Live CRM API  ← uncomment this block (and comment out OPTION 1 above)
// const CRM_URL  = 'https://crm.artisanventures.in/api/dailysummary';
// const USERCODE = 'e1668ef';
// const USERNM   = '9974544222';
// app.get('/api/data', async (req, res) => {
//   try {
//     const { date1, date2 } = req.query;
//     // CRM expects form POST (the endpoint returns an HTML form on GET).
//     // Include the submit button name/value observed on the CRM form ('getreport')
//     const body = new URLSearchParams({ date1, date2, usercode: USERCODE, usernm: USERNM, getreport: 'Print' }).toString();
//     const response = await fetch(CRM_URL, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//         'Accept': 'application/json, text/*;q=0.9',
//         'User-Agent': 'CRM-Dashboard/1.0',
//       },
//       body,
//     });
//     const contentType = response.headers.get('content-type') || '';

//     if (!response.ok) {
//       const text = await response.text();
//       console.error(`[API] CRM responded ${response.status}:`, text.substring(0, 1000));
//       return res.status(502).json({ success: 0, error: `CRM responded ${response.status}`, details: text.substring(0, 2000) });
//     }

//     if (!contentType.includes('application/json')) {
//       const text = await response.text();
//       console.error('[API] CRM returned non-JSON response (probably HTML):', text.substring(0, 1000));
//       return res.status(502).json({ success: 0, error: 'CRM returned non-JSON response', details: text.substring(0, 2000) });
//     }

//     const json = await response.json();
//     console.log(`[API] Fetched ${json.data?.length ?? 0} records from CRM`);
//     res.json(json);
//   } catch (err) {
//     console.error('[API] Error fetching from CRM:', err);
//     res.status(500).json({ success: 0, error: err.message });
//   }
// });

// Serve built React app in production
app.use(express.static(join(__dirname, 'dist')));
app.get('*', (_, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => {
  console.log(`Manufacturing Dashboard → http://localhost:${PORT}`);
});