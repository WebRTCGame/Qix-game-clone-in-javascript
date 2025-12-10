import { WIDTH, HEIGHT } from './constants.js';
import Projectile from './projectile.js';

export default class Player {
  constructor(x,y,cellSize){
    this.x = x; this.y = y; this.cellSize = cellSize;
    this.speed = 120; // px/s
    this.radius = cellSize*0.4;
    this.capturing = false;
    this.trail = [];
    this.sparks = []; // active sparks coming at player
    this.alive = true;
    // powerup state
    this.weaponAmmo = 0;
    this.weaponCooldown = 0;
    this.angle = 0;
    this.speedTimer = 0; this.speedMul = 1;
    this.shieldTimer = 0;
  }

  update(dt, game){
    // sparks move toward player and check collision
    this.updateSparks(dt, game);
    // handle powerup timers
    if(this.speedTimer > 0){ this.speedTimer -= dt; if(this.speedTimer <= 0) this.speedMul = 1; }
    if(this.shieldTimer > 0){ this.shieldTimer -= dt; }
    if(this.weaponCooldown > 0) this.weaponCooldown -= dt;
  }

  // Attempt to shoot in direction (dx,dy), pushing new projectile into game.projectiles
  shoot(dx, dy, game){
    if(this.weaponAmmo <= 0) return null;
    if(this.weaponCooldown > 0) return null;
    // spawn projectile using game's pooling API when available
    this.angle = Math.atan2(dy, dx);
    if(game && typeof game.spawnProjectile === 'function'){
      game.spawnProjectile(this.x, this.y, dx, dy, 300, 'player', 3, 3);
    } else {
      const proj = new Projectile(this.x, this.y, dx, dy);
      if(game && game.projectiles) game.projectiles.push(proj);
    }
    if(game && game.sound) game.sound.play('shoot');
    this.weaponAmmo--; this.weaponCooldown = 0.2; // short delay
    return proj;
  }

  // move optionally accepts a reference to game for obstacle collision checks
  move(dir, dt, game){
    if(!this.alive) return;
    const mag = Math.sqrt(dir.x*dir.x + dir.y*dir.y);
    let nx = 0, ny = 0;
    if(mag>0){ nx = dir.x/mag; ny = dir.y/mag; this.angle = Math.atan2(dir.y, dir.x); }
    // compute proposed new position
    const stepX = nx * this.speed * this.speedMul * dt;
    const stepY = ny * this.speed * this.speedMul * dt;
    const newX = this.x + stepX;
    const newY = this.y + stepY;

    // If we're capturing and the destination cell is an obstacle, block movement
    if(game && this.capturing){
      const curCell = game.cellFor(this.x, this.y);
      const nextCell = game.cellFor(newX, newY);
      if(nextCell && curCell && (nextCell.r !== curCell.r || nextCell.c !== curCell.c)){
        const nc = game.board.getCell(nextCell.r, nextCell.c);
        if(nc && nc.isObstacle()){
          // don't enter obstacle cell while capturing; stop movement
          return;
        }
      }
    }

    this.x = newX;
    this.y = newY;
    this.x = Math.max(this.radius, Math.min(WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(HEIGHT - this.radius, this.y));
  }

  startCapture(cell){
    this.capturing = true;
    this.trail = [cell];
  }

  endCapture(){
    this.capturing = false;
    this.trail = [];
  }

  spawnSpark(spark){
    if(!spark) return;
    this.sparks.push(spark);
  }

  updateSparks(dt, game){
    if(!this.sparks.length) return;
    for(let i = this.sparks.length-1; i>=0; i--){
      const sp = this.sparks[i];
      sp.update(dt);
      const d = Math.hypot(sp.x - this.x, sp.y - this.y);
      if(d < this.radius){
        // player hit by spark (unless shielded)
        if(this.shieldTimer <= 0){ this.kill(); game.sound.play('die'); game.handleDeath(); }
      }
      // remove spark if it hit a filled cell or left world bounds
      const spCell = game.cellFor(sp.x, sp.y);
      if(sp.x < 0 || sp.y < 0 || sp.x > WIDTH || sp.y > HEIGHT || (spCell && ( ! (game.board.getCell(spCell.r, spCell.c) && game.board.getCell(spCell.r, spCell.c).isEmpty() ) ))){
        this.sparks.splice(i,1);
        continue;
      }
      if(sp.life <= 0) this.sparks.splice(i,1);
    }
  }

  kill(){
    this.alive = false;
  }
}
