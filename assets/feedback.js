/* v3.13: thêm nút “Góp ý” ở góc phải trên mỗi mục; tên không bắt buộc, có ô “Góp ý ẩn danh”.
   v3.12 — Góp ý nội bộ (chỉ bản Apps Script, mở từ dải vàng "Bản nháp để góp ý nội bộ").
   - Không dùng vh; bảng góp ý đặt tuyệt đối ngay dưới nút bấm, nên vẫn thấy được kể cả khi khung nhúng Google Sites tự giãn.
   - Chạy lại sau mỗi lần chuyển trang trong khung (router thay <body>); listener cấp document chỉ gắn một lần. */
(function () {
  'use strict';
  var d = document, h = d.documentElement;
  var MAX = 2000;
  var TIMEOUT_MS = 30000; /* tối đa 30 giây; bản thử có thể đặt window.__ANDUOR_TIMEOUTS.feedback */
  function lang() { return h.getAttribute('data-lang') === 'en' ? 'en' : 'vi'; }
  function bi(en, vi) { return '<span lang="en" data-l="en">' + en + '</span><span lang="vi" data-l="vi">' + vi + '</span>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Dải vàng dính trên cùng; thanh menu dính ngay dưới dải. */
  var banner = d.querySelector('.draft-banner');
  function syncBanner() { if (banner) h.style.setProperty('--banner-h', banner.offsetHeight + 'px'); }
  syncBanner();
  if (!window.__ANDUOR_FB_RESIZE) { window.__ANDUOR_FB_RESIZE = true; window.addEventListener('resize', function () { var b = d.querySelector('.draft-banner'); if (b) h.style.setProperty('--banner-h', b.offsetHeight + 'px'); }); }

  /* Mục đang xem: đo phần nhìn thấy của từng mục (IntersectionObserver tính cả khung cha). */
  var vis = {};
  var secs = Array.prototype.slice.call(d.querySelectorAll('main section[id]'));
  if (window.__ANDUOR_FB_IO) { try { window.__ANDUOR_FB_IO.disconnect(); } catch (e) {} }
  if ('IntersectionObserver' in window) {
    var th = []; for (var i = 0; i <= 20; i++) th.push(i / 20);
    window.__ANDUOR_FB_IO = new IntersectionObserver(function (es) {
      es.forEach(function (en) { vis[en.target.id] = en.isIntersecting ? en.intersectionRect.height : 0; });
    }, { threshold: th });
    secs.forEach(function (s) { window.__ANDUOR_FB_IO.observe(s); });
  }
  /* v3.13: nút “Góp ý” nhỏ ở góc phải trên của mỗi mục (đặt trong khoảng đệm phía trên tiêu đề). */
  secs.forEach(function (s) {
    if (s.querySelector(':scope > .fb-sec, :scope > .wrap > .fb-sec')) return;
    var host = s.querySelector(':scope > .wrap') || s;
    host.classList.add('fb-host');
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'fb-sec'; b.setAttribute('data-fb-open', ''); b.setAttribute('data-fb-section', s.id);
    b.setAttribute('aria-haspopup', 'dialog');
    b.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H7l-3.2 2.7V11h-.3A1.5 1.5 0 0 1 2 9.5z" fill="currentColor"/></svg>' + bi('Feedback', 'Góp ý');
    host.insertBefore(b, host.firstChild);
  });
  function sectionLabel(s) {
    var hd = s.querySelector('h1, h2');
    var txt = '';
    if (hd) {
      var sp = hd.querySelector('[data-l="' + lang() + '"]');
      txt = (sp || hd).textContent.replace(/\s+/g, ' ').trim().replace(/[.。]$/, '');
    } else if (s.id === 'cto') { txt = 'CTO · Rajendra Rajavelu'; }
    return s.id + (txt ? ' · ' + txt : '');
  }
  function currentSection() {
    if (!secs.length) return '';
    var best = null, bv = 0;
    secs.forEach(function (s) { var v = vis[s.id] || 0; if (v > bv) { bv = v; best = s; } });
    if (!best) {
      /* Dự phòng: mục cắt đường ngang ngay dưới thanh menu. */
      var hd = d.querySelector('header'), y = (hd ? hd.getBoundingClientRect().bottom : 0) + 4;
      secs.forEach(function (s) { if (s.getBoundingClientRect().top <= y) best = s; });
      best = best || secs[0];
    }
    return sectionLabel(best);
  }
  function pageKey() { return (banner && banner.getAttribute('data-page')) || 'index'; }
  function version() { var m = banner && /v\d+\.\d+/.exec(banner.textContent); return m ? m[0] : ''; }

  var MSG = {
    ok: ['Feedback recorded. Thank you.', 'Đã ghi nhận góp ý. Cảm ơn.'],
    comment: ['Please enter a comment.', 'Vui lòng nhập nội dung góp ý.'],
    long: ['The comment is longer than 2,000 characters.', 'Nội dung dài quá 2.000 ký tự.'],
    timeout: ['The server did not answer within 30 seconds. The feedback may not have been saved; please try again.', 'Máy chủ không trả lời sau 30 giây. Góp ý có thể chưa được ghi; vui lòng thử lại.'],
    auth: ['The server has not been authorised yet (run authorize in Apps Script).', 'Máy chủ chưa được cấp quyền (chạy hàm authorize trong Apps Script).'],
    offline: ['Feedback can only be sent from the Apps Script version of the site.', 'Chỉ gửi được góp ý từ bản Apps Script của trang.'],
    err: ['Could not send the feedback', 'Chưa gửi được góp ý']
  };
  function msg(k) { return bi(MSG[k][0], MSG[k][1]); }

  function close(focusBack) {
    var m = d.getElementById('fb-modal'), b = d.getElementById('fb-backdrop');
    if (m) m.parentNode.removeChild(m);
    if (b) b.parentNode.removeChild(b);
    if (focusBack) { var o = d.querySelector('[data-fb-open]'); if (o) o.focus(); }
  }
  function open(btn) {
    close(false);
    var sid = btn.getAttribute('data-fb-section'), se = sid && d.getElementById(sid);
    var sec = se ? sectionLabel(se) : currentSection();
    var bd = d.createElement('div'); bd.id = 'fb-backdrop'; bd.className = 'fb-backdrop';
    var m = d.createElement('div');
    m.id = 'fb-modal'; m.className = 'fb-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'fb-title');
    m.innerHTML =
      '<form class="fb-form" novalidate>' +
      '<div class="fb-head"><h2 class="fb-title" id="fb-title">' + bi('Internal feedback', 'Góp ý nội bộ') + '</h2>' +
      '<button type="button" class="fb-x" data-fb-close aria-label="Đóng" data-en="Close" data-vi="Đóng">×</button></div>' +
      '<p class="fb-sub small">' + bi('Saved to the internal review sheet. Not shown on the site.', 'Lưu vào bảng góp ý nội bộ. Không hiện trên trang.') + '</p>' +
      '<label class="fb-label" for="fb-name">' + bi('Your name (optional)', 'Tên người góp ý (không bắt buộc)') + '</label>' +
      '<input id="fb-name" name="name" type="text" maxlength="120" autocomplete="name">' +
      '<label class="fb-anon"><input type="checkbox" id="fb-anon" name="anonymous"> ' + bi('Send anonymously', 'Góp ý ẩn danh') + '</label>' +
      '<div class="fb-hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="fb-label" for="fb-section">' + bi('Section', 'Mục') + '</label>' +
      '<input id="fb-section" name="section" type="text" maxlength="200" value="' + esc(sec) + '">' +
      '<label class="fb-label" for="fb-comment">' + bi('Comment', 'Nội dung góp ý') + ' <span class="fb-req">*</span></label>' +
      '<textarea id="fb-comment" name="comment" rows="6" maxlength="' + MAX + '" required></textarea>' +
      '<p class="fb-count caption" id="fb-count" aria-live="polite">0 / ' + MAX + '</p>' +
      '<p class="fb-status small" id="fb-status" role="status" aria-live="polite"></p>' +
      '<div class="fb-actions"><button type="button" class="btn btn-s fb-cancel" data-fb-close>' + bi('Close', 'Đóng') + '</button>' +
      '<button type="submit" class="btn btn-p fb-send" id="fb-send">' + bi('Send feedback', 'Gửi góp ý') + '</button></div>' +
      '</form>';
    var r = btn.getBoundingClientRect();
    d.body.appendChild(bd); d.body.appendChild(m);
    /* Ngay dưới nút; nếu tràn khỏi màn hình thì kéo lên (khung cố định). Khung Google Sites tự giãn: giữ cạnh nút. */
    var hdE = d.querySelector('header'), hb = hdE ? hdE.getBoundingClientRect().bottom : 0;
    var y = Math.min(r.bottom + 8, Math.max(hb + 8, window.innerHeight - m.offsetHeight - 8));
    m.style.top = Math.round(Math.max(0, y) + window.pageYOffset) + 'px';
    try { var nm = localStorage.getItem('anduor-fb-name'); if (nm) d.getElementById('fb-name').value = nm; } catch (e) {}
    var x = m.querySelector('.fb-x'); x.setAttribute('aria-label', x.getAttribute('data-' + lang()));
    var first = d.getElementById('fb-comment');
    try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    try { m.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }

  function status(html, kind) {
    var s = d.getElementById('fb-status'); if (!s) return;
    s.className = 'fb-status small' + (kind ? ' ' + kind : '');
    s.innerHTML = html;
  }
  function gas(fn, arg, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () { if (done) return; done = true; var e = new Error('timeout'); e.code = 'timeout'; reject(e); }, ms);
      function fin(f, v) { if (done) return; done = true; clearTimeout(timer); f(v); }
      try {
        google.script.run
          .withSuccessHandler(function (v) { fin(resolve, v); })
          .withFailureHandler(function (err) { fin(reject, new Error(String((err && err.message) || err))); })[fn](arg);
      } catch (e) { fin(reject, e instanceof Error ? e : new Error(String(e))); }
    });
  }
  function send(form) {
    var anon = form.anonymous.checked;
    var name = anon ? '' : form.name.value.trim(), comment = form.comment.value.trim(), section = form.section.value.trim();
    if (!comment) { status(msg('comment'), 'err'); form.comment.setAttribute('aria-invalid', 'true'); form.comment.focus(); return; }
    if (comment.length > MAX) { status(msg('long'), 'err'); form.comment.focus(); return; }
    form.comment.removeAttribute('aria-invalid');
    var hasGas = false; try { hasGas = !!(window.google && google.script && google.script.run); } catch (e) {}
    if (!hasGas) { status(msg('offline'), 'err'); return; }
    var btn = d.getElementById('fb-send'); btn.disabled = true;
    status(bi('Sending…', 'Đang gửi…'), 'busy');
    try { if (name) localStorage.setItem('anduor-fb-name', name); } catch (e) {}
    gas('submitFeedback', { name: name, anonymous: anon, section: section, comment: comment, website: (form.website ? form.website.value : ''), page: pageKey(), version: version(), lang: lang() }, (window.__ANDUOR_TIMEOUTS && window.__ANDUOR_TIMEOUTS.feedback) || TIMEOUT_MS)
      .then(function (r) {
        if (!r || !r.ok) { var e = new Error((r && r.error) || 'no_result'); e.detail = r && r.detail; throw e; }
        status(msg('ok') + (r.mailed ? '' : ' ' + bi('(Saved; the notification email failed.)', '(Đã lưu; email thông báo lỗi.)')), 'ok');
        form.comment.value = ''; upd(form);
      })
      .catch(function (e) {
        var c = (e && (e.code || e.message)) || '';
        if (c === 'timeout') status(msg('timeout'), 'err');
        else if (/permission|authori|quyền|ScriptError/i.test(c)) status(msg('auth'), 'err');
        else if (c === 'comment_required') status(msg('comment'), 'err');
        else if (c === 'comment_too_long') status(msg('long'), 'err');
        else status(msg('err') + ' (' + esc(String(c).slice(0, 120)) + '). ' + bi('Please try again.', 'Vui lòng thử lại.'), 'err');
      })
      .then(function () { var b = d.getElementById('fb-send'); if (b) b.disabled = false; });
  }
  function upd(form) { var c = d.getElementById('fb-count'); if (c) c.textContent = form.comment.value.length + ' / ' + MAX; }

  /* Hàm của lần chạy mới nhất (sau mỗi lần chuyển trang): listener cấp document luôn gọi qua đây,
     để dùng đúng dải vàng, đúng trang và đúng danh sách mục hiện tại. */
  window.__ANDUOR_FB = { open: open, close: close, send: send, upd: upd, syncBanner: syncBanner, lang: lang };
  if (!window.__ANDUOR_FB_ON) {
    window.__ANDUOR_FB_ON = true;
    var F = function () { return window.__ANDUOR_FB; };
    d.addEventListener('click', function (e) {
      var t = e.target;
      var o = t.closest && t.closest('[data-fb-open]');
      if (o) { e.preventDefault(); F().open(o); return; }
      if (t.closest && (t.closest('[data-fb-close]') || t.id === 'fb-backdrop')) { e.preventDefault(); F().close(true); }
    });
    d.addEventListener('submit', function (e) {
      if (!e.target.closest || !e.target.closest('#fb-modal')) return;
      e.preventDefault(); F().send(e.target);
    });
    d.addEventListener('input', function (e) { if (e.target && e.target.id === 'fb-comment') F().upd(e.target.form); });
    d.addEventListener('change', function (e) {
      if (!e.target || e.target.id !== 'fb-anon') return;
      var n = d.getElementById('fb-name'); if (!n) return;
      if (e.target.checked) { n.value = ''; n.disabled = true; } else { n.disabled = false; }
    });
    d.addEventListener('keydown', function (e) {
      var m = d.getElementById('fb-modal'); if (!m) return;
      if (e.key === 'Escape') { e.preventDefault(); F().close(true); return; }
      if (e.key === 'Tab') {
        var f = m.querySelectorAll('button:not([disabled]), input, textarea');
        if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    d.addEventListener('anduor-lang', function () {
      var x = d.querySelector('#fb-modal .fb-x'); if (x) x.setAttribute('aria-label', x.getAttribute('data-' + F().lang()));
      F().syncBanner();
    });
  }
})();
