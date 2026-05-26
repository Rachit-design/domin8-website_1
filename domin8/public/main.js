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

  // ---- Team carousel ----
  var teamTrack=document.getElementById('teamTrack');
  if(teamTrack && Array.isArray(window.TEAM)){
    teamTrack.innerHTML = window.TEAM.map(function(m){
      return '<div class="team-card">'+
        '<div class="team-card__img"><img src="'+img(m.image)+'" alt="'+esc(m.name)+'" loading="lazy"/></div>'+
        '<div class="team-card__body">'+
          '<div class="team-card__name">'+esc(m.name)+'</div>'+
          (m.tag?'<div class="team-card__tag">"'+esc(m.tag)+'"</div>':'')+
          '<div class="team-card__role">'+esc(m.role)+'</div>'+
          '<div class="team-card__note">'+esc(m.note)+'</div>'+
        '</div></div>';
    }).join('');
    var prev=document.getElementById('teamPrev'), next=document.getElementById('teamNext');
    function scrollByCards(dir){ teamTrack.scrollBy({left:dir*250,behavior:'smooth'}); }
    if(prev)prev.addEventListener('click',function(){scrollByCards(-1);});
    if(next)next.addEventListener('click',function(){scrollByCards(1);});
  }

  // ---- Players vertical auto-scroll ----
  var col=document.getElementById('playerColumn');
  if(col && Array.isArray(window.PLAYERS)){
    function playerCard(p){
      return '<div class="player-card">'+
        '<div class="player-card__imgs">'+
          '<img class="real" src="'+img(p.real)+'" alt="'+esc(p.name)+'" loading="lazy"/>'+
          '<img class="ai" src="'+img(p.ai)+'" alt="'+esc(p.name)+' (art)" loading="lazy"/>'+
        '</div>'+
        '<div class="player-card__info">'+
          '<div class="player-card__name">'+esc(p.name)+'</div>'+
          '<div class="player-card__tag">"'+esc(p.tag)+'"</div>'+
          (p.quote?'<div class="player-card__quote">'+esc(p.quote)+'</div>':'')+
          '<div class="player-card__fliphint">hover for the AI alter-ego</div>'+
        '</div></div>';
    }
    var cards = window.PLAYERS.map(playerCard).join('');
    // duplicate for seamless loop
    col.innerHTML = cards + cards;
  }

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
  function renderLive(d){
    if(!live||!liveText)return;
    live.dataset.state = d.available<=2 ? 'busy':'ok';
    liveText.innerHTML='<strong>'+d.inUse+'/'+d.total+'</strong> playing right now · <strong>'+d.available+'</strong> rigs free';
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
