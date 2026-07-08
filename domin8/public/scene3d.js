/* ============================================================================
   scene3d.js — Domin8 Esports
   Loading screen + Custom cursor + Three.js background + 3D card tilt
   All vanilla JS, no build step required.
============================================================================ */

/* ── 0. LOADING SCREEN — minimal, graphic-first ──────────────────────────── */
(function bootScreen() {
  'use strict';

  var css = [
    '#boot-screen{position:fixed;inset:0;z-index:9999;background:#04020f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;transition:opacity .6s ease;}',
    '#boot-screen.boot-out{opacity:0;pointer-events:none;}',
    // Logo inside a spinning gold arc
    '.b-wrap{position:relative;width:118px;height:118px;display:flex;align-items:center;justify-content:center;}',
    '.b-wrap img{width:72px;height:72px;object-fit:contain;animation:bPulse 1.6s ease-in-out infinite;}',
    '@keyframes bPulse{0%,100%{transform:scale(1);opacity:.92}50%{transform:scale(1.06);opacity:1}}',
    '.b-ring{position:absolute;inset:0;border-radius:50%;border:2px solid transparent;border-top-color:#F7CA24;animation:bSpin 1.1s linear infinite;}',
    '.b-ring2{position:absolute;inset:9px;border-radius:50%;border:1.5px solid transparent;border-bottom-color:rgba(247,202,36,.35);animation:bSpin 1.7s linear infinite reverse;}',
    '@keyframes bSpin{to{transform:rotate(360deg)}}',
    // One quiet line, looping through short phrases
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

  // Cycle phrases with a soft cross-fade
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

  // Dismiss when the page is actually ready (min 1.2s so it never flashes),
  // hard cap at 3s — the loader should never make anyone wait.
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

  /* ── 1. CUSTOM CURSOR ─────────────────────────────────────────────────── */
  var ring = document.createElement('div');
  var dot  = document.createElement('div');
  ring.id = 'gcRing';
  dot.id  = 'gcDot';
  document.body.appendChild(ring);
  document.body.appendChild(dot);

  var mx = -200, my = -200; // mouse
  var rx = -200, ry = -200; // ring (lerp target)
  var LERP = 0.095;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    // Dot snaps instantly (actual hotspot feedback)
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

  // Hover detection — ring reacts when over interactive elements
  document.addEventListener('mouseover', function (e) {
    var isInteractive = !!(
      e.target &&
      e.target.closest('a, button, input, select, textarea, [data-open-join], [tabindex]')
    );
    ring.classList.toggle('gc-hover', isInteractive);
    dot.classList.toggle('gc-hover', isInteractive);
  });

  document.addEventListener('mousedown', function () {
    ring.classList.add('gc-click');
    dot.classList.add('gc-click');
  });
  document.addEventListener('mouseup', function () {
    ring.classList.remove('gc-click');
    dot.classList.remove('gc-click');
  });

  /* ── 2. THREE.JS BACKGROUND PHYSICS ──────────────────────────────────── */
  // Three.js is loaded via CDN (defer) in <head>.
  // We wait until it's ready before running the scene.
  function initScene() {
    if (typeof THREE === 'undefined') return; // CDN didn't load (e.g. offline) — skip

    var W = window.innerWidth;
    var H = window.innerHeight;

    // Canvas sits behind all content (z-index set by CSS to 0,
    // with main/footer at z-index 2 sitting above it)
    var canvas = document.createElement('canvas');
    canvas.id  = 'bg3d';
    canvas.style.cssText =
      'position:fixed;inset:0;z-index:0;pointer-events:none;width:100%;height:100%;';
    // Insert as first child of body (behind all content)
    document.body.insertBefore(canvas, document.body.firstChild);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(1); // always 1 — higher DPR doubles GPU work for minimal visual gain
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);

    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 80);
    camera.position.z = 16;

    // Brand palette — electric, magenta, purple, gold, pink
    var PALETTE = [
      0x681AFF, 0xCE006D, 0x77319F,
      0xF7CA24, 0xEF438B, 0x2B0ABD,
      0x681AFF, 0xF7CA24  // weight gold and electric heavier
    ];

    /* ── Build floating wireframe boxes ── */
    var BOX_N = 18;
    var COLS  = 9, ROWS = 2;
    var boxes = [];

    for (var i = 0; i < BOX_N; i++) {
      var sz   = 0.32 + Math.random() * 0.55;
      var geo  = new THREE.BoxGeometry(sz, sz, sz);
      var edge = new THREE.EdgesGeometry(geo);
      var col  = PALETTE[i % PALETTE.length];
      var mat  = new THREE.LineBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.45 + Math.random() * 0.3
      });
      var mesh = new THREE.LineSegments(edge, mat);

      // Home position: loose grid spread across the screen
      var ci = i % COLS;
      var ri = Math.floor(i / COLS);
      var hx = (ci - (COLS - 1) / 2) * 3.0 + (Math.random() - 0.5) * 1.6;
      var hy = (ri - (ROWS - 1) / 2) * 2.8 + (Math.random() - 0.5) * 1.2;
      var hz = (Math.random() - 0.5) * 5;

      mesh.position.set(hx, hy, hz);
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      scene.add(mesh);

      boxes.push({
        mesh:   mesh,
        hx: hx, hy: hy, hz: hz, // home
        vx: 0,  vy: 0,  vz: 0,  // velocity
        rx: (Math.random() - 0.5) * 0.009, // ambient spin
        ry: (Math.random() - 0.5) * 0.013,
        spring: 0.014 + Math.random() * 0.014, // spring stiffness
        damp:   0.87  + Math.random() * 0.07   // velocity damping
      });
    }

    /* ── Mouse → world-space position ── */
    var mWorld = new THREE.Vector3(0, 0, 0);

    function projectMouse(clientX, clientY) {
      var nx = (clientX / W) * 2 - 1;
      var ny = -(clientY / H) * 2 + 1;
      var v  = new THREE.Vector3(nx, ny, 0.5);
      v.unproject(camera);
      var dir  = v.sub(camera.position).normalize();
      var dist = -camera.position.z / dir.z;
      mWorld.copy(camera.position).addScaledVector(dir, dist);
    }

    var REPULSE_R = 3.5;   // radius of mouse push (world units)
    var REPULSE_F = 0.007; // repulsion force strength
    var CLICK_R   = 7.0;   // radius of click explosion
    var CLICK_F   = 0.28;  // click force strength

    document.addEventListener('mousemove', function (e) {
      projectMouse(e.clientX, e.clientY);
    }, { passive: true });

    // Click → scatter nearby boxes (they spring back slowly)
    document.addEventListener('click', function (e) {
      projectMouse(e.clientX, e.clientY);
      boxes.forEach(function (b) {
        var dx = b.mesh.position.x - mWorld.x;
        var dy = b.mesh.position.y - mWorld.y;
        var d  = Math.sqrt(dx * dx + dy * dy) + 0.01;
        if (d < CLICK_R) {
          var f = ((CLICK_R - d) / CLICK_R) * CLICK_F;
          b.vx += (dx / d) * f;
          b.vy += (dy / d) * f;
          b.vz += (Math.random() - 0.5) * 0.09;
          // Add spin kick
          b.rx  = (Math.random() - 0.5) * 0.07;
          b.ry  = (Math.random() - 0.5) * 0.10;
        }
      });
    });

    /* ── Animation loop ── */
    function animate() {
      requestAnimationFrame(animate);

      var t = Date.now() * 0.001;

      // Subtle camera drift for an organic, alive feeling
      camera.position.x = Math.sin(t * 0.06) * 0.35;
      camera.position.y = Math.cos(t * 0.045) * 0.18;

      boxes.forEach(function (b) {
        // Spring toward home position
        b.vx += (b.hx - b.mesh.position.x) * b.spring;
        b.vy += (b.hy - b.mesh.position.y) * b.spring;
        b.vz += (b.hz - b.mesh.position.z) * b.spring * 0.35;

        // Mouse repulsion (push boxes away from cursor)
        var dx = b.mesh.position.x - mWorld.x;
        var dy = b.mesh.position.y - mWorld.y;
        var d  = Math.sqrt(dx * dx + dy * dy) + 0.01;
        if (d < REPULSE_R) {
          var rf = ((REPULSE_R - d) / REPULSE_R) * REPULSE_F;
          b.vx += (dx / d) * rf;
          b.vy += (dy / d) * rf;
        }

        // Velocity damping (friction)
        b.vx *= b.damp;
        b.vy *= b.damp;
        b.vz *= b.damp;

        // Integrate
        b.mesh.position.x += b.vx;
        b.mesh.position.y += b.vy;
        b.mesh.position.z += b.vz;

        // Ambient rotation
        b.mesh.rotation.x += b.rx;
        b.mesh.rotation.y += b.ry;

        // Gradually damp spin back toward steady state
        b.rx += ((Math.random() - 0.5) * 0.0005 - b.rx * 0.003);
        b.ry += ((Math.random() - 0.5) * 0.0005 - b.ry * 0.003);
      });

      renderer.render(scene, camera);
    }
    animate();

    /* ── Handle resize ── */
    window.addEventListener('resize', function () {
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });
  }

  // Three.js is loaded with `defer` so it may not be ready immediately.
  // Wait for DOMContentLoaded or use a small poll if already loaded.
  if (typeof THREE !== 'undefined') {
    initScene();
  } else {
    window.addEventListener('load', function () {
      initScene();
    });
  }

  /* ── 3. 3D CARD TILT ─────────────────────────────────────────────────── */
  // Each card responds to mouse position — tilts toward the cursor.
  // On mouse leave it springs back to flat.
  var TILT_DEG = 7; // maximum tilt in degrees

  function applyTilt(el) {
    el.addEventListener('mousemove', function (e) {
      var r  = el.getBoundingClientRect();
      var cx = r.left + r.width  / 2;
      var cy = r.top  + r.height / 2;
      var dx = (e.clientX - cx) / (r.width  / 2); // -1 … 1
      var dy = (e.clientY - cy) / (r.height / 2); // -1 … 1
      var tX = -dy * TILT_DEG;
      var tY =  dx * TILT_DEG;
      el.style.transform  = 'perspective(800px) rotateX(' + tX + 'deg) rotateY(' + tY + 'deg) translateZ(6px)';
      el.style.transition = 'transform 0.08s linear';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transform  = '';
      el.style.transition = 'transform 0.55s cubic-bezier(0.16,1,0.3,1)';
    });
  }

  // Apply to existing cards; also retry after a delay for JS-rendered cards
  function initTilts() {
    var sel = '.team-card, .blog-card, .event-card, .shop__card, .iesports.glass';
    document.querySelectorAll(sel).forEach(applyTilt);
    // The flip card has its own hover interaction — don't tilt it
  }

  // Run once DOM is ready, then again after dynamic cards are injected
  initTilts();
  setTimeout(initTilts, 900);

})();

