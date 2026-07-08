/* cursor.js — Domin8 custom cursor + loading screen for all pages except
   index (index.html uses scene3d.js which already includes both) */

/* ── Loading screen — same minimal loader as the homepage ── */
(function bootScreen() {
  'use strict';
  if (document.getElementById('boot-screen')) return; // never double-mount

  var css = [
    '#boot-screen{position:fixed;inset:0;z-index:9999;background:#04020f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;transition:opacity .6s ease;}',
    '#boot-screen.boot-out{opacity:0;pointer-events:none;}',
    '.b-wrap{position:relative;width:118px;height:118px;display:flex;align-items:center;justify-content:center;}',
    '.b-wrap img{width:72px;height:72px;object-fit:contain;animation:bPulse 1.6s ease-in-out infinite;}',
    '@keyframes bPulse{0%,100%{transform:scale(1);opacity:.92}50%{transform:scale(1.06);opacity:1}}',
    '.b-ring{position:absolute;inset:0;border-radius:50%;border:2px solid transparent;border-top-color:#F7CA24;animation:bSpin 1.1s linear infinite;}',
    '.b-ring2{position:absolute;inset:9px;border-radius:50%;border:1.5px solid transparent;border-bottom-color:rgba(247,202,36,.35);animation:bSpin 1.7s linear infinite reverse;}',
    '@keyframes bSpin{to{transform:rotate(360deg)}}',
    '.b-tip{font-family:monospace;font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.4);min-height:1em;transition:opacity .3s ease;}',
    '.b-tip.swap{opacity:0;}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var TIPS = ['loading the floor', 'wiring you in', 'welcome home, gamer'];

  var el = document.createElement('div');
  el.id = 'boot-screen';
  el.innerHTML =
    '<div class="b-wrap">' +
      '<div class="b-ring"></div><div class="b-ring2"></div>' +
      '<img src="/assets/logo-face-cutout.png" alt=""/>' +
    '</div>' +
    '<div class="b-tip" id="bTip">' + TIPS[0] + '</div>';
  document.body.insertBefore(el, document.body.firstChild);

  var tipEl  = document.getElementById('bTip');
  var tipIdx = 0;
  var done   = false;

  var tipTimer = setInterval(function () {
    tipEl.classList.add('swap');
    setTimeout(function () {
      tipIdx = (tipIdx + 1) % TIPS.length;
      tipEl.textContent = TIPS[tipIdx];
      tipEl.classList.remove('swap');
    }, 300);
  }, 1100);

  function dismiss() {
    if (done) return;
    done = true;
    clearInterval(tipTimer);
    el.classList.add('boot-out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
  }

  // Dismiss when page is ready (min 1.2s, hard cap 3s)
  var minShow = new Promise(function (r) { setTimeout(r, 1200); });
  var loaded  = new Promise(function (r) {
    if (document.readyState === 'complete') r();
    else window.addEventListener('load', r, { once: true });
  });
  Promise.all([minShow, loaded]).then(dismiss);
  setTimeout(dismiss, 3000);

  document.addEventListener('keydown',    dismiss, { once: true });
  document.addEventListener('click',      dismiss, { once: true });
  document.addEventListener('touchstart', dismiss, { once: true, passive: true });
})();

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
