/**
 * Mirror of WEBSITE/frontend/js/api.js for backward-compatible script tags.
 */
(function () {
  if (!window.TrilinguoAPI) {
    const s = document.createElement('script');
    s.src = 'js/api.js';
    document.head.appendChild(s);
  }
})();
