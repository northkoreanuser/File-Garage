// ══════════════════ 모드 분리: 1:1 · 토너먼트 · AI 대전 ══════════════════
// 모드마다 판 상태(좌석·탄·아이템·판돈·베팅), 판 수, 진행 기록, 채팅을 따로 저장한다.
// 탭을 옮겨도, F5를 눌러도 각 모드는 떠난 자리(그 차례의 시작)에서 그대로 이어진다.
const seatData = s => JSON.parse(JSON.stringify(s, (k, v) => k === 'muteUntil' ? undefined : v));
function persistUI(m = state.mode) {
  try { S.set('ui_' + m, { log: $('#log').innerHTML, chat: $('#chatList').innerHTML, chatTab: $('#chatList').className }); } catch (e) {}
}
function loadUI(m) {
  const u = S.get('ui_' + m, null);
  $('#log').innerHTML = u ? u.log || '' : ''; const cl = $('#chatList'); cl.innerHTML = u ? u.chat || '' : '';
  cl.className = 'chat-list'; document.querySelectorAll('#chatTabs button').forEach(b => b.classList.toggle('on', b.dataset.f === 'all'));
  chatToBottom(true); chatMsgLast = '';
}
function resumeOrNew() {
  const sv = S.get('save_' + state.mode, null);
  const ok = sv && sv.v === 3 && sv.mode === state.mode && sv.N === state.N && Array.isArray(sv.seats) && sv.seats.length === 2 && sv.seats.every(x => x && (x.kind === 'human' || PERS[x.pers]))
    && (state.mode === 'auto' ? sv.seats.every(x => x.kind === 'ai') : sv.seats[0].kind === 'human');
  if (!ok) { S.del('save_' + state.mode); return newRound(state.token, false); }
  state.seats = sv.seats.map(x => x.kind === 'human' ? Object.assign(humanSeat(), { used: x.used, spinExtra: x.spinExtra || 0, injured: x.injured || 0 }) : x);
  state.c0 = sv.c0; state.live = new Set(sv.live); state.shot = sv.shot; state.fired = new Set(sv.fired || []); state.firedBy = sv.firedBy || {}; state.turn = sv.turn; state.round = sv.round;
  state.lastAction = sv.last || [null, null]; state.lastThink = [0, 0]; state.pot = sv.pot; state.gain = sv.gain || [0, 0]; state.noItems = !!sv.noItems;
  state.vodka = !!sv.vodka; state.spinTicket = !!sv.ticket; state.flickUsed = sv.flick || [false, false]; state.flickSkips = sv.skips || []; state.playerEmoUsed = !!sv.emo; state.cursed = !!sv.cursed; state.raiseCount = sv.raises || 0; laughCount = sv.laugh || [0, 0];
  state.aiBet = sv.aiBet || null; state.over = false; state.busyLoad = false; state.forcedBy = -1; state.blunder = -1; state.braveWords = null; state.bet = null;
  for (let j = 0; j < state.N; j++) chEl(j).classList.remove('loaded', 'reveal', 'spent', 'dbg');
  cylWrap.classList.remove('open'); rotateTo((startIdx() + state.shot) % state.N); paintChambers(); renderEmotes();
  { const nem = state.seats.some(x => x.nemesis); Music.setRate(1); Music.switchTo(nem ? 'nemesis' : null); }
  aiBetUI(); renderAll();
  log('떠났던 판을 그대로 이어서 진행한다.', 'sys');
  nextTurn(state.token);
}
function switchMode(m) {
  if (!m || m === state.mode) return;
  persistUI();
  // 지금 판은 '차례 시작' 저장본이 남아 있으므로 연출만 정리하고 떠난다
  state.token++; stopTimer(); clearDark(); aimOff(); counterHide(); willHide(); coinEnd(false); drunkWakeNow();
  if (state.bet) { money.v += state.bet.stake; saveMoney(); state.bet = null; } betClose();
  Heart.stop(); hideDeath(); Blood.clear(); hammer.classList.remove('cocked'); cylWrap.classList.remove('open'); $('#tourOv').classList.add('hide');
  seatEls.forEach(e => { e.querySelector('.bubble').classList.remove('show'); e.classList.remove('dead', 'active', 'aim'); e.querySelector('.bleed').innerHTML = ''; });
  state.over = false; state.aiBet = null;
  state.mode = m; S.set('mode', m); applyPause(); state.round = (S.get('roundM', {})[m]) || 0;
  loadUI(m); if (m === 'auto') manualPause = false; applyModeUI(); applyPause(); aiBetUI();
  if (state.started) resumeOrNew(); else renderAll();
}
// F5·창 닫기·앱 전환 때 기록/채팅 저장
window.addEventListener('pagehide', () => persistUI());
window.addEventListener('beforeunload', () => persistUI());
document.addEventListener('visibilitychange', () => { if (document.hidden) persistUI(); });
setInterval(() => { if (state.started) persistUI(); }, 5000);

