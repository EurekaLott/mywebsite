/**
 * fetch-vietlott.js — EurekaLott
 * Tải kết quả Vietlott (Power 6/55, Mega 6/45, Power 5/35, Keno, Bingo18)
 * trực tiếp từ vietlott.vn (endpoint AjaxPro chính thức).
 *
 * Logic POST + cookie + parse HTML được port lại từ repo tham khảo mã nguồn mở:
 * https://github.com/vietvudanh/vietlott-data
 * (src/vietlott/crawler/...) — chỉ đổi từ Python (requests+BeautifulSoup)
 * sang Node.js thuần (https + regex), không cần cài thêm package nào.
 *
 * Output: vietlott-data.js (browser-compatible, không có module.exports)
 *
 * ⚠️ Ghi chú: vietlott.vn có thể thay đổi cấu trúc HTML/endpoint bất kỳ lúc nào
 * (giống mọi trang chính phủ/nhà nước khác). Nếu script này báo lỗi parse,
 * cần vào https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong xem lại
 * cấu trúc bảng kết quả mới rồi cập nhật hàm parseTable() bên dưới.
 */

const https = require('https');
const fs    = require('fs');

const HEADERS_BASE = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Content-Type': 'text/plain; charset=utf-8',
  'X-AjaxPro-Method': 'ServerSideDrawResult',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://vietlott.vn',
  'Connection': 'keep-alive',
  'Referer': 'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-645',
};

const ORENDER_INFO = {
  ExtraParam1: '', ExtraParam2: '', ExtraParam3: '',
  FullPageAlias: null, IsPageDesign: false,
  OrgPageAlias: null, PageAlias: null, RefKey: null,
  SiteAlias: 'main.vi', SiteId: 'main.frontend.vi',
  SiteLang: 'vi', SiteName: 'Vietlott', SiteURL: '',
  System: 1, UserSessionId: '', WebPage: null,
};

