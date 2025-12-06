import { ROWS, COLS, CELL } from './constants.js';
import Cell from './cell.js';
import { linesIntersect } from './collision.js';

export default class Board {
  constructor(rows = ROWS, cols = COLS, cellSize = CELL){
    this.rows = rows; this.cols = cols; this.cellSize = cellSize;
    this.grid = new Array(this.rows).fill(0).map(()=>new Array(this.cols).fill(0));
    this.cells = new Array(this.rows).fill(0).map(()=>new Array(this.cols).fill(null));
    this.reset();
  }

  reset(){
    for(let r=0;r<this.rows;r++){
      for(let c=0;c<this.cols;c++){
        if(r===0||c===0||r===this.rows-1||c===this.cols-1) this.grid[r][c] = 1; else this.grid[r][c] = 0;
        this.cells[r][c] = new Cell(r, c, this.grid[r][c], this.cellSize);
      }
    }
  }

  createGrid(){ return new Array(this.rows).fill(0).map(()=>new Array(this.cols).fill(0)); }

  // helper to get per-cell object
  getCell(r,c){ if(r<0||c<0||r>=this.rows||c>=this.cols) return null; return this.cells[r][c]; }

  cellFor(x,y){
    const r = Math.min(this.rows-1, Math.max(0, Math.floor(y / this.cellSize)));
    const c = Math.min(this.cols-1, Math.max(0, Math.floor(x / this.cellSize)));
    return {r,c};
  }

  worldForCell(r,c){ const x = c*this.cellSize + this.cellSize/2; const y = r*this.cellSize + this.cellSize/2; return {x,y}; }

  neighbors4(r,c){ const n=[]; if(r>0) n.push([r-1,c]); if(r<this.rows-1) n.push([r+1,c]); if(c>0) n.push([r,c-1]); if(c<this.cols-1) n.push([r,c+1]); return n; }

