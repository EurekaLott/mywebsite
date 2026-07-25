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

    banner.style.height =
        window.innerWidth <= 430
        ? "80px"
        : "110px";

    canvas.width = banner.clientWidth;
    canvas.height = banner.clientHeight;
    bruceY = canvas.height - 70;
bruceCurrentY = bruceY;

    jupiterX = canvas.width - 30;
    neptuneX = canvas.width / 2 - 60;
    purpleX = canvas.width + 140;
    orionX = canvas.width + 150;
    bruceX = -80;

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
let jupiterY = 5;
let jupiterAngle = 0;   
let glowPhase = 0;
let moonAngle = 0;

// ===============================
// Neptune
// ===============================

const neptune = new Image();
neptune.src = "images/Neptune.png";

neptune.onload = () => {
    console.log("🔵 Neptune Loaded");
};

neptune.onerror = () => {
    console.error("❌ Neptune Load Failed");
};

let neptuneX = canvas.width / 2 - 60;
let neptuneY = -140;
let neptuneAngle = 0;
let neptuneStarted = false;
let neptuneDone = false;    
// ===============================
// Purple Planet
// ===============================

const purple = new Image();
purple.src = "images/purple.png";

purple.onload = () => {
    console.log("🟣 Purple Loaded");
};

purple.onerror = () => {
    console.error("❌ Purple Load Failed");
};

let purpleX = canvas.width + 140;
let purpleY = 10;
let purpleAngle = 0;

    
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
    
let bruceX = -80;
let bruceY = 0;
 if (!bruceAttached && !bruceKungfu) {
    bruceCurrentY = bruceY;
}
let bruceAttached = false;

let bruceKungfu = false;

let bruceKungfuTimer = 0;

let purpleDone = false;

