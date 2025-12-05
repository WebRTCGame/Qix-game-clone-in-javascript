export default class Sound {
  constructor(){
    try{ this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ this.ctx = null; }
  }
  beep(freq=440, duration=0.12){
    if(!this.ctx) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq; o.connect(g); g.connect(this.ctx.destination);
    o.start(); g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    o.stop(this.ctx.currentTime + duration + 0.02);
  }
  play(name){
    switch(name){
      case 'spark': this.beep(1200,0.05); break;
      case 'die': this.beep(120, 0.6); break;
      case 'split': this.beep(800, 0.12); break;
      case 'super': this.beep(1000, 0.08); break;
      case 'capture': this.beep(500, 0.08); break;
      default: this.beep(440,0.06);
    }
  }
}
