// ══════════════════ 디버그 패널 ══════════════════
// 열면 브금까지 전부 일시정지(내부). 수정값은 [저장]을 눌러야 실제로 반영된다.
// DEBUG_MODE=0이면 ⚙ 버튼만 숨고, Pause 키로는 언제든 연다.
let dbgCoin = null; // 다음 동전 토스 지정 (1회용)
// ↺ 다시 시작: 판마다 시작 직전 상태(돈·판 수·염소·토너먼트·연승·숙적)와 판 구성(상대·말투·동전·탄·첫 대사)을 모드별로 기억해 둔다
let replayPlan = null;
function snapPre() { return { bank, tbank, loans, round: state.round, goat: JSON.stringify(goatM), tour: JSON.stringify(tour), streak, nemesis: JSON.stringify(nemesis) }; }
function restorePre(p) {
  bank = p.bank; tbank = p.tbank; loans = p.loans; saveMoney();
  state.round = p.round; { const rm = S.get('roundM', {}); rm[state.mode] = p.round; S.set('roundM', rm); }
  goatM = JSON.parse(p.goat); S.set('goatM', goatM); tour = JSON.parse(p.tour); S.set('tour', tour);
  streak = p.streak; S.set('streak', streak); nemesis = JSON.parse(p.nemesis); if (nemesis) S.set('nemesis', nemesis); else S.del('nemesis');
}
function restartRound() {
  const sn = S.get('rsnap_' + state.mode, null); if (!sn || !state.started) return;
  replayPlan = sn; toggleDbg(false); state.token++; state.over = false; hammer.classList.remove('cocked'); cylWrap.classList.remove('open'); cylRot.classList.remove('blur');
  hideDeath(); Blood.fade && Blood.fade(); seatEls.forEach(e => e.classList.remove('dead'));
  newRound(state.token, false);
}
const DbgMusic = { on: false, timer: null, next: 0, g: null,
  start() { A.init(); if (!A.ctx || this.on) return; this.on = true; this.g = A.ctx.createGain(); this.g.gain.setValueAtTime(0, A.now()); this.g.gain.linearRampToValueAtTime(.5, A.now() + .8); if (!this.gate) { this.gate = A.ctx.createGain(); this.gate.gain.value = A._bgmOff ? 0 : 1; this.gate.connect(A.master); } this.g.connect(this.gate); this.next = A.ctx.currentTime + .2; this.pump(); },
  pump() { if (!this.on) return;
    while (this.next < A.ctx.currentTime + 1.5) { const e = 60 / 112 / 2; let t = this.next, tb = t; // 8분음표
      MIN.mel.forEach(([ns, d]) => { if (ns) Music.pluck(t, NOTE(ns[0]), .2, d * e * .9, this.g, .97, .9945); t += d * e; });
      MIN.bass.forEach(([ns, d]) => { if (ns) Music.pluck(tb, NOTE(ns[0]), .16, d * e * .9, this.g, .7, .996); tb += d * e; });
      this.next = t + e * 2; }
    this.timer = setTimeout(() => this.pump(), 500); },
  stop() { if (!this.on) return; this.on = false; clearTimeout(this.timer); const g = this.g, t = A.now(); g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + .4); setTimeout(() => g.disconnect(), 600); },
};
const dbg = $('#dbg'); let dbgMusicWas = false;
const docLock = () => !!document.getElementById('tourDead') || document.body.classList.contains('ct-exec'); // 서류·처형 연출 중엔 디버그·룰북 금지
function toggleDbg(force) {
  const open = force != null ? force : !state.debug; if (open && docLock()) return; if (open === state.debug) return;
  state.debug = open; dbg.classList.toggle('open', open); document.body.classList.toggle('dbgopen', open); paintChambers();
  autoPause('dbg', open);
  if (open) { dbgMusicWas = Music.on; if (Music.on) { Music.stop(); A.crowdStop && A.crowdStop(); } if (musicOn) DbgMusic.start(); dbgDirty = false; buildDbg(); [60, 250, 600].forEach(ms => setTimeout(dbgResync, ms)); } // 막 멈춘 직후 끝나는 처리까지 반영
  else { DbgMusic.stop(); if (dbgMusicWas && musicOn && state.started) { Music.start(); A.crowdStart && A.crowdStart(); } }
}
$('#dbgBtn').addEventListener('click', () => toggleDbg());
if (!DEBUG_MODE) $('#dbgBtn').style.display = 'none';
const ITEM_KO = { spin: '스핀', pass: '양보', raise: '+1발', flick: '플릭' };
function buildDbg() {
  const ok = state.started && state.seats[0] && state.seats[1], N = state.N;
  let h = '<div class="dh"><h4>DEBUG PANEL</h4><span class="dhint">⏸ 전부 정지 · Pause 키로 닫기</span><button class="dx" id="dClose" title="닫기">✕</button></div>';
  h += '<div class="dsec"><div class="dl">실시간 상태</div><div id="dbgLive"></div></div>';
  if (ok) {
    h += `<div class="dsec"><div class="dl">실린더 (${N}연발) — 실탄 위치</div><div class="dnote">다음 격발보다 앞 칸의 실탄 = 넘어간 탄으로 처리</div><div class="dchips">${Array.from({ length: N }, (_, j) => `<label class="dchip"><input type="checkbox" data-b="${j + 1}" ${state.live.has(j + 1) ? 'checked' : ''}><span>${j + 1}</span></label>`).join('')}</div>
      <div class="dr"><label>다음 격발 약실</label><select id="dShot">${Array.from({ length: N }, (_, j) => `<option value="${j + 1}" ${j + 1 === nextCh() ? 'selected' : ''}>${j + 1}번</option>`).join('')}</select></div>
      <div class="dr"><label>차례</label><select id="dTurn">${[0, 1].map(i => `<option value="${i}" ${state.turn === i ? 'selected' : ''}>${esc(state.seats[i].name)}</option>`).join('')}</select></div></div>`;
    [0, 1].forEach(i => { const s = state.seats[i], ai = s.kind === 'ai';
      h += `<div class="dsec"><div class="dl">${i ? '오른쪽' : '왼쪽'} — ${esc(s.name)} ${ai ? '' : '(사람)'}</div>`;
      if (ai) h += `<div class="dr"><label>성격</label><select id="dPers${i}">${PERS_IDS.map(id => `<option value="${id}" ${s.pers === id ? 'selected' : ''}>${PERS[id].ko}</option>`).join('')}</select></div>`;
      h += `<div class="dl2">아이템 보유</div><div class="dchips">${['spin', 'pass', 'raise', 'flick'].map(k => { const has = k === 'flick' ? !(state.flickUsed && state.flickUsed[i]) : !s.used[k];
        return `<label class="dchip wide"><input type="checkbox" data-it="${i}:${k}" ${has ? 'checked' : ''}><span>${ITEM_KO[k]}</span></label>`; }).join('')}</div>`;
      if (ai || isDrunkVoice(i)) h += `<div class="ddrunk" data-dk="${i}" ${(ai ? s.pers === 'drunk' : true) ? '' : 'hidden'}><div class="dl2">술꾼 기믹${ai ? '' : ' (술꾼 말투 플레이어)'}</div>
        ${true ? `<div class="dr"><label>취기 <b id="dDkV${i}">${Math.round(s.drink || 0)}</b></label><input type="range" id="dDrink${i}" min="0" max="100" value="${Math.round(s.drink || 0)}"></div>` : ''}
        <div class="dr"><label>다음 차례에 얼타기 (재촉)</label><input type="checkbox" id="dGag${i}" ${s.gag ? 'checked' : ''}></div>
        <div class="dr"><label>다음 차례에 잠들기</label><input type="checkbox" id="dSleep${i}" ${s.forceSleep ? 'checked' : ''}></div>
        <div class="dr"><label>자연 발동 허용 (잠)</label><input type="checkbox" id="dSlept${i}" ${!s.noSleep ? 'checked' : ''}></div>
        <div class="dr"><label>상대가 잠들면 따라 자기 (술꾼끼리)</label><input type="checkbox" id="dCo${i}" ${s.forceCo ? 'checked' : ''}></div>
        ${ai ? `<div class="dr"><label>100%에서 헛발질 (그냥 당김)</label><input type="checkbox" id="dDumb${i}" ${s.forceDumb ? 'checked' : ''}></div>` : ''}</div>`;
      h += '</div>'; });
    h += `<div class="dsec"><div class="dl">돈</div>
      <div class="dr"><label>소지금 (₽)</label><input type="number" id="dMoney" value="${money.v}" step="100"></div>
      <div class="dr"><label>판돈 (₽)</label><input type="number" id="dPot" value="${state.pot}" step="100"></div></div>`;
  } else h += '<div class="dsec"><div class="dl">판이 시작되면 실린더·좌석 항목이 나온다.</div></div>';
  { const vm = voiceRandom() ? 'rand' : voice.mode === 'preset' ? voice.preset : voice.mode === 'custom' ? 'custom' : 'none', pool = voice.pool && voice.pool.length ? voice.pool : VOICE_POOL, now = curVoiceId();
    const po = id => `<option value="${id}" ${vm === id ? 'selected' : ''}>${PERS[id].ko}</option>`;
    h += `<div class="dsec"><div class="dl">플레이어 말투 (설정과 연동 · 술꾼이면 기믹도 따라감)</div>
      <div class="dr"><label>말투</label><select id="dVMode"><option value="rand" ${vm === 'rand' ? 'selected' : ''}>랜덤</option>${PERS_IDS.filter(id => id !== 'calculator').map(po).join('')}<option value="none" ${vm === 'none' ? 'selected' : ''}>말 없음</option>${voice.mode === 'custom' ? `<option value="custom" ${vm === 'custom' ? 'selected' : ''}>커스텀</option>` : ''}</select></div>
      <div class="dvrand" ${vm === 'rand' ? '' : 'hidden'}><div class="dl2">랜덤 후보 (판마다 이 중에서 뽑힘)</div><div class="dchips">${PERS_IDS.filter(id => id !== 'calculator').map(id => `<label class="dchip wide"><input type="checkbox" data-vp="${id}" ${pool.includes(id) ? 'checked' : ''}><span>${PERS[id].ko}</span></label>`).join('')}</div>
      <div class="dr"><label>이번 판 말투${state.mode === 'tour' ? ' (토너먼트)' : ''}</label><select id="dVNow">${PERS_IDS.filter(id => id !== 'calculator').map(id => `<option value="${id}" ${now === id ? 'selected' : ''}>${PERS[id].ko}</option>`).join('')}</select></div></div>
      ${S.get('rsnap_' + state.mode, null) && state.started ? '<button class="db" id="dRestart">↺ 이 판 다시 시작 (완전히 같은 판 · 첫 대사부터)</button>' : ''}</div>`; }
  const dc = dbgCoin || {};
  h += `<div class="dsec"><div class="dl">다음 동전 토스</div>
    <div class="dr"><label>결과</label><select id="dCoinSide"><option value="">랜덤</option><option value="0" ${dc.side === 0 ? 'selected' : ''}>앞면 — 왼쪽 선공</option><option value="1" ${dc.side === 1 ? 'selected' : ''}>뒷면 — 오른쪽 선공</option></select></div>
    <div class="dr"><label>동전</label><select id="dCoinCurse"><option value="">랜덤 (불운 ${Math.round(goatP() * 100)}%)</option><option value="0" ${dc.cursed === false ? 'selected' : ''}>행운 — 777 · 클로버</option><option value="1" ${dc.cursed === true ? 'selected' : ''}>불운 — 666 · 염소</option></select></div>
    ${state.started ? '<button class="db" id="dNewRound">🔄 저장하고 새 판 (동전 토스부터)</button>' : ''}</div>`;
  if (ok) h += '<div class="dsec"><div class="dl">AI 판단 미리보기</div><div id="dbgAi"></div></div>';
  h += `<div class="dsec"><div class="dl">초기화 (즉시)</div><button class="db red" id="dReset">✕ 사망·소지금 초기화</button><button class="db red" id="dResetStats">✕ 성격 전적 초기화</button><button class="db" id="dPardon">📜 사면 결정서 보기 (우승 화면)</button><button class="db" id="dFakeDeath">📜 가짜 사망 보고서 (이름 유지)</button><button class="db red" id="dFakeTear">📜 가짜 사면 · 찢김</button><button class="db red" id="dFakeStamp">📜 가짜 사면 · 처형 도장</button><button class="db red" id="dResetName">✕ 이름 지우기… (계약서 연출 확인)</button><div class="dnamebox" id="dNameBox" hidden><div class="dnote">지우기: 이름만 지우고 새로고침 · 죽이기: 사망 화면(토너먼트와 무관, 기록 영향 없음) → 누르면 이름 지우고 새로고침, 서약서 마우스 스킵 가능</div><div class="dchips"><button class="db red" id="dNameDel">지우기</button><button class="db red" id="dNameKill">☠ 죽이기</button><button class="db" id="dNameCancel">취소</button></div></div></div>
    <div class="dfoot"><span id="dSaved"></span><button class="db save" id="dSave">💾 저장</button></div>`;
  dbg.innerHTML = h; dbgDirty = false; dbgSig = dbgSigNow(); refreshDbg();
  dbg.querySelectorAll('[id^=dPers]').forEach(sel => sel.addEventListener('change', () => { const b = dbg.querySelector(`[data-dk="${sel.id.slice(-1)}"]`); if (b) b.hidden = sel.value !== 'drunk'; }));
  dbg.querySelectorAll('[id^=dDrink]').forEach(r => r.addEventListener('input', () => { $('#dDkV' + r.id.slice(-1)).textContent = r.value; }));
  $('#dClose').onclick = () => toggleDbg(false);
  $('#dSave').onclick = () => { dbgSave(); flashSaved(); };
  $('#dVMode').onchange = () => { const b = dbg.querySelector('.dvrand'); if (b) b.hidden = $('#dVMode').value !== 'rand'; };
  if ($('#dRestart')) $('#dRestart').onclick = () => { dbgSave(true); restartRound(); };
  if ($('#dNewRound')) $('#dNewRound').onclick = () => { dbgSave(true); toggleDbg(false); state.token++; hammer.classList.remove('cocked'); newRound(state.token, true); };
  $('#dResetName').onclick = () => { $('#dNameBox').hidden = false; };
  $('#dNameCancel').onclick = () => { $('#dNameBox').hidden = true; };
  $('#dNameDel').onclick = () => { S.del('name'); location.reload(); };
  const fakeDbg = how => { toggleDbg(false); document.body.classList.add('ct-exec'); tourPardonScreen({ name: state.name || '무명', fake: how, preview: true }); }; // 끝나면 가짜 사망 보고서 (이름·기록 유지, 새로고침 없음)
  $('#dFakeDeath').onclick = () => { toggleDbg(false); tourDeathScreen({ name: state.name || '무명', f: tour.floor, best: tourBest, preview: true }); }; // 이름·기록 그대로, 확인 누르면 닫힘
  $('#dFakeTear').onclick = () => fakeDbg('tear'); $('#dFakeStamp').onclick = () => fakeDbg('stamp');
  $('#dPardon').onclick = () => { toggleDbg(false); tourPardonScreen({ name: state.name || '무명', debug: true }); }; // 디버그: 사면 결정서 열람 (진행 상황 무관)
  $('#dNameKill').onclick = () => { const d = { name: state.name || '무명', debug: true }; S.set('tourDeadScreen', d); toggleDbg(false); tourDeathScreen(d); }; // 디버그 죽이기: 토너먼트와 무관 (F5에도 유지되는 건 같음)
  $('#dReset').onclick = () => { deaths = { human: 0, ai: 0 }; S.set('deaths', deaths); bank = 1000; tbank = 1000; loans = 0; saveMoney(); renderAll(); buildDbg(); };
  $('#dResetStats').onclick = () => { statsM = { vs: {}, tour: {}, auto: {} }; riv = {}; S.set('statsM', statsM); S.set('riv', riv); killHistM = { vs: [0, 0, 0, 0, 0, 0, 0], tour: [0, 0, 0, 0, 0, 0, 0], auto: [0, 0, 0, 0, 0, 0, 0] }; S.set('killhistM', killHistM); prof = { esc: [0, 0, 0, 0, 0, 0, 0], n: 0, fires: 0 }; S.set('prof', prof); renderAll(); };
}
// 패널은 열 때마다, 그리고 열려 있는 동안 손대지 않았다면 실제 상태가 바뀔 때마다 다시 읽어서 그린다 (항상 현재 상황과 일치)
let dbgDirty = false, dbgSig = '';
function dbgSigNow() {
  const ss = state.seats || [];
  return JSON.stringify([state.started, state.busyLoad, state.over, state.N, [...(state.live || [])].sort(), state.shot, state.turn, state.flickUsed, (state.flickSkips || []).map(x => x.q + ':' + x.who), state.pot, money.v, dbgCoin,
    ss.map(s => s && [s.name, s.kind, s.pers, s.used && [s.used.spin, s.used.pass, s.used.raise], Math.round(s.drink || 0), !!s.gag, !!s.forceSleep, !!s.noSleep, !!s.forceDumb, !!s.forceCo]), isDrunkVoice(0), isDrunkVoice(1), voice, curVoiceId()]);
}
dbg.addEventListener('input', dirty); dbg.addEventListener('change', dirty);
function dirty(e) { if (e && e.target && e.target.closest && e.target.closest('.dfoot')) return; dbgDirty = true; const el = $('#dSaved'); if (el) { el.textContent = '● 저장 안 됨'; el.className = 'dirty'; } }
function dbgResync() { if (!state.debug || dbgDirty) return; const sig = dbgSigNow(); if (sig !== dbgSig) { const st = dbg.scrollTop; buildDbg(); dbg.scrollTop = st; } }
function flashSaved() { const e = $('#dSaved'); if (e) { e.textContent = '✓ 저장됨'; e.className = 'ok'; } }
function dbgSave(noTurn) {
  const cs = $('#dCoinSide').value, cc = $('#dCoinCurse').value;
  dbgCoin = cs === '' && cc === '' ? null : { side: cs === '' ? null : +cs, cursed: cc === '' ? null : cc === '1' };
  if ($('#dVMode')) { const vm = $('#dVMode').value, pool = [...dbg.querySelectorAll('[data-vp]')].filter(x => x.checked).map(x => x.dataset.vp);
    if (vm === 'rand') voice = Object.assign({}, voice, { random: true }); else if (vm === 'none') voice = { mode: 'none', random: false }; else if (vm === 'custom') voice = Object.assign({}, voice, { random: false }); else voice = { mode: 'preset', preset: vm, random: false };
    voice.pool = pool.length ? pool : VOICE_POOL.slice(); S.set('voice', voice);
    if (vm === 'rand') { const now = $('#dVNow').value; if (now && now !== curVoiceId()) { if (state.mode === 'tour') { tour.voice = now; S.set('tour', tour); } else S.set('randVoice', now);
      const sn = S.get('rsnap_' + state.mode, null); if (sn) { if (state.mode === 'tour') sn.tourVoice = now; else sn.randVoice = now; sn.intro = null; S.set('rsnap_' + state.mode, sn); } } } // 다시 시작도 이 말투로 (첫 대사는 새 말투로 다시 뽑음)
    $('#voiceCur').textContent = voiceLabel(); }
  if (!(state.started && state.seats[0] && state.seats[1] && $('#dShot'))) return;
  const N = state.N, bl = [...dbg.querySelectorAll('[data-b]')].filter(x => x.checked).map(x => +x.dataset.b);
  const cur = +$('#dShot').value, turn = +$('#dTurn').value;
  const cylChanged = [...state.live].sort().join() !== bl.slice().sort().join() || cur !== nextCh() || turn !== state.turn;
  [0, 1].forEach(i => { const s = state.seats[i];
    let fresh = false; if (s.kind === 'ai') { const np = $('#dPers' + i).value; if (np !== s.pers) { fresh = true; s.pers = np; prepAI(s); if (np === 'drunk') { s.gag = false; s.slept = false; } } }
    dbg.querySelectorAll(`[data-it^="${i}:"]`).forEach(x => { const k = x.dataset.it.split(':')[1]; if (k === 'flick') state.flickUsed[i] = !x.checked; else s.used[k] = !x.checked; });
    if (isDrunkVoice(i) && !fresh && $('#dGag' + i)) { // 방금 술꾼으로 바꿨으면 기본값 → 패널 다시 그린 뒤 조정
      if ($('#dDrink' + i)) s.drink = +$('#dDrink' + i).value; s.gag = $('#dGag' + i).checked;
      s.forceSleep = $('#dSleep' + i).checked; s.noSleep = !$('#dSlept' + i).checked; s.forceCo = $('#dCo' + i).checked; if ($('#dDumb' + i)) s.forceDumb = $('#dDumb' + i).checked; }
  });
  const mv = parseInt($('#dMoney').value), pv = parseInt($('#dPot').value);
  if (!isNaN(mv) && mv !== money.v) { money.v = Math.max(0, mv); saveMoney(); }
  if (!isNaN(pv) && pv > 0) state.pot = pv;
  if (cylChanged && !noTurn && !state.over) {
    state.shot = cur - 1; state.fired = new Set(Array.from({ length: state.shot }, (_, j) => j + 1).filter(x => !bl.includes(x))); state.firedBy = {}; // 앞 칸 중 탄 없는 곳 = 쏴서 확인된 빈칸
    state.live = new Set(bl.length ? bl : [N]); // 탄은 지정한 그대로 (앞 칸 탄 = 플릭으로 넘어간 탄)
    state.turn = turn; state.flickSkips = bl.filter(x => x <= state.shot).sort((a, b) => a - b).map(q => ({ who: null, live: true, q })); // 앞 칸 실탄 = 넘어간 탄 (누가 넘겼는지 서사는 없음)
    rotateTo((startIdx() + state.shot) % N, 0, 300); paintChambers();
    state.token++; state.busy = false; state.busyLoad = false; state.flickWindow = -1; hammer.classList.remove('cocked'); aimOff && aimOff();
    cylWrap.classList.remove('open'); cylRot.classList.remove('blur'); for (let j = 0; j < N; j++) chEl(j).classList.remove('loaded'); document.querySelectorAll('.round-in').forEach(e => e.remove()); // 장전·스핀 도중에 끊겨도 총이 세워진 채로 남지 않게
    save(); nextTurn(state.token); // 일시정지 상태로 턴이 다시 잡힌다 — 패널을 닫으면 진행
  } else { save(); renderAll(); }
  buildDbg(); flashSaved();
}
function refreshDbg() {
  if (!state.debug) return; const L = $('#dbgLive'); if (!L) return;
  if (!state.seats[0] || !state.seats[1]) { L.textContent = '대기 중 — 판이 아직 없다'; return; }
  const u = (s, i) => ['spin', 'pass', 'raise'].map(k => s.used[k] ? '·' : ITEM_KO[k]).join(' ') + (state.flickUsed[i] ? ' ·' : ' 플릭');
  L.textContent = `총      : ${state.N}연발\n실탄    : ${[...state.live].sort().join(', ') || '없음'}   (남은 ${remLive()}발)\n다음    : ${nextCh()} / ${state.N}   표기 ${Math.round(risk() * 100)}% · 실제 ${trueRisk() ? '탄' : '빈칸'}\n빈 칸   : ${[...state.fired].sort().join(',') || '없음'}   플릭 ${(state.flickSkips || []).map(x => x.q + (x.live ? '●' : '○')).join(',') || '없음'}\n차례    : ${state.seats[state.turn].name}\n아이템  : ${u(state.seats[0], 0)}  |  ${u(state.seats[1], 1)}\n판돈    : ${won(state.pot)}   보너스 ${state.gain.join(' / ')}\n소지금  : ${won(money.v)}\n브금    : ${Music.variant || '기본'} ×${Music.rate || 1}\n염소    : 다음 판 ${Math.round(goatP() * 100)}%`;
  const ai = $('#dbgAi'); if (ai) ai.textContent = [0, 1].map(i => { const s = state.seats[i]; if (s.kind !== 'ai') return `${s.name}: 사람`;
    const c = ctxFor(i), o = optimal(c.N, c.k, Math.max(1, c.b), maskOf(s), maskOf(c.opp));
    return `${s.name} [${PERS[s.pers].ko}${s.n ? ' n=' + s.n : ''}${s.pers === 'drunk' ? ' 취기 ' + Math.round(s.drink || 0) : ''}]\n  성향상: ${aiDecide(i)} · 최적해: ${o.a} (사망 ${Math.round(o.v * 100)}%)`; }).join('\n');
}
setInterval(() => { dbgResync(); refreshDbg(); }, 300);
dbg.addEventListener('keydown', e => { if (e.repeat) return; if (e.key === 'Pause' || e.key === 'Escape') { e.preventDefault(); toggleDbg(false); } else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); dbgSave(); } });

