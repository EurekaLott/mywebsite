/**
 * ⚔️ router.js — "Cầu nối" duy nhất giữa Powerball / Vietlott / Keno.
 * Đây là NƠI DUY NHẤT được phép biết cả 3 module kia cùng lúc — mục
 * đích để powerball-view.js, vietlott-view.js, keno-live.js không cần
 * biết tới nhau (trừ vietlott-view.js gọi keno-live.js, xem file đó).
 *
 * Chứa: selectLottery (bấm chọn loại xổ số nào trong menu View Results),
 * showPowerballControls (ẩn/hiện nút riêng cho Powerball),
 * handleRefreshClick (nút Refresh — sửa bug "bấm Refresh ở Keno lại ra
 * số Powerball" đã từng xảy ra, bằng cách LUÔN kiểm tra đang xem gì
 * trước khi quyết định gọi hàm nào).
 */
import { fetchLatestDraw, renderRecent30, setDataMode } from './powerball-view.js';
import { renderVietlott, currentVietlottKey } from './vietlott-view.js';
import { fetchKenoLive } from './keno-live.js';

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

  if(type==='powerball'){
    showPowerballControls(true);
    document.getElementById('resultTitle').textContent='🎱 Powerball USA';
    document.getElementById('recentTableHead').innerHTML='<th>Date</th><th>White Balls</th><th>PB</th><th>Copy</th>';
    document.getElementById('recentNote').textContent='(not counting the latest draw already shown above)';
    setDataMode('raw');
    fetchLatestDraw();
    renderRecent30(null);
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
   currentVietlottKey (import trực tiếp từ vietlott-view.js, live-binding
   nên luôn đọc đúng giá trị mới nhất) trước khi quyết định. */
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
  document.getElementById('resultError').style.display='block';
  document.getElementById('resultError').textContent=
    'ℹ️ Sản phẩm này chưa có nguồn cập nhật live — dữ liệu theo lịch pipeline hằng ngày. Tải lại trang (F5) để lấy bản mới nhất nếu pipeline vừa chạy xong.';
}

// ⚔️ Cần global vì HTML dùng onclick="selectLottery(...)" / "handleRefreshClick()" trực tiếp
window.selectLottery = selectLottery;
window.handleRefreshClick = handleRefreshClick;
