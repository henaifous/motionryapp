/* ==========================================================================
   Motionry website: motion and interactions.
   No dependencies. Everything respects prefers-reduced-motion.
   ========================================================================== */

document.documentElement.classList.add('js');

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* Data
   ========================================================================== */

const ZONES = [
  { key: 'Z1', name: 'Recovery', desc: 'Easy spin. Warm-ups, cool-downs and rest days.', from: 0, to: 0.6 },
  { key: 'Z2', name: 'Endurance', desc: 'Can hold a conversation. Where the long, easy miles build your base.', from: 0.6, to: 0.7 },
  { key: 'Z3', name: 'Tempo', desc: 'Comfortably hard. Steady work you can sustain for a while.', from: 0.7, to: 0.8 },
  { key: 'Z4', name: 'Threshold', desc: 'Hard, about 20 minutes. Short breathing, long focus.', from: 0.8, to: 0.9 },
  { key: 'Z5', name: 'Max', desc: 'Sprints, under a minute. Motionry tells you when you stay here too long.', from: 0.9, to: 1 },
];
const ZONE_VARS = ['var(--z1)', 'var(--z2)', 'var(--z3)', 'var(--z4)', 'var(--z5)'];

/** The heart rates shown on the live screens in assets/img/screens/live-z1…z5. */
const HERO_BPM = [78, 117, 143, 156, 177];
/** Order the hero climbs and falls through the zones. */
const HERO_PATH = [0, 1, 2, 3, 4, 3, 2, 1];

const zoneIndexOf = (hr, max) => {
  const pct = hr / max;
  return pct < 0.6 ? 0 : pct < 0.7 ? 1 : pct < 0.8 ? 2 : pct < 0.9 ? 3 : 4;
};

