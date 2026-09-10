import { RunnerEngine } from './engine.js';
import { WorldRenderer } from './renderer.js';

const $ = id => document.getElementById(id);
const engine = new RunnerEngine();
let renderer, best = 0, soundOn = false, audioContext, previousTime = 0, accumulator = 0, uiTime = 0, toastTimer;
let stopped = false;
const storage = {
  get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* A blocked storage area must not prevent play. */ } }
};
best = Math.max(0, Number(storage.get('metro-rush-best', 0)) || 0);
soundOn = storage.get('metro-rush-sound', 'off') === 'on';
$('best').textContent = Math.floor(best).toLocaleString('zh-CN');

function setSoundUI() {
  $('sound').setAttribute('aria-pressed', String(soundOn));
  $('sound').setAttribute('aria-label', soundOn ? '关闭音效' : '开启音效');
  $('sound-waves').setAttribute('d', soundOn ? 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14' : 'm16 9 5 6m0-6-5 6');
}
function unlockAudio() {
  if (!soundOn) return;
  try { audioContext ??= new (window.AudioContext || window.webkitAudioContext)(); void audioContext.resume().catch(() => {}); } catch { soundOn = false; setSoundUI(); }
}
let lastCoinTone = -Infinity;
function tone(type) {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  if (type === 'coin' && now - lastCoinTone < .055) return;
  if (type === 'coin') lastCoinTone = now;
  const notes = { coin: [980, 1470, .09, .032], jump: [260, 590, .13, .025], slide: [340, 130, .15, .025], move: [230, 270, .045, .01], crash: [110, 34, .4, .09], magnet: [440, 1350, .38, .035], milestone: [660, 1320, .3, .04], land: [85, 50, .08, .017] };
  const n = notes[type]; if (!n) return;
  const osc = audioContext.createOscillator(), gain = audioContext.createGain();
  osc.type = type === 'crash' ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(n[0], now); osc.frequency.exponentialRampToValueAtTime(n[1], now + n[2]);
  gain.gain.setValueAtTime(n[3], now); gain.gain.exponentialRampToValueAtTime(.001, now + n[2]);
  osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(now + n[2]);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}
function toast(message, duration = 2200) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), duration);
}
function syncUI() {
  const menu = engine.mode === 'menu';
  $('app').dataset.state = engine.mode;
  for (const id of ['menu', 'controls-guide', 'scene-caption']) $(id).hidden = !menu;
  $('hud').hidden = menu; $('pause').hidden = engine.mode !== 'running';
  $('touch-controls').hidden = engine.mode !== 'running';
  $('power').hidden = engine.magnet <= 0 || engine.mode !== 'running';
  $('overlay').hidden = engine.mode !== 'paused' && engine.mode !== 'over';
  $('distance').textContent = Math.floor(engine.distance).toLocaleString('zh-CN');
  $('coins').textContent = engine.coins.toLocaleString('zh-CN');
  $('speed').textContent = Math.round(engine.speed * 3.6) + ' km/h';
  $('zone').textContent = engine.distance < 500 ? '中央车站' : engine.distance < 1500 ? '城市快线' : '极限疾跑';
  $('power-fill').style.transform = `scaleX(${engine.magnet / 8})`;
}
function startRun() {
  if (stopped || !renderer || (engine.mode !== 'menu' && engine.mode !== 'over')) return false;
  unlockAudio(); engine.reset(); engine.start(); renderer.particles = []; accumulator = 0;
  clearTimeout(toastTimer); $('toast').classList.remove('visible');
  syncUI(); $('pause').focus({ preventScroll: true });
  toast('← → 换道 · ↑ 跳跃 · ↓ 滑铲', 3200); return true;
}
function showPause() {
  if (!engine.pause()) return false;
  $('result-eyebrow').textContent = 'TAKE A BREATHER'; $('overlay-title').textContent = '歇一口气';
  $('overlay-message').textContent = '轨道在等你，准备好就继续。';
  $('result-stats').hidden = true; $('resume').textContent = '继续奔跑 →';
  syncUI(); $('resume').focus({ preventScroll: true }); return true;
}
function resumeRun() {
  if (!engine.resume()) return false;
  unlockAudio(); accumulator = 0; syncUI(); $('pause').focus({ preventScroll: true }); return true;
}
function showGameOver() {
  const record = Math.floor(engine.distance) > best;
  if (record) { best = Math.floor(engine.distance); storage.set('metro-rush-best', best); $('best').textContent = best.toLocaleString('zh-CN'); }
  $('result-eyebrow').textContent = record ? 'NEW PERSONAL BEST' : 'ONE MORE RUN?';
  $('overlay-title').textContent = record ? '新纪录，漂亮！' : '再跑一次？';
  $('overlay-message').textContent = { train: '碰到列车了。提前换道，给下一步留点余地。', barrier: '碰到路障了。试试向上跳跃，或换一条轨道。', gate: '碰到高架障碍了。向下滑铲，就能从下方穿过。' }[engine.reason] || '这一程结束了，下一程继续。';
  $('result-stats').hidden = false; $('result-distance').textContent = Math.floor(engine.distance).toLocaleString('zh-CN') + ' m';
  $('result-coins').textContent = engine.coins.toLocaleString('zh-CN'); $('result-score').textContent = engine.score.toLocaleString('zh-CN');
  $('resume').textContent = '再跑一次 →'; renderer.shake = 1;
  syncUI(); $('resume').focus({ preventScroll: true });
}
function goHome() {
  engine.reset(); accumulator = 0; renderer.particles = [];
  clearTimeout(toastTimer); $('toast').classList.remove('visible'); syncUI(); $('start').focus({ preventScroll: true });
}
function events() {
  for (const e of engine.drainEvents()) {
    tone(e.type);
    if (e.type === 'coin') renderer.burst(e);
    if (e.type === 'magnet') toast('磁铁生效 · 8 秒内自动吸附金币');
    if (e.type === 'milestone') toast(`${e.distance.toLocaleString('zh-CN')} 米！继续冲刺`);
    if (e.type === 'crash') showGameOver();
  }
}
const keyActions = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', ArrowDown: 'slide', s: 'slide', S: 'slide' };
document.addEventListener('keydown', event => {
  if (event.key === 'Tab' && !$('overlay').hidden) {
    if (event.shiftKey && document.activeElement === $('resume')) { event.preventDefault(); $('home').focus(); }
    else if (!event.shiftKey && document.activeElement === $('home')) { event.preventDefault(); $('resume').focus(); }
    return;
  }
  if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
    event.preventDefault(); if (event.repeat) return;
    if (engine.mode === 'running') showPause(); else if (engine.mode === 'paused') resumeRun(); return;
  }
  if (event.key === 'Enter' && (engine.mode === 'menu' || engine.mode === 'over') && document.activeElement?.tagName !== 'BUTTON') { event.preventDefault(); startRun(); return; }
  if (keyActions[event.key] && engine.mode === 'running') { event.preventDefault(); if (!event.repeat) engine.action(keyActions[event.key]); }
});
let pointer = null;
$('world').addEventListener('pointerdown', event => {
  if (engine.mode !== 'running' || !event.isPrimary) return;
  pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
  $('world').setPointerCapture(event.pointerId); unlockAudio();
});
$('world').addEventListener('pointerup', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
  engine.action(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'jump' : 'slide'));
});
$('world').addEventListener('pointercancel', () => { pointer = null; });
for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); unlockAudio(); engine.action(button.dataset.action); });
  button.addEventListener('click', event => { if (event.detail === 0) engine.action(button.dataset.action); });
}
$('start').addEventListener('click', startRun); $('pause').addEventListener('click', showPause);
$('resume').addEventListener('click', () => engine.mode === 'paused' ? resumeRun() : startRun());
$('home').addEventListener('click', goHome);
$('sound').addEventListener('click', () => { soundOn = !soundOn; storage.set('metro-rush-sound', soundOn ? 'on' : 'off'); setSoundUI(); unlockAudio(); tone('coin'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) showPause(); previousTime = 0; });
window.addEventListener('blur', () => { showPause(); pointer = null; });

