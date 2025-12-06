export default class Spark {
  constructor(x,y,target){
    this.x = x; this.y = y; this.target = target;
    this.speed = 240; this.life = 3; // seconds
    const dx = target.x - x; const dy = target.y - y; const m = Math.hypot(dx,dy)||1;
    this.vx = dx/m * this.speed; this.vy = dy/m * this.speed;
    this.angle = Math.atan2(this.vy, this.vx);
  }
  update(dt){
    this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
  }
}
