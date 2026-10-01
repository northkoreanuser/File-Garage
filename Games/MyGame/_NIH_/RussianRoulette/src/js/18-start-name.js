// ══════════════════ 시작 / 이름 ══════════════════
function begin() {
  A.init(); state.started = true; if (musicOn) { Music.start(); A.crowdStart(); }
  S.del('save'); // 예전 단일 저장은 버린다
  resumeOrNew();
}
const contract = $('#contract'), welcome = $('#welcome'), paper = $('#paper'), nameInput = $('#nameInput');
// ── 이름: 최대 12자 (글자 단위). 조작으로 넘치면 강제 재서명
const NAME_MAX = 12;
const nameLen = v => [...String(v)].length;
const nameOk = v => typeof v === 'string' && !!v.trim() && nameLen(v) <= NAME_MAX;
const PHINT = `최대 ${NAME_MAX}자 · 이 이름이 테이블에 불린다`;
function forceRename() {
  state.name = null; S.del('name'); welcome.classList.add('hide'); openContract();
  nameInput.value = ''; $('#pHint').textContent = `위조된 서명이다. ${NAME_MAX}자 이내로 다시 서명하라.`;
  paper.classList.remove('nope'); void paper.offsetWidth; paper.classList.add('nope');
}
function openContract() {
  $('#pHint').textContent = PHINT;
  $('#docNo').textContent = '1922-12-30-1991-12-26'; paper.classList.remove('stamped'); // 계약서 번호: 소련 건국일 + 해체일
  paper.style.animation = 'none'; void paper.offsetWidth; paper.style.animation = '';
  nameInput.value = state.name || ''; contract.classList.remove('hide', 'fade'); setTimeout(() => nameInput.focus(), 400);
}
async function sign() {
  const v = nameInput.value.trim().replace(/\s+/g, ' ');
  if (!v) { paper.classList.remove('nope'); void paper.offsetWidth; paper.classList.add('nope'); $('#pHint').textContent = '서명 없이는 앉을 수 없다.'; nameInput.focus(); return; }
  if (nameLen(v) > NAME_MAX) { paper.classList.remove('nope'); void paper.offsetWidth; paper.classList.add('nope'); $('#pHint').textContent = `서명은 ${NAME_MAX}자까지다.`; nameInput.value = [...v].slice(0, NAME_MAX).join(''); nameInput.focus(); return; }
  A.init(); A.stamp(); paper.classList.add('stamped');
  const first = !state.started;
  state.name = v; S.set('name', v);
  await sleep(900); contract.classList.add('fade'); await sleep(500); contract.classList.add('hide');
  if (first) begin();
  else { if (state.seats[0] && state.seats[0].kind === 'human') { state.seats[0].name = v; renderAll(); } log(`이름 변경 — ${esc(v)}`, 'sys'); }
}
$('#signBtn').addEventListener('click', sign);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) sign(); });
const clipName = () => { const c = [...nameInput.value]; if (c.length > NAME_MAX) nameInput.value = c.slice(0, NAME_MAX).join(''); };
nameInput.addEventListener('input', e => { if (!e.isComposing) clipName(); });
nameInput.addEventListener('compositionend', clipName);
// 감시: 저장값·현재 이름이 규칙을 어기면 강제로 이름 재설정
setInterval(() => {
  if (!contract.classList.contains('hide')) return;
  const saved = S.get('name', null);
  if ((saved !== null && !nameOk(saved)) || (state.name !== null && !nameOk(state.name))) forceRename();
}, 1500);
welcome.addEventListener('click', e => {
  if (e.target.id === 'resign') { welcome.classList.add('hide'); openContract(); return; }
  welcome.classList.add('fade'); setTimeout(() => welcome.classList.add('hide'), 500); begin();
});
seatEls[0].addEventListener('click', e => { if (e.target.classList.contains('edit')) openContract(); });

// ── 기록 보기 팝업 (진행 기록 · 전적)
const recOv = $('#recOv');
$('#lbTabs').addEventListener('click', e => { const m = e.target.dataset.m; if (!m) return; lbView = m; renderLB(); });
function recToggle(on) { if (on) { lbView = null; renderLB(); } recOv.classList.toggle('hide', !on); if (on) { $('#setPop').classList.remove('open'); $('#shopPop').classList.remove('open'); } }
$('#recBtn').addEventListener('click', e => { e.stopPropagation(); recToggle(recOv.classList.contains('hide')); });
$('#recClose').addEventListener('click', () => recToggle(false));
recOv.addEventListener('click', e => { if (e.target === recOv) recToggle(false); });
document.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'Escape' && !recOv.classList.contains('hide')) { recToggle(false); return; }
  if ((e.key === 'l' || e.key === 'L' || e.key === 'д') && state.started) { recToggle(recOv.classList.contains('hide')); return; }
  if (!recOv.classList.contains('hide')) return;
  if (e.key === 'Pause' || (DEBUG_MODE && e.key === '`')) { if (!e.repeat) toggleDbg(); return; }
  if (state.debug) return; // 디버그 패널 열린 동안 게임 단축키 막음
  if (!state.started) return;
  const k = e.key.toLowerCase();
  if (k === 'f' || k === 'а') { if (!e.repeat) firePress(); }
  else if (k === 's' || k === 'ы') humanAct('spin');
  else if (k === 'd' || k === 'в') humanAct('pass');
  else if (k === 'r' || k === 'к') humanAct('raise');
  else if (k === 'b' || k === 'и') { if (betBtn.classList.contains('on') && !betBtn.classList.contains('placed')) betBtn.click(); } // 사이드 베팅
  else if (k === 'm') toggleMusic();
});

