// Palmwine Merchants & Flames — Scripts
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
// Missing DOM refs (prevent ReferenceErrors)
const siteHeader = document.querySelector('.site-header');
const heroEl = document.querySelector('.hero');
const waveEl = document.getElementById('wave');
const announce = document.getElementById('announce');

// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Simple scroll-up animations
document.addEventListener('DOMContentLoaded', function() {
  // Add scroll-up class to sections and cards
  const elementsToAnimate = document.querySelectorAll('.section, .card, .testimonial, .footer-section');
  elementsToAnimate.forEach(el => {
    el.classList.add('scroll-up');
  });

  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // Observe all elements with scroll-up class
  document.querySelectorAll('.scroll-up').forEach(el => {
    observer.observe(el);
  });
});

// Mobile menu
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

// Active nav item based on current page
(function(){
  if (!siteNav) return;
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  let set = false;
  siteNav.querySelectorAll('a:not(.cta)').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    const url = new URL(href, location.href);
    const file = (url.pathname.split('/').pop() || '').toLowerCase();
    if (!set && file && file === current){
      a.setAttribute('aria-current','page');
      a.classList.add('active');
      set = true;
    }
  });
})();

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

function toWhatsAppLink(text, number){
  const wa = String(number || '2348039490349').replace(/[^\d]/g,'');
  return `https://wa.me/${wa}?text=${encodeURIComponent(text||'')}`;
}

// Smooth scrolling for internal links
for (const a of document.querySelectorAll('a[href^="#"]')){
  a.addEventListener('click', (e)=>{
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if(el){
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth'});
      if (siteNav) siteNav.classList.remove('open');
      if (navToggle) navToggle.setAttribute('aria-expanded','false');
    }
  });
}

// Rotate hero background using banner images
const heroImages = [
  'img/home_banner.jpg',
  'img/home_banner2.jpg',
  'img/home_banner3.jpg',
  'img/home_banner4.jpg',
  'img/home_banner5.jpg',
  'img/home_banner6.jpg',
  'img/home_banner7.jpg',
];

// Preload
heroImages.forEach(src => { const i = new Image(); i.src = src; });

let heroIdx = 0;
// Optional focal positions per image (tweak per asset as needed)
// Desktop/tablet defaults
const heroPositions = [
  'center 50%', // home_banner.jpg
  'center 100%', // home_banner2.jpg
  'center 100%', // home_banner3 .jpg
  'center 100%', // home_banner4.jpg
];
// Mobile-specific focal positions (elevate focus slightly to avoid cutting heads)
const heroPositionsMobile = [
  'center 70%', // home_banner.jpg
  'center 70%', // home_banner2.jpg
  'center 70%', // home_banner3.jpg
  'center 70%', // home_banner4.jpg
];

// Track base X and Y from the chosen background-position for parallax calculations
let heroBaseX = 'center';
let heroBaseYPercent = 50; // default fallback
const mqHeroMobile = window.matchMedia('(max-width: 700px)');

function pickHeroPosition(i){
  const arr = mqHeroMobile.matches ? heroPositionsMobile : heroPositions;
  return arr[i] || 'center 50%';
}

function parseBaseYPercent(pos){
  // Accept forms like 'center 80%' or '50% 80%'; extract the last percentage number
  if (!pos || typeof pos !== 'string') return 50;
  const m = pos.match(/([\d.]+)%(?=[^%]*$)/); // last % value
  return m ? Math.max(0, Math.min(100, parseFloat(m[1]))) : 50;
}

function parseBaseX(pos){
  if (!pos || typeof pos !== 'string') return 'center';
  // Take the first token as X (e.g., 'left', 'center', 'right', '50%')
  const t = pos.trim().split(/\s+/)[0];
  return t || 'center';
}

function setHero(idx){
  if(!heroEl) return;
  const i = idx % heroImages.length;
  const src = heroImages[i];
  // Move readability overlays to CSS (.hero::before). Only set the image here.
  heroEl.style.backgroundImage = `url('${src}')`;
  const basePos = pickHeroPosition(i);
  heroBaseX = parseBaseX(basePos);
  heroBaseYPercent = parseBaseYPercent(basePos);
  // Apply once (scroll handler adds dynamic offset)
  heroEl.style.backgroundPosition = basePos;
  updateHeroParallax();
}
setHero(heroIdx);

