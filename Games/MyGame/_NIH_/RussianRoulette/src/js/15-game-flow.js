// ══════════════════ 연출 ══════════════════
function spawnCasing() { const c = document.createElement('i'); c.className = 'casing g3dsig'; cylWrap.parentNode.appendChild(c); setTimeout(() => c.remove(), 200); } // 3D 탄피 신호 (보이지 않음)
async function insertRound(tok) {
  const r = document.createElement('i'); r.className = 'round-in g3dsig'; cylWrap.appendChild(r); // 3D 장전 신호 (보이지 않음)
  A.insert(); await wait(520); r.remove(); if (tok !== state.token) return;
  chEl(topIdx()).classList.add('loaded');
}
function kickFx() {
  const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  const m = $('#muzzle'); m.classList.remove('go'); void m.offsetWidth; m.classList.add('go');
  const a = $('#app'); a.classList.remove('quake', 'tslam', 'tslam2'); void a.offsetWidth; a.classList.add('quake');
  cylWrap.classList.remove('kick'); void cylWrap.offsetWidth; cylWrap.classList.add('kick');
}


// ══════════════════ 게임 흐름 ══════════════════
function ctxFor(i) {
  const me = state.seats[i], op = state.seats[1 - i], k = state.shot, N = state.N, b = remLive(), rem = N - state.shot;
  const can = canOf(i), oppCan = { spin: !op.used.spin, pass: !op.used.pass, raise: !op.used.raise };
  return { k, N, b, rem, p: risk(), chamber: nextCh(), can, oppCan, oppEsc: oppCan.spin || oppCan.pass,
    oppLast: state.lastAction[1 - i], oppThink: state.lastThink[1 - i], seat: me, opp: op };
}
function aiDecide(i) {
  const c = ctxFor(i); if (c.p === 0) return 'fire'; // 이미 비었다고 확인된 약실
  let a = PERS[c.seat.pers].decide(c);
  if (c.seat.pers === 'calculator') return a === 'fire' || c.can[a] ? a : 'fire'; // 계산기: 계산 결과 그대로
  a = aiAdjust(i, a);
  if (a !== 'fire' && !c.can[a]) a = 'fire';
  const serious = state.mode === 'tour'; // 토너먼트는 진지한 판: 도박수 없음 (확실하거나 확률 높을 때 피할 수 있으면 평소처럼 스핀·양보)
  if (a === 'fire' && c.p >= 1 && (c.seat.pers !== 'drunk' || serious)) a = escape(c);
  // 플릭샷이 있어서 확률이 높아도 확실하진 않을 때, 피할 수단이 있어도 드물게 제 발로 당긴다 (성격별 이유). 전략가·계산기는 안 함.
  const bv = BRAVE[c.seat.pers];
  const flicked = state.flickUsed[0] || state.flickUsed[1]; // 이번 실린더에서 누군가 플릭 → 100%가 가짜(공란)일 수도
  if (!serious && bv && flicked && c.p >= HIGH && c.p < 1 && a !== 'fire' && (c.can.spin || c.can.pass) && Math.random() < (typeof bv.p === 'function' ? bv.p(c) : bv.p)) a = 'fire';
  if ((c.seat.pers === 'calculator' || c.seat.pers === 'strategist') && c.p >= 1 && a === 'fire') a = escape(c); // 계산형·전략가: 100%에선 절대 안 쏜다
  return a;
}
function thinkTime(i) {
  const s = state.seats[i], c = ctxFor(i), [a, b] = PERS[s.pers].tempo;
  let t = a + Math.random() * (b - a);
  t *= c.p < .25 ? .6 : 1 + c.p * .8;
  if (s.pers === 'mimic' && c.oppThink) t = clamp(c.oppThink * (.85 + Math.random() * .3), 300, 4500);
  if (s.pers === 'mindgamer' && c.p >= 1 / 3) t += 700;
  t *= MOOD_T[s.mood] || 1;
  return t;
}
function save() { // 모드별 스냅숏 (판 상태 · 좌석 · 아이템 · 베팅 전부)
  if (!state.seats || !state.seats[0]) return;
  S.set('save_' + state.mode, { v: 3, mode: state.mode, N: state.N, c0: state.c0, live: [...state.live], shot: state.shot, fired: [...state.fired], firedBy: state.firedBy || {}, turn: state.turn,
    seats: state.seats.map(seatData), round: state.round, noItems: !!state.noItems, last: state.lastAction, pot: state.pot, gain: state.gain, vodka: !!state.vodka, ticket: !!state.spinTicket,
    flick: state.flickUsed, skips: state.flickSkips || [], emo: !!state.playerEmoUsed, cursed: !!state.cursed, raises: state.raiseCount || 0, laugh: laughCount, aiBet: state.aiBet || null });
}
const payout = p => p >= 1 ? 0 : Math.max(10, Math.round(p / (1 - p) * 10) * 10);
function saveMoney() { S.set('bank', bank); S.set('tbank', tbank); S.set('loans', loans); }

