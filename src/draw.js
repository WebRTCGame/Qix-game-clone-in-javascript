const Draw = {
  clear(ctx, w, h){
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,w,h);
  },
  grid(ctx, grid, cell){
    // draw filled cells
    const rows = grid.length; const cols = grid[0].length;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(grid[r][c] === 1){
          ctx.fillStyle = '#1e90ff'; // filled color
          ctx.fillRect(c*cell, r*cell, cell, cell);
        }
      }
    }
    // draw grid border
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
    ctx.beginPath();
    for(let r=0;r<rows;r+=8){
      ctx.moveTo(0, r*cell); ctx.lineTo(cols*cell, r*cell);
    }
    for(let c=0;c<cols;c+=8){
      ctx.moveTo(c*cell, 0); ctx.lineTo(c*cell, rows*cell);
    }
    ctx.stroke();
  },
  trail(ctx, trail, fuse, slow){
    if(!trail || !trail.length) return;
    ctx.strokeStyle = slow ? '#ffb347' : '#fff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for(let i=1;i<trail.length;i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    // draw nodes
    ctx.fillStyle = '#fff';
    for(const p of trail) ctx.fillRect(p.x-1.5, p.y-1.5, 3,3);
    // draw fuse progress if active
    if(fuse && fuse.active && trail.length > 1){
      // fuse.progress counts segments traveled; map to segment index
      const idx = Math.floor(fuse.progress);
      const tIdx = Math.min(trail.length-2, Math.max(0, idx));
      const segStart = trail[tIdx];
      const segEnd = trail[tIdx+1];
      const frac = fuse.progress - Math.floor(fuse.progress);
      const fx = segStart.x + (segEnd.x - segStart.x) * frac;
      const fy = segStart.y + (segEnd.y - segStart.y) * frac;
      ctx.fillStyle = '#f33'; ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI*2); ctx.fill();
    }
  },
  player(ctx, player){
    ctx.fillStyle = '#ff7f50';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fill();
    // sparks
    for(const sp of player.sparks){
      ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 3,0,Math.PI*2); ctx.fill();
    }
  },
  enemy(ctx, enemy){
    ctx.fillStyle = enemy.color || '#8b00ff';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI*2);
    ctx.fill();
  }
}
export default Draw;
