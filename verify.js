/**
 * verify.js
 * Apply EurekaLott Rule to the forecast in forecast-data.js
 * → write verified-data.js
 *
 * ⚔️ BẢN CỨNG CÁP HƠN — không bao giờ làm crash toàn bộ workflow nữa,
 * dù forecast-data.js trống / hỏng / thiếu dòng LATEST. Nếu forecast
 * không có dòng LATEST hợp lệ, tự động lấy kỳ quay GẦN NHẤT trong
 * draws-data.js (nguồn Texas Lottery) làm mốc — không cần nhập tay nữa.
 */

const fs = require('fs');

let draws = [];
try {
  const { draws: rawDraws } = require('./draws-data.js');
  draws = (rawDraws || []).slice().sort((a, b) => a.date.localeCompare(b.date));
} catch (err) {
  console.error('⚠️  Không đọc được draws-data.js:', err.message);
}

function all6(draw) {
  return [...draw.white, draw.powerball];
}

function anyHit(draw, signals) {
  const nums = all6(draw);
  return signals.filter(s => nums.includes(s));
}

function parseForecast(raw) {
  const lines = raw.trim().split(/\r?\n/).map(x => x.trim()).filter(x => x !== "");
  if (!lines.length) return null;

  const finalDate = lines[0].replace(/ /g, "-");
  const rows = [];
  let mode = "";
  let latestCode = "";

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "LATEST") { latestCode = lines[++i] || ""; continue; }
    if (line === "LEFT") { mode = "LEFT"; continue; }
    if (line === "RIGHT") { mode = "RIGHT"; continue; }

    const nums = line.split(/\s+/).map(Number);
    if (nums.length !== 4) continue;

    if (mode === "LEFT") rows.push({ side: "LEFT", latestPair: [nums[2], nums[3]], ai: [nums[0], nums[1]] });
    if (mode === "RIGHT") rows.push({ side: "RIGHT", latestPair: [nums[0], nums[1]], ai: [nums[2], nums[3]] });
  }

  if (rows.length === 0) return null;
  const allSignals = rows.flatMap(r => r.ai);
  return { finalDate, rows, allSignals, latestCode };
}

function resolveLatestDraw(latestCode) {
  // ⚔️ Ưu tiên: nếu forecast có dòng LATEST hợp lệ và khớp với 1 kỳ quay
  // thật trong draws-data.js → dùng kỳ đó.
  if (latestCode) {
    const nums = latestCode.match(/\d{2}/g);
    if (nums) {
      const arr = nums.map(Number);
      const found = draws.find(d => d.white.length === arr.length && arr.every(n => d.white.includes(n)));
      if (found) return found;
    }
  }
  // ⚔️ Không có / không khớp → tự động lấy kỳ quay MỚI NHẤT trong
  // draws-data.js (nguồn Texas Lottery) làm mốc — khỏi cần nhập tay.
  return draws.length ? draws[draws.length - 1] : null;
}

function verify(raw) {
  const f = parseForecast(raw);
  if (!f) return null;

  const { finalDate, rows, allSignals, latestCode } = f;
  const latestDraw = resolveLatestDraw(latestCode);

  if (!latestDraw) {
    return { finalDate, rows, status: 'PENDING', reason: 'Chưa có dữ liệu draws-data.js', cp1: null, cp2: null, finalDraw: null };
  }

  const after = draws.filter(d => d.date > latestDraw.date).sort((a, b) => a.date.localeCompare(b.date));
  const cp1Draw = after[0] || null;
  const cp2Draw = after[1] || null;
  const finalDraw = after[2] || null;

  if (!cp1Draw) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'PENDING', reason: 'Waiting for CP1 draw', cp1: null, cp2: null, finalDraw: null };
  }
  const cp1Hits = anyHit(cp1Draw, allSignals);
  const cp1 = { date: cp1Draw.date, white: cp1Draw.white, pb: cp1Draw.powerball, hits: cp1Hits };
  if (cp1Hits.length > 0) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'DEAD',
      reason: `Enemy escaped at CP1 (${cp1Draw.date}): signal(s) [${cp1Hits.join(', ')}] appeared`, cp1, cp2: null, finalDraw: null };
  }

  if (!cp2Draw) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'PENDING', reason: 'Waiting for CP2 draw', cp1, cp2: null, finalDraw: null };
  }
  const cp2Hits = anyHit(cp2Draw, allSignals);
  const cp2 = { date: cp2Draw.date, white: cp2Draw.white, pb: cp2Draw.powerball, hits: cp2Hits };
  if (cp2Hits.length > 0) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'DEAD',
      reason: `Enemy escaped at CP2 (${cp2Draw.date}): signal(s) [${cp2Hits.join(', ')}] appeared`, cp1, cp2, finalDraw: null };
  }

  if (!finalDraw) {
    return { finalDate, rows, latestDrawDate: latestDraw.date, status: 'PENDING', reason: 'Waiting for Final Destination draw', cp1, cp2, finalDraw: null };
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

let results = [];
try {
  const forecastText = fs.readFileSync('./forecast-data.js', 'utf8');
  const forecastMatch = forecastText.match(/`([\s\S]*?)`/);
  const forecast = forecastMatch ? forecastMatch[1] : null;
  if (forecast && forecast.trim()) {
    const result = verify(forecast);
    if (result) results = [result];
  } else {
    console.log('ℹ️  forecast-data.js trống — bỏ qua, không lỗi (feature Powerball Prediction hiện không hoạt động).');
  }
} catch (err) {
  console.error('⚠️  Lỗi khi xử lý forecast-data.js (bỏ qua, không làm hỏng cả workflow):', err.message);
}

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
