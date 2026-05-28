/* ============================================================================
   DOMIN8 ESPORTS — main.js
============================================================================ */
(function(){
  'use strict';

  var DISCORD_INVITE  = 'https://discord.gg/fhCtjEF9T';
  var WHATSAPP_INVITE = 'https://chat.whatsapp.com/HBbUhT7cIO7J52DEqANBNH';
  document.querySelectorAll('[data-discord]').forEach(function(el){
    el.setAttribute('href', DISCORD_INVITE); el.setAttribute('target','_blank'); el.setAttribute('rel','noopener');
  });
  var db = document.getElementById('discordBtn'); if(db) db.href = DISCORD_INVITE;

  var yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function img(src){ if(!src) return '/assets/logo-face-cutout.png'; if(/^https?:\/\//.test(src)) return src; return src.charAt(0)==='/'?src:'/'+src; }

  // ---- Nav scroll + mobile menu ----
  var nav=document.getElementById('nav');
  window.addEventListener('scroll',function(){ if(nav) nav.classList.toggle('scrolled', window.scrollY>30); });
  var burger=document.getElementById('burger'), menu=document.getElementById('mobileMenu');
  if(burger&&menu){
    burger.addEventListener('click',function(){var open=menu.hidden===false;menu.hidden=open;burger.setAttribute('aria-expanded',String(!open));});
    menu.querySelectorAll('a,button').forEach(function(el){el.addEventListener('click',function(){menu.hidden=true;});});
  }

  // ---- Reveal on scroll ----
  function observeReveals(els){
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
      els.forEach(function(el){io.observe(el);});
    } else { els.forEach(function(el){el.classList.add('in');}); }
  }
  observeReveals(document.querySelectorAll('.reveal'));

  // ---- Stat counters ----
  var statNums=document.querySelectorAll('.stat__num[data-target]');
  function animateCount(el){
    var target=parseInt(el.getAttribute('data-target'),10)||0, suffix=el.getAttribute('data-suffix')||'', start=performance.now(), dur=1400;
    function tick(now){var p=Math.min((now-start)/dur,1),eased=1-Math.pow(1-p,3),v=Math.round(target*eased);el.innerHTML=v.toLocaleString()+(suffix?'<span class="accent-magenta">'+suffix+'</span>':'');if(p<1)requestAnimationFrame(tick);}
    requestAnimationFrame(tick);
  }
  if(statNums.length){
    if('IntersectionObserver' in window){
      var sIO=new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(e.isIntersecting){
            e.target.classList.remove('stats-play');
            void e.target.offsetWidth;
            e.target.classList.add('stats-play');
            e.target.querySelectorAll('.stat__num[data-target]').forEach(function(el){
              el.innerHTML='0'+((el.getAttribute('data-suffix')||'')?'<span class="accent-magenta">'+el.getAttribute('data-suffix')+'</span>':'');
              animateCount(el);
            });
          } else {
            e.target.classList.remove('stats-play');
          }
        });
      },{threshold:.45});
      var statsSection=document.getElementById('stats');
      if(statsSection) sIO.observe(statsSection);
    } else { statNums.forEach(function(el){var s=el.getAttribute('data-suffix')||'';el.innerHTML=(parseInt(el.getAttribute('data-target'),10)||0).toLocaleString()+(s?'<span class="accent-magenta">'+s+'</span>':'');}); }
  }

  // ---- Brand logo animation — clean non-overlapping loop ----
  // Sequence (restarts every time section scrolls into view):
  //  0s      OLD logo visible            → label: "Where it started" gold
  //  3s      OLD fades out               → label off
  //  3.5s    NEW logo fades in           → label: "Where we're going" gold
  //  7s      NEW fades out               → label off
  //  7.5s    TYPOGRAPHY fades in         → label: "Where we're going" gold
  //  11s     TYPOGRAPHY fades out        → label off
  //  11.5s   NEW logo fades in (loop)    → label: "Where we're going" gold
  //  ... repeats new ↔ typography forever

  var brandJourney = document.querySelector('.brand-journey');
  if(brandJourney){
    var labelOld = document.getElementById('labelOld');
    var labelNew = document.getElementById('labelNew');
    var imgOld   = document.getElementById('brandOldImgClean');
    var imgNew   = document.getElementById('brandNewImgClean');
    var imgType  = document.getElementById('brandTypeImgClean');

    var bTimers = [];
    function bClear(){ bTimers.forEach(clearTimeout); bTimers = []; }
    function bDelay(fn, ms){ bTimers.push(setTimeout(fn, ms)); }

    function setLabel(which){
      if(labelOld) labelOld.classList.toggle('bj-label--active', which === 'old');
      if(labelNew) labelNew.classList.toggle('bj-label--active', which === 'new');
    }

    // fade: el → opacity 0 or 1, dur in ms
    function fade(el, toOpacity, dur){
      if(!el) return;
      el.style.transition = 'opacity '+dur+'ms ease, filter '+dur+'ms ease, transform '+dur+'ms ease';
      el.style.opacity    = toOpacity;
      el.style.transform  = toOpacity > 0 ? 'scale(1)' : 'scale(0.94)';
      el.style.filter     = toOpacity > 0
        ? 'blur(0) drop-shadow(0 0 22px rgba(206,0,109,.28))'
        : 'blur(6px)';
    }

    function hardHide(el){
      if(!el) return;
      el.style.transition = 'none';
      el.style.opacity    = '0';
      el.style.transform  = 'scale(0.94)';
      el.style.filter     = 'blur(0)';
    }

    function startBrand(){
      bClear();
      // Hard reset everything instantly
      hardHide(imgNew);
      hardHide(imgType);
      setLabel('none');
      // Show old logo immediately
      if(imgOld){
        imgOld.style.transition = 'none';
        imgOld.style.opacity    = '1';
        imgOld.style.transform  = 'scale(1)';
        imgOld.style.filter     = 'drop-shadow(0 0 28px rgba(104,26,255,.32))';
      }
      setLabel('old');

      // 3s — old fades out
      bDelay(function(){
        fade(imgOld, 0, 800);
        setLabel('none');
      }, 3000);

      // 3.5s — new logo fades in
      bDelay(function(){
        fade(imgNew, 1, 900);
        setLabel('new');
      }, 3600);

      // 7s — new fades out, start loop
      bDelay(function(){
        fade(imgNew, 0, 800);
        setLabel('none');
        bDelay(loopStep, 600);
      }, 7000);
    }

    // loopStep: type in → type out → new in → new out → repeat
    function loopStep(){
      // type fades in
      fade(imgType, 1, 900);
      setLabel('new');

      // type fades out
      bDelay(function(){
        fade(imgType, 0, 800);
        setLabel('none');
      }, 3500);

      // new logo fades in
      bDelay(function(){
        fade(imgNew, 1, 900);
        setLabel('new');
      }, 4200);

      // new logo fades out → loop again
      bDelay(function(){
        fade(imgNew, 0, 800);
        setLabel('none');
        bDelay(loopStep, 600);
      }, 7500);
    }

    if('IntersectionObserver' in window){
      var brandIO = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(e.isIntersecting){ startBrand(); }
          else { bClear(); hardHide(imgNew); hardHide(imgType); setLabel('none'); if(imgOld){ imgOld.style.transition='none'; imgOld.style.opacity='1'; } }
        });
      }, { threshold: .4 });
      brandIO.observe(brandJourney);
    } else {
      startBrand();
    }
  }

  // ---- Team grid (excludes The Regulars card — that's in the community card below) ----
  var teamGrid=document.getElementById('teamGrid');
  if(teamGrid && Array.isArray(window.TEAM)){
    teamGrid.innerHTML = window.TEAM.filter(function(m){ return m.name !== 'The Regulars'; }).map(function(m){
      var initials = m.name.split(' ').filter(Boolean).slice(0,2).map(function(w){ return w[0]||''; }).join('').toUpperCase();
      var imgHtml = m.image
        ? '<img src="'+img(m.image)+'" alt="'+esc(m.name)+'" loading="lazy"/>'
        : '<div class="team-card__initials">'+initials+'</div>';
      return '<div class="team-card">'+
        '<div class="team-card__img">'+imgHtml+'</div>'+
        '<div class="team-card__body">'+
          '<div class="team-card__name">'+esc(m.name)+'</div>'+
          (m.tag?'<div class="team-card__tag">"'+esc(m.tag)+'"</div>':'')+
          '<div class="team-card__role">'+esc(m.role)+'</div>'+
          '<div class="team-card__note">'+esc(m.note)+'</div>'+
        '</div></div>';
    }).join('');
  }

  // ---- Community live list (vertical scroll in crew section) ----
  function buildCommunityLiveList(names){
    var list = document.getElementById('communityLiveList');
    if(!list) return;
    if(!names || !names.length){
      names = ['GhostByte','NeonRaider','CryptoKill','FragLord','ZeroRecoil','ShadowSnipe','RedBull99','IceViper','SteelPulse','DarkFrag','VoltStrike','GlitchHunter','PixelWar','CodeBreaker','NightOwl','RushB','FlashPoint','SmokeStack','EchoSix','ThunderFist'];
    }
    names = names.slice().sort(function(){ return Math.random() - 0.5; });
    // Duplicate for seamless infinite scroll
    var all = names.concat(names).concat(names);
    list.innerHTML = all.map(function(n,i){
      return '<div class="community-live__item">'+
        '<span class="community-live__dot"></span>'+
        '<span class="community-live__name">'+esc(n)+'</span>'+
        '<span class="community-live__badge">recently active</span>'+
      '</div>';
    }).join('');
    var dur = Math.max(18, names.length * 1.8);
    list.style.animationDuration = dur + 's';
  }

  // ---- Community Regulars auto-scroll (names from iCafeCloud) ----
  function buildRegularsScroller(names){
    if(!names || !names.length){
      names = ['GhostByte','NeonRaider','CryptoKill','FragLord','ZeroRecoil','ShadowSnipe','RedBull99','IceViper','SteelPulse','DarkFrag','VoltStrike','GlitchHunter','PixelWar','CodeBreaker','NightOwl','RushB','FlashPoint','SmokeStack','EchoSix','ThunderFist'];
    }
    // Feed the vertical community list
    buildCommunityLiveList(names);
  }
  buildRegularsScroller([]);

  // ---- Legends (The Faces of Domin8) vertical scroll ----
  var col=document.getElementById('playerColumn');
  var overlayBg=document.createElement('div');
  overlayBg.className='player-overlay-bg';
  document.body.appendChild(overlayBg);
  var isTouchDevice=('ontouchstart' in window)||(navigator.maxTouchPoints>0);

  function playerCard(p){
    return '<div class="player-card" data-name="'+esc(p.name)+'" data-tag="'+esc(p.tag)+'">'+
      '<div class="player-card__imgs"><img class="real" src="'+img(p.real)+'" alt="'+esc(p.name)+'" loading="lazy"/></div>'+
      '<div class="player-card__info">'+
        '<div class="player-card__name">'+esc(p.name)+'</div>'+
        '<div class="player-card__tag">"'+esc(p.tag)+'"</div>'+
        (p.quote?'<div class="player-card__quote">'+esc(p.quote)+'</div>':'')+
      '</div>'+
      '<div class="player-card__hovercard">'+
        '<div class="player-card__hovercard-name">'+esc(p.name)+'</div>'+
        '<div class="player-card__hovercard-tag">"'+esc(p.tag)+'"</div>'+
        '<div class="player-card__hovercard-quote">'+(p.quote||'One of the legends of the floor.')+'</div>'+
      '</div>'+
    '</div>';
  }

  function buildPlayerColumn(){
    if(!col||!Array.isArray(window.PLAYERS))return;
    var cards=window.PLAYERS.map(function(p){ return playerCard(p); }).join('');
    col.innerHTML=cards+cards;
    col.querySelectorAll('.player-card').forEach(function(card){
      card.addEventListener('click',function(e){
        if(!isTouchDevice)return;
        e.stopPropagation();
        col.querySelectorAll('.player-card.overlay-open').forEach(function(c){c.classList.remove('overlay-open');});
        card.classList.add('overlay-open');
        overlayBg.classList.add('active');
      });
    });
  }
  overlayBg.addEventListener('click',function(){
    col.querySelectorAll('.player-card.overlay-open').forEach(function(c){c.classList.remove('overlay-open');});
    overlayBg.classList.remove('active');
  });
  buildPlayerColumn();

  // ---- Hero slideshow ----
  (function(){
    var slides = document.querySelectorAll('#heroSlides .hero__slide');
    var dots   = document.getElementById('heroDots');
    if(!slides.length || !dots) return;
    var cur = 0, timer;
    // Build dot buttons
    [].forEach.call(slides, function(_, i){
      var b = document.createElement('button');
      b.setAttribute('aria-label','Slide '+(i+1));
      if(i===0) b.classList.add('active');
      b.addEventListener('click', function(){ go(i); reset(); });
      dots.appendChild(b);
    });
    function go(n){
      slides[cur].classList.remove('active');
      dots.children[cur].classList.remove('active');
      var next = ((n % slides.length) + slides.length) % slides.length;
      var tries = 0;
      while(slides[next].style.display === 'none' && tries < slides.length){ next = (next+1) % slides.length; tries++; }
      if(tries >= slides.length) return;
      cur = next;
      slides[cur].classList.add('active');
      dots.children[cur].classList.add('active');
    }
    function reset(){ clearInterval(timer); timer = setInterval(function(){ go(cur+1); }, 5500); }
    // Skip slides whose image fails to load
    [].forEach.call(slides, function(slide, i){
      var im = slide.querySelector('img');
      if(im) im.addEventListener('error', function(){
        slide.style.display='none';
        if(dots.children[i]) dots.children[i].style.display='none';
      });
    });
    reset();
  })();

  // ---- Blog ----
  var blogGrid=document.getElementById('blogGrid');
  function renderBlogPosts(posts){
    if(!blogGrid||!Array.isArray(posts)||!posts.length) return;
    blogGrid.innerHTML = posts.map(function(post){
      var link = (post.link && post.link!=='#') ? '<a href="'+esc(post.link)+'" class="blog-card__link" target="_blank" rel="noopener">Read more →</a>' : '<a href="#" class="blog-card__link">Read more →</a>';
      return '<article class="blog-card reveal">'+
        '<div class="blog-card__thumb"><img src="'+img(post.image)+'" alt="'+esc(post.title)+'" loading="lazy"/><span class="blog-card__cat">'+esc(post.category||'News')+'</span></div>'+
        '<div class="blog-card__body"><time class="blog-card__date">'+esc(post.date||'')+'</time><h3>'+esc(post.title||'')+'</h3><p>'+esc(post.excerpt||'')+'</p>'+link+'</div>'+
        '</article>';
    }).join('');
    observeReveals(blogGrid.querySelectorAll('.reveal'));
  }
  if(blogGrid){
    fetch('/api/blog').then(function(r){ return r.ok ? r.json() : Promise.reject(); })
      .then(function(posts){ renderBlogPosts(posts.length ? posts : window.BLOG_POSTS); })
      .catch(function(){ renderBlogPosts(window.BLOG_POSTS); });
  }

  // ---- Space flip ----
  var flip=document.getElementById('spaceFlip');
  if(flip){
    flip.addEventListener('click',function(){flip.classList.toggle('flipped');});
    flip.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();flip.classList.toggle('flipped');}});
  }

  // ---- Join modal ----
  var modal=document.getElementById('joinModal');
  function openModal(){modal.classList.add('open');document.body.style.overflow='hidden';}
  function closeModal(){modal.classList.remove('open');document.body.style.overflow='';}
  document.querySelectorAll('[data-open-join]').forEach(function(b){b.addEventListener('click',openModal);});
  document.querySelectorAll('[data-close-join]').forEach(function(b){b.addEventListener('click',closeModal);});
  if(modal){modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});}
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal)closeModal();});

  // GOOGLE SHEETS ENDPOINT — replace with your Apps Script Web App URL
  var SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwZl68EyMcTnGZnEi4u7gXj9kVI-ouFIRrAcmrVtklvmB3UxtnXlaXtl2-wJA23FSpB/exec';

  var submit=document.getElementById('joinSubmit'), feedback=document.getElementById('joinFeedback');
  if(submit){
    submit.addEventListener('click',async function(){
      var name=document.getElementById('jName').value.trim(), tag=document.getElementById('jTag').value.trim(), email=document.getElementById('jEmail').value.trim(), phone=(document.getElementById('jPhone')||{}).value||'';
      phone = phone.trim();
      feedback.style.color='var(--magenta)';
      if(!name||!email){feedback.textContent='Please add your name and email.';return;}
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){feedback.textContent='That email looks off — check it?';return;}
      feedback.textContent='Sending…'; feedback.style.color='var(--ink-soft)';
      var payload = {name:name,tag:tag,email:email,phone:phone,timestamp:new Date().toISOString()};
      try{
        // Post to backend
        await fetch('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      }catch(e){}
      try{
        // Also post to Google Sheets if URL is configured
        if(SHEETS_URL && !SHEETS_URL.includes('YOUR_DEPLOYMENT_ID')){
          await fetch(SHEETS_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        }
      }catch(e){}
      document.getElementById('joinForm').classList.add('hide');
      document.getElementById('joinSuccess').classList.add('show');
    });
  }

  // ---- Live floor status ----
  var live=document.getElementById('heroLive'), liveText=document.getElementById('heroLiveText');
  var navLive=document.getElementById('navLive'), navLiveText=document.getElementById('navLiveText');

  function demoStatus(){
    var h=new Date().getHours(),base;
    if(h>=17&&h<=23)base=0.8;else if(h>=12&&h<17)base=0.55;else if(h>=7&&h<12)base=0.3;else base=0.15;
    var frac=Math.min(0.95,Math.max(0.05,base+Math.sin(Date.now()/600000)*0.1));
    var inUse=Math.round(20*frac);
    // Generate fake PC list for demo
    var pcs=[];
    for(var i=0;i<20;i++){
      var pcNum=101+i;
      pcs.push({pc_name:'PC'+pcNum, pc_in_using: i<inUse?1:0, status: i<inUse?'InUse':'Free'});
    }
    return{inUse:inUse,total:20,available:20-inUse,pcs:pcs};
  }

  // Floor map: shows PC numbers only, NO player names
  function renderFloorMap(pcs){
    var grid=document.getElementById('floorGrid');
    var upd=document.getElementById('floorUpdate');
    if(!grid||!pcs)return;
    var sorted=pcs.slice().sort(function(a,b){return a.pc_name.localeCompare(b.pc_name,undefined,{numeric:true});});
    var half=Math.ceil(sorted.length/2);
    var leftRow=sorted.slice(0,half);
    var rightRow=sorted.slice(half);

    function makeSlot(pc){
      var busy=pc.pc_in_using===1;
      var offline=pc.status==='Offline'||pc.status==='offline';
      var cls=offline?'offline':(busy?'busy':'free');
      // Show only the PC number/name — NO player name
      var label = busy ? 'In Use' : (offline ? 'Offline' : 'Available');
      return '<div class="floor-map__slot floor-map__slot--'+cls+'" title="'+esc(pc.pc_name)+' — '+label+'">'+
        '<span class="floor-map__slot-dot"></span>'+
        '<div class="floor-map__slot-info">'+
          '<div class="floor-map__slot-name">'+esc(pc.pc_name)+'</div>'+
          '<div class="floor-map__slot-status">'+label+'</div>'+
        '</div></div>';
    }

    grid.innerHTML=
      '<div class="floor-map__row">'+leftRow.map(makeSlot).join('')+'</div>'+
      '<div class="floor-map__center-aisle"><span class="floor-map__aisle-label">Centre Aisle</span></div>'+
      '<div class="floor-map__row floor-map__row--right">'+rightRow.map(makeSlot).join('')+'</div>';
    if(upd)upd.textContent='Updated: '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  }

  // Regulars: show registered member names from iCafeCloud
  function updateRegularsFromLive(pcs){
    if(!pcs||!pcs.length) return;
    var names = pcs
      .filter(function(pc){ return pc.status_member_account && pc.status_member_account.trim(); })
      .map(function(pc){ return pc.status_member_account.trim(); });
    names = names.filter(function(n,i,a){ return a.indexOf(n)===i; });
    if(names.length > 0) buildRegularsScroller(names);
  }

  function renderLive(d){
    var state=d.available<=2?'busy':'ok';
    if(live&&liveText){
      live.dataset.state=state;
      liveText.innerHTML='<strong>'+d.inUse+'/'+d.total+'</strong> playing right now · <strong>'+d.available+'</strong> free';
    }
    // Nav live — prominent copy
    if(navLive&&navLiveText){
      navLive.dataset.state=state;
      navLiveText.textContent = d.available>0 ? d.available+(d.available===1?' RIG FREE':' RIGS FREE') : 'FLOOR FULL';
    }
    // Floor teaser on homepage
    var teaserFree=document.getElementById('floorTeaserFree');
    var teaserStatus=document.getElementById('floorTeaserStatus');
    var minimap=document.getElementById('floorMinimap');
    if(teaserFree) teaserFree.textContent=d.available;
    if(teaserStatus) teaserStatus.textContent=d.available===0?'FLOOR FULL':(d.available<=3?'ALMOST FULL':'RIGS AVAILABLE');
    if(minimap&&d.pcs){
      var srtd=d.pcs.slice().sort(function(a,b){return a.pc_name.localeCompare(b.pc_name,undefined,{numeric:true});});
      minimap.innerHTML=srtd.map(function(pc){
        var busy=pc.pc_in_using===1;
        var offline=pc.status==='Offline'||pc.status==='offline';
        var cls=offline?'offline':(busy?'busy':'free');
        return '<div class="floor-teaser__minidot floor-teaser__minidot--'+cls+'" title="'+esc(pc.pc_name)+'"></div>';
      }).join('');
    }
    if(d.pcs){
      renderFloorMap(d.pcs);
      updateRegularsFromLive(d.pcs);
    }
  }

  async function pollStatus(){
    try{
      var res=await fetch('/api/pc-status',{headers:{Accept:'application/json'}});
      if(!res.ok) throw 0;
      var d=await res.json(); renderLive(d);
    }catch(e){ renderLive(demoStatus()); }
  }
  if(live){ pollStatus(); setInterval(pollStatus,20000); }

  // ── Scroll progress bar ──────────────────────────────────────────────────
  var progressEl = document.getElementById('scrollProgress');
  if(progressEl){
    function updateProgress(){
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progressEl.style.width = (max>0 ? (window.scrollY/max*100) : 0).toFixed(1)+'%';
    }
    window.addEventListener('scroll', updateProgress, {passive:true});
    updateProgress();
  }

  // ── Parallax engine (hero bg + content + atmosphere glows) ───────────────
  (function(){
    var slides   = document.getElementById('heroSlides');
    var content  = document.querySelector('.hero__content');
    var heroVeil = document.querySelector('.hero__veil');
    var gl1 = document.querySelector('.glow-1');
    var gl2 = document.querySelector('.glow-2');
    var gl3 = document.querySelector('.glow-3');
    if(!slides) return;

    var sy=0, ticking=false;
    // Only do the work while hero is visible
    var heroEl = document.querySelector('.hero');
    var cutoff = (heroEl ? heroEl.offsetHeight : window.innerHeight) * 1.4;

    function frame(){
      if(sy > cutoff){ ticking=false; return; }
      var s = sy;
      // Background drifts up 38% as fast as page — creates depth
      slides.style.transform  = 'translateY('+(s*0.38).toFixed(1)+'px)';
      // Content floats slightly slower too (layer in front of bg, behind veil)
      if(content) content.style.transform = 'translateY('+(s*0.1).toFixed(1)+'px)';
      // Veil darkens very slightly on scroll (bg image gets less visible)
      if(heroVeil) heroVeil.style.opacity = String(Math.min(1, 1 + s * 0.0003));
      // Atmosphere glows each move independently
      if(gl1) gl1.style.transform = 'translateY('+(s*0.17).toFixed(1)+'px)';
      if(gl2) gl2.style.transform = 'translateY('+(s*0.08).toFixed(1)+'px) translateX(-160px)';
      if(gl3) gl3.style.transform = 'translateY('+(-s*0.06).toFixed(1)+'px) translateX(10%)';
      ticking=false;
    }

    window.addEventListener('scroll', function(){
      sy=window.scrollY;
      if(!ticking){ requestAnimationFrame(frame); ticking=true; }
    }, {passive:true});

    // Initial call so glows are positioned on load
    frame();
  })();

  // ── Page navigation dots (desktop sidebar) ───────────────────────────────
  (function(){
    var dots = document.querySelectorAll('.page-dot[data-section]');
    if(!dots.length) return;
    var pairs = [];
    dots.forEach(function(d){
      var sec = document.getElementById(d.getAttribute('data-section'));
      if(sec) pairs.push({sec:sec, dot:d});
    });
    if(!pairs.length) return;

    // Use IntersectionObserver with a vertical dead-band so only the
    // section that's mostly centred in the viewport gets highlighted
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        for(var i=0;i<pairs.length;i++){
          if(pairs[i].sec===e.target){
            pairs[i].dot.classList.toggle('active', e.isIntersecting);
            break;
          }
        }
      });
    }, { threshold: 0.22, rootMargin: '-15% 0px -15% 0px' });

    pairs.forEach(function(p){ io.observe(p.sec); });
  })();

})();
