Qix Clone - HTML5 + Canvas

This is a simplified Qix clone implemented in JavaScript using HTML Canvas.

Files:
- Index.html: main page
- styles.css: simple styling
- src/main.js: bootstraps the game
- src/constants.js: game constants and configuration
- src/grid.js: grid utilities, flood-fill region detection
- src/collision.js: line/segment collision helpers
- src/game.js: core game logic (glue, actors, levels)
- src/player.js: player, sparks, and movement
- src/enemy.js: inner roaming enemies
- src/sparx.js: edge-walking Sparx with Super state
- src/draw.js: drawing helpers
- src/input.js: keyboard input
- src/particles.js: particle manager
- src/hud.js: HUD helpers for updating UI
- src/sound.js: simple WebAudio beep sounds
- src/spark.js: Spark projectile
- src/utils.js: compatibility wrapper re-exporting helpers (deprecated)

Controls:
- Arrow keys (or WASD): move player
- Shift: slow draw (double points while drawing)
- R: restart
- P: pause

Notes/TODO:
- This is a simplified clone. It uses a grid and flood-fill to detect captured areas.
- Enemies generate sparks on colliding trail; sparks travel to player to kill them.
- Enemy size is proportional to the area of the region they are in.
- Player has 3 lives; sparks or fuse/death reduce lives and cause respawn.
- If player stops while drawing, a fuse will start and burn along the trail; if it reaches the player, a life is lost.
- Holding `Shift` while drawing sets slow draw mode: successful captures entirely made while holding shift award double points.
- Press `P` to pause the game.
- Split Qix (enemies) into separate regions to increase score multiplier for future captures (ongoing multiplier shown in HUD).
- Each level increases difficulty by adding more inner enemies and additional Sparx that walk the edges.
- Splitting the enemies between regions or capturing enough area will advance the level and add more enemies.
- Splitting enemies also increases a persistent score multiplier and will spawn more enemies.
- Sparx enemies may temporarily enter a "Super" state (indicated in HUD), where they chase and speed up for several seconds; in Super state Sparx will chase the player's trail (if present) instead of the player center.
- High score is saved to your browser's localStorage and shown in the HUD.

How to run:
- Open Index.html in a modern browser (Chrome/Edge/Firefox) that supports ES modules.
- The game is locked to 30 fps and runs on a 800x800 canvas.
