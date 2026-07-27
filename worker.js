/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * Nguồn: xosominhngoc.net.vn/keno
 * Phiên bản: Bọc Thép Nội Công Tầng 10 (Trận Pháp Liên Hoàn)
 * ============================================================
 */

const KENO_SOURCE_URL = 'https://xosominhngoc.net.vn/keno';

const KENO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
};

// Loại bỏ các tag HTML để lấy chuỗi text thuần
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

    // Bắt TOÀN BỘ các cụm số (để phát hiện cả rác 3, 4 chữ số)
    const rawNumbers = textAfterDate.match(/\d+/g);
    if (!rawNumbers) continue;

    let numbers = [];
    
    // 🌟 TRẬN PHÁP LIÊN HOÀN: Quét chuỗi số liên tục
    for (const str of rawNumbers) {
      const n = parseInt(str, 10);
      
      // Khóa an toàn: Số phải từ 1->80 VÀ không được trùng với các số đang có trong mảng
      if (n >= 1 && n <= 80 && !numbers.includes(n)) {
        numbers.push(n);
        
        // Nếu gom đủ 20 số LIÊN TIẾP sạch sẽ -> Thành công phá trận!
        if (numbers.length === 20) {
          break; 
        }
      } else {
        // 💥 ĐẠP TRÚNG RÁC! (Số > 80, số có 3 digit, hoặc bị trùng lặp)
        // Lập tức HỦY BỎ toàn bộ công sức, làm trống mảng và bắt đầu đếm lại chuỗi mới!
        numbers = [];
      }
    }

    // Đánh giá xuất sơn
    if (numbers.length === 20) {
      numbers.sort((a, b) => a - b);
      out.push({ id, date, numbers });
    }
  }
  return out;
}

/* ── HANDLER: /api/keno-live ── */
async function handleKenoLive() {
  const jsonHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store', // ⚠️ KHÔNG cache — luôn lấy dữ liệu tươi
  };

  try {
    const res = await fetch(KENO_SOURCE_URL, { headers: KENO_HEADERS });[cite: 3]

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: `xosominhngoc.net.vn trả về HTTP ${res.status}`,[cite: 3]
      }), { status: 502, headers: jsonHeaders });
    }

    const html = await res.text();[cite: 3]
    const rows = parseKenoLive(html);[cite: 3]

    if (rows.length === 0) {
      const anchorIdx = html.indexOf('QSMT');[cite: 3]
      const snippet = anchorIdx > -1
        ? html.slice(Math.max(0, anchorIdx - 200), anchorIdx + 600)[cite: 3]
        : html.slice(0, 800);[cite: 3]

      return new Response(JSON.stringify({
        ok: false,
        error: 'Lỗi Parse: Cấu trúc nguồn đã thay đổi cực mạnh, không tìm thấy dữ liệu hợp lệ.',
        anchorFound: anchorIdx > -1,[cite: 3]
        htmlSnippetAroundAnchor: snippet,[cite: 3]
      }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({
      ok: true,
      fetchedAt: new Date().toISOString(),[cite: 3]
      source: KENO_SOURCE_URL,[cite: 3]
      rows, // rows[0] = kỳ quay mới nhất[cite: 3]
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Lỗi kết nối mạng đến nguồn: ' + (err && err.message ? err.message : String(err)),[cite: 3]
    }), { status: 502, headers: jsonHeaders });
  }
}

export default {
  async fetch(request, env, ctx) {[cite: 3]
    const url = new URL(request.url);[cite: 3]

    if (url.pathname === '/api/keno-live') {[cite: 3]
      return handleKenoLive();[cite: 3]
    }

    if (env.ASSETS) {[cite: 3]
      return env.ASSETS.fetch(request);[cite: 3]
    }
    return new Response('Static Assets chưa được cấu hình.', { status: 501 });[cite: 3]
  },
};