// 토너먼트 사망 몰수 비율: B1 10% → B7 100% (층마다 15%씩)
const tourLossRate = () => Math.min(1, .1 + .15 * (tour.floor - 1));
// 염소(불운의 동전) 확률: 기본 10%, 염소 없이 판이 끝날 때마다 +2%p 누적 (최대 100%) — 언젠가는 반드시 마주친다. 모드별 따로.
let goatM = S.get('goatM', {});
const goatP = () => Math.min(1, .1 + (goatM[state.mode] || 0));
function goatSet(v) { goatM[state.mode] = Math.round(Math.max(0, Math.min(.9, v)) * 100) / 100; S.set('goatM', goatM); }
const VS_LOSS = .25; // 1:1 사망 몰수 비율 (토너먼트보다 가볍게)
// 술꾼끼리: 상대 술꾼이 죽으면 형식적으로 슬퍼하다가 → 금세 잊고 → 보드카
const DRUNK_MOURN = {
  sad: ['아이고… {dead}… 내 술친구… 흑…', '{dead:아}… 누가 나랑 건배해주냐… 딸꾹…', '잘 가라, 술친구… 네 몫까지 마셔줄게… 흑흑…', '이렇게 가면… 외상값은 누가 갚아… 흑…'],
  forget: ['…근데 쟤 이름이 뭐였더라? 딸꾹.', '…음, 뭐 슬퍼하고 있었지? 까먹었다~', '흑… 흐… 아무튼! 술은 남았네~', '…딸꾹. 슬픈 건 슬픈 거고~'],
  drink: ['캬~ 보드카는 배신 안 해~ 건배!', '크으~ 역시 이 맛이야~ 딸꾹!', '한 병 더! 오늘은 내가 쏜다~ …아 방금 쐈구나~', '술친구는 또 생기지만 보드카는 소중해~'],
};
// 게임 도중 플릭샷으로 죽었는데 넘긴 칸은 빈칸이었다 — 그냥 쐈으면 살았다
const FLICK_WASTE = {
  _: ['넘긴 {q}번은 빈칸이었어. 그냥 쐈으면 살았지.', '플릭샷만 안 했어도 살았을 텐데.'],
  provocateur: ['야, {q}번 빈칸이었다. 그냥 당겼으면 살았어, 병신아.', '잔머리 굴리다 뒈졌네. 그냥 쐈으면 됐잖아, {opp}.', '플릭샷? 네 손으로 빈칸 버리고 탄 골랐다. 축하한다, 씨발.', '살 칸을 제 손으로 넘겼네. 이건 운이 아니라 지능 문제야.'],
  coward: ['저… 넘기신 칸… 비어 있었대요… 어떡해…', '그냥 쏘셨으면… 사셨을 텐데… 흑…'],
  gambler: ['🃏 좋은 패를 버리고 폭탄을 뽑았네.', '🎲 {q}번이 빈칸이었어. 폴드 타이밍이 틀렸지.'],
  berserker: ['하! 피하려다 맞았군! 그냥 당겼어야지!', '잔재주 부리다 죽는 놈이 제일 한심해!'],
  calculator: ['넘긴 {q}번 약실: 빈칸. 플릭샷이 생존을 사망으로 바꿨다.', '확률은 같았다. 네 선택만 틀렸지.'],
  strategist: ['수를 잘못 읽었군. 넘긴 칸이 살 길이었다.', '안전한 수를 버리고 위험한 수를 뒀다.'],
  fatalist: ['운명은 {q}번에 빈칸을 줬다. 네가 거절했지.', '…피하려는 순간, 운명이 찾아온다.'],
  mindgamer: ['넘길 때 확신에 찬 얼굴이었지. 틀렸어.', '네 손이 너를 속였어. 빈칸을 버렸잖아.'],
  veteran: ['괜히 손대지 말라고 했지. 빈칸이었어.', '전장에서도 그런 놈들이 먼저 간다.'],
  drunk: ['딸꾹… 그 칸 비었었는데~ 그냥 쏘지~', '휙 넘기더니 탕~ 아까워라~ 딸꾹'],
  mimic: ['넘긴 칸이 빈칸이었대~ 헤헤, 나는 안 따라 할래~', '그냥 쐈으면 살았는데~ 바보~'],
};
// 첫 턴에 플릭샷으로 사망 (위로금 없음 · 몰수) — 제 손으로 고른 죽음에 대한 조롱
const FIRST_FLICK_DEATH = {
  _: ['첫 턴부터 잔재주 부리다 갔군.', '플릭샷? 제 손으로 탄을 골랐네.'],
  provocateur: ['씨발, 첫 턴부터 플릭샷? 잘난 척하다 뒈졌네. 위로금? 꿈 깨.', '손재주 자랑하다 제 머리 날렸냐? 병신 같은 게.', '운도 아니고 네 선택이었어, {opp}. 그러니까 한 푼도 없어.', '플릭샷으로 자살하는 새끼는 처음 본다. 박수 쳐줄까?'],
  coward: ['왜… 왜 굳이 넘기셨어요… 그냥 쐈으면…', '플릭샷… 안 하셨으면 살았을지도… 죄송해요…'],
  gambler: ['🎲 첫 판부터 레이즈하더니 올인으로 날렸네.', '🃏 운에 맡겼으면 위로금이라도 받았을 텐데. 욕심이 화근이지.'],
  berserker: ['하하! 첫 턴부터 잔머리냐! 그러니까 죽지!', '정면으로 당겼어야지! 꼼수 부리다 간 놈!'],
  calculator: ['플릭샷은 확률을 바꾸지 않는다. 결과만 바꿨군.', '첫 격발 플릭 사망. 자기 선택이니 보상 없음. 합리적이다.'],
  strategist: ['첫 수부터 무리수를 두다니. 전략이 아니라 도박이었다.', '넘긴 칸이 아니라 쏜 칸이 문제였지.'],
  fatalist: ['운명에 맡기지 않고 손을 댔다. 그 대가다.', '…스스로 고른 칸이었다.'],
  mindgamer: ['플릭샷 하기 전에 손 떨리는 거 다 봤어.', '넘기면 살 줄 알았지? 그 표정 기억한다.'],
  veteran: ['젊은이, 첫 발엔 잔재주 부리는 게 아니야.', '괜히 손대다 가는 놈들 많이 봤지.'],
  drunk: ['딸꾹… 왜 휙 돌렸어~? 그냥 쏘지~', '빙글 돌리더니 탕~ 딸꾹… 아까워라~'],
  mimic: ['플릭샷 따라 하려고 했는데… 안 할래~', '헤헤, 휙 넘기고 탕~ 재밌었어~'],
};
// 첫 턴 첫 발 사망 (위로금 받음) — 이긴 AI의 반응
const FIRST_DEATH = {
  _: ['첫 발에… 운이 없었군.', '위로금이라도 챙겨가라.'],
  provocateur: ['씨발, 첫 발에 뒈지고 돈까지 받아가? 부럽다 진짜.', '너 딜러랑 짜고 쳤지? 죽고 싶어서 환장했냐?', '첫 턴 사망에 위로금이라… 개꿀이네. 다음 판도 그렇게 뒈져줘.', '방아쇠 한 번에 끝. 인생도 그렇게 날로 먹었냐?', '죽는 게 돈이 되네? 너한텐 그게 최선이겠다, {opp}.'],
  coward: ['아… 첫 발에… 너무 안됐어요…', '괜, 괜찮아요… 위로금이라도 받으셨잖아요…', '어떡해… 한 번도 못 해보시고…', '다음엔… 꼭 사실 거예요… 아마도요…'],
  gambler: ['🎲 첫 굴림에 꽝. 그래도 위로금은 챙겼네.', '🪙 1/6을 뚫었어. 그것도 재능이지.'],
  berserker: ['뭐야, 벌써 끝이야?! 싸워보지도 못했잖아!', '첫 발에 쓰러지다니! 시시하군!'],
  calculator: ['첫 격발 사망. 확률에 정확히 당첨됐다.', '위로금은 기대값 보정이다. 합리적이군.'],
  strategist: ['전략을 세울 틈도 없었군.', '첫 수에 끝나는 판도 있지.'],
  fatalist: ['첫 발. 운명은 서두를 때도 있다.', '…정해진 일이었다.'],
  mindgamer: ['방아쇠 당길 때 얼굴 봤어. 이미 알고 있었잖아.', '첫 발에 갈 거라는 거, 표정에 다 쓰여 있었지.'],
  veteran: ['첫 발은 늘 조심해야 하는 법이지.', '젊은이, 운이 없었군.'],
  drunk: ['딸꾹… 벌써 끝났어? 위로금으로 한잔 하자~', '첫 잔에 뻗는 놈 같네~ 딸꾹!'],
  mimic: ['첫 발에 죽었네~ 나도 따라 할까? …아니 싫어.', '헤헤, 위로금 받았네~ 좋겠다~'],
};
// 궁지: 다음이 마지막 칸이고 피할 아이템(스핀·양보)이 하나도 없다 — 유언·작별 곡 기준
const lastStand = i => nextCh() === state.N && (c => !c.spin && !c.pass)(canOf(i));
const flickedAny = () => !!(state.flickUsed && (state.flickUsed[0] || state.flickUsed[1])); // 이번 실린더에 누구든 플릭샷을 썼는가
async function newRound(tok, eject) {
  state.busy = true; state.busyLoad = true; state.over = false; stopTimer();
  aimOff(); counterHide(); willHide(); clearDark(); state.will = ''; drunkWakeNow(); document.querySelectorAll('.bubble.zz').forEach(e => { e.classList.remove('zz', 'show'); e.textContent = ''; }); if (state.bet) { money.v += state.bet.stake; saveMoney(); } state.bet = null; betClose();
  if (eject && !(await cleanup(tok))) return;
  // ↺ 다시 시작: 이 판이 시작되기 직전 상태로 되돌리고, 기억해 둔 판을 그대로 다시 짠다 (상대·말투·동전·탄 위치·첫 대사까지 동일)
  state.cursed = false; renderGoat(); // 전 판이 악운이었어도 바로 다음 판 확률로 표시
  const R = replayPlan; replayPlan = null; if (R) restorePre(R.pre);
  const pre = snapPre();
  state.noItems = false;
  state.round++; { const rm = S.get('roundM', {}); rm[state.mode] = state.round; S.set('roundM', rm); } // 판 수는 모드별
  state.noItems = R ? R.noItems : state.mode === 'tour' && tour.floor < FLOORS && Math.random() < .05; // 아이템 금지 판 (5%)
  if (R) { state.seats = JSON.parse(JSON.stringify(R.seats)); if (state.mode === 'tour') { tour.voice = R.tourVoice; S.set('tour', tour); } else if (R.randVoice !== undefined) S.set('randVoice', R.randVoice); }
  else if (state.mode === 'vs' || state.mode === 'tour') {
    // 토너먼트: 말투는 게임오버까지 고정. 상대가 말투를 피해서 뽑힌다.
    if (state.mode === 'tour' && (!tour.voice || tour.voice === 'drunk')) { let v, k = 0; do v = rollVoice(tour.lastVoice, 'drunk'); while (nemesis && nemesis.floor && v === nemesis.pers && ++k < 20); tour.voice = v; S.set('tour', tour); } // 토너먼트는 진지한 판: 플레이어 랜덤 말투에서 술꾼 제외
    let opp = state.mode === 'vs' ? makeAI() : tourOpp();
    if (state.mode === 'vs' && nemesis && PERS[nemesis.pers] && Math.random() < .2) opp = { kind: 'ai', name: nemesis.name, pers: nemesis.pers, used: freshUsed(), n: 0, nemesis: true };
    // 1:1: 매 판 새로, 상대 AI 성격과 겹치지 않게
    if (state.mode === 'vs') S.set('randVoice', rollVoice(S.get('randVoice', null), opp.pers === 'drunk' ? null : opp.pers)); // 겹치면 다시 뽑음 (술꾼끼리는 허용)
    state.seats = [humanSeat(), opp];
    if (state.mode === 'tour' && tour.opp && !tour.opp.filed) { tour.opp.filed = true; tourDossier(opp); } // 새 상대: 인사기록 카드 (클릭 스킵)
  }
  else { const a = makeAI(); state.seats = [a, makeAI(a.name, a.pers)]; }
  if (!R) state.seats.forEach(prepAI);
  state.seats.forEach((x, k) => { if (x.kind === 'human' && isDrunkVoice(k) && x.drink == null) x.drink = 20 + rand(25); }); // 술꾼 말투 플레이어도 취기
  { const nem = state.seats.some(x => x.nemesis); Music.setRate(1); Music.switchTo(nem ? 'nemesis' : null); if (nem) A.sting(); } // 숙적이면 즉시 전환
  state.lastAction = [null, null]; state.lastThink = [0, 0]; state.gain = [0, 0]; state.vodka = false; state.spinTicket = false; laughCount = [0, 0]; state.playerEmoUsed = false; renderEmotes(); state.forcedBy = -1; state.blunder = -1; state.braveWords = null;
  state.seats.forEach(x => { x.gag = false; x.slept = false; x.sleeps = 0; x.afterGim = null; x.gimSkip = false; if (x.kind === 'ai') { x.cpSleep = false; x.cpGag = false; } }); state.drunkDid = {};
  state.live = new Set(); state.shot = 0; state.fired = new Set(); state.firedBy = {}; state.deadAt = null; state.flickUsed = [false, false]; state.flickSkips = [];
  // 판돈
  state.pot = ANTE * 2 * (state.mode === 'tour' ? tour.floor : startBullets()); // 1:1·AI 대전은 장전 탄 수만큼 판돈도 커진다
  if (state.mode !== 'auto') {
    const ante = state.pot / 2;
    if (state.mode === 'tour') money.v = Math.max(0, money.v - ante); // 토너먼트: 대출 없음, 있는 만큼만
    else { if (bank < ante) { bank += LOAN; loans++; log(`딜러에게 ${won(LOAN)}을 빌렸다. 빚 ${loans}회.`, 'sys'); } bank -= ante; }
    saveMoney();
  }
  if (bossRule() === 'pot2') state.pot *= 2;
  if (state.mode !== 'auto' && streak >= 3) { state.pot = Math.round(state.pot * (1 + .5 * Math.min(streak - 2, 4))); log(`${streak}연승 — 판돈 할증 ${won(state.pot)}`, 'spin'); }
  seatEls.forEach(e => { e.classList.remove('dead'); e.querySelector('.bleed').innerHTML = ''; });
  renderAll();
  log(`<b>${esc(state.seats[0].name)}</b> vs <b>${esc(state.seats[1].name)}</b> — ${startBullets()}발 장전, 판돈 ${won(state.pot)}`, 'sys');
  // 탄 배치 · 선공을 먼저 정해 저장 → 장전 연출 중에 탭을 옮겨도 판이 그대로 이어진다
  // 동전 던지기: 앞면(777₽)=왼쪽 선공, 뒷면(네잎클로버)=오른쪽 선공. 10%는 불운의 동전(666₽ / 염소): 탄 +1발, 판돈 ×3, +1발은 둘 중 먼저 쓴 한 명만
  const dc = R ? R.coin : dbgCoin || {}; if (!R) dbgCoin = null; const coin = { side: dc.side != null ? dc.side : rand(2), cursed: dc.cursed != null ? dc.cursed : window.__coinCurse != null ? !!window.__coinCurse : Math.random() < goatP() };
  state.cursed = coin.cursed; state.raiseCount = 0; // (디버그 패널 지정 → 1회 · __coinCurse: 테스트용)
  if (coin.cursed) goatSet(0); // 염소가 뜬 판: 확률 초기화 (이 판이 끝나도 누적 없음)
  const nb = startBullets() + (coin.cursed ? 1 : 0), start = R ? R.start : rand(state.N); state.c0 = (start + 1) % state.N; if (R) state.live = new Set(R.live); else randomLive(nb); state.turn = coin.side;
  const snap = { pre, noItems: state.noItems, seats: JSON.parse(JSON.stringify(state.seats)), tourVoice: state.mode === 'tour' ? tour.voice : null, randVoice: S.get('randVoice', null), coin: { side: coin.side, cursed: coin.cursed }, start, live: [...state.live], intro: R ? R.intro : null };
  S.set('rsnap_' + state.mode, snap); if (R) log('↺ 같은 판을 처음부터 다시.', 'sys');
  if (coin.cursed) state.pot *= 3;
  if (state.mode === 'auto') aiBetOpen(); save();
  if (!(await coinToss(tok, coin))) return;

  // 장전: 열기 → 탄피 배출 → 한 발 삽입 → (탄 가림) → 스핀 → 닫기
  setMsg('실린더를 연다…', 'info');
  for (let j = 0; j < state.N; j++) chEl(j).classList.remove('loaded', 'reveal', 'spent', 'dbg');
  cylWrap.classList.add('open'); A.latch(false); await wait(480); if (tok !== state.token) return;
  if (eject) { setMsg('탄피를 턴다…', 'info'); spawnCasing(); A.casing(); await wait(900); if (tok !== state.token) return; }
  setMsg(nb > 1 ? `탄환 ${nb}발, 장전.` : '탄환 한 발, 장전.', 'info');
  if (bossRule() === 'volkov') setMsg('볼코프: 한 발로는 부족하지. 그리고 돌리는 건 없다.', 'danger');
  for (let k = 0; k < nb; k++) { await insertRound(tok); if (tok !== state.token) return; if (k < nb - 1) { rotateTo((topIdx() + 1) % state.N, 0, 220); await wait(260); if (tok !== state.token) return; } }
  await wait(350); if (tok !== state.token) return;
  await spinClose(tok, start, 3 + rand(2), 1900); if (tok !== state.token) return;
  paintChambers();

  state.busyLoad = false;
  { const br = BOSS_TXT[bossRule()], h = humanS();
    setMsg(`${DEALER}: 판돈 ${won(state.pot)}${state.mode === 'tour' ? ` · 죽으면 ${Math.round(tourLossRate() * 100)}% 몰수` : ''}${br ? ` · 이 층 규칙: ${br}` : ''}. ${state.seats[state.turn].name}, 먼저.${h && streak >= 2 ? ` 오늘 운이 좋군, ${h.name}.` : ''}`, 'info');
    if (br) log(`B${tour.floor} 규칙 — ${br}`, 'kill'); }
  // 시작: 인사 대사 또는 이모티콘 중 하나만 (AI 대전은 반반, 그 외는 대사)
  const IP = snap.intro || {}; // 다시 시작이면 첫 대사·이모티콘도 그대로
  const emoOpen = IP.emo != null ? IP.emo : state.mode === 'auto' && Math.random() < .5;
  if (emoOpen) { const a = IP.a != null ? IP.a : rand(2), s0 = state.seats[a], own = IP.e || fitEmo(s0.pers, EMO_SELF[s0.pers]); snap.intro = { emo: true, a, e: own };
    setTimeout(() => { if (tok !== state.token) return; const em = EMOTES.find(x => x[0] === own); showEmote(a, em[0]); emoReply(1 - a, a, em[0], em[1], tok); }, 400); }
  else { const ts = IP.t || [0, 1].map(i => linesOf(i) ? (state.seats[i].kind === 'ai' ? introLine(i) : introOf(i)) : null); snap.intro = { emo: false, t: ts };
    let d = 0; [0, 1].forEach(i => { if (linesOf(i)) { const t = ts[i]; setTimeout(() => { if (tok === state.token && t) sayOrEmote(i, t, 2600); }, d); d += 1000; } }); }
  S.set('rsnap_' + state.mode, snap);
  save(); await wait(state.mode === 'auto' ? 3200 : 900); if (tok !== state.token) return;
  nextTurn(tok);
}

