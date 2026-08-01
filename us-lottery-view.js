/**
 * ⚔️ us-lottery-view.js — Logic DÙNG CHUNG cho MỌI loại xổ số Mỹ
 * (Powerball / Mega Millions / Lotto Texas / ...). Thay vì viết lặp lại
 * 3 module gần giống hệt nhau (rủi ro sửa 1 nơi quên nơi kia), tất cả
 * dùng chung các hàm này, chỉ khác nhau ở US_LOTTERY_CONFIGS.
 *
 * Sửa file này ẢNH HƯỞNG tới cả 3 loại — đây là điểm khác biệt có ý
 * thức so với vietlott-view.js/keno-live.js (vốn mỗi sản phẩm khác biệt
 * đủ nhiều để tách riêng). Ba loại xổ số Mỹ có cấu trúc giống hệt nhau
 * (N số trắng + có thể có 1 số đặc biệt), nên gộp chung là hợp lý.
 */
import { fmtDate, parseDrawDate, dateKeyLocal, copyToClipboard, showToast } from './common.js';
import { US_LOTTERY_CONFIGS } from './us-lottery-constants.js';

export let currentUsLotteryKey = null;

let dataMode = 'raw';

function getData(key) {
  const cfg = US_LOTTERY_CONFIGS[key];
  if (!cfg) return null;
  // eslint-disable-next-line no-undef
  return (typeof window[cfg.dataVar] !== 'undefined') ? window[cfg.dataVar] : null;
}

function getSpecial(d, cfg) {
  return cfg.specialKey ? d[cfg.specialKey] : undefined;
}

function formatForNeuralInput(white, special) {
  const parts = [...white];
  if (special !== null && special !== undefined) parts.push(special);
  return parts.join(' ');
}

/* ⚔️ SỬA 2 LỖI (báo ngày 01/08): thiếu nút Copy cạnh Latest Draw, và
   Sorted không áp dụng cho Latest Draw (chỉ bảng Recent 30 đổi theo). */
export function renderBalls(key, d) {
  const cfg = US_LOTTERY_CONFIGS[key];
  const special = getSpecial(d, cfg);
  const whitesShown = dataMode === 'sorted' ? (d.white || []).slice().sort((a, b) => a - b) : d.white;
  const ballsHtml = whitesShown.map(n => `<div class="ball">${n}</div>`).join('') +
    (special !== undefined ? `<div class="ball ${cfg.specialCssClass}">${special}</div>` : '');
  document.getElementById('latestBalls').innerHTML = ballsHtml;
  const line = formatForNeuralInput(whitesShown, special);
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

export function fetchLatestDraw() {
  const key = currentUsLotteryKey;
  const rows = getData(key);
  if (!rows || !rows.length) {
    showUsLotteryError('⚠️ No data available.');
    return;
  }
  const d = rows[rows.length - 1];
  renderBalls(key, d);
  document.getElementById('latestSource').textContent = `${US_LOTTERY_CONFIGS[key].dataVar}-data.js (local)`;
}

export function setDataMode(mode) {
  dataMode = mode;
  document.querySelectorAll('.mode-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });
  fetchLatestDraw();   // ⚔️ THIẾU dòng này là nguyên nhân lỗi #2 — Latest Draw không đổi theo Sorted
  renderRecent30(null);
}

export function renderRecent30(data) {
  const key = currentUsLotteryKey;
  const cfg = US_LOTTERY_CONFIGS[key];
  const tbody = document.getElementById('recentBody');
  tbody.innerHTML = '';
  const src = data || getData(key) || [];
  if (!src.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#778;">No data</td></tr>';
    return;
  }
  const withoutLatest = src.slice(0, -1);
  const recent = withoutLatest.slice(-30).reverse();
  recent.forEach(d => {
    const row = document.createElement('tr');
    const whitesRaw = d.white || [];
    const whitesShown = dataMode === 'sorted' ? whitesRaw.slice().sort((a, b) => a - b) : whitesRaw;
    const special = getSpecial(d, cfg);
    const specialCell = cfg.specialKey ? `<td class="pb-num">${special}</td>` : '';
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

function getNextDrawDateForKey(today, drawDays) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 7; i++) {
    if (drawDays.includes(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}
function getCutoffDateForKey(today, drawDays) {
  const nextDraw = getNextDrawDateForKey(today, drawDays);
  const cutoff = new Date(nextDraw);
  cutoff.setDate(cutoff.getDate() - 7);
  return cutoff;
}

export function copy24UsLotteryDraws() {
  const key = currentUsLotteryKey;
  const cfg = US_LOTTERY_CONFIGS[key];
  const rows = getData(key);
  if (!rows || !rows.length) {
    showToast('⚠️ No data available.');
    return;
  }
  const today = new Date();
  const cutoff = getCutoffDateForKey(today, cfg.drawDays);
  const selected = rows.filter(d => parseDrawDate(d.date) <= cutoff).slice(-24);
  if (selected.length === 0) {
    showToast('⚠️ No draws found before the cutoff.');
    return;
  }
  const isSorted = dataMode === 'sorted';
  const text = selected.map(d => {
    const white = isSorted ? (d.white || []).slice().sort((a, b) => a - b) : d.white;
    return formatForNeuralInput(white, getSpecial(d, cfg));
  }).join('\n');
  const modeLabel = isSorted ? 'Sorted' : 'Raw';
  const warn = isSorted ? ' ⚠️ Sorted order — switch to Raw before training/prediction' : ' — paste directly into the "Data" box on the Neural Networks page';
  copyToClipboard(text, `✅ Copied ${selected.length} draws (${cfg.label}, ${modeLabel}, cutoff: ${fmtDate(dateKeyLocal(cutoff))})${warn}`);
}

/* ── Gọi khi khách chọn 1 loại xổ số Mỹ trong menu View Results ── */
export function selectUsLottery(key) {
  currentUsLotteryKey = key;
  const cfg = US_LOTTERY_CONFIGS[key];
  document.getElementById('resultTitle').textContent = cfg.label;
  const head = cfg.specialKey
    ? '<th>Date</th><th>White Balls</th><th>Special</th><th>Copy</th>'
    : '<th>Date</th><th>Numbers</th><th>Copy</th>';
  document.getElementById('recentTableHead').innerHTML = head;
  document.getElementById('recentNote').textContent = '(not counting the latest draw already shown above)';
  setDataMode('raw');
  fetchLatestDraw();
  renderRecent30(null);
}

// ⚔️ Cần global vì HTML (tĩnh lẫn sinh động qua innerHTML) dùng onclick trực tiếp
window.copy24UsLotteryDraws = copy24UsLotteryDraws;
window.copyUsLotteryRow = copyUsLotteryRow;
window.setDataMode = setDataMode;
