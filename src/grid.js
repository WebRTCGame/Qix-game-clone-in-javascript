import { ROWS, COLS, CELL } from './constants.js';
import { linesIntersect } from './collision.js';

export function neighbors4(r, c, rows=ROWS, cols=COLS){
  const n = [];
  if(r>0) n.push([r-1,c]);
  if(r<rows-1) n.push([r+1,c]);
  if(c>0) n.push([r,c-1]);
  if(c<cols-1) n.push([r,c+1]);
  return n;
}

export function createGrid(){
  return new Array(ROWS).fill(0).map(()=>new Array(COLS).fill(0));
}

export function resetGrid(grid){
  for(let r=0; r<ROWS; r++){
    for(let c=0; c<COLS; c++){
      if(r===0||c===0||r===ROWS-1||c===COLS-1){
        grid[r][c] = 1; // filled
      } else {
        grid[r][c] = 0; // empty
      }
    }
  }
}

export function cellFor(x, y){
  const r = Math.min(ROWS-1, Math.max(0, Math.floor(y / CELL)));
  const c = Math.min(COLS-1, Math.max(0, Math.floor(x / CELL)));
  return {r,c};
}

export function worldForCell(r,c){
  const x = c*CELL + CELL/2;
  const y = r*CELL + CELL/2;
  return {x,y};
}

export function floodFillRegions(grid){
  const rows = grid.length; const cols = grid[0].length;
  const visited = new Array(rows).fill(0).map(()=>new Array(cols).fill(false));
  const regions = [];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(grid[r][c] === 0 && !visited[r][c]){
        const stack = [[r,c]]; visited[r][c]=true; const cells = [];
        while(stack.length){
          const [rr,cc] = stack.pop();
          cells.push({r:rr,c:cc});
          const n4 = neighbors4(rr,cc,rows,cols);
          for(const [nr,nc] of n4){
            if(!visited[nr][nc] && grid[nr][nc]===0){ visited[nr][nc]=true; stack.push([nr,nc]); }
          }
        }
        regions.push({cells});
      }
    }
  }
  return regions;
}

// Flood-fill regions but treat arbitrary wall segments (in world coordinates) as impassable
export function floodFillRegionsWithWalls(grid, walls=[]){
  const rows = grid.length; const cols = grid[0].length;
  const visited = new Array(rows).fill(0).map(()=>new Array(cols).fill(false));
  const regions = [];
  // precompute whether movement between two adjacent cells crosses any wall
  function canMove(r1,c1,r2,c2){
    if(r2<0||c2<0||r2>=rows||c2>=cols) return false;
    if(grid[r2][c2] !== 0) return false; // only move into empty cells
    // if from cell is not empty, disallow
    if(grid[r1][c1] !== 0) return false;
    // compute centers in world coords
    const x1 = c1 * CELL + CELL/2; const y1 = r1 * CELL + CELL/2;
    const x2 = c2 * CELL + CELL/2; const y2 = r2 * CELL + CELL/2;
    // check every wall segment
    for(const w of walls){
      const a = { x: w.x1, y: w.y1 }, b = { x: w.x2, y: w.y2 };
      const p1 = { x: x1, y: y1 }, p2 = { x: x2, y: y2 };
      if(linesIntersect(p1,p2,a,b)) return false;
    }
    return true;
  }

  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(grid[r][c] === 0 && !visited[r][c]){
        const stack = [[r,c]]; visited[r][c]=true; const cells = [];
        while(stack.length){
          const [rr,cc] = stack.pop();
          cells.push({r:rr,c:cc});
          const neigh = [[rr-1,cc],[rr+1,cc],[rr,cc-1],[rr,cc+1]];
          for(const [nr,nc] of neigh){
            if(nr>=0 && nr<rows && nc>=0 && nc<cols && !visited[nr][nc] && canMove(rr,cc,nr,nc)){
              visited[nr][nc] = true; stack.push([nr,nc]);
            }
          }
        }
        regions.push({cells});
      }
    }
  }
  return regions;
}
