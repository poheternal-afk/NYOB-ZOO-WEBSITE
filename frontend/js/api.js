/**
 * ============================================================================
 * TRILINGUO / NYOB ZOO — CENTRALIZED BACKEND API CLIENT (js/api.js)
 * Connects Frontend to FastAPI Production Backend (http://localhost:8000/api/...)
 * - Automatically attaches Authorization: Bearer <jwt_token> header
 * - Handles Google OAuth2, Facebook Graph API, Real Gmail SMTP / SMS OTP
 * - Automatically switches display language to user's "Tôi là:" (native_lang)
 * ============================================================================
 */

(function (global) {
  'use strict';

  const API_BASE_URL =
    (global.TRILINGUO_API_BASE_URL ||
      (window.location.port === '8000'
        ? `${window.location.origin}/api`
        : 'http://localhost:8000/api')).replace(/\/+$/, '');

  const TOKEN_STORAGE_KEY = 'trilinguo_jwt_token';
  const USER_CACHE_KEY = 'trilinguo_auth_user';

  function getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  }

  function setSession(token, userObj) {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
    if (userObj) {
      const normalized = normalizeUserObject(userObj);
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(normalized));
      // Immediately switch display language to user's "Tôi là:" (nativeLang)
      if (global.TrilinguoI18n && normalized.nativeLang) {
        global.TrilinguoI18n.setDisplayLanguage(normalized.nativeLang);
      }
      window.dispatchEvent(new CustomEvent('trilinguo:authchange', { detail: { user: normalized } }));
      return normalized;
    }
    return null;
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    window.dispatchEvent(new CustomEvent('trilinguo:authchange', { detail: { user: null } }));
  }

  function normalizeUserObject(u) {
    if (!u) return null;
    const nativeLang = u.native_lang || u.nativeLang || 'vi';
    const targetLang = u.target_lang || u.targetLang || 'hmn';
    return {
      id: u.id,
      accountName: u.account_name || u.accountName || 'User',
      email: u.email || '',
      phone: u.phone || '',
      avatarUrl: u.avatar_url || u.avatarUrl || '',
      authProvider: u.auth_provider || u.authProvider || 'email',
      nativeLang,
      targetLang,
      acceptedTerms: Boolean(u.accepted_terms ?? u.acceptedTerms ?? true),
      learningBlock: u.learning_block || u.learningBlock || `${nativeLang}_${targetLang}`
    };
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function isLoggedIn() {
    return Boolean(getToken() && getCurrentUser());
  }

  function makeBlockKey(nativeLang, targetLang) {
    const n = nativeLang || 'vi';
    const t = targetLang || (n === 'hmn' ? 'vi' : 'hmn');
    return `${n}_${t}`;
  }

  function getActiveBlockKey() {
    const u = getCurrentUser();
    if (!u) return 'hmn_en';
    return u.learningBlock || makeBlockKey(u.nativeLang, u.targetLang);
  }

  /**
   * Core centralized fetch() wrapper with automatic JWT Bearer token injection
   */
  async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers
      });
    } catch (networkErr) {
      throw new Error(
        'Không thể kết nối tới Python Backend (http://localhost:8000). Hãy chắc chắn bạn đã bật server bằng lệnh: uvicorn main:app --reload'
      );
    }

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const txt = await response.text();
      data = { detail: txt };
    }

    if (!response.ok) {
      if (response.status === 401 && token && !endpoint.includes('/auth/')) {
        clearSession();
      }
      const errMsg =
        (data && (data.detail || data.message)) ||
        `Lỗi API (${response.status}): Yêu cầu không thành công.`;
      throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    }

    return data;
  }

  /**
   * Check URL query parameters for ?auth_token=... returned by Google/Facebook OAuth2 Callback
   */
  async function handleOAuthRedirectTokenIfPresent() {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('auth_token');
    if (!urlToken) return null;

    localStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
    // Clean URL query param
    params.delete('auth_token');
    const cleanSearch = params.toString();
    const newUrl =
      window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);

    try {
      const me = await apiRequest('/auth/me', { method: 'GET' });
      return setSession(urlToken, me);
    } catch (e) {
      clearSession();
      throw e;
    }
  }

  /**
   * 1. AUTHENTICATION, OAUTH2 & REAL OTP API METHODS
   */
  async function sendOtpCode({ channel = 'email', identifier, purpose = 'login' }) {
    const cleanId = (identifier || '').trim();
    const detectedChannel = cleanId.includes('@') ? 'email' : channel || 'phone';
    return await apiRequest('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({
        identifier: cleanId,
        channel: detectedChannel,
        purpose
      })
    });
  }

  async function verifyOtpAndLogin({
    channel = 'email',
    identifier,
    otpCode,
    accountName,
    password,
    nativeLang,
    targetLang,
    agreedTerms
  }) {
    const cleanId = (identifier || '').trim();
    const res = await apiRequest('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        identifier: cleanId,
        channel: cleanId.includes('@') ? 'email' : channel,
        otp_code: (otpCode || '').trim(),
        account_name: accountName || null,
        password: password || null,
        native_lang: nativeLang || 'vi',
        target_lang: targetLang || 'hmn',
        accepted_terms: Boolean(agreedTerms)
      })
    });
    return setSession(res.access_token, res.user);
  }

  async function loginWithPassword({ identifier, password, nativeLang, targetLang }) {
    const res = await apiRequest('/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({
        identifier: (identifier || '').trim(),
        password,
        native_lang: nativeLang || null,
        target_lang: targetLang || null,
        accepted_terms: true
      })
    });
    return setSession(res.access_token, res.user);
  }

  async function startGoogleOAuthRedirect(nativeLang = 'vi', targetLang = 'hmn') {
    const data = await apiRequest(
      `/auth/google/login?native_lang=${encodeURIComponent(nativeLang)}&target_lang=${encodeURIComponent(targetLang)}`,
      { method: 'GET' }
    );
    if (data && data.auth_url) {
      window.location.href = data.auth_url;
    }
  }

  async function verifyGoogleOAuthToken({ idToken, accessToken, nativeLang, targetLang, agreedTerms }) {
    const res = await apiRequest('/auth/google/token', {
      method: 'POST',
      body: JSON.stringify({
        id_token: idToken || null,
        access_token: accessToken || null,
        native_lang: nativeLang || 'vi',
        target_lang: targetLang || 'hmn',
        accepted_terms: Boolean(agreedTerms)
      })
    });
    return setSession(res.access_token, res.user);
  }

  async function startFacebookOAuthRedirect(nativeLang = 'vi', targetLang = 'hmn') {
    const data = await apiRequest(
      `/auth/facebook/login?native_lang=${encodeURIComponent(nativeLang)}&target_lang=${encodeURIComponent(targetLang)}`,
      { method: 'GET' }
    );
    if (data && data.auth_url) {
      window.location.href = data.auth_url;
    }
  }

  async function verifyFacebookOAuthToken({ accessToken, nativeLang, targetLang, agreedTerms }) {
    const res = await apiRequest('/auth/facebook/token', {
      method: 'POST',
      body: JSON.stringify({
        access_token: accessToken,
        native_lang: nativeLang || 'vi',
        target_lang: targetLang || 'hmn',
        accepted_terms: Boolean(agreedTerms)
      })
    });
    return setSession(res.access_token, res.user);
  }

  async function resetPasswordWithOtp({ identifier, otpCode, newPassword }) {
    return await apiRequest('/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({
        identifier: (identifier || '').trim(),
        otp_code: (otpCode || '').trim(),
        new_password: newPassword
      })
    });
  }

  async function fetchCurrentUser() {
    if (!getToken()) return null;
    try {
      const me = await apiRequest('/auth/me', { method: 'GET' });
      return setSession(getToken(), me);
    } catch (e) {
      return getCurrentUser();
    }
  }

  function signOut() {
    clearSession();
  }

  /**
   * 2. TRANSLATOR & TRANSLATION HISTORY API METHODS
   */
  async function translateViaBackend({ text, sourceLang, targetLang, saveHistory = true }) {
    return await apiRequest('/translate', {
      method: 'POST',
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
        save_history: Boolean(saveHistory)
      })
    });
  }

  async function getTranslationHistory(blockKey) {
    if (!isLoggedIn()) return [];
    const query = blockKey ? `?block_key=${encodeURIComponent(blockKey)}` : '';
    const items = await apiRequest(`/translate/history${query}`, { method: 'GET' });
    return (items || []).map(item => ({
      id: item.id,
      blockKey: item.block_key,
      sourceLang: item.source_lang,
      targetLang: item.target_lang,
      sourceText: item.source_text,
      translatedText: item.translated_text,
      hmnText: item.hmn_text,
      viText: item.vi_text,
      enText: item.en_text,
      phonetic: item.phonetic,
      posCode: item.pos_code,
      grammarNote: item.grammar_note,
      createdAt: item.created_at
    }));
  }

  async function clearTranslationHistory(blockKey) {
    if (!isLoggedIn()) return;
    const query = blockKey ? `?block_key=${encodeURIComponent(blockKey)}` : '';
    return await apiRequest(`/translate/history${query}`, { method: 'DELETE' });
  }

  /**
   * 3. COMMONLY USED PHRASES API METHODS
   */
  async function fetchCommonPhrases({ category = 'all', q = '' } = {}) {
    const user = getCurrentUser();
    const nLang = user ? user.nativeLang : 'vi';
    const tLang = user ? user.targetLang : 'hmn';
    const params = new URLSearchParams({
      category,
      q,
      native_lang: nLang,
      target_lang: tLang
    });
    const res = await apiRequest(`/phrases?${params.toString()}`, { method: 'GET' });
    return res.items || [];
  }

  /**
   * 4. PERSONAL NOTEBOOK, FLASHCARDS (>=4) & QUIZZES (>=10) API METHODS
   */
  async function getNotebookWords(blockKey) {
    if (!isLoggedIn()) return [];
    const query = blockKey ? `?block_key=${encodeURIComponent(blockKey)}` : '';
    const items = await apiRequest(`/notebook${query}`, { method: 'GET' });
    return (items || []).map(w => ({
      id: w.id,
      blockKey: w.block_key,
      sourceText: w.source_text,
      targetText: w.target_text,
      hmnText: w.hmn_text,
      viText: w.vi_text,
      enText: w.en_text,
      phonetic: w.phonetic,
      posCode: w.pos_code,
      exampleSentence: w.example_sentence,
      quiz_attempts: w.quiz_attempts,
      quiz_correct: w.quiz_correct,
      remembered: w.remembered,
      isMastered: w.is_mastered,
      createdAt: w.created_at
    }));
  }

  async function saveToNotebook(item) {
    if (!isLoggedIn()) {
      throw new Error('Vui lòng đăng nhập tài khoản để lưu từ vựng vào Sổ tay cá nhân!');
    }
    const user = getCurrentUser();
    const nLang = user ? user.nativeLang : 'vi';
    const tLang = user ? user.targetLang : 'hmn';

    const sourceText = item[nLang] || item.sourceText || item.original || item.vi || item.source_text;
    const targetText = item[tLang] || item.targetText || item.hmn || item.target_text;

    const saved = await apiRequest('/notebook', {
      method: 'POST',
      body: JSON.stringify({
        source_text: sourceText,
        target_text: targetText,
        hmn_text: item.hmn || item.hmnText || targetText,
        vi_text: item.vi || item.viText || sourceText,
        en_text: item.en || item.enText || '',
        phonetic: item.phonetic || '',
        pos_code: item.posCode || item.pos_code || '(nth) nthe',
        example_sentence:
          item.exampleHmn && item.exampleVi
            ? `${item.exampleHmn} — ${item.exampleVi}`
            : item.exampleSentence || item.note || ''
      })
    });
    return { word: saved, isNew: true };
  }

  async function toggleNotebookRemembered(wordId) {
    const updated = await apiRequest(`/notebook/${wordId}/remember`, { method: 'PATCH' });
    return {
      ...updated,
      sourceText: updated.source_text,
      targetText: updated.target_text,
      hmnText: updated.hmn_text,
      viText: updated.vi_text,
      enText: updated.en_text,
      posCode: updated.pos_code,
      exampleSentence: updated.example_sentence
    };
  }

  async function removeFromNotebook(wordId) {
    return await apiRequest(`/notebook/${wordId}`, { method: 'DELETE' });
  }

  async function generateFlashcards(wordIds) {
    return await apiRequest('/notebook/flashcards', {
      method: 'POST',
      body: JSON.stringify({ word_ids: wordIds.map(Number) })
    });
  }

  async function generateQuizQuestions(wordIds) {
    return await apiRequest('/notebook/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ word_ids: wordIds.map(Number) })
    });
  }

  async function recordQuizSubmission(wordResults) {
    const payload = {
      answers: wordResults.map(r => ({
        word_id: Number(r.wordId),
        selected_answer: r.selectedAnswer || '',
        is_correct: Boolean(r.isCorrect)
      }))
    };
    const res = await apiRequest('/notebook/quiz/submit', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return {
      totalQuestions: res.total_questions,
      correctCount: res.correct_count,
      metrics: {
        blockKey: res.metrics.block_key,
        totalNotebookWords: res.metrics.total_notebook_words,
        masteredWords: res.metrics.mastered_words,
        totalQuestions: res.metrics.total_quiz_questions,
        totalCorrect: res.metrics.total_quiz_correct,
        accuracyPercent: res.metrics.quiz_accuracy
      }
    };
  }

  /**
   * 5. PROFILE & REAL-TIME PROGRESS DASHBOARD API METHODS
   */
  async function updateUserProfile({ accountName, email, phone, nativeLang, targetLang }) {
    const res = await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        account_name: accountName,
        email: email || null,
        phone: phone || null,
        native_lang: nativeLang,
        target_lang: targetLang
      })
    });
    const updatedUser = setSession(getToken(), res.user);
    return {
      user: updatedUser,
      metrics: {
        blockKey: res.metrics.block_key,
        nativeLang: res.metrics.native_lang,
        targetLang: res.metrics.target_lang,
        totalNotebookWords: res.metrics.total_notebook_words,
        masteredWords: res.metrics.mastered_words,
        totalQuestions: res.metrics.total_quiz_questions,
        totalCorrect: res.metrics.total_quiz_correct,
        accuracyPercent: res.metrics.quiz_accuracy
      }
    };
  }

  async function computeBlockMetrics(blockKey) {
    if (!isLoggedIn()) {
      return {
        blockKey: 'vi_hmn',
        nativeLang: 'vi',
        targetLang: 'hmn',
        totalNotebookWords: 0,
        masteredWords: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        accuracyPercent: 0
      };
    }
    const query = blockKey ? `?block_key=${encodeURIComponent(blockKey)}` : '';
    const m = await apiRequest(`/profile/progress${query}`, { method: 'GET' });
    return {
      blockKey: m.block_key,
      nativeLang: m.native_lang,
      targetLang: m.target_lang,
      totalNotebookWords: m.total_notebook_words,
      masteredWords: m.mastered_words,
      totalQuestions: m.total_quiz_questions,
      totalCorrect: m.total_quiz_correct,
      accuracyPercent: m.quiz_accuracy
    };
  }

  const clientExport = {
    API_BASE_URL,
    getToken,
    getCurrentUser,
    isLoggedIn,
    makeBlockKey,
    getActiveBlockKey,
    apiRequest,
    handleOAuthRedirectTokenIfPresent,
    sendOtpCode,
    verifyOtpAndLogin,
    loginWithPassword,
    startGoogleOAuthRedirect,
    verifyGoogleOAuthToken,
    startFacebookOAuthRedirect,
    verifyFacebookOAuthToken,
    resetPasswordWithOtp,
    fetchCurrentUser,
    signOut,
    translateViaBackend,
    getTranslationHistory,
    clearTranslationHistory,
    fetchCommonPhrases,
    getNotebookWords,
    saveToNotebook,
    toggleNotebookRemembered,
    removeFromNotebook,
    generateFlashcards,
    generateQuizQuestions,
    recordQuizSubmission,
    updateUserProfile,
    computeBlockMetrics
  };

  global.TrilinguoAPI = clientExport;
  global.TrilinguoDB = clientExport;
})(window);
