# 🌿 NYOB ZOO · Trilinguo — Hệ Thống Dịch Thuật & Học Ngôn Ngữ 3 Chiều (Anh – Việt/Kinh – Hmong)

**NYOB ZOO · Trilinguo** là nền tảng web dịch thuật 3 chiều và học ngôn ngữ tương tác hỗ trợ kết nối giao tiếp du lịch, văn hóa bản làng giữa ba ngôn ngữ: **Tiếng Anh (`EN`) ↔ Tiếng Việt/Kinh (`VI`) ↔ Tiếng Hmong RPA (`HMN`)**.

---

## ✨ Tính Năng Nổi Bật

1. **Dịch Thuật 3 Chiều & Phát Âm (`EN ↔ VI ↔ HMN`)**
   - Dịch thuật hai chiều giữa bất kỳ cặp ngôn ngữ nào trong 3 ngôn ngữ Anh – Kinh – Hmong dựa trên hệ thống từ vựng, ngữ pháp tiếng Hmong chuẩn RPA.
   - Hỗ trợ nghe phát âm trực tiếp (Text-to-Speech) và hiển thị phiên âm kèm ghi chú ngữ pháp.
2. **Giao Diện Đa Ngôn Ngữ (`i18n`) & Chế Độ Sáng / Tối (`Light / Dark Mode`)**
   - Chuyển đổi tức thì ngôn ngữ hiển thị toàn bộ giao diện sang **Tiếng Hmong (`HMN`)**, **Tiếng Việt (`VI`)**, hoặc **Tiếng Anh (`EN`)**.
   - Tự động đồng bộ ngôn ngữ giao diện theo mục **"Tôi là" (`native_lang`)** của người học.
   - Hỗ trợ giao diện Sáng/Tối mượt mà và Responsive 100% trên cả Desktop và Mobile (Burger Menu).
3. **Tra Từ Thông Minh Bằng Thao Tác Bôi Đen (`Smart Text Selection Popover`)**
   - Bôi đen bất kỳ từ, cụm từ hoặc câu nào trong **Nhật ký dịch thuật** hoặc **Mẫu câu thông dụng** (trên máy tính hoặc chạm giữ trên điện thoại) để mở ngay Popover tra cứu từ loại (`POS`), phiên âm, nghĩa 3 thứ tiếng và lưu vào **Sổ tay cá nhân** chỉ với 1 chạm.
4. **Mẫu Câu Giao Tiếp Du Lịch & Bản Làng (`Commonly Used Phrases`)**
   - Hệ thống mẫu câu thực tế chia theo 7 chủ đề: *Chào hỏi & Làm quen*, *Hỏi đường & Trekking*, *Mua bán & Thổ cẩm*, *Lưu trú Homestay*, *Ẩm thực & Ăn uống*, *Y tế & Khẩn cấp*, *Văn hóa & Bản làng*.
5. **Sổ Tay Cá Nhân, Flashcard 3D (`>= 4 từ`) & Quizzes (`>= 10 từ`)**
   - Quản lý danh sách từ vựng cá nhân theo từng khối ngôn ngữ, đánh dấu đã nhớ/chưa nhớ.
   - Học qua thẻ lật **3D Flashcard** (yêu cầu chọn tối thiểu **4 từ**).
   - Kiểm tra trắc nghiệm **Quizzes** (yêu cầu chọn tối thiểu **10 từ**) và tự động cập nhật tiến trình học tập vào cơ sở dữ liệu.
