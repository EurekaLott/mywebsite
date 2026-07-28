/**
 * ⚔️ menu.js — CHỈ lo việc mở/đóng các dropdown menu (View Results,
 * Neural Networks, Prediction Center, submenu Vietlott).
 * KHÔNG chứa bất kỳ logic dữ liệu/Powerball/Vietlott/Keno nào.
 * Thêm menu item mới (Powerball N) KHÔNG cần sửa file này — chỉ thêm
 * 1 dòng HTML <div class="dd-item"> trong index.html là đủ.
 */

export function toggleDropdown(){
  document.getElementById('btnResults').classList.toggle('open');
  document.getElementById('dropdownMenu').classList.toggle('open');
}

export function toggleNeural(){
  document.getElementById('btnNeural').classList.toggle('open');
  document.getElementById('neuralMenu').classList.toggle('open');
}

export function togglePrediction(){
  document.getElementById('btnPrediction').classList.toggle('open');
  document.getElementById('predictionMenu').classList.toggle('open');
}

export function toggleVietlottSub(e){
  e.stopPropagation();
  document.getElementById('vietlottSubmenu').classList.toggle('open');
  document.getElementById('vietlottArrow').classList.toggle('rotated');
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

// ⚔️ Cần global vì HTML dùng onclick="toggleDropdown()" v.v. trực tiếp
window.toggleDropdown = toggleDropdown;
window.toggleNeural = toggleNeural;
window.togglePrediction = togglePrediction;
window.toggleVietlottSub = toggleVietlottSub;
