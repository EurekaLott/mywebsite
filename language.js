/**
 * ⚔️ language.js — CHỈ lo chuyển đổi dòng chữ chạy (LED ticker) EN/VI.
 * Tách riêng khỏi menu.js vì đây là mối quan tâm khác (nội dung hiển
 * thị, không phải điều hướng).
 */
export function setLang(lang){
  const text=lang==='vi'
    ?'TỪ DẤU VẾT ĐẾN TÍN HIỆU • TỪ TÍN HIỆU ĐẾN CẤU TRÚC ẨN • '
    :'FROM TRACES TO SIGNALS • FROM SIGNALS TO HIDDEN STRUCTURES • ';
  const el1=document.getElementById('ledText');
  const el2=document.getElementById('ledText2');
  if(el1) el1.innerHTML=text;
  if(el2) el2.innerHTML=text;
}

window.setLang = setLang;