function nextTurn(tok) {
  if (tok !== state.token) return;
  const i = state.turn, s = state.seats[i], p = risk();
  if (s.kind === 'human') { if (s.gimSkip) s.gimSkip = false; else { s.afterGim = null; const g = state.started && !state.busyLoad && state.mode !== 'auto' && drunkGimRoll(s, i);
    if (g) { state.busy = true; stopTimer(); renderAll(); (async () => { await (g === 'gag' ? drunkGag(i, tok) : drunkSleep(i, tok)); if (tok !== state.token) return; s.afterGim = g; s.gimSkip = true; nextTurn(tok); })(); return; } } }
  const doomed = s.kind === 'human' && lastStand(i); // 마지막 칸 · 아이템 없음 → 유언 · 작별 곡 (확률과 무관)
  doomMusic(doomed ? 'farewell' : p >= 1 ? 'slow' : null);
  Heart.set(p); A.duck(p >= 1 ? .5 : p >= .5 ? .22 : p >= 1 / 3 ? .34 : .5); // 100%는 느려질 뿐 볼륨은 그대로
  if (A.crowd) A.crowdLevel(p >= 1 ? 0 : p >= .5 ? .02 : A.crowdBase, 1.2);
  if (s.kind === 'human') {
    state.busy = false; state.turnStart = performance.now();
    const pct = Math.round(p * 100);
    setMsg(p >= 1 ? `${s.name}, 이 약실엔 반드시 탄이 있다.` : nextCh() === state.N ? `${s.name}, 마지막 약실 — 사망 확률 ${pct}%. 넘어간 칸에 탄이 숨어 있을 수도.` : p >= HIGH && flickedAny() ? `${s.name}, 사망 확률 ${Math.round(p * 100)}%. 플릭샷이 있었다 — 넘어간 칸에 탄이 있을 수도.` : p >= 1 / 3 ? `${s.name}, 사망 확률 ${pct}%. 선택하라.` : `${s.name}의 차례. 당기거나, 피하거나.`, p >= 1 / 3 || nextCh() === state.N ? 'danger' : '');
    startTimer(tok);
    const cn = canOf(i); if (p >= 1 && !cn.spin && !cn.pass && state.seats[1 - i].kind === 'ai') setTimeout(() => { if (tok === state.token) { const t = line(1 - i, 'doomOpp'); if (t) bubble(1 - i, t, 2600); } }, 500);
  } else { state.busy = true; setMsg(`${jo(s.name, '이')} 리볼버를 든다…`); aiTurn(i, tok); }
  turnExtras(i, tok, p);
  renderAll();
}

// ── 사람 시간 제한
let tInt = null;
function stopTimer() { clearInterval(tInt); tInt = null; $('#tbar').classList.remove('on', 'low'); }
function startTimer(tok) {
  stopTimer(); const s = state.seats[state.turn];
  if (!timerOn() || state.mode === 'auto') return;
  const slow = risk() >= 1 || lastStand(state.turn) ? 3 : 1; // 100% 또는 마지막 칸 궁지: 시간이 3배 느리게 간다
  const TT = () => Math.max(4, (bossRule() === 'fast' ? 8 : 15) - (s.injured || 0) * 3 + (state.vodka ? 5 : 0)) * 1000 * slow; let el = 0, last = performance.now(), lastSec = 99, hurried = false;
  const bar = $('#tbar'), fill = bar.querySelector('i'); bar.classList.add('on');
  tInt = setInterval(() => {
    if (tok !== state.token || state.busy) return stopTimer();
    const now = performance.now(); if (!state.paused && !$('#willBox').classList.contains('on')) el += now - last; last = now; // 유언 쓰는 동안은 시간이 멈춘다
    const T = TT(), left = T - el;
    fill.style.transform = `scaleX(${clamp(left / T, 0, 1)})`;
    if (sec0(left) > 3) bar.classList.remove('low');
    const sec = Math.ceil(left / 1000);
    if (sec <= 3 && sec < lastSec && sec > 0) { A.tick(); bar.classList.add('low'); }
    lastSec = sec;
    if (!hurried && el > 6000) { hurried = true; const o = 1 - state.turn; if (state.seats[o].kind === 'ai') bubble(o, pick(HURRY), 2000);
      if (isDrunkVoice(state.turn)) setTimeout(() => bubble(state.turn, pick(DRUNK_HURRY), 2200), 1500); }
    if (left <= 0) { stopTimer(); setMsg('시간 초과 — 딜러가 방아쇠를 강제한다.', 'danger'); humanAct('fire', true); }
  }, 100);
}

