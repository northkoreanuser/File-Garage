// ══════════════════ 실린더 ══════════════════
function buildCylinder() { // 2D 실린더 그림은 삭제 — 약실 상태(클래스)와 회전각만 담는 보이지 않는 노드. 3D가 매 프레임 읽는다.
  const N = state.N; let ch = '';
  for (let i = 0; i < N; i++) ch += `<g class="ch" id="ch${i}"></g>`;
  cylRot.innerHTML = `<svg viewBox="-130 -130 260 260">${ch}</svg>`;
  state.rot = 0; cylRot.style.transition = 'none'; cylRot.style.transform = 'rotate(0deg)';
}
const chEl = i => document.getElementById('ch' + i);
const STEP = () => 360 / state.N;
function rotateTo(idx, extra = 0, dur = 0, ease = 'cubic-bezier(.2,.8,.25,1)') {
  const st = STEP(), target = -idx * st, delta = (((state.rot - target) % 360) + 360) % 360;
  state.rot = state.rot - delta - 360 * extra;
  cylRot.style.transition = dur ? `transform ${dur}ms ${ease}` : 'none';
  cylRot.style.transform = `rotate(${state.rot}deg)`;
}
const topIdx = () => ((Math.round(-state.rot / STEP()) % state.N) + state.N) % state.N;
const phys = s => (state.c0 + s - 1) % state.N;           // 격발 번호 s → 물리 약실
const startIdx = () => (state.c0 - 1 + state.N) % state.N; // 첫 격발 직전 맨 위 약실
// 실린더는 원형: 위치 t의 약실 = ((t-1) % N) + 1 — 마지막 칸 다음은 다시 1번.
// fired = 쏴서 비어있음이 확인된 약실, live = 실탄 약실. 건너뛴 약실은 그대로 미지수로 남는다.
const chAt = t => ((t - 1) % state.N) + 1;
const nextCh = () => chAt(state.shot + 1);
const unknownCount = () => state.N - state.fired.size;
function remLive() { return state.live.size; }
// 사망 확률 (관측자 기준, 수학적으로): 쏴서 비었다고 확인된 칸만 '아는 칸'이다. 플릭샷으로 넘긴 칸은 아무도 안을 못 봤으니 여전히 '모르는 칸'.
// 탄은 모르는 칸들에 고르게 있을 수 있으므로 다음 칸 확률 = 남은 탄 ÷ 모르는 칸 수. 플릭이 없으면 기존(남은 탄 ÷ 남은 칸)과 같다.
// 예) 6연발 탄 2발, 2번을 넘기고 3·4번 빈칸 → 5번 차례: 2 ÷ (2·5·6) = 67%.  100%는 정말 확실할 때만 나온다.
function risk() { if (state.N - state.shot <= 0) return 1; const U = state.N - state.fired.size; return U > 0 ? Math.min(1, state.live.size / U) : 1; }
const HIGH = 2 / 3 - 1e-9; // '사망 확률 최상' 기준 (플릭 도박·기적 판정)
function shownRisk() { return risk(); } // 화면 표시도 같은 계산값
function trueRisk() { const q = nextCh(); return state.live.has(q) ? 1 : 0; } // 디버그용 (다음 칸의 실제 탄 여부)
function paintChambers() {
  const fired = new Set([...state.fired].map(phys));
  const lp = new Set([...state.live].map(phys)), sk = new Set((state.flickSkips || []).filter(x => x.q).map(x => phys(x.q)));
  for (let i = 0; i < state.N; i++) { const e = chEl(i); if (!e) continue; e.classList.toggle('spent', fired.has(i)); e.classList.toggle('dbg', state.debug && lp.has(i) && !fired.has(i)); e.classList.toggle('skipped', sk.has(i)); }
}
function randomLive(b) { // b발을 무작위 격발 번호에 배치
  const arr = []; for (let s = 1; s <= state.N; s++) arr.push(s);
  for (let i = arr.length - 1; i > 0; i--) { const j = rand(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  state.live = new Set(arr.slice(0, b));
}