/* ── HTTP HELPERS (chỉ dùng module có sẵn của Node) ── */
function getRaw(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': HEADERS_BASE['User-Agent'] },
      timeout: 15000,
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function postJson(url, bodyObj, cookie) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(bodyObj);
    const headers = { ...HEADERS_BASE, 'Content-Length': Buffer.byteLength(payload) };
    if (cookie) headers['Cookie'] = cookie;
    const req = https.request(url, { method: 'POST', headers, timeout: 20000 }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`JSON parse fail (status ${res.statusCode}): ${body.slice(0,200)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

/* ── LẤY COOKIE PHIÊN (giống get_vietlott_cookie() trong repo gốc) ── */
async function getVietlottCookie() {
  const text = await getRaw('https://vietlott.vn/ajaxpro/');
  const m = text.match(/document\.cookie="(.*?)"/);
  if (!m) throw new Error('Không lấy được cookie từ vietlott.vn/ajaxpro/ (site có thể đã đổi cấu trúc)');
  return m[1];
}

/* ── MINI HTML PARSER (regex-based, thay cho BeautifulSoup) ── */
function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}
function extractRows(html) {
  const out = []; const re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi; let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
function extractCells(trHtml) {
  const out = []; const re = /<td[^>]*>([\s\S]*?)<\/td>/gi; let m;
  while ((m = re.exec(trHtml))) out.push(m[1]);
  return out;
}
function extractSpanNumbers(html) {
  const out = []; const re = /<span[^>]*>([\s\S]*?)<\/span>/gi; let m;
  while ((m = re.exec(html))) {
    const t = stripTags(m[1]);
    if (t && t !== '|') out.push(parseInt(t, 10));
  }
  return out.filter(n => !isNaN(n));
}
function extractLinkTexts(html) {
  const out = []; const re = /<a[^>]*>([\s\S]*?)<\/a>/gi; let m;
  while ((m = re.exec(html))) out.push(stripTags(m[1]));
  return out;
}
function toISODate(ddmmyyyy) {
  const m = ddmmyyyy.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}

/* ── PARSE BẢNG KẾT QUẢ CHUẨN (655 / 645 / 535) ──
   cột 0: ngày (dd/mm/yyyy), cột 1: kỳ quay (id), cột 2: các số (span, cách nhau "|") */
function parseStandardTable(html) {
  const rows = extractRows(html);
  const out = [];
  rows.forEach((tr, i) => {
    if (i === 0) return; // header
    const tds = extractCells(tr);
    if (tds.length < 3) return;
    const date = toISODate(stripTags(tds[0]));
    const id = stripTags(tds[1]);
    const numbers = extractSpanNumbers(tds[2]);
    if (date && numbers.length) out.push({ date, id, numbers });
  });
  return out;
}

/* ── PARSE KENO ── cột 0: <a>ngày</a><a>kỳ</a>, cột 1: số, cột 2: to/nhỏ, cột 3: chẵn/lẻ */
function parseKenoTable(html) {
  const rows = extractRows(html);
  const out = [];
  rows.forEach((tr, i) => {
    if (i === 0) return;
    const tds = extractCells(tr);
    if (tds.length < 2) return;
    const links = extractLinkTexts(tds[0]);
    if (links.length < 2) return;
    const date = toISODate(links[0]);
    const id = links[1];
    const numbers = extractSpanNumbers(tds[1]);
    const bigSmall = tds[2] ? stripTags(tds[2]) : '';
    const oddEven = tds[3] ? stripTags(tds[3]) : '';
    if (date && numbers.length) out.push({ date, id, numbers, bigSmall, oddEven });
  });
  return out;
}

/* ── PARSE BINGO18 ── cột 0: <a>ngày</a><a>#kỳ</a>, cột 1: 3 số, cột 2: tổng, cột 3: to/nhỏ */
function parseBingo18Table(html) {
  const rows = extractRows(html);
  const out = [];
  rows.forEach((tr, i) => {
    if (i === 0) return;
    const tds = extractCells(tr);
    if (tds.length < 4) return;
    const links = extractLinkTexts(tds[0]);
    if (links.length < 2) return;
    const date = toISODate(links[0]);
    const id = links[1].replace('#', '');
    const numbers = extractSpanNumbers(tds[1]);
    const total = parseInt(stripTags(tds[2]), 10);
    const largeSmall = stripTags(tds[3]);
    if (date && numbers.length === 3) out.push({ date, id, numbers, total: isNaN(total) ? numbers.reduce((a,b)=>a+b,0) : total, largeSmall });
  });
  return out;
}

/* ── CẤU HÌNH 5 SẢN PHẨM (đúng Key/URL/body từ repo gốc) ── */
function buildProducts(cookie) {
  return {
    power655: {
      label: 'Power 6/55',
      url: 'https://vietlott.vn/ajaxpro/Vietlott.PlugIn.WebParts.Game655CompareWebPart,Vietlott.PlugIn.WebParts.ashx',
      body: { ORenderInfo: ORENDER_INFO, Key: '23bbd667', GameDrawId: '', ArrayNumbers: Array.from({length:5},()=>Array(18).fill('')), CheckMulti: false, PageIndex: 0 },
      parser: parseStandardTable,
    },
    power645: {
      label: 'Mega 6/45',
      url: 'https://vietlott.vn/ajaxpro/Vietlott.PlugIn.WebParts.Game645CompareWebPart,Vietlott.PlugIn.WebParts.ashx',
      body: { ORenderInfo: ORENDER_INFO, Key: '8290fce2', GameDrawId: '', ArrayNumbers: Array.from({length:6},()=>Array(18).fill('')), CheckMulti: false, PageIndex: 0 },
      parser: parseStandardTable,
    },
    power535: {
      label: 'Power 5/35',
      url: 'https://vietlott.vn/ajaxpro/Vietlott.PlugIn.WebParts.Game535CompareWebPart,Vietlott.PlugIn.WebParts.ashx',
      body: { ORenderInfo: ORENDER_INFO, Key: 'd0ea794f', GameDrawId: '', ArrayNumbers: Array.from({length:5},()=>Array(35).fill('')), CheckMulti: false, PageIndex: 0 },
      parser: parseStandardTable,
    },
    keno: {
      label: 'Keno',
      url: 'https://vietlott.vn/ajaxpro/Vietlott.PlugIn.WebParts.GameKenoCompareWebPart,Vietlott.PlugIn.WebParts.ashx',
      body: { DrawDate: '', GameDrawNo: '', GameId: '6', ORenderInfo: ORENDER_INFO, OddEven: 2, PageIndex: 1, ProcessType: 0, TotalRow: 112453, UpperLower: 2, number: '' },
      parser: parseKenoTable,
    },
    bingo18: {
      label: 'Bingo18',
      url: 'https://vietlott.vn/ajaxpro/Vietlott.PlugIn.WebParts.GameBingoCompareWebPart,Vietlott.PlugIn.WebParts.ashx',
      body: { ORenderInfo: ORENDER_INFO, GameId: '8', GameDrawNo: '', number: '', DrawDate: '', PageIndex: 1, TotalRow: 43569 },
      parser: parseBingo18Table,
    },
  };
}

(async () => {
  console.log('\n🇻🇳 EurekaLott — Fetching Vietlott draws (power655/645/535, keno, bingo18)...\n');

  let cookie;
  try {
    cookie = await getVietlottCookie();
    console.log(' [C] ✅ Session cookie obtained');
  } catch (err) {
    console.error('❌ Failed to get cookie:', err.message);
    process.exit(1);
  }

  const products = buildProducts(cookie);
  const result = {};
  let anySuccess = false;

  for (const [key, cfg] of Object.entries(products)) {
    try {
      const json = await postJson(cfg.url, cfg.body, cookie);
      const html = (json && json.value && (json.value.HtmlContent || json.value)) || '';
      const rows = cfg.parser(typeof html === 'string' ? html : '');
      rows.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
      result[key] = rows;
      anySuccess = rows.length > 0;
      console.log(` [✓] ${cfg.label.padEnd(12)} → ${rows.length} draws parsed`);
    } catch (err) {
      console.error(` [x] ${cfg.label.padEnd(12)} → FAILED: ${err.message}`);
      result[key] = null; // giữ null để front-end biết là "chưa cào được", không phải "0 kết quả"
    }
  }

  if (!anySuccess) {
    console.error('\n❌ Không sản phẩm nào cào được — có thể vietlott.vn đã đổi cấu trúc endpoint/HTML.');
    process.exit(1);
  }

  const json = JSON.stringify(result, null, 2);
  fs.writeFileSync('vietlott-data.js',
`// vietlott-data.js — AUTO-GENERATED by fetch-vietlott.js
// Do not edit manually.
// Source: vietlott.vn (official AjaxPro endpoint)
// Last updated: ${new Date().toISOString()}
// Mỗi sản phẩm: { date, id, numbers[], ... } — numbers[] là RAW ORDER hiển thị trên vietlott.vn
// null nghĩa là lần cào gần nhất bị lỗi (site đổi cấu trúc) — giữ nguyên dữ liệu cũ nếu có

const vietlottData = ${json};

// End of vietlott-data.js
`);

  console.log(`\n✅ vietlott-data.js written`);
  for (const [key, rows] of Object.entries(result)) {
    console.log(`   ${key.padEnd(10)}: ${rows ? rows.length + ' draws' : 'FAILED (kept null)'}`);
  }
  console.log('\n⚠️  No module.exports — browser compatible only\n');
})();