6. **Quản Lý Theo Khối Ngôn Ngữ (`Language Learning Blocks`) & 3 Chỉ Số Thời Gian Thực**
   - Mỗi người dùng có thể học nhiều khối ngôn ngữ độc lập (ví dụ: `Kinh → Hmong`, `Hmong → Anh`, `Việt → Anh`...) mà không bị trộn lẫn lịch sử dịch, sổ tay hay điểm số.
   - Dashboard Hồ sơ cá nhân tính toán tự động 3 chỉ số theo thời gian thực:
     - **Số lượng từ trong Sổ tay**: Tổng số từ/cụm từ hiện có trong khối ngôn ngữ đang chọn.
     - **Số từ đã thành thạo (`Mastered`)**: Số từ thỏa mãn đồng thời 2 điều kiện: đã làm Quiz tối thiểu 10 lần (`quiz_attempts >= 10`) **VÀ** tỉ lệ trả lời đúng đạt trên 80% (`quiz_correct / quiz_attempts > 0.80`).
     - **Độ chính xác Quiz (`Quiz Accuracy`)**: `(Tổng số câu quiz trả lời đúng / Tổng số câu quiz đã làm) × 100%`.
7. **Xác Thực Người Dùng Thực Tế (`Real Production Authentication`)**
   - Đăng nhập / Đăng ký qua **Google OAuth2**, **Facebook Graph API**, hoặc **Mã OTP 6 chữ số** gửi thật qua **Gmail SMTP (`smtp.gmail.com:587`)** / **SMS Gateway** (hiệu lực 5 phút).
   - Hỗ trợ luồng **Quên mật khẩu (`Forgot Password`)** xác thực bằng mã OTP trước khi đặt lại mật khẩu mới.
   - Bắt buộc thiết lập hồ sơ học tập (**"Tôi là"** / **"Tôi muốn học"**) và tích chọn đồng ý **Điều khoản dịch vụ & Quyền riêng tư** trong lần đầu đăng ký.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
WEBSITE/
├── backend/                     # Python FastAPI Production Backend
│   ├── main.py                  # Entrypoint FastAPI, CORS, Session & Static Frontend Mount
│   ├── config.py                # Quản lý biến môi trường (.env)
│   ├── database.py              # Kết nối PostgreSQL / Supabase (hoặc SQLite fallback)
│   ├── models.py                # SQLAlchemy ORM Models (User, LearningBlock, History, Notebook, OTP)
│   ├── schemas.py               # Pydantic Validation Schemas
│   ├── dependencies.py          # JWT Authentication Middleware (get_current_user)
│   ├── requirements.txt         # Danh sách thư viện Python
│   ├── .env.example             # File mẫu cấu hình biến môi trường
│   ├── services/
│   │   ├── oauth_service.py     # Xác thực Google OAuth2 & Facebook Graph API
│   │   ├── otp_service.py       # Gửi OTP 6 số qua Gmail SMTP (aiosmtplib) & SMS/Zalo
│   │   └── translator.py        # Engine dịch thuật 3 chiều Anh - Việt - Hmong
│   └── routers/
│       ├── auth.py              # API Đăng nhập, Đăng ký, OAuth, OTP, Quên mật khẩu
│       ├── translate.py         # API Dịch thuật & Nhật ký dịch thuật
│       ├── phrases.py           # API Mẫu câu giao tiếp thông dụng
│       ├── notebook.py          # API Sổ tay cá nhân, tạo Flashcard (>=4) & Quiz (>=10)
│       └── profile.py           # API Hồ sơ cá nhân & Dashboard Tiến trình học tập
│
└── frontend/                    # Giao diện người dùng (HTML5 / CSS3 / Vanilla JS Modular)
    ├── index.html               # Trang chủ Dịch thuật 3 chiều & Nhật ký dịch thuật
    ├── phrase.html              # Trang Mẫu câu thông dụng (Commonly Used Phrases)
    ├── vocabulary.html          # Trang Sổ tay cá nhân & Tạo Flashcard / Quiz
    ├── quiz.html                # Trang Bài kiểm tra trắc nghiệm (Quizzes)
    ├── profile.html             # Trang Thông tin tài khoản & Tiến trình học tập
    ├── js/
    │   └── api.js               # Client kết nối REST API & quản lý JWT Bearer Token
    └── assets/
        ├── css/style.css        # Hệ thống giao diện, Z-Index Layering, Dark Mode & Responsive
        ├── fonts/               # Bộ font chữ Open Sauce Sans / One / Two & Serif
        ├── images/              # Logo, Mascot 3D & các thành phần đồ họa nền (Elements)
        └── js/
            ├── hmongData.js     # Kho từ điển & ngữ pháp tiếng Hmong RPA
            ├── i18n.js          # Bộ từ điển giao diện 3 ngôn ngữ (HMN / VI / EN)
            └── app.js           # Logic điều khiển UI, Popover bôi đen, Modal Auth, TTS, Quiz
