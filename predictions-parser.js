/**
 * ⚔️ predictions-parser.js — CHỈ lo đọc predictions.txt (text thuần, không
 * phải code) và biến thành dữ liệu dùng được. Dùng chung cho cả
 * prediction.html (hiện kỳ mới nhất) và archive.html (hiện các kỳ cũ).
 *
 * predictions.txt format — mỗi kỳ 1 khối, các khối cách nhau bởi 1 dòng
 * chỉ có "===". KHÔNG cần dấu ngoặc, dấu phẩy, dấu ngoặc kép gì cả.
 * Dòng đầu mỗi khối cho biết đây là dự đoán loại nào — CHỈ 2 nhãn được
 * nhận diện: "VIETLOTT655" và "POWERBALL USA" (không phân biệt hoa
 * thường). Có thể xen kẽ 2 loại tự do, không cần theo thứ tự cố định:
 *
 *   VIETLOTT655
 *   23 July 2026
 *   23 31
 *   03 31
 *   ...
 *   ===
 *   POWERBALL USA
 *   25 July 2026
 *   05 12
 *   28 33
 *   ...
 *
 * Khối CUỐI CÙNG trong file = dự đoán hiện tại. Mọi khối trước đó tự
 * động là archive — không cần thao tác gì thêm ngoài việc gõ thêm khối
 * mới xuống cuối file.
 */

const MONTHS_EN = ["","january","february","march","april","may","june",
  "july","august","september","october","november","december"];

// "23 July 2026" → "2026-07-23" (dùng để đối chiếu với "date" trả về từ
// /api/vietlott-live — Power 6/55 chỉ quay 1 kỳ/ngày nên so theo ngày là
// đủ chính xác, không cần số kỳ).
function parseHumanDate(str) {
  const m = str.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const monthIdx = MONTHS_EN.indexOf(m[2].toLowerCase());
  if (monthIdx < 1) return null;
  return `${m[3]}-${String(monthIdx).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}

// Dòng đầu khối ("VIETLOTT655", "POWERBALL USA"...) → biết dự đoán này
// dùng API nào để lấy kết quả thật (đối chiếu ở archive.html) và key
// sản phẩm cần truyền cho API đó. Thêm loại xổ số mới sau này (VD Mega
// Millions) → CHỈ cần thêm 1 dòng vào bảng này, không sửa gì khác.
//   apiType 'vietlott' → gọi /api/vietlott-live?product=<apiKey>
//                         (kết quả trả về dạng { date, id, numbers:[...] })
//   apiType 'us'       → gọi /api/us-live?game=<apiKey>
//                         (kết quả trả về dạng { date, white:[...], <specialField> })
const LABEL_META = {
  'VIETLOTT655':   { apiType: 'vietlott', apiKey: 'power655' },
  'POWERBALL USA': { apiType: 'us',       apiKey: 'powerball', specialField: 'powerball' },
  'POWERBALL':     { apiType: 'us',       apiKey: 'powerball', specialField: 'powerball' },
};

// URL slug (dùng trong prediction.html?game=... và archive.html?game=...)
// → cùng { apiType, apiKey } như trên, để 2 trang biết đang lọc dự đoán
// loại nào. Thêm loại mới → thêm 1 dòng ở CẢ ĐÂY và LABEL_META phía trên.
export const GAME_SLUGS = {
  vietlott655:  { apiType: 'vietlott', apiKey: 'power655' },
  powerballusa: { apiType: 'us',       apiKey: 'powerball' },
};

export function parsePredictionsText(raw) {
  if (!raw || !raw.trim()) return [];
  const blocks = raw.split(/^\s*===\s*$/m).map(b => b.trim()).filter(b => b);

  return blocks.map(block => {
    const lines = block.split(/\r?\n/).map(s => s.trim()).filter(s => s !== '');
    const label = lines[0] || '';
    const dateRaw = lines[1] || '';
    const date = parseHumanDate(dateRaw);
    const meta = LABEL_META[label.toUpperCase()] || null;

    const pairs = [];
    for (let i = 2; i < lines.length; i++) {
      const n = lines[i].split(/\s+/).map(Number);
      if (n.length === 2 && Number.isFinite(n[0]) && Number.isFinite(n[1])) pairs.push(n);
    }

    return { label, dateRaw, date, pairs, apiType: meta?.apiType || null, apiKey: meta?.apiKey || null, specialField: meta?.specialField };
  });
}

export async function fetchPredictions() {
  const res = await fetch(`predictions.txt?t=${Date.now()}`, { cache: 'no-store' });
  const text = await res.text();
  return parsePredictionsText(text);
}

// ⚔️ Lọc riêng các dự đoán thuộc 1 loại (VD chỉ Vietlott 655, hoặc chỉ
// Powerball USA) — CẦN THIẾT vì 2 loại giờ xen kẽ tự do trong cùng 1
// predictions.txt. "current" = khối CUỐI CÙNG của loại đó trong file;
// "archived" = mọi khối trước đó CỦA CÙNG LOẠI (không tính khối của
// loại kia), mới nhất lên đầu.
export function splitByGame(all, gameSlug) {
  const wanted = GAME_SLUGS[gameSlug];
  if (!wanted) return { current: null, archived: [] };
  const filtered = all.filter(e => e.apiType === wanted.apiType && e.apiKey === wanted.apiKey);
  if (filtered.length === 0) return { current: null, archived: [] };
  return {
    current: filtered[filtered.length - 1],
    archived: filtered.slice(0, -1).reverse(),
  };
}
