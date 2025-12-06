export function orient(p, q, r){
  return (q.y-p.y)*(r.x-q.x) - (q.x-p.x)*(r.y-q.y);
}
export function onSegment(p, q, r){
  return Math.min(p.x,r.x) <= q.x && q.x <= Math.max(p.x,r.x) && Math.min(p.y,r.y) <= q.y && q.y <= Math.max(p.y,r.y);
}

export function linesIntersect(a1, a2, b1, b2){
  const o1 = orient(a1,a2,b1);
  const o2 = orient(a1,a2,b2);
  const o3 = orient(b1,b2,a1);
  const o4 = orient(b1,b2,a2);
  if(o1 === 0 && onSegment(a1,b1,a2)) return true;
  if(o2 === 0 && onSegment(a1,b2,a2)) return true;
  if(o3 === 0 && onSegment(b1,a1,b2)) return true;
  if(o4 === 0 && onSegment(b1,a2,b2)) return true;
  return (o1>0 && o2<0 || o1<0 && o2>0) && (o3>0 && o4<0 || o3<0 && o4>0);
}

export function pointToSegmentDistance(px, py, ax, ay, bx, by){
  const vx = bx - ax; const vy = by - ay;
  const wx = px - ax; const wy = py - ay;
  const c1 = vx*wx + vy*wy;
  const c2 = vx*vx + vy*vy;
  const t = c2 === 0 ? 0 : Math.max(0, Math.min(1, c1 / c2));
  const dx = ax + vx*t - px; const dy = ay + vy*t - py;
  return Math.hypot(dx,dy);
}
export function circleRectPenetration(cx, cy, radius, rx, ry, rw, rh){
  // find closest point in rect to circle center
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  let dx = cx - nearestX; let dy = cy - nearestY;
  let dist = Math.hypot(dx, dy);
  // if center is inside rect, choose smallest axis penetration normal
  if(dist === 0){
    // compute distances to each side
    const left = Math.abs(cx - rx);
    const right = Math.abs((rx + rw) - cx);
    const top = Math.abs(cy - ry);
    const bottom = Math.abs((ry + rh) - cy);
    const minSide = Math.min(left, right, top, bottom);
    if(minSide === left){ dx = 1; dy = 0; dist = left; }
    else if(minSide === right){ dx = -1; dy = 0; dist = right; }
    else if(minSide === top){ dx = 0; dy = 1; dist = top; }
    else { dx = 0; dy = -1; dist = bottom; }
  }
  const penetration = radius - dist;
  if(penetration > 0){
    const nx = dx === 0 && dy === 0 ? 0 : dx / (dist || 1);
    const ny = dx === 0 && dy === 0 ? 0 : dy / (dist || 1);
    return { penetration, nx, ny, nearestX, nearestY };
  }
  return null;
}

export function reflectVector(vx, vy, nx, ny){
  const d = vx*nx + vy*ny;
  return { x: vx - 2*d*nx, y: vy - 2*d*ny };
}
