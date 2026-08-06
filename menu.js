/**
 * ⚔️ menu.js — CHỈ lo việc mở/đóng các dropdown menu (View Results,
 * Neural Networks, Prediction Center, submenu Vietlott).
 * KHÔNG chứa bất kỳ logic dữ liệu/Powerball/Vietlott/Keno nào.
 * Thêm menu item mới (Powerball N) KHÔNG cần sửa file này — chỉ thêm
 * 1 dòng HTML <div class="dd-item"> trong index.html là đủ.
 *
 * ⚔️ Dropdown dùng position:fixed (thay vì absolute) vì .nav giờ có
 * overflow-x:auto để hỗ trợ cuộn ngang trên menu dài — overflow-x:auto
 * kéo theo overflow-y bị trình duyệt tự đổi thành 'auto', nghĩa là
 * bất kỳ phần tử absolute nào tràn ra ngoài chiều cao .nav sẽ bị CẮT
 * MẤT. position:fixed thoát khỏi vùng bị cắt đó, nên toạ độ top/left
 * phải tính bằng JS dựa trên vị trí thực tế của nút bấm mỗi lần mở.
 *
 * ⚔️ 2 lỗi đã vá trong bản này:
 *  1) iPhone: chạm vào nút bên trong vùng -webkit-overflow-scrolling:touch
 *     đôi khi tự sinh 1 sự kiện 'scroll' ảo (delta = 0) trên .nav ngay
 *     sau cú chạm, khiến closeAllDropdowns() bị gọi và đóng luôn menu
 *     vừa mở. Fix: chỉ đóng khi scrollLeft thực sự đổi > 3px.
 *  2) Desktop: menu dài (Powerball 1-12...) mở gần đáy màn hình bị
 *     tràn ra ngoài viewport, không cách nào cuộn tới các mục cuối.
 *     Fix: giới hạn max-height theo khoảng trống còn lại + overflow-y:
 *     auto để tự cuộn bên trong menu; nếu khoảng trống bên dưới quá
 *     hẹp, tự lật menu lên phía trên nút bấm.
 */

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
    menu.style.maxHeight = Math.round(Math.min(spaceAbove, vh * 0.7)) + 'px';
  } else {
    menu.style.bottom = 'auto';
    menu.style.top = Math.round(rect.bottom) + 'px';
    menu.style.maxHeight = Math.round(Math.min(spaceBelow, vh * 0.7)) + 'px';
  }

  menu.style.left = Math.round(rect.left) + 'px';

  requestAnimationFrame(function(){
    const menuRect = menu.getBoundingClientRect();
    const overflowRight = menuRect.right - (vw - margin);
    if(overflowRight > 0){
      menu.style.left = Math.round(rect.left - overflowRight) + 'px';
    }
    if(parseFloat(menu.style.left) < margin){
      menu.style.left = margin + 'px';
    }
  });
}

function openDropdown(btnId, menuId){
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  const willOpen = !menu.classList.contains('open');

  btn.classList.toggle('open');
  menu.classList.toggle('open');

  if(willOpen){
    positionDropdown(btn, menu);
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

function closeAllDropdowns(){
  document.querySelectorAll('.btn-results.open').forEach(btn=>btn.classList.remove('open'));
  document.querySelectorAll('.dropdown-menu.open').forEach(menu=>menu.classList.remove('open'));
}

// Bấm ra ngoài thì tự đóng mọi dropdown đang mở
document.addEventListener('click', function(e){
  document.querySelectorAll('.dropdown').forEach(function(drop){
    if(!drop.contains(e.target)){
      drop.querySelectorAll('.btn-results').forEach(btn=>btn.classList.remove('open'));
      drop.querySelectorAll('.dropdown-menu').forEach(menu=>menu.classList.remove('open'));
    }
  });
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
