/**
 * fetch-vietlott.js — EurekaLott
 * ============================================================
 * PHIÊN BẢN MỚI — bỏ hẳn việc gọi trực tiếp AjaxPro của vietlott.vn
 * (quá dễ vỡ: phụ thuộc cookie phiên + Key nội bộ + cấu trúc HTML
 * riêng của site chính phủ, đổi bất kỳ lúc nào là toang cả pipeline).
 *
 * NGUỒN CHÍNH (PRIMARY):
 *   GitHub repo vietvudanh/vietlott-data — tự động crawl vietlott.vn
 *   hằng ngày qua GitHub Actions, lưu JSONL rất sạch, đã verify khớp
 *   dữ liệu 1-1 với vietlott.vn / Minh Ngọc.
 *     https://raw.githubusercontent.com/vietvudanh/vietlott-data/main/data/<product>.jsonl
 *
 * NGUỒN DỰ PHÒNG (FALLBACK) — chỉ khi GitHub fail/trả về 0 dòng:
 *   Minh Ngọc (minhngoc.net.vn) — chỉ có Power 6/55 và Mega 6/45,
 *   không có Power 5/35 / Keno / Bingo18 nên 3 sản phẩm đó KHÔNG có
 *   fallback (giữ nguyên hành vi cũ: null nếu cả GitHub cũng fail).
 *
 * Output: vietlott-data.js (browser-compatible, không có module.exports)
 * ============================================================
 */

const https = require('https');
const fs    = require('fs');

/* ── HTTP GET đơn giản, theo redirect, có timeout ── */
function get(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EurekaLott-Bot/1.0)',
        'Accept': '*/*',
        ...extraHeaders,
      },
      timeout: 20000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location, extraHeaders).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} — ${url}`));
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout — ${url}`)); });
  });
}

/* ── PRIMARY: GitHub vietvudanh/vietlott-data (JSONL) ──
   Mỗi dòng: {"date":"2026-07-25","id":"01376","result":[5,9,27,33,37,50,48],"process_time":"..."}
   → chuẩn hoá về { date, id, numbers } giống schema cũ để không phải sửa gì ở front-end. */
const GITHUB_BASE = 'https://raw.githubusercontent.com/vietvudanh/vietlott-data/main/data';

async function fetchFromGithub(fileName) {
  const url = `${GITHUB_BASE}/${fileName}.jsonl`;
  const body = await get(url);
  const lines = body.trim().split('\n').filter(Boolean);
  const rows = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (!obj.date || !Array.isArray(obj.result)) continue;
      rows.push({ date: obj.date, id: obj.id || '', numbers: obj.result });
    } catch { /* dòng lỗi thì bỏ qua, không chết cả file */ }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  return rows;
}

/* ── FALLBACK: Minh Ngọc (chỉ Power 6/55 & Mega 6/45) ──
   Trang danh sách (10 kỳ gần nhất) chứa các khối lặp lại dạng:
     ... Kỳ vé: #01375 | Ngày quay thưởng 23/07/2026 ...
     ... 01  03  08  38  40  55  36 ...
     ... (bảng "Giải thưởng" ngay sau, dùng làm điểm chặn cuối khối số) ...
   Không phụ thuộc tên thẻ HTML cụ thể (dễ đổi) — chỉ dựa vào 2 mốc text
   cố định "Kỳ vé:" và "Giải thưởng" để cắt khối, sau đó rip toàn bộ
   số 2 chữ số (00-99) nằm giữa 2 mốc đó làm kết quả quay. */
