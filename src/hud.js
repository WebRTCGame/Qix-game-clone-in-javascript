function _renderDigits(container, text, options){ if(!container) return; container.innerHTML = ''; const opt = Object.assign({path:'assets/external/SpaceShooterRedux/PNG/UI', w:12, h:18}, options||{}); const s = String(text); for(const ch of s){ if(/[0-9]/.test(ch)){ const img = document.createElement('img'); img.src = `${opt.path}/numeral${ch}.png`; img.width = opt.w; img.height = opt.h; img.style.imageRendering = 'pixelated'; container.appendChild(img); } else { const span = document.createElement('span'); span.textContent = ch; span.style.marginLeft = '2px'; span.style.marginRight = '2px'; span.style.color = '#ffd27f'; container.appendChild(span); } } }

export function setPercent(val){ const el = document.getElementById('percent'); if(!el) return; const v = Math.round(Number(val) || 0); el.innerHTML = ''; const digits = document.createElement('div'); digits.className = 'percent-digits'; _renderDigits(digits, String(v).padStart(3,' '), {w:22,h:28}); const pct = document.createElement('div'); pct.className = 'percent-symbol'; pct.textContent = '%'; el.appendChild(digits); el.appendChild(pct); }

export function setScore(val){ const el = document.getElementById('score'); if(!el) return; const s = Math.max(0, Math.floor(Number(val) || 0)); const digitsContainer = el.querySelector('.digits') || el; _renderDigits(digitsContainer, String(s).padStart(6,'0'), {w:12,h:18}); }

export function setLives(val){ const el = document.getElementById('lives'); if(!el) return; el.innerHTML = '<span class="label">LIVES</span> '; const count = Math.max(0, Number(val) || 0); for(let i=0;i<count;i++){ const img = document.createElement('img'); img.src = 'assets/external/SpaceShooterRedux/PNG/UI/playerLife1_blue.png'; img.alt = 'life'; el.appendChild(img); } if(count > 5){ const span = document.createElement('span'); span.style.marginLeft = '6px'; span.textContent = `x${count}`; el.appendChild(span); } }

export function setLevel(val){ const el = document.getElementById('level'); if(!el) return; const n = Number(val) || 0; el.textContent = `LVL: ${String(n).padStart(2,'0')}`; }
export function setRound(val){ const el = document.getElementById('round-num'); if(!el) return; const n = Number(val) || 0; el.textContent = String(n).padStart(2,'0'); }
export function setTime(seconds){ const el = document.getElementById('time'); if(!el) return; const digitsContainer = el.querySelector('.digits') || el;
	const total = Number(seconds) || 0; const mm = Math.floor(total/60); const ss = Math.floor(total % 60); const cs = Math.floor((total - Math.floor(total)) * 100);
	const s = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}:${String(cs).padStart(2,'0')}`;
	digitsContainer.innerHTML = '';
	_renderDigits(digitsContainer, s, {w:12,h:18});
}
export function setMultiplier(val){ const el = document.getElementById('mult'); if(!el) return; el.textContent = `MULT: x${val}`; }
export function setStatus(text){ const el = document.getElementById('status'); if(el) el.textContent = `Status: ${text}`; }
export function setHighScore(val, flash=false){ const el = document.getElementById('highscore'); if(!el) return; const s = Math.max(0, Math.floor(Number(val) || 0)); const digitsContainer = el.querySelector('.digits') || el; _renderDigits(digitsContainer, String(s).padStart(6,'0'), {w:12,h:18}); if(flash){ el.style.color = '#ff0'; setTimeout(()=>{ el.style.color = ''; }, 1200); } }
export function setSuperText(text){ const el = document.getElementById('super'); if(el) el.textContent = text || ''; }
export function setEnemies(current, total){ const el = document.getElementById('enemies'); if(!el) return; el.textContent = `ENEMIES: ${current}/${total}`; }
export function setPowerup(type, ttl){ const el = document.getElementById('powerup'); if(!el) return; el.textContent = type ? `POWERUP: ${type}${ttl?(' ('+ttl.toFixed(1)+'s)'):''}` : ''; }
export function setAmmo(ammo){ const el = document.getElementById('ammo'); if(!el) return; el.textContent = `AMMO: ${ammo}`; }
// add small helper to highlight when ammo is non-zero
export function _highlightAmmoIfNeeded(ammo){ const el = document.getElementById('ammo'); if(!el) return; if(Number(ammo) > 0) el.classList.add('has-ammo'); else el.classList.remove('has-ammo'); }
export function setBossHP(hp, max){ const el = document.getElementById('bosshp'); if(!el) return; if(hp === null) el.textContent = ''; else el.textContent = `BOSS HP: ${hp}/${max}`; }
export function setLevelName(name){ const el = document.getElementById('levelname'); if(!el) return; el.textContent = name ? `${String(name).toUpperCase()}` : ''; }

// Display detected cave/area overlays. `caves` is an array of cave objects
// returned from Board.detectCaves. Each cave should include `id` and `color`.
export function setCaves(caves){ const cnt = (caves && caves.length) ? caves.length : 0; const el = document.getElementById('areas-count'); if(el) el.textContent = `Areas: ${cnt}`; const list = document.getElementById('areas-list'); if(!list) return; list.innerHTML = ''; if(!caves || !caves.length) return; for(const c of caves){ const wrapper = document.createElement('div'); wrapper.style.display = 'flex'; wrapper.style.alignItems = 'center'; wrapper.style.gap = '6px'; const sw = document.createElement('div'); sw.style.width = '20px'; sw.style.height = '14px'; sw.style.background = c.color || 'rgba(48,200,255,0.12)'; sw.style.border = `1px solid ${c.strokeColor || 'rgba(48,200,255,0.6)'}`; sw.style.borderRadius = '2px'; const label = document.createElement('div'); label.style.fontSize = '12px'; label.style.color = '#ddd'; label.textContent = `#${c.id} (${c.cells.length})`; wrapper.appendChild(sw); wrapper.appendChild(label); list.appendChild(wrapper); } }

