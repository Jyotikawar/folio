// Interactions for the portfolio page. Each block targets one component
// (data-component) so it can be changed or removed on its own.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktopHero = () => window.matchMedia('(min-width: 1101px)').matches;

/* ---------- Draggable collage pieces (polaroid, sticky note, toolkit, dev card) ---------- */
const DRAG_THRESHOLD = 4; // px before a press counts as a drag rather than a click
let topZ = 30;

function makeDraggable(el) {
  let start = null;

  const setOffset = (x, y) => {
    el.dataset.dx = x;
    el.dataset.dy = y;
    el.style.setProperty('--dx', `${x}px`);
    el.style.setProperty('--dy', `${y}px`);
  };

  el.addEventListener('pointerdown', (e) => {
    if (!isDesktopHero() || e.button !== 0) return;
    start = {
      x: e.clientX,
      y: e.clientY,
      dx: Number(el.dataset.dx || 0),
      dy: Number(el.dataset.dy || 0),
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    if (!start) return;
    const mx = e.clientX - start.x;
    const my = e.clientY - start.y;
    if (!start.moved && Math.hypot(mx, my) < DRAG_THRESHOLD) return;
    if (!start.moved) {
      start.moved = true;
      el.classList.add('is-dragging');
      el.style.zIndex = ++topZ;
    }
    setOffset(start.dx + mx, start.dy + my);
  });

  const end = (e) => {
    if (!start) return;
    if (start.moved) {
      // Mark the click that follows a drag so the toolkit doesn't toggle
      el.dataset.justDragged = '1';
      setTimeout(() => delete el.dataset.justDragged, 0);
    }
    el.classList.remove('is-dragging');
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    start = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  // Keyboard: arrows nudge (Shift = bigger steps), Escape puts it back
  el.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 24 : 8;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [x, y] = moves[e.key];
      setOffset(Number(el.dataset.dx || 0) + x, Number(el.dataset.dy || 0) + y);
    } else if (e.key === 'Escape') {
      setOffset(0, 0);
    }
  });

  // Double-click returns the piece to its Figma position
  el.addEventListener('dblclick', () => setOffset(0, 0));
}

document.querySelectorAll('.draggable').forEach(makeDraggable);

/* ---------- Polaroid: she waves 4 times on hover/focus, then stops (no loop) ----------
   The class stays until the wave finishes, so leaving early doesn't snap the arm back. */
const polaroid = document.querySelector('[data-component="polaroid"]');
if (polaroid && !prefersReducedMotion) {
  const arm = polaroid.querySelector('.sprite--arm');
  const wave = () => { if (!polaroid.classList.contains('is-waving')) polaroid.classList.add('is-waving'); };
  polaroid.addEventListener('pointerenter', wave);
  polaroid.addEventListener('focus', wave);
  arm.addEventListener('animationend', (e) => {
    if (e.animationName === 'arm-lift') polaroid.classList.remove('is-waving');
  });
}

/* ---------- Toolkit folder: closed by default, opens on hover (Figma ON_HOVER → Variant2) ----------
   Hover and keyboard focus are handled in CSS; touch screens have no hover, so a tap toggles it. */
const toolkit = document.querySelector('[data-component="toolkit"]');
if (toolkit) {
  const isOpen = () => toolkit.matches(':hover, :focus-visible') || toolkit.classList.contains('is-open');
  const syncAria = () => toolkit.setAttribute('aria-expanded', String(isOpen()));
  ['pointerenter', 'pointerleave', 'focus', 'blur'].forEach((type) =>
    toolkit.addEventListener(type, () => requestAnimationFrame(syncAria))
  );

  let lastPointer = 'mouse';
  toolkit.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
  toolkit.addEventListener('click', () => {
    if (lastPointer !== 'touch' || toolkit.dataset.justDragged) return;
    toolkit.classList.toggle('is-open');
    syncAria();
  });
  // A tap anywhere else closes it again on touch screens
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && !toolkit.contains(e.target) && toolkit.classList.contains('is-open')) {
      toolkit.classList.remove('is-open');
      syncAria();
    }
  });
}

