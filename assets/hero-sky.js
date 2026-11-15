/* v3.18 — Bầu trời làm nền cho phần đầu trang (“Hai nguồn sáng, một năng lượng.”), là mặc định.
   ?hero=card (GitHub Pages) hoặc ANDUOR_CFG.heroCard (Apps Script) hiện lại thẻ cũ để so sánh.
   v3.18:
   - Mặt Trời không còn chạy vòng quanh Mặt Trăng đứng một mình. Mặt Trời mọc từ chân trời, đi chậm theo một cung,
     rồi ghé vào lòng vầng trăng khuyết và đứng yên ở đó, thành dấu hiệu ANDUOR (đĩa cam + trăng khuyết, đúng hình logo).
   - Bỏ dải mái vàng và hàng tấm pin ở mép dưới.
   - Sao băng: hiếm (vài giây mới có một vệt), mảnh, chạy rồi tắt.
   - Nhịp đập: quầng sáng quanh Mặt Trời và Mặt Trăng “thở” chậm, chu kỳ 5 s (CSS).
   - Điện thoại (≤ 600 px): ít sao hơn, ít sao lấp lánh, quầng nhỏ hơn, sao băng thưa hơn.
   - Nhẹ: requestAnimationFrame chỉ chạy lúc Mặt Trời đang đi; sau khi ghép thì dừng hẳn. Tạm dừng khi phần đầu trang
     ra khỏi màn hình hoặc thẻ bị ẩn.
   - prefers-reduced-motion: hiện ngay hình đã ghép, không sao băng, không lấp lánh, không thở.
   Chỉ dùng màu thương hiệu: #24143A, #E94E1B, #F4B223, #F5F3F9 (và #2C1A49, #362362 pha từ tím đêm). */
