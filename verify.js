/**
 * verify.js
 * Apply EurekaLott Rule to each forecast in forecast-data.js
 * → write verified-data.js
 *
 * ═══════════════════════════════════════════════════════
 * EUREKALOTT RULE (from website):
 *
 *   Latest Draw  : reference draw AI used to generate signals (NOT for playing)
 *   Checkpoint 1 : 1st draw AFTER Latest Draw  (by draw ORDER)
 *   Checkpoint 2 : 2nd draw AFTER Latest Draw  (by draw ORDER)
 *   Final Dest.  : 3rd draw AFTER Latest Draw  (by draw ORDER) ← entry.date on website
 *
 *   At CP1 & CP2:
 *     Check ALL 6 numbers (5 white + 1 powerball)
 *     against ALL signals (LEFT + RIGHT combined).
 *     If ANY signal appears → DEAD (enemy escaped, plan cancelled).
 *
 *   At Final Destination:
 *     Passed CP1 + CP2 with no hits → ALIVE (customer can use).
 *
 * NOTE: Uses draw ORDER, not calendar distance.
 *   Robust against schedule changes, holidays, special draws.
 * ═══════════════════════════════════════════════════════
 *
 * forecast-data.js format (one entry):
 *
 *   `2026 06 22
 *    20 15  25 55 57 60 62  23 32`
 *
 *   Line 1 : Final Destination date  (YYYY MM DD)
 *   Line 2 : LEFT[0] LEFT[1]  WHITE[1..5]  RIGHT[0] RIGHT[1]
 *            (the 5 whites are from the Latest Draw used by AI)
 */

const fs = require('fs');
const { draws: rawDraws } = require('./draws-data.js');
// verify.js tự sort — không phụ thuộc thứ tự từ draws-data.js
const draws = rawDraws.slice().sort((a, b) => a.date.localeCompare(b.date));
const { forecasts } = require('./forecast-data.js');

// ─── helpers ────────────────────────────────────────────────────────────────

function all6(draw) {
  return [...draw.white, draw.powerball];
}

function anyHit(draw, signals) {
  const nums = all6(draw);
  return signals.filter(s => nums.includes(s));
}

// ─── parse one raw forecast string ──────────────────────────────────────────

function parseForecast(raw) {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // Line 1: Final Destination date
  const [y, m, d] = lines[0].split(/\s+/);
  const finalDate  = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;

  // Line 2: 9 numbers — LEFT[2]  WHITES[5]  RIGHT[2]
  const nums = lines[1].split(/\s+/).map(Number).filter(n => n > 0);
  if (nums.length !== 9) {
    console.warn(`⚠️  ${finalDate}: expected 9 numbers on line 2, got ${nums.length} — skipping`);
    return null;
  }

  const left       = [nums[0], nums[1]];
  const latestNums = [nums[2], nums[3], nums[4], nums[5], nums[6]]; // 5 whites of Latest Draw
  const right      = [nums[7], nums[8]];
  const allSignals = [...left, ...right]; // check both sides at checkpoints

  // Find Latest Draw by matching its 5 white balls
  const latestDraw = draws.find(d =>
    latestNums.length === d.white.length &&
    latestNums.every(n => d.white.includes(n))
  );

  return { finalDate, left, right, allSignals, latestNums, latestDraw };
}

// ─── verify one forecast ─────────────────────────────────────────────────────

