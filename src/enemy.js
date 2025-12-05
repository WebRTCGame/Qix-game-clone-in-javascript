import Spark from './spark.js';
import { pointToSegmentDistance } from './collision.js';
const TWO_PI = Math.PI*2;

export default class Enemy{
  constructor(x,y){
    this.x = x; this.y = y;
    // reduce base speed by 25% and base size by 80%
    const baseSpeed = 70 * 0.75; // original 70
    this.vx = (Math.random()*2-1) * baseSpeed;
    this.vy = (Math.random()*2-1) * baseSpeed;
    this.radius = (8 + Math.random()*6) * 0.2; // reduced by 80%
    this._lastSpark = 0;
  }

  update(dt, game){
    this.x += this.vx * dt; this.y += this.vy * dt;
    // bounce off filled area: treat filled cells as walls
    const cell = game.cellFor(this.x, this.y);
    if(game.grid[cell.r][cell.c] === 1){
      // bounce slightly - reverse
      if(this.vx !== 0) this.vx *= -1;
      if(this.vy !== 0) this.vy *= -1;
      // nudge out
      if(this.vx > 0) this.x += 2; else this.x -= 2;
      if(this.vy > 0) this.y += 2; else this.y -= 2;
    }

    // keep inside canvas
    this.x = Math.max(1, Math.min(799, this.x));
    this.y = Math.max(1, Math.min(799, this.y));

    // simple wandering
    if(Math.random() < 0.01) {
      const ang = Math.random()*TWO_PI;
      const s = (40 + Math.random()*80) * 0.75;
      this.vx = Math.cos(ang)*s;
      this.vy = Math.sin(ang)*s;
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
    if(best <= this.radius + 2) return closest;
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
