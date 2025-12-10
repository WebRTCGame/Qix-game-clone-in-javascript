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
-- src/enemy.js: inner roaming enemies
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
-- Each level increases difficulty by adding more inner enemies.
- Splitting the enemies between regions or capturing enough area will advance the level and add more enemies.
- Splitting enemies also increases a persistent score multiplier and will spawn more enemies.
 - If you enclose an enemy into a region significantly smaller than the largest remaining region it will be destroyed and converted into score/particles (configurable threshold).
- High score is saved to your browser's localStorage and shown in the HUD.

How to run:
- Open Index.html in a modern browser (Chrome/Edge/Firefox) that supports ES modules.
- The game is locked to 30 fps and runs on a 800x800 canvas.

Per-level music
- Place MP3 files in assets/Music/. By default levels will look for files named `levelNN.mp3` (e.g. level01.mp3).
- To override the default, add a `music` field to a level JSON in `assets/levels/levelNN.json` with a path (for example `assets/Music/mytrack.mp3`).
 - Background music now gradually speeds up during a level: playback rate increases smoothly by 0.1 per minute of level time (e.g. 1.1 at 60s, 1.2 at 120s).
	 The game will attempt to enable pitch-preserving playback when the browser supports it, but behavior varies by browser — changing speed may still alter pitch on some platforms.

Sound effects (assets/sounds)
- spark.mp3: slide1 (Sethroph @ FreeSound) — CC0 — https://freesound.org/s/323420/
- die.mp3: cannon2 (Isaac200000 @ FreeSound) — CC0 — https://freesound.org/s/184650/
- hit.mp3: punch1 (Vladimir @ Soundbible) — CC0 — http://soundbible.com/1952-Punch-Or-Whack.html
- pop.mp3: click3 (coobek @ FreeSound) — CC0 — https://freesound.org/s/185611/
- powerup.mp3: resonance2 (KP @ Soundbible) — CC0 — http://soundbible.com/1639-Power-Up.html
- shoot.mp3: beep5 (Soundwarf @ FreeSound) — CC0 — https://freesound.org/s/387532/
- split.mp3: scale3 (Big Daddy @ Soundbible) — CC0 — http://soundbible.com/1619-Music-Box.html
- super.mp3: fanfare1 (_MC5_ @ FreeSound) — CC-BY-3.0 — https://freesound.org/s/524849/
- capture.mp3: resonance1 (KP @ Soundbible) — CC0 — http://soundbible.com/1686-Appear.html
- powerup_spawn.mp3: click5 (jorickhoofd @ FreeSound) — CC-BY-3.0 — https://freesound.org/s/160052/
- enemy_fire.mp3: beep6 (kickhat @ FreeSound) — CC0 — https://freesound.org/s/264446/
- level_start.mp3: jingle1 (umwelt @ FreeSound) — CC-BY-3.0 — https://freesound.org/s/67760/

These audio files were downloaded from the SoundFX collection (https://github.com/rse/soundfx) which aggregates freely-licensed SFX. Files marked CC-BY require attribution and are listed above with origin links.
