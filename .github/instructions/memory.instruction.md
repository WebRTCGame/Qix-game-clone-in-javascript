---
applyTo: '**'
---

# User Memory

## User Preferences
- Programming languages: JavaScript
- Code style preferences: concise, small edits and minimal API surface changes
- Development environment: Browser-based Canvas game running in local HTML environment
- Communication style: concise, friendly

## Project Context
- Current project: Qix-game-clone-in-javascript (canvas-based Qix/Volfied clone)
- Recent changes: Implemented Volfied mechanics (powerups, projectiles, main & minion enemies, obstacles), added sprite assets and richer SFX
- Current focus: Visual polish — transparent sprites, rotation based on travel direction, correct sprite scaling and audio fidelity

## Coding Patterns
- Use entity properties like `vx`, `vy`, and `radius` for orientation and scaling
- Favor minimal changes to existing APIs; add `angle` where missing

## Context7 Research History
- N/A for this local update

## Conversation History
- Implemented sprite transparency and rotation support
- Updated `src/draw.js` to rotate & scale player/enemy/projectile sprites
- Added `angle` properties to `Player`, `Projectile`, and `Spark` where needed
- Cleaned up SVG backgrounds to be transparent
 - Scaled enemies by perceived region size (region size / total empty area) so isolated pockets affect enemy size independently of global percent
 - Scaled enemies by perceived region size (region size / total empty area) so isolated pockets affect enemy size independently of global percent
 - Render translucent overlay per perceived region and recompute overlays after each capture

## Notes
- Next possible steps: replace placeholder SVGs with PNG pixel-art and/or add sampled Genesis-style SFX files
- Memory updated: 2025-12-05, sprites made transparent, rotation/scaling wired into renderer
 - Memory updated: 2025-12-05, enemy scaling switched to perceived area model
 - Memory updated: 2025-12-05, region overlay visualization added and recomputed on capture
 - Memory updated: 2025-12-06, capture algorithm simplified — rasterize into a temporary grid, apply a small dilation to seal tiny gaps, detect enclosed regions on temp grid, then apply fills to real grid
 - Memory updated: 2025-12-06, simplified finalizeCapture to basic flood-fill: trail cells are committed to the real grid as filled, regions computed on the real grid, and any enemy-free region is filled; removed tempGrid dilation heuristics from capture path
 - Memory updated: 2025-12-06, refactor: added new Board class (src/board.js) to encapsulate grid state and helpers; Game now uses Board for grid operations
 - Memory updated: 2025-12-06, added cave detection to Board (src/board.js.detectCaves) and cave overlays rendering (Draw.caveRects); caves recomputed after each capture
 - Memory updated: 2025-12-06, added Cell class (src/cell.js) and migrated Board to maintain per-cell objects in this.cells
 - Memory updated: 2025-12-06, Board.setCell now keeps numeric grid and Cell.value/metadata in sync; findCapturedCorners, findType2Lines and floodFill/detectCaves were refactored to use per-cell APIs; detectCaves now tags cells with caveId and findType2Lines sets overlayType
 - Memory updated: 2025-12-06, updated Game to use Board.getCell/setCell for capture commit, region fills, spawning logic, projectile bounds and enemy sizing; Draw/HUD remain compatible with overlays and caves but can now leverage per-cell metadata
 - Memory updated: 2025-12-06, added per-enemy area labels and improved label fallback: compute region map via floodFillRegions when region overlays aren't available and guard against undefined cell lookups so labels reliably render under enemies
 - Memory updated: 2025-12-06, obstacle placement changed: place rectangular obstacle blocks with minimum size 4x4 to avoid 1x1 obstacles and improve level variety
 - Memory updated: 2025-12-06, obstacle placement changed: all obstacles are exact 4x4 blocks; player movement now treats obstacles as true walls while capturing; fully-enclosed obstacle blocks are destroyed (converted to filled) when captured
 - Memory updated: 2025-12-06, obstacle sprite added: downloaded assets/obstacle.png and Draw.grid now batches connected obstacle cells and draws a single scaled sprite per group
 - Memory updated: 2025-12-06, visual tweak: player sprite is now drawn at 300% scale (visual only; physics/collision unchanged)
 - Memory updated: 2025-12-06, visual tweak: player sprite is now drawn at 300% scale (visual only; physics/collision unchanged)
 - Memory updated: 2025-12-06, visual polish: added black, 50%-alpha drop shadows for player and enemies; shadows use the sprite shape, same rotation, offset +40px X/Y
 - Memory updated: 2025-12-06, fixed shadow compositor bug: drawShadow now uses an offscreen canvas to avoid altering main ctx compositing state which could cause rendering to go black
 - Memory updated: 2025-12-06, adjusted drop shadow offset: shadows now offset +20px X/Y (previously +40px)
 - Memory updated: 2025-12-06, obstacle shadows: added drop shadows for grouped obstacle sprites (drawn before obstacle sprite render)
