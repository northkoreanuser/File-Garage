// ══════════════════ 도발꾼: 상황을 읽는 심리전 ══════════════════
// 조건(c) → 대사 묶음. 조건에 맞는 묶음들 중 가중치로 하나 고른다.
// {opp} 상대 이름 · {pct} 상대가 마주한 확률 · {ch} 다음 약실 · {left} 남은 약실 · {live} 남은 탄 · {t} 고민한 초 · {pot} 판돈 · {fav} 상대가 자주 도망치는 약실 · {streak} 연승 · {lives} 목숨
const PROV_TURN = [
  [c => c.p >= 1 && c.esc && c.any, 5, ['플릭샷 기억나냐? 비어 있을 수도 있지. …못 믿지? 그게 너야, {opp}.', '숫자가 뭐라든 플릭샷이 있었어. 당겨볼 불알은 있냐?', '공란일 수도 있다고. 근데 넌 절대 못 당겨. 겁쟁이니까.']],
  [c => c.p >= 1 && c.esc && !c.any, 5, ['도망칠 거지? 알아. 넌 그런 새끼야.', '피해, 피해. 다들 보고 있다. 네가 꽁무니 빼는 거.', '100%다, {opp}. 버튼 누르는 손가락 떨리는 거 보여.']],
  [c => c.p >= 1 && !c.esc, 6, ['끝이다. 마지막으로 할 말 있으면 지금 해.', '좆됐네, {opp}. 딱 한 발, 네 거다.', '도망갈 구멍 다 막혔지? 내가 막았어. 천천히 당겨.', '엄마한테 전화라도 할래? 아, 여긴 전화가 안 터지지.']],
  [c => c.p >= .5 && c.p < 1, 4, ['{pct}%. 동전 던지기랑 똑같네. 근데 동전은 네 대가리를 안 날리지.', '반반이다, {opp}. 사내새끼면 당겨.', '손 떨리는 거 여기서도 보인다. 씨발, 그 꼴로 총을 드냐?', '지금 네 심장 소리, 딜러까지 다 들린다.', '남은 칸 {left}개에 탄 {live}발. 산수는 할 줄 알지?']],
  [c => c.p >= .25 && c.p < .5, 3, ['{pct}%야. 애매하지? 그 애매함이 널 갉아먹는 거다.', '당길까 말까… 그 표정 사진 찍어두고 싶네.', '{ch}번 약실. 느낌 안 좋지? 나도 그래. 너한테.']],
  [c => c.p > 0 && c.p < .25, 3, ['{pct}%짜리에 벌벌 떨면 그냥 집에 가라.', '애들도 당기는 확률이다, 병신아.', '이 확률에 망설이면 넌 평생 겁쟁이야. 증명해봐.']],
  [c => c.noEsc && c.p < 1, 4, ['스핀도 양보도 다 썼지? 이제 도망갈 구멍 없다.', '아이템 다 태웠네. 이제 맨몸이다, {opp}.']],
  [c => c.last === 'spin' || c.last === 'pass', 3, ['또 도망 버튼 누르려고? 버튼 닳겠다, 겁쟁아.', '아까 도망친 거 다 봤어. 한 번 도망친 놈은 또 도망쳐.']],
  [c => c.think >= 6000, 4, ['아까 {t}초 고민했지? 이번엔 몇 초냐? 세고 있다.', '지난번에 {t}초. 그 시간에 기도라도 했냐?']],
  [c => c.think > 0 && c.think < 1200 && c.human, 2, ['아까 빨리 누르더라. 무서워서 빨리 끝내고 싶은 거지?']],
  [c => c.flicked, 3, ['잔재주 부리더니 이제 쫄았냐?', '플릭샷? 손재주 좋네. 그 손으로 방아쇠나 당겨봐.']],
  [c => c.human && c.profN >= 3, 3, ['넌 {fav}번 약실만 오면 도망치더라. 다 적어놨어.', '{fav}번. 네가 제일 무서워하는 숫자. 맞지?']],
  [c => c.human && c.streak >= 3, 3, ['{streak}연승? 운 다 떨어질 때 됐다. 느껴지지?', '연승하는 놈들은 꼭 이런 데서 뒈지더라.']],
  [c => c.human && c.tour && c.lives === 1, 5, ['목숨 하나 남았다며? 이번이 진짜 마지막이다.', '마지막 목숨. 여기서 죽으면 처음부터. 부담되지?']],
  [c => c.injured, 4, ['피 흘리면서 잘도 버티네. 손 미끄럽지?', '다친 손으로 방아쇠가 당겨지냐? 해봐.']],
  [c => c.pot >= 800, 2, ['판돈 {pot}. 그 돈이면 네 장례식 치르고도 남는다.', '{pot}짜리 판이야. 네 목숨값보다 비싸.']],
  [c => c.left <= 2 && c.p < 1, 3, ['남은 칸 {left}개. 이제 숨을 데가 없어.']],
];
const PROV_REACT = {
  fire: [ // 방아쇠를 거는 순간
    [c => c.p >= .5, 4, ['당겨! 당겨봐, 씨발!', '눈 감지 마. 끝까지 봐, {opp}.', '그래, 그렇게 떨면서 당기는 거야.', '{pct}%. 네 대가리가 버틸까?']],
    [c => c.p < .25, 3, ['그 확률로 폼 잡지 마라.', '{pct}%짜리 당기면서 영웅인 척하긴.']],
    [c => true, 2, ['손가락에 힘 들어가는 거 보인다.', '방아쇠 당길 때 눈 감을 거지? 다 보고 있다.']],
  ],
  spin: [
    [c => c.p < .25, 4, ['{pct}%에서 스핀? 좆도 아닌 확률에 도망을 치네.', '그 정도 확률에 스핀이라니. 역겹다.']],
    [c => c.p >= .5, 3, ['그래, 살고 싶겠지. 근데 그 버튼 누를 때 표정 봤냐?', '도망쳐도 실린더는 다시 돌아와. 너한테.']],
    [c => true, 2, ['겁쟁이.', '돌려봤자 겁은 안 빠진다.']],
  ],
  pass: [
    [c => c.p >= .4, 4, ['사내새끼가 {pct}%를 남한테 떠넘기냐. 역겹다.', '나한테 넘겨? 좋아. 대신 네 겁은 내가 기억해둔다.']],
    [c => true, 2, ['비겁한 놈.', '떠넘기는 것도 실력이라고 생각하지? 아니야, 그냥 쫄보야.']],
  ],
  raise: [
    [c => true, 3, ['오호, 불알은 달렸네? 근데 그거 허세지. 손끝이 하얘졌어.', '한 발 더? 좋아, 그 한 발에 네 이름 새겨줄게.', '허세 부리는 놈들이 제일 먼저 뒈져.']],
  ],
  skip: [
    [c => true, 3, ['잔머리 굴리는 거 보니 계산은 되나 보네. 겁은 계산 안 되지?', '한 칸 건너뛴다고 운명이 건너뛰냐?']],
  ],
  fast: [[c => true, 1, ['빨리 누른 척해도 소용없어. 다 보여.', '생각도 안 하고 누르네. 그게 용기냐, 포기냐?']]],
  slow: [[c => true, 1, ['{t}초. 그 {t}초 동안 무슨 생각 했냐? 엄마?', '{t}초나 걸렸네. 그게 네 용기의 무게다.']]],
};
const PROV_WAIT = [
  ['{t}초째다. 째깍, 째깍.', '뭘 그렇게 재? 계산기 두드려도 답은 똑같아.', '숨 쉬어, {opp}. 아, 숨도 못 쉬겠지?', '손가락이 안 움직이지? 그게 공포라는 거야.'],
  ['씨발, 잠들었냐? 당기든가 꺼지든가.', '{t}초. 다들 기다리잖아, 겁쟁이 새끼야.', '그렇게 오래 쳐다본다고 총알이 빠지진 않아.'],
];

