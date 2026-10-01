// ══════════════════ 100% 연출 · 잭팟 · 디버그 패널 ══════════════════
// 「슬라브 여인의 작별」(Прощание славянки, V. Agapkin 1912) — 1912년 출판, 미국 기준 퍼블릭 도메인. 1주제만 편곡.
// 형식: 음이름:길이(16분음표 단위), 화음은 +로 묶음
const SLAV_MEL = 'D5:4 Bb4:4 A4:4 G4:4 F4:2 A4:2 E4:2 F4:2 D4:4 A4:3 Bb4:1 A4:4 F4:3 E4:1 D4:4 C#4:3 D4:1 E4:6 C#4:1 A3:5 A4:3 Bb4:1 A4:4 G#4:3 A4:1 E5:4 F5:3 E5:1 D5:12 D5:3 C#5:1 E5:4 D5:3 Bb4:1 G4:4 Bb4:3 D5:1 A4:6 F4:2 D4:4 A4:3 Bb4:1 A4:4 E4:3 C#4:1 A3:4 F4:3 E4:1 D4:12 A3:4 F4:10 F4:2 E4:2 D4:2 E4:12 A3:4 E4:10 E4:2 F4:2 E4:2 D4:12 A3:4 D4:10 D4:2 E4:2 D4:2 G4:10 G4:2 A4:2 Bb4:2 A4:4 G4:4 F4:4 E4:4 D4:4 C#4:4 D4:4 D4:4 D4:2 D4:10 A4:4 F5:4 D5:4 A4:4 F4:4 E4:12 A4:4 E5:4 C#5:3 A4:1 E5:4 F5:3 E5:1 D5:12 A4:1 Bb4:3 A4:1 G4:4 E5:7 G4:1 A4:3 G4:1 F4:4 D5:7 F4:1 G4:3 F4:1 E4:4 Bb4:4 A4:6 C#4:3 D4:3 D4:3 D4:1 D4:4 Bb4:3 A4:1 G4:4 E5:7 G4:1 A4:3 G4:1 F4:4 D5:7 F4:1 G4:3 F4:1 E4:4 Bb4:4 A4:6 C#4:3 D4:3 D4:3 D4:1 D4:5';
const SLAV_LH = 'D3+D4:4 Bb2+Bb3:4 A2+A3:4 G2+G3:4 F2+F3:2 A2+A3:2 E2+E3:2 F2+F3:2 D2+D3:8 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 G1+G2:4 G2+Bb2+D3:4 G2+Bb2+D3:4 G2+Bb2+D3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 G1+G2:4 G2+Bb2+D3:4 G2+Bb2+D3:4 G2+Bb2+D3:4 A2+A3:4 G2+G3:4 F2+F3:4 E2+E3:4 D2+D3:4 C2+C#3:4 D2+D3:4 D2+D3:4 D2+D3:2 D2+D3:14 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 G1+G2:4 G2+Bb2+D3:4 G2+Bb2+D3:4 G2+Bb2+D3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:6 D2+D3:3 D2+D3:3 D2+D3:1 D2+D3:7 G1+G2:4 G2+Bb2+D3:4 G2+Bb2+D3:4 G2+Bb2+D3:4 D2+D3:4 D3+F3+A3:4 D3+F3+A3:4 D3+F3+A3:4 A1+A2:4 A2+C#3+E3:4 A2+C#3+E3:4 A2+C#3+E3:6 D2+D3:3 D2+D3:3 D2+D3:1 D2+D3:5';
const MINUET = 'D5:2 G4:1 A4:1 B4:1 C5:1 D5:2 G4:2 G4:2 E5:2 C5:1 D5:1 E5:1 F#5:1 G5:2 G4:2 G4:2 C5:2 D5:1 C5:1 B4:1 A4:1 B4:2 C5:1 B4:1 A4:1 G4:1 F#4:2 G4:1 A4:1 B4:1 G4:1 A4:6 '
  + 'D5:2 G4:1 A4:1 B4:1 C5:1 D5:2 G4:2 G4:2 E5:2 C5:1 D5:1 E5:1 F#5:1 G5:2 G4:2 G4:2 C5:2 D5:1 C5:1 B4:1 A4:1 B4:2 C5:1 B4:1 A4:1 G4:1 A4:2 B4:1 A4:1 G4:1 F#4:1 G4:6'; // 페촐트 「미뉴에트 G장조」(1725, 퍼블릭 도메인) · 8분음표 단위
