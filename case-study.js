// Interactions for the campaign creation case study.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Fit the 1440px Figma frame on smaller screens ---------- */
const fit = () => {
  const z = Math.min(1, document.documentElement.clientWidth / 1440);
  document.documentElement.style.setProperty('--cs-zoom', z);
};
fit();
window.addEventListener('resize', fit);

/* ---------- Nav shadow on scroll ---------- */
const nav = document.querySelector('[data-component="nav"]');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Before / After toggle (300ms dissolve) ---------- */
const toggle = document.querySelector('.toggle');
const before = document.querySelector('.cs-compare__img--before');
const after = document.querySelector('.cs-compare__img--after');
if (toggle) toggle.addEventListener('click', () => {
  const on = toggle.getAttribute('aria-checked') !== 'true';
  toggle.setAttribute('aria-checked', String(on));
  toggle.setAttribute('aria-label', on ? 'Show the old flow' : 'Show the redesigned flow');
  before.classList.toggle('is-active', !on);
  after.classList.toggle('is-active', on);
});

/* ---------- Segmented tabs (iterations, channel preview) ---------- */
document.querySelectorAll('[data-tabset]').forEach((set) => {
  const tabs = [...set.querySelectorAll('[role="tab"]')];
  const stage = set.querySelector('.tabset__stage');
  const panelOf = (tab) => set.querySelector(`#${tab.getAttribute('aria-controls')}`);

  const sizeStage = (panel) => { stage.style.height = `${panel.offsetHeight}px`; };

  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panelOf(t).classList.toggle('is-active', on);
    });
    sizeStage(panelOf(tab));
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });

  const active = tabs.find((t) => t.classList.contains('is-active')) || tabs[0];
  const sizeActive = () => sizeStage(panelOf(tabs.find((t) => t.classList.contains('is-active'))));
  window.addEventListener('load', sizeActive);
  window.addEventListener('resize', sizeActive);
  select(active);
});

/* ---------- Doodle waves on hover (same animation as the homepage polaroid) ---------- */
const doodle = document.querySelector('.final__doodle');
if (doodle && !reduceMotion) {
  const wave = () => { if (!doodle.classList.contains('is-waving')) doodle.classList.add('is-waving'); };
  doodle.addEventListener('pointerenter', wave);
  doodle.addEventListener('focus', wave);
  doodle.addEventListener('animationend', (e) => {
    if (e.animationName === 'arm-lift') doodle.classList.remove('is-waving');
  });
}

/* ---------- C.1 AI scheduling: the AI scheduling pill lights up the panel ---------- */
const aiPanel = document.getElementById('ai-scheduling');
if (aiPanel) {
  document.querySelectorAll('[data-ai-link]').forEach((link) => {
    link.addEventListener('pointerenter', () => aiPanel.classList.add('is-linked'));
    link.addEventListener('pointerleave', () => aiPanel.classList.remove('is-linked'));
    link.addEventListener('click', () => {
      aiPanel.classList.add('is-linked');
      setTimeout(() => aiPanel.classList.remove('is-linked'), 1600);
    });
  });
}

/* ---------- AI scheduling stepper ----------
   Click (or arrow keys) to pick a step. While the panel is on screen it also walks through the steps on its
   own; step 3 shows the chart, then the same segments as a table. Hovering or focusing pauses it, and
   reduced motion turns it off. The Chart / Table switch flips step 3's view by hand. */
