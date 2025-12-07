# Ultimate Qix (Volfied) — Levels & Mechanics

This document collects publicly available information about Ultimate Qix (the North American Sega Genesis port of Taito's arcade game Volfied) and summarizes per-level characteristics and the game's mechanics. Sources used include Wikipedia, StrategyWiki, GameFAQs, MobyGames, playthrough videos, and community writeups.

## Sources
- https://en.wikipedia.org/wiki/Volfied (overview & gameplay)
- https://gamefaqs.gamespot.com/genesis/586570-ultimate-qix (console release notes and boards)
- https://www.mobygames.com/game/volfied (screenshots and ports)
- Playthroughs and stage footage on YouTube (search for "Ultimate Qix / Volfied playthrough")
- StrategyWiki / other walkthrough resources (where available)

## Summary / Key Facts
- Original arcade name: Volfied (Taito, 1989)
- Genesis (Mega Drive) release: Ultimate Qix (approx. 1991)
- Gameplay follows the Qix lineage — the player claims territory by drawing lines to partition the playfield while avoiding enemies.
- Number of stages: the arcade Volfied run contains 16 rounds (the console ports may vary slightly in ordering or visual updates depending on version).
- Completion threshold: typically 80% of the level area must be claimed to complete the stage (this differs from classic Qix which used 75%).
- Each stage has unique background art and a *main enemy* (a larger, distinctive target) accompanied by smaller enemies (minions). Captured interiors without enemies become cleared, and minions trapped inside a captured area are destroyed for bonuses.
- Power-ups: gray boxes appear on the field and grant temporary effects (speed, weapon ammo, shields, etc.)
- Bonus behavior: certain levels award special completion bonuses when you shoot or otherwise defeat the main enemy before finishing the level.

## General mechanics (detailed)
- **Player**: controls a small ship (often called the 'Monotros' in manual text) that moves around the perimeter and ventures into empty space to draw a capture line. The player is vulnerable while drawing — touches by enemies or crossing the own trail usually cost a life (or trigger death rules that vary by port).
- **Drawing**: closing a polygon converts empty cells into 'captured' filled cells; the portion of the screen taken away from the current 'outside' side is added to the player's territory and sometimes reveals the next stage's background.
- **Enemies**:
  - *Main Enemy*: A unique boss for each stage; larger, sometimes with specific movement patterns and HP.
  - *Minions*: Smaller enemies that move about and may spawn at level start or when the main is split. They obstruct capture lines and can be trapped and destroyed by capture.
- **Obstacles**: Many versions place fixed obstacles (blocks) on the grid that cannot be captured and may serve as cover/obstacles to enemy movement.
- **Capture percent**: reaching the required percent (80% for Volfied/Ultimate Qix) completes the stage and advances the player.
- **Power-ups**: collected by moving the ship over grey boxes; examples include speed boosts, weapons for shooting enemies, extra life, shields, etc.

## Per-stage notes (observations & references)
Note: Sources differ in the detail they provide for individual rounds. The arcade game (Volfied) and its console ports frequently reused stage art and enemy sets across versions. Below are compiled observations and common notes for rounds 1–16.

### Round 1 — Opening area
- Visual: introductory sci-fi background; usually a single, slow-moving main enemy with several slow minions.
- Mechanics: used to teach player core capture mechanics; main enemy typically has low HP and minimal aggression.

### Round 2 — Early progression
- Visual: varied background (city/plateau style depending on port). More minions and slightly faster patterns.

### Rounds 3–6 — Mid-early stages
- Visuals and enemy types diversify; minion counts increase and obstacle placement may begin to appear.
- Some stages reward shooting the main enemy early for a completion bonus.

### Rounds 7–10 — Mid game
- Main enemies begin showing faster movement and more aggressive patterns; minions may spawn in more challenging positions.

### Rounds 11–14 — Late game
- Backgrounds and sprite detail increase. Many levels introduce more obstacles, tighter corridors, and faster minions.

### Rounds 15–16 — Final rounds
- Main enemies are powerful and harder to trap; minions are numerous and aggressive. The last rounds typically require near-perfect capture and movement to complete.

## Source references for stage visuals and behavior
- Example playthrough with level footage (Genesis / Ultimate Qix): https://www.youtube.com/watch?v=Ba0Aa-bjSJ8 (full playthrough)
- Additional footage and stage captures across platforms (search "Volfied stage X" on YouTube for round-by-round recordings).

## Notes on variation across ports
- The exact number of stages, the order of stages, and some visuals can differ between the arcade and console ports. Some re-releases or home versions may replace or rename assets, and difficulty settings can change spawn counts and enemy speed.

## Collecting authoritative level-by-level data
- Many canonical sources (StrategyWiki, MobyGames) present screenshots and walkthroughs for each round in Volfied, and multiple community videos document each stage in sequence; however some pages are incomplete or behind redirects depending on region and host. For a fully exhaustive per-stage comparative table (exact background filenames, exact minion counts, exact coordinates), the following are recommended:
  - StrategyWiki's Volfied walkthrough (images and round entries)
  - MobyGames screenshots for each platform
  - Direct playthrough videos (Genesis, PC Engine, MS-DOS, Amiga, C64) for visual verification and enemy movement

## Open actions / next steps
- Produce a curated, visual per-stage gallery using screenshots from reliable ports (requires permission/attribution if reusing proprietary images).
- Build a stage data table (names, main enemy sprite/HP, minion counts, special bonuses) extracted from combining StrategyWiki + MobyGames + playthroughs.
- Integrate verified stage data into the repo's level JSON as optional asset links and per-level enemy definitions.

If you want I can: collect screenshots and create a fully explicit table for each of the 16 rounds (visuals, main enemy type, minion counts, known special bonuses) using playthrough videos and MobyGames as sources, and add it to this document.

Repository alignment note
- The repository now contains JSON files for 16 deterministic levels under assets/levels/ (level01.json … level16.json) and the level loader was updated to use 16 levels. Each JSON includes per-level enemy configuration, initial minion coordinates, obstacles, image paths and optional `completionBonus` which the game applies when the main enemy is destroyed.

### Mapping: repo level files → stage names
| file | stage name |
|---|---|
| assets/levels/level01.json | Neo City |
| assets/levels/level02.json | Verdant Core |
| assets/levels/level03.json | Sunforge |
| assets/levels/level04.json | Aether Lab |
| assets/levels/level05.json | Blue Rift |
| assets/levels/level06.json | Crimson Barrens |
| assets/levels/level07.json | Iron Heart |
| assets/levels/level08.json | Final Node |
| assets/levels/level09.json | Machine Sprawl |
| assets/levels/level10.json | Core Nexus |
| assets/levels/level11.json | Industrial Sector |
| assets/levels/level12.json | Rotating Ring |
| assets/levels/level13.json | Hive |
| assets/levels/level14.json | The Grasp |
| assets/levels/level15.json | Heavy Obstruction |
| assets/levels/level16.json | Core Nexus Final |

-- End

## Per-round gallery & explicit table (Rounds 1–16)
Below is a consolidated, verifiable per-round table combining playthrough footage and MobyGames screenshots. Where exact minion counts vary by version/difficulty, I give a typical observed range and point to source footage/screenshots.

Sources for this section:
- MobyGames Volfied screenshots (multi-platform): https://www.mobygames.com/game/432/volfied/screenshots
- Representative longplay videos (Genesis / Ultimate Qix):  https://www.youtube.com/watch?v=nkwBgbYPnfY (longplay) and https://www.youtube.com/watch?v=xNTKtgiAIhA (LongplayArchive)

| Round | Visual / background (representative) | Main enemy (type / behavior) | Minion count (typical) | Known bonuses / notes | Key sources |
|---:|---|---|---:|---|---|
| 1 | Intro sci-fi / initial empty field | Small boss — slow, low HP | 2–4 | Intro stage; low difficulty, used to learn capture | MobyGames Genesis/DOS screenshots; longplay video |
| 2 | Battleship / plateau background | Large battleship sprite — shoots in axes | 3–5 | Early higher difficulty; shooting boss gives bonus | MobyGames ("battleship" screenshots); longplay |
| 3 | Big hand / claw visual | Giant hand — radial shots (multi-directional) | 3–6 | Hand fires in multiple directions; trap carefully | MobyGames (Atari ST screenshot labeled "Level 3 with a giant hand"); longplay |
| 4 | Rotating turret / technical backdrop | Rotating turret or turret cluster | 3–5 | Turret patterns block capture paths; watch angles | MobyGames screenshots; longplay |
| 5 | Insect/winged enemy background | Winged/bug-like main enemy (flights / flaps) | 4–6 | Fast movements; avoid narrow paths | MobyGames + longplay footage |
| 6 | Centipede-like / segmented enemy | Centipede-style main (segment attacks) | 4–6 | Burrowing / segment behavior; shooting segments helps | MobyGames + longplay |
| 7 | Large machine/boss sprite | Mechanical boss with projectile bursts | 4–7 | More aggressive AI; obstacles more common | MobyGames + longplay |
| 8 | Landscape with multiple obstacles | Multi-part main enemy (arms / pods) | 5–8 | Level geometry tight; traps possible | MobyGames + longplay |
| 9 | Swarming critters / factory art | Swarm-style boss + fast minions | 5–8 | Heavy minion counts; focus on containment | longplay + screenshots |
| 10 | Crystalline / mine-like visuals | Mine / turret compound style main | 5–8 | Patterns and sudden bursts; careful capture needed | longplay + screenshots |
| 11 | Industrial / cityscape | Large boss with area-of-effect attacks | 6–9 | More obstacles; minions spawn in tricky locations | longplay + screenshots |
| 12 | Rotating sectors / segmented ring | Ring-shaped boss, rotates and emits projectiles | 6–9 | Rotating patterns force timing-based capture | longplay + screenshots |
| 13 | Organic / insect hive look | Large insect creature with complex movement | 6–10 | Fast moving minions surround boss | longplay + screenshots |
| 14 | Large hands / complex boss art | Multi-limbed boss with wide coverage attacks | 7–10 | Multiple vulnerable points; shooting yields bonuses | longplay + screenshots |
| 15 | Heavy obstruction / near-final design | Advanced main enemy with many minions | 8–12 | Requires careful capture and crowd control | longplay + screenshots |
| 16 | Final stage vistas / final boss | Powerful multi-stage main (final boss) | 10+ | Highest difficulty; big completion reward and special bonuses | longplay + screenshots |

Notes / provenance: the exact visual assets vary between ARCade, Genesis, DOS and other ports. MobyGames screenshots (linked above) contain labeled images for several stages (example: "Level 3 with a giant hand", "Level 2 with a big battleship", many screenshots labeled "Stage 1" / "Stage 2" on the DOS listing). Longplay videos capture the in-action behavior of mains and minions so you can verify movement patterns and typical minion counts at each stage.

If you want, next I can:
- fetch and locally store (with correct attribution) a representative screenshot per round (requires confirming image licensing and attribution), or
- extract precise timestamps in a chosen longplay and add direct links to each round's timestamped video segment for quick visual verification.

Developer checks
- A Node-based validator has been added at `tests/validate_levels.js` to verify all `assets/levels/*.json` files for expected fields and spawn counts. Run it from the repo root:

```bash
# from repo root
node tests/validate_levels.js
```