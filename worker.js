/**
 * ⚔️ EUREKALOTT — server Node.js/Express, chạy 100% trên Render.com
 * ============================================================
 * ⚔️ HÀNG ĐỢI (QUEUE) — Render free tier chỉ có 1 CPU yếu + 512MB RAM,
 * chạy 1 tiến trình Node.js đơn luồng. Nếu nhiều người cùng bấm
 * "Train & Predict" 1 lúc, chạy tràn lan có nguy cơ hết RAM → crash,
 * ảnh hưởng TẤT CẢ người dùng. Giải pháp: giới hạn chỉ MAX_CONCURRENT
 * job chạy cùng lúc, các job khác XẾP HÀNG đợi tới lượt (không bị mất,
 * không bị lỗi — chỉ chờ lâu hơn khi đông khách).
 * ============================================================
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { handlePredict, handlePowerballProxy } from './powerball1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ⚔️ Chỉ cho phép 1 job train chạy CÙNG LÚC — an toàn nhất với RAM yếu
// của Render free. Khi nâng cấp gói (nhiều RAM/CPU hơn), có thể tăng
// số này lên 2 hoặc 3 tùy dung lượng thực tế.
const MAX_CONCURRENT = 1;

const jobs = new Map();      // jobId -> { status, progress, result, error, createdAt }
const queue = [];            // danh sách jobId đang xếp hàng, theo thứ tự FIFO
let activeCount = 0;         // số job đang thực sự chạy ngay lúc này

function cleanupOldJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > 15 * 60 * 1000) jobs.delete(id);
  }
}

// Bắt đầu chạy job kế tiếp trong hàng đợi (nếu còn chỗ trống)
function tryStartNext() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const jobId = queue.shift();
    const job = jobs.get(jobId);
    if (!job) continue; // job đã bị dọn dẹp (hết hạn) trong lúc chờ
    startJob(jobId, job);
  }
}

async function startJob(jobId, job) {
  activeCount++;
  job.status = 'running';
  try {
    const result = await handlePredict(job.payload, (p) => {
      job.progress = { epochsCompleted: p.epochsCompleted, epochsTotal: p.epochsTotal };
    });
    job.status = 'done';
    job.result = result;
  } catch (err) {
    console.error('Lỗi khi chạy handlePredict (job ' + jobId + '):', err);
    job.status = 'error';
    job.error = err.message || String(err);
  } finally {
    activeCount--;
    job.payload = null; // giải phóng bộ nhớ, không cần giữ payload sau khi chạy xong
    tryStartNext();      // cho job tiếp theo trong hàng đợi (nếu có) bắt đầu chạy
  }
}

// ── BƯỚC 1 — POST /api/predict/:gameKey — tạo job, xếp hàng hoặc chạy ngay ──
app.post('/api/predict/:gameKey', async (req, res) => {
  const { gameKey } = req.params;
  if (gameKey !== 'powerball1') {
    return res.status(404).json({ error: `Không tìm thấy game: ${gameKey}` });
  }

  cleanupOldJobs();
  const jobId = randomUUID();
  const job = {
    status: 'queued',
    createdAt: Date.now(),
    progress: { epochsCompleted: 0, epochsTotal: null },
    result: null,
    error: null,
    payload: req.body,
  };
  jobs.set(jobId, job);
  queue.push(jobId);

  res.status(202).json({ jobId });

  tryStartNext(); // nếu còn chỗ trống, job này chạy ngay; không thì xếp hàng
});

// ── BƯỚC 2 — GET /api/predict/status/:jobId — hỏi thăm tiến độ / vị trí hàng đợi ──
app.get('/api/predict/status/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ status: 'not_found', error: 'Job không tồn tại hoặc đã hết hạn.' });
  }
  if (job.status === 'queued') {
    const position = queue.indexOf(jobId) + 1; // vị trí trong hàng đợi, đếm từ 1
    return res.status(200).json({ status: 'queued', queuePosition: position, queueLength: queue.length });
  }
  if (job.status === 'running') {
    return res.status(200).json({ status: 'running', progress: job.progress });
  }
  if (job.status === 'error') {
    return res.status(200).json({ status: 'error', error: job.error });
  }
  res.status(200).json({ status: 'done', result: job.result });
});

// ── /api/powerball — proxy CSV Texas Lottery (không cần xếp hàng, nhẹ) ──
app.get('/api/powerball', async (req, res) => {
  try {
    const csvText = await handlePowerballProxy();
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200).send(csvText);
  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu Texas Lottery:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ⚔️ KHÔNG còn phục vụ giao diện tĩnh ở đây nữa — đã tách sang Render
// "Static Site" riêng (luôn nhanh, không bao giờ ngủ). server.js giờ CHỈ
// còn API thuần, chỉ "thức dậy" khi có ai bấm Train & Predict / Auto Run.
app.get('/', (req, res) => {
  res.status(200).send('EurekaLott API đang chạy. Giao diện nằm ở Static Site riêng.');
});

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚔️ EurekaLott (100% Render, hàng đợi tối đa ${MAX_CONCURRENT} job) đang chạy ở cổng ${PORT}`);
});
