/* ==========================================================================
   Motionry — website interactions
   ========================================================================== */

document.documentElement.classList.add('js');

/* Data
   ========================================================================== */

const ZONES = [
  { key: 'Z1', name: 'Recovery', desc: 'Easy spin', range: '<110', pct: 'under 60%', color: 'var(--z1)', colorDark: 'var(--z1-d)', fg: '#fff' },
  { key: 'Z2', name: 'Endurance', desc: 'Can hold a conversation', range: '110–128', pct: '60–69%', color: 'var(--z2)', colorDark: 'var(--z2-d)', fg: '#fff' },
  { key: 'Z3', name: 'Tempo', desc: 'Comfortably hard', range: '129–146', pct: '70–79%', color: 'var(--z3)', colorDark: 'var(--z3)', fg: '#000' },
  { key: 'Z4', name: 'Threshold', desc: 'Hard, about 20 minutes', range: '147–165', pct: '80–89%', color: 'var(--z4)', colorDark: 'var(--z4)', fg: '#000' },
  { key: 'Z5', name: 'Max', desc: 'Sprints, under a minute', range: '166+', pct: '90%+', color: 'var(--z5)', colorDark: 'var(--z5-d)', fg: '#000' },
];

/** Closed loop used for every route drawing on the page (200×200 viewBox). */
const ROUTE = 'M42,150 C28,118 40,88 64,74 S104,36 132,46 S176,72 168,104 S138,132 150,156 S128,188 98,178 S60,176 42,150 Z';

/** Heart-rate waypoints the simulated ride loops through. */
const HR_WAYPOINTS = [106, 114, 122, 130, 138, 144, 150, 156, 162, 170, 178, 172, 160, 148, 136, 124];

const MAP_MODES = {
  hr: {
    colors: ['var(--z2-d)', 'var(--z3)', 'var(--z4)', 'oklch(0.66 0.21 27)', 'var(--z4)', 'var(--z3)'],
    tip: { main: '176 bpm', sub: 'Z5 · km 18.4', dot: 'oklch(0.66 0.21 27)' },
  },
  speed: {
    colors: ['#9a9a9a', '#5e5e5e', '#2b2b2b', '#000', '#2b2b2b', '#5e5e5e'],
    tip: { main: '31.2 km/h', sub: 'km 18.4', dot: '#000' },
  },
  climb: {
    colors: ['#c9c9c9', '#8a8a8a', '#000', '#000', '#5e5e5e', '#9a9a9a'],
    tip: { main: '214 m', sub: 'km 18.4', dot: '#000' },
  },
};

const SPORTS = {
  ride: { name: 'Ride', elapsedStart: 4722 },
  run: { name: 'Run', elapsedStart: 2592 },
  walk: { name: 'Walk', elapsedStart: 2285 },
};

/**
 * Hero screen metrics for each sport at simulated time t and heart rate hr.
 * Returns the big left metric plus the three stats under the zone bar.
 */
function sportMetrics(sport, t, hr) {
  if (sport === 'run') {
    const pace = Math.round(330 - (hr - 106) * 1.2 + Math.sin(t * 0.7) * 4);
    return {
      label: 'Pace',
      value: `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, '0')}`,
      unit: '/km',
      stats: [
        ['Distance', (8.42 + t * 0.003).toFixed(2), 'km'],
        ['Cadence', String(170 + Math.round(Math.sin(t) * 2)), 'spm'],
        ['Stride', '1.14', 'm'],
      ],
    };
  }
  if (sport === 'walk') {
    return {
      label: 'Steps',
      value: (6812 + Math.floor(t * 1.8)).toLocaleString('en-US'),
      unit: 'today +4,930',
      stats: [
        ['Distance', (4.21 + t * 0.0012).toFixed(2), 'km'],
        ['Pace', '12:21', '/km'],
        ['Calories', String(238 + Math.floor(t * 0.1)), 'kcal'],
      ],
    };
  }
  return {
    label: 'Speed',
    value: (20 + (hr - 105) * 0.19 + Math.sin(t * 0.7) * 0.5).toFixed(1),
    unit: 'km/h',
    stats: [
      ['Distance', (32.6 + t * 0.007).toFixed(1), 'km'],
      ['Avg HR', '141', ''],
      ['Climb', '+412', 'm'],
    ],
  };
}