let aiSignal = false;
let aiPanel = false;    
let ledOffset = 0;
let ledText = "";    
let forecastIndex = 0;
let restartScene = false;
function resetScene(){

    // LED
    ledOffset = 0;
    ledText = "";

    // Black Hole
    blackX = 40;
    blackY = -140;
    blackAngle = 0;
    blackScale = 1;
    burstReady = false;

    // Jupiter
    
    jupiterY = 5;
    jupiterAngle = 0;
    jupiterScale = 1;
    jupiterSpin = 0;
    jupiterHit = false;

    // Neptune
    
    neptuneY = -140;
    neptuneAngle = 0;
    neptuneScale = 1;
    neptuneSpin = 0;
    neptuneHit = false;
    neptuneStarted = false;
    neptuneDone = false;

    // Purple
    
    purpleDone = false;

    // Bruce
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
    
// ===============================
// Shooting Star
// ===============================

const orion = new Image();
orion.src = "images/Orion.png";

orion.onload = () => {
    console.log("🚀 Orion Loaded");
};

orion.onerror = () => {
    console.error("❌ Orion Load Failed");
};


let orionY = 8;
    
function drawStars() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (restartScene) {

    restartScene = false;

    resetScene();

}
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

// ===============================
// Orion Spacecraft
// ===============================

if (orion.complete){

    ctx.save();

    ctx.translate(
        orionX+30,
        orionY+15
    );

    // ===== Engine Flame =====

    const fire=
    18+Math.sin(Date.now()*0.03)*6;

    const g=
    ctx.createLinearGradient(
        -45,0,
        -10,0
    );

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

    // ===== Blue Plasma =====

    ctx.strokeStyle="#66ffff";
    ctx.lineWidth=1.5;

    for(let i=0;i<3;i++){

        ctx.beginPath();

        ctx.moveTo(
            -30,
            -5+i*5
        );

        ctx.lineTo(
            -48-fire*0.6,
            -5+i*5
        );

        ctx.stroke();

    }

    ctx.drawImage(
        orion,
        -30,
        -15,
        60,
        30
    );

    ctx.restore();

    orionX-=2.0;

    orionY+=Math.sin(orionX*0.02)*0.15;

    if(orionX<-160){

        orionX=canvas.width+180;

        orionY=5+Math.random()*12;

    }

}

// ===============================
// Black Hole
// ===============================

if (blackhole.complete) {

    ctx.save();
glowPhase += 0.08;

const glow =
    40 +
    Math.sin(glowPhase) * 30;

ctx.shadowColor = "#fff6a0";
ctx.shadowBlur = glow;
    ctx.globalAlpha = 0.95;

    

ctx.save();

ctx.translate(
    blackX + 100,
    blackY + 65
);

ctx.rotate(blackAngle);

ctx.scale(blackScale, blackScale);

ctx.drawImage(
    blackhole,
    -100,
    -65,
    240,
    160
);

ctx.restore();
   

    ctx.restore();

    // Giai đoạn 1: rơi xuống
    if (blackY < 5) {

        blackY += 1.0;

    }
    // Giai đoạn 2: bay ngang
    else {

    blackX += 0.6;      // cùng tốc độ với Jupiter
    const dx = (blackX + 100) - (neptuneX + 60);
const dy = (blackY + 65) - (neptuneY + 60);
const jdx =
    (blackX + 100) - (jupiterX + 60);

const jdy =
    (blackY + 65) - (jupiterY + 60);

if(
    !jupiterHit &&
    Math.sqrt(jdx*jdx + jdy*jdy) < 90
){
    jupiterHit = true;
}
        
if (
    !neptuneHit &&
    Math.sqrt(dx * dx + dy * dy) < 90
){
    neptuneHit = true;
}    
    blackAngle += 0.04; // quay vừa phải
}

    // Khi bay hết banner thì xuất hiện lại
    if (blackX < -160) {

    blackX = canvas.width + 140;
    blackY = -140;

}
if (burstReady) {

    ctx.save();

    const burst =
        ctx.createRadialGradient(
            blackX + 100,
            blackY + 65,
            20,
            blackX + 100,
            blackY + 65,
            220
        );

    burst.addColorStop(0, "rgba(255,255,255,1)");
    burst.addColorStop(0.2, "rgba(180,240,255,0.95)");
    burst.addColorStop(0.6, "rgba(120,180,255,0.35)");
    burst.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = burst;

    ctx.beginPath();
    ctx.arc(
        blackX + 100,
        blackY + 65,
        220,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

}
    
}
// ===============================
// Jupiter
// ===============================

if (jupiter.complete) {

ctx.save();
// ===============================
// Jupiter Glow
// ===============================

// ===============================
// Jupiter Glow (Strong)
// ===============================

glowPhase += 0.08;

const glowRadius = 130 + Math.sin(glowPhase) * 20;

const glow = ctx.createRadialGradient(
    jupiterX + 60,
    jupiterY + 60,
    10,
    jupiterX + 60,
    jupiterY + 60,
    glowRadius
);

glow.addColorStop(0.00, "rgba(255,255,240,0.75)");
glow.addColorStop(0.25, "rgba(255,235,120,0.45)");
glow.addColorStop(0.60, "rgba(255,190,40,0.18)");
glow.addColorStop(1.00, "rgba(255,190,40,0.00)");

ctx.fillStyle = glow;

ctx.beginPath();
ctx.arc(
    jupiterX + 60,
    jupiterY + 60,
    glowRadius,
    0,
    Math.PI * 2
);

ctx.fill();  


ctx.translate(jupiterX + 60, jupiterY + 60);
ctx.rotate(
    jupiterHit
        ? jupiterSpin
        : jupiterAngle
);

ctx.scale(
    jupiterScale,
    jupiterScale
);

ctx.drawImage(
    jupiter,
    -60,
    -60,
    120,
    120
);
ctx.restore();
// ===============================
// Io & Europa
// ===============================

moonAngle += 0.03;

// Europa
const europaX =
    jupiterX + 50 + Math.cos(moonAngle) * 72;

const europaY =
    jupiterY + 50 + Math.sin(moonAngle) * 26;

ctx.beginPath();
ctx.fillStyle = "#e8e8ff";
ctx.arc(europaX, europaY, 4, 0, Math.PI * 2);
ctx.fill();

// Io
const ioX =
    jupiterX + 50 + Math.cos(moonAngle + Math.PI) * 58;

const ioY =
    jupiterY + 50 + Math.sin(moonAngle + Math.PI) * 20;

ctx.beginPath();
ctx.fillStyle = "#ffd37a";
ctx.arc(ioX, ioY, 3.5, 0, Math.PI * 2);
ctx.fill();
    
if(!jupiterHit){

    jupiterAngle += 0.05;
    jupiterX -= 2.2;
}
else{

    const jdx =
        (blackX + 100) - (jupiterX + 60);

    const jdy =
        (blackY + 65) - (jupiterY + 60);

    jupiterX += jdx * 0.06;
    jupiterY += jdy * 0.06;

    jupiterSpin += 0.35;

// Jupiter co nhanh hơn
jupiterScale *= 0.94;

// Black Hole phình ngay lập tức
blackScale += 0.10;

if(blackScale > 2.8){

    blackScale = 2.8;

}

// Ánh sáng xuất hiện sớm
if(jupiterScale < 0.55){

    burstReady = true;

}

// Big Bang sớm hơn
if(jupiterScale < 0.22){

    bigBang = true;

}
    
}
    
    if (jupiterX < -120) {
        jupiterX = canvas.width + 150;
    }

}
// ===============================
// Purple Planet
// ===============================

if (purple.complete) {

    ctx.save();
// ===============================
// Purple Sun Glow
// ===============================

const purpleGlow =
    260 + Math.sin(glowPhase) * 30;

const purpleLight =
    ctx.createRadialGradient(
        purpleX + 110,
        purpleY + 110,
        20,
        purpleX + 110,
        purpleY + 110,
        purpleGlow
    );

purpleLight.addColorStop(
    0,
    "rgba(255,255,255,1)"
);

purpleLight.addColorStop(
    0.12,
    "rgba(255,180,255,.95)"
);

purpleLight.addColorStop(
    0.35,
    "rgba(210,80,255,.75)"
);

purpleLight.addColorStop(
    0.65,
    "rgba(140,0,255,.30)"
);

purpleLight.addColorStop(
    1,
    "rgba(140,0,255,0)"
);

ctx.fillStyle = purpleLight;

ctx.beginPath();

ctx.arc(
    purpleX + 110,
    purpleY + 110,
    purpleGlow,
    0,
    Math.PI * 2
);

ctx.fill();

ctx.shadowColor = "#d946ef";
ctx.shadowBlur = 90;
    
    ctx.translate(
        purpleX + 55,
        purpleY + 55
    );

    ctx.rotate(purpleAngle);

    ctx.drawImage(
        purple,
        -55,
        -55,
        110,
        110
    );

    ctx.restore();

    if(!purpleDone){

    purpleX -= 1.1;

}
    purpleAngle += 0.02;
const dxBruce = (purpleX + 55) - (bruceX + 30);

if(
    !bruceAttached &&
    !bruceKungfu &&
    Math.abs(dxBruce) < 80
){

    bruceKungfu = true;

    aiSignal = true;

}
    
    if (purpleX < -260) {

    purpleDone = true;

    aiPanel = false;

    bruceAttached = false;

   

    bruceCurrentY = bruceY;

    bruceKungfu = false;

    bruceKungfuTimer = 0;

    purpleX = canvas.width + 140;

    purpleDone = false;

}

}

    
// ===============================
// Neptune
// ===============================

if (!neptuneDone && blackX < canvas.width / 2) {

    neptuneStarted = true;

}

if (neptuneStarted && !neptuneDone && neptune.complete) {

   ctx.save();

ctx.translate(
    neptuneX + 60,
    neptuneY + 60
);

ctx.rotate(
    neptuneHit
        ? neptuneSpin
        : neptuneAngle
);

ctx.scale(
    neptuneScale,
    neptuneScale
);

ctx.drawImage(
    neptune,
    -60,
    -60,
    120,
    120
);

ctx.restore();

    if (neptuneY < 5) {

        neptuneY += 1;

   } else {

    if (!neptuneHit) {

        neptuneX -= 2.4;
        neptuneAngle += 0.05;

    } else {

        const dx =
            (blackX + 100) - (neptuneX + 60);

        const dy =
            (blackY + 65) - (neptuneY + 60);

        neptuneX += dx * 0.06;
        neptuneY += dy * 0.06;

        neptuneSpin += 0.25;
        neptuneScale *= 0.985;

        if(false){
    bigBang = true;
}
    }

}   

}    
// Bruce Lee
if (bruce.complete) {
if(bruceKungfu){

    bruceKungfuTimer++;

    if(bruceKungfuTimer<18){

        bruceCurrentY-=1.4;

    }else if(bruceKungfuTimer<36){

        bruceCurrentY+=1.4;

    }

   if (bruceKungfuTimer > 35) {

    bruceKungfu = false;

    bruceAttached = true;

    aiPanel = true;

}
    
  }
    
    ctx.drawImage(
    bruce,
    bruceX,
    bruceCurrentY,
    60,
    60
);
if(bruceKungfu){

    ctx.strokeStyle="#00ffff";

    ctx.lineWidth=4;

    ctx.beginPath();

    ctx.lineWidth=5;

ctx.strokeStyle="#00ffff";

ctx.beginPath();

ctx.moveTo(
    bruceX+54,
    bruceCurrentY+27
);

ctx.lineTo(
    bruceX+115,
    bruceCurrentY+27
);

ctx.stroke();
    ctx.stroke();

}
if(bruceAttached){

    bruceX = purpleX + 25;

    bruceCurrentY = purpleY + 25;

}

if (aiPanel) {

    // ===========================
    // WALL STREET / LAS VEGAS LED
    // ===========================

    const left = 20;
    const right = canvas.width - 20;
    const textY = canvas.height / 2;

    // ===========================
    // lấy dữ liệu forecast
    // ===========================

    if (typeof forecastIndex === "undefined")
        forecastIndex = 0;

    if (typeof ledOffset === "undefined")
        ledOffset = 0;

    if (typeof ledText === "undefined")
        ledText = "";

    if (ledText === "") {

        if (
            typeof forecastData !== "undefined" &&
            forecastData.length > 0 &&
            forecastIndex < forecastData.length
        ) {

            const row = forecastData[forecastIndex];

            ledText =
                row.date +
                "     " +
                row.numbers.join("   ");

        }
        else {

            const d = new Date();

            const month = [
                "January","February","March",
                "April","May","June",
                "July","August","September",
                "October","November","December"
            ];

            ledText =
                d.getFullYear() + " " +
                month[d.getMonth()] + " " +
                d.getDate() +
                "     Today's Status Prediction Engine : Inactive";

        }

    }

    // ===========================
    // vùng hiển thị
    // ===========================

    ctx.save();

    ctx.beginPath();
    ctx.rect(
        left,
        0,
        right-left,
        canvas.height
    );
    ctx.clip();

    // ===========================
    // FONT LED
    // ===========================

    const fontSize =
        Math.floor(canvas.height * 0.60);

    ctx.font =
        "900 " +
        fontSize +
        "px Arial Black";

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // ===========================
    // LED Glow
    // ===========================

    ctx.shadowBlur = 28;
    ctx.shadowColor = "#ffd700";

    ctx.fillStyle = "#ffe800";

    const startX =
        canvas.width - ledOffset;

    ctx.fillText(
        ledText,
        startX,
        textY
    );

    ctx.restore();

    // ===========================
    // tốc độ chạy
    // ===========================

    ledOffset += 2.4;

    const textWidth =
        ctx.measureText(ledText).width;

    // ===========================
    // chạy hết mé trái
    // ===========================

  if (startX < -textWidth) {

    if (
        typeof forecastData !== "undefined" &&
        forecastData.length > 0
    ) {

        forecastIndex++;

        if (forecastIndex >= forecastData.length) {

            forecastIndex = 0;

        }

    }

    resetScene();

}

}    
    
    if (!bruceAttached && !bruceKungfu){

    bruceX += 0.8;

}

}

requestAnimationFrame(drawStars);

}
drawStars();    
console.log("⭐ Stars Animated");      
  
}
