/**
 * ============================================================================
 * TRILINGUO / NYOB ZOO — 3-LANGUAGE DISPLAY i18n SYSTEM (EN / VI / HMN)
 * Authentic Hmong UI strings based on DEMO Website Interface.jpg & PDF
 * ============================================================================
 */

(function (global) {
  'use strict';

  const STORAGE_KEY_LANG = 'trilinguo_display_lang';

  const UI_STRINGS = {
    hmn: {
      // Pre-login & Navbar
      pre_login: 'Login',
      pre_learn_more: 'Learn More',
      brand_sub: 'Lus zoo los ntawm Tả Van',
      nav_translator: 'Txhais Lus',
      nav_history: 'Keeb Kwm Txhais Lus',
      nav_phrases: 'Kab Lus Siv Ntau',
      nav_notebook: 'Kuv Cov Lus (Sổ Tay)',
      nav_contribute: '🌱 Pab Lus Hmoob',
      nav_account_prefix: 'Tus Tswv:',

      // Language Names
      lang_en: 'Lus Askiv (Anh)',
      lang_vi: 'Lus Nyab Laj (Kinh/Việt)',
      lang_hmn: 'Lus Hmoob (Hmong)',
      lang_short_en: 'Askiv',
      lang_short_vi: 'Kinh',
      lang_short_hmn: 'Hmoob',

      // Hero Section (Exact match with DEMO Website Interface.jpg)
      hero_kicker: 'NYOB ZOO · ZOO SIAB TXAIS TOS',
      hero_headline_html: 'Lo lus,<br>pab <span class="accent-orange">peb sib</span><br>to taub.',
      hero_desc: 'Nyob Zoo pab koj txhais lus Hmoob, lus Kinh thiab lus Askiv. Txhais cov lus tshiab, mloog lub suab thiab khaws cov lus uas koj tau kawm cia saib dua.',
      hero_active_block: 'Khối kawm lus tam sim no:',

      // Translator Card (Exact match with DEMO Website Interface.jpg)
      trans_card_title: 'Txhais lus',
      trans_online_badge: 'TXHAIS LUS ONLINE',
      trans_input_sub: 'Lus uas sau',
      trans_output_sub: 'Lus xav txhais',
      trans_input_label: 'Sau cov lus uas xav txhais',
      trans_placeholder: 'Nyob zoo...',
      trans_clear_btn: 'Rho tawm',
      trans_listen_btn: 'Mloog cov lus sau',
      trans_listen_out_btn: 'Mloog lus txhais',
      trans_quick_try: 'Sim sai:',
      trans_submit_btn: 'Txhais tam sim no',
      trans_result_label: 'Lus Txhais & Suab Nyeem',
      trans_save_btn: 'Khaws rau Kuv Cov Lus',

      // Translation History
      hist_title: 'Keeb Kwm Txhais Lus',
      hist_subtitle: 'Txhua lo lus thiab kab lus koj tau txhais hauv khối lus no.',
      hist_tip: '💡 Khoom plig ntse: Siv nas bôi đen (los sis nias tuav ntawm xov tooj) ib lo lus, cụm từ los sis kab lus twg kom pom lub ntsiab lus thiab khaws rau Sổ tay!',
      hist_clear_all: 'Rho tawm tag nrho',
      hist_empty: 'Tsis tau muaj keeb kwm txhais lus. Sim txhais ib lo lus saum toj no!',

      // Commonly Used Phrases
      phrases_title: 'Kab Lus Siv Ntau (Du Lịch & Giao Tiếp)',
      phrases_subtitle: 'Pab neeg Hmoob hauv Tả Van thiab neeg tuaj ncig teb chaws sib tham yooj yim.',
      phrases_tip: '💡 Bôi đen / xaiv ib lo lus los sis kab lus twg ntawm daim npav 3D kom saib suab nyeem thiab nias "Khaws rau Sổ tay"!',
      cat_all: 'Tag nrho',
      cat_greeting: 'Kev Sib Fim (Chào hỏi)',
      cat_directions: 'Nug Kev (Hỏi đường)',
      cat_shopping: 'Yuav Khoom (Mua bán)',
      cat_homestay: 'Nyob Homestay',
      cat_food: 'Noj Mov & Dej',
      cat_emergency: 'Kev Kho Mob (Khẩn cấp)',
      cat_culture: 'Kab Lis Kev Cai (Văn hóa)',
      card_source_label: 'Lus ntawm kuv (Tôi là):',
      card_target_label: 'Lus kuv kawm (Tôi muốn học):',

      // Personal Notebook (Sổ tay cá nhân)
      nb_title: 'Kuv Cov Lus (Sổ Tay Cá Nhân)',
      nb_subtitle: 'Cov lus koj tau khaws tseg los ntawm Keeb kwm txhais lus thiab Kab lus siv ntau.',
      nb_select_all: 'Xaiv tag nrho / Tso tseg',
      nb_selected_count: 'Tau xaiv:',
      nb_btn_flashcard: '🃏 Tsim Flashcard (≥ 4 lo lus)',
      nb_btn_quiz: '🎯 Tsim Quizzes (≥ 10 lo lus)',
      nb_add_demo_words: '+ Ntxiv cov lus mẫu kom puv ≥ 10 lo lus',
      nb_err_flashcard_min: '⚠️ Thov tích xaiv tsawg kawg 4 lo lus kom tsim tau Flashcard!',
      nb_err_quiz_min: '⚠️ Thov tích xaiv tsawg kawg 10 lo lus kom tsim tau bài Quiz!',
      nb_mastered_badge: '⭐ Paub zoo lawm (Mastered)',
      nb_learning_badge: '📖 Tab tom kawm',

      // Flashcard & Quiz
      fc_title: 'Flashcard 3D Kawm Lus',
      fc_flip_hint: 'Nias rau daim npav kom tig saib sab nraud (3D Flip)',
      fc_prev: '← Daim dhau los',
      fc_next: 'Daim tom ntej →',
      fc_remembered: '✓ Kuv nco tau lawm',
      quiz_title: 'Quizzes Kawm Lus',
      quiz_subtitle: 'Xaiv lo lus txhais raug rau txhua lo lus koj tau tích xaiv.',
      quiz_submit: 'Xa Bài Quiz & Khaws Kết Quả',
      quiz_score_msg: 'Koj teb raug',

      // Profile & Progress Dashboard
      prof_title: 'Tus Tswv & Kev Kawm (Hồ Sơ Cá Nhân)',
      prof_subtitle: 'Kho cov ntaub ntawv tus kheej thiab hloov khối lus kawm.',
      prof_name: 'Lub Npe Tài Khoản',
      prof_email: 'Gmail',
      prof_phone: 'Xov Tooj (Số điện thoại)',
      prof_i_am: 'Kuv yog (Tôi là - Ngôn ngữ mẹ đẻ):',
      prof_i_learn: 'Kuv xav kawm (Tôi muốn học):',
      prof_save_btn: '💾 Khaws Ntaub Ntawv & Hloov Khối Lus',
      prof_logout_btn: '🚪 Tawm (Đăng xuất)',
      prof_progress_title: 'Tiến Trình Học Tập Cá Nhân (Real-time)',
      prof_metric_1_label: 'Số lượng từ trong Sổ tay',
      prof_metric_1_sub: 'Tag nrho cov lus hauv khối lus no',
      prof_metric_2_label: 'Số từ đã thành thạo (Mastered)',
      prof_metric_2_sub: 'Quiz ≥ 10 zaug & Teb raug > 80%',
      prof_metric_3_label: 'Độ chính xác Quiz (Accuracy)',
      prof_metric_3_sub: '(Tổng câu đúng / Tổng câu quiz đã tạo) × 100%',

      // Auth Modal
      auth_title: 'Nkag Mus / Thiết Lập Khối Học Tập',
      auth_subtitle: 'Sau Npe / Gmail thiab xaiv Khối lus kawm kom nkag mus tam sim',
      auth_forgot_link: 'Hloov mật khẩu?',
      auth_send_otp: 'Nkag Mus',
      auth_verify_login: '✦ Vào Học Ngay',
      auth_terms_label: 'Kuv pom zoo rau cov điều khoản dịch vụ thiab tso cai siv thông tin cá nhân.',
      auth_terms_error: '⚠️ Koj yuav tsum tích pom zoo điều khoản dịch vụ ua ntej!',
      pop_save_btn: '＋ Lưu vào Sổ tay'
    },

    vi: {
      // Pre-login & Navbar
      pre_login: 'Login',
      pre_learn_more: 'Learn More',
      brand_sub: 'Lus zoo los ntawm Tả Van',
      nav_translator: 'Dịch thuật',
      nav_history: 'Nhật ký dịch thuật',
      nav_phrases: 'Mẫu câu thông dụng',
      nav_notebook: 'Sổ tay cá nhân',
      nav_contribute: '🌱 Đóng góp từ vựng',
      nav_account_prefix: 'Tài khoản:',

      // Language Names
      lang_en: 'Tiếng Anh (English)',
      lang_vi: 'Tiếng Kinh / Việt (Vietnamese)',
      lang_hmn: 'Tiếng Hmong (Lus Hmoob)',
      lang_short_en: 'Anh',
      lang_short_vi: 'Kinh',
      lang_short_hmn: 'Hmong',

      // Hero Section
      hero_kicker: 'NYOB ZOO · CHÀO MỪNG BẠN ĐẾN TẢ VAN',
      hero_headline_html: 'Ngôn từ,<br>giúp <span class="accent-orange">chúng ta</span><br>hiểu nhau.',
      hero_desc: 'Nyob Zoo (Trilinguo) giúp bạn dịch thuật 3 chiều Anh – Kinh (Việt) – Hmong, nghe phát âm chuẩn và lưu từ vựng vào Sổ tay cá nhân để luyện Flashcard & Quiz.',
      hero_active_block: 'Khối ngôn ngữ đang học:',

      // Translator Card
      trans_card_title: 'Dịch thuật 3 chiều',
      trans_online_badge: 'TXHAIS LUS ONLINE',
      trans_input_sub: 'Ngôn ngữ đầu vào',
      trans_output_sub: 'Ngôn ngữ đầu ra',
      trans_input_label: 'Nhập từ, cụm từ hoặc câu cần dịch',
      trans_placeholder: 'Nyob zoo / Xin chào / Hello...',
      trans_clear_btn: 'Xóa văn bản',
      trans_listen_btn: 'Nghe văn bản gốc',
      trans_listen_out_btn: 'Nghe bản dịch',
      trans_quick_try: 'Thử nhanh:',
      trans_submit_btn: 'Dịch ngay bây giờ',
      trans_result_label: 'Kết quả dịch & Phiên âm RPA',
      trans_save_btn: 'Lưu vào Sổ tay',

      // Translation History
      hist_title: 'Nhật Ký Dịch Thuật',
      hist_subtitle: 'Danh sách các từ, cụm từ và câu bạn đã dịch trong khối ngôn ngữ hiện tại.',
      hist_tip: '💡 Tính năng bôi đen thông minh: Dùng chuột bôi đen trên máy tính hoặc chạm giữ trên điện thoại bất kỳ từ/cụm từ/câu nào để xem phiên âm, loại từ và bấm "Lưu vào Sổ tay"!',
      hist_clear_all: 'Xóa lịch sử khối này',
      hist_empty: 'Chưa có lịch sử dịch thuật. Hãy bấm dịch thử một câu ở khung Dịch thuật!',

      // Commonly Used Phrases
      phrases_title: 'Mẫu Câu Thông Dụng (Du Lịch & Bản Làng)',
      phrases_subtitle: 'Hỗ trợ người Hmong giao tiếp với khách du lịch và ngược lại (chào hỏi, hỏi đường, mua bán, homestay, ẩm thực, khẩn cấp).',
      phrases_tip: '💡 Mẹo học nhanh: Bôi đen/chọn bất kỳ từ, cụm từ hoặc cả câu trên thẻ 3D để mở Popup từ điển chi tiết và bấm "Lưu vào Sổ tay"!',
      cat_all: 'Tất cả chủ đề',
      cat_greeting: 'Chào hỏi & Làm quen',
      cat_directions: 'Hỏi đường & Trekking',
      cat_shopping: 'Mua bán & Thổ cẩm',
      cat_homestay: 'Lưu trú Homestay',
      cat_food: 'Ẩm thực & Ăn uống',
      cat_emergency: 'Y tế & Khẩn cấp',
      cat_culture: 'Văn hóa & Bản làng',
      card_source_label: 'Câu gốc (Ngôn ngữ "Tôi là"):',
      card_target_label: 'Câu dịch (Ngôn ngữ "Tôi muốn học"):',

      // Personal Notebook
      nb_title: 'Sổ Tay Cá Nhân / Từ Điển Cá Nhân',
      nb_subtitle: 'Toàn bộ từ, cụm từ và câu bạn đã lưu từ Nhật ký dịch thuật và Mẫu câu thông dụng.',
      nb_select_all: 'Chọn tất cả / Bỏ chọn',
      nb_selected_count: 'Đang chọn:',
      nb_btn_flashcard: '🃏 Tạo Flashcard (Tối thiểu 4 từ)',
      nb_btn_quiz: '🎯 Tạo Quizzes (Tối thiểu 10 từ)',
      nb_add_demo_words: '+ Nạp nhanh bộ từ vựng mẫu (≥ 12 từ)',
      nb_err_flashcard_min: '⚠️ Vui lòng tích chọn tối thiểu 4 từ vựng để tạo Flashcard!',
      nb_err_quiz_min: '⚠️ Vui lòng tích chọn tối thiểu 10 từ vựng để tạo bài kiểm tra Quizzes!',
      nb_mastered_badge: '⭐ Đã thành thạo (Mastered)',
      nb_learning_badge: '📖 Đang luyện tập',

      // Flashcard & Quiz
      fc_title: 'Thẻ Lật 3D Flashcard',
      fc_flip_hint: 'Nhấn vào thẻ để lật 3D xem nghĩa dịch, phiên âm và câu ví dụ',
      fc_prev: '← Thẻ trước',
      fc_next: 'Thẻ tiếp theo →',
      fc_remembered: '✓ Đánh dấu đã nhớ',
      quiz_title: 'Bài Kiểm Tra Trắc Nghiệm (Quizzes)',
      quiz_subtitle: 'Hoàn thành bài kiểm tra để cập nhật chỉ số Thành thạo (Mastered) và Độ chính xác vào Database.',
      quiz_submit: 'Nộp Bài Quiz & Lưu Tiến Trình',
      quiz_score_msg: 'Bạn trả lời đúng',

      // Profile & Progress Dashboard
      prof_title: 'Thông Tin Tài Khoản & Tiến Trình Học Tập',
      prof_subtitle: 'Quản lý hồ sơ cá nhân và chuyển đổi giữa các Khối ngôn ngữ (Language Learning Blocks).',
      prof_name: 'Tên tài khoản',
      prof_email: 'Địa chỉ Gmail',
      prof_phone: 'Số điện thoại',
      prof_i_am: 'Tôi là (Ngôn ngữ mẹ đẻ / Hiển thị):',
      prof_i_learn: 'Tôi muốn học (Ngôn ngữ mục tiêu):',
      prof_save_btn: '💾 Lưu Hồ Sơ & Chuyển Khối Ngôn Ngữ',
      prof_logout_btn: '🚪 Đăng xuất tài khoản',
      prof_progress_title: 'Tiến Trình Học Tập Cá Nhân (Thời Gian Thực)',
      prof_metric_1_label: 'Số lượng từ trong Sổ tay',
      prof_metric_1_sub: 'Tổng số từ/cụm từ thuộc khối ngôn ngữ đang chọn',
      prof_metric_2_label: 'Số từ đã thành thạo (Mastered)',
      prof_metric_2_sub: 'Thỏa mãn ĐỒNG THỜI: Quiz ≥ 10 lần & Tỉ lệ đúng > 80%',
      prof_metric_3_label: 'Độ chính xác Quiz (Quiz Accuracy)',
      prof_metric_3_sub: '(Tổng số câu trả lời đúng / Tổng số câu quiz đã tạo) × 100%',

      // Auth Modal
      auth_title: 'Đăng Nhập / Thiết Lập Khối Học Tập',
      auth_subtitle: 'Nhập Tên / Gmail và chọn Khối ngôn ngữ để vào thẳng',
      auth_forgot_link: 'Đổi mật khẩu?',
      auth_send_otp: 'Đăng nhập',
      auth_verify_login: '✦ Vào Học Ngay',
      auth_terms_label: 'Tôi đồng ý với các điều khoản dịch vụ và cho phép sử dụng thông tin cá nhân',
      auth_terms_error: '⚠️ Bạn bắt buộc phải tích đồng ý điều khoản dịch vụ và cho phép sử dụng thông tin cá nhân!',
      pop_save_btn: '＋ Lưu vào Sổ tay'
    },

    en: {
      // Pre-login & Navbar
      pre_login: 'Login',
      pre_learn_more: 'Learn More',
      brand_sub: 'Lus zoo los ntawm Tả Van',
      nav_translator: 'Translator',
      nav_history: 'Translation History',
      nav_phrases: 'Commonly Used Phrases',
      nav_notebook: 'Personal Notebook',
      nav_contribute: '🌱 Contribute',
      nav_account_prefix: 'Account:',

      // Language Names
      lang_en: 'English (Anh)',
      lang_vi: 'Vietnamese / Kinh (Việt)',
      lang_hmn: 'Hmong (Lus Hmoob)',
      lang_short_en: 'English',
      lang_short_vi: 'Kinh/Viet',
      lang_short_hmn: 'Hmong',

      // Hero Section
      hero_kicker: 'NYOB ZOO · WELCOME TO TA VAN',
      hero_headline_html: 'Every word,<br>helps <span class="accent-orange">us all</span><br>understand.',
      hero_desc: 'Nyob Zoo (Trilinguo) helps you translate seamlessly across English, Vietnamese (Kinh), and Hmong, listen to pronunciation, and save vocabulary to your Personal Notebook.',
      hero_active_block: 'Active Learning Block:',

      // Translator Card
      trans_card_title: '3-Way Translator',
      trans_online_badge: 'TXHAIS LUS ONLINE',
      trans_input_sub: 'Source language',
      trans_output_sub: 'Target language',
      trans_input_label: 'Enter words, phrases, or sentences to translate',
      trans_placeholder: 'Nyob zoo / Hello / Xin chào...',
      trans_clear_btn: 'Clear text',
      trans_listen_btn: 'Listen to source text',
      trans_listen_out_btn: 'Listen to translation',
      trans_quick_try: 'Quick try:',
      trans_submit_btn: 'Translate right now',
      trans_result_label: 'Translation & RPA Phonetics',
      trans_save_btn: 'Save to Personal Notebook',

      // Translation History
      hist_title: 'Translation History',
      hist_subtitle: 'All words, phrases, and sentences you translated in your active language block.',
      hist_tip: '💡 Smart Text Selection: Highlight any word, phrase, or sentence with your mouse (or touch-hold on mobile) to view phonetics, part of speech, and click "Save to Personal Notebook"!',
      hist_clear_all: 'Clear block history',
      hist_empty: 'No translation history yet. Translate a phrase above to get started!',

      // Commonly Used Phrases
      phrases_title: 'Commonly Used Phrases (Tourism & Daily Life)',
      phrases_subtitle: 'Helping Hmong locals and travellers communicate effortlessly across greetings, directions, shopping, homestay, food, and emergencies.',
      phrases_tip: '💡 Tip: Highlight/select any word, phrase, or full sentence on a 3D card to inspect detailed Hmong phonetics and click "Save to Personal Notebook"!',
      cat_all: 'All Categories',
      cat_greeting: 'Greetings & Politeness',
      cat_directions: 'Directions & Trekking',
      cat_shopping: 'Shopping & Handicrafts',
      cat_homestay: 'Homestay & Lodging',
      cat_food: 'Food & Local Dining',
      cat_emergency: 'Health & Emergency',
      cat_culture: 'Culture & Village Life',
      card_source_label: 'Original ("I am" language):',
      card_target_label: 'Translation ("I want to learn" language):',

      // Personal Notebook
      nb_title: 'Personal Notebook / Personal Dictionary',
      nb_subtitle: 'All saved vocabulary and phrases from Translation History and Commonly Used Phrases.',
      nb_select_all: 'Select All / Deselect All',
      nb_selected_count: 'Selected:',
      nb_btn_flashcard: '🃏 Create Flashcards (Min 4 words)',
      nb_btn_quiz: '🎯 Create Quizzes (Min 10 words)',
      nb_add_demo_words: '+ Load starter vocabulary pack (≥ 12 words)',
      nb_err_flashcard_min: '⚠️ Please check at least 4 vocabulary items to generate Flashcards!',
      nb_err_quiz_min: '⚠️ Please check at least 10 vocabulary items to generate a Quiz!',
      nb_mastered_badge: '⭐ Mastered',
      nb_learning_badge: '📖 Practicing',

      // Flashcard & Quiz
      fc_title: '3D Flip Flashcards',
      fc_flip_hint: 'Click the card to flip 3D between source word and meaning + example',
      fc_prev: '← Previous Card',
      fc_next: 'Next Card →',
      fc_remembered: '✓ Mark as Remembered',
      quiz_title: 'Vocabulary Quiz',
      quiz_subtitle: 'Submit your answers to update per-word mastery and overall block Quiz Accuracy in the database.',
      quiz_submit: 'Submit Quiz & Save Progress',
      quiz_score_msg: 'You scored',

      // Profile & Progress Dashboard
      prof_title: 'Account Profile & Learning Progress',
      prof_subtitle: 'Edit your personal details and switch across your Language Learning Blocks.',
      prof_name: 'Account Name',
      prof_email: 'Gmail Address',
      prof_phone: 'Phone Number',
      prof_i_am: 'I am (Native / Display Language):',
      prof_i_learn: 'I want to learn (Target Language):',
      prof_save_btn: '💾 Save Profile & Switch Language Block',
      prof_logout_btn: '🚪 Sign Out',
      prof_progress_title: 'Personal Progress Dashboard (Real-Time)',
      prof_metric_1_label: 'Total Notebook Words',
      prof_metric_1_sub: 'Total saved words/phrases in active language block',
      prof_metric_2_label: 'Mastered Words',
      prof_metric_2_sub: 'Satisfies BOTH: quiz_attempts ≥ 10 AND accuracy > 80%',
      prof_metric_3_label: 'Quiz Accuracy',
      prof_metric_3_sub: '(Total correct quiz answers / Total quiz questions created) × 100%',

      // Auth Modal
      auth_title: 'Sign In / Learning Block Setup',
      auth_subtitle: 'Enter your Name / Gmail and choose your Language Block to start immediately',
      auth_forgot_link: 'Change password?',
      auth_send_otp: 'Sign In',
      auth_verify_login: '✦ Start Learning Now',
      auth_terms_label: 'I agree to the Terms of Service and consent to the use of personal information',
      auth_terms_error: '⚠️ You must check the box agreeing to the Terms of Service and personal data usage!',
      pop_save_btn: '＋ Save to Personal Notebook'
    }
  };

  function getDisplayLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    if (saved && UI_STRINGS[saved]) return saved;
    return 'hmn'; // Default on initial pre-login view matches DEMO Website Interface.jpg (Hmong)
  }

  function setDisplayLanguage(lang) {
    const valid = UI_STRINGS[lang] ? lang : 'vi';
    localStorage.setItem(STORAGE_KEY_LANG, valid);
    document.documentElement.setAttribute('lang', valid);
    document.documentElement.setAttribute('data-display-lang', valid);
    applyTranslations(valid);
    window.dispatchEvent(new CustomEvent('trilinguo:langchange', { detail: { lang: valid } }));
  }

  function t(key, langOverride) {
    const lang = langOverride || getDisplayLanguage();
    const dict = UI_STRINGS[lang] || UI_STRINGS.vi;
    return dict[key] !== undefined ? dict[key] : (UI_STRINGS.vi[key] || key);
  }

  function getLanguageLabel(langCode, shortForm) {
    const key = shortForm ? `lang_short_${langCode}` : `lang_${langCode}`;
    return t(key);
  }

  function applyTranslations(langOverride) {
    const lang = langOverride || getDisplayLanguage();
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-display-lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key, lang);
      if (val) el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = t(key, lang);
      if (val) el.innerHTML = val;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key, lang);
      if (val) el.setAttribute('placeholder', val);
    });

    document.querySelectorAll('.lang-switcher__btn').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      btn.classList.toggle('active', btnLang === lang);
    });
  }

  // Sync <html lang="..."> immediately on script load to avoid font flash
  try {
    const initialLang = getDisplayLanguage();
    document.documentElement.setAttribute('lang', initialLang);
    document.documentElement.setAttribute('data-display-lang', initialLang);
  } catch (e) {}

  global.TrilinguoI18n = {
    UI_STRINGS,
    getDisplayLanguage,
    setDisplayLanguage,
    t,
    getLanguageLabel,
    applyTranslations
  };
})(window);
