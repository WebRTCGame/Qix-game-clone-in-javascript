import Player from './player.js';
import Enemy from './enemy.js';
import Draw from './draw.js';
import Input from './input.js';
import Sound from './sound.js';
import Particles from './particles.js';
import Board from './board.js';
import { linesIntersect, pointToSegmentDistance } from './collision.js';
import { setPercent, setScore, setLives, setRound, setTime, setMultiplier, setStatus, setHighScore, setSuperText, setEnemies, setPowerup, setAmmo, setBossHP, setLevelName, setCaves } from './hud.js';
import Powerup from './powerup.js';
import LEVELS from './levels.js';
import { WIDTH, HEIGHT, CELL, COLS, ROWS, FPS, CAPTURE_PERCENT, LEVEL_COMPLETE_PERCENT, BOUNCE_DAMP, DESTROY_REGION_THRESHOLD, ENEMY_DESTROY_SCORE } from './constants.js';

export default class Game {

  constructor(canvas, ctx){
    this.canvas = canvas; this.ctx = ctx;
    this.input = new Input(); this.sound = new Sound(); this.particles = new Particles();
    this.board = new Board(ROWS, COLS, CELL);
    this.grid = this.board.grid;
    this.enemies = []; this.trail = []; this.powerups = []; this.projectiles = [];
    this._floatingTexts = []; this.regionOverlays = [];
    this.caveOverlays = [];
    this.level = 0; this.multiplier = 1; this.score = 0; this.lives = 3;
    this.levelTime = 0; // seconds elapsed for current level
    this.rafId = null; this.last = performance.now(); this.accumulator = 0; this.running = false; this.paused = false;
    this.captureSlow = false; this.fuse = { active: false, progress: 0, speed: 0.6, delay: 0.6, idleTimer: 0 };
    this._pHeld = false;
    this._enemySizeTimer = 0; // throttle periodic sizing updates
    this._enemySizeInterval = 0.25; // seconds
  } // constructor

  init(){
    if(this.canvas){ this.canvas.width = WIDTH; this.canvas.height = HEIGHT; }
    // start fresh
    this.restart();
    return this;
  } // init

  _frame(ts){
    const dt = (ts - this.last) / 1000;
    this.last = ts;
    this.accumulator += dt;
    const step = 1.0 / FPS;
    while(this.accumulator >= step){ this.update(step); this.accumulator -= step; }
    this.draw();
    this.rafId = requestAnimationFrame(this._frame.bind(this));
  } // _frame

  resetGrid(){ this.board.reset(); this.grid = this.board.grid; }

  findNearestFilledCell(x,y){ return this.board.findNearestFilledCell(x,y); }

