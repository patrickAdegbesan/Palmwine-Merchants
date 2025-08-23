// Palmwine Merchants & Flames — Scripts
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const yearEl = document.querySelector('#year');
const heroEl = document.querySelector('.hero');
const waveEl = document.querySelector('#wave');
// night mode toggle removed per user preference
const announce = document.querySelector('#announce');

if (yearEl) yearEl.textContent = new Date().getFullYear();

// Mobile menu
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

function handleInquiry(e){
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  console.log('Inquiry submitted', data);
  alert('Thanks! We\'ve received your inquiry. We\'ll reply shortly.');
  form.reset();
  return false;
}

// Smooth scrolling for internal links
for (const a of document.querySelectorAll('a[href^="#"]')){
  a.addEventListener('click', (e)=>{
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if(el){
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth'});
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded','false');
    }
  });
}

// Rotate hero background using event photos (beachy, lively)
const heroImages = [
  'img/event1.png',
  'img/event2.png',
  'img/event3.png',
  'img/event4.png',
  'img/event5.png',
];

// Preload
heroImages.forEach(src => { const i = new Image(); i.src = src; });

let heroIdx = 0;
function setHero(idx){
  if(!heroEl) return;
  const src = heroImages[idx % heroImages.length];
  heroEl.style.backgroundImage = `linear-gradient(135deg, rgba(0,0,0,.45), rgba(0,0,0,.25)), url('${src}')`;
}
setHero(heroIdx);

setInterval(()=>{
  heroIdx = (heroIdx + 1) % heroImages.length;
  setHero(heroIdx);
}, 5000); // change every 5s

// Parallax on scroll for hero and wave
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (heroEl) heroEl.style.backgroundPosition = `center ${-y * 0.15}px`;
  if (waveEl) waveEl.style.transform = `translateY(${y * 0.05}px)`;
});

// (night mode removed)

// Announcement close
if (announce){
  const closeBtn = announce.querySelector('.announce-close');
  if (closeBtn){
    closeBtn.addEventListener('click', ()=> announce.remove());
  }
}

// Lightbox for gallery
(function(){
  const cards = Array.from(document.querySelectorAll('.gallery-grid .card'));
  const lb = document.getElementById('lightbox');
  if (!cards.length || !lb) return;

  const imgEl = lb.querySelector('.lb-img');
  const capEl = lb.querySelector('.lb-cap');
  const btnPrev = lb.querySelector('.lb-prev');
  const btnNext = lb.querySelector('.lb-next');
  const btnClose = lb.querySelector('.lb-close');

  let idx = 0;
  const items = cards.map(card => {
    const img = card.querySelector('img');
    const cap = card.querySelector('figcaption');
    return { src: img.getAttribute('src'), alt: img.getAttribute('alt')||'', cap: cap? cap.textContent: '' };
  });

  function show(i){
    idx = (i + items.length) % items.length;
    const it = items[idx];
    // Fade out current image, then swap and fade in when loaded
    imgEl.classList.add('is-fading');
    const nextSrc = it.src;
    const nextAlt = it.alt;
    const onLoad = () => {
      requestAnimationFrame(()=>{
        imgEl.classList.remove('is-fading');
        imgEl.removeEventListener('load', onLoad);
      });
    };
    imgEl.addEventListener('load', onLoad);
    imgEl.alt = nextAlt;
    imgEl.src = nextSrc;
    capEl.textContent = it.cap || '';
    // Preload neighbors for snappier nav
    const nxt = new Image(); nxt.src = items[(idx+1)%items.length].src;
    const prv = new Image(); prv.src = items[(idx-1+items.length)%items.length].src;
  }
  function open(i){
    show(i);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden','false');
    // lock scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  function close(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }
  function prev(){ show(idx - 1); }
  function next(){ show(idx + 1); }

  cards.forEach((card, i)=>{
    card.style.cursor = 'zoom-in';
    card.addEventListener('click', ()=> open(i));
    card.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(i); }
    });
    card.tabIndex = 0; // make focusable
  });

  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);
  btnClose.addEventListener('click', close);
  lb.addEventListener('click', (e)=>{ if(e.target === lb) close(); });

  window.addEventListener('keydown', (e)=>{
    if(!lb.classList.contains('open')) return;
    if(e.key === 'Escape') close();
    else if(e.key === 'ArrowLeft') prev();
    else if(e.key === 'ArrowRight') next();
  });

  // Touch swipe (left/right)
  let tStartX=0, tStartY=0, tStartT=0, moved=false;
  const SWIPE_THRESH = 40; // px
  const ANGLE_LIMIT = 30;  // deg from horizontal

  lb.addEventListener('touchstart', (e)=>{
    if(!lb.classList.contains('open')) return;
    const t = e.changedTouches[0];
    tStartX = t.clientX; tStartY = t.clientY; tStartT = Date.now(); moved=false;
  }, {passive:true});

  lb.addEventListener('touchmove', (e)=>{
    if(!lb.classList.contains('open')) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStartX; const dy = t.clientY - tStartY;
    const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
    if (Math.abs(dx) > 8 && angle < ANGLE_LIMIT){
      // horizontal swipe in progress -> prevent background scroll
      e.preventDefault();
      moved = true;
    }
  }, {passive:false});

  lb.addEventListener('touchend', (e)=>{
    if(!lb.classList.contains('open')) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStartX; const dy = t.clientY - tStartY;
    const dt = Date.now() - tStartT;
    const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
    if (moved && Math.abs(dx) > SWIPE_THRESH && angle < ANGLE_LIMIT){
      if (dx < 0) next(); else prev();
    }
  }, {passive:true});
})();
