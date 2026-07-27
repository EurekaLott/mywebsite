/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * Vẫn giữ nguyên vai trò CHÍNH: phục vụ file tĩnh (HTML/CSS/JS/ảnh).
 *
 * ⚔️ /api/keno-live — LẦN 2, ĐỔI NGUỒN HOÀN TOÀN:
 * Bản đầu tiên gọi thẳng vietlott.vn (AjaxPro) → bị CHẶN 403 bởi chính
 * tường lửa chống bot của Cloudflare mà vietlott.vn dùng ("Just a
 * moment..." challenge) — không có header nào sửa được vì nó cần chạy
 * JavaScript thật để "giải" thử thách, mà 1 request server-side không
 * làm được. KHÔNG dùng lại hướng đó nữa.
 *
 * Nguồn mới: xosominhngoc.net.vn/keno — 1 trang tổng hợp công khai,
 * KHÔNG bị Cloudflare chặn, dữ liệu bám rất sát thời gian thực (đã xác
 * nhận thủ công: lệch vietlott.vn thật chỉ vài kỳ, ~vài chục phút,
 * không phải "trễ 2 ngày" như nguồn GitHub cũ). Chỉ cần GET thường,
 * không cookie, không AjaxPro.
 *
 * ⚠️ Rủi ro cố hữu (không tránh được với BẤT KỲ nguồn bên thứ 3 nào):
 * xosominhngoc.net.vn có thể đổi giao diện/cấu trúc HTML bất kỳ lúc
 * nào → parser bên dưới cần cập nhật lại. Vì vậy có validate rất chặt
 * (đúng 20 số, không trùng số, số trong khoảng 1-80) — nếu parse ra
 * sai dù chỉ 1 điều kiện, trả lỗi rõ ràng thay vì trả số sai cho khách
 * chơi thật.
 * ============================================================
 */

const KENO_SOURCE_URL = 'https://xosominhngoc.net.vn/keno';

const KENO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
};

/* ── PARSER: trang xosominhngoc.net.vn/keno ──
   Mỗi kỳ quay là 1 khối lặp lại chứa "Kỳ QSMT: #xxxxxxx" rồi "Ngày
   DD/MM/YYYY" rồi tới 20 số kết quả. KHÔNG phụ thuộc tên thẻ HTML cụ
   thể (dễ đổi) — chỉ dựa vào 2 mốc text cố định để cắt khối, sau đó
   lấy 40 ký tự SỐ đầu tiên ngay sau ngày tháng (= 20 số x 2 chữ số),
   validate chặt trước khi coi là hợp lệ. */
function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function parseKenoLive(html) {
  const out = [];
  const blocks = html.split(/Kỳ QSMT\s*:/i).slice(1);

  for (const blockRaw of blocks) {
    const block = blockRaw.slice(0, 2500);

    const idMatch = block.match(/#\s*(\d{5,8})/);
    const dateMatch = block.match(/Ng[àa]y\D{0,20}?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (!idMatch || !dateMatch) continue;

    const id = '#' + idMatch[1];
    const date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;

    // Lấy đoạn NGAY SAU phần ngày tháng — đây là chỗ chứa 20 số kết quả
    const afterDate = block.slice(block.indexOf(dateMatch[0]) + dateMatch[0].length);
    const digitsOnly = stripTags(afterDate).replace(/[^\d]/g, '').slice(0, 40);

    if (digitsOnly.length < 40) continue; // không đủ 20 số x 2 chữ số → bỏ qua khối này

    const numbers = [];
    for (let i = 0; i < 40; i += 2) numbers.push(parseInt(digitsOnly.slice(i, i + 2), 10));

    // ⚔️ VALIDATE CHẶT — Keno luôn là 20 số DUY NHẤT, mỗi số 1-80.
    // Sai bất kỳ điều kiện nào → bỏ khối này, KHÔNG đưa số sai vào kết quả.
    const uniqueCount = new Set(numbers).size;
    const allInRange = numbers.every(n => n >= 1 && n <= 80);
    if (numbers.length !== 20 || uniqueCount !== 20 || !allInRange) continue;

    out.push({ id, date, numbers });
  }
  return out;
}

/* ── HANDLER: /api/keno-live ── */
async function handleKenoLive() {
  const jsonHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store', // ⚠️ KHÔNG cache — mỗi lần gọi phải tươi
  };

  try {
    const res = await fetch(KENO_SOURCE_URL, { headers: KENO_HEADERS });

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: `xosominhngoc.net.vn trả về HTTP ${res.status}`,
      }), { status: 502, headers: jsonHeaders });
    }

    const html = await res.text();
    const rows = parseKenoLive(html);

    if (rows.length === 0) {
      // ⚠️ Không parse được kỳ nào → RẤT có thể trang nguồn đã đổi cấu
      // trúc HTML. Trả lỗi rõ ràng kèm 500 ký tự đầu HTML thật để dễ
      // chẩn đoán ngay, KHÔNG trả mảng rỗng coi như "0 kết quả".
      return new Response(JSON.stringify({
        ok: false,
        error: 'Không parse được kỳ nào — trang nguồn có thể đã đổi cấu trúc HTML, cần cập nhật parseKenoLive().',
        htmlPreview: html.slice(0, 500),
      }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({
      ok: true,
      fetchedAt: new Date().toISOString(),
      source: KENO_SOURCE_URL,
      rows, // rows[0] = kỳ MỚI NHẤT
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Lỗi khi gọi xosominhngoc.net.vn: ' + (err && err.message ? err.message : String(err)),
    }), { status: 502, headers: jsonHeaders });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/keno-live') {
      return handleKenoLive();
    }

    // ── Mọi request khác: phục vụ file tĩnh như cũ ──
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Static Assets chưa được cấu hình.', { status: 501 });
  },
};

/**
 * ⚔️ HƯỚNG DẪN DÙNG Ở FRONT-END (trang Neural Network Keno):
 *
 *   async function fetchKenoLive() {
 *     try {
 *       const res = await fetch('/api/keno-live');
 *       const data = await res.json();
 *       if (!data.ok) {
 *         showError('⚠️ Không lấy được số Keno mới nhất: ' + data.error +
 *                    ' — đang dùng dữ liệu gần nhất đã lưu.');
 *         return fallbackToVietlottDataJs(); // dùng vietlottData.keno (từ pipeline hằng ngày)
 *       }
 *       return data.rows; // rows[0] = kỳ mới nhất, data.fetchedAt = giờ lấy
 *     } catch (e) {
 *       showError('⚠️ Mất kết nối tới máy chủ.');
 *       return fallbackToVietlottDataJs();
 *     }
 *   }
 *
 *   // Keno ra kỳ mới mỗi ~8 phút — gọi lại mỗi 60 giây là đủ tươi mà
 *   // không dồn dập lên trang nguồn:
 *   setInterval(fetchKenoLive, 60000);
 */

