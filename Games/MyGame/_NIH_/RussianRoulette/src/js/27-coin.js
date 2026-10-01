// ══════════════════ 동전 던지기 (선공 결정) ══════════════════
// 리볼버를 꺼내기 전에 딜러가 동전을 던진다. 앞면 = 왼쪽 먼저, 뒷면 = 오른쪽 먼저.
// 행운의 동전: 앞면 777₽ · 뒷면 네잎클로버 / 불운의 동전(10%): 앞면 666₽ · 뒷면 염소 → 탄 +1발, 판돈 ×3
const CLOVER = `<svg viewBox="-50 -50 100 100"><g fill="#2f7d3a" stroke="#123d19" stroke-width="2">${[0, 90, 180, 270].map(r => `<path transform="rotate(${r})" d="M0 -4 C -14 -10 -26 -24 -14 -34 C -6 -40 0 -32 0 -26 C 0 -32 6 -40 14 -34 C 26 -24 14 -10 0 -4 Z"/>`).join('')}</g><path d="M2 2 Q 10 22 4 38" stroke="#1d5a26" stroke-width="4" fill="none" stroke-linecap="round"/><circle r="4" fill="#3f9a4b"/></svg>`;
const GOAT = `<svg viewBox="-50 -50 100 100"><g fill="none" stroke="#1a0404" stroke-width="5" stroke-linecap="round"><path d="M-10 -18 C -26 -34 -40 -26 -34 -8"/><path d="M10 -18 C 26 -34 40 -26 34 -8"/></g>
  <path d="M-20 -14 L -38 -20 L -26 -6 Z M20 -14 L 38 -20 L 26 -6 Z" fill="#3a0a0a"/><path d="M-16 -16 Q 0 -24 16 -16 L 12 18 Q 0 34 -12 18 Z" fill="#3a0a0a" stroke="#1a0404" stroke-width="2"/>
  <ellipse cx="-7" cy="-4" rx="3.2" ry="2" fill="#ff3b1f"/><ellipse cx="7" cy="-4" rx="3.2" ry="2" fill="#ff3b1f"/><path d="M-4 22 Q 0 38 4 22" fill="#1a0404"/></svg>`;
$('.cyl-area').insertAdjacentHTML('beforeend', `<div id="coin"><div class="coin-in"><div class="coin-face front"><b class="c-num">777</b><span class="c-rub">₽</span></div><div class="coin-face back">${CLOVER}</div><div class="coin-edge"></div></div></div>`);
A.flip = function () { if (!this.ctx) return; const t = this.now(), b = this.bus(.9, 0, .15); this.modal(t, [4200, 6900, 9400], [.14, .1, .07], [.22, .14, .08], b, .01);
  for (let k = 0; k < 9; k++) this.modal(t + .12 + k * .1, [5200 + Math.random() * 400], [.04], [.03], b, .002); };
