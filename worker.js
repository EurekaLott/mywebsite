/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * Nguồn: xosominhngoc.net.vn/keno
 * Phiên bản: Bọc Thép Nội Công Tầng 11 (Cửa Sổ Trượt Xuyên Phá)
 * ============================================================
 */

const KENO_SOURCE_URL = 'https://xosominhngoc.net.vn/keno';

const KENO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Pragma': 'no-cache', // Ép nguồn không nhả cache
  'Cache-Control': 'no-cache'
};

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function parseKenoLive(html) {
  const out = [];
  const blocks = html.split(/Kỳ QSMT\s*:/i).slice(1);

  for (const blockRaw of blocks) {
    const block = blockRaw.slice(0, 3000);

    const idMatch = block.match(/#\s*(\d{5,8})/);
    const dateMatch = block.match(/Ng[àa]y.*?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    
    if (!idMatch || !dateMatch) continue;

    const id = '#' + idMatch[1];
    const date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;

    const rawAfterDate = block.slice(block.indexOf(dateMatch[0]) + dateMatch[0].length);
    const textAfterDate = stripTags(rawAfterDate);

    // Bắt số 1 đến 2 chữ số (loại ngay rác 3, 4 chữ số từ đầu để giảm tải)
    const rawNumbers = textAfterDate.match(/\b\d{1,2}\b/g);
    if (!rawNumbers) continue;

    let bestSequence = [];

    // 🌟 TRẬN PHÁP LIÊN HOÀN V2 (SLIDING WINDOW)
    // Rà soát từng vị trí, nếu đứt gãy thì chỉ tiến lên 1 bước để thử lại, không bỏ lọt
    for (let i = 0; i < rawNumbers.length; i++) {
      let tempSeq = [];
      for (let j = i; j < rawNumbers.length; j++) {
        const n = parseInt(rawNumbers[j], 10);
        
        if (n >= 1 && n <= 80 && !tempSeq.includes(n)) {
          tempSeq.push(n);
          if (tempSeq.length === 20) break; 
        } else {
          // 💥 Đạp trúng rác -> chỉ dừng thử chuỗi từ vị trí i, vòng lặp ngoài sẽ nhích i lên i+1
          break; 
        }
      }
      if (tempSeq.length === 20) {
        bestSequence = tempSeq; // Gắp được 20 số ngọc thạch, chốt đơn!
        break; 
      }
    }

    if (bestSequence.length === 20) {
      bestSequence.sort((a, b) => a - b);
      out.push({ id, date, numbers: bestSequence });
    }
  }
  return out;
}

/* ── HANDLER: /api/keno-live ── */
async function handleKenoLive() {
  const jsonHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', // ⚠️ Tuyệt đối không cache
  };

  try {
    // 🛡️ Phá vỡ Tường Băng Cache của Cloudflare bằng cf: { cacheTtl: 0 }
    const res = await fetch(KENO_SOURCE_URL, { 
      headers: KENO_HEADERS,
      cf: { cacheTtl: 0 } 
    });

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: `xosominhngoc.net.vn trả về HTTP ${res.status}`,
      }), { status: 502, headers: jsonHeaders });
    }

    const html = await res.text();
    const rows = parseKenoLive(html);

    if (rows.length === 0) {
      const anchorIdx = html.indexOf('QSMT');
      const snippet = anchorIdx > -1
        ? html.slice(Math.max(0, anchorIdx - 200), anchorIdx + 600)
        : html.slice(0, 800);

      return new Response(JSON.stringify({
        ok: false,
        error: 'Lỗi Parse: Cấu trúc nguồn đã thay đổi cực mạnh, không tìm thấy dữ liệu hợp lệ.',
        anchorFound: anchorIdx > -1,
        htmlSnippetAroundAnchor: snippet,
      }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({
      ok: true,
      fetchedAt: new Date().toISOString(),
      source: KENO_SOURCE_URL,
      rows, 
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Lỗi kết nối mạng đến nguồn: ' + (err && err.message ? err.message : String(err)),
    }), { status: 502, headers: jsonHeaders });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/keno-live') {
      return handleKenoLive();
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Static Assets chưa được cấu hình.', { status: 501 });
  },
};
