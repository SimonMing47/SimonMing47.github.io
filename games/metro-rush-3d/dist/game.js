import { RunnerEngine, DIFFICULTIES, BONUSES, STAGES } from './engine.js';
import { WorldRenderer } from './renderer.js';
const $=id=>document.getElementById(id);
const storage={get(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,String(value));}catch{}}};
const remembered=storage.get('metro-rush-difficulty','classic');
let difficulty=Object.hasOwn(DIFFICULTIES,remembered)?remembered:'classic';
const engine=new RunnerEngine(undefined,difficulty);
let renderer,soundOn=storage.get('metro-rush-sound','off')==='on',audioContext,previousTime=0,accumulator=0,uiTime=0,toastTimer,stopped=false,lastCoinTone=-Infinity,pointer=null,lastTap=0;
let records={};try{records=JSON.parse(storage.get('metro-rush-records-v2','{}'));}catch{}
if(!records||typeof records!=='object')records={};
for(const key of Object.keys(DIFFICULTIES)){
  const record=records[key];records[key]={score:Number.isFinite(record?.score)&&record.score>=0?record.score:0,distance:Number.isFinite(record?.distance)&&record.distance>=0?record.distance:0};
}
const legacy=Number(storage.get('metro-rush-best',0));if(Number.isFinite(legacy))records.classic.distance=Math.max(records.classic.distance,legacy);
const format=n=>Math.floor(n).toLocaleString('zh-CN');
const multiplierText=n=>'×'+Number(n.toFixed(2));
function setSoundUI(){
  $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'关闭音效':'开启音效');
  $('sound-waves').setAttribute('d',soundOn?'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14':'m16 9 5 6m0-6-5 6');
}
function unlockAudio(){if(!soundOn)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();void audioContext.resume().catch(()=>{});}catch{soundOn=false;setSoundUI();}}
function tone(type){
  if(!soundOn||!audioContext||audioContext.state!=='running')return;const now=audioContext.currentTime;
  if(type==='coin'&&now-lastCoinTone<.055)return;if(type==='coin')lastCoinTone=now;
  const notes={coin:[900+(engine.combo%8)*70,1550,.09,.025],jump:[260,590,.13,.025],slide:[340,130,.15,.025],move:[230,270,.045,.01],crash:[110,34,.4,.07],magnet:[440,1350,.38,.035],double:[660,1760,.3,.032],sneakers:[360,1080,.2,.03],jetpack:[180,800,.6,.03],board:[300,900,.23,.032],boardPickup:[660,980,.15,.03],mystery:[750,1600,.3,.033],mission:[660,1320,.4,.04],combo:[880,1760,.25,.035],stage:[440,880,.3,.03],shieldBreak:[180,80,.3,.04],land:[85,50,.08,.015]};
  const n=notes[type];if(!n)return;const osc=audioContext.createOscillator(),gain=audioContext.createGain();
  osc.type=type==='crash'?'sawtooth':'sine';osc.frequency.setValueAtTime(n[0],now);osc.frequency.exponentialRampToValueAtTime(n[1],now+n[2]);
  gain.gain.setValueAtTime(n[3],now);gain.gain.exponentialRampToValueAtTime(.001,now+n[2]);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(now+n[2]);osc.onended=()=>{osc.disconnect();gain.disconnect();};
}
function toast(message,duration=2500){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),duration);}
function setupBonuses(){
  $('bonus-grid').innerHTML=Object.entries(BONUSES).map(([key,b])=>`<button class="bonus-tile" data-bonus="${key}" style="--bonus:${b.color}" aria-label="了解${b.name}"><span class="bonus-icon" aria-hidden="true">${b.glyph}</span><span>${b.short}</span></button>`).join('');
  $('power-bar').innerHTML=Object.entries(BONUSES).filter(([key])=>key!=='mystery').map(([key,b])=>`<div class="active-power" id="power-${key}" style="--bonus:${b.color}" hidden><span class="power-glyph" aria-hidden="true">${b.glyph}</span><small id="seconds-${key}"></small><span class="power-track"><i id="fill-${key}"></i></span></div>`).join('');
  for(const button of document.querySelectorAll('[data-bonus]'))button.addEventListener('click',()=>showGuide(button.dataset.bonus));
}
function updateMenu(){
  const d=DIFFICULTIES[difficulty];$('app').dataset.difficulty=difficulty;
  $('difficulty-hint').textContent=d.hint;$('difficulty-speed').textContent=`${Math.round(d.startSpeed*3.6)} → ${Math.round(d.maxSpeed*3.6)} km/h`;
  $('best').textContent=format(records[difficulty].score);$('best-distance').textContent=format(records[difficulty].distance);
  $('mode-badge').textContent=`${d.name} · ${d.english}`;
  for(const label of document.querySelectorAll('.difficulty-card')){const selected=label.dataset.mode===difficulty;label.classList.toggle('selected',selected);label.querySelector('input').checked=selected;}
}
function chooseDifficulty(value){
  if(engine.mode!=='menu'||!Object.hasOwn(DIFFICULTIES,value))return false;
  difficulty=value;storage.set('metro-rush-difficulty',value);engine.reset(undefined,difficulty);updateMenu();return true;
}
function showGuide(selected){
  if(engine.mode==='running')showPause();
  $('guide-list').innerHTML=Object.entries(BONUSES).map(([key,b])=>`<article class="guide-entry${key===selected?' highlight':''}" id="guide-${key}" style="--bonus:${b.color}"><span class="bonus-icon" aria-hidden="true">${b.glyph}</span><div><strong>${b.name}</strong><small>${b.duration?`${+(b.duration*DIFFICULTIES[difficulty].bonusScale).toFixed(1)} 秒${key==='board'?' · 主动使用':''}`:'立即生效'}</small><p>${b.description}</p></div></article>`).join('');
  $('bonus-guide').showModal();if(selected)$(`guide-${selected}`).scrollIntoView({block:'nearest'});
}
function syncUI(){
  const menu=engine.mode==='menu',running=engine.mode==='running';
  $('app').dataset.state=engine.mode;
  for(const id of ['menu','controls-guide','bonus-dock'])$(id).hidden=!menu;
  for(const id of ['hud','mission-panel'])$(id).hidden=menu;
  $('pause').hidden=!running;$('touch-controls').hidden=!running;$('board-action').hidden=!running;
  $('overlay').hidden=engine.mode!=='paused'&&engine.mode!=='over';
  $('score').textContent=format(engine.score);$('distance').textContent=format(engine.distance);$('coins').textContent=format(engine.coins);$('hud-best').textContent=format(records[difficulty].score);
  $('multiplier').textContent=multiplierText(engine.multiplier);$('speed').textContent=Math.round(engine.speed*3.6)+' km/h';
  $('zone').textContent=`LV.${engine.stage} ${STAGES[engine.stage-1]}`;$('next-stage').textContent=engine.stage<5?`下一等级 ${format(engine.config.stageLength-(engine.distance%engine.config.stageLength))} m`:'最高等级';$('stage-fill').style.transform=`scaleX(${engine.stageProgress})`;
  $('combo-panel').hidden=menu||engine.combo<3;$('combo-count').textContent=engine.combo;$('combo-label').textContent=engine.combo>=20?`连币倍率 ${multiplierText(engine.comboMultiplier)}`:`${20-engine.combo} 枚后 ×1.5`;$('combo-fill').style.transform=`scaleX(${engine.comboTimer/engine.config.comboWindow})`;
  let active=0;for(const [key,b] of Object.entries(BONUSES)){
    if(key==='mystery')continue;const seconds=engine[key];const el=$(`power-${key}`);el.hidden=seconds<=0;
    if(seconds>0){active++;$(`seconds-${key}`).textContent=`${Math.ceil(seconds)}s`;$(`fill-${key}`).style.transform=`scaleX(${seconds/(b.duration*engine.config.bonusScale)})`;el.classList.toggle('expiring',seconds<3);el.setAttribute('aria-label',`${b.name}，剩余 ${Math.ceil(seconds)} 秒`);}
  }
  $('power-bar').hidden=!running||active===0;
  $('board-count').textContent=engine.boardCharges;$('board-action').disabled=engine.board>0||engine.boardCharges===0||engine.jetpack>0||engine.landing;
  $('board-hint').textContent=engine.board>0?`保护中 · ${Math.ceil(engine.board)}s`:engine.jetpack>0?'飞行中':engine.boardCharges===0?'拾取滑板补充':'B / 双击使用';
  const mission=engine.missions.find(m=>!m.done);
  $('mission-name').textContent=mission?.name||'三项挑战已完成';$('mission-reward').textContent=mission?`+${mission.reward} 分`:'+1900 分';$('mission-progress').textContent=mission?`${mission.progress} / ${mission.target}`:'继续挑战更高分';$('mission-fill').style.transform=`scaleX(${mission?mission.progress/mission.target:1})`;
}
function startRun(){
  if(stopped||!renderer||(engine.mode!=='menu'&&engine.mode!=='over'))return false;
  unlockAudio();engine.reset(undefined,difficulty);engine.start();renderer.particles=[];accumulator=0;lastTap=0;
  clearTimeout(toastTimer);$('toast').classList.remove('visible');syncUI();$('pause').focus({preventScroll:true});
  toast(`${engine.config.name}模式 · ${engine.boardCharges} 块滑板已就绪`,2200);return true;
}
function showPause(){
  if(!engine.pause())return false;$('result-eyebrow').textContent='TAKE A BREATHER';$('overlay-title').textContent='暂时歇一口气';$('overlay-message').textContent='计时已暂停，你的道具和连币都在等你。';$('result-stats').hidden=true;$('resume').textContent='继续奔跑 →';syncUI();$('resume').focus({preventScroll:true});return true;
}
function resumeRun(){if(!engine.resume())return false;unlockAudio();accumulator=0;syncUI();$('pause').focus({preventScroll:true});return true;}
function showGameOver(){
  const record=engine.score>records[difficulty].score;
  records[difficulty]={score:Math.max(records[difficulty].score,engine.score),distance:Math.max(records[difficulty].distance,Math.floor(engine.distance))};storage.set('metro-rush-records-v2',JSON.stringify(records));updateMenu();
  $('result-eyebrow').textContent=record?'NEW PERSONAL BEST':'ONE MORE RUN?';$('overlay-title').textContent=record?'漂亮，刷新纪录！':'下一程，再突破';
  $('overlay-message').textContent={train:'列车需要提前换道。别忘了 B 键启动滑板，可以抵挡一次碰撞。',barrier:'向上跳跃，或换到空闲轨道，就能越过路障。',gate:'向下滑铲通过横杆。超级跳跃时也要留意高度。'}[engine.reason]||'这一程结束了，下一程继续。';
  $('result-stats').hidden=false;$('result-score').textContent=format(engine.score);$('result-mode').textContent=`${engine.config.name} · 基础倍率 ${multiplierText(engine.config.multiplier)}`;
  $('result-distance').textContent=format(engine.distance)+' m';$('result-coins').textContent=format(engine.coins);$('result-combo').textContent=format(engine.maxCombo);$('result-bonuses').textContent=engine.bonusCount;
  const complete=engine.missions.filter(m=>m.done).length;$('result-reward').textContent=`完成挑战 ${complete}/3 · 滑板护身 ${engine.savedCrashes} 次 · 奖励分 +${format(engine.stats.bonusPoints)}`;
  $('resume').textContent='再跑一次 ↗';renderer.shake=1;syncUI();$('resume').focus({preventScroll:true});
}
function goHome(){engine.reset(undefined,difficulty);accumulator=0;renderer.particles=[];clearTimeout(toastTimer);$('toast').classList.remove('visible');updateMenu();syncUI();$('start').focus({preventScroll:true});}
function events(){
  for(const e of engine.drainEvents()){
    tone(e.type);if(e.type==='coin')renderer.burst(e);
    if(['magnet','double','sneakers','jetpack','board'].includes(e.type))toast(`${BONUSES[e.type].name} · ${Math.ceil(e.duration)} 秒`);
    if(e.type==='boardPickup')toast('获得护航滑板 · 按 B / 双击启用');
    if(e.type==='shieldBreak'){renderer.shake=.6;toast('滑板已护身 · 继续冲刺！');}
    if(e.type==='landing')toast('安全降落 · 准备接回轨道');
    if(e.type==='mystery'||e.type==='mission')toast(e.message,2800);
    if(e.type==='combo')toast(`${e.combo} 连币！积分倍率 ${multiplierText(engine.multiplier)}`);
    if(e.type==='stage')toast(`LEVEL ${e.stage} · ${STAGES[e.stage-1]}`,2600);
    if(e.type==='crash')showGameOver();
  }
}
const keyActions={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'jump',ArrowDown:'slide',s:'slide',S:'slide',b:'board',B:'board'};
document.addEventListener('keydown',event=>{
  if($('bonus-guide').open)return;
  if(event.key==='Tab'&&!$('overlay').hidden){if(event.shiftKey&&document.activeElement===$('resume')){event.preventDefault();$('home').focus();}else if(!event.shiftKey&&document.activeElement===$('home')){event.preventDefault();$('resume').focus();}return;}
  if(event.key==='Escape'||event.key.toLowerCase()==='p'){event.preventDefault();if(event.repeat)return;if(engine.mode==='running')showPause();else if(engine.mode==='paused')resumeRun();return;}
  if(event.key==='Enter'&&(engine.mode==='menu'||engine.mode==='over')&&document.activeElement?.tagName!=='BUTTON'){event.preventDefault();startRun();return;}
  if(keyActions[event.key]&&engine.mode==='running'){event.preventDefault();if(!event.repeat)engine.action(keyActions[event.key]);}
});
$('world').addEventListener('pointerdown',event=>{if(engine.mode!=='running'||!event.isPrimary)return;pointer={x:event.clientX,y:event.clientY,id:event.pointerId};$('world').setPointerCapture(event.pointerId);unlockAudio();});
$('world').addEventListener('pointerup',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<22){const now=performance.now();if(lastTap&&now-lastTap<320){engine.action('board');lastTap=0;}else lastTap=now;return;}
  lastTap=0;engine.action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy<0?'jump':'slide');
});
$('world').addEventListener('pointercancel',()=>{pointer=null;lastTap=0;});
for(const button of document.querySelectorAll('[data-action]')){
  button.addEventListener('pointerdown',event=>{event.preventDefault();unlockAudio();engine.action(button.dataset.action);});
  button.addEventListener('click',event=>{if(event.detail===0)engine.action(button.dataset.action);});
}
$('difficulties').addEventListener('change',event=>chooseDifficulty(event.target.value));
$('start').addEventListener('click',startRun);$('pause').addEventListener('click',showPause);$('resume').addEventListener('click',()=>engine.mode==='paused'?resumeRun():startRun());$('home').addEventListener('click',goHome);
$('board-action').addEventListener('click',()=>{unlockAudio();engine.action('board');});
$('guide').addEventListener('click',()=>showGuide());$('close-guide').addEventListener('click',()=>$('bonus-guide').close());
$('sound').addEventListener('click',()=>{soundOn=!soundOn;storage.set('metro-rush-sound',soundOn?'on':'off');setSoundUI();unlockAudio();tone('coin');});
document.addEventListener('visibilitychange',()=>{if(document.hidden)showPause();previousTime=0;});window.addEventListener('blur',()=>{showPause();pointer=null;lastTap=0;});
function fail(message){stopped=true;engine.pause();$('error-text').textContent=message;$('error').hidden=false;}
$('world').addEventListener('webglcontextlost',event=>{event.preventDefault();fail('图形连接暂时中断，请重新加载。你的已保存纪录仍会保留。');});
function registerTools(){
  const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const actions=['start','pause','resume','left','right','jump','slide','board'];
  const tools=[{name:'get_run_state',title:'查看跑酷状态',description:'Read difficulty, stage, score, coins, combo, and active bonuses.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No arguments accepted.');return engine.snapshot();}},
  {name:'select_difficulty',title:'选择跑酷难度',description:'Change difficulty in the lobby before starting a run.',inputSchema:{type:'object',properties:{difficulty:{type:'string',enum:Object.keys(DIFFICULTIES)}},required:['difficulty'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).length!==1||!chooseDifficulty(input.difficulty))throw Error('Difficulty can only be changed in the lobby.');return engine.snapshot();}},
  {name:'control_run',title:'操作跑酷游戏',description:'Start, pause, resume, move, jump, slide, or use a hoverboard via the same player controls.',inputSchema:{type:'object',properties:{action:{type:'string',enum:actions}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).length!==1||!actions.includes(input.action))throw Error('Invalid action.');if(stopped||$('bonus-guide').open)throw Error('Game unavailable or guide open.');const ok=input.action==='start'?startRun():input.action==='pause'?showPause():input.action==='resume'?resumeRun():engine.action(input.action);if(!ok)throw Error('Action unavailable in the current state.');syncUI();return engine.snapshot();}}];
  for(const tool of tools)try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
}
function frame(now){
  if(stopped)return;const dt=previousTime?Math.min((now-previousTime)/1000,.1):0;previousTime=now;
  if(engine.mode==='running'){accumulator+=dt;while(accumulator>=1/120){engine.step(1/120);accumulator-=1/120;}events();}else accumulator=0;
  uiTime+=dt;if(uiTime>.075){syncUI();uiTime=0;}
  try{renderer.render(engine,dt);requestAnimationFrame(frame);}catch{fail('3D 场景运行中断，请重新加载游戏。');}
}
try{renderer=new WorldRenderer($('world'));setupBonuses();setSoundUI();updateMenu();syncUI();registerTools();requestAnimationFrame(frame);}catch(error){fail(error.message||'游戏加载失败，请刷新重试。');}
