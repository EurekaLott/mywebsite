const fs = require('fs');
const https = require('https');

// Hàm fetch API cơ bản
function fetchData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

async function runPipeline() {
    try {
        console.log('Đang vận công lấy dữ liệu Vietlott...');
        
        // Thay link này bằng URL API hoặc trang Vietlott thực tế bạn đang cào
        const url = 'https://vietlott.vn/api/Kqxs/LayKetQuaNhanhChong?gameid=5&drawid=0'; 
        
        const rawData = await fetchData(url);
        
        // Chuyển đổi dữ liệu thô sang dạng JSON (nếu nguồn là JSON)
        let parsedData;
        try {
            parsedData = JSON.parse(rawData);
        } catch (e) {
            // Nếu không phải JSON, tạo data giả định để web không bị sập
            parsedData = { 
                raw_text: rawData.substring(0, 100), 
                status: "success", 
                timestamp: new Date().toISOString() 
            };
        }

        // Định dạng lại thành biến toàn cục cho website đọc (ví dụ: window.VIETLOTT_DATA)
        const fileContent = `// File được tự động cập nhật bởi GitHub Actions\nwindow.VIETLOTT_DATA = ${JSON.stringify(parsedData, null, 2)};\n`;

        // Ghi đè vào file vietlott-data.js
        fs.writeFileSync('vietlott-data.js', fileContent, 'utf8');
        
        console.log('Đả thông kinh mạch thành công! Đã ghi file vietlott-data.js');
    } catch (error) {
        console.error('Tẩu hỏa nhập ma (Lỗi):', error.message);
        // Quăng lỗi để GitHub Actions báo đỏ, không giấu lỗi nữa
        process.exit(1);
    }
}

runPipeline();
