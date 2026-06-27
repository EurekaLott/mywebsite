/**
 * verify.js
 * Apply EurekaLott Rule to the forecast in forecast-data.js
 * → write verified-data.js
 */

const fs = require('fs');
const { draws: rawDraws } = require('./draws-data.js');
const draws = rawDraws.slice().sort((a, b) => a.date.localeCompare(b.date));

// Đọc forecast-data.js như TEXT THUẦN, không require() — vì file này còn được
// browser load trực tiếp qua <script src="forecast-data.js">, không có module.exports
const forecastText = fs.readFileSync('./forecast-data.js', 'utf8');
const forecastMatch = forecastText.match(/`([\s\S]*?)`/);
const forecast = forecastMatch ? forecastMatch[1] : null;

if (!forecast) {
  console.error('❌ Không tìm thấy nội dung forecast trong forecast-data.js (thiếu cặp dấu ` `)');
  process.exit(1);
}

function all6(draw) {
  return [...draw.white, draw.powerball];
}

function anyHit(draw, signals) {
  const nums = all6(draw);
  return signals.filter(s => nums.includes(s));
}

function parseForecast(raw) {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const [y, m, d] = lines[0].split(/\s+/);
  const finalDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

  const rows = [];
  let latestNumsRef = null;

  for (let i = 1; i < lines.length; i++) {
    const nums = lines[i].split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0);
    if (nums.length !== 9) {
      console.warn(`⚠️  ${finalDate} dòng ${i}: expected 9 numbers, got ${nums.length} — skip dòng này`);
      continue;
    }
    const left  = [nums[0], nums[1]];
    const latestNums = [nums[2], nums[3], nums[4], nums[5], nums[6]];
    const right = [nums[7], nums[8]];

    if (!latestNumsRef) latestNumsRef = latestNums;
    rows.push({ left, right });
  }

  if (rows.length === 0) return null;

  const allSignals = rows.flatMap(r => [...r.left, ...r.right]);

  const latestDraw = draws.find(d =>
    latestNumsRef.length === d.white.length &&
    latestNumsRef.every(n => d.white.includes(n))
  );

  return { finalDate, rows, allSignals, latestDraw };
}

function verify(raw) {
  const f = parseForecast(raw);
  if (!f) return null;

  const { finalDate, rows, allSignals, latestDraw } = f;

  if (!latestDraw) {
    return { finalDate, rows, latestDrawDate: null, status: 'PENDING',
      reason: 'Latest draw not found in draws-data.js', cp1: null, cp2: null, finalDraw: null };
  }

  const after = draws
    .filter(d => d.date > latestDraw.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const cp1Draw = after[0] || null;
  const cp2Draw = after[1] || null;
  const finalDraw = after[2] || null;

  if (!cp1Draw) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'PENDING',
      reason: 'Waiting for CP1 draw', cp1: null, cp2: null, finalDraw: null };
  }

  const cp1Hits = anyHit(cp1Draw, allSignals);
  const cp1 = { date: cp1Draw.date, white: cp1Draw.white, pb: cp1Draw.powerball, hits: cp1Hits };
  if (cp1Hits.length > 0) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'DEAD',
      reason: `Enemy escaped at CP1 (${cp1Draw.date}): signal(s) [${cp1Hits.join(', ')}] appeared`,
      cp1, cp2: null, finalDraw: null };
  }

  if (!cp2Draw) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'PENDING',
      reason: 'Waiting for CP2 draw', cp1, cp2: null, finalDraw: null };
  }

  const cp2Hits = anyHit(cp2Draw, allSignals);
  const cp2 = { date: cp2Draw.date, white: cp2Draw.white, pb: cp2Draw.powerball, hits: cp2Hits };
  if (cp2Hits.length > 0) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'DEAD',
      reason: `Enemy escaped at CP2 (${cp2Draw.date}): signal(s) [${cp2Hits.join(', ')}] appeared`,
      cp1, cp2, finalDraw: null };
  }

  if (!finalDraw) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'PENDING',
      reason: 'Waiting for Final Destination draw', cp1, cp2, finalDraw: null };
  }

  if (finalDraw.date !== finalDate) {
    console.warn(`⚠️  ${finalDate}: expected final on ${finalDate}, actual 3rd draw is ${finalDraw.date}`);
  }

  return {
    finalDate, rows, latestDrawDate: latestDraw.date, status: 'ALIVE',
    reason: `Passed CP1 (${cp1Draw.date}) ✓  Passed CP2 (${cp2Draw.date}) ✓  → Use at Final Destination (${finalDraw.date})`,
    cp1, cp2, finalDraw: { date: finalDraw.date, white: finalDraw.white, pb: finalDraw.powerball },
  };
}

// Chỉ 1 forecast trong file → kết quả là mảng 1 phần tử
const result = verify(forecast);
const results = result ? [result] : [];

const alive   = results.filter(r => r.status === 'ALIVE').length;
const dead    = results.filter(r => r.status === 'DEAD').length;
const pending = results.filter(r => r.status === 'PENDING').length;

console.log('\n📊 EurekaLott Verification Summary');
console.log(`   Total    : ${results.length}`);
console.log(`   🟢 ALIVE  : ${alive}`);
console.log(`   🔴 DEAD   : ${dead}`);
console.log(`   ⏳ PENDING : ${pending}\n`);

results.forEach(r => {
  const icon = r.status === 'ALIVE' ? '🟢' : r.status === 'DEAD' ? '🔴' : '⏳';
  console.log(`   ${icon} ${r.finalDate}`);
  console.log(`      ${r.reason}`);
});

const output =
`// verified-data.js — AUTO-GENERATED by verify.js
// Do not edit manually.
// Last updated: ${new Date().toISOString()}

const verified = ${JSON.stringify(results, null, 2)};

if (typeof module !== 'undefined') module.exports = { verified };
`;

fs.writeFileSync('verified-data.js', output);
console.log(`\n✅ verified-data.js written — ${results.length} forecast(s)`);
