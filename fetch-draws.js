/**
 * fetch-draws.js
 * EurekaLott — Powerball draw fetcher với 3 nguồn dự phòng
 *
 * Source A: powerball.com/previous-results   (HTML — chính thức, nhiều kỳ)
 * Source B: Texas Lottery CSV                (CSV — cực ổn định, từ 2010 tới nay)
 * Source C: magayo.com free API              (JSON/XML — latest draw, merge với history)
 *
 * Thứ tự: A → nếu lỗi → B → nếu lỗi → C → nếu cả 3 lỗi → báo lỗi, không commit
 *
 * Output canonical draw object:
 * {
 *   date:      "2026-06-24",      // ISO date YYYY-MM-DD
 *   white:     [13,14,16,21,38],  // 5 white balls, sorted ascending
 *   powerball: 14                 // 1 Powerball number
 * }
 */

const https = require('https');
const fs    = require('fs');

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EurekaLott-Bot/1.0)',
        'Accept':     'text/html,text/csv,application/json,*/*',
      },
      timeout: 15000,
    }, res => {
      // Follow redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Normalize helper ────────────────────────────────────────────────────────

function makeCanonical(date, w1, w2, w3, w4, w5, pb) {
  return {
    date,
    white:     [w1, w2, w3, w4, w5].sort((a, b) => a - b),
    powerball: pb,
  };
}

// ─── SOURCE A: powerball.com/previous-results (HTML) ─────────────────────────
//
// Link pattern: href="/draw-result?gc=powerball&date=2026-06-24"
// Text after link: "Wed, Jun 24, 2026 13 14 16 21 38 14 Power Play 2x"
// Numbers: first 5 = white balls, 6th = powerball (skip Power Play multiplier)
//
// FRAGILE POINT: depends on powerball.com HTML structure.
// If this breaks → check powerball.com and update linkRx / numRx.

async function fetchSourceA() {
  console.log('  [A] powerball.com HTML...');
  const html   = await get('https://www.powerball.com/previous-results');
  const linkRx = /href="\/draw-result\?gc=powerball&(?:amp;)?date=(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)(?=href="|$)/g;
  const draws  = [];
  let m;

  while ((m = linkRx.exec(html)) !== null) {
    const date    = m[1];
    const segment = m[2];
    const nums    = [];
    // Extract 1-2 digit numbers, skip Power Play multipliers (2x 3x 4x 5x 10x)
    const numRx = /\b(\d{1,2})(?!x)\b/g;
    let nm;
    while ((nm = numRx.exec(segment)) !== null) {
      const n = parseInt(nm[1], 10);
      if (n >= 1) nums.push(n);
    }
    if (nums.length >= 6) {
      draws.push(makeCanonical(date, nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]));
    }
  }

  if (draws.length === 0) throw new Error('No draws parsed from HTML');
  console.log(`  [A] ✅ ${draws.length} draws`);
  return draws;
}

// ─── SOURCE B: Texas Lottery CSV ─────────────────────────────────────────────
//
// URL: texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/powerball.csv
//
// CSV format (NO header row):
//   col[0] = "Powerball"   (game name)
//   col[1] = month         (1-12)
//   col[2] = day           (1-31)
//   col[3] = year          (4 digits)
//   col[4] = white ball 1
//   col[5] = white ball 2
//   col[6] = white ball 3
//   col[7] = white ball 4
//   col[8] = white ball 5
//   col[9] = Powerball number  ← quan trọng: index 9, KHÔNG phải index 5
//   col[10]= Power Play multiplier (bỏ qua)
//
// Verified from live CSV: "Powerball,2,3,2010,37,52,22,36,17,24,2"
//   → date=2010-02-03, white=[17,22,36,37,52], pb=24

