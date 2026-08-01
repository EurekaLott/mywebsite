/**
 * ⚔️ powerball-view.js — TOÀN BỘ logic riêng của "Powerball USA" trong
 * View Results (Latest Draw / Recent 30 / Copy 24 / Raw-Sorted tabs).
 * KHÔNG đụng gì tới Vietlott hay Keno — sửa file này KHÔNG BAO GIỜ làm
 * hỏng Vietlott/Keno, và ngược lại.
 *
 * Yêu cầu: <script src="draws-data.js"></script> load TRƯỚC main.js
 * để biến global `draws` tồn tại (giữ nguyên như thiết kế cũ).
 */
import { fmtDate, parseDrawDate, dateKeyLocal, copyToClipboard, showToast } from './common.js';

/* ── DATA MODE (Raw / Sorted) — khai báo TRƯỚC renderBalls vì cần dùng ngay ── */
let dataMode='raw';

function formatForNeuralInput(d){
  const w=d.white||[];
  const pb=(d.pb!==undefined)?d.pb:d.powerball;
  return `${w[0]} ${w[1]} ${w[2]} ${w[3]} ${w[4]} ${pb}`;
}

/* ── RENDER BALLS (latest) ──
   ⚔️ SỬA 2 LỖI:
   1. Giờ có nút "📋 Copy" ngay cạnh ngày, giống hệt pattern Keno/Vietlott.
   2. Giờ tôn trọng dataMode (raw/sorted) — trước đây luôn hiện raw dù
      đang bấm tab Sorted, chỉ có bảng Recent 30 bên dưới là đổi theo. */
export function renderBalls(white,pb,dateStr,source){
  const whitesShown = dataMode==='sorted' ? (white||[]).slice().sort((a,b)=>a-b) : white;
  document.getElementById('latestBalls').innerHTML=
    whitesShown.map(n=>`<div class="ball">${n}</div>`).join('')+
    `<div class="ball pb">${pb}</div>`;
  const line = formatForNeuralInput({white: whitesShown, pb});
  document.getElementById('latestDate').innerHTML=
    (fmtDate(dateStr)||'') +
    ` <button class="btn-copy-row" onclick="copyToClipboard('${line}','✅ Copied latest draw (${dataMode==='sorted'?'Sorted':'Raw'})')">📋 Copy</button>`;
  document.getElementById('latestSource').textContent=source||'';
  document.getElementById('resultError').style.display='none';
}

export function showError(msg){
  document.getElementById('resultError').textContent=msg;
  document.getElementById('resultError').style.display='block';
  document.getElementById('latestBalls').innerHTML='<div class="ball spin">↻</div>';
  document.getElementById('latestDate').textContent='';
  document.getElementById('latestSource').textContent='';
}

/* ── LOAD LATEST from draws-data.js (no CORS issue) ── */
export function fetchLatestDraw(){
  if(typeof draws==='undefined'||!draws.length){
    showError('⚠️ No data available.');
    return;
  }
  const d=draws[draws.length-1];
  renderBalls(d.white, d.powerball, d.date, 'draws-data.js (local)');
}

/* ── DATA MODE (Raw / Sorted) ── */
export function setDataMode(mode){
  dataMode=mode;
  document.querySelectorAll('.mode-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.mode===mode);
  });
  fetchLatestDraw();   // ⚔️ THIẾU dòng này là nguyên nhân lỗi #2 — Latest Draw không đổi theo Sorted
  renderRecent30(null);
}

/* ── RENDER RECENT 30 (loại bỏ draw mới nhất vì đã hiện ở trên) ── */
export function renderRecent30(data){
  const tbody=document.getElementById('recentBody');
  tbody.innerHTML='';
  const src=data||(typeof draws!=='undefined'?draws:[]);
  if(!src.length){
    tbody.innerHTML='<tr><td colspan="4" style="color:#778;">No data</td></tr>';
    return;
  }
  const withoutLatest=src.slice(0,-1);
  const recent=withoutLatest.slice(-30).reverse();
  recent.forEach(d=>{
    const row=document.createElement('tr');
    const whitesRaw=d.white||[];
    const whitesShown=dataMode==='sorted' ? whitesRaw.slice().sort((a,b)=>a-b) : whitesRaw;
    const pbVal=(d.pb!==undefined)?d.pb:d.powerball;
    row.innerHTML=`
      <td>${fmtDate(d.date)}</td>
      <td>${whitesShown.join(' &nbsp; ')}</td>
      <td class="pb-num">${pbVal}</td>
      <td><button class="btn-copy-row" onclick='copyRow(${JSON.stringify(d.date)}, ${JSON.stringify(whitesShown)}, ${pbVal}, this)'>📋</button></td>`;
    tbody.appendChild(row);
  });
}

export function copyRow(dateStr,white,pb,btn){
  const line=formatForNeuralInput({white,pb});
  const modeLabel = dataMode==='sorted' ? 'Sorted' : 'Raw';
  const warn = dataMode==='sorted' ? ' ⚠️ Sorted order — switch to the Raw tab before pasting into Neural Networks input' : ' — ready to paste into Neural Networks input';
  copyToClipboard(line, `✅ Copied draw ${fmtDate(dateStr)} (${modeLabel})${warn}`);
  if(btn){
    const old=btn.textContent;
    btn.textContent='✓';
    btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent=old; btn.classList.remove('copied'); },1200);
  }
}

/* ── COPY 24 DRAWS — luật "3-Checkpoint": Mon(1)/Wed(3)/Sat(6),
   cutoff = kỳ quay kế tiếp − 7 ngày, lấy 24 kỳ gần cutoff nhất. ── */
const POWERBALL_DRAW_DAYS=[1,3,6];
function getNextDrawDate(today){
  const d=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  for(let i=0;i<7;i++){
    if(POWERBALL_DRAW_DAYS.includes(d.getDay())) return d;
    d.setDate(d.getDate()+1);
  }
  return d;
}
function getCutoffDate(today){
  const nextDraw=getNextDrawDate(today);
  const cutoff=new Date(nextDraw);
  cutoff.setDate(cutoff.getDate()-7);
  return cutoff;
}

export function copy24Draws(){
  if(typeof draws==='undefined'||!draws.length){
    showToast('⚠️ No data available.');
    return;
  }
  const today=new Date();
  const cutoff=getCutoffDate(today);
  const selected=draws.filter(d=>parseDrawDate(d.date)<=cutoff).slice(-24);
  if(selected.length===0){
    showToast('⚠️ No draws found before the cutoff.');
    return;
  }
  const isSorted = dataMode==='sorted';
  const text=selected.map(d=>{
    const white = isSorted ? (d.white||[]).slice().sort((a,b)=>a-b) : d.white;
    return formatForNeuralInput({white, pb:(d.pb!==undefined)?d.pb:d.powerball});
  }).join('\n');
  const modeLabel = isSorted ? 'Sorted' : 'Raw';
  const warn = isSorted ? ' ⚠️ Sorted order — Neural Networks needs Raw order to work correctly, switch to the Raw tab first for training/prediction' : ' — paste directly into the "Data" box on the Neural Networks page';
  copyToClipboard(text, `✅ Copied ${selected.length} draws (${modeLabel}, cutoff: ${fmtDate(dateKeyLocal(cutoff))})${warn}`);
}

// ⚔️ Cần global vì HTML (tĩnh lẫn sinh động qua innerHTML) dùng onclick trực tiếp
window.copy24Draws = copy24Draws;
window.copyRow = copyRow;
window.setDataMode = setDataMode;
