/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * Vẫn giữ nguyên vai trò CHÍNH: phục vụ file tĩnh (HTML/CSS/JS/ảnh),
 * siêu nhanh, không phụ thuộc Render.
 *
 * ⚔️ THÊM MỚI: endpoint /api/keno-live — dùng RIÊNG cho tính năng
 * "Neural Network Auto Run for Keno", nơi khách CHƠI THẬT nên cần số
 * liệu tươi ngay tại thời điểm bấm, không thể chờ pipeline chạy theo
 * lịch (Keno quay lại sau mỗi ~8 phút, nguồn GitHub archive chỉ cập
 * nhật 1 lần/ngày — không đáp ứng được nhu cầu này).
 *
 * Endpoint này khiến Worker tự POST thẳng sang vietlott.vn (endpoint
 * AjaxPro chính thức) NGAY LÚC khách gọi — không cookie, không cache,
 * không qua GitHub/archive gì cả. Logic POST + parse HTML port lại
 * 1-1 từ mã nguồn mở tham khảo: github.com/vietvudanh/vietlott-data
 * (src/vietlott/crawler/products/keno.py + base.py) — đã xác nhận
 * KHÔNG cần cookie phiên (use_cookies=False cho mọi sản phẩm trong
 * repo gốc), chỉ 1 lần POST trực tiếp là đủ.
 *
 * ⚠️ Rủi ro cố hữu (không tránh được): vietlott.vn có thể đổi cấu trúc
 * HTML/endpoint bất kỳ lúc nào (giống mọi trang chính phủ khác). Nếu
 * điều đó xảy ra, endpoint này trả lỗi rõ ràng (ok:false) thay vì trả
 * dữ liệu sai — front-end PHẢI tự xử lý case lỗi này (xem hướng dẫn
 * ở cuối file), không được hiển thị số cũ mà giả vờ là số mới.
 * ============================================================
 */

const KENO_URL =
  'https://vietlott.vn/ajaxpro/Vietlott.PlugIn.WebParts.GameKenoCompareWebPart,Vietlott.PlugIn.WebParts.ashx';

const KENO_BODY = {
  DrawDate: '',
  GameDrawNo: '',
  GameId: '6',
  ORenderInfo: {
    ExtraParam1: '', ExtraParam2: '', ExtraParam3: '',
    FullPageAlias: null, IsPageDesign: false,
    OrgPageAlias: null, PageAlias: null, RefKey: null,
    SiteAlias: 'main.vi', SiteId: 'main.frontend.vi',
    SiteLang: 'vi', SiteName: 'Vietlott', SiteURL: '',
    System: 1, UserSessionId: '', WebPage: null,
  },
  OddEven: 2,
  PageIndex: 1, // PageIndex=1 = trang kết quả MỚI NHẤT (theo đúng mã nguồn tham khảo)
  ProcessType: 0,
  TotalRow: 112453,
  UpperLower: 2,
  number: '',
};

const KENO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Content-Type': 'text/plain; charset=utf-8',
  'X-AjaxPro-Method': 'ServerSideDrawResult',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://vietlott.vn',
  'Referer': 'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-645',
};

/* ── MINI HTML PARSER (regex-based, port lại từ fetch-vietlott.js) ── */
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
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
function parseKenoTable(html) {
  const rows = extractRows(html);
  const out = [];
  rows.forEach((tr, i) => {
    if (i === 0) return; // header
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

/* ── HANDLER: /api/keno-live ── */
async function handleKenoLive() {
  const jsonHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store', // ⚠️ KHÔNG cache — mỗi lần gọi phải tươi
  };

  try {
    const res = await fetch(KENO_URL, {
      method: 'POST',
      headers: KENO_HEADERS,
      body: JSON.stringify(KENO_BODY),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: `vietlott.vn trả về HTTP ${res.status}`,
      }), { status: 502, headers: jsonHeaders });
    }

    const json = await res.json();
    const html = (json && json.value && (json.value.HtmlContent || json.value)) || '';
    const rows = parseKenoTable(typeof html === 'string' ? html : '');

    if (rows.length === 0) {
      // ⚠️ Không parse được dòng nào → RẤT có thể vietlott.vn đã đổi cấu
      // trúc HTML. Trả lỗi rõ ràng, KHÔNG trả mảng rỗng coi như "0 kết quả".
      return new Response(JSON.stringify({
        ok: false,
        error: 'Không parse được dữ liệu — vietlott.vn có thể đã đổi cấu trúc HTML, cần cập nhật parseKenoTable().',
      }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({
      ok: true,
      fetchedAt: new Date().toISOString(),
      rows, // rows[0] = kỳ MỚI NHẤT
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Lỗi khi gọi vietlott.vn: ' + (err && err.message ? err.message : String(err)),
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
 *         // ⚠️ BẮT BUỘC xử lý case lỗi — hiển thị cảnh báo rõ ràng cho
 *         // khách, KHÔNG được âm thầm dùng số cũ giả vờ là số mới.
 *         showError('⚠️ Không lấy được số Keno mới nhất: ' + data.error +
 *                    ' — đang dùng dữ liệu gần nhất đã lưu (có thể không phải mới nhất).');
 *         return fallbackToVietlottDataJs(); // dùng vietlottData.keno (từ pipeline hằng ngày)
 *       }
 *       return data.rows; // rows[0] = kỳ mới nhất, data.fetchedAt = giờ lấy
 *     } catch (e) {
 *       showError('⚠️ Mất kết nối tới máy chủ.');
 *       return fallbackToVietlottDataJs();
 *     }
 *   }
 *
 *   // Gọi lại mỗi 30s trong lúc khách đang mở trang (không cần liên tục hơn,
 *   // vì kỳ mới chỉ ra sau ~8 phút — 30s là đủ để không bỏ lỡ kỳ nào mà
 *   // vẫn nhẹ cho cả Worker lẫn vietlott.vn):
 *   setInterval(fetchKenoLive, 30000);
 */
