import { WIDTH, HEIGHT } from './constants.js';

export default class Projectile {
  constructor(x,y,dx,dy,speed=300, owner='player', radius=3, life=3){
    this.x = x; this.y = y;
    const mag = Math.hypot(dx,dy) || 1;
    this.vx = (dx/mag) * speed; this.vy = (dy/mag) * speed;
    this.life = typeof life === 'number' ? life : 3.0; // seconds
    this.radius = typeof radius === 'number' ? radius : 3;
    this.angle = Math.atan2(this.vy, this.vx);
    this.owner = owner; // 'player' or 'enemy'
  }

  // Reset the projectile for reuse from a pool
  reset(x,y,dx,dy,speed=300, owner='player', radius=3, life=3){
    this.x = x; this.y = y;
    const mag = Math.hypot(dx,dy) || 1;
    this.vx = (dx/mag) * speed; this.vy = (dy/mag) * speed;
    this.life = typeof life === 'number' ? life : 3.0;
    this.radius = typeof radius === 'number' ? radius : 3;
    this.angle = Math.atan2(this.vy, this.vx);
    this.owner = owner;
  }

  update(dt){
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
  }

  isOutOfBounds(){
    return this.x < 0 || this.y < 0 || this.x > WIDTH || this.y > HEIGHT || this.life <= 0;
  }

  draw(ctx){
    ctx.save();
    const ang = (typeof this.angle === 'number') ? this.angle : Math.atan2(this.vy||0, this.vx||1);
    ctx.translate(this.x, this.y); ctx.rotate(ang + Math.PI/2);
    const w = Math.max(1, this.radius * 2.6);
    // stretch depending on velocity magnitude
    const stretch = Math.min(3.0, 1 + (Math.hypot(this.vx||0, this.vy||0) / 240));
    ctx.beginPath(); ctx.ellipse(0, 0, w * stretch, Math.max(1, w * 0.55), 0, 0, Math.PI*2);
    ctx.fillStyle = this.owner === 'enemy' ? 'rgba(255,120,80,0.95)' : 'rgba(255,220,120,0.98)';
    ctx.shadowColor = this.owner === 'enemy' ? 'rgba(255,120,80,0.95)' : 'rgba(255,220,120,0.95)'; ctx.shadowBlur = Math.max(1, Math.floor(w * 0.6));
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.restore();
  }
}
