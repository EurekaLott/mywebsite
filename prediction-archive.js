/**
 * ⚔️ prediction-archive.js — CHỈ lo hiển thị trang Archive (archive.html).
 * Đọc dữ liệu từ predictions.txt (text thuần, qua predictions-parser.js)
 * — KHÔNG chứa dữ liệu dự đoán ở đây. Không đụng gì tới prediction.html /
 * index.html.
 *
 * Luồng: với mỗi dự đoán cũ (mọi khối trừ khối CUỐI trong predictions.txt
 * — khối cuối là dự đoán hiện tại, không phải archive), gọi API LIVE
 * tương ứng (Vietlott hoặc US lottery — CÙNG API mà trang chủ đang dùng)
 * để lấy kết quả quay thật, đối chiếu theo NGÀY, rồi tô màu từng số
 * trong các cặp dự đoán: trúng số thường = cam, trúng số Power/ĐB = đỏ,
 * trượt = xám — y hệt cách app Vietlott tô ticket thật.
 *
 * predictions.txt hỗ trợ 2 loại nhãn ở dòng đầu mỗi khối (xem
 * predictions-parser.js): "VIETLOTT655" và "POWERBALL USA" — mỗi loại
 * tự động gọi đúng API của nó, không cần khai báo gì thêm.
 */
import { pad2, fmtDate } from './common.js';
import { VIETLOTT_META } from './vietlott-constants.js';
import { US_LOTTERY_CONFIGS } from './us-lottery-constants.js';
import { fetchPredictions, splitByGame } from './predictions-parser.js';

// ── Lấy kết quả live theo đúng apiType của từng dự đoán ──
async function fetchRows(entry) {
  try {
    if (entry.apiType === 'vietlott') {
      const res = await fetch(`/api/vietlott-live?product=${entry.apiKey}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      return (data.ok && data.rows) ? data.rows : [];
    }
    if (entry.apiType === 'us') {
      const res = await fetch(`/api/us-live?game=${entry.apiKey}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      return (data.ok && data.rows) ? data.rows : [];
    }
  } catch (_) { /* rơi xuống trả mảng rỗng bên dưới */ }
  return [];
}

function findMatchingDraw(rows, entry) {
  if (!entry.date) return null;
  return rows.find(r => r.date === entry.date) || null;
}

// ── Tách 1 kết quả thật thành { normal:[...], special:n|null } —
// KHÁC NHAU theo apiType vì worker.js trả 2 hình dạng dữ liệu khác nhau:
//   vietlott → { numbers:[...] }        (bóng đặc biệt là PHẦN TỬ CUỐI)
//   us       → { white:[...], <specialField> }
function splitActual(entry, drawRow) {
  if (entry.apiType === 'vietlott') {
    const numbers = drawRow.numbers || [];
    // power655 = 6 thường + 1 Power (phần tử cuối); các sản phẩm khác
    // đang không dùng trong Prediction Center nên coi cả mảng là "thường".
    if (entry.apiKey === 'power655' && numbers.length === 7) {
      return { normal: numbers.slice(0, 6), special: numbers[6] };
    }
    return { normal: numbers, special: null };
  }
  if (entry.apiType === 'us') {
    const special = entry.specialField ? drawRow[entry.specialField] : undefined;
    return { normal: drawRow.white || [], special: (special === undefined ? null : special) };
  }
  return { normal: [], special: null };
}

function pairNumberClass(n, actual) {
  if (!actual) return 'pending';
  if (actual.special !== null && n === actual.special) return 'match-special';
  if (actual.normal.includes(n)) return 'match-normal';
  return 'miss';
}

function renderPairsRow(pairs, actual) {
  return pairs.map(([a, b]) => `
    <div class="pair-row">
      <div class="ball archive-ball ${pairNumberClass(a, actual)}">${pad2(a)}</div>
      <span class="pair-or">or</span>
      <div class="ball archive-ball ${pairNumberClass(b, actual)}">${pad2(b)}</div>
    </div>`).join('');
}

function renderActualBalls(entry, drawRow) {
  if (!drawRow) return `<div class="pending-note">⏳ Chưa có kết quả kỳ này (chưa quay hoặc ngoài phạm vi 31 kỳ gần nhất).</div>`;
  const { normal, special } = splitActual(entry, drawRow);
  const balls = normal.map(n => `<div class="ball archive-ball drawn">${pad2(n)}</div>`).join('')
    + (special !== null ? `<div class="ball archive-ball drawn special">${pad2(special)}</div>` : '');
  const idLabel = drawRow.id ? ` #${drawRow.id}` : '';
  return `
    <div class="actual-label">Kết quả kỳ quay${idLabel} — ${fmtDate(drawRow.date)}</div>
    <div class="balls-row">${balls}</div>`;
}

function labelFor(entry) {
  if (entry.apiType === 'vietlott') return (VIETLOTT_META[entry.apiKey] || {}).label || entry.label;
  if (entry.apiType === 'us') return (US_LOTTERY_CONFIGS[entry.apiKey] || {}).label || entry.label;
  return entry.label;
}

// ⚔️ ?game=vietlott655 hoặc ?game=powerballusa trên URL → chỉ hiện
// archive của đúng loại đó (2 loại HOÀN TOÀN ĐỘC LẬP — xem
// predictions-parser.js). Không truyền ?game= → hiện gộp archive của
// CẢ 2 loại (mỗi loại tự loại trừ đúng "dự đoán hiện tại" của riêng nó).
function getArchived(all) {
  const gameSlug = new URLSearchParams(location.search).get('game');
  if (gameSlug) return splitByGame(all, gameSlug).archived;

  const currentIdxByType = new Map();
  all.forEach((e, i) => { if (e.apiType && e.apiKey) currentIdxByType.set(e.apiType + '|' + e.apiKey, i); });
  const currentIdxs = new Set(currentIdxByType.values());
  return all.filter((_, i) => !currentIdxs.has(i)).slice().reverse();
}

async function renderArchive() {
  const root = document.getElementById('archiveList');
  const all = await fetchPredictions();
  const archived = getArchived(all);

  if (archived.length === 0) {
    root.innerHTML = `<div class="empty-note">Chưa có dự đoán cũ nào trong Archive — Archive sẽ tự hiện ra ngay khi có dự đoán mới được post.</div>`;
    return;
  }

  const rowsByEntry = await Promise.all(archived.map(fetchRows));

  root.innerHTML = archived.map((entry, i) => {
    const drawRow = findMatchingDraw(rowsByEntry[i], entry);
    const shape = drawRow ? splitActual(entry, drawRow) : null;

    return `
      <div class="archive-card">
        <div class="archive-head">
          <span class="archive-game">${labelFor(entry)}</span>
          <span class="archive-date">${entry.dateRaw}</span>
        </div>
        <div class="archive-section-label">Dự đoán đã post (chọn 1 trong mỗi cặp)</div>
        <div class="pairs-wrap">${renderPairsRow(entry.pairs, shape)}</div>
        <div class="archive-actual">${renderActualBalls(entry, drawRow)}</div>
      </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', renderArchive);
