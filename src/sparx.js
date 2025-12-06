// Sparx class removed — kept as a tiny no-op placeholder for compatibility.
export default class Sparx {
  constructor(){
    // No-op
  }
  update(dt, game){
    // intentionally left blank; Sparx enemy removed from gameplay
    return;
  }
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
    // integrate
    let nx = this.x + this.dir.x * this.speed * dt;
    let ny = this.y + this.dir.y * this.speed * dt;
    // precise collision vs filled cells
    const minC = Math.max(0, Math.floor((nx - this.radius) / CELL));
    const maxC = Math.min(COLS-1, Math.floor((nx + this.radius) / CELL));
    const minR = Math.max(0, Math.floor((ny - this.radius) / CELL));
    const maxR = Math.min(ROWS-1, Math.floor((ny + this.radius) / CELL));
    for(let r = minR; r <= maxR; r++){
      for(let c = minC; c <= maxC; c++){
        const cc = game.board.getCell(r, c);
        if(cc && cc.isFilled()){
          const rx = c * CELL; const ry = r * CELL; const rw = CELL; const rh = CELL;
          const pen = circleRectPenetration(nx, ny, this.radius, rx, ry, rw, rh);
          if(pen){
            // push out and reflect direction
            nx += pen.nx * pen.penetration;
            ny += pen.ny * pen.penetration;
            const ref = reflectVector(this.dir.x * this.speed, this.dir.y * this.speed, pen.nx, pen.ny);
            // convert back to normalized dir
            const m = Math.hypot(ref.x, ref.y) || 1;
            this.dir.x = ref.x / m; this.dir.y = ref.y / m;
            this.speed = m; // preserve new speed magnitude
          }
        }
      }
    }
    this.x = nx; this.y = ny;
    // keep inside canvas
    // clamp using known canvas size (assume same constants as game world)
    this.x = Math.max(this.radius + 1, Math.min(WIDTH - this.radius - 1, this.x));
    this.y = Math.max(this.radius + 1, Math.min(HEIGHT - this.radius - 1, this.y));

    // can't go forward; try turn right, left, back, or random
    const choices = [ {x:this.dir.y, y:-this.dir.x}, {x:-this.dir.y, y:this.dir.x}, {x:-this.dir.x, y:-this.dir.y} ];
    for(const ch of choices){
      const tx = this.x + ch.x * this.speed * dt; const ty = this.y + ch.y * this.speed * dt;
      const ccell = game.cellFor(tx,ty);
      const check = game.board.getCell(ccell.r, ccell.c);
      if(check && check.isFilled()){ this.dir = ch; this.x = tx; this.y = ty; return; }
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
    if(best <= this.radius + 2){
      const dx = this.x - closest.x; const dy = this.y - closest.y; const m = Math.hypot(dx,dy) || 1;
      return { x: closest.x, y: closest.y, nx: dx/m, ny: dy/m, dist: best };
    }
    return null;
  }
  emitSpark(){ return null; }
  distTo(){ return Infinity; }
}
