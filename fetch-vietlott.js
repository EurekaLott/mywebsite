const fs = require('fs');

async function runPipeline() {
    try {
        console.log('Đang nạp chân khí giả lập...');
        
        // Tạo dữ liệu giả lập chuẩn để xem website có đọc được không
        const mockData = {
            status: "success",
            timestamp: new Date().toISOString(),
            // Giả lập một kỳ quay thưởng
            latest: {
                drawId: "99999",
                date: "26/07/2026",
                numbers: ["01", "02", "03", "04", "05", "06", "07"] // 6 số + 1 số đặc biệt
            },
            history: []
        };

        // Ghi đè vào file vietlott-data.js (Thử biến window.VIETLOTT_DATA)
        const fileContent = `window.VIETLOTT_DATA = ${JSON.stringify(mockData, null, 2)};\n`;

        fs.writeFileSync('vietlott-data.js', fileContent, 'utf8');
        
        console.log('Đã ghi file vietlott-data.js với dữ liệu giả lập!');
    } catch (error) {
        console.error('Lỗi nội thương:', error.message);
        process.exit(1);
    }
}

runPipeline();
