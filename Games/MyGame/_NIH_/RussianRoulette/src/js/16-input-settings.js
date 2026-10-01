// ══════════════════ 사람 입력 ══════════════════
function humanAct(kind, forced) {
  const i = state.turn, s = state.seats[i];
  if (!state.started || state.paused || state.busy || state.over || state.busyLoad || !s || s.kind !== 'human') return;
  if (!canOf(i)[kind]) return;
  state.lastThink[i] = performance.now() - state.turnStart;
  if (!forced && (kind === 'spin' || kind === 'pass')) { prof.esc[nextCh() - 1] = (prof.esc[nextCh() - 1] || 0) + 1; prof.n++; S.set('prof', prof); }
  state.busy = true; stopTimer(); state.forcedBy = forced ? i : -1; counterHide(); if (kind !== 'fire') willHide();
  const cn = canOf(i);
  if (kind === 'fire' && (cn.spin || cn.pass) && (risk() >= 1 || (flickedAny() && risk() >= HIGH))) { // 플레이어도 피할 수 있는데 당김
    const w = pick(PLAYER_BRAVE); state.braveWords = { i, text: w }; bubble(i, w, 3000); setMsg(`${s.name}, 피하지 않는다…!`, 'danger');
  } else { const vt = line(i, actKey(i, kind, ctxFor(i))) || line(i, kind); if (vt && !(s.muteUntil > performance.now())) bubble(i, vt, risk() >= 1 ? 2600 : 1800); }
  ACT[kind](i, state.token);
}
function firePress() { // 격철이 걸린 순간 한 번 더 → 플릭샷
  if (state.flickWindow >= 0 && state.flickWindow === state.turn && !state.paused) { if (state.flickHit !== state.turn) { state.flickHit = state.turn; A.tick(); setMsg('플릭!', 'spin'); } return; }
  humanAct('fire');
}
Object.entries(BTN).forEach(([a, el]) => el.addEventListener('click', () => a === 'fire' ? firePress() : humanAct(a)));

