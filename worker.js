/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * Nguồn: xosominhngoc.net.vn
 * - /api/keno-live    → trang /keno (11 kỳ gần nhất) — dùng để hiển thị
 *   "Latest Draw" + bảng Recent Draws, refresh nhanh.
 * - /api/keno-copy24  → trang /kqxs-keno-ngay-DD-MM-YYYY (TOÀN BỘ kỳ
 *   trong ngày, ~72-119 kỳ/ngày) — dùng riêng cho nút "Copy 24 Draws",
 *   vì cần đủ độ sâu lịch sử để lùi 3 kỳ rồi lấy 24 kỳ liền trước, mà
 *   trang /keno chỉ có 11 kỳ (không đủ).
 * ============================================================
 */

const KENO_LIVE_URL = 'https://xosominhngoc.net.vn/keno';

const KENO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache',
};

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

/* ── PARSER dùng chung cho cả trang /keno lẫn trang /kqxs-keno-ngay-... ──
   (2 trang có cùng cấu trúc lặp lại "Kỳ QSMT: #xxxxx ... Ngày DD/MM/YYYY
   ... 20 số"). Dùng thuật toán "cửa sổ trượt" để tự tìm đúng 20 số liền
   nhau hợp lệ (1-80, không trùng) ngay sau mốc ngày tháng, bỏ qua rác xen
   giữa (id trang, class name còn sót, số điểm thưởng...). */
