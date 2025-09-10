// Palmwine Merchants & Flames — Scripts
// Performance optimized DOM queries with null checks
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const siteHeader = document.querySelector('.site-header');
const heroEl = document.querySelector('.hero');
const waveEl = document.getElementById('wave');
const announce = document.getElementById('announce');
// Static prefix from Django (set in base.html) with fallback
const STATIC = (typeof window !== 'undefined' && window.STATIC_URL) ? window.STATIC_URL : '/static/';

// Safely update year in footer
const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

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
  });
  
  // Observe all elements with scroll-up class
  document.querySelectorAll('.scroll-up').forEach(el => {
    observer.observe(el);
  });
});

// Mobile menu
if (navToggle && siteNav) {
  navToggle.addEventListener('click', function() {
    siteNav.classList.toggle('open');
    navToggle.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', siteNav.classList.contains('open'));
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

// Ticket Modal (events.html): open/close, populate, and total calculation
document.addEventListener('DOMContentLoaded', function(){
  // Ensure we only attach listeners once
  if (window.__ticketModalInitialized) return;
  window.__ticketModalInitialized = true;

  const modal = document.getElementById('ticket-modal');
  if (!modal) return; // only on events.html

  const btnsBuy = document.querySelectorAll('.buy-ticket');
  const backdrop = modal.querySelector('.modal-backdrop');
  const btnClose = modal.querySelector('.modal-close');
  const titleEl = document.getElementById('tm-title');
  const subEl = document.getElementById('tm-sub');
  const metaEl = document.getElementById('tm-event-meta');
  const listEl = document.getElementById('tm-ticket-list');
  const totalEl = document.getElementById('tm-total-amt');
  const amountInput = document.getElementById('amountPaid');
  const quoteInput = document.getElementById('payQuoteId');
  const notesEl = document.getElementById('notes');
  const dateEl = document.getElementById('paymentDate');
  const pmSelect = document.getElementById('paymentMethod');

  let lastFocused = null;
  const FOCUSABLE_SELECTOR = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function naira(n){ try{ return '₦' + Number(n||0).toLocaleString(); } catch(_){ return '₦' + (n||0); } }

  function openModal(){
    lastFocused = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    setTimeout(()=>{
      const f = modal.querySelector(FOCUSABLE_SELECTOR);
      if (f) f.focus(); else modal.focus();
    }, 0);
  }
  
  function closeModal(){
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function enforceSingleType(){
    if (!listEl) return;
    const rows = listEl.querySelectorAll('.tm-row');
    let premiumSum = 0;
    let regularSum = 0;
    rows.forEach(row => {
      const label = (row.querySelector('.tm-label')?.textContent || '').toLowerCase();
      const isPremium = label.includes('premium');
      const inp = row.querySelector('input[data-price]');
      const qty = Math.max(0, parseInt(inp?.value || '0', 10) || 0);
      if (isPremium) premiumSum += qty; else regularSum += qty;
    });

    const lockPremium = regularSum > 0;
    const lockRegular = premiumSum > 0;
    rows.forEach(row => {
      const label = (row.querySelector('.tm-label')?.textContent || '').toLowerCase();
      const isPremium = label.includes('premium');
      const inp = row.querySelector('input[data-price]');
      if (!inp) return;
      if (isPremium && lockPremium) { inp.disabled = true; inp.title = 'You can only buy one ticket type per order.'; }
      else if (!isPremium && lockRegular) { inp.disabled = true; inp.title = 'You can only buy one ticket type per order.'; }
      else { inp.disabled = false; inp.title = ''; }
    });

    // Inline hint under the list
    let hint = document.getElementById('tm-single-type-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'tm-single-type-hint';
      hint.style.marginTop = '8px';
      hint.style.fontSize = '12px';
      hint.style.color = '#b45309'; // amber-700
      hint.style.display = 'none';
      // insert after listEl
      if (listEl.parentNode) {
        listEl.parentNode.insertBefore(hint, listEl.nextSibling);
      }
    }
    const showHint = lockPremium || lockRegular;
    hint.textContent = showHint ? 'Only one ticket type per order.' : '';
    hint.style.display = showHint ? 'block' : 'none';
  }

  function recalc(){
    if (!listEl) return;
    let total = 0;
    let anyDiscount = false;
    const DISCOUNT_RATE = 0.15; // 15% off when buying 5+ of a ticket type
    listEl.querySelectorAll('input[data-price]')?.forEach(inp=>{
      const qty = Math.max(0, parseInt(inp.value || '0', 10) || 0);
      const price = Math.max(0, parseInt(inp.getAttribute('data-price')||'0', 10) || 0);
      let subtotal = qty * price;
      if (qty >= 5 && subtotal > 0){
        subtotal = Math.round(subtotal * (1 - DISCOUNT_RATE));
        anyDiscount = true;
      }
      total += subtotal;
    });
    if (totalEl){
      totalEl.textContent = naira(total) + (anyDiscount ? ' (15% discount applied)' : '');
    }
    if (amountInput) amountInput.value = String(total);
    enforceSingleType();
  }

  function populateFromButton(btn){
    const evId = btn.getAttribute('data-event-id') || 'EVENT';
    const evName = btn.getAttribute('data-event-name') || 'Event';
    const evDate = btn.getAttribute('data-event-date') || '';
    const evLoc = btn.getAttribute('data-event-location') || '';
    const ticketsJson = btn.getAttribute('data-tickets') || '[]';
    let tickets = [];
    try{ tickets = JSON.parse(ticketsJson); } catch(_){ tickets = []; }

    // Expose the event id for downstream storage/email
    try{ window.__currentEventId = evId; } catch(_){ }

    if (titleEl) titleEl.textContent = 'Buy Tickets';
    if (subEl) subEl.textContent = `Select tickets for ${evName}`;
    if (metaEl) metaEl.textContent = [evName, evDate, evLoc].filter(Boolean).join(' • ');

    if (listEl){
      listEl.innerHTML = '';
      tickets.forEach((t, idx)=>{
        const row = document.createElement('div');
        row.className = 'tm-row';
        const id = `tmq_${idx}`;
        row.innerHTML = `
          <div class="tm-label">${t.label || 'Ticket'}</div>
          <div class="tm-price">${naira(t.price || 0)}</div>
          <div class="tm-qty">
            <label class="sr-only" for="${id}">Quantity for ${t.label||'ticket'}</label>
            <input id="${id}" type="number" min="0" step="1" value="0" data-price="${t.price||0}" />
          </div>`;
        listEl.appendChild(row);
      });
      listEl.querySelectorAll('input[data-price]')?.forEach(inp=>{
        inp.addEventListener('input', recalc);
        inp.addEventListener('change', recalc);
      });
      // Enforce single ticket type immediately after rendering
      enforceSingleType();
    }

    // Defaults for payment form
    if (pmSelect) pmSelect.value = 'Paystack';
    if (dateEl && !dateEl.value){
      try{ dateEl.valueAsDate = new Date(); } catch(_){
        const d = new Date();
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const dd = String(d.getDate()).padStart(2,'0');
        dateEl.value = `${d.getFullYear()}-${mm}-${dd}`;
      }
    }
    const qId = `${evId}-${Date.now()}`;
    if (quoteInput) quoteInput.value = qId;
    if (notesEl && !notesEl.value){
      notesEl.value = `Payment for ${qId} — ${evName}${evDate? ' • '+evDate:''}${evLoc? ' • '+evLoc:''}`;
    }

    recalc();
  }

  btnsBuy.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      populateFromButton(btn);
      openModal();
      // Re-apply guard on open in case of dynamic content
      enforceSingleType();
    });
  });

  // Modal close handlers
  btnClose?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', (e)=>{ if (e.target === backdrop || (e.target && e.target.getAttribute('data-close')==='modal')) closeModal(); });
  document.addEventListener('keydown', (e)=>{
    if (modal.getAttribute('aria-hidden') !== 'false') return;
    if (e.key === 'Escape'){ closeModal(); return; }
    if (e.key === 'Tab'){
      const focusables = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el=> el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length-1];
      const active = document.activeElement;
      if (e.shiftKey){
        if (active === first || !modal.contains(active)){ last.focus(); e.preventDefault(); }
      } else {
        if (active === last){ first.focus(); e.preventDefault(); }
      }
    }
  });
});

