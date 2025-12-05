export default class Input {
  constructor(){
    this.keys = new Set();
    this.dir = {x:0,y:0};
    this.lastKey = null;
    this.setup();
  }
  setup(){
    window.addEventListener('keydown', (e)=>{ this.keys.add(e.key); });
    window.addEventListener('keyup', (e)=>{ this.keys.delete(e.key); });
  }
  getDirection(){
    // cardinal movements only: prefer last key direction
    let x=0,y=0;
    const keyMap = {
      'ArrowUp':'up','w':'up','W':'up',
      'ArrowDown':'down','s':'down','S':'down',
      'ArrowLeft':'left','a':'left','A':'left',
      'ArrowRight':'right','d':'right','D':'right'
    };
    // update lastKey based on keys pressed
    for(const k of this.keys){
      if(keyMap[k]) this.lastKey = keyMap[k];
    }
    const lk = this.lastKey;
    if(lk === 'up') y=-1;
    else if(lk === 'down') y=1;
    else if(lk === 'left') x=-1;
    else if(lk === 'right') x=1;
    this.dir.x = x; this.dir.y = y; return this.dir;
  }
  isKeyPressed(k){
    return this.keys.has(k);
  }
}
