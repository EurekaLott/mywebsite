/**
 * ⚔️ us-lottery-constants.js — Cấu hình các loại xổ số Mỹ (nguồn Texas
 * Lottery). Muốn thêm loại mới (VD: Texas Two Step) → CHỈ thêm 1 entry
 * ở đây + 1 script fetch-xxx.js + 1 job trong pipeline yml — KHÔNG
 * cần sửa us-lottery-view.js hay router.js.
 *
 * dataVar   : tên biến global do fetch-xxx.js sinh ra (vd: `draws`)
 * specialKey: tên field số đặc biệt trong mỗi draw object (null nếu
 *             không có, như Lotto Texas — 6 số cùng 1 pool)
 * drawDays  : ngày quay trong tuần (0=CN...6=T7), dùng cho luật 3-Checkpoint
 */
export const US_LOTTERY_CONFIGS = {
  powerball: {
    dataVar: 'draws',
    label: '🎱 Powerball USA',
    specialKey: 'powerball',
    specialCssClass: 'pb',
    drawDays: [1, 3, 6], // Mon/Wed/Sat
  },
  megamillions: {
    dataVar: 'megamillions',
    label: '🎲 Mega Millions',
    specialKey: 'megaball',
    specialCssClass: 'pb',
    drawDays: [2, 5], // Tue/Fri
  },
  lottotexas: {
    dataVar: 'lottotexas',
    label: '🤠 Lotto Texas',
    specialKey: null, // không có bonus ball riêng — 6 số cùng pool
    specialCssClass: null,
    drawDays: [1, 3, 6], // Mon/Wed/Sat
  },
};
