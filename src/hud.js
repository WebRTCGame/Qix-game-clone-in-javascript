export function setPercent(val){ const el = document.getElementById('percent'); if(el) el.textContent = `Captured: ${val}%`; }
export function setScore(val){ const el = document.getElementById('score'); if(el) el.textContent = `Score: ${val}`; }
export function setLives(val){ const el = document.getElementById('lives'); if(el) el.textContent = `Lives: ${val}`; }
export function setLevel(val){ const el = document.getElementById('level'); if(el) el.textContent = `Level: ${val}`; }
export function setMultiplier(val){ const el = document.getElementById('mult'); if(el) el.textContent = `Multiplier: x${val}`; }
export function setStatus(text){ const el = document.getElementById('status'); if(el) el.textContent = `Status: ${text}`; }
export function setHighScore(val, flash=false){ const el = document.getElementById('highscore'); if(!el) return; el.textContent = `High: ${val}`; if(flash){ el.style.color = '#ff0'; setTimeout(()=>{ el.style.color = ''; }, 1200); } }
export function setSuperText(text){ const el = document.getElementById('super'); if(el) el.textContent = text || ''; }