setInterval(()=>{
  heroIdx = (heroIdx + 1) % heroImages.length;
  setHero(heroIdx);
}, 5000); // change every 5s

// Parallax on scroll for hero and wave — respect base focal position
function updateHeroParallax(){
  if (!heroEl) return;
  const y = window.scrollY || 0;
  // Keep X centered; offset Y around the base percentage for subtle parallax
  heroEl.style.backgroundPosition = `${heroBaseX} calc(${heroBaseYPercent}% + ${-y * 0.15}px)`;
}

window.addEventListener('scroll', () => {
  updateHeroParallax();
  const y = window.scrollY;
  if (waveEl) waveEl.style.transform = `translateY(${y * 0.05}px)`;
  if (siteHeader) siteHeader.classList.toggle('scrolled', y > 6);
});

// Re-apply hero when viewport breakpoint changes to pick mobile/desktop focal points
if (mqHeroMobile && typeof mqHeroMobile.addEventListener === 'function'){
  mqHeroMobile.addEventListener('change', () => { setHero(heroIdx); });
} else if (mqHeroMobile && typeof mqHeroMobile.addListener === 'function') {
  // Safari/older browsers
  mqHeroMobile.addListener(() => { setHero(heroIdx); });
}

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

// Booking quote + invoice generation (runs only on booking.html)
(function(){
  const form = document.getElementById('quote-form');
  if (!form) return; // not on booking page

  // Business config (adjust as needed)
  const BUSINESS = {
    name: 'Palmwine Merchants & Flames',
    waNumber: '2348039490349',
    taxRate: 0.075,       // 7.5% VAT (adjust to your policy)
    depositRate: 0.5,     // 50% deposit due
    delivery: { baseFreeKm: 5, perKm: 1500 }
  };

  // Pricing template (example defaults — tweak to your offerings)
  const PRICING = {
    packages: {
      palmwine: { label: 'Palmwine Service', baseFee: 100_000, perGuest: 1_500 },
      flame:    { label: 'Open‑Flame Cuisine', baseFee: 180_000, perGuest: 3_500 },
      full:     { label: 'Full Experience', baseFee: 250_000, perGuest: 4_500 },
    },
    addons: {
      cocktails_bar:   { label: 'Palmwine Cocktails Bar', baseFee: 50_000, perGuest: 1_000 },
      grill_station:   { label: 'Grill Station', baseFee: 60_000, perGuest: 1_500 },
      dj:              { label: 'DJ', flat: 80_000 },
      decor:           { label: 'Decor', flat: 60_000 },
      custom_bottling: { label: 'Custom Bottling', perGuest: 500 },
      ice_cups:        { label: 'Ice + Cups', baseFee: 15_000, perGuest: 200 },
      generator:       { label: 'Generator', flat: 70_000 },
    }
  };

  const moneyFmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
  const NGN = (n)=> moneyFmt.format(Math.round(n||0));

  function uniqueQuoteId(){
    const d = new Date();
    const pad = (n)=> String(n).padStart(2,'0');
    const date = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    const rnd = Math.floor(1000 + Math.random()*9000);
    return `PMF-${date}-${rnd}`;
  }

  // DOM targets
  const elInvoice = document.getElementById('invoice');
  const elRows = document.getElementById('inv-rows');
  const elId = document.getElementById('inv-id');
  const elDate = document.getElementById('inv-date');
  const elClient = document.getElementById('inv-client');
  const elContact = document.getElementById('inv-contact');
  const elEvent = document.getElementById('inv-event');
  const elVenue = document.getElementById('inv-venue');
  const elSubtotal = document.getElementById('inv-subtotal');
  const elDelivery = document.getElementById('inv-delivery');
  const elTax = document.getElementById('inv-tax');
  const elTotal = document.getElementById('inv-total');
  const elDeposit = document.getElementById('inv-deposit');
  const btnPrint = document.getElementById('btn-print');
  const btnShare = document.getElementById('btn-share');
  const btnItemized = document.getElementById('btn-itemized');
  const btnDiscount = document.getElementById('btn-discount');

  // Accumulator for itemized rows (used for WhatsApp share)
  let currentItems = [];

  function addRow(desc, qty, unit){
    const q = qty || 0;
    const u = unit || 0;
    const amount = q * u;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${desc}</td>
      <td>${q}</td>
      <td>${u ? NGN(u) : '—'}</td>
      <td class="ta-right">${NGN(amount)}</td>
    `;
    elRows.appendChild(tr);
    currentItems.push({ desc, qty: q, unit: u, amount });
    return amount;
  }

  function computeQuote(data){
    elRows.textContent = '';
    currentItems = [];

    const guests = Math.max(10, parseInt(data.guests || '0', 10) || 0);
    const distanceKm = Math.max(0, parseInt(data.distanceKm || '0', 10) || 0);
    const pkgKey = String(data.basePackage || 'palmwine');
    const pkg = PRICING.packages[pkgKey] || PRICING.packages.palmwine;

    let subtotal = 0;
    // Base package
    if (pkg.baseFee){ subtotal += addRow(`${pkg.label} — Setup & Service Team`, 1, pkg.baseFee); }
    if (pkg.perGuest){ subtotal += addRow(`${pkg.label} — Per Guest`, guests, pkg.perGuest); }

    // Add-ons
    const addons = Array.isArray(data.addons) ? data.addons : (data.addons ? [data.addons] : []);
    addons.forEach(key => {
      const a = PRICING.addons[key];
      if (!a) return;
      if (a.flat){ subtotal += addRow(`${a.label}`, 1, a.flat); }
      if (a.baseFee){ subtotal += addRow(`${a.label} — Setup`, 1, a.baseFee); }
      if (a.perGuest){ subtotal += addRow(`${a.label} — Per Guest`, guests, a.perGuest); }
    });

    // Delivery (distance beyond free km)
    let delivery = 0;
    if (distanceKm > BUSINESS.delivery.baseFreeKm){
      const billKm = distanceKm - BUSINESS.delivery.baseFreeKm;
      delivery = billKm * BUSINESS.delivery.perKm;
    }

    // Tax and totals (apply tax on services subtotal only)
    const tax = subtotal * BUSINESS.taxRate;
    const total = subtotal + delivery + tax;
    const deposit = total * BUSINESS.depositRate;

    return { subtotal, delivery, tax, total, deposit, guests, items: currentItems };
  }

  

  function buildItemizedMessage(data, result, quoteId){
    const taxPct = (BUSINESS.taxRate * 100).toFixed(1).replace(/\.0$/, '');
    const lines = [
      `${BUSINESS.name} — Itemized Quote ${quoteId}`,
      `Client: ${data.clientName || ''}`,
      `Event: ${data.eventType || ''} • ${result.guests} guests • ${data.date || ''}`,
      `Venue: ${data.venue || ''}`,
      '',
      'Items:'
    ];
    (result.items || []).forEach(it=>{
      lines.push(`- ${it.desc}: ${it.qty} × ${NGN(it.unit)} = ${NGN(it.amount)}`);
    });
    lines.push(
      '',
      `Subtotal: ${NGN(result.subtotal)}`,
      `Delivery: ${NGN(result.delivery)}`,
      `Tax (${taxPct}%): ${NGN(result.tax)}`,
      `Total: ${NGN(result.total)}`,
      `Deposit Due: ${NGN(result.deposit)}`,
      '',
      'Reply with any line to EDIT with your new price, or say LEAVE to keep it.'
    );
    return lines.join('\n');
  }

  function renderInvoice(data, result, quoteId){
    const d = new Date();
    elId.textContent = quoteId;
    elDate.textContent = d.toLocaleDateString();
    elClient.textContent = data.clientName || '';
    const contactBits = [data.phone || '', data.email || ''].filter(Boolean).join(' • ');
    elContact.textContent = contactBits || '';
    elEvent.textContent = `${data.eventType || ''} • ${result.guests} guests • ${data.date || ''}`;
    elVenue.textContent = data.venue || '';

    elSubtotal.textContent = NGN(result.subtotal);
    elDelivery.textContent = NGN(result.delivery);
    elTax.textContent = NGN(result.tax);
    elTotal.textContent = NGN(result.total);
    elDeposit.textContent = NGN(result.deposit);

    // Share links
    const summary = [
      `${BUSINESS.name} — Quote ${quoteId}`,
      `Client: ${data.clientName || ''}`,
      `Event: ${data.eventType || ''} • ${result.guests} guests • ${data.date || ''}`,
      `Venue: ${data.venue || ''}`,
      `Subtotal: ${NGN(result.subtotal)}`,
      `Delivery: ${NGN(result.delivery)}`,
      `Tax: ${NGN(result.tax)}`,
      `Total: ${NGN(result.total)}`,
      `Deposit Due: ${NGN(result.deposit)}`
    ].join('\n');

    btnShare.setAttribute('href', toWhatsAppLink(summary));
    if (btnItemized){
      const itemized = buildItemizedMessage(data, result, quoteId);
      btnItemized.setAttribute('href', toWhatsAppLink(itemized));
    }
    const discountMsg = `Hi ${BUSINESS.name}, I'd like to request a discount on Quote ${quoteId}. Total is ${NGN(result.total)} for ${result.guests} guests on ${data.date || ''}. Could you review?`;
    btnDiscount.setAttribute('href', toWhatsAppLink(discountMsg));

    elInvoice.style.display = 'block';
    elInvoice.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    // Ensure multi-select for checkboxes is captured
    const data = Object.create(null);
    for (const [k,v] of fd.entries()){
      if (k === 'addons'){
        if (!data.addons) data.addons = [];
        data.addons.push(v);
      } else {
        data[k] = v;
      }
    }
    const id = uniqueQuoteId();
    const result = computeQuote(data);
    // expose for payment form reuse
    try{ window.__lastQuoteId = id; }catch(_){ /* no-op */ }
    renderInvoice(data, result, id);
  });

  form.addEventListener('reset', ()=>{
    // Small delay so native reset applies, then hide invoice
    setTimeout(()=>{ if (elInvoice) elInvoice.style.display = 'none'; }, 0);
  });

  if (btnPrint){ btnPrint.addEventListener('click', ()=> window.print()); }
})();

