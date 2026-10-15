/* ==========================================================================
   Motionry — heart rate zone calculator
   Same five zones as the app and the home page: 60 / 70 / 80 / 90% of max.
   Everything runs in the browser. Nothing is sent or stored.
   ========================================================================== */

(() => {
  const root = document.querySelector('[data-calc]');
  if (!root) return;

  const ZONES = [
    { key: 'Z1', name: 'Recovery', from: 0, to: 0.6, desc: 'Easy effort. Warm-ups, cool-downs and rest days.', color: 'var(--z1)' },
    { key: 'Z2', name: 'Endurance', from: 0.6, to: 0.7, desc: 'Can hold a conversation. Where the long, easy miles build your base.', color: 'var(--z2)' },
    { key: 'Z3', name: 'Tempo', from: 0.7, to: 0.8, desc: 'Comfortably hard. Steady work you can sustain for a while.', color: 'var(--z3)' },
    { key: 'Z4', name: 'Threshold', from: 0.8, to: 0.9, desc: 'Hard, about 20 minutes. Short breathing, long focus.', color: 'var(--z4)' },
    { key: 'Z5', name: 'Max', from: 0.9, to: 1, desc: 'Sprints, under a minute.', color: 'var(--z5)' },
  ];

  const $ = (selector) => root.querySelector(selector);
  const $$ = (selector) => [...root.querySelectorAll(selector)];
  const checked = (name) => root.querySelector(`input[name="${name}"]:checked`).value;
  const valid = (el, min, max) => { const v = Number(el.value); return el.value !== '' && v >= min && v <= max ? v : null; };

  const ageEl = $('#calc-age');
  const maxEl = $('#calc-max');
  const restEl = $('#calc-rest');
  const bpmEl = $('#calc-bpm');

  /** The lowest heart rate of zones 2 to 5, rounded the way the app rounds. */
  function floors(max, rest, basis) {
    return ZONES.slice(1).map((z) => Math.round(basis === 'hrr' ? rest + z.from * (max - rest) : z.from * max));
  }

  function rangeText(i, lows) {
    if (i === 0) return `<${lows[0]}`;
    if (i === 4) return `${lows[3]}+`;
    return `${lows[i - 1]}–${lows[i] - 1}`;
  }

  function pctText(z, basis) {
    const of = basis === 'hrr' ? 'of reserve' : 'of max';
    if (z.from === 0) return `under ${Math.round(z.to * 100)}% ${of}`;
    return z.to === 1 ? `${Math.round(z.from * 100)}%+ ${of}` : `${Math.round(z.from * 100)}–${Math.round(z.to * 100)}% ${of}`;
  }

  function currentMax() {
    const src = checked('src');
    if (src === 'known') return valid(maxEl, 120, 230);
    const age = valid(ageEl, 10, 90);
    if (age === null) return null;
    return src === 'tanaka' ? Math.round(208 - 0.7 * age) : 220 - age;
  }

  function update() {
    const src = checked('src');
    const basis = checked('basis');
    $('[data-field="age"]').hidden = src === 'known';
    $('[data-field="max"]').hidden = src !== 'known';
    $('[data-field="rest"]').hidden = basis !== 'hrr';

    const max = currentMax();
    const rest = basis === 'hrr' ? valid(restEl, 30, 120) : 0;
    const out = $('[data-out]');
    const problem = max === null ? 'Enter a valid age or max heart rate.' : basis === 'hrr' && (rest === null || rest > max - 20) ? 'Enter a resting heart rate at least 20 bpm below your max.' : '';
    out.classList.toggle('is-invalid', Boolean(problem));
    $('[data-error]').textContent = problem;
    if (problem) {
      $('[data-match]').textContent = '';
      $$('[data-zone]').forEach((row) => row.classList.remove('is-match'));
      return;
    }

    const lows = floors(max, rest, basis);
    $('[data-max]').textContent = max;
    $('[data-summary]').textContent = `Zone 2 is ${rangeText(1, lows)} bpm.`;
    $$('[data-zone]').forEach((row) => {
      const i = Number(row.dataset.zone);
      row.querySelector('[data-range]').textContent = rangeText(i, lows);
      row.querySelector('small').textContent = `${ZONES[i].key} · ${pctText(ZONES[i], basis)}`;
    });
    match(lows);
  }

  function match(lows) {
    const el = $('[data-match]');
    const bpm = valid(bpmEl, 30, 240);
    $$('[data-zone]').forEach((row) => row.classList.remove('is-match'));
    if (bpm === null) { el.textContent = ''; return; }
    const i = lows.filter((low) => bpm >= low).length;
    $$('[data-zone]')[i].classList.add('is-match');
    el.textContent = `${ZONES[i].key} · ${ZONES[i].name}`;
  }

  root.addEventListener('input', update);
  root.addEventListener('change', update);
  root.querySelector('form').addEventListener('submit', (e) => e.preventDefault());
  update();
})();
