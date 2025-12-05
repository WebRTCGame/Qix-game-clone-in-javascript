import Player from './player.js';
import Enemy from './enemy.js';
import Sparx from './sparx.js';
import Draw from './draw.js';
import Input from './input.js';
import Sound from './sound.js';
import Particles from './particles.js';
import { floodFillRegions, resetGrid, cellFor as gridCellFor, worldForCell as gridWorldForCell } from './grid.js';
import { linesIntersect, pointToSegmentDistance } from './collision.js';
import { setPercent, setScore, setLives, setLevel, setMultiplier, setStatus, setHighScore, setSuperText } from './hud.js';
import { WIDTH, HEIGHT, CELL, COLS, ROWS, FPS, CAPTURE_PERCENT } from './constants.js';

export default class Game {
  constructor(canvas, ctx){
    this.canvas = canvas;
    this.ctx = ctx;
    this.grid = new Array(ROWS).fill(0).map(()=>new Array(COLS).fill(0));
    this.player = null;
    this.enemies = [];
    this.trail = [];
    this.capturing = false; // whether player is currently drawing
    this.tick = 0;
    this.running = false;
    this.percent = 0;
    this.lives = 3;
    this.score = 0;
    this.fuse = { active: false, index: 0, progress: 0, speed: 6, idleTimer: 0, delay: 0.6 };
    this.captureSlow = false;
    this.input = new Input();
    this.sound = new Sound();
    this.paused = false;
    this._pHeld = false;
    this.multiplier = 1;
    this.particles = new Particles();
    this.level = 1;
    this.superInterval = 12; // seconds between super events
    this.superTimer = 0;
    this.highScore = Number(localStorage.getItem('qix_highscore') || 0);
  }

  handleDeath(){
    this.lives -= 1;
      setLives(this.lives);
    this.player.alive = false;
    if(this.lives <= 0){
      this.gameOver();
      return;
    }
    // respawn after a short delay
    setTimeout(()=>{
      this.player = new Player(WIDTH/2, HEIGHT - CELL*1.5, CELL);
      this.trail = [];
      this.fuse = { active: false, index: 0, progress: 0, speed: 6, idleTimer: 0, delay: 0.6 };
    }, 900);
  }

  init(){
    this.level = 0; this.multiplier = 1; this.score = 0; this.lives = 3;
      setScore(this.score); setLives(this.lives); setMultiplier(this.multiplier); setHighScore(this.highScore);
    setHighScore(this.highScore);
    this.nextLevel();
    // initial region assign
    this.updatePercent();
    const regions = floodFillRegions(this.grid);
    // map cells to region
    const cellToRegion = {};
    for(let i=0;i<regions.length;i++){
      for(const cell of regions[i].cells){
        cellToRegion[cell.r+','+cell.c] = i;
      }
    }
    for(let i=0;i<this.enemies.length;i++){
      const enemy = this.enemies[i];
      const cell = this.cellFor(enemy.x, enemy.y);
      const rid = cellToRegion[cell.r+','+cell.c];
      if(typeof rid === 'number'){
        const reg = regions[rid];
        const ratio = reg.cells.length / (COLS * ROWS);
        const newRad = 6 + Math.floor(ratio * 300);
        enemy.radius = Math.max(3, Math.floor(newRad * 0.2));
      }
    }
    this.last = performance.now();
    this.running = true;
    this.accumulator = 0;
    this.step = 1 / FPS;
    this.rafId = requestAnimationFrame(this._frame.bind(this));
  }

  _frame(now){
    const dt = (now - this.last) / 1000; this.last = now;
    this.accumulator += dt;
    const maxSteps = 5; let steps = 0; // avoid spiral of death
    while(this.accumulator >= this.step && steps++ < maxSteps){
      this.update(this.step);
      this.accumulator -= this.step;
    }
    this.draw();
    if(this.running) this.rafId = requestAnimationFrame(this._frame.bind(this));
  }

  resetGrid(){
    resetGrid(this.grid);
  }

  loop(){
    this.update(1/FPS);
    this.draw();
  }

