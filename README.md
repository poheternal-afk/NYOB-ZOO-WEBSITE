# 🌿 NYOB ZOO · Trilinguo — Hệ Thống Dịch Thuật & Học Ngôn Ngữ 3 Chiều (Anh – Việt/Kinh – Hmong)

**NYOB ZOO · Trilinguo** là nền tảng web dịch thuật 3 chiều và học ngôn ngữ tương tác hỗ trợ kết nối giao tiếp du lịch, văn hóa bản làng giữa ba ngôn ngữ: **Tiếng Anh (`EN`) ↔ Tiếng Việt/Kinh (`VI`) ↔ Tiếng Hmong RPA (`HMN`)**, tích hợp **Hệ thống Quản trị viên (RBAC & Admin Portal)**.

---

## ✨ Tính Năng Nổi Bật

1. **Dịch Thuật 3 Chiều & Phát Âm (`EN ↔ VI ↔ HMN`)**
   - Dịch thuật hai chiều giữa bất kỳ cặp ngôn ngữ nào trong 3 ngôn ngữ Anh – Kinh – Hmong chuẩn RPA.
   - Hỗ trợ nghe phát âm trực tiếp (Text-to-Speech) và hiển thị phiên âm kèm ghi chú ngữ pháp.
2. **Giao Diện Đa Ngôn Ngữ (`i18n`) & Chế Độ Sáng / Tối (`Light / Dark Mode`)**
   - Chuyển đổi tức thì ngôn ngữ hiển thị toàn bộ giao diện sang **Tiếng Hmong (`HMN`)**, **Tiếng Việt (`VI`)**, hoặc **Tiếng Anh (`EN`)**.
   - Hỗ trợ giao diện Sáng/Tối mượt mà và Responsive 100% trên cả Desktop và Mobile (Burger Menu).
3. **Tra Từ Thông Minh Bằng Thao Tác Bôi Đen (`Smart Text Selection Popover`)**
   - Bôi đen bất kỳ từ, cụm từ hoặc câu nào trong **Nhật ký dịch thuật** hoặc **Mẫu câu thông dụng** để mở ngay Popover tra cứu từ loại (`POS`), phiên âm, nghĩa 3 thứ tiếng và lưu vào **Sổ tay cá nhân**.
4. **Mẫu Câu Giao Tiếp Du Lịch & Bản Làng (`Commonly Used Phrases`)**
   - Hệ thống mẫu câu thực tế chia theo 7 chủ đề: *Chào hỏi & Làm quen*, *Hỏi đường & Trekking*, *Mua bán & Thổ cẩm*, *Lưu trú Homestay*, *Ẩm thực & Ăn uống*, *Y tế & Khẩn cấp*, *Văn hóa & Bản làng*.
5. **Sổ Tay Cá Nhân, Flashcard 3D (`>= 4 từ`) & Quizzes (`>= 10 từ`)**
   - Quản lý danh sách từ vựng cá nhân theo từng khối ngôn ngữ, đánh dấu đã nhớ/chưa nhớ.
   - Học qua thẻ lật **3D Flashcard** (tối thiểu **4 từ**) và kiểm tra trắc nghiệm **Quizzes** (tối thiểu **10 từ**).
6. **Quản Lý Theo Khối Ngôn Ngữ (`Language Learning Blocks`) & 3 Chỉ Số Thời Gian Thực**
   - Mỗi người dùng có thể học nhiều khối ngôn ngữ độc lập (`Kinh → Hmong`, `Hmong → Anh`, `Việt → Anh`...).
   - Tự động tính toán 3 chỉ số: **Số lượng từ trong Sổ tay**, **Số từ đã thành thạo (`Mastered`)**, và **Độ chính xác Quiz (`Quiz Accuracy`)**.
7. **Phân Quyền Quản Trị Viên (`RBAC`) & Admin Portal**
   - Tự động nhận diện tài khoản Quản trị viên (`admin` / `super_admin`, mặc định tối cao cho `poheternal@gmail.com`) và chuyển sang giao diện **Admin Portal** toàn màn hình với 4 phân khu: *Tổng quan (Dashboard)*, *Quản lý Người dùng & Phân quyền*, *Tiến độ Học tập*, và *Hồ sơ Admin*.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
