/**
 * ⚔️ menu.js — CHỈ lo việc mở/đóng các dropdown menu (View Results,
 * Neural Networks, Prediction Center, submenu Vietlott).
 * KHÔNG chứa bất kỳ logic dữ liệu/Powerball/Vietlott/Keno nào.
 * Thêm menu item mới (Powerball N) KHÔNG cần sửa file này — chỉ thêm
 * 1 dòng HTML <div class="dd-item"> trong index.html là đủ.
 *
 * ⚔️ BẢN VÁ TOÀN DIỆN — 2 lỗi kinh điển của Safari/iOS cộng dồn:
 *
 *  BUG A (desktop không cuộn tới Powerball 12):
 *  .dropdown-menu vẫn là con DOM của .nav, mà .nav có overflow-x:auto
 *  + touch-action:pan-x. Dù CSS dùng position:fixed để "thoát" ra khỏi
 *  vùng bị .nav cắt hình, sự kiện CUỘN (wheel/touch) trên menu vẫn có
 *  thể bị các quy tắc touch-action/overscroll của tổ tiên can thiệp ở
 *  một số trình duyệt/thiết bị — khiến scroll bên trong menu "đơ" nửa
 *  chừng. FIX TẬN GỐC: khi mở menu, DI CHUYỂN hẳn nó ra làm con trực
 *  tiếp của <body> (kỹ thuật "portal", giống Popper/Floating UI hay
 *  dùng) — menu không còn là hậu duệ DOM của .nav nữa, nên không còn
 *  bị bất kỳ overflow/touch-action nào của .nav ảnh hưởng.
 *
 *  BUG B (iPhone bấm nút không phản hồi):
 *  Đây là lỗi lâu đời của Mobile Safari: các phần tử con có thể click
 *  bên trong một khối có overflow-x:auto/scroll SẼ KHÔNG nhận sự kiện
 *  click nếu bản thân khối overflow đó không có cursor:pointer hoặc
 *  1 onclick gắn trực tiếp. .nav của mình có overflow-x:auto (để cuộn
 *  ngang menu dài) nhưng không có cursor:pointer/onclick → nút bên
 *  trong bị "câm". FIX: thêm cursor:pointer + onclick="" (no-op) trực
 *  tiếp lên .nav trong HTML.
 */

function closeAllDropdowns(){
  document.querySelectorAll('.btn-results.open').forEach(btn=>btn.classList.remove('open'));
  document.querySelectorAll('.dropdown-menu.open').forEach(function(menu){
    menu.classList.remove('open');
    // Trả menu về đúng vị trí gốc trong DOM sau khi đóng, để không phá cấu trúc HTML gốc.
    if(menu._homeParent && menu.parentElement === document.body){
      menu._homeParent.insertBefore(menu, menu._homeNextSibling || null);
    }
  });
}

function positionDropdown(btn, menu){
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = btn.getBoundingClientRect();

  const spaceBelow = vh - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const openUpward = spaceBelow < 160 && spaceAbove > spaceBelow;

  if(openUpward){
    menu.style.top = 'auto';
    menu.style.bottom = Math.round(vh - rect.top) + 'px';
    menu.style.maxHeight = Math.round(Math.min(spaceAbove, vh * 0.8)) + 'px';
  } else {
    menu.style.bottom = 'auto';
    menu.style.top = Math.round(rect.bottom) + 'px';
    menu.style.maxHeight = Math.round(Math.min(spaceBelow, vh * 0.8)) + 'px';
  }

  menu.style.left = Math.round(rect.left) + 'px';

  requestAnimationFrame(function(){
    const menuRect = menu.getBoundingClientRect();
    const overflowRight = menuRect.right - (vw - margin);
    let left = rect.left;
    if(overflowRight > 0){
      left = rect.left - overflowRight;
    }
    if(left < margin) left = margin;
    menu.style.left = Math.round(left) + 'px';
  });
}

function openDropdown(btnId, menuId){
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  const willOpen = !menu.classList.contains('open');

  if(willOpen){
    // Đóng mọi dropdown khác trước (chỉ 1 menu mở tại 1 thời điểm)
    closeAllDropdowns();
    btn.classList.add('open');

    // ⚔️ PORTAL: đưa menu ra làm con trực tiếp của <body> để thoát
    // hoàn toàn khỏi overflow/touch-action của .nav (fix Bug A).
    if(menu.parentElement !== document.body){
      menu._homeParent = menu.parentElement;
      menu._homeNextSibling = menu.nextSibling;
      document.body.appendChild(menu);
    }
    menu.classList.add('open');
    positionDropdown(btn, menu);
  } else {
    closeAllDropdowns();
  }
}

export function toggleDropdown(){
  openDropdown('btnResults', 'dropdownMenu');
}

export function toggleNeural(){
  openDropdown('btnNeural', 'neuralMenu');
}

export function togglePrediction(){
  openDropdown('btnPrediction', 'predictionMenu');
}

export function toggleVietlottSub(e){
  e.stopPropagation();
  document.getElementById('vietlottSubmenu').classList.toggle('open');
  document.getElementById('vietlottArrow').classList.toggle('rotated');
}

// Bấm ra ngoài thì tự đóng mọi dropdown đang mở.
// Vì menu giờ là con của <body> (không còn nằm trong .dropdown), phải
// kiểm tra riêng: click có rơi vào chính menu đang mở, hoặc vào nút
// bấm đã mở nó, hay không.
document.addEventListener('click', function(e){
  const openMenus = document.querySelectorAll('.dropdown-menu.open');
  if(openMenus.length === 0) return;
  const clickedInsideOpenMenu = Array.from(openMenus).some(m => m.contains(e.target));
  const clickedOpenButton = e.target.closest('.btn-results.open');
  if(!clickedInsideOpenMenu && !clickedOpenButton){
    closeAllDropdowns();
  }
});

// Cuộn ngang thanh nav THẬT SỰ (không phải scroll ảo do chạm trên
// iOS) hoặc resize cửa sổ thì đóng hết dropdown, tránh menu "trôi"
// lệch khỏi nút bấm.
const navEl = document.querySelector('.nav');
if(navEl){
  let lastScrollLeft = navEl.scrollLeft;
  navEl.addEventListener('scroll', function(){
    if(Math.abs(navEl.scrollLeft - lastScrollLeft) > 3){
      closeAllDropdowns();
    }
    lastScrollLeft = navEl.scrollLeft;
  });
}
window.addEventListener('resize', closeAllDropdowns);

// ⚔️ Cần global vì HTML dùng onclick="toggleDropdown()" v.v. trực tiếp
window.toggleDropdown = toggleDropdown;
window.toggleNeural = toggleNeural;
window.togglePrediction = togglePrediction;
window.toggleVietlottSub = toggleVietlottSub;