/* ── 4. VELOCITY CURSOR TRAIL ─────────────────────────────────────────────── */
(function cursorTrail() {
  'use strict';

  if (window.matchMedia('(pointer: coarse)').matches) return;

  // 4 ghost dots — each lags further behind the cursor than the last.
  // They create a soft comet tail that only becomes visible at real speed.
  var GHOSTS = [
    { lerp: 0.28, size: 5, maxOpacity: 0.22 },
    { lerp: 0.16, size: 4, maxOpacity: 0.14 },
    { lerp: 0.09, size: 3, maxOpacity: 0.09 },
    { lerp: 0.05, size: 2.5, maxOpacity: 0.05 },
  ];

  var mx = -500, my = -500; // real mouse position
  var speed = 0;            // smoothed velocity
  var lastX = -500, lastY = -500;

  // Build ghost elements
  GHOSTS.forEach(function (g) {
    g.x = -500; g.y = -500;
    g.el = document.createElement('div');
    g.el.style.cssText =
      'position:fixed;pointer-events:none;z-index:9997;border-radius:50%;' +
      'width:' + g.size + 'px;height:' + g.size + 'px;' +
      'background:rgba(255,255,255,1);' +
      'transform:translate(-50%,-50%);' +
      'will-change:left,top,opacity;';
    document.body.appendChild(g.el);
  });

  document.addEventListener('mousemove', function (e) {
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    speed = Math.sqrt(dx * dx + dy * dy);
    mx = e.clientX; my = e.clientY;
    lastX = mx; lastY = my;
  }, { passive: true });

  (function tick() {
    requestAnimationFrame(tick);

    // Smooth speed toward 0 so the trail fades gracefully when cursor stops
    speed *= 0.82;

    // Opacity scale: 0 below threshold, ramps up with speed (max at ~30px/frame)
    var t = Math.max(0, Math.min(1, (speed - 7) / 22));

    GHOSTS.forEach(function (g) {
      g.x += (mx - g.x) * g.lerp;
      g.y += (my - g.y) * g.lerp;
      g.el.style.left    = g.x + 'px';
      g.el.style.top     = g.y + 'px';
      g.el.style.opacity = (g.maxOpacity * t).toFixed(3);
    });
  })();
})();
