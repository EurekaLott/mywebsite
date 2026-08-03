/**
 * ⚔️ us-lottery-view.js — Logic DÙNG CHUNG cho MỌI loại xổ số Mỹ
 * (Powerball / Mega Millions / Lotto Texas / ...). Thay vì viết lặp lại
 * 3 module gần giống hệt nhau (rủi ro sửa 1 nơi quên nơi kia), tất cả
 * dùng chung các hàm này, chỉ khác nhau ở US_LOTTERY_CONFIGS.
 *
 * ⚔️ ĐÃ CHUYỂN SANG LIVE (bỏ hẳn đọc file tĩnh draws-data.js /
 * megamillions-data.js / lottotexas-data.js) — giờ gọi thẳng
 * /api/us-live và /api/us-copy24 trong worker.js, y hệt cơ chế Keno.
 * Không còn phụ thuộc GitHub Actions pipeline cho phần hiển thị này.
 *
 * Sửa file này ẢNH HƯỞNG tới cả 3 loại — đây là điểm khác biệt có ý
 * thức so với vietlott-view.js/keno-live.js (vốn mỗi sản phẩm khác biệt
 * đủ nhiều để tách riêng). Ba loại xổ số Mỹ có cấu trúc giống hệt nhau
 * (N số trắng + có thể có 1 số đặc biệt), nên gộp chung là hợp lý.
 */
import { fmtDate, copyToClipboard, showToast, pad2 } from './common.js';
import { US_LOTTERY_CONFIGS } from './us-lottery-constants.js';

export let currentUsLotteryKey = null;

let dataMode = 'raw';
let lastRows = []; // cache kết quả /api/us-live gần nhất (rows[0] = mới nhất) để đổi Raw/Sorted không cần fetch lại

function getSpecial(d, cfg) {
  return cfg.specialKey ? d.special : undefined;
}

function formatForNeuralInput(white, special) {
  const parts = [...white];
  if (special !== null && special !== undefined) parts.push(special);
  return parts.join(' ');
}

export function renderBalls(key, d) {
  const cfg = US_LOTTERY_CONFIGS[key];
  const special = getSpecial(d, cfg);
  const whitesShown = dataMode === 'sorted' ? (d.white || []).slice().sort((a, b) => a - b) : d.white;
  const ballsHtml = whitesShown.map(n => `<div class="ball">${pad2(n)}</div>`).join('') +
    (special !== undefined ? `<div class="ball ${cfg.specialCssClass}">${pad2(special)}</div>` : '');
  document.getElementById('latestBalls').innerHTML = ballsHtml;
  const line = formatForNeuralInput(whitesShown.map(pad2), special !== undefined ? pad2(special) : special);
  document.getElementById('latestDate').innerHTML =
    (fmtDate(d.date) || '') +
    ` <button class="btn-copy-row" onclick="copyToClipboard('${line}','✅ Copied latest draw (${dataMode==='sorted'?'Sorted':'Raw'})')">📋 Copy</button>`;
  document.getElementById('resultError').style.display = 'none';
}

export function showUsLotteryError(msg) {
  document.getElementById('resultError').textContent = msg;
  document.getElementById('resultError').style.display = 'block';
  document.getElementById('latestBalls').innerHTML = '<div class="ball spin">↻</div>';
  document.getElementById('latestDate').textContent = '';
  document.getElementById('latestSource').textContent = '';
}

