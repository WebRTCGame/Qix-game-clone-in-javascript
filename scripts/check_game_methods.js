const fs = require('fs');
const s = fs.readFileSync('src/game.js','utf8').split('\n');
let depth=0, inClass=false, classDepth=0;
let methods = [];
for(let i=0;i<s.length;i++){
  const line = s[i];
  if(line.match(/export\s+default\s+class\s+\w+/)) { inClass=true; classDepth=depth; }
  const m = line.match(/^\s*(async\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
  if(inClass && m && m[2] !== 'constructor'){
    methods.push({name:m[2], start:i+1, startDepth:depth});
  }
  if(inClass && line.match(/^\s*constructor\s*\(/)) methods.unshift({name:'constructor', start:i+1, startDepth:depth});
  const opens = (line.match(/{/g)||[]).length;
  const closes = (line.match(/}/g)||[]).length;
  depth += opens - closes;
  if(inClass && depth <= classDepth) inClass=false;
}

const results = methods.map(m=>{
  let d = m.startDepth;
  let depthNow = d;
  for(let i=m.start; i < s.length; i++){
    const line = s[i];
    const o = (line.match(/{/g)||[]).length;
    const c = (line.match(/}/g)||[]).length;
    depthNow += o - c;
    if(depthNow <= m.startDepth) return {name:m.name, start:m.start, end:i+1};
  }
  return {name:m.name, start:m.start, end:null};
});

let missing = [];
for(const r of results){
  console.log(r.name.padEnd(30)+ ' start:'+String(r.start).padEnd(6)+ ' end:'+ (r.end||'MISSING'));
  if(!r.end) missing.push(r);
}
console.log('\nMissing ends: '+missing.length);
if(missing.length) process.exit(1);
else process.exit(0);
