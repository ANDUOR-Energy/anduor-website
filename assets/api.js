/* ANDUOR v3.15 — Cầu nối máy chủ cho bản GitHub Pages.
   Trang tĩnh không có google.script.run, nên tệp này tạo một đối tượng cùng giao diện
   (google.script.run.withSuccessHandler(..).withFailureHandler(..).ten_ham(arg)),
   bên trong gọi fetch() POST tới APPS_SCRIPT_URL (đặt trong assets/config.js).
   - Content-Type: text/plain để trình duyệt KHÔNG gửi yêu cầu kiểm tra trước (CORS preflight);
     Apps Script đọc thân yêu cầu là JSON và trả JSON qua ContentService.
   - Hết giờ, chia nhỏ tệp 2 MB và báo lỗi vẫn do site.js / feedback.js lo như bản Apps Script.
   - APPS_SCRIPT_URL để trống: không tạo cầu nối, form tự chuyển sang mở email. */
(function () {
  'use strict';
  var URL_ = String(window.APPS_SCRIPT_URL || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(URL_)) return;
  if (window.google && window.google.script && window.google.script.run) return;
  var ACTIONS = ['ping', 'uploadChunk', 'submitRequest', 'submitFeedback'];
  var HARD_TIMEOUT = 120000; /* chặn treo mạng; thời gian chờ chính do site.js/feedback.js đặt */
  var VER = 'v3.15';

  function clientId() {
    var k = 'anduor-cid', v = '';
    try { v = localStorage.getItem(k) || ''; } catch (e) {}
    if (!/^[A-Za-z0-9]{12,40}$/.test(v)) {
      v = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      try { localStorage.setItem(k, v); } catch (e) {}
    }
    return v;
  }
  function fail(code, detail) { var e = new Error(code); e.code = code; if (detail) e.detail = detail; return e; }

  function post(action, payload) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, HARD_TIMEOUT);
    var body = JSON.stringify({
      action: action,
      payload: payload === undefined ? null : payload,
      origin: location.origin,
      path: location.pathname,
      cid: clientId(),
      v: VER
    });
    return fetch(URL_, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw fail('server', 'HTTP ' + res.status);
      return res.text();
    }, function (err) {
      throw fail(err && err.name === 'AbortError' ? 'timeout' : 'network', String((err && err.message) || err));
    }).then(function (txt) {
      try { return JSON.parse(txt); }
      catch (e) { throw fail('bad_response', String(txt || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)); }
    }).then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }

  function runner() {
    var ok = null, ko = null, o = {};
    o.withSuccessHandler = function (f) { ok = f; return o; };
    o.withFailureHandler = function (f) { ko = f; return o; };
    ACTIONS.forEach(function (a) {
      o[a] = function (arg) {
        post(a, arg).then(function (v) { if (ok) ok(v); }, function (e) { if (ko) ko(e); });
      };
    });
    return o;
  }
  window.google = window.google || {};
  window.google.script = { get run() { return runner(); } };
  window.ANDUOR_API = { url: URL_, post: post };
})();
