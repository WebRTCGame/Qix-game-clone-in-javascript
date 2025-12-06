// Per-level definitions inspired by Volfied / Ultimate Qix (Genesis)
// Keep values simple — the game will pick a level config based on current level index
export default [
  { name: 'Neo City', bg:'#0b1220', fill:'#1e90ff', main:{hp:4,color:'#ff4500'}, minions:4, obstacles:8, powerups:1 },
  { name: 'Verdant Core', bg:'#06130c', fill:'#63c36b', main:{hp:5,color:'#ff8c00'}, minions:4, obstacles:12, powerups:1 },
  { name: 'Sunforge', bg:'#201006', fill:'#ffb347', main:{hp:6,color:'#ff3b3b'}, minions:5, obstacles:14, powerups:1 },
  { name: 'Aether Lab', bg:'#141018', fill:'#b37bff', main:{hp:5,color:'#ffd166'}, minions:5, obstacles:18, powerups:2 },
  { name: 'Blue Rift', bg:'#001429', fill:'#6bb3ff', main:{hp:7,color:'#ffcc00'}, minions:6, obstacles:20, powerups:2 },
  { name: 'Crimson Barrens', bg:'#1a0707', fill:'#ff6b6b', main:{hp:8,color:'#ff6699'}, minions:6, obstacles:24, powerups:2 },
  { name: 'Iron Heart', bg:'#0f0f10', fill:'#a0a0ff', main:{hp:8,color:'#ff8844'}, minions:6, obstacles:28, powerups:3 },
  { name: 'Final Node', bg:'#08080b', fill:'#f0e68c', main:{hp:10,color:'#ff3333'}, minions:8, obstacles:30, powerups:3 }
];
