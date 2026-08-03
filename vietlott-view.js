/**
 * ⚔️ vietlott-view.js — Logic render các sản phẩm Vietlott.
 * Keno vẫn dispatch sang keno-live.js (nguồn live riêng, xosominhngoc.net.vn,
 * KHÔNG đụng ở đây). 4 sản phẩm còn lại (Power655/645/535/Bingo18) giờ
 * CŨNG LIVE — gọi /api/vietlott-live và /api/vietlott-copy24 trong
 * worker.js (nguồn GitHub vietvudanh/vietlott-data, có fallback Minh Ngọc
 * riêng cho Power655/Power645) — bỏ hẳn đọc file tĩnh vietlott-data.js.
 *
 * Sửa file này KHÔNG ảnh hưởng gì tới Powerball USA (us-lottery-view.js)
 * hay logic gọi API live Keno (keno-live.js).
 */
import { fmtDate, copyToClipboard, showToast } from './common.js';
import { VIETLOTT_META } from './vietlott-constants.js';
import { fetchKenoLive, copy24KenoLive } from './keno-live.js';

// ⚔️ Sản phẩm Vietlott đang xem — module khác (router.js) cần đọc giá
// trị này (handleRefreshClick). ES module export "let" là live-binding,
// tự động cập nhật ở nơi import khi giá trị đổi ở đây — không cần setter.
export let currentVietlottKey = null;

let lastRows = []; // cache /api/vietlott-live gần nhất (rows[0] = mới nhất), dùng khi Refresh không cần thiết

// ⚔️ Gọi khi chuyển sang xem xổ số Mỹ (Powerball/Mega Millions/Lotto Texas)
// — PHẢI reset về null, nếu không handleRefreshClick() ở router.js sẽ
// tưởng nhầm vẫn đang xem Vietlott/Keno (bug tiềm ẩn đã sửa).
export function resetVietlottKey() {
  currentVietlottKey = null;
}

export async function copy24VietlottDraws() {
  const key = currentVietlottKey;
  if (!key) { showToast('⚠️ No product selected.'); return; }

  if (key === 'keno') {
    copy24KenoLive();
    return;
  }

  showToast('⏳ Đang lấy 24 kỳ live...');
  try {
    const res = await fetch(`/api/vietlott-copy24?product=${key}&t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.ok) {
      showToast('⚠️ ' + (data.error || 'No data available.'));
      return;
    }
    if (!data.rows || data.rows.length === 0) {
      showToast('⚠️ No draws found before the cutoff.');
      return;
    }
    const text = data.rows.map(d => d.numbers.join(' ')).join('\n');
    const meta = VIETLOTT_META[key];
    copyToClipboard(text, `✅ Copied ${data.rows.length} draws (${meta.label}, cutoff: ${data.cutoffLabel}) — paste into Neural Networks input`);
  } catch (err) {
    showToast('⚠️ Mất kết nối khi lấy Copy 24 Draws.');
  }
}

export async function renderVietlott(key) {
  currentVietlottKey = key;
  lastRows = [];

  if (key === 'keno') {
    fetchKenoLive();
    return; // Keno tự vẽ DOM trong keno-live.js, không đụng thêm ở đây
  }

  const meta = VIETLOTT_META[key];
  document.getElementById('resultTitle').textContent = meta.label;
  document.getElementById('recentTitle').textContent = '📋 ' + meta.title;
  document.getElementById('recentNote').textContent = '(not counting the latest draw already shown above)';
  document.getElementById('recentTableHead').innerHTML = '<th>Date</th><th>Numbers</th><th>Copy</th>';
  document.getElementById('resultError').textContent = '';
  document.getElementById('resultError').style.display = 'none';
  document.getElementById('latestBalls').innerHTML = '<div class="ball spin">↻</div>';
  document.getElementById('latestSource').textContent = '⏳ Đang lấy dữ liệu live...';

  try {
    const res = await fetch(`/api/vietlott-live?product=${key}&t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();

    if (!data.ok || !data.rows || data.rows.length === 0) {
      document.getElementById('latestDate').textContent = '—';
      document.getElementById('latestBalls').innerHTML = '<div class="ball" style="background:#333;color:#889;">?</div>';
      document.getElementById('latestSource').textContent = '';
      document.getElementById('resultError').style.display = 'block';
      document.getElementById('resultError').textContent =
        '⚠️ ' + (data.error || 'No data available.') + ' — thử bấm Refresh lại sau ít phút.';
      document.getElementById('recentBody').innerHTML = '<tr><td colspan="3" style="color:#778;">No data</td></tr>';
      return;
    }

    lastRows = data.rows;
    const latest = lastRows[0];
    document.getElementById('latestDate').innerHTML =
      `${fmtDate(latest.date)}${latest.id ? ` (Kỳ #${latest.id})` : ''} ` +
      `<button class="btn-copy-row" onclick='copyVietlottRow(${JSON.stringify(latest.numbers)}, this)'>📋 Copy</button>`;
    document.getElementById('latestBalls').innerHTML =
      latest.numbers.map(n => `<div class="ball">${n}</div>`).join('');
    const fetchedTime = new Date(data.fetchedAt).toLocaleTimeString('vi-VN');
    document.getElementById('latestSource').textContent = `🟢 LIVE (${data.source}) lúc ${fetchedTime}`;

    const recent = lastRows.slice(1, 31);
    const tbody = document.getElementById('recentBody');
    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:#778;">No earlier draws yet</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    recent.forEach(d => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${fmtDate(d.date)}${d.id ? ` (Kỳ ${d.id})` : ''}</td>
        <td>${d.numbers.join(' &nbsp; ')}</td>
        <td><button class="btn-copy-row" onclick='copyVietlottRow(${JSON.stringify(d.numbers)}, this)'>📋</button></td>`;
      tbody.appendChild(row);
    });
  } catch (err) {
    document.getElementById('resultError').style.display = 'block';
    document.getElementById('resultError').textContent = '⚠️ Mất kết nối khi lấy dữ liệu live.';
  }
}

export function copyVietlottRow(numbers, btn) {
  copyToClipboard(numbers.join(' '), '✅ Copied draw');
  if (btn) {
    const old = btn.textContent;
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('copied'); }, 1200);
  }
}

// ⚔️ Cần global vì HTML (tĩnh lẫn sinh động qua innerHTML) dùng onclick trực tiếp
window.copy24VietlottDraws = copy24VietlottDraws;
window.copyVietlottRow = copyVietlottRow;
