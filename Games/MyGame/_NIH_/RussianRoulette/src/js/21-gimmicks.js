// ══════════════════ v7: 연출 · 기믹 묶음 ══════════════════
const DEALER = '딜러 아르카디';
Object.assign(A, {
  handTurn() { if (!this.ctx) return; const t = this.now(), b = this.bus(.9, 0, .2); // 손으로 돌리는 마찰음 + 멈춤쇠 딸깍
    { const n = this.noiseSrc(t, .45), f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2; const g = this.env(t, .07, .4, .1); n.connect(f); f.connect(g); g.connect(b); }
    this.modal(t + .12, [3300, 5100], [.012, .01], [.08, .05], b); this.modal(t + .45, [2600, 4200, 6100], [.03, .02, .015], [.26, .15, .08], b); this.thump(t + .45, 180, 90, .05, .35, b); },
  breath() { if (!this.ctx) return; const t = this.now(), b = this.bus(.8, 0, .1), s = this.noiseSrc(t, 1.1), f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(900, t + .45); f.Q.value = .9;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.09, t + .35); g.gain.linearRampToValueAtTime(.02, t + .5); g.gain.linearRampToValueAtTime(.07, t + .7); g.gain.exponentialRampToValueAtTime(.0001, t + 1.05);
    s.connect(f); f.connect(g); g.connect(b); },
  boo() { if (!this.ctx) return; const c = this.ctx, t = this.now(), b = this.bus(.9, 0, .35), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.connect(b);
    for (let v = 0; v < 7; v++) { const o = c.createOscillator(); o.type = 'sawtooth'; const f0 = 105 + Math.random() * 70; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * .8, t + 1.5);
      const g = this.env(t + Math.random() * .15, .05, 1.4, .25); o.connect(g); g.connect(lp); o.start(t); o.stop(t + 1.8); } },
  cheer() { if (!this.ctx) return; const t = this.now(), b = this.bus(.9, 0, .35);
    { const s = this.noiseSrc(t, 1.6), f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = .7; const g = this.env(t, .22, 1.4, .3); s.connect(f); f.connect(g); g.connect(b); }
    for (let k = 0; k < 16; k++) this.burst(t + Math.random() * 1.3, .03, 'highpass', 1500, .7, .25 + Math.random() * .2, b); },
  mop() { if (!this.ctx) return; const t0 = this.now(), b = this.bus(.8, 0, .2);
    [0, .45, .9].forEach(d => { const t = t0 + d, s = this.noiseSrc(t, .4), f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.3;
      f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(1700, t + .35); const g = this.env(t, .18, .35, .08); s.connect(f); f.connect(g); g.connect(b); });
    this.modal(t0 + 1.25, [900, 1350], [.08, .06], [.06, .04], b); },
  buzz() { if (!this.ctx) return; const t = this.now(), b = this.bus(.7, 0, .1), o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 240; const g = this.env(t, .07, .9, .01); o.connect(f); f.connect(g); g.connect(b); o.start(t); o.stop(t + 1);
    this.burst(t, .01, 'highpass', 3000, .7, .6, b); },
  sting() { if (!this.ctx) return; const c = this.ctx, t = this.now(), b = this.bus(.9, 0, .5), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(300, t + 2.2); lp.connect(b);
    ['A2', 'C3', 'Eb3', 'A1'].forEach(n => { [-7, 7].forEach(dt => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n); o.detune.value = dt; const g = this.env(t, .06, 2.2, .02); o.connect(g); g.connect(lp); o.start(t); o.stop(t + 2.4); }); });
    this.thump(t, 70, 30, .8, 1.4, b); },
});

// ── 토너먼트 보스 규칙에 맞는 총
const startBullets = () => state.mode === 'tour' ? (bossRule() === 'volkov' ? 2 : 1) : settings.load;

// ── 시체 치우기 (사망 후 다음 판 전 암전)
async function cleanup(tok) {
  $('#clean').classList.add('on'); A.mop(); setMsg(`${DEALER}: 치워.`, 'info');
  await wait(1500); $('#clean').classList.remove('on'); await wait(350);
  return tok === state.token;
}