/* ---------- About: shuffle the photo stack ----------
   Click/Enter/Space on the front polaroid tosses it out; halfway through, the two pictures (and
   their captions) trade cards, so the hidden one lands on top and develops like instant film. */
const stack = document.querySelector('[data-component="photo-stack"]');
if (stack) {
  const front = stack.querySelector('.photo--front');
  const back = stack.querySelector('.photo--back');
  const wrap = stack.closest('.about__wrap');
  const SWAP_AT = prefersReducedMotion ? 0 : 290; // ms — the moment the front card is furthest out
  const DONE_AT = prefersReducedMotion ? 0 : 700;
  let busy = false;

  const trade = () => {
    const parts = (fig) => [fig.querySelector('.photo__img'), fig.querySelector('figcaption')];
    const [fImg, fCap] = parts(front);
    const [bImg, bCap] = parts(back);
    front.replaceChildren(bImg, bCap);
    back.replaceChildren(fImg, fCap);
  };

  const shuffle = () => {
    if (busy) return;
    busy = true;
    if (!prefersReducedMotion) {
      stack.classList.add('is-shuffling');
      wrap.classList.add('is-shuffled');
    }
    setTimeout(() => {
      trade();
      if (!prefersReducedMotion) {
        front.classList.remove('is-developing');
        void front.offsetWidth; // restart the develop animation on every shuffle
        front.classList.add('is-developing');
      }
    }, SWAP_AT);
    setTimeout(() => {
      stack.classList.remove('is-shuffling');
      wrap.classList.remove('is-shuffled');
      busy = false;
    }, DONE_AT);
  };

  front.addEventListener('click', shuffle);
  front.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shuffle(); }
  });
  front.addEventListener('animationend', (e) => {
    if (e.animationName === 'photo-develop') front.classList.remove('is-developing');
  });
}

/* ---------- Campaign thumbnail: replay the AI optimisation ----------
   Hovering the card (or scrolling it into view once) strikes out the old 6 steps, lands the 3 new ones,
   then runs the "Optimising your segments…" count-up and drops the four segments on the chart. */
const thumb = document.querySelector('[data-component="campaign-thumb"]');
if (thumb && !prefersReducedMotion) {
  const pct = thumb.querySelector('.thumb__pct');
  const lastBlob = thumb.querySelector('.blob--4');
  const COUNT_MS = 1150;
  const COUNT_DELAY = 1400; // ms — the loader fades in after the new steps land

  const play = () => {
    if (thumb.classList.contains('is-playing')) return;
    thumb.classList.add('is-playing');
    pct.textContent = "0%";
    const t0 = performance.now() + COUNT_DELAY;
    const tick = (now) => {
      const p = Math.max(0, Math.min((now - t0) / COUNT_MS, 1));
      pct.textContent = `${Math.round((1 - (1 - p) ** 2) * 100)}%`; // eases out towards 100
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  lastBlob.addEventListener('animationend', () => thumb.classList.remove('is-playing'));
  thumb.closest('.case').addEventListener('pointerenter', play);
  thumb.closest('.case').querySelector('.case__link')?.addEventListener('focus', play);

  new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) { play(); observer.disconnect(); }
  }, { threshold: 0.6 }).observe(thumb);
}

/* ---------- Nav: highlight the section in view, add a backdrop once scrolled ---------- */
const nav = document.querySelector('[data-component="nav"]');
const navLinks = [...document.querySelectorAll('.nav__link')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const setActive = (id) => {
  navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
};

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);
sections.forEach((section) => sectionObserver.observe(section));

const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Footer: paint the brush highlight when it comes into view ---------- */
const footer = document.querySelector('[data-component="footer"]');
if (footer && !prefersReducedMotion) {
  footer.classList.add('brush-ready'); // hides the brush until it's painted in; stays visible without JS

  new IntersectionObserver(
    (entries, observer) => {
      if (entries[0].isIntersecting) {
        footer.classList.add('is-visible');
        observer.disconnect();
      }
    },
    { threshold: 0.4 }
  ).observe(footer);
}
