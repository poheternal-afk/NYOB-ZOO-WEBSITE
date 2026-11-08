/**
 * ============================================================================
 * TRILINGUO / NYOB ZOO — FRONTEND LOGGING LIBRARY & VISUAL COMPONENT ID INSPECTOR
 * File: WEBSITE/frontend/js/devInspector.js
 *
 * Features:
 * 1. Standardized Component IDs (CMP-*) & Numbered Function Codes (F-01 .. F-45)
 *    automatically mapped and attached to every UI component in the DOM.
 * 2. Client-side Logging Library (`window.TrilinguoLogger`) capturing UI actions,
 *    API errors, and uncaught JS exceptions -> sent to Backend `/api/logs/client`
 *    (`WEBSITE/backend/logs/frontend_events.jsonl` & `app.log`).
 * 3. Visual Debug & Communication Mode (`Alt + I` or floating bottom-left button):
 *    - Displays numbered badges `[F-xx | CMP-...]` directly on every UI component.
 *    - Clicking any component opens the Debug / Request Change dialog to copy a
 *      formatted debug prompt or save a ticket into `logs/change_requests.jsonl`.
 * ============================================================================
 */

(function () {
  "use strict";

  const API_BASE =
    window.TrilinguoAPI && window.TrilinguoAPI.API_BASE_URL
      ? window.TrilinguoAPI.API_BASE_URL
      : "http://localhost:8000/api";

  const LOCAL_LOG_STORAGE_KEY = "trilinguo_debug_logs_v1";
  const LOCAL_TICKET_STORAGE_KEY = "trilinguo_change_tickets_v1";

  /**
   * Master Registry of Numbered Features (F-01..F-45) & Component IDs (CMP-*)
   * Maps DOM selectors across all 5 pages so every component is automatically
   * tagged with `data-func-id`, `data-cmp-id`, and `data-cmp-name`.
   */
  const COMPONENT_REGISTRY = [
    // --- I. GLOBAL HEADER & NAVIGATION (F-01 -> F-08) ---
    {
      funcId: "F-01",
      cmpId: "CMP-HDR-01",
      name: "Thanh Header Điều Hướng Chính",
      selector: ".site-header",
      page: "All Pages",
      feFile: "index.html / style.css",
      beApi: "-",
    },
    {
      funcId: "F-02",
      cmpId: "CMP-HDR-02",
      name: "Nút Login gạch chân & Learn More (Trước đăng nhập)",
      selector: "#preloginNavCta",
      page: "All Pages",
      feFile: "index.html / app.js (syncHeaderByAuthState)",
      beApi: "POST /api/auth/*",
    },
    {
      funcId: "F-03",
      cmpId: "CMP-HDR-03",
      name: "Logo Thương Hiệu NYOB ZOO & Mascot Trâu",
      selector: ".brand-logo",
      page: "All Pages",
      feFile: "index.html / style.css",
      beApi: "-",
    },
    {
      funcId: "F-04",
      cmpId: "CMP-HDR-04",
      name: "Menu Điều Hướng 5 Mục (Sau đăng nhập)",
      selector: "#mainPostLoginNav",
      page: "All Pages",
      feFile: "index.html / app.js",
      beApi: "GET /api/auth/me",
    },
    {
      funcId: "F-05",
      cmpId: "CMP-HDR-05",
      name: "Huy Hiệu Tài Khoản & Khối Ngôn Ngữ Trên Menu",
      selector: ".nav-link--account",
      page: "All Pages",
      feFile: "index.html / app.js",
      beApi: "GET /api/profile",
    },
    {
      funcId: "F-06",
      cmpId: "CMP-HDR-06",
      name: "Bộ Chuyển Đổi 3 Ngôn Ngữ Hiển Thị (HMN / VI / EN)",
      selector: ".lang-switcher",
      page: "All Pages",
      feFile: "assets/js/i18n.js",
      beApi: "-",
    },
    {
      funcId: "F-07",
      cmpId: "CMP-HDR-07",
      name: "Nút Chuyển Đổi Giao Diện Sáng / Tối (Light / Dark Mode)",
      selector: "#themeToggleBtn",
      page: "All Pages",
      feFile: "assets/js/app.js (initTheme)",
      beApi: "-",
    },
    {
      funcId: "F-08",
      cmpId: "CMP-HDR-08",
      name: "Nút Burger Menu Trên Điện Thoại (< 768px)",
      selector: "#mobileBurgerBtn",
      page: "All Pages",
      feFile: "assets/js/app.js (initBurgerMenu)",
      beApi: "-",
    },

    // --- II. TRANG CHỦ: HERO & DỊCH THUẬT 3 CHIỀU (F-09 -> F-20) ---
    {
      funcId: "F-09",
      cmpId: "CMP-BG-01",
      name: "Hệ Thống Cảnh Nền Tả Van Đa Lớp (Trời, Mây, Núi, Đồi)",
      selector: "#sceneBgRoot",
      page: "All Pages",
      feFile: "assets/js/app.js (injectSceneBackground) / style.css",
      beApi: "-",
    },
    {
      funcId: "F-10",
      cmpId: "CMP-HERO-01",
      name: "Khối Khẩu Hiệu Hero & Lá Bay Trang Chủ",
      selector: ".hero-copy",
      page: "index.html",
      feFile: "index.html / assets/js/i18n.js",
      beApi: "-",
    },
    {
      funcId: "F-11",
      cmpId: "CMP-HERO-02",
      name: "Hộp Hiển Thị Khối Ngôn Ngữ Đang Học Tại Hero",
      selector: "#heroActiveBlockBox",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "GET /api/profile",
    },
    {
      funcId: "F-12",
      cmpId: "CMP-TRANS-01",
      name: "Khung Thẻ Dịch Thuật 3 Chiều Trung Tâm",
      selector: ".translator-card",
      page: "index.html",
      feFile: "index.html / assets/js/app.js (initTranslator)",
      beApi: "POST /api/translate",
    },
    {
      funcId: "F-13",
      cmpId: "CMP-TRANS-02",
      name: "Dropdown Chọn Ngôn Ngữ Đầu Vào (Hmong / Việt / Anh)",
      selector: "#sourceLangSelect",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "POST /api/translate",
    },
    {
      funcId: "F-14",
      cmpId: "CMP-TRANS-03",
      name: "Nút Đảo Chiều Cặp Ngôn Ngữ Dịch (⇄)",
      selector: "#swapLangBtn",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "POST /api/translate",
    },
    {
      funcId: "F-15",
      cmpId: "CMP-TRANS-04",
      name: "Dropdown Chọn Ngôn Ngữ Đầu Ra (Anh / Việt / Hmong)",
      selector: "#targetLangSelect",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "POST /api/translate",
    },
    {
      funcId: "F-16",
      cmpId: "CMP-TRANS-05",
      name: "Ô Nhập Văn Bản Nguồn Cần Dịch & Nút Xóa Nhanh",
      selector: ".translator-input-box",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "POST /api/translate",
    },
    {
      funcId: "F-17",
      cmpId: "CMP-TRANS-06",
      name: "Khung Kết Quả Dịch, Phiên Âm RPA & Nút Lưu Sổ Tay",
      selector: "#translatorOutputBox",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "POST /api/translate, POST /api/notebook",
    },
    {
      funcId: "F-18",
      cmpId: "CMP-TRANS-07",
      name: "Nút Nghe Phát Âm Văn Bản (Text-to-Speech)",
      selector: "#listenSourceBtn",
      page: "index.html",
      feFile: "assets/js/app.js (speakText)",
      beApi: "-",
    },
    {
      funcId: "F-19",
      cmpId: "CMP-TRANS-08",
      name: "Thanh Chip Thử Nhanh Mẫu Câu (Sim sai)",
      selector: ".quick-try-row",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "POST /api/translate",
    },
    {
      funcId: "F-20",
      cmpId: "CMP-TRANS-09",
      name: "Nút Bấm Chính 'Txhais tam sim no / Dịch ngay'",
      selector: "#translateSubmitBtn",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "POST /api/translate",
    },

    // --- III. NHẬT KÝ DỊCH THUẬT & POPOVER BÔI ĐEN (F-21 -> F-24) ---
    {
      funcId: "F-21",
      cmpId: "CMP-HIST-01",
      name: "Khu Vực Nhật Ký Dịch Thuật Theo Khối Ngôn Ngữ",
      selector: "#historySection",
      page: "index.html",
      feFile: "index.html / assets/js/app.js (renderHistoryCards)",
      beApi: "GET /api/translate/history",
    },
    {
      funcId: "F-22",
      cmpId: "CMP-HIST-02",
      name: "Nút Xóa Toàn Bộ Lịch Sử Dịch Khối Hiện Tại",
      selector: "#clearHistoryBtn",
      page: "index.html",
      feFile: "index.html / assets/js/app.js",
      beApi: "DELETE /api/translate/history",
    },
    {
      funcId: "F-23",
      cmpId: "CMP-HIST-03",
      name: "Lưới Thẻ 3D Các Câu Đã Dịch",
      selector: "#historyCardsGrid",
      page: "index.html",
      feFile: "assets/js/app.js (renderHistoryCards)",
      beApi: "GET /api/translate/history",
    },
    {
      funcId: "F-24",
      cmpId: "CMP-GLB-POPOVER",
      name: "Popover Tra Từ Thông Minh Khi Bôi Đen Văn Bản",
      selector: "#smartSelectionPopover",
      page: "All Pages",
      feFile: "assets/js/app.js (initSmartTextSelection)",
      beApi: "POST /api/translate/lookup, POST /api/notebook",
    },

    // --- IV. HỆ THỐNG ĐĂNG NHẬP / ĐĂNG KÝ TRỰC TIẾP (F-25 -> F-28) ---
    {
      funcId: "F-25",
      cmpId: "CMP-GLB-AUTH",
      name: "Modal Đăng Nhập Nhanh (Nhập Tên / Gmail & Chọn Khối Ngôn Ngữ, Không Cần OTP)",
      selector: "#authModalBackdrop",
      page: "All Pages",
      feFile: "assets/js/app.js (injectModalsAndPopover) / js/api.js",
      beApi: "POST /api/auth/login/direct",
    },

    // --- V. TRANG MẪU CÂU THÔNG DỤNG (F-29 -> F-32) ---
    {
      funcId: "F-29",
      cmpId: "CMP-PHR-01",
      name: "Ô Tìm Kiếm Mẫu Câu Du Lịch (Hmong / Việt / Anh)",
      selector: "#phraseSearchInput",
      page: "phrase.html",
      feFile: "phrase.html / assets/js/app.js (initPhrasesPage)",
      beApi: "GET /api/phrases",
    },
    {
      funcId: "F-30",
      cmpId: "CMP-PHR-02",
      name: "Thanh Bộ Lọc 7 Chủ Đề Giao Tiếp Du Lịch & Bản Làng",
      selector: "[data-phrase-cat]",
      page: "phrase.html",
      feFile: "phrase.html / assets/js/app.js",
      beApi: "GET /api/phrases?category=...",
    },
    {
      funcId: "F-31",
      cmpId: "CMP-PHR-03",
      name: "Lưới Thẻ 3D Mẫu Câu Thông Dụng (Hỗ Trợ Bôi Đen & Lưu Sổ Tay)",
      selector: "#phrasesCardsGrid",
      page: "phrase.html",
      feFile: "phrase.html / assets/js/app.js",
      beApi: "GET /api/phrases",
    },

    // --- VI. TRANG SỔ TAY CÁ NHÂN & FLASHCARD 3D (F-32 -> F-37) ---
    {
      funcId: "F-32",
      cmpId: "CMP-NB-01",
      name: "Thanh Công Cụ Sổ Tay Cá Nhân (Chọn từ, Flashcard, Quiz)",
      selector: ".notebook-toolbar",
      page: "vocabulary.html",
      feFile: "vocabulary.html / assets/js/app.js (initNotebookPage)",
      beApi: "GET /api/notebook",
    },
    {
      funcId: "F-33",
      cmpId: "CMP-NB-02",
      name: "Nút Chọn Tất Cả / Bỏ Chọn Từ Vựng Sổ Tay",
      selector: "#nbSelectAllBtn",
      page: "vocabulary.html",
      feFile: "vocabulary.html / assets/js/app.js",
      beApi: "-",
    },
    {
      funcId: "F-34",
      cmpId: "CMP-NB-03",
      name: "Nút Tạo Flashcard 3D (Kiểm tra tối thiểu >= 4 từ)",
      selector: "#nbCreateFlashcardBtn",
      page: "vocabulary.html",
      feFile: "vocabulary.html / assets/js/app.js (openFlashcardModal)",
      beApi: "POST /api/notebook/flashcards",
    },
    {
      funcId: "F-35",
      cmpId: "CMP-NB-04",
      name: "Nút Tạo Bài Kiểm Tra Quizzes (Kiểm tra tối thiểu >= 10 từ)",
      selector: "#nbCreateQuizBtn",
      page: "vocabulary.html",
      feFile: "vocabulary.html / assets/js/app.js",
      beApi: "POST /api/notebook/quiz/generate",
    },
    {
      funcId: "F-36",
      cmpId: "CMP-NB-05",
      name: "Lưới Thẻ 3D Từ Điển Cá Nhân Có Tickbox Chọn Từ",
      selector: "#notebookCardsGrid",
      page: "vocabulary.html",
      feFile: "vocabulary.html / assets/js/app.js",
      beApi: "GET /api/notebook, PATCH /api/notebook/{id}/remember, DELETE /api/notebook/{id}",
    },
    {
      funcId: "F-37",
      cmpId: "CMP-GLB-FLASHCARD",
      name: "Modal Học Thẻ Lật 3D Flashcard",
      selector: "#flashcardModalBackdrop",
      page: "All Pages",
      feFile: "assets/js/app.js (injectFlashcardModal)",
      beApi: "POST /api/notebook/flashcards",
    },

    // --- VII. TRANG BÀI KIỂM TRA QUIZZES (F-38 -> F-40) ---
    {
      funcId: "F-38",
      cmpId: "CMP-QUIZ-01",
      name: "Khung Báo Cáo Điểm Số & Tiến Trình Sau Khi Nộp Quiz",
      selector: "#quizResultBanner",
      page: "quiz.html",
      feFile: "quiz.html / assets/js/app.js (initQuizPage)",
      beApi: "POST /api/notebook/quiz/submit",
    },
    {
      funcId: "F-39",
      cmpId: "CMP-QUIZ-02",
      name: "Danh Sách Câu Hỏi Trắc Nghiệm 4 Đáp Án",
      selector: "#quizQuestionsContainer",
      page: "quiz.html",
      feFile: "quiz.html / assets/js/app.js",
      beApi: "POST /api/notebook/quiz/generate",
    },
    {
      funcId: "F-40",
      cmpId: "CMP-QUIZ-03",
      name: "Nút Nộp Bài Quiz & Lưu Tiến Trình Vào Database",
      selector: "#submitQuizAnswersBtn",
      page: "quiz.html",
      feFile: "quiz.html / assets/js/app.js",
      beApi: "POST /api/notebook/quiz/submit",
    },

    // --- VIII. TRANG HỒ SƠ CÁ NHÂN & TIẾN TRÌNH THỜI GIAN THỰC (F-41 -> F-45) ---
    {
      funcId: "F-41",
      cmpId: "CMP-PROF-01",
      name: "Biểu Mẫu Hồ Sơ Tài Khoản & Chuyển Đổi Khối Ngôn Ngữ",
      selector: "#profileEditForm",
      page: "profile.html",
      feFile: "profile.html / assets/js/app.js (initProfilePage)",
      beApi: "PUT /api/profile",
    },
    {
      funcId: "F-42",
      cmpId: "CMP-PROF-02",
      name: "Nút Đăng Xuất Tài Khoản",
      selector: "#profLogoutBtn",
      page: "profile.html",
      feFile: "profile.html / assets/js/app.js",
      beApi: "-",
    },
    {
      funcId: "F-43",
      cmpId: "CMP-PROF-03",
      name: "Thẻ Metric 01: Tổng Số Lượng Từ Trong Sổ Tay",
      selector: "#metricTotalWordsVal",
      page: "profile.html",
      feFile: "profile.html / assets/js/app.js",
      beApi: "GET /api/profile/progress",
    },
    {
      funcId: "F-44",
      cmpId: "CMP-PROF-04",
      name: "Thẻ Metric 02: Số Từ Đã Thành Thạo (Mastered >=10 lần & >80%)",
      selector: "#metricMasteredWordsVal",
      page: "profile.html",
      feFile: "profile.html / assets/js/app.js",
      beApi: "GET /api/profile/progress",
    },
    {
      funcId: "F-45",
      cmpId: "CMP-PROF-05",
      name: "Thẻ Metric 03: Độ Chính Xác Quiz (Quiz Accuracy %)",
      selector: "#metricQuizAccuracyVal",
      page: "profile.html",
      feFile: "profile.html / assets/js/app.js",
      beApi: "GET /api/profile/progress",
    },
  ];

  function getCurrentPageName() {
    const p = (window.location.pathname || "").split("/").pop();
    return p || "index.html";
  }

  // ============================================================================
  // 1. CLIENT-SIDE LOGGING LIBRARY (`window.TrilinguoLogger`)
  // ============================================================================

  function pushLocalLog(entry) {
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_LOG_STORAGE_KEY) || "[]");
      list.unshift(entry);
      if (list.length > 120) list.length = 120;
      localStorage.setItem(LOCAL_LOG_STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  async function sendClientLog(level, componentId, action, message, details = {}) {
    const item = COMPONENT_REGISTRY.find((c) => c.cmpId === componentId || c.funcId === componentId);
    const payload = {
      level: level.toUpperCase(),
      component_id: item ? `${item.funcId}:${item.cmpId}` : componentId || "CMP-APP",
      component_name: item ? item.name : "",
      page: getCurrentPageName(),
      action: action || "ui_event",
      message: String(message || ""),
      selector: item ? item.selector : "",
      details: details || {},
      timestamp: new Date().toISOString(),
    };

    pushLocalLog(payload);

    try {
      await fetch(`${API_BASE}/logs/client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Component-ID": payload.component_id,
        },
        body: JSON.stringify(payload),
      });
    } catch (_) {
      // Offline / static server mode: kept safely in localStorage
    }
    return payload;
  }

  async function submitChangeRequestTicket(ticketData) {
    const payload = {
      component_id: ticketData.component_id,
      component_name: ticketData.component_name || "",
      page: ticketData.page || getCurrentPageName(),
      selector: ticketData.selector || "",
      request_type: ticketData.request_type || "DEBUG_CHANGE",
      priority: ticketData.priority || "NORMAL",
      note: ticketData.note || "",
      author: ticketData.author || "Developer",
      timestamp: new Date().toISOString(),
      ticket_id: `LOCAL-${Date.now().toString().slice(-6)}`,
    };

    try {
      const res = await fetch(`${API_BASE}/logs/change-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Component-ID": payload.component_id,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ticket) {
          payload.ticket_id = data.ticket.ticket_id;
        }
      }
    } catch (_) {}

    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_TICKET_STORAGE_KEY) || "[]");
      saved.unshift(payload);
      localStorage.setItem(LOCAL_TICKET_STORAGE_KEY, JSON.stringify(saved));
    } catch (_) {}

    return payload;
  }

  window.TrilinguoLogger = {
    REGISTRY: COMPONENT_REGISTRY,
    info: (cmpId, action, msg, details) => sendClientLog("INFO", cmpId, action, msg, details),
    warn: (cmpId, action, msg, details) => sendClientLog("WARN", cmpId, action, msg, details),
    error: (cmpId, action, msg, details) => sendClientLog("ERROR", cmpId, action, msg, details),
    submitChangeRequest: submitChangeRequestTicket,
    getLocalLogs: () => {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_LOG_STORAGE_KEY) || "[]");
      } catch (_) {
        return [];
      }
    },
    getLocalTickets: () => {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_TICKET_STORAGE_KEY) || "[]");
      } catch (_) {
        return [];
      }
    },
  };

  // Automatically log uncaught JS errors & promise rejections with nearest Component ID
  window.addEventListener("error", (event) => {
    sendClientLog("ERROR", "CMP-JS-RUNTIME", "window_onerror", event.message || "JS Error", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    sendClientLog(
      "ERROR",
      "CMP-PROMISE",
      "unhandled_rejection",
      event.reason ? String(event.reason.message || event.reason) : "Unhandled Promise Rejection"
    );
  });

  // ============================================================================
  // 2. AUTOMATIC DOM COMPONENT TAGGING & VISUAL INSPECTOR OVERLAY
  // ============================================================================

  function tagAllRegisteredComponents() {
    COMPONENT_REGISTRY.forEach((entry) => {
      try {
        const nodes = document.querySelectorAll(entry.selector);
        nodes.forEach((el, idx) => {
          if (!el.getAttribute("data-cmp-id")) {
            el.setAttribute("data-cmp-id", entry.cmpId);
          }
          if (!el.getAttribute("data-func-id")) {
            el.setAttribute("data-func-id", entry.funcId);
          }
          if (!el.getAttribute("data-cmp-name")) {
            el.setAttribute(
              "data-cmp-name",
              nodes.length > 1 ? `${entry.name} (#${idx + 1})` : entry.name
            );
          }
          if (!el.getAttribute("data-cmp-selector")) {
            el.setAttribute("data-cmp-selector", entry.selector);
          }
          if (!el.getAttribute("data-cmp-api")) {
            el.setAttribute("data-cmp-api", entry.beApi || "-");
          }
          if (!el.getAttribute("data-cmp-file")) {
            el.setAttribute("data-cmp-file", entry.feFile || "");
          }
        });
      } catch (_) {}
    });
  }

  function injectInspectorStyles() {
    if (document.getElementById("trilinguoInspectorStyles")) return;
    const style = document.createElement("style");
    style.id = "trilinguoInspectorStyles";
    style.textContent = `
      /* Floating Inspector Trigger Button */
      .dev-inspector-fab {
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 1100;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        border-radius: 999px;
        background: #1d4e5b;
        color: #fffbe3;
        font-family: var(--font-sans, sans-serif);
        font-size: 12.5px;
        font-weight: 800;
        border: 2px solid #ff9d1d;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
        cursor: pointer;
        transition: transform 0.18s ease, background 0.18s ease;
      }
      .dev-inspector-fab:hover {
        transform: translateY(-2px);
        background: #264e36;
      }
      .dev-inspector-fab.active {
        background: #ff9d1d;
        color: #162a22;
        border-color: #162a22;
      }

      /* Visual Badge on Tagged Components when Inspector Mode is Active */
      body.trilinguo-debug-mode [data-cmp-id] {
        outline: 2px dashed rgba(255, 157, 29, 0.85) !important;
        outline-offset: 2px !important;
      }
      .cmp-debug-pill {
        position: absolute;
        z-index: 1050;
        background: #1d4e5b;
        color: #fffbe3;
        border: 1.5px solid #ff9d1d;
        border-radius: 6px;
        padding: 2px 7px;
        font-size: 11px;
        font-weight: 800;
        font-family: monospace;
        letter-spacing: 0.3px;
        cursor: pointer;
        box-shadow: 0 3px 10px rgba(0,0,0,0.25);
        pointer-events: auto;
        white-space: nowrap;
        transition: transform 0.12s ease, background 0.12s ease;
      }
      .cmp-debug-pill:hover {
        background: #ff9d1d;
        color: #12271d;
        transform: scale(1.06);
      }

      /* Inspector Dialog Modal */
      .dev-inspector-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1200;
        background: rgba(12, 28, 33, 0.68);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .dev-inspector-modal-backdrop.open {
        display: flex;
      }
      .dev-inspector-card {
        width: min(100%, 680px);
        max-height: 88vh;
        overflow-y: auto;
        background: #ffffff;
        color: #1d4e5b;
        border-radius: 20px;
        border: 3px solid #276474;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
        padding: 22px;
        font-family: var(--font-sans, sans-serif);
      }
      [data-theme="dark"] .dev-inspector-card {
        background: #132c33;
        color: #f4f7f2;
        border-color: #ff9d1d;
      }
      .dev-inspector-meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 10px;
        margin: 12px 0;
        padding: 12px;
        border-radius: 12px;
        background: rgba(56, 163, 188, 0.1);
        font-size: 13px;
      }
      .dev-inspector-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .dev-btn {
        padding: 9px 15px;
        border-radius: 10px;
        font-weight: 800;
        font-size: 13px;
        border: none;
        cursor: pointer;
      }
      .dev-btn--primary {
        background: #ff9d1d;
        color: #162a22;
      }
      .dev-btn--teal {
        background: #276474;
        color: #ffffff;
      }
      .dev-btn--outline {
        background: transparent;
        border: 1.5px solid #276474;
        color: inherit;
      }
    `;
    document.head.appendChild(style);
  }

  let debugModeActive = false;
  let overlayPillsContainer = null;

  function renderOverlayPills() {
    if (!overlayPillsContainer) {
      overlayPillsContainer = document.createElement("div");
      overlayPillsContainer.id = "trilinguoOverlayPillsRoot";
      document.body.appendChild(overlayPillsContainer);
    }
    overlayPillsContainer.innerHTML = "";
    if (!debugModeActive) return;

    tagAllRegisteredComponents();
    const elements = document.querySelectorAll("[data-cmp-id]");
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 16 || rect.height < 16) return;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;

      const funcId = el.getAttribute("data-func-id") || "F-??";
      const cmpId = el.getAttribute("data-cmp-id");
      const cmpName = el.getAttribute("data-cmp-name") || cmpId;

      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "cmp-debug-pill";
      pill.textContent = `${funcId} · ${cmpId}`;
      pill.title = `${cmpName} — Bấm để tạo yêu cầu sửa / debug`;
      pill.style.top = `${Math.max(4, window.scrollY + rect.top - 10)}px`;
      pill.style.left = `${Math.max(4, window.scrollX + rect.left + 6)}px`;

      pill.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openInspectorModalForElement(el);
      });

      overlayPillsContainer.appendChild(pill);
    });
  }

  function toggleDebugMode(forceState) {
    debugModeActive = typeof forceState === "boolean" ? forceState : !debugModeActive;
    document.body.classList.toggle("trilinguo-debug-mode", debugModeActive);
    const fab = document.getElementById("trilinguoInspectorFab");
    if (fab) {
      fab.classList.toggle("active", debugModeActive);
      fab.innerHTML = debugModeActive
        ? "🛠️ Đang bật Mã Debug (Bấm vào nhãn F-xx / Alt+I để tắt)"
        : "🛠️ Mã Chức Năng & Debug (Alt+I)";
    }
    renderOverlayPills();
    sendClientLog("INFO", "CMP-INSPECTOR", "toggle_debug_mode", `Debug overlay: ${debugModeActive}`);
  }

  function ensureInspectorModal() {
    let modal = document.getElementById("trilinguoInspectorModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "trilinguoInspectorModal";
    modal.className = "dev-inspector-modal-backdrop";
    modal.innerHTML = `
      <div class="dev-inspector-card" role="dialog" aria-modal="true">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <h3 style="margin:0;font-size:18px;" id="inspModalTitle">🛠️ Giao Tiếp Debug & Đánh Dấu Chức Năng</h3>
          <button type="button" class="dev-btn dev-btn--outline" id="inspCloseBtn">✕ Đóng</button>
        </div>

        <div class="dev-inspector-meta-grid" id="inspMetaBox"></div>

        <div style="margin-top:10px;">
          <label style="font-weight:800;font-size:13px;display:block;margin-bottom:6px;">
            Nội dung bạn muốn sửa / debug ở chức năng này:
          </label>
          <textarea
            id="inspNoteInput"
            rows="3"
            class="form-control"
            style="width:100%;padding:10px;border-radius:10px;border:1.5px solid #38a3bc;"
            placeholder="Ví dụ: Đổi màu nút sang cam đậm, kiểm tra lại thông báo lỗi khi chưa nhập đủ ký tự..."
          ></textarea>
        </div>

        <div class="dev-inspector-actions">
          <button type="button" class="dev-btn dev-btn--primary" id="inspCopyPromptBtn">
            📋 Copy lệnh gửi AI sửa ngay
          </button>
          <button type="button" class="dev-btn dev-btn--teal" id="inspSaveLogBtn">
            💾 Lưu vào Thư viện Log (change_requests.jsonl)
          </button>
          <button type="button" class="dev-btn dev-btn--outline" id="inspToggleAllListBtn">
            📑 Xem Bảng Mã 45 Chức Năng & Log
          </button>
        </div>

        <div id="inspStatusMsg" style="margin-top:10px;font-size:13px;font-weight:700;color:#2d8a4e;"></div>
        <div id="inspLogListContainer" style="display:none;margin-top:14px;border-top:1px solid rgba(56,163,188,0.3);padding-top:12px;"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#inspCloseBtn").addEventListener("click", () => {
      modal.classList.remove("open");
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });

    return modal;
  }

  function openInspectorModalForElement(el) {
    const modal = ensureInspectorModal();
    const funcId = el ? el.getAttribute("data-func-id") || "F-00" : "F-ALL";
    const cmpId = el ? el.getAttribute("data-cmp-id") || "CMP-PAGE" : "CMP-SYSTEM";
    const cmpName = el ? el.getAttribute("data-cmp-name") || "Thành phần giao diện" : "Toàn trang";
    const selector = el ? el.getAttribute("data-cmp-selector") || el.tagName.toLowerCase() : getCurrentPageName();
    const beApi = el ? el.getAttribute("data-cmp-api") || "-" : "-";
    const feFile = el ? el.getAttribute("data-cmp-file") || getCurrentPageName() : getCurrentPageName();

    modal.querySelector("#inspMetaBox").innerHTML = `
      <div><strong>Mã Chức Năng (Debug No.):</strong> <span style="color:#ff9d1d;font-weight:900;">${funcId}</span></div>
      <div><strong>Mã Component ID:</strong> <code>${cmpId}</code></div>
      <div><strong>Tên Chức Năng:</strong> ${cmpName}</div>
      <div><strong>Trang & Selector:</strong> <code>${getCurrentPageName()}</code> → <code>${selector}</code></div>
      <div><strong>File Frontend:</strong> <code>${feFile}</code></div>
      <div><strong>API Backend:</strong> <code>${beApi}</code></div>
    `;

    const noteInput = modal.querySelector("#inspNoteInput");
    const statusMsg = modal.querySelector("#inspStatusMsg");
    statusMsg.textContent = "";
    noteInput.value = "";

    const buildPromptString = () => {
      const userNote = noteInput.value.trim() || "(Mô tả yêu cầu chỉnh sửa/debug của bạn tại đây)";
      return `[DEBUG / YÊU CẦU SỬA] Mã chức năng: ${funcId} | Component: ${cmpId} (${cmpName}) | Trang: ${getCurrentPageName()} (${selector}) | File: ${feFile} | API: ${beApi}\n-> Nội dung cần sửa: ${userNote}`;
    };

    modal.querySelector("#inspCopyPromptBtn").onclick = async () => {
      const text = buildPromptString();
      try {
        await navigator.clipboard.writeText(text);
        statusMsg.textContent = "✅ Đã copy câu lệnh chuẩn vào Clipboard! Bạn có thể dán (Ctrl+V) gửi ngay để sửa.";
      } catch (_) {
        statusMsg.textContent = text;
      }
    };

    modal.querySelector("#inspSaveLogBtn").onclick = async () => {
      const note = noteInput.value.trim();
      if (!note) {
        statusMsg.textContent = "⚠️ Vui lòng nhập mô tả lỗi hoặc nội dung cần chỉnh sửa trước khi lưu vào Log!";
        return;
      }
      const saved = await submitChangeRequestTicket({
        component_id: `${funcId}:${cmpId}`,
        component_name: cmpName,
        page: getCurrentPageName(),
        selector: selector,
        note: note,
      });
      statusMsg.textContent = `✅ Đã lưu vào Thư viện Log (Mã ticket: ${saved.ticket_id} trong backend/logs/change_requests.jsonl)!`;
    };

    modal.querySelector("#inspToggleAllListBtn").onclick = () => {
      const box = modal.querySelector("#inspLogListContainer");
      if (box.style.display === "none") {
        box.style.display = "block";
        const rows = COMPONENT_REGISTRY.map(
          (r) =>
            `<div style="padding:5px 0;border-bottom:1px dashed rgba(56,163,188,0.25);font-size:12px;">
              <strong style="color:#ff9d1d;">[${r.funcId}]</strong> <code>${r.cmpId}</code> — <strong>${r.name}</strong>
              <span style="opacity:0.75;">(${r.page} | <code>${r.selector}</code>)</span>
            </div>`
        ).join("");
        box.innerHTML = `<div style="max-height:220px;overflow-y:auto;">${rows}</div>`;
      } else {
        box.style.display = "none";
      }
    };

    modal.classList.add("open");
  }

  function initInspectorUI() {
    injectInspectorStyles();
    tagAllRegisteredComponents();

    if (!document.getElementById("trilinguoInspectorFab")) {
      const fab = document.createElement("button");
      fab.type = "button";
      fab.id = "trilinguoInspectorFab";
      fab.className = "dev-inspector-fab";
      fab.innerHTML = "🛠️ Mã Chức Năng & Debug (Alt+I)";
      fab.title = "Bật/tắt hiển thị Mã số chức năng (F-01..F-45) & Component ID trên giao diện để debug nhanh";
      fab.addEventListener("click", () => toggleDebugMode());
      document.body.appendChild(fab);
    }

    window.addEventListener("keydown", (e) => {
      if (e.altKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        toggleDebugMode();
      }
    });

    window.addEventListener("resize", () => {
      if (debugModeActive) renderOverlayPills();
    });
    window.addEventListener("scroll", () => {
      if (debugModeActive) renderOverlayPills();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(initInspectorUI, 150);
    });
  } else {
    setTimeout(initInspectorUI, 150);
  }
})();