const sec0 = l => Math.ceil(l / 1000);

// AI 이모티콘 기믹: 대사 대신 이모티콘 (판당 1회)
const EMO_SUB = { fire: '😏', spin: '😱', pass: '😏', raise: '😂', skip: '😏', r_skip: '🙄', survive: '😂', r_fire: '👍', r_spin: '😏', r_pass: '😡', r_raise: '😱', doom: '🙏', doomOpp: '💀', curse: '😡', spin100: '😱', pass100: '😂', oppSpin100: '😡', intro: '👍' };
function say(i, key, text, dur) {
  const s = state.seats[i]; if (!s) return;
  if (s.muteUntil > performance.now()) return; // 이모티콘 반응 중엔 다른 대사 생략
  if (s.kind === 'ai' && EMO_SUB[key] && Math.random() < .18) {
    const e = fitEmo(s.pers, EMO_SUB[key]); showEmote(i, e);
    const k = (EMOTES.find(x => x[0] === e) || [])[1]; if (k) emoReply(1 - i, i, e, k, state.token); return;
  }
  if (text) sayOrEmote(i, text, dur);
}
// 술꾼 기믹
function drunkReset(s) {} // 턴 넘김 행동 → 재촉 기믹 1회 카운터 초기화
const DRUNK_HURRY = ['야~ 빨리 해! 딸꾹!', '뭐 해? 빨리 쏴~', '기다리다 술 깨겠다~ 빨리!'];
const DRUNK_HURRY2 = ['딸꾹… 왜 안 쏴? {opp}, 네 차례잖아~?', '이봐~ 딜러! 저 친구 자기 차례인 줄 모르나 봐~', '{opp}~ 총 안 받아? 딸꾹, 네 차례라니까~']; // (실은 술꾼 자기 차례)
const DRUNK_WAKE = ['…네 차례거든?', '너다, 술고래.', '…진심이냐?'];
// 술꾼이 안 쏘고 재촉할 때 상대의 반응 (성격별 · 플레이어 말투 · 커스텀 r_gag)
const R_GAG = {
  berserker: ['네 차례다, 이 술통아! 쏴!', '누굴 재촉해? 네가 쏠 차례잖아!'],
  coward: ['저, 저기… 그쪽 차례인데요…', '제 차례 아니에요… 제발…'],
  gambler: ['친구, 네 패야. 카드 까.', '딜러가 기다린다. 네 턴이야.'],
  calculator: ['정정합니다. 현재 차례는 당신입니다.', '당신 차례일 확률: 100%.'],
  strategist: ['시간 끌기인가? 네 차례다.', '혼란 작전은 안 통해. 네 턴이야.'],
  fatalist: ['운명이 너를 가리키고 있다. 네 차례다.', '…네 차례다. 도망칠 수 없다.'],
  mimic: ['빨리 해~ 딸꾹! …아, 네 차례구나.', '네 차례거든? 네 차례거든?'],
  mindgamer: ['재촉하는 척 시간 버는 거 다 보여. 네 차례야.', '떨리지? 그래서 남 탓하는 거지. 네 차례다.'],
  veteran: ['젊은 친구, 술이 과하군. 자네 차례일세.', '…자네 차례다. 정신 차려.'],
  drunk: ['어? 내 차례야? …아니 네 차례잖아~ 딸꾹!', '우리 둘 다 취했네~ 네 차례!'],
  provocateur: ['씨발, 네 차례라고 술고래야. 쫄았냐?', '재촉하는 척하면 안 쏴도 될 줄 알았냐? 네 차례다, 병신아.'],
};
PERS_IDS.forEach(id => { const L = PERS[id].lines; if (L && !L.r_gag) L.r_gag = R_GAG[id] || DRUNK_WAKE; });
const DRUNK_TIMEOUT_DIE = ['…어? 내 차례였어…?', '딸꾹… 내… 차례였던 거야…?', '빨리 하라니까… 아, 나였구나…'];
const DRUNK_DUMB_PRE = ['딸꾹… 100? 그게 뭐야~ 당겨~', '어… 이거 쏘는 거 맞지? 건배!', '숫자 같은 거 안 봐~ 딸꾹!', '스핀? 그게 뭐였더라~ 그냥 쏘자~'];
const DRUNK_BLUNDER_DIE = ['100%라고… 써 있었네… 딸꾹…', '…딸꾹. 방금 그건… 좀 멍청했다…', '스핀도 있었는데… 왜 당겼지… 나 바보냐…', '보드카가… 이겼네… 멍청한 놈…'];
const DRUNK_TIMEOUT_LIVE = ['어? 살았네? 내 차례였구나~ 딸꾹!', '헤헤… 나였어? 몰랐지~'];
function isDrunkVoice(i) { const s = state.seats[i]; if (!s) return false;
  return s.kind === 'ai' ? s.pers === 'drunk' : (voiceRandom() ? curVoiceId() === 'drunk' : voice.mode === 'preset' && voice.preset === 'drunk'); }
