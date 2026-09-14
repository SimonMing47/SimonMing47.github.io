import { RunnerEngine, DIFFICULTIES, BONUSES, STAGES, DISTRICTS, ROUTE_EVENTS } from './engine.js';
import { WorldRenderer } from './renderer.js';
const $=id=>document.getElementById(id);
const storage={get(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,String(value));}catch{}}};
const remembered=storage.get('metro-rush-difficulty','classic');
let difficulty=Object.hasOwn(DIFFICULTIES,remembered)?remembered:'classic';
const engine=new RunnerEngine(undefined,difficulty);
let renderer,soundOn=storage.get('metro-rush-sound','off')==='on',audioContext,previousTime=0,accumulator=0,uiTime=0,toastTimer,stopped=false,lastCoinTone=-Infinity,pointer=null,lastTap=0;
let noticeTimer,guideResume=false;
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
  const notes={eventWarning:[460,700,.24,.025],eventStart:[520,980,.32,.03],eventProgress:[860,1420,.12,.025],stamp:[920,1450,.12,.025],eventFinish:[660,1320,.38,.04],district:[260,520,.35,.02],coin:[900+(engine.combo%8)*70,1550,.09,.025],jump:[260,590,.13,.025],slide:[340,130,.15,.025],move:[230,270,.045,.01],crash:[110,34,.4,.07],magnet:[440,1350,.38,.035],double:[660,1760,.3,.032],sneakers:[360,1080,.2,.03],jetpack:[180,800,.6,.03],board:[300,900,.23,.032],boardPickup:[660,980,.15,.03],mystery:[750,1600,.3,.033],mission:[660,1320,.4,.04],combo:[880,1760,.25,.035],stage:[440,880,.3,.03],shieldBreak:[180,80,.3,.04],land:[85,50,.08,.015],trainWarning:[140,95,.5,.035],ceiling:[140,80,.12,.02]};
  const n=notes[type];if(!n)return;const osc=audioContext.createOscillator(),gain=audioContext.createGain();
  osc.type=type==='crash'?'sawtooth':'sine';osc.frequency.setValueAtTime(n[0],now);osc.frequency.exponentialRampToValueAtTime(n[1],now+n[2]);
  gain.gain.setValueAtTime(n[3],now);gain.gain.exponentialRampToValueAtTime(.001,now+n[2]);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(now+n[2]);osc.onended=()=>{osc.disconnect();gain.disconnect();};
}
function toast(message,duration=2500){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),duration);}
const iconPaths={
  magnet:'<path d="M5 4v9a7 7 0 0 0 14 0V4h-5v9a2 2 0 0 1-4 0V4H5Z"/><path d="M5 8h5m4 0h5"/>',
  double:'<path d="m3 10 6 7m0-7-6 7m11-6c0-5 7-5 7-1 0 2-7 5-7 8h7"/>',
  sneakers:'<path d="M3 14V8h4l3 5 6 2h3a2 2 0 0 1 2 2v3H3v-6Zm0 3h18m-11-4 2-2m1 3 2-2M13 6l3-3 3 3m-3-3v7"/>',
  jetpack:'<path d="M8 15V7a4 4 0 0 1 8 0v8H8Zm0-6L4 12v5l4-2m8-6 4 3v5l-4-2M9 18l-1 3m4-3v4m3-4 1 3"/><circle cx="12" cy="8" r="1"/>',
  board:'<rect x="8" y="2" width="8" height="20" rx="4" transform="rotate(35 12 12)"/><path d="m12 7-4 6m8-2-4 6"/>',
  mystery:'<rect x="3" y="7" width="18" height="4" rx="1"/><path d="M5 11v10h14V11M12 7v14m0-14C4 8 5 1 8 3l4 4c8 1 7-6 4-4l-4 4Z"/>'
};
const icon=key=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[key]}</svg>`;
function setupBonuses(){
  $('bonus-grid').innerHTML=Object.entries(BONUSES).map(([key,b])=>`<button class="bonus-tile" data-bonus="${key}" style="--bonus:${b.color}" aria-label="了解${b.name}"><span class="bonus-icon">${icon(key)}</span><span>${b.short}</span></button>`).join('');
  $('power-bar').innerHTML=Object.entries(BONUSES).filter(([key])=>key!=='mystery').map(([key,b])=>`<div class="active-power" id="power-${key}" style="--bonus:${b.color}" hidden><span class="power-glyph">${icon(key)}</span><span class="power-name">${b.short}</span><small id="seconds-${key}"></small><span class="power-track"><i id="fill-${key}"></i></span></div>`).join('');
  $('board-icon').innerHTML=icon('board');
  for(const button of document.querySelectorAll('[data-bonus]'))button.addEventListener('click',()=>showGuide(button.dataset.bonus));
}
function announceBonus(type,duration){
  const b=BONUSES[type];clearTimeout(noticeTimer);$('bonus-notice').style.setProperty('--bonus',b.color);
  $('notice-icon').innerHTML=icon(type);$('notice-title').textContent=b.name+'已生效';
  $('notice-detail').textContent=type==='magnet'?'金币正在沿光迹飞向你':type==='board'?'抵挡一次碰撞':`${Math.ceil(duration)} 秒 · ${b.description}`;
  $('bonus-notice').classList.add('visible');noticeTimer=setTimeout(()=>$('bonus-notice').classList.remove('visible'),2800);
}
function updateMenu(){
  const d=DIFFICULTIES[difficulty];$('app').dataset.difficulty=difficulty;
  $('difficulty-hint').textContent=d.hint;$('difficulty-speed').textContent=`${Math.round(d.startSpeed*3.6)} km/h 起步`;
  $('difficulty-pattern').textContent={casual:'宽松路线与收集奖励，随机事件循序加入。',classic:'跳滑、车潮和车顶夺宝，挑战之后有喘息。',expert:'更长的随机连招与混合列车，准确选择路线。'}[difficulty];
  $('difficulty-reward').textContent=`${multiplierText(d.multiplier)} 积分`;$('difficulty-boards').textContent=`${d.boards} 块滑板`;$('start-label').textContent=`开始 · ${d.name}模式`;
  $('best').textContent=format(records[difficulty].score);$('best-distance').textContent=format(records[difficulty].distance);
  $('mode-badge').textContent=`${d.name} · ${d.english}`;
  for(const label of document.querySelectorAll('.difficulty-card')){const selected=label.dataset.mode===difficulty;label.classList.toggle('selected',selected);label.querySelector('input').checked=selected;}
}
function chooseDifficulty(value){
  if(engine.mode!=='menu'||!Object.hasOwn(DIFFICULTIES,value))return false;
  difficulty=value;storage.set('metro-rush-difficulty',value);engine.reset(undefined,difficulty);updateMenu();return true;
}
function selectGuide(selected='magnet'){
  const b=BONUSES[selected],duration=b.duration*DIFFICULTIES[difficulty].bonusScale;
  if(!$('guide-tabs').childElementCount)$('guide-tabs').innerHTML=Object.entries(BONUSES).map(([key,item])=>`<button data-guide-bonus="${key}" aria-pressed="${key===selected}" style="--bonus:${item.color}">${icon(key)}<span>${item.short}</span></button>`).join('');
  for(const button of $('guide-tabs').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.guideBonus===selected));
  $('guide-list').innerHTML=`<article class="guide-entry" style="--bonus:${b.color}"><span class="guide-hero-icon">${icon(selected)}</span><div><strong>${b.name}</strong><small>${b.duration?`${+duration.toFixed(1)} 秒${selected==='board'?' · 主动使用':''}`:'立即生效'}</small><p>${b.description}</p></div></article>`;
}
function showGuide(selected='magnet'){
  if($('bonus-guide').open)return;guideResume=engine.mode==='running';if(guideResume)showPause();
  selectGuide(selected);$('bonus-guide').showModal();
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
  $('zone').textContent=`${DISTRICTS[engine.scene].name} · LV.${engine.stage}`;$('next-stage').textContent=engine.stage<5?`下一等级 ${format(engine.config.stageLength-(engine.distance%engine.config.stageLength))} m`:'最高等级';$('stage-fill').style.transform=`scaleX(${engine.stageProgress})`;
  $('combo-panel').hidden=menu||engine.combo<3;$('combo-count').textContent=engine.combo;$('combo-label').textContent=engine.combo>=20?`连币倍率 ${multiplierText(engine.comboMultiplier)}`:`${20-engine.combo} 枚后 ×1.5`;$('combo-fill').style.transform=`scaleX(${engine.comboTimer/engine.config.comboWindow})`;
  let active=0;for(const [key,b] of Object.entries(BONUSES)){
    if(key==='mystery')continue;const seconds=engine[key];const el=$(`power-${key}`);el.hidden=seconds<=0;
    if(seconds>0){active++;$(`seconds-${key}`).textContent=`${Math.ceil(seconds)}s`;$(`fill-${key}`).style.transform=`scaleX(${seconds/(b.duration*engine.config.bonusScale)})`;el.classList.toggle('expiring',seconds<3);el.setAttribute('aria-label',`${b.name}，剩余 ${Math.ceil(seconds)} 秒`);}
  }
  $('power-bar').hidden=!running||active===0;
  $('app').dataset.environment=engine.environment;$('app').dataset.scene=engine.scene;
  const surfaces={ground:'地面',roof:'车顶',uphill:'上坡',downhill:'下坡',air:'腾空',flight:'飞行'};
  $('route-status').textContent=`${engine.environment==='tunnel'?'山洞 · ':''}${surfaces[engine.surface]}`;
  const upcoming=engine.routeCue;
  $('action-cue').hidden=!running||!upcoming;
  if(upcoming){
    const labels={jump:['↑','前方跳跃','↑ / 上滑'],slide:['↓','前方滑铲','↓ / 下滑'],climb:['↗','斜坡上车顶','沿箭头跑上斜坡'],descend:['↘','斜坡下车','继续前进回到地面'],oncoming:['!','列车驶来',`${['左','中','右'][upcoming.lane+1]}轨来车 · 提前换道`]};
    const [symbol,label,hint]=labels[upcoming.kind];$('action-symbol').textContent=symbol;$('action-label').textContent=label;
    $('action-distance').textContent=`${Math.ceil(upcoming.meters)} 米 · ${upcoming.mixed?'先避开列车':hint}`;$('action-cue').dataset.action=upcoming.kind;
  }
  $('board-count').textContent=engine.boardCharges;$('board-action').disabled=engine.board>0||engine.boardCharges===0||engine.jetpack>0||engine.landing;
  $('board-hint').textContent=engine.board>0?`保护中 · ${Math.ceil(engine.board)}s`:engine.jetpack>0?'飞行中':engine.boardCharges===0?'拾取滑板补充':'B / 双击使用';
  const mission=engine.missions.find(m=>!m.done),encounter=engine.encounterView;
  $('mission-panel').classList.toggle('event-active',!!encounter);
  $('mission-detail').hidden=!encounter;
  if(encounter){
    const meta=ROUTE_EVENTS[encounter.type],phase=encounter.phase;
    $('mission-panel').style.setProperty('--event',meta.color);
    $('mission-panel').dataset.phase=phase;
    $('mission-tag').textContent=phase==='warning'?'前方事件':phase==='result'?(encounter.success?'事件完成':'下次再试'):`随机事件 · ${encounter.type==='rooftop'?'自选冒险':['','轻快','紧张','高压'][encounter.level]}`;
    $('mission-name').textContent=meta.name;
    $('mission-reward').textContent=`+${encounter.reward} 分`;
    $('mission-detail').textContent=phase==='result'?(encounter.success?`奖励 ${encounter.coins} 金币 · 已完成 ${engine.eventStats.completed} 个事件`:'错过不会扣分，继续探索下一段。'):meta.hint;
    $('mission-progress').textContent=phase==='warning'?`${Math.ceil(encounter.remaining)} 米后开始 · 目标 ${encounter.goal} ${['courier','rooftop'].includes(encounter.type)?'枚徽章':'关'}`:`${encounter.progress} / ${encounter.goal}${phase==='active'?` · 剩余 ${Math.ceil(encounter.remaining)} m`:''}`;
    $('mission-fill').style.transform=`scaleX(${phase==='warning'?0:encounter.progress/encounter.goal})`;
  }else{
    $('mission-tag').textContent=mission?'本局挑战':'继续探索';
    $('mission-name').textContent=mission?.name||`已完成 ${engine.eventStats.completed} 个随机事件`;$('mission-reward').textContent=mission?`+${mission.reward} 分`:'新事件在路上';
    $('mission-progress').textContent=mission?`${mission.progress} / ${mission.target}`:`最佳连续完成 ${engine.eventStats.bestStreak} 次`;$('mission-fill').style.transform=`scaleX(${mission?mission.progress/mission.target:1})`;
  }

}
function startRun(){
  if(stopped||!renderer||(engine.mode!=='menu'&&engine.mode!=='over'))return false;
  unlockAudio();engine.reset(undefined,difficulty);engine.start();renderer.resetCharacter();renderer.particles=[];accumulator=0;lastTap=0;
  clearTimeout(toastTimer);clearTimeout(noticeTimer);$('bonus-notice').classList.remove('visible');$('toast').classList.remove('visible');syncUI();$('pause').focus({preventScroll:true});
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
  $('overlay-message').textContent={train:'从斜坡登上车顶，或提前换道。车厢间隙需要起跳越过。',oncoming:'迎面列车速度更快，看到车灯和来车提示就提前换道。',ramp:'从坡脚沿箭头进入斜坡；无法从侧面穿过坡体。',barrier:'向上跳跃，或换到空闲轨道，就能越过路障。',gate:'向下滑铲通过横杆。超级跳跃时也要留意高度。'}[engine.reason]||'这一程结束了，下一程继续。';
  $('result-stats').hidden=false;$('result-score').textContent=format(engine.score);$('result-mode').textContent=`${engine.config.name} · 基础倍率 ${multiplierText(engine.config.multiplier)}`;
  $('result-distance').textContent=format(engine.distance)+' m';$('result-coins').textContent=format(engine.coins);$('result-combo').textContent=format(engine.maxCombo);$('result-bonuses').textContent=engine.bonusCount;
  const complete=engine.missions.filter(m=>m.done).length;$('result-reward').textContent=`完成挑战 ${complete}/3 · 滑板护身 ${engine.savedCrashes} 次 · 随机事件 ${engine.eventStats.completed} 次 · 最佳连胜 ${engine.eventStats.bestStreak} 次 · 奖励分 +${format(engine.stats.bonusPoints)}`;
  $('resume').textContent='再跑一次 ↗';renderer.shake=1;syncUI();$('resume').focus({preventScroll:true});
}
function goHome(){engine.reset(undefined,difficulty);renderer.resetCharacter();accumulator=0;renderer.particles=[];clearTimeout(toastTimer);clearTimeout(noticeTimer);$('bonus-notice').classList.remove('visible');$('toast').classList.remove('visible');updateMenu();syncUI();$('start').focus({preventScroll:true});}
function events(){
  for(const e of engine.drainEvents()){
    renderer.handleEvent(e);if(e.type!=='stamp'&&(e.type!=='eventFinish'||e.success))tone(e.type);if(e.type==='coin')renderer.burst(e);
    if(e.type==='stamp')renderer.burst({...e,color:'#a4e8ff'});
    if(e.type==='district')toast(`进入${DISTRICTS[e.scene].name}`,2200);
    if(e.type==='eventWarning')toast(`前方 · ${ROUTE_EVENTS[e.eventType].name}`,1900);
    if(e.type==='eventStart')toast(`${ROUTE_EVENTS[e.eventType].name}开始`,1500);
    if(e.type==='eventFinish'&&e.success)toast(`完成！+${e.reward} 分 · +${e.coins} 金币`,2700);
    if(['magnet','double','sneakers','jetpack','board'].includes(e.type))announceBonus(e.type,e.duration);
    if(e.type==='boardPickup')toast('获得护航滑板 · 按 B / 双击启用');
    if(e.type==='shieldBreak'){renderer.shake=.6;toast('滑板已护身 · 继续冲刺！');}
    if(e.type==='environment')toast(e.environment==='tunnel'?'进入山洞 · 留意来车和洞顶':'驶出山洞 · 回到城市轨道');
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
$('guide-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-guide-bonus]');if(button)selectGuide(button.dataset.guideBonus);});
$('bonus-guide').addEventListener('close',()=>{if(guideResume&&engine.mode==='paused')resumeRun();guideResume=false;});
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
