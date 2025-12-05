export default class Player {
  constructor(x,y,cellSize){
    this.x = x; this.y = y; this.cellSize = cellSize;
    this.speed = 120; // px/s
    this.radius = cellSize*0.4;
    this.capturing = false;
    this.trail = [];
    this.sparks = []; // active sparks coming at player
    this.alive = true;
  }

  update(dt, game){
    // sparks move toward player and check collision
    this.updateSparks(dt, game);
  }

  move(dir, dt){
    if(!this.alive) return;
    const mag = Math.sqrt(dir.x*dir.x + dir.y*dir.y);
    let nx = 0, ny = 0;
    if(mag>0){ nx = dir.x/mag; ny = dir.y/mag; }
    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;
    this.x = Math.max(0, Math.min(800, this.x));
    this.y = Math.max(0, Math.min(800, this.y));
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
        // player hit by spark
        this.kill();
        game.sound.play('die');
        game.handleDeath();
      }
      if(sp.life <= 0) this.sparks.splice(i,1);
    }
  }

  kill(){
    this.alive = false;
  }
}