// 술꾼이 스핀·양보·+1발로 턴을 넘기면 재촉 기믹 1회 카운터 초기화 (다시 50% 추첨)
function resetGag(s) {}
// 술꾼 기믹 추첨 (AI 술꾼 · 술꾼 말투 플레이어 공통, 타이머 설정과 무관하게 상시)
const DD_GAG = {
  o: ['어~? 내 차례야? 아닌데~ 네 차례지~ 딸꾹!', '뭐래~ 난 아까 쐈어~ …쐈나?', '{opp}~ 너 차례잖아~ 빨리 해~'],
  i: ['아니야~ 너야 너~ 딸꾹!', '내가 왜~ 너 차례라니까~', '딜러~ 이 친구가 자꾸 나래~'],
  o2: ['아닌데~ 너라니까~ 딸꾹…', '…어? 우리 둘 다 아닌가?', '그럼… 딜러 차례야?'],
  dealer: ['술꾼 둘을 한 테이블에 앉힌 게 실수다.', '…오늘 수당은 두 배로 받는다.', '보드카 두 병이 앉아 있군.'],
  ri: ['아~ 나였구나~ 딸꾹!', '헤헤… 나였네~', '…어쩐지 총이 내 앞에 있더라~'],
  ro: ['거봐~ 내가 뭐랬어~ …뭐랬지?', '그치~ 난 알고 있었어~ 딸꾹', '…나도 방금 알았어~'],
};
const DEALER_DRUNK = ['…또 시작이군. 술꾼은 늘 골칫거리야.', '하아… 누가 이 친구한테 술을 줬나.', '이래서 술꾼은 테이블에 안 앉히는데.', '술꾼 상대는 수당을 두 배로 받아야 해.', '…딜러 인생 최대의 적은 보드카다.'];
const DRUNK_SLEEP_DIE = ['…음냐… 벌써 아침이야…?', '자다 깨서 쐈더니… 딸꾹…', '꿈인 줄… 알았는데…'];
const DRUNK_SLEEP_LIVE = ['하암~ 살았네? 한숨 더 잘까~', '잘 잤다~ 어? 살았어? 딸꾹!'];
function drunkGimRoll(s, i) {
  if (!isDrunkVoice(i)) return null;
  const ai = s.kind === 'ai', dk = (s.drink == null ? 30 : s.drink) / 100;
  if (s.gag || (state.lastAction.some(Boolean) && Math.random() < (ai ? .22 + dk * .15 : .12 + dk * .15))) { s.gag = false; return 'gag'; }
  if (window.__sleepForce || s.forceSleep || (!s.noSleep && Math.random() < (s.sleeps ? (ai ? .1 : .07) : (ai ? .3 : .2)))) { s.forceSleep = false; s.slept = true; s.sleeps = (s.sleeps || 0) + 1; return 'sleep'; }
  return null;
}
async function drunkGag(i, tok) {
  const s = state.seats[i], o = 1 - i; state.drunkDid = Object.assign(state.drunkDid || {}, { gag: true }); // 따라쟁이가 볼 수 있게
  bubble(i, pick(DRUNK_HURRY), 2300); setMsg(`${jo(s.name, '이')} 상대를 재촉한다…?`, 'info');
  await wait(2500); if (tok !== state.token) return;
  bubble(i, fmt(i, pick(DRUNK_HURRY2)), 2300);
  if (isDrunkVoice(o)) { // 술꾼끼리: 둘 다 자기 차례인 줄 끝까지 모른다 → 딜러가 말해줘야 안다
    const sb = (k, t, ms) => { seatEls[k].querySelector('.bubble').classList.remove('emo'); bubble(k, fmt(k, t), ms); };
    await wait(1700); if (tok !== state.token) return; sb(o, pick(DD_GAG.o), 2200);
    await wait(2300); if (tok !== state.token) return; sb(i, pick(DD_GAG.i), 2100);
    await wait(2200); if (tok !== state.token) return; sb(o, pick(DD_GAG.o2), 2000);
    await wait(2100); if (tok !== state.token) return;
    setMsg(`${DEALER}: …둘 다 정신 차려! ${s.name}, 당신 차례다. ${pick(DD_GAG.dealer)}`, 'danger'); tableSlam(true); // 술꾼끼리 헤매면 크게 쾅쾅
    await wait(1600); if (tok !== state.token) return; sb(i, pick(DD_GAG.ri), 2000);
    await wait(1000); if (tok !== state.token) return; sb(o, pick(DD_GAG.ro), 2000);
    await wait(1800); return;
  }
  setTimeout(() => { if (tok !== state.token) return; const t = line(o, 'r_gag') || (state.seats[o].kind === 'ai' ? pick(DRUNK_WAKE) : null); if (t) { seatEls[o].querySelector('.bubble').classList.remove('emo'); bubble(o, t, 2000); } }, 900); // 1:1·관전 모두: 상대가 "네 차례"라고 받아친다
  await wait(2300); if (tok !== state.token) return;
  setMsg(`${DEALER}: ${s.name}, 당신 차례다. ${pick(DEALER_DRUNK)}`, 'danger'); tableTap(); // 딜러가 책상을 툭
  await wait(1900); // 기믹일 뿐 — 강제 격발 없이 원래대로 자기 마음대로 행동
}
// 100% 상황이면 행동별 전용 대사
function actKey(i, act, c) {
  if (c.p < 1) return act;
  if (act === 'spin') return 'spin100';
  if (act === 'pass') return 'pass100';
  if (act === 'fire') { const L = linesOf(i); return (c.can.spin || c.can.pass) && L && L.fire100 ? 'fire100' : 'doom'; }
  return act;
}
// 상대(AI)의 반응: 100%면 반드시, 평소엔 확률적으로
function react(actor, act, p, tok, delay = 350) {
  const o = 1 - actor, os = state.seats[o]; if (!os || !linesOf(o)) return;
  let key;
  if (p >= 1) key = act === 'pass' ? 'curse' : act === 'spin' ? 'oppSpin100' : act === 'fire' ? 'doomOpp' : null;
  else if (isProv(o) && Math.random() < .75 && provReact(o, actor, act, tok, delay)) return; // 도발꾼: 상황 맞춤 심리전
  else if (Math.random() < ({ fire: .4, spin: .85, pass: .85, raise: 1, skip: .75 })[act]) key = 'r_' + act;
  if (!key) return;
  setTimeout(() => { if (tok === state.token) { const t = line(o, key); if (t) say(o, key, t, p >= 1 ? 2600 : 1800); } }, delay);
}
async function aiTurn(i, tok) {
  { const s = state.seats[i]; s.afterGim = null; const g = drunkGimRoll(s, i); if (g) { await (g === 'gag' ? drunkGag(i, tok) : drunkSleep(i, tok)); if (tok !== state.token) return; s.afterGim = g; } } // 술꾼 기믹 후엔 평소대로 아무거나
  { const s = state.seats[i]; if (s.pers === 'mimic') { await mimicCopy(i, tok); if (tok !== state.token) return; } } // 따라쟁이: 술꾼이 한 짓을 따라 한다
  const c = ctxFor(i), act = aiDecide(i), delay = thinkTime(i) + (c.p >= 1 ? 700 : 0);
  if (act === 'fire' && c.p >= 1) state.seats[i].forceDumb = false; // 디버그 헛발질 1회 소모
  const bel = seatEls[i].querySelector('.bubble'), rem = (bel._until || 0) - performance.now();
  const hold = rem > 0 && !bel._dots ? Math.min(rem, 1500) : 0;
  if (hold) { await wait(hold); if (tok !== state.token) return; }
  bubble(i, '', Math.max(300, delay - hold), true);
  await wait(Math.max(300, delay - hold)); if (tok !== state.token) return;
  state.lastThink[i] = delay;
  const brave = act === 'fire' && (c.can.spin || c.can.pass) && (c.p >= 1 || (flickedAny() && c.p >= HIGH)); // 피할 수 있는데 당긴다
  const dumb = brave && state.seats[i].pers === 'drunk' && c.p >= 1; // 확실한 탄인데 술김에 당김
  if (dumb) { const w = pick(DRUNK_DUMB_PRE); state.braveWords = { i, text: pick(DRUNK_BLUNDER_DIE), dumb: true }; bubble(i, w, 3200); setMsg(`${state.seats[i].name}… 100%인데 그냥 당긴다?!`, 'danger'); }
  else if (brave) { const w = fmt(i, pick((BRAVE[state.seats[i].pers] || BRAVE.drunk).lines)); state.braveWords = { i, text: w }; bubble(i, w, 3200); setMsg(`${state.seats[i].name}, 피하지 않는다…!`, 'danger'); }
  else { const ak = actKey(i, act, c), bt = Math.random() < .45 && bossTaunt(i, 'act'), t = bt || (state.seats[i].pers === 'calculator' ? calcLine(i, act) : line(i, ak) || line(i, act)); say(i, ak, t, c.p >= 1 ? 2800 : state.seats[i].pers === 'calculator' ? 3400 : 1900); }
  await wait(brave ? 2000 : c.p >= 1 ? 1100 : 520); if (tok !== state.token) return;
  ACT[act](i, tok); // 베팅은 격발 결과 직전까지 열려 있음
}
// 100%에서 제 발로 당기는 건 '누군가 플릭을 써서 마지막 칸이 공란일 수도 있을 때'만 — 그 도박수를 각자 이유로 감수한다
const BRAVE = {
  berserker: { p: .15, lines: ['플릭샷이 있었지. 빈 칸일지도 모르는 걸 피해? 당긴다!', '100%든 아니든, 광전사는 당긴다!', '공란일 수도 있다고? 그럼 더 좋지. 간다!'] },
  gambler: { p: .10, lines: ['🪙 플릭샷이 있었지. 이 숫자는 가짜일 수도. 콜.', '🎲 공란에 건다. 올인.', '🃏 딜러 패가 거짓말일 확률, 거기에 레이즈.'] },
  fatalist: { p: .10, lines: ['플릭샷이 운명을 비틀었을지도. 맡겨보지.', '운명이 빈 칸을 남겨뒀다면, 받겠다.', '숫자는 100이라 해도, 운명은 모른다.'] },
  mindgamer: { p: .08, lines: ['플릭 이후 딜러 표정이 달라졌어. 여긴 비었다.', '다들 죽는 칸이라 믿지. 플릭샷을 잊었군.', '딜러 눈썹이 떨렸어. 공란이다.'] },
  veteran: { p: .08, lines: ['플릭샷이 있었지. 늙은이가 걸어볼 만한 판이야.', '살 날도 얼마 안 남았다. 빈 칸에 걸지.', '전장에선 이보다 나쁜 확률에도 걸었다.'] },
  drunk: { p: 0, lines: ['딸꾹… 플릭샷 했잖아~ 비었을 거야~', '술김에 간다~ 빈 칸이다~!', '100? 플릭샷 했으니까 0이지~ 딸꾹!'] }, // 술꾼은 자체 판단(취기)으로
  provocateur: { p: .10, lines: ['플릭샷 봤지? 이건 허세가 아니라 계산된 허세다.', '겁쟁이들은 숫자만 보지. 난 당긴다.', '빈 칸이면 넌 평생 날 못 이겨.'] },
  coward: { p: .06, lines: ['플, 플릭샷이 있었으니까… 비었을지도… 제발…', '어차피 죽을 거면… 빈 칸에 걸래요…', '엄마… 비었다고 해줘…'] },
  mimic: { p: c => c.oppLast === 'fire' || c.oppLast === 'skip' ? .12 : .03, lines: ['플릭샷 봤지. 나도 빈 칸에 건다.', '따라 하는 게 내 방식이야. 100%라도.', '네가 나였으면 당겼겠지? 그럼 나도.'] },
};
const PLAYER_BRAVE = ['피하지 않겠다. 당긴다.', '100%든 뭐든, 내 손으로 끝낸다.', '…운에 맡긴다.'];
const MIRACLE_SELF = ['…살았어? 분명 마지막 칸이었는데.', '뭐야… 탄이 어디 갔지?', '…신이 있긴 한가 보군.', '하… 하하… 없어? 없다고?'];
// 빈 칸에 걸고 일부러 당겨서 산 사람: 놀람이 아니라 '내가 맞았다'
const MIRACLE_BET = {
  _: ['봤냐? 빈 칸이라고 했잖아!', '하! 내 말이 맞았지. 빈 칸이었어!', '역시… 거긴 비어 있을 줄 알았다고!'],
  gambler: ['크크, 공란에 건 보람이 있네. 잭팟!', '말했지? 딜러 패가 거짓말이었다고.'],
  berserker: ['하하하! 봤냐! 총알도 날 피해 간다!', '거봐, 빈 칸이잖아! 다음!'],
  fatalist: ['…운명은 이미 알고 있었다. 빈 칸이라는 걸.', '예정대로다. 비어 있었지.'],
  mindgamer: ['네 표정 보고 알았지. 빈 칸이라는 거.', '확률 최상이라며? 속았지?'],
  provocateur: ['씨발, 봤냐? 빈 칸이라니까. 쫄보들은 몰라.', '거봐, 겁쟁이. 이게 배짱이다.'],
  mimic: ['헤헤, 따라 쐈는데 맞았네~', '너도 해봐, 빈 칸이야~'],
  veteran: ['플릭샷을 봤으면 계산이 서지. 비어 있었다.', '…역시 거긴 비어 있었군.'],
  drunk: ['딸꾹! 봐봐, 비었다니까~ 내 감이 맞지?', '건배~! 빈 칸 맞췄다~'],
  coward: ['히익… 비, 빈 칸 맞았어요…! 제 말이 맞았죠…?', '살았다… 역시 비어 있었어…'],
};
const MIRACLE_OPP = ['뭐?! 어떻게…', '말도 안 돼. 마지막 칸이었잖아.', '…속임수냐, 딜러?', '탄이… 없었다고?'];
async function endTurn(i, tok, ms) {
  await wait(ms); if (tok !== state.token) return; state.turn = 1 - i;
  // 플릭샷으로 탄을 건너뛴 채 마지막 칸까지 살아남으면(= 다음이 다시 1번) 탄 위치가 드러난 셈 →
  // 딜러가 탄을 전부 빼서 무작위로 다시 꽂고 스핀을 건다.
  // 마지막 칸 차례인데 뒤에 플릭으로 건너뛴 칸이 남아 있으면(예: 6/6인데 100%가 아님) 이미 들킨 상태 → 여기서 바로 다시 꽂는다
  if (state.shot >= state.N) { // 한 바퀴 돌아 1번으로 돌아옴 (= 플릭으로 탄을 건너뛰었었다)
    const b = remLive();
    setMsg(`${DEALER}: 한 바퀴 돌았군. 탄을 다시 꽂고 돌린다.`, 'info'); log(`한 바퀴 — 딜러가 ${b}발을 다시 꽂고 스핀.`, 'sys');
    cylWrap.classList.add('open'); A.latch(false); await wait(450); if (tok !== state.token) return;
    A.slide(); await wait(450); if (tok !== state.token) return; // 탄을 손바닥에 털어낸다
    for (let k = 0; k < b; k++) { await insertRound(tok); if (tok !== state.token) return; await wait(150); }
    const start = rand(state.N); state.c0 = (start + 1) % state.N; randomLive(b); state.shot = 0; state.fired = new Set(); state.firedBy = {}; state.flickUsed = [false, false]; state.flickSkips = [];
    await spinClose(tok, start, 3, 1600); if (tok !== state.token) return;
    paintChambers(); renderAll();
  }
  save(); nextTurn(tok);
}

