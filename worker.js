/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * Đây là Worker CÔNG KHAI — phục vụ toàn bộ file tĩnh của website
 * (index.html, powerball.html, community.html, EurekaLott-1A.html,
 * bruce-banner.js, CSS, images...) VÀ đóng vai trò "trạm trung
 * chuyển" (relay) cho 2 route API sang server engine thật
 * (chạy trên Render.com — https://eurekalott-engine-render.onrender.com).
 *
 * ⚔️ LÝ DO ĐỔI SANG RENDER (thay vì Cloudflare eurekalott-engine):
 * Cloudflare Workers Free giới hạn 10ms CPU time/request — không đủ
 * để train TitanRNN nhiều epoch (luôn bị lỗi "exceeded CPU time limit").
 * Render.com free tier không giới hạn CPU kiểu đó, phù hợp cho tính
 * toán nặng. Đây là cách MIỄN PHÍ, không cần nâng cấp gói Cloudflare.
 *
 * Khách hàng CHỈ thấy: fetch('/api/predict/powerball1') — cùng domain
 * với chính họ đang đứng, không hề biết URL server thật nằm ở Render.
 * ============================================================
 */

// ⚠️ SỬA ĐÚNG URL Render thật của ngài ở đây nếu có thay đổi
const ENGINE_URL = 'https://eurekalott-engine-render.onrender.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── /api/predict/<gameKey> — relay POST sang Render ──
    const predictMatch = url.pathname.match(/^\/api\/predict\/([a-zA-Z0-9_-]+)$/);
    if (predictMatch && request.method === 'POST') {
      const gameKey = predictMatch[1];
      try {
        const body = await request.text();
        const upstream = await fetch(`${ENGINE_URL}/api/predict/${gameKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const respBody = await upstream.text();
        return new Response(respBody, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      } catch (err) {
        // ⚠️ Bắt mọi exception (ví dụ Render đang "ngủ" — free tier ngủ sau
        // 15 phút không có request, lần gọi đầu có thể mất 30-50s để "thức dậy")
        return new Response(
          JSON.stringify({ error: `Relay tới engine thất bại: ${err.message || String(err)}` }),
          { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
    }

    // ── /api/powerball — relay GET sang Render (Texas Proxy) ──
    if (url.pathname === '/api/powerball' && request.method === 'GET') {
      try {
        const upstream = await fetch(`${ENGINE_URL}/api/powerball`);
        const respBody = await upstream.text();
        return new Response(respBody, {
          status: upstream.status,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': upstream.ok ? 'public, max-age=3600' : 'no-store',
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: `Relay tới engine thất bại: ${err.message || String(err)}` }),
          { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
    }

    // ── Mọi request khác — phục vụ file tĩnh (Static Assets) ──
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      'Static Assets chưa được cấu hình. Xem ghi chú wrangler.toml.',
      { status: 501 }
    );
  },
};

/**
 * ⚠️ CẤU HÌNH wrangler.toml MẪU (đặt cùng thư mục với worker.js):
 * KHÔNG CẦN Service Binding [[services]] nữa — đã bỏ, vì không còn gọi
 * sang Worker Cloudflare khác nữa, chỉ gọi ra Internet bình thường tới Render.
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
 */
