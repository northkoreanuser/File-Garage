// ══════════════════ 일시정지 → 브금 끄기 ══════════════════
// 화면 이동(탭 전환·창 비활성) 또는 직접 일시정지면 음악(관중 소리·디버그 브금 포함)을 끈다. 돌아오면 다시 켠다.
function bgmGate() {
  if (!A.ctx) return;
  const off = state.mode !== 'auto' && (pauseWhy.has('tab') || (manualPause && state.started)); // AI 대전은 브금을 끄지 않는다 // 포커스 아웃은 제외
  if (off === A._bgmOff) return; A._bgmOff = off; const t = A.now();
  const fade = (p, v) => { if (!p) return; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + (off ? .25 : .6)); };
  fade(A.music.gain, off ? 0 : 1); fade(DbgMusic.gate && DbgMusic.gate.gain, off ? 0 : 1);
  if (A.crowd) A.crowdLevel(off ? 0 : A.crowdBase, off ? .2 : 1);
}

// ══════════════════ 악운의 동전 확률 표시 ══════════════════
function renderGoat() {
  const el = $('#goatLbl'); if (!el) return;
  const cur = state.cursed && state.started && !state.over;
  el.innerHTML = cur ? '🐐 <b>악운의 판</b>' : `🐐 악운 <b>${Math.round(goatP() * 100)}%</b>`;
  el.classList.toggle('now', !!cur); el.title = cur ? '이번 판은 악운의 동전 — 탄 +1, 판돈 ×3' : '다음 판 악운의 동전(666·염소) 확률 — 염소 없이 판이 끝날 때마다 +2%';
}
{ const rs = renderStage; renderStage = function () { rs.apply(this, arguments); renderGoat(); }; }

// ══════════════════ 오디오 감시 ══════════════════
// 브라우저가 오디오를 멈추거나(suspended/interrupted), 어떤 소리가 NaN을 흘려 출력 체인이 통째로 먹통이 되는 경우를 1초마다 확인해 되살린다.
const AudioWD = { resumes: 0, repairs: 0, last: '' };
function audioDiag() {
  if (!A.ctx) return '아직 없음';
  return `${A.ctx.state} · 마스터 ${A.master.gain.value.toFixed(2)} · 음악 ${A.music.gain.value.toFixed(2)}×${A.musicGain.gain.value.toFixed(2)} · 필터 ${Math.round(A.musicFilter.frequency.value)}Hz${A._bgmOff ? ' · 브금 꺼짐(일시정지)' : ''}${musicOn ? '' : ' · 음악 버튼 꺼짐'}${settings.voiceSfx === false ? ' · 대사 소리 꺼짐' : ''} · 재개 ${AudioWD.resumes} · 복구 ${AudioWD.repairs}${AudioWD.last ? ' (' + AudioWD.last + ')' : ''}`;
}
function audioRepair(why) { // 출력 체인(컴프레서·잔향·음악 필터)을 새로 만들어 NaN에 오염된 내부 상태를 버린다
  const c = A.ctx; AudioWD.repairs++; AudioWD.last = why; console.warn('audio repair:', why);
  try {
    A.master.disconnect(); const comp = c.createDynamicsCompressor(); comp.threshold.value = -8; comp.knee.value = 6; comp.ratio.value = 10; comp.attack.value = .001; comp.release.value = .25;
    A.master.connect(comp); comp.connect(c.destination); try { A.comp.disconnect(); } catch (e) {} A.comp = comp; if (AudioWD.an) A.master.connect(AudioWD.an);
    const rev = c.createConvolver(); rev.buffer = A.rev.buffer; try { A.rev.disconnect(); A.revSend.disconnect(); } catch (e) {} A.revSend.connect(rev); rev.connect(A.master); try { A.musicRev.disconnect(); } catch (e) {} A.musicRev.connect(rev); A.rev = rev;
    const mf = c.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 16000; try { A.music.disconnect(); A.musicFilter.disconnect(); } catch (e) {}
    A.music.connect(mf); mf.connect(A.musicGain); mf.connect(A.musicRev); A.musicFilter = mf;
  } catch (e) { console.warn(e); }
}
setInterval(() => {
  if (!A.ctx) return;
  if (A.ctx.state !== 'running' && !document.hidden) { AudioWD.resumes++; A.ctx.resume().catch(() => {}); }
  if (!AudioWD.an) { AudioWD.an = A.ctx.createAnalyser(); AudioWD.an.fftSize = 512; AudioWD.buf = new Float32Array(512); A.master.connect(AudioWD.an); }
  AudioWD.an.getFloatTimeDomainData(AudioWD.buf); for (const v of AudioWD.buf) if (v !== v) { audioRepair('NaN'); break; }
  const g = [A.master.gain.value, A.musicFilter.frequency.value]; if (g.some(x => x !== x)) audioRepair('param NaN');
}, 1000);
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (A.ctx && A.ctx.state !== 'running') A.ctx.resume().catch(() => {}); }, true));

