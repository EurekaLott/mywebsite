/**
 * fetch-draws.js
 * EurekaLott — Powerball draw fetcher với 3 nguồn dự phòng
 *
 * Source A: powerball.com/previous-results   (HTML scrape — chính thức)
 * Source B: powerball.com/api/v1/drawings    (JSON API — chính thức, ổn định hơn A)
 * Source C: magayo.com API                   (bên thứ 3, free demo key)
 *
 * Thứ tự: thử A → nếu lỗi thử B → nếu lỗi thử C → nếu cả 3 lỗi mới báo lỗi
 *
 * Output: draws-data.js — canonical format, sẵn sàng cho verify.js
 * {
 *   date:      "2026-06-24",      // ISO date YYYY-MM-DD
 *   white:     [13,14,16,21,38],  // 5 white balls, sorted ascending
 *   powerball: 14                 // 1 Powerball number
 * }
 */

const https = require('https');
const fs    = require('fs');

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function get(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EurekaLott-Bot/1.0)',
        'Accept':     'text/html,application/xhtml+xml,application/json',
        ...options.headers,
      },
      timeout: 15000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location, options).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ─── Normalize helper ────────────────────────────────────────────────────────

function makeCanonical(date, nums6) {
  const white     = nums6.slice(0, 5).sort((a, b) => a - b);
  const powerball = nums6[5];
  return { date, white, powerball };
}

// ─── SOURCE A: powerball.com/previous-results (HTML) ─────────────────────────

async function fetchSourceA() {
  console.log('  [A] Trying powerball.com/previous-results (HTML)...');
  const html  = await get('https://www.powerball.com/previous-results');
  const linkRx = /href="\/draw-result\?gc=powerball&(?:amp;)?date=(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)(?=href="|$)/g;
  const draws  = [];
  let m;

  while ((m = linkRx.exec(html)) !== null) {
    const date    = m[1];
    const segment = m[2];
    const nums    = [];
    const numRx   = /\b(\d{1,2})(?!x)\b/g;
    let nm;
    while ((nm = numRx.exec(segment)) !== null) {
      const n = parseInt(nm[1], 10);
      if (n >= 1) nums.push(n);
    }
    if (nums.length >= 6) draws.push(makeCanonical(date, nums.slice(0, 6)));
  }

  if (draws.length === 0) throw new Error('Source A: no draws parsed');
  console.log(`  [A] Got ${draws.length} draws`);
  return draws;
}

// ─── SOURCE B: powerball.com JSON API ────────────────────────────────────────

async function fetchSourceB() {
  console.log('  [B] Trying powerball.com JSON API...');
  const body = await get('https://www.powerball.com/api/v1/drawings/powerball?limit=20');
  const data = JSON.parse(body);
  const draws = data.map(entry => {
    const dateRaw = (entry.field_draw_date || entry.draw_date || '').substring(0, 10);
    let nums;
    const raw = entry.field_winning_numbers || entry.winning_numbers || entry.numbers || '';
    nums = String(raw).split(/[\s,]+/).map(n => parseInt(n, 10)).filter(n => n > 0);
    if (!dateRaw || nums.length < 6) return null;
    return makeCanonical(dateRaw, nums.slice(0, 6));
  }).filter(Boolean);

  if (draws.length === 0) throw new Error('Source B: no draws parsed');
  console.log(`  [B] Got ${draws.length} draws`);
  return draws;
}

// ─── SOURCE C: magayo.com free API (latest draw only) ────────────────────────

async function fetchSourceC() {
  console.log('  [C] Trying magayo.com API...');
  const body = await get('https://www.magayo.com/api/results.php?api_key=hXJDjsp8I6RY&game=us_powerball');

  let date, numsStr;
  try {
    const parsed = JSON.parse(body);
    if (parsed.error !== 0) throw new Error(`API error ${parsed.error}`);
    date    = parsed.draw.substring(0, 10);
    numsStr = parsed.results;
  } catch {
    // XML fallback
    const dateM = body.match(/<draw>(\d{4}-\d{2}-\d{2})<\/draw>/);
    const numsM = body.match(/<results>([\d,]+)<\/results>/);
    if (!dateM || !numsM) throw new Error('Source C: cannot parse response');
    date    = dateM[1];
    numsStr = numsM[1];
  }

  const nums   = numsStr.split(',').map(n => parseInt(n.trim(), 10));
  if (nums.length < 6) throw new Error('Source C: not enough numbers');
  const latest = makeCanonical(date, nums.slice(0, 6));
  console.log(`  [C] Got latest draw: ${latest.date}`);

  // Merge with existing history
  let existing = [];
  try { existing = require('./draws-data.js').draws || []; } catch {}
  if (!existing.find(d => d.date === latest.date)) existing.push(latest);
  return existing;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🎯 EurekaLott — Fetching Powerball draws...');

  let draws = null, usedSource = null;

  const sources = [
    { name: 'A — powerball.com HTML', fn: fetchSourceA },
    { name: 'B — powerball.com JSON', fn: fetchSourceB },
    { name: 'C — magayo.com API',     fn: fetchSourceC },
  ];

  for (const src of sources) {
    try {
      draws      = await src.fn();
      usedSource = src.name;
      break;
    } catch (err) {
      console.warn(`  ⚠️  ${src.name} failed: ${err.message}`);
    }
  }

  if (!draws || draws.length === 0) {
    console.error('\n❌ All 3 sources failed — draws-data.js NOT updated.');
    process.exit(1);
  }

  // Deduplicate + sort ascending (oldest → newest)
  const seen = new Map();
  for (const d of draws) seen.set(d.date, d);
  const final = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));

  fs.writeFileSync('draws-data.js',
`// draws-data.js — AUTO-GENERATED by fetch-draws.js
// Do not edit manually.
// Source: ${usedSource}
// Last updated: ${new Date().toISOString()}

const draws = ${JSON.stringify(final, null, 2)};

module.exports = { draws };
`);

  console.log(`\n✅ draws-data.js — ${final.length} draws`);
  console.log(`   Source : ${usedSource}`);
  console.log(`   Oldest : ${final[0].date}`);
  console.log(`   Newest : ${final[final.length-1].date} | white:${JSON.stringify(final[final.length-1].white)} | pb:${final[final.length-1].powerball}`);
})();
