// BỌC THÉP TOÀN BỘ CODE: Chờ HTML, CSS load xong xuôi 100% mới chạy
document.addEventListener("DOMContentLoaded", function() {
    console.log("🥋 Bruce Banner Init...");

    const banner = document.getElementById("bruce-banner");

    if (!banner) {
        console.error("❌ #bruce-banner không tồn tại trong HTML lúc này!");
        return; // Dừng lại nếu không thấy banner
    }
    
    console.log("🥋 Bruce Banner Ready");

    banner.style.width = "100%";
    banner.style.maxWidth = "1100px";
    // Thiết lập height ban đầu dựa trên màn hình ngay lập tức
    banner.style.height = window.innerWidth <= 430 ? "80px" : "110px";
    banner.style.margin = "20px auto";
    banner.style.borderRadius = "14px";
    banner.style.overflow = "hidden";
    banner.style.position = "relative";
    banner.style.background = "linear-gradient(180deg,#000814,#001d3d)";
    banner.style.border = "1px solid #5b21b6";
    banner.style.boxShadow = "0 0 20px rgba(138,43,226,.35)";
    
    // Gắn canvas vào
    banner.innerHTML = `<canvas id="bruceCanvas" style="display:block; width:100%; height:100%;"></canvas>`;

    // ===============================
    // Canvas
    // ===============================
    const canvas = banner.querySelector("canvas");
    const ctx = canvas.getContext("2d");

    // Các biến cần khởi tạo
    let bruceY = 0;
    let bruceCurrentY = 0;
    let jupiterX = 0;
    let neptuneX = 0;
    let purpleX = 0;
    let orionX = 0;
    let bruceX = -80;

    function resizeCanvas() {
        const isMobile = window.innerWidth <= 430;
        banner.style.height = isMobile ? "80px" : "110px";
        
        canvas.width = banner.clientWidth || window.innerWidth || 300;
        canvas.height = banner.clientHeight || (isMobile ? 80 : 110);
        
        bruceY = canvas.height - 75; // Căn lại chân Bruce Lee
        bruceCurrentY = bruceY;

        jupiterX = canvas.width - 30;
        neptuneX = canvas.width / 2 - 60;
        purpleX = canvas.width + 140;
        orionX = canvas.width + 150;
        bruceX = -80;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    console.log("🌌 Canvas Size:", canvas.width, "x", canvas.height);    
    
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
    // Image Loads (Bruce Walk Cycle, Planets, etc.)
    // ===============================
    
    // Tải 2 hình Bruce Lee để làm hiệu ứng bước đi
    const bruce1 = new Image();
    bruce1.src = "images/bruce.png";

    const bruce2 = new Image();
    bruce2.src = "images/Bruce 2.png";

    const jupiter = new Image();
    jupiter.src = "images/Jupiter.png";

    let jupiterY = 5;
    let jupiterAngle = 0;   
    let glowPhase = 0;
    let moonAngle = 0;

    const neptune = new Image();
    neptune.src = "images/Neptune.png";

    let neptuneY = -140;
    let neptuneAngle = 0;
    let neptuneStarted = false;
    let neptuneDone = false;    

    const purple = new Image();
    purple.src = "images/purple.png";

    let purpleY = 10;
    let purpleAngle = 0;
    
    const blackhole = new Image();
    blackhole.src = "images/blackhole.png";

    let blackX = 40;
    let blackY = -140;
    let blackAngle = 0;
    let neptuneHit = false;
    let neptuneScale = 1;
    let neptuneSpin = 0;   
    let blackScale = 1;
    let burstReady = false;

    let bigBang = false;
    let bigBangRadius = 0;
    let bigBangAlpha = 1;

    let jupiterHit = false;
    let jupiterScale = 1;
    let jupiterSpin = 0;
    
    let bruceAttached = false;
    let bruceKungfu = false;
    
    if (!bruceAttached && !bruceKungfu) {
        bruceCurrentY = bruceY;
    }

    let bruceKungfuTimer = 0;
    let aiSignal = false;
    let aiPanel = false;    
    
    let ledOffset = 0;
    let ledText = "";   
    let restartScene = false;

    function resetScene(){
        ledOffset = 0;
        ledText = "";
        blackX = 40;
        blackY = -140;
        blackAngle = 0;
        blackScale = 1;
        burstReady = false;
        jupiterY = 5;
        jupiterAngle = 0;
        jupiterScale = 1;
        jupiterSpin = 0;
        jupiterHit = false;
        neptuneY = -140;
        neptuneAngle = 0;
        neptuneScale = 1;
        neptuneSpin = 0;
        neptuneHit = false;
        neptuneStarted = false;
        neptuneDone = false;
        
        // Reset Bruce & Hành tinh tím
        purpleX = canvas.width + 140; 
        bruceX = -80;
        bruceCurrentY = bruceY;
        bruceAttached = false;
        bruceKungfu = false;
        bruceKungfuTimer = 0;
        aiPanel = false;
        aiSignal = false;
        bigBang = false;
        bigBangRadius = 0;
        bigBangAlpha = 1;
    }
    
    const orion = new Image();
    orion.src = "images/Orion.png";

    let orionY = 8;
    
    // FPS Capper & Speed Scaler
    let lastRenderTime = 0;
    const fpsInterval = 1000 / 60; // Max 60 FPS

    function drawStars(currentTime) {
        requestAnimationFrame(drawStars);
        
        if (!currentTime) currentTime = performance.now();
        const elapsed = currentTime - lastRenderTime;
        
        if (elapsed < fpsInterval) return; 
        lastRenderTime = currentTime - (elapsed % fpsInterval);

        if(canvas.width === 0 || canvas.height === 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (restartScene) {
            restartScene = false;
            resetScene();
        }

        let speedScale = canvas.width / 1100;
        if (speedScale < 0.45) speedScale = 0.45; 

        ctx.fillStyle = "white";
        for (const star of stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            star.x -= (star.speed * speedScale);
            if (star.x < 0) {
                star.x = canvas.width;
                star.y = Math.random() * canvas.height;
            }
        }

        // ===============================
        // Orion Spacecraft
        // ===============================
        if (orion.complete && orion.naturalWidth > 0){
            ctx.save();
            ctx.translate(orionX+30, orionY+15);
            
            const fire = 18+Math.sin(Date.now()*0.03)*6;
            const g = ctx.createLinearGradient(-45,0,-10,0);
            g.addColorStop(0,"rgba(255,80,0,0)");
            g.addColorStop(.3,"#ff5500");
            g.addColorStop(.7,"#ffee55");
            g.addColorStop(1,"#ffffff");
            ctx.fillStyle=g;
            
            ctx.beginPath();
            ctx.moveTo(-28,-4);
            ctx.lineTo(-28-fire,0);
            ctx.lineTo(-28,4);
            ctx.fill();

            ctx.strokeStyle="#66ffff";
            ctx.lineWidth=1.5;
            for(let i=0;i<3;i++){
                ctx.beginPath();
                ctx.moveTo(-30, -5+i*5);
                ctx.lineTo(-48-fire*0.6, -5+i*5);
                ctx.stroke();
            }

            ctx.drawImage(orion, -30, -15, 60, 30);
            ctx.restore();

            orionX -= (2.0 * speedScale);
            orionY += Math.sin(orionX*0.02)*0.15;
            if(orionX < -160){
                orionX = canvas.width+180;
                orionY = 5+Math.random()*12;
            }
        }

        // ===============================
        // Black Hole
        // ===============================
        if (blackhole.complete && blackhole.naturalWidth > 0) {
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

            if (blackY < 5) {
                blackY += 1.0;
            } else {
                blackX += (0.6 * speedScale);      
                const dx = (blackX + 100) - (neptuneX + 60);
                const dy = (blackY + 65) - (neptuneY + 60);
                const jdx = (blackX + 100) - (jupiterX + 60);
                const jdy = (blackY + 65) - (jupiterY + 60);

                if(!jupiterHit && Math.sqrt(jdx*jdx + jdy*jdy) < 90){
                    jupiterHit = true;
                }
                if (!neptuneHit && Math.sqrt(dx * dx + dy * dy) < 90){
                    neptuneHit = true;
                }   
                blackAngle += (0.04 * speedScale); 
            }

            if (blackX > canvas.width + 160) {
                blackX = -140; 
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
            }
        }

        // ===============================
        // Jupiter
        // ===============================
        if (jupiter.complete && jupiter.naturalWidth > 0) {
            ctx.save();
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
            
            if(!jupiterHit){
                jupiterAngle += (0.05 * speedScale);
                jupiterX -= (2.2 * speedScale);
            } else {
                const jdx = (blackX + 100) - (jupiterX + 60);
                const jdy = (blackY + 65) - (jupiterY + 60);
                jupiterX += jdx * 0.06;
                jupiterY += jdy * 0.06;
                jupiterSpin += 0.35;
                jupiterScale *= 0.94;
                blackScale += 0.10;
                if(blackScale > 2.8) blackScale = 2.8;
                if(jupiterScale < 0.55) burstReady = true;
                if(jupiterScale < 0.22) bigBang = true;
            }
            
            if (jupiterX < -120) jupiterX = canvas.width + 150;
        }

        // ===============================
        // Purple Planet
        // ===============================
        if (purple.complete && purple.naturalWidth > 0) {
            ctx.save();
            const purpleGlow = 260 + Math.sin(glowPhase) * 30;
            const purpleLight = ctx.createRadialGradient(
                purpleX + 110, purpleY + 110, 20,
                purpleX + 110, purpleY + 110, purpleGlow
            );
            purpleLight.addColorStop(0, "rgba(255,255,255,1)");
            purpleLight.addColorStop(0.12, "rgba(255,180,255,.95)");
            purpleLight.addColorStop(0.35, "rgba(210,80,255,.75)");
            purpleLight.addColorStop(0.65, "rgba(140,0,255,.30)");
            purpleLight.addColorStop(1, "rgba(140,0,255,0)");

            ctx.fillStyle = purpleLight;
            ctx.beginPath();
            ctx.arc(purpleX + 110, purpleY + 110, purpleGlow, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = "#d946ef";
            ctx.shadowBlur = 90;
            
            ctx.translate(purpleX + 55, purpleY + 55);
            ctx.rotate(purpleAngle);
            ctx.drawImage(purple, -55, -55, 110, 110);
            ctx.restore();

            purpleX -= (1.1 * speedScale);
            purpleAngle += (0.02 * speedScale);
            
            const dxBruce = (purpleX + 55) - (bruceX + 30);
            if(!bruceAttached && !bruceKungfu && Math.abs(dxBruce) < 80){
                bruceKungfu = true;
                aiSignal = true;
            }
            
            // SỬA LỖI CẮT CHỮ: Nếu hành tinh bay qua mép, không reset nếu chữ đang chạy
            if (purpleX < -260) {
                if (!aiPanel) {
                    // Nếu bảng AI chưa bật, cho phép hành tinh lặp lại vòng lặp
                    purpleX = canvas.width + 140;
                }
                // Nếu aiPanel đang bật (chữ đang chạy), cứ để hành tinh và Bruce trôi ra ngoài.
                // Hàm resetScene() sẽ lo việc reset toàn bộ khi chữ chạy xong!
            }
        }

        // ===============================
        // Neptune
        // ===============================
        if (!neptuneDone && blackX < canvas.width / 2) {
            neptuneStarted = true;
        }

        if (neptuneStarted && !neptuneDone && neptune.complete && neptune.naturalWidth > 0) {
            ctx.save();
            ctx.translate(neptuneX + 60, neptuneY + 60);
            ctx.rotate(neptuneHit ? neptuneSpin : neptuneAngle);
            ctx.scale(neptuneScale, neptuneScale);
            ctx.drawImage(neptune, -60, -60, 120, 120);
            ctx.restore();

            if (neptuneY < 5) {
                neptuneY += 1;
            } else {
                if (!neptuneHit) {
                    neptuneX -= (2.4 * speedScale);
                    neptuneAngle += (0.05 * speedScale);
                } else {
                    const dx = (blackX + 100) - (neptuneX + 60);
                    const dy = (blackY + 65) - (neptuneY + 60);
                    neptuneX += dx * 0.06;
                    neptuneY += dy * 0.06;
                    neptuneSpin += 0.25;
                    neptuneScale *= 0.985;
                }
            }
        }    

        // ===============================
        // Bruce Lee Đi Bộ & LED Panel
        // ===============================
        if (bruce1.complete && bruce1.naturalWidth > 0 && bruce2.complete && bruce2.naturalWidth > 0) {
            if(bruceKungfu){
                bruceKungfuTimer++;
                if(bruceKungfuTimer<18){
                    bruceCurrentY -= 1.4;
                } else if(bruceKungfuTimer<36){
                    bruceCurrentY += 1.4;
                }
                if (bruceKungfuTimer > 35) {
                    bruceKungfu = false;
                    bruceAttached = true;
                    aiPanel = true;
                }
            }
            
            let currentBruce = bruce1;

            if (!bruceAttached && !bruceKungfu) {
                const walkCycle = Math.floor(Date.now() / 250) % 2;
                currentBruce = walkCycle === 0 ? bruce1 : bruce2;
                bruceX += (0.8 * speedScale); 
            } else {
                currentBruce = bruce1; 
            }
            
            ctx.drawImage(currentBruce, bruceX, bruceCurrentY, 45, 65);
            
            if(bruceKungfu){
                ctx.strokeStyle="#00ffff";
                ctx.lineWidth=5;
                ctx.beginPath();
                ctx.moveTo(bruceX + 42, bruceCurrentY + 27);
                ctx.lineTo(bruceX + 115, bruceCurrentY + 27);
                ctx.stroke();
            }
            
            if(bruceAttached){
                bruceX = purpleX + 25;
                bruceCurrentY = purpleY + 25;
            }

            if (aiPanel) {
                const left = 20;
                const right = canvas.width - 20;
                const textY = canvas.height / 2;

                if (ledText === "") {
                    // Đã bỏ ký tự 🌌 và ✅ theo yêu cầu
                    ledText = "Cosmos The Traveler walks through the Fibonacci Universe until he finds the Purple Planet—or keeps walking for the rest of his life. 🪐Only when the Purple Planet appears does the hidden Fibonacci Pattern begin to reveal itself for Today's Drawing.";
                }

                ctx.save();
                ctx.beginPath();
                ctx.rect(left, 0, right-left, canvas.height);
                ctx.clip();

                const fontSize = Math.floor(canvas.height * 0.45); 
                ctx.font = "900 " + fontSize + "px Arial Black";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";

                ctx.shadowBlur = 28;
                ctx.shadowColor = "#ffd700";
                ctx.fillStyle = "#ffe800";

                const startX = canvas.width - ledOffset;
                ctx.fillText(ledText, startX, textY);
                ctx.restore();

                // ĐÃ TĂNG TỐC ĐỘ CHỮ LÊN ĐÁNG KỂ (Từ 2.4 lên 5.0)
                ledOffset += (5.0 * speedScale);
                const textWidth = ctx.measureText(ledText).width;

                // CHỈ RESET KHI CHỮ ĐÃ CHẠY HOÀN TOÀN KHUẤT MÉP TRÁI
                if (startX < -(textWidth + 100)) {
                    resetScene();
                }
            }    
        }
    }
    
    // Khởi động Animation
    requestAnimationFrame(function(time) {
        lastRenderTime = time;
        drawStars(time);
    });    
    
    console.log("⭐ Stars Animated (Fast Text & Correct Reset)");      
});