// 유언 입력칸에 포커스가 있어도 Pause 키로 디버그 패널이 열리게
$('#willInput').addEventListener('keydown', e => { if (e.key === 'Pause') { e.preventDefault(); toggleDbg(); } });

// ══════════════════ 계산기: 정밀 계산 ══════════════════
// 관측자 기준으로 판 전체를 푼다.
//  · 아는 칸 = 쏴서 빈칸으로 확인된 칸. 플릭으로 넘긴 칸은 아무도 못 봤으니 '미확인'으로 남는다.
//  · 탄은 미확인 칸 어디에나 같은 확률로 있을 수 있다 → 다음 칸 사망 확률 = 남은 탄 ÷ 미확인 칸.
//  · 플릭은 이번 격발 확률을 바꾸지 않는다(넘긴 칸도 미확인으로 남으니까). 대신 앞에 남은 칸을 줄여서, 한 바퀴가 돌기 전
//    '마지막 칸' 판단을 흐리게 만든다 — 계산기는 이 차이까지 따진다.
//  · 격발·플릭·양보·스핀·+1발 각각의 '이번 판에서 내가 죽을 확률'을 끝까지(양쪽 최선 가정) 재귀로 구해서 가장 낮은 수를 고른다.
const CALC = { S: 1, P: 2, R: 4, F: 8 };
function calcMask(i) {
  const s = state.seats[i]; if (bossRule() === 'noitems') return 0;
  return (s.used.spin || bossRule() === 'volkov' ? 0 : CALC.S) | (s.used.pass ? 0 : CALC.P) | (s.used.raise || (state.cursed && state.raiseCount >= 1) ? 0 : CALC.R) | (state.flickUsed && state.flickUsed[i] ? 0 : CALC.F);
}
function calcSolve(i) {
  const N = state.N, noF = bossRule() === 'noitems', memo = new Map(), busy = new Set();
  // f: 지금 차례인 사람이 최선을 다했을 때 이번 판에서 죽을 확률. U 미확인 칸, r 이번 바퀴에 앞으로 남은 칸, b 남은 탄
  function f(U, r, b, me, op, d) {
    if (r <= 0 || U <= 0) { U = N; r = N; } // 한 바퀴: 딜러가 탄을 다시 꽂고 돌린다 → 전부 미확인
    const key = U + ',' + r + ',' + b + ',' + me + ',' + op;
    if (memo.has(key)) return memo.get(key).v;
    const p = Math.min(1, b / U);
    if (busy.has(key) || d > 60) return p; // 순환(서로 계속 넘기는 경우) 안전장치
    busy.add(key);
    const opt = [['fire', p + (1 - p) * (1 - f(U - 1, r - 1, b, op, me, d + 1))]];
    if ((me & CALC.F) && r >= 2 && p < 1) opt.push(['skip', p + (1 - p) * (1 - f(U - 1, r - 2, b, op, me & ~CALC.F, d + 1))]);
    if (me & CALC.P) opt.push(['pass', 1 - f(U, r, b, op, me & ~CALC.P, d + 1)]);
    if (me & CALC.S) { const rf = noF ? 0 : CALC.F; opt.push(['spin', 1 - f(N, N, b, op | rf, (me & ~CALC.S) | rf, d + 1)]); } // 스핀하면 둘 다 플릭 복구
    if ((me & CALC.R) && b + 1 < r) opt.push(['raise', 1 - f(U, r, b + 1, op, me & ~CALC.R, d + 1)]);
    let best = opt[0]; for (const o of opt) if (o[1] < best[1] - 1e-9) best = o;
    busy.delete(key); memo.set(key, { v: best[1], a: best[0], opt });
    return best[1];
  }
  const N0 = state.N, U = N0 - state.fired.size, r = N0 - state.shot, b = remLive(), me = calcMask(i), op = calcMask(1 - i);
  f(U, r, b, me, op, 0);
  const top = memo.get((r <= 0 || U <= 0 ? N0 + ',' + N0 : U + ',' + r) + ',' + b + ',' + me + ',' + op) || { a: 'fire', v: b / U, opt: [['fire', b / U]] };
  return { a: top.a, v: top.v, opt: Object.fromEntries(top.opt), p: Math.min(1, b / Math.max(1, U)), U, r, b, sk: Math.max(0, U - r) };
}
PERS.calculator.desc = '플릭으로 넘어간 칸까지 미확인으로 계산해 정확한 사망 확률을 낸다. 모든 행동의 기대 사망률을 끝까지 풀어 가장 낮은 수를 둔다.';
PERS.calculator.decide = c => calcSolve(state.seats.indexOf(c.seat)).a;
// 계산기의 발언: 실제로 계산한 숫자를 그대로 말한다
const pc = x => (Math.round(x * 1000) / 10).toFixed(x > 0 && x < .1 ? 1 : 0) + '%';
const ACT_KO = { fire: '격발', skip: '플릭샷', pass: '양보', spin: '스핀', raise: '+1발' };
function calcLine(i, act) {
  const R = calcSolve(i), o = R.opt, alt = Object.entries(o).filter(([a]) => a !== act).sort((x, y) => x[1] - y[1])[0];
  const base = R.sk ? `미확인 ${R.U}칸(넘어간 칸 ${R.sk}) 중 ${R.b}발 → 다음 약실 ${pc(R.p)}.` : `남은 ${R.r}칸 중 ${R.b}발 → 다음 약실 ${pc(R.p)}.`;
  const mine = o[act] != null ? o[act] : R.v, cmp = alt ? ` 끝까지 내 사망률: ${ACT_KO[act]} ${pc(mine)} ${Math.abs(alt[1] - mine) < .0005 ? '=' : mine < alt[1] ? '<' : '>'} ${ACT_KO[alt[0]]} ${pc(alt[1])}.` : '';
  const tail = { fire: pick(['격발.', '허용 범위.', '실행.']), skip: pick(['한 칸 넘긴다. 이번 확률은 불변, 판이 흐려진다.', '플릭. 다음 격발 확률은 같다. 이후 구조가 유리하다.']),
    pass: pick(['위험 이전.', '이 확률은 네 몫이다.']), spin: pick(['재샘플링.', '초기화가 최적.']), raise: pick(['분자 +1. 네 쪽 기대값 하락.', '변수를 늘린다.']) }[act] || '';
  return `${base}${cmp} ${tail}`.replace(/\s+/g, ' ').trim();
}
// 상대가 플릭하면: 미확인 칸이 늘었다고 재계산해서 말한다
PERS.calculator.lines.r_skip = ['플릭샷 감지. 넘어간 칸은 미확인으로 유지. 재계산: 다음 약실 {p}%.', '한 칸이 관측 없이 지나갔다. 분모 유지, 기대값 재조정. 다음 {p}%.'];
PERS.calculator.lines.skip = ['이번 격발 확률은 불변. 넘긴 칸이 판을 흐린다.'];

