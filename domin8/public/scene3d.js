/* ============================================================================
   scene3d.js — Domin8 Esports
   Loading screen + Custom cursor + Three.js background + 3D card tilt
   All vanilla JS, no build step required.
============================================================================ */

/* ── 0. LOADING SCREEN ────────────────────────────────────────────────────── */
(function bootScreen() {
  'use strict';

  var MESSAGES = [
    { t: 0,    cls: '',     text: '> DOMIN8.EXE — boot sequence initiated...' },
    { t: 600,  cls: 'ok',   text: '> Connecting to floor: 20 rigs detected ✓' },
    { t: 1150, cls: 'err',  text: '> [ERROR] Airtel signal unstable. Expected.' },
    { t: 1650, cls: 'ok',   text: '> Rerouting via AB Road node... connected ✓' },
    { t: 2150, cls: 'ok',   text: '> Loading crew manifest... 9 found ✓' },
    { t: 2650, cls: 'warn', text: '> [WARNING] Drip levels critically high. Compensating.' },
    { t: 3150, cls: 'ok',   text: '> Community drive: 280 reviews, 740 followers ✓' },
    { t: 3650, cls: 'ok',   text: '> Saawan bhaiya\'s chai: brewing... done ✓' },
    { t: 4150, cls: 'ok',   text: '> All systems nominal. You\'re in, gamer.' },
  ];

  var css = [
    '#boot-screen{position:fixed;inset:0;z-index:9999;background:#04020f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;transition:transform .75s cubic-bezier(.76,0,.24,1);overflow:hidden;}',
    '#boot-screen.boot-out{transform:translateY(-100%);}',
    '.b-logo{position:absolute;top:22px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;opacity:.65;}',
    '.b-logo img{width:34px;height:34px;object-fit:contain;}',
    '.b-logo span{color:#F7CA24;font-family:monospace;font-size:.7rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;}',
    '.b-term{width:min(560px,90vw);border:1px solid rgba(247,202,36,.2);border-radius:10px;background:rgba(0,0,0,.55);padding:18px 22px;min-height:200px;display:flex;flex-direction:column;}',
    '.b-head{font-family:monospace;font-size:.6rem;color:rgba(255,255,255,.28);letter-spacing:.14em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:8px;margin-bottom:10px;}',
    '.b-line{font-family:monospace;font-size:clamp(.7rem,1.6vw,.82rem);line-height:1.75;opacity:0;animation:bIn .22s ease forwards;}',
    '.b-line.ok{color:#4ade80;}.b-line.err{color:#f87171;}.b-line.warn{color:#F7CA24;}',
    '.b-line.norm{color:rgba(255,255,255,.72);}',
    '@keyframes bIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}',
    '.b-cursor{display:inline-block;width:7px;height:.85em;background:#F7CA24;vertical-align:middle;margin-left:4px;animation:bBlink .55s step-end infinite;}',
    '@keyframes bBlink{50%{opacity:0}}',
    '.b-welcome{margin-top:26px;font-family:"Bebas Neue","Impact",sans-serif;font-size:clamp(1.8rem,5.5vw,3rem);color:#F7CA24;letter-spacing:.2em;text-align:center;opacity:0;transform:scale(.9) translateY(8px);transition:opacity .55s ease,transform .55s ease;}',
    '.b-welcome.show{opacity:1;transform:scale(1) translateY(0);}',
    '.b-bar{position:absolute;bottom:0;left:0;right:0;height:2px;background:rgba(255,255,255,.05);}',
    '.b-bar-fill{height:100%;width:0%;background:#F7CA24;transition:width .5s ease;box-shadow:0 0 10px rgba(247,202,36,.55);}',
    '.b-skip{position:absolute;bottom:14px;right:18px;font-family:monospace;font-size:.58rem;color:rgba(255,255,255,.18);letter-spacing:.1em;text-transform:uppercase;}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var el = document.createElement('div');
  el.id = 'boot-screen';
  el.innerHTML =
    '<div class="b-logo"><img src="/assets/logo-face-cutout.png" alt=""/><span>Domin8 Esports</span></div>' +
    '<div class="b-term"><div class="b-head">DOMIN8_TERMINAL v2026 &nbsp;—&nbsp; SYSTEM CHECK</div><div id="bLines"></div></div>' +
    '<div class="b-welcome" id="bWelcome">WELCOME HOME, GAMER.</div>' +
    '<div class="b-bar"><div class="b-bar-fill" id="bBar"></div></div>' +
    '<div class="b-skip">click or press any key to skip</div>';
  document.body.insertBefore(el, document.body.firstChild);

  var linesEl  = document.getElementById('bLines');
  var welcomeEl = document.getElementById('bWelcome');
  var barEl    = document.getElementById('bBar');
  var timers   = [];
  var done     = false;

  function dismiss() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    el.classList.add('boot-out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }

  MESSAGES.forEach(function (msg, i) {
    timers.push(setTimeout(function () {
      var line = document.createElement('div');
      line.className = 'b-line ' + (msg.cls || 'norm');
      line.textContent = msg.text;
      linesEl.appendChild(line);
      linesEl.scrollTop = linesEl.scrollHeight;
      barEl.style.width = Math.round(((i + 1) / MESSAGES.length) * 82) + '%';
    }, msg.t));
  });

  timers.push(setTimeout(function () {
    barEl.style.width = '100%';
    welcomeEl.classList.add('show');
  }, 4600));

  timers.push(setTimeout(dismiss, 5400));

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

  // Only on devices with a real mouse
  if (window.matchMedia('(pointer: coarse)').matches) return;

  var COLORS  = ['#F7CA24', '#681AFF', '#EF438B', '#F7CA24', '#CE006D', '#ffffff'];
  var SPEED_T = 9;   // px/frame threshold before trail appears
  var MAX_P   = 32;  // particle pool size

  var style = document.createElement('style');
  style.textContent = [
    '.gc-spark{position:fixed;pointer-events:none;z-index:9998;border-radius:50%;',
    'transform:translate(-50%,-50%);animation:sparkFade .38s ease forwards;}',
    '@keyframes sparkFade{',
    '0%{opacity:.9;transform:translate(-50%,-50%) scale(1);}',
    '55%{opacity:.45;transform:translate(-50%,-50%) scale(.55);}',
    '100%{opacity:0;transform:translate(-50%,-50%) scale(0);}}',
  ].join('');
  document.head.appendChild(style);

  var pool     = [];
  var colorIdx = 0;
  var lastX    = -999;
  var lastY    = -999;

  function getParticle() {
    for (var i = 0; i < pool.length; i++) {
      if (!pool[i].busy) return pool[i];
    }
    if (pool.length < MAX_P) {
      var d = document.createElement('div');
      d.className = 'gc-spark';
      document.body.appendChild(d);
      var p = { el: d, busy: false };
      pool.push(p);
      return p;
    }
    return null;
  }

  function emit(x, y, speed) {
    // Number of sparks scales with speed
    var count = speed > 35 ? 4 : speed > 22 ? 3 : speed > 14 ? 2 : 1;
    for (var i = 0; i < count; i++) {
      var p = getParticle();
      if (!p) return;
      var sz    = 3 + Math.random() * 5;
      var color = COLORS[colorIdx++ % COLORS.length];
      var ox    = (Math.random() - .5) * speed * .28;
      var oy    = (Math.random() - .5) * speed * .28;
      p.busy = true;
      // Reset animation then restart
      p.el.style.cssText =
        'left:' + (x + ox) + 'px;top:' + (y + oy) + 'px;' +
        'width:' + sz + 'px;height:' + sz + 'px;' +
        'background:' + color + ';' +
        'box-shadow:0 0 ' + (sz * 2.2) + 'px ' + color + ';' +
        'animation:none;';
      void p.el.offsetWidth; // reflow
      p.el.style.animation = 'sparkFade .38s ease forwards';
      (function (particle) {
        setTimeout(function () { particle.busy = false; }, 400);
      })(p);
    }
  }

  document.addEventListener('mousemove', function (e) {
    var dx    = e.clientX - lastX;
    var dy    = e.clientY - lastY;
    var speed = Math.sqrt(dx * dx + dy * dy);
    if (speed > SPEED_T) emit(e.clientX, e.clientY, speed);
    lastX = e.clientX;
    lastY = e.clientY;
  }, { passive: true });
})();
