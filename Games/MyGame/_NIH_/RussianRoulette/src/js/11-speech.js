// ══════════════════ 말풍선 ══════════════════
// ── 말풍선 타자 효과: 한글은 자모 단위로 조립(초성 → 중성 → 종성, 겹모음·겹받침도 나눠서), 그 외 문자는 한 글자씩.
//    글자가 완성될 때마다 8비트 '삐빅' 소리. 한글이 아주 살짝 더 빠르다.
const HG = { CHO: 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', JUNG_SPLIT: { 9: 8, 10: 8, 11: 8, 14: 13, 15: 13, 16: 13, 19: 18 }, JONG_SPLIT: { 3: 1, 5: 4, 6: 4, 9: 8, 10: 8, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 18: 17 } };
const hSyl = (c, j, k) => String.fromCharCode(0xAC00 + c * 588 + j * 28 + k);
function typeSteps(text) { // [{t: 화면에 보일 전체 문자열, ms: 다음까지 대기, blip}]
  const out = []; let done = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const v = code - 0xAC00, c = Math.floor(v / 588), j = Math.floor((v % 588) / 28), k = v % 28, st = [HG.CHO[c]];
      if (HG.JUNG_SPLIT[j] != null) st.push(hSyl(c, HG.JUNG_SPLIT[j], 0)); st.push(hSyl(c, j, 0));
      if (k) { if (HG.JONG_SPLIT[k] != null) st.push(hSyl(c, j, HG.JONG_SPLIT[k])); st.push(hSyl(c, j, k)); }
      st.forEach((x, n) => out.push({ t: done + x, ms: n === st.length - 1 ? 22 : 13, blip: n === st.length - 1, ch }));
      done += ch;
    } else {
      done += ch; const sp = /\s/.test(ch), pu = /[.,!?…~·:;'"“”()\-]/.test(ch), emo = code > 0x2100 && !/[Ѐ-ӿ]/.test(ch);
      out.push({ t: done, ms: sp ? 18 : pu ? 70 : emo ? 30 : 52, blip: !sp && !pu && !emo, ch }); // 러시아어·영문: 한 글자씩, 한글보다 살짝 느리게
    }
  }
  return out;
}
const VOICE_PITCH = { berserker: 196, coward: 620, gambler: 330, calculator: 520, strategist: 294, fatalist: 247, mimic: 440, mindgamer: 370, veteran: 220, drunk: 262, provocateur: 415 };
// ══ 대사 소리: '비프'(8비트) 또는 '목소리'(사람처럼 한 음절씩 말하는 합성음). 설정에서 끄거나 바꿀 수 있다. ══
// 목소리 = 성대(톱니파 + 떨림·흔들림) → 모음 포먼트 3개(F1·F2·F3) + 숨소리, 초성은 파열·마찰·비음·유음, 받침은 콧소리·끊김.
// 성격마다 음높이·억양·거칠기·숨소리·말투가 다르다 (공격적인 성격은 낮고 거칠고 세게 끊는다).
const VOICES = {
  _:           { f0: 160, range: .18, fall: .06, drive: 0,   breath: .12, bright: 3400, vib: 5, vd: .012, jit: .02, gain: .9,  dur: .085 },
  berserker:   { f0: 112, range: .22, fall: .22, drive: 5,   breath: .1,  bright: 3000, vib: 4, vd: .01,  jit: .04, gain: 1.15, dur: .07, atk: .003 }, // 으르렁, 세게 내리꽂는 억양
  provocateur: { f0: 178, range: .32, fall: -.18, drive: 2.2, breath: .08, bright: 4600, vib: 5, vd: .015, jit: .03, gain: 1.05, dur: .075, nasal: 1, atk: .004 }, // 비꼬는 콧소리, 끝을 올린다
  coward:      { f0: 262, range: .28, fall: -.04, drive: 0,  breath: .38, bright: 4200, vib: 9, vd: .045, jit: .05, gain: .65, dur: .09 },  // 떨리고 숨 섞인 높은 목소리
  gambler:     { f0: 146, range: .2,  fall: .05, drive: .8,  breath: .1,  bright: 3500, vib: 5, vd: .012, jit: .02, gain: .9,  dur: .08 },
  calculator:  { f0: 170, range: 0,   fall: 0,   drive: 0,   breath: 0,   bright: 3000, vib: 0, vd: 0,    jit: 0,   gain: .7,  dur: .08, robot: 1 }, // 기계처럼 평평
  strategist:  { f0: 124, range: .08, fall: .07, drive: 0,   breath: .08, bright: 2900, vib: 3, vd: .008, jit: .015, gain: .85, dur: .09 },
  fatalist:    { f0: 102, range: .04, fall: .1,  drive: 0,   breath: .26, bright: 2300, vib: 2, vd: .006, jit: .02, gain: .8,  dur: .1 },  // 낮고 단조로움
  mimic:       { f0: 228, range: .45, fall: -.12, drive: 0,  breath: .1,  bright: 4600, vib: 6, vd: .02,  jit: .03, gain: .9,  dur: .075 },
  mindgamer:   { f0: 158, range: .14, fall: -.08, drive: 0,  breath: .32, bright: 3800, vib: 4, vd: .01,  jit: .02, gain: .72, dur: .09 },  // 속삭이듯
  veteran:     { f0: 96,  range: .1,  fall: .12, drive: 1.6, breath: .2,  bright: 2100, vib: 3, vd: .01,  jit: .045, gain: .95, dur: .095 }, // 쉰 저음
  demon:       { f0: 64,  range: .05, fall: .25, drive: 4,   breath: .35, bright: 2600, vib: 3, vd: .03,  jit: .06, gain: 1.3, dur: .16, atk: .01, rev: .7 }, // 악마 웃음 (염소 동전)
  drunk:       { f0: 132, range: .7,  fall: .3,  drive: 1.2, breath: .3,  bright: 1700, vib: 2.3, vd: .09, jit: .12, gain: .58, dur: .14, slur: 1, drunk: 1, rev: .18 }, // 꼬부랑: 크게 출렁이고, 늘어지고, 딸꾹 삑사리·트림
};
// 한국어 모음 포먼트 (F1, F2, F3). 이중모음은 [시작, 끝]
const VF = { a: [750, 1300, 2500], ae: [560, 1800, 2500], eo: [580, 1000, 2500], e: [480, 1900, 2600], o: [400, 760, 2400], u: [330, 860, 2300], eu: [350, 1400, 2400], i: [300, 2250, 3000] };
const JUNG_V = [['a'], ['ae'], ['i', 'a'], ['i', 'ae'], ['eo'], ['e'], ['i', 'eo'], ['i', 'e'], ['o'], ['o', 'a'], ['o', 'ae'], ['o', 'e'], ['i', 'o'], ['u'], ['u', 'eo'], ['u', 'e'], ['u', 'i'], ['i', 'u'], ['eu'], ['eu', 'i'], ['i']];
const CHO_T = ['p', 'p', 'n', 'p', 'p', 'l', 'n', 'p', 'p', 's', 's', '', 'c', 'c', 'c', 'P', 'P', 'P', 'h']; // p 파열 · P 거센 파열 · s 마찰 · c 파찰 · h ㅎ · n 비음 · l 유음
const JONG_T = k => !k ? '' : [4, 16, 21, 5, 6].includes(k) ? 'n' : k >= 8 && k <= 15 ? 'l' : 'x';
let voiceCurve = null;
A.voice = function (pers, ch, fMul = 1, at = 0) {
  const c = this.ctx, P = VOICES[pers] || VOICES._, t = this.now() + .005 + at, out = this.bus(1.15, 0, P.rev || .06), mg = c.createGain(); mg.gain.value = .55 * P.gain; mg.connect(out);
  const code = ch ? ch.codePointAt(0) - 0xAC00 : -1, han = code >= 0 && code < 11172;
  const cho = han ? CHO_T[Math.floor(code / 588)] : pick(['', 'p', 'n', 's', 'l']), vw = JUNG_V[han ? Math.floor((code % 588) / 28) : rand(21)], jong = han ? JONG_T(code % 28) : '';
  const fs = 1 + clamp((P.f0 - 120) / 700, 0, .22), F = k => VF[k].map(x => x * fs), V0 = F(vw[0]), V1 = F(vw[vw.length - 1]);
  const on = cho === 'P' ? .05 : cho === 's' || cho === 'c' || cho === 'h' ? .045 : cho === 'p' ? .02 : cho === 'n' || cho === 'l' ? .03 : 0;
  const hic = P.drunk && Math.random() < .13, burp = P.drunk && !hic && Math.random() < .06; // 술꾼: 딸꾹 삑사리 · 트림
  const vd = P.dur * (P.drunk ? .6 + Math.random() * 1.1 : .85 + Math.random() * .3) * (hic ? .6 : 1), ts = t + on + (P.drunk ? Math.random() * .04 : 0), te = ts + vd, tail = jong === 'n' ? .05 : jong === 'l' ? .03 : .012;
  // 성대: 음높이는 성격의 기본음 ± 억양, 음절 안에서 fall만큼 떨어지거나 올라간다
  const f = P.f0 * fMul * (1 + P.range * (Math.random() - .5)) * (1 + (Math.random() - .5) * P.jit) * (hic ? 1.9 : burp ? .55 : 1);
  const src = c.createOscillator(); src.type = P.robot ? 'square' : 'sawtooth';
  if (P.drunk) { // 음이 제멋대로 올라갔다 떨어졌다 (딸꾹은 확 치솟았다 뚝)
    const up = Math.random() < .5 ? 1 : -1; src.frequency.setValueAtTime(f * (hic ? .7 : .85), ts); src.frequency.linearRampToValueAtTime(f * (hic ? 1.25 : 1 + .18 * up), ts + vd * (hic ? .25 : .45));
    src.frequency.linearRampToValueAtTime(f * (hic ? .8 : 1 - .3 * up * Math.random() - P.fall * .4), te + tail); }
  else { src.frequency.setValueAtTime(f * (P.slur ? .92 : 1.02), ts); src.frequency.linearRampToValueAtTime(f, ts + vd * .3); src.frequency.linearRampToValueAtTime(f * (1 - P.fall * .5), te + tail); }
  if (P.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = P.vib * (P.slur ? .5 : 1); lg.gain.value = f * P.vd; l.connect(lg); lg.connect(src.frequency); l.start(ts); l.stop(te + tail + .05); }
  let head = src;
  if (P.drive) { if (!voiceCurve || voiceCurve.k !== P.drive) { const n = 512, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(x * P.drive) / Math.tanh(P.drive); } voiceCurve = { k: P.drive, cv }; }
    const ws = c.createWaveShaper(); ws.curve = voiceCurve.cv; src.connect(ws); head = ws; }
  const glot = c.createGain(); glot.gain.setValueAtTime(.0001, ts); glot.gain.linearRampToValueAtTime(1, ts + (P.atk || .012)); glot.gain.setValueAtTime(1, te - .01);
  glot.gain.exponentialRampToValueAtTime(jong === 'x' ? .0001 : .35, te + (jong === 'x' ? .006 : .01)); glot.gain.exponentialRampToValueAtTime(.0001, te + tail); head.connect(glot);
  // 숨소리 (같은 성도를 통과)
  const br = this.noiseSrc(ts, vd + tail), bg = c.createGain(); bg.gain.setValueAtTime(P.breath * .6, ts); bg.gain.linearRampToValueAtTime(.0001, te + tail); br.connect(bg);
  // 성도: 포먼트 필터 3개 (이중모음은 미끄러진다)
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = P.bright; lp.connect(mg);
  if (P.drunk) { const mush = (burp ? .6 : .88) + Math.random() * .1; for (let k = 0; k < 3; k++) { V0[k] *= mush; V1[k] *= mush * (.9 + Math.random() * .2); } } // 혀가 꼬여 모음이 뭉개진다
  [0, 1, 2].forEach(k => { const bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = P.drunk ? [4, 6, 7][k] : [7, 11, 13][k];
    bp.frequency.setValueAtTime(V0[k], ts); bp.frequency.linearRampToValueAtTime(V1[k], ts + vd * .45);
    if (P.slur) bp.frequency.linearRampToValueAtTime(V1[k] * .93, te);
    g.gain.value = [1.4, (P.nasal && k === 1 ? 1.3 : .9), .45][k]; glot.connect(bp); bg.connect(bp); bp.connect(g); g.connect(lp); });
  if (P.nasal) { const nb = c.createBiquadFilter(), ng = c.createGain(); nb.type = 'bandpass'; nb.frequency.value = 280; nb.Q.value = 4; ng.gain.value = .5; glot.connect(nb); nb.connect(ng); ng.connect(lp); }
  // 초성
  if (cho === 'p' || cho === 'P') this.burst(t, cho === 'P' ? .045 : .014, 'highpass', cho === 'P' ? 1800 : 1200, .7, (cho === 'P' ? .22 : .16) * P.gain, mg);
  else if (cho === 's') this.burst(t, .045, 'bandpass', 5600, 1.2, .16 * P.gain, mg);
  else if (cho === 'c') { this.burst(t, .01, 'highpass', 1500, .7, .14 * P.gain, mg); this.burst(t + .01, .035, 'bandpass', 3600, 1.4, .14 * P.gain, mg); }
  else if (cho === 'h') { const hn = this.noiseSrc(t, .05), hf = c.createBiquadFilter(), hg = c.createGain(); hf.type = 'bandpass'; hf.frequency.value = V0[1]; hf.Q.value = 2; hg.gain.setValueAtTime(.3 * P.gain, t); hg.gain.linearRampToValueAtTime(.0001, t + .05); hn.connect(hf); hf.connect(hg); hg.connect(mg); }
  else if (cho === 'n' || cho === 'l') { const o = c.createOscillator(), g = c.createGain(), l2 = c.createBiquadFilter(); o.type = 'sine'; o.frequency.value = f; l2.type = 'lowpass'; l2.frequency.value = cho === 'n' ? 400 : 900;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.35 * P.gain, t + .012); g.gain.linearRampToValueAtTime(.0001, ts + .01); o.connect(l2); l2.connect(g); g.connect(mg); o.start(t); o.stop(ts + .03); }
  // 받침 콧소리
  if (jong === 'n') { const o = c.createOscillator(), g = c.createGain(), l2 = c.createBiquadFilter(); o.type = 'sine'; o.frequency.value = f * (1 - P.fall * .5); l2.type = 'lowpass'; l2.frequency.value = 350;
    g.gain.setValueAtTime(.0001, te - .01); g.gain.linearRampToValueAtTime(.3 * P.gain, te + .01); g.gain.exponentialRampToValueAtTime(.0001, te + tail); o.connect(l2); l2.connect(g); g.connect(mg); o.start(te - .01); o.stop(te + tail + .02); }
  src.start(ts); src.stop(te + tail + .03);
};
A.blip = function (f, ch, pers) {
  if (!this.ctx || settings.voiceSfx === false) return;
  if (settings.voiceStyle !== 'beep') return this.voice(pers, ch); // 목소리 (기본)
  const c = this.ctx, t = this.now(), b = this.bus(1.1, 0, 0), g = c.createGain(), fr = f * (1 + (Math.random() - .5) * .06);
  const o = c.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(fr, t); // 비프
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.16, t + .004); g.gain.setValueAtTime(.16, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + .065);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; o.connect(lp); lp.connect(g); g.connect(b); o.start(t); o.stop(t + .075); };
// ── 이모티콘 효과음 (목소리·비프 공통, 대사 소리를 끄면 같이 꺼짐)
A.emoSfx = function (e) {
  if (!this.ctx || settings.voiceSfx === false) return;
  const c = this.ctx, t = this.now(), b = this.bus(2.3, 0, .15);
  const tone = (type, f0, f1, at, dur, vol, dest = b, lp = 4000) => { const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur);
    f.type = 'lowpass'; f.frequency.value = lp; g.gain.setValueAtTime(.0001, t + at); g.gain.linearRampToValueAtTime(vol, t + at + .01); g.gain.exponentialRampToValueAtTime(.0001, t + at + dur); o.connect(f); f.connect(g); g.connect(dest); o.start(t + at); o.stop(t + at + dur + .02); return o; };
  const vib = (o, rate, depth, at, dur) => { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = rate; lg.gain.value = depth; l.connect(lg); lg.connect(o.frequency); l.start(t + at); l.stop(t + at + dur); };
  switch (e) {
    case '😂': [0, .11, .22, .33, .44].forEach((d, k) => tone('triangle', 520 + k * 40, 700 + k * 40, d, .09, .14)); break; // 깔깔
    case '😏': { const o = tone('sawtooth', 260, 390, 0, .38, .1, b, 1200); vib(o, 6, 6, 0, .38); break; } // 흐응~
    case '😭': { const o = tone('sawtooth', 620, 300, 0, .9, .1, b, 1600); vib(o, 7, 30, 0, .9); tone('sawtooth', 560, 280, .95, .6, .07, b, 1400); break; } // 으아앙
    case '😱': tone('sawtooth', 420, 1300, 0, .45, .12, b, 3000); this.burst(t, .45, 'bandpass', 2500, 1, .12, b); break; // 끼야악
    case '😡': { const o = tone('square', 92, 70, 0, .5, .13, b, 900); vib(o, 18, 12, 0, .5); break; } // 으르르
    case '🙏': [[880, 0], [1320, .12], [1760, .24]].forEach(([f, d]) => tone('sine', f, f, d, 1.1, .1)); break; // 딸랑
    case '👍': tone('square', 1046, 1046, 0, .09, .08, b, 3000); tone('square', 1568, 1568, .09, .22, .08, b, 3000); break; // 띠링
    case '💀': [0, .07, .13, .2, .3].forEach(d => this.burst(t + d, .03, 'bandpass', 1800 + Math.random() * 900, 4, .22, b)); tone('sine', 110, 55, 0, .6, .14); break; // 달그락
    case '🥃': this.modal(t, [2600, 4100, 6300], [.2, .14, .09], [.08, .05, .03], b); tone('sine', 180, 90, .25, .18, .12); tone('sine', 170, 85, .45, .18, .1); break; // 짠 · 꿀꺽
    default: tone('sine', 700, 1000, 0, .12, .12); // 퐁
  }
};
function typeInto(el, i, text) {
  const tok = (el._typeTok = (el._typeTok || 0) + 1), steps = typeSteps(text), s = state.seats[i];
  const pers = s && (s.kind === 'ai' ? s.pers : curVoiceId && curVoiceId()), pitch = VOICE_PITCH[pers] || 300; let k = 0;
  const step = () => { if (el._typeTok !== tok) return; const x = steps[k++]; if (!x) return; el.textContent = x.t; if (x.blip) A.blip(pitch, x.ch, pers); el._typeT = setTimeout(step, x.ms); };
  el.textContent = ''; step();
  return steps.reduce((a, x) => a + x.ms, 0);
}
const isDeadSeat = i => state.over && state.deadAt && state.deadAt.who === i; // 총 맞은 사람은 말을 못 한다 (유언은 사망 화면에만)
function bubble(i, text, dur = 2200, dots = false, queued) {
  const el = seatEls[i].querySelector('.bubble');
  if (isDeadSeat(i)) { el.classList.remove('show'); return; }
  // 연달아 말하면 앞 말을 읽을 시간을 준다: 앞 말풍선이 아직 떠 있으면 끝난 뒤(+0.35초)에 이어서 말한다 (최대 8초까지 줄 세움)
  if (!dots && text && !el.classList.contains('zz')) { const now = performance.now(), busyTill = Math.max(el._until || 0, el._resv || 0);
    if (!el._dots && busyTill > now + 60 && !queued) { const wait = busyTill - now + 350;
      if (wait >= 8000) { chatSay(i, text); return; } // 너무 밀리면 말풍선은 생략하고 채팅 기록에만
      { const est = Math.max(dur, 1100 + 55 * [...text].length) + typeSteps(text).reduce((a, x) => a + x.ms, 0); el._resv = now + wait + est; const tk = state.token; setTimeout(() => { if (tk === state.token) bubble(i, text, dur, dots, true); }, wait); return; } } }
  if (!dots && text) dur = Math.max(dur, 1100 + 55 * [...text].length); // 글자 수에 맞춘 최소 읽기 시간
  if (el.classList.contains('zz')) { if (sleepState && (sleepState.el === el || (sleepState.co && sleepState.co.el === el))) return; el.classList.remove('zz'); } // 잠든 동안엔 zzZ만
  clearTimeout(el._t); clearTimeout(el._typeT); el._typeTok = (el._typeTok || 0) + 1;
  const emoOnly = !dots && text && [...text].length <= 2 && !/[가-힣a-zA-Z0-9Ѐ-ӿ]/.test(text);
  el.classList.toggle('emo', !!emoOnly); // 큰 글씨는 이모지 한두 개일 때만 (이모지가 줄 서 있는 동안 앞 대사가 커지던 문제)
  if (dots) el.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  else if (emoOnly || !text) { el.textContent = text; if (emoOnly) A.emoSfx(text.trim()); }
  else dur += typeInto(el, i, text); // 써지는 시간만큼 더 오래 보인다
  el.classList.add('show'); el._t = setTimeout(() => el.classList.remove('show'), dur);
  el._until = performance.now() + dur; el._dots = dots;
  if (!dots && text) chatSay(i, text);
}
function fmt(i, str) {
  const s = state.seats[i], o = state.seats[1 - i];
  return str.replace(/\{opp:(이다|으로|이|을|은|과|아)\}/g, (_, p) => jo(o ? o.name : '상대', p)).replace(/\{opp\}/g, o ? o.name : '상대').replace(/\{n\}/g, s.n).replace(/\{p\}/g, Math.round(shownRisk() * 100)).replace(/\{m\}/g, profEsc());
}
// 플레이어 대사 설정: { mode: 'none' | 'preset' | 'custom', preset, lines }
let voice = S.get('voice', { mode: 'none' });
if (voice.mode === 'preset' && voice.preset === 'calculator') voice = { mode: 'none', random: voice.random, pool: voice.pool }; // 계산기 말투는 플레이어용에서 제외
if (voice.pool) voice.pool = voice.pool.filter(x => x !== 'calculator');
if (S.get('randVoice', null) === 'calculator') S.del('randVoice');
const VOICE_POOL = ['berserker', 'gambler', 'provocateur', 'drunk'];
const voiceRandom = () => voice.random !== false;
function rollVoice(prev, avoid) { // 직전 말투, 상대 AI 성격과 겹치지 않게. 후보는 voice.pool(디버그에서 설정) 또는 기본 4종
  const P = (voice.pool && voice.pool.length ? voice.pool : VOICE_POOL).filter(x => PERS[x] && x !== 'calculator'); // 계산기는 플레이어 말투로 안 씀
  let c = P.filter(x => x !== prev && x !== avoid); if (!c.length) c = P.filter(x => x !== avoid); if (!c.length) c = avoid === 'drunk' ? VOICE_POOL.filter(x => x !== 'drunk') : P; return pick(c); }
