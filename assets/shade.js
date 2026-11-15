/* Biểu đồ nắng và bóng — chuyển từ bản nháp cũ, mặc định TP.HCM (vùng Nam), không vẽ Bát quái.
   v3.16: ánh nắng trên tấm pin theo độ cao và hướng mặt trời (mô hình trời quang), chọn vùng Bắc / Trung / Nam. */
(function () {
  'use strict';
  if (!document.getElementById('sky') || !document.getElementById('roof')) return;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  /* Nhãn song ngữ trong hình SVG: cập nhật khi đổi ngôn ngữ. */
  var BI = [];
  function biText(node, vi, en) { BI.push([node, vi, en]); node.textContent = (document.documentElement.dataset.lang === 'en') ? en : vi; }
  function refreshBi() { var en = document.documentElement.dataset.lang === 'en'; BI.forEach(function (b) { b[0].textContent = en ? b[2] : b[1]; }); }
  function vnNum(x, d) { return x.toFixed(d).replace('.', ','); }

  /* ---------- Thiên văn: vị trí mặt trời ---------- */
  var RAD = Math.PI / 180;
  /* Ba vùng, mỗi vùng một điểm đại diện. Múi giờ UTC+7. lon chỉ dùng để đổi giờ đồng hồ sang giờ mặt trời
     (giờ mặc định của “Hôm nay”); hình học bóng đổ tính theo giờ mặt trời nên chỉ phụ thuộc vĩ độ. */
  var TZ = 7;
  var CITIES = {
    hn: { name: {vi:'Hà Nội', en:'Hanoi'}, region: {vi:'Bắc', en:'North'}, lat: 21.03, lon: 105.85 },
    dn: { name: {vi:'Đà Nẵng', en:'Da Nang'}, region: {vi:'Trung', en:'Central'}, lat: 16.05, lon: 108.20 },
    hcm: { name: {vi:'TP.HCM', en:'Ho Chi Minh City'}, region: {vi:'Nam', en:'South'}, lat: 10.78, lon: 106.70 }
  };
  var DAYS = { he: 23.44, xuan: 0, dong: -23.44 };
  /* Ngày trong năm tương ứng (dùng cho hệ số khoảng cách Trái Đất – Mặt Trời trong mô hình bức xạ). */
  var DAY_N = { he: 172, xuan: 80, dong: 355 };
  var DAY_NAMES = {
    today: {vi:'hôm nay', en:'today'},
    he: {vi:'hạ chí', en:'June solstice'},
    xuan: {vi:'xuân phân', en:'March equinox'},
    dong: {vi:'đông chí', en:'December solstice'}
  };
  function lang(){ return (document.documentElement.dataset.lang === 'en') ? 'en' : 'vi'; }
  function cityName(key){ return CITIES[key].name[lang()]; }
  function vnNow() { return new Date(Date.now() + 7 * 3600 * 1000); }
  function dayOfYearVN() {
    var d = vnNow();
    return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
  }
  function declOfDay(n) { return 23.44 * Math.sin(RAD * (360 / 365) * (284 + n)); }
  function sunPos(lat, decl, hour) {
    var phi = lat * RAD, d = decl * RAD, H = (hour - 12) * 15 * RAD;
    var sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
    var alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / RAD;
    var y = -Math.cos(d) * Math.sin(H);
    var x = Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.cos(H) * Math.sin(phi);
    var az = Math.atan2(y, x) / RAD;
    if (az < 0) az += 360;
    return { alt: alt, az: az };
  }
  /* ---------- Bức xạ trời quang (ước tính, đơn giản) ----------
     Mục đích: độ sáng của lớp nắng trên tấm pin theo đúng hình học, không phóng đại.
     - Khối khí AM theo Kasten & Young (1989): AM = 1 / (sin h + 0.50572 · (h + 6.07995)^-1.6364), h tính bằng độ.
     - Trực xạ pháp tuyến DNI theo Meinel (1976): DNI = I0 · 0.7^(AM^0.678), ngang mực nước biển, trời quang.
       I0 = 1353 W/m² · (1 + 0.033 · cos(2π·n/365)) (hệ số khoảng cách theo ngày n trong năm).
     - Tán xạ trên mặt phẳng: DHI ≈ 0,1 · DNI (tỉ lệ gần đúng cho trời quang).
     - Mặt phẳng tấm pin: trong hình, tấm nằm phẳng trên mái bằng (nghiêng 0°), nên
       cos(góc tới) = sin(độ cao) và nắng trên tấm G = DNI · sin h + DHI.
     Không tính mây, bụi, nhiệt độ hay độ cao địa hình; con số chỉ để minh họa, ghi “ước tính”. */
  function clearSky(alt, n) {
    if (alt <= 0) return { am: Infinity, dni: 0, dhi: 0, g: 0 };
    var am = 1 / (Math.sin(alt * RAD) + 0.50572 * Math.pow(alt + 6.07995, -1.6364));
    var i0 = 1353 * (1 + 0.033 * Math.cos(2 * Math.PI * n / 365));
    var dni = i0 * Math.pow(0.7, Math.pow(am, 0.678));
    var dhi = 0.1 * dni;
    return { am: am, dni: dni, dhi: dhi, g: dni * Math.sin(alt * RAD) + dhi };
  }
  /* Phương trình thời gian (phút), công thức gần đúng: dùng đổi giờ đồng hồ UTC+7 sang giờ mặt trời. */
  function eotMin(n) { var B = 2 * Math.PI * (n - 81) / 364; return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); }
  function solarFromClock(clockH, lon, n) { return clockH + (lon - 15 * TZ) / 15 + eotMin(n) / 60; }
  /* Màu nắng theo độ cao, chỉ pha từ bảng màu thương hiệu: thấp = cam vàng (trộn --sun và --gold),
     cao = vàng trắng ấm (--gold pha --moonlight). */
  var LOW = [236, 110, 36], HIGH = [250, 216, 128];
  function lightColor(alt) {
    var f = Math.max(0, Math.min(1, Math.sin(Math.max(0, alt) * RAD) / Math.sin(60 * RAD)));
    f = Math.pow(f, 0.8);
    var c = LOW.map(function (v, i) { return Math.round(v + (HIGH[i] - v) * f); });
    return 'rgb(' + c.join(',') + ')';
  }

  function dirName(az) {
    var names = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
    return names[Math.round(az / 45) % 8];
  }
  function dirNameEn(az) {
    var names = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    return names[Math.round(az / 45) % 8];
  }
  function fmtTime(h) {
    var m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  /* ---------- Bầu trời ---------- */
  var sky = document.getElementById('sky');
  var C = 220, R = 140;
  function skyXY(alt, az) {
    var r = R * (90 - alt) / 90;
    return [C + r * Math.sin(az * RAD), C - r * Math.cos(az * RAD)];
  }
  function trigram(parent, cx, cy, lines, w, cls) {
    var s = w / 30;
    var g = svgEl('g', { 'class': cls, transform: 'translate(' + (cx - w / 2).toFixed(2) + ' ' + (cy - 13 * s).toFixed(2) + ')' }, parent);
    lines.forEach(function (v, i) {
      var y = i * 10 * s;
      if (v) svgEl('rect', { x: 0, y: y, width: 30 * s, height: 6 * s }, g);
      else {
        svgEl('rect', { x: 0, y: y, width: 12 * s, height: 6 * s }, g);
        svgEl('rect', { x: 18 * s, y: y, width: 12 * s, height: 6 * s }, g);
      }
    });
    return g;
  }
  (function buildSky() {
    var g = svgEl('g', {}, sky);
    svgEl('circle', { cx: C, cy: C, r: R, 'class': 'sky-horizon' }, g);
    [30, 60].forEach(function (a) { svgEl('circle', { cx: C, cy: C, r: R * (90 - a) / 90, 'class': 'sky-ring' }, g); });
    [[60, R * 30 / 90], [30, R * 60 / 90]].forEach(function (p) {
      var t = svgEl('text', { x: C + 5, y: C - p[1] - 4, 'class': 'sky-ring-label' }, g);
      t.textContent = p[0] + '°';
    });
    for (var a = 0; a < 360; a += 15) {
      var major = a % 45 === 0, r1 = R + 3, r2 = R + (major ? 12 : 7);
      svgEl('line', {
        x1: C + r1 * Math.sin(a * RAD), y1: C - r1 * Math.cos(a * RAD),
        x2: C + r2 * Math.sin(a * RAD), y2: C - r2 * Math.cos(a * RAD),
        'class': major ? 'tick major' : 'tick'
      }, g);
    }
    [['Bắc', 0, 'N'], ['Đông', 90, 'E'], ['Nam', 180, 'S'], ['Tây', 270, 'W']].forEach(function (p) {
      var r = R - 16;
      var t = svgEl('text', { x: C + r * Math.sin(p[1] * RAD), y: C - r * Math.cos(p[1] * RAD) + 4, 'text-anchor': 'middle', 'class': 'sky-card' }, g);
      biText(t, p[0], p[2]);
    });
    /* Bát quái đã chuyển sang trang Triết lý, không vẽ trên biểu đồ. */
  })();
  var skyRefs = svgEl('g', {}, sky);
  var skySel = svgEl('g', {}, sky);
  var sunDot = svgEl('circle', { r: 10, 'class': 'sun-dot', cx: C, cy: C }, sky);

  function pathPoints(lat, decl) {
    var pts = [];
    for (var h = 4; h <= 20.0001; h += 0.05) {
      var p = sunPos(lat, decl, h);
      if (p.alt >= 0) pts.push(skyXY(p.alt, p.az));
    }
    return pts;
  }
  function toD(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  }
  function drawSky(lat, decl, pos) {
    skyRefs.replaceChildren();
    skySel.replaceChildren();
    [23.44, -23.44].forEach(function (d) { svgEl('path', { d: toD(pathPoints(lat, d)), 'class': 'path-ref' }, skyRefs); });
    svgEl('path', { d: toD(pathPoints(lat, decl)), 'class': 'path-sel' }, skySel);
    for (var h = 6; h <= 18; h++) {
      var p = sunPos(lat, decl, h);
      if (p.alt <= 0) continue;
      var xy = skyXY(p.alt, p.az);
      svgEl('circle', { cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: 2.5, 'class': 'hour-dot' }, skySel);
      if (h === 9 || h === 12 || h === 15) {
        var t = svgEl('text', { x: (xy[0] + 7).toFixed(1), y: (xy[1] + 14).toFixed(1), 'class': 'hour-label' }, skySel);
        t.textContent = h + 'h';
      }
    }
    if (pos.alt > 0) {
      var s = skyXY(pos.alt, pos.az);
      sunDot.setAttribute('cx', s[0].toFixed(1));
      sunDot.setAttribute('cy', s[1].toFixed(1));
      sunDot.style.display = '';
    } else {
      sunDot.style.display = 'none';
    }
  }

  /* ---------- Mái nhà và bóng đổ ---------- */
  var roof = document.getElementById('roof');
  var S = 16, OX = 28, OY = 44;
  var LG = {};
  var ROOF = { w: 24, h: 15 };
  function px(x, y) { return [OX + x * S, OY + y * S]; }
  function circlePoly(cx, cy, r, n) {
    var pts = [];
    for (var i = 0; i < n; i++) { var a = i / n * 2 * Math.PI; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  }
  // Tọa độ tính bằng mét: x về phía Đông, y về phía Nam, gốc ở góc Tây Bắc của mái
  var OBST = [
    { id: 'tum', name: 'Tum thang', h: 3.0, poly: [[9, 0.6], [12.5, 0.6], [12.5, 3.6], [9, 3.6]] },
    { id: 'bon', name: 'Bồn nước', h: 2.6, circle: { x: 15, y: 2.2, r: 0.7 } },
    { id: 'kim', name: 'Kim thu sét', h: 7.0, circle: { x: 10.75, y: 2.1, r: 0.08 } }
  ];
  OBST.forEach(function (o) { if (o.circle) o.poly = circlePoly(o.circle.x, o.circle.y, o.circle.r, 16); });
  function bbox(poly) {
    var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    poly.forEach(function (p) { b.x0 = Math.min(b.x0, p[0]); b.y0 = Math.min(b.y0, p[1]); b.x1 = Math.max(b.x1, p[0]); b.y1 = Math.max(b.y1, p[1]); });
    return b;
  }
  var PW = 1.134, PH = 2.278, GX = 0.04, GY = 0.5, SB = 0.6, CLR = 0.4, KWP = 0.58;
  var panels = [];
  for (var r = 0; ; r++) {
    var y0 = SB + r * (PH + GY);
    if (y0 + PH > ROOF.h - SB + 1e-9) break;
    for (var c = 0; ; c++) {
      var x0 = SB + c * (PW + GX);
      if (x0 + PW > ROOF.w - SB + 1e-9) break;
      var blocked = OBST.some(function (o) {
        var b = bbox(o.poly);
        return x0 < b.x1 + CLR && x0 + PW > b.x0 - CLR && y0 < b.y1 + CLR && y0 + PH > b.y0 - CLR;
      });
      if (!blocked) panels.push({ x0: x0, y0: y0, rect: [[x0, y0], [x0 + PW, y0], [x0 + PW, y0 + PH], [x0, y0 + PH]] });
    }
  }

  function hull(points) {
    var p = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lower = [], upper = [], i;
    for (i = 0; i < p.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p[i]) <= 0) lower.pop();
      lower.push(p[i]);
    }
    for (i = p.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p[i]) <= 0) upper.pop();
      upper.push(p[i]);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  function project(poly, ax) {
    var min = Infinity, max = -Infinity;
    for (var i = 0; i < poly.length; i++) {
      var v = poly[i][0] * ax[0] + poly[i][1] * ax[1];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return [min, max];
  }
  function intersects(A, B) {
    var polys = [A, B];
    for (var k = 0; k < 2; k++) {
      var poly = polys[k];
      for (var i = 0; i < poly.length; i++) {
        var p1 = poly[i], p2 = poly[(i + 1) % poly.length];
        var ax = [-(p2[1] - p1[1]), p2[0] - p1[0]];
        var a = project(A, ax), b = project(B, ax);
        if (a[1] <= b[0] + 1e-9 || b[1] <= a[0] + 1e-9) return false;
      }
    }
    return true;
  }
  // Bóng của vật cao h: dịch đáy theo hướng ngược mặt trời một đoạn h / tan(độ cao)
  function shadowPolys(alt, az) {
    if (alt <= 0.5) return null;
    var k = Math.min(1 / Math.tan(alt * RAD), 60);
    var dx = -Math.sin(az * RAD) * k, dy = Math.cos(az * RAD) * k;
    return OBST.map(function (o) {
      return hull(o.poly.concat(o.poly.map(function (p) { return [p[0] + dx * o.h, p[1] + dy * o.h]; })));
    });
  }
  function shadedIn(polys, idxs) {
    var set = new Set();
    if (!polys) return set;
    idxs.forEach(function (i) {
      if (polys.some(function (h) { return intersects(h, panels[i].rect); })) set.add(i);
    });
    return set;
  }
  function shadedHours(lat, decl, idxs, t0, t1) {
    var sum = 0;
    for (var t = t0 + 0.125; t < t1; t += 0.25) {
      var p = sunPos(lat, decl, t);
      sum += shadedIn(shadowPolys(p.alt, p.az), idxs).size * 0.25;
    }
    return sum;
  }
  var allIdx = panels.map(function (_, i) { return i; });
  var excludedCache = {};
  function excludedFor(cityKey) {
    if (excludedCache[cityKey]) return excludedCache[cityKey];
    var lat = CITIES[cityKey].lat, ex = new Set();
    [23.44, 0, -23.44].forEach(function (d) {
      for (var t = 9; t <= 15.0001; t += 0.25) {
        var p = sunPos(lat, d, t);
        shadedIn(shadowPolys(p.alt, p.az), allIdx).forEach(function (i) { ex.add(i); });
      }
    });
    excludedCache[cityKey] = ex;
    return ex;
  }

  (function buildRoof() {
    var defs = svgEl('defs', {}, roof);
    var pat = svgEl('pattern', { id: 'hatch', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svgEl('rect', { width: 5, height: 5, style: 'fill:var(--panel)' }, pat);
    svgEl('rect', { width: 2, height: 5, style: 'fill:var(--sun)' }, pat);
    var clip = svgEl('clipPath', { id: 'roof-clip' }, defs);
    svgEl('rect', { x: OX, y: OY, width: ROOF.w * S, height: ROOF.h * S }, clip);
    svgEl('rect', { x: OX, y: OY, width: ROOF.w * S, height: ROOF.h * S, 'class': 'roof-base' }, roof);
    /* v3.16: hai dải chuyển màu theo hướng mặt trời (tọa độ của hình), cập nhật mỗi lần vẽ. */
    function grad(id, n, bbox) {
      var g = svgEl('linearGradient', bbox ? { id: id, x1: 0, y1: 0, x2: 1, y2: 0 } : { id: id, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 440, y2: 0 }, defs);
      var st = [], off = n === 3 ? [0, 0.55, 1] : null;
      for (var i = 0; i < n; i++) st.push(svgEl('stop', { offset: off ? off[i] : i / (n - 1), 'stop-color': '#fff', 'stop-opacity': 0 }, g));
      return { g: g, st: st };
    }
    LG.sun = grad('pv-sun', 3, true);   /* trên từng tấm: sáng ở cạnh hướng về mặt trời, nhạt dần như mặt kính */
    LG.roof = grad('roof-sun', 2);      /* trên nền mái */
    LG.glint = grad('pv-glint', 5);     /* vệt sáng chung cả dàn */
  })();
  var roofLight = svgEl('rect', { x: OX, y: OY, width: ROOF.w * S, height: ROOF.h * S, fill: 'url(#roof-sun)', 'class': 'roof-sun' }, roof);
  var gShadow = svgEl('g', { 'clip-path': 'url(#roof-clip)' }, roof);
  var gPanels = svgEl('g', {}, roof);
  var gLight = svgEl('g', { 'class': 'pv-light', 'aria-hidden': 'true' }, roof);
  panels.forEach(function (p) {
    var xy = px(p.x0, p.y0), a = { x: xy[0].toFixed(2), y: xy[1].toFixed(2), width: (PW * S).toFixed(2), height: (PH * S).toFixed(2) };
    p.node = svgEl('rect', { x: a.x, y: a.y, width: a.width, height: a.height, 'class': 'pv' }, gPanels);
    /* Lớp nắng và vệt sáng trên từng tấm; tấm bị che hoặc bị bỏ thì tắt. */
    var g = svgEl('g', { 'class': 'pv-lit' }, gLight);
    svgEl('rect', { x: a.x, y: a.y, width: a.width, height: a.height, fill: 'url(#pv-sun)' }, g);
    svgEl('rect', { x: a.x, y: a.y, width: a.width, height: a.height, fill: 'url(#pv-glint)' }, g);
    p.lit = g;
  });
  var roofNight = svgEl('rect', { x: OX, y: OY, width: ROOF.w * S, height: ROOF.h * S, 'class': 'roof-night', opacity: 0 }, roof);
  (function buildObstacles() {
    var tum = OBST[0], a = px(tum.poly[0][0], tum.poly[0][1]), b = px(tum.poly[2][0], tum.poly[2][1]);
    svgEl('rect', { x: a[0], y: a[1], width: b[0] - a[0], height: b[1] - a[1], rx: 2, 'class': 'obst' }, roof);
    var tl = svgEl('text', { x: (a[0] + b[0]) / 2, y: b[1] - 7, 'text-anchor': 'middle', 'class': 'obst-label' }, roof);
    biText(tl, 'Tum thang', 'Stair well');
    var bon = OBST[1].circle, bc = px(bon.x, bon.y);
    svgEl('circle', { cx: bc[0], cy: bc[1], r: bon.r * S, 'class': 'obst' }, roof);
    var kim = OBST[2].circle, kc = px(kim.x, kim.y);
    svgEl('circle', { cx: kc[0], cy: kc[1], r: 3.5, 'class': 'rod' }, roof);
    svgEl('line', { x1: kc[0] - 6, y1: 34, x2: kc[0] - 1, y2: kc[1] - 5, 'class': 'leader' }, roof);
    var kl = svgEl('text', { x: kc[0] - 8, y: 30, 'text-anchor': 'end', 'class': 'obst-label' }, roof);
    biText(kl, 'Kim thu sét', 'Lightning rod');
    svgEl('line', { x1: bc[0] + 4, y1: 34, x2: bc[0], y2: bc[1] - bon.r * S - 2, 'class': 'leader' }, roof);
    var bl = svgEl('text', { x: bc[0] + 6, y: 30, 'class': 'obst-label' }, roof);
    biText(bl, 'Bồn nước', 'Water tank');
    svgEl('path', { d: 'M412 36 L412 12 M406 18 L412 12 L418 18', 'class': 'north' }, roof);
    var nl = svgEl('text', { x: 402, y: 30, 'text-anchor': 'end', 'class': 'obst-label' }, roof);
    biText(nl, 'Bắc', 'North');
  })();

  /* ---------- Điều khiển ---------- */
  var state = { city: 'hcm', day: 'today', layout: 'full', t: 9.5 };
  var readEl = document.getElementById('sun-read');
  var tInput = document.getElementById('t');
  var tOut = document.getElementById('t-out');
  var statusEl = document.getElementById('sun-status');
  var tblBody = document.getElementById('tbl-body');
  var tblCap = document.getElementById('tbl-cap');

  (function initDefaults() {
    var d = vnNow();
    var todayLab = document.getElementById('today-label');
    var dd = d.getUTCDate() + '/' + (d.getUTCMonth() + 1);
    todayLab.dataset.vi = 'Hôm nay, ' + dd;
    todayLab.dataset.en = 'Today, ' + dd;
    todayLab.textContent = (lang()==='en') ? todayLab.dataset.en : todayLab.dataset.vi;
    /* Giờ đồng hồ UTC+7 đổi sang giờ mặt trời của vùng mặc định (kinh độ + phương trình thời gian). */
    var h = solarFromClock(d.getUTCHours() + d.getUTCMinutes() / 60, CITIES[state.city].lon, dayOfYearVN());
    state.t = (h >= 6.5 && h <= 17.5) ? Math.round(h * 4) / 4 : 9.5;
    tInput.value = String(state.t);
  })();

  function getDecl() { return state.day === 'today' ? declOfDay(dayOfYearVN()) : DAYS[state.day]; }
  function getDayN() { return state.day === 'today' ? dayOfYearVN() : DAY_N[state.day]; }

  /* Ánh nắng trên mái và tấm pin. Độ đậm của lớp nắng tỉ lệ tuyến tính với G (W/m²) của mô hình
     (0,06 + 0,74 · G/1050: mức sàn rất nhỏ để nắng sớm vẫn thấy màu), màu theo độ cao. */
  var G_REF = 1050;
  var GL = '#F5DFB9'; /* vệt sáng: 70% --moonlight + 30% --gold */
  function sunVector(az) { return [Math.sin(az * RAD), -Math.cos(az * RAD)]; } /* trên hình: x sang Đông, y xuống Nam */
  function setGrad(G, az, stops, bbox) {
    var cx = OX + ROOF.w * S / 2, cy = OY + ROOF.h * S / 2, L = Math.sqrt(ROOF.w * ROOF.w + ROOF.h * ROOF.h) * S / 2;
    var v = sunVector(az);
    if (bbox) { cx = 0.5; cy = 0.5; L = 0.5; }
    G.g.setAttribute('x1', (cx + v[0] * L).toFixed(1)); G.g.setAttribute('y1', (cy + v[1] * L).toFixed(1));
    G.g.setAttribute('x2', (cx - v[0] * L).toFixed(1)); G.g.setAttribute('y2', (cy - v[1] * L).toFixed(1));
    stops.forEach(function (s, i) {
      var st = G.st[i];
      if (s.o != null) st.setAttribute('offset', s.o.toFixed(3));
      st.setAttribute('stop-color', s.c);
      st.setAttribute('stop-opacity', s.a.toFixed(3));
    });
  }
  var SUN = { alt: 0, az: 0, g: 0, dni: 0, alpha: 0, color: '' };
  function renderLight(pos, n, shaded, ex) {
    var lit = pos.alt > 0.5;
    var cs = clearSky(lit ? pos.alt : 0, n);
    var col = lightColor(pos.alt);
    var alpha = lit ? 0.06 + 0.74 * Math.min(1, cs.g / G_REF) : 0;
    setGrad(LG.sun, pos.az, [{ c: col, a: alpha }, { c: col, a: alpha * 0.3 }, { c: col, a: alpha * 0.08 }], true);
    setGrad(LG.roof, pos.az, [{ c: col, a: alpha * 0.6 }, { c: col, a: alpha * 0.3 }]);
    /* Vệt sáng mảnh vuông góc với hướng nắng, trượt theo giờ trong ngày. */
    var dayFrac = Math.max(0, Math.min(1, (state.t - 6) / 12));
    var p = 0.18 + 0.64 * dayFrac, w = 0.05, ga = lit ? 0.08 + 0.5 * Math.min(1, cs.g / G_REF) : 0;
    setGrad(LG.glint, pos.az, [
      { o: 0, c: GL, a: 0 }, { o: Math.max(0, p - w), c: GL, a: 0 }, { o: p, c: GL, a: ga },
      { o: Math.min(1, p + w), c: GL, a: 0 }, { o: 1, c: GL, a: 0 }]);
    roofLight.setAttribute('opacity', lit ? '1' : '0');
    roofNight.setAttribute('opacity', lit ? '0' : '0.38');
    panels.forEach(function (pn, i) {
      var on = lit && !shaded.has(i) && !ex.has(i);
      if (pn.litOn !== on) { pn.litOn = on; pn.lit.setAttribute('class', on ? 'pv-lit' : 'pv-lit off'); }
    });
    roof.setAttribute('data-irr', String(Math.round(cs.g)));
    roof.setAttribute('data-alt', pos.alt.toFixed(1));
    SUN = { alt: pos.alt, az: pos.az, g: cs.g, dni: cs.dni, am: cs.am, alpha: alpha, color: col, lit: lit,
            litPanels: panels.filter(function (pn) { return pn.litOn; }).length };
    window.__ANDUOR_SUN = SUN;
    if (readEl) {
      var en = lang() === 'en', reg = CITIES[state.city].region[en ? 'en' : 'vi'] + ' · ' + cityName(state.city);
      var gR = Math.round(cs.g / 10) * 10;
      readEl.textContent = lit
        ? (en ? reg + ': sun ' + Math.round(pos.alt) + '° high · sunlight ~' + gR + ' W/m² (approx., clear sky)'
              : reg + ': Mặt Trời cao ' + Math.round(pos.alt) + '° · nắng ~' + gR + ' W/m² (ước tính, trời quang)')
        : (en ? reg + ': sun below the horizon · no sunlight' : reg + ': Mặt Trời dưới đường chân trời · không có nắng');
    }
  }

  var tableKey = '';
  function renderTable(lat, decl) {
    var key = state.city + '|' + state.day;
    if (key === tableKey) return;
    tableKey = key;
    var ex = excludedFor(state.city);
    var avoidIdx = allIdx.filter(function (i) { return !ex.has(i); });
    var rows = [[(lang()==='en'?'Fill the roof':'Xếp kín mái'), allIdx], [(lang()==='en'?'Layout that avoids shade':'Xếp tránh bóng'), avoidIdx]];
    tblBody.replaceChildren();
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.scope = 'row';
      th.textContent = row[0];
      tr.appendChild(th);
      var n = row[1].length;
      [String(n), vnNum(n * KWP, 1) + ' kWp',
       vnNum(shadedHours(lat, decl, row[1], 9, 15), 1) + (lang()==='en'?' panel·hours':' giờ·tấm'),
       vnNum(shadedHours(lat, decl, row[1], 7, 17), 1) + (lang()==='en'?' panel·hours':' giờ·tấm')].forEach(function (v) {
        var td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      });
      tblBody.appendChild(tr);
    });
    tblCap.textContent = (lang()==='en')
        ? ('The same roof in ' + cityName(state.city) + ', ' + DAY_NAMES[state.day].en + ': two layouts')
        : ('Cùng mái nhà ở ' + cityName(state.city) + ', ngày ' + DAY_NAMES[state.day].vi + ': hai cách xếp');
  }

  function render() {
    var lat = CITIES[state.city].lat, decl = getDecl();
    var pos = sunPos(lat, decl, state.t);
    drawSky(lat, decl, pos);
    document.querySelectorAll('[data-city]').forEach(function (n) { n.textContent = cityName(state.city); });

    var ex = state.layout === 'avoid' ? excludedFor(state.city) : new Set();
    var idxs = allIdx.filter(function (i) { return !ex.has(i); });
    var polys = shadowPolys(pos.alt, pos.az);
    var shaded = shadedIn(polys, idxs);

    gShadow.replaceChildren();
    if (polys) {
      polys.forEach(function (h) {
        svgEl('polygon', {
          points: h.map(function (p) { var q = px(p[0], p[1]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '),
          'class': 'shadow'
        }, gShadow);
      });
    }
    panels.forEach(function (p, i) {
      p.node.setAttribute('class', ex.has(i) ? 'pv removed' : (shaded.has(i) ? 'pv shaded' : 'pv'));
    });
    renderLight(pos, getDayN(), shaded, ex);

    tOut.textContent = fmtTime(state.t);
    if (pos.alt <= 0.5) {
      statusEl.textContent = (lang()==='en')
        ? (fmtTime(state.t) + '. The sun is below the horizon.')
        : (fmtTime(state.t) + '. Mặt trời đang ở dưới đường chân trời.');
    } else {
      statusEl.textContent = (lang()==='en')
        ? (fmtTime(state.t) + '. The sun is ' + Math.round(pos.alt) + '° high, toward the ' + dirNameEn(pos.az) + '. ' + shaded.size + ' of ' + idxs.length + ' modules are shaded.')
        : (fmtTime(state.t) + '. Mặt trời cao ' + Math.round(pos.alt) + '°, ở hướng ' + dirName(pos.az) + '. ' + shaded.size + ' trong ' + idxs.length + ' tấm đang bị che.');
    }
    renderTable(lat, decl);
  }

  document.querySelectorAll('input[name="city"], input[name="day"], input[name="layout"]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      if (inp.checked) { state[inp.name] = inp.value; render(); }
    });
  });
  /* v3.15: thanh kéo giờ — cập nhật bóng ngay khi kéo (gộp theo khung hình), bong bóng giờ trên nút kéo,
     kéo bằng ngón tay ở mọi điểm trên rãnh, và trên màn hẹp đặt thanh kéo ngay dưới hình mái nhà. */
  var tWrap = tInput.closest('.time');
  var tBubble = document.getElementById('t-bubble');
  var tMin = parseFloat(tInput.min), tMax = parseFloat(tInput.max), tStep = parseFloat(tInput.step) || 0.25;
  var THUMB = 28;
  var rafId = 0;
  function syncThumb() {
    var frac = (parseFloat(tInput.value) - tMin) / (tMax - tMin);
    tInput.style.setProperty('--fill', (frac * 100).toFixed(2) + '%');
    if (tBubble) {
      tBubble.textContent = fmtTime(parseFloat(tInput.value));
      tBubble.style.left = 'calc(' + (THUMB / 2) + 'px + (100% - ' + THUMB + 'px) * ' + frac.toFixed(4) + ')';
    }
  }
  function scheduleRender() {
    syncThumb();
    if (rafId) return;
    rafId = (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(function () {
      rafId = 0;
      state.t = parseFloat(tInput.value);
      render();
    });
  }
  tInput.addEventListener('input', scheduleRender);
  tInput.addEventListener('change', scheduleRender);
  var hideTimer = 0;
  function dragOn() { clearTimeout(hideTimer); if (tWrap) tWrap.classList.add('dragging'); syncThumb(); }
  function dragOff() { clearTimeout(hideTimer); hideTimer = setTimeout(function () { if (tWrap) tWrap.classList.remove('dragging'); }, 700); }
  /* Chạm: đặt giá trị theo vị trí ngón tay (iOS mặc định chỉ kéo được khi chạm trúng nút). */
  var touchId = null;
  function valueAt(clientX) {
    var r = tInput.getBoundingClientRect();
    var frac = (clientX - r.left - THUMB / 2) / Math.max(1, r.width - THUMB);
    frac = Math.min(1, Math.max(0, frac));
    var v = tMin + frac * (tMax - tMin);
    return Math.round(v / tStep) * tStep;
  }
  function setFromX(clientX) {
    var v = valueAt(clientX);
    if (String(v) !== tInput.value) { tInput.value = String(v); scheduleRender(); }
  }
  tInput.addEventListener('pointerdown', function (e) {
    dragOn();
    if (e.pointerType !== 'touch') return;
    touchId = e.pointerId;
    try { tInput.setPointerCapture(e.pointerId); } catch (err) {}
    setFromX(e.clientX);
  });
  tInput.addEventListener('pointermove', function (e) {
    if (touchId === null || e.pointerId !== touchId) return;
    setFromX(e.clientX);
  });
  function endTouch(e) { if (touchId !== null && (!e || e.pointerId === touchId)) touchId = null; dragOff(); }
  tInput.addEventListener('pointerup', endTouch);
  tInput.addEventListener('pointercancel', endTouch);
  tInput.addEventListener('lostpointercapture', endTouch);
  tInput.addEventListener('keydown', function () { dragOn(); dragOff(); });
  tInput.addEventListener('blur', function () { if (tWrap) tWrap.classList.remove('dragging'); });

  /* Màn hẹp (≤ 900px, hai hình xếp dọc): đưa thanh kéo xuống ngay dưới hình mái nhà để thấy bóng khi kéo. */
  var homeParent = tWrap && tWrap.parentNode, homeNext = tWrap && tWrap.nextSibling;
  var roofSvg = document.getElementById('roof');
  function placeTime() {
    if (!tWrap || !roofSvg || !roofSvg.isConnected) return;
    var narrow = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    if (narrow && tWrap.previousElementSibling !== roofSvg) {
      roofSvg.parentNode.insertBefore(tWrap, roofSvg.nextSibling);
    } else if (!narrow && tWrap.parentNode !== homeParent) {
      homeParent.insertBefore(tWrap, homeNext && homeNext.parentNode === homeParent ? homeNext : null);
    }
    syncThumb();
  }
  placeTime();
  if (window.matchMedia) {
    var mq = window.matchMedia('(max-width: 900px)');
    var onMq = function () { if (roofSvg.isConnected) placeTime(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  render();
  syncThumb();
  /* Cho bộ thử: tính số liệu mà không đổi giao diện. */
  window.__ANDUOR_SUNMODEL = { sunPos: sunPos, clearSky: clearSky, cities: CITIES, days: DAYS, dayN: DAY_N, lightColor: lightColor };


  document.addEventListener('anduor-lang', function () {
    if (!sky.isConnected) return; /* trang đã được thay trong khung */
    var lab = document.getElementById('today-label');
    if (lab && lab.dataset.vi) lab.textContent = (lang()==='en') ? lab.dataset.en : lab.dataset.vi;
    tableKey = '';
    refreshBi();
    render();
  });
})();