function provCtx(t) {
  const s = state.seats[t], cn = canOf(t), p = t === state.turn ? risk() : (state.turnP != null ? state.turnP : risk());
  return { s, p, pct: Math.round(p * 100), ch: nextCh(), left: state.N - state.shot, live: remLive(), think: state.lastThink[t] || 0, last: state.lastAction[t],
    esc: cn.spin || cn.pass, noEsc: !cn.spin && !cn.pass, any: flickedAny(), flicked: !!(state.flickUsed && state.flickUsed[t]),
    human: s.kind === 'human', profN: prof.n, fav: profEsc(), streak, tour: state.mode === 'tour', lives: tour.lives, injured: !!s.injured, pot: state.pot };
}
function provFmt(i, str, c) {
  return fmt(i, str).replace(/\{pct\}/g, c.pct).replace(/\{ch\}/g, c.ch).replace(/\{left\}/g, c.left).replace(/\{live\}/g, c.live)
    .replace(/\{t\}/g, Math.max(1, Math.round(c.think / 1000))).replace(/\{pot\}/g, won(c.pot)).replace(/\{fav\}/g, c.fav).replace(/\{streak\}/g, c.streak).replace(/\{lives\}/g, c.lives);
}
const provLast = {};
function provPick(i, table, c) {
  const ok = table.filter(([f]) => { try { return f(c); } catch (e) { return false; } }); if (!ok.length) return null;
  let r = Math.random() * ok.reduce((a, x) => a + x[1], 0), g = ok[0];
  for (const x of ok) { r -= x[1]; if (r <= 0) { g = x; break; } }
  let pool = g[2].filter(x => x !== provLast[i]); if (!pool.length) pool = g[2];
  const t = pick(pool); provLast[i] = t; return provFmt(i, t, c);
}
const isProv = i => { const s = state.seats[i]; return s && s.kind === 'ai' && s.pers === 'provocateur'; };
async function provSpeak(i, text, tok, dur = 2800) {
  const el = seatEls[i].querySelector('.bubble'), rem = (el._until || 0) - performance.now();
  if (rem > 0) { if (rem > 1800) return; await wait(rem + 150); }
  if (tok !== state.token || state.over) return;
  el.classList.remove('emo'); bubble(i, text, dur);
}
// 상대 차례 시작: 상황을 찔러본다 + 사람이 망설이면 시간을 세며 조인다
function provTurn(t, tok) {
  const o = 1 - t; if (!isProv(o) || state.seats[t].pers === 'provocateur') return;
  const c = provCtx(t);
  if (Math.random() < (c.p >= .5 ? .8 : .55)) setTimeout(() => { if (tok === state.token && state.turn === t) { const x = provPick(o, PROV_TURN, provCtx(t)); if (x) provSpeak(o, x, tok); } }, 700);
  if (c.human) { const ts = state.turnStart;
    [[5500, 0], [11000, 1]].forEach(([ms, lv]) => (async () => {
      await wait(ms); if (tok !== state.token || state.turn !== t || state.turnStart !== ts || state.busy || state.over) return;
      if (Math.random() < .75) provSpeak(o, provFmt(o, pick(PROV_WAIT[lv]), { ...provCtx(t), think: performance.now() - ts }), tok);
    })()); }
}
// 상대 행동 직후: 상황 맞춤 반응 (없으면 기존 반응 대사)
function provReact(o, actor, act, tok, delay) {
  const c = { ...provCtx(actor), p: state.turnP != null ? state.turnP : 0 }; c.pct = Math.round(c.p * 100);
  let x = null;
  if (c.human && c.think > 0 && c.think < 1000 && Math.random() < .3) x = provPick(o, PROV_REACT.fast, c);
  else if (c.human && c.think >= 7000 && Math.random() < .4) x = provPick(o, PROV_REACT.slow, c);
  if (!x && PROV_REACT[act]) x = provPick(o, PROV_REACT[act], c);
  if (!x) return false;
  setTimeout(() => { if (tok === state.token) provSpeak(o, x, tok, 2400); }, delay);
  return true;
}

