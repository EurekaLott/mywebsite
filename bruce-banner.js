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
}
