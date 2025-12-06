export default class Cell {
  constructor(r, c, value = 0, cellSize = 16){
    this.r = r; this.c = c; this.value = value; this.cellSize = cellSize;
    // overlay / classification metadata
    this.overlayType = null; // 'primary'|'secondary' or null
    this.caveId = null; // id of cave this cell belongs to (if assigned)
    this.visited = false; // utility flag for searches
  }

  isEmpty(){ return this.value === 0; }
  isFilled(){ return this.value === 1; }
  isObstacle(){ return this.value === 2; }
  setValue(v){ this.value = v; }
  worldPos(){ return { x: this.c * this.cellSize + this.cellSize/2, y: this.r * this.cellSize + this.cellSize/2 }; }
}
