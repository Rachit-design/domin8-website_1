/* cursor.js — Domin8 custom cursor for all pages except index
   (index.html uses scene3d.js which already includes the cursor) */
(function () {
  'use strict';

  /* ── Custom cursor ── */
  var ring = document.createElement('div');
  var dot  = document.createElement('div');
  ring.id = 'gcRing';
  dot.id  = 'gcDot';
  document.body.appendChild(ring);
  document.body.appendChild(dot);

  var mx = -200, my = -200;
  var rx = -200, ry = -200;
  var LERP = 0.095;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  }, { passive: true });

  (function tickRing() {
    rx += (mx - rx) * LERP;
    ry += (my - ry) * LERP;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(tickRing);
  })();

  document.addEventListener('mouseover', function (e) {
    var interactive = !!(e.target && e.target.closest('a, button, input, select, textarea, [tabindex]'));
    ring.classList.toggle('gc-hover', interactive);
    dot.classList.toggle('gc-hover', interactive);
  });

  document.addEventListener('mousedown', function () {
    ring.classList.add('gc-click');
    dot.classList.add('gc-click');
  });
  document.addEventListener('mouseup', function () {
    ring.classList.remove('gc-click');
    dot.classList.remove('gc-click');
  });

  /* ── Minimal velocity trail ── */
  if (!window.matchMedia('(pointer: coarse)').matches) {
    var GHOSTS = [
      { lerp: 0.28, size: 5, maxOpacity: 0.22 },
      { lerp: 0.16, size: 4, maxOpacity: 0.14 },
      { lerp: 0.09, size: 3, maxOpacity: 0.09 },
      { lerp: 0.05, size: 2.5, maxOpacity: 0.05 },
    ];
    var tmx = -500, tmy = -500, speed = 0, tlx = -500, tly = -500;

    GHOSTS.forEach(function (g) {
      g.x = -500; g.y = -500;
      g.el = document.createElement('div');
      g.el.style.cssText =
        'position:fixed;pointer-events:none;z-index:9997;border-radius:50%;' +
        'width:' + g.size + 'px;height:' + g.size + 'px;background:rgba(255,255,255,1);' +
        'transform:translate(-50%,-50%);will-change:left,top,opacity;';
      document.body.appendChild(g.el);
    });

    document.addEventListener('mousemove', function (e) {
      var dx = e.clientX - tlx, dy = e.clientY - tly;
      speed = Math.sqrt(dx * dx + dy * dy);
      tmx = e.clientX; tmy = e.clientY;
      tlx = tmx; tly = tmy;
    }, { passive: true });

    (function trailTick() {
      requestAnimationFrame(trailTick);
      speed *= 0.82;
      var t = Math.max(0, Math.min(1, (speed - 7) / 22));
      GHOSTS.forEach(function (g) {
        g.x += (tmx - g.x) * g.lerp;
        g.y += (tmy - g.y) * g.lerp;
        g.el.style.left    = g.x + 'px';
        g.el.style.top     = g.y + 'px';
        g.el.style.opacity = (g.maxOpacity * t).toFixed(3);
      });
    })();
  }
})();
