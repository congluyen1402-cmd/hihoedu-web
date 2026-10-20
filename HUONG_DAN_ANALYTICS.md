# 📊 HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG HỆ THỐNG QUẢN LÝ DỮ LIỆU & PHÂN TÍCH (ANALYTICS) NOHIEDU / HIHOEDU

Hệ thống được thiết kế chuyên biệt theo tiêu chuẩn các sàn thương mại điện tử lớn (Shopee, Coursera, Udemy) nhưng **hoàn toàn tự chủ, bảo mật, không tốn phí duy trì server** và **không làm chậm website**.

---

## 🌟 CÁC TÍNH NĂNG ĐÃ ĐƯỢC XÂY DỰNG

### 1. Phân tích lưu lượng truy cập (Traffic & Visitors)
* **Số lượt truy cập & xem trang**: Phân tích chi tiết theo **Hôm nay**, **Hôm qua**, **7 ngày**, **30 ngày**, **90 ngày**, **Tháng này** hoặc **Khoảng ngày tùy chọn**.
* **Độ hạt linh hoạt**: Xem biểu đồ chi tiết theo **Giờ**, **Ngày**, **Tuần**, **Tháng**.
* **Bản đồ nhiệt giờ vàng (Heatmap 7x24)**: Biết chính xác ngày nào và khung giờ nào trong tuần có đông khách nhất để lên bài viết, livestream hoặc bật quảng cáo tối ưu chi phí.
* **Tỷ lệ khách mới & khách quay lại**: Đo lường mức độ trung thành của học viên.

### 2. Phân tích sản phẩm chuyên sâu (Product Intelligence)
* **Top 10 sản phẩm bán chạy nhất**: Xếp hạng theo **Số lượng đơn** hoặc **Tổng doanh thu**.
* **Sản phẩm bán ít nhất / Chưa bán được**: Tự động đối chiếu với danh sách khóa học thực tế để cảnh báo những khóa chưa có người mua, giúp bạn kịp thời giảm giá, gom combo hoặc đổi ảnh bìa/tiêu đề.
* **Sản phẩm được xem nhiều nhất**: Đo lường lượt xem trang chi tiết của từng khóa.
* **Sản phẩm được nhấp (click) nhiều nhất**: Theo dõi lượt bấm từ trang chủ, danh mục hoặc gợi ý tìm kiếm.
* **Ma trận cơ hội (Opportunity Matrix)**: Tự động phát hiện các khóa học có **nhiều lượt xem nhưng tỷ lệ mua thấp** và gợi ý giải pháp tăng doanh thu.
* **Doanh thu theo danh mục**: Xem nhóm ngành nào mang lại nhiều tiền nhất (Tin học, Marketing, Thiết kế, AI...).

### 3. Phễu chuyển đổi & Hành vi khách hàng (Funnel & Behavior)
* **Phễu chuyển đổi 6 bước**: `Truy cập` ➔ `Xem khóa học` ➔ `Thêm vào giỏ` ➔ `Vào thanh toán` ➔ `Đặt hàng` ➔ `Đã thanh toán (Paid)`.
* **Phân tích giỏ hàng bị bỏ quên (Cart Abandonment)**: Thống kê tỷ lệ bỏ giỏ, số tiền thất thoát ước tính và danh sách các khóa học hay bị bỏ lại trong giỏ nhất.
* **Phân tích từ khóa tìm kiếm**: 
  - Biết khách hàng đang quan tâm tìm kiếm chủ đề gì trên website.
  - **Từ khóa tìm kiếm 0 kết quả**: Gợi ý các khóa học bạn nên bổ sung vào website để đáp ứng đúng nhu cầu tìm kiếm của người dùng.
* **Độ sâu cuộn trang (Scroll Depth)**: Khách đọc đến 25%, 50%, 75% hay 100% trang.
* **Lượt bấm nút liên hệ**: Đo lường chuyển đổi qua Zalo, Số điện thoại, Facebook, Messenger.

### 4. Nguồn truy cập & Hiệu quả quảng cáo (Attribution & Campaigns)
* **Phân loại nguồn tự động**: Google (SEO), Facebook, Zalo, TikTok, YouTube, Cốc Cốc, Truy cập trực tiếp (Direct).
* **Theo dõi chiến dịch quảng cáo (UTM Tracking)**: Đo lường chính xác từng chiến dịch quảng cáo (ví dụ link gắn `?utm_source=facebook&utm_campaign=sale_tet`) mang về bao nhiêu phiên, bao nhiêu đơn hàng và doanh thu bao nhiêu.
* **Thiết bị & Trình duyệt**: Tỷ lệ Điện thoại (Mobile) vs Máy tính (Desktop), iOS vs Android, Chrome vs Safari vs Zalo App.

