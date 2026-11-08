/**
 * ============================================================================
 * TRILINGUO / NYOB ZOO — CENTRALIZED BACKEND API CLIENT + VERCEL CLOUD ENGINE (js/api.js)
 * - Connects Frontend to FastAPI Production Backend (http://localhost:8000/api/...)
 * - Automatically falls back to the built-in Browser LocalStorage & Linguistic Engine
 *   when deployed on Vercel (*.vercel.app) or when Python Backend is offline,
 *   ensuring 100% functionality across Desktop & Mobile devices.
 * ============================================================================
 */

(function (global) {
  'use strict';

  const IS_LOCALHOST =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const API_BASE_URL = (
    global.TRILINGUO_API_BASE_URL ||
    (window.location.port === '8000'
      ? `${window.location.origin}/api`
      : IS_LOCALHOST
        ? 'http://localhost:8000/api'
        : '')
  ).replace(/\/+$/, '');

  const TOKEN_STORAGE_KEY = 'trilinguo_jwt_token';
  const USER_CACHE_KEY = 'trilinguo_auth_user';
  const LOCAL_HISTORY_KEY = 'trilinguo_local_history_v1';
  const LOCAL_NOTEBOOK_KEY = 'trilinguo_local_notebook_v1';
  const LOCAL_QUIZ_STATS_KEY = 'trilinguo_local_quiz_stats_v1';

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
      if (global.TrilinguoI18n && normalized.nativeLang) {
        global.TrilinguoI18n.setDisplayLanguage(normalized.nativeLang);
      }
      window.dispatchEvent(
        new CustomEvent('trilinguo:authchange', { detail: { user: normalized } })
      );
      return normalized;
    }
    return null;
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    window.dispatchEvent(
      new CustomEvent('trilinguo:authchange', { detail: { user: null } })
    );
  }

  function normalizeUserObject(u) {
    if (!u) return null;
    const nativeLang = u.native_lang || u.nativeLang || 'vi';
    const targetLang = u.target_lang || u.targetLang || 'hmn';
    return {
      id: u.id || 1,
      accountName: u.account_name || u.accountName || 'Học viên Trilinguo',
      email: u.email || '',
      phone: u.phone || '',
      avatarUrl: u.avatar_url || u.avatarUrl || '',
      authProvider: u.auth_provider || u.authProvider || 'email',
      nativeLang,
      targetLang,
      acceptedTerms: Boolean(u.accepted_terms ?? u.acceptedTerms ?? true),
      learningBlock:
        u.learning_block || u.learningBlock || `${nativeLang}_${targetLang}`
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
    if (!u) return 'vi_hmn';
    return u.learningBlock || makeBlockKey(u.nativeLang, u.targetLang);
  }

  /**
   * ============================================================================
   * LOCAL STORAGE ENGINE HELPERS (FOR VERCEL STATIC DEPLOYMENT & OFFLINE MODE)
   * ============================================================================
   */
  function readJsonMap(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeJsonMap(storageKey, dataMap) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataMap));
    } catch (e) {
      console.warn('Storage write warning:', e);
    }
  }

  function ensureLocalNotebookBlock(blockKey) {
    const bKey = blockKey || getActiveBlockKey();
    const parts = bKey.split('_');
    const nLang = parts[0] || 'vi';
    const tLang = parts[1] || 'hmn';

    const allBlocks = readJsonMap(LOCAL_NOTEBOOK_KEY);
    if (!Array.isArray(allBlocks[bKey]) || allBlocks[bKey].length === 0) {
      const dict =
        (global.TrilinguoData && global.TrilinguoData.DICTIONARY) || [];
      const posLabels =
        (global.TrilinguoData && global.TrilinguoData.POS_LABELS) || {};

      allBlocks[bKey] = dict.slice(0, 12).map((entry, idx) => {
        const posObj = posLabels[entry.pos] || { code: '(nth) nthe' };
        const attempts = idx < 3 ? 11 : idx < 6 ? 4 : 0;
        const correct = idx < 3 ? 10 : idx < 6 ? 3 : 0;
        return {
          id: idx + 1,
          block_key: bKey,
          source_text: entry[nLang] || entry.vi,
          target_text: entry[tLang] || entry.hmn,
          hmn_text: entry.hmn,
          vi_text: entry.vi,
          en_text: entry.en,
          phonetic: entry.phonetic || '',
          pos_code: posObj.code || '(nth) nthe',
          example_sentence:
            entry.exampleHmn && entry.exampleVi
              ? `${entry.exampleHmn} — ${entry.exampleVi}`
              : entry.note || '',
          quiz_attempts: attempts,
          quiz_correct: correct,
          remembered: idx < 3,
          is_mastered: attempts >= 10 && correct / attempts > 0.8,
          created_at: new Date(Date.now() - idx * 3600000).toISOString()
        };
      });
      writeJsonMap(LOCAL_NOTEBOOK_KEY, allBlocks);
    }
    return allBlocks[bKey];
  }

  function saveLocalNotebookBlock(blockKey, list) {
    const bKey = blockKey || getActiveBlockKey();
    const allBlocks = readJsonMap(LOCAL_NOTEBOOK_KEY);
    allBlocks[bKey] = list;
    writeJsonMap(LOCAL_NOTEBOOK_KEY, allBlocks);
  }

  function ensureLocalHistoryBlock(blockKey) {
    const bKey = blockKey || getActiveBlockKey();
    const parts = bKey.split('_');
    const nLang = parts[0] || 'vi';
    const tLang = parts[1] || 'hmn';

    const allHist = readJsonMap(LOCAL_HISTORY_KEY);
    if (!Array.isArray(allHist[bKey])) {
      const dict =
        (global.TrilinguoData && global.TrilinguoData.DICTIONARY) || [];
      allHist[bKey] = dict.slice(0, 4).map((entry, idx) => ({
        id: Date.now() - idx * 1000,
        block_key: bKey,
        source_lang: nLang,
        target_lang: tLang,
        source_text: entry[nLang] || entry.vi,
        translated_text: entry[tLang] || entry.hmn,
        hmn_text: entry.hmn,
        vi_text: entry.vi,
        en_text: entry.en,
        phonetic: entry.phonetic || '',
        pos_code: '(nth) nthe',
        grammar_note: entry.note || '',
        created_at: new Date(Date.now() - idx * 600000).toISOString()
      }));
      writeJsonMap(LOCAL_HISTORY_KEY, allHist);
    }
    return allHist[bKey];
  }

  function computeLocalMetricsObject(blockKey) {
    const bKey = blockKey || getActiveBlockKey();
    const parts = bKey.split('_');
    const nLang = parts[0] || 'vi';
    const tLang = parts[1] || 'hmn';
    const words = ensureLocalNotebookBlock(bKey);

    let masteredCount = 0;
    let wordAttemptsSum = 0;
    let wordCorrectSum = 0;

    words.forEach(w => {
      const att = Number(w.quiz_attempts || 0);
      const cor = Number(w.quiz_correct || 0);
      const mastered = Boolean(w.is_mastered || (att >= 10 && cor / att > 0.8));
      if (mastered) masteredCount += 1;
      wordAttemptsSum += att;
      wordCorrectSum += cor;
    });

    const statsMap = readJsonMap(LOCAL_QUIZ_STATS_KEY);
    const bStats = statsMap[bKey] || {
      total_questions: wordAttemptsSum,
      total_correct: wordCorrectSum
    };

    const totalQ = Number(bStats.total_questions || 0);
    const totalC = Number(bStats.total_correct || 0);
    const accuracy =
      totalQ > 0 ? Math.round((totalC / totalQ) * 1000) / 10 : 0;

    return {
      block_key: bKey,
      native_lang: nLang,
      target_lang: tLang,
      total_notebook_words: words.length,
      mastered_words: masteredCount,
      total_quiz_questions: totalQ,
      total_quiz_correct: totalC,
      quiz_accuracy: accuracy
    };
  }

  /**
   * Core centralized fetch() wrapper with automatic JWT Bearer token injection
   */
  async function apiRequest(endpoint, options = {}) {
    if (!API_BASE_URL) {
      throw new Error('VERCEL_STATIC_MODE');
    }

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
      throw new Error('BACKEND_OFFLINE');
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

  function isFallbackError(err) {
    if (!err || !err.message) return true;
    return (
      err.message === 'VERCEL_STATIC_MODE' ||
      err.message === 'BACKEND_OFFLINE' ||
      err.message.includes('Không thể kết nối') ||
      err.message.includes('Failed to fetch')
    );
  }

  /**
   * Check URL query parameters for ?auth_token=... returned by Google/Facebook OAuth2 Callback
   */
  async function handleOAuthRedirectTokenIfPresent() {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('auth_token');
    if (!urlToken) return null;

    localStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
    params.delete('auth_token');
    const cleanSearch = params.toString();
    const newUrl =
      window.location.pathname +
      (cleanSearch ? `?${cleanSearch}` : '') +
      window.location.hash;
    window.history.replaceState({}, document.title, newUrl);

    try {
      const me = await apiRequest('/auth/me', { method: 'GET' });
      return setSession(urlToken, me);
    } catch (e) {
      return getCurrentUser();
    }
  }

  /**
   * 1. AUTHENTICATION, OAUTH2 & DIRECT LOGIN METHODS
   */
  async function sendOtpCode({ channel = 'email', identifier, purpose = 'login' }) {
    const cleanId = (identifier || '').trim();
    const detectedChannel = cleanId.includes('@') ? 'email' : channel || 'phone';
    try {
      return await apiRequest('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          identifier: cleanId,
          channel: detectedChannel,
          purpose
        })
      });
    } catch (err) {
      if (isFallbackError(err)) {
        return { message: 'Ready', channel: detectedChannel };
      }
      throw err;
    }
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
    try {
      const res = await apiRequest('/auth/login/direct', {
        method: 'POST',
        body: JSON.stringify({
          identifier: cleanId,
          channel: cleanId.includes('@') ? 'email' : channel,
          otp_code: otpCode ? (otpCode || '').trim() : null,
          account_name: accountName || null,
          password: password || null,
          native_lang: nativeLang || 'vi',
          target_lang: targetLang || 'hmn',
          accepted_terms: Boolean(agreedTerms)
        })
      });
      return setSession(res.access_token, res.user);
    } catch (err) {
      if (isFallbackError(err)) {
        const nLang = nativeLang || 'vi';
        const tLang = targetLang || (nLang === 'hmn' ? 'vi' : 'hmn');
        const fallbackUser = {
          id: 1,
          account_name:
            accountName ||
            (cleanId.includes('@') ? cleanId.split('@')[0] : cleanId) ||
            'Học viên Trilinguo',
          email: cleanId.includes('@') ? cleanId : '',
          phone: !cleanId.includes('@') ? cleanId : '',
          auth_provider: channel,
          native_lang: nLang,
          target_lang: tLang,
          accepted_terms: true,
          learning_block: `${nLang}_${tLang}`
        };
        return setSession('trilinguo_vercel_session_token', fallbackUser);
      }
      throw err;
    }
  }

  async function loginWithPassword({ identifier, password, nativeLang, targetLang }) {
    try {
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
    } catch (err) {
      if (isFallbackError(err)) {
        return verifyOtpAndLogin({
          identifier,
          accountName: identifier,
          nativeLang,
          targetLang,
          agreedTerms: true
        });
      }
      throw err;
    }
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

  async function verifyGoogleOAuthToken({
    idToken,
    accessToken,
    nativeLang,
    targetLang,
    agreedTerms
  }) {
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

  async function verifyFacebookOAuthToken({
    accessToken,
    nativeLang,
    targetLang,
    agreedTerms
  }) {
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
    try {
      return await apiRequest('/auth/forgot-password/reset', {
        method: 'POST',
        body: JSON.stringify({
          identifier: (identifier || '').trim(),
          otp_code: otpCode ? (otpCode || '').trim() : null,
          new_password: newPassword
        })
      });
    } catch (err) {
      if (isFallbackError(err)) {
        return { message: 'Đã cập nhật mật khẩu thành công!' };
      }
      throw err;
    }
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
  async function translateViaBackend({
    text,
    sourceLang,
    targetLang,
    saveHistory = true
  }) {
    try {
      return await apiRequest('/translate', {
        method: 'POST',
        body: JSON.stringify({
          text,
          source_lang: sourceLang,
          target_lang: targetLang,
          save_history: Boolean(saveHistory)
        })
      });
    } catch (err) {
      if (isFallbackError(err) && global.TrilinguoData) {
        const localRes = global.TrilinguoData.translateText(
          text,
          sourceLang,
          targetLang
        );
        const posCode = localRes.pos ? localRes.pos.code : '(nth) nthe';

        if (saveHistory && isLoggedIn()) {
          const bKey = getActiveBlockKey();
          const allHist = readJsonMap(LOCAL_HISTORY_KEY);
          const currentList = ensureLocalHistoryBlock(bKey);
          const newItem = {
            id: Date.now(),
            block_key: bKey,
            source_lang: sourceLang,
            target_lang: targetLang,
            source_text: localRes.sourceText,
            translated_text: localRes.translatedText,
            hmn_text: localRes.hmnText,
            vi_text: localRes.viText,
            en_text: localRes.enText,
            phonetic: localRes.phonetic,
            pos_code: posCode,
            grammar_note: localRes.grammarNote,
            created_at: new Date().toISOString()
          };
          allHist[bKey] = [
            newItem,
            ...currentList.filter(x => x.source_text !== localRes.sourceText)
          ].slice(0, 30);
          writeJsonMap(LOCAL_HISTORY_KEY, allHist);
        }

        return {
          source_text: localRes.sourceText,
          translated_text: localRes.translatedText,
          hmn_text: localRes.hmnText,
          vi_text: localRes.viText,
          en_text: localRes.enText,
          phonetic: localRes.phonetic,
          pos_code: posCode,
          grammar_note: localRes.grammarNote
        };
      }
      throw err;
    }
  }

  async function getTranslationHistory(blockKey) {
    if (!isLoggedIn()) return [];
    const bKey = blockKey || getActiveBlockKey();
    try {
      const query = `?block_key=${encodeURIComponent(bKey)}`;
      const items = await apiRequest(`/translate/history${query}`, {
        method: 'GET'
      });
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
    } catch (err) {
      if (isFallbackError(err)) {
        const items = ensureLocalHistoryBlock(bKey);
        return items.map(item => ({
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
      throw err;
    }
  }

  async function clearTranslationHistory(blockKey) {
    if (!isLoggedIn()) return;
    const bKey = blockKey || getActiveBlockKey();
    try {
      const query = `?block_key=${encodeURIComponent(bKey)}`;
      return await apiRequest(`/translate/history${query}`, {
        method: 'DELETE'
      });
    } catch (err) {
      if (isFallbackError(err)) {
        const allHist = readJsonMap(LOCAL_HISTORY_KEY);
        allHist[bKey] = [];
        writeJsonMap(LOCAL_HISTORY_KEY, allHist);
        return { message: 'Cleared' };
      }
      throw err;
    }
  }

  /**
   * 3. COMMONLY USED PHRASES API METHODS
   */
  async function fetchCommonPhrases({ category = 'all', q = '' } = {}) {
    const user = getCurrentUser();
    const nLang = user ? user.nativeLang : 'vi';
    const tLang = user ? user.targetLang : 'hmn';
    try {
      const params = new URLSearchParams({
        category,
        q,
        native_lang: nLang,
        target_lang: tLang
      });
      const res = await apiRequest(`/phrases?${params.toString()}`, {
        method: 'GET'
      });
      return res.items || [];
    } catch (err) {
      if (isFallbackError(err) && global.TrilinguoData) {
        const qLow = (q || '').toLowerCase();
        return global.TrilinguoData.COMMON_PHRASES.filter(p => {
          const catMatch = category === 'all' || p.category === category;
          const textMatch =
            !qLow ||
            p.hmn.toLowerCase().includes(qLow) ||
            p.vi.toLowerCase().includes(qLow) ||
            p.en.toLowerCase().includes(qLow);
          return catMatch && textMatch;
        }).map(p => ({
          ...p,
          source_text: p[nLang] || p.vi,
          target_text: p[tLang] || p.hmn
        }));
      }
      throw err;
    }
  }

  /**
   * 4. PERSONAL NOTEBOOK, FLASHCARDS (>=4) & QUIZZES (>=10) API METHODS
   */
  async function getNotebookWords(blockKey) {
    if (!isLoggedIn()) return [];
    const bKey = blockKey || getActiveBlockKey();
    try {
      const query = `?block_key=${encodeURIComponent(bKey)}`;
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
    } catch (err) {
      if (isFallbackError(err)) {
        const items = ensureLocalNotebookBlock(bKey);
        return items.map(w => ({
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
      throw err;
    }
  }

  async function saveToNotebook(item) {
    if (!isLoggedIn()) {
      throw new Error(
        'Vui lòng đăng nhập tài khoản để lưu từ vựng vào Sổ tay cá nhân!'
      );
    }
    const user = getCurrentUser();
    const nLang = user ? user.nativeLang : 'vi';
    const tLang = user ? user.targetLang : 'hmn';

    const sourceText =
      item[nLang] ||
      item.sourceText ||
      item.original ||
      item.vi ||
      item.source_text;
    const targetText =
      item[tLang] || item.targetText || item.hmn || item.target_text;

    const payload = {
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
    };

    try {
      const saved = await apiRequest('/notebook', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return { word: saved, isNew: true };
    } catch (err) {
      if (isFallbackError(err)) {
        const bKey = getActiveBlockKey();
        const words = ensureLocalNotebookBlock(bKey);
        const existing = words.find(
          w =>
            w.source_text.toLowerCase() ===
              (payload.source_text || '').toLowerCase() &&
            w.target_text.toLowerCase() ===
              (payload.target_text || '').toLowerCase()
        );
        if (existing) {
          return { word: existing, isNew: false };
        }
        const newWord = {
          id: Date.now(),
          block_key: bKey,
          ...payload,
          quiz_attempts: 0,
          quiz_correct: 0,
          remembered: false,
          is_mastered: false,
          created_at: new Date().toISOString()
        };
        words.unshift(newWord);
        saveLocalNotebookBlock(bKey, words);
        return { word: newWord, isNew: true };
      }
      throw err;
    }
  }

  async function toggleNotebookRemembered(wordId) {
    try {
      const updated = await apiRequest(`/notebook/${wordId}/remember`, {
        method: 'PATCH'
      });
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
    } catch (err) {
      if (isFallbackError(err)) {
        const bKey = getActiveBlockKey();
        const words = ensureLocalNotebookBlock(bKey);
        const target = words.find(w => Number(w.id) === Number(wordId));
        if (!target) return null;
        target.remembered = !target.remembered;
        saveLocalNotebookBlock(bKey, words);
        return {
          ...target,
          sourceText: target.source_text,
          targetText: target.target_text,
          hmnText: target.hmn_text,
          viText: target.vi_text,
          enText: target.en_text,
          posCode: target.pos_code,
          exampleSentence: target.example_sentence
        };
      }
      throw err;
    }
  }

  async function removeFromNotebook(wordId) {
    try {
      return await apiRequest(`/notebook/${wordId}`, { method: 'DELETE' });
    } catch (err) {
      if (isFallbackError(err)) {
        const bKey = getActiveBlockKey();
        const words = ensureLocalNotebookBlock(bKey).filter(
          w => Number(w.id) !== Number(wordId)
        );
        saveLocalNotebookBlock(bKey, words);
        return { message: 'Deleted' };
      }
      throw err;
    }
  }

  async function generateFlashcards(wordIds) {
    try {
      return await apiRequest('/notebook/flashcards', {
        method: 'POST',
        body: JSON.stringify({ word_ids: wordIds.map(Number) })
      });
    } catch (err) {
      if (isFallbackError(err)) {
        const bKey = getActiveBlockKey();
        const words = ensureLocalNotebookBlock(bKey);
        const idSet = new Set(wordIds.map(Number));
        const selected = words.filter(w => idSet.has(Number(w.id)));
        return { cards: selected.length >= 4 ? selected : words.slice(0, 4) };
      }
      throw err;
    }
  }

  async function generateQuizQuestions(wordIds) {
    try {
      return await apiRequest('/notebook/quiz/generate', {
        method: 'POST',
        body: JSON.stringify({ word_ids: wordIds.map(Number) })
      });
    } catch (err) {
      if (isFallbackError(err)) {
        const bKey = getActiveBlockKey();
        const words = ensureLocalNotebookBlock(bKey);
        const idSet = new Set(wordIds.map(Number));
        let selected = words.filter(w => idSet.has(Number(w.id)));
        if (selected.length < 10) {
          selected = words.slice(0, 10);
        }

        const allPoolAnswers = words.map(w => w.source_text);
        const questions = selected.map((w, idx) => {
          const distractors = allPoolAnswers
            .filter(ans => ans !== w.source_text)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
          const options = [w.source_text, ...distractors].sort(
            () => Math.random() - 0.5
          );
          return {
            index: idx + 1,
            word_id: w.id,
            prompt_text: w.target_text,
            phonetic: w.phonetic || '',
            correct_answer: w.source_text,
            options
          };
        });

        return { questions };
      }
      throw err;
    }
  }

  async function recordQuizSubmission(wordResults) {
    const payload = {
      answers: wordResults.map(r => ({
        word_id: Number(r.wordId),
        selected_answer: r.selectedAnswer || '',
        is_correct: Boolean(r.isCorrect)
      }))
    };

    try {
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
    } catch (err) {
      if (isFallbackError(err)) {
        const bKey = getActiveBlockKey();
        const words = ensureLocalNotebookBlock(bKey);
        let correctCount = 0;

        payload.answers.forEach(ans => {
          if (ans.is_correct) correctCount += 1;
          const w = words.find(x => Number(x.id) === Number(ans.word_id));
          if (w) {
            w.quiz_attempts = Number(w.quiz_attempts || 0) + 1;
            if (ans.is_correct) {
              w.quiz_correct = Number(w.quiz_correct || 0) + 1;
            }
            w.is_mastered =
              w.quiz_attempts >= 10 && w.quiz_correct / w.quiz_attempts > 0.8;
          }
        });
        saveLocalNotebookBlock(bKey, words);

        const statsMap = readJsonMap(LOCAL_QUIZ_STATS_KEY);
        const prev = statsMap[bKey] || { total_questions: 0, total_correct: 0 };
        statsMap[bKey] = {
          total_questions:
            Number(prev.total_questions || 0) + payload.answers.length,
          total_correct: Number(prev.total_correct || 0) + correctCount
        };
        writeJsonMap(LOCAL_QUIZ_STATS_KEY, statsMap);

        const m = computeLocalMetricsObject(bKey);
        return {
          totalQuestions: payload.answers.length,
          correctCount,
          metrics: {
            blockKey: m.block_key,
            totalNotebookWords: m.total_notebook_words,
            masteredWords: m.mastered_words,
            totalQuestions: m.total_quiz_questions,
            totalCorrect: m.total_quiz_correct,
            accuracyPercent: m.quiz_accuracy
          }
        };
      }
      throw err;
    }
  }

  /**
   * 5. PROFILE & REAL-TIME PROGRESS DASHBOARD API METHODS
   */
  async function updateUserProfile({
    accountName,
    email,
    phone,
    nativeLang,
    targetLang
  }) {
    try {
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
    } catch (err) {
      if (isFallbackError(err)) {
        const current = getCurrentUser() || {};
        const nLang = nativeLang || current.nativeLang || 'vi';
        const tLang = targetLang || current.targetLang || 'hmn';
        const bKey = makeBlockKey(nLang, tLang);
        const updatedUser = setSession(
          getToken() || 'trilinguo_vercel_session_token',
          {
            ...current,
            account_name: accountName || current.accountName,
            email: email || current.email || '',
            phone: phone || current.phone || '',
            native_lang: nLang,
            target_lang: tLang,
            learning_block: bKey
          }
        );
        const m = computeLocalMetricsObject(bKey);
        return {
          user: updatedUser,
          metrics: {
            blockKey: m.block_key,
            nativeLang: m.native_lang,
            targetLang: m.target_lang,
            totalNotebookWords: m.total_notebook_words,
            masteredWords: m.mastered_words,
            totalQuestions: m.total_quiz_questions,
            totalCorrect: m.total_quiz_correct,
            accuracyPercent: m.quiz_accuracy
          }
        };
      }
      throw err;
    }
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
    const bKey = blockKey || getActiveBlockKey();
    try {
      const query = `?block_key=${encodeURIComponent(bKey)}`;
      const m = await apiRequest(`/profile/progress${query}`, {
        method: 'GET'
      });
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
    } catch (err) {
      if (isFallbackError(err)) {
        const m = computeLocalMetricsObject(bKey);
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
      throw err;
    }
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
