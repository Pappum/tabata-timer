const $ = id => document.getElementById(id);
const MIN = {prep:0, work:5, rest:0, sets:1, cycles:1, cycleRest:0};
const MAX = {prep:5999, work:5999, rest:5999, sets:99, cycles:99, cycleRest:5999};
const LABELS = {prep:'Préparation', work:'Effort', rest:'Repos', cycleRest:'Repos cycle'};
const MAX_DOTS = 12;
let cfg = {prep:10, work:20, rest:10, sets:8, cycles:1, cycleRest:60};
try { Object.assign(cfg, JSON.parse(localStorage.getItem('tabata') || '{}')); } catch {}

const pad = n => String(n).padStart(2, '0');
const fmt = s => Math.floor(s / 60) + ':' + pad(s % 60);

function buildPhases() {
  const ph = [];
  if (cfg.prep > 0) ph.push({t:'prep', d:cfg.prep, r:0, c:0});
  for (let c = 1; c <= cfg.cycles; c++) {
    for (let r = 1; r <= cfg.sets; r++) {
      ph.push({t:'work', d:cfg.work, r, c});
      if (r < cfg.sets && cfg.rest > 0) ph.push({t:'rest', d:cfg.rest, r, c});
    }
    if (c < cfg.cycles && cfg.cycleRest > 0) ph.push({t:'cycleRest', d:cfg.cycleRest, r:cfg.sets, c});
  }
  return ph;
}

function renderCfg() {
  for (const k in LABELS) {
    const m = $('v-' + k + '-m');
    m.value = Math.floor(cfg[k] / 60);
    m.style.width = m.value.length + 'ch';
    $('v-' + k + '-s').value = pad(cfg[k] % 60);
  }
  $('v-sets').value = cfg.sets;
  $('v-cycles').value = cfg.cycles;
  $('total').textContent = fmt(buildPhases().reduce((a, p) => a + p.d, 0));
}
renderCfg();

function set(k, v) {
  cfg[k] = Math.min(MAX[k], Math.max(MIN[k], Math.round(v) || 0));
  try { localStorage.setItem('tabata', JSON.stringify(cfg)); } catch {}
  renderCfg();
}

document.querySelectorAll('#setup button[data-k]').forEach(b => b.onclick = () => set(b.dataset.k, cfg[b.dataset.k] + +b.dataset.d));

document.querySelectorAll('#setup input').forEach(i => {
  i.onfocus = () => i.select();
  i.onchange = () => {
    const k = i.dataset.k;
    if (!LABELS[k]) return set(k, +i.value);
    set(k, (+$('v-' + k + '-m').value || 0) * 60 + (+$('v-' + k + '-s').value || 0));
  };
});

let actx, phases, after, idx, end, left, paused, tick, lastSec, wake;

function beep(freq, dur) {
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
  o.frequency.value = freq;
  o.connect(g); g.connect(actx.destination);
  g.gain.setValueAtTime(.3, t);
  g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.start(t); o.stop(t + dur);
}

async function lock() {
  try { wake = await navigator.wakeLock.request('screen'); } catch {}
}
function unlock() {
  try { wake && wake.release(); } catch {}
  wake = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && tick) lock();
});

function view(id) {
  for (const v of ['setup', 'timer', 'done']) $(v).classList.toggle('on', v === id);
}

function dots(el, n, on) {
  if (n > MAX_DOTS) { el.textContent = on + ' / ' + n; return; }
  el.innerHTML = '<i></i>'.repeat(n);
  [...el.children].forEach((d, i) => d.classList.toggle('on', i < on));
}

function setPaused(p) {
  paused = p;
  $('ico-pause').toggleAttribute('hidden', p);
  $('ico-play').toggleAttribute('hidden', !p);
  $('pause').setAttribute('aria-label', p ? 'Reprendre' : 'Pause');
}

function start() {
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  actx.resume();
  phases = buildPhases();
  after = phases.map((_, i) => phases.slice(i + 1).reduce((a, p) => a + p.d, 0));
  $('pc-cycles').hidden = cfg.cycles < 2;
  idx = -1;
  setPaused(false);
  view('timer');
  lock();
  next();
  clearInterval(tick);
  tick = setInterval(loop, 100);
}

function next() {
  idx++;
  if (idx >= phases.length) return finish();
  const p = phases[idx], n = phases[idx + 1];
  end = Date.now() + p.d * 1000;
  if (paused) left = p.d * 1000;
  lastSec = p.d;
  document.body.className = p.t;
  $('label').textContent = LABELS[p.t];
  dots($('d-sets'), cfg.sets, p.r);
  dots($('d-cycles'), cfg.cycles, p.c);
  $('next').hidden = !n;
  if (n) {
    $('next-dot').style.background = 'var(--' + (n.t === 'cycleRest' ? 'cyc' : n.t) + ')';
    $('next-txt').textContent = LABELS[n.t] + ' ' + fmt(n.d);
  }
  draw(p.d * 1000);
  beep(p.t === 'work' ? 880 : p.t === 'prep' ? 660 : 440, .4);
}

function draw(ms) {
  const p = phases[idx], s = Math.ceil(ms / 1000);
  $('time').textContent = fmt(s);
  $('time').classList.toggle('long', s >= 600);
  $('left').textContent = fmt(Math.ceil((ms + after[idx] * 1000) / 1000));
  $('bar').style.width = (100 - ms / (p.d * 10)) + '%';
}

function loop() {
  if (paused) return;
  const ms = end - Date.now();
  if (ms <= 0) return next();
  draw(ms);
  const s = Math.ceil(ms / 1000);
  if (s !== lastSec) {
    lastSec = s;
    if (s <= 5) beep(520, .12);
  }
}

function finish() {
  clearInterval(tick); tick = null;
  unlock();
  document.body.className = 'done';
  $('done-sum').textContent = (cfg.cycles > 1 ? cfg.cycles + ' cycles × ' : '') + cfg.sets + ' séries';
  view('done');
  [0, 200, 400].forEach(d => setTimeout(() => beep(880, .15), d));
}

function stop() {
  clearInterval(tick); tick = null;
  unlock();
  document.body.className = '';
  view('setup');
}

$('go').onclick = start;
$('again').onclick = start;
$('stop').onclick = stop;
$('back').onclick = stop;
$('skip').onclick = next;
$('pause').onclick = () => {
  if (paused) { end = Date.now() + left; setPaused(false); }
  else { left = end - Date.now(); setPaused(true); }
};

document.addEventListener('dblclick', e => e.preventDefault());

const showVer = v => { $('ver').textContent = v.replace('tabata-', ''); $('ver').hidden = false; };
if (navigator.serviceWorker?.controller) {
  navigator.serviceWorker.onmessage = e => showVer(e.data);
  navigator.serviceWorker.controller.postMessage('version');
} else fetch('sw.js').then(r => r.text()).then(t => showVer(t.match(/'(tabata-[^']+)'/)[1])).catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