const flow = document.querySelector('[data-component="ai-flow"]');
if (flow) {
  const steps = [...flow.querySelectorAll('[role="tab"]')];
  const views = [...flow.querySelectorAll('[data-view]')];
  const FRAMES = [
    { step: 0, screen: 'ai-screen-1' },
    { step: 1, screen: 'ai-screen-2' },
    { step: 2, screen: 'ai-screen-3' },
    { step: 2, screen: 'ai-screen-3t' },
  ];
  const STEP_MS = 3600;
  let frame = 0;
  let timer = null;
  let inView = false;
  let held = false;

  const show = (f, focus) => {
    const prevStep = FRAMES[frame].step;
    frame = (f + FRAMES.length) % FRAMES.length;
    const { step, screen } = FRAMES[frame];
    steps.forEach((tab, n) => {
      const on = n === step;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    flow.querySelectorAll('.ai-flow__screen').forEach((s) => s.classList.toggle('is-active', s.id === screen));
    views.forEach((b) => { const on = b.dataset.view === screen; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    flow.classList.toggle('is-step-3', step === 2);
    if (focus) steps[step].focus();
    // restart the progress fill only when the step changes; step 3 fills over both of its views
    if (step !== prevStep || !timer) {
      const frames = FRAMES.filter((x) => x.step === step).length;
      flow.style.setProperty('--ai-step-ms', `${STEP_MS * frames}ms`);
      flow.classList.remove('is-playing');
      if (timer) { void flow.offsetWidth; flow.classList.add('is-playing'); }
    }
  };
  const firstFrameOf = (step) => FRAMES.findIndex((x) => x.step === step);

  const stop = () => { clearInterval(timer); timer = null; flow.classList.remove('is-playing'); };
  const play = () => {
    if (reduceMotion || timer || !inView || held) return;
    timer = setInterval(() => show(frame + 1), STEP_MS);
    const frames = FRAMES.filter((x) => x.step === FRAMES[frame].step).length;
    flow.style.setProperty('--ai-step-ms', `${STEP_MS * frames}ms`);
    flow.classList.add('is-playing');
  };

  steps.forEach((tab, n) => tab.addEventListener('click', () => { stop(); show(firstFrameOf(n)); }));
  views.forEach((b) => b.addEventListener('click', () => { stop(); show(FRAMES.findIndex((x) => x.screen === b.dataset.view)); }));
  flow.addEventListener('keydown', (e) => {
    const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (move && e.target.matches('[role="tab"]')) { e.preventDefault(); stop(); show(firstFrameOf((FRAMES[frame].step + move + steps.length) % steps.length), true); }
  });
  flow.addEventListener('pointerenter', () => { held = true; stop(); });
  flow.addEventListener('pointerleave', () => { held = false; play(); });
  flow.addEventListener('focusin', () => { held = true; stop(); });
  flow.addEventListener('focusout', () => { held = false; play(); });

  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) play(); else stop();
  }, { threshold: 0.5 }).observe(flow);
}

/* ---------- Segmentation: sticky chapter list ----------
   Appears once the reader passes the hero and highlights the chapter in view. */
const toc = document.querySelector('[data-component="sg-toc"]');
if (toc) {
  const links = [...toc.querySelectorAll('a')];
  const chapters = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const hero = document.querySelector('[data-component="cs-hero"]');
  const roomy = window.matchMedia('(min-width: 1300px)');
  const setActive = (id) => links.forEach((a) => {
    const on = a.getAttribute('href') === `#${id}`;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-40% 0px -55% 0px' });
  chapters.forEach((c) => io.observe(c));
  const showToc = () => toc.classList.toggle('is-visible', roomy.matches && hero.getBoundingClientRect().bottom < 0);
  showToc();
  window.addEventListener('scroll', showToc, { passive: true });
  roomy.addEventListener('change', showToc);
}

/* ---------- Segmentation: rewind line ----------
   As the track crosses the middle of the screen the line fills, and the word rolls Screens → SQL → Request.
   Reduced motion shows the finished state. */
const rewind = document.querySelector('[data-component="sg-rewind"]');
if (rewind) {
  const track = rewind.querySelector('.sg-rewind__track');
  const STEPS = 3;
  const set = (p) => {
    rewind.style.setProperty('--rw', p.toFixed(3));
    rewind.style.setProperty('--rw-i', Math.min(STEPS - 1, Math.floor(p * STEPS)));
  };
  if (reduceMotion) set(1);
  else {
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = track.getBoundingClientRect();
      const start = innerHeight * 0.75; // fill begins when the track top reaches 75% of the screen…
      const end = innerHeight * 0.35;   // …and completes when its bottom reaches 35%
      const p = (start - r.top) / (r.height + start - end);
      set(Math.max(0, Math.min(1, p)));
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }
}
