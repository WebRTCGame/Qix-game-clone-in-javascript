import { CELL } from './constants.js';

export default class Powerup {
  constructor(x, y, type){
    this.x = x; this.y = y;
    this.type = type; // 'speed','weapon','life','shield'
    this.size = CELL * 0.4;
    this.picked = false;
    this.spawnTime = performance.now();
  }

  update(dt){
    // currently static; powerups may animate later
  }

  collidesWithPlayer(player){
    const dx = this.x - player.x; const dy = this.y - player.y;
    return Math.hypot(dx,dy) < (this.size + player.radius + 2);
  }

  draw(ctx){
    ctx.save();
    ctx.fillStyle = '#bbb';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
    ctx.fill(); ctx.stroke();
    // icon for type
    ctx.fillStyle = '#222';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = this.type === 'weapon' ? 'W' : (this.type === 'speed' ? 'S' : (this.type === 'life' ? '+' : 'O'));
    ctx.fillText(label, this.x, this.y);
    ctx.restore();
  }
}