// Quick Quote calculator (homepage only)
(function(){
  const form = document.getElementById('qq-form');
  if (!form) return;
  const guestsInput = document.getElementById('qq-guests');
  const totalEl = document.getElementById('qq-total');
  const breakdownEl = document.getElementById('qq-breakdown');

  const RATES = { palmwine: 2500, cocktails: 4000 };
  const TAX = 0.075; // align with BUSINESS.taxRate
  const FIXED = 85_500; // fixed service & logistics fee
  const fmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
  const NGN2 = (n)=> fmt.format(Math.round(n||0));

  function currentType(){
    const r = form.querySelector('input[name="qq_type"]:checked');
    return r ? r.value : 'palmwine';
  }
  function compute(){
    const g = Math.max(0, parseInt(guestsInput.value || '0', 10) || 0);
    const type = currentType();
    const per = RATES[type] || 0;
    const subtotal = g * per + FIXED;
    const tax = subtotal * TAX;
    const total = subtotal + tax;
    if (totalEl) totalEl.textContent = NGN2(total);
    if (breakdownEl) breakdownEl.textContent = `${g} × ₦${per.toLocaleString()} + ₦${FIXED.toLocaleString()} svc/log + 7.5% VAT (excl. distance delivery)`;
  }

  form.addEventListener('input', compute);
  form.addEventListener('submit', (e)=>{ e.preventDefault(); compute(); });
  compute();
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
  
  // Show professional success message
  const successMessage = document.createElement('div');
  successMessage.className = 'success-message';
  successMessage.innerHTML = `
    <div class="success-content">
      <i class="fa-solid fa-check-circle"></i>
      <h3>Thank you for your inquiry!</h3>
      <p>We've received your message and will respond within 24 hours.</p>
    </div>
  `;
  
  form.parentNode.insertBefore(successMessage, form.nextSibling);
  form.reset();
  
  // Remove message after 5 seconds
  setTimeout(() => {
    if (successMessage.parentNode) {
      successMessage.parentNode.removeChild(successMessage);
    }
  }, 5000);
  
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

// Rotate hero background using banner images (use Django static prefix)
const heroImages = [
  'img/home_banner.jpg',
  'img/home_banner2.jpg',
  'img/home_banner3.jpg',
  'img/home_banner4.jpg',
  'img/home_banner5.jpg',
  'img/home_banner6.jpg',
  'img/home_banner7.jpg',
].map(p => STATIC + p);

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

// Announcement bar close with performance optimization
if (announce) {
  const announceClose = announce.querySelector('.announce-close');
  if (announceClose) {
    announceClose.addEventListener('click', () => {
      announce.style.display = 'none';
      // Store preference to avoid showing again
      localStorage.setItem('announceBarClosed', 'true');
    });
  }
  
  // Check if user previously closed announcement
  if (localStorage.getItem('announceBarClosed') === 'true') {
    announce.style.display = 'none';
  }
}

// Announcement bar text optimization
const row = announce?.querySelector('.announce-row');
const scroller = announce?.querySelector('.announce-scroller');
const text = announce?.querySelector('.announce-text');

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
  }

  // Animate on small screens (720px and below)
  function applySmallMode(){
    const mq720 = window.matchMedia('(max-width: 720px)');
    if (mq720.matches && scroller && row){
      measureAndAnimate();
    } else {
      removeClones();
    }
  }

  function measureAndAnimate(){
    if (!scroller || !row) return;
    const scrollerW = scroller.offsetWidth;
    const rowW = row.offsetWidth;
    if (rowW > scrollerW){
      const gap = 32;
      const totalW = rowW + gap;
      const duration = totalW / 50;
      
      // Remove existing clones
      removeClones();
      
      // Clone the row
      const clone = row.cloneNode(true);
      clone.classList.add('announce-clone');
      scroller.appendChild(clone);
      
      // Set animation
      scroller.style.setProperty('--scroll-width', `-${totalW}px`);
      scroller.style.setProperty('--scroll-duration', `${duration}s`);
      scroller.classList.add('scrolling');
    }
  }

  function removeClones(){
    if (!scroller) return;
    scroller.querySelectorAll('.announce-clone').forEach(clone => clone.remove());
    scroller.classList.remove('scrolling');
  }

  // Apply on load and resize
  if (window.matchMedia){
    const mq720 = window.matchMedia('(max-width: 720px)');
    if (typeof mq720.addEventListener === 'function'){
      mq720.addEventListener('change', applySmallMode);
    } else if (typeof mq720.addListener === 'function') {
      mq720.addListener(applySmallMode);
    }
    
    // Throttled resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (mq720.matches) measureAndAnimate();
        else removeClones();
      }, 100);
    });
    
    // Initial check
    if (mq720.matches) {
      requestAnimationFrame(() => {
        measureAndAnimate();
      });
    }
    applySmallMode();
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
      palmwine: { label: 'Palmwine Service', perGuest: 2_500 },
      cocktails:{ label: 'Palmwine Cocktails', perGuest: 4_000 }
    },
    fees: {
      // Fixed service charge & logistics fee applied to automated packages
      serviceLogisticsFixed: 85_500
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
  const btnComputePrint = document.getElementById('btn-compute-print');

  // Additional DOM references for booking page
  const announceClose = document.querySelector('.announce-close');
  const hangSign = document.getElementById('hang-sign');
  const hangSignClose = document.querySelector('.hs-close');

  // Booking form elements
  const btnComputeQuote = document.getElementById('btn-compute-quote');
  const btnReset = document.getElementById('btn-reset');
  const invoiceContainer = document.getElementById('invoice-container');

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
    // Add-ons removed — pricing is per-guest only for Palmwine or Cocktails
    // Fixed service & logistics fee (applies to automated packages)
    if (pkgKey === 'palmwine' || pkgKey === 'cocktails'){
      subtotal += addRow('Service Charge & Logistics (fixed)', 1, PRICING.fees.serviceLogisticsFixed);
    }

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

  // TODO: Integrate with payment gateway API

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
    const btnPayDeposit = document.getElementById('btn-pay-deposit');
    const btnPayFull = document.getElementById('btn-pay-full');
    const d = new Date();
    if (elId) elId.textContent = quoteId;
    if (elDate) elDate.textContent = d.toLocaleDateString();
    if (elClient) elClient.textContent = data.clientName || '';
    const contactBits = [data.phone || '', data.email || ''].filter(Boolean).join(' • ');
    if (elContact) elContact.textContent = contactBits || '';
    if (elEvent) elEvent.textContent = `${data.eventType || ''} • ${result.guests} guests • ${data.date || ''}`;
    if (elVenue) elVenue.textContent = data.venue || '';

    if (elSubtotal) elSubtotal.textContent = NGN(result.subtotal);
    if (elDelivery) elDelivery.textContent = NGN(result.delivery);
    if (elTax) elTax.textContent = NGN(result.tax);
    if (elTotal) elTotal.textContent = NGN(result.total);
    if (elDeposit) elDeposit.textContent = NGN(result.deposit);

    // Update button amounts
    const depositAmount = result.deposit;
    const fullAmount = result.total;
    if (btnPayDeposit) btnPayDeposit.innerHTML = `<i class="fa-solid fa-credit-card"></i> Pay Deposit (${NGN(depositAmount)})`;
    if (btnPayFull) btnPayFull.innerHTML = `<i class="fa-solid fa-credit-card"></i> Pay Full Amount (${NGN(fullAmount)})`;

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

    if (btnShare) btnShare.setAttribute('href', toWhatsAppLink(summary));
    if (btnItemized){
      const itemized = buildItemizedMessage(data, result, quoteId);
      btnItemized.setAttribute('href', toWhatsAppLink(itemized));
    }
    const discountMsg = `Hi ${BUSINESS.name}, I'd like to request a discount on Quote ${quoteId}. Total is ${NGN(result.total)} for ${result.guests} guests on ${data.date || ''}. Could you review?`;
    if (btnDiscount) btnDiscount.setAttribute('href', toWhatsAppLink(discountMsg));

    if (elInvoice) elInvoice.style.display = 'block';
    if (elInvoice) elInvoice.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function processQuote(printAfter){
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
    // Manual routing for packages requiring custom pricing
    const pkgKey = String(data.basePackage || '');
    if (pkgKey === 'flame' || pkgKey === 'full'){
      const pkgLabel = pkgKey === 'flame' ? 'Open‑Flame Cuisine' : 'Full Experience';
      const summary = [
        'Manual Quote Request',
        `Package: ${pkgLabel}`,
        `Client: ${data.clientName || ''}`,
        `Guests: ${data.guests || ''}`,
        `Event: ${data.eventType || ''}`,
        `Date: ${data.date || ''}`,
        `Venue: ${data.venue || ''}`,
        `Contact: ${(data.phone||'')}${data.email ? ' • ' + data.email : ''}`,
        '',
        'Please share pricing and availability.'
      ].join('\n');
      try{ if (elInvoice) elInvoice.style.display = 'none'; } catch(_){ }
      window.open(toWhatsAppLink(summary, BUSINESS.waNumber), '_blank');
      return;
    }
    const id = uniqueQuoteId();
    const result = computeQuote(data);
    // expose for payment form reuse
    try{
      window.__lastQuoteId = id;
      window.__lastQuote = { id, data, result };
      window.dispatchEvent(new CustomEvent('last-quote', { detail: { id, data, result } }));
    }catch(_){ /* no-op */ }
    renderInvoice(data, result, id);
    if (printAfter){
      // Allow DOM to update before invoking print
      setTimeout(()=> window.print(), 100);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    processQuote(false);
  });

  form.addEventListener('reset', ()=>{
    // Small delay so native reset applies, then hide invoice
    setTimeout(()=>{ if (elInvoice) elInvoice.style.display = 'none'; }, 0);
  });

  if (btnPrint){ btnPrint.addEventListener('click', ()=> window.print()); }
  if (btnComputePrint){ btnComputePrint.addEventListener('click', ()=> processQuote(true)); }
})();