A.land = function () { if (!this.ctx) return; const t = this.now(), b = this.bus(1, 0, .2); [[0, 1], [.13, .5], [.21, .25], [.26, .1]].forEach(([d, v]) => this.modal(t + d, [3300, 5200, 7600], [.2, .14, .09], [.25 * v, .16 * v, .08 * v], b, .02)); };
async function coinToss(tok, coin) {
  const el = $('#coin'), inn = el.querySelector('.coin-in'), s = state.seats, L = s[0].name, Rn = s[1].name;
  el.classList.toggle('cursed', coin.cursed);
  el.querySelector('.c-num').textContent = coin.cursed ? '666' : '777';
  el.querySelector('.back').innerHTML = coin.cursed ? GOAT : CLOVER;
  document.body.classList.add('cointoss'); el.classList.add('on');
  setMsg(`${DEALER}: 동전으로 정한다. 앞면이면 ${L}, 뒷면이면 ${Rn} 선공이다.`, 'info');
  await wait(1300); if (tok !== state.token) return coinEnd(false);
  A.flip(); if (coin.cursed) A.devilLaugh(); // 염소 동전: 던지는 순간 악마 웃음
  const turns = 6 + rand(3), end = turns * 360 + (coin.side ? 180 : 0), dur = 1500;
  el.animate([{ transform: 'translateY(40px) scale(.9)' }, { transform: 'translateY(-150px) scale(1.15)', offset: .45 }, { transform: 'translateY(0) scale(1)' }], { duration: dur, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
  inn.animate([{ transform: 'rotateX(0deg)' }, { transform: `rotateX(${end}deg)` }], { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  await wait(dur); if (tok !== state.token) return coinEnd(false);
  A.land();
  const face = coin.side ? (coin.cursed ? '뒷면 — 염소' : '뒷면 — 네잎클로버') : (coin.cursed ? '앞면 — 666' : '앞면 — 777'), first = s[coin.side].name;
  setMsg(`${face}. ${first}, 먼저.`, coin.cursed ? 'danger' : 'info'); log(`동전 ${face} → ${esc(first)} 선공`, 'sys');
  coinTalk(coin, tok);
  await wait(1900); if (tok !== state.token) return coinEnd(false);
  if (coin.cursed) {
    el.classList.add('curse-glow'); A.sting && A.sting();
    setMsg(`${DEALER}: …불길한 동전이군. 한 발 더 넣고 시작한다. 판돈 ×3.`, 'danger');
    log(`불운의 동전 — 탄 +1발, 판돈 ${won(state.pot)}. +1발은 둘 중 먼저 쓴 한 명만.`, 'kill'); renderAll();
    await wait(1700); if (tok !== state.token) return coinEnd(false);
  }
  return coinEnd(true);
}
function coinEnd(ok) {
  const el = $('#coin'); el.classList.remove('on', 'curse-glow'); document.body.classList.remove('cointoss');
  el.getAnimations().forEach(a => a.cancel()); el.querySelector('.coin-in').getAnimations().forEach(a => a.cancel());
  return ok;
}

// ── 악마 웃음: 낮게 깔린 '크하하하하' + 우르릉
A.devilLaugh = function () { if (!this.ctx) return; const t = this.now();
  [['크', 1.05, 0], ['하', 1.0, .2], ['하', .95, .38], ['하', .9, .55], ['하', .84, .72], ['하', .76, .9]].forEach(([ch, m, d]) => this.voice('demon', ch, m, .15 + d));
  this.thump(t + .1, 55, 28, .9, .9, this.bus(1, 0, .5)); };
// ── 동전을 본 반응 (선공·후공, 불운의 동전이면 수위 상승). 공격적·중립 성격은 도발, 겁쟁이는 염소를 무서워하고, 술꾼은 술값 생각
const COIN_TALK = {
  berserker: { first: ['내가 먼저다! 잘 봐, {opp}!', '하! 선빵은 내 거다.'], second: ['네가 먼저 뒤져라, {opp}.', '먼저 쏴. 머리 날아가는 거 구경하게.'],
    firstC: ['염소? 좋아! 피 냄새가 더 진해졌군. 내가 먼저다!', '악마도 내 편이다! 먼저 간다!'], secondC: ['염소가 널 골랐다, {opp}. 먼저 뒈져라!', '불운의 동전이다. 네 관 뚜껑 닫히는 소리 들리냐?'] },
  provocateur: { first: ['내가 먼저네? 잘 봐둬, 이렇게 하는 거야.', '선공이다. 떨지 말고 구경이나 해.'], second: ['너부터네? 먼저 뒤져, {opp}.', '동전도 네가 먼저 죽길 바라나 봐.'],
    firstC: ['666이네. 악마가 나한테 걸었대. 씨발, 재밌네.', '염소 동전? 그래도 난 안 죽어.'], secondC: ['염소가 웃는다, {opp}. 오늘이 네 장례식이야, 병신아.', '불운의 동전에 선공까지? 씨발, 넌 오늘 끝났다.'] },
  gambler: { first: ['선공이라… 패가 좋은데.', '오늘 동전 운은 내 거군.'], second: ['네가 먼저 패를 까, {opp}.', '선공은 양보하지. 공짜로.'],
    firstC: ['666… 판돈이 세 배라. 이런 판이 제일 짜릿하지.', '악마의 동전이라… 잭팟 아니면 끝이군.'], secondC: ['판돈 세 배에 네가 먼저. 크크, 좋은 베팅이야.', '염소가 네 쪽을 봤어, {opp}. 행운을 빌어… 아니, 안 빌어.'] },
  calculator: { first: ['선공 확정. 첫 격발 확률을 계산합니다.', '제가 먼저군요. 예상 범위 안입니다.'], second: ['당신이 먼저입니다, {opp}. 생존을 빕니다… 형식상.', '선공은 불리합니다. 당신 쪽이죠.'],
    firstC: ['불운의 동전. 탄 +1. 사망 확률 상승. …계산 완료.', '666. 통계적 의미는 없습니다. 탄 수는 의미가 있죠.'], secondC: ['탄 +1, 당신이 먼저. 기대 수명이 크게 줄었습니다, {opp}.', '염소 동전. 당신에게 불리한 결과입니다.'] },
  strategist: { first: ['선공인가. 계획대로 간다.', '먼저 움직이지.'], second: ['네가 먼저다, {opp}. 수를 보여줘.', '선공은 네 것이다. 부담도.'],
    firstC: ['불리한 판이군. 그래도 수는 있다.', '탄이 늘었다. 판단이 더 중요해졌군.'], secondC: ['탄 하나 더, 그리고 네가 먼저. 좋은 출발은 아니군, {opp}.', '염소가 너를 택했다. 첫 수를 잘 둬라.'] },
  fatalist: { first: ['운명이 나를 먼저 불렀다.', '…내가 먼저인가. 정해진 대로.'], second: ['동전이 너를 가리켰다, {opp}. 운명이다.', '먼저 가라. 운명이 그리 정했다.'],
    firstC: ['염소… 운명이 피를 원하는군.', '666. 예언은 이미 쓰여 있었다.'], secondC: ['악마의 동전이 너를 골랐다. 받아들여라, {opp}.', '…염소가 웃는다. 네가 먼저다.'] },
  mimic: { first: ['내가 먼저~ 너도 따라 해~', '헤헤, 선공이다!'], second: ['너부터네? 나도 너 따라 할게~', '네가 먼저 해봐, 똑같이 해줄게~'],
    firstC: ['염소다! 무서워… 는 척~', '666이래~ 나도 악마 흉내 낼까? 크하하~'], secondC: ['악마가 너 먼저래~ 헤헤, 먼저 가~', '염소 동전~ 너 먼저 뒤지면 나는 안 따라 해~'] },
  mindgamer: { first: ['내가 먼저네. 네 손 떨리는 거 천천히 보겠어.', '선공이다. 시간은 내 편이야.'], second: ['너부터네? 벌써 표정이 굳었어, {opp}.', '먼저 가, {opp}. 무서우면 무서운 티 내도 돼.'],
    firstC: ['염소 동전… 넌 이제 속으로 기도하고 있겠지.', '666. 불길하지? 네 숨소리가 바뀌었어.'], secondC: ['염소가 널 먼저 골랐어. 지금 심장 소리 다 들린다.', '탄은 늘고 네가 먼저. 버틸 수 있겠어, {opp}?'] },
  veteran: { first: ['내가 먼저군. 익숙한 일이지.', '선공이라… 전장에서도 늘 앞이었지.'], second: ['자네가 먼저일세, {opp}. 숨 고르게.', '먼저 가게. 뒤에서 지켜보지.'],
    firstC: ['염소라… 전장에서 저런 건 좋은 징조가 아니었지.', '불운의 동전이군. 이런 날에 제일 많이 죽었어.'], secondC: ['염소가 자네를 골랐군. 유서는 썼나, {opp}?', '탄이 늘었고 자네가 먼저야. …명복을 미리 빌지.'] },
  coward: { first: ['제, 제가 먼저요…? 왜 하필…', '먼저라니… 심장이…'], second: ['휴… {opp}님 먼저…', '다, 다행이다… 먼저 하세요…'],
    firstC: ['히익! 염, 염소…! 저거 저주받은 거죠…?!', '666…? 싫어요, 무서워요… 한 발 더라니…'], secondC: ['염소…! 무서워요… 저 동전 좀 치워 주세요…', '저, 저주받은 동전… 전 안 볼래요… 안 볼래요…'] },
  drunk: { heads: ['777루블? 딸꾹… 저거면 보드카 몇 병이야~', '동전이다~ 저걸로 한 잔 사면 딱인데~'], tails: ['네잎클로버~ 행운의 한 잔 각이다~ 딸꾹', '클로버 동전? 팔면 술 한 병은 나오겠지~'],
    cursed: ['저 동전 비싸 보이는데~? 딸꾹… 저걸로 몇 병 살 수 있지? 다섯? 열?', '666루블이면… 보드카가… 하나, 둘… 딸꾹, 모르겠다 많이~', '염소 그려진 동전~ 골동품이면 술 한 박스는 나오겠는데~?'] },
};
function coinPers(i) { const s = state.seats[i]; if (!s) return null; if (s.kind === 'ai') return s.pers;
  if (voice.mode === 'custom' && !voiceRandom()) return null; return voiceRandom() ? curVoiceId() : voice.mode === 'preset' ? voice.preset : null; }
function coinLine(i, coin) {
  const p = coinPers(i), T = COIN_TALK[p]; if (!T) return null;
  if (p === 'drunk') return pick(coin.cursed ? T.cursed : coin.side ? T.tails : T.heads);
  const first = coin.side === i; return fmt(i, pick(T[(first ? 'first' : 'second') + (coin.cursed ? 'C' : '')]));
}
function coinTalk(coin, tok) {
  const a = coin.side, b = 1 - a; // 선공이 먼저 말하고, 상대가 받는다
  [[a, 250], [b, 1500]].forEach(([i, d]) => setTimeout(() => { if (tok !== state.token) return; const t = coinLine(i, coin); if (t) { seatEls[i].querySelector('.bubble').classList.remove('emo'); bubble(i, t, 2600); } }, d));
}

