/* ============ 커스텀 확인/입력 대화상자 (브라우저 기본 alert/confirm/prompt 대신) ============
   사용자 지시: 파일 삭제 등의 확인창은 브라우저 자체 알림이 아니라 이 앱의 다른 창들처럼
   CSS로 만든 대화상자로 띄운다. showConfirmDialog는 Promise<boolean>, showPromptDialog는
   Promise<string|null>을 반환한다(취소/배경 클릭/Esc = false 또는 null). ============ */
function showConfirmDialog(message, opts = {}) {
  return new Promise(resolve => {
    // 대화상자를 열기 전 포커스가 있던 요소(탐색기 내용창/트리/바탕화면 등)를 기억해뒀다가,
    // 닫힐 때(확인/취소/Esc/배경 클릭 어느 경로든) 그대로 돌려준다. 이걸 안 하면 대화상자가
    // overlay.remove()로 사라진 뒤 포커스가 document.body로 떨어져서, 예를 들어 F2로 이름
    // 변경하다 Esc로 취소했을 때 창에 포커스가 안 돌아와 방향키가 먹통이 되는 버그가 생긴다.
    const previouslyFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-panel">
        <div class="confirm-message"></div>
        <div class="confirm-buttons">
          <button class="settings-button settings-button-neutral confirm-cancel"></button>
          <button class="settings-button confirm-ok"></button>
        </div>
      </div>`;
    overlay.querySelector(".confirm-message").textContent = message;
    overlay.querySelector(".confirm-cancel").textContent = opts.cancelLabel || "취소";
    overlay.querySelector(".confirm-ok").textContent = opts.okLabel || "확인";
    document.body.appendChild(overlay);
    let done = false;
    const cleanup = (result) => {
      if (done) return;
      done = true;
      overlay.remove();
      document.removeEventListener("keydown", onKey, true);
      if (previouslyFocused && document.body.contains(previouslyFocused) && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
      resolve(result);
    };
    overlay.querySelector(".confirm-cancel").onclick = () => cleanup(false);
    overlay.querySelector(".confirm-ok").onclick = () => cleanup(true);
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) cleanup(false); });
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cleanup(false); }
      else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); cleanup(true); }
    }
    document.addEventListener("keydown", onKey, true);
    overlay.querySelector(".confirm-ok").focus();
  });
}
function showPromptDialog(message, defaultValue = "") {
  return new Promise(resolve => {
    // showConfirmDialog와 동일한 이유로, 열기 전 포커스를 기억해뒀다가 닫힐 때 돌려준다
    // (F2 이름 변경 -> Esc 취소 후 방향키가 안 먹는 버그의 원인이었다).
    const previouslyFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-panel">
        <div class="confirm-message"></div>
        <input type="text" class="confirm-input" spellcheck="false">
        <div class="confirm-buttons">
          <button class="settings-button settings-button-neutral confirm-cancel">취소</button>
          <button class="settings-button confirm-ok">확인</button>
        </div>
      </div>`;
    overlay.querySelector(".confirm-message").textContent = message;
    const input = overlay.querySelector(".confirm-input");
    input.value = defaultValue;
    document.body.appendChild(overlay);
    let done = false;
    const cleanup = (result) => {
      if (done) return;
      done = true;
      overlay.remove();
      if (previouslyFocused && document.body.contains(previouslyFocused) && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
      resolve(result);
    };
    overlay.querySelector(".confirm-cancel").onclick = () => cleanup(null);
    overlay.querySelector(".confirm-ok").onclick = () => cleanup(input.value);
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) cleanup(null); });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation(); // 전역 백스페이스=뒤로가기 핸들러 등이 이 입력창의 타이핑을 가로채지 않게 함
      if (e.key === "Enter") { e.preventDefault(); cleanup(input.value); }
      else if (e.key === "Escape") { e.preventDefault(); cleanup(null); }
    });
    requestAnimationFrame(() => {
      input.focus();
      // 실제 윈도우 탐색기의 이름 변경처럼, 확장자가 있으면 확장자는 빼고 파일명(기본 이름)
      // 부분만 선택된 채로 시작한다(사용자 지시) - 폴더처럼 확장자가 없으면 전체를 선택한다.
      const { base, ext } = dfsSplitExt(defaultValue);
      if (ext) input.setSelectionRange(0, base.length);
      else input.select();
    });
  });
}

/* ============ 토스트(알림) ============ */
function showToast(message, opts = {}) {
  clearTimeout(toastTimer);
  els.toast.innerHTML = "";
  const msgEl = document.createElement("div");
  msgEl.className = "toast-msg";
  msgEl.textContent = message;
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => els.toast.classList.remove("show");
  els.toast.appendChild(msgEl);
  els.toast.appendChild(closeBtn);
  els.toast.className = "toast show" + (opts.kind === "warn" ? " warn" : "");
  // 중요한 알림(opts.sticky)도 화면에 영원히 남지는 않게 한다 - 그냥 읽을 시간을 더 준다(6초).
  // 더 일찍 닫고 싶으면 닫기(✕) 버튼으로 언제든 닫을 수 있다.
  const duration = opts.sticky ? 6000 : 2500;
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), duration);
}

