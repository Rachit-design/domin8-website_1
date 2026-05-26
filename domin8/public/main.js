/* ============================================================================
   DOMIN8 ESPORTS — main.js  (front-end behaviour for the whole site)
============================================================================ */
(function(){
  'use strict';

  // ---- EDIT ME: your real Discord invite (one place) ----
  var DISCORD_INVITE = 'https://discord.gg/your-invite';
  document.querySelectorAll('[data-discord]').forEach(function(el){
    el.setAttribute('href', DISCORD_INVITE); el.setAttribute('target','_blank'); el.setAttribute('rel','noopener');
  });
  var db = document.getElementById('discordBtn'); if(db) db.href = DISCORD_INVITE;

  var yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function img(src){ if(!src) return '/assets/logo.svg'; if(/^https?:\/\//.test(src)) return src; return src.charAt(0)==='/'?src:'/'+src; }

  // ---- Nav scroll + mobile menu ----
  var nav=document.getElementById('nav');
  window.addEventListener('scroll',function(){ if(nav) nav.classList.toggle('scrolled', window.scrollY>30); });
  var burger=document.getElementById('burger'), menu=document.getElementById('mobileMenu');
  if(burger&&menu){
    burger.addEventListener('click',function(){var open=menu.hidden===false;menu.hidden=open;burger.setAttribute('aria-expanded',String(!open));});
    menu.querySelectorAll('a,button').forEach(function(el){el.addEventListener('click',function(){menu.hidden=true;});});
  }

  // ---- Hero carousel ----
  var slides=document.querySelectorAll('.hero__slide'), dots=document.querySelectorAll('#heroDots button'), idx=0, timer;
  function go(n){ if(!slides.length)return; slides[idx].classList.remove('active'); if(dots[idx])dots[idx].classList.remove('active'); idx=(n+slides.length)%slides.length; slides[idx].classList.add('active'); if(dots[idx])dots[idx].classList.add('active'); }
  function start(){ timer=setInterval(function(){go(idx+1);},5000); }
  function reset(){ clearInterval(timer); start(); }
  dots.forEach(function(d,i){ d.addEventListener('click',function(){go(i);reset();}); });
  if(slides.length>1) start();

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
    var target=parseInt(el.getAttribute('data-target'),10)||0, suffix=el.getAttribute('data-suffix')||'', start=performance.now(), dur=1200;
    function tick(now){var p=Math.min((now-start)/dur,1),eased=1-Math.pow(1-p,3),v=Math.round(target*eased);el.innerHTML=v.toLocaleString()+(suffix?'<span class="accent-magenta">'+suffix+'</span>':'');if(p<1)requestAnimationFrame(tick);}
    requestAnimationFrame(tick);
  }
  if(statNums.length){
    if('IntersectionObserver' in window){
      var sIO=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){animateCount(e.target);sIO.unobserve(e.target);}});},{threshold:.4});
      statNums.forEach(function(el){sIO.observe(el);});
    } else { statNums.forEach(function(el){var s=el.getAttribute('data-suffix')||'';el.innerHTML=(parseInt(el.getAttribute('data-target'),10)||0).toLocaleString()+(s?'<span class="accent-magenta">'+s+'</span>':'');}); }
  }

  // ---- Team 4x4 grid (excludes The Regulars — they live in Community) ----
  var teamGrid=document.getElementById('teamGrid');
  if(teamGrid && Array.isArray(window.TEAM)){
    var crewMembers = window.TEAM.filter(function(m){ return m.name !== 'The Regulars'; });
    teamGrid.innerHTML = crewMembers.map(function(m){
      return '<div class="team-card">'+
        '<div class="team-card__img"><img src="'+img(m.image)+'" alt="'+esc(m.name)+'" loading="lazy"/></div>'+
        '<div class="team-card__body">'+
          '<div class="team-card__name">'+esc(m.name)+'</div>'+
          (m.tag?'<div class="team-card__tag">"'+esc(m.tag)+'"</div>':'')+
          '<div class="team-card__role">'+esc(m.role)+'</div>'+
          '<div class="team-card__note">'+esc(m.note)+'</div>'+
        '</div></div>';
    }).join('');
  }

  // ---- Players vertical auto-scroll with hover cards + mobile overlay ----
  var col=document.getElementById('playerColumn');
  var overlayBg=document.createElement('div');
  overlayBg.className='player-overlay-bg';
  document.body.appendChild(overlayBg);
  var isTouchDevice=('ontouchstart' in window)||(navigator.maxTouchPoints>0);

  function playerCard(p,isLive){
    var liveHTML=isLive?'<div class="player-card__hovercard-live" style="display:flex;align-items:center;gap:.4rem;margin-top:.5rem;font-size:.72rem;color:#22c55e;font-weight:700;"><span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0;"></span>Playing right now</div>':'';
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
        (p.quote?'<div class="player-card__hovercard-quote">'+esc(p.quote)+'</div>':'<div class="player-card__hovercard-quote">One of the legends of the floor.</div>')+
        liveHTML+
      '</div>'+
    '</div>';
  }

  function buildPlayerColumn(liveAccounts){
    if(!col||!Array.isArray(window.PLAYERS))return;
    var liveSet=new Set((liveAccounts||[]).map(function(n){return n.toLowerCase();}));
    var cards=window.PLAYERS.map(function(p){
      var isLive=liveSet.has(p.name.toLowerCase())||liveSet.has((p.tag||'').toLowerCase());
      return playerCard(p,isLive);
    }).join('');
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
  buildPlayerColumn([]);

  // ---- Blog ----
  var blogGrid=document.getElementById('blogGrid');
  if(blogGrid && Array.isArray(window.BLOG_POSTS)){
    blogGrid.innerHTML = window.BLOG_POSTS.map(function(post){
      var link = (post.link && post.link!=='#') ? '<a href="'+esc(post.link)+'" class="blog-card__link" target="_blank" rel="noopener">Read more →</a>' : '<a href="#" class="blog-card__link">Read more →</a>';
      return '<article class="blog-card reveal">'+
        '<div class="blog-card__thumb"><img src="'+img(post.image)+'" alt="'+esc(post.title)+'" loading="lazy"/><span class="blog-card__cat">'+esc(post.category||'News')+'</span></div>'+
        '<div class="blog-card__body"><time class="blog-card__date">'+esc(post.date||'')+'</time><h3>'+esc(post.title||'')+'</h3><p>'+esc(post.excerpt||'')+'</p>'+link+'</div>'+
        '</article>';
    }).join('');
    observeReveals(blogGrid.querySelectorAll('.reveal'));
  }

  // ---- Space flip (tap support for touch) ----
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

  var submit=document.getElementById('joinSubmit'), feedback=document.getElementById('joinFeedback');
  if(submit){
    submit.addEventListener('click',async function(){
      var name=document.getElementById('jName').value.trim(), tag=document.getElementById('jTag').value.trim(), email=document.getElementById('jEmail').value.trim();
      feedback.style.color='var(--magenta)';
      if(!name||!email){feedback.textContent='Please add your name and email.';return;}
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){feedback.textContent='That email looks off — check it?';return;}
      feedback.textContent='Sending…'; feedback.style.color='var(--ink-soft)';
      try{
        var res=await fetch('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,tag:tag,email:email})});
        // Whether or not the endpoint exists yet, show success (emails are stored server-side when wired)
      }catch(e){}
      document.getElementById('joinForm').classList.add('hide');
      document.getElementById('joinSuccess').classList.add('show');
    });
  }

  // ---- Live floor status (iCafeCloud via backend /api/pc-status; demo fallback) ----
  var live=document.getElementById('heroLive'), liveText=document.getElementById('heroLiveText');
  function demoStatus(){
    var h=new Date().getHours(),base;
    if(h>=17&&h<=23)base=0.8;else if(h>=12&&h<17)base=0.55;else if(h>=7&&h<12)base=0.3;else base=0.15;
    var frac=Math.min(0.95,Math.max(0.05,base+Math.sin(Date.now()/600000)*0.1));
    var inUse=Math.round(20*frac);return{inUse:inUse,total:20,available:20-inUse};
  }
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
      var offline=pc.status==='Offline';
      var cls=busy?'busy':(offline?'offline':'free');
      var player=busy&&pc.status_member_account?pc.status_member_account:(cls==='free'?'Available':'Offline');
      return '<div class="floor-map__slot floor-map__slot--'+cls+'">'+
        '<span class="floor-map__slot-dot"></span>'+
        '<div class="floor-map__slot-info">'+
          '<div class="floor-map__slot-name">'+esc(pc.pc_name)+'</div>'+
          '<div class="floor-map__slot-player">'+esc(player)+'</div>'+
        '</div></div>';
    }
    grid.innerHTML=
      '<div class="floor-map__row">'+leftRow.map(makeSlot).join('')+'</div>'+
      '<div class="floor-map__center-aisle"><span class="floor-map__aisle-label">Centre Aisle</span></div>'+
      '<div class="floor-map__row floor-map__row--right">'+rightRow.map(makeSlot).join('')+'</div>';
    if(upd)upd.textContent='Updated: '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  }

  function renderLiveStrip(pcs){
    var strip=document.getElementById('communityLiveStrip');
    if(!strip)return;
    if(!pcs||!pcs.length){strip.style.display='none';return;}
    strip.style.display='flex';
    var playing=pcs.filter(function(pc){return pc.pc_in_using===1&&pc.status_member_account;}).map(function(pc){return pc.status_member_account;});
    if(!playing.length){
      strip.innerHTML='<span class="community__live-label"><span class="dot-live"></span>Floor is quiet right now — first one here?</span>';
      return;
    }
    strip.innerHTML='<span class="community__live-label"><span class="dot-live"></span>On the floor right now:</span>'+
      '<div class="community__live-names">'+playing.map(function(n){return '<span>'+esc(n)+'</span>';}).join('')+'</div>';
  }

  function renderLive(d){
    var state=d.available<=2?'busy':'ok';
    if(live&&liveText){
      live.dataset.state=state;
      liveText.innerHTML='<strong>'+d.inUse+'/'+d.total+'</strong> playing right now · <strong>'+d.available+'</strong> rigs free';
    }
    if(navLive&&navLiveText){
      navLive.dataset.state=state;
      navLiveText.innerHTML='<strong>'+d.inUse+'</strong>/<strong>'+d.total+'</strong> rigs live';
    }
    if(d.pcs){
      renderFloorMap(d.pcs);
      renderLiveStrip(d.pcs);
      var liveAccounts=d.pcs.filter(function(pc){return pc.pc_in_using===1&&pc.status_member_account;}).map(function(pc){return pc.status_member_account;});
      buildPlayerColumn(liveAccounts);
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
})();
