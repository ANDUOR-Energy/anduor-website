/* v3.14 — Menu gọn cho điện thoại (≤ 760px). Máy tính giữ nguyên.
   - Thêm nút ☰ vào thanh đầu trang; menu mở thành bảng thả xuống, thứ tự mục giữ nguyên (Triết lý đứng đầu).
   - Đóng khi chọn mục, bấm ra ngoài, hoặc nhấn Esc (trả con trỏ về nút ☰).
   - Đầu trang ẩn khi cuộn xuống, hiện lại khi cuộn lên (chỉ trên điện thoại).
   - Chạy lại sau mỗi lần chuyển trang trong khung; listener cấp document/window chỉ gắn một lần. Không dùng vh. */
(function () {
  'use strict';
  var d = document, h = d.documentElement;
  var MQ = '(max-width: 760px)';
  function mobile() { return window.matchMedia ? window.matchMedia(MQ).matches : (window.innerWidth <= 760); }
  function L() { return h.getAttribute('data-lang') === 'en' ? 'en' : 'vi'; }
  var TXT = { open: { vi: 'Mở menu', en: 'Open menu' }, close: { vi: 'Đóng menu', en: 'Close menu' } };

  var hd = d.querySelector('.hd'), bar = hd && hd.querySelector('.bar'), nav = hd && hd.querySelector('.nav');
  if (!hd || !bar || !nav) return;
  if (!nav.id) nav.id = 'site-nav';
  var btn = bar.querySelector('.mnav-btn');
  if (!btn) {
    btn = d.createElement('button');
    btn.type = 'button';
    btn.className = 'mnav-btn';
    btn.setAttribute('aria-controls', nav.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
      '<path class="mnav-i-open" d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '<path class="mnav-i-close" d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
    bar.appendChild(btn);
  }
  h.classList.add('has-mnav');

  function label() { btn.setAttribute('aria-label', TXT[hd.classList.contains('mnav-open') ? 'close' : 'open'][L()]); }
  function setOpen(on, focusBtn) {
    hd.classList.toggle('mnav-open', !!on);
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    label();
    if (on) {
      hd.classList.remove('hd-hidden');
      var first = nav.querySelector('a');
      if (first) try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    } else if (focusBtn) {
      try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); }
    }
  }
  label();
  btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!hd.classList.contains('mnav-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setOpen(false); });

  /* Trạng thái dùng chung giữa các lần chạy (router thay <body>). */
  var S = window.__ANDUOR_MNAV = window.__ANDUOR_MNAV || {};
  S.setOpen = setOpen; S.hd = hd; S.btn = btn; S.label = label;
  if (!S.bound) {
    S.bound = true;
    d.addEventListener('click', function (e) {
      var X = window.__ANDUOR_MNAV;
      if (!X.hd || !X.hd.classList.contains('mnav-open')) return;
      if (X.hd.contains(e.target)) return;
      X.setOpen(false);
    }, true);
    d.addEventListener('keydown', function (e) {
      var X = window.__ANDUOR_MNAV;
      if ((e.key === 'Escape' || e.key === 'Esc') && X.hd && X.hd.classList.contains('mnav-open')) { e.preventDefault(); X.setOpen(false, true); }
    });
    d.addEventListener('anduor-lang', function () { var X = window.__ANDUOR_MNAV; if (X.label) X.label(); });
    var lastY = window.pageYOffset || 0, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      (window.requestAnimationFrame || setTimeout)(function () {
        ticking = false;
        var X = window.__ANDUOR_MNAV, el = X.hd, y = window.pageYOffset || 0;
        if (!el) return;
        if (!mobile() || el.classList.contains('mnav-open')) { el.classList.remove('hd-hidden'); lastY = y; return; }
        if (y < 80) el.classList.remove('hd-hidden');
        else if (y > lastY + 6) el.classList.add('hd-hidden');
        else if (y < lastY - 6) el.classList.remove('hd-hidden');
        if (Math.abs(y - lastY) > 6) lastY = y;
      });
    }, { passive: true });
    window.addEventListener('resize', function () { var X = window.__ANDUOR_MNAV; if (!mobile() && X.hd) { X.hd.classList.remove('hd-hidden'); if (X.hd.classList.contains('mnav-open')) X.setOpen(false); } });
  }
  /* Hiện lại đầu trang khi bàn phím đưa con trỏ vào đó. */
  hd.addEventListener('focusin', function () { hd.classList.remove('hd-hidden'); });
})();
