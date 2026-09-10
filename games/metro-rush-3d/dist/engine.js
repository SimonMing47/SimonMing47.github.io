/** Pure, deterministic gameplay. Coordinates: x is lateral; ahead is metres in front. */
export const LANE_WIDTH = 2.7;
export const PHYSICS = Object.freeze({ gravity: 28, jumpVelocity: 11.4, slideDuration: .8, startSpeed: 20, maxSpeed: 36 });
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function randomSource(seed = Date.now()) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export class RunnerEngine {
  constructor(seed) { this.reset(seed); }
  reset(seed = Date.now()) {
    this.random = randomSource(seed); this.seed = seed; this.mode = 'menu';
    this.distance = 0; this.time = 0; this.speed = PHYSICS.startSpeed;
    this.lane = 0; this.x = 0; this.y = 0; this.vy = 0; this.slide = 0;
    this.coins = 0; this.score = 0; this.magnet = 0; this.obstacles = []; this.pickups = [];
    this.events = []; this.nextRow = 58; this.rows = 0; this.id = 0; this.lastMilestone = 0;
    this.reason = ''; this.nextSafeLane = 0;
    for (let p = 10; p < 44; p += 3) this.pickups.push(this.item('coin', 0, p));
    this.populate();
  }
  item(type, lane, ahead, y = .95) { return { id: ++this.id, type, lane, ahead, y }; }
  start() { if (this.mode !== 'menu') return false; this.mode = 'running'; return true; }
  pause() { if (this.mode !== 'running') return false; this.mode = 'paused'; return true; }
  resume() { if (this.mode !== 'paused') return false; this.mode = 'running'; return true; }
  action(action) {
    if (this.mode !== 'running') return false;
    if (action === 'left' || action === 'right') {
      const next = clamp(this.lane + (action === 'left' ? -1 : 1), -1, 1);
      if (next === this.lane) return false;
      this.lane = next; this.events.push({type: 'move'}); return true;
    }
    if (action === 'jump' && this.y < .02 && this.vy <= 0) {
      this.slide = 0; this.vy = PHYSICS.jumpVelocity; this.events.push({ type: 'jump' }); return true;
    }
    if (action === 'slide') {
      if (this.y > .02) { this.vy = Math.min(this.vy, -16); this.events.push({type: 'drop'}); }
      else { this.slide = PHYSICS.slideDuration; this.events.push({type: 'slide'}); }
      return true;
    }
    return false;
  }
  populate() {
    while (this.nextRow - this.distance < 170) {
      const row = this.rows++;
      const ahead = this.nextRow - this.distance;
      // Every row has a fully open lane. Adjacent rows leave at least 0.82 s at top speed.
      const safeLane = row === 0 ? -1 : Math.floor(this.random() * 3) - 1;
      const blocked = [-1, 0, 1].filter(lane => lane !== safeLane);
      for (const lane of blocked) {
        let type;
        if (row === 0) type = lane === 0 ? 'barrier' : 'train';
        else if (row === 1) type = lane === 0 ? 'gate' : 'train';
        else { const r = this.random(); type = r < .36 ? 'train' : r < .69 ? 'barrier' : 'gate'; }
        this.obstacles.push({ ...this.item(type, lane, ahead, 0), halfLength: type === 'train' ? 4.4 : .65, passed: false, row });
        if (type === 'barrier') for (let i = -2; i <= 2; i++) this.pickups.push(this.item('coin', lane, ahead + i * 2, 1.3 + (2 - Math.abs(i)) * .62));
      }
      for (let j = -9; j <= 9; j += 3) this.pickups.push(this.item('coin', safeLane, ahead + j));
      if (row > 1 && row % 5 === 3) this.pickups.push(this.item('magnet', safeLane, ahead - 14, 1.2));
      this.nextSafeLane = safeLane;
      this.nextRow += 32 + this.random() * 9;
    }
  }
  step(dt) {
    if (this.mode !== 'running') return;
    // Cap a single simulation step; the UI advances with a fixed 1/120 s timestep.
    dt = clamp(dt, 0, .05);
    this.time += dt; this.speed = Math.min(PHYSICS.maxSpeed, PHYSICS.startSpeed + this.distance * .009);
    const move = this.speed * dt; this.distance += move;
    this.x += (this.lane * LANE_WIDTH - this.x) * (1 - Math.exp(-19 * dt));
    this.slide = Math.max(0, this.slide - dt); this.magnet = Math.max(0, this.magnet - dt);
    if (this.y > 0 || this.vy > 0) {
      this.vy -= PHYSICS.gravity * dt; this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.events.push({type: 'land'}); }
    }
    for (const o of this.obstacles) {
      o.ahead -= move;
      if (Math.abs(o.ahead) < o.halfLength + .3 && Math.abs(this.x - o.lane * LANE_WIDTH) < 1.05) {
        const hit = o.type === 'train' || (o.type === 'barrier' && this.y < .99) || (o.type === 'gate' && (this.slide <= 0 || this.y > .08));
        if (hit) { this.mode = 'over'; this.reason = o.type; this.events.push({type: 'crash'}); break; }
      }
      if (!o.passed && o.ahead < -o.halfLength - .4) { o.passed = true; }
    }
    if (this.mode === 'running') for (const p of this.pickups) {
      p.ahead -= move;
      const dx = Math.abs(this.x - p.lane * LANE_WIDTH);
      const ordinary = Math.abs(p.ahead) < .95 && dx < .8 && p.y >= this.y - .3 && p.y <= this.y + (this.slide > 0 ? 1.05 : 2.1);
      const magnetic = this.magnet > 0 && p.type === 'coin' && Math.abs(p.ahead) < 8.5;
      if (!p.collected && (ordinary || magnetic)) {
        p.collected = true;
        if (p.type === 'coin') { this.coins++; this.events.push({ type: 'coin', lane: p.lane, y: p.y, ahead: p.ahead }); }
        else { this.magnet = 8; this.events.push({type: 'magnet'}); }
      }
    }
    this.obstacles = this.obstacles.filter(o => o.ahead > -16);
    this.pickups = this.pickups.filter(p => p.ahead > -8 && !p.collected);
    this.score = Math.floor(this.distance) + this.coins * 10;
    const milestone = Math.floor(this.distance / 500);
    if (milestone > this.lastMilestone && this.mode === 'running') { this.lastMilestone = milestone; this.events.push({type: 'milestone', distance: milestone * 500}); }
    this.populate();
  }
  drainEvents() { const e = this.events; this.events = []; return e; }
  snapshot() { return { state: this.mode, distance: Math.floor(this.distance), score: this.score, coins: this.coins, lane: this.lane, jumping: this.y > .02, sliding: this.slide > 0, magnetSeconds: +this.magnet.toFixed(1), speed: Math.round(this.speed * 3.6) }; }
}
