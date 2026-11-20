-- ============================================================================
-- TRILINGUO / NYOB ZOO — SUPABASE POSTGRESQL 24/7 MASTER SETUP SCRIPT
-- File: supabase_setup.sql
--
-- Hướng dẫn sử dụng (Tùy chọn):
--   Cách 1 (Tự động 100%): Chỉ cần dán chuỗi kết nối DATABASE_URL của Supabase
--          vào file .env (hoặc Vercel Environment Variables). Khi Backend khởi
--          động, file `backend/setup_database.py` sẽ TỰ ĐỘNG tạo toàn bộ 6 bảng
--          và nạp dữ liệu mẫu lên Supabase mà không cần chạy SQL thủ công!
--   Cách 2 (Chạy trong Supabase SQL Editor): Copy toàn bộ nội dung file này
--          dán vào mục "SQL Editor" trên trang quản trị Supabase và bấm "Run".
-- ============================================================================

BEGIN;

-- 1. BẢNG USERS (Tài khoản Người học, Admin & Super Admin cố định)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(40) UNIQUE,
    password_hash VARCHAR(255),
    avatar_url VARCHAR(512),
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
    provider_user_id VARCHAR(255),
    native_lang VARCHAR(10) NOT NULL DEFAULT 'vi',
    target_lang VARCHAR(10) NOT NULL DEFAULT 'hmn',
    role VARCHAR(30) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    accepted_terms BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS ix_users_phone ON public.users (phone);
CREATE INDEX IF NOT EXISTS ix_users_role ON public.users (role);

-- 2. BẢNG LEARNING_BLOCKS (Khối ngôn ngữ học tập: vi_hmn, hmn_vi, en_hmn, hmn_en, vi_en, en_vi)
CREATE TABLE IF NOT EXISTS public.learning_blocks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    block_key VARCHAR(30) NOT NULL,
    native_lang VARCHAR(10) NOT NULL,
    target_lang VARCHAR(10) NOT NULL,
    total_quiz_questions INTEGER NOT NULL DEFAULT 0,
    total_quiz_correct INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_learning_block UNIQUE (user_id, block_key)
);

CREATE INDEX IF NOT EXISTS ix_learning_blocks_user_id ON public.learning_blocks (user_id);
CREATE INDEX IF NOT EXISTS ix_learning_blocks_block_key ON public.learning_blocks (block_key);

-- 3. BẢNG TRANSLATION_HISTORY (Nhật ký dịch thuật 3 chiều theo từng Khối ngôn ngữ)
CREATE TABLE IF NOT EXISTS public.translation_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    block_key VARCHAR(30) NOT NULL,
    source_lang VARCHAR(10) NOT NULL,
    target_lang VARCHAR(10) NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    hmn_text TEXT,
    vi_text TEXT,
    en_text TEXT,
    phonetic VARCHAR(255),
    pos_code VARCHAR(60),
    grammar_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_translation_history_user_id ON public.translation_history (user_id);
CREATE INDEX IF NOT EXISTS ix_translation_history_block_key ON public.translation_history (block_key);

