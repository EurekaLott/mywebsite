/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * ⚔️ QUAY LẠI DÙNG CLOUDFLARE LÀM "CỬA CHÍNH" — vì Cloudflare Workers
 * KHÔNG BAO GIỜ ngủ đông (khác hẳn Render Web Service free, có sleep).
 * Trước đây từng rời Cloudflare vì lỗi 524 (timeout 100 giây) khi 1
 * request phải "đợi" cả thuật toán chạy xong. Giờ vấn đề đó ĐÃ HẾT vì
 * backend Render dùng mô hình JOB + POLLING — mỗi lần Cloudflare gọi
 * sang Render đều rất nhanh (dưới 1 giây: tạo job, hoặc hỏi tiến độ),
 * không bao giờ "đợi" thuật toán chạy trực tiếp trong 1 request nữa.
 *
 * Khách hàng CHỈ thấy: fetch('/api/predict/powerball1') — cùng domain,
 * không hề biết URL thật của Render nằm ở đâu.
 * ============================================================
 */

const ENGINE_URL = 'https://eurekalott-engine-render.onrender.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── GET /api/predict/status/<jobId> — hỏi thăm tiến độ, RẤT nhanh ──
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

    // ── POST /api/predict/<gameKey> — tạo job, trả jobId NGAY (dưới 1 giây) ──
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

    // ── Mọi request khác — phục vụ file tĩnh, LUÔN NHANH, không ngủ ──
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Static Assets chưa được cấu hình.', { status: 501 });
  },
};
