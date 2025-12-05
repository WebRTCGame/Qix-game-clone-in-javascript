import Spark from './spark.js';
import { pointToSegmentDistance } from './collision.js';
export default class Sparx{
  constructor(x,y,dir){
    this.x = x; this.y = y; this.dir = dir || {x:1,y:0};
    // saparx initial speed reduced by 25% and radius reduced by 80%
    this.speed = 120 * 0.75; this.baseSpeed = this.speed; this.radius = 6 * 0.2; this.color = '#ffcc00';
    this.super = false; this.superTime = 0; this.superDuration = 3.0; this._lastSpark = 0;
    this._path = []; // list of cell coords to walk
  }
  update(dt, game){
    if(this.super){
      // chase the player's trail (if any) or head towards player center
      const trail = game.trail && game.trail.length > 1 ? game.trail : null;
      let targetPoint = null;
      if(trail){
        // find closest point on the trail segments
        let bestD = Infinity; let bestPt = null;
        for(let i=0;i<trail.length-1;i++){
          const a = trail[i]; const b = trail[i+1];
          const d = pointToSegmentDistance(this.x, this.y, a.x, a.y, b.x, b.y);
          if(d < bestD){
            bestD = d;
            const dx = b.x - a.x; const dy = b.y - a.y;
            const len2 = dx*dx + dy*dy || 1;
            const t = Math.max(0, Math.min(1, ((this.x - a.x)*dx + (this.y - a.y)*dy) / len2));
            bestPt = { x: a.x + dx * t, y: a.y + dy * t };
          }
        }
        targetPoint = bestPt;
      }
      const target = targetPoint || (game.player ? {x: game.player.x, y: game.player.y} : {x: this.x, y: this.y});
      const dx = target.x - this.x; const dy = target.y - this.y; const m = Math.hypot(dx,dy)||1;
      this.x += dx/m * this.speed * 1.2 * dt; this.y += dy/m * this.speed * 1.2 * dt;
      this.superTime -= dt; if(this.superTime <= 0){ this.super = false; this.color = '#ffcc00'; this.speed = this.baseSpeed; } return;
    }
    // Move along current dir; if next cell isn't filled, try to turn right/left/backwards
    let nx = this.x + this.dir.x * this.speed * dt;
    let ny = this.y + this.dir.y * this.speed * dt;
    const cell = game.cellFor(nx, ny);
    if(game.grid[cell.r][cell.c] === 1){
      this.x = nx; this.y = ny; return;
    }
    // can't go forward; try turn right, left, back, or random
    const choices = [ {x:this.dir.y, y:-this.dir.x}, {x:-this.dir.y, y:this.dir.x}, {x:-this.dir.x, y:-this.dir.y} ];
    for(const ch of choices){
      const tx = this.x + ch.x * this.speed * dt; const ty = this.y + ch.y * this.speed * dt;
      const ccell = game.cellFor(tx,ty);
      if(game.grid[ccell.r][ccell.c] === 1){ this.dir = ch; this.x = tx; this.y = ty; return; }
    }
    // if all else fails, reverse dir
    this.dir = {x:-this.dir.x, y:-this.dir.y};
    this.x += this.dir.x * this.speed * dt; this.y += this.dir.y * this.speed * dt;
  }
  collideTrail(trail){
    // reuse same algorithm: distance to segments
    let closest = null; let best = Infinity;
    for(let i=0;i<trail.length-1;i++){
      const a = trail[i]; const b = trail[i+1];
      const d = pointToSegmentDistance(this.x, this.y, a.x, a.y, b.x, b.y);
      if(d < best){ best = d; const t = Math.max(0, Math.min(1, ((this.x - a.x)*(b.x-a.x) + (this.y - a.y)*(b.y-a.y))/((b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y) || 1))); const px = a.x + (b.x-a.x)*t; const py = a.y + (b.y-a.y)*t; closest = {x:px,y:py}; }
    }
    if(best <= this.radius + 2) return closest; return null;
  }
  emitSpark(point, player){
    const now = performance.now();
    if(now - this._lastSpark < 450) return null;
    this._lastSpark = now;
    return new Spark(point.x, point.y, {x:player.x, y:player.y});
  }
  distTo(player){ return Math.hypot(this.x-player.x, this.y-player.y); }
}
