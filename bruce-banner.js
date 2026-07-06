console.log("Black Hole Ferris Wheel");

const banner = document.getElementById("bruce-banner");

banner.style.width = "100%";
banner.style.maxWidth = "1100px";
banner.style.height = "220px";
banner.style.margin = "20px auto";
banner.style.background = "#000814";
banner.style.borderRadius = "12px";
banner.style.overflow = "hidden";
banner.style.position = "relative";

banner.innerHTML = "<canvas id='canvas'></canvas>";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize(){

    canvas.width = banner.clientWidth;
    canvas.height = banner.clientHeight;

}

resize();

window.addEventListener("resize",resize);

//////////////////////////////////////////////////////
// Black Hole
//////////////////////////////////////////////////////

const blackhole = new Image();

blackhole.src = "images/blackhole.png";

blackhole.onload = ()=>{

    console.log("Black Hole Loaded");

}

//////////////////////////////////////////////////////
// Rotation
//////////////////////////////////////////////////////

let angle = 0;

//////////////////////////////////////////////////////
// Animation
//////////////////////////////////////////////////////

function animate(){

    ctx.clearRect(0,0,canvas.width,canvas.height);

    //////////////////////////////////////////////
    // Glow
    //////////////////////////////////////////////

    ctx.save();

    ctx.shadowColor = "#44ffff";
    ctx.shadowBlur = 45;

    //////////////////////////////////////////////
    // Move to center
    //////////////////////////////////////////////

    ctx.translate(
        canvas.width/2,
        canvas.height/2
    );

    //////////////////////////////////////////////
    // Rotate
    //////////////////////////////////////////////

    ctx.rotate(angle);

    //////////////////////////////////////////////
    // Draw
    //////////////////////////////////////////////

    ctx.drawImage(
        blackhole,
        -120,
        -120,
        240,
        240
    );

    ctx.restore();

    //////////////////////////////////////////////
    // Speed
    //////////////////////////////////////////////

    angle += 0.01;

    requestAnimationFrame(animate);

}

animate();
