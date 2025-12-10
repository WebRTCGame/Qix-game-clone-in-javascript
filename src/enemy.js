import Spark from './spark.js';
import Projectile from './projectile.js';
import { createWeapon } from './weapon.js';
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
    // visual animation state
    this._hue = Math.random() * 360; // base hue for tint
    this._hueSpeed = (this.type === 'main' ? 6 : 18) * (0.5 + Math.random()); // degrees per second
    this._pulsePhase = Math.random() * Math.PI * 2;
    this.renderOffset = { x:0, y:0 };
    this._trailEmitTimer = 0;
    // optional behavior pattern (hover|orbit|patrol|aggro for mains; follow|swerve for minions)
    this.pattern = typeof this.config.pattern === 'string' ? this.config.pattern : null;
    this.isMiniBoss = !!this.config.isMiniBoss;
    // weapon system for mains
    this.weapon = this.config.weapon || null; // e.g., 'radial', 'axes', 'burst', etc.
    this.weaponObj = this.weapon ? createWeapon(this.weapon, this.config.projectile || this.config || {}) : null;
    this.fireRate = typeof this.config.fireRate === 'number' ? this.config.fireRate : 2.0; // shots per second
    this.lastFire = 0;
    // firing cadence controls (organic pause -> fire -> wait)
    // mean wait interval between firing bursts (seconds). Default average ~3s.
    this.fireMeanInterval = typeof this.config.fireMeanInterval === 'number' ? this.config.fireMeanInterval : 3.0;
    // how long a firing burst lasts (seconds)
    this.fireDuration = typeof this.config.fireDuration === 'number' ? this.config.fireDuration : (this.weapon === 'burst' ? 0.6 : 0.25);
    // internal firing state machine: 'idle' | 'aiming' | 'firing' | 'turningAway'
    this.firingState = 'idle';
    this.firingEndAt = 0; // timestamp (s) when burst ends
    this.aimStartAt = 0; this.aimDuration = typeof this.config.aimDuration === 'number' ? this.config.aimDuration : 0.42;
    this.turnAwayDuration = typeof this.config.turnAwayDuration === 'number' ? this.config.turnAwayDuration : 0.6;
    // current orientation (radians) used for aiming/turning; initialize from velocity
    this._orientation = Math.atan2(this.vy || 1, this.vx || 1);
    this.aimTargetAngle = this._orientation;
    // schedule initial randomized wait so enemies don't synch
    const now = performance.now() / 1000;
    this.nextFireAt = now + this._sampleNextInterval();
    this._preFireVx = null; this._preFireVy = null;
    // segments for centipede-like enemies — enable by default for all enemy types
    this.segments = [];
    const defaultSegs = (typeof this.config.segments === 'number') ? this.config.segments : (type === 'main' ? 5 : (type === 'miniboss' ? 6 : 3));
    if(defaultSegs > 0){
      this.segments = Array(defaultSegs).fill().map(() => ({x: this.x, y: this.y, angle: 0}));
      this.segmentSpeed = typeof this.config.segmentSpeed === 'number' ? this.config.segmentSpeed : (type === 'main' ? 150 : (type === 'miniboss' ? 170 : 120));
      this.maxSegmentDist = typeof this.config.maxSegmentDist === 'number' ? this.config.maxSegmentDist : this.radius * 2;
    }
    // per-segment hue offsets for centipede appearance
    this._segmentHueOffsets = this.segments.map((s,i)=> (i * 6 + Math.random()*10));
  }

  _sampleNextInterval(){
    // base mean adjusted by aggression and temperament
    let mean = Math.max(0.05, this.fireMeanInterval) / Math.max(0.25, this.aggression);
    if(this.temperament === 'passive') mean *= 1.35;
    else if(this.temperament === 'aggressive') mean *= 0.6;
    // jitter -- erratic has wider variance
    const jitter = (this.temperament === 'erratic') ? (0.4 + Math.random() * 1.6) : (0.7 + Math.random() * 0.6);
    return mean * jitter;
  }

  // shortest angular difference - result in [-PI,PI]
  _angleDelta(a,b){
    let d = b - a;
    while(d > Math.PI) d -= Math.PI*2;
    while(d < -Math.PI) d += Math.PI*2;
    return d;
  }

  _approachAngle(current, target, maxDelta){
    const d = this._angleDelta(current, target);
    if(Math.abs(d) <= maxDelta) return target;
    return current + Math.sign(d) * maxDelta;
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
        // compute effective segment distance:
        // priority: explicit maxSegmentDist > segmentDistance scaled by size > fallback radius*2
        let maxSegDist;
        if(typeof this.config.maxSegmentDist === 'number'){
          maxSegDist = this.config.maxSegmentDist;
        } else if(typeof this.config.segmentDistance === 'number'){
          const refSize = Math.max(1, (this.config.minSize || 6));
          maxSegDist = Math.max(6, this.config.segmentDistance * (this.radius / refSize));
        } else {
          maxSegDist = Math.max(6, this.radius * 2);
        }
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
    // update hue and pulse state for rendering
    this._hue = (this._hue + (this._hueSpeed || 0) * dt) % 360;
    this._pulsePhase += dt * (this.type === 'main' ? 1.25 : 3.0);
    const bobAmp = this.type === 'main' ? 1.0 : 2.5;
    this.renderOffset.x = Math.sin(this._t * 0.9 + (this._pulsePhase||0)) * (bobAmp * 0.5);
    this.renderOffset.y = Math.cos(this._t * 1.1 + (this._pulsePhase||0)) * (bobAmp * 0.4);
    if(this.type === 'main' || this.type === 'miniboss'){
      // main/miniboss behavior: allow per-level pattern overrides
      const accelFactor = 1 + (this.acceleration || 0);
      const amp = 40 + (this.hp||3) * 4;
      if(this.pattern === 'orbit'){
        this.vx += Math.cos(this._t*0.5) * (8 + amp*0.02) * dt * accelFactor;
        this.vy += Math.sin(this._t*0.5) * (8 + amp*0.02) * dt * accelFactor;
      } else if(this.pattern === 'patrol'){
        this.vx += Math.cos(this._t*0.35) * 6 * dt * accelFactor;
        this.vy += Math.sin(this._t*0.45) * 6 * dt * accelFactor;
      } else if(this.pattern === 'aggro' && game && game.player){
        const dx = this.x - game.player.x, dy = this.y - game.player.y; const d = Math.hypot(dx,dy)||1;
        this.vx += (dx/d) * 6 * Math.sin(this._t*0.6) * dt * accelFactor;
        this.vy += (dy/d) * 6 * Math.cos(this._t*0.6) * dt * accelFactor;
      } else {
        // default drift
        this.vx += Math.cos(this._t*0.5) * 10 * dt * accelFactor;
        this.vy += Math.sin(this._t*0.5) * 10 * dt * accelFactor;
      }
      // clamp speed a bit
      const sp = Math.hypot(this.vx, this.vy) || 1;
      const maxSp = this.maxSpeed || 120;
      if(sp > maxSp){ this.vx = (this.vx/sp) * maxSp; this.vy = (this.vy/sp) * maxSp; }
    }
    // weapon firing for mains/minibosses (aim -> fire -> turn away)
    if(this.weapon && (this.type === 'main' || this.type === 'miniboss')){
      const now = performance.now() / 1000;
      switch(this.firingState){
        case 'idle': {
          if(now >= this.nextFireAt){
            // prepare to aim at player (or reasonable default)
            this.firingState = 'aiming';
            this.aimStartAt = now;
            // determine aim direction
            if(game && game.player && this.weapon === 'targeted'){
              const dx = game.player.x - this.x, dy = game.player.y - this.y; const dist = Math.hypot(dx,dy) || 1;
              this.aimTargetAngle = Math.atan2(dy, dx);
            } else {
              // pick a semi-intentional aim towards the player's general location if available
              if(game && game.player){ const dx = game.player.x - this.x, dy = game.player.y - this.y; this.aimTargetAngle = Math.atan2(dy, dx); } else { this.aimTargetAngle = (Math.random() * Math.PI*2); }
            }
            // store start orientation for smooth interpolation
            this._orientStart = this._orientation;
            // store movement and stop while aiming
            this._preFireVx = this.vx; this._preFireVy = this.vy; this.vx = 0; this.vy = 0;
            this.lastFire = 0; // allow immediate initial fire once aiming completes
          }
        } break;
        case 'aiming': {
          // smoothly rotate towards aimTargetAngle over aimDuration
          const elapsed = Math.max(0, now - this.aimStartAt);
          const t = Math.min(1, elapsed / Math.max(0.0001, this.aimDuration));
          const d = this._angleDelta(this._orientStart, this.aimTargetAngle);
          this._orientation = this._orientStart + d * t;
          // when finished aiming move to firing
          if(t >= 1){ this.firingState = 'firing'; this.firingEndAt = now + Math.max(0.05, this.fireDuration); this.lastFire = 0; }
        } break;
        case 'firing': {
          // keep orientation locked on aimTargetAngle while firing
          this._orientation = this.aimTargetAngle;
          if(now - this.lastFire > 1 / Math.max(0.0001, this.fireRate)){
            this.fireWeapon(game);
            this.lastFire = now;
          }
          // finished firing
          if(now >= this.firingEndAt){
            this.firingState = 'turningAway';
            this._turnStart = now;
            this._turnStartOrient = this._orientation;
            // choose a turn-away angle (90-170 degrees either left or right)
            const dir = (Math.random() < 0.5) ? -1 : 1;
            const span = (Math.PI/2) + Math.random() * (Math.PI*0.444); // ~90..170deg
            this._turnTarget = this.aimTargetAngle + dir * span;
            // determine resume speed
            const speed = Math.hypot(this._preFireVx || 0, this._preFireVy || 0) || ((this.config && this.config.minSpeed) ? (this.config.minSpeed + (this.config.maxSpeed||this.config.minSpeed)/2) : 60);
            this._turnSpeedTarget = speed;
            // clear prefire velocities objects (we'll restore gradually)
            // leave _preFireVx/_preFireVy around in case we need.
          }
        } break;
        case 'turningAway': {
          const turnElapsed = Math.max(0, now - (this._turnStart || 0));
          const tt = Math.min(1, turnElapsed / Math.max(0.0001, this.turnAwayDuration));
          const angDelta = this._angleDelta(this._turnStartOrient || this._orientation, this._turnTarget || this._orientation);
          this._orientation = (this._turnStartOrient || this._orientation) + angDelta * tt;
          // gradually re-enable movement along the new orientation
          const sp = (this._turnSpeedTarget || 0) * tt;
          this.vx = Math.cos(this._orientation) * sp;
          this.vy = Math.sin(this._orientation) * sp;
          if(tt >= 1){ this.firingState = 'idle'; this._preFireVx = this._preFireVy = null; this.nextFireAt = now + this._sampleNextInterval(); }
        } break;
      }
    } else {
      // minion pattern-based behavior
      if(this.pattern === 'follow' && game && game.player){
        if(Math.random() < 0.02){ const ang = Math.atan2(game.player.y - this.y, game.player.x - this.x); const s = ((this.config.minSpeed + this.config.maxSpeed)/2 || 60) * (1 + (this.acceleration || 0)); this.vx = Math.cos(ang)*s; this.vy = Math.sin(ang)*s; }
      } else if(this.pattern === 'swerve'){
        if(Math.random() < 0.02){ const ang = Math.random()*TWO_PI; const s = (this.config.minSpeed + Math.random()*(this.config.maxSpeed - this.config.minSpeed)) * (1 + (this.acceleration || 0)); this.vx = Math.cos(ang)*s; this.vy = Math.sin(ang)*s; }
      } else {
        if(Math.random() < 0.01) {
          const ang = Math.random()*TWO_PI;
          const minS = (this.config && this.config.minSpeed) ? this.config.minSpeed : 30;
          const maxS = (this.config && this.config.maxSpeed) ? this.config.maxSpeed : 120;
          const s = (minS + Math.random() * (maxS - minS)) * (1 + (this.acceleration || 0));
          this.vx = Math.cos(ang)*s;
          this.vy = Math.sin(ang)*s;
        }
      }
        // emit small afterimage/particle when minion moves fast
        if(this.type === 'minion' && game && game.particles){
          this._trailEmitTimer = (this._trailEmitTimer || 0) - dt;
          const spd = Math.hypot(this.vx || 0, this.vy || 0);
          const threshold = (this.config?.minSpeed) ? (this.config.minSpeed * 0.9) : 40;
          if(spd > threshold && this._trailEmitTimer <= 0){ game.particles.add(this.x, this.y, 1); this._trailEmitTimer = 0.06; }
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
    const projCfg = this.config.projectile || {};
    if(this.weaponObj && typeof this.weaponObj.fire === 'function'){
      this.weaponObj.fire(this, game, projCfg);
    } else {
      // fallback: no registered weapon object — nothing fired
    }
    // small SFX for enemy firing (best-effort, handled by Game.sound)
    try{ if(game && game.sound) game.sound.play && game.sound.play('enemy_fire'); }catch(e){}
    // add more weapons as needed
  }
}
