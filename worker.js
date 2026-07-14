/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * Đây là Worker CÔNG KHAI — phục vụ toàn bộ file tĩnh của website
 * (index.html, powerball.html, community.html, EurekaLott-1A.html,
 * bruce-banner.js, CSS, images...) VÀ đóng vai trò "trạm trung
 * chuyển" (relay) cho 2 route API sang Worker bí mật
 * (eurekalott-engine) — qua Service Binding NỘI BỘ, không qua
 * Internet công khai (Cloudflare chặn Worker fetch() trực tiếp
 * sang Worker *.workers.dev khác — lỗi 1042).
 *
 * Khách hàng CHỈ thấy: fetch('/api/predict') — cùng domain với
 * chính họ đang đứng, không hề biết Worker bí mật nằm ở đâu.
 * ============================================================
 *
 * CÁCH DÙNG:
 * 1. Cần khai báo Service Binding trong wrangler.toml (xem ghi chú
 *    cuối file) để env.ENGINE hoạt động.
 * 2. File này CHỈ cần xử lý /api/predict và /api/powerball, còn
 *    lại để static assets tự phục vụ toàn bộ file HTML/CSS/JS/images
 *    khác trong repo.
 * ============================================================
 */

// ⚔️ KHÔNG dùng URL công khai nữa — Cloudflare chặn Worker fetch() sang
// Worker *.workers.dev khác (lỗi 1042). Dùng env.ENGINE (Service Binding
// khai báo trong wrangler.toml) để gọi trực tiếp nội bộ, không qua Internet.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── /api/predict/<gameKey> — relay POST sang Worker bí mật qua Service Binding ──
    const predictMatch = url.pathname.match(/^\/api\/predict\/([a-zA-Z0-9_-]+)$/);
    if (predictMatch && request.method === 'POST') {
      const gameKey = predictMatch[1];
      const body = await request.text();
      const upstream = await env.ENGINE.fetch(`https://engine/api/predict/${gameKey}`, {
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
      const upstream = await env.ENGINE.fetch('https://engine/api/powerball');
      const respBody = await upstream.text();
      return new Response(respBody, {
        status: upstream.status,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          // ⚠️ CHỈ cache khi thành công — tránh giữ lại lỗi cũ suốt 1 giờ
          'Cache-Control': upstream.ok ? 'public, max-age=3600' : 'no-store',
        },
      });
    }

    // ── Mọi request khác — phục vụ file tĩnh (Static Assets) ──
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

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
 * compatibility_date = "2026-07-14"
 *
 * [assets]
 * directory = "./"
 * binding = "ASSETS"
 * not_found_handling = "404-page"
 * run_worker_first = ["/api/*"]
 *
 * [[services]]
 * binding = "ENGINE"
 * service = "eurekalott-engine"
 *
 * ── Nếu ngài dùng Cloudflare Dashboard (không dùng Wrangler CLI) ──
 * Service Binding cũng có thể cấu hình qua Dashboard: vào Worker
 * "mywebsite" → Settings → Bindings → Add Binding → "Service Binding"
 * → chọn Worker "eurekalott-engine" → đặt tên biến "ENGINE".
 */
