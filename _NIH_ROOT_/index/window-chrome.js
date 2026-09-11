/* ============ 창 조작 (최소화/최대화/닫기) ============
   - 최소화: 닫기처럼 창이 사라지지만, 작업표시줄 아이콘의 활성 표시는 그대로 유지된다(실제 윈도우처럼).
   - 닫기: 창이 사라지고 작업표시줄 아이콘의 활성 표시도 꺼진다.
   - 닫은 뒤 작업표시줄에서 다시 열면(최소화 상태에서 복구하는 것과 달리) 최상위 경로 + 트리 완전히 접힌
     상태로 초기화된다(실제 윈도우 탐색기도 창을 닫았다 새로 열면 이전 상태를 기억하지 않는다).
================================================================== */
els.btnMin.onclick = () => els.win.classList.add("minimized");
// 드래그로 옮긴 위치(position:fixed의 left/top 인라인 스타일)는 최대화하면 잠깐 지워야
// (.maximized 클래스의 top:0/left:0을 인라인 스타일이 덮어써버리면 꽉 채워지지 않음) 온전히 꽉 찬다.
// 최대화를 풀면 그 위치를 되돌려서 이어서 옮긴 자리에 복귀한다(실제 창처럼).
let lastDragPos = null; // { left, top } - 최대화 직전에 드래그로 옮겨져 있었으면 그 좌표를 기억
function toggleMaximize() {
  const willMaximize = !els.win.classList.contains("maximized");
  if (willMaximize) {
    if (els.win.classList.contains("positioned")) {
      lastDragPos = { left: els.win.style.left, top: els.win.style.top };
      els.win.style.left = "";
      els.win.style.top = "";
    }
    els.win.classList.add("maximized");
  } else {
    els.win.classList.remove("maximized");
    if (lastDragPos) {
      els.win.style.left = lastDragPos.left;
      els.win.style.top = lastDragPos.top;
      lastDragPos = null;
    }
  }
  els.btnMax.innerHTML = els.win.classList.contains("maximized") ? "&#x2752;" : "&#x25A1;";
}
els.btnMax.onclick = toggleMaximize;
els.titlebar.addEventListener("dblclick", toggleMaximize);

/* ============ 창 이동(드래그) - 최대화 상태가 아닐 때만, 타이틀바를 눌러서 옮긴다 ============ */
(function setupWindowDrag() {
  let dragging = false, startX = 0, startY = 0, winStartLeft = 0, winStartTop = 0;
  els.titlebar.addEventListener("mousedown", (e) => {
    if (els.win.classList.contains("maximized")) return; // 최대화 상태에서는 이동하지 않음
    if (e.target.closest(".tb-btn")) return; // 최소화/최대화/닫기 버튼 클릭은 드래그가 아님
    dragging = true;
    const rect = els.win.getBoundingClientRect();
    if (!els.win.classList.contains("positioned")) {
      // 처음 드래그하는 순간, 지금 화면에 보이는 위치를 그대로 고정 좌표로 바꿔서 이어서 움직이게 한다
      // (그전까지는 desktop의 flex 중앙 정렬로 위치가 잡혀 있었음).
      els.win.classList.add("positioned");
    }
    winStartLeft = rect.left;
    winStartTop = rect.top;
    els.win.style.left = winStartLeft + "px";
    els.win.style.top = winStartTop + "px";
    startX = e.clientX;
    startY = e.clientY;
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const rect = els.win.getBoundingClientRect();
    const minVisible = 80; // 화면 밖으로 완전히 사라지지 않게 최소한은 보이게 남겨둔다
    let newLeft = winStartLeft + dx;
    let newTop = winStartTop + dy;
    newLeft = Math.max(-(rect.width - minVisible), Math.min(newLeft, window.innerWidth - minVisible));
    // 세로는 타이틀바(40px)가 작업표시줄(48px, 뷰포트 하단에 고정) 위로 항상 완전히 남아있게 막는다 -
    // 이전엔 window.innerHeight - 40까지 내려갈 수 있어서 타이틀바 전체가 작업표시줄 뒤로 숨어버려
    // 창을 다시 끌어올릴 수단이 없어지는(=창을 못 쓰게 되는) 문제가 있었다.
    const TASKBAR_H = 48, TITLEBAR_H = 40;
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - TASKBAR_H - TITLEBAR_H));
    els.win.style.left = newLeft + "px";
    els.win.style.top = newTop + "px";
  });
  window.addEventListener("mouseup", () => { dragging = false; });
})();