function parseKenoBlocks(html) {
  const out = [];
  const blocks = html.split(/Kỳ QSMT\s*:/i).slice(1);

  for (const blockRaw of blocks) {
    const block = blockRaw.slice(0, 3000);
    const idMatch = block.match(/#\s*(\d{5,8})/);
    const dateMatch = block.match(/Ng[àa]y.*?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (!idMatch || !dateMatch) continue;

    const id = idMatch[1]; // giữ dạng số thuần "0289816" (không có #) để dễ so sánh
    const date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;

    const rawAfterDate = block.slice(block.indexOf(dateMatch[0]) + dateMatch[0].length);
    const textAfterDate = stripTags(rawAfterDate);
    const rawNumbers = textAfterDate.match(/\b\d{1,2}\b/g);
    if (!rawNumbers) continue;

    let bestSequence = [];
    for (let i = 0; i < rawNumbers.length; i++) {
      let tempSeq = [];
      for (let j = i; j < rawNumbers.length; j++) {
        const n = parseInt(rawNumbers[j], 10);
        if (n >= 1 && n <= 80 && !tempSeq.includes(n)) {
          tempSeq.push(n);
          if (tempSeq.length === 20) break;
        } else break;
      }
      if (tempSeq.length === 20) { bestSequence = tempSeq; break; }
    }

    if (bestSequence.length === 20) {
      bestSequence.sort((a, b) => a - b);
      out.push({ id, date, numbers: bestSequence });
    }
  }
  return out;
}

/* ── Ngày giờ Việt Nam (UTC+7) — Cloudflare Worker chạy giờ UTC mặc định ── */
function vnDateParts(offsetDays = 0) {
  const nowUTC = new Date();
  const vnMs = nowUTC.getTime() + 7 * 3600 * 1000 + offsetDays * 86400 * 1000;
  const vn = new Date(vnMs);
  return {
    dd: String(vn.getUTCDate()).padStart(2, '0'),
    mm: String(vn.getUTCMonth() + 1).padStart(2, '0'),
    yyyy: vn.getUTCFullYear(),
  };
}
function vnDateUrlSuffix(offsetDays = 0) {
  const { dd, mm, yyyy } = vnDateParts(offsetDays);
  return `${dd}-${mm}-${yyyy}`;
}

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

/* ── HANDLER: /api/keno-live — 11 kỳ gần nhất, cho hiển thị "Latest Draw" ── */
async function handleKenoLive() {
  try {
    const res = await fetch(KENO_LIVE_URL, { headers: KENO_HEADERS, cf: { cacheTtl: 0 } });
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: `xosominhngoc.net.vn trả về HTTP ${res.status}` }), { status: 502, headers: jsonHeaders });
    }
    const html = await res.text();
    const rows = parseKenoBlocks(html).map(r => ({ ...r, id: '#' + r.id }));

    if (rows.length === 0) {
      const anchorIdx = html.indexOf('QSMT');
      const snippet = anchorIdx > -1 ? html.slice(Math.max(0, anchorIdx - 200), anchorIdx + 600) : html.slice(0, 800);
      return new Response(JSON.stringify({
        ok: false,
        error: 'Không parse được kỳ nào — trang nguồn có thể đã đổi cấu trúc HTML.',
        htmlSnippetAroundAnchor: snippet,
      }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({
      ok: true, fetchedAt: new Date().toISOString(), source: KENO_LIVE_URL, rows,
    }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Lỗi kết nối: ' + (err && err.message ? err.message : String(err)) }), { status: 502, headers: jsonHeaders });
  }
}

/* ── HANDLER: /api/keno-copy24 ──
   1. Lấy trang "hôm nay" (đủ toàn bộ kỳ trong ngày) → xác định kỳ LIVE
      mới nhất (= kỳ ĐÃ quay xong, đang hiển thị "Latest Draw" trên web).
   2. cutoffId = latestId - 2 (tương đương "kỳ khách sắp mua vé - 3" theo
      đúng luật 3-Checkpoint gốc — vì kỳ sắp mua = latestId + 1).
   3. Cần 24 kỳ LIỀN TRƯỚC cutoffId → windowStart = cutoffId - 23.
   4. Nếu trang "hôm nay" chưa đủ dữ liệu để phủ hết windowStart (ví dụ đầu
      giờ sáng, ngày mới bắt đầu quay chưa được bao nhiêu kỳ) → lấy thêm
      trang "hôm qua" rồi gộp lại. */
async function handleKenoCopy24() {
  try {
    const todaySuffix = vnDateUrlSuffix(0);
    const todayUrl = `https://xosominhngoc.net.vn/kqxs-keno-ngay-${todaySuffix}`;

    const resToday = await fetch(todayUrl, { headers: KENO_HEADERS, cf: { cacheTtl: 0 } });
    if (!resToday.ok) {
      return new Response(JSON.stringify({ ok: false, error: `Trang hôm nay trả về HTTP ${resToday.status}` }), { status: 502, headers: jsonHeaders });
    }
    const htmlToday = await resToday.text();
    let allRows = parseKenoBlocks(htmlToday);

    if (allRows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Không parse được kỳ nào từ trang hôm nay — cấu trúc HTML có thể đã đổi.' }), { status: 502, headers: jsonHeaders });
    }

    // Kỳ LIVE mới nhất = id lớn nhất parse được (= kỳ ĐÃ quay xong, đang
    // hiển thị là "Latest Draw" trên web — KHÁC với "kỳ khách sắp mua vé"
    // là kỳ latestId + 1, chưa quay).
    // ⚔️ Luật 3-Checkpoint gốc: cutoff = (kỳ SẮP quay) − 3
    //                                  = (latestId + 1) − 3
    //                                  = latestId − 2
    // Trước đây code để "latestId - 3" là SAI 1 đơn vị (nhầm latestId với
    // kỳ sắp quay). Đã sửa lại đúng thành "latestId - 2".
    // Ví dụ: kỳ khách mua vé #0290039 → Latest #0290038 → cutoff #0290036
    // = latestId(38) - 2 = 36. ✅
    const latestId = Math.max(...allRows.map(r => parseInt(r.id, 10)));
    const cutoffId = latestId - 2;
    const windowStart = cutoffId - 23;
    const windowEnd = cutoffId;

    // Nếu chưa đủ dữ liệu che hết windowStart (đầu ngày mới quay được ít kỳ) → lấy thêm trang hôm qua
    const minIdToday = Math.min(...allRows.map(r => parseInt(r.id, 10)));
    if (minIdToday > windowStart) {
      const yestSuffix = vnDateUrlSuffix(-1);
      const yestUrl = `https://xosominhngoc.net.vn/kqxs-keno-ngay-${yestSuffix}`;
      try {
        const resYest = await fetch(yestUrl, { headers: KENO_HEADERS, cf: { cacheTtl: 0 } });
        if (resYest.ok) {
          const htmlYest = await resYest.text();
          allRows = allRows.concat(parseKenoBlocks(htmlYest));
        }
      } catch (_) { /* nếu lấy trang hôm qua lỗi, cứ dùng tạm những gì có được từ hôm nay */ }
    }

    // Lọc đúng cửa sổ [windowStart, windowEnd], khử trùng theo id, sort tăng dần
    const seen = new Set();
    const windowRows = allRows
      .filter(r => {
        const n = parseInt(r.id, 10);
        return n >= windowStart && n <= windowEnd;
      })
      .filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10))
      .map(r => ({ ...r, id: '#' + r.id }));

    return new Response(JSON.stringify({
      ok: true,
      fetchedAt: new Date().toISOString(),
      latestLiveId: '#' + String(latestId).padStart(7, '0'),
      cutoffId: '#' + String(cutoffId).padStart(7, '0'),
      requested: 24,
      found: windowRows.length,
      rows: windowRows, // đã sort tăng dần: rows[0] = cũ nhất, rows[last] = mới nhất trong cửa sổ (= cutoffId)
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Lỗi kết nối: ' + (err && err.message ? err.message : String(err)) }), { status: 502, headers: jsonHeaders });
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   ⚔️ US LOTTERY LIVE (Powerball / Mega Millions / Lotto Texas)
   ============================================================
   Trước đây: fetch-draws.js/fetch-megamillions.js/fetch-lottotexas.js chạy
   1 lần/ngày qua GitHub Actions, ghi ra file tĩnh (draws-data.js v.v.),
   front-end đọc file tĩnh đó. Nhược điểm: phụ thuộc pipeline chạy đúng
   giờ + commit thành công thì mới có dữ liệu mới.

   Giờ: fetch trực tiếp từ texaslottery.com MỖI LẦN khách xem trang, y hệt
   cơ chế Keno live phía trên. Không cần file tĩnh, không cần GitHub
   Actions cho phần hiển thị này nữa.

   ⚠️ Chỉ cần ~30 kỳ gần nhất để hiển thị + Copy 24 Draws — KHÔNG cần tải
   nguyên file CSV toàn bộ lịch sử (có thể vài trăm KB) mỗi lần. Dùng HTTP
   Range để chỉ tải ĐUÔI file (vài chục KB cuối) — nếu server không hỗ trợ
   Range thì tự động nhận về full file, code vẫn chạy đúng, chỉ nặng hơn
   chút ở lần đó (không lỗi). Dòng đầu tiên trong đoạn tail có thể bị cắt
   dở — không cần xử lý riêng vì bộ parse bên dưới tự bỏ qua dòng không
   hợp lệ (kiểm tra tên cột + NaN) mà không cần biết trước dòng nào lỗi.
   ═══════════════════════════════════════════════════════════════════ */

const TEXAS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/csv,*/*',
};

const US_LOTTERY_CSV_CONFIGS = {
  powerball: {
    url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/powerball.csv',
    csvName: 'Powerball',
    specialKey: 'powerball',
    numCount: 5,
    drawDays: [1, 3, 6], // Mon/Wed/Sat
  },
  megamillions: {
    url: 'https://www.texaslottery.com/export/sites/lottery/Games/Mega_Millions/Winning_Numbers/megamillions.csv',
    csvName: 'Mega Millions',
    specialKey: 'megaball',
    numCount: 5,
    drawDays: [2, 5], // Tue/Fri
  },
  lottotexas: {
    url: 'https://www.texaslottery.com/export/sites/lottery/Games/Lotto_Texas/Winning_Numbers/lottotexas.csv',
    csvName: 'Lotto Texas',
    specialKey: null,
    numCount: 6,
    drawDays: [1, 3, 6], // Mon/Wed/Sat
  },
};

/* ── Tải ĐUÔI file qua HTTP Range (fallback tự động về full file nếu
   server không hỗ trợ) — dùng chung cho cả CSV (Texas Lottery) lẫn
   JSONL (Vietlott GitHub) bên dưới. ── */
async function fetchTail(url, headers, tailBytes = 60000) {
  const res = await fetch(url, {
    headers: { ...headers, 'Range': `bytes=-${tailBytes}` },
    cf: { cacheTtl: 0 },
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

function parseTexasCsvRows(text, cfg) {
  const out = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const cols = line.trim().split(',').map(c => c.trim().replace(/"/g, ''));
    if (cols.length < 4 + cfg.numCount || cols[0] !== cfg.csvName) continue;

    const month = cols[1].padStart(2, '0');
    const day = cols[2].padStart(2, '0');
    const year = cols[3];
    const date = `${year}-${month}-${day}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const white = [];
    let bad = false;
    for (let i = 0; i < cfg.numCount; i++) {
      const n = parseInt(cols[4 + i], 10);
      if (isNaN(n) || n < 1) { bad = true; break; }
      white.push(n);
    }
    if (bad) continue;

    let special = null;
    if (cfg.specialKey) {
      const s = parseInt(cols[4 + cfg.numCount], 10);
      if (isNaN(s) || s < 1) continue;
      special = s;
    }

    out.push({ date, white, special });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  // khử trùng theo date (đề phòng dòng lặp/rác ở mép đầu đoạn tail)
  const seen = new Set();
  return out.filter(r => (seen.has(r.date) ? false : (seen.add(r.date), true)));
}

function getNextDrawDateGeneric(today, drawDays) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 7; i++) {
    if (drawDays.includes(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}
function getCutoffDateGeneric(today, drawDays) {
  const nextDraw = getNextDrawDateGeneric(today, drawDays);
  const cutoff = new Date(nextDraw);
  cutoff.setDate(cutoff.getDate() - 7);
  return cutoff;
}
/* ⚔️ Kỳ quay GẦN NHẤT đã/đang diễn ra tính đến hôm nay (khác
   getNextDrawDateGeneric ở trên — hàm đó tìm kỳ SẮP TỚI). Dùng để biết
   "đáng lẽ dữ liệu phải có tới ngày nào rồi" — từ đó phát hiện nguồn
   GitHub bị TRỄ KỲ (khác hẳn lỗi parse/regex như Keno). */
function getLastDrawDateGeneric(today, drawDays) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 7; i++) {
    if (drawDays.includes(d.getDay())) return d;
    d.setDate(d.getDate() - 1);
  }
  return d;
}
function dateKeyLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function handleUsLotteryLive(gameKey) {
  const cfg = US_LOTTERY_CSV_CONFIGS[gameKey];
  if (!cfg) return new Response(JSON.stringify({ ok: false, error: `Không rõ game "${gameKey}"` }), { status: 400, headers: jsonHeaders });
  try {
    const text = await fetchTail(cfg.url, TEXAS_HEADERS, 60000);
    const rows = parseTexasCsvRows(text, cfg);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Không parse được kỳ nào — CSV có thể đã đổi định dạng, hoặc đoạn tail chưa chạm tới dòng hợp lệ nào.' }), { status: 502, headers: jsonHeaders });
    }
    const recent = rows.slice(-31).reverse(); // rows[0] = mới nhất
    return new Response(JSON.stringify({
      ok: true, fetchedAt: new Date().toISOString(), source: 'texaslottery.com (live)', rows: recent,
    }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Lỗi kết nối texaslottery.com: ' + (err && err.message ? err.message : String(err)) }), { status: 502, headers: jsonHeaders });
  }
}

async function handleUsLotteryCopy24(gameKey) {
  const cfg = US_LOTTERY_CSV_CONFIGS[gameKey];
  if (!cfg) return new Response(JSON.stringify({ ok: false, error: `Không rõ game "${gameKey}"` }), { status: 400, headers: jsonHeaders });
  try {
    const text = await fetchTail(cfg.url, TEXAS_HEADERS, 60000);
    const rows = parseTexasCsvRows(text, cfg);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Không parse được kỳ nào.' }), { status: 502, headers: jsonHeaders });
    }
    const today = new Date();
    const cutoff = getCutoffDateGeneric(today, cfg.drawDays);
    const cutoffKey = dateKeyLocal(cutoff);
    const selected = rows.filter(d => d.date <= cutoffKey).slice(-24);
    return new Response(JSON.stringify({
      ok: true, fetchedAt: new Date().toISOString(), cutoffDate: cutoffKey, rows: selected,
    }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Lỗi kết nối texaslottery.com: ' + (err && err.message ? err.message : String(err)) }), { status: 502, headers: jsonHeaders });
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   ⚔️ VIETLOTT LIVE (Power 6/55, Mega 6/45, Lotto 5/35, Bingo18)
   ============================================================
   Keno của Vietlott live qua xosominhngoc.net.vn (2 route /api/keno-live,
   /api/keno-copy24 phía trên — KHÔNG đụng tới ở đây), dùng thuật toán
   "cửa sổ trượt" (parseKenoBlocks) để BỌC GIÁP chống nhà cái đổi DOM.

   4 sản phẩm còn lại giờ ÁP DỤNG ĐÚNG CƠ CHẾ BỌC GIÁP ĐÓ:
   - Nguồn LỊCH SỬ SÂU: GitHub vietvudanh/vietlott-data (JSONL) — hàng
     trăm kỳ, cần cho nút "Copy 24 Draws".
   - Nguồn LIVE + BỌC GIÁP: xosominhngoc.net.vn — ĐÚNG domain, ĐÚNG khuôn
     mẫu lặp "Kỳ QSMT: #id ... Ngày: DD/MM/YYYY" mà Keno đang cào, dùng
     CHUNG một hàm parser cửa sổ trượt (parseXsmnBlocks) — không phụ
     thuộc thẻ HTML cụ thể nào, tự "rút ruột" đúng N số hợp lệ ngay sau
     mốc ngày bất chấp nhà cái chèn rác/đổi class.
   - Tự động PHÁT HIỆN GitHub bị trễ kỳ (khác lỗi hẳn) rồi GỘP thêm dữ
     liệu live từ xosominhngoc.net.vn — giữ lịch sử dài, chỉ bù kỳ thiếu.
   ═══════════════════════════════════════════════════════════════════ */

const VIETLOTT_GITHUB_BASE = 'https://raw.githubusercontent.com/vietvudanh/vietlott-data/main/data';
const VIETLOTT_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; EurekaLott-Bot/1.0)', 'Accept': '*/*' };

const VIETLOTT_LIVE_CONFIGS = {
  power655: { githubFile: 'power655', hasFallback: true, continuous: false, drawDays: [2, 4, 6] },
  power645: { githubFile: 'power645', hasFallback: true, continuous: false, drawDays: [0, 3, 5] },
  power535: { githubFile: 'power535', hasFallback: true, continuous: false, drawDays: [0, 1, 2, 3, 4, 5, 6] },
  bingo18: { githubFile: 'bingo18', hasFallback: true, continuous: true },
};

/* ⚔️ Trang LIVE trên xosominhngoc.net.vn cho từng sản phẩm — CÙNG domain,
   CÙNG kiểu trang lặp khối "Kỳ QSMT:/Kỳ vé: #id ... Ngày: DD/MM/YYYY"
   mà Keno đang cào (khác hẳn www.minhngoc.net.vn cũ, đã bỏ). */
const XSMN_LIVE_URLS = {
  power655: 'https://xosominhngoc.net.vn/kqxs-power-655',
  power645: 'https://xosominhngoc.net.vn/kqxs-mega-645',
  power535: 'https://xosominhngoc.net.vn/kqxs-lotto-535',
  bingo18: 'https://xosominhngoc.net.vn/kqxs-bingo18',
};

/* ⚔️ Tham số "hình dạng" kết quả từng sản phẩm — để cửa sổ trượt biết cần
   tìm ĐÚNG bao nhiêu số, trong khoảng nào, có cho trùng số hay không:
   - power655: 6 số 1-55 + 1 số Power (cũng 1-55) = 7 số, không trùng.
   - power645 (Mega 6/45): 6 số 1-45, không trùng, không có số phụ.
   - power535 (Lotto 5/35): 5 số 1-35 + 1 số ĐB — ĐB có thể trùng 1 trong
     5 số kia (đã quan sát thực tế), nên CHO PHÉP trùng.
   - bingo18: 3 số (0-9), lặp lại rất thường xuyên → CHO PHÉP trùng. */
const XSMN_ARMOR_PARAMS = {
  power655: { count: 7, min: 1, max: 55, allowDuplicates: false },
  power645: { count: 6, min: 1, max: 45, allowDuplicates: false },
  power535: { count: 6, min: 0, max: 35, allowDuplicates: true },
  bingo18: { count: 3, min: 0, max: 9, allowDuplicates: true },
};

function parseVietlottJsonlTail(text) {
  const out = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      if (!obj.date || !Array.isArray(obj.result)) continue;
      out.push({ date: obj.date, id: obj.id || '', numbers: obj.result });
    } catch { /* dòng đầu đoạn tail có thể bị cắt dở → JSON.parse lỗi → bỏ qua, không sao */ }
  }
  out.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  return out;
}

/* ⚔️ PARSER BỌC GIÁP TỔNG QUÁT — cùng thuật toán "cửa sổ trượt" với
   parseKenoBlocks() ở trên, tham số hóa để dùng chung cho 4 sản phẩm.
   Tách khối theo "Kỳ QSMT:" HOẶC "Kỳ vé:" (2 nhãn khác nhau tùy trang
   con trên xosominhngoc.net.vn), tìm ngày, rồi TỰ DÒ đúng N số hợp lệ
   liền nhau ngay sau ngày — bỏ qua mọi rác thẻ HTML/class xen giữa,
   không phụ thuộc cấu trúc DOM cụ thể nào. Nhà cái đổi div, đổi class,
   thêm khoảng trắng ẩn... đều KHÔNG ảnh hưởng, vì thuật toán chỉ quan
   tâm tới GIÁ TRỊ số, không quan tâm nó nằm trong thẻ gì. */
function parseXsmnBlocks(html, { count, min, max, allowDuplicates }) {
  const out = [];
  const blocks = html.split(/K[ỳy]\s*(?:QSMT|v[éẻe])\s*:/i).slice(1);

  for (const blockRaw of blocks) {
    const block = blockRaw.slice(0, 3000);
    const idMatch = block.match(/#\s*(\d{3,8})/);
    const dateMatch = block.match(/Ng[àa]y.*?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (!idMatch || !dateMatch) continue;

    const id = idMatch[1];
    const date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;

    const rawAfterDate = block.slice(block.indexOf(dateMatch[0]) + dateMatch[0].length);
    // ⚔️ Lotto 5/35 quay 2 lần/ngày — sau ngày còn có mốc giờ dạng
    // "- 21:00"/"- 13:00" ngay trước dãy số kết quả. Nếu không loại bỏ,
    // "21" và "00" sẽ bị cửa sổ trượt hiểu nhầm là 2 số đầu của kết quả
    // (vì cũng nằm trong khoảng hợp lệ 0-35). Cắt bỏ mốc giờ này trước.
    const textAfterDate = stripTags(rawAfterDate).trim().replace(/^-?\s*\d{1,2}:\d{2}\s*/, '');
    const rawNumbers = textAfterDate.match(/\b\d{1,2}\b/g);
    if (!rawNumbers) continue;

    let bestSequence = [];
    for (let i = 0; i < rawNumbers.length; i++) {
      const tempSeq = [];
      for (let j = i; j < rawNumbers.length; j++) {
        const n = parseInt(rawNumbers[j], 10);
        if (n >= min && n <= max && (allowDuplicates || !tempSeq.includes(n))) {
          tempSeq.push(n);
          if (tempSeq.length === count) break;
        } else break;
      }
      if (tempSeq.length === count) { bestSequence = tempSeq; break; }
    }

    if (bestSequence.length === count) out.push({ id, date, numbers: bestSequence });
  }
  return out;
}

/* ⚔️ Gộp 2 nguồn theo id đã CHUẨN HÓA về số (bỏ số 0 đứng đầu) — vì
   GitHub và xosominhngoc.net.vn đôi khi đệm số 0 khác độ dài cho CÙNG 1
   kỳ (vd "01380" vs "001380"), so bằng chuỗi thô sẽ bị coi là 2 kỳ khác
   nhau. Dùng id thay vì date làm khóa vì power535 quay 2 lần/ngày —
   khóa theo date sẽ làm mất 1 trong 2 kỳ cùng ngày. Nếu trùng id, ưu
   tiên bản `fresh` (xosominhngoc.net.vn — scrape trực tiếp, sát thời
   điểm quay thưởng thực tế hơn). */
function normVietlottId(row) {
  const n = parseInt(row.id, 10);
  return Number.isFinite(n) ? 'id:' + n : 'date:' + row.date;
}
function mergeVietlottRows(base, fresh) {
  const map = new Map();
  for (const r of base) map.set(normVietlottId(r), r);
  for (const r of fresh) map.set(normVietlottId(r), r);
  return Array.from(map.values()).sort((a, b) =>
    a.date.localeCompare(b.date) || ((parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0)));
}

/* ── Trả về mảng draws đã sort tăng dần (nguồn GitHub, gộp thêm live
   xosominhngoc.net.vn khi cần) — dùng chung cho cả live lẫn copy24.
   ------------------------------------------------------------------
   ⚠️ LƯU Ý: GitHub vietvudanh/vietlott-data là pipeline của MỘT BÊN THỨ
   BA, chạy cron theo lịch RIÊNG của họ — file .jsonl có thể fetch THÀNH
   CÔNG (không throw lỗi) nhưng vẫn TRỄ 1 kỳ so với kỳ quay thực tế mới
   nhất. Khi phát hiện trễ (hoặc GitHub lỗi hẳn), tự động cào thêm trang
   live xosominhngoc.net.vn bằng đúng thuật toán bọc giáp của Keno, rồi
   GỘP vào (không thay thế hẳn) để vừa có lịch sử sâu vừa có kỳ mới nhất
   luôn đúng. ── */
async function fetchVietlottRows(productKey) {
  const cfg = VIETLOTT_LIVE_CONFIGS[productKey];
  if (!cfg) throw new Error(`Không rõ sản phẩm "${productKey}"`);

  let githubRows = [];
  let githubFailed = false;
  try {
    const text = await fetchTail(`${VIETLOTT_GITHUB_BASE}/${cfg.githubFile}.jsonl`, VIETLOTT_HEADERS, 120000);
    githubRows = parseVietlottJsonlTail(text);
  } catch (_) {
    githubFailed = true; // rơi xuống fallback nếu có
  }

  // Chỉ áp dụng kiểm tra "trễ kỳ theo lịch quay" cho sản phẩm có lịch cố
  // định (drawDays); bingo18 chạy continuous → coi là trễ nếu GitHub
  // chưa có kỳ nào của NGÀY HÔM NAY (bingo18 quay mỗi 10 phút, tới bất
  // kỳ giờ nào trong ngày sau sáng sớm cũng phải có vài kỳ rồi).
  let isStale = false;
  if (cfg.drawDays) {
    const lastExpected = dateKeyLocal(getLastDrawDateGeneric(new Date(), cfg.drawDays));
    isStale = githubRows.length === 0 || githubRows[githubRows.length - 1].date < lastExpected;
  } else if (cfg.continuous) {
    const todayKey = dateKeyLocal(new Date());
    isStale = githubRows.length === 0 || githubRows[githubRows.length - 1].date < todayKey;
  }

  if ((githubFailed || isStale) && cfg.hasFallback && XSMN_LIVE_URLS[productKey]) {
    try {
      const res = await fetch(XSMN_LIVE_URLS[productKey], { headers: KENO_HEADERS, cf: { cacheTtl: 0 } });
      if (res.ok) {
        const html = await res.text();
        const xsmnRows = parseXsmnBlocks(html, XSMN_ARMOR_PARAMS[productKey]);
        if (xsmnRows.length > 0) {
          if (githubRows.length > 0) {
            return { rows: mergeVietlottRows(githubRows, xsmnRows), source: 'GitHub vietvudanh/vietlott-data + xosominhngoc.net.vn (bù kỳ mới, live, bọc giáp)' };
          }
          return { rows: xsmnRows, source: 'xosominhngoc.net.vn (fallback, live, bọc giáp)' };
        }
      }
    } catch (_) { /* xosominhngoc.net.vn cũng lỗi → rơi xuống dùng tạm GitHub nếu có, dưới đây */ }
  }

  if (githubRows.length > 0) return { rows: githubRows, source: 'GitHub vietvudanh/vietlott-data (live)' };

  throw new Error('Không lấy được dữ liệu từ GitHub' + (cfg.hasFallback ? ' lẫn xosominhngoc.net.vn' : ' (sản phẩm này không có nguồn dự phòng)'));
}

async function handleVietlottLive(productKey) {
  try {
    const { rows, source } = await fetchVietlottRows(productKey);
    const recent = rows.slice(-31).reverse(); // rows[0] = mới nhất
    return new Response(JSON.stringify({
      ok: true, fetchedAt: new Date().toISOString(), source, rows: recent,
    }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 502, headers: jsonHeaders });
  }
}

async function handleVietlottCopy24(productKey) {
  const cfg = VIETLOTT_LIVE_CONFIGS[productKey];
  if (!cfg) return new Response(JSON.stringify({ ok: false, error: `Không rõ sản phẩm "${productKey}"` }), { status: 400, headers: jsonHeaders });
  try {
    const { rows } = await fetchVietlottRows(productKey);
    let selected, cutoffLabel;
    if (cfg.continuous) {
      const withoutLast3 = rows.slice(0, -3);
      selected = withoutLast3.slice(-24);
      const cutoffRow = withoutLast3[withoutLast3.length - 1];
      cutoffLabel = cutoffRow ? `kỳ #${cutoffRow.id || '?'} (${cutoffRow.date})` : '—';
    } else {
      const today = new Date();
      const cutoff = getCutoffDateGeneric(today, cfg.drawDays);
      const cutoffKey = dateKeyLocal(cutoff);
      selected = rows.filter(d => d.date <= cutoffKey).slice(-24);
      cutoffLabel = cutoffKey;
    }
    return new Response(JSON.stringify({
      ok: true, fetchedAt: new Date().toISOString(), cutoffLabel, rows: selected,
    }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 502, headers: jsonHeaders });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/keno-live') return handleKenoLive();
    if (url.pathname === '/api/keno-copy24') return handleKenoCopy24();

    if (url.pathname === '/api/us-live') return handleUsLotteryLive(url.searchParams.get('game') || '');
    if (url.pathname === '/api/us-copy24') return handleUsLotteryCopy24(url.searchParams.get('game') || '');

    if (url.pathname === '/api/vietlott-live') return handleVietlottLive(url.searchParams.get('product') || '');
    if (url.pathname === '/api/vietlott-copy24') return handleVietlottCopy24(url.searchParams.get('product') || '');

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Static Assets chưa được cấu hình.', { status: 501 });
  },
};
