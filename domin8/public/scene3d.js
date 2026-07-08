/* ============================================================================
   scene3d.js — Domin8 Esports
   Custom cursor + Three.js physics background + 3D card tilt
   All vanilla JS, no build step required.
============================================================================ */
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