// 딜러 해설: '표기 100%인데 빈 칸'이 난 이유 — 누구의 플릭샷 때문인지
function flickWhy() {
  const sk = (state.flickSkips || []).filter(x => x.live); if (!sk.length) return null;
  if (sk.some(x => x.who == null)) return null; // 디버그로 넣은 탄은 누가 넘겼는지 서사 없음
  const who = [...new Set(sk.map(x => x.who))];
  if (sk.length >= 2 || who.length > 1) return '아무래도… 플릭샷 때문인 것 같군.'; // 둘 다 탄을 넘겼으면 얼버무린다
  const s = state.seats[who[0]]; return s ? `아무래도 ${s.name}의 플릭샷 때문인 것 같군.` : null;
}
async function doFire(i, tok) {
  if (state.shot >= state.N) { // 안전장치: 한 바퀴를 넘긴 채로 차례가 오면 쏘기 전에 탄을 다시 꽂는다
    const b = remLive(), st = rand(state.N); state.c0 = (st + 1) % state.N; randomLive(b); state.shot = 0; state.fired = new Set(); state.firedBy = {}; state.flickUsed = [false, false]; state.flickSkips = [];
    rotateTo(st, 1, 600); paintChambers(); renderStage(); log(`한 바퀴 — 딜러가 ${b}발을 다시 꽂았다.`, 'sys');
  }
  const forced = state.forcedBy === i; state.forcedBy = -1;
  const planned = state.flickReq === i; state.flickReq = -1; // AI가 미리 정한 플릭샷
  state.firstPull = !state.lastAction[0] && !state.lastAction[1]; state.firstFlick = false; state.pullFlick = null; // 판의 완전 첫 행동이 이 격발인가 (단발만 위로금)
  state.busy = true; emoReset(); state.lastAction[i] = state.skipping === i ? 'skip' : 'fire'; state.skipping = -1; stopTimer(); renderStage(); Heart.stop();
  const s = state.seats[i]; let pBefore = risk();
  const flickable = pBefore < 1 && !forced && !state.flickUsed[i] && state.shot + 2 <= state.N; // 각자 스핀당 1회 · 표기 100% 불가 · 마지막 칸 넘기기 불가
  counterHide(); willHide(); aimOn(i, pBefore);
  if (s.kind === 'ai' && !planned && pBefore >= 1 / 3 && Math.random() < pBefore * .6) { // 망설임: 걸었다 떼기
    hammer.classList.add('cocked'); A.cock(); setMsg(`${s.name}의 손가락이 멈춘다…`, 'danger');
    await wait(600); if (tok !== state.token) return; hammer.classList.remove('cocked'); A.tick(); await wait(700); if (tok !== state.token) return; }
  react(i, 'fire', pBefore, tok, 150);
  hammer.classList.add('cocked'); A.cock();
  state.shot++; rotateTo((startIdx() + state.shot) % state.N, 0, 170);
  let q = chAt(state.shot);
  let tension = pBefore >= 1 ? 1300 : 420 + Math.random() * 380 + pBefore * 500;
  // 사람: 격철이 걸린 동안 F(또는 방아쇠 버튼)를 한 번 더 누르면 플릭샷
  if (s.kind === 'human' && flickable) { tension = Math.max(tension, 750); state.flickWindow = i; state.flickHit = -1; fireBtn.disabled = false; fireBtn.classList.add('flickready'); setMsg('…F 한 번 더 누르면 플릭샷!', 'info'); }
  if (s.kind === 'ai' && planned) tension = 380;
  await wait(tension);
  state.flickWindow = -1; fireBtn.classList.remove('flickready'); fireBtn.disabled = true;
  if (tok !== state.token) return;
  let flickBonus = 0;
  if (flickable && (planned || state.flickHit === i)) {
    flickBonus = Math.round((40 + 300 * pBefore) / 10) * 10; // 위험할 때 플릭샷일수록 더 줌
    state.flickUsed[i] = true; // 다음 스핀 전까지 이 사람은 플릭 봉인
    if (state.firstPull) { state.firstPull = false; state.firstFlick = true; } // 첫 턴 플릭은 운이 아니라 선택 → 위로금 없음
    // 플릭샷: 첫 당김은 그냥 돌린 셈 — 방아쇠가 실린더를 한 칸 더 돌려 다음 칸을 때린다
    state.flickHit = -1; state.lastAction[i] = 'skip';
    hammer.classList.remove('cocked'); A.handTurn();
    setMsg(`플릭샷!`, 'spin');
    log(`${esc(s.name)} — 플릭샷!`, 'spin');
    (state.flickSkips = state.flickSkips || []).push({ who: i, live: state.live.has(q), q }); state.pullFlick = { q, live: state.live.has(q) }; paintChambers(); renderStage(); // 누가 실탄 칸을 건너뛰었나 (딜러 해설용)
    react(i, 'skip', risk(), tok, 200);
    pBefore = risk(); aimOn(i, pBefore);
    await wait(400); if (tok !== state.token) return;
    hammer.classList.add('cocked'); A.cock();
    state.shot++; rotateTo((startIdx() + state.shot) % state.N, 0, 200); q = chAt(state.shot);
    await wait(450 + pBefore * 400); if (tok !== state.token) return;
  }
  const top = phys(q);
  hammer.classList.remove('cocked'); betClose(); // 공이가 떨어지는 순간 베팅 마감
  if (state.live.has(q)) {
    betSettle(i, true); state.deathP = pBefore; return death(i, tok, forced); // 실탄이면 무조건 사망 (불발 없음)
  }
  state.fired.add(q); (state.firedBy = state.firedBy || {})[q] = i; betSettle(i, false); setTimeout(aimOff, 450); if (pBefore >= .5 && A.crowd) A.cheer();
  A.dry(); const e = chEl(top); e.classList.remove('miss'); void e.getBBox(); e.classList.add('miss');
  cylWrap.classList.remove('nudge'); void cylWrap.offsetWidth; cylWrap.classList.add('nudge');
  const betEmpty = !!(state.braveWords && state.braveWords.i === i && !state.braveWords.dumb); // 빈 칸이라는 도박수를 뒀었다
  state.braveWords = null;
  const miracle = q === state.N, aheadLive = [...state.live].filter(x => x > state.shot).length, why = miracle && !aheadLive ? flickWhy() : null; // 딜러 해설은 앞에 남은 실탄이 없을 때만 (아직 판이 안 끝났으면 입 다문다) // 표기상 100%였는데 빈 칸 (플릭으로 건너뛴 탄)
  const g = (miracle ? state.pot * 8 : payout(pBefore)) + flickBonus; state.gain[i] += g; setTimeout(() => { gainPop(i, '+' + won(g) + (miracle ? ' ×8!' : flickBonus ? ' 플릭!' : '')); if (miracle) A.jackpot(); else A.coin(g >= 100 ? 4 : 2); }, 300);
  paintChambers(); renderStage();
  if (s.kind === 'human') prof.fires++, S.set('prof', prof);
  log(`${esc(s.name)} — 찰칵. ${q}번째 약실 빈 칸. +${won(g)}${flickBonus ? ` (플릭 보너스 ${won(flickBonus)} 포함)` : ''}`);
  if (miracle) {
    log(betEmpty ? `<b>${esc(s.name)}</b> — 빈 칸에 걸고 당겼다. 적중!` : `<b>${esc(s.name)}</b> — 마지막 칸인데 살았다?! 탄이 없다.`, 'spin'); log(`마지막 칸 생존 — 판돈의 8배 <b>${won(state.pot * 8)}</b>!`, 'kill'); if (A.crowd) A.cheer();
    setTimeout(() => { if (tok !== state.token) return; bubble(i, betEmpty ? fmt(i, pick(MIRACLE_BET[s.kind === 'ai' ? s.pers : curVoiceId()] || MIRACLE_BET._)) : pick(MIRACLE_SELF), 2600); }, 350);
    setTimeout(() => { if (tok !== state.token) return; const o = 1 - i; if (linesOf(o)) bubble(o, pick(MIRACLE_OPP), 2400); }, 1300);
    if (why) setTimeout(() => { if (tok !== state.token) return; setMsg(`${DEALER}: ${why}`, 'info'); log(why, 'sys'); }, 2300); // 딜러의 부연 설명
  }
  else if ((forced || s.afterGim) && isDrunkVoice(i)) setTimeout(() => { if (tok === state.token) bubble(i, pick(s.afterGim === 'sleep' ? DRUNK_SLEEP_LIVE : DRUNK_TIMEOUT_LIVE), 2000); }, 350);
  else if (state.seats[i].boss && Math.random() < .5) setTimeout(() => { if (tok === state.token) bubble(i, bossTaunt(i, 'survive'), 2200); }, 350);
  else if (state.seats[1 - i] && state.seats[1 - i].boss && Math.random() < .5) setTimeout(() => { const t = tok === state.token && bossTaunt(1 - i, 'oppSurvive'); if (t) bubble(1 - i, t, 2200); }, 600);
  else if (Math.random() < .55) setTimeout(() => { if (tok === state.token) say(i, 'survive', line(i, 'survive'), 1600); }, 350);
  if (s.kind === 'ai' && Math.random() < .2) setTimeout(() => { if (tok === state.token) aiEmote(i, tok); }, 2100);
  setMsg(miracle ? (betEmpty ? `찰칵. ${s.name}의 도박이 통했다 — 빈 칸!` : `찰칵…?! ${s.name}, 마지막 칸인데 탄이 없다!`) : `찰칵. ${s.name} 생존.`, 'safe');
  return endTurn(i, tok, miracle ? (why ? 4400 : 2600) : 900); // 딜러 설명이 있으면 다 읽을 시간을 준 뒤 다음 멘트(한 바퀴 등)
}