// Debug level sidebar utilities — used for quick jumping between levels while debugging
let _levelSidebarEl = null;
let _levelIcons = [];
export function initLevelSidebar(totalLevels, opts = {}){
	try{
		const root = document.getElementById('game-root') || document.body;
		let cont = document.getElementById('level-sidebar');
		if(!cont){ cont = document.createElement('div'); cont.id = 'level-sidebar'; root.appendChild(cont); }
		_levelSidebarEl = cont;
		_levelSidebarEl.innerHTML = '';
		const title = document.createElement('div'); title.className = 'level-sidebar-title'; title.textContent = opts.title || 'Level Selector (debug)'; _levelSidebarEl.appendChild(title);
		_levelIcons = [];
		const onClick = typeof opts.onClick === 'function' ? opts.onClick : null;
		for(let i=1;i<=Math.max(1, Number(totalLevels) || 1); i++){
			const entry = document.createElement('div'); entry.className = 'level-entry';
			const icon = document.createElement('div'); icon.className = 'level-icon'; icon.tabIndex = 0; icon.setAttribute('role','button'); icon.dataset.level = String(i);
			const idx = String(i).padStart(2,'0');
			const bg = `assets/backgrounds/level${idx}/uncaptured.png`;
			icon.style.backgroundImage = `url('${bg}')`;
			// click handler: prefer provided callback, then global game.gotoLevel fallback
			const handler = (ev)=>{ ev.preventDefault(); if(onClick) return onClick(i); if(window && window.game && typeof window.game.gotoLevel === 'function') return window.game.gotoLevel(i); console.warn('No onClick handler or game.gotoLevel available for level selector'); };
			icon.addEventListener('click', handler);
			icon.addEventListener('keypress', (e)=>{ if(e.key === 'Enter' || e.key === ' ') handler(e); });
			const label = document.createElement('div'); label.className = 'level-label'; label.textContent = `#${String(i).padStart(2,'0')}`;
			entry.appendChild(icon); entry.appendChild(label);
			_levelIcons.push(icon);
			_levelSidebarEl.appendChild(entry);
		}
		_levelSidebarEl.setAttribute('aria-hidden', 'false');
	}catch(e){ console.warn('initLevelSidebar failed', e); }
}

export function setActiveLevel(n){ try{ if(!_levelIcons || !_levelIcons.length) return; const idx = Number(n) || 0; for(const ic of _levelIcons){ if(Number(ic.dataset.level) === idx) ic.classList.add('active'); else ic.classList.remove('active'); } }catch(e){ /* best-effort */ } }