```

---

## 🛠️ Yêu Cầu Hệ Thống (Prerequisites)

- **Python**: Phiên bản `3.10` trở lên (khuyến nghị `Python 3.11+`).
- **Cơ sở dữ liệu**:
  - Mặc định hệ thống tự động sử dụng **SQLite (`trilinguo_production.db`)** ngay khi khởi chạy mà không cần cài đặt thêm phần mềm quản trị CSDL.
  - Có thể chuyển sang **PostgreSQL / Supabase** bất cứ lúc nào bằng cách thay đổi biến `DATABASE_URL` trong file `.env`.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Bước 1: Di chuyển vào thư mục `backend`

```bash
cd WEBSITE/backend
```

### Bước 2: Tạo và kích hoạt môi trường ảo (`venv`)

- **Trên Windows (PowerShell):**
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **Trên Windows (CMD):**
  ```cmd
  python -m venv venv
  venv\Scripts\activate.bat
  ```
- **Trên macOS / Linux:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### Bước 3: Cài đặt các thư viện cần thiết

```bash
pip install -r requirements.txt
```

### Bước 4: Cấu hình biến môi trường (`.env`)

Sao chép file `.env.example` thành `.env` trong thư mục `WEBSITE/backend`:

- **Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **macOS / Linux:**
  ```bash
  cp .env.example .env
  ```

Mở file `WEBSITE/backend/.env` và cập nhật các thông số (tùy chọn):

```env
# Bảo mật JWT
JWT_SECRET_KEY=thay_bang_chuoi_bi_mat_ngau_nhien_cua_ban

# Cơ sở dữ liệu (Mặc định dùng SQLite; đổi sang postgresql://... nếu dùng Supabase/PostgreSQL)
DATABASE_URL=sqlite:///./trilinguo_production.db

# Cấu hình Gmail SMTP để gửi mã OTP 6 số thật về email người dùng
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email_cua_ban@gmail.com
SMTP_PASSWORD=mat_khau_ung_dung_16_ky_tu_google
SMTP_FROM_NAME=NYOB ZOO - Trilinguo

# Cấu hình Google OAuth2 & Facebook Graph API (nếu sử dụng OAuth Redirect)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

> 💡 **Lưu ý khi chạy thử ở môi trường Local (Chưa điền `SMTP_USER` / `SMTP_PASSWORD`):**
> Nếu bạn để trống `SMTP_USER` và `SMTP_PASSWORD`, hệ thống **vẫn tạo mã OTP 6 số thực tế có thời hạn 5 phút trong Database** và trả mã OTP trực tiếp về thông báo trên giao diện để bạn có thể đăng ký, đăng nhập và đặt lại mật khẩu ngay lập tức. Khi muốn gửi email thật tới hộp thư Gmail của người dùng, chỉ cần bật **Xác minh 2 bước (2-Step Verification)** trong tài khoản Google, tạo **Mật khẩu ứng dụng (App Password)** 16 ký tự và điền vào `SMTP_PASSWORD`.

### Bước 5: Khởi chạy Server (Tích hợp cả Backend API + Frontend)

Chạy lệnh sau tại thư mục `WEBSITE/backend`:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

*(Hoặc trên Windows nếu không kích hoạt `venv` trước đó: `.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`)*

### Bước 6: Truy cập Ứng dụng trên Trình duyệt

Sau khi terminal báo `Application startup complete`, mở trình duyệt tại:

