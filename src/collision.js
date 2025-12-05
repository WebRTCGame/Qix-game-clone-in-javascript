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
