console.log("🥋 Bruce Banner Loaded");

const banner = document.getElementById("bruce-banner");

if (!banner) {
    console.error("❌ #bruce-banner not found");
} else {
    console.log("🥋 Bruce Banner Ready");

    banner.innerHTML = `
        <canvas id="bruceCanvas"></canvas>
    `;
}
