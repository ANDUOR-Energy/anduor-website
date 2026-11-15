/* ===== ĐỊA CHỈ MÁY CHỦ (Apps Script Web app) =====
   Dán địa chỉ Web app kết thúc bằng /exec vào giữa hai dấu nháy, ví dụ:
   window.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   Để trống: form chuyển sang mở email (không tải được hóa đơn), nút Góp ý báo chưa gửi được.
   Địa chỉ này không phải mật khẩu; ai xem mã trang cũng thấy được. Không dán khóa bí mật nào vào đây. */
window.APPS_SCRIPT_URL = '';

/* Cấu hình dùng chung (bản tĩnh). Bản Apps Script lấy hai hằng số này ở đầu Code.gs.
   LEGAL_AS_OF: ngày cập nhật thông tin pháp lý (YYYY-MM-DD), hiện trên mọi mục có trích văn bản.
   PROVINCES: 34 đơn vị hành chính cấp tỉnh từ 01/7/2025 (Nghị quyết 202/2025/QH15 ngày 12/6/2025),
   kèm vùng sales (Bắc / Trung, gồm Tây Nguyên / Nam), tên tỉnh cũ (former) và cách gõ tắt (alias). */
window.ANDUOR_CFG = window.ANDUOR_CFG || {
  legalAsOf: '2026-11-15',
  provinces: [
    { name: 'TP. Hà Nội', region: 'Bắc', former: [], alias: ['Hà Nội', 'Thành phố Hà Nội', 'HN'] },
    { name: 'TP. Hải Phòng', region: 'Bắc', former: ['Hải Dương'], alias: ['Hải Phòng', 'Thành phố Hải Phòng', 'HP'] },
    { name: 'Quảng Ninh', region: 'Bắc', former: [], alias: ['QN'] },
    { name: 'Cao Bằng', region: 'Bắc', former: [], alias: [] },
    { name: 'Lạng Sơn', region: 'Bắc', former: [], alias: [] },
    { name: 'Lai Châu', region: 'Bắc', former: [], alias: [] },
    { name: 'Điện Biên', region: 'Bắc', former: [], alias: [] },
    { name: 'Sơn La', region: 'Bắc', former: [], alias: [] },
    { name: 'Lào Cai', region: 'Bắc', former: ['Yên Bái'], alias: [] },
    { name: 'Tuyên Quang', region: 'Bắc', former: ['Hà Giang'], alias: [] },
    { name: 'Thái Nguyên', region: 'Bắc', former: ['Bắc Kạn'], alias: [] },
    { name: 'Phú Thọ', region: 'Bắc', former: ['Vĩnh Phúc', 'Hòa Bình'], alias: [] },
    { name: 'Bắc Ninh', region: 'Bắc', former: ['Bắc Giang'], alias: [] },
    { name: 'Hưng Yên', region: 'Bắc', former: ['Thái Bình'], alias: [] },
    { name: 'Ninh Bình', region: 'Bắc', former: ['Hà Nam', 'Nam Định'], alias: [] },
    { name: 'Thanh Hóa', region: 'Trung', former: [], alias: ['Thanh Hoá'] },
    { name: 'Nghệ An', region: 'Trung', former: [], alias: [] },
    { name: 'Hà Tĩnh', region: 'Trung', former: [], alias: [] },
    { name: 'Quảng Trị', region: 'Trung', former: ['Quảng Bình'], alias: [] },
    { name: 'TP. Huế', region: 'Trung', former: ['Thừa Thiên Huế'], alias: ['Huế', 'Thành phố Huế'] },
    { name: 'TP. Đà Nẵng', region: 'Trung', former: ['Quảng Nam'], alias: ['Đà Nẵng', 'Thành phố Đà Nẵng', 'DN', 'ĐN'] },
    { name: 'Quảng Ngãi', region: 'Trung', former: ['Kon Tum'], alias: [] },
    { name: 'Gia Lai', region: 'Trung', former: ['Bình Định'], alias: [] },
    { name: 'Đắk Lắk', region: 'Trung', former: ['Phú Yên'], alias: ['Đăk Lăk', 'Dak Lak'] },
    { name: 'Khánh Hòa', region: 'Trung', former: ['Ninh Thuận'], alias: ['Khánh Hoà'] },
    { name: 'Lâm Đồng', region: 'Trung', former: ['Đắk Nông', 'Bình Thuận'], alias: [] },
    { name: 'TP. Hồ Chí Minh', region: 'Nam', former: ['Bình Dương', 'Bà Rịa - Vũng Tàu'], alias: ['Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'HCM', 'TPHCM', 'TP.HCM', 'Sài Gòn', 'Saigon', 'SG'] },
    { name: 'Đồng Nai', region: 'Nam', former: ['Bình Phước'], alias: [] },
    { name: 'Tây Ninh', region: 'Nam', former: ['Long An'], alias: [] },
    { name: 'TP. Cần Thơ', region: 'Nam', former: ['Sóc Trăng', 'Hậu Giang'], alias: ['Cần Thơ', 'Thành phố Cần Thơ', 'CT'] },
    { name: 'Vĩnh Long', region: 'Nam', former: ['Bến Tre', 'Trà Vinh'], alias: [] },
    { name: 'Đồng Tháp', region: 'Nam', former: ['Tiền Giang'], alias: [] },
    { name: 'Cà Mau', region: 'Nam', former: ['Bạc Liêu'], alias: [] },
    { name: 'An Giang', region: 'Nam', former: ['Kiên Giang'], alias: [] }
  ]
};
