// ══════════════════ 술꾼 기믹: 멍때리다 잠들기 ══════════════════
// 술꾼 AI가 자기 차례에 30% 확률로(판마다 한 번) 잠든다. zzZ가 한 단어씩 쌓였다 지워지길 반복하고,
// 딜러와 상대가 깨운다. 설정에 따라 음악이 브람스 자장가로 바뀐다.
const R_WAKE = {
  _: ['일어나!', '이봐, 네 차례다. 일어나!'],
  berserker: ['일어나, 이 술통아! 총 들어!', '자면 내가 대신 쏴준다?!'],
  coward: ['저, 저기요… 주무시면 안 돼요…', '깨, 깨워도 되나…? 일어나세요…'],
  gambler: ['친구, 판 중에 자면 몰수야.', '일어나. 칩 다 쓸어간다?'],
  calculator: ['수면 상태 감지. 기상을 요청합니다.', '당신 차례입니다. 수면은 규칙 위반입니다.'],
  strategist: ['시간 끌기 작전인가? 안 통한다. 일어나.', '연기라면 제법이군. 일어나라.'],
  fatalist: ['잠들어도 운명은 기다려 준다. 일어나라.', '…일어나라. 총이 기다린다.'],
  mimic: ['zzZ… 아, 따라 하는 거 아니야. 일어나!', '일어나~ 일어나~'],
  mindgamer: ['자는 척하는 거 다 알아. 눈꺼풀 떨린다.', '무서워서 자는 척하는 거지?'],
  veteran: ['이봐, 전장에서 졸면 죽는다. 일어나게.', '자네, 정신 차리게.'],
  drunk: ['야~ 나도 졸린데~ 일어나 딸꾹!', '같이 자자~ …아니 일어나!'],
  provocateur: ['씨발, 쳐 자냐? 일어나, 술고래야.', '자다가 뒈지고 싶냐? 일어나.'],
};
PERS_IDS.forEach(id => { const L = PERS[id].lines; if (L && !L.r_wake) L.r_wake = R_WAKE[id] || R_WAKE._; });
const WAKE_UP = ['헉! 어… 내 차례야? 딸꾹.', '안 잤어! 눈만 감고 있었어!', '으음… 건배…? 아, 총이구나.', '딸꾹… 누가 깨웠어?'];
var sleepState = null;
async function drunkSleep(i, tok) {
  drunkWakeNow(); // 혹시 남은 잠 루프가 있으면 먼저 정리
  const s = state.seats[i], o = 1 - i, el = seatEls[i].querySelector('.bubble'); state.drunkDid = Object.assign(state.drunkDid || {}, { sleep: true });
  const prevVar = Music.variant || null, lull = settings.lullaby !== false;
  if (lull) Music.switchTo('lullaby');
  setMsg(`${jo(s.name, '이')} 꾸벅… 잠들었다.`, 'info'); log(`${esc(s.name)} — 잠들었다.`, 'sys'); chatAdd('say p' + i, s.name, 'zzZ... zzZ... zzZ...');
  const zz = ['zzZ...', 'zzZ... zzZ...', 'zzZ... zzZ... zzZ...', ''];
  let k = 0; clearTimeout(el._t); clearTimeout(el._typeT); el._typeTok = (el._typeTok || 0) + 1; el.classList.remove('emo'); el.classList.add('show', 'zz');
  let iv = 0;
  // zzZ 루프는 '지금 이 잠'이 유효할 때만 돈다 — 판·모드가 바뀌었거나 잠 상태가 아니면 스스로 멈추고 흔적을 지운다
  const tickZ = () => { if (!sleepState || sleepState.iv !== iv || tok !== state.token || !state.started || !el.classList.contains('zz')) { clearInterval(iv); if (sleepState && sleepState.iv === iv) drunkWakeNow(); else if (!sleepState) el.classList.remove('zz'); return; }
    if (state.paused) return; el.textContent = zz[k++ % zz.length]; el._until = performance.now() + 900; el._dots = false; if (k % 4 === 1 && A.breath) A.breath(); };
  iv = setInterval(tickZ, 540); sleepState = { iv, el, prevVar, lull }; tickZ();
  // 술꾼끼리: 상대 술꾼도 한 박자 늦게 따라 잠들 수 있다 (자기 잠 카운트에 포함)
  const os = state.seats[o], co = os && isDrunkVoice(o) && (os.forceCo || Math.random() < .5);
  if (co) { os.forceCo = false;
    const coSteps = [[1500, () => { const ob = seatEls[o].querySelector('.bubble'); ob.classList.remove('emo'); bubble(o, pick(CO_SLEEP), 2200); }],
      [2300, () => { os.slept = true; os.sleeps = (os.sleeps || 0) + 1; coSleepStart(o, tok); setMsg(`${os.name}도… 꾸벅.`, 'info'); log(`${esc(os.name)} — 따라 잠들었다.`, 'sys'); chatAdd('say p' + o, os.name, 'zzZ... zzZ...'); }],
      [1800, () => setMsg(`${DEALER}: ${pick(DEALER_BOTH_SLEEP)}`, 'danger')],
      [1700, () => { setMsg(`${DEALER}: 둘 다 일어나!! — 딜러가 테이블을 쾅! 쾅! 내리친다.`, 'danger'); tableSlam(true); }],
      [900, null]];
    for (const [ms, fn] of coSteps) { await wait(ms); if (tok !== state.token) { drunkWakeNow(); return; } if (fn) fn(); }
    drunkWakeNow();
    bubble(i, pick(WAKE_UP), 2200); setMsg('둘 다 화들짝 깬다.', 'info');
    await wait(900); if (tok !== state.token) return; bubble(o, pick(WAKE_UP_CO), 2200);
    await wait(1500); if (tok !== state.token) return;
    setMsg(`${DEALER}: ${pick(DEALER_DRUNK)}`, 'info'); await wait(1500); return;
  }
  const steps = [[1900, () => setMsg(`${DEALER}: ${s.name}! 일어나라.`, 'danger')],
    [1700, () => { const t = line(o, 'r_wake') || (state.seats[o].kind === 'ai' ? pick(R_WAKE._) : null); if (t) { seatEls[o].querySelector('.bubble').classList.remove('emo'); bubble(o, fmt(o, t), 2400); } }],
    [2000, () => { setMsg('딜러가 테이블을 쾅 내리친다!', 'danger'); tableSlam(); }],
    [800, null]];
  for (const [ms, fn] of steps) { await wait(ms); if (tok !== state.token) { drunkWakeNow(); return; } if (fn) fn(); }
  drunkWakeNow();
  bubble(i, pick(WAKE_UP), 2200); setMsg(`${jo(s.name, '이')} 화들짝 깬다.`, 'info');
  await wait(1300); if (tok !== state.token) return;
  setMsg(`${DEALER}: ${pick(DEALER_DRUNK)}`, 'info'); await wait(1500);
}
// 딜러가 테이블을 쾅 — 묵직한 나무 울림 + 칩·잔 달그락 + 화면 전체 크게 흔들림
A.slam = function (v = 1, dt = 0) { if (!this.ctx) return; const t = this.now() + dt, b = this.bus(1.25 * v, 0, .35 + (v - 1) * .3);
  this.thump(t, 115, 38, .32, 1.6, b); this.thump(t + .004, 62, 30, .45, 1.2, b); // 주먹 + 상판 울림
  this.burst(t, .07, 'lowpass', 900, .8, 1.3, b); this.burst(t, .18, 'bandpass', 320, 1.4, .8, b); // 타격 소음
  this.modal(t + .003, [182, 296, 431, 617], [.28, .2, .14, .09], [.35, .22, .14, .08], b, .02); // 나무 공명
  for (let k = 0; k < 7; k++) { const tt = t + .05 + k * (.03 + Math.random() * .045); this.modal(tt, [2600 + Math.random() * 2200, 5200 + Math.random() * 1800], [.06, .04], [.07 * (1 - k / 8), .03], b, .03); } // 칩·잔 달그락
};
function tableSlam(both) { // both: 둘 다 잠 → 두 번, 더 세게, 더 크게 흔들림
  if (A.slam) { if (both) { A.slam(1.35); A.slam(1.5, .2); } else A.slam(); }
  const a = $('#app'), c = both ? 'tslam2' : 'tslam'; a.classList.remove('tslam', 'tslam2', 'ttap', 'quake'); void a.offsetWidth; a.classList.add(c); // 총 쏠 때 붙은 quake가 남아 있으면 흔들림이 먹히지 않았다
  setTimeout(() => a.classList.remove(c), both ? 1300 : 800);
}
// 책상을 툭 — 가벼운 노크 + 살짝 흔들림 (술꾼이 자기 차례를 모를 때)
function tableTap() {
  if (A.ctx) { const t = A.now(), b = A.bus(.8, 0, .25); A.thump(t, 150, 70, .12, .7, b); A.burst(t, .04, 'bandpass', 700, 1.2, .5, b); A.modal(t, [210, 340], [.12, .08], [.12, .06], b, .02); }
  const a = $('#app'); a.classList.remove('tslam', 'tslam2', 'ttap', 'quake'); void a.offsetWidth; a.classList.add('ttap');
  setTimeout(() => a.classList.remove('ttap'), 450);
}
const CO_SLEEP = ['…쟤가 자니까… 갑자기 나도 졸리네… 하암…', '어? 자? …나도 눈 좀 붙일까… 딸꾹…', '자는 거 보니까… 나도… 하아암…', '야~ 혼자 자냐~ 치사하게… 나도…'];
const WAKE_UP_CO = ['헉! 나 안 잤어! …쟤가 먼저 잤어!', '으음… 뭐야, 둘 다 잤어? 딸꾹', '어… 아침이야? 아 총이구나~'];
const DEALER_BOTH_SLEEP = ['…둘 다냐. 또 이러는군!', '이봐! 둘 다 또 이런다고?!', '하… 술꾼 둘이면 늘 이 꼴이지.'];
// 따라 잠든 상대의 zzZ — 원래 잠(sleepState)에 매달려 있다가 같이 정리된다
function coSleepStart(o, tok) {
  if (!sleepState) return; const el = seatEls[o].querySelector('.bubble'), zz = ['zzZ...', 'zzZ... zzZ...', 'zzZ... zzZ... zzZ...', '']; let k = 1, iv = 0;
  clearTimeout(el._t); clearTimeout(el._typeT); el._typeTok = (el._typeTok || 0) + 1; el.classList.remove('emo'); el.classList.add('show', 'zz');
  const tick = () => { if (!sleepState || !sleepState.co || sleepState.co.iv !== iv || tok !== state.token || !el.classList.contains('zz')) { clearInterval(iv); el.classList.remove('zz'); return; }
    if (state.paused) return; el.textContent = zz[k++ % zz.length]; el._until = performance.now() + 900; };
  iv = setInterval(tick, 590); sleepState.co = { iv, el }; tick();
}
function drunkWakeNow() {
  if (!sleepState) return; const { iv, el, prevVar, lull, co } = sleepState; sleepState = null;
  clearInterval(iv); el.classList.remove('zz', 'show'); el.textContent = '';
  if (co) { clearInterval(co.iv); co.el.classList.remove('zz', 'show'); co.el.textContent = ''; }
  if (lull && Music.variant === 'lullaby') Music.switchTo(state.seats && state.seats.some(x => x && x.nemesis) ? 'nemesis' : (prevVar === 'lullaby' ? null : prevVar));
}

