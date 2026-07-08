console.log("🥋 Bruce Banner Loaded");

const banner = document.getElementById("bruce-banner");

if (!banner) {
    console.error("❌ #bruce-banner not found");
} else {
    console.log("🥋 Bruce Banner Ready");

    banner.style.width = "100%";
    banner.style.maxWidth = "1100px";
    banner.style.height = "110px";
    banner.style.margin = "20px auto";
    banner.style.borderRadius = "14px";
    banner.style.overflow = "hidden";
    banner.style.position = "relative";
    banner.style.background = "linear-gradient(180deg,#000814,#001d3d)";
    banner.style.border = "1px solid #5b21b6";
    banner.style.boxShadow = "0 0 20px rgba(138,43,226,.35)";
    banner.innerHTML = `<canvas id="bruceCanvas"></canvas>`;

    // ===============================
    // Canvas
    // ===============================
    const canvas = document.getElementById("bruceCanvas");
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
        canvas.width = banner.clientWidth;
        canvas.height = banner.clientHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    console.log("🌌 Canvas Ready");

    const stars = [];
    for (let i = 0; i < 180; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.3,
            speed: Math.random() * 0.8 + 0.2
        });
    }

    // ===============================
    // Images
    // ===============================
    const bruce = new Image();
    bruce.src = "images/bruce.png";
    bruce.onload = () => console.log("🥋 Bruce Image Loaded");
    bruce.onerror = () => console.error("❌ Bruce Image Load Failed");

    const jupiter = new Image();
    jupiter.src = "images/Jupiter.png";
    jupiter.onload = () => console.log("🪐 Jupiter Loaded");
    jupiter.onerror = () => console.error("❌ Jupiter Load Failed");

    const neptune = new Image();
    neptune.src = "images/Neptune.png";
    neptune.onload = () => console.log("🔵 Neptune Loaded");
    neptune.onerror = () => console.error("❌ Neptune Load Failed");

    const blackhole = new Image();
    blackhole.src = "images/blackhole.png";
    blackhole.onload = () => console.log("🕳️ Black Hole Loaded");
    blackhole.onerror = () => console.error("❌ Black Hole Load Failed");

    const purple = new Image();
    purple.src = "images/purple.png";
    purple.onload = () => console.log("🟣 Purple Planet Loaded");
    purple.onerror = () => console.error("❌ Purple Planet Load Failed");

    // ===============================
    // Scene state machine
    // space -> lightball -> bigbang2 -> empty -> purple -> prediction -> (reset) -> space
    //
    // QUAN TRỌNG: việc "bị hút" của Neptune và Jupiter giờ hoàn toàn dựa
    // trên THỜI GIAN (không dựa vào khoảng cách pixel), nên hoạt động
    // đúng như kịch bản bất kể banner rộng hay hẹp trên trang thật.
    // ===============================
    let scenePhase = "space";
    let phaseStart = Date.now();
    function setPhase(p) {
        scenePhase = p;
        phaseStart = Date.now();
    }
    function phaseElapsed() {
        return Date.now() - phaseStart;
    }

    const DRIFT_MS = 10000;      // thời gian trôi trước khi bị hút (10s)
    const MAX_SPEED_MUL = 4;     // tăng tốc dần tới x4 ngay trước khi bị hút
    const SHRINK_RATE = 0.965;   // tốc độ co lại khi bị hút vào hố đen
    const HOMING_RATE = 0.08;    // tốc độ bay về phía hố đen khi bị hút

    // Shared animation vars
    let glowPhase = 0;
    let moonAngle = 0;
    let bruceX = -80;
    const bruceY = canvas.height - 70;

    // Object state (all reset-able)
    let jupiterX, jupiterY, jupiterAngle, jupiterHit, jupiterScale, jupiterSpin, jupiterSpeedMul, jupiterArmed, jupiterDriftStart;
    let neptuneX, neptuneY, neptuneAngle, neptuneHit, neptuneScale, neptuneSpin, neptuneStarted, neptuneDone, neptuneSpeedMul, neptuneDriftStart;
    let blackX, blackY, blackAngle, blackScale, burstReady;
    let bigBang2Radius, bigBang2Alpha;
    let purpleX, purpleY, purpleMet;

    function resetScene() {
        jupiterX = canvas.width - 30;
        jupiterY = 5;
        jupiterAngle = 0;
        jupiterHit = false;
        jupiterScale = 1;
        jupiterSpin = 0;
        jupiterSpeedMul = 1;
        jupiterArmed = false;
        jupiterDriftStart = null;

        neptuneX = canvas.width / 2 - 60;
        neptuneY = -140;
        neptuneAngle = 0;
        neptuneHit = false;
        neptuneScale = 1;
        neptuneSpin = 0;
        neptuneStarted = false;
        neptuneDone = false;
        neptuneSpeedMul = 1;
        neptuneDriftStart = null;

        blackX = 40;
        blackY = -140;
        blackAngle = 0;
        blackScale = 1;
        burstReady = false;

        bigBang2Radius = 0;
        bigBang2Alpha = 1;

        purpleX = canvas.width + 100;
        purpleY = canvas.height / 2 - 55;
        purpleMet = false;

        setPhase("space");
    }
    resetScene();

    // Halley comet
    let meteorX = canvas.width - 120;
    let meteorY = 12;

    const PREDICTIONS = [
        "AI SIGNAL: 3-6-9 ALIGNED",
        "AI SIGNAL: VORTEX PATH FOUND",
        "AI SIGNAL: PATTERN CONFIRMED"
    ];
    let predictionText = PREDICTIONS[0];

    // ===============================
    // Draw helpers
    // ===============================
    function drawComet() {
        const g = ctx.createLinearGradient(meteorX, meteorY, meteorX - 80, meteorY + 40);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.4, "rgba(120,220,255,0.8)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(meteorX, meteorY);
        ctx.lineTo(meteorX - 140, meteorY + 70);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        ctx.arc(meteorX, meteorY, 8, 0, Math.PI * 2);
        ctx.fill();

        meteorX -= 1.6;
        meteorY += 0.08;
        if (meteorX < -100) {
            meteorX = canvas.width + 200;
            meteorY = 8 + Math.random() * 10;
        }
    }

    function drawBlackHole() {
        if (!blackhole.complete) return;

        ctx.save();
        glowPhase += 0.08;
        const glow = 40 + Math.sin(glowPhase) * 30;
        ctx.shadowColor = "#fff6a0";
        ctx.shadowBlur = glow;
        ctx.globalAlpha = 0.95;

        ctx.save();
        ctx.translate(blackX + 100, blackY + 65);
        ctx.rotate(blackAngle);
        ctx.scale(blackScale, blackScale);
        ctx.drawImage(blackhole, -100, -65, 240, 160);
        ctx.restore();
        ctx.restore();

        if (scenePhase === "space") {
            // Giai đoạn 1: rơi xuống
            if (blackY < 5) {
                blackY += 1.0;
            } else {
                // Giai đoạn 2: bay lượn nền (không cần "đuổi theo" ai,
                // việc hút Neptune/Jupiter đã xử lý theo thời gian)
                blackX += 0.6;
                blackAngle += 0.04;
                if (blackX < -160) {
                    blackX = canvas.width + 140;
                    blackY = -140;
                }
            }
        }

        if (burstReady) {
            ctx.save();
            const burst = ctx.createRadialGradient(
                blackX + 100, blackY + 65, 20,
                blackX + 100, blackY + 65, 220
            );
            burst.addColorStop(0, "rgba(255,255,255,1)");
            burst.addColorStop(0.2, "rgba(180,240,255,0.95)");
            burst.addColorStop(0.6, "rgba(120,180,255,0.35)");
            burst.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = burst;
            ctx.beginPath();
            ctx.arc(blackX + 100, blackY + 65, 220, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Chuyển sang giữ quả cầu ánh sáng 5 giây
            if (scenePhase === "space") {
                setPhase("lightball");
            }
        }
    }

    function drawNeptune() {
        if (neptuneDone) return;

        if (!neptuneStarted) neptuneStarted = true;
        if (!neptune.complete) return;

        ctx.save();
        ctx.translate(neptuneX + 60, neptuneY + 60);
        ctx.rotate(neptuneHit ? neptuneSpin : neptuneAngle);
        ctx.scale(neptuneScale, neptuneScale);
        ctx.drawImage(neptune, -60, -60, 120, 120);
        ctx.restore();

        if (neptuneY < 5) {
            // Giai đoạn rơi xuống
            neptuneY += 1;
            return;
        }

        if (neptuneDriftStart === null) neptuneDriftStart = Date.now();

        if (!neptuneHit) {
            const elapsed = Date.now() - neptuneDriftStart;
            if (elapsed < DRIFT_MS) {
                // Tăng tốc dần x1 -> x4 trong 10 giây trước khi bị hút
                neptuneSpeedMul = 1 + (elapsed / DRIFT_MS) * (MAX_SPEED_MUL - 1);
                neptuneX -= 0.6 * neptuneSpeedMul;
                neptuneAngle += 0.05;
            } else {
                // Đủ 10 giây -> chính thức bị Black Hole hút
                neptuneHit = true;
            }
        } else {
            // Bị hút: bay về phía hố đen, xoay tròn, co nhỏ lại rồi biến mất
            const dx = (blackX + 100) - (neptuneX + 60);
            const dy = (blackY + 65) - (neptuneY + 60);
            neptuneX += dx * HOMING_RATE;
            neptuneY += dy * HOMING_RATE;
            neptuneSpin += 0.3;
            neptuneScale *= SHRINK_RATE;

            if (neptuneScale < 0.05) {
                neptuneDone = true; // Neptune biến mất hoàn toàn
                // Ngay khi Neptune biến mất, "trao lượt" cho Jupiter
                jupiterArmed = true;
                jupiterDriftStart = Date.now();
            }
        }
    }

    function drawJupiter() {
        if (!jupiter.complete) return;

        ctx.save();
        glowPhase += 0.08;
        const glowRadius = 130 + Math.sin(glowPhase) * 20;
        const glow = ctx.createRadialGradient(
            jupiterX + 60, jupiterY + 60, 10,
            jupiterX + 60, jupiterY + 60, glowRadius
        );
        glow.addColorStop(0.00, "rgba(255,255,240,0.75)");
        glow.addColorStop(0.25, "rgba(255,235,120,0.45)");
        glow.addColorStop(0.60, "rgba(255,190,40,0.18)");
        glow.addColorStop(1.00, "rgba(255,190,40,0.00)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(jupiterX + 60, jupiterY + 60, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(jupiterX + 60, jupiterY + 60);
        ctx.rotate(jupiterHit ? jupiterSpin : jupiterAngle);
        ctx.scale(jupiterScale, jupiterScale);
        ctx.drawImage(jupiter, -60, -60, 120, 120);
        ctx.restore();

        // Io & Europa (chỉ hiện khi Jupiter chưa bị hút, cho đẹp)
        if (!jupiterHit) {
            moonAngle += 0.03;
            const europaX = jupiterX + 50 + Math.cos(moonAngle) * 72;
            const europaY = jupiterY + 50 + Math.sin(moonAngle) * 26;
            ctx.beginPath();
            ctx.fillStyle = "#e8e8ff";
            ctx.arc(europaX, europaY, 4, 0, Math.PI * 2);
            ctx.fill();

            const ioX = jupiterX + 50 + Math.cos(moonAngle + Math.PI) * 58;
            const ioY = jupiterY + 50 + Math.sin(moonAngle + Math.PI) * 20;
            ctx.beginPath();
            ctx.fillStyle = "#ffd37a";
            ctx.arc(ioX, ioY, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (!jupiterArmed) {
            // Chưa tới lượt Jupiter (đang chờ Neptune biến mất trước)
            jupiterAngle += 0.01;
            return;
        }

        if (!jupiterHit) {
            const elapsed = Date.now() - jupiterDriftStart;
            if (elapsed < DRIFT_MS) {
                // Tăng tốc dần x1 -> x4 trong 10 giây trước khi bị hút
                jupiterSpeedMul = 1 + (elapsed / DRIFT_MS) * (MAX_SPEED_MUL - 1);
                jupiterAngle += 0.05;
                jupiterX -= 0.6 * jupiterSpeedMul;
            } else {
                // Đủ 10 giây -> chính thức bị Black Hole hút
                jupiterHit = true;
            }
        } else {
            const jdx = (blackX + 100) - (jupiterX + 60);
            const jdy = (blackY + 65) - (jupiterY + 60);
            jupiterX += jdx * HOMING_RATE;
            jupiterY += jdy * HOMING_RATE;
            jupiterSpin += 0.3;
            jupiterScale *= SHRINK_RATE;

            if (jupiterScale < 0.08 && !burstReady) {
                blackScale += 0.02;
                if (blackScale >= 1.6) {
                    blackScale = 1.6;
                    burstReady = true;
                }
            }
        }

        if (jupiterX < -120) jupiterX = canvas.width + 150;
    }

    function drawBigBang2() {
        ctx.save();
        const cx = blackX + 100;
        const cy = blackY + 65;
        bigBang2Radius += 8;
        bigBang2Alpha -= 0.02;

        const a = Math.max(bigBang2Alpha, 0);
        const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, bigBang2Radius);
        flash.addColorStop(0, `rgba(255,255,255,${a})`);
        flash.addColorStop(0.5, `rgba(200,180,255,${a * 0.6})`);
        flash.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = flash;
        ctx.beginPath();
        ctx.arc(cx, cy, bigBang2Radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 💥 Big Bang lần 2 hoàn tất -> không gian trống hoàn toàn
        if (bigBang2Alpha <= 0 || bigBang2Radius > canvas.width) {
            setPhase("empty");
        }
    }

    function drawPurplePlanet() {
        if (!purple.complete) return;

        ctx.save();
        glowPhase += 0.06;
        const glowRadius = 90 + Math.sin(glowPhase) * 15;
        const glow = ctx.createRadialGradient(
            purpleX + 50, purpleY + 50, 8,
            purpleX + 50, purpleY + 50, glowRadius
        );
        glow.addColorStop(0, "rgba(230,180,255,0.7)");
        glow.addColorStop(0.5, "rgba(160,80,220,0.35)");
        glow.addColorStop(1, "rgba(160,80,220,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(purpleX + 50, purpleY + 50, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(purple, purpleX, purpleY, 100, 100);
        ctx.restore();

        if (!purpleMet) {
            purpleX -= 1.4;
            const dx = (purpleX + 50) - (bruceX + 30);
            if (Math.abs(dx) < 70) {
                purpleMet = true;
                predictionText = PREDICTIONS[Math.floor(Math.random() * PREDICTIONS.length)];
                setPhase("prediction");
            }
            // Phòng khi banner quá hẹp và Purple Planet trôi hết qua mà
            // chưa "gặp" Bruce theo khoảng cách -> vẫn ép gặp nhau, tránh kẹt mãi.
            if (purpleX < -100 && !purpleMet) {
                purpleMet = true;
                predictionText = PREDICTIONS[Math.floor(Math.random() * PREDICTIONS.length)];
                setPhase("prediction");
            }
        }
    }

    function drawPrediction() {
        ctx.save();
        const alpha = Math.min(phaseElapsed() / 400, 1);
        ctx.globalAlpha = alpha;
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#e9d5ff";
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 12;
        ctx.textAlign = "center";
        ctx.fillText(predictionText, canvas.width / 2, canvas.height / 2 + 5);
        ctx.restore();
    }

    // ===============================
    // Main loop
    // ===============================
    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Stars background
        ctx.fillStyle = "white";
        for (const star of stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = canvas.width;
                star.y = Math.random() * canvas.height;
            }
        }

        // Halley comet - luôn chạy xuyên suốt
        drawComet();

        // Phase-specific content
        if (scenePhase === "space") {
            drawBlackHole();
            drawNeptune();
            drawJupiter();
        } else if (scenePhase === "lightball") {
            drawBlackHole(); // giữ quả cầu ánh sáng, đứng yên
            if (phaseElapsed() > 5000) {
                setPhase("bigbang2");
            }
        } else if (scenePhase === "bigbang2") {
            drawBigBang2();
        } else if (scenePhase === "empty") {
            // Không gian trống, yên bình một chút trước khi Purple Planet xuất hiện
            if (phaseElapsed() > 1500) {
                setPhase("purple");
            }
        } else if (scenePhase === "purple") {
            drawPurplePlanet();
        } else if (scenePhase === "prediction") {
            drawPurplePlanet();
            drawPrediction();
            if (phaseElapsed() > 4000) {
                resetScene(); // reset toàn bộ banner, lặp lại kịch bản
            }
        }

        // Bruce Lee - luôn đi bộ xuyên suốt mọi phase
        if (bruce.complete) {
            ctx.drawImage(bruce, bruceX, bruceY, 60, 60);
            bruceX += 0.8;
            if (bruceX > canvas.width) {
                bruceX = -60;
            }
        }

        requestAnimationFrame(drawStars);
    }

    drawStars();
    console.log("⭐ Stars Animated");
}