const MINUET_B = 'G3:4 A3:2 B3:6 C4:6 B3:6 A3:6 G3:6 D4:2 B3:2 G3:2 D4:2 D3:2 C4:2 G3:4 A3:2 B3:6 C4:6 B3:6 A3:6 G3:6 C4:2 D4:2 D3:2 G3:4 G2:2';
const parseSeq = s => s.trim().split(/\s+/).map(x => { const [n, d] = x.split(':'); return [n === 'r' ? null : n.split('+'), +d]; });
const SLAV = { mel: parseSeq(SLAV_MEL), lh: parseSeq(SLAV_LH) }, MIN = { mel: parseSeq(MINUET), bass: parseSeq(MINUET_B) };
const SLOW_SECTIONS = [{ bpm: 54, trem: true, drone: true }, { bpm: 60, trem: true, drone: true }]; // 100%: 코로베이니키를 느리게

Music.farewell = function (t0, dest) {
  const u = 60 / 104 / 4; let t = t0; // 행진곡 보통 빠르기
  SLAV.mel.forEach(([ns, d]) => { if (ns) { const f = NOTE(ns[0]), dur = d * u;
      this.reed(t, f, .15, dur * .94, dest); // 아코디언 선율
      if (d >= 4) for (let x = 0, k = 0; x < dur - .03; x += .085, k++) this.pluck(t + x, f, k % 2 ? .16 : .21, .1, dest); // 긴 음은 발랄라이카 트레몰로
      else this.pluck(t, f, .26, Math.min(dur, .5), dest); }
    t += d * u; });
  let tb = t0;
  SLAV.lh.forEach(([ns, d]) => { if (ns) { const dur = d * u; this.pluck(tb, NOTE(ns[0]), .5, dur * .95, dest, .5, .998);
      ns.slice(1).forEach(n => this.reed(tb, NOTE(n), .04, Math.min(dur, u * 3), dest)); }
    tb += d * u; });
  return Math.max(t, tb) + u * 4;
};

// ── 서류 브금 (둘 다 이 게임용 창작곡)
// 사면 행진곡: 금관(리드 2겹) + 오음파 반주 + 큰북·작은북 · C장조 112bpm · 16분음표 단위
const VIC_MEL = 'G4:4 C5:4 E5:4 G5:4 G5:6 F5:2 E5:4 D5:4 C5:4 E5:4 A5:6 G5:2 G5:12 r:4 F5:4 F5:2 E5:2 D5:4 F5:4 E5:4 E5:2 D5:2 C5:4 E5:4 D5:4 G4:4 A4:4 B4:4 D5:12 r:4 '
  + 'G4:4 C5:4 E5:4 G5:4 C6:6 B5:2 A5:4 G5:4 F5:4 A5:4 G5:4 E5:4 D5:12 r:4 E5:4 F5:4 G5:6 A5:2 G5:4 E5:4 C5:6 E5:2 D5:4 F5:4 E5:4 D5:4 C5:12 r:4';
const VIC_CH = 'C C G G Am F C C Dm Dm C C G G G G C C F F F C G G C F C C G G C C'.split(' '); // 반 마디씩
// 숙청 장송곡: 저음 금관 합창 + 먹먹한 북 · D단조 50bpm
const DIRGE_MEL = 'A4:8 A4:4 A4:4 D5:8 C5:4 Bb4:4 A4:8 G4:4 F4:4 E4:12 r:4 F4:8 G4:4 A4:4 Bb4:8 A4:4 G4:4 F4:8 E4:4 C#4:4 D4:12 r:4 '
  + 'D5:8 D5:4 E5:4 F5:8 E5:4 D5:4 C5:8 Bb4:4 A4:4 A4:12 r:4 Bb4:8 A4:4 G4:4 F4:8 E4:4 D4:4 E4:6 F4:2 E4:4 C#4:4 D4:16';