(function () {
  'use strict';
  var hero = document.querySelector('.hero-full');
  if (!hero) return;
  var off = false;
  try { off = new URLSearchParams(location.search).get('hero') === 'card'; } catch (e) {}
  if (!off && window.ANDUOR_CFG && window.ANDUOR_CFG.heroCard) off = true;
  if (off) { document.body.classList.remove('hero-bg'); return; }
  document.body.classList.add('hero-bg');
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, a, p) { var n = document.createElementNS(NS, tag); for (var k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Tuổi trăng thật vẫn ghi vào thuộc tính (cho bộ thử / tham khảo); hình vẽ dùng vầng trăng khuyết của logo. */
  var SYN = 29.530588853;
  var age = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % SYN + SYN) % SYN;
  hero.setAttribute('data-moon-age', age.toFixed(2));

  var box = document.createElement('div');
  box.className = 'hero-sky'; box.setAttribute('aria-hidden', 'true');
  hero.insertBefore(box, hero.firstChild);
  var svg = el('svg', { 'class': 'hero-sky-svg', focusable: 'false' }, box);

  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  /* Logo (anduor-mark.svg): Mặt Trời tâm (46,60) r 24; trăng khuyết = cung r 38 tâm (54,60) trừ cung r 35 tâm (46,60).
     Ở đây đặt gốc tọa độ tại tâm Mặt Trời: trăng khuyết là đường dưới, nhân tỉ lệ s = rMặtTrời / 24. */
  var CRESCENT = 'M-9.69 -33.63A38 38 0 1 1 -9.69 33.63A35 35 0 1 0 -9.69 -33.63Z';

  var R = {}, W = 0, H = 0, small = false, mobile = false, G = null;
  var DUR = 22000;            /* thời gian Mặt Trời đi hết cung (ms): chậm, êm */
  var p = reduce ? 1 : 0;     /* tiến độ 0 → 1 */
  var docked = reduce;

  function bez(t) { /* Bézier bậc hai qua P0 → C → P1 */
    var a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    return [a * G.p0[0] + b * G.c[0] + c * G.p1[0], a * G.p0[1] + b * G.c[1] + c * G.p1[1]];
  }
  function ease(t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); } /* vào chậm, ra chậm */

  /* Khoảng trống bên phải dòng cuối của tiêu đề h1 (tọa độ trong phần đầu trang). Dấu hiệu rộng 70 s (từ mép trái
     Mặt Trời −24 s đến mép phải trăng khuyết +46 s), cao 76 s. Trả về null nếu không đủ chỗ. */
  function freeSpot(hr) {
    var h1 = hero.querySelector('.hero-text h1');
    if (!h1) return null;
    var rg = document.createRange(); rg.selectNodeContents(h1);
    var rs = Array.prototype.filter.call(rg.getClientRects(), function (q) { return q.width > 2 && q.height > 2; });
    if (!rs.length) return null;
    var bottom = Math.max.apply(null, rs.map(function (q) { return q.bottom; }));
    var line = rs.filter(function (q) { return q.bottom > bottom - 4; });
    var right = Math.max.apply(null, line.map(function (q) { return q.right; })) - hr.left;
    var top = Math.min.apply(null, line.map(function (q) { return q.top; })) - hr.top;
    /* Theo chiều dọc: từ đỉnh dòng cuối của tiêu đề đến đỉnh dòng chữ kế tiếp (không chạm dòng trên). */
    var next = h1.nextElementSibling, nextTop = next ? next.getBoundingClientRect().top - hr.top : top + (bottom - hr.top - top) * 1.6;
    var vroom = nextTop - top - 6;
    var room = W - right - 16 - 14; /* cách chữ 16 px, cách mép 14 px */
    var sc = Math.min(vroom / 76, 0.9, room / 70);
    if (sc < 0.5) return null;
    var x = right + 16 + 24 * sc + Math.max(0, (room - 70 * sc) * 0.5);
    return { s: sc, x: x, y: top + 2 + 38 * sc };
  }

  function textBoxes(hr) {
    var out = [];
    Array.prototype.forEach.call(hero.querySelectorAll('.hero-text h1, .hero-text p'), function (e) {
      var rg = document.createRange(); rg.selectNodeContents(e);
      Array.prototype.forEach.call(rg.getClientRects(), function (q) {
        if (q.width > 2 && q.height > 2) out.push([q.left - hr.left - 4, q.top - hr.top - 4, q.right - hr.left + 4, q.bottom - hr.top + 4]);
      });
    });
    return out;
  }

  function build() {
    var r = hero.getBoundingClientRect();
    W = Math.max(320, Math.round(r.width)); H = Math.max(360, Math.round(r.height));
    mobile = W < 760; small = W <= 600;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.replaceChildren();
    var defs = el('defs', {}, svg);
    var sky = el('linearGradient', { id: 'hs-sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#24143A' }, sky);
    el('stop', { offset: 0.7, 'stop-color': '#2C1A49' }, sky);
    el('stop', { offset: 1, 'stop-color': '#362362' }, sky);
    var glow = el('radialGradient', { id: 'hs-glow' }, defs);
    el('stop', { offset: 0, 'stop-color': '#E94E1B', 'stop-opacity': small ? 0.42 : 0.5 }, glow);
    el('stop', { offset: 0.45, 'stop-color': '#F4B223', 'stop-opacity': small ? 0.12 : 0.16 }, glow);
    el('stop', { offset: 1, 'stop-color': '#F4B223', 'stop-opacity': 0 }, glow);
    var mglow = el('radialGradient', { id: 'hs-mglow' }, defs);
    el('stop', { offset: 0, 'stop-color': '#F5F3F9', 'stop-opacity': small ? 0.16 : 0.22 }, mglow);
    el('stop', { offset: 1, 'stop-color': '#F5F3F9', 'stop-opacity': 0 }, mglow);
    var trail = el('linearGradient', { id: 'hs-trail', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': '#F5F3F9', 'stop-opacity': 0 }, trail);
    el('stop', { offset: 1, 'stop-color': '#F5F3F9', 'stop-opacity': 0.9 }, trail);

    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#hs-sky)' }, svg);

    /* Vị trí dấu hiệu (Mặt Trăng + chỗ Mặt Trời ghé vào) */
    var sr = mobile ? (small ? 16 : 20) : clamp(W * 0.034, 30, 48), s = sr / 24;
    var mx, my;
    if (mobile) {
      /* Điện thoại: đặt dấu hiệu vào khoảng trống bên phải dòng cuối của tiêu đề, để không nằm dưới chữ hay nút Góp ý. */
      var spot = freeSpot(r);
      if (spot) { s = spot.s; sr = 24 * s; mx = spot.x; my = spot.y; }
      else { mx = W - 46 * s - 22; my = 30 + 38 * s; }
    }
    else { mx = W * 0.78; my = clamp(H * 0.40, 38 * s + 40, H - 38 * s - 60); }
    G = { sr: sr, s: s, p1: [mx, my] };
    /* Điện thoại: lớp che sau chữ có một “cửa sổ” tròn đúng chỗ dấu hiệu, để Mặt Trời và Mặt Trăng sáng rõ khi đã ghép. */
    box.style.setProperty('--lx', (mx + 8 * s).toFixed(1) + 'px');
    box.style.setProperty('--ly', my.toFixed(1) + 'px');
    box.style.setProperty('--lr0', (34 * s).toFixed(1) + 'px');
    box.style.setProperty('--lr1', (50 * s).toFixed(1) + 'px');
    if (mobile) { G.p0 = [-sr * 1.5, H * 0.62]; G.c = [W * 0.34, -H * 0.06]; }
    else { G.p0 = [W * 0.48, H + sr * 1.5]; G.c = [W * 0.56, H * 0.02]; }

    /* Sao: ít hơn trên màn hẹp */
    var rand = rng(20261115), n = Math.round(W * H / (small ? 10000 : 7000)), gS = el('g', { 'class': 'hs-stars' }, svg);
    /* Không đặt sao ngay dưới dòng chữ: chữ luôn đứng trên nền tối đều. */
    var keep = textBoxes(r);
    for (var i = 0; i < n; i++) {
      var sx = rand() * W, sy = rand() * H * 0.92, rr = (small ? 0.45 : 0.5) + rand() * (small ? 0.8 : 1.1), so = 0.28 + rand() * 0.5;
      var twr = rand(), twd = rand(), twu = rand();
      if (keep.some(function (b) { return sx > b[0] && sx < b[2] && sy > b[1] && sy < b[3]; })) continue;
      var c = el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: rr.toFixed(2), fill: '#F5F3F9', opacity: so.toFixed(2) }, gS);
      if (twr < (small ? 0.2 : 0.3)) { c.setAttribute('class', 'tw'); c.style.animationDelay = (-twd * 6).toFixed(2) + 's'; c.style.animationDuration = (4 + twu * 4).toFixed(2) + 's'; }
    }
    R.shoot = el('g', { 'class': 'hs-shoot' }, svg);

    /* Đường đi chấm chấm của Mặt Trời (mờ dần khi đã ghép) */
    R.path = el('path', {
      'class': 'hs-path',
      d: 'M' + G.p0[0].toFixed(1) + ' ' + G.p0[1].toFixed(1) + ' Q' + G.c[0].toFixed(1) + ' ' + G.c[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1),
      fill: 'none', stroke: '#F4B223', 'stroke-opacity': small ? 0.22 : 0.32, 'stroke-width': 1.25, 'stroke-dasharray': '2 8', 'stroke-linecap': 'round'
    }, svg);

    /* Mặt Trăng: vầng trăng khuyết đúng hình logo, đứng yên */
    var gM = el('g', { 'class': 'hs-moon', transform: 'translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')' }, svg);
    R.moonGlow = el('circle', { 'class': 'hs-breathe hs-mg', cx: 8 * s, r: 38 * s * (small ? 1.7 : 2.1), fill: 'url(#hs-mglow)' }, gM);
    el('path', { d: CRESCENT, transform: 'scale(' + s.toFixed(4) + ')', fill: '#F5F3F9' }, gM);
    /* Mặt Trời */
    R.sun = el('g', { 'class': 'hs-sun' }, svg);
    R.sunGlow = el('circle', { 'class': 'hs-breathe hs-sg', r: sr * (small ? 2.4 : 3.2), fill: 'url(#hs-glow)' }, R.sun);
    el('circle', { r: sr, fill: '#E94E1B' }, R.sun);
    draw(p);
  }

  function draw(q) {
    p = clamp(q, 0, 1);
    if (!G || !R.sun) return;
    var xy = bez(ease(p));
    R.sun.setAttribute('transform', 'translate(' + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1) + ')');
    R.path.style.opacity = (1 - 0.7 * ease(p)).toFixed(3);
    box.classList.toggle('docked', p >= 1);
    hero.setAttribute('data-sun-progress', p.toFixed(3));
  }

  /* Hoạt ảnh: chỉ khi chưa ghép */
  var raf = 0, last = 0, visible = true;
  function frame(ts) {
    raf = 0;
    if (!last) last = ts;
    var dt = Math.min(100, ts - last); last = ts; /* bỏ qua khoảng thời gian thẻ bị ẩn */
    draw(p + dt / DUR);
    if (p >= 1) { docked = true; return; }
    if (visible && !document.hidden) raf = requestAnimationFrame(frame); else last = 0;
  }
  function start() { if (!reduce && !docked && !raf && hero.isConnected && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }

  /* Sao băng: hiếm, mảnh. Mỗi vệt là một phần tử SVG chạy bằng CSS rồi tự gỡ. */
  var shootT = 0;
  function shoot() {
    if (!R.shoot || !hero.isConnected) return;
    var L = small ? 46 + Math.random() * 30 : 70 + Math.random() * 50;
    var x = W * (0.2 + Math.random() * 0.78), y = H * (0.03 + Math.random() * 0.38);
    var a = 150 + Math.random() * 18; /* hướng xuống bên trái */
    var g = el('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + a.toFixed(1) + ')' }, R.shoot);
    var m = el('g', { 'class': 'hs-meteor' }, g);
    m.style.setProperty('--d', Math.round(small ? 120 + Math.random() * 60 : 180 + Math.random() * 120) + 'px');
    m.style.animationDuration = (1.5 + Math.random() * 0.6).toFixed(2) + 's';
    el('line', { x1: -L, y1: 0, x2: 0, y2: 0, stroke: 'url(#hs-trail)', 'stroke-width': small ? 0.9 : 1.2, 'stroke-linecap': 'round' }, m);
    el('circle', { r: small ? 0.9 : 1.2, fill: '#F5F3F9' }, m);
    m.addEventListener('animationend', function () { g.remove(); });
    setTimeout(function () { if (g.isConnected) g.remove(); }, 4000);
  }
  function scheduleShoot() {
    clearTimeout(shootT);
    if (reduce) return;
    var wait = small ? 9000 + Math.random() * 7000 : 5500 + Math.random() * 6000;
    shootT = setTimeout(function () {
      if (visible && !document.hidden) shoot();
      scheduleShoot();
    }, wait);
  }

  build();
  if (!reduce) { start(); scheduleShoot(); }
  function setVisible(v) { visible = v; box.classList.toggle('paused', !v || document.hidden); if (v) start(); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { setVisible(es[0].isIntersecting); }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { box.classList.toggle('paused', !visible || document.hidden); if (!document.hidden) start(); });
  var rt = 0, lastW = 0, lastH = 0;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (!hero.isConnected) return;
      var r = hero.getBoundingClientRect();
      if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 2) return;
      lastW = r.width; lastH = r.height; build();
    }, 120);
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero); else window.addEventListener('resize', onResize);
  /* Đổi ngôn ngữ hoặc phông tải xong làm dòng tiêu đề đổi độ dài: tính lại chỗ đặt dấu hiệu. */
  document.addEventListener('anduor-lang', function () { if (hero.isConnected) setTimeout(build, 30); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (hero.isConnected) build(); });
  /* Cho bộ thử và ảnh chụp: đặt tiến độ, ghép ngay, bắn một sao băng, đọc trạng thái. */
  window.__ANDUOR_HERO = {
    setProgress: function (q) { if (raf) { cancelAnimationFrame(raf); raf = 0; } docked = true; draw(q); },
    dock: function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } docked = true; draw(1); },
    shoot: shoot,
    state: function () { return { p: p, docked: p >= 1, reduce: reduce, small: small, sun: G && bez(ease(p)), dock: G && G.p1, sr: G && G.sr, stars: svg.querySelectorAll('.hs-stars circle').length, twinkle: svg.querySelectorAll('.hs-stars .tw').length, meteors: svg.querySelectorAll('.hs-meteor').length }; },
    moonAge: age, reduce: reduce
  };
})();
