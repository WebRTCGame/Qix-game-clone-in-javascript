// Preload sprite images (SVG pixel-art placeholders)
const _images = {};
['player','enemy_main','enemy_minion','powerup','projectile'].forEach(name => {
  const img = new Image();
  img.alt = name;
  // prefer raster PNG for player if available, otherwise fall back to SVG
  if(name === 'player'){
    img.src = 'assets/player.png';
    img.onerror = () => { img.onerror = null; img.src = 'assets/player.svg'; };
  } else { img.src = `assets/${name}.svg`; }
  _images[name] = img;
});
// obstacle sprite - prefer a raster PNG if available (we download assets/obstacle.png)
{ const img = new Image(); img.src = `assets/obstacle.png`; img.alt = 'obstacle'; _images.obstacle = img; }

// cached shadow canvases keyed by image src + size
const _shadowCache = new Map();

// cached tinted overlays keyed by src+size+hue+alpha
const _tintCache = new Map();

function _getTintedCanvas(img, w, h, hue = 0, alpha = 0.2){
  if(!img || !img.src) return null;
  const key = `${img.src}|${Math.max(1,Math.floor(w))}x${Math.max(1,Math.floor(h))}|h${Math.round(hue)}|a${Math.round(alpha*100)}`;
  let cached = _tintCache.get(key);
  if(cached) return cached;
  try{
    const tmp = document.createElement('canvas'); tmp.width = Math.max(1, Math.floor(w)); tmp.height = Math.max(1, Math.floor(h));
    const tctx = tmp.getContext('2d');
    tctx.clearRect(0,0,tmp.width,tmp.height);
    // draw the sprite at full area
    tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
    // clip a solid color to the sprite alpha using source-in
    tctx.globalCompositeOperation = 'source-in';
    tctx.fillStyle = `hsla(${Math.round(hue)},72%,52%,${alpha})`;
    tctx.fillRect(0,0,tmp.width,tmp.height);
    tctx.globalCompositeOperation = 'source-over';
    _tintCache.set(key, tmp);
    return tmp;
  }catch(e){ return null; }
}

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
    // animate the trail with a moving dash so the capture animation feels active
    ctx.strokeStyle = slow ? '#ffb347' : '#fff'; ctx.lineWidth = 2;
    const T = (performance.now() || Date.now()) / 1000;
    ctx.setLineDash([8, 8]); ctx.lineDashOffset = -T * 48;
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for(let i=1;i<trail.length;i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    // draw nodes
    ctx.fillStyle = '#fff';
    for(const p of trail) ctx.fillRect(p.x-1.5, p.y-1.5, 3,3);
    // reset dash style for other callers
    ctx.setLineDash([]);
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
  player(ctx, player, mode='both'){
    if(!player) return; // defensive: no player yet (async level load)
    const img = _images.player;
    const pW = (player.radius + 2) * 2;
    if(img && img.complete){
      const angle = (typeof player.angle === 'number') ? player.angle : 0;
      // draw sprite visually larger (300%) without changing collision size
      const baseScale = 3.0;
      const t = (performance.now() || Date.now()) / 1000;
      const scale = baseScale * (1 + Math.sin(t * 3.2) * 0.035); // gentle pulse
      const drawW = pW * scale;
      if(mode === 'shadow' || mode === 'both'){
        // draw shadow first (offset +40,+40)
        this.drawShadow(ctx, img, player.x, player.y, drawW, drawW, angle);
      }
      if(mode === 'sprite' || mode === 'both'){
        ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(angle + Math.PI/2);
        ctx.drawImage(img, -drawW/2, -drawW/2, drawW, drawW);
        ctx.restore();
      }
    } else {
      if(mode === 'sprite' || mode === 'both'){
        ctx.fillStyle = '#ff7f50'; ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2); ctx.fill();
      }
    }
    // sparks
    if(mode === 'sprite' || mode === 'both'){
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
    }
  },
  powerup(ctx, pu, mode='both'){
    if(!pu) return;
    const img = _images.powerup;
    if(img && img.complete){
      const w = pu.size * 2;
      if(mode === 'shadow' || mode === 'both'){
        this.drawShadow(ctx, img, pu.x, pu.y, w, w, 0);
      }
      if(mode === 'sprite' || mode === 'both'){
        // gentle bob + pulse to call attention
        const t = (performance.now() || Date.now()) / 1000;
        const bob = Math.sin(t * 2.2) * 3;
        const pulse = 1 + Math.sin(t * 2.6) * 0.06;
        ctx.save(); ctx.translate(pu.x, pu.y + bob); ctx.scale(pulse, pulse);
        ctx.drawImage(img, -pu.size, -pu.size, w, w);
        ctx.restore();
      }
    } else {
      if(mode === 'sprite' || mode === 'both'){
        pu.draw(ctx);
      }
    }
  },
  projectile(ctx, proj, mode='both'){
    if(!proj) return;
    const img = _images.projectile;
    const w = proj.radius * 2.6;
    const a = (typeof proj.angle === 'number') ? proj.angle : Math.atan2(proj.vy||0, proj.vx||1);
    if(img && img.complete){
      if(mode === 'shadow' || mode === 'both'){
        this.drawShadow(ctx, img, proj.x, proj.y, w, w, a);
      }
      if(mode === 'sprite' || mode === 'both'){
        // draw a stretched, slightly-glowing projectile to imply motion
        ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(a + Math.PI/2);
        // soft glow
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = proj.owner === 'enemy' ? 'rgba(255,120,80,0.9)' : 'rgba(255,220,120,0.9)'; ctx.shadowBlur = Math.max(2, Math.floor(w * 0.6));
        ctx.beginPath(); ctx.ellipse(0, 0, w * 1.3, Math.max(1, w * 0.55), 0, 0, Math.PI*2);
        ctx.fillStyle = proj.owner === 'enemy' ? 'rgba(255,120,80,0.95)' : 'rgba(255,220,120,0.95)'; ctx.fill();
        ctx.restore();
        // sprite over the glow for sharper center if image exists
        ctx.drawImage(img, -w/2, -w/2, w, w);
        ctx.restore();
      }
    } else {
      if(mode === 'sprite' || mode === 'both'){
        proj.draw(ctx);
      }
    }
  },
  enemy(ctx, enemy, mode='both'){
    ctx.save();
    const imgName = enemy.type === 'main' ? 'enemy_main' : 'enemy_minion';
    const img = _images[imgName];
    if(img && img.complete){
      const w = (enemy.radius + (enemy.type==='main'?4:2)) * 2;
      const a = Math.atan2(enemy.vy || 0, enemy.vx || 1);
      // telegraph visuals: show aim cone when enemy is aiming
      try{
        if(enemy.firingState === 'aiming'){
          const aim = (typeof enemy.aimTargetAngle === 'number') ? enemy.aimTargetAngle : a;
          const projCfg = enemy.config?.projectile || {};
          const spread = typeof enemy.config?.burstSpread === 'number' ? enemy.config.burstSpread : (typeof projCfg.burstSpread === 'number' ? projCfg.burstSpread : Math.PI * 0.35);
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          ctx.rotate(aim + Math.PI/2);
          ctx.globalAlpha = 0.65;
          ctx.fillStyle = 'rgba(255,80,80,0.14)';
          if(enemy.weapon === 'radial'){
            ctx.beginPath(); ctx.arc(0,0, enemy.radius + 10, 0, Math.PI*2); ctx.fill();
          } else if(enemy.weapon === 'burst'){
            // draw a triangular wedge to show approximate burst zone
            ctx.beginPath(); const r = enemy.radius + 40; ctx.moveTo(0,0); ctx.arc(0,0, r, -spread/2, spread/2); ctx.closePath(); ctx.fill();
          } else if(enemy.weapon === 'axes' || enemy.weapon === 'targeted'){
            // draw a narrow aim line
            ctx.strokeStyle = 'rgba(255,80,80,0.9)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -(enemy.radius + 40)); ctx.stroke();
          }
          ctx.restore();
        }
        // quick firing glow while actively firing
        if(enemy.firingState === 'firing'){
          ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = 'rgba(255,160,40,0.12)'; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius + 10, 0, Math.PI*2); ctx.fill(); ctx.restore();
        }
      }catch(e){ /* best-effort drawing, don't crash */ }
      // draw segments shadows first (if mode includes shadow)
      if(enemy.segments && enemy.segments.length > 0 && (mode === 'shadow' || mode === 'both')){
        for(let i = enemy.segments.length - 1; i >= 0; i--){
          const seg = enemy.segments[i];
          const sw = w * 0.8;
          const sa = seg.angle;
          // segment shadow
          this.drawShadow(ctx, img, seg.x, seg.y, sw, sw, sa);
        }
      }
      // head shadow (if mode includes shadow)
      if(mode === 'shadow' || mode === 'both'){
        this.drawShadow(ctx, img, enemy.x, enemy.y, w, w, a);
      }
      // draw segments sprites (if mode includes sprite)
      if(enemy.segments && enemy.segments.length > 0 && (mode === 'sprite' || mode === 'both')){
        for(let i = enemy.segments.length - 1; i >= 0; i--){
          const seg = enemy.segments[i];
          const sw = w * 0.8;
          const sa = seg.angle;
          // per-segment pulse + tint
          const phase = enemy._pulsePhase || 0;
          const hueOffset = (enemy._segmentHueOffsets && enemy._segmentHueOffsets[i]) ? enemy._segmentHueOffsets[i] : (i * 6);
          const hue = Math.round(((enemy._hue || 0) + hueOffset) % 360);
          const segPulse = 1 + Math.sin(phase + i * 0.35) * (enemy.type === 'main' ? 0.04 : 0.08);
          ctx.save(); ctx.translate(seg.x + (enemy.renderOffset.x || 0) * 0.25, seg.y + (enemy.renderOffset.y || 0) * 0.25); ctx.rotate(sa + Math.PI/2); ctx.scale(segPulse, segPulse);
          ctx.drawImage(img, -sw/2, -sw/2, sw, sw);
          // tinted overlay to add per-segment color variety (use cached tinted canvas to preserve alpha)
          const tintCanvas = _getTintedCanvas(img, sw, sw, hue, 0.22);
          if(tintCanvas){ ctx.drawImage(tintCanvas, -sw/2, -sw/2, sw, sw); }
          ctx.restore(); ctx.globalCompositeOperation = 'source-over';
        }
      }
      // head sprite (if mode includes sprite)
      if(mode === 'sprite' || mode === 'both'){
        // head pulse + hue tint
        const phase = enemy._pulsePhase || 0;
        const headPulse = 1 + Math.sin(phase * (enemy.type === 'main' ? 1.75 : 2.6)) * (enemy.type === 'main' ? 0.06 : 0.12);
        const headHue = Math.round((enemy._hue || 0) % 360);
        // for fast-moving minions, draw a couple of faded afterimages opposite velocity
        const spd = Math.hypot(enemy.vx || 0, enemy.vy || 0);
        const minThresh = (enemy.config?.minSpeed) ? (enemy.config.minSpeed * 0.85) : 36;
        if(enemy.type === 'minion' && spd > minThresh){
          const nx = (enemy.vx / spd) || 0, ny = (enemy.vy / spd) || 0;
          for(let k=1;k<=2;k++){
            const off = k * Math.max(4, Math.min(16, w * 0.25));
            ctx.save(); ctx.globalAlpha = 0.14 * (1 - k*0.15);
            ctx.translate(enemy.x - nx * off, enemy.y - ny * off);
            ctx.rotate(a + Math.PI/2);
            ctx.scale(1 - k*0.08, 1 - k*0.08);
            ctx.drawImage(img, -w/2, -w/2, w, w);
            ctx.restore(); ctx.globalAlpha = 1;
          }
        }
        ctx.save(); ctx.translate(enemy.x + (enemy.renderOffset.x || 0), enemy.y + (enemy.renderOffset.y || 0)); ctx.rotate(a + Math.PI/2); ctx.scale(headPulse, headPulse);
        ctx.drawImage(img, -w/2, -w/2, w, w);
        const headTint = _getTintedCanvas(img, w, w, headHue, 0.18);
        if(headTint){ ctx.drawImage(headTint, -w/2, -w/2, w, w); }
        ctx.restore(); ctx.globalCompositeOperation = 'source-over';
        if(enemy.type === 'main'){
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(enemy.hp || 1, enemy.x, enemy.y);
        }
      }
    } else {
      // fallback: draw segments first
      if(enemy.segments && enemy.segments.length > 0 && (mode === 'sprite' || mode === 'both')){
        for(let i = enemy.segments.length - 1; i >= 0; i--){
          const seg = enemy.segments[i];
          ctx.fillStyle = enemy.color || '#ff4500';
          ctx.beginPath(); ctx.arc(seg.x, seg.y, enemy.radius * 0.8, 0, Math.PI*2); ctx.fill();
        }
      }
      // head
      if(mode === 'sprite' || mode === 'both'){
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
        // attempt to reuse cached shadow image for (img.src,w,h)
        const key = `${img.src}|${Math.max(1, Math.floor(w))}x${Math.max(1, Math.floor(h))}`;
        let tmp = _shadowCache.get(key);
        if(!tmp){
          tmp = document.createElement('canvas'); tmp.width = Math.max(1, Math.floor(w)); tmp.height = Math.max(1, Math.floor(h));
          const tctx = tmp.getContext('2d');
          tctx.clearRect(0,0,tmp.width,tmp.height);
          tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
          tctx.globalCompositeOperation = 'source-in';
          tctx.fillStyle = 'rgba(0,0,0,0.5)';
          tctx.fillRect(0,0,tmp.width,tmp.height);
          _shadowCache.set(key, tmp);
        }
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