const DIRGE_CH = 'Dm Gm Dm A Dm Gm Dm/A Dm Bb Dm F A Gm Dm A Dm'.split(' '); // 한 마디씩 (Dm/A = 반 마디씩)
const CHV = { C: ['C2', 'C3', 'E3', 'G3'], G: ['G1', 'B2', 'D3', 'G3'], Am: ['A1', 'C3', 'E3', 'A3'], F: ['F1', 'C3', 'F3', 'A3'], Dm: ['D2', 'D3', 'F3', 'A3'], Gm: ['G1', 'D3', 'G3', 'Bb3'], A: ['A1', 'C#3', 'E3', 'A3'], Bb: ['Bb1', 'D3', 'F3', 'Bb3'] };
const VIC = parseSeq(VIC_MEL), DIRGE = parseSeq(DIRGE_MEL);
Music.victory = function (t0, dest) {
  const u = 60 / 112 / 4, intro = !this.idx; let m0 = t0;
  if (intro) { for (let x = 0; x < 16 * u - .01; x += u / 2) A.burst(t0 + x, .05, 'bandpass', 2600, .8, .05 + .12 * x / (16 * u), dest); m0 = t0 + 16 * u; } // 작은북 롤
  A.burst(m0, 1.6, 'highpass', 5200, .5, .13, dest); A.burst(m0 + 128 * u, 1.2, 'highpass', 5200, .5, .1, dest); // 심벌
  let t = m0; VIC.forEach(([ns, d]) => { if (ns) { const f = NOTE(ns[0]), dur = d * u * .9; this.reed(t, f, .11, dur, dest); this.reed(t, f / 2, .06, dur, dest); } t += d * u; });
  VIC_CH.forEach((c, k) => { const v = CHV[c], tt = m0 + k * 8 * u;
    this.pluck(tt, NOTE(v[0]) * 2, .42, u * 4, dest, .5, .998); A.thump(tt, 92, 44, .16, k % 2 ? .45 : .7, dest);
    v.slice(1).forEach(n => this.reed(tt + 4 * u, NOTE(n), .028, u * 3, dest)); A.burst(tt + 4 * u, .07, 'bandpass', 2200, .9, .13, dest);
    if (k % 16 === 0) this.mbox(tt, NOTE('C6'), .05, dest); });
  return m0 + 256 * u;
};
Music.dirge = function (t0, dest) {
  const u = 60 / 50 / 4; let t = t0;
  DIRGE.forEach(([ns, d]) => { if (ns) { const f = NOTE(ns[0]), dur = d * u * .95; this.reed(t, f, .075, dur, dest); this.reed(t, f / 2, .03, dur, dest); } t += d * u; });
  DIRGE_CH.forEach((c, bar) => { const tb = t0 + bar * 16 * u;
    c.split('/').forEach((cc, h, all) => { const v = CHV[cc], tt = tb + h * 16 * u / all.length, dur = 16 * u / all.length - .05;
      this.reed(tt, NOTE(v[0]) * 2, .05, dur, dest); v.slice(1).forEach(n => this.reed(tt, NOTE(n), .022, dur, dest)); });
    A.thump(tb, 58, 34, .6, .55, dest); A.thump(tb + 8 * u, 58, 34, .45, .3, dest); // 천 씌운 큰북
    if (bar % 4 === 0) this.mbox(tb, NOTE('D4'), .04, dest); });
  return t0 + 256 * u;
};
{ const sec0 = Music.section;
  Music.section = function (sec, t0, dest) { return sec === 'farewell' ? this.farewell(t0, dest) : sec === 'victory' ? this.victory(t0, dest) : sec === 'dirge' ? this.dirge(t0, dest) : sec0.call(this, sec, t0, dest); };
  // 한 구간(30초 안팎)의 음을 한꺼번에 오디오 노드로 만들면 음이 많은 곡(작별 행진곡 등)에서 오디오 스레드가 밀려
  // 총소리·대사까지 전부 끊겼다(오디오 시계가 실제 시간보다 느리게 감). → 구간은 '할 일 목록'으로만 만들고,
  // 실제 노드는 재생 직전(0.8초 앞)에만 조금씩 만든다.
  Music.q = [];
  Music.gen = function (sec, t0, dest) {
    const q = [], self = this, P = this.pluck, R = this.reed, M = this.mbox, TH = A.thump, BU = A.burst;
    this.pluck = function (t, ...a) { q.push([t, () => P.call(self, t, ...a)]); };
    this.reed = function (t, ...a) { q.push([t, () => R.call(self, t, ...a)]); };
    this.mbox = function (t, ...a) { q.push([t, () => M.call(self, t, ...a)]); };
    A.thump = function (t, ...a) { q.push([t, () => TH.call(A, t, ...a)]); };
    A.burst = function (t, ...a) { q.push([t, () => BU.call(A, t, ...a)]); };
    let end; try { end = this.section(sec, t0, dest); } finally { this.pluck = P; this.reed = R; this.mbox = M; A.thump = TH; A.burst = BU; }
    this.q = this.q.concat(q).sort((a, b) => a[0] - b[0]); return end;
  };
  Music.pump = function () {
    if (!this.on) return;
    const v = this.variant, L = v === 'lullaby' ? ['lullaby'] : v === 'farewell' ? ['farewell'] : v === 'victory' ? ['victory'] : v === 'dirge' ? ['dirge'] : v === 'slow' ? SLOW_SECTIONS : v === 'nemesis' ? NEM_SECTIONS : SECTIONS, now = A.ctx.currentTime;
    while (this.next < now + 1.2) { this.next = this.gen(L[this.idx % L.length], this.next, this.run); this.idx++; }
    let k = 0; while (k < this.q.length && this.q[k][0] < now + .8) { if (this.q[k][0] > now - .05) this.q[k][1](); k++; } // 늦어진 음은 버린다
    if (k) this.q.splice(0, k);
    this.timer = setTimeout(() => this.pump(), 150);
  };
  for (const m of ['switchTo', 'stop', 'start']) { const f = Music[m]; Music[m] = function (v) { if (m === 'stop' || (m === 'start' && !this.on) || (m === 'switchTo' && this.variant !== v)) this.q = []; return f.apply(this, arguments); }; } }
