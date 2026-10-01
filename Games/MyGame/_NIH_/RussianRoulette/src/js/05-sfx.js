// ══════════════════ 추가 효과음 ══════════════════
Object.assign(A, {
  misfire() { if (!this.ctx) return; this.dry(); const t = this.now() + .03, b = this.bus(1, 0, .3);
    this.burst(t, .35, 'lowpass', 900, .7, .35, b); this.thump(t, 140, 60, .12, .5, b); },
  coin(n = 3) { if (!this.ctx) return; const t = this.now(), b = this.bus(.8, .2, .25);
    for (let i = 0; i < n; i++) this.modal(t + i * .07 + Math.random() * .03, [3400, 5200, 7900], [.12, .09, .06], [.12, .08, .05], b, .05); },
  tick() { if (!this.ctx) return; const t = this.now(), b = this.bus(.7, 0, 0); this.modal(t, [1200, 2400], [.03, .02], [.25, .1], b); },
  glass() { if (!this.ctx) return; const t = this.now(), b = this.bus(.9, .15, .3);
    this.modal(t, [2600, 4100, 6300], [.35, .25, .15], [.14, .09, .05], b); this.modal(t + .09, [2650, 4150], [.25, .18], [.08, .05], b);
    this.burst(t + .35, .25, 'lowpass', 500, .8, .25, b); },
  slide() { if (!this.ctx) return; const t = this.now(), b = this.bus(1, 0, .2), s = this.noiseSrc(t, .4), f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(260, t + .38);
    const g = this.env(t, .35, .36, .06); s.connect(f); f.connect(g); g.connect(b); this.thump(t + .36, 150, 70, .06, .4, b); },
  crowdStart() {
    if (!this.ctx || this.crowd) return; const c = this.ctx, g = c.createGain(); g.gain.value = 0; g.connect(this.master);
    const voices = [];
    for (let v = 0; v < 6; v++) { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 280 + v * 170; f.Q.value = 5;
      const vg = c.createGain(); vg.gain.value = 0; s.connect(f); f.connect(vg); vg.connect(g); s.start(); voices.push(vg); }
    const iv = setInterval(() => { const t = this.now(); voices.forEach(vg => vg.gain.setTargetAtTime(Math.random() < .45 ? 0 : Math.random(), t, .1)); }, 200);
    this.crowd = { g, iv }; this.crowdLevel(this.crowdBase = .05, 2);
  },
  crowdLevel(v, time = .8) { if (!this.crowd) return; const g = this.crowd.g.gain, t = this.now(); g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + time); },
  crowdStop() { if (!this.crowd) return; const cr = this.crowd; this.crowdLevel(0, .5); this.crowd = null; setTimeout(() => { clearInterval(cr.iv); cr.g.disconnect(); }, 700); },
  gasp() { if (!this.crowd) return; this.crowdLevel(.2, .08); setTimeout(() => this.crowdLevel(this.crowdBase, 2), 900); },
});