// ══════════════════ 따라쟁이: 술꾼 따라 하기 (자는 척 · 얼타는 척) ══════════════════
// 같은 판에서 술꾼이 잠들었거나 얼탔으면, 따라쟁이는 자기 차례에 그걸 흉내 낸 뒤 평소처럼 행동한다.
// 술꾼은 "따라 하지 마"라고 하거나, 졸려서 그런가 보다 하고 넘어간다.
const MIMIC_SLEEP_PEEK = ['…zzZ. (힐끔) 헤헤, 똑같지?', '(실눈) …나도 잘 자지? 헤헤~', 'zzZ… 아, 이거 재밌다~'];
const MIMIC_GAG = ['야~ 빨리 해~ 딸꾹! …헤헤, 따라 해봤어~', '왜 안 쏴~? 아, 내 차례구나~ 헤헤', '이봐~ 딜러! 저 친구… 아니 나구나~ 딸꾹~'];
const DRUNK_VS_MIMIC = { stop: ['야! 따라 하지 마~ 딸꾹!', '뭐야, 날 따라 해? 이 녀석이~', '흉내 내지 마라~ 딸꾹… 기분 나빠~'], ok: ['어? 너도 졸려? 그럼 같이 자자~', '졸린가 보네~ 이해해, 딸꾹…', '그치~ 이 시간엔 다 졸려~'] };
async function mimicCopy(i, tok) {
  const s = state.seats[i], o = 1 - i, d = state.seats[o], did = state.drunkDid || {};
  if (!d || !isDrunkVoice(o)) return;
  const el = seatEls[i].querySelector('.bubble');
  const drunkSays = (pool, ms) => setTimeout(() => { if (tok !== state.token) return; seatEls[o].querySelector('.bubble').classList.remove('emo'); bubble(o, pick(pool), 2400); }, ms);
  if (did.sleep && !s.cpSleep) { // 자는 척
    s.cpSleep = true;
    setMsg(`${jo(s.name, '이')} … 꾸벅?`, 'info'); log(`${esc(s.name)} — 술꾼을 따라 자는 척.`, 'sys'); chatAdd('say p' + i, s.name, 'zzZ... zzZ...');
    const zz = ['zzZ...', 'zzZ... zzZ...', 'zzZ... zzZ... zzZ...', '']; let k = 0;
    clearTimeout(el._t); clearTimeout(el._typeT); el._typeTok = (el._typeTok || 0) + 1; el.classList.remove('emo'); el.classList.add('show', 'zz');
    let iv = 0; const tick = () => { if (tok !== state.token || !state.started || !el.classList.contains('zz')) { clearInterval(iv); el.classList.remove('zz'); return; } if (state.paused) return; el.textContent = zz[k++ % zz.length]; el._until = performance.now() + 900; };
    iv = setInterval(tick, 540); tick();
    drunkSays(Math.random() < .5 ? DRUNK_VS_MIMIC.stop : DRUNK_VS_MIMIC.ok, 1500);
    await wait(2600); clearInterval(iv); el.classList.remove('zz', 'show'); el.textContent = ''; if (tok !== state.token) return;
    bubble(i, pick(MIMIC_SLEEP_PEEK), 2200); await wait(1500); if (tok !== state.token) return;
    setMsg(`${DEALER}: …너까지냐. 쏴라.`, 'info'); await wait(900);
    return;
  }
  if (did.gag && !s.cpGag) { // 얼타는 척 (재촉하다가 자기 차례인 걸 깨닫는 흉내)
    s.cpGag = true;
    bubble(i, pick(MIMIC_GAG), 2600); setMsg(`${jo(s.name, '이')} 술꾼 흉내를 낸다…`, 'info'); log(`${esc(s.name)} — 술꾼처럼 얼타는 흉내.`, 'sys');
    drunkSays(Math.random() < .5 ? DRUNK_VS_MIMIC.stop : ['어? 너도 헷갈렸어? 딸꾹~ 그럴 수 있지~', '술 안 마셨는데 왜 그래~ 헤헤'], 1600);
    await wait(3200); if (tok !== state.token) return;
    setMsg(`${DEALER}: 장난은 거기까지. 네 차례다.`, 'info'); await wait(800);
  }
}

