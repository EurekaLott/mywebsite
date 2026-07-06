console.log("🌌 Black Hole Rotate");

const banner = document.getElementById("bruce-banner");

banner.style.width = "100%";
banner.style.maxWidth = "1100px";
banner.style.height = "260px";
banner.style.margin = "20px auto";
banner.style.background = "#000";
banner.style.borderRadius = "12px";
banner.style.overflow = "hidden";

banner.innerHTML = `
<canvas id="cv"></canvas>
`;

const canvas = document.getElementById("cv");
const ctx = canvas.getContext("2d");

function resize(){

    canvas.width = banner.clientWidth;
    canvas.height = banner.clientHeight;

}

resize();

window.addEventListener("resize", resize);

//////////////////////////////////////////////////
// Black Hole
//////////////////////////////////////////////////

const blackhole = new Image();

blackhole.src = "images/blackhole.png";

blackhole.onload = ()=>{

    console.log("✅ image loaded");

}

//////////////////////////////////////////////////

let angle = 0;

//////////////////////////////////////////////////

function animate(){

    ctx.clearRect(0,0,canvas.width,canvas.height);

    // nền sao

    for(let i=0;i<180;i++){

        let x=(i*73)%canvas.width;
        let y=(i*41)%canvas.height;

        ctx.beginPath();
        ctx.fillStyle="white";
        ctx.arc(x,y,1.2,0,Math.PI*2);
        ctx.fill();

    }

    ///////////////////////////////////////////////

    ctx.save();

    // Glow

    ctx.shadowColor="#44ffff";
    ctx.shadowBlur=40;

    // Đưa gốc tọa độ vào giữa banner

    ctx.translate(

        canvas.width/2,

        canvas.height/2

    );

    // Quay quanh đúng tâm

    ctx.rotate(angle);

    // Vẽ ảnh đối xứng qua tâm

    ctx.drawImage(

        blackhole,

        -120,

        -120,

        240,

        240

    );

    ctx.restore();

    ///////////////////////////////////////////////

    angle += 0.01;

    requestAnimationFrame(animate);

}

animate();