### 5. Giám sát thời gian thực (Real-time Live Monitor)
* Số lượng người đang online trên website (5 phút gần nhất).
* Biểu đồ lượt xem theo từng phút (30 phút gần nhất).
* **Live Feed**: Dòng thời gian hiển thị từng hành động trực tiếp của khách (Xem trang, bấm khóa học, thêm giỏ, đặt hàng, tìm kiếm...).

### 6. Gợi ý kinh doanh thông minh (Smart Insights Engine)
* Tự động tổng hợp và đưa ra các đề xuất hành động:
  - Cảnh báo biến động doanh số so với kỳ trước.
  - Khung giờ vàng nên đẩy mạnh marketing.
  - Nhắc nhở chăm sóc các đơn hàng đặt nhưng chưa thanh toán.
  - Cảnh báo tốc độ tải trang hoặc lỗi JavaScript người dùng gặp phải.

---

## 🚀 HƯỚNG DẪN 5 BƯỚC CÀI ĐẶT BACKEND (GOOGLE APPS SCRIPT)

Backend sử dụng **Google Apps Script** kết hợp với **Google Sheets**. Giải pháp này:
- Hoàn toàn miễn phí, không cần thuê máy chủ VPS.
- Lưu trữ an toàn, dễ xuất file Excel và sao lưu.
- Tách biệt độc lập với script đặt hàng hiện tại, không làm ảnh hưởng đến quy trình thanh toán.

### Bước 1: Tạo Google Sheet mới
1. Mở [Google Sheets](https://sheets.new) và tạo 1 bảng tính mới.
2. Đặt tên bảng tính là: `HihoEdu Analytics Data`.

### Bước 2: Dán mã Backend vào Apps Script
1. Trên thanh menu của Google Sheets, chọn **Tiện ích mở rộng (Extensions)** ➔ **Apps Script**.
2. Xóa hết code mặc định trong file `Mã.gs`.
3. Mở file [backend/analytics.gs](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/backend/analytics.gs) trong thư mục dự án, copy toàn bộ nội dung và dán vào Apps Script.
4. Bấm **Ctrl + S** (hoặc biểu tượng Đĩa mềm) để Lưu lại.

### Bước 3: Khởi tạo dữ liệu & Lấy mã ADMIN_KEY
1. Tại thanh công cụ phía trên màn hình Apps Script, chỗ chọn hàm cần chạy: chọn hàm **`setup`**.
2. Bấm nút **Chạy (Run)** (biểu tượng hình tam giác).
3. Google sẽ hiện hộp thoại yêu cầu cấp quyền:
   - Chọn tài khoản Google của bạn.
   - Bấm **Nâng cao (Advanced)** ➔ Chọn **Đi tới ... (không an toàn) / Go to ... (unsafe)**.
   - Bấm **Cho phép (Allow)**.
4. Sau khi hàm chạy xong, nhìn xuống khung **Nhật ký thực thi (Execution log)** ở phía dưới, bạn sẽ thấy 2 dòng:
   ```text
   ✅ Đã tạo sheet: Events
   🔑 ADMIN_KEY của bạn: a1b2c3d4e5f6g7h8
   ```
   👉 **Hãy copy lưu lại chuỗi `ADMIN_KEY` này**. Đây là mật khẩu bí mật dùng để xem trang quản trị.

### Bước 4: Triển khai Ứng dụng web (Deploy Web App)
1. Ở góc trên cùng bên phải màn hình Apps Script, bấm nút **Triển khai (Deploy)** ➔ Chọn **Tùy chọn triển khai mới (New deployment)**.
2. Bấm vào biểu tượng bánh răng ⚙️ cạnh chữ *Chọn loại* ➔ Chọn **Ứng dụng web (Web app)**.
3. Điền thông tin như sau:
   - **Mô tả (Description)**: `HihoEdu Analytics Service`
   - **Thực thi dưới dạng (Execute as)**: **Tôi (Me / email của bạn)**
   - **Người có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)** *(Bắt buộc chọn Anyone để website gửi được dữ liệu sự kiện lên)*
4. Bấm **Triển khai (Deploy)**.
5. Sao chép đường dẫn **URL ứng dụng web** (có đuôi `/exec`).
   *Ví dụ:* `https://script.google.com/macros/s/AKfycbx.../exec`

