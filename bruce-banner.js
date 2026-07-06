console.log("🌌 Black Hole Ferris Wheel");

const banner = document.getElementById("bruce-banner");

banner.style.width = "100%";
banner.style.maxWidth = "1100px";
banner.style.height = "220px";
banner.style.margin = "20px auto";
banner.style.borderRadius = "12px";
banner.style.overflow = "hidden";
banner.style.position = "relative";
banner.style.background =
"linear-gradient(180deg,#000814,#001d3d)";
banner.style.border = "1px solid #4f46e5";

banner.innerHTML = "<canvas id='canvas'></canvas>";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize(){

    canvas.width = banner.clientWidth;
    canvas.height = banner.clientHeight;

}

resize();

window.addEventListener("resize", resize);

//////////////////////////////////////////////////////
// Black Hole
//////////////////////////////////////////////////////

const blackhole = new Image();

blackhole.src = "images/blackhole.png";

blackhole.onload = () => {

    console.log("✅ Black Hole Loaded");

};

blackhole.onerror = () => {

    console.log("❌ Image Not Found");

};

//////////////////////////////////////////////////////
// Rotation
//////////////////////////////////////////////////////

let angle = 0;

let glow = 0;

//////////////////////////////////////////////////////
// Animation
//////////////////////////////////////////////////////

function animate(){

    ctx.clearRect(0,0,canvas.width,canvas.height);

    //////////////////////////////////////////////////
    // Background Stars
    //////////////////////////////////////////////////

    for(let i=0;i<120;i++){

        let x=(i*97)%canvas.width;
        let y=(i*53)%canvas.height;

        ctx.beginPath();
        ctx.fillStyle="rgba(255,255,255,0.8)";
        ctx.arc(x,y,1.2,0,Math.PI*2);
        ctx.fill();

    }

    //////////////////////////////////////////////////
    // Glow
    //////////////////////////////////////////////////

    glow += 0.05;

    let blur =
        35 +
        Math.sin(glow)*20;

    ctx.save();

    ctx.shadowColor="#55ffff";
    ctx.shadowBlur=blur;

    //////////////////////////////////////////////////
    // Center
    //////////////////////////////////////////////////

    ctx.translate(
        canvas.width/2,
        canvas.height/2
    );

    //////////////////////////////////////////////////
    // Rotate
    //////////////////////////////////////////////////

    ctx.rotate(angle);

    //////////////////////////////////////////////////
    // Draw Image
    //////////////////////////////////////////////////

    ctx.drawImage(

        blackhole,

        -110,
        -110,

        220,
        220

    );

    ctx.restore();

    //////////////////////////////////////////////////
    // Rotation Speed
    //////////////////////////////////////////////////

    angle += 0.006;

    requestAnimationFrame(animate);

}

animate();