// ── 정전
function blackout(tok) {
  if (state.dark) return; state.dark = true; document.body.classList.add('dark'); A.buzz(); renderStage();
  log('정전! 아무것도 보이지 않는다.', 'sys');
  setTimeout(() => { state.dark = false; document.body.classList.remove('dark'); if (tok === state.token) { A.buzz(); renderStage(); } }, 3000);
}
function clearDark() { state.dark = false; document.body.classList.remove('dark'); }

// ── 조준 연출 (관자놀이에 총)
function aimOn(i, p) { const el = seatEls[i]; el.classList.remove('ash1', 'ash2', 'ash3'); el.classList.add('aim'); const lv = p >= 1 ? 3 : p >= .5 ? 2 : p >= 1 / 3 ? 1 : 0; if (lv) el.classList.add('ash' + lv); }
function aimOff() { seatEls.forEach(el => el.classList.remove('aim', 'ash1', 'ash2', 'ash3')); }

// ── 연기
function smokeFx() { const s = $('#smoke'); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go'); }

// ── 사이드 베팅 (AI 차례에 "이번에 죽는다"에 ₽100)
const BET = 100;
const betBtn = $('#sideBet');
function betOffer(i) {
  const h = humanS(), p = risk(); betBtn.className = 'sidebet';
  if (!h || state.mode === 'auto' || p <= 0 || p >= 1 || money.v < BET) return;
  const odds = Math.round(1 / p * 10) / 10; state.betOffer = { i, odds };
  betBtn.innerHTML = `🎲 사이드 베팅 ${won(BET)} — ${esc(state.seats[i].name)}, 이번에 죽는다 (×${odds}) <kbd>B</kbd>`; betBtn.classList.add('on');
}
betBtn.addEventListener('click', () => {
  if (!state.betOffer || state.bet || state.paused || money.v < BET) return;
  money.v -= BET; saveMoney(); state.bet = { ...state.betOffer, stake: BET }; A.coin(2);
  betBtn.textContent = `🎲 베팅 완료 — 적중 시 ${won(Math.round(BET * state.bet.odds))}`; betBtn.classList.add('placed'); renderAll();
});
function betClose() { state.betOffer = null; if (!state.bet) betBtn.className = 'sidebet'; }
function betSettle(i, died) { // died: true 적중 / false 빗나감 / null 환불(안 쏨)
  const b = state.bet; if (!b || b.i !== i) return; state.bet = null; betBtn.className = 'sidebet';
  if (died === true) { const w = Math.round(b.stake * b.odds); money.v += w; log(`사이드 베팅 적중! +${won(w)}`, 'spin'); A.coin(6); }
  else if (died === null) { money.v += b.stake; log(`사이드 베팅 환불 +${won(b.stake)} — 방아쇠를 당기지 않았다.`, 'sys'); const h = state.seats.findIndex(x => x && x.kind === 'human'); if (h >= 0) gainPop(h, '환불 +' + won(b.stake)); A.coin(2); }
  else log(`사이드 베팅 실패 −${won(b.stake)}`, 'sys');
  saveMoney(); renderAll();
}

// ── 도발 수락 (상대가 +1발 → 받아칠지 5초 안에)
let counterT = null;
function counterOffer(tok) {
  const box = $('#counterBox'); box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
  clearTimeout(counterT); counterT = setTimeout(counterHide, 5000);
}
function counterHide() { clearTimeout(counterT); $('#counterBox').classList.remove('on'); }
$('#counterYes').addEventListener('click', () => { counterHide(); humanAct('raise'); });
$('#counterNo').addEventListener('click', counterHide);

// ── 유언
function willShow(doom) { const b = $('#willBox'), inp = $('#willInput'); inp.value = state.will || ''; b.classList.toggle('doom', !!doom); b.querySelector('.wt').textContent = doom ? '유언을 남겨라 — 피할 곳이 없다' : '유언을 남겨라'; b.classList.add('on'); if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => { if (b.classList.contains('on')) inp.focus({ preventScroll: true }); }, 60); }
function willHide() { $('#willBox').classList.remove('on'); }
$('#willInput').addEventListener('input', e => { state.will = e.target.value.trim().slice(0, 40); });
$('#willInput').addEventListener('keydown', e => { if (e.key !== 'Enter' || e.isComposing) return; e.preventDefault(); e.stopPropagation(); // Enter = 유언 확정하고 방아쇠 (빈 칸이면 기본 유언)
  state.will = e.target.value.trim().slice(0, 40); e.target.blur(); willHide(); humanAct('fire'); });