// 100% 차례: 지금 나오던 곡을 그대로 느리게(볼륨 그대로) / 피할 곳이 없으면 작별 행진곡. 벗어나면 원래 속도·원래 곡으로.
Music.setRate = function (r) {
  if ((this.rate || 1) === r) return; this.rate = r; if (!this.on) return;
  const t = A.now(), old = this.run; clearTimeout(this.timer);
  old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + .5); setTimeout(() => old.disconnect(), 800);
  this.run = A.ctx.createGain(); this.run.gain.setValueAtTime(0, t); this.run.gain.linearRampToValueAtTime(1, t + .5); this.run.connect(A.music);
  this.q = []; this.next = A.ctx.currentTime + .1; this.idx = Math.max(0, this.idx - 1); this.pump(); // 지금 치던 구간부터 새 속도로
};
const DOOM_RATE = .62;
function doomMusic(m) {
  if (Music.variant === 'lullaby') return; // 술꾼이 자는 중이면 자장가 유지
  const base = state.seats.some(x => x && x.nemesis) ? 'nemesis' : null;
  if (m === 'farewell') { Music.setRate(1); Music.switchTo('farewell'); return; }
  if (Music.variant === 'farewell' || Music.variant === 'slow') Music.switchTo(base);
  Music.setRate(m ? DOOM_RATE : 1);
}

// 100% 생존 잭팟: 종소리 아르페지오 + 동전 쏟아짐
A.jackpot = function () { if (!this.ctx) return; const t = this.now(), b = this.bus(.75, 0, .45);
  [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, k) => this.modal(t + k * .07, [f, f * 2.76, f * 5.4], [1.4, .6, .3], [.16, .05, .02], b, .003));
  this.modal(t + .5, [2093, 2637, 3136, 4186], [2.2, 2, 1.8, 1.6], [.12, .1, .08, .05], b, .002);
  for (let k = 0; k < 22; k++) { const tt = t + .45 + k * (.045 + Math.random() * .04); this.modal(tt, [3800 + Math.random() * 1600, 6100 + Math.random() * 1200], [.09, .06], [.07, .03], b, .02); }
  this.thump(t, 90, 40, .3, .8, b); if (this.crowd && this.cheer) setTimeout(() => this.cheer(), 250); };

// 장전 후: 탄이 보이는 채로 실린더를 돌리고, 도는 중에 닫는다 → 닫힌 뒤엔 위치를 못 쫓는다
async function spinClose(tok, start, extra, dur) {
  setMsg('실린더를 돌린다…', 'spin');
  cylRot.classList.add('blur'); A.spin(dur / 1000); rotateTo(start, extra, dur, 'cubic-bezier(.12,.75,.2,1)');
  await wait(dur * .32); if (tok !== state.token) return;
  cylWrap.classList.remove('open'); A.latch(true); setMsg('돌아가는 채로 — 철컥, 닫는다.', 'spin');
  await wait(380); if (tok !== state.token) return;
  for (let j = 0; j < state.N; j++) chEl(j).classList.remove('loaded'); // 닫힌 실린더 안으로 사라짐
  await wait(Math.max(0, dur * .3 - 380)); cylRot.classList.remove('blur'); if (tok !== state.token) return;
  await wait(dur * .38 + 150);
}

