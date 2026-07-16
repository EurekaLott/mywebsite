/**
 * ⚔️ FRONTEND WORKER — mywebsite.trongcuong-org.workers.dev
 * ============================================================
 * ⚔️ ĐÃ BỎ HẲN VIỆC RELAY /api/* — trước đây Cloudflare đứng giữa
 * "chuyển tiếp" request sang Render, nên khi Render ngủ/chậm thức dậy,
 * chính Cloudflare cũng bị tính giờ theo và có thể dính lỗi 524.
 *
 * ⚔️ THIẾT KẾ MỚI: Cloudflare CHỈ còn 1 nhiệm vụ duy nhất — đưa file
 * tĩnh (HTML/CSS/JS/ảnh) ra cho khách hàng, việc này SIÊU NHANH, không
 * bao giờ chậm, không đụng gì tới Render cả → không còn khả năng dính
 * 524 nữa, vì Cloudflare không "đợi" Render trả lời hộ ai nữa.
 *
 * Trình duyệt của khách (JavaScript ngay trong EurekaLott-1A.html) sẽ
 * TỰ gọi thẳng sang Render (biến API_BASE trong file HTML đó), không
 * đi qua Cloudflare nữa — nên dù Render có ngủ, chậm thức dậy tới đâu,
 * Cloudflare cũng không hề bị ảnh hưởng, không có lỗi 524 nào cả.
 * ============================================================
 */

export default {
  async fetch(request, env, ctx) {
    // ── CHỈ còn 1 việc: phục vụ file tĩnh, luôn nhanh, không bao giờ ngủ ──
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Static Assets chưa được cấu hình.', { status: 501 });
  },
};
