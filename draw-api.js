// File: draw-api.js

/**
 * Hàm này gọi thẳng vào Worker của bạn để lấy dữ liệu mới nhất
 * Sử dụng cache: 'no-store' để ép trình duyệt luôn lấy data mới, phá vỡ mọi loại cache.
 */
export async function fetchLiveLatestDraw() {
    try {
        // Đổi đường link này thành URL thực tế của file worker.js (hoặc API endpoint) của bạn
        const workerEndpoint = 'https://ten-mien-cua-ban.com/api/worker'; 

        const response = await fetch(workerEndpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            // Bí kíp đả thông kinh mạch nằm ở đây: Không cho phép cache!
            cache: 'no-store' 
        });

        if (!response.ok) {
            throw new Error(`Kinh mạch đứt đoạn: ${response.status}`);
        }

        const data = await response.json();
        return data; 
        
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu mới:', error);
        return null; // Trả về null nếu lỗi để frontend tự xử lý (ví dụ: hiện fallback)
    }
}
