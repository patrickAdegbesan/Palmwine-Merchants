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

// Gallery horizontal slider (scroll-snap + arrows + auto-slide)
(function(){
  const wrap = document.querySelector('#gallery .gallery-wrap');
  if (!wrap) return;
  const grid = wrap.querySelector('.gallery-grid');
  const btnPrev = wrap.querySelector('.gal-prev');
  const btnNext = wrap.querySelector('.gal-next');
  const dotsEl = wrap.querySelector('.gal-dots');

  function cardStep(){
    const card = grid.querySelector('.card');
    if (!card) return 260;
    const styles = window.getComputedStyle(grid);
    const gap = parseInt(styles.columnGap || styles.gap || '16', 10) || 16;
    const rect = card.getBoundingClientRect();
    return rect.width + gap;
  }
  // Clone edges for infinite feel
  const originalCards = Array.from(grid.querySelectorAll('.card'));
  const ORIGINAL_COUNT = originalCards.length;
  // Tag originals with stable indices for lightbox mapping
  originalCards.forEach((c, i)=> c.setAttribute('data-idx', String(i)));
  function setupClones(){
    // Don't duplicate if already cloned
    if (grid.querySelector('[data-clone]')) return;
    const step = cardStep();
    const visible = Math.max(1, Math.ceil(grid.clientWidth / step));
    // Clone first N to end
    for (let i = 0; i < visible; i++){
      const c = originalCards[i].cloneNode(true);
      c.setAttribute('data-clone','end');
      grid.appendChild(c);
    }
    // Clone last N to start (preserve order)
    for (let i = 0; i < visible; i++){
      const src = originalCards[ORIGINAL_COUNT - 1 - i].cloneNode(true);
      src.setAttribute('data-clone','start');
      grid.insertBefore(src, grid.firstChild);
    }
    // Jump to first real item
    requestAnimationFrame(()=>{
      grid.scrollLeft = step * visible;
    });
    // Ensure all cards (including clones) are keyboard focusable
    grid.querySelectorAll('.card').forEach(c=> c.tabIndex = 0);

    // Build dots once (for originals only)
    if (dotsEl && !dotsEl.childElementCount){
      for (let i = 0; i < ORIGINAL_COUNT; i++){
        const b = document.createElement('button');
        b.className = 'dot';
        b.setAttribute('role','tab');
        b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        b.setAttribute('aria-label', `Go to slide ${i+1}`);
        b.addEventListener('click', ()=>{
          stopAuto();
          const stepNow = cardStep();
          const visNow = Math.max(1, Math.ceil(grid.clientWidth / stepNow));
          grid.scrollTo({ left: stepNow * (visNow + i), behavior: 'smooth' });
        });
        dotsEl.appendChild(b);
      }
    }
  }
  setupClones();
  window.addEventListener('resize', ()=>{
    // Recalculate starting offset after resize
    const step = cardStep();
    const visible = Math.max(1, Math.ceil(grid.clientWidth / step));
    grid.scrollLeft = step * visible;
  });

  function scrollByCards(n){
    grid.scrollBy({ left: n * cardStep(), behavior: 'smooth' });
  }
  btnPrev && btnPrev.addEventListener('click', ()=> scrollByCards(-1));
  btnNext && btnNext.addEventListener('click', ()=> scrollByCards(1));

  // Keyboard support when grid is focused
  grid.tabIndex = 0;
  grid.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByCards(-1); stopAuto(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCards(1); stopAuto(); }
  });

  // Auto-slide with pause on hover/touch/keyboard interaction
  let autoId = 0;
  const INTERVAL = 2500;
  function startAuto(){
    stopAuto();
    autoId = setInterval(()=>{ scrollByCards(1); }, INTERVAL);
  }
  function stopAuto(){ if (autoId) { clearInterval(autoId); autoId = 0; } }

  grid.addEventListener('mouseenter', stopAuto);
  grid.addEventListener('mouseleave', startAuto);
  grid.addEventListener('touchstart', stopAuto, { passive: true });
  grid.addEventListener('focusin', stopAuto);
  grid.addEventListener('focusout', startAuto);

  // Kick off
  startAuto();

  // Seamless wrap when reaching clones
  let isJumping = false;
  grid.addEventListener('scroll', ()=>{
    if (isJumping) return;
    const step = cardStep();
    const visible = Math.max(1, Math.ceil(grid.clientWidth / step));
    const start = step * (visible - 0.5); // threshold toward the left clones
    const end = step * (visible + ORIGINAL_COUNT - 0.5); // threshold toward the right clones
    const x = grid.scrollLeft;
    if (x < start){
      // Jump forward by one original span
      isJumping = true;
      grid.scrollTo({ left: x + step * ORIGINAL_COUNT, behavior: 'auto' });
      isJumping = false;
    } else if (x > end){
      // Jump back by one original span
      isJumping = true;
      grid.scrollTo({ left: x - step * ORIGINAL_COUNT, behavior: 'auto' });
      isJumping = false;
    }
    // Update dots to reflect nearest original index
    if (dotsEl && dotsEl.childElementCount){
      const rel = (x - step * visible) / step; // relative to first original
      let active = Math.round(rel);
      active = ((active % ORIGINAL_COUNT) + ORIGINAL_COUNT) % ORIGINAL_COUNT; // normalize
      Array.from(dotsEl.children).forEach((dot, i)=>{
        dot.setAttribute('aria-selected', i === active ? 'true' : 'false');
      });
    }
  }, { passive: true });
})();

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