### Bước 5: Cập nhật link vào Website & Đăng nhập Dashboard

#### A. Cập nhật vào mã theo dõi của website
1. Mở file [js/tracker.js](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/js/tracker.js).
2. Tại dòng 12, thay thế chữ `DAN_LINK_WEB_APP_ANALYTICS_VAO_DAY` bằng URL Web App bạn vừa copy ở Bước 4:
   ```javascript
   var ENDPOINT = 'https://script.google.com/macros/s/AKfycbx.../exec';
   ```
3. Lưu file lại. Giờ đây mọi khách hàng vào website sẽ tự động được gửi dữ liệu thống kê lên Google Sheet!

#### B. Đăng nhập vào Giao diện Quản trị (Admin Dashboard)
1. Mở trình duyệt và truy cập vào trang quản trị:
   - Nếu chạy trên máy tính: mở file [admin/index.html](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/admin/index.html) (hoặc qua link localhost `http://localhost:8080/admin/index.html`).
   - Nếu tải lên hosting (nohiedu.com): truy cập `https://nohiedu.com/admin/`.
2. Mặc định trang sẽ hiển thị ở **Chế độ dữ liệu mẫu (Demo)** để bạn xem trước toàn bộ biểu đồ.
3. Để chuyển sang **Dữ liệu thật**:
   - Bấm vào nút **Cài đặt kết nối** (ở góc dưới bên trái thanh menu) hoặc bấm nút **Kết nối ngay** trên thanh thông báo.
   - Dán **URL Web App** vào ô *Link Web App Analytics*.
   - Dán **ADMIN_KEY** (đã lấy ở Bước 3) vào ô *ADMIN_KEY*.
   - Bấm **Kiểm tra** để hệ thống test kết nối.
   - Bấm **Lưu & kết nối**.
4. Chúc mừng bạn! Giao diện sẽ lập tức tải toàn bộ dữ liệu thực tế từ website của bạn! 🎉

---

## 🛡️ TÍNH NĂNG BẢO MẬT & TỐI ƯU

1. **Loại trừ truy cập của chính bạn**:
   - Khi bạn là chủ web vào kiểm tra website, bạn không muốn số liệu của mình làm sai lệch thống kê.
   - Trong trang Admin, bấm **Cài đặt kết nối** ➔ Bật công tắc **"Không tính lượt truy cập của tôi"**. Trình duyệt của bạn sẽ tự động bị bỏ qua khỏi mọi thống kê.
2. **Bảo mật quyền Admin**:
   - Người ngoài không thể xem được dữ liệu nếu không có `ADMIN_KEY`.
   - Nếu vô tình làm lộ key, trong Google Apps Script chỉ cần chạy hàm `resetAdminKey()` là hệ thống sẽ tự sinh key mới.
3. **Hiệu năng siêu nhẹ**:
   - File theo dõi `js/tracker.js` có dung lượng cực nhẹ (~5KB), chạy bất đồng bộ (`defer`), gom nhóm dữ liệu (batching) và sử dụng `navigator.sendBeacon` để gửi âm thầm trong nền, cam kết không làm giảm điểm Google PageSpeed Insights.

---

## 📁 DANH SÁCH FILE LIÊN QUAN TRONG DỰ ÁN

| Đường dẫn file | Mô tả |
| :--- | :--- |
| [backend/analytics.gs](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/backend/analytics.gs) | Mã nguồn xử lý dữ liệu backend trên Google Apps Script |
| [js/tracker.js](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/js/tracker.js) | Script tự động thu thập hành vi người dùng trên website |
| [admin/index.html](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/admin/index.html) | Giao diện Bảng điều khiển quản trị trực quan |
| [admin/admin.css](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/admin/admin.css) | Hệ thống phong cách Dark Mode Glassmorphism cao cấp |
| [admin/admin.js](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/admin/admin.js) | Bộ máy tính toán chỉ số, vẽ biểu đồ và phân tích dữ liệu |
| [index.html](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/index.html) | Đã nhúng tracker |
| [chi-tiet.html](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/chi-tiet.html) | Đã nhúng tracker |
| [thanh-toan.html](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/thanh-toan.html) | Đã nhúng tracker |
| [hoan-tat.html](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/hoan-tat.html) | Đã nhúng tracker |
| [gioi-thieu.html](file:///c:/Users/tktu2/OneDrive/Desktop/Oneedu/gioi-thieu.html) | Đã nhúng tracker |
