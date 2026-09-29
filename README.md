# CSDL-Relational-Algebra-Helper

Ứng dụng hỗ trợ học tập, thực hành, giải bài tập và kiểm thử **Đại số quan hệ (Relational Algebra)** trực quan kết hợp cơ sở dữ liệu **SQLite in-memory (WebAssembly)** và trợ giảng **Google Gemini AI**. 

Chạy **100% Local-first** trên trình duyệt, không cần cài đặt máy chủ database backend!

---

## 🌟 Điểm nổi bật (Key Features)

### 1. Soạn thảo & Xem trước Công thức Toán học (KaTeX Live Preview)
- Hỗ trợ đầy đủ các phép toán ĐSQH: Chọn ($\sigma$), Chiếu ($\pi$), Kết nối tự nhiên ($\bowtie$, $*$), Kết nối có điều kiện ($\bowtie_{[\theta]}$), Chia quan hệ ($\div$), Hợp ($\cup$), Giao ($\cap$), Trừ ($-$), Đổi tên ($\rho$).
- Xem trước công thức toán học đẹp mắt theo chuẩn giáo trình đại học theo thời gian thực.
- Xử lý mượt mà các dấu gạch dưới trong tên bảng/cột (`BAN_SAO_SACH`, `nam_XB`...) mà không bị lỗi chỉ số dưới.

### 2. In-Memory RDBMS SQLite (sql.js / WebAssembly)
- Biên dịch câu lệnh ĐSQH thành câu lệnh SQL tương đương và thực thi trực tiếp ngay trên RAM trình duyệt.
- Hỗ trợ nạp dữ liệu từ tệp **Excel (.xlsx, .xls)**: mỗi Sheet tương ứng một bảng quan hệ.
- Tự động tạo bảng, nạp dữ liệu mẫu và hiển thị kết quả truy vấn dạng bảng trực quan.

### 3. Hệ thống Không gian làm việc Lưu trữ Bền vững (Persistent Workspaces)
- Lưu trữ toàn bộ Lược đồ Schema, Dữ liệu bảng SQLite, 20 câu hỏi bài tập và biểu thức đang soạn thảo vào `localStorage` của trình duyệt.
- Đóng gói và **Xuất/Nhập tệp `.csdl`** để lưu trữ hoặc nộp bài.
- Cho phép **Tạo mới**, **Nhân bản (Fork)** và **Quản lý** nhiều đề bài/CSDL khác nhau một cách độc lập.

### 4. Tích hợp sẵn CSDL Thư Viện 9 Quan hệ & 20 Bài tập
- **9 Quan hệ chuẩn**:
  - `TU_KHOA (MaTK, tukhoa)`
  - `TAC_GIA (MTG, hotenTG)`
  - `NHA_XB (MNXB, ten, diachi)`
  - `SACH (MS, tua, theloai)`
  - `DOC_GIA (MDG, hotenDG, namsinh, ngaythamgia, loaidg)`
  - `BAN_SAO_SACH (Maso, ngaynhap, nam_XB, #MS, #MNXB)`
  - `TU_KHOA_SACH (#MaTK, #MS)`
  - `VIET_SACH (#MS, #MTG)`
  - `MUON_SACH (#MDG, #Maso, ngaymuon, hantra, ngaytra)`
- **20 Câu hỏi bài tập thực hành**: từ chọn/chiếu đơn giản, kết nối nhiều bảng, gom nhóm, kiểm tra chia quan hệ (phép chia $\div$), đến các câu truy vấn phức tạp.

### 5. Trợ giảng AI Thông minh (Google Gemini)
- **Tự động dịch ĐSQH sang SQL**: Hỗ trợ xử lý cả các câu truy vấn kết nối lồng subquery phức tạp.
- **Hướng dẫn giải từng bước (Step-by-step guidance)**: Giúp sinh viên hiểu bản chất từng phép toán đại số quan hệ cần áp dụng.
- **Tự động sinh Mock Data**: Tự phân tích lược đồ Schema và tạo câu lệnh `INSERT` dữ liệu thực tế.
- **Đối chiếu & Chấm điểm**: Tự động so sánh kết quả thực thi của sinh viên với đáp án chuẩn và chỉ ra điểm cần sửa.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide Icons + Canvas Confetti
- **Toán học:** KaTeX
- **Database:** SQLite WebAssembly (`sql.js`)
- **Đọc bảng tính:** SheetJS (`xlsx`)
- **AI Trợ giảng:** Google Gemini API (`@google/genai`)

---

## 🚀 Cài đặt & Khởi chạy (Getting Started)

### Yêu cầu môi trường
- [Node.js](https://nodejs.org/) phiên bản 18 trở lên
- npm hoặc yarn / pnpm

### Các bước cài đặt:

1. **Clone repository:**
   ```bash
   git clone https://github.com/triet335/CSDL-Relational-Algebra-Helper.git
   cd CSDL-Relational-Algebra-Helper
   ```

2. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   ```

3. **Khởi chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại: `http://localhost:5173`

4. **Đóng gói phiên bản Production:**
   ```bash
   npm run build
   ```

---

## 🔑 Cấu hình Gemini API Key (Tùy chọn)

Để sử dụng tính năng **Trợ giảng AI**, bạn có thể lấy API Key miễn phí từ [Google AI Studio](https://aistudio.google.com/):
- Bấm vào nút **"Cài API Key"** trên thanh Header của ứng dụng.
- Dán API Key vào ô nhập và bấm **"Lưu API Key"**.
- API Key được lưu an toàn trong `localStorage` của trình duyệt của bạn và chỉ gửi trực tiếp đến API Google.
*(Nếu không có API Key, hệ thống vẫn hỗ trợ các phép toán ĐSQH cơ bản qua bộ biên dịch nội bộ Offline).*

---

## 📄 Bản quyền (License)

Dự án được phát hành dưới giấy phép [MIT License](LICENSE).