async function doSpin(i, tok) {
  state.busy = true; emoReset(); state.lastAction[i] = 'spin'; stopTimer(); Heart.stop();
  const s = state.seats[i]; if (s.spinExtra) s.spinExtra--; else s.used.spin = true; drunkReset(s);
  if (risk() >= 1 && A.crowd) A.boo(); counterHide(); willHide();
  betSettle(i, null); betClose();
  react(i, 'spin', risk(), tok, 700);
  resetGag(s);
  const physLive = [...state.live].map(phys); // 꽂힌 탄의 물리적 약실은 그대로
  const start = rand(state.N); state.c0 = (start + 1) % state.N;
  state.live = new Set(physLive.map(P => ((P - state.c0 + state.N) % state.N) + 1)); state.shot = 0; state.fired = new Set(); state.firedBy = {}; state.flickUsed = [false, false]; state.flickSkips = [];
  renderAll(); paintChambers();
  // 닫은 채로 휘릭 돌리는 건 말이 안 된다 → 딜러가 실린더를 열고(꽂힌 탄이 보인다) 돌린 뒤, 도는 채로 닫는다 (처음 장전 때와 같음)
  setMsg(`${DEALER}: ${s.name}의 스핀. 실린더를 연다.`, 'spin'); cylWrap.classList.add('open'); A.latch(false);
  physLive.forEach(P => chEl(P).classList.add('loaded'));
  await wait(650); if (tok !== state.token) return;
  await spinClose(tok, start, 3 + rand(2), 1600); if (tok !== state.token) return;
  paintChambers();
  setMsg(`${s.name}, 실린더를 돌렸다 — 1번 약실부터 다시.`, 'spin');
  log(`${esc(s.name)} — 스핀. 약실 초기화.`, 'spin');
  return endTurn(i, tok, 900);
}

async function doPass(i, tok) {
  state.busy = true; emoReset(); state.lastAction[i] = 'pass'; stopTimer(); Heart.stop();
  const s = state.seats[i]; s.used.pass = true; drunkReset(s); renderAll();
  if (risk() >= 1 && A.crowd) A.boo(); counterHide(); willHide();
  betSettle(i, null); betClose();
  react(i, 'pass', risk(), tok, 450);
  resetGag(s);
  A.slide();
  setMsg(`${s.name}, 총을 그대로 밀어 넘긴다. 확률 ${Math.round(shownRisk() * 100)}% 그대로.`, 'spin');
  log(`${esc(s.name)} — 양보. ${nextCh()}번째 약실을 넘김.`, 'spin');
  return endTurn(i, tok, 1000);
}

async function doRaise(i, tok) {
  state.busy = true; emoReset(); state.lastAction[i] = 'raise'; state.raiseCount = (state.raiseCount || 0) + 1; stopTimer(); Heart.stop();
  const s = state.seats[i]; s.used.raise = true; drunkReset(s);
  counterHide(); willHide();
  betSettle(i, null); betClose();
  react(i, 'raise', risk(), tok, 900);
  resetGag(s);
  let avail = []; for (let x = state.shot + 1; x <= state.N; x++) if (!state.live.has(x)) avail.push(x);
  if (!avail.length) for (let x = 1; x <= state.N; x++) if (!state.live.has(x) && !state.fired.has(x)) avail.push(x);
  state.live.add(pick(avail));
  state.pot *= 2; renderAll();
  cylWrap.classList.add('open'); A.latch(false); await wait(420); if (tok !== state.token) return;
  const r = document.createElement('div'); r.className = 'round-in mid'; cylWrap.appendChild(r); A.insert();
  await wait(520); r.remove(); if (tok !== state.token) return;
  cylWrap.classList.remove('open'); A.latch(true); A.gasp(); bumpPot(); A.coin(6);
  setMsg(`${s.name}, 한 발 더 장전! 실탄 ${remLive()}발 · 판돈 ${won(state.pot)}`, 'danger');
  log(`<b>${esc(s.name)}</b> — +1발! 판돈 2배 (${won(state.pot)}).`, 'kill');
  paintChambers(); renderStage();
  return endTurn(i, tok, 1100);
}
const ACT = { fire: doFire, spin: doSpin, pass: doPass, raise: doRaise };

async function roundDraw(tok) {
  state.over = true; Heart.stop(); stopTimer();
  setMsg('딜러: 남은 실탄이 없다. 무효 판 — 판돈 반환.', 'info');
  log('무효 판 — 남은 실탄 없음.', 'sys');
  [0, 1].forEach(i => { if (state.seats[i].kind === 'human') { money.v += state.pot / 2 + state.gain[i]; saveMoney(); } });
  S.del('save_' + state.mode); if (state.mode === 'auto') aiBetSettle(-1, 0); renderAll();
  await wait(2600); if (tok !== state.token) return;
  newRound(tok, true);
}