(function(){
  const form = document.getElementById('payment-form');
  if (!form) return;

  const qInput = document.getElementById('payQuoteId');
  const btnUseQuote = document.getElementById('use-quote');
  const btnWa = document.getElementById('btn-pay-wa');
  const statusEl = document.getElementById('pay-status');
  const waNumber = '2348039490349';
  const pmSelect = document.getElementById('paymentMethod');
  const txRefInput = document.getElementById('txRef');
  const amountInput = document.getElementById('amountPaid');
  const verifyBtn = document.getElementById('btn-verify-paystack');
  const verifyEl = document.getElementById('verify-result');
  let lastVerification = null; // { reference, verified, amount, currency, paid_at, status }

  // Fill with last quote id if available
  if (qInput && window.__lastQuoteId){ qInput.value = window.__lastQuoteId; }
  if (btnUseQuote){
    btnUseQuote.addEventListener('click', ()=>{
      if (window.__lastQuoteId){ qInput.value = window.__lastQuoteId; updateWa(); }
    });
  }

  function formToObject(frm){
    const fd = new FormData(frm);
    const obj = {};
    for (const [k,v] of fd.entries()) obj[k] = v;
    return obj;
  }

  function buildMessage(d){
    const lines = [
      'Payment Confirmation',
      `Quote: ${d.quoteId || ''}`,
      `Payer: ${d.payerName || ''}`,
      `Phone/Email: ${(d.phone||'')}${d.email? ' • '+d.email: ''}`,
      `Amount: ₦${(d.amountPaid||'')}`,
      `Method: ${d.paymentMethod || ''}`,
      `Transaction Ref: ${d.txRef || ''}`,
      `Payment Date: ${d.paymentDate || ''}`,
      d.notes ? `Notes: ${d.notes}` : ''
    ].filter(Boolean);
    // Include Paystack verification summary when applicable
    if ((d.paymentMethod || '') === 'Paystack'){
      const currentRef = (d.txRef || '').trim();
      const ver = (lastVerification && lastVerification.reference === currentRef) ? lastVerification : null;
      if (ver){
        if (ver.verified){
          lines.push(
            'Paystack verification: VERIFIED ',
            `Verified amount: ₦${ver.amount || 0}`,
            ver.paid_at ? `Paid at: ${ver.paid_at}` : ''
          );
        } else {
          lines.push('Paystack verification: NOT VERIFIED ');
        }
      } else {
        lines.push('Paystack verification: NOT VERIFIED ');
      }
    }
    return lines.join('\n');
  }

  const VERIFY_ENDPOINT = '/.netlify/functions/verify-payment';
  function setVerifyText(text, state){
    if (!verifyEl) return;
    verifyEl.textContent = text || '';
    verifyEl.classList.remove('error','success');
    if (state === 'ok') verifyEl.classList.add('success');
    else if (state === 'err') verifyEl.classList.add('error');
  }
  function clearVerification(){ lastVerification = null; setVerifyText('', null); }
  pmSelect && pmSelect.addEventListener('change', clearVerification);
  txRefInput && txRefInput.addEventListener('input', clearVerification);

  async function verifyReference(silent){
    try{
      if (!pmSelect || pmSelect.value !== 'Paystack'){
        if (!silent) setVerifyText('Select Paystack as payment method to verify.', 'err');
        return null;
      }
      const ref = (txRefInput && txRefInput.value ? txRefInput.value.trim() : '');
      if (!ref){
        if (!silent) setVerifyText('Enter your Paystack transaction reference, then tap Verify.', 'err');
        return null;
      }
      if (!silent) setVerifyText('Verifying with Paystack…', null);
      if (verifyBtn) verifyBtn.disabled = true;
      const res = await fetch(VERIFY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ reference: ref })
      });
      const data = await res.json().catch(()=>({}));
      const ok = !!(data && data.gateway === 'paystack');
      lastVerification = ok ? {
        reference: data.reference || ref,
        verified: !!data.verified,
        amount: Number(data.amount || 0),
        currency: data.currency || 'NGN',
        paid_at: data.paid_at || null,
        status: data.status || null
      } : null;
      if (lastVerification && lastVerification.verified){
        const amt = lastVerification.amount ? `₦${lastVerification.amount}` : '';
        setVerifyText(`Verified  ${amt}${lastVerification.paid_at ? ' • ' + lastVerification.paid_at : ''}`, 'ok');
        // Optional: hint if entered amount mismatches verified
        if (amountInput && lastVerification.amount && Number(amountInput.value || 0) !== lastVerification.amount){
          // Non-blocking hint
          setVerifyText(`Verified  ₦${lastVerification.amount} (entered: ₦${amountInput.value||0})`, 'ok');
        }
      } else {
        if (!silent) setVerifyText('Could not verify this reference. Please double‑check and try again.', 'err');
      }
      updateWa();
      return lastVerification;
    } catch(err){
      if (!silent) setVerifyText('Verification failed. Check your network and try again.', 'err');
      return null;
    } finally {
      if (verifyBtn) verifyBtn.disabled = false;
    }
  }
  verifyBtn && verifyBtn.addEventListener('click', ()=>{ verifyReference(false); });

  // Paystack Inline for card payment on booking form
  const btnPaystackCard = document.getElementById('btn-paystack-card');
  function getPaystackPublicKey(){
    const meta = document.querySelector('meta[name="paystack-public-key"]');
    return (meta && meta.getAttribute('content')) || '';
  }
  function setPayStatus(msg, state){
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.classList.remove('error','success');
    if (state === 'ok') statusEl.classList.add('success');
    else if (state === 'err') statusEl.classList.add('error');
  }

  // Basic email validator (client-side sanity only)
  function isValidEmail(email){
    if (!email) return false;
    const s = String(email).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  // Try legacy v1 inline (setup + openIframe)
  function tryStartPaystackV1(opts, callback, onClose){
    try{
      if (!window.PaystackPop || typeof window.PaystackPop.setup !== 'function') return false;
      const handler = window.PaystackPop.setup({
        key: opts.key,
        email: opts.email,
        amount: opts.amount,
        ref: opts.ref,
        currency: 'NGN',
        metadata: opts.metadata,
        callback,
        onClose
      });
      if (handler && typeof handler.openIframe === 'function'){
        handler.openIframe();
        return true;
      }
      return false;
    } catch (err){
      console.error('Paystack v1 setup/open failed:', err);
      return false;
    }
  }

  // Try newer v2 inline (newTransaction)
  function tryStartPaystackV2(opts, callback, onClose){
    try{
      const Pop = window.PaystackPop;
      if (!Pop) return false;
      let pop = null;
      try { pop = typeof Pop === 'function' ? new Pop() : null; } catch(_) { pop = null; }
      if (pop && typeof pop.newTransaction === 'function'){
        pop.newTransaction({
          key: opts.key,
          email: opts.email,
          amount: opts.amount,
          reference: opts.ref,
          currency: 'NGN',
          metadata: opts.metadata,
          onSuccess: (trx)=>{
            const ref = (trx && trx.reference) || opts.ref;
            Promise.resolve(callback({ reference: ref })).catch(err=> console.error('Paystack onSuccess cb error:', err));
          },
          onCancel: ()=>{ try{ onClose(); } catch(e){ console.error('Paystack onCancel cb error:', e); } }
        });
        return true;
      }
      return false;
    } catch (err){
      console.error('Paystack v2 newTransaction failed:', err);
      return false;
    }
  }

  btnPaystackCard && btnPaystackCard.addEventListener('click', ()=>{
    try{
      const key = (getPaystackPublicKey() || '').trim();
      if (!key){ setPayStatus('Missing Paystack public key. Set it in a <meta name="paystack-public-key" ...> tag.', 'err'); return; }
      if (!window.PaystackPop){ setPayStatus('Paystack library not loaded. Please refresh.', 'err'); return; }
      const amount = Number(amountInput && amountInput.value || 0);
      if (!amount || amount <= 0){ setPayStatus('Enter the amount you want to pay first.', 'err'); return; }
      const email = (document.getElementById('payEmail') && document.getElementById('payEmail').value || '').trim();
      if (!isValidEmail(email)){ setPayStatus('Enter a valid email before paying with card.', 'err'); return; }
      const name = (document.getElementById('payerName') && document.getElementById('payerName').value) || '';
      const phone = (document.getElementById('payPhone') && document.getElementById('payPhone').value) || '';
      const quoteId = (qInput && qInput.value) || '';
      const ref = `PMF-${Date.now()}-${Math.floor(1000 + Math.random()*9000)}`;
      setPayStatus('Opening Paystack…', null);
      btnPaystackCard.disabled = true;

      const opts = {
        key,
        email,
        amount: Math.round(amount * 100), // kobo
        ref,
        metadata: {
          custom_fields: [
            { display_name: 'Payer', variable_name: 'payer_name', value: name },
            { display_name: 'Phone', variable_name: 'phone', value: phone },
            { display_name: 'Quote', variable_name: 'quote_id', value: quoteId }
          ]
        }
      };

      const callback = async (response)=>{
        try{
          if (txRefInput) txRefInput.value = (response && response.reference) || ref;
          if (pmSelect) pmSelect.value = 'Paystack';
          setPayStatus('Payment successful. Verifying…', null);
          await verifyReference(false);
        } catch(err){
          console.error('Post-payment verify error:', err);
        } finally {
          btnPaystackCard.disabled = false;
          updateWa();
        }
      };
      const onClose = ()=>{
        setPayStatus('Payment popup closed. If you completed payment, enter the reference and tap Verify.', null);
        btnPaystackCard.disabled = false;
      };

      let started = false;
      // Prefer v1, fallback to v2 if needed
      started = tryStartPaystackV1(opts, callback, onClose);
      if (!started){
        started = tryStartPaystackV2(opts, callback, onClose);
      }
      if (!started){
        setPayStatus('Could not start Paystack checkout. Please refresh and try again.', 'err');
        btnPaystackCard.disabled = false;
      }
    } catch(e){
      console.error('Could not start Paystack checkout:', e);
      setPayStatus('Could not start Paystack checkout. Try again.', 'err');
      btnPaystackCard.disabled = false;
    }
  });

  function updateWa(){
    const msg = buildMessage(formToObject(form));
    if (btnWa){ btnWa.href = toWhatsAppLink(msg); }
  }
  form.addEventListener('input', updateWa);
  updateWa();

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (statusEl){ statusEl.textContent = 'Sending...'; statusEl.classList.remove('error','success'); }

    const formspreeId = form.getAttribute('data-formspree') || '';
    const fd = new FormData(form);
    // add timestamp
    fd.append('_submittedAt', new Date().toISOString());
    // If Paystack, attempt verification before sending
    const isPaystack = pmSelect && pmSelect.value === 'Paystack';
    if (isPaystack){ await verifyReference(true); }
    // Append verification details for server/admin context
    const currentRef = (txRefInput && txRefInput.value ? txRefInput.value.trim() : '');
    const ver = (lastVerification && lastVerification.reference === currentRef) ? lastVerification : null;
    fd.append('verification_gateway', ver ? 'paystack' : '');
    fd.append('verification_reference', currentRef);
    fd.append('verification_status', ver ? (ver.verified ? 'verified' : 'not_verified') : 'unknown');
    fd.append('verification_amount', ver && ver.amount != null ? String(ver.amount) : '');
    fd.append('verification_currency', ver && ver.currency ? ver.currency : '');
    fd.append('verification_paid_at', ver && ver.paid_at ? ver.paid_at : '');
    try{
      if (formspreeId){
        const endpoint = `https://formspree.io/f/${formspreeId}`;
        const res = await fetch(endpoint, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Formspree error');
        if (statusEl){ statusEl.textContent = 'Thanks! We received your confirmation. We will follow up on WhatsApp shortly.'; statusEl.classList.add('success'); }
        form.reset();
        // restore quote id if available
        if (qInput && window.__lastQuoteId){ qInput.value = window.__lastQuoteId; }
        updateWa();
      } else {
        // Fallback: open WhatsApp with prefilled message
        const msg = buildMessage(Object.fromEntries(fd.entries()));
        window.open(toWhatsAppLink(msg), '_blank');
        if (statusEl){ statusEl.textContent = 'Opened WhatsApp with your confirmation message.'; statusEl.classList.add('success'); }
      }
      
    } catch(err){
      if (statusEl){ statusEl.textContent = 'Could not send via form. Please use the WhatsApp button instead.'; statusEl.classList.add('error'); }
    }
  });
})();

