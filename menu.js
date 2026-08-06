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
 */

function openDropdown(btnId, menuId){
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  const willOpen = !menu.classList.contains('open');

  btn.classList.toggle('open');
  menu.classList.toggle('open');

  if(willOpen){
    const rect = btn.getBoundingClientRect();
    menu.style.top = Math.round(rect.bottom) + 'px';
    menu.style.left = Math.round(rect.left) + 'px';
    // Nếu menu tràn quá mép phải màn hình, ép nó bám mép phải thay vì tràn ra ngoài
    requestAnimationFrame(function(){
      const menuRect = menu.getBoundingClientRect();
      const overflowRight = menuRect.right - window.innerWidth;
      if(overflowRight > 0){
        menu.style.left = Math.round(rect.left - overflowRight - 12) + 'px';
      }
    });
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

// Cuộn ngang thanh nav hoặc resize cửa sổ thì đóng hết dropdown, tránh
// menu "trôi" lệch khỏi nút bấm (vì giờ menu dùng position:fixed, toạ
// độ đã tính sẵn sẽ không tự cập nhật theo khi nav được cuộn ngang).
const navEl = document.querySelector('.nav');
if(navEl){ navEl.addEventListener('scroll', closeAllDropdowns); }
window.addEventListener('resize', closeAllDropdowns);

// ⚔️ Cần global vì HTML dùng onclick="toggleDropdown()" v.v. trực tiếp
window.toggleDropdown = toggleDropdown;
window.toggleNeural = toggleNeural;
window.togglePrediction = togglePrediction;
window.toggleVietlottSub = toggleVietlottSub;