-- 4. BẢNG PERSONAL_NOTEBOOK (Sổ tay cá nhân, Flashcard 3D & Theo dõi Mastered Quiz)
CREATE TABLE IF NOT EXISTS public.personal_notebook (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    block_key VARCHAR(30) NOT NULL,
    source_text TEXT NOT NULL,
    target_text TEXT NOT NULL,
    hmn_text TEXT,
    vi_text TEXT,
    en_text TEXT,
    phonetic VARCHAR(255),
    pos_code VARCHAR(60),
    example_sentence TEXT,
    quiz_attempts INTEGER NOT NULL DEFAULT 0,
    quiz_correct INTEGER NOT NULL DEFAULT 0,
    remembered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_personal_notebook_user_id ON public.personal_notebook (user_id);
CREATE INDEX IF NOT EXISTS ix_personal_notebook_block_key ON public.personal_notebook (block_key);

-- 5. BẢNG CORPUS_ENTRIES (Kho Tri thức Hệ thống học từ Đóng góp Người học & Tài liệu Admin)
CREATE TABLE IF NOT EXISTS public.corpus_entries (
    id SERIAL PRIMARY KEY,
    hmn_text TEXT NOT NULL,
    vi_text TEXT,
    en_text TEXT,
    phonetic VARCHAR(255),
    pos_code VARCHAR(60) DEFAULT '(nth) nthe',
    note TEXT,
    source_type VARCHAR(40) NOT NULL DEFAULT 'user_contribution',
    source_name VARCHAR(255),
    contributor_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    revision_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_corpus_entries_source_type ON public.corpus_entries (source_type);

-- 6. BẢNG CORPUS_DOCUMENT_LOGS (Lịch sử Admin nạp File Word .docx/.doc, .pdf, .csv, .txt)
CREATE TABLE IF NOT EXISTS public.corpus_document_logs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_format VARCHAR(30) NOT NULL DEFAULT 'txt',
    total_lines INTEGER NOT NULL DEFAULT 0,
    learned_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    uploaded_by_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- KHỞI TẠO TÀI KHOẢN SUPER ADMIN CỐ ĐỊNH & TÀI KHOẢN MẪU
-- ============================================================================
INSERT INTO public.users (account_name, email, phone, auth_provider, native_lang, target_lang, role, is_active, accepted_terms, is_verified)
VALUES
    ('Poh Eternal (Super Admin)', 'poheternal@gmail.com', '0901234567', 'email', 'vi', 'hmn', 'super_admin', TRUE, TRUE, TRUE),
    ('Giàng A Páo (Tả Van)', 'giangapao.tavan@gmail.com', '0987654321', 'email', 'hmn', 'en', 'admin', TRUE, TRUE, TRUE),
    ('Nguyễn Minh Anh', 'minhanh.trekking@gmail.com', '0912345678', 'email', 'vi', 'hmn', 'user', TRUE, TRUE, TRUE),
    ('Sùng Thị Mai (Homestay)', 'sungthimai.sapa@gmail.com', '0934567890', 'email', 'hmn', 'vi', 'user', TRUE, TRUE, TRUE),
    ('Liam Henderson', 'liam.henderson.uk@gmail.com', '0978112233', 'email', 'en', 'hmn', 'user', TRUE, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE
SET
    role = CASE WHEN EXCLUDED.email = 'poheternal@gmail.com' THEN 'super_admin' ELSE public.users.role END,
    is_active = CASE WHEN EXCLUDED.email = 'poheternal@gmail.com' THEN TRUE ELSE public.users.is_active END;

-- ============================================================================
-- KHỞI TẠO DỮ LIỆU KHO TRI THỨC MẪU (CORPUS_ENTRIES)
-- ============================================================================
INSERT INTO public.corpus_entries (hmn_text, vi_text, en_text, phonetic, pos_code, note, source_type, source_name, revision_count)
SELECT * FROM (VALUES
    ('Zoo siab txais tos koj tuaj Tả Van', 'Chào mừng bạn đến thăm bản Tả Van', 'Welcome to Ta Van village', 'zhong shia tsai taw kaw toua Tả Van', '(nth) nthe', 'Câu chào đón khách du lịch cộng đồng tại bản Tả Van', 'user_contribution', 'Giàng A Páo (Tả Van)', 1),
    ('Kuv tsev neeg ua homestay nyob ze tus dej', 'Gia đình tôi làm homestay ở gần bờ suối', 'My family runs a homestay near the stream', 'koo cheh neng oua homestay nyaw zeh too day', '(nth) nthe', 'Giới thiệu vị trí homestay cho du khách', 'user_contribution', 'Sùng Thị Mai (Homestay)', 1),
    ('Cov paj ntaub Hmoob no xaws los ntawm tes', 'Những tấm thổ cẩm người Mông này được thêu hoàn toàn bằng tay', 'These Hmong brocade textiles are completely handmade', 'chaw pa ndao Hmoob naw ser law ndaw teh', '(nth) nthe', 'Giới thiệu nghề thêu thổ cẩm truyền thống', 'admin_document', 'giao_trinh_du_lich_ta_van_2026.docx', 1),
    ('Hnub no huab cua txias thiab cua tshuab zoo', 'Hôm nay thời tiết mát mẻ và gió thổi rất dễ chịu', 'Today the weather is cool with a pleasant breeze', 'hnoo naw houa choua tsia thia choua tshoua zhong', '(nth) nthe', 'Giao tiếp hàng ngày về thời tiết vùng cao', 'admin_document', 'tu_dien_giao_tiep_hmong_viet_anh.pdf', 1),
    ('Thov koj qhia kuv hais lo lus Hmoob no', 'Xin bạn hãy dạy tôi cách phát âm từ tiếng Mông này', 'Please teach me how to pronounce this Hmong word', 'thaw kaw khia koo hai law loo Hmoob naw', '(nth) nthe', 'Mẫu câu dành cho người học tiếng Mông', 'user_contribution', 'Nguyễn Minh Anh', 1)
) AS seed(hmn_text, vi_text, en_text, phonetic, pos_code, note, source_type, source_name, revision_count)
WHERE NOT EXISTS (SELECT 1 FROM public.corpus_entries LIMIT 1);

COMMIT;