- 🌐 **Giao diện Website chính thức**: [http://localhost:8000](http://localhost:8000)
- 📘 **Tài liệu API tương tác (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🩺 **Kiểm tra trạng thái Server (Health Check)**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🔌 Tổng Hợp Các Endpoint API Chính

| Phân hệ | Phương thức & Đường dẫn | Mô tả chức năng | Yêu cầu JWT |
| :--- | :--- | :--- | :---: |
| **Hệ thống** | `GET /api/health` | Kiểm tra trạng thái hoạt động của Backend & cấu hình OAuth/SMTP | Không |
| **Xác thực** | `POST /api/auth/otp/send` | Tạo mã OTP 6 số (TTL 5 phút) & gửi qua Gmail SMTP hoặc SMS | Không |
| **Xác thực** | `POST /api/auth/otp/verify` | Xác thực OTP, kiểm tra điều khoản, lưu khối ngôn ngữ & cấp JWT | Không |
| **Xác thực** | `POST /api/auth/login/password` | Đăng nhập bằng Email/SĐT và mật khẩu | Không |
| **Xác thực** | `POST /api/auth/forgot-password/reset` | Xác thực OTP khôi phục mật khẩu & cập nhật mật khẩu mới | Không |
| **Xác thực** | `GET /api/auth/google/login` | Khởi tạo luồng đăng nhập thực tế với Google OAuth2 | Không |
| **Xác thực** | `GET /api/auth/facebook/login` | Khởi tạo luồng đăng nhập thực tế với Facebook Graph API | Không |
| **Xác thực** | `GET /api/auth/me` | Lấy thông tin người dùng hiện tại từ JWT Token | **Có** |
| **Dịch thuật** | `POST /api/translate` | Dịch thuật 3 chiều (`EN ↔ VI ↔ HMN`) & tự động lưu lịch sử | Tùy chọn |
| **Dịch thuật** | `POST /api/translate/lookup` | Tra cứu từ/cụm từ khi bôi đen văn bản (Smart Popover) | Không |
| **Dịch thuật** | `GET /api/translate/history` | Lấy danh sách Nhật ký dịch thuật theo Khối ngôn ngữ đang học | **Có** |
| **Mẫu câu** | `GET /api/phrases` | Lấy danh sách mẫu câu giao tiếp du lịch theo chủ đề / từ khóa | Không |
| **Sổ tay** | `GET /api/notebook` | Lấy danh sách từ vựng trong Sổ tay cá nhân của khối hiện tại | **Có** |
| **Sổ tay** | `POST /api/notebook` | Lưu từ/cụm từ/câu mới vào Sổ tay cá nhân | **Có** |
| **Sổ tay** | `POST /api/notebook/flashcards` | Tạo bộ thẻ lật 3D Flashcard (kiểm tra chọn tối thiểu `>= 4` từ) | **Có** |
| **Sổ tay** | `POST /api/notebook/quiz/generate` | Tạo đề kiểm tra trắc nghiệm Quiz (kiểm tra chọn tối thiểu `>= 10` từ) | **Có** |
| **Sổ tay** | `POST /api/notebook/quiz/submit` | Nộp bài Quiz & cập nhật điểm số, tiến trình học tập thời gian thực | **Có** |
| **Hồ sơ** | `GET /api/profile` | Lấy thông tin tài khoản, danh sách các khối & 3 chỉ số tiến trình | **Có** |
| **Hồ sơ** | `PUT /api/profile` | Cập nhật hồ sơ cá nhân & chuyển đổi Khối ngôn ngữ học tập | **Có** |

---

## 📦 Lưu Ý Khi Commit Lên Git (`.gitignore`)

Trước khi `git add .` và `git commit`, hãy đảm bảo file `.gitignore` chỉ loại trừ thư mục môi trường ảo (`venv/`), cache Python (`__pycache__/`), file cơ sở dữ liệu local (`*.db`) và file chứa mật khẩu thật (`.env`), đồng thời **giữ lại** `.env.example` và các file `__init__.py` để người khác tải repo về có thể chạy được ngay:

```gitignore
# Python cache & virtual environment
__pycache__/
*.py[cod]
venv/
backend/venv/

# Environment secrets & local SQLite database
.env
backend/.env
*.db
*.sqlite3
```
