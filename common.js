/**
 * ⚔️ common.js — Tiện ích DÙNG CHUNG cho toàn site.
 * KHÔNG chứa logic riêng của Powerball/Vietlott/Keno/Menu.
 * File này gần như KHÔNG BAO GIỜ cần sửa khi thêm tính năng mới.
 */

export const MONTHS = ["","January","February","March","April","May","June",
  "July","August","September","October","November","December"];

export function fmtDate(str){
  if(!str) return str;
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)){
    const p=str.split('-');
    return `${MONTHS[parseInt(p[1],10)]} ${parseInt(p[2],10)}, ${p[0]}`;
  }
  return str;
}

export function parseDrawDate(dateStr){
  const p=dateStr.split('-').map(Number);
  return new Date(p[0],p[1]-1,p[2]); /* local time, tránh lệch ngày do UTC */
}

export function dateKeyLocal(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

/* ── TOAST FEEDBACK ── */
let toastTimer=null;
export function showToast(msg){
  let t=document.getElementById('copyToast');
  if(!t){
    t=document.createElement('div');
    t.id='copyToast';
    t.className='toast';
    document.body.appendChild(t);
  }
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3400);
}

/* ── CLIPBOARD HELPERS ── */
function fallbackCopy(text,cb){
  const ta=document.createElement('textarea');
  ta.value=text;
  ta.style.position='fixed';
  ta.style.opacity='0';
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
  if(cb) cb();
}

export function copyToClipboard(text,successMsg){
  const done=()=>showToast(successMsg||'✅ Copied!');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done));
  }else{
    fallbackCopy(text,done);
  }
}

// ⚔️ Cần global vì HTML sinh động (innerHTML template string) có
// onclick="copyToClipboard('...','...')" trực tiếp trong chuỗi.
window.copyToClipboard = copyToClipboard;
