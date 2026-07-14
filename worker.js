/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * Đây là Worker CÔNG KHAI — phục vụ toàn bộ file tĩnh của website
 * (index.html, powerball.html, community.html, EurekaLott 1A.html,
 * bruce-banner.js, CSS, images...) VÀ đóng vai trò "trạm trung
 * chuyển" (relay) cho 2 route API sang Worker bí mật
 * (eurekalott-engine.trongcuong-org.workers.dev).
 *
 * Khách hàng CHỈ thấy: fetch('/api/predict') — cùng domain với
 * chính họ đang đứng, không hề biết URL hay code thật của Worker
 * bí mật nằm ở đâu (vì lời gọi sang đó xảy ra ở ĐÂY, phía server,
 * không phải trong trình duyệt của họ).
 * ============================================================
 *
 * CÁCH DÙNG:
 * 1. Nếu ngài deploy qua Wrangler + Static Assets (khuyến nghị,
 *    xem wrangler.toml mẫu bên dưới): file này CHỈ cần xử lý
 *    /api/predict và /api/powerball, còn lại để static assets tự
 *    phục vụ toàn bộ file HTML/CSS/JS/images khác trong repo.
 * 2. Nếu ngài dùng Cloudflare Pages + Pages Functions: đặt file
 *    này vào functions/api/[[path]].js với logic tương tự.
 * ============================================================
 */

// ⚠️ SỬA ĐÚNG URL Worker bí mật thật của ngài ở đây
const ENGINE_URL = 'https://eurekalott-engine.trongcuong-org.workers.dev';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── /api/predict — relay POST sang Worker bí mật ──────────
    const match = url.pathname.match(/^\/api\/predict\/([a-zA-Z0-9_-]+)$/);
if (match && request.method === 'POST') {
  const body = await request.text();
  const upstream = await fetch(`${ENGINE_URL}/api/predict/${match[1]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const respBody = await upstream.text();
      return new Response(respBody, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // ── /api/powerball — relay GET sang Worker bí mật (Texas Proxy) ──
    if (url.pathname === '/api/powerball' && request.method === 'GET') {
      const upstream = await fetch(`${ENGINE_URL}/api/powerball`);
      const respBody = await upstream.text();
      return new Response(respBody, {
        status: upstream.status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
      });
    }

    // ── Mọi request khác — phục vụ file tĩnh (Static Assets) ──
    // Yêu cầu cấu hình [assets] trong wrangler.toml (xem ghi chú cuối file).
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Fallback nếu chưa cấu hình Static Assets — báo lỗi rõ ràng thay vì im lặng
    return new Response(
      'Static Assets chưa được cấu hình. Xem ghi chú wrangler.toml ở cuối file worker.js.',
      { status: 501 }
    );
  },
};

/**
 * ⚠️ CẤU HÌNH wrangler.toml MẪU (đặt cùng thư mục với worker.js):
 *
 * name = "mywebsite"
 * main = "worker.js"
 * compatibility_date = "2026-01-01"
 *
 * [assets]
 * directory = "./"          # thư mục chứa index.html, powerball.html, images/...
 * binding = "ASSETS"
 * not_found_handling = "404-page"
 *
 * ── Nếu ngài dùng Cloudflare Dashboard (không dùng Wrangler CLI) ──
 * Vào Workers & Pages → chọn Worker "mywebsite" → Settings → Bindings
 * → Add Binding → "Assets" → trỏ vào repo GitHub đã kết nối, hoặc
 * upload trực tiếp thư mục chứa các file HTML/CSS/JS/images.
 */


// force github deploy test
