// ─── SOURCE B: Texas Lottery CSV (tối ưu) ───────────────────────────────────
async function fetchSourceB() {
  console.log(' [B] Texas Lottery CSV...');
  const body = await get('https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/powerball.csv');
  
  const lines = body.trim().split('\n');
  const draws = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
    
    // Bỏ qua dòng không hợp lệ
    if (cols.length < 10 || cols[0] !== 'Powerball') continue;

    const year  = cols[3];
    const month = cols[1].padStart(2, '0');
    const day   = cols[2].padStart(2, '0');
    const date  = `${year}-${month}-${day}`;

    const w1 = parseInt(cols[4], 10);
    const w2 = parseInt(cols[5], 10);
    const w3 = parseInt(cols[6], 10);
    const w4 = parseInt(cols[7], 10);
    const w5 = parseInt(cols[8], 10);
    const pb = parseInt(cols[9], 10);   // Quan trọng: cột Powerball là index 9

    if ([w1, w2, w3, w4, w5, pb].some(n => isNaN(n) || n < 1)) continue;

    draws.push(makeCanonical(date, w1, w2, w3, w4, w5, pb));
  }

  if (draws.length === 0) throw new Error('No valid draws from Texas CSV');

  console.log(` [B] ✅ ${draws.length} draws (Texas CSV)`);
  return draws;
}