// ══════════════════ 모드 / 설정 / 음악 ══════════════════
function applyModeUI() {
  document.body.classList.toggle('auto', state.mode === 'auto'); document.body.classList.toggle('tourmode', state.mode === 'tour');
  document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === state.mode));
  document.querySelectorAll('#loadSeg button').forEach(b => b.classList.toggle('on', +b.dataset.load === settings.load));
  document.querySelectorAll('#timerSeg button').forEach(b => b.classList.toggle('on', (b.dataset.t === '1') === timerOn()));
  document.querySelectorAll('#timerSeg button').forEach(b => b.disabled = state.mode === 'tour');
  $('#timerDesc').innerHTML = state.mode === 'tour' ? '<span class="warn2">🔒 토너먼트에서는 시간 제한이 항상 켜진다 (설정과 무관).</span>' : (settings.timer ? '' : '꺼져 있으면 암시장 보드카를 살 수 없다.');
  $('#loadDesc').innerHTML = LOADS[settings.load] + ' · 판돈 ×' + settings.load + ' · 다음 판부터' + (state.mode === 'tour' ? '<span class="warn2">토너먼트는 층 규칙을 따른다 (B7 볼코프: 2발).</span>' : '');
}
function restart() {
  state.token++; if (state.mode === 'auto') manualPause = false; applyPause(); stopTimer(); clearDark(); aimOff(); counterHide(); willHide(); if (state.bet) { money.v += state.bet.stake; saveMoney(); state.bet = null; } betClose();
  Heart.stop(); hideDeath(); Blood.clear(); state.over = false; hammer.classList.remove('cocked'); cylWrap.classList.remove('open');
  $('#tourOv').classList.add('hide');
  seatEls.forEach(e => e.querySelector('.bubble').classList.remove('show'));
  newRound(state.token, false);
}
function timerOn() { return state.mode === 'tour' || !!settings.timer; }
// 탭(모드)은 서로 독립: 옮겨도 각 모드의 판·기록·채팅이 그대로 남는다 (switchMode는 modes 쪽)
$('#modeSeg').addEventListener('click', e => { const m = e.target.dataset.mode; if (!m || m === state.mode) return; switchMode(m); });
$('#setBtn').addEventListener('click', e => { e.stopPropagation(); $('#setPop').classList.toggle('open'); $('#shopPop').classList.remove('open'); });
document.addEventListener('click', e => { if (!e.target.closest('.popwrap')) { $('#setPop').classList.remove('open'); $('#shopPop').classList.remove('open'); } });
$('#loadSeg').addEventListener('click', e => { // 장전 탄 수: 다음 판부터 (토너먼트는 층 규칙)
  const n = +e.target.dataset.load; if (!LOADS[n] || n === settings.load) return;
  settings.load = n; S.set('settings', settings); applyModeUI();
  if (state.started && state.mode !== 'tour') log(`장전 설정 — ${n}발. 다음 판부터 적용.`, 'sys');
});
$('#timerSeg').addEventListener('click', e => {
  const t = e.target.dataset.t; if (t === undefined) return;
  if (state.mode === 'tour') { $('#timerDesc').innerHTML = '<span class="warn2">토너먼트 중에는 바꿀 수 없다.</span>'; return; }
  settings.timer = t === '1'; S.set('settings', settings); applyModeUI();
  if (!settings.timer) stopTimer(); else if (state.started && !state.busy) startTimer(state.token);
});
// ── 전체 화면: 화면을 누를 때마다 다시 건다 (설정에서 끌 수 있음)
const fsUI = () => document.querySelectorAll('#fsSeg button').forEach(b => b.classList.toggle('on', (b.dataset.f === '1') === !!settings.fs));
fsUI();
$('#fsSeg').addEventListener('click', e => {
  const f = e.target.dataset.f; if (f === undefined) return;
  settings.fs = f === '1'; S.set('settings', settings); fsUI();
  if (!settings.fs && document.fullscreenElement) document.exitFullscreen().catch(() => {});
});
document.addEventListener('click', e => { // pointerdown에서 전체 화면을 켜면 화면이 바뀌는 사이 클릭이 엉뚱한 곳(환영 화면 배경)에 떨어져 '다른 이름으로 서명'이 먹히지 않았다 → 클릭이 처리된 뒤에 켠다
  if (!settings.fs || document.fullscreenElement || document.webkitFullscreenElement) return;
  if (e.target.closest('#fsSeg')) return;
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rq) setTimeout(() => { try { const r = rq.call(el); if (r && r.catch) r.catch(() => {}); } catch (_) {} }, 0);
}, false);
const musicBtn = $('#musicBtn');
let musicOn = S.get('music', true);
function applyMusicUI() { musicBtn.classList.toggle('off', !musicOn); }
function toggleMusic() { musicOn = !musicOn; S.set('music', musicOn); applyMusicUI(); if (state.started) { if (musicOn) { Music.start(); A.crowdStart(); } else { Music.stop(); A.crowdStop(); } } }
musicBtn.addEventListener('click', toggleMusic);
// ── 일시정지: 수동(버튼) + 자동(설정·암시장·대사 창, 탭 전환·비활성). AI 관전에서는 없음.
let manualPause = false; const pauseWhy = new Set();
function applyPause() {
  if (state.mode === 'auto') manualPause = false; // AI 대전엔 일시정지 없음 (버튼은 CSS로 숨김)
  bgmGate();
  const p = state.started && (pauseWhy.has('dbg') || pauseWhy.has('rule') || (state.mode !== 'auto' && (manualPause || pauseWhy.size > 0)));
  const btn = $('#pauseBtn'); btn.innerHTML = manualPause ? '▶ 재개' : '❚❚ 일시정지'; btn.classList.toggle('on', manualPause);
  $('#pauseTag').textContent = pauseWhy.has('dbg') ? '⏸ 디버그 — 모든 진행 정지' : manualPause ? '⏸ 일시정지 — 재개 버튼을 누르면 풀린다' : '⏸ 자동 일시정지';
  if (p === state.paused) return;
  state.paused = p; document.body.classList.toggle('paused', p);
  if (p) Heart.stop(); else if (state.started && !state.busy && !state.over) Heart.set(risk());
}
function autoPause(why, on) { on ? pauseWhy.add(why) : pauseWhy.delete(why); applyPause(); }
$('#pauseBtn').addEventListener('click', e => { e.stopPropagation(); manualPause = !manualPause; applyPause(); });
const menuOpen = () => $('#setPop').classList.contains('open') || $('#shopPop').classList.contains('open') || !$('#voiceOv').classList.contains('hide') || !$('#tourOv').classList.contains('hide') || !$('#recOv').classList.contains('hide') || !$('#contract').classList.contains('hide'); // 토너먼트 알림(떠나기 경고 등) 중에도 일시정지
new MutationObserver(() => autoPause('menu', menuOpen())).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', () => autoPause('tab', document.hidden));
// 창 포커스 아웃(알트탭 등): 일시정지만 한다 — 브금은 끄지 않음. 탭을 가렸을 때(visibilitychange)는 일시정지 + 브금 끄기
window.addEventListener('blur', () => setTimeout(() => { if (!document.hasFocus()) autoPause('blur', true); }, 150));
window.addEventListener('focus', () => autoPause('blur', false));
['pointerdown', 'keydown', 'focusin'].forEach(ev => document.addEventListener(ev, () => { if (pauseWhy.has('blur')) autoPause('blur', false); }, true)); // 페이지를 만지고 있으면 창이 비활성일 리 없다


