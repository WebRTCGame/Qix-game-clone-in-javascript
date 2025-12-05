export default class Particles{
  constructor(){ this._pool = []; this._active = []; }
  add(x,y,n=12){
    for(let i=0;i<n;i++){
      const p = this._pool.length ? this._pool.pop() : {};
      p.x = x; p.y = y; p.vx = (Math.random()*2-1)*120; p.vy = (Math.random()*2-1)*120; p.life = 0.6+Math.random()*0.6;
      this._active.push(p);
    }
  }
  update(dt){
    for(let i=this._active.length-1;i>=0;i--){
      const p = this._active[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if(p.life <= 0){ this._active.splice(i,1); this._pool.push(p); }
    }
  }
  draw(ctx){
    for(const p of this._active){ ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(p.x-1,p.y-1,2,2); }
  }
}
