/* ============================================================================
   DOMIN8 ESPORTS — main.js
============================================================================ */
(function(){
  'use strict';

  // ---- EDIT ME: your real Discord invite ----
  var DISCORD_INVITE = 'https://discord.gg/your-invite';
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

  // ---- Brand logo animation (old fades/morphs into new on scroll into view) ----
  var brandJourney = document.querySelector('.brand-journey');
  if(brandJourney){
    if('IntersectionObserver' in window){
      var brandIO = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(e.isIntersecting){
            brandJourney.classList.remove('brand-journey--play');
            void brandJourney.offsetWidth;
            brandJourney.classList.add('brand-journey--play');
          } else {
            brandJourney.classList.remove('brand-journey--play');
          }
        });
      },{threshold:.55});
      brandIO.observe(brandJourney);
    } else {
      brandJourney.classList.add('brand-journey--play');
    }
  }

  // ---- Team grid ----
  var teamGrid=document.getElementById('teamGrid');
  if(teamGrid && Array.isArray(window.TEAM)){
    teamGrid.innerHTML = window.TEAM.map(function(m){
      if(m.name === 'The Regulars'){
        return '<div class="team-card team-card--regulars">'+
          '<div class="team-card__body">'+
            '<div class="team-card__name">Our People</div>'+
            '<div class="team-card__tag">"The faces you see every day"</div>'+
            '<div class="team-card__role">Community</div>'+
            '<div class="team-card__note">Live names from the cafe, shuffled every time the site opens.</div>'+
            '<div class="crew-regulars__scroller"><div class="crew-regulars__track" id="crewRegularsTrack"></div></div>'+
          '</div></div>';
      }
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

  // ---- Community Regulars auto-scroll (names from iCafeCloud) ----
  function buildRegularsScroller(names){
    var track = document.getElementById('regularsTrack');
    if(!track) return;
    if(!names || !names.length){
      // Demo names when no live data
      names = ['GhostByte','NeonRaider','CryptoKill','FragLord','ZeroRecoil','ShadowSnipe','RedBull99','IceViper','SteelPulse','DarkFrag','VoltStrike','GlitchHunter','PixelWar','CodeBreaker','NightOwl','RushB','FlashPoint','SmokeStack','EchoSix','ThunderFist'];
    }
    names = names.slice().sort(function(){ return Math.random() - 0.5; });
    // Duplicate for seamless loop
    var all = names.concat(names).concat(names);
    var html = all.map(function(n){
      return '<div class="regulars__chip"><span class="regulars__dot"></span>'+esc(n)+'</div>';
    }).join('');
    track.innerHTML = html;
    var crewTrack = document.getElementById('crewRegularsTrack');
    if(crewTrack) crewTrack.innerHTML = html;
    // Set animation duration based on count
    var dur = Math.max(20, names.length * 2);
    track.style.animationDuration = dur + 's';
    if(crewTrack) crewTrack.style.animationDuration = Math.max(16, names.length * 1.4) + 's';
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

  var submit=document.getElementById('joinSubmit'), feedback=document.getElementById('joinFeedback');
  if(submit){
    submit.addEventListener('click',async function(){
      var name=document.getElementById('jName').value.trim(), tag=document.getElementById('jTag').value.trim(), email=document.getElementById('jEmail').value.trim();
      feedback.style.color='var(--magenta)';
      if(!name||!email){feedback.textContent='Please add your name and email.';return;}
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){feedback.textContent='That email looks off — check it?';return;}
      feedback.textContent='Sending…'; feedback.style.color='var(--ink-soft)';
      try{ await fetch('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,tag:tag,email:email})}); }catch(e){}
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

  // Regulars scroller: show registered member names from iCafeCloud (no "who's playing" live strip)
  function updateRegularsFromLive(pcs){
    if(!pcs||!pcs.length) return;
    // Get all registered account names (both in-use and available sessions)
    var names = pcs
      .filter(function(pc){ return pc.status_member_account && pc.status_member_account.trim(); })
      .map(function(pc){ return pc.status_member_account.trim(); });
    // Dedupe
    names = names.filter(function(n,i,a){ return a.indexOf(n)===i; });
    if(names.length > 0) buildRegularsScroller(names);
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

})();
