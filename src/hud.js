export function setPercent(val){ const el = document.getElementById('percent'); if(!el) return; const v = Number(val); el.textContent = `Captured: ${v.toFixed(2)}%`; }
export function setScore(val){ const el = document.getElementById('score'); if(el) el.textContent = `Score: ${val}`; }
export function setLives(val){ const el = document.getElementById('lives'); if(el) el.textContent = `Lives: ${val}`; }
export function setLevel(val){ const el = document.getElementById('level'); if(el) el.textContent = `Level: ${val}`; }
export function setMultiplier(val){ const el = document.getElementById('mult'); if(el) el.textContent = `Multiplier: x${val}`; }
export function setStatus(text){ const el = document.getElementById('status'); if(el) el.textContent = `Status: ${text}`; }
export function setHighScore(val, flash=false){ const el = document.getElementById('highscore'); if(!el) return; el.textContent = `High: ${val}`; if(flash){ el.style.color = '#ff0'; setTimeout(()=>{ el.style.color = ''; }, 1200); } }
export function setSuperText(text){ const el = document.getElementById('super'); if(el) el.textContent = text || ''; }
export function setEnemies(current, total){ const el = document.getElementById('enemies'); if(!el) return; el.textContent = `Enemies ${current} of ${total}`; }
export function setPowerup(type, ttl){ const el = document.getElementById('powerup'); if(!el) return; el.textContent = type ? `Powerup: ${type}${ttl?(' ('+ttl.toFixed(1)+'s)'):''}` : ''; }
export function setAmmo(ammo){ const el = document.getElementById('ammo'); if(!el) return; el.textContent = `Ammo: ${ammo}`; }
export function setBossHP(hp, max){ const el = document.getElementById('bosshp'); if(!el) return; if(hp === null) el.textContent = ''; else el.textContent = `Boss HP: ${hp}/${max}`; }
export function setLevelName(name){ const el = document.getElementById('levelname'); if(!el) return; el.textContent = name ? `Stage: ${name}` : ''; }

// Display detected cave/area overlays. `caves` is an array of cave objects
// returned from Board.detectCaves. Each cave should include `id` and `color`.
export function setCaves(caves){ const cnt = (caves && caves.length) ? caves.length : 0; const el = document.getElementById('areas-count'); if(el) el.textContent = `Areas: ${cnt}`; const list = document.getElementById('areas-list'); if(!list) return; list.innerHTML = ''; if(!caves || !caves.length) return; for(const c of caves){ const wrapper = document.createElement('div'); wrapper.style.display = 'flex'; wrapper.style.alignItems = 'center'; wrapper.style.gap = '6px'; const sw = document.createElement('div'); sw.style.width = '20px'; sw.style.height = '14px'; sw.style.background = c.color || 'rgba(48,200,255,0.12)'; sw.style.border = `1px solid ${c.strokeColor || 'rgba(48,200,255,0.6)'}`; sw.style.borderRadius = '2px'; const label = document.createElement('div'); label.style.fontSize = '12px'; label.style.color = '#ddd'; label.textContent = `#${c.id} (${c.cells.length})`; wrapper.appendChild(sw); wrapper.appendChild(label); list.appendChild(wrapper); } }
