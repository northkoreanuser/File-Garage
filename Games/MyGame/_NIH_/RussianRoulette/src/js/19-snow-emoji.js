// ══════════════════ 창밖 눈 ══════════════════
(() => { const c = $('#snow'), g = c.getContext('2d'), fl = Array.from({ length: 45 }, () => ({ x: Math.random() * 150, y: Math.random() * 210, r: .6 + Math.random() * 1.8, v: .2 + Math.random() * .6, w: Math.random() * 6 }));
  (function f() { g.clearRect(0, 0, 150, 210); g.fillStyle = 'rgba(230,240,255,.85)';
    fl.forEach(p => { p.y += p.v; p.w += .02; p.x += Math.sin(p.w) * .3; if (p.y > 212) { p.y = -3; p.x = Math.random() * 150; } g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); });
    requestAnimationFrame(f); })(); })();

// (디버그 패널 → doom.js)


// ══════════════════ 이모티콘 ══════════════════
const EMOTES = [['😂', 'laugh'], ['😏', 'smirk'], ['😭', 'cry'], ['😱', 'scared'], ['😡', 'angry'], ['🙏', 'pray'], ['👍', 'good'], ['💀', 'skull']];
// 반응: 다른 이모티콘 / 말 / 이모티콘+말 섞어서. 보낸 것과 같은 이모티콘은 절대 안 돌려준다.
const EMO = {
  berserker: {
    laugh: ['💢', '뭐가 웃겨? 당겨보고 웃어라.', '🔥 웃음이 나와? 좋아, 그 웃음 끝까지 가나 보자.'],
    smirk: ['😤', '그 표정 지우게 해주마.', '💪 비웃어? 방아쇠 앞에선 다 똑같다.'],
    cry: ['🤣', '눈물은 무덤에서 흘려라.', '🙄 울 거면 집에 가.'],
    scared: ['😈', '겁먹었군! 그게 정상이다. 하하!', '🔥 그 공포, 맛있군.'],
    angry: ['🔥', '하! 화났냐? 좋아, 그래야 재밌지!', '🤜 덤벼라!'],
    pray: ['🤣', '신 따윈 없다. 총알뿐이지.', '⚔ 기도할 시간에 당겨라.'],
    good: ['💪', '흥. 칭찬은 살아남고 해라.', '🤝 …나쁘지 않군.'],
    skull: ['⚔', '해골? 네 얼굴이다.', '🔥 죽음은 두렵지 않다!'] },
  coward: {
    laugh: ['😰', '왜, 왜 웃어요… 뭐 알아요?', '🥺 웃지 마세요… 무서워요…'],
    smirk: ['😖', '그 표정… 뭔가 꾸미는 거죠?', '😣 저, 저 쳐다보지 마세요…'],
    cry: ['🥺', '저도… 울고 싶어요…', '😢 우리 그냥 집에 가면 안 돼요?'],
    scared: ['😨', '그쵸?! 무섭죠?! 저만 그런 거 아니죠?!', '😭 저도요… 저도요…'],
    angry: ['😰', '죄, 죄송해요! 제가 뭘 잘못했는지 모르겠지만!', '😖 화내지 마세요… 제발…'],
    pray: ['😢', '저, 저도 같이 기도할게요!', '🥺 하나님… 저희 둘 다요…'],
    good: ['🥺', '고, 고마워요… 착한 사람이네요…', '😖 저, 저요?'],
    skull: ['😱', '그, 그런 거 보내지 마요!!', '😭 으아아… 해골 싫어…'] },
  gambler: {
    laugh: ['🃏', '웃는 걸 보니 좋은 패인가?', '💸 포커페이스가 영 안 되는군.'],
    smirk: ['🎲', '블러프 냄새가 나는군.', '♠ 그 미소, 얼마짜리지?'],
    cry: ['🙄', '우는 연기? 블러프야.', '💰 눈물엔 배당이 없어.'],
    scared: ['🎰', '겁먹은 쪽이 먼저 폴드하지.', '🃏 떨고 있군. 좋은 신호야.'],
    angry: ['🤑', '틸트 왔군. 이제 돈 좀 벌겠어.', '♣ 화내면 판단이 흐려지지.'],
    pray: ['🎲', '운은 기도로 안 와. 주사위로 오지.', '🍀 난 네잎클로버 파야.'],
    good: ['🤝', '굿 게임.', '🥂 좋은 테이블이야.'],
    skull: ['🎰', '판돈이 목숨이지. 뭘 새삼.', '♠ 스페이드 에이스, 죽음의 카드.'] },
  calculator: {
    laugh: ['📉', '웃음 감지. 확률 변화: 0.', '웃음은 분모도 분자도 바꾸지 않는다.'],
    smirk: ['🧮', '표정 데이터 무시.', '📊 여유 표정. 근거 없음.'],
    cry: ['📉', '눈물은 확률을 바꾸지 않는다.', '감정적 반응. 예상 범위 내.'],
    scared: ['📈', '공포는 합리적이다. 수치를 봐라.', '🧮 두려움 정도: 적정.'],
    angry: ['⚠', '분노 감지. 판단력 저하 예상.', '📉 화낼수록 기대값은 떨어진다.'],
    pray: ['🧮', '기도의 효과: 0.00%.', '📊 기도 변수는 모델에 없다.'],
    good: ['✅', '평가 수신. 인정.', '🤖 상호 존중 프로토콜.'],
    skull: ['📊', '사망 확률 표현으로 이해한다.', '🧮 현재 사망 확률을 알려줄까?'] },
  strategist: {
    laugh: ['♟', '여유를 부리는군. 수는 이미 정해졌다.', '🤨 웃을 수에서 웃는 건가, 아닌가.'],
    smirk: ['♟', '그 미소, 세 수 앞까지 읽었다.', '🤔 흥미롭군.'],
    cry: ['♞', '동요하는군. 좋은 신호다.', '🧐 무너지기 시작했군.'],
    scared: ['♜', '공포는 판단을 흐리지.', '😌 계획대로다.'],
    angry: ['🧊', '감정은 수를 흐린다.', '♟ 화를 내면 수가 보이지.'],
    pray: ['📐', '기도 대신 계산을 해라.', '♛ 신은 체스를 두지 않는다.'],
    good: ['🤝', '좋은 대국이다.', '♚ 예의 바르군.'],
    skull: ['♚', '체크메이트를 예고하는 건가.', '🤨 누구의 해골일까.'] },
  fatalist: {
    laugh: ['🕯', '운명 앞에서 웃는군. 좋다.', '🌑 웃어라. 곧 끝나니.'],
    smirk: ['🔮', '그 미소도 이미 정해져 있었다.', '🌘 운명을 비웃나.'],
    cry: ['🕯', '눈물도 운명의 일부다.', '🌧 울어라. 비는 그치게 되어 있다.'],
    scared: ['🔮', '두려움은 운명을 모르는 자의 것.', '🌑 받아들여라.'],
    angry: ['⚖', '운명에 화내 봐야 소용없다.', '🔮 분노 또한 정해진 것.'],
    pray: ['🕯', '기도는 통하지 않는다. 그래도 함께 하지.', '✝ 운명의 신께.'],
    good: ['🔮', '운명이 우리를 이 자리에 앉혔다.', '🕯 고맙다.'],
    skull: ['⚰', '그래, 죽음은 늘 곁에 있다.', '🌑 오늘 누구를 데려갈까.'] },
  mimic: {
    laugh: ['하. 하. 하. …이렇게 웃는 거 맞지?', '🤭 네 웃음 따라 해봤어.', '😆 나도나도!'],
    smirk: ['🙃 이 표정 맞아? 따라 해봤는데.', '그 미소, 연습해둘게.', '😼 흉내 완료.'],
    cry: ['🥲 나도 울어볼까… 잘 안 되네.', '흑흑. …이렇게?', '😿 따라 울어줄게.'],
    scared: ['😬 나도 무서운 척.', '으, 으악! …이렇게 하는 거지?', '🫢 따라 놀라봤어.'],
    angry: ['😤 나도 화났다! …아마도.', '크르르… 따라 해봤어.', '👹 화난 표정 흉내.'],
    pray: ['🤲 나도 기도! 뭘 비는지는 모르지만.', '아멘. …맞지?', '🙇 따라 빌어봄.'],
    good: ['👌 나도 좋아!', '엄지 척! …다른 손가락으로.', '🤙 받고 하나 더.'],
    skull: ['☠ 나도 해골! 아니, 이건 다른 해골.', '뼈다귀 흉내.', '🦴 따라 할 게 해골밖에 없네.'] },
  mindgamer: {
    laugh: ['🧐', '웃음이 떨리는데?', '👀 웃음으로 뭘 숨기지?'],
    smirk: ['😌', '그 미소, 삼 초 늦었어.', '👁 네 입꼬리가 거짓말하는군.'],
    cry: ['🤨', '그 눈물, 진짜일까?', '🧠 동정을 사려는 건가.'],
    scared: ['😌', '공포가 보이는군. 예상대로.', '👁 동공이 흔들리네.'],
    angry: ['🤭', '화났어? 이미 내 페이스야.', '🧠 흥분하면 지는 거야.'],
    pray: ['🧐', '기도할 만큼 무섭나?', '👀 누구한테 비는 거지?'],
    good: ['🤨', '칭찬으로 날 흔들 순 없어.', '😶 …무슨 꿍꿍이지?'],
    skull: ['🙄', '허세.', '🧠 해골로 겁을 주겠다고?'] },
  veteran: {
    laugh: ['🚬', '웃을 수 있을 때 웃어둬라.', '🎖 전장에서도 그런 놈이 오래 살았지.'],
    smirk: ['🚬', '젊은 놈이 건방지군. 마음에 든다.', '🪖 그 여유, 오래 가길.'],
    cry: ['🫡', '울어도 된다. 우리 다 울었다.', '🚬 괜찮다. 다들 처음엔 그래.'],
    scared: ['🪖', '무서운 게 정상이다. 무섭지 않은 놈이 먼저 죽지.', '🫡 숨 크게 쉬어라.'],
    angry: ['🚬', '화는 총구가 아니라 적에게.', '🎖 진정해라, 병사.'],
    pray: ['🫡', '나도 전장에선 기도했지.', '🕊 전우들을 위해서도 빌어다오.'],
    good: ['🫡', '좋은 녀석이군.', '🎖 훈장감이다.'],
    skull: ['🪦', '죽음은 농담거리가 아니다.', '🫡 먼저 간 녀석들 생각나는군.'] },
  drunk: {
    laugh: ['🥴', '히끅, 웃기지? 나도 웃겨!', '🍻 웃을 땐 건배지!'],
    smirk: ['🍺', '그 표정 뭐야~ 한 잔 해~', '🥴 히끅, 윙크한 거야?'],
    cry: ['🥃', '울지 마~ 한 잔 해~', '🫂 이리 와, 안아줄게~ 딸꾹.'],
    scared: ['🍾', '무서울 땐 보드카지!', '🥴 괜찮아 괜찮아~ 나도 몰라~'],
    angry: ['🥃', '화내지 말고 한 잔~', '🍻 싸우지 말고 건배~'],
    pray: ['🥂', '기도 말고 건배!', '🍷 신도 한 잔 하실래요?'],
    good: ['🍻', '최고야~ 딸꾹!', '🥳 친구! 우린 친구야!'],
    skull: ['🤪', '해골 귀엽다~', '🍺 해골잔에 한 잔~'] },
  provocateur: {
    laugh: ['🖕', '뭐가 웃겨, 이 자식아?', '😈 웃어? 곧 울게 될 거다.'],
    smirk: ['🙄', '그 표정 당장 지워.', '😒 비웃음은 내 전문이야.'],
    cry: ['🤣', '울어라 울어! 하하!', '👶 벌써 우냐?'],
    scared: ['😈', '떨어라, 더 떨어!', '🤣 그 얼굴 사진 찍어두고 싶네.'],
    angry: ['🤪', '화났네? 귀엽다.', '😜 더 화내봐. 재밌으니까.'],
    pray: ['🤣', '기도? 늦었어.', '😈 신은 오늘 휴무야.'],
    good: ['🙄', '아부하지 마.', '😒 엄지는 넣어둬.'],
    skull: ['🤣', '네 미래다.', '😈 그거 네 초상화지?'] },
};
Object.entries(EMO).forEach(([id, t]) => Object.entries(t).forEach(([k, arr]) => { PERS[id].lines['emo_' + k] = arr; }));
const PERS_EMO = {
  berserker: ['😂', '😏', '😡', '💀'], coward: ['😭', '😱'], gambler: ['😏', '😂', '👍'], calculator: ['👍', '💀'],
  strategist: ['😏', '👍'], fatalist: ['🙏', '💀'], mimic: ['😂', '😏', '😭', '😱', '😡', '🙏', '👍', '💀'], mindgamer: ['😏', '😂'],
  veteran: ['👍', '🙏', '💀'], drunk: ['😂', '🙏', '👍', '🥃'], provocateur: ['😂', '😏', '😡', '💀', '👍'] };
