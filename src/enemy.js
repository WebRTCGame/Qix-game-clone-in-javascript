import Spark from './spark.js';
import { pointToSegmentDistance, circleRectPenetration, reflectVector } from './collision.js';
import { CELL, ROWS, COLS, WIDTH, HEIGHT, BOUNCE_DAMP } from './constants.js';
const TWO_PI = Math.PI*2;

export default class Enemy{
  // type: 'minion' | 'main'
  constructor(x,y, type='minion'){
    this.x = x; this.y = y;
    this.type = type;
    // base speed + size depend on type
    let baseSpeed = 70 * 0.75; // default
    let baseRadius = (8 + Math.random()*6) * 0.2;
    if(type === 'main'){
      baseSpeed *= 0.6; baseRadius = Math.max(baseRadius * 1.8, 6);
      this.color = '#ff4500'; this.hp = 3;
    } else {
      this.color = '#8b00ff'; this.hp = 1;
    }
    this.vx = (Math.random()*2-1) * baseSpeed;
    this.vy = (Math.random()*2-1) * baseSpeed;
    this.radius = baseRadius;
    this.targetRadius = baseRadius; // desired radius (for smooth transitions)
    this._radiusLerpSpeed = 6.0; // how quickly radius approaches target (units per second)
    this._lastSpark = 0;
    this._t = Math.random() * 1000;
  }

  update(dt, game){
    // Integrate position
    let nx = this.x + this.vx * dt; let ny = this.y + this.vy * dt;

    // precise collision vs filled grid cells (circle-rect resolution)
    const minC = Math.max(0, Math.floor((nx - this.radius) / CELL));
    const maxC = Math.min(COLS-1, Math.floor((nx + this.radius) / CELL));
    const minR = Math.max(0, Math.floor((ny - this.radius) / CELL));
    const maxR = Math.min(ROWS-1, Math.floor((ny + this.radius) / CELL));
    for(let r = minR; r <= maxR; r++){
      for(let c = minC; c <= maxC; c++){
          const cc = game.board.getCell(r, c);
          if(cc && !cc.isEmpty()){
          const rx = c * CELL; const ry = r * CELL; const rw = CELL; const rh = CELL;
          const pen = circleRectPenetration(nx, ny, this.radius, rx, ry, rw, rh);
          if(pen){
            // push out by penetration
            nx += pen.nx * pen.penetration;
            ny += pen.ny * pen.penetration;
            // reflect velocity across contact normal and damp
            const ref = reflectVector(this.vx, this.vy, pen.nx, pen.ny);
            this.vx = ref.x * BOUNCE_DAMP; this.vy = ref.y * BOUNCE_DAMP;
          }
        }
      }
    }
    this.x = nx; this.y = ny;
    // keep inside canvas bounds
    this.x = Math.max(this.radius + 1, Math.min(WIDTH - this.radius - 1, this.x));
    this.y = Math.max(this.radius + 1, Math.min(HEIGHT - this.radius - 1, this.y));

    // keep inside canvas
    this.x = Math.max(1, Math.min(799, this.x));
    this.y = Math.max(1, Math.min(799, this.y));

    // behavior variations
    this._t += dt;
    if(this.type === 'main'){
      // main enemy drifts on a slow circular/sine pattern
      const amp = 40 + (this.hp||3) * 4;
      this.vx += Math.cos(this._t*0.5) * 10 * dt;
      this.vy += Math.sin(this._t*0.5) * 10 * dt;
      // clamp speed a bit
      const sp = Math.hypot(this.vx, this.vy) || 1;
      const maxSp = 120;
      if(sp > maxSp){ this.vx = (this.vx/sp) * maxSp; this.vy = (this.vy/sp) * maxSp; }
    } else {
      if(Math.random() < 0.01) {
        const ang = Math.random()*TWO_PI;
        const s = (40 + Math.random()*80) * 0.75;
        this.vx = Math.cos(ang)*s;
        this.vy = Math.sin(ang)*s;
      }
    }
    // smooth radius transition towards targetRadius
    if(typeof this.targetRadius === 'number'){
      const t = Math.min(1, dt * this._radiusLerpSpeed);
      this.radius += (this.targetRadius - this.radius) * t;
    }
  }

  collideTrail(trail){
    // trail is an array of {x,y,r,c}. We'll check distance to segments for precision.
    // Return the closest point on the segment if within range.
    let closest = null; let best = Infinity;
    for(let i=0;i<trail.length-1;i++){
      const a = trail[i]; const b = trail[i+1];
      const d = pointToSegmentDistance(this.x, this.y, a.x, a.y, b.x, b.y);
      if(d < best){ best = d; const t = Math.max(0, Math.min(1, ((this.x - a.x)*(b.x-a.x) + (this.y - a.y)*(b.y-a.y))/((b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y) || 1))); const px = a.x + (b.x-a.x)*t; const py = a.y + (b.y-a.y)*t; closest = {x:px,y:py}; }
    }
    if(best <= this.radius + 2){
      const dx = this.x - closest.x; const dy = this.y - closest.y; const m = Math.hypot(dx,dy) || 1;
      return { x: closest.x, y: closest.y, nx: dx/m, ny: dy/m, dist: best };
    }
    return null;
  }

  emitSpark(point, player){
    // limit spark frequency
    const now = performance.now();
    if(now - this._lastSpark < 450) return null;
    this._lastSpark = now;
    return new Spark(point.x, point.y, {x:player.x, y:player.y});
  }

  distTo(player){
    return Math.hypot(this.x-player.x, this.y-player.y);
  }
}