WEBSITE/
├── api/
│   └── index.py                 # Entrypoint Serverless cho Vercel Full-Stack Deployment
├── vercel.json                  # Cấu hình định tuyến Full-Stack trên Vercel
├── requirements.txt             # Thư viện Python cho Vercel Serverless
├── backend/                     # Python FastAPI Production Backend
│   ├── main.py                  # Entrypoint FastAPI, CORS, RBAC Migration & Static Mount
│   ├── config.py                # Quản lý biến môi trường (.env)
│   ├── database.py              # Kết nối 24/7 Cloud PostgreSQL (Supabase/Neon) hoặc SQLite
│   ├── models.py                # SQLAlchemy ORM Models (User, LearningBlock, History, Notebook)
│   ├── schemas.py               # Pydantic Validation Schemas
│   ├── dependencies.py          # JWT Authentication & RBAC Middleware (get_current_user, get_current_admin)
│   ├── requirements.txt         # Danh sách thư viện Python gọn nhẹ
│   ├── .env.example             # File mẫu cấu hình biến môi trường
│   ├── services/
│   │   └── translator.py        # Engine dịch thuật 3 chiều Anh - Việt - Hmong
│   └── routers/
│       ├── auth.py              # API Đăng nhập trực tiếp & Thiết lập Khối ngôn ngữ
│       ├── admin.py             # API Quản trị viên (Dashboard Stats, Users, Roles, Progress)
│       ├── translate.py         # API Dịch thuật & Nhật ký dịch thuật
│       ├── phrases.py           # API Mẫu câu giao tiếp thông dụng
│       ├── notebook.py          # API Sổ tay cá nhân, tạo Flashcard (>=4) & Quiz (>=10)
│       ├── profile.py           # API Hồ sơ cá nhân & Dashboard Tiến trình học tập
│       └── system_logs.py       # API Ghi log & Inspector
│
└── frontend/                    # Giao diện người dùng (HTML5 / CSS3 / Vanilla JS Modular)
    ├── index.html               # Trang chủ Dịch thuật 3 chiều & Nhật ký dịch thuật
    ├── phrase.html              # Trang Mẫu câu thông dụng (Commonly Used Phrases)
    ├── vocabulary.html          # Trang Sổ tay cá nhân & Tạo Flashcard / Quiz
    ├── quiz.html                # Trang Bài kiểm tra trắc nghiệm (Quizzes)
    ├── profile.html             # Trang Thông tin tài khoản & Tiến trình học tập
    ├── js/
    │   ├── api.js               # Client kết nối REST API, quản lý JWT & Fallback LocalStorage
    │   ├── adminPortal.js       # Giao diện Quản trị viên (Admin Portal & Analytics Dashboard)
    │   └── devInspector.js      # Công cụ kiểm tra mã chức năng & Component ID (Alt + I)
    └── assets/
        ├── css/style.css        # Hệ thống giao diện, Z-Index Layering, Dark Mode & Responsive
        ├── fonts/               # Bộ font chữ của dự án
        ├── images/              # Logo, Mascot 3D & các thành phần đồ họa nền (Elements)
        └── js/
            ├── hmongData.js     # Kho từ điển & ngữ pháp tiếng Hmong RPA
            ├── i18n.js          # Bộ từ điển giao diện 3 ngôn ngữ (HMN / VI / EN)
            └── app.js           # Logic điều khiển UI, Popover bôi đen, Modal Auth, TTS, Quiz
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Cấu hình biến môi trường (`WEBSITE/backend/.env`)

Sao chép file `.env.example` thành `.env` trong thư mục `WEBSITE/backend`:

```env
APP_NAME="Trilinguo NYOB ZOO API"
APP_ENV="production"
DATABASE_URL="postgresql://..."
JWT_SECRET_KEY="thay_bang_chuoi_bi_mat_ngau_nhien_cua_ban"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### 2. Khởi chạy Server

```bash
cd WEBSITE/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