function verify(raw) {
  const f = parseForecast(raw);
  if (!f) return null;

  const { finalDate, left, right, allSignals, latestDraw } = f;

  // ── Latest Draw not found yet ──
  if (!latestDraw) {
    return {
      finalDate, left, right,
      latestDrawDate: null,
      status: 'PENDING',
      reason: 'Latest draw not found in draws-data.js',
      cp1: null, cp2: null, finalDraw: null,
    };
  }

  // All draws AFTER latestDraw, sorted by draw ORDER (ascending)
  const after = draws
    .filter(d => d.date > latestDraw.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const cp1Draw   = after[0] || null;
  const cp2Draw   = after[1] || null;
  const finalDraw = after[2] || null;

  // ── CP1 ──
  if (!cp1Draw) {
    return { finalDate, left, right, latestDrawDate: latestDraw.date,
      status: 'PENDING', reason: 'Waiting for CP1 draw', cp1: null, cp2: null, finalDraw: null };
  }

  const cp1Hits = anyHit(cp1Draw, allSignals);
  const cp1 = { date: cp1Draw.date, white: cp1Draw.white, pb: cp1Draw.powerball, hits: cp1Hits };

  if (cp1Hits.length > 0) {
    return {
      finalDate, left, right, latestDrawDate: latestDraw.date,
      status: 'DEAD',
      reason: `Enemy escaped at CP1 (${cp1Draw.date}): signal(s) [${cp1Hits.join(', ')}] appeared`,
      cp1, cp2: null, finalDraw: null,
    };
  }

  // ── CP2 ──
  if (!cp2Draw) {
    return { finalDate, left, right, latestDrawDate: latestDraw.date,
      status: 'PENDING', reason: 'Waiting for CP2 draw', cp1, cp2: null, finalDraw: null };
  }

  const cp2Hits = anyHit(cp2Draw, allSignals);
  const cp2 = { date: cp2Draw.date, white: cp2Draw.white, pb: cp2Draw.powerball, hits: cp2Hits };

  if (cp2Hits.length > 0) {
    return {
      finalDate, left, right, latestDrawDate: latestDraw.date,
      status: 'DEAD',
      reason: `Enemy escaped at CP2 (${cp2Draw.date}): signal(s) [${cp2Hits.join(', ')}] appeared`,
      cp1, cp2, finalDraw: null,
    };
  }

  // ── Final Destination ──
  if (!finalDraw) {
    return { finalDate, left, right, latestDrawDate: latestDraw.date,
      status: 'PENDING', reason: 'Waiting for Final Destination draw', cp1, cp2, finalDraw: null };
  }

  if (finalDraw.date !== finalDate) {
    console.warn(`⚠️  ${finalDate}: expected final on ${finalDate}, actual 3rd draw is ${finalDraw.date}`);
  }

  return {
    finalDate, left, right, latestDrawDate: latestDraw.date,
    status: 'ALIVE',
    reason: `Passed CP1 (${cp1Draw.date}) ✓  Passed CP2 (${cp2Draw.date}) ✓  → Use at Final Destination (${finalDraw.date})`,
    cp1, cp2,
    finalDraw: { date: finalDraw.date, white: finalDraw.white, pb: finalDraw.powerball },
  };
}

// ─── run all forecasts ───────────────────────────────────────────────────────

const results = forecasts
  .map(raw => verify(raw))
  .filter(Boolean)
  .sort((a, b) => b.finalDate.localeCompare(a.finalDate)); // newest first

// ─── summary ─────────────────────────────────────────────────────────────────

const alive   = results.filter(r => r.status === 'ALIVE').length;
const dead    = results.filter(r => r.status === 'DEAD').length;
const pending = results.filter(r => r.status === 'PENDING').length;

console.log('\n📊 EurekaLott Verification Summary');
console.log(`   Total    : ${results.length}`);
console.log(`   🟢 ALIVE  : ${alive}   (passed all checkpoints — customer can use)`);
console.log(`   🔴 DEAD   : ${dead}   (enemy escaped at CP1 or CP2 — RAW only)`);
console.log(`   ⏳ PENDING : ${pending}   (draws not yet available)`);
console.log('');

results.forEach(r => {
  const icon = r.status === 'ALIVE' ? '🟢' : r.status === 'DEAD' ? '🔴' : '⏳';
  console.log(`   ${icon} ${r.finalDate}  L:[${r.left}]  R:[${r.right}]`);
  console.log(`      ${r.reason}`);
});

// ─── write verified-data.js ──────────────────────────────────────────────────

const output =
`// verified-data.js — AUTO-GENERATED by verify.js
// Do not edit manually.
// Last updated: ${new Date().toISOString()}
//
// status:
//   ALIVE   → passed CP1 + CP2 → customer can use at Final Destination
//   DEAD    → signal hit at CP1 or CP2 → display as RAW only (chiêm nghiệm)
//   PENDING → draws not yet available

const verified = ${JSON.stringify(results, null, 2)};

if (typeof module !== 'undefined') module.exports = { verified };
`;

fs.writeFileSync('verified-data.js', output);
console.log(`\n✅ verified-data.js written — ${results.length} forecast(s)`);
