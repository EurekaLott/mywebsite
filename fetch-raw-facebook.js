// ================================================
// fetch-raw-facebook.js
// Lấy kết quả RAW (unsorted) từ hình ảnh Facebook Vietlott
// Tích hợp an toàn với EurekaLott
// ================================================

const fs = require('fs');
const path = require('path');

// ===================== CONFIG =====================
const RAW_DATA_FILE = path.join(__dirname, 'raw-results.json');
const LAST_KY_FILE = path.join(__dirname, 'last-raw-ky.txt');

// ===================== MAIN FUNCTION =====================
async function fetchRawFacebookResults() {
    console.log("🚀 Bruce Lee Nhị Chỉ Thiền - Đang fetch raw results từ Facebook Vietlott...");

    try {
        // TODO: Thay bằng scraper thật (Apify / Playwright) sau
        // Hiện tại dùng mock data từ ảnh bạn cung cấp để test
        const latestRaw = {
            ky: "01367",
            date: "04/07/2026",
            raw_numbers: [18, 15, 31, 13, 43, 23, 41],  // Thứ tự raw trên hình
            full_text: "18 15 31 13 43 23 41",
            source: "facebook_image",
            timestamp: new Date().toISOString(),
            note: "Raw unsorted from Vietlott Facebook"
        };

        // Đọc dữ liệu cũ
        let allRaw = [];
        if (fs.existsSync(RAW_DATA_FILE)) {
            allRaw = JSON.parse(fs.readFileSync(RAW_DATA_FILE, 'utf8'));
        }

        // Kiểm tra trùng kỳ
        const isDuplicate = allRaw.some(item => item.ky === latestRaw.ky);
        if (isDuplicate) {
            console.log(`✅ Kỳ ${latestRaw.ky} đã có dữ liệu raw. Bỏ qua.`);
            return allRaw;
        }

        // Thêm dữ liệu mới
        allRaw.unshift(latestRaw);  // Thêm vào đầu mảng
        allRaw = allRaw.slice(0, 50); // Giữ tối đa 50 kỳ gần nhất

        // Lưu file
        fs.writeFileSync(RAW_DATA_FILE, JSON.stringify(allRaw, null, 2));
        fs.writeFileSync(LAST_KY_FILE, latestRaw.ky);

        console.log(`✅ Đã lưu raw result kỳ ${latestRaw.ky} thành công!`);
        console.log("Raw numbers:", latestRaw.raw_numbers);

        return allRaw;

    } catch (error) {
        console.error("❌ Lỗi fetch raw:", error);
        return [];
    }
}

// ===================== AUTO RUN =====================
if (require.main === module) {
    fetchRawFacebookResults()
        .then(() => console.log("🎉 Hoàn thành Nhị Chỉ Thiền!"))
        .catch(console.error);
}

module.exports = { fetchRawFacebookResults };