/* Helpers
   ========================================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const zoneIndexOf = (hr) => (hr < 110 ? 0 : hr < 129 ? 1 : hr < 147 ? 2 : hr < 166 ? 3 : 4);

/** Smoothly interpolated heart rate at simulated time t (seconds). */
function heartRateAt(t) {
  const n = HR_WAYPOINTS.length;
  const pos = (((t / 3) % n) + n) % n;
  const i = Math.floor(pos);
  const f = pos - i;
  const ease = f * f * (3 - 2 * f);
  const from = HR_WAYPOINTS[i];
  const to = HR_WAYPOINTS[(i + 1) % n];
  return Math.round(from + (to - from) * ease + Math.sin(t * 1.9) * 1.6);
}

/** Maps a heart rate (100–185 bpm) to the live chart's 120-unit-high viewBox. */
const chartY = (hr) => (120 - ((hr - 100) / 85) * 120).toFixed(1);

function formatDuration(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function setText(name, value) {
  $$(`[data-live="${name}"]`).forEach((el) => { el.textContent = value; });
}

/* Routes
   ========================================================================== */

function initRoutes() {
  $$('path[data-route]').forEach((path) => path.setAttribute('d', ROUTE));
}

/* Live simulation (hero, strip, watch, share card)
   ========================================================================== */

function initLiveRide() {
  const root = document.documentElement;
  const segmentGroups = $$('[data-live="segments"]').map((group) => [...group.children]);
  const metrics = $('[data-live="metrics"]');
  const sportIcon = $('[data-live="sport-icon"]');
  const routeProgress = $('[data-live="route-progress"]');
  const routeDot = $('[data-live="route-dot"]');
  const routeLength = routeProgress.getTotalLength();
  const alert = $('[data-live="alert"]');
  const spark = $('[data-live="spark"]');
  const flyRoute = $('[data-live="fly-route"]');
  const flyProgress = $('[data-live="fly-progress"]');

  const STEP = 0.4; // simulated seconds per tick
  let t = 0;
  let sport = 'ride';

  function render() {
    const baseHr = heartRateAt(t);
    // Walks sit lower on the heart rate curve
    const hr = sport === 'walk' ? Math.round(92 + (baseHr - 106) * 0.32) : baseHr;
    const zi = zoneIndexOf(hr);
    const zone = ZONES[zi];

    root.style.setProperty('--zc', zone.colorDark);

    setText('hr', hr);
    setText('zone-label', `${zone.key} ${zone.name}`);
    setText('zone-long', `${zone.key} · ${zone.name} · ${hr} bpm`);
    setText('elapsed', formatDuration(SPORTS[sport].elapsedStart + t));

    const m = sportMetrics(sport, t, hr);
    setText('m1-label', m.label);
    setText('m1', m.value);
    setText('m1-unit', m.unit);
    m.stats.forEach(([label, value, unit], i) => {
      setText(`stat-label-${i}`, label);
      setText(`stat-value-${i}`, value);
      setText(`stat-unit-${i}`, unit);
    });

    segmentGroups.forEach((segs) => segs.forEach((seg, i) => seg.classList.toggle('is-active', i === zi)));
    alert.classList.toggle('is-shown', zi === 4);

    const progress = (t * 1.2) % 100;
    routeProgress.setAttribute('stroke-dasharray', `${progress.toFixed(2)} 100`);
    const point = routeProgress.getPointAtLength((routeLength * progress) / 100);
    routeDot.setAttribute('cx', point.x.toFixed(1));
    routeDot.setAttribute('cy', point.y.toFixed(1));

    // The live strip always charts the ride curve, independent of the hero sport
    const points = [];
    for (let i = 0; i < 60; i++) {
      const sampleT = t - (59 - i) * 0.5;
      points.push(`${((i * 1000) / 59).toFixed(1)},${chartY(heartRateAt(sampleT))}`);
    }
    spark.setAttribute('points', points.join(' '));

    const fly = (t * 4) % 100;
    flyRoute.setAttribute('stroke-dasharray', `${fly.toFixed(1)} 100`);
    flyProgress.style.width = `${fly.toFixed(1)}%`;
  }

  initSegmented($('[data-sports]'), 'data-sport', (next) => {
    sport = next;
    setText('sport-name', SPORTS[sport].name);
    sportIcon.setAttribute('href', `#i-${sport}`);
    metrics.classList.toggle('ride-screen__metrics--compact', sport === 'walk');
    render();
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  setInterval(() => {
    if (document.hidden) return;
    t += STEP;
    render();
  }, STEP * 1000);
}

/* Zone picker
   ========================================================================== */

function initZones() {
  const list = $('[data-zone-list]');
  const detail = $('[data-zone-detail]');
  const field = (name) => $(`[data-zone-field="${name}"]`, detail);

  list.innerHTML = ZONES.map((zone, i) => `
    <button type="button" class="zone-row" role="option" data-zone="${i}" style="--c:${zone.color}">
      <span class="zone-row__bar"></span>
      <span class="zone-row__text">
        <span class="zone-row__name">${zone.key} · ${zone.name}</span>
        <span class="zone-row__desc">${zone.desc}</span>
      </span>
      <span class="zone-row__range">${zone.range}</span>
    </button>
  `).join('');

  const rows = $$('.zone-row', list);

  function select(index) {
    const zone = ZONES[index];
    rows.forEach((row, i) => {
      row.classList.toggle('is-active', i === index);
      row.setAttribute('aria-selected', i === index);
    });
    detail.style.background = zone.color;
    detail.style.color = zone.fg;
    field('title').textContent = `${zone.key} · ${zone.name}`;
    field('range').textContent = zone.range;
    field('pct').textContent = zone.pct;
    field('desc').textContent = `${zone.desc}.`;
  }

  list.addEventListener('click', (event) => {
    const row = event.target.closest('[data-zone]');
    if (row) select(Number(row.dataset.zone));
  });

  select(2);
}

/* Segmented controls
   ========================================================================== */

function initSegmented(container, attr, onChange) {
  const buttons = $$(`[${attr}]`, container);

  function activate(button) {
    buttons.forEach((b) => {
      const active = b === button;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active);
    });
    onChange(button.getAttribute(attr));
  }

  container.addEventListener('click', (event) => {
    const button = event.target.closest(`[${attr}]`);
    if (button) activate(button);
  });

  activate(buttons.find((b) => b.classList.contains('is-active')) || buttons[0]);
}

function initRideMap() {
  const segments = $$('[data-map-segments] path');
  const card = $('.ride-map__card');

  initSegmented($('[data-map-modes]'), 'data-mode', (mode) => {
    const { colors, tip } = MAP_MODES[mode];
    segments.forEach((seg, i) => { seg.style.stroke = colors[i]; });
    card.style.setProperty('--tip', tip.dot);
    $('[data-tip="main"]', card).textContent = tip.main;
    $('[data-tip="sub"]', card).textContent = tip.sub;
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

/* Scroll reveal
   ========================================================================== */

function initReveal() {
  const targets = $$('[data-reveal], [data-seen]');
  targets.forEach((el) => {
    if (el.dataset.reveal) el.style.setProperty('--reveal-i', el.dataset.reveal);
  });

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible', 'is-seen'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add(el.hasAttribute('data-seen') ? 'is-seen' : 'is-visible');
      observer.unobserve(el);
    });
  }, { threshold: 0.15 });

  targets.forEach((el) => observer.observe(el));
}

/* Boot
   ========================================================================== */

initRoutes();
initLiveRide();
initZones();
initRideMap();
initWaitlist();
initReveal();
