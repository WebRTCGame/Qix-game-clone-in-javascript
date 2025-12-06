export const WIDTH = 800;
export const HEIGHT = 800;
export const CELL = 10; // 80x80 grid
export const COLS = WIDTH / CELL;
export const ROWS = HEIGHT / CELL;
export const FPS = 30;
export const CAPTURE_PERCENT = 75; // level clear threshold
// percent required to auto-complete a level (90% by default)
export const LEVEL_COMPLETE_PERCENT = 90;
// When capturing regions, enemies inside regions smaller than
// LARGEST_REGION * DESTROY_REGION_THRESHOLD will be destroyed.
export const DESTROY_REGION_THRESHOLD = 0.5;
export const ENEMY_DESTROY_SCORE = 1000;
export const BOUNCE_DAMP = 0.9; // velocity multiplier applied after reflections
