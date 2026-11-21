/* Ngôn ngữ, liên hệ, công cụ kiểm tra, danh sách khảo sát, form. */
(function () {
  'use strict';
  var d = document, h = d.documentElement;

  /* MST và địa chỉ theo Thông báo của Phòng Đăng ký kinh doanh TP.HCM ngày 18/11/2026. Có số Zalo thì điền vào zalo; để trống thì trang không hiện Zalo. */
  var CONFIG = {
    email: 'info@anduor.com',
    phone: '+84 976 350 466',
    phoneHref: '+84976350466',
    zalo: '',
    address: '',
    maSoThue: '0319800794',
    khieuNai: ''  /* để trống: giữ email và điện thoại đã ghi trong HTML */
  };
  var MAX_BILL_BYTES = 10 * 1024 * 1024;
  var MAX_BILLS = 5;
  var BILL_OK = /\.(pdf|jpe?g|png|heic|heif|webp)$/i;
  var BILL_TYPE = /^(application\/pdf|image\/(jpeg|jpg|pjpeg|png|heic|heif|webp))$/i;

  function lang() { return h.dataset.lang === 'en' ? 'en' : 'vi'; }

  function applyLang(l) {
    h.lang = l;
    h.dataset.lang = l;
    var ti = d.querySelector('title');
    if (ti && ti.dataset[l]) d.title = ti.dataset[l];
    var me = d.querySelector('meta[name="description"]');
    if (me && me.dataset[l]) me.setAttribute('content', me.dataset[l]);
    var ogt = d.querySelector('meta[property="og:title"]');
    if (ogt && ti && ti.dataset[l]) ogt.setAttribute('content', ti.dataset[l]);
    var ogd = d.querySelector('meta[property="og:description"]');
    if (ogd && me && me.dataset[l]) ogd.setAttribute('content', me.dataset[l]);
    var lg = d.querySelector('.lang');
    if (lg) {
      if (lg.dataset[l]) lg.setAttribute('aria-label', lg.dataset[l]);
      lg.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.set === l));
      });
    }
    d.documentElement.dispatchEvent(new CustomEvent('anduor-lang', { detail: l, bubbles: true }));
    document.dispatchEvent(new CustomEvent('anduor-lang', { detail: l }));
    d.querySelectorAll('option[data-en][data-vi]').forEach(function (o) { o.textContent = o.dataset[l]; });
    if (typeof updateChecker === 'function') updateChecker();
    if (typeof updateSurvey === 'function') updateSurvey();
  }

  var lg = d.querySelector('.lang');
  var start = null;
  try { start = localStorage.getItem('anduor-lang'); } catch (e) {}
  if (start !== 'en' && start !== 'vi') {
    start = (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'vi';
    /* Trang mặc định tiếng Việt; người dùng vẫn đổi EN được. */
  }
  applyLang(start);
  if (lg) {
    lg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      applyLang(b.dataset.set);
      try { localStorage.setItem('anduor-lang', b.dataset.set); } catch (err) {}
    });
  }

  function fillOrPending(id, value, href) {
    var node = d.getElementById(id);
    if (!node) return;
    if (value) {
      node.classList.remove('pending');
      if (href) {
        var a = d.createElement('a');
        a.href = href;
        a.textContent = value;
        if (href.indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener'; }
        node.replaceChildren(a);
      } else {
        node.textContent = value;
      }
    } else {
      return; /* bản công khai: không hiện chữ chờ chốt */
    }
  }

  function refreshContacts() {
    var zaloHref = CONFIG.zalo ? ('https://zalo.me/' + String(CONFIG.zalo).replace(/\D/g, '')) : '';
    fillOrPending('c-zalo', CONFIG.zalo, zaloHref);
    fillOrPending('c-phone', CONFIG.phone, CONFIG.phoneHref ? ('tel:' + CONFIG.phoneHref) : '');
    fillOrPending('c-email', CONFIG.email, CONFIG.email ? ('mailto:' + CONFIG.email) : '');
    if (CONFIG.address) fillOrPending('c-address', CONFIG.address, '');
    fillOrPending('c-mst', CONFIG.maSoThue, '');
    fillOrPending('c-khieunai', CONFIG.khieuNai, '');
    var y = d.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
    var mailBtns = d.querySelectorAll('[data-mail-btn]');
    mailBtns.forEach(function (btn) {
      if (CONFIG.email) {
        btn.href = 'mailto:' + CONFIG.email;
        btn.classList.remove('is-disabled');
        btn.removeAttribute('aria-disabled');
      } else {
        btn.removeAttribute('href');
        btn.classList.add('is-disabled');
        btn.setAttribute('aria-disabled', 'true');
      }
    });
  }
  refreshContacts();
  document.addEventListener('anduor-lang', refreshContacts);

  /* ---------- Công cụ kiểm tra báo giá ---------- */
  var boxes = Array.prototype.slice.call(d.querySelectorAll('#checker-form input[type="checkbox"]'));
  var chkCount = d.getElementById('chk-count');
  var chkMeter = d.getElementById('chk-meter');
  var chkWarn = d.getElementById('chk-warn');
  var chkDone = d.getElementById('chk-done');
  var chkQBlock = d.getElementById('chk-qblock');
  var chkQs = d.getElementById('chk-qs');
  var chkCopy = d.getElementById('chk-copy');
  var chkStatus = d.getElementById('chk-copy-status');

  function missing() { return boxes.filter(function (b) { return !b.checked; }); }

  function updateChecker() {
    if (!chkCount || !boxes.length) return;
    var total = boxes.length, miss = missing(), done = total - miss.length;
    var L = lang();
    chkCount.textContent = L === 'en'
      ? ('You have ticked ' + done + ' of ' + total + ' items')
      : ('Quý khách đã đánh dấu ' + done + ' trong ' + total + ' mục');
    if (chkMeter) chkMeter.style.width = (done / total * 100) + '%';
    if (chkWarn) chkWarn.hidden = !miss.some(function (b) { return b.dataset.critical === '1'; });
    if (chkDone) chkDone.hidden = miss.length !== 0;
    if (chkQBlock) chkQBlock.hidden = miss.length === 0;
    if (chkQs) {
      chkQs.replaceChildren.apply(chkQs, miss.map(function (b) {
        var li = d.createElement('li');
        li.textContent = (L === 'en' && b.dataset.qEn) ? b.dataset.qEn : b.dataset.q;
        return li;
      }));
    }
    if (chkStatus) chkStatus.textContent = '';
  }

  if (boxes.length) {
    boxes.forEach(function (b) { b.addEventListener('change', updateChecker); });
    updateChecker();
  }
  if (chkCopy) {
    chkCopy.addEventListener('click', function () {
      var L = lang();
      var lines = missing().map(function (b, i) {
        var q = (L === 'en' && b.dataset.qEn) ? b.dataset.qEn : b.dataset.q;
        return (i + 1) + '. ' + q;
      });
      var text = (L === 'en'
        ? 'Questions about this solar quotation:\n'
        : 'Câu hỏi về báo giá hệ điện mặt trời:\n') + lines.join('\n');
      function fallback() {
        var ok = false;
        try {
          var ta = d.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          d.body.appendChild(ta);
          ta.select();
          ok = d.execCommand('copy');
          ta.remove();
        } catch (e) { ok = false; }
        chkStatus.textContent = ok
          ? (L === 'en' ? 'Copied.' : 'Đã sao chép.')
          : (L === 'en'
            ? 'The browser blocked copying. Please select the list above and copy it yourself.'
            : 'Trình duyệt chặn sao chép. Hãy bôi đen danh sách câu hỏi ở trên để sao chép.');
      }
      try {
        navigator.clipboard.writeText(text).then(function () {
          chkStatus.textContent = L === 'en' ? 'Copied.' : 'Đã sao chép.';
        }, fallback);
      } catch (e) { fallback(); }
    });
  }

  /* ---------- Danh sách chuẩn bị khảo sát ---------- */
  var svBoxes = Array.prototype.slice.call(d.querySelectorAll('#survey-form input[type="checkbox"]'));
  var svProgress = d.getElementById('sv-progress');
  var STORE_KEY = 'anduor-khao-sat';
  var canStore = false;
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (Array.isArray(saved)) svBoxes.forEach(function (b, i) { b.checked = !!saved[i]; });
    localStorage.setItem(STORE_KEY + '-test', '1');
    localStorage.removeItem(STORE_KEY + '-test');
    canStore = true;
  } catch (e) { canStore = false; }
  var svStore = d.getElementById('sv-store');
  if (svStore) svStore.hidden = !canStore;

  function updateSurvey() {
    if (!svProgress || !svBoxes.length) return;
    var n = 0;
    svBoxes.forEach(function (b) { if (b.checked) n++; });
    svProgress.textContent = lang() === 'en'
      ? ('Ready: ' + n + ' of ' + svBoxes.length)
      : ('Đã có ' + n + ' trong ' + svBoxes.length);
    if (canStore) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(svBoxes.map(function (b) { return b.checked; }))); } catch (e) {}
    }
  }
  if (svBoxes.length) {
    svBoxes.forEach(function (b) { b.addEventListener('change', updateSurvey); });
    updateSurvey();
  }

  /* ---------- Form liên hệ: kiểm tra, cuộn tới ô thiếu, gửi qua Apps Script (google.script.run) ---------- */
  var form = d.getElementById('contact-form');
  var formNote = d.getElementById('form-status');
  var formErrors = d.getElementById('form-errors');
  var billsInput = d.getElementById('bills');
  var billsList = d.getElementById('bills-list');
  var billFiles = [];

  function T(en, vi) { return lang() === 'en' ? en : vi; }
  function biSpan(en, vi) {
    var f = d.createDocumentFragment();
    [['en', en], ['vi', vi]].forEach(function (p) {
      var s = d.createElement('span'); s.lang = p[0]; s.setAttribute('data-l', p[0]); s.textContent = p[1]; f.appendChild(s);
    });
    return f;
  }
  function hasGas() {
    try { return !!(window.google && google.script && google.script.run); } catch (e) { return false; }
  }

  function readyEndpoint(raw) {
    raw = (raw || '').trim();
    if (!raw || /^\[(CHỜ CHỐT|TO BE CONFIRMED)\]$/i.test(raw)) return '';
    try {
      var u = new URL(raw, location.href);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    } catch (e) {}
    return '';
  }

  function billAllowed(file) {
    return BILL_OK.test(file.name) || BILL_TYPE.test(file.type || '');
  }

  function formatSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function sameFile(a, b) {
    return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  }

  function renderBills() {
    if (!billsList) return;
    billsList.replaceChildren();
    billFiles.forEach(function (file, i) {
      var li = d.createElement('li');
      li.className = 'file-row';
      var name = d.createElement('span');
      name.className = 'fname';
      name.textContent = file.name;
      var size = d.createElement('span');
      size.className = 'fsize';
      size.textContent = formatSize(file.size);
      var rm = d.createElement('button');
      rm.type = 'button';
      rm.className = 'frm';
      rm.setAttribute('data-i', String(i));
      rm.textContent = lang() === 'en' ? 'Remove' : 'Gỡ';
      rm.setAttribute('aria-label', (lang() === 'en' ? 'Remove ' : 'Gỡ ') + file.name);
      li.appendChild(name);
      li.appendChild(size);
      li.appendChild(rm);
      billsList.appendChild(li);
    });
  }

  function setStatus(kind, en, vi, extra) {
    if (!formNote) return;
    formNote.replaceChildren();
    if (!kind) return;
    var box = d.createElement('div');
    box.className = kind;
    var p = d.createElement('p');
    p.appendChild(biSpan(en, vi));
    box.appendChild(p);
    if (extra) box.appendChild(extra);
    formNote.appendChild(box);
  }

  function addBills(list) {
    var L = lang();
    var rejected = [];
    Array.prototype.forEach.call(list || [], function (file) {
      if (!billAllowed(file)) {
        rejected.push(file.name + (L === 'en' ? ' (file type not accepted)' : ' (định dạng chưa nhận)'));
        return;
      }
      if (file.size > MAX_BILL_BYTES) {
        rejected.push(file.name + (L === 'en' ? ' (over 10 MB)' : ' (vượt 10 MB)'));
        return;
      }
      var exists = billFiles.some(function (f) { return sameFile(f, file); });
      if (exists) return;
      if (billFiles.length >= MAX_BILLS) {
        rejected.push(file.name + (L === 'en' ? ' (5 files at most)' : ' (tối đa 5 tệp)'));
        return;
      }
      billFiles.push(file);
    });
    renderBills();
    if (billsInput) billsInput.value = '';
    if (rejected.length) {
      setStatus('err', 'Some files were not added: ' + rejected.join('; ') + '.', 'Một số tệp chưa được thêm: ' + rejected.join('; ') + '.');
    } else {
      setStatus('');
    }
  }

  if (billsInput) {
    billsInput.addEventListener('change', function () {
      addBills(billsInput.files);
    });
  }
  if (billsList) {
    billsList.addEventListener('click', function (e) {
      var btn = e.target.closest('button.frm');
      if (!btn) return;
      var i = parseInt(btn.getAttribute('data-i'), 10);
      if (isNaN(i)) return;
      billFiles.splice(i, 1);
      renderBills();
    });
  }
  document.addEventListener('anduor-lang', function () { renderBills(); });

  /* --- Ngày cập nhật pháp lý: một hằng số LEGAL_AS_OF (config.js, hoặc đầu Code.gs) --- */
  var CFG = window.ANDUOR_CFG || {};
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  (function legalDates() {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(CFG.legalAsOf || ''));
    if (!m) return;
    var y = +m[1], mo = +m[2], dd = +m[3];
    var vi = (dd < 10 ? '0' : '') + dd + '/' + (mo < 10 ? '0' : '') + mo + '/' + y;
    var en = dd + ' ' + MONTHS_EN[mo - 1] + ' ' + y;
    d.querySelectorAll('.legal-date-vi').forEach(function (n) { n.textContent = vi; });
    d.querySelectorAll('.legal-date-en').forEach(function (n) { n.textContent = en; });
  })();

  /* --- Ô chọn tỉnh/thành: gõ vài chữ, gợi ý theo tên mới, tên tỉnh cũ, chữ viết tắt; chỉ nhận giá trị trong danh sách --- */
  function fold(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function stripPrefix(s) { return s.replace(/^(thanh pho|tp|tinh)\s+/, ''); }
  var PROVINCES = Array.isArray(CFG.provinces) ? CFG.provinces : [];
  var PINDEX = PROVINCES.map(function (pv, i) {
    var keys = [];
    function add(txt, kind) {
      var f = fold(txt); if (!f) return;
      keys.push({ k: f, kind: kind, label: txt });
      var s = stripPrefix(f); if (s !== f) keys.push({ k: s, kind: kind, label: txt });
    }
    add(pv.name, 'name');
    (pv.alias || []).forEach(function (a) { add(a, 'alias'); });
    (pv.former || []).forEach(function (a) { add(a, 'former'); });
    return { i: i, p: pv, keys: keys };
  });
  function findProvince(name) {
    for (var i = 0; i < PROVINCES.length; i++) if (PROVINCES[i].name === name) return PROVINCES[i];
    return null;
  }
  function searchProvinces(q) {
    q = fold(q);
    var qs = stripPrefix(q) || q;
    if (!qs) return PINDEX.map(function (e) { return { p: e.p, score: 9, i: e.i, former: '' }; });
    var out = [];
    PINDEX.forEach(function (e) {
      var best = null;
      e.keys.forEach(function (key) {
        var sc = -1;
        [q, qs].forEach(function (qq) {
          var s = -1;
          if (key.k === qq) s = 0;
          else if (key.k.indexOf(qq) === 0) s = 1;
          else if ((' ' + key.k).indexOf(' ' + qq) !== -1) s = 2;
          else if (qq.length >= 3 && !/^(tp|thanh pho|tinh) /.test(key.k) && key.k.replace(/ /g, '').indexOf(qq.replace(/ /g, '')) !== -1) s = 3;
          if (s >= 0 && (sc < 0 || s < sc)) sc = s;
        });
        if (sc < 0) return;
        var score = sc + (key.kind === 'former' ? 0.5 : 0);
        if (!best || score < best.score) best = { p: e.p, i: e.i, score: score, former: key.kind === 'former' ? key.label : '' };
      });
      if (best) out.push(best);
    });
    out.sort(function (a, b) { return a.score - b.score || a.i - b.i; });
    return out;
  }

  var pvInput = d.getElementById('f-province');
  var pvValue = d.getElementById('f-province-value');
  var pvList = d.getElementById('province-list');
  var pvNote = d.getElementById('province-note');
  var pvStatus = d.getElementById('province-status');
  var pvItems = [], pvActive = -1;

  function pvSetNote(former, name) {
    if (!pvNote) return;
    pvNote.replaceChildren();
    if (former) pvNote.appendChild(biSpan(former + ' is now part of ' + name + '.', former + ' nay thuộc ' + name + '.'));
  }
  function pvPlaceholder() {
    if (pvInput && pvInput.dataset['ph' + (lang() === 'en' ? 'En' : 'Vi')]) pvInput.placeholder = pvInput.dataset[lang() === 'en' ? 'phEn' : 'phVi'];
  }
  function pvClose() {
    if (!pvList) return;
    pvList.hidden = true;
    pvInput.setAttribute('aria-expanded', 'false');
    pvInput.removeAttribute('aria-activedescendant');
    pvActive = -1;
  }
  function pvSetActive(i) {
    var lis = pvList.querySelectorAll('[role="option"]');
    if (!lis.length) return;
    if (i < 0) i = lis.length - 1;
    if (i >= lis.length) i = 0;
    pvActive = i;
    lis.forEach(function (li, j) { li.setAttribute('aria-selected', String(j === i)); });
    pvInput.setAttribute('aria-activedescendant', lis[i].id);
    var li = lis[i], top = li.offsetTop, bottom = top + li.offsetHeight;
    if (top < pvList.scrollTop) pvList.scrollTop = top;
    else if (bottom > pvList.scrollTop + pvList.clientHeight) pvList.scrollTop = bottom - pvList.clientHeight;
  }
  function pvRender() {
    var q = pvInput.value;
    pvItems = searchProvinces(q).slice(0, fold(q) ? 8 : 34);
    pvList.replaceChildren();
    if (!pvItems.length) {
      var li0 = d.createElement('li'); li0.className = 'opt-empty'; li0.setAttribute('aria-disabled', 'true');
      li0.appendChild(biSpan('No match. Try another spelling, or a former province name.', 'Không thấy. Thử cách gõ khác, hoặc tên tỉnh cũ.'));
      pvList.appendChild(li0);
    }
    pvItems.forEach(function (it, j) {
      var li = d.createElement('li');
      li.id = 'province-opt-' + j; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
      li.dataset.index = String(j);
      var nm = d.createElement('span'); nm.className = 'opt-name'; nm.textContent = it.p.name; li.appendChild(nm);
      if (it.former) {
        var hn = d.createElement('span'); hn.className = 'opt-hint';
        hn.appendChild(biSpan('formerly: ' + it.former, 'trước đây: ' + it.former));
        li.appendChild(hn);
      }
      pvList.appendChild(li);
    });
    pvList.hidden = false;
    pvInput.setAttribute('aria-expanded', 'true');
    pvActive = -1;
    pvInput.removeAttribute('aria-activedescendant');
    if (pvItems.length && fold(q)) pvSetActive(0);
    if (pvStatus) pvStatus.textContent = T(pvItems.length + ' suggestion(s). Use the up and down arrows, then Enter.', pvItems.length + ' gợi ý. Dùng phím mũi tên lên xuống, rồi Enter.');
  }
  function pvClearError() {
    if (pvInput.getAttribute('aria-invalid') === 'true') {
      pvInput.removeAttribute('aria-invalid');
      var m = d.getElementById('err-f-province'); if (m) m.remove();
      var db = (pvInput.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== 'err-f-province'; }).join(' ');
      pvInput.setAttribute('aria-describedby', db || 'province-hint');
    }
  }
  function pvChoose(it) {
    if (!it) return;
    pvInput.value = it.p.name;
    pvValue.value = it.p.name;
    pvSetNote(it.former, it.p.name);
    pvClearError();
    pvClose();
  }
  /* Rời ô: nếu chữ gõ trùng đúng một tên/viết tắt (không tính tên cũ) thì tự chọn; nếu không thì để trống giá trị. */
  function pvCommitTyped() {
    if (pvValue.value && pvInput.value === pvValue.value) return;
    var r = searchProvinces(pvInput.value).filter(function (x) { return x.score === 0; });
    if (r.length === 1) pvChoose(r[0]);
    else { pvValue.value = ''; pvSetNote('', ''); }
  }
  if (pvInput && pvValue && pvList) {
    pvPlaceholder();
    pvInput.addEventListener('input', function () {
      pvValue.value = '';
      pvSetNote('', '');
      pvRender();
    });
    pvInput.addEventListener('focus', function () { if (!pvValue.value) pvRender(); });
    pvInput.addEventListener('click', function () { if (pvList.hidden) pvRender(); });
    pvInput.addEventListener('keydown', function (e) {
      var open = !pvList.hidden;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) pvRender(); pvSetActive(pvActive + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (!open) pvRender(); pvSetActive(pvActive - 1); }
      else if (e.key === 'Enter') {
        if (open && pvActive >= 0 && pvItems[pvActive]) { e.preventDefault(); pvChoose(pvItems[pvActive]); }
        else if (open) { e.preventDefault(); pvCommitTyped(); pvClose(); }
      }
      else if (e.key === 'Escape') { if (open) { e.preventDefault(); pvClose(); } }
      else if (e.key === 'Tab') { if (open && pvActive >= 0 && pvItems[pvActive] && fold(pvInput.value)) pvChoose(pvItems[pvActive]); }
    });
    pvInput.addEventListener('blur', function () {
      setTimeout(function () {
        if (d.activeElement === pvInput) return;
        pvCommitTyped(); pvClose();
      }, 150);
    });
    /* Chuột và cảm ứng: giữ con trỏ trong ô khi bấm vào danh sách. */
    pvList.addEventListener('mousedown', function (e) { e.preventDefault(); });
    pvList.addEventListener('click', function (e) {
      var li = e.target.closest && e.target.closest('[role="option"]');
      if (!li) return;
      pvChoose(pvItems[+li.dataset.index]);
      try { pvInput.focus({ preventScroll: true }); } catch (er) {}
    });
    d.addEventListener('click', function (e) {
      if (!pvList.hidden && !(e.target.closest && e.target.closest('#province-field'))) { pvCommitTyped(); pvClose(); }
    });
    document.addEventListener('anduor-lang', function () {
      pvPlaceholder();
      if (!pvList.hidden) pvRender();
    });
    if (form) form.addEventListener('reset', function () { setTimeout(function () { pvValue.value = ''; pvInput.value = ''; pvSetNote('', ''); pvClose(); }, 0); });
  }

  /* --- Kiểm tra dữ liệu: lỗi hiển thị song ngữ ngay dưới từng ô, tóm tắt ở đầu form --- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  function clearErrors() {
    if (!form) return;
    form.querySelectorAll('.field-err').forEach(function (n) { n.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (n) {
      n.removeAttribute('aria-invalid');
      var db = (n.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x.indexOf('err-') !== 0; }).join(' ');
      if (db) n.setAttribute('aria-describedby', db); else n.removeAttribute('aria-describedby');
    });
    form.querySelectorAll('.is-invalid').forEach(function (n) { n.classList.remove('is-invalid'); });
    if (formErrors) { formErrors.hidden = true; formErrors.replaceChildren(); }
  }

  function validate() {
    var errs = [];
    var g = function (n) { return form.querySelector('[name="' + n + '"]'); };
    var name = g('name'), phone = g('phone'), email = g('email'), consent = g('consent');
    var pv = phone ? phone.value.trim() : '', ev = email ? email.value.trim() : '';
    if (name && !name.value.trim()) errs.push({ el: name, en: 'Please enter your full name.', vi: 'Vui lòng nhập họ tên.' });
    if (!pv && !ev) {
      errs.push({ el: phone, en: 'Please enter a Zalo/telephone number or an email so we can reply.', vi: 'Vui lòng nhập số Zalo/điện thoại hoặc email để chúng tôi liên hệ lại.' });
    } else {
      if (pv && digits(pv).length < 9) errs.push({ el: phone, en: 'The telephone number looks incomplete (at least 9 digits).', vi: 'Số điện thoại chưa đủ (ít nhất 9 chữ số).' });
      if (ev && !EMAIL_RE.test(ev)) errs.push({ el: email, en: 'The email address is not valid.', vi: 'Email chưa đúng định dạng.' });
    }
    if (pvInput && pvValue) {
      if (!pvValue.value && pvInput.value.trim()) pvCommitTyped();
      if (!pvValue.value || !findProvince(pvValue.value)) {
        if (!pvInput.value.trim()) errs.push({ el: pvInput, en: 'Please choose your province or city.', vi: 'Vui lòng chọn tỉnh/thành phố.' });
        else errs.push({ el: pvInput, en: 'Please choose a province or city from the suggestion list.', vi: 'Vui lòng chọn tỉnh/thành phố trong danh sách gợi ý.' });
      }
    }
    if (billFiles.length > MAX_BILLS) errs.push({ el: billsInput, en: 'Please attach 5 files at most.', vi: 'Vui lòng đính kèm tối đa 5 tệp.' });
    if (consent && !consent.checked) errs.push({ el: consent, en: 'Please give consent to the processing of personal data before sending.', vi: 'Vui lòng đồng ý xử lý dữ liệu cá nhân trước khi gửi.' });
    return errs;
  }

  function showErrors(errs) {
    errs.forEach(function (er, i) {
      var el = er.el; if (!el) return;
      var id = 'err-' + (el.id || el.name || i);
      el.setAttribute('aria-invalid', 'true');
      var db = el.getAttribute('aria-describedby');
      el.setAttribute('aria-describedby', (db ? db + ' ' : '') + id);
      var msg = d.getElementById(id);
      if (!msg) {
        msg = d.createElement('p'); msg.className = 'field-err'; msg.id = id;
        var host = el.type === 'checkbox' ? el.closest('.checkrow') : el.closest('.field');
        if (el.type === 'checkbox' && host) host.classList.add('is-invalid');
        if (host) host.insertAdjacentElement(el.type === 'checkbox' ? 'afterend' : 'beforeend', msg);
      }
      msg.appendChild(biSpan(er.en, er.vi));
      if (msg.childNodes.length > 2) msg.insertBefore(d.createTextNode(' '), msg.childNodes[msg.childNodes.length - 2]);
    });
    if (formErrors) {
      var p = d.createElement('p');
      p.appendChild(biSpan(errs.length === 1 ? '1 item needs attention:' : errs.length + ' items need attention:',
        'Còn ' + errs.length + ' mục cần bổ sung:'));
      var ul = d.createElement('ul');
      errs.forEach(function (er) {
        var li = d.createElement('li');
        var a = d.createElement('a');
        a.href = '#' + (er.el && er.el.id ? er.el.id : 'contact-form');
        a.appendChild(biSpan(er.en, er.vi));
        a.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); focusField(er.el); });
        li.appendChild(a); ul.appendChild(li);
      });
      formErrors.replaceChildren(p, ul);
      formErrors.hidden = false;
    }
    focusField(errs[0].el);
  }

  /* Cuộn trong chính khung (iframe) tới ô lỗi đầu tiên, rồi đặt con trỏ vào đó. */
  function focusField(el) {
    if (!el) return;
    var target = el.type === 'checkbox' ? (el.closest('.checkrow') || el) : (el.closest('.field') || el);
    try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    catch (e) { try { target.scrollIntoView(); } catch (e2) {} }
    setTimeout(function () { try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} } }, 30);
  }

  if (form) {
    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.getAttribute && el.getAttribute('aria-invalid') === 'true') {
        el.removeAttribute('aria-invalid');
        var host = el.type === 'checkbox' ? el.closest('.checkrow') : el.closest('.field');
        if (host) host.classList.remove('is-invalid');
        var m = d.getElementById('err-' + (el.id || el.name));
        if (m) m.remove();
      }
    });
    form.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'consent' && e.target.checked) {
        var r = e.target.closest('.checkrow'); if (r) r.classList.remove('is-invalid');
        e.target.removeAttribute('aria-invalid');
        var m = d.getElementById('err-' + (e.target.id || 'consent')); if (m) m.remove();
      }
    });
  }

  function readAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result || ''); resolve(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { reject(new Error('file_read')); };
      r.readAsDataURL(file);
    });
  }

  /* Thời gian chờ tối đa (ms). Hết giờ thì báo lỗi và mở lại nút, không bao giờ treo. */
  var TIMEOUTS = { ping: 20000, chunk: 60000, submit: 30000 };
  try { if (window.__ANDUOR_TIMEOUTS) { for (var tk in window.__ANDUOR_TIMEOUTS) TIMEOUTS[tk] = window.__ANDUOR_TIMEOUTS[tk]; } } catch (e) {}
  /* Mỗi lần gọi gửi tối đa 2 MB chuỗi base64 (bội số của 4), tránh giới hạn kích thước của google.script.run. */
  var CHUNK_CHARS = 2 * 1024 * 1024;

  function gasCall(fn, arg, ms) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return; settled = true;
        var er = new Error('timeout'); er.code = 'timeout'; reject(er);
      }, ms || 30000);
      function done(fnc, v) { if (settled) return; settled = true; clearTimeout(timer); fnc(v); }
      try {
        google.script.run
          .withSuccessHandler(function (v) { done(resolve, v); })
          .withFailureHandler(function (err) {
            var msg = (err && (err.message || err.toString && err.toString())) || String(err);
            done(reject, new Error(String(msg)));
          })[fn](arg);
      } catch (e) { done(reject, e instanceof Error ? e : new Error(String(e))); }
    });
  }
  function serverResult(r, what) {
    if (r && r.ok) return r;
    var e = new Error((r && r.error) || (what + '_no_result'));
    if (r && r.detail) e.detail = r.detail;
    throw e;
  }
  function uploadOne(file, onChunk) {
    return readAsBase64(file).then(function (b64) {
      var total = Math.max(1, Math.ceil(b64.length / CHUNK_CHARS));
      var uploadId = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      var i = 0;
      function next() {
        var part = b64.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
        if (onChunk) onChunk(i, total);
        return gasCall('uploadChunk', { uploadId: uploadId, index: i, total: total, name: file.name, type: file.type || '', size: file.size, data: part }, TIMEOUTS.chunk)
          .then(function (r) {
            serverResult(r, 'upload');
            i++;
            if (i < total) return next();
            if (!r.id) throw new Error('upload_no_id');
            return r.id;
          });
      }
      return next();
    });
  }
  function fieldsPayload() {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled || el.type === 'file' || el.tagName === 'BUTTON') return;
      if (el.type === 'checkbox') o[el.name] = !!el.checked;
      else o[el.name] = String(el.value || '');
    });
    o.lang = lang();
    return o;
  }
  function mailLink() {
    var a = d.createElement('a');
    a.className = 'btn btn-s mt8';
    a.href = 'mailto:' + (CONFIG.email || 'info@anduor.com') + '?subject=' + encodeURIComponent(T('ANDUOR enquiry', 'Liên hệ ANDUOR'));
    a.target = '_top';
    a.appendChild(biSpan('Email info@anduor.com', 'Gửi email tới info@anduor.com'));
    return a;
  }
  function explain(err) {
    var code = String((err && err.message) || err || '');
    var detail = String((err && err.detail) || '');
    var all = code + ' ' + detail;
    if (/authoriz|permission|quyền|access denied|không có quyền/i.test(all)) {
      return ['the server has not been authorised yet (the site administrator needs to run authorize in Apps Script and deploy a new version)',
        'máy chủ chưa được cấp quyền (người quản trị cần chạy hàm authorize trong Apps Script rồi triển khai Phiên bản mới)'];
    }
    var MAP = {
      timeout: ['the server did not answer in time', 'máy chủ không phản hồi kịp'],
      file_read: ['a file could not be read on this device', 'không đọc được tệp trên máy này'],
      file_type: ['a file type is not accepted', 'có tệp sai định dạng'], file_size: ['a file is over 10 MB', 'có tệp vượt 10 MB'],
      too_many_files: ['5 files at most', 'tối đa 5 tệp'], name_required: ['full name missing', 'thiếu họ tên'],
      contact_required: ['telephone or email missing', 'thiếu điện thoại hoặc email'], phone_invalid: ['telephone number incomplete', 'số điện thoại chưa đủ'],
      email_invalid: ['email not valid', 'email chưa đúng'], province_invalid: ['province or city not in the list', 'tỉnh/thành phố không có trong danh sách'], consent_required: ['consent missing', 'chưa đồng ý xử lý dữ liệu'],
      rate_limited: ['too many submissions in a short time, please wait a few minutes', 'gửi quá nhiều lần trong thời gian ngắn, vui lòng chờ vài phút'],
      origin_denied: ['this site address is not yet allowed by the server', 'địa chỉ trang này chưa được máy chủ cho phép'],
      too_large: ['the data sent is too large', 'dữ liệu gửi đi quá lớn'],
      network: ['could not reach the server', 'không kết nối được máy chủ'],
      bad_response: ['the server answered in an unexpected format', 'máy chủ trả lời không đúng định dạng'],
      server: ['server error' + (detail ? ': ' + detail.slice(0, 120) : ''), 'lỗi máy chủ' + (detail ? ': ' + detail.slice(0, 120) : '')]
    };
    if (MAP[code]) return MAP[code];
    var raw = (code + (detail ? ': ' + detail : '')).slice(0, 160);
    return [raw, raw];
  }

  function sendViaGas(submitBtn) {
    var data = fieldsPayload();
    var files = billFiles.slice();
    var done = 0;
    var finished = false;
    if (submitBtn) submitBtn.disabled = true;
    form.setAttribute('aria-busy', 'true');
    setStatus('');
    function progress(en, vi) { if (!finished) formNote.textContent = T(en, vi); }
    progress('Sending…', 'Đang gửi…');
    function finish() {
      finished = true;
      if (submitBtn) submitBtn.disabled = false;
      form.removeAttribute('aria-busy');
    }
    var chain;
    try {
      chain = gasCall('ping', null, TIMEOUTS.ping).then(function (r) { return serverResult(r, 'ping'); }).then(function () { return []; });
      files.forEach(function (f) {
        chain = chain.then(function (ids) {
          return uploadOne(f, function (i, total) {
            progress('Sending file ' + (done + 1) + ' of ' + files.length + (total > 1 ? ' (part ' + (i + 1) + '/' + total + ')' : '') + '…',
              'Đang gửi tệp ' + (done + 1) + '/' + files.length + (total > 1 ? ' (phần ' + (i + 1) + '/' + total + ')' : '') + '…');
          }).then(function (id) { done++; ids.push(id); return ids; });
        });
      });
    } catch (e) { chain = Promise.reject(e); }
    chain.then(function (ids) {
      progress('Saving the request…', 'Đang lưu yêu cầu…');
      data.fileIds = ids;
      return gasCall('submitRequest', data, TIMEOUTS.submit);
    }).then(function (r) {
      serverResult(r, 'submit');
      finish();
      var ref = d.createElement('p');
      ref.className = 'mt8';
      ref.appendChild(biSpan('Reference code: ', 'Mã tham chiếu: '));
      var code = d.createElement('span'); code.className = 'ref'; code.textContent = r.ref; ref.appendChild(code);
      setStatus('ok',
        'Your request has been received' + (files.length ? ', with ' + files.length + ' file(s)' : '') + '. We will reply by the telephone number or email you gave.',
        'ANDUOR đã nhận yêu cầu' + (files.length ? ', kèm ' + files.length + ' tệp' : '') + '. Chúng tôi sẽ liên hệ lại qua số điện thoại hoặc email quý khách để lại.', ref);
      form.reset();
      billFiles = [];
      renderBills();
      try { formNote.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }).catch(function (err) {
      finish();
      var m = explain(err);
      setStatus('err',
        'The request could not be sent (' + m[0] + '). Please try again, or email the bills to info@anduor.com.',
        'Chưa gửi được yêu cầu (' + m[1] + '). Quý khách vui lòng thử lại, hoặc gửi hóa đơn qua email tới info@anduor.com.', mailLink());
      try { formNote.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var L = lang();
      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn && submitBtn.disabled) return;
      clearErrors();
      setStatus('');
      var errs = validate();
      if (errs.length) { showErrors(errs); return; }
      if (hasGas()) { sendViaGas(submitBtn); return; }
      var email = CONFIG.email || 'info@anduor.com';
      var endpoint = readyEndpoint(form.getAttribute('data-endpoint'));
      var names = billFiles.map(function (f) { return f.name + ' (' + formatSize(f.size) + ')'; });

      function mailtoFallback(prefix) {
        var fd = new FormData(form);
        var body = [];
        if (prefix) body.push(prefix, '');
        fd.forEach(function (v, k) {
          if (k === 'consent' || k === 'bills' || k === 'website') return;
          body.push(k + ': ' + v);
        });
        if (names.length) {
          body.push('');
          body.push(L === 'en'
            ? 'Selected bill files (please attach them to this email):'
            : 'Tệp hóa đơn đã chọn (xin đính kèm vào email này):');
          names.forEach(function (n) { body.push('- ' + n); });
        } else {
          body.push('');
          body.push(L === 'en'
            ? 'No bill file was selected in the form. Please attach the bills to this email.'
            : 'Chưa chọn tệp hóa đơn trên biểu mẫu. Xin đính kèm hóa đơn vào email này.');
        }
        setStatus('ok', 'Your email app has opened with the details filled in. Please attach the bills and send it to ' + email + '.',
          'Ứng dụng email đã mở với thông tin quý khách vừa nhập. Quý khách đính kèm hóa đơn rồi gửi tới ' + email + '.');
        location.href = 'mailto:' + email
          + '?subject=' + encodeURIComponent(L === 'en' ? 'ANDUOR enquiry' : 'Liên hệ ANDUOR')
          + '&body=' + encodeURIComponent(body.join('\n'));
      }

      if (!endpoint) {
        mailtoFallback('');
        return;
      }

      var payload = new FormData();
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.disabled) return;
        if (el.type === 'file' || el.name === 'bills') return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) payload.append(el.name, el.value || 'on');
        } else if (el.tagName !== 'BUTTON') {
          payload.append(el.name, el.value);
        }
      });
      billFiles.forEach(function (f) { payload.append('bills', f, f.name); });

      formNote.textContent = L === 'en' ? 'Sending…' : 'Đang gửi…';
      if (submitBtn) submitBtn.disabled = true;
      fetch(endpoint, { method: 'POST', body: payload, credentials: 'omit' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          setStatus('ok', 'The message and bills have been sent.', 'Đã gửi lời nhắn và hóa đơn.');
          form.reset();
          billFiles = [];
          renderBills();
        })
        .catch(function () {
          mailtoFallback(L === 'en'
            ? 'The intake address could not receive the files. Please email the bills to ' + email + '.'
            : 'Địa chỉ tiếp nhận chưa nhận được tệp. Xin gửi hóa đơn tới ' + email + '.');
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
