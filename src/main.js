// Cache-bust module imports during development to avoid stale browser caches
import Game from './game.js?t=20251207-01';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const game = new Game(canvas, ctx);

window.addEventListener('load', () => {
  game.init();
});

window.addEventListener('resize', () => {
  // keep canvas fixed to 800x800 - no resize logic
});

export default game;
