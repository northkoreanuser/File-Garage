// ══════════════════ 오디오 엔진 ══════════════════
const A = {
  ctx: null,
  init() {
    if (this.ctx) { this.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -8; comp.knee.value = 6; comp.ratio.value = 10; comp.attack.value = 0.001; comp.release.value = 0.25;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    this.master.connect(comp); comp.connect(c.destination); this.comp = comp;
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.rev = c.createConvolver(); this.rev.buffer = this.ir(2.6, 2.8);
    this.revSend = c.createGain(); this.revSend.gain.value = 0.5;
    this.revSend.connect(this.rev); this.rev.connect(this.master);
    this.musicFilter = c.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 16000;
    this.musicGain = c.createGain(); this.musicGain.gain.value = 0.5;
    this.music = c.createGain();
    this.music.connect(this.musicFilter); this.musicFilter.connect(this.musicGain); this.musicGain.connect(this.master);
    this.musicRev = c.createGain(); this.musicRev.gain.value = 0.18; this.musicFilter.connect(this.musicRev); this.musicRev.connect(this.rev);
    const len = c.sampleRate * 2; this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  now() { return this.ctx.currentTime + 0.005; },
  ir(dur, decay) { // 방 잔향 임펄스 (초기 반사 포함)
    const c = this.ctx, sr = c.sampleRate, len = Math.floor(sr * dur), b = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      [0.011, 0.019, 0.027, 0.041, 0.057].forEach((t, j) => { const p = Math.floor((t + ch * 0.003) * sr); if (p < len) d[p] += (0.7 - j * 0.1) * (Math.random() < .5 ? -1 : 1); });
    }
    return b;
  },
  out(node, pan = 0, rev = 0.3) {
    const c = this.ctx; let n = node;
    if (c.createStereoPanner && pan) { const p = c.createStereoPanner(); p.pan.value = pan; node.connect(p); n = p; }
    n.connect(this.sfx);
    if (rev) { const g = c.createGain(); g.gain.value = rev; n.connect(g); g.connect(this.revSend); }
    return n;
  },
  env(t, peak, dur, attack = 0.001) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    return g;
  },
  noiseSrc(t, dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.start(t, Math.random() * 1.5, dur + 0.05); return s; },
  burst(t, dur, type, freq, q, peak, dest) {
    const c = this.ctx, s = this.noiseSrc(t, dur), f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.env(t, peak, dur); s.connect(f); f.connect(g); g.connect(dest); return f;
  },
  modal(t, freqs, decays, gains, dest, jit = 0.01) { // 금속 공명 (모달 합성)
    freqs.forEach((f, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + (Math.random() - .5) * jit);
      const g = this.env(t, gains[i], decays[i], 0.0005); o.connect(g); g.connect(dest); o.start(t); o.stop(t + decays[i] + 0.05);
    });
  },
  thump(t, f0, f1, dur, peak, dest) {
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.env(t, peak, dur, 0.002); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  },
  bus(vol = 1, pan = 0, rev = 0.3) { const g = this.ctx.createGain(); g.gain.value = vol; this.out(g, pan, rev); return g; },

  // ── 총성
  gun(big) {
    if (!this.ctx) return; const c = this.ctx, t = this.now();
    const bus = this.bus(big ? 1.35 : 1.1, (Math.random() - .5) * .3, 0);
    const wet = c.createGain(); wet.gain.value = big ? 1.1 : 0.85; bus.connect(wet); wet.connect(this.revSend);
    // 벽 반사 (슬랩백)
    const dl = c.createDelay(1); dl.delayTime.value = 0.085; const fb = c.createGain(); fb.gain.value = 0.3;
    const dlf = c.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2200;
    const dlo = c.createGain(); dlo.gain.value = 0.4;
    bus.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(dlo); dlo.connect(this.sfx);
    // 공이 타격
    this.modal(t - 0.003 < c.currentTime ? t : t - 0.003, [2300, 3600, 5200], [.02, .015, .01], [.25, .18, .1], bus);
    // 초기 트랜지언트
    this.burst(t, 0.006, 'highpass', 400, .5, 3.2, bus);
    // 폭발 본체 (새츄레이션 + 스윕 로우패스)
    { const s = this.noiseSrc(t, 0.5), ws = c.createWaveShaper(), k = 8, n = 1024, cv = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = i / n * 2 - 1; cv[i] = Math.tanh(k * x) / Math.tanh(k); } ws.curve = cv;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(7000, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
      const g = this.env(t, 1.7, big ? 0.55 : 0.4); s.connect(ws); ws.connect(lp); lp.connect(g); g.connect(bus); }
    // 크랙
    this.burst(t, 0.045, 'highpass', 2600, .7, 1.5, bus);
    // 저음 붐
    this.thump(t, 120, 34, big ? 0.55 : 0.4, 2.4, bus);
    this.burst(t, big ? 0.9 : 0.6, 'lowpass', 170, .8, 2.6, bus);
    if (big) this.thump(t, 60, 22, 0.8, 2.2, bus);
  },
  tinnitus(sec = 4) { if (!this.ctx) return; const t = this.now();
    [4650, 4672].forEach(f => { const o = this.ctx.createOscillator(); o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + sec + .1); });
  },
  muffle(sec = 5) { if (!this.ctx) return; const f = this.musicFilter.frequency, t = this.now();
    f.cancelScheduledValues(t); f.setValueAtTime(260, t); f.exponentialRampToValueAtTime(16000, t + sec); },
  duck(v) { if (!this.ctx) return; const g = this.musicGain.gain, t = this.now(); g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + 0.8); },

  // ── 빈 약실 (공이가 떨어지는 소리)
  dry() { if (!this.ctx) return; const t = this.now(), b = this.bus(1, 0, 0.35);
    this.burst(t, 0.004, 'bandpass', 5200, .8, 1.4, b);
    this.modal(t, [1650, 2780, 4130, 6020, 7900], [.06, .045, .035, .022, .015], [.4, .3, .22, .12, .08], b);
    this.thump(t, 170, 85, .06, .6, b); },
  // ── 격철 당김 (2단 래칫 + 실린더 회전)
  cock() { if (!this.ctx) return; const t = this.now(), b = this.bus(.9, 0, 0.25);
    this.burst(t, 0.003, 'highpass', 3000, .6, .6, b); this.modal(t, [3900, 5600], [.02, .015], [.14, .08], b);
    this.burst(t + .06, 0.002, 'highpass', 4200, .6, .35, b); this.modal(t + .06, [4400, 6100], [.012, .01], [.08, .05], b);
    this.burst(t + .12, 0.006, 'bandpass', 2500, 1, .9, b);
    this.modal(t + .12, [1250, 2150, 3350, 4700], [.06, .045, .03, .02], [.32, .26, .18, .1], b); },
  // ── 실린더 스핀 (감속 래칫)
  spin(dur = 1.1) { if (!this.ctx) return; const t0 = this.now(), b = this.bus(.9, 0, 0.2);
    let t = 0, iv = 0.016; const k = Math.pow(0.14 / 0.016, 1 / Math.max(8, dur / 0.045));
    while (t < dur) { const v = 0.55 + 0.45 * (1 - t / dur);
      this.modal(t0 + t, [2900 + Math.random() * 300, 4700], [.012, .009], [.13 * v, .07 * v], b, .04);
      this.burst(t0 + t, 0.002, 'highpass', 4000, .6, .25 * v, b); t += iv; iv = Math.min(iv * k, 0.16); }
    { const s = this.noiseSrc(t0, dur), f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(900, t0); f.frequency.exponentialRampToValueAtTime(260, t0 + dur);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.14, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(f); f.connect(g); g.connect(b); }
    this.modal(t0 + dur, [1400, 2500, 3800], [.05, .035, .025], [.25, .18, .1], b); },
  // ── 실린더 개폐
  latch(close) { if (!this.ctx) return; const t = this.now(), b = this.bus(close ? 1.1 : .8, 0, 0.3);
    this.burst(t, 0.01, 'bandpass', 1800, 1, 1, b);
    this.modal(t, [880, 1520, 2440, 3900], [.09, .07, .045, .03], [.35, .3, .2, .12], b);
    if (close) { this.thump(t, 200, 90, .07, .8, b); this.modal(t + .04, [2100, 3300], [.03, .02], [.12, .07], b); } },
  // ── 탄환 삽입
  insert() { if (!this.ctx) return; const t = this.now(), b = this.bus(1, .1, 0.3);
    { const s = this.noiseSrc(t, .16), f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(4600, t + .16);
      const g = this.env(t, .16, .16, .04); s.connect(f); f.connect(g); g.connect(b); }
    this.modal(t + .17, [3150, 5050, 7300], [.1, .08, .05], [.2, .13, .07], b);
    this.thump(t + .17, 240, 120, .05, .5, b); },
  // ── 탄피 떨어짐 (황동 바운스)
  casing() { if (!this.ctx) return; const t = this.now() + 0.45, b = this.bus(1, -.25, 0.35);
    [[0, 1], [.19, .6], [.31, .38], [.39, .22], [.44, .12], [.47, .06]].forEach(([dt, v]) =>
      this.modal(t + dt, [2750, 4480, 6610, 8830], [.3 * v + .05, .2 * v + .04, .14 * v + .03, .09], [.22 * v, .15 * v, .1 * v, .06 * v], b, .03)); },
  heart(v = 1) { if (!this.ctx) return; const t = this.now(), b = this.bus(v, 0, 0.05);
    this.thump(t, 72, 40, .13, .9, b); this.burst(t, .08, 'lowpass', 120, .7, .6, b);
    this.thump(t + .27, 66, 38, .12, .6, b); },
  stamp() { if (!this.ctx) return; const t = this.now(), b = this.bus(1, 0, .25);
    this.burst(t, .12, 'lowpass', 500, .7, 1.6, b); this.thump(t, 110, 45, .16, 1.3, b); },
};

