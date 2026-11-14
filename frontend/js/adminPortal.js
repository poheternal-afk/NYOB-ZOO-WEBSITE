/**
 * ============================================================================
 * TRILINGUO / NYOB ZOO — ADMIN PORTAL & RBAC ANALYTICS CONTROLLER
 * (js/adminPortal.js)
 * - Automatic Role-Based View Switching for poheternal@gmail.com, admin & super_admin
 * - Hides regular learner pages and renders the full-screen Admin Portal:
 *     1. Tab 1: Tổng quan (Dashboard KPIs, Language Pair Chart, Top Learners)
 *     2. Tab 2: Quản lý Người dùng & Phân quyền (Search, Filter, Role Switcher, Edit, Lock, Delete)
 *     3. Tab 3: Tiến độ Học tập (Per-user Progress Table, Mastery Bars & Detailed Progress Modal)
 *     4. Tab 4: Hồ sơ Admin & Đăng xuất
 * ============================================================================
 */

(function (global) {
  'use strict';

  const SUPER_ADMIN_EMAIL = 'poheternal@gmail.com';

  let currentAdminTab = 'dashboard';
  let cachedDashboardStats = null;
  let cachedAdminUsers = [];
  let cachedCorpusData = {
    total: 0,
    user_contribution_count: 0,
    admin_document_count: 0,
    entries: [],
    document_logs: []
  };
  let corpusFilterState = {
    search: '',
    source: 'all'
  };
  let pendingUploadedDocs = [];
  let savedLearnerNavHTML = null;
  let filterState = {
    search: '',
    role: 'all',
    langPair: 'all'
  };
  let progressSearchQuery = '';

  const ADMIN_I18N = {
    vi: {
      nav_dashboard: '📊 Tổng quan (Dashboard)',
      nav_users: '👥 Người dùng & Phân quyền',
      nav_progress: '📈 Tiến độ Học tập',
      nav_corpus: '🧠 Huấn luyện & Nạp Tài liệu',
      nav_profile: '👑 Hồ sơ Admin',
      nav_logout: '🚪 Đăng xuất',
      portal_badge: 'HỆ THỐNG QUẢN TRỊ VIÊN · RBAC PORTAL',
      portal_title: 'Trung Tâm Quản Trị & Phân Tích Trilinguo',
      portal_sub:
        'Giám sát thời gian thực toàn bộ người học, phân bổ khối ngôn ngữ (Anh - Kinh - Hmong), phân quyền RBAC và độ chính xác Quiz.',
      kpi_users_title: 'Tổng số Người dùng',
      kpi_users_sub: 'Đang hoạt động / Tổng tài khoản đăng ký',
      kpi_trans_title: 'Lượt dịch thuật toàn web',
      kpi_trans_sub: 'Tổng số câu & từ vựng đã dịch 3 chiều',
      kpi_words_title: 'Từ vựng Đã lưu & Mastered',
      kpi_words_sub: 'Mastered: Quiz ≥ 10 lần & Tỉ lệ đúng > 80%',
      kpi_acc_title: 'Độ chính xác Quiz toàn hệ thống',
      kpi_acc_sub: 'Trung bình cộng tỉ lệ trả lời đúng toàn sàn',
      chart_pair_title: '📊 Phân bổ Học viên theo Khối Ngôn ngữ ("Tôi là" → "Muốn học")',
      chart_top_title: '🏆 Top Học viên có Tiến độ Sôi nổi nhất',
      users_title: '👥 Quản lý Tài khoản & Phân quyền (RBAC)',
      users_sub:
        'Tìm kiếm, lọc theo quyền/ngôn ngữ, phân quyền trực tiếp (User ↔ Admin), chỉnh sửa thông tin, khóa hoặc xóa tài khoản.',
      progress_title: '📈 Theo dõi Tiến độ Học tập Chi tiết của Học viên',
      progress_sub:
        'Bấm vào bất kỳ học viên nào hoặc nút "Xem chi tiết" để kiểm tra từng Khối ngôn ngữ, danh sách từ Sổ tay và lịch sử dịch thuật.'
    },
    en: {
      nav_dashboard: '📊 Overview (Dashboard)',
      nav_users: '👥 Users & Roles (RBAC)',
      nav_progress: '📈 Learning Progress',
      nav_corpus: '🧠 Corpus & Document Training',
      nav_profile: '👑 Admin Profile',
      nav_logout: '🚪 Sign Out',
      portal_badge: 'ADMINISTRATOR PORTAL · RBAC CONTROL',
      portal_title: 'Trilinguo Admin & Analytics Command Center',
      portal_sub:
        'Real-time monitoring of platform learners, language pair distribution (EN - VI - HMN), RBAC permissions, and Quiz mastery.',
      kpi_users_title: 'Total Registered Users',
      kpi_users_sub: 'Active accounts / Total registered users',
      kpi_trans_title: 'Platform Translations',
      kpi_trans_sub: 'Total 3-way translated words & sentences',
      kpi_words_title: 'Saved & Mastered Words',
      kpi_words_sub: 'Mastered: Quiz ≥ 10 attempts & Accuracy > 80%',
      kpi_acc_title: 'Platform Quiz Accuracy',
      kpi_acc_sub: 'Average correct quiz answer rate across all blocks',
      chart_pair_title: '📊 Learner Distribution by Language Block ("I am" → "I learn")',
      chart_top_title: '🏆 Top Most Active Learners',
      users_title: '👥 User Account & Role Management (RBAC)',
      users_sub:
        'Search, filter by role or language pair, switch roles (User ↔ Admin), edit profile details, lock/unlock, or delete accounts.',
      progress_title: '📈 Detailed Learner Progress Tracking',
      progress_sub:
        'Click any learner row or "View Details" to inspect their active language blocks, saved notebook words, and translation history.'
    },
    hmn: {
      nav_dashboard: '📊 Saib Tag Nrho (Dashboard)',
      nav_users: '👥 Tswj Tus Tswv & Quyền',
      nav_progress: '📈 Kev Kawm Lus',
      nav_corpus: '🧠 Kawm Ntaub Ntawv (Corpus)',
      nav_profile: '👑 Hồ Sơ Admin',
      nav_logout: '🚪 Tawm (Logout)',
      portal_badge: 'KHOOM TSWJ HWM ADMIN · RBAC PORTAL',
      portal_title: 'Chaw Tswj Hwm & Saib Kev Kawm Trilinguo',
      portal_sub:
        'Saib tag nrho cov neeg kawm lus Hmoob - Kinh - Askiv, phân quyền Admin thiab saib kết quả Quiz.',
      kpi_users_title: 'Tag Nrho Cov Neeg Siv',
      kpi_users_sub: 'Cov tài khoản đang hoạt động / Tag nrho',
      kpi_trans_title: 'Tag Nrho Lượt Txhais Lus',
      kpi_trans_sub: 'Cov lus thiab kab lus tau txhais',
      kpi_words_title: 'Cov Lus Khaws & Paub Zoo (Mastered)',
      kpi_words_sub: 'Mastered: Quiz ≥ 10 zaug & Teb raug > 80%',
      kpi_acc_title: 'Độ Chính Xác Quiz Toàn Hệ Thống',
      kpi_acc_sub: 'Tỉ lệ teb raug Quiz ntawm txhua tus neeg kawm',
      chart_pair_title: '📊 Phân Bổ Khối Kawm Lus ("Kuv yog" → "Kuv kawm")',
      chart_top_title: '🏆 Top Neeg Kawm Lus Zoo Tshaj',
      users_title: '👥 Tswj Tài Khoản & Phân Quyền (RBAC)',
      users_sub:
        'Nrhiav neeg siv, hloov quyền (User ↔ Admin), kho thông tin, khóa los sis xóa tài khoản.',
      progress_title: '📈 Saib Kev Kawm Lus Ntawm Txhua Tus Neeg',
      progress_sub:
        'Nias rau ib tus neeg kawm twg kom pom chi tiết khối lus, Sổ tay cá nhân thiab keeb kwm txhais lus.'
    }
  };

  function at(key) {
    const lang =
      (global.TrilinguoI18n && global.TrilinguoI18n.getDisplayLanguage()) ||
      'vi';
    const dict = ADMIN_I18N[lang] || ADMIN_I18N.vi;
    return dict[key] || ADMIN_I18N.vi[key] || key;
  }

  function formatLangName(code) {
    const map = {
      vi: 'Việt (Kinh)',
      hmn: 'Hmong',
      en: 'Anh (EN)'
    };
    return map[code] || (code || '').toUpperCase();
  }

  function formatBlockBadge(nativeLang, targetLang) {
    return `${formatLangName(nativeLang)} → ${formatLangName(targetLang)}`;
  }

  function getRoleBadgeHTML(user) {
    const isSuper =
      (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) ||
      user.role === 'super_admin';
    if (isSuper) {
      return `<span class="admin-role-badge admin-role-badge--super" title="Quyền tối cao cố định cho ${SUPER_ADMIN_EMAIL}">👑 SUPER ADMIN (Cố định)</span>`;
    }
    if (user.role === 'admin') {
      return `<span class="admin-role-badge admin-role-badge--admin">🛡️ ADMIN</span>`;
    }
    return `<span class="admin-role-badge admin-role-badge--user">👤 USER (Học viên)</span>`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * 1. ROLE-BASED VIEW SWITCHING ENGINE
   * Hides regular learner pages and activates the Admin Portal when logged in as Admin/Super Admin.
   */
  async function syncRoleBasedView() {
    const user = global.TrilinguoAPI && global.TrilinguoAPI.getCurrentUser();
    const isAdmin =
      global.TrilinguoAPI &&
      global.TrilinguoAPI.isLoggedIn() &&
      global.TrilinguoAPI.isAdminUser(user);

    const learnerMain = document.querySelector('main.main-container');
    const postloginNav = document.getElementById('mainPostLoginNav');
    const preloginCta = document.getElementById('preloginNavCta');
    const burgerBtn = document.getElementById('mobileBurgerBtn');
    let adminRoot = document.getElementById('adminPortalRoot');

    if (!isAdmin) {
      // Restore normal learner interface
      document.body.classList.remove('is-admin-mode');
      if (learnerMain) learnerMain.style.display = '';
      if (adminRoot) adminRoot.style.display = 'none';
      if (postloginNav && savedLearnerNavHTML !== null) {
        postloginNav.innerHTML = savedLearnerNavHTML;
      }
      return false;
    }

    // Activate Full-Screen Admin Mode
    document.body.classList.add('is-admin-mode');
    if (preloginCta) preloginCta.style.display = 'none';
    if (burgerBtn) burgerBtn.style.display = '';
    if (learnerMain) learnerMain.style.display = 'none';

    if (postloginNav) {
      if (savedLearnerNavHTML === null) {
        savedLearnerNavHTML = postloginNav.innerHTML;
      }
      postloginNav.classList.remove('is-hidden');
      renderAdminNavbar(postloginNav, user);
    }

    if (!adminRoot) {
      adminRoot = document.createElement('section');
      adminRoot.id = 'adminPortalRoot';
      adminRoot.className = 'main-container admin-portal-root';
      adminRoot.setAttribute('data-func-id', 'F-46');
      adminRoot.setAttribute('data-cmp-id', 'CMP-ADM-ROOT');
      const wrapper = document.querySelector('.app-wrapper') || document.body;
      wrapper.appendChild(adminRoot);
    }
    adminRoot.style.display = 'block';

    injectAdminModalsIfNeeded();
    await loadAndRenderAdminPortal();
    return true;
  }

  function renderAdminNavbar(navEl, user) {
    const isSuper =
      (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) ||
      user.role === 'super_admin';

    navEl.innerHTML = `
      <a href="#admin-dashboard" class="nav-link ${currentAdminTab === 'dashboard' ? 'active' : ''}" data-admin-nav="dashboard" data-func-id="F-46" data-cmp-id="CMP-ADM-NAV-01">
        <span>${at('nav_dashboard')}</span>
      </a>
      <a href="#admin-users" class="nav-link ${currentAdminTab === 'users' ? 'active' : ''}" data-admin-nav="users" data-func-id="F-47" data-cmp-id="CMP-ADM-NAV-02">
        <span>${at('nav_users')}</span>
      </a>
      <a href="#admin-progress" class="nav-link ${currentAdminTab === 'progress' ? 'active' : ''}" data-admin-nav="progress" data-func-id="F-48" data-cmp-id="CMP-ADM-NAV-03">
        <span>${at('nav_progress')}</span>
      </a>
      <a href="#admin-corpus" class="nav-link ${currentAdminTab === 'corpus' ? 'active' : ''}" data-admin-nav="corpus" data-func-id="F-50" data-cmp-id="CMP-ADM-NAV-05">
        <span>${at('nav_corpus')}</span>
      </a>
      <a href="#admin-profile" class="nav-link nav-account-pill ${currentAdminTab === 'profile' ? 'active' : ''}" data-admin-nav="profile" data-func-id="F-49" data-cmp-id="CMP-ADM-NAV-04">
        <span>${isSuper ? '👑' : '🛡️'}</span>
        <strong>${escapeHtml(user.accountName)}</strong>
        <span class="nav-account-pill__block">${isSuper ? 'SUPER ADMIN' : 'ADMIN'}</span>
      </a>
      <button type="button" class="nav-link admin-logout-nav-btn" id="adminHeaderLogoutBtn" title="Đăng xuất tài khoản Quản trị viên">
        <span>${at('nav_logout')}</span>
      </button>
    `;

    navEl.querySelectorAll('[data-admin-nav]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const tab = link.getAttribute('data-admin-nav');
        switchAdminTab(tab);
        navEl.classList.remove('is-mobile-open');
      });
    });

    const logoutBtn = document.getElementById('adminHeaderLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        global.TrilinguoAPI.signOut();
        syncRoleBasedView();
        if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
          global.TrilinguoApp.showToast('Đã đăng xuất khỏi phiên Quản trị viên.', 'info');
        }
        window.location.href = 'index.html';
      });
    }
  }

  function switchAdminTab(tabName) {
    currentAdminTab = tabName || 'dashboard';
    const postloginNav = document.getElementById('mainPostLoginNav');
    const user = global.TrilinguoAPI.getCurrentUser();
    if (postloginNav && user) {
      renderAdminNavbar(postloginNav, user);
    }
    renderAdminPortalDOM();
  }

  /**
   * 2. LOAD DATA FROM /api/admin/* AND RENDER PORTAL
   */
  async function loadAndRenderAdminPortal() {
    try {
      const [stats, usersRes, corpusRes] = await Promise.all([
        global.TrilinguoAPI.getAdminDashboardStats(),
        global.TrilinguoAPI.getAdminUsers(filterState),
        global.TrilinguoAPI.getCorpusEntries(corpusFilterState.search, corpusFilterState.source)
      ]);
      cachedDashboardStats = stats;
      cachedAdminUsers = (usersRes && usersRes.items) || [];
      cachedCorpusData = corpusRes || cachedCorpusData;
      renderAdminPortalDOM();
    } catch (err) {
      if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
        global.TrilinguoApp.showToast(err.message, 'error');
      }
    }
  }

  async function refreshUsersListOnly() {
    try {
      const [stats, usersRes, corpusRes] = await Promise.all([
        global.TrilinguoAPI.getAdminDashboardStats(),
        global.TrilinguoAPI.getAdminUsers(filterState),
        global.TrilinguoAPI.getCorpusEntries(corpusFilterState.search, corpusFilterState.source)
      ]);
      cachedDashboardStats = stats;
      cachedAdminUsers = (usersRes && usersRes.items) || [];
      cachedCorpusData = corpusRes || cachedCorpusData;
      renderAdminPortalDOM();
    } catch (err) {
      if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
        global.TrilinguoApp.showToast(err.message, 'error');
      }
    }
  }

  function renderAdminPortalDOM() {
    const adminRoot = document.getElementById('adminPortalRoot');
    if (!adminRoot) return;

    const user = global.TrilinguoAPI.getCurrentUser() || {};
    const stats = cachedDashboardStats || {
      total_users: 0,
      active_users_count: 0,
      total_admins: 1,
      total_translations: 0,
      total_saved_words: 0,
      total_mastered_words: 0,
      platform_quiz_accuracy: 0,
      language_pair_distribution: [],
      top_learners: []
    };

    const isSuper =
      (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) ||
      user.role === 'super_admin';

    adminRoot.innerHTML = `
      <!-- ADMIN HERO HEADER BANNER -->
      <div class="glass-panel admin-hero-banner" data-func-id="F-46" data-cmp-id="CMP-ADM-BANNER">
        <div class="admin-hero-banner__top">
          <div>
            <span class="online-badge admin-badge-pill">${at('portal_badge')}</span>
            <h1 class="section-title" style="margin-top:0.55rem;">${at('portal_title')}</h1>
            <p class="section-subtitle">${at('portal_sub')}</p>
          </div>
          <div class="admin-identity-box">
            <div class="admin-identity-box__avatar">${isSuper ? '👑' : '🛡️'}</div>
            <div>
              <div style="font-weight:900;font-size:0.98rem;color:var(--text-heading);">${escapeHtml(user.accountName)}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);font-weight:700;">${escapeHtml(user.email || SUPER_ADMIN_EMAIL)}</div>
              <div style="margin-top:0.25rem;">${getRoleBadgeHTML(user)}</div>
            </div>
          </div>
        </div>

        <!-- Quick Sub-navigation Tabs inside Admin Portal -->
        <div class="admin-subtabs" role="tablist">
          <button type="button" class="category-pill ${currentAdminTab === 'dashboard' ? 'active' : ''}" data-switch-admin-tab="dashboard">
            ${at('nav_dashboard')}
          </button>
          <button type="button" class="category-pill ${currentAdminTab === 'users' ? 'active' : ''}" data-switch-admin-tab="users">
            ${at('nav_users')} (${stats.total_users})
          </button>
          <button type="button" class="category-pill ${currentAdminTab === 'progress' ? 'active' : ''}" data-switch-admin-tab="progress">
            ${at('nav_progress')}
          </button>
          <button type="button" class="category-pill ${currentAdminTab === 'corpus' ? 'active' : ''}" data-switch-admin-tab="corpus">
            ${at('nav_corpus')} (${cachedCorpusData.total || 0})
          </button>
          <button type="button" class="category-pill ${currentAdminTab === 'profile' ? 'active' : ''}" data-switch-admin-tab="profile">
            ${at('nav_profile')}
          </button>
        </div>
      </div>

      <!-- TAB 1: DASHBOARD OVERVIEW -->
      <div class="admin-tab-pane ${currentAdminTab === 'dashboard' ? 'is-active' : ''}" id="adminTabDashboard">
        ${renderDashboardSectionHTML(stats)}
      </div>

      <!-- TAB 2: USER & ROLE MANAGEMENT (RBAC) -->
      <div class="admin-tab-pane ${currentAdminTab === 'users' ? 'is-active' : ''}" id="adminTabUsers">
        ${renderUsersManagementSectionHTML(stats)}
      </div>

      <!-- TAB 3: USER LEARNING PROGRESS -->
      <div class="admin-tab-pane ${currentAdminTab === 'progress' ? 'is-active' : ''}" id="adminTabProgress">
        ${renderLearningProgressSectionHTML()}
      </div>

      <!-- TAB 4: CORPUS & DOCUMENT UPLOAD TRAINING -->
      <div class="admin-tab-pane ${currentAdminTab === 'corpus' ? 'is-active' : ''}" id="adminTabCorpus">
        ${renderCorpusTrainingSectionHTML()}
      </div>

      <!-- TAB 5: ADMIN PROFILE & SYSTEM SETTINGS -->
      <div class="admin-tab-pane ${currentAdminTab === 'profile' ? 'is-active' : ''}" id="adminTabProfile">
        ${renderAdminProfileSectionHTML(user)}
      </div>
    `;

    bindAdminPortalEvents(adminRoot);
  }

  /**
   * AREA 1: DASHBOARD KPI CARDS + LANGUAGE PAIR CHART + TOP LEARNERS
   */
  function renderDashboardSectionHTML(stats) {
    const pairList = stats.language_pair_distribution || [];
    const topLearners = stats.top_learners || [];

    return `
      <!-- 4 KPI 3D CARDS -->
      <div class="admin-kpi-grid" data-func-id="F-46" data-cmp-id="CMP-ADM-KPI">
        <article class="metric-card-3d admin-kpi-card">
          <div class="card-3d__top">
            <span class="card-3d__category">👥 USERS & ADMINS</span>
            <span class="online-badge">${stats.total_admins} Admin</span>
          </div>
          <div class="metric-card-3d__value">${stats.active_users_count} <span style="font-size:1.25rem;color:var(--text-muted);font-weight:700;">/ ${stats.total_users}</span></div>
          <div class="metric-card-3d__label">${at('kpi_users_title')}</div>
          <div class="metric-card-3d__formula">${at('kpi_users_sub')}</div>
        </article>

        <article class="metric-card-3d admin-kpi-card">
          <div class="card-3d__top">
            <span class="card-3d__category">🌐 3-WAY TRANSLATIONS</span>
            <span class="card-3d__pos">EN ↔ VI ↔ HMN</span>
          </div>
          <div class="metric-card-3d__value" style="color:var(--color-main-orange);">${stats.total_translations}</div>
          <div class="metric-card-3d__label">${at('kpi_trans_title')}</div>
          <div class="metric-card-3d__formula">${at('kpi_trans_sub')}</div>
        </article>

        <article class="metric-card-3d admin-kpi-card">
          <div class="card-3d__top">
            <span class="card-3d__category">📚 NOTEBOOK & MASTERED</span>
            <span class="mastery-pill is-mastered">⭐ ${stats.total_mastered_words} Mastered</span>
          </div>
          <div class="metric-card-3d__value">${stats.total_saved_words} <span style="font-size:1.1rem;color:var(--color-element-forest);">(${stats.total_mastered_words} ⭐)</span></div>
          <div class="metric-card-3d__label">${at('kpi_words_title')}</div>
          <div class="metric-card-3d__formula">${at('kpi_words_sub')}</div>
        </article>

        <article class="metric-card-3d admin-kpi-card">
          <div class="card-3d__top">
            <span class="card-3d__category">🎯 QUIZ ACCURACY</span>
            <span class="online-badge">Real-Time</span>
          </div>
          <div class="metric-card-3d__value">${stats.platform_quiz_accuracy}%</div>
          <div class="metric-card-3d__label">${at('kpi_acc_title')}</div>
          <div class="admin-progress-bar-wrap" style="margin-top:0.35rem;">
            <div class="admin-progress-bar-fill" style="width:${Math.min(100, stats.platform_quiz_accuracy)}%;"></div>
          </div>
        </article>
      </div>

      <!-- CHARTS & TOP LEARNERS GRID -->
      <div class="admin-charts-grid">
        <!-- Language Pair Distribution Visual Bar Chart -->
        <div class="glass-panel" style="margin-bottom:0;" data-func-id="F-46" data-cmp-id="CMP-ADM-CHART-PAIR">
          <h2 style="font-size:1.15rem;font-weight:900;color:var(--text-heading);margin-bottom:0.35rem;">
            ${at('chart_pair_title')}
          </h2>
          <p style="font-size:0.82rem;color:var(--text-secondary);font-weight:600;margin-bottom:1.1rem;">
            Thống kê tỷ lệ người học theo 6 cặp ngôn ngữ thực tế trên hệ thống Trilinguo
          </p>
          <div class="admin-pair-bars">
            ${pairList
              .map(
                p => `
              <div class="admin-pair-row">
                <div class="admin-pair-row__meta">
                  <span class="admin-pair-row__label">${escapeHtml(p.label)}</span>
                  <span class="admin-pair-row__val"><strong>${p.count}</strong> học viên (${p.percentage}%)</span>
                </div>
                <div class="admin-progress-bar-wrap">
                  <div class="admin-progress-bar-fill admin-progress-bar-fill--teal" style="width:${Math.max(p.percentage, p.count > 0 ? 8 : 0)}%;"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Top Active Learners Leaderboard -->
        <div class="glass-panel" style="margin-bottom:0;" data-func-id="F-46" data-cmp-id="CMP-ADM-TOP-USERS">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.85rem;">
            <h2 style="font-size:1.15rem;font-weight:900;color:var(--text-heading);">
              ${at('chart_top_title')}
            </h2>
            <button type="button" class="btn-tool btn-tool--outline" style="padding:0.4rem 0.8rem;font-size:0.78rem;" data-switch-admin-tab="progress">
              Xem tất cả →
            </button>
          </div>

          <div class="admin-table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Học viên</th>
                  <th>Khối học</th>
                  <th>Sổ tay / Mastered</th>
                  <th>Quiz Acc</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                ${topLearners
                  .map(
                    (u, idx) => `
                  <tr>
                    <td><strong>#${idx + 1}</strong></td>
                    <td>
                      <div style="font-weight:800;color:var(--text-primary);">${escapeHtml(u.username || u.account_name)}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(u.email)}</div>
                    </td>
                    <td><span class="card-3d__category">${formatBlockBadge(u.native_lang, u.target_lang)}</span></td>
                    <td><strong>${u.total_saved_words}</strong> từ · <span style="color:var(--color-element-forest);font-weight:800;">⭐ ${u.mastered_words}</span></td>
                    <td><strong style="color:var(--color-main-orange);">${u.quiz_accuracy}%</strong></td>
                    <td>
                      <button type="button" class="listen-btn" data-inspect-user="${u.id}" style="padding:0.32rem 0.65rem;font-size:0.76rem;">
                        🔍 Tiến độ
                      </button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * AREA 2: USER & ROLE MANAGEMENT (SEARCH, FILTER, ROLE DROPDOWN, EDIT, LOCK, DELETE)
   */
  function renderUsersManagementSectionHTML() {
    return `
      <div class="glass-panel" data-func-id="F-47" data-cmp-id="CMP-ADM-USERS">
        <div class="section-header">
          <div>
            <h2 class="section-title" style="font-size:1.45rem;">${at('users_title')}</h2>
            <p class="section-subtitle">${at('users_sub')}</p>
          </div>
          <div style="font-size:0.84rem;font-weight:800;color:var(--color-main-dark-teal);background:var(--badge-bg);padding:0.5rem 0.9rem;border-radius:12px;">
            👑 Quy tắc bảo vệ bất biến: <strong>${SUPER_ADMIN_EMAIL}</strong> luôn giữ quyền Super Admin tối cao
          </div>
        </div>

        <!-- SEARCH & FILTER TOOLBAR -->
        <div class="admin-filter-toolbar">
          <div class="form-group" style="flex:2;min-width:220px;">
            <label class="form-label">🔍 Tìm kiếm nhanh (Tên, Gmail, SĐT):</label>
            <input type="search" id="adminUserSearchInput" class="form-control" placeholder="Nhập Gmail (VD: poheternal@gmail.com), tên hoặc SĐT..." value="${escapeHtml(filterState.search)}" />
          </div>

          <div class="form-group" style="flex:1;min-width:165px;">
            <label class="form-label">🛡️ Lọc theo Quyền (Role):</label>
            <select id="adminRoleFilterSelect" class="form-control">
              <option value="all" ${filterState.role === 'all' ? 'selected' : ''}>Tất cả quyền (${cachedAdminUsers.length})</option>
              <option value="super_admin" ${filterState.role === 'super_admin' ? 'selected' : ''}>👑 Super Admin</option>
              <option value="admin" ${filterState.role === 'admin' ? 'selected' : ''}>🛡️ Admin</option>
              <option value="user" ${filterState.role === 'user' ? 'selected' : ''}>👤 User (Học viên)</option>
            </select>
          </div>

          <div class="form-group" style="flex:1;min-width:185px;">
            <label class="form-label">🌐 Lọc theo Khối ngôn ngữ:</label>
            <select id="adminLangFilterSelect" class="form-control">
              <option value="all" ${filterState.langPair === 'all' ? 'selected' : ''}>Tất cả cặp ngôn ngữ</option>
              <option value="vi_hmn" ${filterState.langPair === 'vi_hmn' ? 'selected' : ''}>Việt (Kinh) → Hmong</option>
              <option value="hmn_vi" ${filterState.langPair === 'hmn_vi' ? 'selected' : ''}>Hmong → Việt (Kinh)</option>
              <option value="en_hmn" ${filterState.langPair === 'en_hmn' ? 'selected' : ''}>Anh (EN) → Hmong</option>
              <option value="hmn_en" ${filterState.langPair === 'hmn_en' ? 'selected' : ''}>Hmong → Anh (EN)</option>
              <option value="vi_en" ${filterState.langPair === 'vi_en' ? 'selected' : ''}>Việt (Kinh) → Anh (EN)</option>
              <option value="en_vi" ${filterState.langPair === 'en_vi' ? 'selected' : ''}>Anh (EN) → Việt (Kinh)</option>
            </select>
          </div>

          <div style="display:flex;align-items:flex-end;">
            <button type="button" id="adminResetFiltersBtn" class="btn-tool btn-tool--outline" style="height:44px;">
              ↻ Làm mới
            </button>
          </div>
        </div>

        <!-- RESPONSIVE USERS TABLE -->
        <div class="admin-table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Thông tin Người dùng (Tên / Gmail / SĐT)</th>
                <th>Ngôn ngữ ("Tôi là" → "Muốn học")</th>
                <th>Quyền hiện tại</th>
                <th>Trạng thái</th>
                <th>Phân quyền nhanh</th>
                <th>Hành động Quản trị</th>
              </tr>
            </thead>
            <tbody>
              ${
                cachedAdminUsers.length === 0
                  ? `<tr><td colspan="7" style="text-align:center;padding:2rem;font-weight:700;color:var(--text-muted);">Không tìm thấy người dùng nào khớp với bộ lọc hiện tại.</td></tr>`
                  : cachedAdminUsers
                      .map(u => {
                        const isSuper =
                          (u.email && u.email.toLowerCase() === SUPER_ADMIN_EMAIL) ||
                          u.role === 'super_admin';
                        const isActive = u.is_active !== false;

                        return `
                        <tr class="${!isActive ? 'is-locked-row' : ''}">
                          <td><strong>#${u.id}</strong></td>
                          <td>
                            <div style="font-weight:800;font-size:0.95rem;color:var(--text-primary);">
                              ${escapeHtml(u.username || u.account_name)}
                            </div>
                            <div style="font-size:0.8rem;color:var(--color-main-dark-teal);font-weight:700;">
                              ✉️ ${escapeHtml(u.email || 'Chưa cập nhật')}
                            </div>
                            <div style="font-size:0.76rem;color:var(--text-muted);">
                              📞 ${escapeHtml(u.phone || '—')}
                            </div>
                          </td>
                          <td>
                            <span class="card-3d__category">${formatBlockBadge(u.native_lang, u.target_lang)}</span>
                          </td>
                          <td>
                            ${getRoleBadgeHTML(u)}
                          </td>
                          <td>
                            <span class="admin-status-pill ${isActive ? 'is-active' : 'is-locked'}">
                              ${isActive ? '🟢 Hoạt động' : '🔴 Đã khóa'}
                            </span>
                          </td>
                          <td>
                            ${
                              isSuper
                                ? `<span class="admin-super-lock-pill" title="Không ai có quyền hạ quyền của ${SUPER_ADMIN_EMAIL}">🔒 Super Admin (Cố định)</span>`
                                : `
                                <select class="form-control admin-role-select" data-role-switch-user="${u.id}" style="padding:0.42rem 0.65rem;font-size:0.82rem;min-width:130px;">
                                  <option value="user" ${u.role === 'user' ? 'selected' : ''}>👤 User (Học viên)</option>
                                  <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>🛡️ Admin (Quản trị)</option>
                                </select>
                              `
                            }
                          </td>
                          <td>
                            <div class="admin-action-btns">
                              <button type="button" class="listen-btn" data-edit-user="${u.id}" title="Chỉnh sửa thông tin">
                                ✏️ Sửa
                              </button>
                              <button type="button" class="listen-btn" data-inspect-user="${u.id}" title="Xem chi tiết tiến độ học tập">
                                📈 Tiến độ
                              </button>
                              ${
                                isSuper
                                  ? ''
                                  : `
                                  <button type="button" class="listen-btn" data-toggle-lock-user="${u.id}" style="color:${isActive ? '#b45309' : '#15803d'};">
                                    ${isActive ? '🔒 Khóa' : '🔓 Mở khóa'}
                                  </button>
                                  <button type="button" class="clear-text-btn" data-delete-user="${u.id}">
                                    🗑️ Xóa
                                  </button>
                                `
                              }
                            </div>
                          </td>
                        </tr>
                      `;
                      })
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * AREA 3: USER LEARNING PROGRESS TABLE & CLICK-TO-INSPECT MODAL
   */
  function renderLearningProgressSectionHTML() {
    const kw = (progressSearchQuery || '').trim().toLowerCase();
    const filtered = cachedAdminUsers.filter(
      u =>
        !kw ||
        (u.username || u.account_name || '').toLowerCase().includes(kw) ||
        (u.email || '').toLowerCase().includes(kw)
    );

    return `
      <div class="glass-panel" data-func-id="F-48" data-cmp-id="CMP-ADM-PROGRESS">
        <div class="section-header">
          <div>
            <h2 class="section-title" style="font-size:1.45rem;">${at('progress_title')}</h2>
            <p class="section-subtitle">${at('progress_sub')}</p>
          </div>
          <div style="min-width:260px;">
            <input type="search" id="adminProgressSearchInput" class="form-control" placeholder="🔍 Lọc học viên theo tên hoặc Gmail..." value="${escapeHtml(progressSearchQuery)}" />
          </div>
        </div>

        <div class="admin-table-responsive">
          <table class="admin-table admin-table--clickable">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Số khối đang học</th>
                <th>Khối ngôn ngữ chính</th>
                <th>Số câu đã dịch</th>
                <th>Từ trong Sổ tay</th>
                <th>Số từ Mastered (≥10 lần & >80%)</th>
                <th>Tỉ lệ đúng Quiz (Accuracy %)</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map(
                  u => `
                <tr data-inspect-user-row="${u.id}" style="cursor:pointer;" title="Nhấn để xem chi tiết Sổ tay & Lịch sử dịch của ${escapeHtml(u.username || u.account_name)}">
                  <td>
                    <div style="font-weight:800;color:var(--text-primary);">${escapeHtml(u.username || u.account_name)}</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);">${escapeHtml(u.email)}</div>
                  </td>
                  <td><strong>${u.blocks_count || 1} khối</strong></td>
                  <td><span class="card-3d__category">${formatBlockBadge(u.native_lang, u.target_lang)}</span></td>
                  <td><strong>${u.total_translations}</strong> câu</td>
                  <td><strong>${u.total_saved_words}</strong> từ</td>
                  <td>
                    <span class="mastery-pill ${u.mastered_words > 0 ? 'is-mastered' : ''}">
                      ⭐ ${u.mastered_words} / ${u.total_saved_words} từ
                    </span>
                  </td>
                  <td style="min-width:170px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.82rem;font-weight:800;margin-bottom:0.25rem;">
                      <span style="color:var(--color-main-dark-teal);">${u.quiz_accuracy}%</span>
                      <span style="color:var(--text-muted);font-size:0.74rem;">(${u.total_quiz_correct}/${u.total_quiz_questions} câu)</span>
                    </div>
                    <div class="admin-progress-bar-wrap">
                      <div class="admin-progress-bar-fill" style="width:${Math.min(100, u.quiz_accuracy)}%;"></div>
                    </div>
                  </td>
                  <td>
                    <button type="button" class="btn-save-notebook" data-inspect-user="${u.id}" style="padding:0.42rem 0.8rem;font-size:0.78rem;">
                      🔍 Xem chi tiết
                    </button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * AREA 3B: CORPUS & DOCUMENT UPLOAD TRAINING TAB (ADMIN / SUPER ADMIN)
   */
  function renderCorpusTrainingSectionHTML() {
    const entries = cachedCorpusData.entries || [];
    const logs = cachedCorpusData.document_logs || [];
    const totalCount = cachedCorpusData.total ?? entries.length;
    const userCount = cachedCorpusData.user_contribution_count ?? 0;
    const docCount = cachedCorpusData.admin_document_count ?? 0;

    return `
      <div class="glass-panel" data-func-id="F-50" data-cmp-id="CMP-ADM-CORPUS">
        <div class="section-header" style="flex-wrap:wrap;gap:1rem;">
          <div>
            <h2 class="section-title" style="font-size:1.45rem;">🧠 Trung Tâm Nạp Tài Liệu &amp; Huấn Luyện Từ Điển AI 3 Chiều</h2>
            <p class="section-subtitle">
              Tải lên file tài liệu (<code>.csv</code>, <code>.tsv</code>, <code>.txt</code>, <code>.json</code>, <code>.md</code>) hoặc nhập lô dữ liệu. Hệ thống Dịch thuật 3 chiều sẽ tự động học, gộp nghĩa bổ sung và cập nhật dần dần từ cả <strong>2 nguồn</strong>: <em>Đóng góp của Người học</em> và <em>Tài liệu của Admin</em>.
            </p>
          </div>
          <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
            <div style="background:rgba(15,118,110,0.1);border:1.5px solid rgba(15,118,110,0.28);border-radius:12px;padding:0.45rem 0.85rem;text-align:center;">
              <div style="font-size:0.7rem;font-weight:800;color:#0F766E;">TỔNG TỪ ĐÃ HỌC</div>
              <div style="font-size:1.25rem;font-weight:900;color:#0F766E;">${totalCount}</div>
            </div>
            <div style="background:rgba(217,119,6,0.1);border:1.5px solid rgba(217,119,6,0.28);border-radius:12px;padding:0.45rem 0.85rem;text-align:center;">
              <div style="font-size:0.7rem;font-weight:800;color:#B45309;">🌱 NGƯỜI HỌC ĐÓNG GÓP</div>
              <div style="font-size:1.25rem;font-weight:900;color:#B45309;">${userCount}</div>
            </div>
            <div style="background:rgba(37,99,235,0.1);border:1.5px solid rgba(37,99,235,0.28);border-radius:12px;padding:0.45rem 0.85rem;text-align:center;">
              <div style="font-size:0.7rem;font-weight:800;color:#1D4ED8;">📄 TÀI LIỆU ADMIN</div>
              <div style="font-size:1.25rem;font-weight:900;color:#1D4ED8;">${docCount}</div>
            </div>
          </div>
        </div>

        <!-- 2-COLUMN ADMIN CORPUS LAYOUT -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:1.35rem;align-items:start;margin-top:0.5rem;">
          <!-- LEFT COLUMN: DOCUMENT FILE UPLOADER & BATCH TRAINER -->
          <div style="background:var(--surface-muted);border:1.5px solid var(--border-subtle);border-radius:16px;padding:1.25rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
              <h3 style="margin:0;font-size:1.08rem;font-weight:900;color:var(--text-heading);">
                📤 1. Upload File Tài Liệu Huấn Luyện Hệ Thống
              </h3>
              <button type="button" id="adminDownloadSampleDocBtn" class="btn-save-notebook" style="font-size:0.75rem;padding:0.3rem 0.7rem;">
                📥 Tải File Mẫu (.csv)
              </button>
            </div>

            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:0.85rem;">
              Hỗ trợ tải lên một hoặc nhiều file <strong>.csv, .tsv, .txt, .json, .md</strong>. Mỗi dòng gồm <strong>Từ/Câu Tiếng Mông</strong> (bắt buộc) và <strong>tối thiểu 1 trong 2 bản dịch</strong> (Tiếng Việt hoặc Tiếng Anh), phân tách bằng dấu <code>,</code>, <code>|</code> hoặc <code>Tab</code>.
            </div>

            <label
              for="adminCorpusFileInput"
              style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.35rem 1rem;border:2px dashed rgba(15,118,110,0.45);border-radius:14px;background:rgba(15,118,110,0.05);cursor:pointer;text-align:center;transition:0.2s;"
            >
              <span style="font-size:2rem;margin-bottom:0.3rem;">📁</span>
              <span style="font-weight:800;color:var(--color-main-dark-teal);">Bấm để chọn File Tài liệu (.csv, .txt, .tsv, .json, .md)</span>
              <span style="font-size:0.76rem;color:var(--text-muted);margin-top:0.2rem;">Có thể chọn nhiều file tài liệu cùng lúc</span>
              <input
                type="file"
                id="adminCorpusFileInput"
                accept=".csv,.tsv,.txt,.json,.md"
                multiple
                style="display:none;"
              />
            </label>

            <div id="adminCorpusFilePreview" style="margin-top:0.75rem;font-size:0.82rem;color:var(--text-secondary);"></div>

            <div class="form-group" style="margin-top:0.9rem;">
              <label class="form-label" for="adminCorpusBatchTextarea">
                Hoặc dán trực tiếp nội dung tài liệu (Mỗi dòng: <code>Tiếng Mông | Tiếng Việt | Tiếng Anh</code>):
              </label>
              <textarea
                id="adminCorpusBatchTextarea"
                class="form-control"
                rows="5"
                placeholder="Nyob zoo kuv tsev neeg | Xin chào gia đình tôi | Hello my family&#10;Kuv xav mus Tả Van | Tôi muốn đi bản Tả Van | I want to go to Ta Van village&#10;Ua tsaug koj pab kuv | Cảm ơn bạn đã giúp tôi |"
                style="font-family:monospace;font-size:0.83rem;"
              ></textarea>
            </div>

            <div id="adminCorpusStatusMsg" class="is-hidden" style="margin-top:0.75rem;padding:0.75rem 0.9rem;border-radius:10px;font-size:0.84rem;font-weight:700;"></div>

            <div style="display:flex;gap:0.65rem;flex-wrap:wrap;margin-top:0.9rem;">
              <button type="button" id="adminTrainDocumentBtn" class="btn-tool btn-tool--flashcard" style="flex:1;justify-content:center;">
                🚀 Nạp Tài Liệu &amp; Dạy Hệ Thống Ngay
              </button>
            </div>

            <!-- Document Upload Logs -->
            <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border-subtle);">
              <h4 style="margin:0 0 0.5rem;font-size:0.88rem;font-weight:900;color:var(--text-heading);">
                🗂️ Lịch sử File Tài liệu Admin đã nạp (${logs.length} lần nạp)
              </h4>
              <div style="max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:0.4rem;">
                ${
                  logs.length === 0
                    ? `<div style="font-size:0.8rem;color:var(--text-muted);">Chưa có file tài liệu nào được tải lên.</div>`
                    : logs
                        .map(
                          log => `
                      <div style="font-size:0.78rem;background:var(--surface-card, rgba(255,255,255,0.75));padding:0.45rem 0.65rem;border-radius:8px;border:1px solid var(--border-subtle);display:flex;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
                        <span>📄 <strong>${escapeHtml(log.filename)}</strong></span>
                        <span style="color:#0F766E;font-weight:800;">+${log.inserted_count} mới · 🔄 ${log.updated_count} cập nhật</span>
                      </div>
                    `
                        )
                        .join('')
                }
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: UNIFIED LEARNED KNOWLEDGE BASE (USER CONTRIBUTIONS + ADMIN DOCS) -->
          <div style="background:var(--surface-muted);border:1.5px solid var(--border-subtle);border-radius:16px;padding:1.25rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
              <h3 style="margin:0;font-size:1.08rem;font-weight:900;color:var(--text-heading);">
                📚 2. Kho Tri Thức Hệ Thống Đã Học (${entries.length} mục)
              </h3>
            </div>

            <div style="display:flex;gap:0.55rem;flex-wrap:wrap;margin-bottom:0.85rem;">
              <input
                type="search"
                id="adminCorpusSearchInput"
                class="form-control"
                style="flex:1;min-width:180px;"
                placeholder="🔍 Tìm từ HMN / VI / EN hoặc tên tài liệu..."
                value="${escapeHtml(corpusFilterState.search)}"
              />
              <select id="adminCorpusSourceSelect" class="form-control" style="width:auto;">
                <option value="all" ${corpusFilterState.source === 'all' ? 'selected' : ''}>Tất cả nguồn (${totalCount})</option>
                <option value="user_contribution" ${corpusFilterState.source === 'user_contribution' ? 'selected' : ''}>🌱 Người học đóng góp (${userCount})</option>
                <option value="admin_document" ${corpusFilterState.source === 'admin_document' ? 'selected' : ''}>📄 Tài liệu Admin (${docCount})</option>
              </select>
            </div>

            <div class="admin-table-responsive" style="max-height:460px;overflow-y:auto;">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Tiếng Mông (HMN)</th>
                    <th>Tiếng Việt (VI)</th>
                    <th>Tiếng Anh (EN)</th>
                    <th>Nguồn dữ liệu</th>
                    <th>Độ chín</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    entries.length === 0
                      ? `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-muted);">Chưa có mục từ vựng nào trong Kho Tri Thức Đã Học. Hãy tải lên file tài liệu ở cột bên trái!</td></tr>`
                      : entries
                          .map(item => {
                            const isDoc = item.source_type === 'admin_document';
                            return `
                          <tr>
                            <td>
                              <strong style="color:var(--color-main-orange);">${escapeHtml(item.hmn_text)}</strong>
                              <div style="font-size:0.72rem;color:var(--text-muted);">/${escapeHtml(item.phonetic || '')}/</div>
                            </td>
                            <td>${item.vi_text ? escapeHtml(item.vi_text) : '<em style="opacity:0.55;">—</em>'}</td>
                            <td>${item.en_text ? escapeHtml(item.en_text) : '<em style="opacity:0.55;">—</em>'}</td>
                            <td>
                              <span style="display:inline-block;padding:0.18rem 0.55rem;border-radius:999px;font-size:0.72rem;font-weight:800;background:${isDoc ? '#DBEAFE' : '#ECFDF5'};color:${isDoc ? '#1D4ED8' : '#047857'};">
                                ${isDoc ? '📄 Tài liệu' : '🌱 Người học'}
                              </span>
                              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.15rem;">${escapeHtml(item.source_name || '')}</div>
                            </td>
                            <td>
                              <span class="mastery-pill is-mastered">🔄 v${item.revision_count || 1}</span>
                            </td>
                            <td>
                              <button
                                type="button"
                                class="btn-tool btn-tool--outline"
                                data-delete-corpus-id="${item.id}"
                                style="padding:0.28rem 0.6rem;font-size:0.74rem;border-color:#d94848;color:#d94848;"
                                title="Xóa mục này khỏi bộ nhớ đã học"
                              >
                                🗑️ Xóa
                              </button>
                            </td>
                          </tr>
                        `;
                          })
                          .join('')
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * AREA 4: ADMIN PROFILE & LOGOUT TAB
   */
  function renderAdminProfileSectionHTML(user) {
    const isSuper =
      (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) ||
      user.role === 'super_admin';

    return `
      <div class="glass-panel" data-func-id="F-49" data-cmp-id="CMP-ADM-PROFILE">
        <div class="section-header">
          <div>
            <h2 class="section-title" style="font-size:1.45rem;">👑 Hồ sơ Quản trị viên & Cài đặt Phiên</h2>
            <p class="section-subtitle">Cập nhật thông tin tài khoản Admin hoặc đăng xuất khỏi hệ thống quản trị.</p>
          </div>
          <div>${getRoleBadgeHTML(user)}</div>
        </div>

        <form id="adminSelfProfileForm" class="profile-form-grid">
          <div class="form-group">
            <label class="form-label">Tên hiển thị Quản trị viên:</label>
            <input type="text" id="adminProfName" class="form-control" value="${escapeHtml(user.accountName)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Địa chỉ Gmail Quản trị (${isSuper ? 'Cố định Super Admin' : 'Admin'}):</label>
            <input type="email" id="adminProfEmail" class="form-control" value="${escapeHtml(user.email || SUPER_ADMIN_EMAIL)}" ${isSuper ? 'readonly style="opacity:0.8;cursor:not-allowed;"' : ''} />
          </div>
          <div class="form-group">
            <label class="form-label">Số điện thoại liên hệ:</label>
            <input type="tel" id="adminProfPhone" class="form-control" value="${escapeHtml(user.phone || '0901234567')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Ngôn ngữ giao diện mặc định ("Tôi là"):</label>
            <select id="adminProfNativeLang" class="form-control">
              <option value="vi" ${user.nativeLang === 'vi' ? 'selected' : ''}>Tiếng Kinh / Việt (VI)</option>
              <option value="hmn" ${user.nativeLang === 'hmn' ? 'selected' : ''}>Tiếng Hmong (HMN)</option>
              <option value="en" ${user.nativeLang === 'en' ? 'selected' : ''}>Tiếng Anh (EN)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ngôn ngữ đối chiếu ("Tôi muốn học"):</label>
            <select id="adminProfTargetLang" class="form-control">
              <option value="hmn" ${user.targetLang === 'hmn' ? 'selected' : ''}>Tiếng Hmong (HMN)</option>
              <option value="en" ${user.targetLang === 'en' ? 'selected' : ''}>Tiếng Anh (EN)</option>
              <option value="vi" ${user.targetLang === 'vi' ? 'selected' : ''}>Tiếng Kinh / Việt (VI)</option>
            </select>
          </div>
          <div class="form-group" style="justify-content:flex-end;">
            <div style="display:flex;gap:0.65rem;flex-wrap:wrap;margin-top:auto;">
              <button type="submit" class="btn-tool btn-tool--flashcard">
                💾 Lưu Hồ sơ Admin
              </button>
              <button type="button" id="adminProfileLogoutBtn" class="btn-tool btn-tool--outline" style="border-color:#d94848;color:#d94848;">
                🚪 Đăng xuất tài khoản
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * 3. ADMIN MODALS (EDIT USER MODAL & DETAILED USER PROGRESS MODAL)
   */
  function injectAdminModalsIfNeeded() {
    if (document.getElementById('adminEditUserModalBackdrop')) return;

    const modalsHTML = `
      <!-- MODAL 1: EDIT USER INFORMATION -->
      <div class="modal-backdrop" id="adminEditUserModalBackdrop">
        <div class="modal-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <h2 style="font-size:1.2rem;font-weight:900;color:var(--text-heading);">✏️ Chỉnh sửa Thông tin Người dùng</h2>
            <button type="button" id="closeAdminEditUserModalBtn" style="border:none;background:transparent;font-size:1.35rem;cursor:pointer;color:var(--text-muted);">✕</button>
          </div>
          <form id="adminEditUserForm" style="display:flex;flex-direction:column;gap:0.8rem;">
            <input type="hidden" id="editUserIdInput" />
            <div class="form-group">
              <label class="form-label">Tên tài khoản (Username):</label>
              <input type="text" id="editUserNameInput" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Địa chỉ Gmail:</label>
              <input type="email" id="editUserEmailInput" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Số điện thoại:</label>
              <input type="text" id="editUserPhoneInput" class="form-control" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.7rem;">
              <div class="form-group">
                <label class="form-label">Ngôn ngữ "Tôi là":</label>
                <select id="editUserNativeLangSelect" class="form-control">
                  <option value="vi">Việt / Kinh (VI)</option>
                  <option value="hmn">Hmong (HMN)</option>
                  <option value="en">Anh (EN)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Ngôn ngữ "Muốn học":</label>
                <select id="editUserTargetLangSelect" class="form-control">
                  <option value="hmn">Hmong (HMN)</option>
                  <option value="vi">Việt / Kinh (VI)</option>
                  <option value="en">Anh (EN)</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Trạng thái hoạt động:</label>
              <select id="editUserActiveSelect" class="form-control">
                <option value="true">🟢 Đang hoạt động (Active)</option>
                <option value="false">🔴 Tạm khóa tài khoản (Locked)</option>
              </select>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:0.6rem;margin-top:0.4rem;">
              <button type="button" id="cancelAdminEditUserBtn" class="btn-tool btn-tool--outline">Hủy</button>
              <button type="submit" class="btn-tool btn-tool--flashcard">💾 Lưu thay đổi</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 2: USER DETAILED LEARNING PROGRESS -->
      <div class="modal-backdrop" id="adminUserProgressModalBackdrop">
        <div class="modal-card modal-card--wide" style="width:min(100%, 840px);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <div>
              <h2 style="font-size:1.25rem;font-weight:900;color:var(--text-heading);" id="progModalTitle">📈 Chi tiết Tiến độ Học viên</h2>
              <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;" id="progModalSub"></p>
            </div>
            <button type="button" id="closeAdminProgressModalBtn" style="border:none;background:transparent;font-size:1.35rem;cursor:pointer;color:var(--text-muted);">✕</button>
          </div>
          <div id="adminUserProgressModalBody"></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalsHTML);

    const editBackdrop = document.getElementById('adminEditUserModalBackdrop');
    const progBackdrop = document.getElementById('adminUserProgressModalBackdrop');

    document.getElementById('closeAdminEditUserModalBtn').addEventListener('click', () => {
      editBackdrop.classList.remove('is-open');
    });
    document.getElementById('cancelAdminEditUserBtn').addEventListener('click', () => {
      editBackdrop.classList.remove('is-open');
    });
    document.getElementById('closeAdminProgressModalBtn').addEventListener('click', () => {
      progBackdrop.classList.remove('is-open');
    });

    document.getElementById('adminEditUserForm').addEventListener('submit', async e => {
      e.preventDefault();
      const uid = Number(document.getElementById('editUserIdInput').value);
      const payload = {
        username: document.getElementById('editUserNameInput').value.trim(),
        email: document.getElementById('editUserEmailInput').value.trim(),
        phone: document.getElementById('editUserPhoneInput').value.trim(),
        native_lang: document.getElementById('editUserNativeLangSelect').value,
        active_target_lang: document.getElementById('editUserTargetLangSelect').value,
        is_active: document.getElementById('editUserActiveSelect').value === 'true'
      };
      try {
        const res = await global.TrilinguoAPI.adminUpdateUser(uid, payload);
        editBackdrop.classList.remove('is-open');
        if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
          global.TrilinguoApp.showToast(res.message || 'Đã cập nhật người dùng!', 'success');
        }
        await refreshUsersListOnly();
      } catch (err) {
        if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
          global.TrilinguoApp.showToast(err.message, 'error');
        }
      }
    });
  }

  function openEditUserModal(userId) {
    const u = cachedAdminUsers.find(x => Number(x.id) === Number(userId));
    if (!u) return;
    const isSuper =
      (u.email && u.email.toLowerCase() === SUPER_ADMIN_EMAIL) ||
      u.role === 'super_admin';

    document.getElementById('editUserIdInput').value = u.id;
    document.getElementById('editUserNameInput').value = u.username || u.account_name || '';
    const emailInput = document.getElementById('editUserEmailInput');
    emailInput.value = u.email || '';
    emailInput.readOnly = isSuper;
    document.getElementById('editUserPhoneInput').value = u.phone || '';
    document.getElementById('editUserNativeLangSelect').value = u.native_lang || 'vi';
    document.getElementById('editUserTargetLangSelect').value = u.target_lang || 'hmn';
    const activeSelect = document.getElementById('editUserActiveSelect');
    activeSelect.value = u.is_active !== false ? 'true' : 'false';
    activeSelect.disabled = isSuper;

    document.getElementById('adminEditUserModalBackdrop').classList.add('is-open');
  }

  async function openUserProgressDetailModal(userId) {
    const backdrop = document.getElementById('adminUserProgressModalBackdrop');
    const bodyEl = document.getElementById('adminUserProgressModalBody');
    const titleEl = document.getElementById('progModalTitle');
    const subEl = document.getElementById('progModalSub');
    if (!backdrop || !bodyEl) return;

    backdrop.classList.add('is-open');
    bodyEl.innerHTML = `<div style="padding:2rem;text-align:center;font-weight:700;">⏳ Đang tải dữ liệu tiến độ học tập...</div>`;

    try {
      const detail = await global.TrilinguoAPI.getAdminUserProgress(userId);
      const u = detail.user || {};
      const blocks = detail.learning_blocks || [];
      const words = detail.notebook_items || [];
      const history = detail.recent_history || [];

      titleEl.textContent = `📈 Tiến độ Học tập: ${u.username || u.account_name}`;
      subEl.textContent = `Gmail: ${u.email || '—'} · SĐT: ${u.phone || '—'} · Quyền: ${(u.role || 'user').toUpperCase()}`;

      bodyEl.innerHTML = `
        <!-- Blocks Summary -->
        <div style="margin-bottom:1.1rem;">
          <h3 style="font-size:0.95rem;font-weight:900;color:var(--text-heading);margin-bottom:0.5rem;">
            1. Các Khối Ngôn Ngữ Đang Học (${blocks.length} khối)
          </h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.75rem;">
            ${blocks
              .map(
                b => `
              <div style="background:var(--surface-muted);padding:0.85rem;border-radius:14px;border:1.5px solid var(--border-subtle);">
                <div style="font-weight:900;color:var(--color-main-dark-teal);margin-bottom:0.35rem;">
                  🌐 ${formatBlockBadge(b.native_lang, b.target_lang)}
                </div>
                <div style="font-size:0.82rem;display:flex;flex-direction:column;gap:0.2rem;font-weight:700;">
                  <span>📚 Từ trong Sổ tay: <strong>${b.total_saved_words}</strong> từ</span>
                  <span>⭐ Đã Mastered: <strong style="color:var(--color-element-forest);">${b.mastered_words}</strong> từ</span>
                  <span>🎯 Độ chính xác Quiz: <strong style="color:var(--color-main-orange);">${b.quiz_accuracy}%</strong> (${b.total_quiz_correct}/${b.total_quiz_questions})</span>
                  <span>🔄 Lượt dịch thuật: <strong>${b.total_translations}</strong> câu</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Saved Notebook Words -->
        <div style="margin-bottom:1.1rem;">
          <h3 style="font-size:0.95rem;font-weight:900;color:var(--text-heading);margin-bottom:0.5rem;">
            2. Danh sách Từ vựng trong Sổ tay cá nhân (${words.length} từ)
          </h3>
          <div class="admin-table-responsive" style="max-height:240px;overflow-y:auto;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Từ gốc ("Tôi là")</th>
                  <th>Nghĩa học ("Muốn học")</th>
                  <th>Phiên âm RPA</th>
                  <th>Kết quả Quiz</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${
                  words.length === 0
                    ? `<tr><td colspan="5" style="text-align:center;padding:1rem;">Chưa có từ vựng nào trong Sổ tay.</td></tr>`
                    : words
                        .map(
                          w => `
                      <tr>
                        <td><strong>${escapeHtml(w.source_text)}</strong></td>
                        <td style="color:var(--color-main-dark-teal);font-weight:800;">${escapeHtml(w.target_text)}</td>
                        <td><span class="card-3d__phonetics">/${escapeHtml(w.phonetic || '')}/</span></td>
                        <td><strong>${w.quiz_correct || 0}/${w.quiz_attempts || 0}</strong> lần</td>
                        <td>
                          <span class="mastery-pill ${w.is_mastered ? 'is-mastered' : ''}">
                            ${w.is_mastered ? '⭐ Mastered' : '📖 Đang học'}
                          </span>
                        </td>
                      </tr>
                    `
                        )
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Translation History -->
        <div>
          <h3 style="font-size:0.95rem;font-weight:900;color:var(--text-heading);margin-bottom:0.5rem;">
            3. Lịch sử Dịch thuật Gần nhất (${history.length} câu)
          </h3>
          <div class="admin-table-responsive" style="max-height:190px;overflow-y:auto;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Cặp dịch</th>
                  <th>Văn bản gốc</th>
                  <th>Bản dịch</th>
                  <th>Phiên âm RPA</th>
                </tr>
              </thead>
              <tbody>
                ${
                  history.length === 0
                    ? `<tr><td colspan="4" style="text-align:center;padding:1rem;">Chưa có lịch sử dịch thuật.</td></tr>`
                    : history
                        .map(
                          h => `
                      <tr>
                        <td><span class="card-3d__category">${(h.source_lang || '').toUpperCase()} → ${(h.target_lang || '').toUpperCase()}</span></td>
                        <td>${escapeHtml(h.source_text)}</td>
                        <td><strong>${escapeHtml(h.translated_text)}</strong></td>
                        <td>/${escapeHtml(h.phonetic || '')}/</td>
                      </tr>
                    `
                        )
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      bodyEl.innerHTML = `<div style="color:#d94848;font-weight:700;padding:1rem;">⚠️ ${escapeHtml(err.message)}</div>`;
    }
  }

  /**
   * 4. BIND ADMIN INTERACTIVE EVENTS
   */
  function bindAdminPortalEvents(root) {
    // Subtab switcher buttons
    root.querySelectorAll('[data-switch-admin-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchAdminTab(btn.getAttribute('data-switch-admin-tab'));
      });
    });

    // Search & filter inputs in Users tab
    const searchInput = document.getElementById('adminUserSearchInput');
    const roleSelect = document.getElementById('adminRoleFilterSelect');
    const langSelect = document.getElementById('adminLangFilterSelect');
    const resetBtn = document.getElementById('adminResetFiltersBtn');

    if (searchInput) {
      searchInput.addEventListener('input', async () => {
        filterState.search = searchInput.value;
        const res = await global.TrilinguoAPI.getAdminUsers(filterState);
        cachedAdminUsers = res.items || [];
        renderAdminPortalDOM();
        const reInput = document.getElementById('adminUserSearchInput');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      });
    }

    if (roleSelect) {
      roleSelect.addEventListener('change', async () => {
        filterState.role = roleSelect.value;
        await refreshUsersListOnly();
      });
    }

    if (langSelect) {
      langSelect.addEventListener('change', async () => {
        filterState.langPair = langSelect.value;
        await refreshUsersListOnly();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        filterState = { search: '', role: 'all', langPair: 'all' };
        await refreshUsersListOnly();
      });
    }

    // Search in Learning Progress tab
    const progSearch = document.getElementById('adminProgressSearchInput');
    if (progSearch) {
      progSearch.addEventListener('input', () => {
        progressSearchQuery = progSearch.value;
        renderAdminPortalDOM();
        const reProg = document.getElementById('adminProgressSearchInput');
        if (reProg) {
          reProg.focus();
          reProg.setSelectionRange(reProg.value.length, reProg.value.length);
        }
      });
    }

    // Role Switcher Dropdowns (PATCH /api/admin/users/{id}/role)
    root.querySelectorAll('[data-role-switch-user]').forEach(sel => {
      sel.addEventListener('change', async () => {
        const uid = Number(sel.getAttribute('data-role-switch-user'));
        const newRole = sel.value;
        try {
          const res = await global.TrilinguoAPI.adminUpdateUserRole(uid, newRole);
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(res.message, 'success');
          }
          await refreshUsersListOnly();
        } catch (err) {
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(err.message, 'error');
          }
          await refreshUsersListOnly();
        }
      });
    });

    // Edit user button
    root.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openEditUserModal(Number(btn.getAttribute('data-edit-user')));
      });
    });

    // Inspect progress buttons & clickable rows
    root.querySelectorAll('[data-inspect-user]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openUserProgressDetailModal(Number(btn.getAttribute('data-inspect-user')));
      });
    });

    root.querySelectorAll('[data-inspect-user-row]').forEach(row => {
      row.addEventListener('click', () => {
        openUserProgressDetailModal(Number(row.getAttribute('data-inspect-user-row')));
      });
    });

    // Lock / Unlock User Account
    root.querySelectorAll('[data-toggle-lock-user]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const uid = Number(btn.getAttribute('data-toggle-lock-user'));
        const target = cachedAdminUsers.find(x => Number(x.id) === uid);
        if (!target) return;
        const nextActive = target.is_active === false;
        const actionWord = nextActive ? 'MỞ KHÓA' : 'TẠM KHÓA';
        if (
          !window.confirm(
            `Bạn có chắc chắn muốn ${actionWord} tài khoản "${target.username || target.account_name}" (${target.email}) không?`
          )
        ) {
          return;
        }
        try {
          await global.TrilinguoAPI.adminUpdateUser(uid, { is_active: nextActive });
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(
              `Đã ${actionWord.toLowerCase()} tài khoản ${target.username || target.account_name}!`,
              'success'
            );
          }
          await refreshUsersListOnly();
        } catch (err) {
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(err.message, 'error');
          }
        }
      });
    });

    // Delete User Account
    root.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const uid = Number(btn.getAttribute('data-delete-user'));
        const target = cachedAdminUsers.find(x => Number(x.id) === uid);
        if (!target) return;
        if (
          !window.confirm(
            `⚠️ XÁC NHẬN XÓA TÀI KHOẢN:\nBạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${target.username || target.account_name}" (${target.email}) cùng toàn bộ dữ liệu học tập của họ không?`
          )
        ) {
          return;
        }
        try {
          const res = await global.TrilinguoAPI.adminDeleteUser(uid);
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(res.message, 'info');
          }
          await refreshUsersListOnly();
        } catch (err) {
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(err.message, 'error');
          }
        }
      });
    });

    // Admin Self Profile Form
    const adminProfForm = document.getElementById('adminSelfProfileForm');
    if (adminProfForm) {
      adminProfForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
          await global.TrilinguoAPI.updateUserProfile({
            accountName: document.getElementById('adminProfName').value.trim(),
            email: document.getElementById('adminProfEmail').value.trim(),
            phone: document.getElementById('adminProfPhone').value.trim(),
            nativeLang: document.getElementById('adminProfNativeLang').value,
            targetLang: document.getElementById('adminProfTargetLang').value
          });
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast('Đã lưu thông tin Hồ sơ Quản trị viên!', 'success');
          }
          await syncRoleBasedView();
        } catch (err) {
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(err.message, 'error');
          }
        }
      });
    }

    const adminProfLogoutBtn = document.getElementById('adminProfileLogoutBtn');
    if (adminProfLogoutBtn) {
      adminProfLogoutBtn.addEventListener('click', () => {
        global.TrilinguoAPI.signOut();
        syncRoleBasedView();
        if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
          global.TrilinguoApp.showToast('Đã đăng xuất tài khoản Quản trị viên.', 'info');
        }
        window.location.href = 'index.html';
      });
    }

    // ------------------------------------------------------------------
    // CORPUS & DOCUMENT UPLOAD TRAINING TAB EVENTS (ADMIN / SUPER ADMIN)
    // ------------------------------------------------------------------
    const sampleDocBtn = document.getElementById('adminDownloadSampleDocBtn');
    if (sampleDocBtn) {
      sampleDocBtn.addEventListener('click', () => {
        const csvSample = [
          'hmn,vi,en,note',
          '"Nyob zoo kuv tsev neeg","Xin chào gia đình của tôi","Hello my family","Câu chào hỏi thân mật tại bản Tả Van"',
          '"Kuv xav kawm lus Hmoob","Tôi muốn học tiếng Mông","I want to learn Hmong","Giao tiếp du lịch cộng đồng"',
          '"Ua tsaug koj pab kuv","Cảm ơn bạn đã giúp đỡ tôi","Thank you for helping me","Lời cảm ơn lịch sự"',
          '"Tả Van zoo nkauj heev","Bản Tả Van đẹp lắm","Ta Van village is very beautiful","Khen phong cảnh bản làng"',
          '"Dej ntshiab thiab txias","Nước suối trong và mát","Clear and cool stream water","Miêu tả thiên nhiên"'
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csvSample], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tai_lieu_huan_luyen_hmong_trilinguo_mau.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    const fileInput = document.getElementById('adminCorpusFileInput');
    const filePreview = document.getElementById('adminCorpusFilePreview');
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files || []);
        pendingUploadedDocs = [];
        if (!files.length) {
          if (filePreview) filePreview.innerHTML = '';
          return;
        }
        let totalPreviewCount = 0;
        for (const f of files) {
          const text = await f.text();
          const parsed = global.TrilinguoAPI.parseDocumentContentInBrowser(f.name, text);
          totalPreviewCount += parsed.length;
          pendingUploadedDocs.push({
            filename: f.name,
            content: text,
            entries: parsed
          });
        }
        if (filePreview) {
          filePreview.innerHTML = `
            <div style="background:rgba(15,118,110,0.08);border:1px solid rgba(15,118,110,0.3);border-radius:10px;padding:0.6rem 0.85rem;color:#0F766E;font-weight:700;">
              ✅ Đã đọc <strong>${files.length} file</strong> (${files.map(f => escapeHtml(f.name)).join(', ')}) — Trích xuất được <strong>${totalPreviewCount} mục từ/câu hợp lệ</strong> sẵn sàng huấn luyện!
            </div>
          `;
        }
      });
    }

    const trainBtn = document.getElementById('adminTrainDocumentBtn');
    const batchTextarea = document.getElementById('adminCorpusBatchTextarea');
    const corpusStatusMsg = document.getElementById('adminCorpusStatusMsg');
    if (trainBtn) {
      trainBtn.addEventListener('click', async () => {
        const pastedText = batchTextarea ? (batchTextarea.value || '').trim() : '';
        if (!pendingUploadedDocs.length && !pastedText) {
          if (corpusStatusMsg) {
            corpusStatusMsg.classList.remove('is-hidden');
            corpusStatusMsg.style.background = 'rgba(220,38,38,0.12)';
            corpusStatusMsg.style.color = '#B91C1C';
            corpusStatusMsg.innerHTML = '⚠️ Vui lòng chọn ít nhất 1 file tài liệu (.csv, .txt, .tsv, .json, .md) hoặc dán nội dung vào ô văn bản!';
          }
          return;
        }

        trainBtn.disabled = true;
        trainBtn.textContent = '⏳ Đang huấn luyện & cập nhật hệ thống...';

        try {
          let totalInserted = 0;
          let totalUpdated = 0;
          let activeTotal = 0;

          for (const doc of pendingUploadedDocs) {
            const res = await global.TrilinguoAPI.adminUploadCorpusDocument({
              filename: doc.filename,
              content: doc.content,
              entries: doc.entries
            });
            totalInserted += res.inserted_count || 0;
            totalUpdated += res.updated_count || 0;
            activeTotal = res.total_corpus_size || activeTotal;
          }

          if (pastedText) {
            const parsedPasted = global.TrilinguoAPI.parseDocumentContentInBrowser('Admin_Batch_Input.txt', pastedText);
            const res = await global.TrilinguoAPI.adminUploadCorpusDocument({
              filename: 'Admin_Batch_Input.txt',
              content: pastedText,
              entries: parsedPasted
            });
            totalInserted += res.inserted_count || 0;
            totalUpdated += res.updated_count || 0;
            activeTotal = res.total_corpus_size || activeTotal;
          }

          pendingUploadedDocs = [];
          if (fileInput) fileInput.value = '';
          if (batchTextarea) batchTextarea.value = '';

          cachedCorpusData = await global.TrilinguoAPI.getCorpusEntries(
            corpusFilterState.search,
            corpusFilterState.source
          );
          renderAdminPortalDOM();

          const newStatusEl = document.getElementById('adminCorpusStatusMsg');
          if (newStatusEl) {
            newStatusEl.classList.remove('is-hidden');
            newStatusEl.style.background = 'rgba(5,150,105,0.12)';
            newStatusEl.style.color = '#065F46';
            newStatusEl.innerHTML = `🎉 Đã nạp tài liệu & huấn luyện hệ thống thành công: <strong>+${totalInserted} từ/câu mới</strong>, <strong>cập nhật/làm giàu ${totalUpdated} mục</strong> (Tổng bộ nhớ đã học: <strong>${cachedCorpusData.total || activeTotal} mục</strong>)!`;
          }

          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(
              `Đã huấn luyện thành công (+${totalInserted} mới, cập nhật ${totalUpdated} mục)!`,
              'success'
            );
          }
        } catch (err) {
          if (corpusStatusMsg) {
            corpusStatusMsg.classList.remove('is-hidden');
            corpusStatusMsg.style.background = 'rgba(220,38,38,0.12)';
            corpusStatusMsg.style.color = '#B91C1C';
            corpusStatusMsg.innerHTML = `⚠️ ${escapeHtml(err.message)}`;
          }
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(err.message, 'error');
          }
        } finally {
          trainBtn.disabled = false;
          trainBtn.textContent = '🚀 Nạp Tài Liệu & Dạy Hệ Thống Ngay';
        }
      });
    }

    const corpusSearchInput = document.getElementById('adminCorpusSearchInput');
    const corpusSourceSelect = document.getElementById('adminCorpusSourceSelect');
    if (corpusSearchInput) {
      corpusSearchInput.addEventListener('input', async () => {
        corpusFilterState.search = corpusSearchInput.value;
        cachedCorpusData = await global.TrilinguoAPI.getCorpusEntries(
          corpusFilterState.search,
          corpusFilterState.source
        );
        renderAdminPortalDOM();
        const reFocus = document.getElementById('adminCorpusSearchInput');
        if (reFocus) {
          reFocus.focus();
          reFocus.setSelectionRange(reFocus.value.length, reFocus.value.length);
        }
      });
    }

    if (corpusSourceSelect) {
      corpusSourceSelect.addEventListener('change', async () => {
        corpusFilterState.source = corpusSourceSelect.value;
        cachedCorpusData = await global.TrilinguoAPI.getCorpusEntries(
          corpusFilterState.search,
          corpusFilterState.source
        );
        renderAdminPortalDOM();
      });
    }

    root.querySelectorAll('[data-delete-corpus-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const entryId = Number(btn.getAttribute('data-delete-corpus-id'));
        if (!window.confirm('Bạn có chắc chắn muốn xóa mục từ vựng này khỏi bộ nhớ đã học của hệ thống?')) {
          return;
        }
        try {
          await global.TrilinguoAPI.adminDeleteCorpusEntry(entryId);
          cachedCorpusData = await global.TrilinguoAPI.getCorpusEntries(
            corpusFilterState.search,
            corpusFilterState.source
          );
          renderAdminPortalDOM();
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast('Đã xóa mục khỏi Kho Tri Thức Đã Học.', 'info');
          }
        } catch (err) {
          if (global.TrilinguoApp && global.TrilinguoApp.showToast) {
            global.TrilinguoApp.showToast(err.message, 'error');
          }
        }
      });
    });
  }

  // Automatically listen for Auth or Language changes
  window.addEventListener('trilinguo:authchange', () => {
    syncRoleBasedView();
  });

  window.addEventListener('trilinguo:langchange', () => {
    if (document.body.classList.contains('is-admin-mode')) {
      const postloginNav = document.getElementById('mainPostLoginNav');
      const user = global.TrilinguoAPI.getCurrentUser();
      if (postloginNav && user) renderAdminNavbar(postloginNav, user);
      renderAdminPortalDOM();
    }
  });

  global.TrilinguoAdmin = {
    syncRoleBasedView,
    switchAdminTab,
    loadAndRenderAdminPortal
  };
})(window);
