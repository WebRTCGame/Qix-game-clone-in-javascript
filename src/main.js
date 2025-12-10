// Cache-bust module imports during development to avoid stale browser caches
import Game from './game.js?t=20251207-01';
import LEVELS from './levels.js';
import { initLevelSidebar } from './hud.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const game = new Game(canvas, ctx);
// expose global for quick debug console access
window.game = game;

window.addEventListener('load', () => {
  game.init();
  // initialize debug level sidebar (non-blocking) — clicking will jump to a level
  try{ initLevelSidebar(LEVELS.count, { onClick: (n) => { try{ game.gotoLevel(n); }catch(e){ console.warn('Jump failed', e); } } }); }catch(e){}
});

window.addEventListener('resize', () => {
  // keep canvas fixed to 800x800 - no resize logic
});

export default game;
