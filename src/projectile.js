import { WIDTH, HEIGHT } from './constants.js';

export default class Projectile {
  constructor(x,y,dx,dy,speed=300){
    this.x = x; this.y = y;
    const mag = Math.hypot(dx,dy) || 1;
    this.vx = (dx/mag) * speed; this.vy = (dy/mag) * speed;
    this.life = 3.0; // seconds
    this.radius = 3;
    this.angle = Math.atan2(this.vy, this.vx);
  }

  update(dt){
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
  }

  isOutOfBounds(){
    return this.x < 0 || this.y < 0 || this.x > WIDTH || this.y > HEIGHT || this.life <= 0;
  }

  draw(ctx){
    ctx.save(); ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
}