export async function fetchLatestDraw() {
  const key = currentUsLotteryKey;
  if (!key) return;

  document.getElementById('latestBalls').innerHTML = '<div class="ball spin">↻</div>';
  document.getElementById('latestSource').textContent = '⏳ Đang lấy dữ liệu live...';

  try {
    const res = await fetch(`/api/us-live?game=${key}&t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();

    if (!data.ok || !data.rows || data.rows.length === 0) {
      showUsLotteryError('⚠️ ' + (data.error || 'No data available.'));
      renderRecent30([]);
      return;
    }

    lastRows = data.rows; // rows[0] = mới nhất
    renderBalls(key, lastRows[0]);
    const fetchedTime = new Date(data.fetchedAt).toLocaleTimeString('vi-VN');
    document.getElementById('latestSource').textContent = `🟢 LIVE (texaslottery.com) lúc ${fetchedTime}`;
    renderRecent30(lastRows.slice(1));
  } catch (err) {
    showUsLotteryError('⚠️ Mất kết nối khi lấy dữ liệu live.');
    renderRecent30([]);
  }
}

export function setDataMode(mode) {
  dataMode = mode;
  document.querySelectorAll('.mode-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });
  if (lastRows.length > 0) {
    renderBalls(currentUsLotteryKey, lastRows[0]);
    renderRecent30(lastRows.slice(1));
  }
}

export function renderRecent30(rows) {
  const key = currentUsLotteryKey;
  const cfg = US_LOTTERY_CONFIGS[key];
  const tbody = document.getElementById('recentBody');
  tbody.innerHTML = '';
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#778;">No data</td></tr>';
    return;
  }
  const recent = rows.slice(0, 30);
  recent.forEach(d => {
    const row = document.createElement('tr');
    const whitesRaw = d.white || [];
    const whitesShown = dataMode === 'sorted' ? whitesRaw.slice().sort((a, b) => a - b) : whitesRaw;
    const special = getSpecial(d, cfg);
    const specialCell = cfg.specialKey ? `<td class="pb-num">${pad2(special)}</td>` : '';
    row.innerHTML = `
      <td>${fmtDate(d.date)}</td>
      <td>${whitesShown.join(' &nbsp; ')}</td>
      ${specialCell}
      <td><button class="btn-copy-row" onclick='copyUsLotteryRow(${JSON.stringify(d.date)}, ${JSON.stringify(whitesShown)}, ${JSON.stringify(special ?? null)}, this)'>📋</button></td>`;
    tbody.appendChild(row);
  });
}

export function copyUsLotteryRow(dateStr, white, special, btn) {
  const line = formatForNeuralInput(white, special);
  const modeLabel = dataMode === 'sorted' ? 'Sorted' : 'Raw';
  const warn = dataMode === 'sorted' ? ' ⚠️ Sorted order — switch to Raw before pasting into Neural Networks input' : ' — ready to paste into Neural Networks input';
  copyToClipboard(line, `✅ Copied draw ${fmtDate(dateStr)} (${modeLabel})${warn}`);
  if (btn) {
    const old = btn.textContent;
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('copied'); }, 1200);
  }
}

export async function copy24UsLotteryDraws() {
  const key = currentUsLotteryKey;
  const cfg = US_LOTTERY_CONFIGS[key];
  showToast('⏳ Đang lấy 24 kỳ live...');
  try {
    const res = await fetch(`/api/us-copy24?game=${key}&t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.ok) {
      showToast('⚠️ ' + (data.error || 'No data available.'));
      return;
    }
    if (!data.rows || data.rows.length === 0) {
      showToast('⚠️ No draws found before the cutoff.');
      return;
    }
    const isSorted = dataMode === 'sorted';
    const text = data.rows.map(d => {
      const white = isSorted ? (d.white || []).slice().sort((a, b) => a - b) : d.white;
      return formatForNeuralInput(white, getSpecial(d, cfg));
    }).join('\n');
    const modeLabel = isSorted ? 'Sorted' : 'Raw';
    const warn = isSorted ? ' ⚠️ Sorted order — switch to Raw before training/prediction' : ' — paste directly into the "Data" box on the Neural Networks page';
    copyToClipboard(text, `✅ Copied ${data.rows.length} draws (${cfg.label}, ${modeLabel}, cutoff: ${fmtDate(data.cutoffDate)})${warn}`);
  } catch (err) {
    showToast('⚠️ Mất kết nối khi lấy Copy 24 Draws.');
  }
}

/* ── Gọi khi khách chọn 1 loại xổ số Mỹ trong menu View Results ── */
export function selectUsLottery(key) {
  currentUsLotteryKey = key;
  lastRows = [];
  const cfg = US_LOTTERY_CONFIGS[key];
  document.getElementById('resultTitle').textContent = cfg.label;
  const head = cfg.specialKey
    ? '<th>Date</th><th>White Balls</th><th>Special</th><th>Copy</th>'
    : '<th>Date</th><th>Numbers</th><th>Copy</th>';
  document.getElementById('recentTableHead').innerHTML = head;
  document.getElementById('recentNote').textContent = '(not counting the latest draw already shown above)';
  dataMode = 'raw';
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === 'raw'));
  fetchLatestDraw();
}

// ⚔️ Cần global vì HTML (tĩnh lẫn sinh động qua innerHTML) dùng onclick trực tiếp
window.copy24UsLotteryDraws = copy24UsLotteryDraws;
window.copyUsLotteryRow = copyUsLotteryRow;
window.setDataMode = setDataMode;
