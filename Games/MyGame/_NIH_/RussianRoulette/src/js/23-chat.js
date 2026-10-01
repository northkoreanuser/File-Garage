// ══════════════════ 채팅 로그 ══════════════════
var chatLast = { k: '', t: 0 };
// 자동 스크롤: 사용자가 직접 위로 올려 읽는 중이 아니면 항상 최신 대화로 붙는다
var chatStick = true;
function chatToBottom(force) { const cl = document.getElementById('chatList'); if (!cl) return; if (force) chatStick = true; if (!chatStick) { chatNewBtn(true); return; }
  cl.scrollTop = cl.scrollHeight; requestAnimationFrame(() => { cl.scrollTop = cl.scrollHeight; }); chatNewBtn(false); }
function chatNewBtn(on) { const b = document.getElementById('chatNew'); if (b) b.classList.toggle('on', on); }
function chatAdd(cls, name, text) {
  const chatList = document.getElementById('chatList'); if (!chatList) return;
  const d = new Date(), tm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const li = document.createElement('li'); li.className = cls;
  li.innerHTML = `<span class="tm">${tm}</span>${name ? `<span class="nm">${esc(name)}</span>` : ''}<span class="tx">${esc(text)}</span>`;
  chatList.appendChild(li); while (chatList.children.length > 200) chatList.firstChild.remove();
  chatToBottom();
}
// 말풍선 → 채팅
function chatSay(i, text) {
  const s = state.seats && state.seats[i]; if (!s) return;
  const k = i + '|' + text, now = performance.now();
  if (chatLast.k === k && now - chatLast.t < 1500) return; chatLast = { k, t: now };
  const emo = typeof isEmo === 'function' && isEmo(text);
  chatAdd(`say p${i}${s.kind === 'human' ? ' me' : ''}${emo ? ' emo' : ''}`, s.name, text);
}
// 상단 메시지 → 채팅 (딜러 대사는 딜러 이름으로)
var chatMsgLast = '';
function chatMsg(t, cls) {
  if (!t || t === chatMsgLast) return; chatMsgLast = t;
  const m = /^딜러 아르카디: ([\s\S]*)$/.exec(t);
  if (m) chatAdd('say dl', '딜러 아르카디', m[1]); else chatAdd('sys' + (cls ? ' c-' + cls.split(' ')[0] : ''), '', t);
}

// 탭
$('#chatTabs').addEventListener('click', e => {
  const f = e.target.dataset.f; if (!f) return;
  document.querySelectorAll('#chatTabs button').forEach(b => b.classList.toggle('on', b === e.target));
  const cl = $('#chatList'); cl.className = 'chat-list' + (f === 'all' ? '' : ' f-' + f); chatToBottom(true);
});