const allowedEmo = pers => (PERS_EMO[pers] || EMOTES.map(x => x[0])).filter(e => EMOTES.some(x => x[0] === e));
const fitEmo = (pers, e) => allowedEmo(pers).includes(e) ? e : pick(allowedEmo(pers));
const EMO_SELF = { berserker: '😂', coward: '😭', gambler: '😏', strategist: '😏', fatalist: '🙏', mindgamer: '😏', veteran: '👍', drunk: '🥃', provocateur: '😂', mimic: '😏', calculator: '👍' };
const TOO_MUCH_LAUGH = ['💢 그만 웃어라.', '계속 웃으면 너부터 쏜다.', '😠 한 번만 더 웃어봐.'];
const isEmo = t => [...t].length <= 2 && !/[가-힣a-zA-Z0-9]/.test(t);
function showEmote(i, e) { if (isDeadSeat(i)) return; bubble(i, e, 1800); } // emo(큰 글씨)는 bubble이 실제로 띄울 때 정한다
function sayOrEmote(i, t, dur = 2200) { if (isEmo(t)) showEmote(i, t); else { seatEls[i].querySelector('.bubble').classList.remove('emo'); bubble(i, t, dur); } }
let laughCount = [0, 0], lastEmo = 0; const lastReply = {};
function emoReply(to, from, e, kind, tok) {
  const s = state.seats[to]; if (!s) return;
  s.muteUntil = performance.now() + 4000; // 이 동안은 이모티콘 반응 하나만
  if (s.kind === 'human') { const L = linesOf(to), pool = ((L && L['emo_' + kind]) || []).filter(x => x !== e && !isEmo(x)); if (!pool.length) return;
    const t = pick(pool); setTimeout(() => { if (tok === state.token) sayOrEmote(to, fmt(to, t)); }, 800 + Math.random() * 600); return; }
  if (kind === 'laugh' || kind === 'smirk') laughCount[from]++;
  let t;
  if ((kind === 'laugh' || kind === 'smirk') && laughCount[from] >= 3 && !['drunk', 'coward', 'calculator', 'mimic'].includes(s.pers)) t = pick(TOO_MUCH_LAUGH);
  else {
    const pool = ((EMO[s.pers] || {})[kind] || []).filter(x => x !== e && x !== lastReply[s.pers + kind]);
    if (!pool.length) return;
    t = pick(pool); lastReply[s.pers + kind] = t;
  }
  setTimeout(() => { if (tok === state.token) sayOrEmote(to, fmt(to, t)); }, 700 + Math.random() * 700);
}
// 이모티콘: 누구든 행동(격발·아이템) 하나가 지나가면 다시 보낼 수 있다
function emoReset() { if (state.playerEmoUsed) { state.playerEmoUsed = false; renderEmotes(); } }
function renderEmotes() { const on = !state.playerEmoUsed; document.querySelectorAll('#emotes button').forEach(b => b.disabled = !on); $('#emotes').title = on ? '행동 하나마다 1회' : '다음 행동이 지나가면 다시 보낼 수 있다'; }
function aiEmote(i, tok) {
  const s = state.seats[i]; const e = EMO_SELF[s.pers]; if (!e) return;
  showEmote(i, e); const k = (EMOTES.find(x => x[0] === e) || [e, 'good'])[1];
  emoReply(1 - i, i, e, k, tok);
}
$('#emotes').innerHTML = EMOTES.map(([e, k]) => `<button data-e="${e}" data-k="${k}" title="${k}">${e}</button>`).join('');
$('#emotes').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b || !state.started || state.paused || state.mode === 'auto') return;
  const i = state.seats.findIndex(s => s && s.kind === 'human'); if (i < 0) return;
  if (state.playerEmoUsed) return; state.playerEmoUsed = true; renderEmotes();
  const now = performance.now(); lastEmo = now;
  showEmote(i, b.dataset.e); emoReply(1 - i, i, b.dataset.e, b.dataset.k, state.token);
});

