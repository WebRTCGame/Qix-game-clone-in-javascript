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
  // per-level music file (path relative to repo). If not provided, default to assets/Music/levelNN.mp3
  lvl.music = typeof lvl.music === 'string' ? lvl.music : `assets/Music/level${String(n).padStart(2,'0')}.mp3`;
  // enemyConfig defaults
  lvl.enemyConfig = lvl.enemyConfig || {};
  // default projectile settings for enemy weapons (can be overridden per-level or per-enemy)
  lvl.enemyConfig.projectile = Object.assign({ size: 3, speed: 120, life: 3, burstCount: 5, burstSpread: 1.09955742876, radialCount: 8, axesCount: 4 }, lvl.enemyConfig.projectile || {});
  // sensible defaults for segments: allow per-level `main.segments` or `enemyConfig.main.segments` to override
  // prefer explicit enemyConfig.* values over per-instance `main` when present
  const mainDefaultSegments = (typeof lvl.enemyConfig?.main?.segments === 'number') ? lvl.enemyConfig.main.segments : (typeof lvl.main?.segments === 'number' ? lvl.main.segments : 5);
  const minionDefaultSegments = (typeof lvl.enemyConfig?.minion?.segments === 'number') ? lvl.enemyConfig.minion.segments : (typeof lvl.minion?.segments === 'number' ? lvl.minion.segments : 3);
  const mainDefaultSegDist = (typeof lvl.enemyConfig?.main?.segmentDistance === 'number') ? lvl.enemyConfig.main.segmentDistance : (typeof lvl.main?.segmentDistance === 'number' ? lvl.main.segmentDistance : null);
  const minionDefaultSegDist = (typeof lvl.enemyConfig?.minion?.segmentDistance === 'number') ? lvl.enemyConfig.minion.segmentDistance : null;
  // merge: per-instance `main` values are defaults, then apply `enemyConfig.main` overrides so enemyConfig takes precedence
  lvl.enemyConfig.main = Object.assign({ minSpeed: 30, maxSpeed: 80, acceleration: 6, minSize: 6, maxSize: 14, hp: lvl.main.hp || 3, color: lvl.main.color || '#ff4500', segments: mainDefaultSegments, segmentSpeed: lvl.main?.segmentSpeed || 150, maxSegmentDist: lvl.main?.maxSegmentDist, segmentDistance: mainDefaultSegDist }, lvl.main || {}, lvl.enemyConfig.main || {});
  // minion: allow enemyConfig.minion to override defaults
  lvl.enemyConfig.minion = Object.assign({ minSpeed: 40, maxSpeed: 140, acceleration: 8, minSize: 3, maxSize: 8, segments: minionDefaultSegments, segmentSpeed: lvl.enemyConfig?.minion?.segmentSpeed || 120, segmentDistance: minionDefaultSegDist }, lvl.enemyConfig.minion || {});

  // allow a simple baseSize value to be provided — if present and minSize/maxSize weren't explicitly set, use baseSize
  if(typeof lvl.enemyConfig.main.baseSize === 'number'){
    if(typeof lvl.enemyConfig.main.minSize !== 'number' && typeof lvl.enemyConfig.main.maxSize !== 'number'){
      lvl.enemyConfig.main.minSize = lvl.enemyConfig.main.maxSize = lvl.enemyConfig.main.baseSize;
    }
  }
  if(typeof lvl.enemyConfig.minion.baseSize === 'number'){
    if(typeof lvl.enemyConfig.minion.minSize !== 'number' && typeof lvl.enemyConfig.minion.maxSize !== 'number'){
      lvl.enemyConfig.minion.minSize = lvl.enemyConfig.minion.maxSize = lvl.enemyConfig.minion.baseSize;
    }
  }

  // link projectile defaults into per-enemy configs unless overridden
  if(typeof lvl.enemyConfig.main.bulletSize !== 'number') lvl.enemyConfig.main.bulletSize = lvl.enemyConfig.projectile.size;
  if(typeof lvl.enemyConfig.main.bulletSpeed !== 'number') lvl.enemyConfig.main.bulletSpeed = lvl.enemyConfig.projectile.speed;
  if(typeof lvl.enemyConfig.minion.bulletSize !== 'number') lvl.enemyConfig.minion.bulletSize = lvl.enemyConfig.projectile.size;
  if(typeof lvl.enemyConfig.minion.bulletSpeed !== 'number') lvl.enemyConfig.minion.bulletSpeed = lvl.enemyConfig.projectile.speed;

  // merge the global projectile options into each per-enemy section so they are available
  lvl.enemyConfig.main.projectile = Object.assign({}, lvl.enemyConfig.projectile || {}, lvl.enemyConfig.main.projectile || {});
  lvl.enemyConfig.minion.projectile = Object.assign({}, lvl.enemyConfig.projectile || {}, lvl.enemyConfig.minion.projectile || {});

  // obstacle defaults
  lvl.obstacleConfig = lvl.obstacleConfig || { baseW: 4, baseH: 4 };
  return lvl;
}

export default { loadLevel, count: DEFAULT_COUNT };