// ── 플레이어 채팅 + AI 대꾸
const CHAT_RUDE = /씨발|시발|ㅅㅂ|병신|ㅄ|개새|꺼져|닥쳐|멍청|바보|겁쟁이|쫄|찐따|fuck|좆|ㅈ같/i;
const CHAT_REPLY = {
  berserker: { any: ['말은 됐고. 쏴.', '입 말고 방아쇠를 움직여!', '하하! 좋아, 떠들어라!', '시끄럽다. 피 냄새나 맡아.'], rude: ['그 입, 곧 영원히 다물게 될 거다.', '하하하! 화났냐? 좋아!', '욕할 힘으로 방아쇠나 당겨.'] },
  coward: { any: ['어, 어… 그래요…', '말 걸지 마세요, 집중 중이에요…', '제발 빨리 끝났으면…', '(손을 떨며 고개만 끄덕인다)'], rude: ['히익… 죄송해요…', '왜, 왜 저한테 그래요…', '(눈물이 맺힌다)'] },
  gambler: { any: ['판돈 얘기라면 언제든 환영이지.', '말 좋네. 근데 운은 말 안 들어.', '한 판 더 걸 생각 있어?', '크크, 오늘 느낌 좋은데?'], rude: ['화내면 지는 거야, 친구.', '욕은 공짜지. 총알은 아니고.', '열 받았어? 판돈 올려.'] },
  calculator: { any: ['잡담은 확률에 영향을 주지 않습니다.', '그 발언의 기대값은 0입니다.', '계산 중입니다. 조용히.', '흥미롭군요. 무의미하지만.'], rude: ['감정적 발언 기록했습니다.', '욕설로 확률은 바뀌지 않습니다.', '당신의 심박수가 올라가고 있군요.'] },
  strategist: { any: ['말이 많군. 수를 숨기려는 건가.', '대화도 전략이지.', '네 다음 수가 보인다.', '좋은 시도다.'], rude: ['도발은 통하지 않는다.', '흥분하면 판단이 흐려지지.', '그게 네 전략이라면 실망이군.'] },
  fatalist: { any: ['말해 봐야 운명은 정해져 있다.', '…그래. 어차피 같은 결말이다.', '신경 쓰지 마라. 총이 정한다.', '말은 바람이다.'], rude: ['분노도 운명의 일부지.', '욕해도 탄은 그 자리에 있다.', '…그래.'] },
  mimic: { any: ['{last}', '방금 그 말, 나도 할래. "{last}"', '크크, {last}', '따라 하는 거 싫어?'], rude: ['{last}', '너도 {last}!', '크크크, 똑같이 돌려줄게.'] },
  mindgamer: { any: ['손이 떨리는 게 말투에서 다 보여.', '떠들수록 속이 보이지.', '재밌네. 계속 해 봐.', '방금 그 말, 거짓말이지?'], rude: ['화났네? 내가 이겼다.', '욕은 겁먹었다는 뜻이야.', '그래그래, 무섭지?'] },
  veteran: { any: ['젊은 친구, 말보다 숨을 아껴.', '이 테이블에서 말 많은 놈은 오래 못 갔지.', '허허. 그래.', '집중해라.'], rude: ['나도 그 나이 땐 그랬지.', '욕한다고 살아남는 거 아니다.', '…어리군.'] },
  drunk: { any: ['끄윽… 뭐라고? 한 잔 더 해!', '너 좋은 놈이구나~ 딸꾹', '으하하! 건배!', '어? 너 둘이야?'], rude: ['뭐?! 너 나와! …아니다 앉아 있을래', '딸꾹… 욕도 취해서 들리네~', '크하하 너 웃긴다'] },
  provocateur: { any: ['그 말 할 시간에 유서나 써.', '어머, 말도 할 줄 알아?', '떨리는 목소리 다 들린다~', '계속 떠들어, 마지막 말이 될지도 모르니까.'], rude: ['오~ 이제야 좀 재밌네.', '욕밖에 할 줄 몰라? 불쌍해라.', '화났구나? 귀여워~'] },
};
let chatCool = 0;
$('#chatForm').addEventListener('submit', e => {
  e.preventDefault(); const inp = $('#chatInput'), t = inp.value.trim().slice(0, 60); if (!t) return;
  if (!state.started || state.mode === 'auto') return;
  const now = performance.now(); if (now < chatCool) return; chatCool = now + 1200;
  const i = state.seats.findIndex(s => s && s.kind === 'human'); if (i < 0) return;
  inp.value = ''; seatEls[i].querySelector('.bubble').classList.remove('emo'); bubble(i, t, 2600);
  const o = 1 - i, ai = state.seats[o], tok = state.token;
  if (!ai || ai.kind === 'human' || state.over || (ai.muteUntil && now < ai.muteUntil)) return;
  if (Math.random() > .6) return;
  ai.muteUntil = now + 3000;
  const P = CHAT_REPLY[ai.pers] || CHAT_REPLY.veteran, pool = CHAT_RUDE.test(t) ? P.rude : P.any;
  const r = pick(pool).replace(/\{last\}/g, t.slice(0, 30));
  setTimeout(() => { if (tok === state.token && !state.over) sayOrEmote(o, fmt(o, r), 2600); }, 900 + Math.random() * 900);
});
// Enter: 채팅창으로 바로 이동 / Esc: 빠져나오기
document.addEventListener('keydown', e => {
  const inp = $('#chatInput');
  if (e.key === 'Enter' && document.activeElement === document.body && state.started && state.mode !== 'auto' && $('#recOv').classList.contains('hide')) { e.preventDefault(); inp.focus(); }
  else if (e.key === 'Escape' && document.activeElement === inp) inp.blur();
});
const chatMeSync = () => { const el = $('#chatMe'), v = state.name || '나'; if (el.textContent !== v) el.textContent = v; }; // 같으면 건드리지 않음 (다시 그리면 깜빡임)
chatMeSync(); setInterval(chatMeSync, 2000);
// 사망 기록 (회색)
function chatDeath(seat, quote, sub) { chatAdd('death', '', `☠ ${seat.name} 사망${quote ? ' — ' + quote : ''} · ${sub}`); }

// 사용자가 스크롤을 움직일 때만 '붙어 있기'를 다시 판단한다 (내용이 늘어난 것 때문에 풀리지 않게)
{ const cl = $('#chatList'); let userMove = false;
  ['wheel', 'touchmove', 'pointerdown', 'keydown'].forEach(ev => cl.addEventListener(ev, () => { userMove = true; }, { passive: true }));
  cl.addEventListener('scroll', () => { if (!userMove) return; chatStick = cl.scrollHeight - cl.scrollTop - cl.clientHeight < 30; if (chatStick) chatNewBtn(false); });
  cl.insertAdjacentHTML('afterend', '<button id="chatNew" class="chat-new" type="button">▼ 새 대화</button>');
  $('#chatNew').addEventListener('click', () => { userMove = false; chatToBottom(true); });
  new ResizeObserver(() => { if (chatStick) cl.scrollTop = cl.scrollHeight; }).observe(cl); }

