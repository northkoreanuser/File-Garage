// ══════════════════ AI 대전 베팅 ══════════════════
// 승자 맞히기: 적중 시 건 돈의 2배 / 누가 몇 %에서 죽는지 정확히: 4배 + "더블!"
// 돈은 1:1 소지금에서 나간다. 첫 행동 전까지만 걸 수 있고, 무효 판은 환불.
const AB = { type: 'win', who: 0, stake: 100 };
const abPcts = (() => { const N = 6, set = new Set(); for (let k = 0; k < N; k++) for (let b = 1; b <= N - k; b++) set.add(Math.round(b / (N - k) * 100)); return [...set].sort((a, b) => a - b); })();
$('#abPct').innerHTML = abPcts.map(p => `<option value="${p}">${p}%</option>`).join('');
$('#abPct').value = '17';
function aiBetOpen() { state.aiBet = null; aiBetUI(); }
const aiBetLocked = () => !state.started || state.mode !== 'auto' || state.over || !!state.aiBet || (state.lastAction && state.lastAction.some(Boolean)) || state.shot > 0;
function aiBetUI() {
  const box = $('#aiBet'); if (!box) return;
  const s0 = state.seats && state.seats[0], s1 = state.seats && state.seats[1];
  $('#abBank').textContent = won(bank);
  document.querySelectorAll('#abType button').forEach(b => b.classList.toggle('on', b.dataset.t === AB.type));
  document.querySelectorAll('#abWho button').forEach(b => { const s = state.seats && state.seats[+b.dataset.w]; b.textContent = s && s.kind === 'ai' ? s.name : (b.dataset.w === '0' ? 'A' : 'B'); b.classList.toggle('on', +b.dataset.w === AB.who); });
  document.querySelectorAll('#abStake button').forEach(b => { b.classList.toggle('on', +b.dataset.s === AB.stake); b.disabled = +b.dataset.s > bank; });
  $('#abPctRow').style.display = AB.type === 'exact' ? '' : 'none';
  $('#abWhoLbl').textContent = AB.type === 'exact' ? '죽는 쪽' : '이기는 쪽';
  const b = state.aiBet, locked = aiBetLocked();
  box.classList.toggle('locked', locked); box.classList.toggle('placed', !!b);
  $('#abGo').disabled = locked || AB.stake > bank;
  $('#abNote').innerHTML = b ? (() => { const s = state.seats[b.who]; return b.type === 'win' ? `🎲 걸었다: <b>${esc(s ? s.name : '?')}</b> 승리 · ${won(b.stake)} → 적중 시 ${won(b.stake * 2)}` : `🎲 걸었다: <b>${esc(s ? s.name : '?')}</b>, <b>${b.pct}%</b>에서 사망 · ${won(b.stake)} → 적중 시 ${won(b.stake * 4)}`; })()
    : locked ? (state.over ? '판이 끝났다. 다음 경기에서 다시.' : '베팅 마감 — 첫 행동이 나왔다.') : '첫 행동 전까지만 걸 수 있다 · 무효 판은 환불';
}
$('#abType').addEventListener('click', e => { const t = e.target.dataset.t; if (!t) return; AB.type = t; aiBetUI(); });
$('#abWho').addEventListener('click', e => { const w = e.target.dataset.w; if (w == null) return; AB.who = +w; aiBetUI(); });
$('#abStake').addEventListener('click', e => { const v = +e.target.dataset.s; if (!v) return; AB.stake = v; aiBetUI(); });
$('#abGo').addEventListener('click', () => {
  if (aiBetLocked() || AB.stake > bank) return;
  bank -= AB.stake; saveMoney(); A.coin(3);
  state.aiBet = { type: AB.type, who: AB.who, pct: AB.type === 'exact' ? +$('#abPct').value : null, stake: AB.stake };
  const s = state.seats[AB.who]; log(`베팅 — ${AB.type === 'win' ? `${esc(s.name)} 승리` : `${esc(s.name)}, ${state.aiBet.pct}%에서 사망`} ${won(AB.stake)}`, 'spin');
  save(); aiBetUI(); renderAll();
});
function abFloat(text, big, delay = 4400) { setTimeout(() => abFloat0(text, big), delay); } // 사망 연출이 걷힌 뒤에 뜬다
function abFloat0(text, big) { const f = document.createElement('div'); f.className = 'ab-float' + (big ? ' big' : ''); f.textContent = text; $('#aiBet').appendChild(f); setTimeout(() => f.remove(), 2600); }
function aiBetSettle(deadI, p) {
  const b = state.aiBet; if (!b) return; state.aiBet = null;
  if (deadI < 0) { bank += b.stake; saveMoney(); log(`무효 경기 — 베팅 환불 ${won(b.stake)}`, 'sys'); abFloat('환불', false, 200); aiBetUI(); return; }
  const winner = 1 - deadI, pct = Math.round((p || 0) * 100);
  if (b.type === 'win' && b.who === winner) { const pay = b.stake * 2; bank += pay; log(`베팅 적중! ${esc(state.seats[winner].name)} 승리 — +${won(pay)}`, 'spin'); abFloat('+' + won(pay)); A.coin(6); }
  else if (b.type === 'exact' && b.who === deadI && b.pct === pct) { const pay = b.stake * 4; bank += pay; log(`정확히 맞혔다! ${esc(state.seats[deadI].name)}, ${pct}%에서 사망 — 더블 +${won(pay)}`, 'spin'); abFloat('더블!', true); abFloat('+' + won(pay), false, 4850); A.coin(10); }
  else log(`베팅 실패 −${won(b.stake)}` + (b.type === 'exact' ? ` (실제: ${esc(state.seats[deadI].name)}, ${pct}%)` : ''), 'sys');
  saveMoney(); aiBetUI();
}
// 렌더할 때마다 베팅판 갱신
{ const _ra = renderAll; renderAll = function () { _ra(); aiBetUI(); }; }
loadUI(state.mode); aiBetUI();
// ── 설정: 베팅판 표시 · 술꾼 자장가
function applyExtraSettings() {
  document.body.classList.toggle('nobet', settings.betPanel === false);
  document.querySelectorAll('#betSeg button').forEach(b => b.classList.toggle('on', (b.dataset.b === '1') === (settings.betPanel !== false)));
  $('#lullabyChk').checked = settings.lullaby !== false;
  const vv = settings.voiceSfx === false ? 'off' : (settings.voiceStyle === 'beep' ? 'beep' : 'voice'); document.querySelectorAll('#vsfxSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === vv));
}
$('#betSeg').addEventListener('click', e => { const v = e.target.dataset.b; if (v == null) return; settings.betPanel = v === '1'; S.set('settings', settings); applyExtraSettings(); });
$('#vsfxSeg').addEventListener('click', e => { const v = e.target.dataset.v; if (!v) return; settings.voiceSfx = v !== 'off'; if (v !== 'off') settings.voiceStyle = v; S.set('settings', settings); applyExtraSettings(); if (v !== 'off') { A.init(); const pv = pick(Object.keys(VOICES).filter(x => x !== '_')); ['안', '녕', '하', '냐'].forEach((c, k) => setTimeout(() => A.blip(VOICE_PITCH[pv] || 300, c, pv), k * 95)); } }); // 고르면 아무 성격 목소리로 미리 들려준다
$('#lullabyChk').addEventListener('change', e => { settings.lullaby = e.target.checked; S.set('settings', settings); });
applyExtraSettings();