  update(dt){
    this.tick++;
    this.handleInput(dt);
    this.player.update(dt, this);
    // update enemies
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
        }
      }

      // check direct collision with player (only when capturing)
      if(this.player.capturing){
        const d = enemy.distTo(this.player);
        if(d < enemy.radius + this.player.radius){
          // Only kill when capturing according to rules
          this.player.kill();
          this.sound.play('die');
          this.handleDeath();
        }
      }
    }

    // update sparks
    this.player.updateSparks(dt, this);
    // update particles
    if(this.particles) this.particles.update(dt);

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

    // super/transform timer
    this.superTimer += dt;
    if(this.superTimer >= this.superInterval){
      this.superTimer = 0;
      // set all Sparx to super for a short duration
      for(const e of this.enemies){
        if(e && e.constructor && e.constructor.name === 'Sparx'){
          e.super = true; e.superTime = 3.5 + Math.random()*2;
          e.color = '#ff4d4d';
          // when entering super state, increase speed briefly
          e.speed *= 1.2;
          // after super ends, reduce speed back slightly (handled by Sparx)
        }
      }
      this.sound.play('super');
    }

    // update HUD: show super indicator if any Sparx are super
    const superCount = this.enemies.reduce((n,e)=>n + ((e && e.constructor && e.constructor.name === 'Sparx' && e.super)?1:0),0);
    setSuperText(superCount>0 ? `Sparx Super x${superCount}` : '');
  }

  handleInput(dt){
    // toggle pause key
    if(this.input.isKeyPressed('p')){
      if(!this._pHeld){ this._pHeld = true; this.paused = !this.paused; if(this.paused){ if(this.rafId) cancelAnimationFrame(this.rafId); setStatus('Paused'); } else { this.last = performance.now(); this.accumulator = 0; this.rafId = requestAnimationFrame(this._frame.bind(this)); setStatus('Ready'); } }
    } else { this._pHeld = false; }
    if(this.paused) return;
    const dir = this.input.getDirection();
    if(dir.x !== 0 || dir.y !== 0) {
      this.fuse.idleTimer = 0;
      if(this.fuse.active) { this.fuse.active = false; this.fuse.progress = 0; }
      // move player
      this.player.move(dir, dt);
      const playerCell = this.cellFor(this.player.x, this.player.y);
      if(this.grid[playerCell.r][playerCell.c] === 0){
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
            if(match){ this.player.kill(); this.sound.play('die'); this.handleDeath(); return; }
            // crossing segments check
            if(this.trail.length >= 2){
              const newSegA = {x:last.x, y:last.y};
              const newSegB = {x:this.player.x, y:this.player.y};
              for(let i=0;i<this.trail.length-2;i++){
                const sA = {x:this.trail[i].x, y:this.trail[i].y};
                const sB = {x:this.trail[i+1].x, y:this.trail[i+1].y};
                if(sA.x===newSegA.x && sA.y===newSegA.y) continue;
                if(sB.x===newSegB.x && sB.y===newSegB.y) continue;
                if(sA.x===newSegB.x && sA.y===newSegB.y) continue;
                if(linesIntersect(newSegA, newSegB, sA, sB)){
                  this.player.kill(); this.sound.play('die'); this.handleDeath(); return;
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
  }

  finalizeCapture(){
    // convert trail cells to temporary filled and compute flood fill
    for(const p of this.trail){
      this.grid[p.r][p.c] = 1; // trail becomes filled boundary
    }

    // compute reachable empty regions from enemies and capture the rest
    const regions = floodFillRegions(this.grid);
    // regions is array of {cells: [[r,c...]], id}
    const enemyCells = new Set();
    for(const enemy of this.enemies){
      const cell = this.cellFor(enemy.x, enemy.y);
      enemyCells.add(cell.r + ',' + cell.c);
    }

    // For each region, check if it contains any enemy; if not, fill it
    let newFilled = 0;
    // Build a quick cell=>region map to assign enemies to regions
    const cellToRegion = {};
    for(let i=0;i<regions.length;i++){
      for(const cell of regions[i].cells){
        cellToRegion[cell.r+','+cell.c] = i;
      }
    }

    for(const region of regions){
      let hasEnemy = false;
      for(const cell of region.cells){
        const key = cell.r + ',' + cell.c;
        if(enemyCells.has(key)) { hasEnemy = true; break; }
      }
      if(!hasEnemy){
        // fill region
        for(const cell of region.cells){
            if(this.grid[cell.r][cell.c] === 0){
            this.grid[cell.r][cell.c] = 1; newFilled++;
          }
        }
      }
    }

    // clear trail
    this.trail = [];
    this.player.capturing = false;
    this.updatePercent();
    // award score, double if slow capture
    const multiplier = this.captureSlow ? 2 : 1;
      this.score += newFilled * 10 * multiplier * this.multiplier;
      // update high score
      if(this.score > (this.highScore || 0)){
        this.highScore = this.score; localStorage.setItem('qix_highscore', String(this.highScore));
        setHighScore(this.highScore, true);
      }
    this.captureSlow = false;
    setScore(this.score); setMultiplier(this.multiplier);

    // Assign enemy sizes based on their region area
    for(const enemy of this.enemies){
      const cell = this.cellFor(enemy.x, enemy.y);
      const rid = cellToRegion[cell.r+','+cell.c];
      if(typeof rid === 'number'){
        const reg = regions[rid];
        // scale enemy radius proportional to region size
        const ratio = reg.cells.length / (COLS * ROWS);
        const newRad = 6 + Math.floor(ratio * 300);
        enemy.radius = Math.max(3, Math.floor(newRad * 0.2));
      }
    }
    // Check if enemies are split across different regions (end level)
    const enemyRegionSet = new Set();
    for(const enemy of this.enemies){
      const cell = this.cellFor(enemy.x, enemy.y);
      const rid = cellToRegion[cell.r+','+cell.c];
      if(typeof rid === 'number') enemyRegionSet.add(rid);
    }
    if(enemyRegionSet.size > 1){
      setStatus('Qix Split! Level Cleared');
      this.nextLevel();
      return;
    }
    if(newFilled > 0) {
      this.sound.play('capture');
      // spawn capture particles
      this.particles.add(this.player.x, this.player.y, 20);
    }
    // multiplier persists if split
    this.updateMultiplier(newFilled, regions, cellToRegion);
  }

  updateMultiplier(newFilled, regions, cellToRegion){
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
        if(this.grid[r][c] === 0){ const w = this.worldForCell(r,c); ex=w.x; ey=w.y; break; }
      }
      if(ex===0 && ey===0){ ex = 200 + Math.random()*400; ey = 200 + Math.random()*400; }
      const e = new Enemy(ex, ey); e.vx *= 1 + this.level*0.03; e.vy *= 1 + this.level*0.03; this.enemies.push(e);
      setMultiplier(this.multiplier);
    }
  }

  updatePercent(){
    let total = ROWS * COLS;
    let filled = 0;
    for(let r=0; r<ROWS; r++){
      for(let c=0; c<COLS; c++){
        if(this.grid[r][c] === 1) filled++;
      }
    }
    this.percent = Math.floor((filled / total) * 100);
    setPercent(this.percent);
    if(this.percent >= CAPTURE_PERCENT){
      setStatus('Level Cleared!');
      // start next level
      setTimeout(()=>{ this.nextLevel(); }, 200);
    }
  }

  cellFor(x, y){
    return gridCellFor(x,y);
  }

  worldForCell(r,c){
    return gridWorldForCell(r,c);
  }

  draw(){
    Draw.clear(this.ctx, WIDTH, HEIGHT);
    Draw.grid(this.ctx, this.grid, CELL);
    Draw.trail(this.ctx, this.trail, this.fuse, this.captureSlow);
    for(const enemy of this.enemies){
      Draw.enemy(this.ctx, enemy);
    }
    Draw.player(this.ctx, this.player);
    // particles
    if(this.particles) this.particles.draw(this.ctx);
    // draw percent in HUD (done elsewhere)
  }

  gameOver(){
    this.running = false;
    if(this.rafId) cancelAnimationFrame(this.rafId);
    setStatus('Game Over');
  }

  restart(){
    // simple restart
    this.resetGrid();
    this.enemies = [];
    for(let i = 0; i < 3; i++){
      this.enemies.push(new Enemy(100 + i*160, 200 + (i*60)%300));
    }
    this.player = new Player(WIDTH/2, HEIGHT - CELL*1.5, CELL);
    this.trail = [];
    this.player.capturing = false;
    this.level = 0; this.multiplier = 1; this.score = 0; this.lives = 3;
    this.nextLevel();
    this.lives = 3; this.score = 0;
    setScore(this.score); setLives(this.lives);
    if(!this.running){
      this.running = true;
      this.last = performance.now(); this.accumulator = 0; this.rafId = requestAnimationFrame(this._frame.bind(this));
    }
    setStatus('Ready');
  }

  nextLevel(){
    // increment level and spawn more enemies
    this.level += 1;
    // reset grid before spawning
    this.resetGrid();
    this.enemies = [];
    const innerCount = Math.min(8, 2 + Math.floor(this.level/1));
    // spawn inner enemies in random empty cells
    for(let i=0;i<innerCount;i++){
      let tries = 0; let ex = 0, ey = 0;
      while(tries++ < 50){
        const r = 1 + Math.floor(Math.random() * (ROWS-2));
        const c = 1 + Math.floor(Math.random() * (COLS-2));
        if(this.grid[r][c] === 0){ const w = this.worldForCell(r,c); ex = w.x; ey = w.y; break; }
      }
      if(ex === 0 && ey === 0){ ex = 200 + Math.random()*400; ey = 200 + Math.random()*400; }
      const e = new Enemy(ex, ey);
      e.vx *= 1 + this.level*0.08; e.vy *= 1 + this.level*0.08;
      this.enemies.push(e);
    }
    // add sparx as level increases
    const sparxCount = 2 + Math.floor(this.level/4);
    for(let si=0;si<sparxCount;si++){
      const side = si%4;
      let x = 20, y = 20;
      if(side===0){ x=20; y=20 + Math.random()*760; }
      if(side===1){ x=780; y=20 + Math.random()*760; }
      if(side===2){ x=20 + Math.random()*760; y=20; }
      if(side===3){ x=20 + Math.random()*760; y=780; }
      const sparx = new Sparx(x,y,{x: Math.random()>0.5?1:-1, y:0});
      sparx.speed = (110 + this.level*12) * 0.75;
      sparx.baseSpeed = sparx.speed;
      this.enemies.push(sparx);
    }
    // reset grid and player
    this.resetGrid();
    this.player = new Player(WIDTH/2, HEIGHT - CELL*1.5, CELL);
    this.trail = [];
    this.updatePercent();
    setStatus(`Level ${this.level}`);
    setLevel(this.level);
    setMultiplier(this.multiplier);
  }
}
