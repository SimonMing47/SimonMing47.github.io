export const INTRO_DURATION=5.2;
export const PURSUIT_RULES=Object.freeze({
  casual:{recoverSeconds:7,skillRelief:5,exitDistance:1200,waves:4},
  classic:{recoverSeconds:10,skillRelief:4,exitDistance:1500,waves:5},
  expert:{recoverSeconds:13,skillRelief:3,exitDistance:1800,waves:6}
});
export const EXIT_NAMES=['北桥出口','港区接应站','旧线天桥','峡谷转运站','夜市连廊'];

// Pressure only recedes during clean play. It never causes an unavoidable capture.
export class Pursuit {
  constructor(difficulty){this.rules=PURSUIT_RULES[difficulty];this.pressure=18;this.hits=0;this.escapes=0;this.recoveries=0;}
  get danger(){return this.pressure>=55;}
  get gap(){return 1.1+(100-this.pressure)/82*4.8;}
  get seconds(){return this.danger?Math.ceil((this.pressure-54)/(34/this.rules.recoverSeconds)):0;}
  step(dt){const was=this.danger;this.pressure=Math.max(18,this.pressure-dt*34/this.rules.recoverSeconds);if(was&&!this.danger){this.recoveries++;return true;}return false;}
  skill(){const was=this.danger;this.pressure=Math.max(18,this.pressure-this.rules.skillRelief);if(was&&!this.danger){this.recoveries++;return true;}return false;}
  hit(){this.hits++;if(this.danger){this.pressure=100;return 'caught';}this.pressure=88;return 'stumble';}
  escape(){this.pressure=18;this.escapes++;}
}
