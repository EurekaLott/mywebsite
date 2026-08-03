/**
 * ⚔️ router.js — "Cầu nối" duy nhất giữa Xổ Số Mỹ (Powerball/Mega
 * Millions/Lotto Texas) / Vietlott / Keno.
 *
 * Muốn thêm 1 loại xổ số Mỹ mới (VD: Cash Five) → CHỈ cần thêm entry
 * vào us-lottery-constants.js + 1 fetch script + 1 job pipeline —
 * router.js này KHÔNG cần sửa gì, vì đã tổng quát hóa qua
 * US_LOTTERY_CONFIGS thay vì hard-code từng loại.
 */
import { fetchLatestDraw, renderRecent30, setDataMode, selectUsLottery } from './us-lottery-view.js';
import { renderVietlott, currentVietlottKey, resetVietlottKey } from './vietlott-view.js';
import { fetchKenoLive } from './keno-live.js';
import { US_LOTTERY_CONFIGS } from './us-lottery-constants.js';

export function showPowerballControls(show){
  document.getElementById('copy24Btn').style.display  = show?'':'none';
  document.getElementById('dataModeTabs').style.display = show?'':'none';
  document.getElementById('modeNote').style.display    = show?'':'none';
  document.getElementById('copy24VietlottBtn').style.display = show?'none':'';
}

export function selectLottery(type){
  window.toggleDropdown();
  const panel=document.getElementById('resultPanel');
  panel.classList.add('open');

  if(US_LOTTERY_CONFIGS[type]){
    // ⚔️ Powerball / Mega Millions / Lotto Texas — mọi loại xổ số Mỹ
    // đều đi qua CHUNG 1 nhánh này (không hard-code riêng từng loại).
    resetVietlottKey(); // tránh bug: currentVietlottKey còn sót giá trị cũ từ tab Vietlott/Keno trước đó
    showPowerballControls(true);
    selectUsLottery(type);
  } else if(type.startsWith('vietlott_')){
    showPowerballControls(false);
    const key=type.replace('vietlott_','');
    renderVietlott(key);
  }
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}

/* ── DISPATCHER: nút Refresh biết đúng ngữ cảnh đang xem ──
   Bug đã từng xảy ra: nút Refresh LUÔN gọi fetchLatestDraw() (chỉ dành
   cho Powerball) bất kể đang xem Vietlott/Keno gì. Giờ LUÔN kiểm tra
   currentVietlottKey (live-binding từ vietlott-view.js) trước khi
   quyết định gọi hàm nào — fetchLatestDraw() giờ tự biết đang xem loại
   xổ số Mỹ nào (Powerball/Mega Millions/Lotto Texas) qua currentUsLotteryKey
   nội bộ trong us-lottery-view.js, không cần router truyền tham số.
   ⚔️ Power655/645/535/Bingo18 giờ CŨNG LIVE (renderVietlott tự fetch
   /api/vietlott-live) — không còn cần dòng ghi đè "chưa có nguồn live"
   phía dưới nữa, renderVietlott tự báo lỗi nếu có. */
export function handleRefreshClick(){
  if(!currentVietlottKey){
    fetchLatestDraw();
    return;
  }
  if(currentVietlottKey==='keno'){
    fetchKenoLive();
    return;
  }
  renderVietlott(currentVietlottKey);
}

// ⚔️ Cần global vì HTML dùng onclick="selectLottery(...)" / "handleRefreshClick()" trực tiếp
window.selectLottery = selectLottery;
window.handleRefreshClick = handleRefreshClick;
