const $ = id => document.getElementById(id);
const MIN = {prep:0, work:5, rest:0, sets:1, cycles:1, cycleRest:0};
const MAX = {prep:5999, work:5999, rest:5999, sets:99, cycles:99, cycleRest:5999};
const LABELS = {prep:'Préparation', work:'Effort', rest:'Repos', cycleRest:'Repos cycle'};
const MAX_DOTS = 12;
let config = {prep:10, work:20, rest:10, sets:8, cycles:1, cycleRest:60};
try { Object.assign(config, JSON.parse(localStorage.getItem('config') || '{}')); } catch {}
let settings = {theme:'auto', sound:true};
try { Object.assign(settings, JSON.parse(localStorage.getItem('settings') || '{}')); } catch {}

function setSetting(key, value) {
  settings[key] = value;
  try { localStorage.setItem('settings', JSON.stringify(settings)); } catch {}
}

const padTwo = n => String(n).padStart(2, '0');
const formatTime = seconds => Math.floor(seconds / 60) + ':' + padTwo(seconds % 60);

function buildPhases() {
  const phaseList = [];
  if (config.prep > 0) phaseList.push({type:'prep', duration:config.prep, set:0, cycle:0});
  for (let cycle = 1; cycle <= config.cycles; cycle++) {
    for (let set = 1; set <= config.sets; set++) {
      phaseList.push({type:'work', duration:config.work, set, cycle});
      if (set < config.sets && config.rest > 0) phaseList.push({type:'rest', duration:config.rest, set, cycle});
    }
    if (cycle < config.cycles && config.cycleRest > 0) phaseList.push({type:'cycleRest', duration:config.cycleRest, set:config.sets, cycle});
  }
  return phaseList;
}

function renderConfig() {
  for (const k in LABELS) {
    const minutesInput = $('value-' + k + '-min');
    minutesInput.value = Math.floor(config[k] / 60);
    minutesInput.style.width = minutesInput.value.length + 'ch';
    $('value-' + k + '-sec').value = padTwo(config[k] % 60);
  }
  $('value-sets').value = config.sets;
  $('value-cycles').value = config.cycles;
  $('total').textContent = formatTime(buildPhases().reduce((a, p) => a + p.duration, 0));
}
renderConfig();

function setConfig(key, value) {
  config[key] = Math.min(MAX[key], Math.max(MIN[key], Math.round(value) || 0));
  try { localStorage.setItem('config', JSON.stringify(config)); } catch {}
  renderConfig();
}

document.querySelectorAll('#config button[data-key]').forEach(b => b.onclick = () => setConfig(b.dataset.key, config[b.dataset.key] + +b.dataset.step));

document.querySelectorAll('#config input').forEach(i => {
  i.onfocus = () => i.select();
  i.onchange = () => {
    const k = i.dataset.key;
    if (!LABELS[k]) return setConfig(k, +i.value);
    setConfig(k, (+$('value-' + k + '-min').value || 0) * 60 + (+$('value-' + k + '-sec').value || 0));
  };
});

let audioContext, phases, remainingAfter, phaseIndex, phaseEnd, pausedRemaining, paused, tickInterval, lastSecond, wakeLock;

function beep(frequency, duration) {
  if (!settings.sound) return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime;
  oscillator.frequency.value = frequency;
  oscillator.connect(gain); gain.connect(audioContext.destination);
  gain.gain.setValueAtTime(.3, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + duration);
  oscillator.start(now); oscillator.stop(now + duration);
}

async function lock() {
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
}
function unlock() {
  try { wakeLock && wakeLock.release(); } catch {}
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && tickInterval) lock();
});

function view(id) {
  for (const v of ['home', 'settings', 'config', 'timer', 'done']) $(v).classList.toggle('on', v === id);
}

function dots(element, count, filled) {
  if (count > MAX_DOTS) { element.textContent = filled + ' / ' + count; return; }
  element.innerHTML = '<i></i>'.repeat(count);
  [...element.children].forEach((d, i) => d.classList.toggle('on', i < filled));
}

function setPaused(value) {
  paused = value;
  $('ico-pause').toggleAttribute('hidden', value);
  $('ico-play').toggleAttribute('hidden', !value);
  $('pause').setAttribute('aria-label', value ? 'Reprendre' : 'Pause');
}

