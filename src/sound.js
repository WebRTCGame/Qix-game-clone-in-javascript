export default class Sound {
  constructor(){
    try{ this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ this.ctx = null; }
  }
  beep(freq=440, duration=0.12, options={type:'square', gain:0.25, attack:0.005, release:0.05, slideTo:null}){
    if(!this.ctx) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = options.type || 'square'; o.frequency.value = freq; o.connect(g); g.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(options.gain || 0.25, now + (options.attack || 0.005));
    if(options.slideTo){ o.frequency.exponentialRampToValueAtTime(options.slideTo, now + duration * 0.8); }
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.stop(now + duration + 0.02);
  }

  _noise(duration=0.1, gain=0.2){
    if(!this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * (1 - i/data.length);
    const src = this.ctx.createBufferSource(); src.buffer = buf; const g = this.ctx.createGain();
    g.gain.value = gain; src.connect(g); g.connect(this.ctx.destination);
    src.start(); src.stop(this.ctx.currentTime + duration);
  }
  play(name){
    switch(name){
      case 'spark': this.beep(1800,0.04,{type:'square',gain:0.18,attack:0.002}); break;
      case 'die': this.beep(120, 0.6,{type:'square',gain:0.3,attack:0.02,release:0.5,slideTo:60}); break;
      case 'hit': this.beep(1100, 0.06,{type:'square',gain:0.22,slideTo:700}); this._noise(0.06,0.08); break;
      case 'pop': this.beep(1600, 0.09,{type:'square',gain:0.24,slideTo:900}); this._noise(0.08,0.06); break;
      case 'powerup': this.beep(1900, 0.12,{type:'sine',gain:0.16,slideTo:2600}); break;
      case 'shoot': this.beep(2000, 0.06,{type:'square',gain:0.26,slideTo:1200}); this._noise(0.03,0.04); break;
      case 'split': this.beep(900, 0.12,{type:'square',gain:0.22,slideTo:400}); break;
      case 'super': this.beep(1200, 0.12,{type:'sawtooth',gain:0.28,slideTo:1600}); break;
      case 'capture': this.beep(520, 0.1,{type:'sine',gain:0.2,slideTo:360}); break;
      default: this.beep(440,0.06);
    }
  }
}