/* ============ 창 크기 조절(리사이즈) - 실제 윈도우처럼 가장자리/모서리를 끌어서 크기를 바꾼다 ============ */
(function setupWindowResize() {
  const MIN_W = 480, MIN_H = 320;
  const TASKBAR_H = 48;
  [
    ["rz-n", "n"], ["rz-s", "s"], ["rz-e", "e"], ["rz-w", "w"],
    ["rz-ne", "ne"], ["rz-nw", "nw"], ["rz-se", "se"], ["rz-sw", "sw"],
  ].forEach(([cls, dir]) => {
    const handle = els.win.querySelector("." + cls);
    if (!handle) return;
    handle.addEventListener("mousedown", (e) => {
      if (els.win.classList.contains("maximized")) return;
      e.preventDefault();
      e.stopPropagation(); // 타이틀바 드래그(이동)과 겹치지 않게

      const rect = els.win.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY;
      const startW = rect.width, startH = rect.height, startLeft = rect.left, startTop = rect.top;
      if (!els.win.classList.contains("positioned")) {
        // 드래그로 옮긴 적이 없어 아직 desktop의 flex 중앙 정렬로 잡혀 있던 상태라면, 지금 위치를
        // 고정 좌표로 못박아야 한쪽 가장자리를 고정한 채 반대쪽만 늘이고 줄일 수 있다.
        els.win.classList.add("positioned");
      }
      els.win.classList.add("resizing");
      els.win.style.left = startLeft + "px";
      els.win.style.top = startTop + "px";

      const maxW = window.innerWidth;
      const maxH = window.innerHeight - TASKBAR_H;

      function onMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let newW = startW, newH = startH, newLeft = startLeft, newTop = startTop;
        if (dir.includes("e")) newW = Math.max(MIN_W, Math.min(startW + dx, maxW));
        if (dir.includes("s")) newH = Math.max(MIN_H, Math.min(startH + dy, maxH));
        if (dir.includes("w")) {
          newW = Math.max(MIN_W, Math.min(startW - dx, maxW));
          newLeft = startLeft + (startW - newW);
        }
        if (dir.includes("n")) {
          newH = Math.max(MIN_H, Math.min(startH - dy, maxH));
          newTop = startTop + (startH - newH);
        }
        els.win.style.width = newW + "px";
        els.win.style.height = newH + "px";
        els.win.style.left = newLeft + "px";
        els.win.style.top = newTop + "px";
      }
      function onUp() {
        els.win.classList.remove("resizing");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });
})();

els.btnClose.onclick = () => {
  els.win.classList.add("closed");
  els.taskbarApp.classList.remove("active");
  // 실제 윈도우 탐색기처럼, 창을 닫으면 주소창 플래그먼트와 "마지막 위치 기억"이 함께 사라져야
  // 다음에 다시 열었을 때(또는 GitHub Pages 링크로 새로 들어왔을 때) 완전히 처음 상태(탐색창 닫힘 +
  // 루트 경로)로 돌아간다. 새로고침 시의 복원 기능(탭을 유지한 채 F5)과는 다른 동작이다. "창을
  // 닫아뒀었다"는 사실 자체도 기억해서(persistWindowOpen(false)), 다음 로드 때 아예 창을
  // 띄우지 않는다(사용자 지시 - "진짜 윈도우 바이브").
  closeNavPane();
  clearHashFragment();
  try { localStorage.removeItem(lastPathKey()); } catch (e) {}
  try { localStorage.removeItem(expandedStorageKey()); } catch (e) {}
  persistWindowOpen(false);
};
els.taskbarApp.onclick = () => {
  const wasClosed = els.win.classList.contains("closed");
  els.win.classList.remove("closed", "minimized");
  els.taskbarApp.classList.add("active");
  persistWindowOpen(true);
  if (wasClosed) {
    expanded.clear();
    navigate([]);
  }
};
/* 바탕화면(가상 파일시스템)에서 폴더를 열 때도 더는 별도의 팝업 창이 아니라 이 "진짜" 탐색기
   창(#win) 하나로 통합해서 보여준다(탐색기 통합 - 사용자 지시). 창이 닫혀있었으면 taskbarApp을
   누른 것과 똑같이 다시 열어준다. */
function openRealExplorerAt(path) {
  const wasClosed = els.win.classList.contains("closed");
  els.win.classList.remove("closed", "minimized");
  els.taskbarApp.classList.add("active");
  persistWindowOpen(true);
  if (wasClosed) expanded.clear();
  navigate(path);
  openNavPane();
}
els.btnNavToggle.onclick = () => { if (isNavPaneOpen()) closeNavPane(); else openNavPane(); };

/* ============ 로컬 스토리지 (폴더 캐시 + 마지막 경로 기억) ============
   - 폴더 하나를 읽을 때마다 로컬 스토리지에 계속 쌓인다 (무한 누적).
   - 새로고침 버튼을 누르면 "그 폴더"만 캐시를 비우고 다시 읽는다.
================================================================== */
function cacheKey(pathArr) { return `idx:${repoName}:dir:${pathArr.join("/")}`; }
function lastPathKey() { return `idx:${repoName}:lastpath`; }
/* 탐색기 창을 "켠 채로" 뒀는지(=닫지 않고 새로고침/재방문했는지) 기억한다(사용자 지시). 진짜
   윈도우처럼 최초 방문이나 명시적으로 닫은 뒤에는 창을 자동으로 띄우지 않고, 켜둔 채로 새로고침한
   경우에만 편의상 열린 상태 그대로(+ 위치/트리 펼침) 복원한다. */
function windowOpenKey() { return `idx:${repoName}:winopen`; }
function persistWindowOpen(isOpen) {
  try {
    if (isOpen) localStorage.setItem(windowOpenKey(), "1");
    else localStorage.removeItem(windowOpenKey());
  } catch (e) {}
}
function wasWindowOpenLastTime() {
  try { return localStorage.getItem(windowOpenKey()) === "1"; } catch (e) { return false; }
}
function readCache(pathArr) {
  try {
    const raw = localStorage.getItem(cacheKey(pathArr));
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function writeCache(pathArr, entry) {
  try { localStorage.setItem(cacheKey(pathArr), JSON.stringify(entry)); } catch (e) { /* 용량 초과 등은 무시 */ }
}
function clearCache(pathArr) {
  try { localStorage.removeItem(cacheKey(pathArr)); } catch (e) {}
  dirCache.delete(pathArr.join("/"));
}