async function fetchSourceB() {
  console.log('  [B] Texas Lottery CSV...');
  const body  = await get('https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/powerball.csv');
  const lines = body.trim().split('\n');
  const draws = [];

  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim());
    // Need at least 10 columns: [0..3]=header, [4..8]=whites, [9]=pb
    if (cols.length < 10) continue;
    if (cols[0] !== 'Powerball') continue;

    const month = cols[1].padStart(2, '0');
    const day   = cols[2].padStart(2, '0');
    const year  = cols[3];
    const date  = `${year}-${month}-${day}`;

    const w1 = parseInt(cols[4],  10);
    const w2 = parseInt(cols[5],  10);
    const w3 = parseInt(cols[6],  10);
    const w4 = parseInt(cols[7],  10);
    const w5 = parseInt(cols[8],  10);
    const pb = parseInt(cols[9],  10);  // ← col[9], bukan col[5]!

    if ([w1,w2,w3,w4,w5,pb].some(n => isNaN(n) || n <= 0)) continue;
    draws.push(makeCanonical(date, w1, w2, w3, w4, w5, pb));
  }

  if (draws.length === 0) throw new Error('No draws parsed from Texas CSV');
  console.log(`  [B] ✅ ${draws.length} draws (Texas CSV)`);
  return draws;
}

// ─── SOURCE C: magayo.com free API (latest draw only) ────────────────────────
//
// Returns ONE latest draw → merges with existing draws-data.js history.
// Free demo key from magayo public documentation.
// Supports both JSON and XML response formats.

async function fetchSourceC() {
  console.log('  [C] magayo.com API (latest draw only)...');
  const body = await get('https://www.magayo.com/api/results.php?api_key=hXJDjsp8I6RY&game=us_powerball');

  let date, numsStr;
  try {
    const parsed = JSON.parse(body);
    if (parsed.error !== 0) throw new Error(`API error code ${parsed.error}`);
    date    = parsed.draw.substring(0, 10);
    numsStr = parsed.results;
  } catch {
    // XML fallback: <draw>2026-06-24</draw><results>13,14,16,21,38,14</results>
    const dateM = body.match(/<draw>(\d{4}-\d{2}-\d{2})<\/draw>/);
    const numsM = body.match(/<results>([\d,]+)<\/results>/);
    if (!dateM || !numsM) throw new Error('Cannot parse magayo response');
    date    = dateM[1];
    numsStr = numsM[1];
  }

  const nums = numsStr.split(',').map(n => parseInt(n.trim(), 10));
  if (nums.length < 6) throw new Error('Not enough numbers from magayo');

  // nums format from magayo: w1,w2,w3,w4,w5,pb (same as Texas CSV cols 4-9)
  const latest = makeCanonical(date, nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]);
  console.log(`  [C] ✅ Latest draw: ${latest.date} | white:${JSON.stringify(latest.white)} | pb:${latest.powerball}`);

  // Merge with existing history in draws-data.js
  let existing = [];
  try {
    existing = require('./draws-data.js').draws || [];
    console.log(`  [C] Merged with ${existing.length} existing draws`);
  } catch {
    console.log('  [C] No existing draws-data.js — starting fresh');
  }

  if (!existing.find(d => d.date === latest.date)) {
    existing.push(latest);
  }
  return existing;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🎯 EurekaLott — Fetching Powerball draws (3-source fallback)...\n');

  let draws = null, usedSource = null;

  const sources = [
    { name: 'A — powerball.com HTML',  fn: fetchSourceA },
    { name: 'B — Texas Lottery CSV',   fn: fetchSourceB },
    { name: 'C — magayo.com API',      fn: fetchSourceC },
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
    console.error('   Action required: check network or update source URLs/regex.');
    process.exit(1);
  }

  // Deduplicate by date (last-write-wins) + sort ascending (oldest → newest)
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

  console.log(`\n✅ draws-data.js written`);
  console.log(`   Source : ${usedSource}`);
  console.log(`   Total  : ${final.length} draws`);
  console.log(`   Oldest : ${final[0].date}`);
  console.log(`   Newest : ${final[final.length-1].date} | white:${JSON.stringify(final[final.length-1].white)} | pb:${final[final.length-1].powerball}`);
})();