async function death(i, tok, forced) {
  const dead = state.seats[i], win = state.seats[1 - i], chamber = chAt(state.shot); state.deadAt = { q: chamber, who: i }; { const b = seatEls[i].querySelector('.bubble'); clearTimeout(b._t); clearTimeout(b._typeT); b._typeTok = (b._typeTok || 0) + 1; b.classList.remove('show', 'emo'); b._resv = 0; } // 약실 표시: 죽은 칸 = 좌D/우D
  state.over = true; stopTimer();
  if (Music.variant === 'nemesis') Music.switchTo(null); // 숙적전 끝 → 바로 잔잔한 곡으로
  A.gun(risk() >= 1 || chamber === state.N); A.tinnitus(dead.kind === 'human' ? 5 : 3); A.muffle(5); Heart.stop();
  if (A.crowd) setTimeout(() => A.gasp(), 250);
  kickFx(); smokeFx(); counterHide(); willHide();
  chEl(phys(chamber)).classList.add('reveal');
  // 기록
  if (state.mode !== 'auto') { deaths[dead.kind === 'human' ? 'human' : 'ai']++; S.set('deaths', deaths); }
  { const st = statsM[state.mode]; // 모드별로 따로 기록
    if (dead.kind === 'ai') { st[dead.pers] = persRecord(dead.pers, state.mode); st[dead.pers].l++; }
    if (win.kind === 'ai') { st[win.pers] = persRecord(win.pers, state.mode); st[win.pers].w++; } }
  if (dead.kind === 'ai' && win.kind === 'ai') { const k = win.pers + '>' + dead.pers; riv[k] = (riv[k] || 0) + 1; S.set('riv', riv); }
  S.set('statsM', statsM);
  killHistM[state.mode][chamber - 1]++; S.set('killhistM', killHistM);
  S.del('save_' + state.mode);
  if (!state.cursed) goatSet((goatM[state.mode] || 0) + .02); // 염소 없는 판이 끝날 때마다 +2%p
  // 정산: 승자가 판돈 + 양쪽 보너스
  const prize = state.pot + state.gain[0] + state.gain[1];
  if (win.kind === 'human') { money.v += prize; wins++; S.set('wins', wins); saveMoney(); streak++; S.set('streak', streak);
    if (dead.nemesis || (nemesis && dead.name === nemesis.name && dead.pers === nemesis.pers)) { nemesis = null; S.del('nemesis'); log('숙적을 쓰러뜨렸다.', 'spin'); } }
  if (dead.kind === 'human') { streak = 0; S.set('streak', 0); if (win.kind === 'ai') { nemesis = { name: win.name, pers: win.pers, how: state.firstPull ? 'first' : state.firstFlick ? 'flick' : 'normal', victim: dead.name }; if (state.mode === 'tour') nemesis.floor = tour.floor; S.set('nemesis', nemesis); } } // 숙적은 하나만 (덮어씀) · 어떻게 죽였는지(how)도 기억해 재회 대사에 씀, 토너먼트면 죽은 층도 기억
  const firstDeath = dead.kind === 'human' && state.mode !== 'auto' && state.firstPull, flickDeath = dead.kind === 'human' && state.mode !== 'auto' && state.firstFlick; // 첫 턴 플릭 사망: 위로금 없이 몰수 + 조롱 // 첫 턴 첫 발에 사망 → 몰수 없이 위로금
  if (firstDeath) { money.v += state.pot; saveMoney(); log(`첫 격발 사망 — 몰수 없음. 위로금 ${won(state.pot)}.`, 'spin'); }
  else if (dead.kind === 'human' && state.mode !== 'auto') { const rate = state.mode === 'tour' ? tourLossRate() : VS_LOSS, loss = Math.min(money.v, Math.round(state.pot * rate)); money.v -= loss; saveMoney(); if (loss) log(`사망 — 판돈의 ${Math.round(rate * 100)}% ${won(loss)} 몰수.`, 'kill'); }
  let tourRes = state.mode === 'tour' ? tourApply(dead.kind === 'human') : null; // 결과는 즉시 확정·저장 (연출 중에 탭을 옮겨도 그대로)
  if (state.mode === 'auto') aiBetSettle(i, state.deathP);
  // 피
  const r = seatEls[i].querySelector('.portrait').getBoundingClientRect();
  Blood.splat(r.left + r.width / 2, r.top + r.height / 2);
  seatEls[i].classList.add('dead'); bleedCard(i);
  const bwo = state.braveWords && state.braveWords.i === i ? state.braveWords : null, bw = bwo && bwo.text; state.braveWords = null;
  const will = dead.kind === 'human' && state.will; state.will = '';
  showDeath(dead, will ? will : bw ? bw : (forced || dead.afterGim) && isDrunkVoice(i) ? pick(dead.afterGim === 'sleep' ? DRUNK_SLEEP_DIE : DRUNK_TIMEOUT_DIE) : line(i, 'die'), chamber);
  if (bw) $('#dzSub').textContent += bwo.dumb ? ' · 술김에 100%를 당겼다' : ' · 피할 수 있었지만 당겼다';
  chatDeath(dead, $('#dzQuote').textContent, $('#dzSub').textContent);
  setMsg(`탕. ${dead.name} 사망. ${jo(win.name, '이')} ${won(prize)}을 가져간다.`, 'danger');
  log(`<b>${esc(dead.name)}</b> 사망 — ${chamber}번째 약실. ${esc(win.name)} ${won(prize)} 획득.`, 'kill');
  renderAll();
  await wait(4200); if (tok !== state.token) return;
  hideDeath(); Blood.fade(); aimOff();
  const w = 1 - i; gainPop(w, '+' + won(prize)); A.coin(8);
  if (firstDeath) { setTimeout(() => { if (tok === state.token) { gainPop(i, '+' + won(state.pot) + ' 위로금'); A.coin(4); } }, 700);
    setMsg(`${DEALER}: 첫 발에 가다니. 위로금 ${won(state.pot)}은 챙겨 주지.`, 'info'); }
  const taunt = win.kind === 'ai' && (dead.kind === 'ai' || Math.random() < .5);
  const drunkPair = isDrunkVoice(w) && dead.kind === 'ai' ? dead.pers === 'drunk' : isDrunkVoice(w) && isDrunkVoice(i); // 술꾼끼리: 술친구를 잃고 형식적으로 슬퍼하다 금세 잊는다
  const wasteFlick = !flickDeath && state.pullFlick && !state.pullFlick.live; // 넘긴 칸이 빈칸이었는데 플릭해서 죽음 = 그냥 쐈으면 살았다
  if (drunkPair && linesOf(w)) {
    const sb = (t, ms) => { seatEls[w].querySelector('.bubble').classList.remove('emo'); bubble(w, fmt(w, t).replace(/\{dead:(이다|으로|이|을|은|과|아)\}/g, (_, q) => jo(dead.name, q)).replace('{dead}', dead.name), ms); };
    await wait(1200); if (tok !== state.token) return; sb(pick(DRUNK_MOURN.sad), 2600);
    await wait(2800); if (tok !== state.token) return; sb(pick(DRUNK_MOURN.forget), 2200);
    await wait(2000); if (tok !== state.token) return; A.glass && A.glass(); setMsg(`${jo(win.name, '이')} 보드카를 들이켠다.`, 'info');
    await wait(900); if (tok !== state.token) return; sb(pick(DRUNK_MOURN.drink), 2200); await wait(2400); if (tok !== state.token) return;
  }
  else if (wasteFlick && win.kind === 'ai') { await wait(1200); if (tok !== state.token) return; sayOrEmote(w, fmt(w, pick(FLICK_WASTE[win.pers] || FLICK_WASTE._)).replace('{q}', state.pullFlick.q), 3000); await wait(3000); if (tok !== state.token) return; }
  else if (flickDeath && win.kind === 'ai') { await wait(1200); if (tok !== state.token) return; sayOrEmote(w, fmt(w, pick(FIRST_FLICK_DEATH[win.pers] || FIRST_FLICK_DEATH._)), 3000); await wait(3000); if (tok !== state.token) return; }
  else if (firstDeath && win.kind === 'ai') { await wait(1200); if (tok !== state.token) return; sayOrEmote(w, fmt(w, pick(FIRST_DEATH[win.pers] || FIRST_DEATH._)), 3000); await wait(3000); if (tok !== state.token) return; }
  else if (taunt) {
    const tp = (TAUNT_EMO[win.pers] || TAUNT_ALL).filter(x => (PERS_EMO[win.pers] || TAUNT_ALL).includes(x)); const e = pick(tp.length ? tp : TAUNT_ALL); showEmote(w, e);
    await wait(1100); if (tok !== state.token) return;
    const pool = (TAUNT[win.pers] || {})[e]; if (pool) sayOrEmote(w, fmt(w, pick(pool)), 2600);
    await wait(2300); if (tok !== state.token) return;
  } else { speak(w, 'win', 2400); await wait(2000); if (tok !== state.token) return; }
  if (tourRes) { const go = await tourShow(tourRes); if (!go || tok !== state.token) return; }
  newRound(tok, true);
}

// ── 토너먼트 진행
function tourOverlay(ru, h, cls, p, btn, noBtn) {
  return new Promise(res => {
    $('#tcRu').textContent = ru; const H = $('#tcH'); H.textContent = h; H.className = 'tc-h ' + cls;
    $('#tcP').innerHTML = p; $('#tcBtn').textContent = btn;
    const no = $('#tcNo'); no.style.display = noBtn ? '' : 'none'; if (noBtn) no.textContent = noBtn;
    const ov = $('#tourOv'); ov.classList.remove('hide', 'fade');
    const close = v => { ov.classList.add('fade'); setTimeout(() => ov.classList.add('hide'), 500); res(v); };
    $('#tcBtn').onclick = () => close(true); no.onclick = () => close(false);
  });
}
function tourApply(humanDied) { // 토너먼트 결과를 바로 반영하고 저장
  if (humanDied) {
    tour.lives--; // 말투는 목숨이 전부 사라질 때(토너먼트 초기화)까지 유지
    if (tour.lives <= 0) { tourBest = Math.max(tourBest, tour.floor - 1); S.set('tourBest', tourBest); const f = tour.floor; S.set('tourDeadScreen', { name: state.name || '무명', f, best: tourBest, will: state.will || '' }); // 유언은 보고서에서 검열된다 // F5로 못 피하게 즉시 저장
      tourReset(); log('토너먼트 종료 — 처음부터.', 'sys'); return { kind: 'over', f }; }
    S.set('tour', tour); log(`부상. 목숨 ${tour.lives}개 남음 — 같은 상대와 재대결.`, 'kill'); return { kind: 'hurt' };
  }
  const reward = 300 * tour.floor; money.v += reward; saveMoney();
  tourBest = Math.max(tourBest, tour.floor); S.set('tourBest', tourBest);
  if (tour.floor >= FLOORS) { money.v += 5000;
    // 우승: 기본 목숨 3개를 뺀 남은 목숨을 3개 묶음 단위로 환불 (구매 횟수 + 루블). 5개 → 0묶음, 6 → 1, 9 → 2, 12 → 3
    const { packs, refund } = tourLifeRefund();
    if (packs) { lifeBought -= packs; S.set('lifeBought', lifeBought); money.v += refund; log(`남은 목숨 ${packs * 3}개 반환 — 구매 횟수 ${packs}회 · ${won(refund)} 환불.`, 'spin'); }
    saveMoney(); tourReset(); log('토너먼트 우승!', 'spin'); return { kind: 'win', reward, packs, refund }; }
  tour.prevOpp = tour.opp && tour.opp.name; tour.floor++; tour.opp = null; S.set('tour', tour); // 이감 명령서에 '지난 층 상대 말소'로 적힘 log(`층 돌파! 상금 ${won(reward)}. 지하 B${tour.floor}로 내려간다.`, 'spin');
  return { kind: 'clear', reward };
}
async function tourShow(o) { // 연출만
  renderAll();
  if (o.kind === 'over') return tourDeathScreen(o); // 토너먼트 완전 사망: 'ㅇㅇㅇ는 죽었다.' → 누르면 이름을 지우고 새로 시작
  else if (o.kind === 'win') { await volkovReport(); await tourPardonScreen({ name: state.name || '무명', prize: 5000 + o.reward, packs: o.packs, refund: o.refund }); // 사면 결정서
    switchMode('vs'); return false; } // 우승하면 1:1로
  else if (o.kind === 'clear') { setMsg(`계단을 내려간다… 지하 B${tour.floor}`, 'info'); await wait(1200); }
  return true;
}