// ── 플릭샷 (AI)
function doSkip(i, tok) { state.flickReq = i; state.skipping = i; return doFire(i, tok); }
ACT.skip = doSkip;

// ── AI 판단 보정: 도발 수락 · 컨디션 · 연승 경계
function aiAdjust(i, a) {
  const c = ctxFor(i), s = c.seat;
  if (s.pers === 'mimic' && c.oppLast && a === c.oppLast) return a; // 따라 하기가 최우선
  if (c.oppLast === 'raise' && c.can.raise && c.p < .5) { const ch = { berserker: .7, provocateur: .6, mimic: .5, gambler: .35, drunk: .3 }[s.pers] || 0; if (Math.random() < ch) return 'raise'; }
  if (c.can.skip && c.p > 0 && c.p < 1) { // 건너뛰기: 성격에 맞게
    const skipCh = { fatalist: c.chamber === s.n ? .6 : 0, veteran: c.chamber === s.n ? .5 : 0, mindgamer: c.p >= .25 ? .15 : .05,
      provocateur: .1, coward: c.p >= .25 ? .1 : 0, gambler: .08, drunk: .08 }[s.pers] || 0;
    if (a !== 'raise' && Math.random() < skipCh) return 'skip'; }
  const esc_ = c.can.spin || c.can.pass;
  if (s.mood === '숙취' && Math.random() < .1) return weighted(c, { fire: 1, spin: 1, pass: 1, raise: .5, skip: .5 });
  if (s.mood === '자신감' && a !== 'fire' && a !== 'raise' && c.p < .5 && Math.random() < .3) return 'fire';
  if (s.mood === '초조' && a === 'fire' && c.p >= .25 && esc_ && Math.random() < .3) return escape(c);
  if (c.opp.kind === 'human' && streak >= 3 && a === 'fire' && c.p >= .25 && esc_ && Math.random() < .35) return escape(c);
  return a;
}
const MOOD_T = { 숙취: 1.4, 자신감: .7, 초조: 1.25 };

// ── 차례 시작 시 부가 연출
function turnExtras(i, tok, p) {
  const s = state.seats[i]; state.turnP = p; provTurn(i, tok); // 도발꾼이 상대 차례를 찔러본다
  if (s.kind === 'human') {
    if (isDrunkVoice(i)) s.drink = Math.min(100, (s.drink == null ? 20 : s.drink) + 12); // 차례마다 한 잔씩
    const cn = canOf(i);
    if (state.lastAction[1 - i] === 'raise' && cn.raise) counterOffer(tok);
    if (lastStand(i)) willShow(true); else willHide(); // 유언: 마지막 칸이고 남은 아이템이 하나도 없을 때 (확률과 무관)
  } else {
    if (s.pers === 'drunk') { s.drink = Math.min(100, (s.drink || 0) + 12); }
    betOffer(i);
    if (p >= 1) setMsg(`${DEALER}: ${s.name}, 이 약실엔 반드시 탄이 있습니다.`, 'danger');
    else if (p >= HIGH && flickedAny()) setMsg(`${DEALER}: ${s.name}, 사망 확률 ${Math.round(p * 100)}%. 플릭샷이 있었으니 넘어간 칸도 모릅니다.`, 'danger');
  }
}