function curVoiceId() { return state.mode === 'tour' ? tour.voice : S.get('randVoice', null); }
function voiceLines() {
  if (voiceRandom()) { const id = curVoiceId(); return id && PERS[id] ? PERS[id].lines : null; }
  if (voice.mode === 'custom') return voice.lines || null; if (voice.mode === 'preset' && PERS[voice.preset]) return PERS[voice.preset].lines; return null; }
function linesOf(i) { const s = state.seats[i]; if (!s) return null; return s.kind === 'ai' ? PERS[s.pers].lines : voiceLines(); }
function line(i, key) {
  const L = linesOf(i); let arr = L && L[key];
  if (arr && state.seats[i].kind === 'human') arr = arr.filter(x => !/^[^가-힣a-zA-Z0-9{]+$/.test(x.trim())); // 플레이어는 자동 이모티콘 금지
  if (!arr || !arr.length) return null;
  return fmt(i, pick(arr));
}
function speak(i, key, dur) { const t = line(i, key); if (t) bubble(i, t, dur); return t; }
// 숙적(지난번에 플레이어를 죽인 AI)으로 다시 만났을 때 — 성격별
const NEM_LINES = {
  _: ['또 만났군, {opp}. 지난번처럼 해주지.', '{opp}… 네 피 냄새, 아직 기억한다.', '숙적이 돌아왔다, {opp}. 이번에도 내가 치운다.'],
  coward: ['저, 저기… 그때는 정말 실수였어요… 죄송해요…', '{opp}님… 지난번 일은… 일부러 그런 게 아니에요…', '또 뵙네요… 그땐 운이 그랬던 거예요. 제발 화내지 마세요…'], // 겁쟁이: 사과만, 복수 암시 없음
  drunk: ['어? 너… 어디서 본 것 같은데? 딸꾹~ 누구더라?', '우리 어디서 만났지? 술집? …아무튼 반가워~!', '{opp}? 이름이 낯익네~ 딸꾹, 기억은 안 나!'], // 술꾼: 기억 못 함
  berserker: ['또 왔냐, {opp}! 지난번처럼 박살 내주마!', '{opp}! 그때 그 피 맛, 또 보자고!'],
  gambler: ['지난번엔 내 패가 좋았지. 오늘도 그럴 거야, {opp}.', '재경기라… 판돈은 지난번보다 비싸다, {opp}.'],
  calculator: ['재대결 기록. 지난 결과: 당신 사망. 이번 예측도 같습니다.', '{opp}. 데이터가 하나 더 쌓이겠군요.'],
  strategist: ['네 수는 지난번에 다 읽었다, {opp}.', '같은 실수를 두 번 할 건가, {opp}?'],
  fatalist: ['운명이 다시 우리를 묶었군, {opp}.', '지난번 결말은 이미 쓰여 있었다. 이번 것도.'],
  mimic: ['또 만났네~ 지난번 네 표정, 따라 해줄까?', '{opp}! 그때 네가 한 말, 똑같이 돌려줄게~'],
  mindgamer: ['{opp}, 지난번에 떨던 손 아직 기억해.', '또 왔네. 이번엔 몇 초나 버틸까?'],
  veteran: ['자네 또 왔군. 그때 그 얼굴 기억하네.', '두 번째 만남이군, {opp}. 이번엔 오래 버텨 보게.'],
  provocateur: ['또 기어 왔냐, {opp}? 지난번에 뒈진 거 벌써 잊었어?', '{opp}, 네 피 냄새 아직도 코에 남아 있다. 씨발, 반갑네.'],
};
// 숙적 재회: 지난번에 죽인 사람과 이름이 다르다 → 얼굴이 닮았다고 (성격별). 겁쟁이는 닮았다고만 하고 그 사람을 불쌍해한다.
const NEM_LOOK = {
  _: ['…너, {v}{랑} 얼굴이 똑 닮았군. 그 녀석은 내가 보냈는데.', '{v}? …아니, 이름이 다르네. 근데 그 얼굴, 어디서 봤더라.'],
  provocateur: ['씨발, 너 {v} 동생이냐? 그 새끼 내가 보냈는데. 얼굴도 똑같이 멍청하네.', '이름 바꾸면 모를 줄 알았냐, {v}? …아, 진짜 다른 놈이야? 판박이네. 너도 똑같이 보내주지.'],
  coward: ['어… {v}님{이랑} 정말 닮으셨네요… 그분… 불쌍했어요…', '혹시 {v}님 가족이세요…? 그분… 정말 안됐었어요… 죄송해요…'],
  drunk: ['어? {v}! 살아 있었어~? …아닌가? 딸꾹, 얼굴이 똑같은데~', '너 {v}{지}? 아니라고? 에이~ 딸꾹, 똑같이 생겼는데~'],
  berserker: ['{v}{랑} 똑같은 얼굴이군! 그 녀석처럼 박살 내주마!', '어디서 본 얼굴인데… 아, {v}! 그 녀석 피 맛이 기억나는군!'],
  gambler: ['🎲 {v}{랑} 닮았네. 그 친구는 운이 없었지. 너는?', '🃏 같은 얼굴, 다른 이름이라… 패는 같을까?'],
  calculator: ['안면 유사도 높음. 이전 표본: {v}. 결과 예측: 동일.', '이름 불일치, 얼굴 일치. {v}의 데이터를 적용한다.'],
  strategist: ['{v}{와} 닮았군. 같은 수를 둔다면 같은 결말이다.'],
  fatalist: ['{v}의 얼굴을 하고 왔군. 운명은 같은 얼굴을 두 번 부른다.'],
  mindgamer: ['그 표정… {v}{랑} 똑같아. 떨리는 눈썹까지.'],
  veteran: ['자네, {v}{라는} 젊은이와 닮았군. 그 친구는 여기서 갔지.'],
  mimic: ['{v}{랑} 똑같이 생겼네~ 그럼 똑같이 따라 가는 거야?'],
};
function nemLook(i, v) { const s = state.seats[i], c = [...String(v)].pop(), k = c ? c.codePointAt(0) - 0xAC00 : -1, bat = k >= 0 && k < 11172 && k % 28;
  return fmt(i, pick(NEM_LOOK[s.pers] || NEM_LOOK._)).replace(/\{v\}/g, v).replace(/\{랑\}/g, bat ? '이랑' : '랑').replace(/\{이랑\}/g, bat ? '이랑' : '이랑').replace(/\{와\}/g, bat ? '과' : '와').replace(/\{라는\}/g, bat ? '이라는' : '라는').replace(/\{지\}/g, bat ? '이지' : '지'); }
// 숙적 재회: 지난번에 첫 턴 첫 발로(운 없이) 죽었을 때
const NEM_FIRST = {
  _: ['또 왔군, {opp}. 지난번엔 방아쇠 한 번에 끝났지. 이번엔 좀 버텨봐.', '{opp}, 첫 발에 간 녀석이 또 왔네. 운은 좀 챙겨왔냐?'],
  coward: ['저… 지난번엔 첫 발에… 정말 안됐어요… 이번엔 오래 계세요…', '또 뵙네요… 그땐 운이 너무 없으셨죠… 흑…'],
  drunk: ['어? 너 지난번에… 뭐였더라~ 금방 끝났던 것 같은데? 딸꾹', '너… 첫 잔에 뻗은 친구 아냐? 딸꾹~ …아닌가?'],
  provocateur: ['어이, 첫 발 사망 전문가. 위로금 받으러 또 왔냐?', '{opp}, 또 딜러랑 짜고 한 방에 뒈지러 왔어? 씨발, 이번엔 좀 버텨.'],
  berserker: ['또 왔냐! 지난번엔 싸우기도 전에 끝났잖아! 이번엔 제대로 붙자!'],
  gambler: ['🎲 지난번엔 첫 굴림에 꽝이었지. 이번 운은 어떨까, {opp}?'],
  calculator: ['재대결. 지난 기록: 첫 격발 사망. 이번엔 표본이 더 길기를.'],
  strategist: ['지난번엔 수를 둘 틈도 없었지. 이번엔 머리 좀 써봐, {opp}.'],
  fatalist: ['첫 발. 지난번 운명은 짧았다. 이번엔?'],
  mindgamer: ['첫 발 당길 때 네 얼굴, 아직 기억해.'],
  veteran: ['첫 발에 간 젊은이로군. 이번엔 운이 따르길 바라네.'],
  mimic: ['지난번에 첫 발에 쾅~ 이번엔 따라 하지 마~'],
};
// 숙적 재회: 지난번에 첫 턴 플릭샷으로 자멸했을 때
const NEM_FLICK = {
  _: ['또 왔군, {opp}. 오늘도 첫 턴부터 플릭샷 부릴 거냐?', '잔재주로 뒈진 {opp:이} 돌아왔군.'],
  coward: ['저, 지난번엔… 굳이 넘기지 않으셨으면… 이번엔 그냥 쏘세요…'],
  drunk: ['휙 돌리던 친구 아냐? 딸꾹~ 누구더라~'],
  provocateur: ['어이 플릭샷 장인, 오늘도 제 손으로 탄 고를 거냐?', '{opp}, 지난번에 손재주 자랑하다 뒈진 거 기억하지? 씨발, 웃겼는데.'],
  berserker: ['또 꼼수 부리러 왔냐! 이번엔 정면으로 당겨!'],
  gambler: ['🃏 지난번엔 첫 판부터 레이즈하다 날렸지. 이번엔 콜만 해.'],
  calculator: ['재대결. 지난 기록: 첫 턴 플릭샷 자멸. 학습했기를.'],
  strategist: ['첫 수 무리수로 진 자가 돌아왔군.'],
  fatalist: ['운명을 비틀려다 운명에 당했지. 또 그럴 건가.'],
  mindgamer: ['플릭샷 누를 때 확신에 찬 얼굴이었지. 오늘도 그럴 거냐?'],
  veteran: ['젊은이, 이번엔 손대지 말고 그냥 당기게.'],
  mimic: ['지난번에 휙~ 탕! 오늘도 해줘~'],
};
// 시작 대사: 선공이면 introFirst, 후공이면 introSecond를 공통 intro와 섞어 쓴다 (동전 결과와 말이 어긋나지 않게)
function introOf(i) {
  const L = linesOf(i); if (!L) return null; const first = state.turn === i;
  let pool = (L.intro || []).concat((first ? L.introFirst : L.introSecond) || []);
  if (state.seats[i].kind === 'human') pool = pool.filter(x => !/^[^가-힣a-zA-Z0-9{]+$/.test(x.trim()));
  return pool.length ? fmt(i, pick(pool)) : null;
}
// 볼코프(B7 처형 책임자): 사면을 미끼로 비웃는다
const BOSS_INTRO = [
  '사면장? 내 서랍에 있다. 서명란은 비어 있지. 네 피로 채울 건가, 잉크로 채울 건가.',
  '여기까지 온 건 칭찬하지. 하지만 사면은 위에서 내려오는 게 아니다. 내 손에서 나간다.',
  '{opp}, 형기 면제를 믿고 내려왔나? 이 층에서 사면장을 본 놈은 아직 없다.',
  '서약서 四조, 기억하나? 살아남은 자는 해방된다. 그래서 내가 여기 있는 거다. 아무도 살아남지 못하게.',
];
const BOSS_TAUNT = {
  act: ['사면장의 도장은 아직 마르지 않았다. 네가 먼저 마를 거다.', '자유가 이 한 발 뒤에 있다고 생각하나? 그 뒤엔 소각로가 있다.', '서기장 동지께 올릴 보고서는 이미 써 두었다. 이름만 비었지.', '형기 면제… 좋은 말이지. 무덤에도 형기는 없으니까.', '사면? 굴라크에서 나가는 문은 하나다. 발부터 나가는 문.'],
  survive: ['운이 좋군. 사면장은 운으로 받는 게 아니다.', '한 칸 더 가까워졌군. 문이 아니라 벽에.', '살았다고 웃지 마라. 서명은 내가 한다.'],
  oppSurvive: ['{opp}, 아직 숨 쉬나. 사면 심사는 끝나지 않았다.', '잘 버티는군. 사면장 대신 수의가 어울릴 텐데.', '문밖 공기가 그리운가? 거기까지 한 칸이 멀다.'],
};
function bossTaunt(i, k) { const s = state.seats[i]; if (!s || !s.boss || isDeadSeat(i)) return null; return fmt(i, pick(BOSS_TAUNT[k])); }
function introLine(i) {
  const s = state.seats[i], o = state.seats[1 - i];
  if (s.boss) return fmt(i, pick(BOSS_INTRO));
  if (s.nemesis && nemesis && nemesis.victim && o && o.kind === 'human' && o.name !== nemesis.victim) return nemLook(i, nemesis.victim); // 이름이 다르면: 얼굴이 닮았다
  if (s.nemesis) { const how = nemesis && nemesis.how, T = how === 'first' ? NEM_FIRST : how === 'flick' ? NEM_FLICK : NEM_LINES; return fmt(i, pick(T[s.pers] || T._)); } // 지난번 사인에 따라
  if (state.mode === 'tour' && tour.floor > 1 && !tour.witnessed) { tour.witnessed = true; S.set('tour', tour);
    return fmt(i, pick(['위층에서 소문 들었다. B{f}를 뚫고 왔다며, {opp}?', '{opp}… 위층 녀석들이 네 얘기를 하더군.', '계단에서 피 냄새가 나더라. 네가 {opp}군.'])).replace('{f}', tour.floor - 1); }
  if (o.kind === 'ai') {
    const key = [s.pers, o.pers].sort().join('|');
    if (PAIRS[key] && PAIRS[key][0] === s.pers && Math.random() < .7) return PAIRS[key][1];
    if ((riv[o.pers + '>' + s.pers] || 0) > (riv[s.pers + '>' + o.pers] || 0) && Math.random() < .6) return fmt(i, pick(GRUDGE));
  } else if (prof.n >= 3 && ['mindgamer', 'veteran', 'provocateur', 'strategist', 'calculator'].includes(s.pers) && Math.random() < .6)
    return fmt(i, pick(['지난번에도 {m}번째 약실에서 도망쳤지, {opp}?', '{opp}, 넌 늘 {m}번째에서 손을 떼더군.', '네 버릇은 기억하고 있다. {m}번째.']));
  return introOf(i);
}

