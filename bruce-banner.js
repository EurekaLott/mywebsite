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
    banner.innerHTML = `
        <canvas id="bruceCanvas"></canvas>
    `;
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
// Bruce Lee
// ===============================

const bruce = new Image();
bruce.src = "images/bruce.png";
    bruce.onload = () => {
    console.log("🥋 Bruce Image Loaded");
};

bruce.onerror = () => {
    console.error("❌ Bruce Image Load Failed");
};
// ===============================
// Jupiter
// ===============================

const jupiter = new Image();
jupiter.src = "images/Jupiter.png";

jupiter.onload = () => {
    console.log("🪐 Jupiter Loaded");
};

jupiter.onerror = () => {
    console.error("❌ Jupiter Load Failed");
};

let jupiterX = canvas.width - 30;
const jupiterY = 5;
let jupiterAngle = 0;    
// ===============================
// Black Hole
// ===============================

const blackhole = new Image();
blackhole.src = "images/blackhole.png";

blackhole.onload = () => {
    console.log("🕳️ Black Hole Loaded");
};

blackhole.onerror = () => {
    console.error("❌ Black Hole Load Failed");
};

let blackX = 40;
let blackY = -140;
    
let bruceX = -80;
const bruceY = canvas.height - 70;    
// ===============================
// Shooting Star
// ===============================

let meteorX = canvas.width - 120;
let meteorY = 12;
    
function drawStars() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

// ===============================
// Halley Comet
// ===============================

// Tail
const g = ctx.createLinearGradient(
    meteorX,
    meteorY,
    meteorX - 80,
    meteorY + 40
);

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

// Comet head
ctx.beginPath();
ctx.fillStyle = "#ffffff";
ctx.arc(meteorX, meteorY, 8, 0, Math.PI * 2);
ctx.fill();

// Move
meteorX -= 1.6;
meteorY += 0.08;

// Restart
if (meteorX < -100) {
    meteorX = canvas.width + 200;
    meteorY = 8 + Math.random() * 10;
} 

// ===============================
// Black Hole
// ===============================

if (blackhole.complete) {

    ctx.save();

    ctx.globalAlpha = 0.95;

    ctx.drawImage(
        blackhole,
        blackX,
        blackY,
        140,
        140
    );

    ctx.restore();

    // Giai đoạn 1: rơi xuống
    if (blackY < 5) {

        blackY += 1.0;

    }
    // Giai đoạn 2: bay ngang
    else {

        blackX -= 1.0;
    }

    // Khi bay hết banner thì xuất hiện lại
    if (blackX < -160) {

    blackX = canvas.width + 140;
    blackY = -140;

}

}
// ===============================
// Jupiter
// ===============================

if (jupiter.complete) {

ctx.save();

ctx.shadowColor = "#ffd27a";
ctx.shadowBlur = 25;

ctx.translate(jupiterX + 50, jupiterY + 50);
ctx.rotate(jupiterAngle);

ctx.drawImage(
    jupiter,
    -50,
    -50,
    100,
    100
);

ctx.restore();

jupiterAngle += 0.05;

jupiterX -= 0.6;
    
    if (jupiterX < -120) {
        jupiterX = canvas.width + 150;
    }

}
    
// Bruce Lee
if (bruce.complete) {

    ctx.drawImage(
        bruce,
        bruceX,
        bruceY,
        60,
        60
    );

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
