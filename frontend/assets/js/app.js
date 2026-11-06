/**
 * ============================================================================
 * TRILINGUO / NYOB ZOO — MAIN FRONTEND APPLICATION CONTROLLER (assets/js/app.js)
 * Connected to Production Python FastAPI Backend via js/api.js
 * ============================================================================
 */

(function (global) {
  'use strict';

  const THEME_STORAGE_KEY = 'trilinguo_theme';
  const SELECTED_WORDS_SESSION_KEY = 'trilinguo_selected_notebook_ids';

  // Application State
  let selectedNotebookIds = new Set();
  let cachedNotebookWords = [];
  let cachedHistoryItems = [];
  let cachedPhrases = [];
  let flashcardDeck = [];
  let flashcardIndex = 0;
  let activeQuizQuestions = [];
  let activeQuizAnswers = {};
  let currentAuthMethod = 'google';
  let currentPhraseCategory = 'all';

  /**
   * 1. THEME MANAGEMENT (LIGHT / DARK MODE)
   */
  function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    setTheme(saved);
  }

  function setTheme(theme) {
    const valid = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', valid);
    localStorage.setItem(THEME_STORAGE_KEY, valid);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.textContent = valid === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('title', valid === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  /**
   * 2. TOAST NOTIFICATION HELPER
   */
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const item = document.createElement('div');
    item.className = 'toast-item';
    if (type === 'error') item.style.borderLeftColor = '#d94848';
    if (type === 'success') item.style.borderLeftColor = '#3b6f49';
    item.textContent = message;
    container.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.3s ease';
      setTimeout(() => item.remove(), 300);
    }, 4500);
  }

  /**
   * 3. TEXT-TO-SPEECH (TTS) PRONUNCIATION ENGINE
   */
  function speakText(text, langCode) {
    const clean = (text || '').trim();
    if (!clean) return;
    if (!('speechSynthesis' in window)) {
      showToast('Trình duyệt không hỗ trợ phát âm tự động.', 'error');
      return;
    }
    window.speechSynthesis.cancel();
    const utterText =
      langCode === 'hmn' && global.TrilinguoData
        ? global.TrilinguoData.generateHmongPhonetics(clean)
        : clean;
    const utter = new SpeechSynthesisUtterance(utterText);
    if (langCode === 'vi') utter.lang = 'vi-VN';
    else if (langCode === 'en') utter.lang = 'en-US';
    else utter.lang = 'en-US';
    utter.rate = langCode === 'hmn' ? 0.85 : 0.95;
    window.speechSynthesis.speak(utter);
  }

  /**
   * 4. UNIFIED ILLUSTRATED BACKGROUND (--z-bg-base: 0, --z-bg-decor: 1)
   * Cleanly layered without rectangular clipping or pointer blocking
   */
  function injectSharedBackground() {
    if (document.querySelector('.scene-bg')) return;
    const bg = document.createElement('div');
    bg.className = 'scene-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = `
      <img class="scene-bg__sky" src="assets/images/elements/15.svg" alt="" />
      <img class="scene-bg__top-grad" src="assets/images/elements/7.svg" alt="" />
      <div class="scene-bg__sun"></div>
      <img class="scene-bg__birds" src="assets/images/elements/13.svg" alt="" />
      <img class="scene-bg__cloud-right" src="assets/images/elements/27.svg" alt="" />
      <img class="scene-bg__valley" src="assets/images/elements/17.svg" alt="" />
      <img class="scene-bg__terraces-left" src="assets/images/elements/9.svg" alt="" />
      <img class="scene-bg__bush-left" src="assets/images/elements/23.svg" alt="" />
      <img class="scene-bg__bush-right" src="assets/images/elements/24.svg" alt="" />
      <img class="scene-bg__flowers-left" src="assets/images/elements/25.svg" alt="" />
      <img class="scene-bg__flowers-right" src="assets/images/elements/26.svg" alt="" />
    `;
    document.body.prepend(bg);
  }

  function renderHeaderState() {
    const user = global.TrilinguoAPI.getCurrentUser();
    const preloginCta = document.getElementById('preloginNavCta');
    const postloginNav = document.getElementById('mainPostLoginNav');
    const burgerBtn = document.getElementById('mobileBurgerBtn');
    const accountNameSpan = document.getElementById('navAccountName');
    const accountBlockPill = document.getElementById('navAccountBlock');
    const heroBlockBox = document.getElementById('heroActiveBlockBox');
    const heroBlockText = document.getElementById('heroActiveBlockText');
    const historySec = document.getElementById('historySection');

    if (user) {
      if (preloginCta) preloginCta.style.display = 'none';
      if (postloginNav) postloginNav.classList.remove('is-hidden');
      if (burgerBtn) burgerBtn.style.display = '';
      if (accountNameSpan) accountNameSpan.textContent = user.accountName;
      const blockStr = `${user.nativeLang.toUpperCase()} → ${user.targetLang.toUpperCase()}`;
      if (accountBlockPill) accountBlockPill.textContent = blockStr;
      if (heroBlockBox) heroBlockBox.style.display = 'inline-flex';
      if (heroBlockText) {
        const nLabel = global.TrilinguoI18n.getLanguageLabel(user.nativeLang, true);
        const tLabel = global.TrilinguoI18n.getLanguageLabel(user.targetLang, true);
        heroBlockText.textContent = `${nLabel} → ${tLabel}`;
      }
      if (historySec) historySec.style.display = 'block';
    } else {
      if (preloginCta) preloginCta.style.display = 'inline-flex';
      if (postloginNav) postloginNav.classList.add('is-hidden');
      if (burgerBtn) burgerBtn.style.display = 'none';
      if (heroBlockBox) heroBlockBox.style.display = 'none';
      if (historySec) historySec.style.display = 'none';
    }
  }

  /**
   * 5. REAL PRODUCTION AUTHENTICATION, OAUTH2 & OTP MODALS
   */
  function injectModalsAndPopover() {
    if (document.getElementById('authModalBackdrop')) return;

    const modalHtml = `
      <!-- 1. AUTHENTICATION MODAL (GOOGLE OAUTH2 / FACEBOOK GRAPH / GMAIL & PHONE OTP) -->
      <div class="modal-backdrop" id="authModalBackdrop">
        <div class="modal-card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.85rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <img src="assets/images/mascot/13.svg" alt="Mascot" style="width:52px;height:52px;object-fit:contain;" />
              <div>
                <h2 style="font-size:1.25rem;font-weight:800;color:var(--text-heading);" data-i18n="auth_title">Đăng Nhập / Đăng Ký Trilinguo</h2>
                <p style="font-size:0.78rem;color:var(--text-muted);font-weight:600;" data-i18n="auth_subtitle">Xác thực thực tế qua Google, Facebook hoặc Mã OTP 6 số</p>
              </div>
            </div>
            <button type="button" id="closeAuthModalBtn" style="border:none;background:transparent;font-size:1.35rem;cursor:pointer;color:var(--text-muted);">✕</button>
          </div>

          <!-- Mandatory Learning Profile Selection ("Tôi là:" & "Tôi muốn học:") -->
          <div style="background:var(--surface-muted);padding:0.85rem;border-radius:16px;border:1.5px solid var(--border-subtle);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:0.7rem;margin-bottom:0.9rem;">
            <div class="form-group">
              <label class="form-label" data-i18n="prof_i_am">Tôi là (Ngôn ngữ mẹ đẻ):</label>
              <select id="authNativeLangSelect" class="form-control">
                <option value="vi" selected>Kinh / Tiếng Việt (VI)</option>
                <option value="hmn">Hmong / Lus Hmoob (HMN)</option>
                <option value="en">Anh / English (EN)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="prof_i_learn">Tôi muốn học:</label>
              <select id="authTargetLangSelect" class="form-control">
                <option value="hmn" selected>Hmong / Lus Hmoob (HMN)</option>
                <option value="en">Anh / English (EN)</option>
                <option value="vi">Kinh / Tiếng Việt (VI)</option>
              </select>
            </div>
          </div>

          <!-- 3 Auth Provider Tabs -->
          <div class="auth-provider-btns">
            <button type="button" class="auth-provider-btn active" data-provider="google">
              <span style="font-size:1.2rem;">🌐</span>
              <span>Google / Gmail</span>
            </button>
            <button type="button" class="auth-provider-btn" data-provider="facebook">
              <span style="font-size:1.2rem;">📘</span>
              <span>Facebook</span>
            </button>
            <button type="button" class="auth-provider-btn" data-provider="phone">
              <span style="font-size:1.2rem;">📱</span>
              <span>Số điện thoại</span>
            </button>
          </div>

          <!-- Direct OAuth2 Redirect Button for Google / Facebook -->
          <div id="oauthRedirectActionBox" style="margin-bottom:0.85rem;">
            <button type="button" id="oauthDirectRedirectBtn" class="btn-tool btn-tool--outline" style="width:100%;justify-content:center;border-color:var(--color-main-turquoise);">
              🌐 Chuyển hướng Đăng nhập Google OAuth2 (Tài khoản thật)
            </button>
          </div>

          <form id="authMainForm" style="display:flex;flex-direction:column;gap:0.8rem;">
            <div class="form-group" id="authIdentifierGroup">
              <label class="form-label" id="authIdentifierLabel">Địa chỉ Gmail nhận mã OTP xác thực:</label>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <input type="text" id="authIdentifierInput" class="form-control" style="flex:1;min-width:180px;" placeholder="Nhập địa chỉ Gmail của bạn..." required />
                <button type="button" id="authSendOtpBtn" class="btn-tool btn-tool--flashcard" style="white-space:nowrap;" data-i18n="auth_send_otp">Gửi mã OTP</button>
              </div>
            </div>

            <div class="form-group" id="authFacebookTokenGroup" style="display:none;">
              <label class="form-label">Hoặc dán Facebook Graph Access Token (nếu test Graph API trực tiếp):</label>
              <input type="text" id="authFacebookTokenInput" class="form-control" placeholder="EAABsbCS1iHgBO..." />
            </div>

            <div class="form-group" id="authOtpGroup">
              <label class="form-label">Mã OTP 6 số (Hiệu lực 5 phút):</label>
              <input type="text" id="authOtpInput" class="form-control" placeholder="Nhập 6 chữ số OTP..." maxlength="6" />
              <small id="authOtpHint" style="font-size:0.76rem;color:var(--color-element-forest);font-weight:700;"></small>
            </div>

            <div class="form-group">
              <label class="form-label" data-i18n="prof_name">Tên tài khoản hiển thị:</label>
              <input type="text" id="authNameInput" class="form-control" placeholder="Nhập họ tên hoặc biệt danh của bạn..." required />
            </div>

            <!-- Mandatory Terms Checkbox -->
            <label style="display:flex;align-items:flex-start;gap:0.6rem;font-size:0.82rem;font-weight:700;cursor:pointer;color:var(--text-primary);">
              <input type="checkbox" id="authTermsCheckbox" style="width:18px;height:18px;margin-top:2px;accent-color:var(--color-main-orange);flex-shrink:0;" />
              <span data-i18n="auth_terms_label">Tôi đồng ý với các điều khoản dịch vụ và cho phép sử dụng thông tin cá nhân</span>
            </label>

            <button type="submit" class="translate-submit-btn" style="margin-top:0.15rem;" data-i18n="auth_verify_login">
              ✦ Xác Thực & Hoàn Tất Đăng Nhập
            </button>

            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:0.3rem;flex-wrap:wrap;gap:0.5rem;">
              <button type="button" id="openForgotModalBtn" style="border:none;background:transparent;color:var(--color-main-dark-teal);font-weight:800;font-size:0.82rem;text-decoration:underline;cursor:pointer;" data-i18n="auth_forgot_link">Quên mật khẩu?</button>
              <span style="font-size:0.74rem;color:var(--text-muted);font-weight:600;">FastAPI + JWT Security</span>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. FORGOT PASSWORD MODAL (GMAIL / PHONE OTP -> RESET PASSWORD) -->
      <div class="modal-backdrop" id="forgotModalBackdrop">
        <div class="modal-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <img src="assets/images/mascot/9.svg" alt="Mascot" style="width:50px;height:50px;object-fit:contain;" />
              <div>
                <h2 style="font-size:1.2rem;font-weight:800;color:var(--text-heading);">Quên Mật Khẩu (Forgot Password)</h2>
                <p style="font-size:0.78rem;color:var(--text-muted);font-weight:600;">Xác thực mã OTP 6 số qua Gmail SMTP hoặc SĐT để đặt mật khẩu mới</p>
              </div>
            </div>
            <button type="button" id="closeForgotModalBtn" style="border:none;background:transparent;font-size:1.35rem;cursor:pointer;color:var(--text-muted);">✕</button>
          </div>

          <form id="forgotPasswordForm" style="display:flex;flex-direction:column;gap:0.85rem;">
            <div class="form-group">
              <label class="form-label">Nhập Gmail hoặc Số điện thoại của bạn:</label>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <input type="text" id="forgotIdentifierInput" class="form-control" style="flex:1;min-width:180px;" placeholder="Gmail hoặc Số điện thoại..." required />
                <button type="button" id="forgotSendOtpBtn" class="btn-tool btn-tool--flashcard">Gửi OTP</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Mã OTP 6 số nhận được:</label>
              <input type="text" id="forgotOtpInput" class="form-control" placeholder="Nhập 6 chữ số OTP..." maxlength="6" required />
              <small id="forgotOtpHint" style="font-size:0.76rem;color:var(--color-element-forest);font-weight:700;"></small>
            </div>
            <div class="form-group">
              <label class="form-label">Mật khẩu mới (tối thiểu 6 ký tự):</label>
              <input type="password" id="forgotNewPassInput" class="form-control" placeholder="Nhập mật khẩu mới..." minlength="6" required />
            </div>
            <button type="submit" class="translate-submit-btn">Xác Nhận OTP & Đặt Lại Mật Khẩu</button>
            <button type="button" id="backToLoginModalBtn" class="btn-tool btn-tool--outline" style="justify-content:center;">← Quay lại Đăng nhập</button>
          </form>
        </div>
      </div>

      <!-- 3. 3D FLASHCARD MODAL -->
      <div class="modal-backdrop" id="flashcardModalBackdrop">
        <div class="modal-card modal-card--wide">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.65rem;">
              <img src="assets/images/mascot/12.svg" alt="Mascot" style="width:48px;height:48px;object-fit:contain;" />
              <div>
                <h2 style="font-size:1.25rem;font-weight:800;color:var(--text-heading);" data-i18n="fc_title">Thẻ Lật 3D Flashcard</h2>
                <p style="font-size:0.78rem;color:var(--text-muted);font-weight:600;" data-i18n="fc_flip_hint">Nhấn vào thẻ để lật 3D xem nghĩa dịch, phiên âm và câu ví dụ</p>
              </div>
            </div>
            <button type="button" id="closeFlashcardModalBtn" style="border:none;background:transparent;font-size:1.35rem;cursor:pointer;color:var(--text-muted);">✕</button>
          </div>

          <div style="text-align:center;font-size:0.85rem;font-weight:800;color:var(--color-main-orange);margin-bottom:0.4rem;" id="flashcardCounterText">1 / 4</div>

          <div class="flashcard-stage">
            <div class="flashcard-3d" id="flashcard3dBox">
              <div class="flashcard-face flashcard-face--front">
                <span class="card-3d__category" id="fcFrontPos" style="margin-bottom:0.75rem;">(nth) nthe</span>
                <div style="font-size:clamp(1.4rem,2.5vw,2rem);font-weight:900;color:var(--text-heading);margin-bottom:0.6rem;" id="fcFrontWord">Nyob zoo</div>
                <div class="card-3d__phonetics" id="fcFrontPhonetic">🔊 /nyaw zhong/</div>
                <button type="button" id="fcListenBtn" class="listen-btn" style="margin-top:1rem;">🔊 Mloog / Nghe phát âm</button>
              </div>
              <div class="flashcard-face flashcard-face--back">
                <span class="online-badge" style="margin-bottom:0.6rem;">Nghĩa dịch & Ví dụ</span>
                <div style="font-size:clamp(1.3rem,2.2vw,1.75rem);font-weight:900;color:var(--color-main-dark-teal);margin-bottom:0.45rem;" id="fcBackMeaning">Xin chào / Hello</div>
                <div style="font-size:0.86rem;color:var(--text-secondary);font-weight:600;margin-bottom:0.7rem;" id="fcBackTri">HMN: Nyob zoo · VI: Xin chào · EN: Hello</div>
                <div style="font-size:0.82rem;background:var(--surface-card-solid);padding:0.6rem 0.85rem;border-radius:12px;border-left:3px solid var(--color-main-orange);color:var(--text-primary);" id="fcBackExample">
                  Nyob zoo! Koj nyob li cas? — Xin chào! Bạn khỏe không?
                </div>
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.65rem;margin-top:1.15rem;flex-wrap:wrap;">
            <button type="button" id="fcPrevBtn" class="btn-tool btn-tool--outline" data-i18n="fc_prev">← Thẻ trước</button>
            <button type="button" id="fcMarkRememberedBtn" class="btn-tool btn-tool--flashcard" data-i18n="fc_remembered">✓ Đánh dấu đã nhớ</button>
            <button type="button" id="fcNextBtn" class="btn-tool btn-tool--outline" data-i18n="fc_next">Thẻ tiếp theo →</button>
          </div>
        </div>
      </div>

      <!-- 4. INTERACTIVE TEXT SELECTION POPOVER (--z-popover: 500) -->
      <div class="selection-popover" id="selectionPopover" role="dialog" aria-label="Dictionary Lookup Popover">
        <div class="selection-popover__header">
          <div>
            <div class="selection-popover__word" id="popSelectedWord">Nyob zoo</div>
            <div class="selection-popover__meta">
              <span class="selection-popover__phonetic" id="popPhonetic">/nyaw zhong/</span>
              <span class="selection-popover__pos" id="popPos">(nth) nthe</span>
            </div>
          </div>
          <button type="button" class="selection-popover__close" id="popCloseBtn">✕</button>
        </div>
        <div class="selection-popover__meanings">
          <div><strong>Hmong:</strong> <span id="popMeaningHmn">Nyob zoo</span></div>
          <div><strong>Kinh (Việt):</strong> <span id="popMeaningVi">Xin chào</span></div>
          <div><strong>English:</strong> <span id="popMeaningEn">Hello</span></div>
          <div id="popGrammarNote" style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;"></div>
        </div>
        <div class="selection-popover__actions">
          <button type="button" class="listen-btn" id="popListenBtn" style="padding:0.45rem 0.7rem;">🔊</button>
          <button type="button" class="btn-save-notebook" id="popSaveNotebookBtn" data-i18n="pop_save_btn">＋ Lưu vào Sổ tay</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    bindAuthModalEvents();
    bindFlashcardModalEvents();
    initSmartSelectionPopover();
  }

  function openAuthModal() {
    const backdrop = document.getElementById('authModalBackdrop');
    if (backdrop) backdrop.classList.add('is-open');
  }

  function closeAuthModal() {
    const backdrop = document.getElementById('authModalBackdrop');
    if (backdrop) backdrop.classList.remove('is-open');
  }

  function bindAuthModalEvents() {
    const forgotBackdrop = document.getElementById('forgotModalBackdrop');

    document.querySelectorAll('[data-open-auth]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        openAuthModal();
      });
    });

    const closeBtn = document.getElementById('closeAuthModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);

    // Switch between Google, Facebook, Phone
    document.querySelectorAll('.auth-provider-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-provider-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAuthMethod = btn.getAttribute('data-provider');

        const label = document.getElementById('authIdentifierLabel');
        const input = document.getElementById('authIdentifierInput');
        const oauthBox = document.getElementById('oauthRedirectActionBox');
        const oauthBtn = document.getElementById('oauthDirectRedirectBtn');
        const fbTokenGroup = document.getElementById('authFacebookTokenGroup');

        if (currentAuthMethod === 'google') {
          label.textContent = 'Địa chỉ Gmail nhận mã OTP xác thực:';
          input.placeholder = 'Nhập Gmail thật của bạn (VD: tenban@gmail.com)...';
          oauthBox.style.display = 'block';
          oauthBtn.textContent = '🌐 Chuyển hướng Đăng nhập Google OAuth2 (Tài khoản thật)';
          fbTokenGroup.style.display = 'none';
        } else if (currentAuthMethod === 'facebook') {
          label.textContent = 'Email liên kết Facebook (nhận OTP) hoặc dùng nút OAuth2:';
          input.placeholder = 'Nhập Email tài khoản Facebook...';
          oauthBox.style.display = 'block';
          oauthBtn.textContent = '📘 Chuyển hướng Đăng nhập Facebook OAuth2';
          fbTokenGroup.style.display = 'flex';
        } else {
          label.textContent = 'Số điện thoại nhận mã OTP (SMS / Zalo):';
          input.placeholder = 'Nhập số điện thoại của bạn (VD: 0912345678)...';
          oauthBox.style.display = 'none';
          fbTokenGroup.style.display = 'none';
        }
      });
    });

    // Direct OAuth2 Redirect button (Google / Facebook)
    const oauthDirectBtn = document.getElementById('oauthDirectRedirectBtn');
    if (oauthDirectBtn) {
      oauthDirectBtn.addEventListener('click', async () => {
        const termsChecked = document.getElementById('authTermsCheckbox').checked;
        if (!termsChecked) {
          showToast(global.TrilinguoI18n.t('auth_terms_error'), 'error');
          return;
        }
        const nLang = document.getElementById('authNativeLangSelect').value;
        const tLang = document.getElementById('authTargetLangSelect').value;
        if (nLang === tLang) {
          showToast('Ngôn ngữ "Tôi là" và "Tôi muốn học" phải khác nhau!', 'error');
          return;
        }
        try {
          if (currentAuthMethod === 'facebook') {
            await global.TrilinguoAPI.startFacebookOAuthRedirect(nLang, tLang);
          } else {
            await global.TrilinguoAPI.startGoogleOAuthRedirect(nLang, tLang);
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Send Real 6-digit OTP via Backend API
    const sendOtpBtn = document.getElementById('authSendOtpBtn');
    if (sendOtpBtn) {
      sendOtpBtn.addEventListener('click', async () => {
        const identifier = document.getElementById('authIdentifierInput').value.trim();
        if (!identifier) {
          showToast('Vui lòng nhập địa chỉ Gmail hoặc Số điện thoại trước khi lấy mã OTP!', 'error');
          return;
        }
        sendOtpBtn.disabled = true;
        const originalText = sendOtpBtn.textContent;
        sendOtpBtn.textContent = 'Đang gửi...';
        try {
          const channel = currentAuthMethod === 'phone' ? 'phone' : 'email';
          const res = await global.TrilinguoAPI.sendOtpCode({
            channel,
            identifier,
            purpose: 'login'
          });
          const hint = document.getElementById('authOtpHint');
          if (hint) {
            hint.textContent = res.message || `Đã gửi mã OTP 6 số tới ${identifier}`;
          }
          showToast(res.message || `Đã gửi mã OTP tới ${identifier}`, 'success');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          sendOtpBtn.disabled = false;
          sendOtpBtn.textContent = originalText;
        }
      });
    }

    // Submit Auth Form (Verifies OTP or Facebook Graph Token with Backend)
    const authForm = document.getElementById('authMainForm');
    if (authForm) {
      authForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
          const identifier = document.getElementById('authIdentifierInput').value.trim();
          const otpCode = document.getElementById('authOtpInput').value.trim();
          const accountName = document.getElementById('authNameInput').value.trim();
          const nativeLang = document.getElementById('authNativeLangSelect').value;
          const targetLang = document.getElementById('authTargetLangSelect').value;
          const agreedTerms = document.getElementById('authTermsCheckbox').checked;
          const fbToken = document.getElementById('authFacebookTokenInput').value.trim();

          if (!agreedTerms) {
            showToast(global.TrilinguoI18n.t('auth_terms_error'), 'error');
            return;
          }

          let user;
          if (currentAuthMethod === 'facebook' && fbToken) {
            user = await global.TrilinguoAPI.verifyFacebookOAuthToken({
              accessToken: fbToken,
              nativeLang,
              targetLang,
              agreedTerms
            });
          } else {
            if (!otpCode || otpCode.length !== 6) {
              showToast('Vui lòng nhập đúng mã OTP 6 chữ số đã được gửi!', 'error');
              return;
            }
            user = await global.TrilinguoAPI.verifyOtpAndLogin({
              channel: currentAuthMethod === 'phone' ? 'phone' : 'email',
              identifier,
              otpCode,
              accountName,
              nativeLang,
              targetLang,
              agreedTerms
            });
          }

          closeAuthModal();
          renderHeaderState();
          showToast(
            `Đăng nhập thành công (${user.accountName})! Giao diện đã tự động chuyển sang ngôn ngữ "${global.TrilinguoI18n.getLanguageLabel(user.nativeLang, true)}".`,
            'success'
          );
          await refreshActivePageData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Forgot Password Modal navigation & OTP verification
    const openForgotBtn = document.getElementById('openForgotModalBtn');
    const closeForgotBtn = document.getElementById('closeForgotModalBtn');
    const backToLoginBtn = document.getElementById('backToLoginModalBtn');

    if (openForgotBtn) {
      openForgotBtn.addEventListener('click', () => {
        closeAuthModal();
        if (forgotBackdrop) forgotBackdrop.classList.add('is-open');
      });
    }
    if (closeForgotBtn) {
      closeForgotBtn.addEventListener('click', () => {
        if (forgotBackdrop) forgotBackdrop.classList.remove('is-open');
      });
    }
    if (backToLoginBtn) {
      backToLoginBtn.addEventListener('click', () => {
        if (forgotBackdrop) forgotBackdrop.classList.remove('is-open');
        openAuthModal();
      });
    }

    const forgotSendOtpBtn = document.getElementById('forgotSendOtpBtn');
    if (forgotSendOtpBtn) {
      forgotSendOtpBtn.addEventListener('click', async () => {
        const idVal = document.getElementById('forgotIdentifierInput').value.trim();
        if (!idVal) {
          showToast('Vui lòng nhập Gmail hoặc Số điện thoại!', 'error');
          return;
        }
        try {
          const res = await global.TrilinguoAPI.sendOtpCode({
            channel: idVal.includes('@') ? 'email' : 'phone',
            identifier: idVal,
            purpose: 'forgot_password'
          });
          document.getElementById('forgotOtpHint').textContent = res.message || `Đã gửi mã OTP khôi phục tới ${idVal}`;
          showToast(res.message || 'Đã gửi mã OTP khôi phục mật khẩu!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    const forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
          const identifier = document.getElementById('forgotIdentifierInput').value.trim();
          const otpCode = document.getElementById('forgotOtpInput').value.trim();
          const newPassword = document.getElementById('forgotNewPassInput').value;
          const res = await global.TrilinguoAPI.resetPasswordWithOtp({
            identifier,
            otpCode,
            newPassword
          });
          showToast(res.message || 'Đặt lại mật khẩu mới thành công!', 'success');
          if (forgotBackdrop) forgotBackdrop.classList.remove('is-open');
          openAuthModal();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }

  /**
   * 6. INTERACTIVE SMART TEXT SELECTION POPOVER (--z-popover: 500)
   */
  let currentPopoverLookup = null;

  function initSmartSelectionPopover() {
    const popover = document.getElementById('selectionPopover');
    const closeBtn = document.getElementById('popCloseBtn');
    const listenBtn = document.getElementById('popListenBtn');
    const saveBtn = document.getElementById('popSaveNotebookBtn');

    if (!popover) return;

    function hidePopover() {
      popover.classList.remove('is-open');
    }

    if (closeBtn) closeBtn.addEventListener('click', hidePopover);

    if (listenBtn) {
      listenBtn.addEventListener('click', () => {
        if (currentPopoverLookup) {
          speakText(currentPopoverLookup.hmn, 'hmn');
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (!currentPopoverLookup) return;
        if (!global.TrilinguoAPI.isLoggedIn()) {
          hidePopover();
          openAuthModal();
          showToast('Vui lòng đăng nhập tài khoản để lưu từ vựng vào Sổ tay cá nhân!', 'error');
          return;
        }
        try {
          await global.TrilinguoAPI.saveToNotebook(currentPopoverLookup);
          showToast(`Đã lưu "${currentPopoverLookup.original}" vào Sổ tay cá nhân!`, 'success');
          hidePopover();
          await refreshActivePageData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    function handleTextSelectionEvent(e) {
      if (popover.contains(e.target)) return;

      const sel = window.getSelection();
      const rawText = sel ? sel.toString().trim() : '';
      if (!rawText || rawText.length < 2 || rawText.length > 180) {
        return;
      }

      const anchorNode = sel.anchorNode;
      const containerEl =
        anchorNode && (anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentElement);
      if (!containerEl || !containerEl.closest('.selectable-zone')) {
        return;
      }

      const user = global.TrilinguoAPI.getCurrentUser();
      const srcLang = user ? user.nativeLang : 'vi';
      const tgtLang = user ? user.targetLang : 'hmn';

      const info = global.TrilinguoData.lookupSelection(rawText, srcLang, tgtLang);
      if (!info) return;

      currentPopoverLookup = info;
      document.getElementById('popSelectedWord').textContent = info.original;
      document.getElementById('popPhonetic').textContent = `/${info.phonetic}/`;
      document.getElementById('popPos').textContent = info.posCode;
      document.getElementById('popMeaningHmn').textContent = info.hmn;
      document.getElementById('popMeaningVi').textContent = info.vi;
      document.getElementById('popMeaningEn').textContent = info.en;
      document.getElementById('popGrammarNote').textContent = info.note || '';

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const popWidth = Math.min(window.innerWidth * 0.92, 350);
      const left = Math.max(
        10,
        Math.min(window.innerWidth - popWidth - 10, rect.left + rect.width / 2 - popWidth / 2)
      );
      const top = rect.top > 250 ? rect.top - 230 : rect.bottom + 12;

      popover.style.left = `${left}px`;
      popover.style.top = `${Math.max(10, top)}px`;
      popover.classList.add('is-open');
    }

    document.addEventListener('mouseup', e => setTimeout(() => handleTextSelectionEvent(e), 30));
    document.addEventListener('touchend', e => setTimeout(() => handleTextSelectionEvent(e), 120));
    document.addEventListener('mousedown', e => {
      if (popover.classList.contains('is-open') && !popover.contains(e.target)) {
        hidePopover();
      }
    });
  }

  /**
   * 7. TRANSLATOR & TRANSLATION HISTORY CONTROLLER (index.html)
   */
  function initTranslatorPage() {
    const inputArea = document.getElementById('translatorInputText');
    if (!inputArea) return;

    const srcSelect = document.getElementById('sourceLangSelect');
    const tgtSelect = document.getElementById('targetLangSelect');
    const swapBtn = document.getElementById('swapLangBtn');
    const clearBtn = document.getElementById('clearTextBtn');
    const charCounter = document.getElementById('charCountText');
    const listenInputBtn = document.getElementById('listenSourceBtn');
    const listenOutputBtn = document.getElementById('listenOutputBtn');
    const submitBtn = document.getElementById('translateSubmitBtn');
    const outputBox = document.getElementById('translatorOutputBox');
    const outputMain = document.getElementById('outputTranslatedText');
    const outputPhonetic = document.getElementById('outputPhoneticsText');
    const outputNote = document.getElementById('outputGrammarNote');
    const saveOutputBtn = document.getElementById('saveTranslatedToNotebookBtn');

    const user = global.TrilinguoAPI.getCurrentUser();
    if (user && srcSelect && tgtSelect) {
      srcSelect.value = user.nativeLang;
      tgtSelect.value = user.targetLang;
    }

    let lastTranslationResult = null;

    function updateCounter() {
      const len = (inputArea.value || '').length;
      if (charCounter) charCounter.textContent = `${len} / 180`;
    }

    async function performTranslation(saveToHistory = true) {
      const raw = (inputArea.value || '').trim();
      if (!raw) {
        showToast('Vui lòng nhập từ hoặc câu cần dịch!', 'error');
        return;
      }
      const sLang = srcSelect ? srcSelect.value : 'hmn';
      const tLang = tgtSelect ? tgtSelect.value : 'en';

      try {
        // Call Backend API /api/translate (saves to DB history automatically if logged in)
        const apiRes = await global.TrilinguoAPI.translateViaBackend({
          text: raw,
          sourceLang: sLang,
          targetLang: tLang,
          saveHistory: saveToHistory
        });
        lastTranslationResult = {
          sourceText: apiRes.source_text,
          translatedText: apiRes.translated_text,
          hmnText: apiRes.hmn_text,
          viText: apiRes.vi_text,
          enText: apiRes.en_text,
          phonetic: apiRes.phonetic,
          posCode: apiRes.pos_code,
          grammarNote: apiRes.grammar_note
        };
      } catch (e) {
        // Offline dictionary fallback for translation preview
        const localRes = global.TrilinguoData.translateText(raw, sLang, tLang);
        lastTranslationResult = {
          sourceText: localRes.sourceText,
          translatedText: localRes.translatedText,
          hmnText: localRes.hmnText,
          viText: localRes.viText,
          enText: localRes.enText,
          phonetic: localRes.phonetic,
          posCode: localRes.pos ? localRes.pos.code : '(nth) nthe',
          grammarNote: localRes.grammarNote
        };
      }

      if (outputBox) outputBox.classList.add('is-visible');
      if (outputMain) outputMain.textContent = lastTranslationResult.translatedText;
      if (outputPhonetic) {
        outputPhonetic.textContent = `🔊 RPA Phonetics (${lastTranslationResult.hmnText}): /${lastTranslationResult.phonetic}/`;
      }
      if (outputNote) {
        outputNote.textContent = `📘 ${lastTranslationResult.grammarNote}`;
      }

      if (saveToHistory && global.TrilinguoAPI.isLoggedIn()) {
        await renderTranslationHistorySection();
      }
    }

    inputArea.addEventListener('input', updateCounter);

    if (swapBtn) {
      swapBtn.addEventListener('click', () => {
        const tmp = srcSelect.value;
        srcSelect.value = tgtSelect.value;
        tgtSelect.value = tmp;
        if (lastTranslationResult && outputMain.textContent) {
          inputArea.value = outputMain.textContent;
          updateCounter();
          performTranslation(false);
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        updateCounter();
        if (outputBox) outputBox.classList.remove('is-visible');
      });
    }

    if (listenInputBtn) {
      listenInputBtn.addEventListener('click', () => {
        speakText(inputArea.value || 'Nyob zoo', srcSelect.value);
      });
    }

    if (listenOutputBtn) {
      listenOutputBtn.addEventListener('click', () => {
        if (lastTranslationResult) {
          speakText(lastTranslationResult.translatedText, tgtSelect.value);
        }
      });
    }

    document.querySelectorAll('.quick-chip[data-phrase]').forEach(chip => {
      chip.addEventListener('click', () => {
        const phrase = chip.getAttribute('data-phrase');
        inputArea.value = phrase;
        srcSelect.value = 'hmn';
        if (tgtSelect.value === 'hmn') {
          const u = global.TrilinguoAPI.getCurrentUser();
          tgtSelect.value = u && u.nativeLang !== 'hmn' ? u.nativeLang : 'vi';
        }
        updateCounter();
        performTranslation(true);
      });
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', () => performTranslation(true));
    }

    if (saveOutputBtn) {
      saveOutputBtn.addEventListener('click', async () => {
        if (!lastTranslationResult) return;
        if (!global.TrilinguoAPI.isLoggedIn()) {
          openAuthModal();
          showToast('Vui lòng đăng nhập để lưu từ vào Sổ tay cá nhân!', 'error');
          return;
        }
        try {
          await global.TrilinguoAPI.saveToNotebook({
            sourceText: lastTranslationResult.sourceText,
            targetText: lastTranslationResult.translatedText,
            hmn: lastTranslationResult.hmnText,
            vi: lastTranslationResult.viText,
            en: lastTranslationResult.enText,
            phonetic: lastTranslationResult.phonetic,
            posCode: lastTranslationResult.posCode,
            note: lastTranslationResult.grammarNote
          });
          showToast(`Đã lưu "${lastTranslationResult.sourceText}" vào Sổ tay cá nhân!`, 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    updateCounter();
    performTranslation(false);
    renderTranslationHistorySection();

    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'history') {
      const histSec = document.getElementById('historySection');
      if (histSec) setTimeout(() => histSec.scrollIntoView({ behavior: 'smooth' }), 180);
    }
  }

  async function renderTranslationHistorySection() {
    const grid = document.getElementById('historyCardsGrid');
    if (!grid) return;

    if (!global.TrilinguoAPI.isLoggedIn()) {
      grid.innerHTML = '';
      return;
    }

    const clearAllBtn = document.getElementById('clearHistoryBtn');
    if (clearAllBtn && !clearAllBtn.dataset.bound) {
      clearAllBtn.dataset.bound = '1';
      clearAllBtn.addEventListener('click', async () => {
        try {
          await global.TrilinguoAPI.clearTranslationHistory();
          await renderTranslationHistorySection();
          showToast('Đã xóa lịch sử dịch thuật của khối ngôn ngữ này.', 'info');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    try {
      cachedHistoryItems = await global.TrilinguoAPI.getTranslationHistory();
    } catch (err) {
      cachedHistoryItems = [];
    }

    if (cachedHistoryItems.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);font-weight:700;" data-i18n="hist_empty">${global.TrilinguoI18n.t('hist_empty')}</div>`;
      return;
    }

    grid.innerHTML = cachedHistoryItems
      .map(
        item => `
        <article class="card-3d selectable-zone">
          <div>
            <div class="card-3d__top">
              <span class="card-3d__category">${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()}</span>
              <span class="card-3d__pos">${item.posCode || '(nth) nthe'}</span>
            </div>
            <div style="margin-top:0.65rem;">
              <div class="card-3d__source-label">Văn bản gốc (Bôi đen để tra từ):</div>
              <div class="card-3d__source selectable-text">${item.sourceText}</div>
            </div>
            <div style="margin-top:0.55rem;">
              <div class="card-3d__target-label">Bản dịch:</div>
              <div class="card-3d__target selectable-text">${item.translatedText}</div>
            </div>
            ${
              item.phonetic
                ? `<div class="card-3d__phonetics" style="margin-top:0.35rem;">🔊 /${item.phonetic}/</div>`
                : ''
            }
          </div>
          <div class="card-3d__footer">
            <button type="button" class="listen-btn" data-speak-text="${encodeURIComponent(item.hmnText || item.translatedText)}" data-speak-lang="hmn" style="padding:0.38rem 0.75rem;font-size:0.78rem;">🔊 Nghe</button>
            <button type="button" class="btn-save-notebook" data-quick-save-hist="${item.id}" style="padding:0.42rem 0.8rem;font-size:0.78rem;">＋ Lưu vào Sổ tay</button>
          </div>
        </article>
      `
      )
      .join('');

    grid.querySelectorAll('[data-speak-text]').forEach(btn => {
      btn.addEventListener('click', () => {
        speakText(decodeURIComponent(btn.getAttribute('data-speak-text')), btn.getAttribute('data-speak-lang'));
      });
    });

    grid.querySelectorAll('[data-quick-save-hist]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-quick-save-hist'));
        const found = cachedHistoryItems.find(h => Number(h.id) === id);
        if (!found) return;
        try {
          await global.TrilinguoAPI.saveToNotebook(found);
          showToast(`Đã lưu "${found.sourceText}" vào Sổ tay!`, 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  /**
   * 8. COMMONLY USED PHRASES PAGE CONTROLLER (phrase.html)
   */
  function initPhrasesPage() {
    const grid = document.getElementById('phrasesCardsGrid');
    if (!grid) return;

    const searchInput = document.getElementById('phraseSearchInput');
    const categoryBtns = document.querySelectorAll('[data-phrase-cat]');

    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPhraseCategory = btn.getAttribute('data-phrase-cat');
        renderPhraseCards();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => renderPhraseCards());
    }

    renderPhraseCards();
  }

  async function renderPhraseCards() {
    const grid = document.getElementById('phrasesCardsGrid');
    if (!grid) return;

    const user = global.TrilinguoAPI.getCurrentUser();
    const nativeLang = user ? user.nativeLang : 'vi';
    const targetLang = user ? user.targetLang : 'hmn';

    const searchInput = document.getElementById('phraseSearchInput');
    const query = searchInput ? (searchInput.value || '').trim() : '';

    try {
      cachedPhrases = await global.TrilinguoAPI.fetchCommonPhrases({
        category: currentPhraseCategory,
        q: query
      });
    } catch (e) {
      cachedPhrases = global.TrilinguoData.COMMON_PHRASES.filter(p => {
        const catMatch = currentPhraseCategory === 'all' || p.category === currentPhraseCategory;
        const qLow = query.toLowerCase();
        const textMatch =
          !qLow ||
          p.hmn.toLowerCase().includes(qLow) ||
          p.vi.toLowerCase().includes(qLow) ||
          p.en.toLowerCase().includes(qLow);
        return catMatch && textMatch;
      });
    }

    const nLabel = global.TrilinguoI18n.getLanguageLabel(nativeLang, true);
    const tLabel = global.TrilinguoI18n.getLanguageLabel(targetLang, true);

    grid.innerHTML = cachedPhrases
      .map(p => {
        const sourceSentence = p.source_text || p[nativeLang] || p.vi;
        const targetSentence = p.target_text || p[targetLang] || p.hmn;
        return `
          <article class="card-3d selectable-zone">
            <div>
              <div class="card-3d__top">
                <span class="card-3d__category">${global.TrilinguoI18n.t('cat_' + p.category)}</span>
                <span class="card-3d__pos">(nth) nthe</span>
              </div>

              <div style="margin-top:0.75rem;">
                <div class="card-3d__source-label">${global.TrilinguoI18n.t('card_source_label')} (${nLabel})</div>
                <div class="card-3d__source selectable-text">${sourceSentence}</div>
              </div>

              <div style="margin-top:0.65rem;">
                <div class="card-3d__target-label">${global.TrilinguoI18n.t('card_target_label')} (${tLabel})</div>
                <div class="card-3d__target selectable-text">${targetSentence}</div>
              </div>

              <div class="card-3d__phonetics" style="margin-top:0.4rem;">
                🔊 RPA: /${p.phonetic}/
              </div>
              <div style="font-size:0.76rem;color:var(--text-muted);margin-top:0.3rem;">
                💡 ${p.note}
              </div>
            </div>

            <div class="card-3d__footer">
              <button type="button" class="listen-btn" data-phrase-speak="${encodeURIComponent(p.hmn)}" style="padding:0.4rem 0.78rem;font-size:0.8rem;">
                🔊 Nghe tiếng Hmong
              </button>
              <button type="button" class="btn-save-notebook" data-phrase-save="${p.id}" style="padding:0.44rem 0.85rem;font-size:0.8rem;">
                ＋ Lưu vào Sổ tay
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    grid.querySelectorAll('[data-phrase-speak]').forEach(btn => {
      btn.addEventListener('click', () => {
        speakText(decodeURIComponent(btn.getAttribute('data-phrase-speak')), 'hmn');
      });
    });

    grid.querySelectorAll('[data-phrase-save]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!global.TrilinguoAPI.isLoggedIn()) {
          openAuthModal();
          showToast('Vui lòng đăng nhập để lưu mẫu câu vào Sổ tay cá nhân!', 'error');
          return;
        }
        const pid = btn.getAttribute('data-phrase-save');
        const phraseObj = cachedPhrases.find(x => x.id === pid);
        if (!phraseObj) return;
        try {
          await global.TrilinguoAPI.saveToNotebook(phraseObj);
          showToast('Đã lưu mẫu câu vào Sổ tay cá nhân!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  /**
   * 9. PERSONAL NOTEBOOK PAGE CONTROLLER (vocabulary.html)
   */
  function initNotebookPage() {
    const grid = document.getElementById('notebookCardsGrid');
    if (!grid) return;

    if (!global.TrilinguoAPI.isLoggedIn()) {
      openAuthModal();
    }

    const selectAllBtn = document.getElementById('nbSelectAllBtn');
    const createFlashcardBtn = document.getElementById('nbCreateFlashcardBtn');
    const createQuizBtn = document.getElementById('nbCreateQuizBtn');

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        if (selectedNotebookIds.size === cachedNotebookWords.length && cachedNotebookWords.length > 0) {
          selectedNotebookIds.clear();
        } else {
          cachedNotebookWords.forEach(w => selectedNotebookIds.add(w.id));
        }
        renderNotebookCardsDOM();
      });
    }

    if (createFlashcardBtn) {
      createFlashcardBtn.addEventListener('click', async () => {
        if (selectedNotebookIds.size < 4) {
          showToast(global.TrilinguoI18n.t('nb_err_flashcard_min'), 'error');
          return;
        }
        try {
          const res = await global.TrilinguoAPI.generateFlashcards(Array.from(selectedNotebookIds));
          const cards = (res.cards || []).map(w => ({
            id: w.id,
            sourceText: w.source_text,
            targetText: w.target_text,
            hmnText: w.hmn_text,
            viText: w.vi_text,
            enText: w.en_text,
            phonetic: w.phonetic,
            posCode: w.pos_code,
            exampleSentence: w.example_sentence,
            remembered: w.remembered
          }));
          openFlashcardModalWithWords(cards);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    if (createQuizBtn) {
      createQuizBtn.addEventListener('click', () => {
        if (selectedNotebookIds.size < 10) {
          showToast(global.TrilinguoI18n.t('nb_err_quiz_min'), 'error');
          return;
        }
        sessionStorage.setItem(
          SELECTED_WORDS_SESSION_KEY,
          JSON.stringify(Array.from(selectedNotebookIds))
        );
        window.location.href = 'quiz.html';
      });
    }

    renderNotebookCards();
  }

  async function renderNotebookCards() {
    const grid = document.getElementById('notebookCardsGrid');
    if (!grid) return;

    if (!global.TrilinguoAPI.isLoggedIn()) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;font-weight:700;">Vui lòng <a href="#login" data-open-auth style="color:var(--color-main-orange);text-decoration:underline;">Đăng nhập</a> để xem và quản lý Sổ tay cá nhân của bạn.</div>`;
      grid.querySelectorAll('[data-open-auth]').forEach(el => el.addEventListener('click', openAuthModal));
      return;
    }

    try {
      cachedNotebookWords = await global.TrilinguoAPI.getNotebookWords();
      renderNotebookCardsDOM();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderNotebookCardsDOM() {
    const grid = document.getElementById('notebookCardsGrid');
    if (!grid) return;

    const countBadge = document.getElementById('nbSelectedCountBadge');
    if (countBadge) {
      countBadge.textContent = `${selectedNotebookIds.size} / ${cachedNotebookWords.length}`;
    }

    grid.innerHTML = cachedNotebookWords
      .map(w => {
        const isChecked = selectedNotebookIds.has(w.id);
        const attempts = Number(w.quiz_attempts || 0);
        const correct = Number(w.quiz_correct || 0);
        const acc = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
        const isMastered = Boolean(w.isMastered || (attempts >= 10 && correct / attempts > 0.8));

        return `
          <article class="card-3d ${isChecked ? 'is-selected' : ''}" data-nb-card="${w.id}">
            <div>
              <div class="card-3d__top">
                <label class="notebook-checkbox-wrap">
                  <input type="checkbox" class="notebook-checkbox" data-nb-check="${w.id}" ${isChecked ? 'checked' : ''} />
                  <span>Chọn học</span>
                </label>
                <span class="mastery-pill ${isMastered ? 'is-mastered' : ''}">
                  ${isMastered ? global.TrilinguoI18n.t('nb_mastered_badge') : `Quiz: ${correct}/${attempts} (${acc}%)`}
                </span>
              </div>

              <div style="margin-top:0.75rem;">
                <div class="card-3d__source-label">Từ / Câu gốc ("Tôi là"):</div>
                <div class="card-3d__source">${w.sourceText}</div>
              </div>

              <div style="margin-top:0.55rem;">
                <div class="card-3d__target-label">Nghĩa đang học ("Tôi muốn học"):</div>
                <div class="card-3d__target">${w.targetText}</div>
              </div>

              <div class="card-3d__phonetics" style="margin-top:0.35rem;">
                🔊 /${w.phonetic || ''}/ · <span style="color:var(--color-main-orange);font-weight:700;">${w.posCode || '(y) yam'}</span>
              </div>

              ${
                w.exampleSentence
                  ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.35rem;background:var(--surface-muted);padding:0.45rem 0.65rem;border-radius:10px;">📌 ${w.exampleSentence}</div>`
                  : ''
              }
            </div>

            <div class="card-3d__footer">
              <button type="button" class="listen-btn" data-nb-speak="${encodeURIComponent(w.hmnText || w.targetText)}" style="padding:0.38rem 0.75rem;font-size:0.78rem;">
                🔊 Phát âm
              </button>
              <button type="button" class="clear-text-btn" data-nb-delete="${w.id}">
                🗑️ Xóa
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    grid.querySelectorAll('[data-nb-check]').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = Number(chk.getAttribute('data-nb-check'));
        if (chk.checked) selectedNotebookIds.add(id);
        else selectedNotebookIds.delete(id);
        renderNotebookCardsDOM();
      });
    });

    grid.querySelectorAll('[data-nb-speak]').forEach(btn => {
      btn.addEventListener('click', () => {
        speakText(decodeURIComponent(btn.getAttribute('data-nb-speak')), 'hmn');
      });
    });

    grid.querySelectorAll('[data-nb-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-nb-delete'));
        try {
          await global.TrilinguoAPI.removeFromNotebook(id);
          selectedNotebookIds.delete(id);
          await renderNotebookCards();
          showToast('Đã xóa từ vựng khỏi Sổ tay cá nhân.', 'info');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  /**
   * 10. 3D FLASHCARD MODAL CONTROLLER
   */
  function openFlashcardModalWithWords(words) {
    flashcardDeck = words;
    flashcardIndex = 0;
    const backdrop = document.getElementById('flashcardModalBackdrop');
    if (backdrop) backdrop.classList.add('is-open');
    renderCurrentFlashcard();
  }

  function renderCurrentFlashcard() {
    if (!flashcardDeck.length) return;
    const card = flashcardDeck[flashcardIndex];
    const box = document.getElementById('flashcard3dBox');
    if (box) box.classList.remove('is-flipped');

    document.getElementById('flashcardCounterText').textContent = `Thẻ ${flashcardIndex + 1} / ${flashcardDeck.length}`;
    document.getElementById('fcFrontPos').textContent = card.posCode || '(nth) nthe';
    document.getElementById('fcFrontWord').textContent = card.targetText;
    document.getElementById('fcFrontPhonetic').textContent = `🔊 /${card.phonetic || ''}/`;
    document.getElementById('fcBackMeaning').textContent = card.sourceText;
    document.getElementById('fcBackTri').textContent = `HMN: ${card.hmnText} · VI: ${card.viText} · EN: ${card.enText}`;
    document.getElementById('fcBackExample').textContent = card.exampleSentence || card.targetText;

    const remBtn = document.getElementById('fcMarkRememberedBtn');
    if (remBtn) {
      remBtn.textContent = card.remembered ? '⭐ Đã nhớ từ này!' : '✓ Đánh dấu đã nhớ';
    }
  }

  function bindFlashcardModalEvents() {
    const backdrop = document.getElementById('flashcardModalBackdrop');
    const closeBtn = document.getElementById('closeFlashcardModalBtn');
    const box = document.getElementById('flashcard3dBox');
    const prevBtn = document.getElementById('fcPrevBtn');
    const nextBtn = document.getElementById('fcNextBtn');
    const listenBtn = document.getElementById('fcListenBtn');
    const remBtn = document.getElementById('fcMarkRememberedBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (backdrop) backdrop.classList.remove('is-open');
      });
    }
    if (box) {
      box.addEventListener('click', e => {
        if (e.target.closest('#fcListenBtn')) return;
        box.classList.toggle('is-flipped');
      });
    }
    if (listenBtn) {
      listenBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (flashcardDeck[flashcardIndex]) {
          speakText(
            flashcardDeck[flashcardIndex].hmnText || flashcardDeck[flashcardIndex].targetText,
            'hmn'
          );
        }
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (!flashcardDeck.length) return;
        flashcardIndex = (flashcardIndex - 1 + flashcardDeck.length) % flashcardDeck.length;
        renderCurrentFlashcard();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!flashcardDeck.length) return;
        flashcardIndex = (flashcardIndex + 1) % flashcardDeck.length;
        renderCurrentFlashcard();
      });
    }
    if (remBtn) {
      remBtn.addEventListener('click', async () => {
        const current = flashcardDeck[flashcardIndex];
        if (!current) return;
        try {
          const updated = await global.TrilinguoAPI.toggleNotebookRemembered(current.id);
          if (updated) {
            flashcardDeck[flashcardIndex] = updated;
            renderCurrentFlashcard();
            showToast('Đã cập nhật trạng thái ghi nhớ Flashcard!', 'success');
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }

  /**
   * 11. QUIZZES PAGE CONTROLLER (quiz.html)
   */
  async function initQuizPage() {
    const quizContainer = document.getElementById('quizQuestionsContainer');
    if (!quizContainer) return;

    if (!global.TrilinguoAPI.isLoggedIn()) {
      openAuthModal();
      return;
    }

    let chosenIds = [];
    try {
      chosenIds = JSON.parse(sessionStorage.getItem(SELECTED_WORDS_SESSION_KEY) || '[]');
    } catch (e) {
      chosenIds = [];
    }

    if (chosenIds.length < 10) {
      const allWords = await global.TrilinguoAPI.getNotebookWords();
      chosenIds = allWords.slice(0, 10).map(w => w.id);
    }

    try {
      const res = await global.TrilinguoAPI.generateQuizQuestions(chosenIds);
      activeQuizAnswers = {};
      activeQuizQuestions = (res.questions || []).map(q => ({
        index: q.index,
        wordId: q.word_id,
        promptText: q.prompt_text,
        phonetic: q.phonetic,
        correctAnswer: q.correct_answer,
        options: q.options
      }));
      renderQuizQuestions();
    } catch (err) {
      showToast(err.message, 'error');
    }

    const submitQuizBtn = document.getElementById('submitQuizAnswersBtn');
    if (submitQuizBtn) {
      submitQuizBtn.addEventListener('click', async () => {
        if (Object.keys(activeQuizAnswers).length < activeQuizQuestions.length) {
          showToast('⚠️ Vui lòng chọn đáp án cho tất cả các câu hỏi trước khi nộp bài!', 'error');
          return;
        }

        const results = activeQuizQuestions.map(q => ({
          wordId: q.wordId,
          selectedAnswer: activeQuizAnswers[q.wordId],
          isCorrect: activeQuizAnswers[q.wordId] === q.correctAnswer
        }));

        try {
          const summary = await global.TrilinguoAPI.recordQuizSubmission(results);

          document.querySelectorAll('[data-quiz-q]').forEach(qEl => {
            const wordId = Number(qEl.getAttribute('data-quiz-q'));
            const questionObj = activeQuizQuestions.find(x => Number(x.wordId) === wordId);
            qEl.querySelectorAll('.quiz-option-btn').forEach(optBtn => {
              const val = optBtn.getAttribute('data-opt-val');
              if (val === questionObj.correctAnswer) {
                optBtn.classList.add('is-correct');
              } else if (val === activeQuizAnswers[wordId]) {
                optBtn.classList.add('is-wrong');
              }
              optBtn.disabled = true;
            });
          });

          const banner = document.getElementById('quizResultBanner');
          if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = `
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
                <div style="display:flex;align-items:center;gap:0.9rem;flex-wrap:wrap;">
                  <img src="assets/images/mascot/11.svg" alt="Cheering Mascot" style="width:64px;height:64px;object-fit:contain;" />
                  <div>
                    <h3 style="font-size:1.25rem;font-weight:900;color:var(--color-element-forest);">
                      🎉 Hoàn thành Quiz: Đúng ${summary.correctCount} / ${summary.totalQuestions} câu (${Math.round((summary.correctCount / summary.totalQuestions) * 100)}%)!
                    </h3>
                    <p style="font-size:0.86rem;font-weight:700;color:var(--text-secondary);">
                      Đã cập nhật Database: Số từ thành thạo (Mastered): <strong>${summary.metrics.masteredWords}</strong> · Độ chính xác toàn khối: <strong>${summary.metrics.accuracyPercent}%</strong>.
                    </p>
                  </div>
                </div>
                <a href="profile.html" class="btn-tool btn-tool--flashcard">Xem Tiến Trình Học Tập →</a>
              </div>
            `;
            banner.scrollIntoView({ behavior: 'smooth' });
          }

          showToast(
            `Đã lưu kết quả Quiz vào Database! Đúng ${summary.correctCount}/${summary.totalQuestions} câu.`,
            'success'
          );
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }

  function renderQuizQuestions() {
    const quizContainer = document.getElementById('quizQuestionsContainer');
    if (!quizContainer) return;

    quizContainer.innerHTML = activeQuizQuestions
      .map(
        q => `
        <div class="quiz-question-card" data-quiz-q="${q.wordId}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
            <span class="card-3d__category">Câu ${q.index} / ${activeQuizQuestions.length}</span>
            <span class="card-3d__phonetics">🔊 /${q.phonetic || ''}/</span>
          </div>
          <div style="font-size:clamp(1.1rem,1.6vw,1.35rem);font-weight:800;color:var(--text-heading);margin-top:0.65rem;">
            Nghĩa của từ/câu: <span style="color:var(--color-main-orange);">"${q.promptText}"</span> là gì?
          </div>
          <div class="quiz-options-grid">
            ${q.options
              .map(
                opt => `
                <button type="button" class="quiz-option-btn" data-q-id="${q.wordId}" data-opt-val="${opt.replace(/"/g, '&quot;')}">
                  ${opt}
                </button>
              `
              )
              .join('')}
          </div>
        </div>
      `
      )
      .join('');

    quizContainer.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const wordId = Number(btn.getAttribute('data-q-id'));
        const val = btn.getAttribute('data-opt-val');
        activeQuizAnswers[wordId] = val;
        const parent = btn.closest('[data-quiz-q]');
        parent.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('is-chosen'));
        btn.classList.add('is-chosen');
      });
    });
  }

  /**
   * 12. ACCOUNT PROFILE & REAL-TIME PROGRESS DASHBOARD (profile.html)
   */
  function initProfilePage() {
    const form = document.getElementById('profileEditForm');
    if (!form) return;

    if (!global.TrilinguoAPI.isLoggedIn()) {
      openAuthModal();
    }

    renderProfileAndMetrics();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const accountName = document.getElementById('profNameInput').value;
        const email = document.getElementById('profEmailInput').value;
        const phone = document.getElementById('profPhoneInput').value;
        const nativeLang = document.getElementById('profNativeLangSelect').value;
        const targetLang = document.getElementById('profTargetLangSelect').value;

        await global.TrilinguoAPI.updateUserProfile({
          accountName,
          email,
          phone,
          nativeLang,
          targetLang
        });

        renderHeaderState();
        await renderProfileAndMetrics();
        showToast('Đã lưu thông tin cá nhân & cập nhật Khối ngôn ngữ học tập!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    const logoutBtn = document.getElementById('profLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        global.TrilinguoAPI.signOut();
        showToast('Đã đăng xuất tài khoản.', 'info');
        window.location.href = 'index.html';
      });
    }
  }

  async function renderProfileAndMetrics() {
    const form = document.getElementById('profileEditForm');
    if (!form) return;

    const user = global.TrilinguoAPI.getCurrentUser();
    if (!user) return;

    document.getElementById('profNameInput').value = user.accountName || '';
    document.getElementById('profEmailInput').value = user.email || '';
    document.getElementById('profPhoneInput').value = user.phone || '';
    document.getElementById('profNativeLangSelect').value = user.nativeLang || 'vi';
    document.getElementById('profTargetLangSelect').value = user.targetLang || 'hmn';

    try {
      const metrics = await global.TrilinguoAPI.computeBlockMetrics();
      const m1 = document.getElementById('metricTotalWordsVal');
      const m2 = document.getElementById('metricMasteredWordsVal');
      const m3 = document.getElementById('metricQuizAccuracyVal');
      const m3Detail = document.getElementById('metricQuizAccuracyDetail');
      const activeBlockBadge = document.getElementById('profileActiveBlockBadge');

      if (m1) m1.textContent = metrics.totalNotebookWords;
      if (m2) m2.textContent = metrics.masteredWords;
      if (m3) m3.textContent = `${metrics.accuracyPercent}%`;
      if (m3Detail) {
        m3Detail.textContent = `${metrics.totalCorrect} câu đúng / ${metrics.totalQuestions} câu quiz đã tạo`;
      }
      if (activeBlockBadge) {
        const nLabel = global.TrilinguoI18n.getLanguageLabel(metrics.nativeLang, true);
        const tLabel = global.TrilinguoI18n.getLanguageLabel(metrics.targetLang, true);
        activeBlockBadge.textContent = `Khối: ${nLabel} → ${tLabel}`;
      }
    } catch (err) {
      console.warn('Metrics load warning:', err.message);
    }
  }

  async function refreshActivePageData() {
    await renderTranslationHistorySection();
    await renderPhraseCards();
    await renderNotebookCards();
    await renderProfileAndMetrics();
  }

  /**
   * 13. BOOTSTRAP APPLICATION ON DOM READY
   */
  async function initApp() {
    injectSharedBackground();
    initTheme();
    injectModalsAndPopover();

    // Check for OAuth2 callback token (?auth_token=...) or refresh active JWT session
    try {
      await global.TrilinguoAPI.handleOAuthRedirectTokenIfPresent();
      if (global.TrilinguoAPI.isLoggedIn()) {
        await global.TrilinguoAPI.fetchCurrentUser();
      }
    } catch (e) {
      console.warn('Auth session sync notice:', e.message);
    }

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    document.querySelectorAll('.lang-switcher__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        global.TrilinguoI18n.setDisplayLanguage(lang);
        renderHeaderState();
        refreshActivePageData();
      });
    });

    const burgerBtn = document.getElementById('mobileBurgerBtn');
    const mainNav = document.getElementById('mainPostLoginNav');
    if (burgerBtn && mainNav) {
      burgerBtn.addEventListener('click', () => {
        burgerBtn.classList.toggle('is-open');
        mainNav.classList.toggle('is-mobile-open');
      });
    }

    global.TrilinguoI18n.applyTranslations();
    renderHeaderState();

    initTranslatorPage();
    initPhrasesPage();
    initNotebookPage();
    initQuizPage();
    initProfilePage();
  }

  document.addEventListener('DOMContentLoaded', initApp);

  global.TrilinguoApp = {
    openAuthModal,
    speakText,
    showToast,
    refreshActivePageData
  };
})(window);