/** Ease-out tween of a number. */
function tween(from, to, ms, onUpdate) {
  if (reduced) { onUpdate(to); return; }
  const start = performance.now();
  const step = (now) => {
    const p = clamp((now - start) / ms, 0, 1);
    const e = 1 - (1 - p) ** 3;
    onUpdate(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Runs `fn` while `el` is on screen and the tab is visible. */
function whileVisible(el, start, stop, margin = '0px') {
  let seen = false;
  const sync = () => (seen && !document.hidden ? start() : stop());
  new IntersectionObserver(([entry]) => { seen = entry.isIntersecting; sync(); }, { rootMargin: margin }).observe(el);
  document.addEventListener('visibilitychange', sync);
}

/* Navigation and scroll progress
   ========================================================================== */

function initNav() {
  const nav = $('[data-nav]');
  const toggle = $('[data-nav-toggle]');
  const links = $('#nav-links');
  const bar = $('[data-progress]');

  const onScroll = () => {
    nav.classList.toggle('is-stuck', window.scrollY > 24);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty('--p', max > 0 ? clamp(window.scrollY / max, 0, 1).toFixed(4) : 0);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const close = () => { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  const map = new Map($$('.nav__link').map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      map.forEach((a) => a.classList.remove('is-active'));
      map.get(entry.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((a, id) => { const section = document.getElementById(id); if (section) io.observe(section); });
}

/* Reveal on scroll
   ========================================================================== */

function initReveal() {
  const targets = $$('[data-reveal]');
  targets.forEach((el) => el.style.setProperty('--reveal-i', el.dataset.reveal || 0));
  const seen = $$('.tile, .download');

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    seen.forEach((el) => el.classList.add('is-seen'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      if (entry.target.matches('.tile, .download')) entry.target.classList.add('is-seen');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((el) => io.observe(el));
  seen.forEach((el) => io.observe(el));
}

/* Hero: a ride that climbs through the five zones
   ========================================================================== */

function initHero() {
  const hero = $('[data-hero]');
  const imgs = $$('[data-live-img]', hero);
  const hrEl = $('[data-hr]', hero);
  const nameEl = $('[data-zone-name]', hero);
  const segs = $$('[data-segments] span', hero);
  const alert = $('[data-alert]', hero);
  let step = 0;
  let current = HERO_BPM[0];
  let timer = null;

  function show(i) {
    const hr = HERO_BPM[i];
    imgs.forEach((img, k) => img.classList.toggle('is-on', k === i));
    segs.forEach((s, k) => s.classList.toggle('is-active', k === i));
    nameEl.textContent = `${ZONES[i].key} · ${ZONES[i].name}`;
    hero.style.setProperty('--zc', ZONE_VARS[i]);
    document.documentElement.style.setProperty('--beat', `${(60 / hr).toFixed(3)}s`);
    alert.classList.toggle('is-on', i === 4);
    tween(current, hr, 900, (v) => { hrEl.textContent = Math.round(v); });
    current = hr;
  }

  function next() {
    step = (step + 1) % HERO_PATH.length;
    show(HERO_PATH[step]);
    timer = setTimeout(next, HERO_PATH[step] === 4 ? 4200 : 2500);
  }

  show(reduced ? 2 : HERO_PATH[0]);
  if (reduced) return;
  whileVisible(hero, () => { if (!timer) timer = setTimeout(next, 2200); }, () => { clearTimeout(timer); timer = null; });

  // Pointer tilt for the phone (fine pointers only)
  const tilt = $('[data-tilt]', hero);
  if (tilt && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--ry', `${(-8 + x * 16).toFixed(2)}deg`);
      tilt.style.setProperty('--rx', `${(3 - y * 10).toFixed(2)}deg`);
    });
    hero.addEventListener('pointerleave', () => { tilt.style.setProperty('--ry', '-8deg'); tilt.style.setProperty('--rx', '3deg'); });
  }
}

/* Story: one pinned phone, six chapters
   ========================================================================== */

function initStory() {
  const root = $('[data-story]');
  const chapters = $$('.chapter', root);
  const layers = Object.fromEntries($$('[data-layer]', root).map((el) => [el.dataset.layer, el]));
  const rail = $$('[data-rail]', root);
  const live = $$('[data-story-live]', root);
  const chip = $('[data-story-chip]', root);
  const chipText = $('[data-story-chip-text]', root);
  const chipDot = $('.story__zone-dot', root);
  const cycleLayers = Object.fromEntries($$('[data-cycle]', root).map((el) => [el.dataset.layer, el]));
  let liveStep = 0;
  let cycleTimer = null;
  let liveTimer = null;
  let active = null;

  const setLive = (i) => {
    live.forEach((img, k) => img.classList.toggle('is-on', k === i));
    chipText.textContent = `${ZONES[i].key} · ${ZONES[i].name} · ${HERO_BPM[i]} bpm`;
    chipDot.style.background = ZONE_VARS[i];
    chipDot.style.color = ZONE_VARS[i];
  };
  const startLive = () => {
    if (liveTimer || reduced) return;
    liveTimer = setInterval(() => { liveStep = (liveStep + 1) % 5; setLive(liveStep); }, 1900);
  };
  const stopLive = () => { clearInterval(liveTimer); liveTimer = null; };

  /** Steps through the stills of a layer; the chips of the chapter follow when they are marked data-sync. */
  function startCycle(name) {
    clearInterval(cycleTimer);
    const layer = cycleLayers[name];
    if (!layer) return;
    const imgs = $$('img', layer);
    const chips = $$(`.chapter[data-chapter="${name}"] [data-sync] li`, root);
    let i = 0;
    const show = (k) => {
      imgs.forEach((img, n) => img.classList.toggle('is-on', n === k));
      chips.forEach((chip, n) => chip.classList.toggle('is-on', n === k % chips.length));
    };
    show(0);
    if (reduced) return;
    cycleTimer = setInterval(() => { i = (i + 1) % imgs.length; show(i); }, Number(layer.dataset.cycle) || 2400);
  }

  function activate(name, index) {
    if (name === active) return;
    active = name;
    chapters.forEach((c) => c.classList.toggle('is-active', c.dataset.chapter === name));
    rail.forEach((d, i) => d.classList.toggle('is-on', i === index));
    Object.entries(layers).forEach(([key, el]) => el.classList.toggle('is-on', key === name));
    chip.classList.toggle('is-off', name !== 'live');
    clearInterval(cycleTimer);
    if (name === 'live') { setLive(liveStep); startLive(); } else { stopLive(); startCycle(name); }
  }

  setLive(0);
  chapters.forEach((c, i) => c.dataset.index = i);
  rail[0].classList.add('is-on');
  activate('live', 0);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) activate(entry.target.dataset.chapter, Number(entry.target.dataset.index));
    });
  }, { rootMargin: '-42% 0px -42% 0px' });
  chapters.forEach((c) => io.observe(c));
}

/* Zones: pick a zone, set your own max heart rate
   ========================================================================== */

function initZones() {
  const root = $('[data-zones]');
  const list = $('[data-zone-list]', root);
  const input = $('[data-maxhr]', root);
  const beatEl = $('.beat', root);
  const beatBpm = $('[data-beat-bpm]', root);
  let max = 184;
  let selected = 2;
  let auto = null;
  let shown = 141;

  const lo = (z) => Math.round(ZONES[z].from * max);
  const range = (z) => (z === 0 ? `<${lo(1)}` : z === 4 ? `${lo(4)}+` : `${lo(z)}–${lo(z + 1) - 1}`);
  const mid = (z) => (z === 0 ? Math.round(max * 0.5) : z === 4 ? Math.round(max * 0.95) : Math.round((lo(z) + lo(z + 1) - 1) / 2));

  function build() {
    list.innerHTML = ZONES.map((z, i) => `
      <button type="button" role="tab" class="zone-row" data-zone="${i}" style="--c:${ZONE_VARS[i]}" aria-selected="${i === selected}">
        <span class="zone-row__main">
          <span class="zone-row__swatch"></span>
          <span class="zone-row__name"><b>${z.name}</b><small>${z.key} · ${Math.round(z.from * 100)}${z.to === 1 ? '%+' : '–' + Math.round(z.to * 100) + '%'} of max</small></span>
          <span class="zone-row__range" data-range="${i}">${range(i)}</span>
        </span>
        <span class="zone-row__more"><div><p>${z.desc}</p></div></span>
      </button>`).join('');
    select(selected, false);
  }

  function select(i, userInitiated = true) {
    selected = i;
    $$('.zone-row', list).forEach((row, k) => {
      row.classList.toggle('is-active', k === i);
      row.setAttribute('aria-selected', k === i);
    });
    root.style.setProperty('--zc', ZONE_VARS[i]);
    const bpm = mid(i);
    beatEl.style.setProperty('--beat', `${(60 / bpm).toFixed(3)}s`);
    tween(shown, bpm, 700, (v) => { beatBpm.textContent = Math.round(v); });
    shown = bpm;
    if (userInitiated) stopAuto();
  }

  function refresh() {
    $$('[data-range]', list).forEach((el) => { el.textContent = range(Number(el.dataset.range)); });
    select(selected, false);
  }

  const startAuto = () => { if (!auto && !reduced) auto = setInterval(() => select((selected + 1) % 5, false), 3200); };
  const stopAuto = () => { clearInterval(auto); auto = null; };

  list.addEventListener('click', (e) => { const row = e.target.closest('[data-zone]'); if (row) select(Number(row.dataset.zone)); });
  list.addEventListener('pointerenter', stopAuto);

  const setMax = (v) => { max = clamp(Math.round(v) || 184, 140, 220); input.value = max; refresh(); };
  input.addEventListener('input', () => { const v = Number(input.value); if (v >= 140 && v <= 220) { max = v; refresh(); } });
  input.addEventListener('change', () => setMax(Number(input.value)));
  $$('[data-maxhr-step]', root).forEach((b) => b.addEventListener('click', () => setMax(max + Number(b.dataset.maxhrStep))));
  $('[data-maxhr-age]', root).addEventListener('click', () => {
    const age = Number(window.prompt('How old are you?', '36'));
    if (age >= 10 && age <= 90) setMax(220 - age);
  });

  build();
  whileVisible(root, startAuto, stopAuto);
}

/* Sports: ride, run, walk
   ========================================================================== */

function initSports() {
  const root = $('[data-sports]');
  const tabs = $$('[data-sport]', root);
  const arts = $$('[data-art]', root);
  const screens = $$('[data-sport-img]', root);
  const label = $('[data-sport-label]', root);
  const valueEl = $('[data-sport-value]', root);
  const unit = $('[data-sport-unit]', root);
  const hrEl = $('[data-sport-hr]', root);
  const hrUnit = hrEl.nextElementSibling;
  const pause = $('[data-sport-pause]', root);
  const SPORT = [
    { label: 'Speed', unit: 'km/h', base: 24.1, hr: 143, pause: 'On', fmt: (v) => v.toFixed(1) },
    { label: 'Pace', unit: '/km', base: 308, hr: 158, pause: 'Off', fmt: (v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}` },
    { label: 'Steps', unit: 'today', base: 6812, hr: 96, pause: 'On', fmt: (v) => Math.round(v).toLocaleString('en-US') },
  ];
  let idx = 0;
  let tick = 0;
  let timer = null;
  let live = null;

  function render() {
    const s = SPORT[idx];
    const wobble = Math.sin(tick * 0.9) + Math.sin(tick * 0.37) * 0.6;
    const v = idx === 1 ? s.base + wobble * 4 : idx === 2 ? s.base + tick * 3 : s.base + wobble * 0.5;
    const hr = Math.round(s.hr + wobble * 2.4);
    valueEl.textContent = s.fmt(v);
    hrEl.textContent = hr;
    hrUnit.textContent = `bpm · ${ZONES[zoneIndexOf(hr, 184)].key}`;
  }

  function select(i, user = false) {
    idx = i;
    tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', k === i); });
    arts.forEach((a, k) => a.classList.toggle('is-on', k === i));
    screens.forEach((a, k) => a.classList.toggle('is-on', k === i));
    const s = SPORT[i];
    label.textContent = s.label; unit.textContent = s.unit; pause.textContent = s.pause;
    render();
    if (user) { clearInterval(timer); timer = null; }
  }

  tabs.forEach((t, k) => t.addEventListener('click', () => select(k, true)));
  select(0);
  if (reduced) return;
  whileVisible(root, () => {
    if (!timer) timer = setInterval(() => select((idx + 1) % 3), 5200);
    if (!live) live = setInterval(() => { tick += 1; render(); }, 1100);
  }, () => { clearInterval(timer); clearInterval(live); timer = live = null; });
}

/* Watch: a crown-turn through the screens
   ========================================================================== */

function initWatch() {
  const root = $('[data-watch]');
  const imgs = $$('[data-watch-img]', root);
  const dotsWrap = $('[data-watch-dots]', root);
  const caption = $('[data-watch-caption]', root);
  const crown = $('.watch__crown', root);
  const CAPTIONS = ['Pick a sport', 'Ride: speed and zones', 'Run: pace, zones, cadence', 'Walk: steps and heart rate', 'Pause, lap, lock', 'Done, and on your iPhone'];
  let idx = 0;
  let timer = null;

  dotsWrap.innerHTML = imgs.map((_, i) => `<button type="button" role="tab" aria-label="${CAPTIONS[i]}" data-i="${i}"></button>`).join('');
  const dots = $$('button', dotsWrap);

  function select(i, user = false) {
    idx = i;
    imgs.forEach((img, k) => img.classList.toggle('is-on', k === i));
    dots.forEach((d, k) => { d.classList.toggle('is-on', k === i); d.setAttribute('aria-selected', k === i); });
    caption.textContent = CAPTIONS[i];
    crown.classList.add('is-turning');
    setTimeout(() => crown.classList.remove('is-turning'), 320);
    if (user) { clearInterval(timer); timer = null; }
  }
  dotsWrap.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) select(Number(b.dataset.i), true); });
  select(0);
  if (reduced) return;
  whileVisible(root, () => { if (!timer) timer = setInterval(() => select((idx + 1) % imgs.length), 2800); }, () => { clearInterval(timer); timer = null; });
}

/* Counters, bento toggles and the drag-to-finish slider
   ========================================================================== */

function initBento() {
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const tile = el.closest('.tile');
    const run = () => tween(0, target, 1400, (v) => { el.textContent = v.toFixed(decimals); });
    if (reduced) return;
    el.textContent = (0).toFixed(decimals);
    new MutationObserver((_, obs) => { if (tile.classList.contains('is-seen')) { run(); obs.disconnect(); } }).observe(tile, { attributes: true, attributeFilter: ['class'] });
  });

  const sources = $$('[data-source]');
  sources.forEach((s) => s.addEventListener('click', () => {
    sources.forEach((o) => { const on = o === s; o.classList.toggle('is-active', on); o.setAttribute('aria-pressed', on); });
  }));

  const drag = $('[data-drag]');
  const handle = $('[data-drag-handle]', drag);
  let startX = 0; let base = 0; let dragging = false; let timer = null;
  const maxX = () => drag.clientWidth - handle.offsetWidth - 12;
  const setX = (x) => drag.style.setProperty('--x', `${clamp(x, 0, maxX())}px`);
  const finish = () => {
    setX(maxX());
    drag.classList.add('is-done');
    clearTimeout(timer);
    timer = setTimeout(() => { drag.classList.remove('is-done'); setX(0); }, 3200);
  };
  handle.addEventListener('pointerdown', (e) => {
    if (drag.classList.contains('is-done')) return;
    dragging = true; startX = e.clientX; base = parseFloat(getComputedStyle(drag).getPropertyValue('--x')) || 0;
    handle.setPointerCapture(e.pointerId); handle.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove', (e) => { if (dragging) setX(base + e.clientX - startX); });
  const release = () => {
    if (!dragging) return;
    dragging = false; handle.classList.remove('is-dragging');
    const x = parseFloat(getComputedStyle(drag).getPropertyValue('--x')) || 0;
    x > maxX() * 0.82 ? finish() : setX(0);
  };
  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', release);
  handle.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } });
}

/* The share video plays only while it is on screen
   ========================================================================== */

function initClips() {
  if (reduced) return;
  $$('video[data-autoplay]').forEach((v) => whileVisible(v, () => v.play().catch(() => {}), () => v.pause(), '100px'));
}

/* Phones that step through a few screens while they are on screen
   ========================================================================== */

function initCycles() {
  $$('.phone__screen[data-cycle]').filter((el) => !el.closest('[data-story]')).forEach((el) => {
    const imgs = $$('img', el);
    let i = 0;
    let timer = null;
    const show = (k) => imgs.forEach((img, n) => img.classList.toggle('is-on', n === k));
    if (reduced) return;
    whileVisible(el, () => { if (!timer) timer = setInterval(() => { i = (i + 1) % imgs.length; show(i); }, Number(el.dataset.cycle) || 2400); }, () => { clearInterval(timer); timer = null; });
  });
}

/* Android waitlist
   ========================================================================== */

function initWaitlist() {
  const form = $('[data-waitlist]');
  const done = $('[data-waitlist-done]');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    if (!email.includes('@')) return;
    // TODO: send the address to the waitlist backend once it exists
    $('[data-waitlist-email]', done).textContent = email;
    form.hidden = true;
    done.hidden = false;
  });
}

/* Boot
   ========================================================================== */

initNav();
initReveal();
initHero();
initStory();
initZones();
initSports();
initWatch();
initBento();
initCycles();
initClips();
initWaitlist();