function start() {
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  audioContext.resume();
  phases = buildPhases();
  remainingAfter = phases.map((_, i) => phases.slice(i + 1).reduce((a, p) => a + p.duration, 0));
  $('counter-cycles').hidden = config.cycles < 2;
  phaseIndex = -1;
  setPaused(false);
  view('timer');
  lock();
  next();
  clearInterval(tickInterval);
  tickInterval = setInterval(loop, 100);
}

function next() {
  phaseIndex++;
  if (phaseIndex >= phases.length) return finish();
  const phase = phases[phaseIndex], nextPhase = phases[phaseIndex + 1];
  phaseEnd = Date.now() + phase.duration * 1000;
  if (paused) pausedRemaining = phase.duration * 1000;
  lastSecond = phase.duration;
  document.body.className = phase.type;
  $('label').textContent = LABELS[phase.type];
  dots($('dots-sets'), config.sets, phase.set);
  dots($('dots-cycles'), config.cycles, phase.cycle);
  $('next').hidden = !nextPhase;
  if (nextPhase) {
    $('next-dot').style.background = 'var(--' + nextPhase.type + ')';
    $('next-txt').textContent = LABELS[nextPhase.type] + ' ' + formatTime(nextPhase.duration);
  }
  draw(phase.duration * 1000);
  beep(phase.type === 'work' ? 880 : phase.type === 'prep' ? 660 : 440, .4);
}

function draw(ms) {
  const phase = phases[phaseIndex], seconds = Math.ceil(ms / 1000);
  $('time').textContent = formatTime(seconds);
  $('time').classList.toggle('long', seconds >= 600);
  $('left').textContent = formatTime(Math.ceil((ms + remainingAfter[phaseIndex] * 1000) / 1000));
  $('bar').style.width = (100 - ms / (phase.duration * 10)) + '%';
}

function loop() {
  if (paused) return;
  const ms = phaseEnd - Date.now();
  if (ms <= 0) return next();
  draw(ms);
  const seconds = Math.ceil(ms / 1000);
  if (seconds !== lastSecond) {
    lastSecond = seconds;
    if (seconds <= 5) beep(520, .12);
  }
}

function finish() {
  clearInterval(tickInterval); tickInterval = null;
  unlock();
  document.body.className = 'done';
  $('done-sum').textContent = (config.cycles > 1 ? config.cycles + ' cycles × ' : '') + config.sets + ' séries';
  view('done');
  [0, 200, 400].forEach(delay => setTimeout(() => beep(880, .15), delay));
}

function stop() {
  clearInterval(tickInterval); tickInterval = null;
  unlock();
  document.body.className = '';
  view('config');
}

function applyTheme() {
  const html = document.documentElement;
  if (settings.theme === 'auto') delete html.dataset.theme; else html.dataset.theme = settings.theme;
  document.querySelectorAll('#theme button').forEach(b => b.classList.toggle('on', b.dataset.value === settings.theme));
}
applyTheme();
document.querySelectorAll('#theme button').forEach(b => b.onclick = () => { setSetting('theme', b.dataset.value); applyTheme(); });

function applySound() {
  $('sound').setAttribute('aria-checked', settings.sound);
}
applySound();
$('sound').onclick = () => { setSetting('sound', !settings.sound); applySound(); };

$('settings-open').onclick = () => view('settings');
$('settings-back').onclick = () => view('home');
$('tabata').onclick = () => view('config');
$('config-back').onclick = () => view('home');
$('go').onclick = start;
$('again').onclick = start;
$('stop').onclick = stop;
$('home-open').onclick = () => { document.body.className = ''; view('home'); };
$('skip').onclick = next;
$('pause').onclick = () => {
  if (paused) { phaseEnd = Date.now() + pausedRemaining; setPaused(false); }
  else { pausedRemaining = phaseEnd - Date.now(); setPaused(true); }
};

document.addEventListener('dblclick', e => e.preventDefault());

const showVersion = version => { $('version').textContent = version.replace('tabata-', ''); $('version').hidden = false; };
if (navigator.serviceWorker?.controller) {
  navigator.serviceWorker.onmessage = e => showVersion(e.data);
  navigator.serviceWorker.controller.postMessage('version');
} else fetch('sw.js').then(r => r.text()).then(t => showVersion(t.match(/'(tabata-[^']+)'/)[1])).catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