  finalizeCapture(){
    // simple finalized capture: commit trail as filled then capture any empty regions that don't contain enemies
    for(const p of this.trail){ const cell = this.board.getCell(p.r, p.c); if(cell && cell.isEmpty()) this.board.setCell(p.r, p.c, 1); }

    // compute regions on the real grid now that trail acts as boundary
    const regions = this.board.floodFillRegions();

    // map from cell to region index
    const cellToRegion = {};
    for(let i=0;i<regions.length;i++){
      for(const cell of regions[i].cells){ cellToRegion[cell.r+','+cell.c] = i; }
    }

    // track enemy cells
    const enemyCells = new Set();
    for(const enemy of this.enemies){ const cell = this.cellFor(enemy.x, enemy.y); if(cell) enemyCells.add(cell.r + ',' + cell.c); }

    // For each region, if it contains no enemies, fill it
    let newFilled = 0;
    // track newly filled cells so we can detect obstacles that become enclosed
    const newlyFilled = new Set();
    for(const region of regions){
      let hasEnemy = false;
      for(const cell of region.cells){ if(enemyCells.has(cell.r + ',' + cell.c)){ hasEnemy = true; break; } }
      if(!hasEnemy){
        for(const cell of region.cells){ const cc = this.board.getCell(cell.r, cell.c); if(cc && cc.isEmpty()){ this.board.setCell(cell.r, cell.c, 1); newFilled++; newlyFilled.add(cell.r + ',' + cell.c); } }
      }
    }

    // clear trail and reset capture state
    this.trail = [];
    this.player.capturing = false;
    this.updatePercent();

    // award score, double if slow capture
    const multiplier = this.captureSlow ? 2 : 1;
    this.score += newFilled * 10 * multiplier * this.multiplier;
    if(this.score > (this.highScore || 0)){ this.highScore = this.score; localStorage.setItem('qix_highscore', String(this.highScore)); setHighScore(this.highScore, true); }
    this.captureSlow = false;
    setScore(this.score); setMultiplier(this.multiplier);

    // If our fills enclosed any obstacle blocks, destroy those obstacles
    try{
      let destroyedObstacles = 0;
      const visitedObs = new Array(this.board.rows).fill(0).map(()=>new Array(this.board.cols).fill(false));
      for(let r=0;r<this.board.rows;r++){
        for(let c=0;c<this.board.cols;c++){
          if(visitedObs[r][c]) continue;
          const oc = this.board.getCell(r,c);
          if(!oc || !oc.isObstacle()) continue;
          // collect connected obstacle block
          const stack = [[r,c]]; const block = [];
          visitedObs[r][c] = true;
          while(stack.length){ const [rr,cc] = stack.pop(); block.push({r:rr,c:cc}); const neigh = [[rr-1,cc],[rr+1,cc],[rr,cc-1],[rr,cc+1]]; for(const [nr,nc] of neigh){ if(nr>=0 && nr<this.board.rows && nc>=0 && nc<this.board.cols && !visitedObs[nr][nc]){ const ncCell = this.board.getCell(nr,nc); if(ncCell && ncCell.isObstacle()){ visitedObs[nr][nc] = true; stack.push([nr,nc]); } } } }
          // determine enclosure: if any neighbor of block touches an empty cell or board boundary -> not enclosed
          let enclosed = true;
          for(const cell of block){ const neigh = [[cell.r-1,cell.c],[cell.r+1,cell.c],[cell.r,cell.c-1],[cell.r,cell.c+1]]; for(const [nr,nc] of neigh){ if(nr < 0 || nc < 0 || nr >= this.board.rows || nc >= this.board.cols){ enclosed = false; break; } const ncell = this.board.getCell(nr,nc); if(ncell && ncell.isEmpty()){ enclosed = false; break; } } if(!enclosed) break; }
          if(enclosed){
            // destroy block: convert obstacle cells to filled (captured)
            for(const cell of block){ this.board.setCell(cell.r, cell.c, 1); newlyFilled.add(cell.r + ',' + cell.c); }
            destroyedObstacles += block.length;
          }
        }
      }
      if(destroyedObstacles > 0){ this.sound.play && this.sound.play('hit'); if(this.particles) this.particles.add(this.player.x, this.player.y, Math.min(80, destroyedObstacles * 5)); }
    }catch(e){ /* best-effort: if obstacle clean-up fails don't break capture */ }

    // NOTE: enemy sizing will be computed after cave overlays are recomputed below

    // Check if enemies are split across different regions (end level)
    const enemyRegionSet = new Set();
    for(const enemy of this.enemies){ const cell = this.cellFor(enemy.x, enemy.y); const rid = cellToRegion[cell.r + ',' + cell.c]; if(typeof rid === 'number') enemyRegionSet.add(rid); }
    if(enemyRegionSet.size > 1){ setStatus('Qix Split! Level Cleared'); this.nextLevel(); return; }

    // Also consider level complete when no enemies remain
    if(this.enemies.length === 0){ setStatus('All enemies eliminated! Level Cleared'); this.nextLevel(); return; }

    if(newFilled > 0){ this.sound.play('capture'); if(this.particles) this.particles.add(this.player.x, this.player.y, 20); }

    // multiplier persists if split
    this.updateMultiplier(newFilled, regions, cellToRegion);

    // recompute visual overlays (corners, special lines) and use those special
    // overlay cells as walls when recomputing cave regions so caves align with
    // green-line overlays (and magenta filled cells already in grid)
    try{ this.cornerOverlays = this.board.findCapturedCorners(); console.log('detectCorners -> count=', this.cornerOverlays.length); }catch(e){ this.cornerOverlays = []; }
    try{
      // compute raw special overlays (may include cells on obstacles)
      const rawSpecial = this.board.findType2Lines() || [];
      // remove any overlay cells that overlap enemies (we'll still allow overlays to span obstacles)
      const enemyCells = new Set();
      for(const e of this.enemies){ const ec = this.cellFor(e.x, e.y); if(ec) enemyCells.add(ec.r + ',' + ec.c); }
      // overlays used for drawing should skip obstacles and enemy-occupied cells
        this.specialOverlays = rawSpecial.filter(o => {
        if(!o) return false; if(typeof o.r !== 'number' || typeof o.c !== 'number') return false;
        const oc = this.board.getCell(o.r,o.c); if(!oc || !oc.isEmpty()) return false; // skip obstacles/filled when drawing
        if(enemyCells.has(o.r + ',' + o.c)) return false; // skip enemies
        return true;
      });
      console.log('detectSpecialLines -> count=', this.specialOverlays.length);
      // Now compute cave regions using only the secondary (lime) overlay cells as walls
      try{
        // For cave detection we want the green-line partitions to be continuous
        // even if they pass over obstacles, so pass the secondary cells from the
        // raw special overlays (before draw-filtering) into detectCaves.
        // Start with secondary (lime) cells only, but bridge small gaps by
        // including any adjacent primary cells (one-cell dilation) so partition
        // walls are continuous even when classification splits a line.
        let secondaryOverlays = rawSpecial.filter(o => o && o.type === 'secondary');
        if(secondaryOverlays.length){
          const rawMap = new Map(rawSpecial.map(o => [`${o.r},${o.c}`, o]));
          const secSet = new Set(secondaryOverlays.map(o => `${o.r},${o.c}`));
          // collect neighboring primary cells
          const toAdd = new Set();
          for(const s of secondaryOverlays){ const n4 = [[s.r-1,s.c],[s.r+1,s.c],[s.r,s.c-1],[s.r,s.c+1]]; for(const [nr,nc] of n4){ const k = `${nr},${nc}`; if(rawMap.has(k) && !secSet.has(k) && rawMap.get(k).type === 'primary'){ toAdd.add(k); } } }
          if(toAdd.size){ for(const k of toAdd){ const [rr,cc] = k.split(',').map(Number); secondaryOverlays.push({r: rr, c: cc, type: 'secondary'}); } }
        }
        this.caveOverlays = this.board.detectCaves({ minSize: 2, maxErode: 20, overlayCells: secondaryOverlays });
        console.log('detectCaves -> used overlayCells=', secondaryOverlays.length, 'caves=', this.caveOverlays.length);
        // update HUD with caves
        try{ setCaves(this.caveOverlays || []); }catch(e){ /* ignore if HUD not present */ }
        // Now size enemies according to their current area/cave using cell metadata
        try{ this.updateEnemySizes(); }catch(e){ /* ignore */ }
      }catch(e){ this.caveOverlays = []; try{ setCaves([]); }catch(_){} }
    }catch(e){ this.specialOverlays = []; }
  }// finalizeCapture
  
  
  
  update(dt){
    // update level timer and display
    this.levelTime += dt;
    try{ setTime(this.levelTime); }catch(e){}
    this.handleInput(dt);
    this.player.update(dt, this);
    // update enemies - compute current regions so local perceived area can be used
    const regions = this.board.floodFillRegions();
    const totalEmpty = regions.reduce((s,r)=>s + r.cells.length, 0);
    for(const enemy of this.enemies){
      enemy.update(dt, this);
      // check enemy vs trail collision
      if(this.trail.length){
        const col = enemy.collideTrail(this.trail);
        if(col){
          // create a spark
          this.sound.play('spark');
          const spark = enemy.emitSpark({x:col.x,y:col.y}, this.player);
          if(spark) this.player.spawnSpark(spark);
          // reflect enemy velocity off the trail normal for a more realistic bounce
          if(col.nx && col.ny){
            const dot = enemy.vx * col.nx + enemy.vy * col.ny;
            enemy.vx = (enemy.vx - 2 * dot * col.nx) * BOUNCE_DAMP;
            enemy.vy = (enemy.vy - 2 * dot * col.ny) * BOUNCE_DAMP;
            // nudge a tiny amount away so we don't re-collide repeatedly
            enemy.x += col.nx * 0.5; enemy.y += col.ny * 0.5;
          }
        }
      }

      // check direct collision with player
      {
        const d = enemy.distTo(this.player);
        if(d < enemy.radius + this.player.radius){
          if(this.player.capturing){
            // Only kill when capturing according to rules
            this.player.kill();
            this.sound.play('die');
            this.handleDeath();
          } else {
            // bounce off player — push enemy out and reflect velocity
            const nx = (enemy.x - this.player.x) / (d || 1);
            const ny = (enemy.y - this.player.y) / (d || 1);
            const penetration = enemy.radius + this.player.radius - d;
            enemy.x += nx * penetration;
            enemy.y += ny * penetration;
            const dot = enemy.vx * nx + enemy.vy * ny;
            enemy.vx = (enemy.vx - 2 * dot * nx) * BOUNCE_DAMP;
            enemy.vy = (enemy.vy - 2 * dot * ny) * BOUNCE_DAMP;
          }
        }
      }
    }

    // Periodically recompute enemy sizes based on the area/cave they occupy
    this._enemySizeTimer += dt;
    if(this._enemySizeTimer >= this._enemySizeInterval){
      this._enemySizeTimer = 0;
      try{ this.updateEnemySizes(); }catch(e){ /* ignore sizing errors */ }
    }

    // update sparks
    this.player.updateSparks(dt, this);
    // update particles
    if(this.particles) this.particles.update(dt);

    // update projectiles
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p = this.projectiles[i]; p.update(dt);
      // remove if hit filled cell or out of bounds
      const pc = this.cellFor(p.x,p.y);
      if(p.isOutOfBounds() || (pc && !(this.board.getCell(pc.r,pc.c) && this.board.getCell(pc.r,pc.c).isEmpty()))){
        this.projectiles.splice(i,1); continue;
      }
      // check collision based on owner
      if(p.owner === 'player'){
        // player projectiles hit enemies
        for(let j=this.enemies.length-1;j>=0;j--){
          const e = this.enemies[j];
          const d = Math.hypot(p.x - e.x, p.y - e.y);
          if(d < e.radius + p.radius){
            // hit
            e.hp = (e.hp || 1) - 1;
            this.projectiles.splice(i,1);
            if(e.hp <= 0){
              // remove enemy
              const wasMain = e.type === 'main';
              this.enemies.splice(j,1);
              this.sound.play('pop');
              this.particles.add(e.x,e.y,20);
              // award score
              this.score += (wasMain ? 5000 : 200) * this.multiplier;
              setScore(this.score);
              setEnemies(this.enemies.length, this.levelEnemyTotal);
              if(wasMain){
                // award optional level-specific completion bonus when main is destroyed
                const bonus = Number(this.currentLevel?.completionBonus?.value || 0);
                if(bonus > 0){
                  this.score += bonus * this.multiplier; // scale bonus by multiplier
                  setScore(this.score);
                  this._floatingTexts.push({ text: `+${bonus}`, x: e.x, y: e.y, size: 22, color: '#ffd700', life: 2.0 });
                }
                setStatus('Main enemy destroyed! Level Cleared');
                setBossHP(null);
                setTimeout(()=>{ this.nextLevel(); }, 700);
                return; // bail from update because level will reset
              }
              break;
            } else {
              // enemy damaged
              this.sound.play('hit');
              if(e.type === 'main') setBossHP(e.hp, (this.currentLevel?.main?.hp || e.hp));
              break;
            }
          }
        }
      } else if(p.owner === 'enemy'){
        // enemy projectiles hit player
        if(this.player && !this.player.capturing){
          const d = Math.hypot(p.x - this.player.x, p.y - this.player.y);
          if(d < this.player.radius + p.radius){
            // hit player
            if(this.player.shieldTimer <= 0){
              this.player.kill();
              this.sound.play('die');
              this.handleDeath();
            }
            this.projectiles.splice(i,1);
            continue;
          }
        }
      }}

