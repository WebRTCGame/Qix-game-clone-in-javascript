// Preload sprite images (SVG pixel-art placeholders)
const _images = {};
['player','enemy_main','enemy_minion','powerup','projectile'].forEach(name => {
  const img = new Image(); img.src = `assets/${name}.svg`; img.alt = name; _images[name] = img;
});
// obstacle sprite - prefer a raster PNG if available (we download assets/obstacle.png)
{ const img = new Image(); img.src = `assets/obstacle.png`; img.alt = 'obstacle'; _images.obstacle = img; }

const Draw = {
  clear(ctx, w, h, bg){
    ctx.fillStyle = bg || '#000';
    ctx.fillRect(0,0,w,h);
  },
  grid(ctx, grid, cell, opts = {}){
    // draw filled cells
    const rows = grid.length; const cols = grid[0].length;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(grid[r][c] === 1){
          if(opts.drawFilled === false) { /* skip filled cell render */ }
          else {
          ctx.fillStyle = opts.fillColor || '#1e90ff'; // filled color (level art)
          ctx.fillRect(c*cell, r*cell, cell, cell);
          }
        }
        // skip obstacles here; we'll batch-draw them as grouped sprites afterwards
      }
    }
    // find connected obstacle components and draw as a single sprite per group
    const obsVisited = new Array(rows).fill(0).map(()=>new Array(cols).fill(false));
    const obstacleImg = _images.obstacle;
    for(let r0=0;r0<rows;r0++){
      for(let c0=0;c0<cols;c0++){
        if(obsVisited[r0][c0]) continue;
        if(grid[r0][c0] !== 2) continue;
        // flood-fill this obstacle block
        const stack = [[r0,c0]]; obsVisited[r0][c0] = true; const cells = [];
        while(stack.length){ const [rr,cc] = stack.pop(); cells.push({r:rr,c:cc}); const neigh=[[rr-1,cc],[rr+1,cc],[rr,cc-1],[rr,cc+1]]; for(const [nr,nc] of neigh){ if(nr>=0 && nr<rows && nc>=0 && nc<cols && !obsVisited[nr][nc] && grid[nr][nc]===2){ obsVisited[nr][nc] = true; stack.push([nr,nc]); } } }
        // compute bbox
        let rmin=Infinity, rmax=-Infinity, cmin=Infinity, cmax=-Infinity;
        for(const cellObj of cells){ rmin = Math.min(rmin, cellObj.r); rmax = Math.max(rmax, cellObj.r); cmin = Math.min(cmin, cellObj.c); cmax = Math.max(cmax, cellObj.c); }
        const x = cmin * cell; const y = rmin * cell; const w = (cmax - cmin + 1) * cell; const h = (rmax - rmin + 1) * cell;
        if(obstacleImg && obstacleImg.complete){
          try{
            // draw group shadow then sprite
            this.drawShadow(ctx, obstacleImg, x + w/2, y + h/2, w, h, 0);
            ctx.drawImage(obstacleImg, x, y, w, h);
          }catch(e){ /* draw fallback below */ }
        } else {
          // fallback: draw per-cell shadow ellipse then fill rectangles
          for(const cc of cells){ ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cc.c*cell + cell/2 + 20, cc.r*cell + cell/2 + 20, cell/2, cell/2, 0, 0, Math.PI*2); ctx.fill(); }
          for(const cc of cells){ ctx.fillStyle = opts.obstacleColor || '#666'; ctx.fillRect(cc.c*cell, cc.r*cell, cell, cell); }
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
  // Draw translucent colored overlays for perceived regions. `overlays` is
  // an array of { cells: [{r,c},...], color: 'rgba(...)', label?: string }
  regions(ctx, overlays, cell){
    if(!overlays || !overlays.length) return;
    ctx.save();
    for(const o of overlays){
            // optionally draw a debug outline if there's a debug overlay marker
            if(o.debug){
              ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
              for(const c of o.cells){ ctx.strokeRect(c.c*cell+0.5, c.r*cell+0.5, cell-1, cell-1); }
              ctx.restore();
            }
      ctx.fillStyle = o.color || 'rgba(255,255,255,0.08)';
      for(const c of o.cells){ ctx.fillRect(c.c * cell, c.r * cell, cell, cell); }
      if(o.label){
        // draw a small label at region center
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.label, (o.cx) * cell, (o.cy) * cell);
        ctx.restore();
      }
    }
    ctx.restore();
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
    if(!player) return; // defensive: no player yet (async level load)
    const img = _images.player;
    const pW = (player.radius + 2) * 2;
    if(img && img.complete){
      const angle = (typeof player.angle === 'number') ? player.angle : 0;
      // draw sprite visually larger (300%) without changing collision size
      const scale = 3.0;
      const drawW = pW * scale;
      // draw shadow first (offset +40,+40)
      this.drawShadow(ctx, img, player.x, player.y, drawW, drawW, angle);
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(angle + Math.PI/2);
      ctx.drawImage(img, -drawW/2, -drawW/2, drawW, drawW);
      ctx.restore();
    } else { ctx.fillStyle = '#ff7f50'; ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2); ctx.fill(); }
    // sparks
    for(const sp of player.sparks){
      const imgP = _images.projectile;
      const sw = (sp.radius || 3) * 2;
      if(imgP && imgP.complete){ const a = (typeof sp.angle === 'number' ? sp.angle : Math.atan2(sp.vy || 0, sp.vx || 1)); ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(a + Math.PI/2); ctx.drawImage(imgP, -sw/2, -sw/2, sw, sw); ctx.restore(); }
      else { ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 3,0,Math.PI*2); ctx.fill(); }
    }
    // shield
    if(player.shieldTimer > 0){
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,128,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(player.x, player.y, player.radius+4, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }
  },
  powerup(ctx, p){ if(!p) return; const img = _images.powerup; if(img && img.complete) ctx.drawImage(img, p.x - p.size, p.y - p.size, p.size*2, p.size*2); else p.draw(ctx); },
  projectile(ctx, proj){ if(!proj) return; const img = _images.projectile; const w = proj.radius * 2.6; if(img && img.complete){ const a = (typeof proj.angle === 'number') ? proj.angle : Math.atan2(proj.vy||0, proj.vx||1); ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(a + Math.PI/2); ctx.drawImage(img, -w/2, -w/2, w, w); ctx.restore(); } else proj.draw(ctx); },
  enemy(ctx, enemy){
    ctx.save();
    const imgName = enemy.type === 'main' ? 'enemy_main' : 'enemy_minion';
    const img = _images[imgName];
    if(img && img.complete){
      const w = (enemy.radius + (enemy.type==='main'?4:2)) * 2;
      const a = Math.atan2(enemy.vy || 0, enemy.vx || 1);
      // enemy shadow
      this.drawShadow(ctx, img, enemy.x, enemy.y, w, w, a);
      ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(a + Math.PI/2);
      ctx.drawImage(img, -w/2, -w/2, w, w);
      ctx.restore();
      if(enemy.type === 'main'){
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(enemy.hp || 1, enemy.x, enemy.y);
      }
    } else {
      if(enemy.type === 'main'){
        ctx.fillStyle = enemy.color || '#ff4500';
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius+2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius+4, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(enemy.hp || 1, enemy.x, enemy.y);
      } else {
        ctx.fillStyle = enemy.color || '#8b00ff';
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  },

  // Draw a solid black, semi-transparent shadow for an image shaped like the sprite
  // This draws the sprite at offset (x+40,y+40) with same rotation and tint.
  drawShadow(ctx, img, x, y, w, h, angle){
    ctx.save();
    ctx.translate(x + 20, y + 20);
    ctx.rotate(angle + Math.PI/2);
    if(img && img.complete){
      try{
        // render onto an offscreen canvas so we don't alter main ctx compositing
        const tmp = document.createElement('canvas'); tmp.width = Math.max(1, Math.floor(w)); tmp.height = Math.max(1, Math.floor(h));
        const tctx = tmp.getContext('2d');
        tctx.clearRect(0,0,tmp.width,tmp.height);
        tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
        tctx.globalCompositeOperation = 'source-in';
        tctx.fillStyle = 'rgba(0,0,0,0.5)';
        tctx.fillRect(0,0,tmp.width,tmp.height);
        ctx.drawImage(tmp, -w/2, -h/2, w, h);
      }catch(e){
        // fallback to simple oval if offscreen fails
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI*2); ctx.fill();
      }
    } else {
      // fallback: draw an oval shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // Draw rectangular overlays for caves (array of {id,x,y,w,h})
  caveRects(ctx, caves, cell){
    if(!caves || !caves.length) return;
    ctx.save();
    for(const c of caves){
      ctx.fillStyle = c.color || 'rgba(48,200,255,0.12)'; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = c.strokeColor || 'rgba(48,200,255,0.6)'; ctx.lineWidth = Math.max(2, Math.min(4, cell/6));
      ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
      // label
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const cx = c.x + c.w/2, cy = c.y + 12;
      ctx.fillText(String(c.id), cx, cy);
      ctx.restore();
    }
    ctx.restore();
  },

  // Draw short one-cell-wide line overlays for special uncaptured cells.
  // overlays: array of {r,c,type} where type is 'primary'|'secondary'
  specialLines(ctx, overlays, cell){
    if(!overlays || !overlays.length) return;
    ctx.save();
    for(const o of overlays){
      // only draw secondary (lime) cells; skip primary/dark-green
      if(o.type !== 'secondary') continue;
      const x = o.c * cell, y = o.r * cell;
      ctx.fillStyle = '#32cd32'; ctx.strokeStyle = '#2aa02a';
      ctx.fillRect(x, y, cell, cell);
      ctx.lineWidth = Math.max(1, Math.min(2, cell/10));
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
    ctx.restore();
  },

  // Highlight captured corner cells found by Board.findCapturedCorners
  // corners: array of {r,c,type} where type===2 -> red, type===3 -> yellow
  capturedCorners(ctx, corners, cell){
    if(!corners || !corners.length) return;
    ctx.save();
    for(const cc of corners){
      const x = cc.c * cell, y = cc.r * cell;
      if(cc.type === 1){ ctx.fillStyle = '#ff00ff'; ctx.strokeStyle = '#b000b0'; }
      else if(cc.type === 2){ ctx.fillStyle = '#ff0000'; ctx.strokeStyle = '#b00000'; }
      else if(cc.type === 3){ ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#c09000'; }
      else if(cc.type === 4){ ctx.fillStyle = '#007bff'; ctx.strokeStyle = '#005fbf'; }
      else { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; }
      ctx.lineWidth = Math.max(1, Math.min(3, cell/8));
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
    ctx.restore();
  }
}
// Allow caller to override per-level images dynamically
Draw.setLevelImages = function(images = {}){
  if(!images) return;
  if(images.main) { const img = new Image(); img.src = images.main; _images.enemy_main = img; }
  if(images.minion) { const img = new Image(); img.src = images.minion; _images.enemy_minion = img; }
  if(images.obstacle) { const img = new Image(); img.src = images.obstacle; _images.obstacle = img; }
  if(images.projectile) { const img = new Image(); img.src = images.projectile; _images.projectile = img; }
  if(images.powerup) { const img = new Image(); img.src = images.powerup; _images.powerup = img; }
}
export default Draw;
