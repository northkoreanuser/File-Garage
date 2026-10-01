// ══════════════════ AI 성격 ══════════════════
const PERS = {
  berserker: { ko: '광전사', color: '#ff5a3d', tempo: [250, 700],
    desc: '피할 줄 모른다. 오히려 초반에 한 발 더 넣고 판을 키운다.',
    decide: c => c.p >= 1 ? escape(c) : (c.can.raise && c.k <= 1 && c.b === 1 && Math.random() < .6) ? 'raise' : 'fire',
    lines: { intro: ['빨리 시작하지.', '피가 끓는군.'], fire: ['하하! 당겨!', '겁 따윈 없다.', '이게 사는 맛이지!'], spin: ['…전략적 후퇴다.'], pass: ['받아라. 이것도 싸움이다.'], raise: ['한 발로는 심심하지!', '판을 키우자고!'], survive: ['봤냐?', '다음은 네 차례다, {opp}.'], die: ['후회는… 없다…'], win: ['약해빠진 놈.'] } },
  coward: { ko: '겁쟁이', color: '#b8c4a0', tempo: [1600, 3600],
    desc: '두 번째 약실부터 손이 떨린다. 아이템을 너무 일찍 써버리는 게 약점.',
    decide: c => (c.can.raise && c.p < 1 && Math.random() < .04) ? 'raise' // 공포에 질린 헛손질 (드묾)
      : c.k === 0 ? (Math.random() < .1 ? escape(c) : 'fire') : (c.p >= .25 && Math.random() < .8 ? escape(c) : 'fire'),
    lines: { intro: ['저, 저는 그냥 구경만…', '집에 가고 싶어…'], fire: ['제, 제발…', '엄마…', '눈 감고 당길게요…'], spin: ['돌려! 돌려야 해!', '안 돼, 못 해!'], pass: ['너, 너가 먼저 해!', '저 말고요!'], raise: ['제, 제발… 이번엔 저쪽에서 터져라…', '뭐라도 해야 할 것 같아서… 제발 저한테만 오지 마…', '눈 감고 넣었어요… 제발, 제발 저쪽이길…'], survive: ['사, 살았다…', '심장이 멎는 줄…'], die: ['싫어…'], win: ['내가… 이겼어?'] } },
  gambler: { ko: '도박꾼', color: '#e8c14a', tempo: [600, 1400],
    desc: '첫 약실은 무조건 당기고, 그다음부터는 주사위를 굴려 정한다.',
    decide: c => c.p >= 1 ? escape(c) : c.k === 0 ? 'fire' : weighted(c, { fire: .45, spin: .2, pass: .2, raise: .15, skip: .1 }),
    lines: { intro: ['자, 판을 벌여볼까.', '오늘 운은 좋은 편이야.'], fire: ['🪙 앞면이 나왔군.', '🎲 홀짝이지 뭐.', '🎲 주사위는 던져졌다.', '🪙 동전은 거짓말 안 해.'], spin: ['🃏 패를 바꾸지.', '🃏 셔플.'], pass: ['🃏 이번 패는 넘기지.'], raise: ['🪙 레이즈.', '🪙 판돈을 올리지.'], survive: ['🎰 하우스는 늘 이기지.'], die: ['올인… 실패.'], win: ['🎰 잭팟.'] } },
  calculator: { ko: '계산기', color: '#4fd18b', tempo: [900, 1500],
    desc: '사망 확률 33%를 넘으면 피한다. 상대가 피할 수단이 없을 때만 판을 키운다.',
    decide: c => c.p >= 1 / 3 ? escape(c) : (c.can.raise && !c.oppEsc && c.p <= .25) ? 'raise' : 'fire',
    lines: { intro: ['변수 입력 완료.'], fire: ['사망 확률 {p}%. 허용 범위.', '계산 완료. 격발.'], spin: ['{p}%는 임계치 초과.', '기대값상 스핀이 우월.'], pass: ['{p}%는 네 몫이다.'], raise: ['네 회피 수단은 0. 변수를 늘린다.'], survive: ['예측대로.'], die: ['오차… 범위…'], win: ['확률은 거짓말하지 않는다.'] } },
  strategist: { ko: '전략가', color: '#5aa9ff', tempo: [1100, 2300],
    desc: '게임 이론으로 푼 최적해를 따른다. 모든 아이템의 가치를 계산한다.',
    decide: c => optimal(c.N, c.k, c.b, maskOf(c.seat), maskOf(c.opp)).a,
    lines: { intro: ['최적해는 이미 나와 있다.'], fire: ['이 수가 최선이다.', '아이템은 아껴두지.'], spin: ['턴을 넘기겠다.', '{opp}, 이제 네 몫이다.'], pass: ['이 확률은 네가 짊어져라.'], raise: ['이 한 발이 승부를 가른다.'], survive: ['수읽기대로.'], die: ['체크메이트… 당했군.'], win: ['게임 이론의 승리다.'] } },
  fatalist: { ko: '운명론자', color: '#b07cff', tempo: [900, 1900],
    desc: '판마다 불길한 숫자를 하나 정한다. 그 약실에서만 피한다.',
    decide: c => (c.chamber === c.seat.n || c.p >= 1) ? escape(c) : 'fire',
    lines: { intro: ['오늘 내 불길한 숫자는 {n}.', '{n}번… 오늘은 {n}번이 느낌이 안 좋아.'], fire: ['운명이 정할 일.', '신이 원한다면.'], spin: ['{n}… 불길한 숫자다.'], pass: ['{n}번은 내 몫이 아니다.'], raise: ['운명이 늦장을 부리는군. 한 발 거들어주지.', '정해진 결말이라면… 조금 앞당겨도 되겠지.', '신이 주사위를 굴리지 않는다면, 내가 한 발 얹어주마.'], survive: ['아직 때가 아니군.'], die: ['정해진 일이었다.'], win: ['운명은 너를 택했다.'] } },
  mimic: { ko: '따라쟁이', color: '#ff8fc8', tempo: [700, 1600],
    desc: '상대가 방금 한 행동을 그대로 따라 한다. 생각하는 시간까지.',
    decide: c => c.p >= 1 ? escape(c) : (c.oppLast && c.oppLast !== 'fire' && c.can[c.oppLast]) ? c.oppLast : 'fire',
    lines: { intro: ['네 거울이 되어주지, {opp}.'], fire: ['네가 당겼으니 나도.', '따라 해볼까.'], spin: ['네가 돌렸으니 나도.'], pass: ['너도 넘겼잖아.'], raise: ['너도 넣었으니 나도.'], survive: ['똑같이 살아남았네.'], die: ['따라… 가는 건가.'], win: ['거울은 깨지지 않는다.'] } },
  mindgamer: { ko: '심리전', color: '#ff9a3c', tempo: [1200, 2600],
    desc: '상대가 오래 망설이면 판을 키워 압박한다. 사람의 습관을 기억한다.',
    decide: c => {
      if (c.p >= 1) return escape(c);
      if (c.oppThink > 2500) { if (c.can.raise && c.p <= .34) return 'raise'; return c.p >= .5 ? escape(c) : 'fire'; }
      if (c.opp.kind === 'human' && prof.n >= 3) { const m = profEsc(); if (c.chamber < m && c.p < .5) return 'fire'; }
      if (c.oppEsc) return c.p >= 1 / 3 ? escape(c) : 'fire';
      return optimal(c.N, c.k, c.b, maskOf(c.seat), maskOf(c.opp)).a; },
    lines: { intro: ['네 얼굴부터 읽어볼까.'], fire: ['손이 떨리던데, {opp}?', '망설임이 다 보여.'], spin: ['서두를 필요 없지.'], pass: ['자, 네 표정을 보여줘.'], raise: ['떨고 있군. 한 발 더 넣어주지.'], survive: ['표정 관리 잘 봐.'], die: ['읽혔…나.'], win: ['처음부터 보였어.'] } },
  veteran: { ko: '노병', color: '#9fb3c8', tempo: [1000, 2000],
    desc: '지금까지의 사망 기록을 기억한다. 가장 많이 죽은 약실을 피한다 (도박사의 오류).',
    decide: c => (c.chamber === c.seat.n || c.p >= .5) ? escape(c) : 'fire',
    lines: { intro: ['내 경험상 {n}번이 제일 위험해.', '{n}번에서 많이들 죽었지.'], fire: ['아직은 괜찮아.', '이 정도는 수백 번 해봤다.'], spin: ['{n}번… 여기서 많이 죽었지.'], pass: ['이 자리는 안 좋아. 네가 앉아라.'], survive: ['전장보다 쉽군.'], die: ['결국… 여기까지.'], win: ['또 살아남았군.'] } },
  drunk: { ko: '술꾼', color: '#e0703a', tempo: [300, 3800],
    desc: '보드카 한 병째. 판단이 오락가락하고 마지막 약실도 가끔 헷갈린다.',
    decide: c => {
      const dk = (c.seat.drink || 0) / 100; // 취기 0~1
      if (c.p >= 1 && c.seat.forceDumb) return 'fire'; // 디버그: 100% 헛발질 강제
      if (c.p >= 1) { const fl = state.flickUsed[0] || state.flickUsed[1]; // 플릭 있었으면 도박수, 없어도 술김에 가끔 그냥 당김
        return Math.random() < (fl ? .04 + dk * .12 : .03 + dk * .07) ? 'fire' : escape(c); } // 4%(+취기) 헛발질
      if (Math.random() < .25 + dk * .25) return weighted(c, { fire: 1, spin: 1, pass: 1, raise: .6, skip: .5 });
      return c.p >= .5 ? escape(c) : 'fire'; },
    lines: { intro: ['건배!', '딸꾹… 누구세요?'], fire: ['딸꾹… 건배!', '보드카 한 잔 더!', '어… 이게 방아쇠야?'], spin: ['빙글빙글~', '세상이 돈다~'], pass: ['자, 너도 한 잔… 아니 한 발!'], raise: ['한 발 더! 한 잔 더!'], survive: ['히끅… 살았네?'], die: ['건… 배…'], win: ['한 잔 더 해야겠군!'] } },
  provocateur: { ko: '도발꾼', color: '#ff4f7a', tempo: [500, 1300],
    desc: '상대의 회피 수단이 바닥나는 순간 한 발 더 넣어 몰아붙인다.',
    decide: c => {
      if (c.p >= 1) return escape(c);
      if (!c.oppEsc && c.can.raise) return 'raise';
      if (c.oppEsc) return c.p >= .5 ? escape(c) : 'fire';
      return c.p >= 1 / 3 ? escape(c) : 'fire'; },
    lines: { intro: ['{opp}, 손 떨리는 거 다 보여.'], fire: ['봐, 쉽잖아.', '네 차례다, 겁쟁이.'], spin: ['자, 부담은 네가 져.'], pass: ['선물이다, {opp}.'], raise: ['도망칠 곳이 없지? 한 발 더.', '이제 진짜 게임이다.'], survive: ['떨리냐?'], die: ['웃기지… 마…'], win: ['말했잖아.'] } },
};
const PERS_IDS = Object.keys(PERS);
const NAMES = ['이반', '드미트리', '세르게이', '니콜라이', '알렉세이', '미하일', '유리', '보리스', '표도르', '빅토르', '아나톨리', '올가', '나탈리야', '타티야나', '스베틀라나', '이리나', '그리고리', '레프', '야코프', '바실리', '카탸', '안드레이'];
const HURRY = ['빨리 해.', '손 떨리는 거 다 보여.', '시간 끌지 마.', '딜러, 시계 좀 봐.', '밤새 기다릴 순 없어.'];
const GRUDGE = ['{opp}… 지난번 빚, 오늘 갚는다.', '또 만났군, {opp}. 이번엔 다를 거다.', '지난번엔 운이 좋았지, {opp}.'];
const PAIRS = {
  'coward|drunk': ['drunk', '겁쟁이 친구! 한 잔 하고 해!'], 'berserker|provocateur': ['berserker', '입만 산 놈, 오늘 끝장내주지.'],
  'calculator|gambler': ['calculator', '도박꾼의 기대값은 음수다.'], 'mimic|strategist': ['strategist', '최적해를 따라 하겠다고? 해봐라.'],
  'fatalist|veteran': ['veteran', '숫자 따위 믿지 마라, 젊은이.'], 'coward|mindgamer': ['mindgamer', '네 얼굴엔 다 쓰여 있어.'],
  'berserker|coward': ['coward', '저, 저 사람이랑요…?'], 'drunk|strategist': ['drunk', '이봐 교수 양반! 딸꾹!'],
  'gambler|provocateur': ['provocateur', '도박꾼? 그럼 판을 키워볼까.'], 'fatalist|mimic': ['fatalist', '거울 속에도 운명은 있지.'],
};

