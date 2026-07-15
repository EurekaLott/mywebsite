/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * ⚔️ MÔ HÌNH JOB BẤT ĐỒNG BỘ — relay 2 route mới sang Render:
 *   1. POST /api/predict/<gameKey>        → tạo job, trả jobId NGAY
 *   2. GET  /api/predict/status/<jobId>   → hỏi thăm tiến độ, cực nhanh
 * Cả 2 route đều rất nhanh (dưới 1 giây), không bao giờ chạm giới hạn
 * 100 giây cứng của Cloudflare — dù thuật toán thật chạy nền bên Render
 * có thể mất vài phút cho đủ 12 epoch cấu hình chuẩn.
 * ============================================================
 */

const ENGINE_URL = 'https://eurekalott-engine-render.onrender.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── GET /api/predict/status/<jobId> — hỏi thăm tiến độ ──
    const statusMatch = url.pathname.match(/^\/api\/predict\/status\/([a-zA-Z0-9-]+)$/);
    if (statusMatch && request.method === 'GET') {
      try {
        const upstream = await fetch(`${ENGINE_URL}/api/predict/status/${statusMatch[1]}`);
        const respBody = await upstream.text();
        return new Response(respBody, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: `Relay tới engine thất bại: ${err.message || String(err)}` }),
          { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
    }

    // ── POST /api/predict/<gameKey> — tạo job train, trả jobId NGAY LẬP TỨC ──
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