function fail(message) {
  stopped = true; engine.pause(); $('error-text').textContent = message; $('error').hidden = false;
}
$('world').addEventListener('webglcontextlost', event => { event.preventDefault(); fail('图形连接暂时中断。请重新加载后继续，你的已保存纪录仍会保留。'); });

/** Optional page-scoped tools use exactly the same controls and state as the UI. */
function registerTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const tools = [{
    name: 'get_run_state', title: '查看跑酷状态', description: 'Read the current game state, distance, coins, lane, and speed.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) { if (input && Object.keys(input).length) throw new Error('No arguments accepted.'); return engine.snapshot(); }
  }, {
    name: 'control_run', title: '操作跑酷游戏', description: 'Start a new run, pause, resume, or perform one visible runner action.',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['start', 'pause', 'resume', 'left', 'right', 'jump', 'slide'] } }, required: ['action'], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || Object.keys(input).length !== 1 || !['start','pause','resume','left','right','jump','slide'].includes(input.action)) throw new Error('Invalid game action.');
      if (stopped) throw new Error('The 3D scene is unavailable.');
      const success = input.action === 'start' ? startRun() : input.action === 'pause' ? showPause() : input.action === 'resume' ? resumeRun() : engine.action(input.action);
      if (!success) throw new Error('Action unavailable in the current state.');
      syncUI(); return engine.snapshot();
    }
  }];
  for (const tool of tools) { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional API; game input remains available. */ } }
}
function frame(now) {
  if (stopped) return;
  const dt = previousTime ? Math.min((now - previousTime) / 1000, .1) : 0; previousTime = now;
  if (engine.mode === 'running') {
    accumulator += dt;
    while (accumulator >= 1 / 120) { engine.step(1 / 120); accumulator -= 1 / 120; }
    events();
  } else accumulator = 0;
  uiTime += dt; if (uiTime > .075) { syncUI(); uiTime = 0; }
  try { renderer.render(engine, dt); requestAnimationFrame(frame); }
  catch { fail('3D 场景运行中断，请重新加载游戏。'); }
}
try { renderer = new WorldRenderer($('world')); setSoundUI(); syncUI(); registerTools(); requestAnimationFrame(frame); }
catch (error) { fail(error.message || '游戏加载失败，请刷新页面重试。'); }
