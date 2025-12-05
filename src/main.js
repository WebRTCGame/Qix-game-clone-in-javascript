import Game from './game.js';

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
