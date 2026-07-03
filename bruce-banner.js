console.log("🥋 Bruce Banner Loaded");
// ===============================
// Bruce Banner - Round 3
// ===============================

// Tạo banner nếu chưa có
const header = document.querySelector(".header");

if (header && !document.getElementById("bruce-banner")) {

    const banner = document.createElement("div");
    banner.id = "bruce-banner";

    banner.innerHTML = `
        <canvas id="bruceCanvas"></canvas>
    `;

    // chèn ngay dưới Header
    header.insertAdjacentElement("afterend", banner);

    console.log("🥋 Bruce Banner Created");
}
