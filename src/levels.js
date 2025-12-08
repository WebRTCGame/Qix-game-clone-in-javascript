// Per-level definitions inspired by Volfied / Ultimate Qix (Genesis)
// Keep values simple — the game will pick a level config based on current level index
// Level loader: fetch per-level JSON from assets/levels/levelNN.json
const DEFAULT_COUNT = 16;

function _wrapIndex(n){
  const max = DEFAULT_COUNT || 1;
  // ensure 1..max
  const idx = ((n - 1) % max + max) % max + 1;
  return idx;
}

async function loadLevel(n){
  // wrap into the configured level count so we loop properly
  const wrapped = _wrapIndex(n);
  const idx = String(wrapped).padStart(2,'0');
  const path = `assets/levels/level${idx}.json`;
  try{
    const res = await fetch(path, { cache: 'no-cache' });
    if(!res.ok) throw new Error('fetch failed');
    const j = await res.json();
    // normalize returned JSON to ensure expected fields exist
    return normalizeLevel(j, wrapped);
  }catch(e){
    // fallback to a simple default object so game doesn't crash
    return normalizeLevel({
      name: `Level ${wrapped}`,
      bg: '#000',
      fill: '#1e90ff',
      bgUncaptured: `assets/backgrounds/level${idx}/uncaptured.png`,
      bgCaptured: `assets/backgrounds/level${idx}/captured.png`,
      main: { hp: Math.max(3, Math.floor(3 + wrapped/2)), color: '#ff4500' },
      minions: [],
      obstacles: [],
      powerups: 1
    }, wrapped);
  }
}

function normalizeLevel(raw, n){
  const lvl = Object.assign({}, raw || {});
  lvl.name = lvl.name || `Level ${n}`;
  lvl.bg = lvl.bg || '#000';
  lvl.fill = lvl.fill || '#1e90ff';
  lvl.bgUncaptured = lvl.bgUncaptured || `assets/backgrounds/level${String(n).padStart(2,'0')}/uncaptured.png`;
  lvl.bgCaptured = lvl.bgCaptured || `assets/backgrounds/level${String(n).padStart(2,'0')}/captured.png`;
  lvl.enemyImages = lvl.enemyImages || { main: 'assets/enemy_main.svg', minion: 'assets/enemy_minion.svg', projectile: 'assets/projectile.svg', powerup: 'assets/powerup.svg' };
  lvl.obstacleImage = lvl.obstacleImage || 'assets/obstacle.png';
  lvl.main = lvl.main || { hp: 3, color: '#ff4500' };
  lvl.minions = Array.isArray(lvl.minions) ? lvl.minions : [];
  lvl.obstacles = Array.isArray(lvl.obstacles) ? lvl.obstacles : [];
  lvl.powerups = typeof lvl.powerups === 'number' ? lvl.powerups : 1;
  // enemyConfig defaults
  lvl.enemyConfig = lvl.enemyConfig || {};
  lvl.enemyConfig.main = Object.assign({ minSpeed: 30, maxSpeed: 80, acceleration: 6, minSize: 6, maxSize: 14, hp: lvl.main.hp || 3, color: lvl.main.color || '#ff4500' }, lvl.enemyConfig.main || {}, lvl.main);
  lvl.enemyConfig.minion = Object.assign({ minSpeed: 40, maxSpeed: 140, acceleration: 8, minSize: 3, maxSize: 8 }, lvl.enemyConfig.minion || {});
  return lvl;
}

export default { loadLevel, count: DEFAULT_COUNT };