    // floating texts update
    for(let i=this._floatingTexts.length-1;i>=0;i--){
      const t = this._floatingTexts[i];
      t.y -= dt * 30; // float up
      t.life -= dt;
      if(t.life <= 0) this._floatingTexts.splice(i,1);
    }

    // fuse progression
    if(this.fuse.active){
      this.fuse.progress += this.fuse.speed * dt;
      const segCount = Math.max(1, this.trail.length-1);
      const total = segCount; // approximate count
      if(this.fuse.progress >= total){
        // fuse reached player
        this.player.kill(); this.sound.play('die'); this.handleDeath();
      }
    }

    // no super/transform timer — Sparx behavior removed
    setSuperText('');

    // update HUD powerup/ammo display
    const powerLabel = this.player.weaponAmmo>0 ? 'weapon' : (this.player.speedTimer>0 ? 'speed' : (this.player.shieldTimer>0 ? 'shield' : ''));
    setPowerup(powerLabel, this.player.weaponAmmo>0 ? null : (this.player.speedTimer>0 ? this.player.speedTimer : (this.player.shieldTimer>0 ? this.player.shieldTimer : null)));
    setAmmo(this.player.weaponAmmo);
  } // update(dt)

  handleInput(dt){
    // toggle pause key
    if(this.input.isKeyPressed('p')){
      if(!this._pHeld){ this._pHeld = true; this.paused = !this.paused; if(this.paused){ if(this.rafId) cancelAnimationFrame(this.rafId); setStatus('Paused'); } else { this.last = performance.now(); this.accumulator = 0; this.rafId = requestAnimationFrame(this._frame.bind(this)); setStatus('Ready'); } }
    } else { this._pHeld = false; }
    if(this.paused) return;
    // capture debug removed
    const dir = this.input.getDirection();
    if(dir.x !== 0 || dir.y !== 0) {
      this.fuse.idleTimer = 0;
      if(this.fuse.active) { this.fuse.active = false; this.fuse.progress = 0; }
      // move player
      this.player.move(dir, dt, this);
      const playerCell = this.cellFor(this.player.x, this.player.y);
      const pcell = this.board.getCell(playerCell.r, playerCell.c);
      if(pcell && pcell.isEmpty()){
        // drawing inside area
        if(!this.player.capturing){
          this.player.startCapture(playerCell);
          this.trail = [ {x:this.player.x, y:this.player.y, r:playerCell.r, c:playerCell.c} ];
          this.captureSlow = this.input.isKeyPressed('Shift');
        } else {
          // add to trail if moved into a new cell
          const last = this.trail[this.trail.length-1];
          if(playerCell.r !== last.r || playerCell.c !== last.c){
            // If stepping onto our existing trail, it's death
            const match = this.trail.find(t => t.r === playerCell.r && t.c === playerCell.c);
            if(match){ this.player.kill(); this.sound.play('die'); this.handleDeath({ nearest: true }); return; }
            // crossing segments check
            if(this.trail.length >= 2){
              const newSegA = {x:last.x, y:last.y};
              const newSegB = {x:this.player.x, y:this.player.y};
              for(let i=0;i<this.trail.length-2;i++){
                const sA = this.trail[i];
                const sB = this.trail[i+1];
                // avoid exact float equality when skipping endpoints — use cell indexes
                if(sA.r === last.r && sA.c === last.c) continue;
                if(sB.r === playerCell.r && sB.c === playerCell.c) continue;
                if(sA.r === playerCell.r && sA.c === playerCell.c) continue;
                if(linesIntersect(newSegA, newSegB, {x:sA.x,y:sA.y}, {x:sB.x,y:sB.y})){
                  this.player.kill(); this.sound.play('die'); this.handleDeath({ nearest: true }); return;
                }
              }
            }
            const slowHere = this.input.isKeyPressed('Shift');
            if(!slowHere) this.captureSlow = false;
            this.trail.push({x:this.player.x, y:this.player.y, r:playerCell.r, c:playerCell.c});
          }
        }
      }
      else {
        // moved into a filled cell
        if(this.player.capturing){
          // completed capture
          this.player.endCapture();
          this.finalizeCapture();
        }
      }
    } else {
      // no movement
      if(this.player.capturing){
        this.fuse.idleTimer += dt;
        if(this.fuse.idleTimer >= this.fuse.delay && !this.fuse.active){
          this.fuse.active = true; this.fuse.progress = 0; this.sound.play('spark');
        }
      }
    }

    // keyboard to restart if dead
    if(this.input.isKeyPressed('r')){
      this.restart();
    }
    // shooting - space or z
    const shootPressed = this.input.isKeyPressed(' ') || this.input.isKeyPressed('z') || this.input.isKeyPressed('Z');
    if(shootPressed){
      // allow shooting only when player is not capturing
      if(this.player && !this.player.capturing){
        const dir = this.input.getDirection();
        let dx = dir.x, dy = dir.y;
        if(dx === 0 && dy === 0) { dy = -1; } // default up
        this.player.shoot(dx, dy, this);
      }
    }
  } // handleInput(dt)

  

  updateMultiplier(newFilled, regions, cellToRegion){
    const totalEmpty = regions ? regions.reduce((s,r)=>s + r.cells.length, 0) : 0;
    // if enemies are split across regions, increase multiplier
    const enemyRegionSet = new Set();
    for(const enemy of this.enemies){
      const cell = this.cellFor(enemy.x, enemy.y);
      const rid = cellToRegion[cell.r+','+cell.c];
      if(typeof rid === 'number') enemyRegionSet.add(rid);
    }
    if(enemyRegionSet.size > 1){
      this.multiplier++;
      setStatus(`Split! x${this.multiplier}`);
      this.sound.play('split');
      // spawn an extra inner enemy to increase difficulty
      let ex=0, ey=0, tries=0;
      while(tries++ < 50){
        const r = 1 + Math.floor(Math.random() * (ROWS-2));
        const c = 1 + Math.floor(Math.random() * (COLS-2));
        const cc = this.board.getCell(r,c);
        if(cc && cc.isEmpty()){ const w = this.worldForCell(r,c); ex=w.x; ey=w.y; break; }
      }
      if(ex===0 && ey===0){ ex = 200 + Math.random()*400; ey = 200 + Math.random()*400; }
      const e = new Enemy(ex, ey, 'minion', this.currentLevel?.enemyConfig?.minion || {});
      e.vx *= 1 + this.level*0.03; e.vy *= 1 + this.level*0.03;
      // size enemy relative to its region if known
      const cell = this.cellFor(e.x, e.y);
      const rid = cellToRegion[cell.r + ',' + cell.c];
      if(typeof rid === 'number'){
        const reg = regions[rid]; const ratio = totalEmpty > 0 ? (reg.cells.length / totalEmpty) : (reg.cells.length / (COLS * ROWS));
        const target = Math.max(3, Math.floor(3 + ratio * 30));
        e.targetRadius = target;
      }
      // ensure it isn't spawned right on top of player
      const dx = e.x - this.player.x; const dy = e.y - this.player.y; const d = Math.hypot(dx,dy)||1;
      if(d < e.radius + this.player.radius + 8){ e.x += (dx/d) * (e.radius + this.player.radius + 8); e.y += (dy/d) * (e.radius + this.player.radius + 8); }
      this.enemies.push(e);
      // count this new enemy in the level total and update HUD
      this.levelEnemyTotal++; setEnemies(this.enemies.length, this.levelEnemyTotal);
      setMultiplier(this.multiplier);

      // recompute and store overlays for initial perceived regions
      try{
        const regions = this.board.floodFillRegions();
        this.regionOverlays = this._assignRegionOverlays(regions);
        // compute initial corner / special overlays and caves for level start
        try{ this.cornerOverlays = this.board.findCapturedCorners(); }catch(_) { this.cornerOverlays = []; }
        try{
          const rawSpecial = this.board.findType2Lines() || [];
          // drawing filters: skip cells on obstacles or enemy cells
          const enemyCells = new Set();
          for(const e of this.enemies){ const ec = this.cellFor(e.x, e.y); if(ec) enemyCells.add(ec.r + ',' + ec.c); }
          this.specialOverlays = rawSpecial.filter(o => o && typeof o.r === 'number' && typeof o.c === 'number' && (this.board.getCell(o.r,o.c) && this.board.getCell(o.r,o.c).isEmpty()) && !enemyCells.has(o.r + ',' + o.c));
          // caves should be computed using raw secondary overlay cells so partitions ignore obstacles
          const secondary = rawSpecial.filter(o => o && o.type === 'secondary');
          this.caveOverlays = this.board.detectCaves({ minSize: 2, maxErode: 20, overlayCells: secondary });
          try{ setCaves(this.caveOverlays); }catch(_){}
        }catch(e){ this.specialOverlays = []; this.caveOverlays = []; }
      }catch(e){ /* ignore */ }
    }

    // done
  } // updateMultiplier()

  // Update enemy sizes based on which area/cave they occupy.
  // Prefer per-cell caveId when available; otherwise fall back to flood-fill regions.
  updateEnemySizes(){
    try{
      // prefer cave overlays when available
      if(this.caveOverlays && this.caveOverlays.length){
        for(const enemy of this.enemies){
          const cell = this.cellFor(enemy.x, enemy.y);
          const cellObj = this.board.getCell(cell.r, cell.c);
          const cid = cellObj && cellObj.caveId ? (cellObj.caveId - 1) : undefined;
          if(typeof cid === 'number' && this.caveOverlays[cid]){
            const cav = this.caveOverlays[cid];
            const ratio = cav.cells.length / (COLS * ROWS);
            const target = Math.max(3, Math.floor(3 + ratio * 30));
            enemy.targetRadius = target;
            continue;
          }
          // if cell not in a cave, try fallback to region-based sizing
          const regions = this.board.floodFillRegions();
          const totalEmpty = regions.reduce((s,r)=>s + r.cells.length, 0);
          const cellToRegion = {};
          for(let i=0;i<regions.length;i++){ for(const c of regions[i].cells) cellToRegion[c.r + ',' + c.c] = i; }
          const rid = cellToRegion[cell.r + ',' + cell.c];
          if(typeof rid === 'number'){ const reg = regions[rid]; const ratio = totalEmpty > 0 ? (reg.cells.length / totalEmpty) : (reg.cells.length / (COLS * ROWS)); const target = Math.max(3, Math.floor(3 + ratio * 30)); enemy.targetRadius = target; }
        }
        return;
      }

      // No caves: use flood-fill regions
      const regions = this.board.floodFillRegions();
      const totalEmpty = regions.reduce((s,r)=>s + r.cells.length, 0);
      const cellToRegion = {};
      for(let i=0;i<regions.length;i++){ for(const c of regions[i].cells) cellToRegion[c.r + ',' + c.c] = i; }
      for(const enemy of this.enemies){ const cell = this.cellFor(enemy.x, enemy.y); const rid = cellToRegion[cell.r + ',' + cell.c]; if(typeof rid === 'number'){ const reg = regions[rid]; const ratio = totalEmpty > 0 ? (reg.cells.length / totalEmpty) : (reg.cells.length / (COLS * ROWS)); const target = Math.max(3, Math.floor(3 + ratio * 30)); enemy.targetRadius = target; } }
    } catch(e){ /* best-effort sizing; ignore failures */ }
  } // updateEnemySizes()

  updatePercent(){
    // Compute percent captured relative to the fillable interior
    // (exclude the border cells which are pre-filled by design)
    const interiorRows = Math.max(0, ROWS - 2);
    const interiorCols = Math.max(0, COLS - 2);
    // treat grid value 2 as obstacle (non-capturable); only interior cells
    let total = 0; let filled = 0;
    for(let r=1; r<ROWS-1; r++){
      for(let c=1; c<COLS-1; c++){
        const cc = this.board.getCell(r,c);
        if(!cc || cc.isObstacle()) continue; // obstacle, don't count
        total++;
        if(cc && cc.isFilled()) filled++;
      }
    }
    // fall back to whole-grid percent if interior is somehow empty/invalid
    const baseTotal = total === 0 ? interiorRows * interiorCols : total;
    const pct = (filled / baseTotal) * 100;
    // log internal percent calc values to help debug unexpected level completion
    console.log('updatePercent debug -> interiorRows,interiorCols,obstacles, total, filled, baseTotal:', interiorRows, interiorCols, 'obstaclesIgnored=', total === interiorRows*interiorCols ? 0 : (interiorRows*interiorCols - total), total, filled, baseTotal);
    this.percent = Number(pct.toFixed(2));
    console.log('updatePercent result -> percent=', this.percent, 'LEVEL_COMPLETE_PERCENT=', (typeof LEVEL_COMPLETE_PERCENT !== 'undefined' ? LEVEL_COMPLETE_PERCENT : CAPTURE_PERCENT));
    setPercent(this.percent);
    // level completion if percent captured hits the configured level-complete threshold
    if(this.percent >= (typeof LEVEL_COMPLETE_PERCENT !== 'undefined' ? LEVEL_COMPLETE_PERCENT : CAPTURE_PERCENT)){
      console.log('Percent threshold reached; scheduling nextLevel. percent=', this.percent);
      setStatus('Level Cleared!');
      // start next level
      setTimeout(()=>{ this.nextLevel(); }, 200);
    }
  } // updatePercent()

  handleDeath(opts = {}){
    // opts.nearest -> respawn at nearest filled cell to where player died
    // decrement lives and handle game over
    this.lives = Math.max(0, (this.lives || 0) - 1);
    setLives(this.lives);
    this.trail = [];
    this.player?.reset?.();
    this.fuse.active = false; this.fuse.progress = 0; this.captureSlow = false;

    if(this.lives <= 0){
      this.sound.play('die');
      this.gameOver();
      return;
    }

    // brief feedback
    setStatus('Life lost');

    // respawn at nearest filled cell if requested
    let spawn = { x: WIDTH/2, y: HEIGHT - CELL*1.5 };
    if(opts && opts.nearest && this.player){
      const found = this.findNearestFilledCell(this.player.x, this.player.y);
      if(found) spawn = found;
    } else {
      const found = this.findNearestFilledCell(spawn.x, spawn.y);
      if(found) spawn = found;
    }

    // create new player at spawn
    this.player = new Player(spawn.x, spawn.y, CELL);
    // small pause before resuming
    this.last = performance.now(); this.accumulator = 0;
  } // handleDeath()

  // Build a temporary grid with the trail cells set as filled and return the temp grid,
  // list of discrete trail cells and the wall segments (world coords) representing the trail.
  _buildTempFromTrail(){
    function bresenhamLine(r0,c0,r1,c1, grid, added){
      let dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0);
      let sr = r0 < r1 ? 1 : -1; let sc = c0 < c1 ? 1 : -1;
      let err = (dr>dc ? dr : -dc)/2;
      let r=r0, c=c0;
      while(true){ if(grid[r][c] === 0){ grid[r][c] = 1; if(added) added.push({r,c}); } if(r===r1 && c===c1) break; let e2 = err; if(e2 > -dr){ err -= dc; r += sr; } if(e2 < dc){ err += dr; c += sc; } }
    }

    const tempGrid = this.grid.map(row => row.slice());
    const trailFilled = [];
    for(let i=0;i<this.trail.length;i++){
      const p = this.trail[i];
      if(tempGrid[p.r] && tempGrid[p.r][p.c] === 0){ tempGrid[p.r][p.c] = 1; trailFilled.push({r:p.r,c:p.c}); }
      if(i>0){ const a = this.trail[i-1]; const b = this.trail[i]; if(a.r !== b.r || a.c !== b.c){ bresenhamLine(a.r, a.c, b.r, b.c, tempGrid, trailFilled); } }
    }
    // build walls from trail segments (world coords), closing from last trail cell to player
    const walls = [];
    for(let i=1;i<this.trail.length;i++){ const a = this.trail[i-1]; const b = this.trail[i]; walls.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
    let dilatedCount = 0;
    if(this.trail.length){
      const last = this.trail[this.trail.length-1]; walls.push({ x1: last.x, y1: last.y, x2: this.player.x, y2: this.player.y });
      // rasterize the closing segment into tempGrid to ensure contiguous barrier
      const endCell = this.cellFor(this.player.x, this.player.y);
      if(endCell && (endCell.r !== last.r || endCell.c !== last.c)){
        bresenhamLine(last.r, last.c, endCell.r, endCell.c, tempGrid, trailFilled);
      }
    }
    // one-pass dilation in tempGrid around trail cells to close small gaps between adjacent centers
    const toDilate = trailFilled.slice();
    const dilated = [];
    for(const p of toDilate){
        const neighs = [[p.r-1,p.c],[p.r+1,p.c],[p.r,p.c-1],[p.r,p.c+1],[p.r-1,p.c-1],[p.r-1,p.c+1],[p.r+1,p.c-1],[p.r+1,p.c+1]];
      for(const [nr,nc] of neighs){
        if(nr>=0 && nr<ROWS && nc>=0 && nc<COLS && tempGrid[nr][nc] === 0){ tempGrid[nr][nc] = 1; dilated.push({r:nr,c:nc}); }
      }
    }
    dilatedCount = dilated.length;
    // additionally mark cells that are close to any wall segment so thin diagonal walls don't leak
    const segThreshold = CELL * 0.55; let nearWallCount = 0;
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(tempGrid[r][c] !== 0) continue; // only blank cells
        const cx = c*CELL + CELL/2; const cy = r*CELL + CELL/2;
        for(const w of walls){
          const d = pointToSegmentDistance(cx, cy, w.x1, w.y1, w.x2, w.y2);
          if(d <= segThreshold){ tempGrid[r][c] = 1; nearWallCount++; break; }
        }
      }
    }
    dilatedCount += nearWallCount;
    return { tempGrid, trailFilled, walls, dilatedCount };
  } // _buildTempFromTrail()

  // Compute polygon interior cells from the player's trail (in world coordinates), grouping into connected components.
  // tempGrid is used to check for candidate empty cells (trail and other cells marked are treated accordingly).
  _computePolygonComponents(trail, player, tempGrid, debugInfo){
    const poly = [];
    for(const p of trail) poly.push({x: p.x, y: p.y});
    if(trail.length) poly.push({x: player.x, y: player.y});
    if(poly.length < 3){ console.log('computePolygonComponents: polygon too small', poly.length); return []; }

    function pointInPoly(x,y, poly){
      let inside = false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi>y) !== (yj>y)) && (x < (xj-xi) * (y-yi) / (yj-yi + 0.0) + xi);
        if(intersect) inside = !inside;
      }
      return inside;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for(const p of poly){ minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    const minC = Math.max(1, Math.floor((minX - CELL/2) / CELL));
    const maxC = Math.min(COLS-2, Math.floor((maxX + CELL/2) / CELL));
    const minR = Math.max(1, Math.floor((minY - CELL/2) / CELL));
    const maxR = Math.min(ROWS-2, Math.floor((maxY + CELL/2) / CELL));

    const polyCellsSet = new Set();
    for(let r=minR;r<=maxR;r++){
      for(let c=minC;c<=maxC;c++){
        if(tempGrid[r][c] !== 0) continue; // only candidate empty cells
        const cx = c*CELL + CELL/2; const cy = r*CELL + CELL/2;
        if(pointInPoly(cx, cy, poly)) polyCellsSet.add(r + ',' + c);
      }
    }

    const compVisited = new Set();
    const comps = [];
    for(const key of polyCellsSet){
      if(compVisited.has(key)) continue;
      const [sr, sc] = key.split(',').map(Number);
      const stack = [[sr,sc]]; compVisited.add(key); const compCells = [];
      while(stack.length){ const [cr,cc] = stack.pop(); compCells.push({r:cr,c:cc});
        const neigh = [[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]];
        for(const [nr,nc] of neigh){ const k = nr+','+nc; if(polyCellsSet.has(k) && !compVisited.has(k)){ compVisited.add(k); stack.push([nr,nc]); } }
      }
      comps.push({cells: compCells});
    }

    console.log('computePolygonComponents: bbox=', {minR,minC,maxR,maxC}, 'candidates=', polyCellsSet.size, 'comps=', comps.length, 'debugInfo=', debugInfo);
    return comps;
  } // _computePolygonComponents()

  // Build overlay metadata (cells + color) for a set of flood-fill regions
  _assignRegionOverlays(regions){
    if(!regions || !regions.length) return [];
    const overlays = [];
    for(let i=0;i<regions.length;i++){
      const hue = (i * 73) % 360; // spread hues
      const color = `hsla(${hue}, 65%, 50%, 0.14)`;
      // compute center cell for labeling
      const cells = regions[i].cells;
      let cx = 0, cy = 0;
      for(const c of cells){ cx += c.c; cy += c.r; }
      cx = cells.length ? (cx / cells.length) : 0; cy = cells.length ? (cy / cells.length) : 0;
      overlays.push({ cells, color, label: String(cells.length), cx, cy });
    }
    return overlays;
  } // _assignRegionOverlays()

  cellFor(x, y){
    return this.board.cellFor(x,y);
  } // cellFor()

  worldForCell(r,c){
    return this.board.worldForCell(r,c);
  } // worldForCell()

  draw(){
    // draw per-level background images if present; fallback to solid bg color
    const levelIndex = Math.max(1, Math.min(99, this.level));
    if(this.bgUncaptured && this.bgUncaptured.complete){
      try{ this.ctx.drawImage(this.bgUncaptured, 0, 0, WIDTH, HEIGHT); }catch(e){ Draw.clear(this.ctx, WIDTH, HEIGHT, this.currentLevel?.bg); }
    } else {
      Draw.clear(this.ctx, WIDTH, HEIGHT, this.currentLevel?.bg);
    }
    // draw captured-area background masked to filled cells if available
    const skipFilled = (this.bgCaptured && this.bgCaptured.complete);
    if(skipFilled){
      this.ctx.save();
      this.ctx.beginPath();
      for(let r=0;r<this.board.rows;r++){
        for(let c=0;c<this.board.cols;c++){
          const cc = this.board.getCell(r,c);
          if(cc && cc.isFilled()) this.ctx.rect(c*CELL, r*CELL, CELL, CELL);
        }
      }
      this.ctx.clip();
      try{ this.ctx.drawImage(this.bgCaptured, 0, 0, WIDTH, HEIGHT); }catch(e){}
      this.ctx.restore();
    }

    // use current level's fill color for captured regions
    const defaultFill = (this.currentLevel && this.currentLevel.fill) ? this.currentLevel.fill : '#1e90ff';
    Draw.grid(this.ctx, this.grid, CELL, { fillColor: defaultFill, obstacleColor: '#444', drawFilled: !skipFilled });
    // draw nearly-transparent overlays for perceived regions
    if(this.regionOverlays && this.regionOverlays.length){ Draw.regions(this.ctx, this.regionOverlays, CELL); }
    // cave overlays (uncaptured chambers)
    if(this.caveOverlays && this.caveOverlays.length){ Draw.caveRects(this.ctx, this.caveOverlays, CELL); }
    if(this.specialOverlays && this.specialOverlays.length){ Draw.specialLines(this.ctx, this.specialOverlays, CELL); }
    if(this.cornerOverlays && this.cornerOverlays.length){ Draw.capturedCorners(this.ctx, this.cornerOverlays, CELL); }
    // no temporary capture debug overlay (using simplified capture)
    // debug highlight for cells filled during the last capture (short-lived)
    if(this._debugTrailOverlay && this._debugTrailOverlay.expiry > performance.now()){
      Draw.regions(this.ctx, [{ cells: this._debugTrailOverlay.cells, color: 'rgba(255,48,48,0.35)', debug:true }], CELL);
    } else { this._debugTrailOverlay = null; }
    if(this._debugLeakOverlay && this._debugLeakOverlay.expiry > performance.now()){
      Draw.regions(this.ctx, [{ cells: this._debugLeakOverlay.cells, color: 'rgba(48,200,255,0.45)', debug:true }], CELL);
    } else { this._debugLeakOverlay = null; }
    Draw.trail(this.ctx, this.trail, this.fuse, this.captureSlow);
    // build quick cell->region map for regionOverlays fallback (ensure we always have a fallback)
    const regionMap = {};
    if(this.regionOverlays && this.regionOverlays.length){
      for(let i=0;i<this.regionOverlays.length;i++){
        const id = i + 1;
        for(const cell of this.regionOverlays[i].cells){ regionMap[cell.r + ',' + cell.c] = id; }
      }
    } else {
      // If region overlays aren't available compute regions now so labels can still show
      try{
        const regions = this.board.floodFillRegions();
        for(let i=0;i<regions.length;i++){
          const id = i + 1;
          for(const cell of regions[i].cells){ regionMap[cell.r + ',' + cell.c] = id; }
        }
      }catch(_){ /* best-effort fallback - ignore errors */ }
    }
    for(const enemy of this.enemies){
      Draw.enemy(this.ctx, enemy, 'shadow');
      // show area id under enemies: prefer per-cell caveId then region index
      // area ids are drawn on sprites, so skip here
    }
    // powerups + projectiles shadows
    for(const pu of this.powerups) Draw.powerup(this.ctx, pu, 'shadow');
    for(const pr of this.projectiles) Draw.projectile(this.ctx, pr, 'shadow');
    Draw.player(this.ctx, this.player, 'shadow');
    // now draw sprites
    for(const enemy of this.enemies){
      Draw.enemy(this.ctx, enemy, 'sprite');
      // show area id under enemies: prefer per-cell caveId then region index
      const cell = this.cellFor(enemy.x, enemy.y);
      if(!cell) continue;
      const cellObj = this.board.getCell(cell.r, cell.c);
      let areaId = (cellObj && cellObj.caveId) || regionMap[cell.r + ',' + cell.c] || null;
      if(areaId){
        this.ctx.save();
        const lbl = String(areaId);
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'top';
        // background pill
        const w = Math.max(18, this.ctx.measureText(lbl).width + 8);
        const x = enemy.x - w/2, y = enemy.y + (enemy.radius || 6) + 4;
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)'; this.ctx.fillRect(x, y, w, 18);
        this.ctx.fillStyle = '#fff'; this.ctx.fillText(lbl, enemy.x, y + 2);
        this.ctx.restore();
      }
    }
    // powerups + projectiles sprites
    for(const pu of this.powerups) Draw.powerup(this.ctx, pu, 'sprite');
    for(const pr of this.projectiles) Draw.projectile(this.ctx, pr, 'sprite');
    Draw.player(this.ctx, this.player, 'sprite');
    // floating texts drawn above player and other locations
    for(const t of this._floatingTexts){
      this.ctx.save();
      this.ctx.font = `bold ${t.size || 22}px "Comic Sans MS", Impact, sans-serif`;
      this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = 'rgba(0,0,0,0.6)'; this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = t.color || '#ffcc00';
      this.ctx.fillText(t.text, t.x, t.y);
      this.ctx.restore();
    }
    // particles
    if(this.particles) this.particles.draw(this.ctx);
    // draw percent in HUD (done elsewhere)
  } // draw()

  gameOver(){
    this.running = false;
    if(this.rafId) cancelAnimationFrame(this.rafId);
    setStatus('Game Over');
  } // gameOver()

  restart(){
    // simple restart
    this.resetGrid();
    this.enemies = [];
    this.trail = [];
    if(this.player) this.player.capturing = false;
    this.level = 0; this.multiplier = 1; this.score = 0; this.lives = 3;
    // ensure the async level setup finishes before starting the main loop
    this.nextLevel().then(()=>{
      this.lives = 3; this.score = 0;
      setScore(this.score); setLives(this.lives);
      if(!this.running){
        this.running = true;
        this.last = performance.now(); this.accumulator = 0; this.rafId = requestAnimationFrame(this._frame.bind(this));
      }
      setStatus('Ready');
    }).catch(e => { console.error('Failed to load next level:', e); setStatus('Error loading level'); });
  } // restart()

  async nextLevel(){
    // increment level and wrap to available levels (keep 1..count)
    this.level += 1;
    try{ const max = LEVELS.count || 1; this.level = ((this.level - 1) % max) + 1; }catch(e){ /* ignore */ }
    // fetch per-level JSON (deterministic level data)
    this.currentLevel = await LEVELS.loadLevel(this.level);
    console.log('Loaded level JSON:', this.level, this.currentLevel?.name || '(unnamed)');
    // load per-level background images; allow JSON to override image paths
    try{
      this.bgUncaptured = new Image(); this.bgUncaptured.src = this.currentLevel?.bgUncaptured || `assets/backgrounds/level${String(this.level).padStart(2,'0')}/uncaptured.png`;
      this.bgCaptured = new Image(); this.bgCaptured.src = this.currentLevel?.bgCaptured || `assets/backgrounds/level${String(this.level).padStart(2,'0')}/captured.png`;
    }catch(e){ this.bgUncaptured = null; this.bgCaptured = null; }
    // reset grid before spawning
    this.resetGrid();
    this.enemies = [];
    // Spawn enemies depending on JSON config (deterministic) or fallback to random
    this.enemies = [];
    const cfg = this.currentLevel || {};
    // set per-level art if provided
    try{ Draw.setLevelImages({ main: cfg?.enemyImages?.main, minion: cfg?.enemyImages?.minion, obstacle: cfg?.obstacleImage, projectile: cfg?.enemyImages?.projectile, powerup: cfg?.enemyImages?.powerup }); }catch(e){}

    if(cfg.main && Array.isArray(cfg.minions) && cfg.minions.length){
      // create main at configured coords if provided
      let ex = cfg.main.x || (200 + Math.random()*400);
      let ey = cfg.main.y || (200 + Math.random()*400);
      const mainEnemy = new Enemy(ex, ey, 'main', cfg?.enemyConfig?.main || {}); mainEnemy.vx *= 1 + this.level*0.08; mainEnemy.vy *= 1 + this.level*0.08;
      mainEnemy.hp = cfg.main.hp || mainEnemy.hp; mainEnemy.color = cfg.main.color || mainEnemy.color;
      this.enemies.push(mainEnemy);
      // add configured minions
      for(const m of cfg.minions){ const mx = m.x || (200 + Math.random()*400); const my = m.y || (200 + Math.random()*400); const me = new Enemy(mx, my, 'minion', cfg?.enemyConfig?.minion || {}); me.vx *= 1 + this.level*0.08; me.vy *= 1 + this.level*0.08; this.enemies.push(me); }
    } else {
      // legacy behavior: randomly place up to 'innerCount' with one main
      const innerCount = Math.min(8, 2 + Math.floor(this.level/1));
      for(let i=0;i<innerCount;i++){
        let tries = 0; let ex = 0, ey = 0;
        while(tries++ < 50){
          const r = 1 + Math.floor(Math.random() * (ROWS-2));
          const c = 1 + Math.floor(Math.random() * (COLS-2));
          const cc = this.board.getCell(r,c);
          if(cc && cc.isEmpty()){ const w = this.worldForCell(r,c); ex = w.x; ey = w.y; break; }
        }
        if(ex === 0 && ey === 0){ ex = 200 + Math.random()*400; ey = 200 + Math.random()*400; }
        const type = i === 0 ? 'main' : 'minion';
        const e = new Enemy(ex, ey, type, (type === 'main' ? (this.currentLevel?.enemyConfig?.main || {}) : (this.currentLevel?.enemyConfig?.minion || {})));
        e.vx *= 1 + this.level*0.08; e.vy *= 1 + this.level*0.08;
        this.enemies.push(e);
      }
    }
    // add minibosses if defined in JSON
    if(Array.isArray(cfg.minibosses) && cfg.minibosses.length){
      for(const b of cfg.minibosses){ const bx = b.x || (200 + Math.random()*400); const by = b.y || (200 + Math.random()*400); const bc = Object.assign({}, cfg.enemyConfig?.main || {}, b.config || {}); bc.isMiniBoss = true; const be = new Enemy(bx, by, 'miniboss', bc); be.vx *= 1 + this.level*0.08; be.vy *= 1 + this.level*0.08; this.enemies.push(be); }
    }

    // schedule delayed spawns if present (array of {x,y,delay,type,config})
    if(Array.isArray(cfg.delayedSpawns) && cfg.delayedSpawns.length){
      for(const d of cfg.delayedSpawns){
        const spawnType = d.type || 'minion';
        const cfgFor = Object.assign({}, spawnType === 'main' ? (cfg.enemyConfig?.main || {}) : (cfg.enemyConfig?.minion || {}), d.config || {});
        // account for this future enemy in the level total
        this.levelEnemyTotal = (this.levelEnemyTotal || this.enemies.length) + 1;
        setTimeout(()=>{
          const sx = d.x || (200 + Math.random()*400); const sy = d.y || (200 + Math.random()*400);
          const ne = new Enemy(sx, sy, spawnType === 'miniboss' ? 'miniboss' : spawnType, cfgFor);
          ne.vx *= 1 + this.level*0.08; ne.vy *= 1 + this.level*0.08;
          this.enemies.push(ne);
          setEnemies(this.enemies.length, this.levelEnemyTotal);
        }, Math.max(0, (d.delay || 1)) * 1000);
      }
    }

    // record the number of enemies at start-of-level
    this.levelEnemyTotal = this.enemies.length;
    setEnemies(this.enemies.length, this.levelEnemyTotal);
    // if we have a main enemy, ensure hp/color from level
    for(const e of this.enemies){ if((e.type === 'main' || e.type === 'miniboss') && this.currentLevel && this.currentLevel.main){ e.hp = (e.isMiniBoss ? (e.hp) : (this.currentLevel.main.hp || e.hp)) || e.hp; e.color = e.config?.color || e.color; } }
    // add obstacles for this level (mark grid cells with 2)
    this.powerups = [];
    this.projectiles = [];
    // If JSON defines explicit obstacle rectangles, use those deterministically
    if(Array.isArray(cfg.obstacles) && cfg.obstacles.length){
      for(const obs of cfg.obstacles){
        const r0 = Math.max(1, obs.r || 1); const c0 = Math.max(1, obs.c || 1);
        const w = Math.max(1, obs.w || 4); const h = Math.max(1, obs.h || 4);
        for(let rr = r0; rr < r0 + h && rr < ROWS-1; rr++){
          for(let cc = c0; cc < c0 + w && cc < COLS-1; cc++){
            // avoid overwriting enemies or player spawn; only set cells that are empty
            const oc = this.board.getCell(rr, cc);
            if(oc && oc.isEmpty()) this.board.setCell(rr, cc, 2);
          }
        }
      }
    } else {
      // fallback: random placement like previously
      const obstacleCount = Math.min(60, Math.floor(this.level * 1.5) + (cfg.obstacles || 0));
      const obstacleSize = 4; // fixed blocks exactly 4x4
      let placed = 0, tries = 0;
      while(placed < obstacleCount && tries++ < 5000){
        const w = obstacleSize; const h = obstacleSize;
        const r = 1 + Math.floor(Math.random() * Math.max(1, (ROWS - 2) - h + 1));
        const c = 1 + Math.floor(Math.random() * Math.max(1, (COLS - 2) - w + 1));
        let ok = true;
        for(let rr = r; rr < r + h && ok; rr++){
          for(let cc = c; cc < c + w; cc++){
            const oc = this.board.getCell(rr, cc);
            if(!oc || !oc.isEmpty()){ ok = false; break; }
            for(const e of this.enemies){ const ec = this.cellFor(e.x,e.y); if(ec && ec.r === rr && ec.c === cc){ ok = false; break; } }
            const pcell = this.cellFor(WIDTH/2, HEIGHT - CELL*1.5);
            if(pcell && pcell.r === rr && pcell.c === cc) { ok = false; break; }
          }
        }
        if(!ok) continue;
        for(let rr = r; rr < r + h; rr++){
          for(let cc = c; cc < c + w; cc++){
            this.board.setCell(rr, cc, 2);
          }
        }
        placed++;
      }
    }
    // spawn a few powerups (grey boxes) in empty cells
    const puCount = (cfg?.powerups ?? 1) + Math.floor(this.level / 5);
    let tries = 0; let placed = 0;
    const types = ['speed','weapon','life','shield'];
    while(placed < puCount && tries++ < 500){
      const r = 1 + Math.floor(Math.random() * (ROWS-2));
      const c = 1 + Math.floor(Math.random() * (COLS-2));
      const pc = this.board.getCell(r,c);
      if(pc && pc.isEmpty()){
        // avoid spawning powerup on an enemy or player
        let blocked = false;
        for(const e of this.enemies){ const ec = this.cellFor(e.x,e.y); if(ec.r === r && ec.c === c){ blocked = true; break; } }
        const pcell = this.cellFor(WIDTH/2, HEIGHT - CELL*1.5);
        if(pcell.r === r && pcell.c === c) blocked = true;
        if(blocked) continue;
        const w = this.worldForCell(r,c); const t = types[Math.floor(Math.random()*types.length)]; this.powerups.push(new Powerup(w.x,w.y,t)); placed++; }
    }
    // Sparx enemies removed — no edge-walking / homing enemy to avoid persistent chase behavior
    // reset player — ensure spawn is on a safe (filled) cell
    let spawnX = WIDTH/2, spawnY = HEIGHT - CELL*1.5;
    const startCell = this.cellFor(spawnX, spawnY);
    const startCellObj = this.board.getCell(startCell.r, startCell.c);
    if(!(startCellObj && startCellObj.isFilled())){
      const found = this.findNearestFilledCell(spawnX, spawnY);
      if(found){ spawnX = found.x; spawnY = found.y; }
    }
    this.player = new Player(spawnX, spawnY, CELL);
    this.trail = [];
    this.updatePercent();
    setStatus(`Level ${this.level}`);
    // HUD show level name
    setLevelName(this.currentLevel?.name || '');
    // show boss HP if present
    const mainEnemy = this.enemies.find(e => e.type === 'main');
    if(mainEnemy){ setBossHP(mainEnemy.hp, mainEnemy.hp); } else { setBossHP(null); }
    setRound(this.level);
    try{ setTime(0); }catch(e){}
    setMultiplier(this.multiplier);

    // set initial sizes for enemies based on area they occupy (using per-cell metadata when possible)
    try{ this.updateEnemySizes(); }catch(e){ /* ignore sizing errors */ }
  } // nextLevel()
} // class Game

