/**
 * ⚔️ vietlott-constants.js — Hằng số cấu hình các sản phẩm Vietlott.
 * Tách riêng (không nằm trong vietlott-view.js hay keno-live.js) để
 * TRÁNH phụ thuộc vòng (circular import) giữa 2 module đó — cả 2 đều
 * cần đọc VIETLOTT_META nhưng không module nào cần "sở hữu" nó.
 *
 * ⚠️ Muốn thêm sản phẩm Vietlott mới (VD: Max 4D) → CHỈ cần thêm vào
 * đây, không cần sửa vietlott-view.js hay keno-live.js.
 */

export const VIETLOTT_META = {
  power655: {label:'🇻🇳 Vietlott — Power 6/55', title:'RECENT DRAWS'},
  power645: {label:'🇻🇳 Vietlott — Mega 6/45', title:'RECENT DRAWS'},
  power535: {label:'🇻🇳 Vietlott — Power 5/35', title:'RECENT DRAWS'},
  keno:     {label:'🇻🇳 Vietlott — Keno', title:'RECENT DRAWS'},
  bingo18:  {label:'🇻🇳 Vietlott — Bingo18', title:'RECENT DRAWS'},
};

/* Lịch quay theo thứ trong tuần (0=CN...6=T7), dùng cho luật 3-Checkpoint.
   Tính trực tiếp từ dữ liệu thật — xem hội thoại gốc để biết cách xác minh. */
export const VIETLOTT_DRAW_DAYS = {
  power655: [2,4,6],
  power645: [0,3,5],
  power535: [0,1,2,3,4,5,6],
};

/* Sản phẩm quay NHIỀU LẦN/NGÀY — không tính cutoff theo lịch tuần được,
   phải lùi theo SỐ KỲ thay vì SỐ NGÀY. */
export const VIETLOTT_CONTINUOUS = ['keno', 'bingo18'];