  floodFillRegions(){
    const rows = this.rows, cols = this.cols, grid = this.grid;
    const visited = new Array(rows).fill(0).map(()=>new Array(cols).fill(false));
    const regions = [];
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const cell = this.getCell(r,c);
        if(cell && cell.isEmpty() && !visited[r][c]){
          const stack = [[r,c]]; visited[r][c] = true; const cells = [];
            while(stack.length){ const [rr,cc] = stack.pop(); cells.push({r:rr,c:cc}); const n4 = this.neighbors4(rr,cc,rows,cols); for(const [nr,nc] of n4){ if(!visited[nr][nc]){ const ncCell = this.getCell(nr,nc); if(ncCell && ncCell.isEmpty()){ visited[nr][nc] = true; stack.push([nr,nc]); } } } }
          regions.push({cells});
        }
      }
    }
    return regions;
  }

  floodFillRegionsWithWalls(walls=[]){
    const rows = this.rows, cols = this.cols, grid = this.grid;
    const visited = new Array(rows).fill(0).map(()=>new Array(cols).fill(false));
    const regions = [];
    const self = this;
    function canMove(r1,c1,r2,c2){
      if(r2<0||c2<0||r2>=rows||c2>=cols) return false;
      const cFrom = self.getCell(r1,c1); const cTo = self.getCell(r2,c2);
      if(!cTo || !cTo.isEmpty()) return false; if(!cFrom || !cFrom.isEmpty()) return false;
      const x1 = c1 * CELL + CELL/2; const y1 = r1 * CELL + CELL/2; const x2 = c2 * CELL + CELL/2; const y2 = r2 * CELL + CELL/2;
      for(const w of walls){ const a = {x:w.x1,y:w.y1}, b = {x:w.x2,y:w.y2}; const p1={x:x1,y:y1}, p2={x:x2,y:y2}; if(linesIntersect(p1,p2,a,b)) return false; }
      return true;
    }

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const cell = this.getCell(r,c);
        if(cell && cell.isEmpty() && !visited[r][c]){
          const stack = [[r,c]]; visited[r][c] = true; const cells = [];
          while(stack.length){ const [rr,cc] = stack.pop(); cells.push({r:rr,c:cc}); const neigh=[[rr-1,cc],[rr+1,cc],[rr,cc-1],[rr,cc+1]]; for(const [nr,nc] of neigh){ if(nr>=0 && nr<rows && nc>=0 && nc<cols && !visited[nr][nc] && canMove(rr,cc,nr,nc)){ visited[nr][nc]=true; stack.push([nr,nc]); } } }
          regions.push({cells});
        }
      }
    }
    return regions;
  }

  findNearestFilledCell(x,y){
    const start = this.cellFor(x,y);
    const visited = new Array(this.rows).fill(0).map(()=>new Array(this.cols).fill(false));
    const q = [[start.r, start.c]]; visited[start.r][start.c] = true;
    while(q.length){ const [r,c] = q.shift(); const cell = this.getCell(r,c); if(cell && cell.isFilled()) return this.worldForCell(r,c); const neigh = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]; for(const [nr,nc] of neigh){ if(nr>=0 && nr<this.rows && nc>=0 && nc<this.cols && !visited[nr][nc]){ visited[nr][nc] = true; q.push([nr,nc]); } } }
    return null;
  }

  setCell(r,c,val){ if(r>=0 && r<this.rows && c>=0 && c<this.cols){ this.grid[r][c] = val; const cell = this.cells[r] && this.cells[r][c]; if(cell){ cell.setValue(val); cell.overlayType = null; cell.caveId = null; cell.visited = false; } } }

  // Find captured corner cells.
  // A captured cell is a grid cell with value==1. We consider its 4-neighbors and
  // count how many of them are uncaptured (value==0). If the count is 2 => type 2
  // corner, if 3 => type 3 corner. Returns an array of {r,c,type}.
  findCapturedCorners(){
    const out = [];
    for(let r=0;r<this.rows;r++){
      for(let c=0;c<this.cols;c++){
        const ocell = this.getCell(r,c);
        if(!ocell || !ocell.isFilled()) continue;
        let zeroCount = 0;
        const neigh = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        for(const [nr,nc] of neigh){ if(nr>=0 && nr<this.rows && nc>=0 && nc<this.cols){ const ncell = this.getCell(nr,nc); if(ncell && ncell.isEmpty()) zeroCount++; } }
        if(zeroCount >= 1 && zeroCount <= 4) out.push({r,c,type: zeroCount});
      }
    }
    return out;
  }

  // For each captured corner cell type==2 (two uncaptured neighbors), extend one
  // horizontal and one vertical ray through uncaptured cells until another captured
  // cell is encountered. Only keep rays that reach a captured cell. Return an array
  // of line groups: { origin: {r,c}, horiz: {cells, len}, vert: {cells,len}, primary: 'h'|'v' }
  findType2Lines(){
    const rows = this.rows, cols = this.cols; const grid = this.grid;
    const corners = this.findCapturedCorners().filter(x => x.type === 2);
    const groups = [];
    for(const cc of corners){
      const r = cc.r, c = cc.c;
      // find which of four neighbors are uncaptured (0)
      const open = { up: false, down: false, left: false, right: false };
      if(r>0){ const n = this.getCell(r-1,c); if(n && n.isEmpty()) open.up = true; }
      if(r<rows-1){ const n = this.getCell(r+1,c); if(n && n.isEmpty()) open.down = true; }
      if(c>0){ const n = this.getCell(r,c-1); if(n && n.isEmpty()) open.left = true; }
      if(c<cols-1){ const n = this.getCell(r,c+1); if(n && n.isEmpty()) open.right = true; }

      // need one horizontal (left or right) and one vertical (up or down). Choose whichever open
      let horizDir = null, vertDir = null;
      if(open.left) horizDir = 'left'; else if(open.right) horizDir = 'right';
      if(open.up) vertDir = 'up'; else if(open.down) vertDir = 'down';

      // If we didn't find both axes open, still attempt each axis independently
      const horiz = { cells: [], len: 0, ok: false };
      const vert = { cells: [], len: 0, ok: false };

      if(horizDir){
        let ccx = c + (horizDir === 'left' ? -1 : 1);
        while(ccx >= 0 && ccx < cols){
            const hcell = this.getCell(r, ccx);
            const valH = hcell ? hcell.value : null;
            if(hcell && hcell.isFilled()){ horiz.ok = horiz.cells.length > 0; break; }
            // allow extension through obstacles (value==2) so lines ignore obstacles
            if(valH !== 0 && valH !== 2) break;
          horiz.cells.push({r,c:ccx}); ccx += (horizDir === 'left' ? -1 : 1);
        }
        horiz.len = horiz.cells.length;
      }

      if(vertDir){
        let ccy = r + (vertDir === 'up' ? -1 : 1);
        while(ccy >= 0 && ccy < rows){
          const vcell = this.getCell(ccy, c);
          const valV = vcell ? vcell.value : null;
          if(vcell && vcell.isFilled()){ vert.ok = vert.cells.length > 0; break; }
          // allow extension through obstacles (value==2)
          if(valV !== 0 && valV !== 2) break;
          vert.cells.push({r:ccy,c}); ccy += (vertDir === 'up' ? -1 : 1);
        }
        vert.len = vert.cells.length;
      }

      // only collect when at least one of horiz/vert succeeded (reached captured cell)
      if(horiz.ok || vert.ok){
        // choose primary: longer of two, prefer horiz if equal
        let primary = null; if(horiz.len >= vert.len) primary = 'h'; else primary = 'v';
        groups.push({ origin: {r,c}, horiz, vert, primary });
      }
    }

    // dedupe lines across groups: build map of cell -> bestType ('primary'/'secondary')
    const cellMap = new Map();
    for(const g of groups){
      const hcells = g.horiz.cells; const vcells = g.vert.cells;
      // determine which is primary in this group
      const primaryIsH = g.primary === 'h';
      for(const idx in hcells){ const key = `${hcells[idx].r},${hcells[idx].c}`; const type = primaryIsH ? 'primary' : 'secondary'; const prev = cellMap.get(key); if(!prev || prev === 'secondary' && type === 'primary') cellMap.set(key, type); }
      for(const idx in vcells){ const key = `${vcells[idx].r},${vcells[idx].c}`; const type = primaryIsH ? 'secondary' : 'primary'; const prev = cellMap.get(key); if(!prev || prev === 'secondary' && type === 'primary') cellMap.set(key, type); }
    }

    // convert map to overlay objects: each cell with type primary -> dark green, secondary -> lime green
    const overlays = [];
    for(const [key, type] of cellMap){ const [rr,cc] = key.split(',').map(Number); overlays.push({r: rr, c: cc, type: type}); }
    // set per-cell overlayType metadata
    for(const o of overlays){ const cobj = this.getCell(o.r, o.c); if(cobj) cobj.overlayType = o.type; }
    return overlays;
  }

  // Detect caves: chambers in the uncaptured area (grid value 0) that are connected to the rest
  // of the uncaptured board through a narrow opening. This uses a distance-to-boundary approach:
  // 1) find connected empty regions, 2) compute distance from every cell to region's boundary, 3)
  //    interior seeds = cells whose distance >= depthThreshold, 4) connected seed components are
  //    candidate caves; expand them to produce a bounding box for overlay.
  detectCaves(opts = {}){
    const minSize = opts.minSize || 4; // minimum cell count for a cave
    const maxErode = typeof opts.maxErode === 'number' ? opts.maxErode : 12; // maximum erosion steps
    const caves = [];

    const rows = this.rows, cols = this.cols;

    // treat any provided overlayCells as additional walls when computing empty regions
    const overlayCells = Array.isArray(opts.overlayCells) ? opts.overlayCells : [];
    const overlaySet = new Set(overlayCells.map(x => `${x.r},${x.c}`));

    let regions = [];
    if(overlayCells.length > 0){
      // Build contiguous wall segments from overlay cells and use walls-aware flood-fill
      const byKey = new Set(overlayCells.map(x => `${x.r},${x.c}`));
      const seen = new Set();
      const walls = [];
      for(const oc of overlayCells){ const key = `${oc.r},${oc.c}`; if(seen.has(key)) continue;
        // scan horizontal and vertical contiguous runs
        let r0 = oc.r, c0 = oc.c;
        let hc0 = c0, hc1 = c0; while(byKey.has(`${r0},${hc0-1}`)) hc0--; while(byKey.has(`${r0},${hc1+1}`)) hc1++;
        let vr0 = r0, vr1 = r0; let vc = c0; while(byKey.has(`${vr0-1},${vc}`)) vr0--; while(byKey.has(`${vr1+1},${vc}`)) vr1++;
        const hlen = hc1 - hc0 + 1; const vlen = vr1 - vr0 + 1;
        if(hlen >= vlen){
          for(let cc = hc0; cc <= hc1; cc++) seen.add(`${r0},${cc}`);
          const x1 = hc0 * this.cellSize + this.cellSize/2; const x2 = hc1 * this.cellSize + this.cellSize/2; const y = r0 * this.cellSize + this.cellSize/2;
          walls.push({ x1, y1: y, x2, y2: y });
        } else {
          for(let rr = vr0; rr <= vr1; rr++) seen.add(`${rr},${vc}`);
          const y1 = vr0 * this.cellSize + this.cellSize/2; const y2 = vr1 * this.cellSize + this.cellSize/2; const x = vc * this.cellSize + this.cellSize/2;
          walls.push({ x1: x, y1, x2: x, y2 });
        }
      }
      // compute regions using walls
      regions = this.floodFillRegionsWithWalls(walls);
    } else {
      const visited = new Array(rows).fill(0).map(()=>new Array(cols).fill(false));
      const isOpen = (r,c) => { if(r<0||c<0||r>=rows||c>=cols) return false; const cc = this.getCell(r,c); if(!cc || !cc.isEmpty()) return false; return true; };
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          if(isOpen(r,c) && !visited[r][c]){
            const stack = [[r,c]]; visited[r][c] = true; const cells = [];
            while(stack.length){ const [rr,cc] = stack.pop(); cells.push({r:rr,c:cc}); const n4 = [[rr-1,cc],[rr+1,cc],[rr,cc-1],[rr,cc+1]]; for(const [nr,nc] of n4){ if(nr>=0 && nr<rows && nc>=0 && nc<cols && !visited[nr][nc] && isOpen(nr,nc)){ visited[nr][nc] = true; stack.push([nr,nc]); } } }
            regions.push({cells});
          }
        }
      }
    }
    // If overlay cells are supplied then we should treat those overlays as
    // explicit walls and simply return the connected uncaptured regions
    // (this makes the caves align exactly with lime-line overlays).
    if(overlaySet.size > 0){
      const out = [];
      const seenB = new Set();
      for(const region of regions){
        if(region.cells.length < minSize) continue;
        // compute bbox
        let rmin=Infinity, rmax=-Infinity, cmin=Infinity, cmax=-Infinity;
        for(const cc of region.cells){ rmin = Math.min(rmin, cc.r); rmax = Math.max(rmax, cc.r); cmin = Math.min(cmin, cc.c); cmax = Math.max(cmax, cc.c); }
        if(rmin === Infinity) continue;
        const key = `${rmin}:${cmin}-${rmax}:${cmax}`;
        if(seenB.has(key)) continue; seenB.add(key);
        out.push({ cells: region.cells.slice(), rmin, rmax, cmin, cmax, x: cmin*this.cellSize, y: rmin*this.cellSize, w: (cmax-cmin+1)*this.cellSize, h: (rmax-rmin+1)*this.cellSize });
      }
      for(let i=0;i<out.length;i++){
        out[i].id = i+1;
        const hue = (i * 73) % 360; out[i].color = `hsla(${hue}, 65%, 50%, 0.12)`; out[i].strokeColor = `hsla(${hue}, 65%, 40%, 0.6)`;
      }
      // mark per-cell caveId for overlay-mode caves so callers can look up cave membership
      for(const oc of out){ if(typeof oc.id === 'number'){ for(const cc of oc.cells){ const cellObj = this.getCell(cc.r, cc.c); if(cellObj) cellObj.caveId = oc.id; } } }
      console.log('Board.detectCaves (overlay mode) -> regions:', regions.length, 'caves:', out.length);
      return out;
    }

    for(const region of regions){
      if(region.cells.length < minSize) continue;

      // We'll attempt iterative erosion to find interior pockets — don't add full region by default

      // Build set for fast membership
      const regionSet = new Set(region.cells.map(c=>c.r+','+c.c));
      // working mask: false=removed/filled, true=remaining
      const remaining = new Set(region.cells.map(c=>c.r+','+c.c));
      const removedAt = new Map(); // key -> step when removed

      // iterative erosion until the remaining region splits into multiple components
      const candidates = []; // { comp: [keys], step }
      const regionCaves = [];
      for(let step=1; step<=maxErode; step++){
        // compute boundary cells (remaining cells that have neighbor outside remaining)
        const toRemove = [];
        for(const key of Array.from(remaining)){
          const [r,c] = key.split(',').map(Number);
          const neigh = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
          let isBoundary = false;
          for(const [nr,nc] of neigh){ const nk = nr+','+nc; if(!remaining.has(nk) && !regionSet.has(nk)) { isBoundary = true; break; } if(!remaining.has(nk) && regionSet.has(nk)) { isBoundary = true; break; } }
          if(isBoundary) toRemove.push(key);
        }
        if(toRemove.length === 0) break;
        for(const k of toRemove){ removedAt.set(k, step); remaining.delete(k); }

        // compute components in remaining
        const comps = [];
        const seen = new Set();
        for(const k of remaining){ if(seen.has(k)) continue; const stack=[k]; seen.add(k); const comp=[]; while(stack.length){ const cur = stack.pop(); comp.push(cur); const [cr,cc] = cur.split(',').map(Number); const neigh = [[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]]; for(const [nr,nc] of neigh){ const nk = nr+','+nc; if(remaining.has(nk) && !seen.has(nk)){ seen.add(nk); stack.push(nk); } } } comps.push(comp); }

        if(comps.length > 1){
          // we've split into multiple interior components -> these are cave seeds
          console.log('detectCaves: region split at erosion step', step, 'regionSize=', region.cells.length, 'components=', comps.map(x=>x.length));
          for(const comp of comps){
            candidates.push({comp, step});
            if(comp.length < minSize) continue;
            // expand comp across region cells but do not cross cells removed earlier than this split step
            const queue = comp.map(k => k.split(',').map(Number));
            const expanded = new Set(comp);
            while(queue.length){ const [cr,cc] = queue.shift(); const neigh = [[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]]; for(const [nr,nc] of neigh){ const nk = nr+','+nc; const removedStep = removedAt.get(nk); if(regionSet.has(nk) && !expanded.has(nk) && (removedStep === undefined || removedStep > step)){ expanded.add(nk); queue.push([nr,nc]); } } }
            const compCells = Array.from(expanded).map(k=>{ const [rr,cc] = k.split(',').map(Number); return {r:rr,c:cc}; });
            // ignore components that touch the board boundary (not enclosed)
            const touchesBorder = compCells.some(cc => cc.r === 0 || cc.r === rows-1 || cc.c === 0 || cc.c === cols-1);
            if(touchesBorder) { console.log('detectCaves: comp touches board border; skipping size=', compCells.length); continue; }
            console.log('detectCaves: comp expanded size=', compCells.length);
            // compute bounding box
            let rmin2=Infinity, rmax2=-Infinity, cmin2=Infinity, cmax2=-Infinity;
            for(const cc of compCells){ rmin2 = Math.min(rmin2, cc.r); rmax2 = Math.max(rmax2, cc.r); cmin2 = Math.min(cmin2, cc.c); cmax2 = Math.max(cmax2, cc.c); }
            if(rmin2 !== Infinity){ regionCaves.push({ cells: compCells, rmin: rmin2, rmax: rmax2, cmin: cmin2, cmax: cmax2, x: cmin2*this.cellSize, y: rmin2*this.cellSize, w: (cmax2-cmin2+1)*this.cellSize, h: (rmax2-rmin2+1)*this.cellSize }); }
          }
          // do not break - continue eroding to find deeper pockets
        }
      }

      // Process candidate components (from all steps) and expand them back; dedupe by bbox
      const seenBboxes = new Set();
      const regionSize = region.cells.length;
      const pocketFraction = typeof opts.pocketFraction === 'number' ? opts.pocketFraction : 0.2; // relative size threshold
      const pocketAbsolute = typeof opts.pocketAbsolute === 'number' ? opts.pocketAbsolute : 200; // absolute cell count threshold
      for(const cand of candidates){
        const {comp, step} = cand;
        if(comp.length < 1) continue;
        // expand comp across region cells but do not cross cells removed earlier than this split step
        const queue = comp.map(k => k.split(',').map(Number));
        const expanded = new Set(comp);
        while(queue.length){ const [cr,cc] = queue.shift(); const neigh = [[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]]; for(const [nr,nc] of neigh){ const nk = nr+','+nc; const removedStep = removedAt.get(nk); if(regionSet.has(nk) && !expanded.has(nk) && (removedStep === undefined || removedStep > step)){ expanded.add(nk); queue.push([nr,nc]); } } }
        const compCells = Array.from(expanded).map(k=>{ const [rr,cc] = k.split(',').map(Number); return {r:rr,c:cc}; });
        // ignore those that touch the absolute board boundary
        const touchesBorder = compCells.some(cc => cc.r === 0 || cc.r === rows-1 || cc.c === 0 || cc.c === cols-1);
        if(touchesBorder) { console.log('detectCaves: skipped border-touching comp size=', compCells.length, 'step=', step); continue; }
        if(compCells.length < minSize) { console.log('detectCaves: skipped small expanded comp size=', compCells.length, 'step=', step); continue; }
        let rmin2=Infinity, rmax2=-Infinity, cmin2=Infinity, cmax2=-Infinity;
        for(const cc of compCells){ rmin2 = Math.min(rmin2, cc.r); rmax2 = Math.max(rmax2, cc.r); cmin2 = Math.min(cmin2, cc.c); cmax2 = Math.max(cmax2, cc.c); }
        const key = `${rmin2}:${cmin2}-${rmax2}:${cmax2}`;
        if(seenBboxes.has(key)) continue; seenBboxes.add(key);
        regionCaves.push({ cells: compCells, rmin: rmin2, rmax: rmax2, cmin: cmin2, cmax: cmax2, x: cmin2*this.cellSize, y: rmin2*this.cellSize, w: (cmax2-cmin2+1)*this.cellSize, h: (rmax2-rmin2+1)*this.cellSize });
      }
      // accept only the full region + small pockets to avoid nested/partial large splits
      // compute bounding box for full region
      let fullRmin = Infinity, fullRmax = -Infinity, fullCmin = Infinity, fullCmax = -Infinity;
      for(const oc of region.cells){ fullRmin = Math.min(fullRmin, oc.r); fullRmax = Math.max(fullRmax, oc.r); fullCmin = Math.min(fullCmin, oc.c); fullCmax = Math.max(fullCmax, oc.c); }
      if(fullRmin !== Infinity){ const fullKey = `${fullRmin}:${fullCmin}-${fullRmax}:${fullCmax}`; if(!seenBboxes.has(fullKey)){ seenBboxes.add(fullKey); caves.push({ cells: region.cells.slice(), rmin: fullRmin, rmax: fullRmax, cmin: fullCmin, cmax: fullCmax, x: fullCmin*this.cellSize, y: fullRmin*this.cellSize, w: (fullCmax-fullCmin+1)*this.cellSize, h:(fullRmax-fullRmin+1)*this.cellSize }); }
      }
      // now add only smaller pockets from regionCaves
      for(const rc of regionCaves){ if(rc.cells.length <= Math.max(regionSize * pocketFraction, pocketAbsolute)){ const k = `${rc.rmin}:${rc.cmin}-${rc.rmax}:${rc.cmax}`; if(!seenBboxes.has(k)){ seenBboxes.add(k); caves.push(rc); } } }
    }

    // Expand each bbox outward to captured cells (grid value 1) or board border so overlays reach walls
    for(const c of caves){
      let {rmin,rmax,cmin,cmax} = c;
      // expand up until a filled cell is found in the same column span
      let newRmin = rmin;
      for(let rr = rmin-1; rr >= 0; rr--){ let found = false; for(let cc = cmin; cc <= cmax; cc++){ const check = this.getCell(rr, cc); if(check && check.isFilled()){ found = true; break; } } if(found){ newRmin = rr + 1; break; } if(rr === 0) newRmin = 0; }
      // expand down
      let newRmax = rmax;
      for(let rr = rmax+1; rr < this.rows; rr++){ let found = false; for(let cc = cmin; cc <= cmax; cc++){ const check = this.getCell(rr, cc); if(check && check.isFilled()){ found = true; break; } } if(found){ newRmax = rr - 1; break; } if(rr === this.rows-1) newRmax = this.rows-1; }
      // expand left
      let newCmin = cmin;
      for(let cc = cmin-1; cc >= 0; cc--){ let found = false; for(let rr = rmin; rr <= rmax; rr++){ const check = this.getCell(rr, cc); if(check && check.isFilled()){ found = true; break; } } if(found){ newCmin = cc + 1; break; } if(cc === 0) newCmin = 0; }
      // expand right
      let newCmax = cmax;
      for(let cc = cmax+1; cc < this.cols; cc++){ let found = false; for(let rr = rmin; rr <= rmax; rr++){ const check = this.getCell(rr, cc); if(check && check.isFilled()){ found = true; break; } } if(found){ newCmax = cc - 1; break; } if(cc === this.cols-1) newCmax = this.cols-1; }
      // update
      c.rmin = newRmin; c.rmax = newRmax; c.cmin = newCmin; c.cmax = newCmax;
      c.x = c.cmin * this.cellSize; c.y = c.rmin * this.cellSize; c.w = (c.cmax - c.cmin + 1) * this.cellSize; c.h = (c.rmax - c.rmin + 1) * this.cellSize;
    }

    // remove duplicates (by bbox) and assign ids
    const uniq = [];
    const seen = new Set();
    for(const c of caves){ const key = `${c.rmin}:${c.cmin}-${c.rmax}:${c.cmax}`; if(!seen.has(key)){ seen.add(key); uniq.push(c); } }
    for(let i=0;i<uniq.length;i++){
      uniq[i].id = i+1;
      const hue = (i * 73) % 360; uniq[i].color = `hsla(${hue}, 65%, 50%, 0.12)`; uniq[i].strokeColor = `hsla(${hue}, 65%, 40%, 0.6)`;
    }
    console.log('Board.detectCaves -> regions:', regions.length, 'caves:', uniq.length);
    if(uniq.length){
      for(const cc of uniq){ console.log('detectCaves pocket -> bbox=', cc.rmin, cc.cmin, cc.rmax, cc.cmax, 'cells=', cc.cells.length); }
    }
    // mark per-cell caveId for quick lookups
    for(const c of uniq){ for(const cc of c.cells){ const cellObj = this.getCell(cc.r, cc.c); if(cellObj) cellObj.caveId = c.id; } }
    return uniq;
  }
}
