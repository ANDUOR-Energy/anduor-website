/* v3.16 — BẢN XEM THỬ: bầu trời làm nền cho phần đầu trang (“Hai nguồn sáng, một năng lượng.”).
   Chỉ bật khi có ?hero=bg trên địa chỉ trang (GitHub Pages) hoặc ANDUOR_CFG.heroBg (Apps Script, doGet đọc ?hero=bg).
   Mặc định của trang KHÔNG đổi. Gồm: sao, Mặt Trăng đúng pha theo ngày (giờ Việt Nam), cung đường Mặt Trời,
   mái nhà có tấm pin ở dưới cùng. Chỉ dùng màu thương hiệu (đêm tím, cam mặt trời, vàng, ánh trăng).
   Tôn trọng prefers-reduced-motion: đứng yên, Mặt Trời đặt theo giờ thật. */
(function () {
  'use strict';
  var hero = document.querySelector('.hero-full');
  if (!hero) return;
  var on = false;
  try { on = new URLSearchParams(location.search).get('hero') === 'bg'; } catch (e) {}
  if (!on && window.ANDUOR_CFG && window.ANDUOR_CFG.heroBg) on = true;
  if (!on) return;
  document.body.classList.add('hero-bg');
  var NS = 'http://www.w3.org/2000/svg', RAD = Math.PI / 180;
  function el(tag, a, p) { var n = document.createElementNS(NS, tag); for (var k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Pha Mặt Trăng: tuổi trăng tính từ kỳ trăng mới 06/01/2000 18:14 UTC, chu kỳ 29,530588853 ngày. */
  var SYN = 29.530588853;
  function moonAge(ms) { var d = (ms - Date.UTC(2000, 0, 6, 18, 14)) / 86400000; return ((d % SYN) + SYN) % SYN; }
  var age = moonAge(Date.now());
  var illum = (1 - Math.cos(2 * Math.PI * age / SYN)) / 2, waxing = age < SYN / 2;
  hero.setAttribute('data-moon-age', age.toFixed(2));
  hero.setAttribute('data-moon-illum', illum.toFixed(3));

  var box = document.createElement('div');
  box.className = 'hero-sky'; box.setAttribute('aria-hidden', 'true');
  hero.insertBefore(box, hero.firstChild);
  var svg = el('svg', { 'class': 'hero-sky-svg', focusable: 'false' }, box);

  /* Hạt ngẫu nhiên cố định để sao không nhảy chỗ khi đổi cỡ. */
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function mix(a, b, f) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * f); }); }
  function rgb(c) { return 'rgb(' + c.join(',') + ')'; }
  var LOW = [238, 128, 39], HIGH = [246, 230, 200];

  var R = {}; /* tham chiếu các phần cần cập nhật khi chạy */
  var W = 0, H = 0, mobile = false, geo = null;
  function build() {
    var r = hero.getBoundingClientRect();
    W = Math.max(320, Math.round(r.width)); H = Math.max(360, Math.round(r.height));
    mobile = W < 760;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.replaceChildren();
    var defs = el('defs', {}, svg);
    var sky = el('linearGradient', { id: 'hs-sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#24143A' }, sky);
    el('stop', { offset: 0.7, 'stop-color': '#2C1A49' }, sky);
    el('stop', { offset: 1, 'stop-color': '#362362' }, sky);
    var glow = el('radialGradient', { id: 'hs-glow' }, defs);
    R.glowStop0 = el('stop', { offset: 0, 'stop-color': '#F4B223', 'stop-opacity': 0.55 }, glow);
    el('stop', { offset: 1, 'stop-color': '#F4B223', 'stop-opacity': 0 }, glow);
    var mglow = el('radialGradient', { id: 'hs-mglow' }, defs);
    el('stop', { offset: 0, 'stop-color': '#F5F3F9', 'stop-opacity': 0.28 }, mglow);
    el('stop', { offset: 1, 'stop-color': '#F5F3F9', 'stop-opacity': 0 }, mglow);
    var sheen = el('linearGradient', { id: 'hs-sheen', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    R.sh = [0, 1, 2, 3, 4].map(function (i) { return el('stop', { offset: i / 4, 'stop-color': '#F5F3F9', 'stop-opacity': 0 }, sheen); });

    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#hs-sky)' }, svg);
    var roofH = mobile ? 46 : 64, roofTop = H - roofH;
    /* Cung Mặt Trời: máy tính đặt ở nửa phải (chữ ở trái). */
    /* Điện thoại: cảnh trời nằm ở dải dưới cùng, dưới các nút; sao vẫn phủ cả nền sau chữ. */
    var x0 = mobile ? W * 0.07 : W * 0.46, x1 = mobile ? W * 0.93 : W * 0.97;
    var top = mobile ? roofTop - 132 : H * 0.14;
    geo = { cx: (x0 + x1) / 2, rx: (x1 - x0) / 2, base: roofTop - 4, ry: roofTop - 4 - top, roofTop: roofTop };
    /* Sao */
    var rand = rng(20261115), n = Math.round(W * roofTop / (mobile ? 5200 : 7000)), gS = el('g', { 'class': 'hs-stars' }, svg);
    for (var i = 0; i < n; i++) {
      var sx = rand() * W, sy = rand() * (roofTop - 30), sr = 0.5 + rand() * 1.1, so = 0.3 + rand() * 0.55;
      var c = el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: sr.toFixed(2), fill: '#F5F3F9', opacity: so.toFixed(2) }, gS);
      if (rand() < 0.35) { c.setAttribute('class', 'tw'); c.style.animationDelay = (-rand() * 6).toFixed(2) + 's'; c.style.animationDuration = (3 + rand() * 4).toFixed(2) + 's'; }
    }
    /* Đường đi chấm chấm của Mặt Trời */
    var d = 'M' + x0.toFixed(1) + ' ' + geo.base.toFixed(1) + ' A' + geo.rx.toFixed(1) + ' ' + geo.ry.toFixed(1) + ' 0 0 1 ' + x1.toFixed(1) + ' ' + geo.base.toFixed(1);
    el('path', { d: d, fill: 'none', stroke: '#F4B223', 'stroke-opacity': 0.42, 'stroke-width': 1.5, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round' }, svg);
    /* Mặt Trăng (đúng pha) */
    var mr = mobile ? 14 : 24, mx = mobile ? W - 46 : (x0 + (x1 - x0) * 0.78), my = mobile ? roofTop - 112 : H * 0.17;
    var gM = el('g', { 'class': 'hs-moon', transform: 'translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')' }, svg);
    R.moonGlow = el('circle', { r: mr * 3.2, fill: 'url(#hs-mglow)' }, gM);
    el('circle', { r: mr, fill: '#F5F3F9', 'fill-opacity': 0.10, stroke: '#F5F3F9', 'stroke-opacity': 0.22, 'stroke-width': 1 }, gM);
    var k = illum, rx = Math.abs(1 - 2 * k) * mr, sw = waxing ? 1 : 0, back = (k < 0.5) ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
    if (k > 0.005) el('path', { d: 'M0 ' + (-mr) + ' A' + mr + ' ' + mr + ' 0 0 ' + sw + ' 0 ' + mr + ' A' + rx.toFixed(2) + ' ' + mr + ' 0 0 ' + back + ' 0 ' + (-mr) + ' Z', fill: '#F5F3F9' }, gM);
    /* Mặt Trời */
    var sr2 = mobile ? 13 : 20;
    R.sun = el('g', { 'class': 'hs-sun' }, svg);
    R.sunGlow = el('circle', { r: sr2 * 3.4, fill: 'url(#hs-glow)' }, R.sun);
    R.sunDisc = el('circle', { r: sr2, fill: '#E94E1B' }, R.sun);
    /* Mái nhà và tấm pin (dải vàng như hình thương hiệu) */
    el('rect', { x: -24, y: roofTop, width: W + 48, height: roofH + 24, rx: 18, fill: '#F4B223' }, svg);
    var gP = el('g', {}, svg), pw = mobile ? 30 : 44, ph = mobile ? 14 : 20, gap = mobile ? 7 : 10, sk = mobile ? 6 : 9;
    var py = roofTop + (mobile ? 9 : 13), count = Math.floor((W - 24) / (pw + gap));
    var startX = (W - count * (pw + gap) + gap) / 2;
    R.panels = [];
    for (var j = 0; j < count; j++) {
      var px = startX + j * (pw + gap);
      var pd = 'M' + (px + sk).toFixed(1) + ' ' + py + ' L' + (px + pw + sk).toFixed(1) + ' ' + py + ' L' + (px + pw).toFixed(1) + ' ' + (py + ph) + ' L' + px.toFixed(1) + ' ' + (py + ph) + ' Z';
      el('path', { d: pd, fill: '#24143A' }, gP);
      R.panels.push(el('path', { d: pd, fill: 'url(#hs-sheen)', 'class': 'hs-pv-lit' }, gP));
    }
    R.sheenG = sheen;
    draw(R.u == null ? 0.3 : R.u);
  }

  /* u ∈ [0, 1]: vị trí Mặt Trời trên cung (0 = mọc phía Đông bên trái, 1 = lặn). Ngoài khoảng: dưới chân trời. */
  function draw(u) {
    R.u = u;
    if (!geo || !R.sun) return;
    var up = u >= 0 && u <= 1;
    var a = Math.PI * (1 - Math.max(0, Math.min(1, u)));
    var x = geo.cx + geo.rx * Math.cos(a), y = geo.base - geo.ry * Math.sin(a);
    var elev = Math.sin(a); /* 0 ở chân trời, 1 ở đỉnh cung */
    R.sun.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
    R.sun.style.opacity = up ? '1' : '0';
    var col = rgb(mix(LOW, HIGH, Math.pow(elev, 0.8)));
    R.glowStop0.setAttribute('stop-color', elev < 0.5 ? '#E94E1B' : '#F4B223');
    R.glowStop0.setAttribute('stop-opacity', (0.35 + 0.25 * elev).toFixed(2));
    /* Nắng trên tấm pin: mạnh khi Mặt Trời cao, vệt sáng trượt theo vị trí Mặt Trời. */
    var A = up ? 0.10 + 0.5 * elev : 0, p = Math.max(0.05, Math.min(0.95, u));
    var stops = [[0, 0], [Math.max(0, p - 0.25), A * 0.35], [p, A], [Math.min(1, p + 0.25), A * 0.35], [1, 0]];
    R.sh.forEach(function (s, i) { s.setAttribute('offset', stops[i][0].toFixed(3)); s.setAttribute('stop-color', col); s.setAttribute('stop-opacity', stops[i][1].toFixed(3)); });
    R.sheenG.setAttribute('gradientUnits', 'userSpaceOnUse');
    R.sheenG.setAttribute('x1', '0'); R.sheenG.setAttribute('x2', String(W));
    R.sheenG.setAttribute('y1', '0'); R.sheenG.setAttribute('y2', '0');
    R.moonGlow.style.opacity = up ? '0.55' : '1';
  }

  /* Giờ Việt Nam (UTC+7) → u: 6:00 mọc, 18:00 lặn (đủ cho hình minh họa). */
  function uNow() { var d = new Date(Date.now() + 7 * 3600000); var h = d.getUTCHours() + d.getUTCMinutes() / 60; return (h - 6) / 12; }

  build();
  var raf = 0, t0 = 0, visible = true, CYCLE = 32000; /* 26 s ngày + 6 s đêm */
  function frame(ts) {
    raf = 0;
    if (!t0) t0 = ts - 0.3 * 26000;
    var ph = ((ts - t0) % CYCLE) / 26000;
    draw(ph <= 1 ? ph : 1.5);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function start() { if (!reduce && !raf && hero.isConnected) raf = requestAnimationFrame(frame); }
  if (reduce) draw(uNow()); else start();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
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
  window.__ANDUOR_HERO = { draw: draw, moonAge: age, illum: illum, waxing: waxing, reduce: reduce };
})();