// Rotate hero background using banner images
const heroImages = [
  'img/banner.jpg',
  'img/banner3.jpg',
  'img/banner2.jpg',
  'img/banner3.jpeg',
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
  // Marquee setup: duplicate row and set duration based on content width
  const row = announce.querySelector('.announce-row');
  const scroller = announce.querySelector('.announce-scroller');
  const text = announce.querySelector('.announce-text');
  if (row && scroller && text){
    // Shorten text on very small screens
    const mq480 = window.matchMedia('(max-width: 480px)');
    function applyShort(){
      const short = text.getAttribute('data-short');
      if (mq480.matches && short){ text.dataset.full = text.textContent; text.textContent = short; }
      else if (text.dataset.full){ text.textContent = text.dataset.full; delete text.dataset.full; }
      requestAnimationFrame(applySmallMode);
    }
    mq480.addEventListener('change', applyShort);
    applyShort();

    // Only enable marquee cloning/measurement on small screens
    const mq720 = window.matchMedia('(max-width: 720px)');
    function ensureClone(){
      if (!row.nextElementSibling){
        const clone = row.cloneNode(true);
        scroller.appendChild(clone);
      }
    }
    function removeClones(){
      while (row.nextElementSibling){ scroller.removeChild(row.nextElementSibling); }
      scroller.style.removeProperty('--marquee-width');
      scroller.style.removeProperty('--marquee-duration');
    }
    function measureAndAnimate(){
      const totalWidth = Array.from(scroller.children).reduce((w, el)=> w + el.getBoundingClientRect().width + 48, 0);
      const pxPerSec = 120; // speed
      const duration = Math.max(10, Math.round(totalWidth / pxPerSec));
      scroller.style.setProperty('--marquee-width', totalWidth + 'px');
      scroller.style.setProperty('--marquee-duration', duration + 's');
    }
    function applySmallMode(){
      if (mq720.matches){
        ensureClone();
        requestAnimationFrame(measureAndAnimate);
      } else {
        removeClones();
      }
    }
    mq720.addEventListener('change', applySmallMode);
    window.addEventListener('resize', ()=> requestAnimationFrame(()=> mq720.matches && measureAndAnimate()));
    applySmallMode();
  }
}

// Lightbox for gallery (delegated to support cloned slider cards)
(function(){
  const grid = document.querySelector('#gallery .gallery-grid');
  const lb = document.getElementById('lightbox');
  if (!grid || !lb) return;

  const imgEl = lb.querySelector('.lb-img');
  const capEl = lb.querySelector('.lb-cap');
  const vidEl = lb.querySelector('.lb-video');
  const btnPrev = lb.querySelector('.lb-prev');
  const btnNext = lb.querySelector('.lb-next');
  const btnClose = lb.querySelector('.lb-close');

  let idx = 0;
  // Build items from originals only (exclude clones)
  const origCards = Array.from(document.querySelectorAll('#gallery .gallery-grid .card:not([data-clone])'));
  const items = origCards.map(card => {
    const img = card.querySelector('img');
    const cap = card.querySelector('figcaption');
    const video = card.getAttribute('data-video');
    return { src: img.getAttribute('src'), alt: img.getAttribute('alt')||'', cap: cap? cap.textContent: '', video: video || null };
  });

  function show(i){
    idx = (i + items.length) % items.length;
    const it = items[idx];
    capEl.textContent = it.cap || '';

    // Reset media elements
    if (vidEl) {
      vidEl.pause();
      vidEl.removeAttribute('src');
      vidEl.load();
      vidEl.style.display = 'none';
    }
    imgEl.style.display = 'none';

    if (it.video) {
      // Show video
      if (vidEl) {
        vidEl.style.display = 'block';
        vidEl.setAttribute('src', it.video);
        vidEl.addEventListener('loadedmetadata', () => {
          try { vidEl.play(); } catch {}
        }, { once: true });
      }
    } else {
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
      imgEl.style.display = 'block';
      // Preload neighbors (images only) for snappier nav
      const nxt = items[(idx+1)%items.length];
      const prv = items[(idx-1+items.length)%items.length];
      if (!nxt.video){ const pre1 = new Image(); pre1.src = nxt.src; }
      if (!prv.video){ const pre2 = new Image(); pre2.src = prv.src; }
    }
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
    if (vidEl) { vidEl.pause(); vidEl.removeAttribute('src'); vidEl.load(); }
  }
  function prev(){ show(idx - 1); }
  function next(){ show(idx + 1); }

  // Delegated open for both originals and clones using data-idx
  grid.addEventListener('click', (e)=>{
    const card = e.target.closest('.card');
    if (!card) return;
    const i = Number(card.getAttribute('data-idx'));
    if (Number.isFinite(i)) open(i);
  });
  grid.addEventListener('keydown', (e)=>{
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card');
    if (!card) return;
    const i = Number(card.getAttribute('data-idx'));
    if (Number.isFinite(i)) { e.preventDefault(); open(i); }
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
