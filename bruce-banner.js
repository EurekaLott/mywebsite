console.log("🌌 Black Hole 3D Spin");

const banner = document.getElementById("bruce-banner");

banner.style.width = "100%";
banner.style.maxWidth = "1100px";
banner.style.height = "260px";
banner.style.margin = "20px auto";
banner.style.background = "#000814";
banner.style.borderRadius = "12px";
banner.style.overflow = "hidden";

banner.innerHTML = "<canvas id='cv'></canvas>";

const canvas = document.getElementById("cv");
const ctx = canvas.getContext("2d");

function resize() {
    canvas.width = banner.clientWidth;
    canvas.height = banner.clientHeight;
}

resize();
window.addEventListener("resize", resize);

//////////////////////////////////////////////////////

const blackhole = new Image();
blackhole.src = "images/blackhole.png";

//////////////////////////////////////////////////////

let angle = 0;

//////////////////////////////////////////////////////

function draw() {

    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Sao nền
    for(let i=0;i<150;i++){

        ctx.beginPath();

        ctx.fillStyle="white";

        ctx.arc(
            (i*79)%canvas.width,
            (i*47)%canvas.height,
            1,
            0,
            Math.PI*2
        );

        ctx.fill();

    }

    /////////////////////////////////////////

    // Giá trị từ 1 -> 0 -> -1 -> 0 -> 1
    let scaleY = Math.cos(angle);

    ctx.save();

    ctx.translate(
        canvas.width/2,
        canvas.height/2
    );

    // Giả lập quay theo trục ngang
    ctx.scale(1, scaleY);

    ctx.shadowColor="#44ffff";
    ctx.shadowBlur=40;

    ctx.drawImage(
        blackhole,
        -120,
        -120,
        240,
        240
    );

    ctx.restore();

    angle += 0.04;

    requestAnimationFrame(draw);

}

blackhole.onload = draw;
