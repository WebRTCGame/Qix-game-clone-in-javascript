const fs = require('fs');
const path = require('path');

const levelsDir = path.join(__dirname, '..', 'assets', 'levels');
const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json')).sort();
let failed = false;
console.log('Validating', files.length, 'level files');
for(const f of files){
  const p = path.join(levelsDir, f);
  try{
    const raw = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(raw);
    const name = j.name || '(no-name)';
    // basic checks
    if(j.player){ console.error(`${f}: contains forbidden 'player' property`); failed = true; }
    if(!j.main){ console.error(`${f}: missing main enemy definition`); failed = true; }
    if(!j.enemyConfig || !j.enemyConfig.main || !j.enemyConfig.minion){ console.error(`${f}: missing enemyConfig.main or enemyConfig.minion`); failed = true; }
    if(!j.enemyConfig.projectile || typeof j.enemyConfig.projectile.size !== 'number' || typeof j.enemyConfig.projectile.speed !== 'number'){
      console.error(`${f}: missing enemyConfig.projectile with numeric size/speed`); failed = true;
    } else {
      // check optional weapon tuning values exist and are numeric if present
      const p = j.enemyConfig.projectile;
      if(typeof p.life !== 'number') console.warn(`${f}: projectile.life missing or non-numeric — default used`);
      if(typeof p.burstCount !== 'number') console.warn(`${f}: projectile.burstCount missing or non-numeric — default used`);
      if(typeof p.burstSpread !== 'number') console.warn(`${f}: projectile.burstSpread missing or non-numeric — default used`);
      if(typeof p.radialCount !== 'number') console.warn(`${f}: projectile.radialCount missing or non-numeric — default used`);
      if(typeof p.axesCount !== 'number') console.warn(`${f}: projectile.axesCount missing or non-numeric — default used`);
    }
    if(!Array.isArray(j.minions) && !j.delayedSpawns && !j.minibosses){ console.warn(`${f}: no minions, minibosses or delayed spawns — level may be empty`); }
    // count expected spawns
    let expected = 0;
    if(j.main) expected += 1;
    if(Array.isArray(j.minions)) expected += j.minions.length;
    if(Array.isArray(j.minibosses)) expected += j.minibosses.length;
    if(Array.isArray(j.delayedSpawns)) expected += j.delayedSpawns.length;
    // basic validation of positions
    function validPos(o){ return o && typeof o.x === 'number' && typeof o.y === 'number'; }
    if(j.main && !validPos(j.main)) console.warn(`${f}: main enemy missing x/y — will be placed randomly`);
    if(Array.isArray(j.minions)){
      for(let i=0;i<j.minions.length;i++) if(!validPos(j.minions[i])) console.warn(`${f}: minion[${i}] missing x/y`);
    }
    if(Array.isArray(j.minibosses)){
      for(let i=0;i<j.minibosses.length;i++) if(!validPos(j.minibosses[i])) console.warn(`${f}: miniboss[${i}] missing x/y`);
    }
    if(Array.isArray(j.delayedSpawns)){
      for(let i=0;i<j.delayedSpawns.length;i++){
        const d = j.delayedSpawns[i]; if(typeof d.delay !== 'number') console.warn(`${f}: delayedSpawns[${i}] missing numeric delay; default used`);
      }
    }
    // ensure enemy size info exists (either min/max OR a baseSize)
    function hasSizeInfo(obj){ return (obj && ((typeof obj.minSize === 'number' && typeof obj.maxSize === 'number') || typeof obj.baseSize === 'number')); }
    if(!hasSizeInfo(j.enemyConfig?.main) || !hasSizeInfo(j.enemyConfig?.minion)){
      console.error(`${f}: missing size info for enemyConfig.main/minion (need minSize/maxSize or baseSize)`); failed = true;
    }
    console.log(`${f}: ${name} — expected spawnCount=${expected}`);
  }catch(err){ console.error('Failed to parse', f, err); failed = true; }
}
if(failed){ console.error('\nValidation failed'); process.exit(2); } else { console.log('\nAll level files validated'); process.exit(0); }