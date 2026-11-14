/**
 * ============================================================================
 * TRILINGUO / NYOB ZOO — CENTRALIZED BACKEND API CLIENT + VERCEL CLOUD ENGINE (js/api.js)
 * - Connects Frontend to FastAPI Production Backend (http://localhost:8000/api/...)
 * - Enforces Immutable Super Admin RBAC rule for poheternal@gmail.com
 * - Automatically falls back to the built-in Browser LocalStorage & Linguistic Engine
 *   when deployed on Vercel (*.vercel.app) or when Python Backend is offline.
 * ============================================================================
 */

(function (global) {
  'use strict';

  const SUPER_ADMIN_EMAIL = 'poheternal@gmail.com';

  const IS_LOCALHOST =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const API_BASE_URL = (
    global.TRILINGUO_API_BASE_URL ||
    localStorage.getItem('trilinguo_custom_api_url') ||
    (window.location.port === '8000'
      ? `${window.location.origin}/api`
      : IS_LOCALHOST
        ? 'http://localhost:8000/api'
        : `${window.location.origin}/api`)
  ).replace(/\/+$/, '');

  const TOKEN_STORAGE_KEY = 'trilinguo_jwt_token';
  const USER_CACHE_KEY = 'trilinguo_auth_user';
  const LOCAL_HISTORY_KEY = 'trilinguo_local_history_v1';
  const LOCAL_NOTEBOOK_KEY = 'trilinguo_local_notebook_v1';
  const LOCAL_QUIZ_STATS_KEY = 'trilinguo_local_quiz_stats_v1';
  const LOCAL_ADMIN_USERS_KEY = 'trilinguo_local_admin_users_v1';

  function isSuperAdminEmail(emailOrId) {
    return (
      Boolean(emailOrId) &&
      String(emailOrId).trim().toLowerCase() === SUPER_ADMIN_EMAIL
    );
  }

  function isAdminUser(userObj) {
    const u = userObj || getCurrentUser();
    if (!u) return false;
    if (isSuperAdminEmail(u.email)) return true;
    const role = String(u.role || 'user').toLowerCase();
    return role === 'admin' || role === 'super_admin';
  }

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
      syncUserIntoLocalAdminRegistry(normalized);
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
    const rawEmail = (u.email || '').trim().toLowerCase();
    const rawName = (u.account_name || u.accountName || '').trim();
    const isSuper =
      isSuperAdminEmail(rawEmail) || isSuperAdminEmail(rawName);
    const finalEmail = isSuper ? SUPER_ADMIN_EMAIL : rawEmail;
    const nativeLang = u.native_lang || u.nativeLang || 'vi';
    const targetLang = u.target_lang || u.targetLang || 'hmn';
    const rawRole = u.role || 'user';
    const finalRole = isSuper ? 'super_admin' : rawRole;
    const finalActive = isSuper ? true : Boolean(u.is_active ?? u.isActive ?? true);

    return {
      id: u.id || 1,
      accountName:
        rawName && !isSuperAdminEmail(rawName)
          ? rawName
          : isSuper
            ? 'Poh Eternal (Super Admin)'
            : rawName || 'Học viên Trilinguo',
      email: finalEmail,
      phone: u.phone || '',
      avatarUrl: u.avatar_url || u.avatarUrl || '',
      authProvider: u.auth_provider || u.authProvider || 'email',
      nativeLang,
      targetLang,
      role: finalRole,
      isActive: finalActive,
      acceptedTerms: Boolean(u.accepted_terms ?? u.acceptedTerms ?? true),
      learningBlock:
        u.learning_block || u.learningBlock || `${nativeLang}_${targetLang}`
    };
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      if (!raw) return null;
      return normalizeUserObject(JSON.parse(raw));
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
   * Local Admin Users Registry (Used when deployed on Vercel Static or Offline)
   */
  function ensureLocalAdminUsers() {
    let list = [];
    try {
      const raw = localStorage.getItem(LOCAL_ADMIN_USERS_KEY);
      if (raw) list = JSON.parse(raw);
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list) || list.length === 0) {
      list = [
        {
          id: 1,
          username: 'Poh Eternal (Super Admin)',
          account_name: 'Poh Eternal (Super Admin)',
          email: SUPER_ADMIN_EMAIL,
          phone: '0901234567',
          native_lang: 'vi',
          active_target_lang: 'hmn',
          target_lang: 'hmn',
          learning_block: 'vi_hmn',
          role: 'super_admin',
          is_super_admin: true,
          is_active: true,
          created_at: '2026-11-01T08:00:00Z',
          blocks_count: 2,
          total_translations: 42,
          total_saved_words: 15,
          mastered_words: 8,
          total_quiz_questions: 90,
          total_quiz_correct: 82,
          quiz_accuracy: 91.1
        },
        {
          id: 2,
          username: 'Giàng A Páo (Tả Van)',
          account_name: 'Giàng A Páo (Tả Van)',
          email: 'giangapao.tavan@gmail.com',
          phone: '0987654321',
          native_lang: 'hmn',
          active_target_lang: 'en',
          target_lang: 'en',
          learning_block: 'hmn_en',
          role: 'admin',
          is_super_admin: false,
          is_active: true,
          created_at: '2026-11-02T09:15:00Z',
          blocks_count: 2,
          total_translations: 36,
          total_saved_words: 12,
          mastered_words: 5,
          total_quiz_questions: 60,
          total_quiz_correct: 54,
          quiz_accuracy: 90.0
        },
        {
          id: 3,
          username: 'Nguyễn Minh Anh',
          account_name: 'Nguyễn Minh Anh',
          email: 'minhanh.trekking@gmail.com',
          phone: '0912345678',
          native_lang: 'vi',
          active_target_lang: 'hmn',
          target_lang: 'hmn',
          learning_block: 'vi_hmn',
          role: 'user',
          is_super_admin: false,
          is_active: true,
          created_at: '2026-11-03T10:30:00Z',
          blocks_count: 1,
          total_translations: 28,
          total_saved_words: 10,
          mastered_words: 4,
          total_quiz_questions: 50,
          total_quiz_correct: 44,
          quiz_accuracy: 88.0
        },
        {
          id: 4,
          username: 'Sùng Thị Mai (Homestay)',
          account_name: 'Sùng Thị Mai (Homestay)',
          email: 'sungthimai.sapa@gmail.com',
          phone: '0934567890',
          native_lang: 'hmn',
          active_target_lang: 'vi',
          target_lang: 'vi',
          learning_block: 'hmn_vi',
          role: 'user',
          is_super_admin: false,
          is_active: true,
          created_at: '2026-11-04T14:20:00Z',
          blocks_count: 1,
          total_translations: 31,
          total_saved_words: 11,
          mastered_words: 6,
          total_quiz_questions: 70,
          total_quiz_correct: 63,
          quiz_accuracy: 90.0
        },
        {
          id: 5,
          username: 'Liam Henderson',
          account_name: 'Liam Henderson',
          email: 'liam.henderson.uk@gmail.com',
          phone: '0978112233',
          native_lang: 'en',
          active_target_lang: 'hmn',
          target_lang: 'hmn',
          learning_block: 'en_hmn',
          role: 'user',
          is_super_admin: false,
          is_active: true,
          created_at: '2026-11-05T16:45:00Z',
          blocks_count: 1,
          total_translations: 19,
          total_saved_words: 8,
          mastered_words: 2,
          total_quiz_questions: 30,
          total_quiz_correct: 25,
          quiz_accuracy: 83.3
        },
        {
          id: 6,
          username: 'Trần Quốc Bảo',
          account_name: 'Trần Quốc Bảo',
          email: 'quocbao.dulich@gmail.com',
          phone: '0965432109',
          native_lang: 'vi',
          active_target_lang: 'en',
          target_lang: 'en',
          learning_block: 'vi_en',
          role: 'user',
          is_super_admin: false,
          is_active: true,
          created_at: '2026-11-06T11:10:00Z',
          blocks_count: 1,
          total_translations: 14,
          total_saved_words: 7,
          mastered_words: 1,
          total_quiz_questions: 20,
          total_quiz_correct: 16,
          quiz_accuracy: 80.0
        },
        {
          id: 7,
          username: 'Claire Dubois',
          account_name: 'Claire Dubois',
          email: 'claire.traveler@gmail.com',
          phone: '0944556677',
          native_lang: 'en',
          active_target_lang: 'vi',
          target_lang: 'vi',
          learning_block: 'en_vi',
          role: 'user',
          is_super_admin: false,
          is_active: false,
          created_at: '2026-11-06T15:00:00Z',
          blocks_count: 1,
          total_translations: 9,
          total_saved_words: 5,
          mastered_words: 0,
          total_quiz_questions: 10,
          total_quiz_correct: 7,
          quiz_accuracy: 70.0
        }
      ];
      localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(list));
    }
    return list;
  }

  function saveLocalAdminUsers(list) {
    localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(list));
  }

  function syncUserIntoLocalAdminRegistry(normalizedUser) {
    if (!normalizedUser) return;
    const list = ensureLocalAdminUsers();
    const emailLow = (normalizedUser.email || '').toLowerCase();
    const existing = list.find(
      u =>
        (emailLow && (u.email || '').toLowerCase() === emailLow) ||
        Number(u.id) === Number(normalizedUser.id)
    );
    if (existing) {
      existing.username = normalizedUser.accountName;
      existing.account_name = normalizedUser.accountName;
      if (emailLow) existing.email = emailLow;
      if (normalizedUser.phone) existing.phone = normalizedUser.phone;
      existing.native_lang = normalizedUser.nativeLang;
      existing.active_target_lang = normalizedUser.targetLang;
      existing.target_lang = normalizedUser.targetLang;
      existing.learning_block = `${normalizedUser.nativeLang}_${normalizedUser.targetLang}`;
      if (isSuperAdminEmail(existing.email)) {
        existing.role = 'super_admin';
        existing.is_super_admin = true;
        existing.is_active = true;
      }
    } else {
      const nextId =
        list.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0) + 1;
      list.push({
        id: nextId,
        username: normalizedUser.accountName,
        account_name: normalizedUser.accountName,
        email: emailLow,
        phone: normalizedUser.phone || '',
        native_lang: normalizedUser.nativeLang,
        active_target_lang: normalizedUser.targetLang,
        target_lang: normalizedUser.targetLang,
        learning_block: `${normalizedUser.nativeLang}_${normalizedUser.targetLang}`,
        role: isSuperAdminEmail(emailLow)
          ? 'super_admin'
          : normalizedUser.role || 'user',
        is_super_admin: isSuperAdminEmail(emailLow),
        is_active: true,
        created_at: new Date().toISOString(),
        blocks_count: 1,
        total_translations: 4,
        total_saved_words: 12,
        mastered_words: 3,
        total_quiz_questions: 30,
        total_quiz_correct: 26,
        quiz_accuracy: 86.7
      });
    }
    saveLocalAdminUsers(list);
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
      if (response.status === 404 || response.status === 405 || response.status >= 500) {
        throw new Error('VERCEL_STATIC_MODE');
      }
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
   * 1. AUTHENTICATION & DIRECT LOGIN METHODS
   */
  async function verifyOtpAndLogin({
    channel = 'email',
    identifier,
    accountName,
    nativeLang,
    targetLang,
    agreedTerms
  }) {
    const cleanId = (identifier || '').trim();
    const isSuper =
      isSuperAdminEmail(cleanId) || isSuperAdminEmail(accountName);
    const effectiveIdentifier = isSuper ? SUPER_ADMIN_EMAIL : cleanId;

    try {
      const res = await apiRequest('/auth/login/direct', {
        method: 'POST',
        body: JSON.stringify({
          identifier: effectiveIdentifier,
          channel: effectiveIdentifier.includes('@') ? 'email' : channel,
          account_name: accountName || null,
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
        const emailVal = effectiveIdentifier.includes('@')
          ? effectiveIdentifier.toLowerCase()
          : '';

        // Check if user exists in local admin registry
        const localUsers = ensureLocalAdminUsers();
        const matchedLocal = localUsers.find(
          u =>
            (emailVal && (u.email || '').toLowerCase() === emailVal) ||
            (u.phone && u.phone === effectiveIdentifier)
        );
        if (matchedLocal && matchedLocal.is_active === false && !isSuper) {
          throw new Error(
            'Tài khoản của bạn hiện đang bị khóa bởi Quản trị viên.'
          );
        }

        const resolvedRole = isSuper
          ? 'super_admin'
          : matchedLocal
            ? matchedLocal.role
            : 'user';

        const fallbackUser = {
          id: matchedLocal ? matchedLocal.id : isSuper ? 1 : Date.now(),
          account_name:
            accountName && !isSuperAdminEmail(accountName)
              ? accountName
              : isSuper
                ? 'Poh Eternal (Super Admin)'
                : matchedLocal
                  ? matchedLocal.account_name
                  : effectiveIdentifier.includes('@')
                    ? effectiveIdentifier.split('@')[0]
                    : effectiveIdentifier || 'Học viên Trilinguo',
          email: emailVal,
          phone: !effectiveIdentifier.includes('@') ? effectiveIdentifier : '',
          auth_provider: channel,
          native_lang: nLang,
          target_lang: tLang,
          role: resolvedRole,
          is_active: true,
          accepted_terms: true,
          learning_block: `${nLang}_${tLang}`
        };
        return setSession('trilinguo_vercel_session_token', fallbackUser);
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
            email: isSuperAdminEmail(current.email)
              ? SUPER_ADMIN_EMAIL
              : email || current.email || '',
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

  /**
   * ============================================================================
   * 6. ADMIN PORTAL & RBAC API METHODS (/api/admin/* + VERCEL ENGINE FALLBACK)
   * ============================================================================
   */
  const PAIR_META = [
    { key: 'vi_hmn', label: 'Việt (Kinh) → Hmong', n: 'vi', t: 'hmn' },
    { key: 'hmn_vi', label: 'Hmong → Việt (Kinh)', n: 'hmn', t: 'vi' },
    { key: 'en_hmn', label: 'Anh (English) → Hmong', n: 'en', t: 'hmn' },
    { key: 'hmn_en', label: 'Hmong → Anh (English)', n: 'hmn', t: 'en' },
    { key: 'en_vi', label: 'Anh (English) → Việt (Kinh)', n: 'en', t: 'vi' },
    { key: 'vi_en', label: 'Việt (Kinh) → Anh (English)', n: 'vi', t: 'en' }
  ];

  async function getAdminDashboardStats() {
    try {
      return await apiRequest('/admin/dashboard-stats', { method: 'GET' });
    } catch (err) {
      if (isFallbackError(err)) {
        const users = ensureLocalAdminUsers();
        const totalUsers = users.length;
        const activeUsersCount = users.filter(u => u.is_active !== false).length;
        const totalAdmins = users.filter(
          u =>
            isSuperAdminEmail(u.email) ||
            u.role === 'admin' ||
            u.role === 'super_admin'
        ).length;
        const totalTranslations = users.reduce(
          (s, u) => s + Number(u.total_translations || 0),
          0
        );
        const totalSavedWords = users.reduce(
          (s, u) => s + Number(u.total_saved_words || 0),
          0
        );
        const totalMasteredWords = users.reduce(
          (s, u) => s + Number(u.mastered_words || 0),
          0
        );
        const sumQuizQ = users.reduce(
          (s, u) => s + Number(u.total_quiz_questions || 0),
          0
        );
        const sumQuizC = users.reduce(
          (s, u) => s + Number(u.total_quiz_correct || 0),
          0
        );
        const platformQuizAccuracy =
          sumQuizQ > 0 ? Math.round((sumQuizC / sumQuizQ) * 1000) / 10 : 0;

        const pairCounts = {};
        PAIR_META.forEach(p => {
          pairCounts[p.key] = 0;
        });
        users.forEach(u => {
          const k =
            u.learning_block || makeBlockKey(u.native_lang, u.target_lang);
          pairCounts[k] = (pairCounts[k] || 0) + 1;
        });

        const languagePairDistribution = PAIR_META.map(p => {
          const cnt = pairCounts[p.key] || 0;
          const pct =
            totalUsers > 0 ? Math.round((cnt / totalUsers) * 1000) / 10 : 0;
          return {
            block_key: p.key,
            label: p.label,
            native_lang: p.n,
            target_lang: p.t,
            count: cnt,
            percentage: pct
          };
        });

        const topLearners = [...users]
          .sort(
            (a, b) =>
              b.mastered_words - a.mastered_words ||
              b.total_saved_words - a.total_saved_words ||
              b.quiz_accuracy - a.quiz_accuracy
          )
          .slice(0, 5);

        return {
          total_users: totalUsers,
          active_users_count: activeUsersCount,
          total_admins: totalAdmins,
          total_translations: totalTranslations,
          total_saved_words: totalSavedWords,
          total_mastered_words: totalMasteredWords,
          platform_quiz_accuracy: platformQuizAccuracy,
          language_pair_distribution: languagePairDistribution,
          language_pair_counts: pairCounts,
          top_learners: topLearners
        };
      }
      throw err;
    }
  }

  async function getAdminUsers({ search = '', role = 'all', langPair = 'all' } = {}) {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role && role !== 'all') params.set('role', role);
      if (langPair && langPair !== 'all') params.set('lang_pair', langPair);
      const qs = params.toString();
      return await apiRequest(`/admin/users${qs ? '?' + qs : ''}`, {
        method: 'GET'
      });
    } catch (err) {
      if (isFallbackError(err)) {
        let users = ensureLocalAdminUsers();
        const kw = (search || '').trim().toLowerCase();
        if (kw) {
          users = users.filter(
            u =>
              (u.username || u.account_name || '').toLowerCase().includes(kw) ||
              (u.email || '').toLowerCase().includes(kw) ||
              (u.phone || '').toLowerCase().includes(kw)
          );
        }
        if (role && role !== 'all') {
          users = users.filter(u => u.role === role);
        }
        if (langPair && langPair !== 'all') {
          users = users.filter(
            u =>
              (u.learning_block ||
                makeBlockKey(u.native_lang, u.target_lang)) === langPair
          );
        }
        const priority = { super_admin: 0, admin: 1, user: 2 };
        users.sort(
          (a, b) =>
            (priority[a.role] ?? 3) - (priority[b.role] ?? 3) || a.id - b.id
        );
        return { items: users, total: users.length };
      }
      throw err;
    }
  }

  async function getAdminUserProgress(userId) {
    try {
      return await apiRequest(`/admin/users/${userId}/progress`, {
        method: 'GET'
      });
    } catch (err) {
      if (isFallbackError(err)) {
        const users = ensureLocalAdminUsers();
        const u =
          users.find(x => Number(x.id) === Number(userId)) || users[0];
        const bKey =
          u.learning_block || makeBlockKey(u.native_lang, u.target_lang);
        const words = ensureLocalNotebookBlock(bKey).slice(
          0,
          u.total_saved_words || 10
        );
        const hist = ensureLocalHistoryBlock(bKey);

        return {
          user: u,
          learning_blocks: [
            {
              block_key: bKey,
              native_lang: u.native_lang,
              target_lang: u.target_lang,
              total_saved_words: u.total_saved_words,
              mastered_words: u.mastered_words,
              total_translations: u.total_translations,
              total_quiz_questions: u.total_quiz_questions,
              total_quiz_correct: u.total_quiz_correct,
              quiz_accuracy: u.quiz_accuracy
            }
          ],
          notebook_items: words.map((w, idx) => ({
            ...w,
            is_mastered: idx < (u.mastered_words || 0)
          })),
          recent_history: hist
        };
      }
      throw err;
    }
  }

  async function adminUpdateUser(userId, payload) {
    try {
      return await apiRequest(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      if (isFallbackError(err)) {
        const users = ensureLocalAdminUsers();
        const target = users.find(x => Number(x.id) === Number(userId));
        if (!target) {
          throw new Error('Không tìm thấy tài khoản người dùng.');
        }
        if (isSuperAdminEmail(target.email)) {
          if (payload.is_active === false) {
            throw new Error(
              `Không thể khóa tài khoản Super Admin tối cao (${SUPER_ADMIN_EMAIL})!`
            );
          }
          if (
            payload.email &&
            payload.email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL
          ) {
            throw new Error(
              `Không thể thay đổi Gmail của Super Admin tối cao (${SUPER_ADMIN_EMAIL})!`
            );
          }
        }
        const nLang = payload.native_lang || target.native_lang;
        const tLang =
          payload.active_target_lang ||
          payload.target_lang ||
          target.target_lang;
        if (nLang === tLang) {
          throw new Error(
            "Ngôn ngữ 'Tôi là' và 'Tôi muốn học' phải khác nhau!"
          );
        }
        if (payload.username || payload.account_name) {
          target.username = (payload.username || payload.account_name).trim();
          target.account_name = target.username;
        }
        if (payload.email !== undefined && !isSuperAdminEmail(target.email)) {
          target.email = payload.email.trim().toLowerCase();
        }
        if (payload.phone !== undefined) {
          target.phone = payload.phone.trim();
        }
        target.native_lang = nLang;
        target.active_target_lang = tLang;
        target.target_lang = tLang;
        target.learning_block = makeBlockKey(nLang, tLang);
        if (
          payload.is_active !== undefined &&
          !isSuperAdminEmail(target.email)
        ) {
          target.is_active = Boolean(payload.is_active);
        }
        saveLocalAdminUsers(users);
        return {
          message: 'Đã cập nhật thông tin người dùng thành công!',
          user: target
        };
      }
      throw err;
    }
  }

  async function adminUpdateUserRole(userId, newRole) {
    try {
      return await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
    } catch (err) {
      if (isFallbackError(err)) {
        const users = ensureLocalAdminUsers();
        const target = users.find(x => Number(x.id) === Number(userId));
        if (!target) {
          throw new Error('Không tìm thấy tài khoản người dùng.');
        }
        if (isSuperAdminEmail(target.email)) {
          throw new Error(
            `Không ai có quyền hạ quyền hoặc thay đổi vai trò của tài khoản tối cao ${SUPER_ADMIN_EMAIL}!`
          );
        }
        target.role = newRole;
        saveLocalAdminUsers(users);
        return {
          message: `Đã cập nhật quyền của ${target.username} thành '${newRole.toUpperCase()}'!`,
          user: target
        };
      }
      throw err;
    }
  }

  async function adminDeleteUser(userId) {
    try {
      return await apiRequest(`/admin/users/${userId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      if (isFallbackError(err)) {
        const users = ensureLocalAdminUsers();
        const target = users.find(x => Number(x.id) === Number(userId));
        if (!target) {
          throw new Error('Không tìm thấy tài khoản người dùng.');
        }
        if (isSuperAdminEmail(target.email)) {
          throw new Error(
            `Tuyệt đối không thể xóa tài khoản Super Admin tối cao (${SUPER_ADMIN_EMAIL})!`
          );
        }
        const filtered = users.filter(x => Number(x.id) !== Number(userId));
        saveLocalAdminUsers(filtered);
        return {
          message: `Đã xóa vĩnh viễn tài khoản '${target.username}'!`,
          deleted_user_id: userId
        };
      }
      throw err;
    }
  }

  /**
   * 7. COMMUNITY CONTRIBUTION & ADMIN CORPUS TRAINING API METHODS
   */
  const LOCAL_CORPUS_KEY = 'trilinguo_local_corpus_v1';
  const LOCAL_DOC_LOGS_KEY = 'trilinguo_local_corpus_doc_logs_v1';

  function ensureLocalCorpusList() {
    let list = [];
    try {
      const raw = localStorage.getItem(LOCAL_CORPUS_KEY);
      if (raw) list = JSON.parse(raw);
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list) || list.length === 0) {
      list = [
        {
          id: 901,
          hmn_text: 'Paj ntaub Hmoob zoo nkauj heev',
          vi_text: 'Thổ cẩm người Mông đẹp lắm',
          en_text: 'Hmong embroidered textile is very beautiful',
          phonetic: 'pa ndao Hmoob zhong ngao heh',
          pos_code: '(nth) nthe',
          note: 'Đóng góp bởi Giàng Thị Mỷ',
          source_type: 'user_contribution',
          source_name: 'Giàng Thị Mỷ',
          revision_count: 2,
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
        },
        {
          id: 902,
          hmn_text: 'Koj puas xav haus tshuaj yej roob?',
          vi_text: 'Bạn có muốn uống trà thảo mộc vùng cao không?',
          en_text: 'Would you like to drink mountain herbal tea?',
          phonetic: 'kaw poua sa hao choua yeh rong',
          pos_code: '(nth) nthe',
          note: 'Học từ tài liệu giao_tiep_ta_van_2026.csv',
          source_type: 'admin_document',
          source_name: 'giao_tiep_ta_van_2026.csv',
          revision_count: 1,
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
          id: 903,
          hmn_text: 'Lub caij qoob loo siav daj vog',
          vi_text: 'Mùa lúa chín vàng rực rỡ',
          en_text: 'The golden ripe harvest season',
          phonetic: 'loo chai kong law shia da vaw',
          pos_code: '(nth) nthe',
          note: 'Đóng góp bởi Sùng A Páo',
          source_type: 'user_contribution',
          source_name: 'Sùng A Páo',
          revision_count: 1,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      localStorage.setItem(LOCAL_CORPUS_KEY, JSON.stringify(list));
    }
    if (global.TrilinguoData && global.TrilinguoData.registerLearnedEntries) {
      global.TrilinguoData.registerLearnedEntries(list);
    }
    return list;
  }

  function saveLocalCorpusList(list) {
    try {
      localStorage.setItem(LOCAL_CORPUS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Corpus cache write notice:', e);
    }
    if (global.TrilinguoData && global.TrilinguoData.registerLearnedEntries) {
      global.TrilinguoData.registerLearnedEntries(list);
    }
  }

  function ensureLocalDocLogs() {
    try {
      const raw = localStorage.getItem(LOCAL_DOC_LOGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    const seed = [
      {
        id: 1,
        filename: 'giao_tiep_ta_van_2026.csv',
        file_format: 'csv',
        total_lines: 25,
        learned_count: 22,
        updated_count: 3,
        uploaded_by_email: SUPER_ADMIN_EMAIL,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
    localStorage.setItem(LOCAL_DOC_LOGS_KEY, JSON.stringify(seed));
    return seed;
  }

  function mergeCorpusText(oldVal, newVal) {
    const o = String(oldVal || '').trim();
    const n = String(newVal || '').trim();
    if (!o) return n;
    if (!n) return o;
    const norm = global.TrilinguoData
      ? global.TrilinguoData.normalizeText
      : s => String(s || '').toLowerCase().trim();
    const parts = o.split('/').map(p => norm(p)).filter(Boolean);
    if (parts.includes(norm(n))) return o;
    return `${o} / ${n}`;
  }

  function upsertLocalCorpusItem({
    hmn_text,
    vi_text,
    en_text,
    note,
    source_type = 'user_contribution',
    source_name = 'Học viên Trilinguo'
  }) {
    const list = ensureLocalCorpusList();
    const norm = global.TrilinguoData
      ? global.TrilinguoData.normalizeText
      : s => String(s || '').toLowerCase().trim();
    const genPhon =
      global.TrilinguoData && global.TrilinguoData.generateHmongPhonetics
        ? global.TrilinguoData.generateHmongPhonetics
        : s => s;

    const cleanHmn = String(hmn_text || '').trim();
    const cleanVi = String(vi_text || '').trim();
    const cleanEn = String(en_text || '').trim();
    const cleanNote = String(note || '').trim();
    const targetNorm = norm(cleanHmn);

    const existing = list.find(item => norm(item.hmn_text) === targetNorm);
    if (existing) {
      existing.vi_text = mergeCorpusText(existing.vi_text, cleanVi);
      existing.en_text = mergeCorpusText(existing.en_text, cleanEn);
      if (cleanNote && !String(existing.note || '').includes(cleanNote)) {
        existing.note = existing.note
          ? `${existing.note} · ${cleanNote}`
          : cleanNote;
      }
      existing.revision_count = Number(existing.revision_count || 1) + 1;
      existing.updated_at = new Date().toISOString();
      saveLocalCorpusList(list);
      return { entry: existing, isNew: false };
    }

    const newEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      hmn_text: cleanHmn,
      vi_text: cleanVi,
      en_text: cleanEn,
      phonetic: genPhon(cleanHmn),
      pos_code: '(nth) nthe',
      note:
        cleanNote ||
        (source_type === 'admin_document'
          ? `Học từ tài liệu ${source_name}`
          : `Đóng góp bởi ${source_name}`),
      source_type,
      source_name,
      revision_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.unshift(newEntry);
    saveLocalCorpusList(list);
    return { entry: newEntry, isNew: true };
  }

  function parseDocumentContentInBrowser(filename, rawContent) {
    const content = String(rawContent || '').trim();
    if (!content) return [];
    const ext = String(filename || '')
      .toLowerCase()
      .split('.')
      .pop();
    const extracted = [];

    // 1. JSON format
    if (ext === 'json' || content.startsWith('[') || content.startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        const arr = Array.isArray(parsed)
          ? parsed
          : parsed.entries || parsed.items || [parsed];
        if (Array.isArray(arr)) {
          arr.forEach(obj => {
            if (!obj || typeof obj !== 'object') return;
            const hmn = String(
              obj.hmn_text || obj.hmn || obj.hmong || ''
            ).trim();
            const vi = String(
              obj.vi_text || obj.vi || obj.vietnamese || obj.kinh || ''
            ).trim();
            const en = String(
              obj.en_text || obj.en || obj.english || ''
            ).trim();
            const note = String(obj.note || obj.example || '').trim();
            if (hmn && (vi || en)) {
              extracted.push({
                hmn_text: hmn,
                vi_text: vi,
                en_text: en,
                note
              });
            }
          });
          if (extracted.length > 0) return extracted;
        }
      } catch (e) {
        // Fallback to line parser
      }
    }

    // 2. Line-by-line parser (.csv, .tsv, .txt, .md)
    const lines = content.split(/\r?\n/);
    lines.forEach((rawLine, idx) => {
      let line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) return;
      line = line.replace(/^(?:\d+[.)]\s*|[-*•]\s*)/, '').trim();
      if (!line) return;

      let parts = [];
      const seps = ['|', '\t', ';', ' — ', ' - ', ' = ', ' : '];
      for (const sep of seps) {
        if (line.includes(sep)) {
          parts = line.split(sep).map(s => s.replace(/^["']|["']$/g, '').trim());
          break;
        }
      }
      if (parts.length === 0 && line.includes(',')) {
        parts = line.split(',').map(s => s.replace(/^["']|["']$/g, '').trim());
      }

      if (parts.length >= 2) {
        const hmn = parts[0] || '';
        const vi = parts[1] || '';
        const en = parts[2] || '';
        const note = parts[3] || '';
        const low = hmn.toLowerCase();
        if (
          idx === 0 &&
          ['hmn', 'hmong', 'hmn_text', 'tiếng mông', 'tiếng hmong'].includes(low)
        ) {
          return;
        }
        if (hmn && (vi || en)) {
          extracted.push({
            hmn_text: hmn,
            vi_text: vi,
            en_text: en,
            note
          });
        }
      }
    });

    return extracted;
  }

  async function getCorpusEntries({ source_type = 'all', search = '' } = {}) {
    try {
      const params = new URLSearchParams();
      if (source_type && source_type !== 'all') {
        params.set('source_type', source_type);
      }
      if (search) {
        params.set('search', search);
      }
      const q = params.toString() ? `?${params.toString()}` : '';
      const res = await apiRequest(`/corpus/entries${q}`, { method: 'GET' });
      if (res && Array.isArray(res.items)) {
        saveLocalCorpusList(res.items);
      }
      return res;
    } catch (err) {
      if (isFallbackError(err)) {
        const allItems = ensureLocalCorpusList();
        const docLogs = ensureLocalDocLogs();
        const userCount = allItems.filter(
          r => r.source_type === 'user_contribution'
        ).length;
        const adminCount = allItems.filter(
          r => r.source_type === 'admin_document'
        ).length;

        let filtered = [...allItems];
        if (source_type && source_type !== 'all') {
          filtered = filtered.filter(r => r.source_type === source_type);
        }
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          filtered = filtered.filter(
            r =>
              (r.hmn_text || '').toLowerCase().includes(q) ||
              (r.vi_text || '').toLowerCase().includes(q) ||
              (r.en_text || '').toLowerCase().includes(q) ||
              (r.source_name || '').toLowerCase().includes(q)
          );
        }
        return {
          total_entries: allItems.length,
          user_contributions_count: userCount,
          admin_documents_count: adminCount,
          total_documents_uploaded: docLogs.length,
          items: filtered,
          document_logs: docLogs
        };
      }
      throw err;
    }
  }

  async function submitUserContribution({ hmnText, viText, enText, note }) {
    const cleanHmn = String(hmnText || '').trim();
    const cleanVi = String(viText || '').trim();
    const cleanEn = String(enText || '').trim();
    const cleanNote = String(note || '').trim();

    if (!cleanHmn) {
      throw new Error('Vui lòng nhập từ hoặc câu Tiếng Hmong!');
    }
    if (!cleanVi && !cleanEn) {
      throw new Error(
        'Bắt buộc phải nhập ít nhất 1 trong 2 bản dịch (Tiếng Việt hoặc Tiếng Anh), không được để trống cả hai!'
      );
    }

    try {
      const res = await apiRequest('/corpus/contribute', {
        method: 'POST',
        body: JSON.stringify({
          hmn_text: cleanHmn,
          vi_text: cleanVi,
          en_text: cleanEn,
          note: cleanNote
        })
      });
      if (res && res.entry) {
        upsertLocalCorpusItem(res.entry);
      }
      return res;
    } catch (err) {
      if (isFallbackError(err)) {
        const u = getCurrentUser();
        const contributorName = u
          ? u.accountName || u.email
          : 'Học viên Cộng đồng';
        const { entry, isNew } = upsertLocalCorpusItem({
          hmn_text: cleanHmn,
          vi_text: cleanVi,
          en_text: cleanEn,
          note: cleanNote,
          source_type: 'user_contribution',
          source_name: contributorName
        });
        return {
          status: 'learned',
          is_new: isNew,
          message: isNew
            ? `Đã thêm mới '${cleanHmn}' vào Kho tri thức hệ thống!`
            : `Từ/câu '${cleanHmn}' đã có sẵn và vừa được hệ thống tự động hợp nhất, bổ sung thêm bản dịch mới (Lần cập nhật #${entry.revision_count})!`,
          entry
        };
      }
      throw err;
    }
  }

  async function adminUploadCorpusDocument({ filename, content, entries }) {
    const cleanName = String(filename || 'tai_lieu_admin.txt').trim();
    const parsedEntries =
      Array.isArray(entries) && entries.length > 0
        ? entries
        : parseDocumentContentInBrowser(cleanName, content);

    if (!parsedEntries || parsedEntries.length === 0) {
      throw new Error(
        'Không tìm thấy cặp từ/câu hợp lệ trong tài liệu. Đảm bảo mỗi dòng có Tiếng Hmong và ít nhất 1 bản dịch (Tiếng Việt hoặc Tiếng Anh), phân tách bằng dấu "|", dấu phẩy ",", tab hoặc dấu gạch ngang "-".'
      );
    }

    try {
      const res = await apiRequest('/corpus/admin/upload-document', {
        method: 'POST',
        body: JSON.stringify({
          filename: cleanName,
          content: content || '',
          entries: parsedEntries
        })
      });
      if (res && Array.isArray(res.entries)) {
        res.entries.forEach(e => upsertLocalCorpusItem(e));
      }
      return res;
    } catch (err) {
      if (isFallbackError(err)) {
        let learnedCount = 0;
        let updatedCount = 0;
        const processed = [];

        parsedEntries.forEach(row => {
          const { entry, isNew } = upsertLocalCorpusItem({
            hmn_text: row.hmn_text,
            vi_text: row.vi_text,
            en_text: row.en_text,
            note: row.note,
            source_type: 'admin_document',
            source_name: cleanName
          });
          if (isNew) learnedCount += 1;
          else updatedCount += 1;
          processed.push(entry);
        });

        const logs = ensureLocalDocLogs();
        const u = getCurrentUser();
        logs.unshift({
          id: Date.now(),
          filename: cleanName,
          file_format: cleanName.split('.').pop() || 'txt',
          total_lines: parsedEntries.length,
          learned_count: learnedCount,
          updated_count: updatedCount,
          uploaded_by_email: (u && u.email) || SUPER_ADMIN_EMAIL,
          created_at: new Date().toISOString()
        });
        localStorage.setItem(LOCAL_DOC_LOGS_KEY, JSON.stringify(logs.slice(0, 30)));

        return {
          status: 'trained',
          filename: cleanName,
          total_extracted: parsedEntries.length,
          learned_count: learnedCount,
          updated_count: updatedCount,
          message: `Hệ thống đã học thành công tài liệu '${cleanName}': Thêm mới ${learnedCount} mục từ/câu và làm giàu/cập nhật ${updatedCount} mục từ có sẵn!`,
          entries: processed.slice(0, 50)
        };
      }
      throw err;
    }
  }

  async function adminDeleteCorpusEntry(entryId) {
    try {
      const res = await apiRequest(`/corpus/admin/entries/${entryId}`, {
        method: 'DELETE'
      });
      const list = ensureLocalCorpusList().filter(
        x => Number(x.id) !== Number(entryId)
      );
      saveLocalCorpusList(list);
      return res;
    } catch (err) {
      if (isFallbackError(err)) {
        const list = ensureLocalCorpusList();
        const target = list.find(x => Number(x.id) === Number(entryId));
        const filtered = list.filter(x => Number(x.id) !== Number(entryId));
        saveLocalCorpusList(filtered);
        return {
          status: 'deleted',
          deleted_id: entryId,
          message: `Đã xóa mục từ '${target ? target.hmn_text : entryId}' khỏi Kho tri thức hệ thống.`
        };
      }
      throw err;
    }
  }

  // Hydrate local corpus into TrilinguoData on boot
  ensureLocalCorpusList();

  const clientExport = {
    API_BASE_URL,
    SUPER_ADMIN_EMAIL,
    isSuperAdminEmail,
    isAdminUser,
    getToken,
    getCurrentUser,
    isLoggedIn,
    makeBlockKey,
    getActiveBlockKey,
    apiRequest,
    verifyOtpAndLogin,
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
    computeBlockMetrics,
    getAdminDashboardStats,
    getAdminUsers,
    getAdminUserProgress,
    adminUpdateUser,
    adminUpdateUserRole,
    adminDeleteUser,
    parseDocumentContentInBrowser,
    getCorpusEntries,
    submitUserContribution,
    adminUploadCorpusDocument,
    adminDeleteCorpusEntry
  };

  global.TrilinguoAPI = clientExport;
  global.TrilinguoDB = clientExport;
})(window);
