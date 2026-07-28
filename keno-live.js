/**
 * ⚔️ keno-live.js — TOÀN BỘ logic gọi API live Keno (/api/keno-live,
 * /api/keno-copy24). Đây là module DUY NHẤT được phép gọi 2 endpoint
 * này. Sửa logic live Keno → CHỈ sửa file này.
 *
 * Phụ thuộc: VIETLOTT_META (từ vietlott-view.js) để lấy nhãn hiển thị.
 * Không phụ thuộc ngược lại — vietlott-view.js gọi VÀO đây (renderVietlott
 * gọi fetchKenoLive khi key==='keno'), không có phụ thuộc vòng.
 */
import { fmtDate, copyToClipboard, showToast } from './common.js';
import { VIETLOTT_META } from './vietlott-constants.js';

export async function fetchKenoLive(){
  const btn=document.getElementById('refreshBtn');
  const prevLabel=btn.textContent;
  btn.textContent='⏳ Đang lấy số live...';
  btn.disabled=true;

  try{
    const res=await fetch('/api/keno-live?t='+Date.now(),{cache:'no-store'});
    const data=await res.json();

    if(!data.ok || !data.rows || data.rows.length===0){
      document.getElementById('resultError').style.display='block';
      document.getElementById('resultError').textContent=
        '⚠️ Không lấy được số Keno LIVE ('+(data.error||'lỗi không rõ')+') — đang hiển thị dữ liệu gần nhất đã lưu (có thể không phải kỳ mới nhất).';
      // fallback: renderVietlott('keno') gọi vòng lại module vietlott-view —
      // để tránh phụ thuộc vòng (circular import), import động (dynamic import)
      // ngay tại chỗ cần dùng thay vì import tĩnh ở đầu file.
      const { renderVietlott } = await import('./vietlott-view.js');
      renderVietlott('keno');
      return;
    }

    const latest=data.rows[0]; // rows[0] = kỳ mới nhất
    document.getElementById('resultTitle').textContent=VIETLOTT_META.keno.label;
    const latestLine=latest.numbers.join(' ');
    document.getElementById('latestDate').innerHTML=
      `${fmtDate(latest.date)}${latest.id?` (Kỳ ${latest.id})`:''} `+
      `<button class="btn-copy-row" onclick="copyToClipboard('${latestLine}','✅ Copied latest draw')">📋 Copy</button>`;
    document.getElementById('latestBalls').innerHTML=
      latest.numbers.map(n=>`<div class="ball">${n}</div>`).join('');
    const fetchedTime=new Date(data.fetchedAt).toLocaleTimeString('vi-VN');
    document.getElementById('latestSource').textContent=
      `🟢 LIVE lúc ${fetchedTime}`;
    document.getElementById('resultError').style.display='none';
    document.getElementById('resultError').textContent='';

    document.getElementById('recentTableHead').innerHTML='<th>Date</th><th>Numbers</th><th>Copy</th>';
    const tbody=document.getElementById('recentBody');
    const recent=data.rows.slice(1);
    if(recent.length===0){
      tbody.innerHTML='<tr><td colspan="3" style="color:#778;">No earlier draws yet</td></tr>';
    }else{
      tbody.innerHTML=recent.map(d=>{
        const line=d.numbers.join(' ');
        return `<tr><td>${fmtDate(d.date)}${d.id?' (Kỳ '+d.id+')':''}</td><td>${line}</td>`+
               `<td><button class="btn-xs" onclick="copyToClipboard('${line}','✅ Copied')">📋</button></td></tr>`;
      }).join('');
    }

  }catch(err){
    document.getElementById('resultError').style.display='block';
    document.getElementById('resultError').textContent=
      '⚠️ Mất kết nối tới máy chủ khi lấy số Keno live — đang hiển thị dữ liệu gần nhất đã lưu.';
    const { renderVietlott } = await import('./vietlott-view.js');
    renderVietlott('keno');
  }finally{
    btn.textContent=prevLabel;
    btn.disabled=false;
  }
}

export async function copy24KenoLive(){
  showToast('⏳ Đang lấy 24 kỳ Keno live...');
  try{
    const res=await fetch('/api/keno-copy24?t='+Date.now(),{cache:'no-store'});
    const data=await res.json();

    if(!data.ok){
      showToast('⚠️ Lỗi lấy Copy 24 Keno: '+(data.error||'không rõ'));
      return;
    }
    if(!data.rows || data.rows.length===0){
      showToast('⚠️ Không tìm được kỳ nào trong cửa sổ cần lấy.');
      return;
    }
    if(data.rows.length<24){
      showToast(`⚠️ Chỉ lấy được ${data.rows.length}/24 kỳ (đầu ngày, chưa đủ lịch sử) — kỳ live mới nhất: ${data.latestLiveId}`);
    }

    const text=data.rows.map(d=>d.numbers.join(' ')).join('\n');
    copyToClipboard(text, `✅ Copied ${data.rows.length} draws (Keno, live mới nhất: ${data.latestLiveId}, cutoff: ${data.cutoffId}) — paste into Neural Networks input`);
  }catch(err){
    showToast('⚠️ Mất kết nối khi lấy Copy 24 Keno.');
  }
}