// Payment form (legacy). This block is disabled when centralized payment handler is active.
(function(){
  const form = document.getElementById('payment-form');
  if (!form) return;
  // If the new centralized handler is loaded, skip this legacy payment logic to avoid conflicts
  if (typeof window !== 'undefined' && window.PMF_PAYMENT_HANDLER_ACTIVE) {
    console.log('[script.js] Skipping legacy payment logic because payment-handler.js is active');
    return;
  }

  // Google Sheet integration
  const SHEET_ENDPOINT  = 'https://script.google.com/macros/s/AKfycbybyxcH6rpAhYcNOb58_50tL-maER-sCn1M4aC4d_8aU6z0F4fDg9N1nfx35E6FLJsE/exec';
  const WEBHOOK_SECRET  = 'palmwine&merchants&flames!';

  const qInput = document.getElementById('payQuoteId');
  const btnUseQuote = document.getElementById('use-quote');
  const btnWa = document.getElementById('btn-pay-wa');
  const statusEl = document.getElementById('pay-status');
  const waNumber = '2348039490349';
  const pmSelect = document.getElementById('paymentMethod');
  const txRefInput = document.getElementById('txRef');
  const amountInput = document.getElementById('amountPaid');
  const verifyBtn = document.getElementById('verify-result');
  // Define Paystack button early so updatePaymentUI can safely reference it
  let btnPaystackCard = document.getElementById('btn-paystack-card');
  let lastVerification = null; // { reference, verified, amount, currency, paid_at, status }
  // When true, we will auto-submit the form after a successful Paystack verification
  let __autoSubmitAfterPay = false;
  
  // Barcode generation variables
  let generatedBarcode = null;
  let confirmationCode = null;
  // Track last entered payment info to avoid N/A when DOM resets
  let lastPaymentInfo = { name: '', phone: '', email: '', amount: '' };
  // Prevent multiple downloads for the same code
  const downloadedCodes = new Set();

  // Generate a short, human-friendly confirmation code (no ambiguous chars)
  function generateShortCode(prefix){
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
    let s = '';
    for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    const p = (prefix || 'PMF').toUpperCase().slice(0,3);
    return `PMF-${p}-${s}`; // e.g., PMF-PAY-7XK2FQ
  }

  // Populate payment form from the last computed quote (non-destructive by default)
  function populateFromLastQuote(force){
    try{
      const last = (typeof window !== 'undefined') ? (window.__lastQuote || null) : null;
      // Always set Quote ID if we at least have __lastQuoteId
      if (!last){
        if (qInput && typeof window !== 'undefined' && window.__lastQuoteId && (force || !qInput.value)){
          qInput.value = window.__lastQuoteId;
        }
        updateWa();
        return false;
      }
      const { id, data, result } = last;
      const setIf = (el, val) => {
        if (!el) return;
        if (force || !el.value){ el.value = val != null ? String(val) : ''; }
      };
      setIf(qInput, id || (typeof window !== 'undefined' && window.__lastQuoteId) || '');
      setIf(document.getElementById('payerName'), (data && data.clientName) || '');
      setIf(document.getElementById('payPhone'), (data && data.phone) || '');
      setIf(document.getElementById('payEmail'), (data && data.email) || '');
      if (amountInput && (force || !amountInput.value)){
        const pref = (result && (Number(result.deposit || 0) || Number(result.total || 0))) || 0;
        amountInput.value = String(Math.round(pref));
      }
      const notesEl = document.getElementById('notes');
      if (notesEl && (force || !notesEl.value)){
        const evBits = [];
        if (data && data.eventType) evBits.push(data.eventType);
        if (data && data.date) evBits.push(data.date);
        const venue = (data && data.venue) ? ` • ${data.venue}` : '';
        const q = id || (typeof window !== 'undefined' && window.__lastQuoteId) || 'quote';
        notesEl.value = `Payment for ${q}${evBits.length ? ' — ' + evBits.join(' • ') : ''}${venue}`;
      }
      updateWa();
      return true;
    } catch(_){
      return false;
    }
  }
  // Non-destructive prefill on load
  try{ populateFromLastQuote(false); } catch(_){ }
  // Update when a new quote is computed on the page
  window.addEventListener('last-quote', ()=>{ try{ populateFromLastQuote(true); } catch(_){}});
  // Force-populate on button click
  if (btnUseQuote){
    btnUseQuote.addEventListener('click', ()=>{ populateFromLastQuote(true); });
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

  const VERIFY_ENDPOINT = '/api/verify-payment/';
  function setVerifyText(text, state){
    if (!verifyBtn) return;
    verifyBtn.textContent = text || '';
    verifyBtn.classList.remove('error','success');
    if (state === 'ok') verifyBtn.classList.add('success');
    else if (state === 'err') verifyBtn.classList.add('error');
    // Do not auto-generate barcode here to avoid duplicate triggers.
  }
  function clearVerification(){ lastVerification = null; setVerifyText('', null); }
  pmSelect && pmSelect.addEventListener('change', ()=>{ clearVerification(); updatePaymentUI(); });
  txRefInput && txRefInput.addEventListener('input', clearVerification);

  // Toggle UI by payment method
  function updatePaymentUI(){
    const method = pmSelect ? pmSelect.value : '';
    const isPaystack = method === 'Paystack';
    const txRefLabel = document.querySelector('label[for="txRef"]');
    const txRefRow = txRefInput ? txRefInput.parentElement : null; // contains input + verify button

    // Show Paystack popup button only when Paystack is selected
    if (btnPaystackCard){
      btnPaystackCard.style.display = isPaystack ? '' : 'none';
      // Optional: clearer label
      try{ btnPaystackCard.innerHTML = '<i class="fa-solid fa-credit-card"></i> Pay with Paystack (Card/Transfer/USSD)'; } catch(_){}
    }

    // For Paystack: hide reference UI completely; it will be auto-filled & verified
    // For others: show input; hide Verify button since verification is only for Paystack
    if (txRefLabel) txRefLabel.style.display = isPaystack ? 'none' : '';
    if (txRefRow) txRefRow.style.display = isPaystack ? 'none' : 'flex';
    // Hide manual Verify button entirely (verification is automatic for Paystack and not applicable for others)
    if (verifyBtn) verifyBtn.style.display = 'none';
    // Show verification status only for Paystack
    if (verifyBtn) verifyBtn.style.display = isPaystack ? '' : 'none';

    if (txRefInput){
      if (isPaystack){
        txRefInput.readOnly = true;
        txRefInput.placeholder = 'Will be auto-filled after Paystack';
      } else {
        txRefInput.readOnly = false;
        let ph = 'Reference / Note';
        if (method === 'Transfer') ph = 'Bank transfer reference or note';
        else if (method === 'POS') ph = 'POS slip reference or note';
        else if (method === 'Cash' || method === 'Other') ph = 'Note (optional)';
        txRefInput.placeholder = ph;
      }
    }
  }
  // Initialize UI state once DOM is ready
  try{ updatePaymentUI(); } catch(_){}

  async function verifyReference(silent){
    try{
      if (!pmSelect || pmSelect.value !== 'Paystack'){
        if (!silent) setVerifyText('Select Paystack as payment method to verify.', 'err');
        return null;
      }
      const ref = (txRefInput && txRefInput.value ? txRefInput.value.trim() : '');
      if (!ref){
        if (!silent) setVerifyText('No Paystack reference yet. Please complete Paystack checkout; we\'ll verify automatically.', 'err');
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
        // Generate barcode on successful Paystack verification
        generatePaymentBarcode();
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
  // If verification just succeeded and auto-submit was requested, submit the form now
  function postVerificationAutoSubmitIfNeeded(){
    try{
      let should = __autoSubmitAfterPay;
      if (!should){
        try{ should = (localStorage.getItem('pm_autoSubmit') === '1'); } catch(_){ }
      }
      if (!should) return;
      if (!pmSelect || pmSelect.value !== 'Paystack') return;
      const currentRef = (txRefInput && txRefInput.value ? txRefInput.value.trim() : '');
      if (!currentRef) return;
      if (!(lastVerification && lastVerification.reference === currentRef && lastVerification.verified)) return;
      __autoSubmitAfterPay = false;
      try{ localStorage.removeItem('pm_autoSubmit'); } catch(_){ }
      if (form && typeof form.requestSubmit === 'function'){
        form.requestSubmit();
      } else if (form){
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    } catch(err){
      console.error('Auto-submit after verification failed:', err);
    }
  }
  verifyBtn && verifyBtn.addEventListener('click', ()=>{ verifyReference(false); });
  
  // Download barcode functionality - setup event listener
  setTimeout(() => {
    const downloadBarcodeBtn = document.getElementById('btn-download-barcode');
    if (downloadBarcodeBtn) {
      downloadBarcodeBtn.addEventListener('click', function() {
        if (!generatedBarcode) return;
        
          try {
            // Create a canvas to draw the QR code and text
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 350;
            
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Load and draw QR code
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
              // Draw QR code
              ctx.drawImage(img, 50, 50, 200, 200);
              
              // Add text
              ctx.fillStyle = '#333333';
              ctx.font = 'bold 16px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('Payment Confirmation', canvas.width/2, 30);
              
              ctx.font = '12px Arial';
              ctx.fillText(confirmationCode, canvas.width/2, 280);
              ctx.fillText(new Date().toLocaleDateString(), canvas.width/2, 300);
              ctx.fillText('Palmwine Merchants & Flames', canvas.width/2, 320);
              
              // Download
              const link = document.createElement('a');
              link.download = `payment-confirmation-${confirmationCode}.png`;
              link.href = canvas.toDataURL();
              link.click();
              
            };
            img.src = generatedBarcode.imageUrl;
            
          } catch (error) {
            console.error('Error downloading barcode:', error);
            // Fallback: open QR code in new tab
            window.open(generatedBarcode.imageUrl, '_blank');
          }
      });
    }
  }, 100);

  // Paystack success handler
  function handlePaystackSuccess(response) {
    if (!response || !response.reference) {
      console.error('Invalid Paystack response:', response);
      setPayStatus('Error processing payment. Please try again.', 'err');
      return;
    }
    
    // Update the transaction reference
    if (txRefInput) {
      txRefInput.value = response.reference;
      
      // Show loading state
      setVerifyText('Verifying payment...', null);
      
      // Auto-verify the payment
      verifyReference(true).then(verification => {
        if (verification && verification.verified) {
          // Update payment status
          setPayStatus('Payment verified successfully!', 'ok');
          
          // Generate and show barcode
          const barcodeGenerated = generatePaymentBarcode();
          
          // Check if we're on events page and show verification modal
          const verificationModal = document.getElementById('verification-modal');
          if (verificationModal) {
            // For events page - show verification modal
            setTimeout(() => {
              showEnhancedVerificationModal(response, verification);
            }, 1000);
          } else if (barcodeGenerated) {
            // Auto-submit the form after a short delay for other pages
            setTimeout(() => {
              if (form && typeof form.requestSubmit === 'function') {
                form.requestSubmit();
              } else if (form){
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              }
            }, 2000);
          }
        } else {
          setPayStatus('Payment received but verification failed. Please contact support.', 'err');
        }
      }).catch(error => {
        console.error('Payment verification error:', error);
        setPayStatus('Payment received but verification failed. Please contact support.', 'err');
      });
    }
  }

  // Enhanced verification modal function for events page
  function showEnhancedVerificationModal(paymentResponse, verification) {
    const modal = document.getElementById('verification-modal');
    const ticketModal = document.getElementById('ticket-modal');
    
    if (!modal) {
      console.error('Verification modal not found!');
      return;
    }
    
    // Hide ticket modal
    if (ticketModal) {
      ticketModal.setAttribute('aria-hidden', 'true');
      ticketModal.classList.remove('show');
    }
    
    // Get payment data
    const eventName = document.getElementById('tm-title')?.textContent || 'Event Ticket';
    const eventMeta = document.getElementById('tm-event-meta')?.textContent || '';
    const totalAmount = document.getElementById('tm-total-amt')?.textContent || '₦0';
    const amountPaid = document.getElementById('amountPaid')?.value || '0';
    
    // Calculate ticket count from ticket list or amount paid
    let ticketCount = 0;
    document.querySelectorAll('.tm-qty input').forEach(input => {
      ticketCount += parseInt(input.value) || 0;
    });
    
    // If no tickets selected, calculate from amount paid (₦5000 per ticket)
    if (ticketCount === 0 && amountPaid) {
      const ticketPrice = 5000;
      const amount = parseFloat(amountPaid.replace(/,/g, '')) || 0;
      ticketCount = Math.max(1, Math.floor(amount / ticketPrice));
    }
    
    const paymentData = {
      eventName: eventName,
      eventDate: eventMeta,
      ticketCount: ticketCount || 1,
      amount: verification?.amount ? `₦${verification.amount}` : `₦${amountPaid}`,
      reference: paymentResponse.reference || verification?.reference
    };
    
    // Populate order details
    const orderEventName = document.getElementById('order-event-name');
    const orderEventDate = document.getElementById('order-event-date');
    const orderTicketCount = document.getElementById('order-ticket-count');
    const orderTotalAmount = document.getElementById('order-total-amount');
    const orderReference = document.getElementById('order-reference');
    
    if (orderEventName) orderEventName.textContent = paymentData.eventName;
    if (orderEventDate) orderEventDate.textContent = paymentData.eventDate;
    if (orderTicketCount) orderTicketCount.textContent = `${paymentData.ticketCount} ticket${paymentData.ticketCount > 1 ? 's' : ''}`;
    if (orderTotalAmount) orderTotalAmount.textContent = paymentData.amount;
    if (orderReference) orderReference.textContent = paymentData.reference;
    
    // Generate QR code
    generateEnhancedQRCode(paymentData);
    
    // Show verification modal
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('show');
  }

  // Enhanced QR code generation
  function generateEnhancedQRCode(paymentData) {
    const canvas = document.getElementById('qr-canvas');
    const codeText = document.getElementById('verification-code-text');
    
    if (!canvas) {
      console.warn('QR canvas not found');
      return;
    }
    
    const verificationCode = paymentData.reference || `PMF-${Date.now()}`;
    const qrData = JSON.stringify({
      event: paymentData.eventName,
           reference: verificationCode,
      amount: paymentData.amount,
      date: new Date().toISOString(),
      tickets: paymentData.ticketCount
    });
    
    // Set verification code text
    if (codeText) {
      codeText.textContent = verificationCode;
    }
    
    // Check if QRCode library is available
    if (typeof window.QRCode !== 'undefined') {
      // Clear previous QR code
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Generate new QR code
      window.QRCode.toCanvas(canvas, qrData, {
        width: 200,
        height: 200,
        color: {
          dark: '#333333',
          light: '#FFFFFF'
        }
      }, function (error) {
        if (error) {
          console.error('QR Code generation failed:', error);
          drawQRPlaceholder(canvas, verificationCode);
        }
      });
    } else {
      console.warn('QRCode library not loaded, drawing placeholder');
      drawQRPlaceholder(canvas, verificationCode);
    }
  }

  // Fallback QR placeholder
  function drawQRPlaceholder(canvas, code) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', 100, 90);
    ctx.fillText(code, 100, 110);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(10, 10, 180, 180);
  }

  // Helper to read Paystack public key from <meta name="paystack-public-key" content="...">
  function getPaystackPublicKey(){
    try{
      const meta = document.querySelector('meta[name="paystack-public-key"]');
      return (meta && meta.getAttribute('content')) || '';
    } catch(_) { return ''; }
  }

  // Capture the latest form values at the moment user initiates payment
  if (btnPaystackCard) {
    btnPaystackCard.addEventListener('click', () => {
      try {
        const n = (document.getElementById('payerName')?.value || '').trim();
        const p = (document.getElementById('payPhone')?.value || '').trim();
        const e = (document.getElementById('payEmail')?.value || '').trim();
        const a = (document.getElementById('amountPaid')?.value || '').trim();
        lastPaymentInfo = { name: n, phone: p, email: e, amount: a };
        // Debug
        console.log('[lastPaymentInfo captured on Pay click]', lastPaymentInfo);
        
        // Store data but don't block Paystack popup
        // Validation will happen after successful payment
      } catch (err) {
        console.warn('Could not capture lastPaymentInfo:', err);
      }
    });
  }
  function setPayStatus(msg, state){
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.classList.remove('error','success');
    if (state === 'ok') statusEl.classList.add('success');
    else if (state === 'err') statusEl.classList.add('error');
    // Do not auto-generate barcode here to avoid duplicate triggers.
  }
  
  // Generate barcode for payment confirmation
  function generatePaymentBarcode() {
    try {
      const barcodeSection = document.getElementById('payment-barcode-section');
      const barcodeContainer = document.getElementById('barcode-container');
      const confirmationCodeEl = document.getElementById('confirmation-code');
      
      if (!barcodeSection || !barcodeContainer || !confirmationCodeEl) {
        console.warn('Barcode elements not found in the DOM');
        return false;
      }
      
      // Generate short confirmation code if not already generated
      if (!confirmationCode) {
        const paymentMethod = pmSelect ? pmSelect.value : 'UNKNOWN';
        confirmationCode = generateShortCode(paymentMethod);
      }
      
      // Collect customer details with robust fallbacks
      const domName = (document.getElementById('payerName')?.value || '').trim();
      const domPhone = (document.getElementById('payPhone')?.value || '').trim();
      const domEmail = (document.getElementById('payEmail')?.value || '').trim();
      const domAmount = (amountInput ? String(amountInput.value || '').trim() : '');
      
      // Debug: log what we're capturing
      console.log('Form capture debug:', {
        domName, domPhone, domEmail, domAmount,
        lastPaymentInfo,
        amountInputElement: amountInput,
        amountInputValue: amountInput?.value
      });
      
      const name = domName || lastPaymentInfo.name || '';
      const phone = domPhone || lastPaymentInfo.phone || '';
      const email = domEmail || lastPaymentInfo.email || '';
      const amountVal = domAmount || lastPaymentInfo.amount || '0';

      // Create barcode data with customer details
      const barcodeData = {
        code: confirmationCode,
        customerName: domName || lastPaymentInfo.name || 'N/A',
        phone: phone,
        email: email,
        amount: amountVal,
        method: pmSelect ? pmSelect.value : 'UNKNOWN',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        ref: txRefInput ? txRefInput.value : '',
        event_id: (window.__currentEventId || ''),
        timestamp: new Date().toISOString(),
        eventDetails: getEventDetails(),
        validUntil: getValidUntilDate()
      };
      
      // Clear previous barcode if any
      barcodeContainer.innerHTML = '';
      
      // Performance: encode only the confirmation code in the QR
      // but keep the full ticket info associated to generatedBarcode
      generateQRCode(confirmationCode, barcodeContainer, barcodeData);
      
      // Display confirmation code
      confirmationCodeEl.textContent = confirmationCode;
      
      // Show barcode section with animation
      barcodeSection.style.display = 'block';
      barcodeSection.style.opacity = '0';
      barcodeSection.style.transition = 'opacity 0.3s ease-in-out';
      
      // Force reflow to enable transition
      void barcodeSection.offsetWidth;
      barcodeSection.style.opacity = '1';
      
      // Scroll to barcode section if not in view
      const rect = barcodeSection.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        barcodeSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      
      // Store ticket in database and then auto-download barcode
      setTimeout(async () => {
        const ticketInfo = (generatedBarcode && generatedBarcode.full) || (function(){
          try { return JSON.parse(generatedBarcode.data); } catch(_) { return null; }
        })() || barcodeData;
        try {
          await Promise.all([
            storeTicketInDatabase(ticketInfo),
            saveToGoogleSheet(ticketInfo),
            sendTicketEmail(ticketInfo)
          ]);
        } catch (e) {
          console.warn('Post-generation side effects failed:', e);
        }
        autoDownloadBarcode(ticketInfo);
      }, 800);
      
      return true;
      
    } catch (error) {
      console.error('Error generating barcode:', error);
      setPayStatus('Error generating barcode. Please try again or contact support.', 'err');
      return false;
    }
  }
  
  // Helper functions for barcode data
  function getEventDetails() {
    // Try to get event details from the current page or form
    const eventName = document.querySelector('[data-event-name]')?.getAttribute('data-event-name') || 'Event Ticket';
    const eventDate = document.querySelector('[data-event-date]')?.getAttribute('data-event-date') || '';
    const eventLocation = document.querySelector('[data-event-location]')?.getAttribute('data-event-location') || '';
    
    return {
      name: eventName,
      date: eventDate,
      location: eventLocation
    };
  }
  
  function getValidUntilDate() {
    // Set barcode valid until event date or 30 days from now
    const eventDateStr = document.querySelector('[data-event-date]')?.getAttribute('data-event-date');
    if (eventDateStr) {
      // Try to parse event date and use that
      const eventDate = new Date(eventDateStr);
      if (!isNaN(eventDate.getTime())) {
        return eventDate.toISOString().split('T')[0];
      }
    }
    
    // Default to 30 days from now
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    return validUntil.toISOString().split('T')[0];
  }
  
  // Store ticket in database
  async function storeTicketInDatabase(ticketData) {
    console.log('Sending ticket data:', ticketData);
    try {
      const response = await fetch('/api/store-ticket/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });
      
      const result = await response.json().catch(()=>({}));
      if (response.ok && result && result.success) {
        const tid = result.ticket ? result.ticket.ticket_id : undefined;
        console.log('Ticket stored successfully', { ticket_id: tid, result });
      } else {
        console.error('Failed to store ticket', { status: response.status, result });
      }
    } catch (error) {
      console.error('Error storing ticket:', error);
    }
  }

  // Save ticket to Google Sheet
  async function saveToGoogleSheet(ticketData) {
    if (!ticketData || !ticketData.code || !SHEET_ENDPOINT || !WEBHOOK_SECRET) {
      console.warn('Skipping Google Sheet save: missing ticket data or config.');
      return;
    }
    try {
      const body = new URLSearchParams({
        secret: WEBHOOK_SECRET,
        reference: ticketData.ref || '',
        name: ticketData.customerName || '',
        phone: ticketData.phone || '',
        email: ticketData.email || '',
        barcode: ticketData.code || ''
      }).toString();

      // We don't need to read the response; log fire-and-forget
      fetch(SHEET_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors', // avoids CORS preflight; we don't need to read the response
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      console.log('Successfully sent ticket data to Google Sheet.');
    } catch (error) {
      console.error('Error calling Google Sheet endpoint:', error);
    }
  }

  // Send ticket via email through Django API
  async function sendTicketEmail(ticketData) {
    try {
      if (!ticketData || !ticketData.email) {
        console.warn('Skipping email send: missing ticket email.');
        return;
      }
      const payload = {
        email: ticketData.email,
        customerName: ticketData.customerName || '',
        code: ticketData.code,
        amount: ticketData.amount || '0',
        eventDetails: ticketData.eventDetails || {},
        validUntil: ticketData.validUntil || '',
        imageUrl: (generatedBarcode && generatedBarcode.imageUrl) || ''
      };
      const res = await fetch('/api/send-ticket-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'Unknown'}));
        console.error('Failed to send ticket email:', err);
        return;
      }
      const json = await res.json().catch(()=>({}));
      console.log('Ticket email sent:', json);
    } catch (e) {
      console.error('Error sending ticket email:', e);
    }
  }

  // Auto-download barcode function
  function autoDownloadBarcode(ticketInfo) {
    if (!generatedBarcode || !confirmationCode) return;
    // Prevent repeated downloads for the same code
    if (downloadedCodes.has(confirmationCode)) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 500;
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Load and draw QR code
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        // Draw QR code
        ctx.drawImage(img, 100, 80, 200, 200);
        
        // Add header
        ctx.fillStyle = '#2c5530';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PALMWINE MERCHANTS & FLAMES', canvas.width/2, 30);
        ctx.fillText('EVENT TICKET', canvas.width/2, 55);
        
        // Add customer details
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        
        // Prefer provided ticketInfo (single source of truth), then lastPaymentInfo, then DOM inputs
        const pick = (primary, fallback1, fallback2) => {
          const v = (primary ?? '').toString().trim();
          if (v) return v;
          const f1 = (fallback1 ?? '').toString().trim();
          if (f1) return f1;
          const f2 = (fallback2 ?? '').toString().trim();
          return f2 || 'N/A';
        };
        const customerName = pick(ticketInfo && (ticketInfo.customerName || ticketInfo.name), lastPaymentInfo.name, document.getElementById('payerName')?.value);
        const phone = pick(ticketInfo && ticketInfo.phone, lastPaymentInfo.phone, document.getElementById('payPhone')?.value);
        const email = pick(ticketInfo && ticketInfo.email, lastPaymentInfo.email, document.getElementById('payEmail')?.value);
        const amount = pick(ticketInfo && (ticketInfo.amount || ticketInfo.amountPaid), lastPaymentInfo.amount, document.getElementById('amountPaid')?.value || '0');
        
        // Calculate ticket quantity based on amount and price (assuming ₦5000 per ticket)
        const ticketPrice = 5000;
        const ticketQuantity = Math.max(1, Math.floor(parseFloat(amount.replace(/,/g, '')) / ticketPrice));
        
        let yPos = 310;
        ctx.fillText(`Customer: ${customerName}`, 20, yPos);
        yPos += 20;
        ctx.fillText(`Phone: ${phone}`, 20, yPos);
        yPos += 20;
        ctx.fillText(`Email: ${email}`, 20, yPos);
        yPos += 20;
        ctx.fillText(`Tickets: ${ticketQuantity} ticket${ticketQuantity > 1 ? 's' : ''}`, 20, yPos);
        yPos += 20;
        ctx.fillText(`Amount: ₦${amount}`, 20, yPos);
        yPos += 20;
        ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
        yPos += 20;
        ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 20, yPos);
        
        // Add confirmation code
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Code: ${confirmationCode}`, canvas.width/2, 450);
        
        // Add footer
        ctx.font = '12px Arial';
        ctx.fillText('Scan to verify ticket authenticity', canvas.width/2, 480);
        
        // Download
        const link = document.createElement('a');
        const customerNameClean = customerName.replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `ticket-${customerNameClean}-${confirmationCode}.png`;
        link.href = canvas.toDataURL();
        downloadedCodes.add(confirmationCode);
        link.click();
        
        // Show success message
        setPayStatus('Ticket downloaded successfully!', 'ok');
      };
      img.src = generatedBarcode.imageUrl;
      
    } catch (error) {
      console.error('Error in autoDownloadBarcode:', error);
    }
  }

  // Simple QR code generator
  function generateQRCode(data, container, fullData) {
    // Clear container
    container.innerHTML = '';
    
    // Create QR code using QR Server API
    const qrSize = 200;
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(data)}`;
    qrImg.alt = 'QR Code';
    qrImg.style.width = qrSize + 'px';
    qrImg.style.height = qrSize + 'px';
    qrImg.style.imageRendering = 'crisp-edges';
    
    // Add to container
    container.appendChild(qrImg);
    
    // Store for download
    generatedBarcode = {
      data: data,          // what is encoded into the QR (now only the code)
      code: confirmationCode,
      imageUrl: qrImg.src,
      full: fullData || null // full ticket info for email/storage/download rendering
    };
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
        channels: ['card','bank','ussd','mobile_money','bank_transfer','qr'],
        callback: function(response) {
          if (typeof callback === 'function') {
            callback(response);
          }
        },
        onClose: function() {
          if (typeof onClose === 'function') {
            onClose();
          }
        }
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
          channels: ['card','bank','ussd','mobile_money','bank_transfer','qr'],
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

  // Helper: read query param from current URL
  function getQueryParam(name){
    try{ return new URLSearchParams(window.location.search).get(name); } catch(_){ return null; }
  }

  // If returned from Paystack Standard redirect, auto-fill ref and verify
  (function maybeHandleReturnFromPaystack(){
    const ref = getQueryParam('ps_ref');
    if (!ref) return;
    if (txRefInput) txRefInput.value = ref;
    if (pmSelect) pmSelect.value = 'Paystack';
    try{ updatePaymentUI(); } catch(_){}
    setPayStatus('Returned from Paystack. Verifying…', null);
    // Clean URL without ps_ref
    try{
      const url = new URL(window.location.href);
      url.searchParams.delete('ps_ref');
      window.history.replaceState({}, '', url.toString());
    } catch(_){ /* ignore */ }
    // Fire verification (non-blocking)
    verifyReference(false).then(()=>{ postVerificationAutoSubmitIfNeeded(); });
  })();

  const btnPayDeposit = document.getElementById('btn-pay-deposit');
  const btnPayFull = document.getElementById('btn-pay-full');

  // Event handlers are now managed in booking.html

  function handlePaymentSuccess(response) {
    console.log('Payment successful:', response);
    // Update UI and backend as needed
    alert('Payment complete! Reference: ' + response.reference);
  }

  function handlePaymentFailure(error) {
    console.error('Payment failed:', error);
    // Notify user and log error
  }
})();

// Booking page: attach handlers to Pay Deposit / Pay Full buttons even when payment-form is hidden
(function(){
  const btnDeposit = document.getElementById('btn-pay-deposit');
  const btnFull = document.getElementById('btn-pay-full');
  if (!btnDeposit && !btnFull) return; // not on booking page

  function getKey(){
    const meta = document.querySelector('meta[name="paystack-public-key"]');
    return (meta && meta.getAttribute('content')) || '';
  }
  function lastQuote(){
    try{ return window.__lastQuote || null; } catch(_){ return null; }
  }
  function startPay(type){
    const q = lastQuote();
    if (!q || !q.result){
      alert('Please compute a quote first.');
      return;
    }
    const amount = type === 'deposit' ? (q.result.deposit||0) : (q.result.total||0);
    if (!amount){ alert('Invalid amount. Please recompute the quote.'); return; }
    const key = getKey();
    if (!key){ console.error('Missing Paystack key'); alert('Payment configuration error.'); return; }
    const email = (q.data && q.data.email) || 'customer@example.com';
    const ref = `${q.id}-${type === 'deposit' ? 'DEP' : 'FULL'}`;
    try{
      const handler = (window.PaystackPop && PaystackPop.setup) ? PaystackPop.setup({
        key,
        email,
        amount: Math.round(amount * 100),
        currency: 'NGN',
        ref,
        callback: function(response){
          // Reuse existing verification flow if present
          try{
            if (typeof handlePaystackSuccess === 'function') handlePaystackSuccess(response);
          } catch(e){ console.error('Post-pay handler error:', e); }
        },
        onClose: function(){ console.info('Payment window closed'); }
      }) : null;
      if (handler && typeof handler.openIframe === 'function'){
        handler.openIframe();
      } else {
        alert('Payment could not be started. Please reload and try again.');
      }
    } catch(err){
      console.error('Paystack start error:', err);
      alert('Payment could not be started. Please try again.');
    }
  }

  // Avoid double-binding
  if (btnDeposit && !btnDeposit.dataset.init){ btnDeposit.addEventListener('click', ()=> startPay('deposit')); btnDeposit.dataset.init = '1'; }
  if (btnFull && !btnFull.dataset.init){ btnFull.addEventListener('click', ()=> startPay('full')); btnFull.dataset.init = '1'; }
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
    btnClose.addEventListener('click', () => {
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

// Pricing Calculator Modal (homepage only)
document.addEventListener('DOMContentLoaded', function() {
  const btnPricingCalculator = document.getElementById('btn-pricing-calculator');
  const pricingModal = document.getElementById('pricing-modal');
  const modalClose = document.querySelector('.modal-close');
  const modalOverlay = document.querySelector('.modal-overlay');
  const productCards = document.querySelectorAll('.product-card');
  const calculatorSections = document.querySelectorAll('.calculator-section');
  
  if (!btnPricingCalculator || !pricingModal) {
    // Silently fail if elements for the modal are not on the current page.
    return;
  }

  let lastFocusedBeforeModal = null;
  const FOCUSABLE_SELECTOR = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusFirstInModal(){
    const focusables = pricingModal.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusables.length) {
      (focusables[0]).focus();
    } else {
      pricingModal.focus();
    }
  }
  function selectProductType(type){
    const card = pricingModal.querySelector(`.product-card[data-type="${type}"]`);
    if (card){ card.click(); return true; }
    return false;
  }
  function ensureDefaultSelection(preferType){
    // Try preferred type first
    if (preferType && selectProductType(preferType)) return;
    // Otherwise keep existing active or pick first
    const active = pricingModal.querySelector('.product-card.active');
    if (active) return;
    const first = pricingModal.querySelector('.product-card');
    if (first){ first.click(); }
  }
  function openPricingModal(preferType){
    lastFocusedBeforeModal = document.activeElement;
    pricingModal.setAttribute('aria-hidden', 'false');
    pricingModal.classList.add('show');
    pricingModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    ensureDefaultSelection(preferType);
    setTimeout(focusFirstInModal, 0);
  }

  // Open modal from CTA
  btnPricingCalculator.addEventListener('click', () => { openPricingModal(); });
  // Open modal from homepage product cards
  document.querySelectorAll('.hp-product-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const type = card.getAttribute('data-type');
      openPricingModal(type);
    });
    card.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        const type = card.getAttribute('data-type');
        openPricingModal(type);
      }
    });
  });

  // Close modal
  function closeModal() {
    pricingModal.setAttribute('aria-hidden', 'true');
    pricingModal.classList.remove('show');
    pricingModal.style.display = 'none';
    document.body.style.overflow = '';
    // Restore focus to the trigger if available
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
      lastFocusedBeforeModal.focus();
    }
  }

  modalClose?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', closeModal);

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (pricingModal.getAttribute('aria-hidden') !== 'false') return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key === 'Tab'){
      const focusables = Array.from(pricingModal.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el=>el.offsetParent !== null || el === modalClose);
      if (!focusables.length) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey){
        if (active === firstEl || !pricingModal.contains(active)){ lastEl.focus(); e.preventDefault(); }
      } else {
        if (active === lastEl){ firstEl.focus(); e.preventDefault(); }
      }
    }
  });

  // Product selection
  productCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove active class from all cards
      productCards.forEach(c => c.classList.remove('active'));
      // Add active class to clicked card
      card.classList.add('active');
      
      // Hide all calculator sections
      calculatorSections.forEach(section => {
        section.style.display = 'none';
      });
      
      // Show relevant calculator section
      const type = card.dataset.type;
      const calcSection = document.getElementById(`${type}-calc`);
      if (calcSection) {
        calcSection.style.display = 'block';
      }
    });
  });

  // Bottles calculator
  const bottlesQty = document.getElementById('bottles-qty');
  const bottlesSubtotal = document.getElementById('bottles-subtotal');
  const bottlesVat = document.getElementById('bottles-vat');
  const bottlesTotal = document.getElementById('bottles-total');

  function updateBottlesCalc() {
    const qty = parseInt(bottlesQty?.value || 1);
    const subtotal = qty * 2500;
    const vat = Math.round(subtotal * 0.075);
    const total = subtotal + vat;

    if (bottlesSubtotal) bottlesSubtotal.textContent = `₦${subtotal.toLocaleString()}`;
    if (bottlesVat) bottlesVat.textContent = `₦${vat.toLocaleString()}`;
    if (bottlesTotal) bottlesTotal.textContent = `₦${total.toLocaleString()}`;
  }

  bottlesQty?.addEventListener('input', updateBottlesCalc);

  // Kegs calculator
  const kegsQty = document.getElementById('kegs-qty');
  const kegSize = document.getElementById('keg-size');
  const kegsSubtotal = document.getElementById('kegs-subtotal');
  const kegsVat = document.getElementById('kegs-vat');
  const kegsTotal = document.getElementById('kegs-total');

  function updateKegsCalc() {
    const qty = parseInt(kegsQty?.value || 1);
    const size = parseInt(kegSize?.value || 25);
    const pricePerKeg = size === 5 ? 14000 : 40000;
    const subtotal = qty * pricePerKeg;
    const vat = Math.round(subtotal * 0.075);
    const total = subtotal + vat;

    if (kegsSubtotal) kegsSubtotal.textContent = `₦${subtotal.toLocaleString()}`;
    if (kegsVat) kegsVat.textContent = `₦${vat.toLocaleString()}`;
    if (kegsTotal) kegsTotal.textContent = `₦${total.toLocaleString()}`;
  }

  kegsQty?.addEventListener('input', updateKegsCalc);
  kegSize?.addEventListener('change', updateKegsCalc);

  // Service calculator
  const serviceGuests = document.getElementById('service-guests');
  const serviceTypeRadios = document.querySelectorAll('input[name="service-type"]');
  const serviceSubtotal = document.getElementById('service-subtotal');
  const serviceVat = document.getElementById('service-vat');
  const serviceTotal = document.getElementById('service-total');

  function updateServiceCalc() {
    const guests = parseInt(serviceGuests?.value || 50);
    const serviceType = document.querySelector('input[name="service-type"]:checked')?.value || 'palmwine';
    const pricePerGuest = serviceType === 'cocktails' ? 3500 : 2000;
    
    const serviceAmount = guests * pricePerGuest;
    const logisticsFee = 85500;
    const subtotal = serviceAmount + logisticsFee;
    const vat = Math.round(subtotal * 0.075);
    const total = subtotal + vat;

    if (serviceSubtotal) serviceSubtotal.textContent = `₦${serviceAmount.toLocaleString()}`;
    if (serviceVat) serviceVat.textContent = `₦${vat.toLocaleString()}`;
    if (serviceTotal) serviceTotal.textContent = `₦${total.toLocaleString()}`;
  }

  serviceGuests?.addEventListener('input', updateServiceCalc);
  serviceTypeRadios.forEach(radio => {
    radio.addEventListener('change', updateServiceCalc);
  });

  // WhatsApp share functionality
  const btnWhatsAppQuote = document.getElementById('btn-whatsapp-quote');
  const btnBookNow = document.getElementById('btn-book-now');

  btnWhatsAppQuote?.addEventListener('click', () => {
    const activeCard = document.querySelector('.product-card.active');
    if (!activeCard) return;

    const type = activeCard.dataset.type;
    let message = 'Hi Palmwine Merchants — Here\'s my quote request:\n\n';

    if (type === 'bottles') {
      const qty = parseInt(bottlesQty?.value || 1);
      const total = qty * 2500 + Math.round(qty * 2500 * 0.075);
      message += `🥤 50CL Bottles\nQuantity: ${qty}\nTotal: ₦${total.toLocaleString()}`;
    } else if (type === 'kegs') {
      const qty = parseInt(kegsQty?.value || 1);
      const total = qty * 25000 + Math.round(qty * 25000 * 0.075);
      message += `🛢️ 25L Kegs\nQuantity: ${qty}\nTotal: ₦${total.toLocaleString()}`;
    } else if (type === 'service') {
      const guests = parseInt(serviceGuests?.value || 50);
      const serviceType = document.querySelector('input[name="service-type"]:checked')?.value || 'palmwine';
      const serviceName = serviceType === 'cocktails' ? 'Palmwine Cocktails' : 'Palmwine Service';
      const pricePerGuest = serviceType === 'cocktails' ? 3500 : 2000;
      const serviceAmount = guests * pricePerGuest;
      const logisticsFee = 85500;
      const subtotal = serviceAmount + logisticsFee;
      const vat = Math.round(subtotal * 0.075);
      const total = subtotal + vat;
      message += `🍶 ${serviceName}\nGuests: ${guests}\nService: ₦${serviceAmount.toLocaleString()}\nService & Logistics: ₦${logisticsFee.toLocaleString()}\nVAT (7.5%): ₦${vat.toLocaleString()}\nTotal: ₦${total.toLocaleString()}`;
    }

    const whatsappUrl = `https://wa.me/2348039490349?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  });

  btnBookNow?.addEventListener('click', () => {
    window.location.href = 'booking.html';
  });

  // Initialize calculations
  updateBottlesCalc();
  updateKegsCalc();
  updateServiceCalc();
});

// Ticket Verification System
(function() {
  const verifyForm = document.getElementById('verify-form');
  const qrVideo = document.getElementById('qr-video');
  const startScannerBtn = document.getElementById('start-scanner');
  const stopScannerBtn = document.getElementById('stop-scanner');
  const verificationResult = document.getElementById('verification-result');
  const resultStatus = document.getElementById('result-status');
  const resultDetails = document.getElementById('result-details');
  
  let qrScanner = null;
  
  if (!verifyForm) return; // Not on verification page
  
  // Manual verification form
  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('confirmation-code').value.trim();
    if (!code) return;
    
    await verifyTicket({ code });
  });
  
  // QR Scanner functionality
  if (startScannerBtn && qrVideo) {
    startScannerBtn.addEventListener('click', startQRScanner);
    stopScannerBtn.addEventListener('click', stopQRScanner);
  }
  
  async function startQRScanner() {
    try {
      if (typeof QrScanner === 'undefined') {
        alert('QR Scanner library not loaded. Please refresh the page.');
        return;
      }
      
      qrScanner = new QrScanner(qrVideo, result => {
        console.log('QR Code detected:', result);
        verifyTicket({ qrData: result });
        stopQRScanner();
      });
      
      await qrScanner.start();
      startScannerBtn.style.display = 'none';
      stopScannerBtn.style.display = 'inline-block';
      
    } catch (error) {
      console.error('Error starting QR scanner:', error);
      alert('Could not access camera. Please check permissions.');
    }
  }
  
  function stopQRScanner() {
    if (qrScanner) {
      qrScanner.stop();
      qrScanner = null;
    }
    startScannerBtn.style.display = 'inline-block';
    stopScannerBtn.style.display = 'none';
  }
  
  async function verifyTicket(data) {
    try {
      showVerificationResult('Verifying ticket...', 'loading');
      
      const response = await fetch('/api/verify-ticket/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.valid) {
        showValidTicket(result);
      } else {
        showInvalidTicket(result);
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      showVerificationResult('Verification failed. Please try again.', 'error');
    }
  }
  
  function showValidTicket(result) {
    const ticket = result.ticket;
    const statusHtml = `
      <div class="status-icon valid">
        <i class="fa-solid fa-check-circle"></i>
      </div>
      <h3>Valid Ticket</h3>
      <p>${result.message}</p>
    `;
    
    const detailsHtml = `
      <div class="ticket-details">
        <div class="detail-row">
          <strong>Confirmation Code:</strong> ${ticket.code}
        </div>
        <div class="detail-row">
          <strong>Customer:</strong> ${ticket.customerName}
        </div>
        <div class="detail-row">
          <strong>Phone:</strong> ${ticket.phone}
        </div>
        <div class="detail-row">
          <strong>Email:</strong> ${ticket.email}
        </div>
        <div class="detail-row">
          <strong>Amount Paid:</strong> ₦${ticket.amount}
        </div>
        <div class="detail-row">
          <strong>Purchase Date:</strong> ${ticket.purchaseDate} ${ticket.purchaseTime}
        </div>
        <div class="detail-row">
          <strong>Event:</strong> ${ticket.eventDetails.name || 'N/A'}
        </div>
        <div class="detail-row">
          <strong>Event Date:</strong> ${ticket.eventDetails.date || 'N/A'}
        </div>
        <div class="detail-row">
          <strong>Location:</strong> ${ticket.eventDetails.location || 'N/A'}
        </div>
        <div class="detail-row">
          <strong>Valid Until:</strong> ${ticket.validUntil}
        </div>
        <div class="detail-row">
          <strong>Verified At:</strong> ${new Date(result.verifiedAt).toLocaleString()}
        </div>
      </div>
    `;
    
    resultStatus.innerHTML = statusHtml;
    resultDetails.innerHTML = detailsHtml;
    verificationResult.style.display = 'block';
    verificationResult.className = 'verification-result valid';
  }
  
  function showInvalidTicket(result) {
    const statusHtml = `
      <div class="status-icon invalid">
        <i class="fa-solid fa-times-circle"></i>
      </div>
      <h3>Invalid Ticket</h3>
      <p>${result.message}</p>
    `;
    
    const detailsHtml = `
      <div class="ticket-details">
        <div class="detail-row">
          <strong>Status:</strong> ${result.status}
        </div>
        <div class="detail-row">
          <strong>Verified At:</strong> ${new Date(result.verifiedAt).toLocaleString()}
        </div>
      </div>
    `;
    
    resultStatus.innerHTML = statusHtml;
    resultDetails.innerHTML = detailsHtml;
    verificationResult.style.display = 'block';
    verificationResult.className = 'verification-result invalid';
  }
  
  function showVerificationResult(message, type) {
    const statusHtml = `
      <div class="status-icon ${type}">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
      <h3>${message}</h3>
    `;
    
    resultStatus.innerHTML = statusHtml;
    resultDetails.innerHTML = '';
    verificationResult.style.display = 'block';
    verificationResult.className = `verification-result ${type}`;
  }
})();