// Hanging sign: delayed show, auto-hide, close with 1-day dismissal (index.html and events.html only)
(function(){
  const sign = document.getElementById('hang-sign');
  if (!sign) return; // only on pages with the sign

  // Limit to index.html or events.html
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (file !== 'index.html' && file !== 'events.html') return;

  const HANGING_SIGN_KEY = 'hangingSignDismissedAt';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const SIGN_DELAY = 1200;
  const SIGN_AUTO_HIDE = 10000;

  function hideSign(){
    sign.classList.remove('visible');
    sign.setAttribute('aria-hidden', 'true');
  }
  function showSign(){
    sign.classList.add('visible');
    sign.setAttribute('aria-hidden', 'false');
  }

  // Skip if dismissed within 1 day
  const dismissedAt = Number(localStorage.getItem(HANGING_SIGN_KEY) || '0');
  if (dismissedAt && (Date.now() - dismissedAt) < DAY_MS){
    hideSign();
    return;
  }

  // Delayed show
  let autoTimer = 0;
  setTimeout(()=>{
    showSign();
    // Auto-hide after 10s (does not persist)
    autoTimer = window.setTimeout(()=>{ hideSign(); }, SIGN_AUTO_HIDE);
  }, SIGN_DELAY);

  // Close button persists for 1 day
  const btnClose = sign.querySelector('.hs-close');
  if (btnClose){
    btnClose.addEventListener('click', (e)=>{
      e.preventDefault();
      hideSign();
      localStorage.setItem(HANGING_SIGN_KEY, String(Date.now()));
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = 0; }
    });
  }

  // Optional: clicking the CTA also hides it (no persistence)
  const cta = sign.querySelector('.hs-body');
  if (cta){
    cta.addEventListener('click', ()=>{ hideSign(); });
  }
})();
