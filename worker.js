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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/keno-live') return handleKenoLive();
    if (url.pathname === '/api/keno-copy24') return handleKenoCopy24();

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Static Assets chưa được cấu hình.', { status: 501 });
  },
};
