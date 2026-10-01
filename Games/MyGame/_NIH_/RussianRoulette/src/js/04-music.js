// ══════════════════ 음악: 코로베이니키 (러시아 민요, 퍼블릭 도메인) ══════════════════
// 발랄라이카(카플러스-스트롱 합성) + 아코디언 반주, 한 바퀴마다 템포가 빨라지는 러시아식 가속
const NOTE = (() => { const b = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  return n => { const m = n.match(/^([A-G])(#|b)?(\d)$/); let s = b[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3]) - 4) * 12; return 440 * Math.pow(2, s / 12); }; })();
const MEL = [['E5',1],['B4',.5],['C5',.5],['D5',1],['C5',.5],['B4',.5],
             ['A4',1],['A4',.5],['C5',.5],['E5',1],['D5',.5],['C5',.5],
             ['B4',1.5],['C5',.5],['D5',1],['E5',1],
             ['C5',1],['A4',1],['A4',1],['r',1],
             ['r',.5],['D5',1],['F5',.5],['A5',1],['G5',.5],['F5',.5],
             ['E5',1.5],['C5',.5],['E5',1],['D5',.5],['C5',.5],
             ['B4',1],['B4',.5],['C5',.5],['D5',1],['E5',1],
             ['C5',1],['A4',1],['A4',1],['r',1]];
const CHORDS = { E: ['E2','B2',['E3','G#3','B3']], Am: ['A2','E2',['A3','C4','E4']], Dm: ['D3','A2',['D3','F3','A3']] };
const PROG = ['E','Am','E','Am','Dm','Am','E','Am'];
const SECTIONS = [
  { bpm: 76,  trem: true, band: false, drone: true },
  { bpm: 104, trem: true, band: true },
  { bpm: 132, band: true },
  { bpm: 162, band: true, oct: true, stomp: true },
  { bpm: 192, band: true, oct: true, stomp: true, fin: true },
];
// 숙적 전용: 드론 깔린 빠르고 무거운 변주 (단3도 아래로 연주됨)
const NEM_SECTIONS = [
  { bpm: 118, band: true, oct: true, stomp: true, drone: true },
  { bpm: 146, band: true, oct: true, stomp: true, drone: true },
];
// 자장가: 브람스 「자장가」(Wiegenlied, 1868, 퍼블릭 도메인) — 오르골 음색, 술꾼이 잠들었을 때
const LULLABY = [['E4',.5],['E4',.5],['G4',2],['E4',.5],['E4',.5],['G4',2],['E4',.5],['G4',.5],['C5',1],['B4',1.5],['A4',.5],['A4',1],['G4',1],
  ['D4',.5],['E4',.5],['F4',1],['D4',1],['D4',.5],['E4',.5],['F4',2],['D4',.5],['F4',.5],['B4',.5],['A4',.5],['G4',1],['B4',1],['C5',2],
  ['C4',.5],['C4',.5],['C5',2],['A4',.5],['F4',.5],['G4',2],['E4',.5],['C4',.5],['F4',1],['G4',1],['A4',1],['G4',2],
  ['C4',.5],['C4',.5],['C5',2],['A4',.5],['F4',.5],['G4',2],['E4',.5],['C4',.5],['F4',1],['E4',.5],['D4',.5],['C4',3]];
const Music = {
  on: false, timer: null, next: 0, idx: 0, run: null, cache: {},
  ks(freq, dur, bright, decay) {
    const key = freq.toFixed(1) + '|' + dur + '|' + bright; if (this.cache[key]) return this.cache[key];
    const c = A.ctx, sr = c.sampleRate, N = Math.max(2, Math.round(sr / freq - 0.5)), len = Math.floor(sr * dur);
    const b = c.createBuffer(1, len, sr), d = b.getChannelData(0); let prev = 0;
    for (let i = 0; i < N && i < len; i++) { prev += bright * ((Math.random() * 2 - 1) - prev); d[i] = prev; }
    for (let i = N; i < len; i++) d[i] = decay * 0.5 * (d[i - N] + d[i - N - 1 >= 0 ? i - N - 1 : i - N]);
    return (this.cache[key] = b);
  },
  pluck(t, freq, vol, dur, dest, bright = .85, decay = .996) {
    const s = A.ctx.createBufferSource(); s.buffer = this.ks(freq, 1.4, bright, decay);
    const g = A.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * .8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + .12);
    s.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + .15);
  },
  reed(t, freq, vol, dur, dest) {
    const c = A.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = .6;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.setValueAtTime(vol, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + .08);
    f.connect(g); g.connect(dest);
    [-5, 5].forEach(ct => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = ct; o.connect(f); o.start(t); o.stop(t + dur + .1); });
  },
  mbox(t, f, vol, dest) { // 오르골: 사인 + 2배음, 긴 감쇠
    const c = A.ctx; [[1, 1], [2, .35], [3.01, .12]].forEach(([m, v]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol * v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6 / m); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 1.7); }); },
  lullaby(t0, dest) {
    const bt = 60 / 76; let t = t0;
    LULLABY.forEach(([n, b]) => { this.mbox(t, NOTE(n) * 2, .09, dest); t += b * bt; });
    for (let k = 0, tt = t0; tt < t - .01; k++, tt += bt * 3) { const r = ['C3', 'G2', 'F2', 'C3'][k % 4]; this.mbox(tt, NOTE(r) * 2, .05, dest); this.mbox(tt + bt, NOTE(r) * 3, .025, dest); this.mbox(tt + bt * 2, NOTE(r) * 3, .025, dest); }
    return t + bt;
  },
  section(sec, t0, dest) {
    if (sec === 'lullaby') return this.lullaby(t0, dest);
    const tr = this.variant === 'nemesis' ? Math.pow(2, -3 / 12) : 1, NT = x => NOTE(x) * tr; // 숙적 변주: 단3도 아래
    const bt = 60 / (sec.bpm * (this.rate || 1)); let t = t0; // rate: 100%일 때 같은 곡을 느리게
    if (sec.drone) { this.reed(t0, NT('A2'), .05, bt * 32 - .1, dest); this.reed(t0, NT('E3'), .035, bt * 32 - .1, dest); }
    MEL.forEach(([n, b]) => {
      if (n !== 'r') { const f = NT(n), d = b * bt;
        if (sec.trem && b >= 1) { for (let x = 0, k = 0; x < d - .02; x += .072, k++) this.pluck(t + x, f, k % 2 ? .12 : .16, .09, dest); }
        else this.pluck(t, f, .2, Math.min(d, .6), dest);
        if (sec.oct) this.pluck(t + .004, f / 2, .1, Math.min(d, .5), dest, .6); }
      t += b * bt; });
    PROG.forEach((ch, bar) => { const [root, fifth, tri] = CHORDS[ch], bs = t0 + bar * 4 * bt;
      if (sec.band) {
        [0, 2].forEach((beat, j) => { const tt = bs + beat * bt; this.pluck(tt, NT(j ? fifth : root), .32, bt * .9, dest, .5, .998);
          if (sec.stomp) A.thump(tt, 95, 42, .14, .55, dest); });
        [1, 3].forEach(beat => tri.forEach(n => this.reed(bs + beat * bt, NT(n), .028, bt * .38, dest)));
        if (sec.stomp) [1, 3].forEach(beat => A.burst(bs + beat * bt, .06, 'bandpass', 1800, .9, .18, dest));
      } else if (!sec.drone || bar % 2 === 0) this.pluck(bs, NT(root), .22, bt * 3, dest, .5, .998);
    });
    let end = t0 + 32 * bt;
    if (sec.fin) end += bt * 2;
    return end;
  },
  // 즉시 전환: 예약된 소리를 0.6초에 걸쳐 끊고, 새 변주를 지금부터 다시 짠다 (숙적 등장 ↔ 잔잔한 기본곡)
  switchTo(v) {
    if (this.variant === v) return; this.variant = v; if (!this.on) return;
    const t = A.now(), old = this.run; clearTimeout(this.timer);
    old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + .6); setTimeout(() => old.disconnect(), 900);
    this.run = A.ctx.createGain(); this.run.gain.setValueAtTime(0, t); this.run.gain.linearRampToValueAtTime(1, t + (v ? .4 : 1.6)); this.run.connect(A.music);
    this.next = A.ctx.currentTime + .1; this.idx = 0; this.pump();
  },
  pump() {
    if (!this.on) return;
    const L = this.variant === 'lullaby' ? ['lullaby'] : this.variant === 'nemesis' ? NEM_SECTIONS : SECTIONS;
    while (this.next < A.ctx.currentTime + 1.2) { this.next = this.section(L[this.idx % L.length], this.next, this.run); this.idx++; }
    this.timer = setTimeout(() => this.pump(), 400);
  },
  start() {
    if (this.on) return; A.init(); if (!A.ctx) return; this.on = true;
    this.run = A.ctx.createGain(); this.run.gain.setValueAtTime(0, A.now()); this.run.gain.linearRampToValueAtTime(1, A.now() + 2.5); this.run.connect(A.music);
    this.next = A.ctx.currentTime + .15; this.idx = 0; this.pump();
  },
  stop() {
    if (!this.on) return; this.on = false; clearTimeout(this.timer);
    const r = this.run, t = A.now(); r.gain.cancelScheduledValues(t); r.gain.setValueAtTime(r.gain.value, t); r.gain.linearRampToValueAtTime(0, t + .8);
    setTimeout(() => r.disconnect(), 1000);
  },
};

// 심장 박동 (긴장)
const Heart = {
  timer: null, rate: 0,
  set(p) {
    const r = p >= 1 ? 140 : p >= .5 ? 108 : p >= 1 / 3 ? 82 : 0;
    if (r === this.rate) return; this.rate = r; clearTimeout(this.timer);
    if (!r) return;
    const beat = () => { if (!this.rate) return; A.heart(this.rate >= 140 ? 1.1 : .8); if (this.rate >= 108 && A.breath && (this._b = !this._b)) A.breath(); this.timer = setTimeout(beat, 60000 / this.rate); };
    beat();
  },
  stop() { this.rate = 0; clearTimeout(this.timer); },
};

