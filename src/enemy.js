import Spark from './spark.js';
import Projectile from './projectile.js';
import { pointToSegmentDistance, circleRectPenetration, reflectVector } from './collision.js';
import { CELL, ROWS, COLS, WIDTH, HEIGHT, BOUNCE_DAMP } from './constants.js';
const TWO_PI = Math.PI*2;

export default class Enemy{
  // type: 'minion' | 'main'
  constructor(x,y, type='minion', cfg = {}){
    this.x = x; this.y = y;
    this.type = type;
    // apply configuration if present
    this.config = cfg || {};
    // set properties from config first
    this.aggression = typeof this.config.aggression === 'number' ? this.config.aggression : 1.0; // multiplier for speed/accel
    this.acceleration = typeof this.config.acceleration === 'number' ? this.config.acceleration : 0;
    this.maxSpeed = typeof this.config.maxSpeed === 'number' ? this.config.maxSpeed : 120;
    this.temperament = this.config.temperament || 'neutral'; // 'passive', 'aggressive', 'erratic'
    // base speed + size depend on type or provided config
    let baseSpeed = 70 * 0.75; // default
    if(typeof this.config.minSpeed === 'number' && typeof this.config.maxSpeed === 'number'){
      baseSpeed = this.config.minSpeed + Math.random() * (this.config.maxSpeed - this.config.minSpeed);
    }
    let baseRadius = (8 + Math.random()*6) * 0.2;
    if(typeof this.config.minSize === 'number' && typeof this.config.maxSize === 'number'){
      baseRadius = this.config.minSize + Math.random() * (this.config.maxSize - this.config.minSize);
    }
    if(type === 'main'){
      baseSpeed *= 0.6; baseRadius = Math.max(baseRadius * 1.8, 6);
      this.color = this.config.color || '#ff4500';
      this.hp = typeof this.config.hp === 'number' ? this.config.hp : 3;
      // apply aggression
      baseSpeed *= this.aggression;
      this.acceleration *= this.aggression;
      this.maxSpeed *= this.aggression;
    } else {
      this.color = this.config.color || '#8b00ff';
      this.hp = typeof this.config.hp === 'number' ? this.config.hp : 1;
    }
    this.vx = (Math.random()*2-1) * baseSpeed;
    this.vy = (Math.random()*2-1) * baseSpeed;
    this.radius = baseRadius;
    this.targetRadius = baseRadius; // desired radius (for smooth transitions)
    this._radiusLerpSpeed = 6.0; // how quickly radius approaches target (units per second)
    if(typeof this.config.radiusLerpSpeed === 'number') this._radiusLerpSpeed = this.config.radiusLerpSpeed;
    this._lastSpark = 0;
    this._t = Math.random() * 1000;
    // optional behavior pattern (hover|orbit|patrol|aggro for mains; follow|swerve for minions)
    this.pattern = typeof this.config.pattern === 'string' ? this.config.pattern : null;
    this.isMiniBoss = !!this.config.isMiniBoss;
    // weapon system for mains
    this.weapon = this.config.weapon || null; // e.g., 'radial', 'axes', 'burst', etc.
    this.fireRate = typeof this.config.fireRate === 'number' ? this.config.fireRate : 2.0; // shots per second
    this.lastFire = 0;
    // segments for centipede-like enemies
    this.segments = [];
    if(type === 'main' && typeof this.config.segments === 'number' && this.config.segments > 0){
      this.segments = Array(this.config.segments).fill().map(() => ({x: this.x, y: this.y, angle: 0}));
      this.segmentSpeed = typeof this.config.segmentSpeed === 'number' ? this.config.segmentSpeed : 150;
      this.maxSegmentDist = typeof this.config.maxSegmentDist === 'number' ? this.config.maxSegmentDist : this.radius * 2;
    }
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

    // update segments for centipede enemies
    if(this.segments.length > 0){
      for(let i = 0; i < this.segments.length; i++){
        const target = i === 0 ? this : this.segments[i - 1];
        const dx = target.x - this.segments[i].x;
        const dy = target.y - this.segments[i].y;
        const dist = Math.hypot(dx, dy);
        // compute desired max distance dynamically so spacing scales with current enemy size
        const maxSegDist = (typeof this.config.maxSegmentDist === 'number') ? this.config.maxSegmentDist : Math.max(6, this.radius * 2);
        if(dist > maxSegDist){
          const moveDist = Math.min(this.segmentSpeed * dt, dist - maxSegDist);
          this.segments[i].x += (dx / dist) * moveDist;
          this.segments[i].y += (dy / dist) * moveDist;
        }
      }
      // update segment angles to propagate rotation
      const headAngle = Math.atan2(this.vy, this.vx);
      for(let i = 0; i < this.segments.length; i++){
        const targetAngle = i === 0 ? headAngle : this.segments[i-1].angle;
        let angleDiff = targetAngle - this.segments[i].angle;
        // normalize to -pi to pi
        while(angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while(angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        this.segments[i].angle += angleDiff * 0.05 * dt * 60; // lerp factor
      }
    }

    // behavior variations
    this._t += dt;
    if(this.type === 'main' || this.type === 'miniboss'){
      // main/miniboss behavior: allow per-level pattern overrides
      const amp = 40 + (this.hp||3) * 4;
      if(this.pattern === 'orbit'){
        this.vx += Math.cos(this._t*0.5) * (8 + amp*0.02) * dt;
        this.vy += Math.sin(this._t*0.5) * (8 + amp*0.02) * dt;
      } else if(this.pattern === 'patrol'){
        this.vx += Math.cos(this._t*0.35) * 6 * dt;
        this.vy += Math.sin(this._t*0.45) * 6 * dt;
      } else if(this.pattern === 'aggro' && game && game.player){
        const dx = this.x - game.player.x, dy = this.y - game.player.y; const d = Math.hypot(dx,dy)||1;
        this.vx += (dx/d) * 6 * Math.sin(this._t*0.6) * dt;
        this.vy += (dy/d) * 6 * Math.cos(this._t*0.6) * dt;
      } else {
        // default drift
        this.vx += Math.cos(this._t*0.5) * 10 * dt;
        this.vy += Math.sin(this._t*0.5) * 10 * dt;
      }
      // clamp speed a bit
      const sp = Math.hypot(this.vx, this.vy) || 1;
      const maxSp = this.maxSpeed || 120;
      if(sp > maxSp){ this.vx = (this.vx/sp) * maxSp; this.vy = (this.vy/sp) * maxSp; }
    }
    // weapon firing for mains
    if(this.weapon && this.type === 'main'){
      const now = performance.now() / 1000;
      if(now - this.lastFire > 1 / this.fireRate){
        this.fireWeapon(game);
        this.lastFire = now;
      }
    } else {
      // minion pattern-based behavior
      if(this.pattern === 'follow' && game && game.player){
        if(Math.random() < 0.02){ const ang = Math.atan2(game.player.y - this.y, game.player.x - this.x); const s = (this.config.minSpeed + this.config.maxSpeed)/2 || 60; this.vx = Math.cos(ang)*s; this.vy = Math.sin(ang)*s; }
      } else if(this.pattern === 'swerve'){
        if(Math.random() < 0.02){ const ang = Math.random()*TWO_PI; const s = this.config.minSpeed + Math.random()*(this.config.maxSpeed - this.config.minSpeed); this.vx = Math.cos(ang)*s; this.vy = Math.sin(ang)*s; }
      } else {
        if(Math.random() < 0.01) {
          const ang = Math.random()*TWO_PI;
          const minS = (this.config && this.config.minSpeed) ? this.config.minSpeed : 30;
          const maxS = (this.config && this.config.maxSpeed) ? this.config.maxSpeed : 120;
          const s = minS + Math.random() * (maxS - minS);
          this.vx = Math.cos(ang)*s;
          this.vy = Math.sin(ang)*s;
        }
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
    const points = [{x: this.x, y: this.y}];
    if(this.segments) points.push(...this.segments);
    let closest = null; let best = Infinity;
    for(const point of points){
      for(let i=0;i<trail.length-1;i++){
        const a = trail[i]; const b = trail[i+1];
        const d = pointToSegmentDistance(point.x, point.y, a.x, a.y, b.x, b.y);
        if(d < best){ best = d; const t = Math.max(0, Math.min(1, ((point.x - a.x)*(b.x-a.x) + (point.y - a.y)*(b.y-a.y))/((b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y) || 1))); const px = a.x + (b.x-a.x)*t; const py = a.y + (b.y-a.y)*t; closest = {x:px,y:py}; }
      }
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

  fireWeapon(game){
    if(!game || !game.projectiles) return;
    if(this.weapon === 'radial'){
      // fire in 8 directions
      for(let i=0; i<8; i++){
        const ang = (i / 8) * TWO_PI;
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        game.projectiles.push(new Projectile(this.x, this.y, dx, dy, 100, 'enemy'));
      }
    } else if(this.weapon === 'axes'){
      // fire horizontal and vertical
      game.projectiles.push(new Projectile(this.x, this.y, 1, 0, 100, 'enemy'));
      game.projectiles.push(new Projectile(this.x, this.y, -1, 0, 100, 'enemy'));
      game.projectiles.push(new Projectile(this.x, this.y, 0, 1, 100, 'enemy'));
      game.projectiles.push(new Projectile(this.x, this.y, 0, -1, 100, 'enemy'));
    } else if(this.weapon === 'burst'){
      // fire burst in random directions
      for(let i=0; i<5; i++){
        const ang = Math.random() * TWO_PI;
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        game.projectiles.push(new Projectile(this.x, this.y, dx, dy, 120, 'enemy'));
      }
    } else if(this.weapon === 'targeted'){
      // fire towards player
      if(game.player){
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const dirx = dx / dist;
        const diry = dy / dist;
        game.projectiles.push(new Projectile(this.x, this.y, dirx, diry, 150, 'enemy'));
      }
    }
    // add more weapons as needed
  }
}
