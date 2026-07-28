/**
 * ⚔️ vietlott-view.js — Logic render các sản phẩm Vietlott
 * (Power655/645/535/Bingo18 dùng dữ liệu tĩnh; Keno dispatch sang
 * keno-live.js vì có nguồn live riêng).
 *
 * Sửa file này KHÔNG ảnh hưởng gì tới Powerball USA (powerball-view.js)
 * hay logic gọi API live Keno (keno-live.js).
 */
import { fmtDate, parseDrawDate, dateKeyLocal, copyToClipboard, showToast } from './common.js';
import { VIETLOTT_META, VIETLOTT_DRAW_DAYS, VIETLOTT_CONTINUOUS } from './vietlott-constants.js';
import { fetchKenoLive, copy24KenoLive } from './keno-live.js';

function getNextDrawDateGeneric(today, drawDays){
  const d=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  for(let i=0;i<7;i++){
    if(drawDays.includes(d.getDay())) return d;
    d.setDate(d.getDate()+1);
  }
  return d;
}
function getCutoffDateGeneric(today, drawDays){
  const nextDraw=getNextDrawDateGeneric(today, drawDays);
  const cutoff=new Date(nextDraw);
  cutoff.setDate(cutoff.getDate()-7);
  return cutoff;
}

// ⚔️ Sản phẩm Vietlott đang xem — module khác (router.js) cần đọc giá
// trị này (handleRefreshClick). ES module export "let" là live-binding,
// tự động cập nhật ở nơi import khi giá trị đổi ở đây — không cần setter.
export let currentVietlottKey=null;

export function copy24VietlottDraws(){
  const key=currentVietlottKey;
  if(!key){ showToast('⚠️ No product selected.'); return; }

  if(key==='keno'){
    copy24KenoLive();
    return;
  }

  const rows=(typeof vietlottData!=='undefined') ? vietlottData[key] : null;
  if(!rows || !rows.length){
    showToast('⚠️ No data available.');
    return;
  }

  let selected, cutoffLabel;

  if(VIETLOTT_CONTINUOUS.includes(key)){
    const withoutLast3 = rows.slice(0, -3);
    selected = withoutLast3.slice(-24);
    const cutoffRow = withoutLast3[withoutLast3.length-1];
    cutoffLabel = cutoffRow ? `kỳ #${cutoffRow.id||'?'} (${fmtDate(cutoffRow.date)})` : '—';
  } else {
    const drawDays = VIETLOTT_DRAW_DAYS[key] || [0,1,2,3,4,5,6];
    const today=new Date();
    const cutoff=getCutoffDateGeneric(today, drawDays);
    selected = rows.filter(d=>parseDrawDate(d.date)<=cutoff).slice(-24);
    cutoffLabel = fmtDate(dateKeyLocal(cutoff));
  }

  if(selected.length===0){
    showToast('⚠️ No draws found before the cutoff.');
    return;
  }

  const text = selected.map(d=>d.numbers.join(' ')).join('\n');
  const meta = VIETLOTT_META[key];
  copyToClipboard(text, `✅ Copied ${selected.length} draws (${meta.label}, cutoff: ${cutoffLabel}) — paste into Neural Networks input`);
}

export function renderVietlott(key){
  currentVietlottKey=key;

  if(key==='keno'){
    fetchKenoLive();
  }

  const meta=VIETLOTT_META[key];
  document.getElementById('resultTitle').textContent=meta.label;
  document.getElementById('recentTitle').textContent='📋 '+meta.title;
  document.getElementById('recentNote').textContent='(not counting the latest draw already shown above)';
  document.getElementById('latestSource').textContent='Source: vietlott.vn (official)';
  document.getElementById('resultError').textContent='';

  const rows=(typeof vietlottData!=='undefined') ? vietlottData[key] : null;

  if(!rows || rows.length===0){
    document.getElementById('latestDate').textContent='—';
    document.getElementById('latestBalls').innerHTML='<div class="ball" style="background:#333;color:#889;">?</div>';
    document.getElementById('resultError').textContent=
      '⚠️ No data yet for this product. The daily GitHub Actions job (fetch-vietlott.js) hasn\'t run successfully yet — check back after the next scheduled run, or trigger it manually from the Actions tab.';
    document.getElementById('recentTableHead').innerHTML='<th>Date</th><th>Numbers</th><th>Copy</th>';
    document.getElementById('recentBody').innerHTML='<tr><td colspan="3" style="color:#778;">No data</td></tr>';
    return;
  }

  const latest=rows[rows.length-1];
  document.getElementById('latestDate').innerHTML=
    `${fmtDate(latest.date)}${latest.id?` (Kỳ #${latest.id})`:''} `+
    `<button class="btn-copy-row" onclick='copyVietlottRow(${JSON.stringify(latest.numbers)}, this)'>📋 Copy</button>`;
  document.getElementById('latestBalls').innerHTML=
    latest.numbers.map(n=>`<div class="ball">${n}</div>`).join('');

  document.getElementById('recentTableHead').innerHTML='<th>Date</th><th>Numbers</th><th>Copy</th>';
  const tbody=document.getElementById('recentBody');
  const withoutLatest=rows.slice(0,-1);
  const recent=withoutLatest.slice(-30).reverse();
  if(recent.length===0){
    tbody.innerHTML='<tr><td colspan="3" style="color:#778;">No earlier draws yet</td></tr>';
    return;
  }
  tbody.innerHTML='';
  recent.forEach(d=>{
    const row=document.createElement('tr');
    row.innerHTML=`
      <td>${fmtDate(d.date)}</td>
      <td>${d.numbers.join(' &nbsp; ')}</td>
      <td><button class="btn-copy-row" onclick='copyVietlottRow(${JSON.stringify(d.numbers)}, this)'>📋</button></td>`;
    tbody.appendChild(row);
  });
}

export function copyVietlottRow(numbers, btn){
  copyToClipboard(numbers.join(' '), '✅ Copied draw');
  if(btn){
    const old=btn.textContent;
    btn.textContent='✓';
    btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent=old; btn.classList.remove('copied'); },1200);
  }
}

// ⚔️ Cần global vì HTML (tĩnh lẫn sinh động qua innerHTML) dùng onclick trực tiếp
window.copy24VietlottDraws = copy24VietlottDraws;
window.copyVietlottRow = copyVietlottRow;
