// Simple modular weapons implementation — each weapon exposes a .fire(enemy, game, projCfg)
import Projectile from './projectile.js';
// Simple modular weapons implementation — each weapon exposes a .fire(enemy, game, projCfg)

class BaseWeapon {
  constructor(cfg = {}){ this.cfg = cfg || {}; }
  fire(enemy, game, projCfg = {}){ /* override */ }
}

export class RadialWeapon extends BaseWeapon {
  fire(enemy, game, projCfg = {}){
    const count = Number(enemy.config?.radialCount || projCfg.radialCount || this.cfg.radialCount || 8);
    const speed = Number(enemy.config?.bulletSpeed || projCfg.speed || this.cfg.speed || 120);
    const radius = Number(enemy.config?.bulletSize || projCfg.size || this.cfg.size || 3);
      for(let i=0;i<count;i++){ const ang = enemy._orientation + (i/count) * Math.PI * 2; const dx=Math.cos(ang), dy=Math.sin(ang); if(game.spawnProjectile) game.spawnProjectile(enemy.x, enemy.y, dx, dy, speed, 'enemy', radius, projCfg.life || this.cfg.life); else game.projectiles.push(new Projectile(enemy.x, enemy.y, dx, dy, speed, 'enemy', radius, projCfg.life || this.cfg.life)); }
  }
}

export class AxesWeapon extends BaseWeapon {
  fire(enemy, game, projCfg = {}){
    const axesN = Number(enemy.config?.axesCount || projCfg.axesCount || this.cfg.axesCount || 4);
    const speed = Number(enemy.config?.bulletSpeed || projCfg.speed || this.cfg.speed || 120);
    const radius = Number(enemy.config?.bulletSize || projCfg.size || this.cfg.size || 3);
      for(let i=0;i<axesN;i++){ const ang = enemy._orientation + (i/axesN) * Math.PI * 2; const dx = Math.cos(ang); const dy = Math.sin(ang); if(game.spawnProjectile) game.spawnProjectile(enemy.x, enemy.y, dx, dy, speed, 'enemy', radius, projCfg.life || this.cfg.life); else game.projectiles.push(new Projectile(enemy.x, enemy.y, dx, dy, speed, 'enemy', radius, projCfg.life || this.cfg.life)); }
  }
}

export class BurstWeapon extends BaseWeapon {
  fire(enemy, game, projCfg = {}){
    const burstCount = Number(enemy.config?.burstCount || projCfg.burstCount || this.cfg.burstCount || 5);
    const spread = Number(enemy.config?.burstSpread || projCfg.burstSpread || this.cfg.burstSpread || Math.PI * 0.35);
    const speed = Number(enemy.config?.bulletSpeed || projCfg.speed || this.cfg.speed || 120);
    const radius = Number(enemy.config?.bulletSize || projCfg.size || this.cfg.size || 3);
      for(let i=0;i<burstCount;i++){ const ang = enemy._orientation + (Math.random() - 0.5) * spread; const dx=Math.cos(ang), dy=Math.sin(ang); if(game.spawnProjectile) game.spawnProjectile(enemy.x, enemy.y, dx, dy, speed, 'enemy', radius, projCfg.life || this.cfg.life); else game.projectiles.push(new Projectile(enemy.x, enemy.y, dx, dy, speed, 'enemy', radius, projCfg.life || this.cfg.life)); }
  }
}

export class TargetedWeapon extends BaseWeapon {
  fire(enemy, game, projCfg = {}){
    const ang = enemy._orientation; const dx = Math.cos(ang); const dy = Math.sin(ang);
    const speed = Number(enemy.config?.bulletSpeed || projCfg.speed || this.cfg.speed || 150);
    const radius = Number(enemy.config?.bulletSize || projCfg.size || this.cfg.size || 3);
    if(game.spawnProjectile) game.spawnProjectile(enemy.x, enemy.y, dx, dy, speed, 'enemy', radius, projCfg.life || this.cfg.life);
      else game.projectiles.push(new Projectile(enemy.x, enemy.y, dx, dy, speed, 'enemy', radius, projCfg.life || this.cfg.life));
  }
}

export function createWeapon(name, cfg){
  if(!name) return null;
  const cn = String(name).toLowerCase();
  if(cn === 'radial') return new RadialWeapon(cfg);
  if(cn === 'axes') return new AxesWeapon(cfg);
  if(cn === 'burst') return new BurstWeapon(cfg);
  if(cn === 'targeted') return new TargetedWeapon(cfg);
  return null;
}

export default { BaseWeapon, RadialWeapon, AxesWeapon, BurstWeapon, TargetedWeapon, createWeapon };