const MINHNGOC_URLS = {
  power655: 'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/power-6x55.html',
  power645: 'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/mega-6x45.html',
};

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseMinhNgocListing(html) {
  const out = [];
  // Cắt file thành từng khối, mỗi khối bắt đầu tại "Kỳ vé:"
  const blocks = html.split(/Kỳ vé\s*:/i).slice(1);
  for (const blockRaw of blocks) {
    // chỉ lấy phần trước bảng "Giải thưởng" (nếu có), tránh dính số tiền giải thưởng
    const cutIdx = blockRaw.search(/Giải thưởng/i);
    const block = cutIdx > -1 ? blockRaw.slice(0, cutIdx) : blockRaw.slice(0, 2000);

    const dateMatch = block.match(/Ngày quay thưởng\D*(\d{2})\/(\d{2})\/(\d{4})/i);
    const idMatch = block.match(/#?\s*(\d{4,6})/);
    if (!dateMatch) continue;

    const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    const id = idMatch ? idMatch[1] : '';

    // Phần sau ngày quay thưởng mới chứa dàn số kết quả (tránh nhầm với số kỳ vé)
    const afterDate = block.slice(block.indexOf(dateMatch[0]) + dateMatch[0].length);
    const text = stripTags(afterDate);
    const numbers = (text.match(/\b\d{1,2}\b/g) || [])
      .map(n => parseInt(n, 10))
      .filter(n => n >= 0 && n <= 55);

    if (numbers.length >= 5) {
      out.push({ date, id, numbers });
    }
  }
  return out;
}

async function fetchFromMinhNgoc(product) {
  const url = MINHNGOC_URLS[product];
  if (!url) return [];
  const html = await get(url, {
    'Accept-Language': 'vi-VN,vi;q=0.9',
    'Referer': 'https://www.minhngoc.net.vn/',
  });
  const rows = parseMinhNgocListing(html);
  rows.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  return rows;
}

/* ── CẤU HÌNH 5 SẢN PHẨM ──
   ⚠️ Keno & Bingo18 quay NHIỀU LẦN/NGÀY suốt nhiều năm → hàng chục nghìn
   dòng, file JS nặng tới ~35MB nếu giữ full lịch sử. Vì front-end chỉ cần
   hiển thị tham khảo (không dùng cho EurekaLott Rule — chỉ Powerball Mỹ
   mới dùng), nên giới hạn `limit` = chỉ giữ N kỳ GẦN NHẤT sau khi sort. */
const PRODUCTS = {
  power655: { label: 'Power 6/55', githubFile: 'power655', hasFallback: true,  limit: null },
  power645: { label: 'Mega 6/45',  githubFile: 'power645', hasFallback: true,  limit: null },
  power535: { label: 'Power 5/35', githubFile: 'power535', hasFallback: false, limit: null },
  keno:     { label: 'Keno',       githubFile: 'keno',      hasFallback: false, limit: 30 },
  bingo18:  { label: 'Bingo18',    githubFile: 'bingo18',   hasFallback: false, limit: 30 },
};

function applyLimit(rows, limit) {
  if (!limit || rows.length <= limit) return rows;
  return rows.slice(-limit); // rows đã sort tăng dần theo date → lấy N phần tử cuối = N kỳ gần nhất
}

(async () => {
  console.log('\n🇻🇳 EurekaLott — Fetching Vietlott draws...');
  console.log('   Primary  : GitHub vietvudanh/vietlott-data (JSONL)');
  console.log('   Fallback : Minh Ngọc — chỉ Power 6/55 & Mega 6/45\n');

  const result = {};
  let anySuccess = false;

  for (const [key, cfg] of Object.entries(PRODUCTS)) {
    // 1) Thử nguồn chính: GitHub
    try {
      let rows = await fetchFromGithub(cfg.githubFile);
      if (rows.length > 0) {
        const total = rows.length;
        rows = applyLimit(rows, cfg.limit);
        result[key] = rows;
        anySuccess = true;
        const limitNote = cfg.limit ? ` (giữ ${rows.length}/${total} kỳ gần nhất)` : '';
        console.log(` [✓] ${cfg.label.padEnd(12)} → ${rows.length} draws (GitHub)${limitNote}`);
        continue;
      }
      console.warn(` [!] ${cfg.label.padEnd(12)} → GitHub trả về 0 dòng, thử fallback...`);
    } catch (err) {
      console.warn(` [!] ${cfg.label.padEnd(12)} → GitHub FAILED (${err.message}), thử fallback...`);
    }

    // 2) GitHub fail → thử fallback (nếu sản phẩm này có hỗ trợ)
    if (cfg.hasFallback) {
      try {
        let rows = await fetchFromMinhNgoc(key);
        if (rows.length > 0) {
          rows = applyLimit(rows, cfg.limit);
          result[key] = rows;
          anySuccess = true;
          console.log(` [✓] ${cfg.label.padEnd(12)} → ${rows.length} draws (Minh Ngọc — FALLBACK)`);
          continue;
        }
        console.error(` [x] ${cfg.label.padEnd(12)} → Fallback Minh Ngọc cũng trả về 0 dòng`);
      } catch (err) {
        console.error(` [x] ${cfg.label.padEnd(12)} → Fallback Minh Ngọc FAILED: ${err.message}`);
      }
    } else {
      console.error(` [x] ${cfg.label.padEnd(12)} → Không có fallback cho sản phẩm này`);
    }

    // 3) Cả 2 đều fail → giữ null (front-end hiểu là "chưa cào được", không phải "0 kết quả")
    result[key] = null;
  }

  if (!anySuccess) {
    console.error('\n❌ Không sản phẩm nào cào được từ cả GitHub lẫn Minh Ngọc.');
    process.exit(1);
  }

  const json = JSON.stringify(result, null, 2);
  fs.writeFileSync('vietlott-data.js',
`// vietlott-data.js — AUTO-GENERATED by fetch-vietlott.js
// Do not edit manually.
// Primary source : GitHub vietvudanh/vietlott-data (JSONL, cập nhật hằng ngày)
// Fallback source: Minh Ngọc (minhngoc.net.vn) — chỉ power655 & power645
// Last updated: ${new Date().toISOString()}
// Mỗi sản phẩm: { date, id, numbers[] } — numbers[] RAW ORDER
// null nghĩa là cả 2 nguồn đều lỗi lần cào gần nhất — giữ nguyên dữ liệu cũ nếu có

const vietlottData = ${json};

// End of vietlott-data.js
`);

  console.log(`\n✅ vietlott-data.js written`);
  for (const [key, rows] of Object.entries(result)) {
    console.log(`   ${key.padEnd(10)}: ${rows ? rows.length + ' draws' : 'FAILED (kept null)'}`);
  }
  console.log('\n⚠️  No module.exports — browser compatible only\n');
})();
