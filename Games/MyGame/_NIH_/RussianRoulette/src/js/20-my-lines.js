// ══════════════════ 내 대사 편집 ══════════════════
const VOICE_KEYS = [['기본', null], ['intro', '판 시작'], ['introFirst', '판 시작 · 내가 선공일 때'], ['introSecond', '판 시작 · 상대가 선공일 때'], ['fire', '방아쇠 (F)'], ['spin', '스핀 (S)'], ['pass', '양보 (D)'], ['raise', '+1발 (R)'], ['skip', '플릭샷 (F 연타)'], ['survive', '찰칵, 살았을 때'], ['win', '승리'], ['die', '마지막 말'],
  ['상대 행동에 반응', null], ['r_fire', '상대가 당김'], ['r_spin', '상대가 스핀'], ['r_pass', '상대가 양보'], ['r_raise', '상대가 +1발'], ['r_skip', '상대가 플릭샷'], ['r_gag', '술꾼이 안 쏘고 재촉할 때 (네 차례라고)'], ['r_wake', '술꾼이 잠들었을 때 (깨우기)'],
  ['100% 상황', null], ['doom', '피할 수단 없이 당김'], ['spin100', '100%에서 스핀'], ['pass100', '100%에서 양보'], ['doomOpp', '상대가 100% 궁지'], ['oppSpin100', '상대가 100%에서 스핀'], ['curse', '100%를 떠넘겨 받음 (욕)'],
  ['상대가 이모티콘을 보냈을 때', null], ['emo_laugh', '😂 받음'], ['emo_smirk', '😏 받음'], ['emo_cry', '😭 받음'], ['emo_scared', '😱 받음'], ['emo_angry', '😡 받음'], ['emo_pray', '🙏 받음'], ['emo_good', '👍 받음'], ['emo_skull', '💀 받음']];
const vSel = $('#voicePreset'), vForm = $('#voiceForm'); let vEdited = false;
vSel.innerHTML = '<option value="none">말 없음</option>' + PERS_IDS.filter(id => id !== 'calculator').map(id => `<option value="${id}">${PERS[id].ko} 프리셋</option>`).join('') + '<option value="custom">커스텀 (저장된 것)</option>';
vForm.innerHTML = VOICE_KEYS.map(([k, lab]) => lab === null ? `<div class="vf sec">${k}</div>` : `<div class="vf"><label>${lab}<small>${k}</small></label><textarea data-k="${k}" spellcheck="false"></textarea></div>`).join('');
function fillVoice(lines) { vForm.querySelectorAll('textarea').forEach(t => t.value = ((lines && lines[t.dataset.k]) || []).join('\n')); }
function voiceStateTxt() { const el = $('#voiceState'); el.className = 'vstate' + (vEdited ? ' edited' : ''); el.textContent = vEdited ? '수정됨 — 저장하면 커스텀으로 적용' : vSel.value === 'none' ? '플레이어는 말하지 않는다' : vSel.value === 'custom' ? '저장된 커스텀 대사' : `${PERS[vSel.value].ko} 프리셋 그대로`; }
function voiceLabel() { if (voiceRandom()) { const id = curVoiceId(); return '랜덤' + (id && PERS[id] ? '·' + PERS[id].ko : ''); } return voice.mode === 'custom' ? '커스텀' : voice.mode === 'preset' && PERS[voice.preset] ? PERS[voice.preset].ko : '말 없음'; }
function manualLines() { return voice.mode === 'custom' ? voice.lines : voice.mode === 'preset' && PERS[voice.preset] ? PERS[voice.preset].lines : null; }
function applyRandUI() {
  const on = $('#voiceRand').checked; $('.vcard').classList.toggle('rand', on);
  if (on) { const id = curVoiceId(); fillVoice(id && PERS[id] ? PERS[id].lines : null); const el = $('#voiceState'); el.className = 'vstate';
    el.textContent = `랜덤 — ${id && PERS[id] ? '지금은 ' + PERS[id].ko : '다음 판에 추첨'} · ${state.mode === 'tour' ? '토너먼트 동안 유지, 죽으면 재추첨' : '판마다 바뀜'}`; }
  else { vSel.value = voice.mode === 'custom' ? 'custom' : voice.mode === 'preset' ? voice.preset : 'none'; fillVoice(manualLines()); vEdited = false; voiceStateTxt(); }
}
$('#voiceRand').addEventListener('change', applyRandUI);
function openVoice() {
  vSel.querySelector('option[value=custom]').disabled = voice.mode !== 'custom';
  $('#voiceRand').checked = voiceRandom(); applyRandUI();
  $('#setPop').classList.remove('open'); $('#voiceOv').classList.remove('hide', 'fade');
}
vSel.addEventListener('change', () => { const v = vSel.value; fillVoice(v === 'custom' ? voice.lines : v === 'none' ? null : PERS[v].lines); vEdited = false; voiceStateTxt(); });
vForm.addEventListener('input', () => { vEdited = true; voiceStateTxt(); });
function closeVoice() { const o = $('#voiceOv'); o.classList.add('fade'); setTimeout(() => o.classList.add('hide'), 400); }
$('#voiceCancel').addEventListener('click', closeVoice);
$('#voiceSave').addEventListener('click', () => {
  const v = vSel.value, rnd = $('#voiceRand').checked, oldPool = voice.pool;
  if (rnd) { voice = Object.assign({}, voice, { random: true }); }
  else if (vEdited || v === 'custom') {
    const lines = {}; vForm.querySelectorAll('textarea').forEach(t => { const arr = t.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12).map(x => x.slice(0, 80)); if (arr.length) lines[t.dataset.k] = arr; });
    voice = { mode: 'custom', base: v, lines };
  } else if (v === 'none') voice = { mode: 'none' };
  else voice = { mode: 'preset', preset: v };
  if (!rnd) voice.random = false; if (oldPool) voice.pool = oldPool;
  if (rnd && !curVoiceId()) { if (state.mode === 'tour') { tour.voice = rollVoice(); S.set('tour', tour); } else S.set('randVoice', rollVoice()); }
  S.set('voice', voice); renderAll(); $('#voiceCur').textContent = voiceLabel(); closeVoice();
  const i = state.seats.findIndex(s => s && s.kind === 'human'); const t = i >= 0 && line(i, 'intro'); if (t) bubble(i, t, 2200);
});
$('#voiceBtn').addEventListener('click', e => { e.stopPropagation(); openVoice(); });
$('#voiceCur').textContent = voiceLabel();


