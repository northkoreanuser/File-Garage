/* ============================================================================
   게임패드 조작
   ----------------------------------------------------------------------------
   이 앱은 전부 마우스/키보드 이벤트 기준으로 짜여 있으므로(touch-input.js와 같은 생각), 게임패드도
   "가짜 마우스 커서 + 가짜 키보드"로 번역해서 보낸다. 그래서 창 이동/크기 조절, 아이콘 드래그,
   우클릭 메뉴, 시작 메뉴, 설정, 에디터 등 마우스로 되는 것은 전부 그대로 된다.

     왼쪽 스틱   커서 이동            오른쪽 스틱  커서 아래 영역 스크롤
     A           클릭 (누른 채 이동 = 드래그, 빠르게 두 번 = 더블클릭)
     X           우클릭 메뉴          B            취소 / 닫기 (Esc)
     Y           화면 키보드          십자키       방향키
     LB / RB     뒤로 / 앞으로        RT           Enter
     LT (누르고) 느린 커서 + Ctrl (LT + A = 여러 개 선택)
     Start       시작 메뉴            Back(Select) 조작 안내

   화면 키보드가 열려 있을 때: 십자키 = 키 사이 이동, X = 지우기, LB = 한/영, RB = Shift.
   마우스로는 안 되고 따로 처리한 것: <select>(직접 목록을 띄움), 슬라이더(A로 잡고 끌기),
   영상/음악(A = 재생/정지, 십자키 좌우 = 5초 이동, 상하 = 음량), HTML5 드래그 앤 드롭(직접 흉내).

   연결되면 우하단 토스트로 알리고, 작업표시줄 오른쪽에 🎮 표시가 생긴다(누르면 조작 안내).
   가짜 가로 모드(fake-rotate.js)에서도 좌표가 전부 논리 좌표로 감싸져 있어 그대로 동작한다.

   브라우저 한계: 게임패드 입력은 "사용자 동작"으로 인정되지 않아서 파일 선택 창, 전체화면 진입,
   팝업/새 탭 열기, 클립보드 쓰기는 브라우저가 막을 수 있다(사이트에 팝업을 허용해두면 새 탭은 열린다).
================================================================================= */
(function () {
  "use strict";
  const HAS_PAD = !!navigator.getGamepads;

  const DEAD = 0.2;          // 스틱 데드존
  const CUR_SPEED = 1150;    // 커서 최고 속도(px/초)
  const SCROLL_SPEED = 1500; // 스크롤 최고 속도(px/초)
  const DBL_MS = 400, DBL_PX = 10, DRAG_PX = 8;
  const REP_FIRST = 380, REP_NEXT = 95; // 십자키 반복 입력(ms)
  const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const TEXT_TYPES = { "": 1, text: 1, search: 1, url: 1, tel: 1, password: 1, email: 1, number: 1 };

  let padIndex = null, raf = 0, lastT = 0, prev = [];
  let active = false;        // 지금 게임패드로 조작 중인지(진짜 마우스/터치를 쓰면 꺼진다)
  let cx = -1, cy = -1;      // 커서 위치(논리 좌표)
  let held = false, slow = false;
  let hoverEl = null, downEl = null, downX = 0, downY = 0;
  let lastClickT = 0, lastClickX = 0, lastClickY = 0;
  let rangeEl = null;
  let dragSrc = null, dragTried = false, dragging = false, dragDt = null, dragOver = null, dragOk = false;
  let repKey = null, repAt = 0;
  let realMove = 0;

  /* ---------------- 화면 요소 ---------------- */
  const CURSOR_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="30" viewBox="0 0 28 30">' +
    '<polygon points="3,2 3,26 9,20.5 13.5,28.5 17.5,26.3 13.2,18.5 21,18.5" fill="#000" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<polygon points="5,6 5,21 9.2,17 13.5,24.7 15.3,23.7 11.2,16.2 17,16.2" fill="#ffd54a"/></svg>');
  const css =
    '#gpCursor { position: fixed; left: -3px; top: -2px; width: 28px; height: 30px; z-index: 2147483647; pointer-events: none; display: none;' +
    ' background: url("' + CURSOR_SVG + '") no-repeat; filter: drop-shadow(1px 1.5px 1.5px rgba(0,0,0,.5)); }\n' +
    '#gpCursor.on { display: block; }\n' +
    // 패드로 조작하는 동안에는 진짜 마우스 커서를 숨긴다(마우스가 연결돼 있어도 커서는 하나만 보인다).
    'html.gp-active, html.gp-active * { cursor: none !important; }\n' +
    '#gpCursor.drag { filter: drop-shadow(0 0 5px #3a8fe0); opacity: .8; }\n' +
    '.gp-focus { background: rgba(90,160,220,.32) !important; box-shadow: inset 0 0 0 1px rgba(150,200,240,.9) !important; }\n' +
    '.gp-tray { display: none; align-items: center; padding: 0 6px; font-size: 15px; cursor: var(--cur-link, pointer); }\n' +
    '.gp-tray.on { display: flex; }\n' +
    '#gpOsk { position: fixed; left: 50%; bottom: 56px; transform: translateX(-50%); z-index: 2147483000; display: none; flex-direction: column; gap: 4px;' +
    ' width: min(640px, calc(100% - 16px)); padding: 8px; border-radius: 10px; background: rgba(20,30,42,.95); box-shadow: 0 10px 30px rgba(0,0,0,.5);' +
    ' user-select: none; -webkit-user-select: none; touch-action: none; }\n' +
    '#gpOsk.on { display: flex; }\n' +
    '.gp-prev { height: 24px; padding: 0 8px; border-radius: 6px; background: rgba(0,0,0,.35); color: #fff; font: 13px/24px "Segoe UI", "Malgun Gothic", "맑은 고딕", sans-serif;' +
    ' white-space: pre; overflow: hidden; text-align: center; }\n' +
    '.gp-prev.none { opacity: .6; }\n' +
    '.gp-row { display: flex; gap: 4px; justify-content: center; }\n' +
    '.gp-key { flex: 1 1 0; min-width: 0; height: 38px; padding: 0; border: 1px solid rgba(255,255,255,.16); border-radius: 6px; background: rgba(255,255,255,.1);' +
    ' color: #fff; font: 15px/1 "Segoe UI", "Malgun Gothic", "맑은 고딕", sans-serif; display: flex; align-items: center; justify-content: center; cursor: inherit; }\n' +
    '.gp-key.wide { flex: 1.7 1 0; font-size: 12.5px; }\n' +
    '.gp-key.space { flex: 4 1 0; }\n' +
    '.gp-key.lock { background: rgba(90,170,255,.35); }\n' +
    '.gp-key.hot { background: rgba(90,170,255,.65); border-color: #9cd0ff; }\n' +
    '#gpHelp { position: fixed; inset: 0; z-index: 2147483100; display: none; align-items: center; justify-content: center; background: rgba(0,10,25,.4); }\n' +
    '#gpHelp.on { display: flex; }\n' +
    '.gp-help-panel { width: min(520px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow: auto; padding: 14px 16px; border-radius: 10px;' +
    ' background: rgba(20,30,42,.96); color: #eaf3fb; font: 13px/1.5 "Segoe UI", "Malgun Gothic", "맑은 고딕", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.5); }\n' +
    '.gp-help-panel h3 { margin: 0 0 8px; font-size: 15px; }\n' +
    '.gp-help-grid { display: grid; grid-template-columns: auto 1fr; gap: 3px 14px; }\n' +
    '.gp-help-grid b { color: #ffd54a; font-weight: 600; white-space: nowrap; }\n' +
    '.gp-help-note { margin-top: 10px; opacity: .75; font-size: 12px; }';
  const styleEl = document.createElement("style");
  styleEl.id = "gp-css";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const cursorEl = document.createElement("div");
  cursorEl.id = "gpCursor";
  document.body.appendChild(cursorEl);

  const trayEl = document.createElement("div");
  trayEl.className = "gp-tray";
  trayEl.textContent = "🎮";
  trayEl.title = "게임패드 연결됨 - 누르면 조작 안내";
  trayEl.onclick = () => toggleHelp();
  const trayRight = document.querySelector(".tray-right");
  if (trayRight) trayRight.insertBefore(trayEl, trayRight.firstChild);

  const helpEl = document.createElement("div");
  helpEl.id = "gpHelp";
  helpEl.innerHTML =
    '<div class="gp-help-panel"><h3>🎮 게임패드 조작</h3><div class="gp-help-grid">' +
    [
      ["왼쪽 스틱", "커서 이동"],
      ["오른쪽 스틱", "커서 아래 영역 스크롤"],
      ["A", "클릭 · 누른 채 이동하면 드래그 · 빠르게 두 번 = 더블클릭(열기)"],
      ["X", "우클릭 메뉴"],
      ["B", "취소 / 닫기 (Esc)"],
      ["Y", "화면 키보드 열기 / 닫기 (입력창에 있을 때)"],
      ["십자키", "방향키 (선택 이동, 메뉴 이동)"],
      ["LB / RB", "뒤로 / 앞으로"],
      ["RT", "Enter"],
      ["LT (누르고)", "느린 커서 · LT + A = Ctrl+클릭(여러 개 선택)"],
      ["Start", "시작 메뉴 (열려 있는 동안 십자키 = 항목 이동, 좌우 = 하위 메뉴, RT/A = 실행)"],
      ["Back (Select)", "이 안내 열기 / 닫기"]
    ].map((r) => "<b>" + r[0] + "</b><span>" + r[1] + "</span>").join("") +
    '</div><div class="gp-help-note">화면 키보드가 열려 있을 때: 십자키 = 키 사이 이동 · X = 지우기 · LB = 한/영 · RB = Shift<br>' +
    '영상/음악 위에서: A = 재생/정지 · 십자키 좌우 = 5초 이동 · 상하 = 음량<br>' +
    '파일 선택 창, 전체화면, 새 탭 열기는 브라우저가 게임패드 입력을 사용자 동작으로 인정하지 않아 막힐 수 있습니다.</div></div>';
  helpEl.addEventListener("click", () => toggleHelp(false));
  document.body.appendChild(helpEl);
  function toggleHelp(on) {
    helpEl.classList.toggle("on", on === undefined ? !helpEl.classList.contains("on") : on);
  }

  /* ---------------- 가짜 마우스 ---------------- */
  function under() {
    return document.elementFromPoint(cx, cy) || document.body;
  }
  function fire(type, target, o) {
    const ev = new MouseEvent(type, Object.assign({
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: cx, clientY: cy, screenX: cx, screenY: cy,
      button: 0, buttons: held ? 1 : 0, ctrlKey: slow && type !== "mousemove"
    }, o));
    (target || document).dispatchEvent(ev);
    return ev;
  }
  function setHover(t) {
    if (t === hoverEl) return;
    const old = hoverEl && hoverEl.isConnected ? hoverEl : null;
    hoverEl = t;
    document.querySelectorAll(".gp-key.hot").forEach((k) => k.classList.remove("hot"));
    if (old) {
      fire("mouseout", old, { relatedTarget: t });
      for (let n = old; n && n.nodeType === 1 && !(t && n.contains(t)); n = n.parentNode) fire("mouseleave", n, { bubbles: false, relatedTarget: t });
    }
    if (t) {
      fire("mouseover", t, { relatedTarget: old });
      const chain = [];
      for (let n = t; n && n.nodeType === 1 && !(old && n.contains(old)); n = n.parentNode) chain.push(n);
      chain.reverse().forEach((n) => fire("mouseenter", n, { bubbles: false, relatedTarget: old }));
      const k = t.closest && t.closest(".gp-key");
      if (k) k.classList.add("hot");
    }
  }
  function placeCursor() {
    cx = Math.max(0, Math.min(window.innerWidth - 1, cx));
    cy = Math.max(0, Math.min(window.innerHeight - 1, cy));
    cursorEl.style.transform = "translate(" + cx + "px," + cy + "px)";
  }
  function activate() {
    if (active) return;
    active = true;
    if (cx < 0) { cx = window.innerWidth / 2; cy = window.innerHeight / 2; }
    placeCursor();
    cursorEl.classList.add("on");
    document.documentElement.classList.add("gp-active");
    realMove = 0;
    if (isTextField(document.activeElement)) oskOpen();
  }
  function deactivate() {
    if (!active) return;
    if (held) releaseA();
    active = false;
    cursorEl.classList.remove("on");
    document.documentElement.classList.remove("gp-active");
    document.querySelectorAll(".gp-key.hot").forEach((k) => k.classList.remove("hot"));
    hoverEl = null;
  }
  // 진짜 마우스나 터치를 쓰기 시작하면 가짜 커서를 치운다(우리가 만든 이벤트는 isTrusted가 false다).
  // 마우스는 살짝 건드린 정도(떨림)로는 넘어가지 않고, 확실히 움직이거나 눌렀을 때만 넘어간다.
  window.addEventListener("mousemove", (e) => {
    if (!e.isTrusted || !active) return;
    realMove += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (realMove > 30) deactivate();
  }, true);
  window.addEventListener("mousedown", (e) => { if (e.isTrusted) deactivate(); }, true);
  window.addEventListener("touchstart", (e) => { if (e.isTrusted) deactivate(); }, true);

  function isTextField(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") return !!TEXT_TYPES[(el.getAttribute("type") || "").toLowerCase()];
    return !!el.isContentEditable;
  }
  function focusFor(t) {
    const f = t.closest && t.closest('input, textarea, select, button, a[href], [tabindex], [contenteditable=""], [contenteditable="true"]');
    if (f && !f.disabled) {
      if (document.activeElement !== f) f.focus({ preventScroll: true });
    } else if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }
  function setRange() {
    const r = rangeEl.getBoundingClientRect();
    const min = parseFloat(rangeEl.min) || 0, max = rangeEl.max === "" ? 100 : parseFloat(rangeEl.max);
    const step = rangeEl.step === "any" ? 0 : (parseFloat(rangeEl.step) || 1);
    let v = min + Math.max(0, Math.min(1, (cx - r.left) / Math.max(1, r.width))) * (max - min);
    if (step) v = min + Math.round((v - min) / step) * step;
    v = String(+v.toFixed(6));
    if (rangeEl.value !== v) {
      rangeEl.value = v;
      rangeEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function pressA() {
    const t = under();
    if (!(t.closest && t.closest("#gpOsk"))) oskCommit(); // 다른 곳을 누르면 입력 위치가 바뀔 수 있으니 한글 조합을 끝낸다
    held = true; downEl = t; downX = cx; downY = cy;
    dragSrc = t.closest ? t.closest('[draggable="true"]') : null;
    dragTried = false; dragging = false;
    rangeEl = (t.matches && t.matches('input[type="range"]') && !t.disabled) ? t : null;
    const md = fire("mousedown", t, { buttons: 1 });
    if (!md.defaultPrevented) focusFor(t);
    if (rangeEl) setRange();
  }
  function releaseA() {
    held = false;
    const t = under();
    if (dragging) { endDrag(); return; }
    if (rangeEl) {
      rangeEl.dispatchEvent(new Event("change", { bubbles: true }));
      rangeEl = null;
      fire("mouseup", t);
      return;
    }
    fire("mouseup", t);
    const d = downEl;
    downEl = null;
    if (!d || !d.isConnected) return;
    const ct = t === d ? t : (d.contains(t) ? d : (t.contains(d) ? t : null));
    if (!ct) return;
    const media = ct.closest && ct.closest("video, audio");
    const sel = ct.closest && ct.closest("select");
    fire("click", ct, { detail: 1 });
    if (media) { if (media.paused) { const p = media.play(); if (p && p.catch) p.catch(() => {}); } else media.pause(); }
    if (sel && !sel.disabled) openSelect(sel);
    const now = performance.now();
    if (now - lastClickT < DBL_MS && Math.hypot(cx - lastClickX, cy - lastClickY) < DBL_PX) {
      // 탐색기 목록은 클릭할 때마다 항목을 새로 그려서 방금 누른 요소가 이미 화면에서 빠져 있을 수 있다 -
      // 그래도 그 요소에 걸린 더블클릭 동작은 그대로 실행돼야 하므로 연결 여부를 따지지 않고 보낸다.
      fire("dblclick", ct, { detail: 2 });
      lastClickT = 0;
    } else { lastClickT = now; lastClickX = cx; lastClickY = cy; }
  }
  // <select>는 가짜 클릭으로는 목록이 열리지 않는다 - 앱의 우클릭 메뉴(showContextMenu)로 선택지를 띄운다.
  function openSelect(sel) {
    const items = Array.prototype.filter.call(sel.options, (o) => !o.disabled).map((o) => ({
      label: (o.selected ? "● " : "○ ") + o.textContent.trim(),
      action: () => {
        if (sel.value === o.value) return;
        sel.value = o.value;
        sel.dispatchEvent(new Event("input", { bubbles: true }));
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }));
    if (!items.length) return;
    if (typeof showContextMenu === "function") {
      const r = sel.getBoundingClientRect();
      showContextMenu(r.left, r.bottom, items);
    } else {
      items[(sel.selectedIndex + 1) % items.length].action();
    }
  }

  /* ---------------- HTML5 드래그 앤 드롭 흉내 ----------------
     draggable="true"인 항목(탐색기의 파일 등)은 마우스 이벤트만으로는 끌리지 않는다 - 브라우저가
     만드는 dragstart/dragover/drop을 같은 순서로 직접 만들어 보낸다. */
  function dragFire(type, target, o) {
    const ev = new DragEvent(type, Object.assign({
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: cx, clientY: cy, screenX: cx, screenY: cy, dataTransfer: dragDt
    }, o));
    (target || document).dispatchEvent(ev);
    return ev;
  }
  function tryStartDrag() {
    dragTried = true;
    if (!dragSrc || !dragSrc.isConnected || typeof DataTransfer !== "function" || typeof DragEvent !== "function") return;
    try { dragDt = new DataTransfer(); } catch (e) { return; }
    const ev = dragFire("dragstart", dragSrc);
    if (ev.defaultPrevented) { dragDt = null; return; }
    dragging = true; dragOver = null; dragOk = false;
    cursorEl.classList.add("drag");
  }
  function moveDrag() {
    const t = under();
    if (t !== dragOver) {
      if (dragOver && dragOver.isConnected) dragFire("dragleave", dragOver, { relatedTarget: t });
      dragFire("dragenter", t, { relatedTarget: dragOver });
      dragOver = t;
    }
    dragOk = dragFire("dragover", t).defaultPrevented;
  }
  function endDrag() {
    if (dragOver && dragOver.isConnected) dragFire(dragOk ? "drop" : "dragleave", dragOver);
    if (dragSrc) dragFire("dragend", dragSrc);
    dragging = false; dragSrc = null; dragOver = null; dragDt = null; downEl = null;
    cursorEl.classList.remove("drag");
  }

  /* ---------------- 가짜 키보드(키 이벤트) ---------------- */
  function sendKey(k, o) {
    const t = document.activeElement || document.body;
    const init = Object.assign({ key: k, code: k.length === 1 ? "" : k, bubbles: true, cancelable: true, composed: true, view: window }, o);
    const down = new KeyboardEvent("keydown", init);
    t.dispatchEvent(down);
    if (!down.defaultPrevented && !init.altKey && !init.ctrlKey) keyDefault(t, k);
    if (t.isConnected) t.dispatchEvent(new KeyboardEvent("keyup", init));
    return down;
  }
  // 진짜 키 입력이 아니라서 브라우저가 기본 동작을 해주지 않는다 - 꼭 필요한 것만 직접 해준다.
  function keyDefault(t, k) {
    if (!t.isConnected) return;
    if (isTextField(t)) {
      if (k === "Backspace") deleteBack(t);
      else if (k === "Enter" && t.tagName === "TEXTAREA") insertText(t, "\n", 0);
      else if (k === "ArrowLeft" || k === "ArrowRight") moveCaret(t, k === "ArrowLeft" ? -1 : 1);
    } else if (k === "Enter" && (t.tagName === "BUTTON" || (t.tagName === "A" && t.href))) {
      t.click();
    }
  }
  function insertText(el, text, replaceN) {
    if (el.isContentEditable) {
      for (let i = 0; i < replaceN; i++) document.execCommand("delete");
      if (text) document.execCommand("insertText", false, text);
      return;
    }
    try {
      const s = el.selectionStart, e = el.selectionEnd;
      if (s == null) throw new Error("no selection");
      el.setRangeText(text, Math.max(0, s - replaceN), e, "end");
    } catch (err) {
      el.value = el.value.slice(0, Math.max(0, el.value.length - replaceN)) + text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function deleteBack(el) {
    if (el.isContentEditable) { document.execCommand("delete"); return; }
    try {
      const s = el.selectionStart, e = el.selectionEnd;
      if (s == null) throw new Error("no selection");
      if (s !== e) el.setRangeText("", s, e, "end");
      else if (s > 0) el.setRangeText("", s - 1, s, "end");
      else return;
    } catch (err) {
      if (!el.value) return;
      el.value = el.value.slice(0, -1);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function moveCaret(el, d) {
    try {
      const s = el.selectionStart, e = el.selectionEnd;
      if (s == null) return;
      const p = s !== e ? (d < 0 ? s : e) : Math.max(0, Math.min(el.value.length, s + d));
      el.setSelectionRange(p, p);
    } catch (err) {}
  }

  /* ---------------- 화면 키보드 (영문 / 한글 두벌식 / 기호) ---------------- */
  const LAYOUT = {
    en: ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"],
    EN: ["!@#$%^&*()", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"],
    ko: ["1234567890", "ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ", "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ", "ㅋㅌㅊㅍㅠㅜㅡ"],
    KO: ["!@#$%^&*()", "ㅃㅉㄸㄲㅆㅛㅕㅑㅒㅖ", "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ", "ㅋㅌㅊㅍㅠㅜㅡ"],
    sym: ["1234567890", "-_=+[]{}\\|", ";:'\",.<>/?", "`~!@#$%^&*"]
  };
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
  const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const VCOMB = { "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ", "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ", "ㅡㅣ": "ㅢ" };
  const JCOMB = { "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ", "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ", "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ" };

  let oskOn = false, oskLang = "en", oskShift = false, oskSym = false;
  let hUndo = null; // 받침이 다음 글자 첫소리로 넘어갔을 때(난 + ㅜ = 나누) 지우면 되돌리기 위한 기억(나누 - ㅜ = 난)
  let H = { cho: "", jung: [], jong: [] }, composing = false; // 지금 조합 중인 한글 한 글자(입력창의 커서 바로 앞 글자)
  const oskEl = document.createElement("div");
  oskEl.id = "gpOsk";
  document.body.appendChild(oskEl);
  // 키를 눌러도 입력창의 포커스가 넘어오지 않게 한다(마우스/터치로 눌러도 마찬가지).
  oskEl.addEventListener("mousedown", (e) => e.preventDefault());
  oskEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const k = e.target.closest && e.target.closest(".gp-key");
    if (k) oskPress(k.dataset.act || "char", k.dataset.ch || "");
  });

  function oskRender() {
    const rows = oskSym ? LAYOUT.sym : LAYOUT[oskShift ? oskLang.toUpperCase() : oskLang];
    oskEl.innerHTML = "";
    // 키보드가 입력창을 가릴 수 있어서(특히 낮은 가로 화면) 지금 입력 중인 내용을 맨 위에 같이 보여준다.
    const pv = document.createElement("div");
    pv.className = "gp-prev";
    oskEl.appendChild(pv);
    oskPrevText = null;
    const addRow = () => { const r = document.createElement("div"); r.className = "gp-row"; oskEl.appendChild(r); return r; };
    const addKey = (row, label, act, ch, cls) => {
      const b = document.createElement("button");
      b.type = "button"; b.tabIndex = -1;
      b.className = "gp-key" + (cls ? " " + cls : "");
      b.textContent = label;
      if (act) b.dataset.act = act;
      if (ch) b.dataset.ch = ch;
      row.appendChild(b);
    };
    oskPreview();
    rows.forEach((line) => { const r = addRow(); Array.from(line).forEach((ch) => addKey(r, ch, "", ch)); });
    const r = addRow();
    addKey(r, "Shift", "shift", "", "wide" + (oskShift ? " lock" : ""));
    addKey(r, oskLang === "ko" ? "한" : "A", "lang", "", "wide");
    addKey(r, oskSym ? "문자" : "기호", "sym", "", "wide" + (oskSym ? " lock" : ""));
    addKey(r, "␣", "space", "", "space");
    addKey(r, "⌫", "back", "", "wide");
    addKey(r, "◀", "left", "");
    addKey(r, "▶", "right", "");
    addKey(r, "Enter", "enter", "", "wide");
    addKey(r, "✕", "close", "");
    hoverEl = null; // 키가 새로 만들어졌으니 다음 프레임에 강조를 다시 잡는다
  }
  let oskPrevText = null;
  function oskPreview() {
    const el = oskTarget(), pv = oskEl.firstChild;
    if (!pv) return;
    let txt;
    if (!el) txt = "입력할 곳을 먼저 A로 누르세요";
    else {
      let v = el.isContentEditable ? el.textContent : el.value, pos = v.length;
      if (el.type === "password") v = v.replace(/[^]/g, "•");
      try { if (!el.isContentEditable && el.selectionStart != null) pos = el.selectionStart; } catch (e) {}
      txt = (v.slice(Math.max(0, pos - 40), pos) + "│" + v.slice(pos, pos + 20)).replace(/\n/g, "⏎");
    }
    if (txt === oskPrevText) return;
    oskPrevText = txt;
    pv.textContent = txt;
    pv.classList.toggle("none", !el);
  }
  /* 화면 키보드는 글자 입력창에 포커스가 있는 동안에만 떠 있고, 입력창을 벗어나면 바로 닫힌다.
     설정 "가상 키보드 기본 사용"(기본 켬): 키보드/패드/터치 무엇을 쓰든 입력창을 누르면 이 키보드가 뜨고,
     기기 자체의 화면 키보드는 inputmode="none"으로 막는다. 끄면 막지 않고, 패드로 조작할 때만 뜬다. */
  const LS_OSK = "nih:osk";
  function oskDefault() { try { return localStorage.getItem(LS_OSK) !== "off"; } catch (e) { return true; } }
  function fieldOf(t) {
    const f = t && t.closest ? t.closest("input, textarea, [contenteditable]") : null;
    return isTextField(f) ? f : null;
  }
  function guardField(el) {
    if (oskDefault()) {
      if (el.getAttribute("inputmode") !== "none") {
        el.dataset.gpIm = el.getAttribute("inputmode") || "";
        el.setAttribute("inputmode", "none");
      }
    } else if (el.dataset.gpIm !== undefined) {
      if (el.dataset.gpIm) el.setAttribute("inputmode", el.dataset.gpIm); else el.removeAttribute("inputmode");
      delete el.dataset.gpIm;
    }
  }
  // 포커스가 가기 전에(누르는 순간) 먼저 막아야 기기 키보드가 올라오지 않는다.
  ["touchstart", "mousedown"].forEach((type) => {
    document.addEventListener(type, (e) => { const f = fieldOf(e.target); if (f) guardField(f); }, true);
  });
  document.addEventListener("focusin", (e) => {
    const f = fieldOf(e.target);
    if (!f) return;
    guardField(f);
    oskCommit();
    if (oskDefault() || active) oskOpen();
  }, true);
  document.addEventListener("focusout", (e) => {
    if (fieldOf(e.relatedTarget)) oskCommit(); else oskClose();
  }, true);
  // 닫아둔 뒤 같은 입력창을 다시 누르면(포커스는 그대로라 focusin이 안 온다) 다시 띄운다.
  document.addEventListener("click", (e) => {
    const f = fieldOf(e.target);
    if (f && document.activeElement === f && (oskDefault() || active)) oskOpen();
    if (oskOn) oskPreview();
  }, true);
  document.addEventListener("input", () => { if (oskOn) oskPreview(); }, true);
  document.addEventListener("keyup", () => { if (oskOn) oskPreview(); }, true);
  // 진짜 키보드로 치기 시작하면 조합 중이던 한글 상태는 버린다(글자는 그대로 남는다).
  document.addEventListener("keydown", (e) => { if (e.isTrusted) oskCommit(); }, true);
  window.GpOsk = {
    enabled: oskDefault,
    setEnabled(on) {
      try { if (on) localStorage.removeItem(LS_OSK); else localStorage.setItem(LS_OSK, "off"); } catch (e) {}
      const f = fieldOf(document.activeElement);
      if (f) guardField(f);
      if (f && (on || active)) oskOpen(); else oskClose();
    }
  };
  function oskOpen() {
    if (oskOn) return;
    oskOn = true; oskShift = false;
    oskRender();
    oskEl.classList.add("on");
  }
  function oskClose() {
    if (!oskOn) return;
    oskCommit();
    oskOn = false;
    oskEl.classList.remove("on");
  }
  function oskCommit() { H = { cho: "", jung: [], jong: [] }; composing = false; hUndo = null; }
  function oskTarget() {
    const a = document.activeElement;
    return isTextField(a) ? a : null;
  }
  function hCompose() {
    const jung = H.jung.length === 2 ? VCOMB[H.jung.join("")] : (H.jung[0] || "");
    const jong = H.jong.length === 2 ? JCOMB[H.jong.join("")] : (H.jong[0] || "");
    if (H.cho && jung) return String.fromCharCode(0xAC00 + (CHO.indexOf(H.cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong));
    return H.cho || jung;
  }
  function hPut(el, replace) { insertText(el, hCompose(), replace ? 1 : 0); composing = true; }
  function hNew(el, st) { hUndo = null; H = Object.assign({ cho: "", jung: [], jong: [] }, st); hPut(el, false); }
  function hType(el, ch) {
    if (JUNG.indexOf(ch) < 0) { // 자음
      if (H.cho && H.jung.length && !H.jong.length && JONG.indexOf(ch) > 0) { H.jong = [ch]; hPut(el, composing); }
      else if (H.jong.length === 1 && JCOMB[H.jong[0] + ch]) { H.jong.push(ch); hPut(el, composing); }
      else if (!H.cho && !H.jung.length) { H.cho = ch; hPut(el, false); }
      else hNew(el, { cho: ch });
    } else { // 모음
      if (H.jong.length) { // 받침이 다음 글자의 첫소리로 넘어간다 (간 + ㅏ -> 가나)
        const c = H.jong.pop();
        hPut(el, composing);
        const before = { cho: H.cho, jung: H.jung.slice(), jong: H.jong.slice() };
        hNew(el, { cho: c, jung: [ch] });
        hUndo = { st: before, c: c };
      }
      else if (H.jung.length === 1 && VCOMB[H.jung[0] + ch]) { H.jung.push(ch); hPut(el, composing); }
      else if (H.cho && !H.jung.length) { H.jung = [ch]; hPut(el, composing); }
      else if (!H.cho && !H.jung.length) { H.jung = [ch]; hPut(el, false); }
      else hNew(el, { jung: [ch] });
    }
  }
  function hBack(el) {
    if (H.jong.length) H.jong.pop();
    else if (H.jung.length) {
      H.jung.pop();
      if (!H.jung.length && hUndo && hUndo.c === H.cho) { // 넘어왔던 첫소리를 앞 글자의 받침으로 되돌린다
        const u = hUndo;
        deleteBack(el);
        H = u.st; H.jong.push(u.c);
        hUndo = null;
        hPut(el, true);
        return;
      }
    }
    else H.cho = "";
    if (hCompose()) hPut(el, true);
    else { deleteBack(el); oskCommit(); }
  }
  function oskBackspace() {
    const el = oskTarget();
    if (el && composing) hBack(el);
    else { oskCommit(); sendKey("Backspace"); }
  }
  function oskPress(act, ch) {
    const el = oskTarget();
    if (act !== "close" && !el) return;
    if (act === "char") {
      if (CHO.indexOf(ch) >= 0 || JUNG.indexOf(ch) >= 0) hType(el, ch);
      else { oskCommit(); insertText(el, ch, 0); }
      el.dispatchEvent(new KeyboardEvent("keyup", { key: ch, bubbles: true }));
      if (oskShift) { oskShift = false; oskRender(); }
      return;
    }
    if (act === "back") { oskBackspace(); return; }
    oskCommit();
    if (act === "space") { if (el) insertText(el, " ", 0); }
    else if (act === "enter") sendKey("Enter");
    else if (act === "left") sendKey("ArrowLeft");
    else if (act === "right") sendKey("ArrowRight");
    else if (act === "shift") { oskShift = !oskShift; oskRender(); }
    else if (act === "lang") { oskLang = oskLang === "ko" ? "en" : "ko"; oskSym = false; oskRender(); }
    else if (act === "sym") { oskSym = !oskSym; oskRender(); }
    else if (act === "close") oskClose();
    if (oskOn) oskPreview();
  }
  // 십자키로 키 사이를 옮겨 다닌다 - 지금 커서에서 그 방향으로 가장 가까운 키의 가운데로 커서를 보낸다.
  function oskStep(dx, dy) {
    const keys = Array.prototype.map.call(oskEl.querySelectorAll(".gp-key"), (k) => {
      const r = k.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r };
    });
    if (!keys.length) return;
    const on = keys.some((k) => cx >= k.r.left && cx <= k.r.right && cy >= k.r.top && cy <= k.r.bottom);
    let best = null, bestScore = Infinity;
    if (!on) {
      keys.forEach((k) => { const s = Math.hypot(k.x - cx, k.y - cy); if (s < bestScore) { bestScore = s; best = k; } });
    } else {
      keys.forEach((k) => {
        const along = (k.x - cx) * dx + (k.y - cy) * dy, across = Math.abs((k.x - cx) * dy) + Math.abs((k.y - cy) * dx);
        if (along < 6) return;
        const s = along + across * 2.5;
        if (s < bestScore) { bestScore = s; best = k; }
      });
    }
    if (best) { cx = best.x; cy = best.y; placeCursor(); }
  }

  /* ---------------- 시작 메뉴: 십자키 포커스 ----------------
     시작 메뉴가 열리면 십자키가 메뉴 항목을 오르내린다(커서도 그 항목 위로 따라가서 A로 바로 누를 수 있다).
     오른쪽 = 하위 메뉴 열기, 왼쪽 = 하위 메뉴 닫기, RT/A = 실행. Start나 B로 다시 닫으면 키보드 포커스와
     커서를 메뉴를 열기 전 자리로 되돌린다(항목을 실행해서 닫힌 경우에는 새로 뜬 창을 건드리지 않는다). */
  const startMenuEl = document.getElementById("startMenu");
  let smWas = false, smRow = null, smPrevFocus = null, smPrevCur = null, smRestore = false;
  function startOpen() { return !!(startMenuEl && startMenuEl.classList.contains("open")); }
  function smSubs() { return (typeof openSubmenuEls !== "undefined" && Array.isArray(openSubmenuEls)) ? openSubmenuEls.filter((el) => el.isConnected) : []; }
  function smRows() {
    const subs = smSubs(), box = subs.length ? subs[subs.length - 1] : startMenuEl;
    return Array.prototype.filter.call(box.querySelectorAll(".start-app-row"), (r) => r.offsetParent !== null);
  }
  function smFocus(row) {
    if (smRow) smRow.classList.remove("gp-focus");
    smRow = row || null;
    if (!smRow) return;
    smRow.classList.add("gp-focus");
    if (smRow.scrollIntoView) smRow.scrollIntoView({ block: "nearest" });
    const r = smRow.getBoundingClientRect();
    cx = r.left + Math.min(r.width / 2, 120); cy = r.top + r.height / 2;
    placeCursor();
  }
  function smStep(dir) {
    const rows = smRows();
    if (!rows.length) return;
    let i = rows.indexOf(smRow);
    if (dir === "ArrowDown") smFocus(rows[i < 0 ? 0 : (i + 1) % rows.length]);
    else if (dir === "ArrowUp") smFocus(rows[i < 0 ? rows.length - 1 : (i - 1 + rows.length) % rows.length]);
    else if (dir === "ArrowRight") {
      if (i < 0 || !smRow.querySelector(".start-app-chevron")) return;
      const parent = smRow;
      parent.click(); // 하위 메뉴 열기
      const next = smRows();
      if (next.length && next[0] !== rows[0]) { smFocus(next[0]); smRow._gpParent = parent; }
    } else if (dir === "ArrowLeft") {
      const subs = smSubs();
      if (!subs.length) return;
      const parent = (smRow && smRow._gpParent) || null;
      const last = subs[subs.length - 1];
      openSubmenuEls.splice(openSubmenuEls.indexOf(last), 1);
      last.remove();
      const back = smRows();
      smFocus(parent && parent.isConnected ? parent : back[0]);
    }
  }
  function smActivate() {
    if (smRow && smRow.isConnected) {
      if (smRow.querySelector(".start-app-chevron")) smStep("ArrowRight"); else smRow.click();
      return true;
    }
    return false;
  }
  function smClose() { // Start/B로 직접 닫는 경우 - 닫힌 뒤 원래 자리로 되돌린다
    smRestore = true;
    if (typeof closeAllSubmenus === "function") closeAllSubmenus();
    startMenuEl.classList.remove("open");
  }
  function smWatch() {
    const open = startOpen();
    if (open === smWas) {
      if (open && smRow && !smRow.isConnected) smFocus(smRows()[0]); // 메뉴가 다시 그려진 경우
      return;
    }
    smWas = open;
    if (open) {
      if (!smPrevFocus) smPrevFocus = document.activeElement;
      smPrevCur = [cx, cy];
      smRestore = false;
      smFocus(smRows()[0]);
    } else {
      if (smRow) smRow.classList.remove("gp-focus");
      smRow = null;
      if (smRestore) {
        if (smPrevFocus && smPrevFocus !== document.body && smPrevFocus.isConnected && smPrevFocus.focus) smPrevFocus.focus({ preventScroll: true });
        if (smPrevCur) { cx = smPrevCur[0]; cy = smPrevCur[1]; placeCursor(); }
      }
      smPrevFocus = null; smPrevCur = null; smRestore = false;
    }
  }

  /* ---------------- 버튼 처리 ---------------- */
  function scrollTarget(t, vertical) {
    for (let n = t; n && n.nodeType === 1; n = n.parentElement) {
      const room = vertical ? n.scrollHeight - n.clientHeight : n.scrollWidth - n.clientWidth;
      if (room <= 1) continue;
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(vertical ? cs.overflowY : cs.overflowX)) return n;
    }
    return null;
  }
  function dpad(dir) { // dir: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
    const dx = dir === "ArrowLeft" ? -1 : dir === "ArrowRight" ? 1 : 0, dy = dir === "ArrowUp" ? -1 : dir === "ArrowDown" ? 1 : 0;
    if (oskOn) { oskStep(dx, dy); return; }
    if (startOpen()) { smStep(dir); return; }
    const t = under();
    const media = t.closest && t.closest("video, audio");
    if (media) {
      if (dx) { try { media.currentTime = Math.max(0, media.currentTime + dx * 5); } catch (e) {} }
      else media.volume = Math.max(0, Math.min(1, media.volume - dy * 0.1));
      return;
    }
    sendKey(dir);
  }
  function onPress(b) {
    if (b === BTN.BACK) { toggleHelp(); return; }
    if (helpEl.classList.contains("on")) { toggleHelp(false); return; }
    switch (b) {
      case BTN.A: pressA(); break;
      case BTN.X:
        if (oskOn) oskBackspace();
        else { oskCommit(); fire("contextmenu", under(), { button: 2, buttons: 2 }); }
        break;
      case BTN.B:
        if (oskOn) oskClose();
        else if (startOpen()) smClose();
        else sendKey("Escape");
        break;
      case BTN.Y: if (oskOn) oskClose(); else if (fieldOf(document.activeElement)) oskOpen(); break;
      case BTN.LB: if (oskOn) oskPress("lang"); else sendKey("ArrowLeft", { altKey: true }); break;
      case BTN.RB: if (oskOn) oskPress("shift"); else sendKey("ArrowRight", { altKey: true }); break;
      case BTN.RT:
        if (!oskOn && startOpen() && smActivate()) break;
        oskCommit(); sendKey("Enter");
        break;
      case BTN.START:
        if (startOpen()) smClose();
        else if (typeof toggleStartMenu === "function") { smPrevFocus = document.activeElement; toggleStartMenu(); }
        break;
      case BTN.UP: dpad("ArrowUp"); break;
      case BTN.DOWN: dpad("ArrowDown"); break;
      case BTN.LEFT: dpad("ArrowLeft"); break;
      case BTN.RIGHT: dpad("ArrowRight"); break;
    }
  }
  const DIRS = [[BTN.UP, "ArrowUp"], [BTN.DOWN, "ArrowDown"], [BTN.LEFT, "ArrowLeft"], [BTN.RIGHT, "ArrowRight"]];

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - lastT) / 1000) || 0;
    lastT = t;
    const pads = HAS_PAD ? navigator.getGamepads() : [];
    let gp = padIndex != null ? pads[padIndex] : null;
    if (!gp || !gp.connected) {
      gp = null;
      for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { gp = pads[i]; break; }
      padIndex = gp ? gp.index : null;
      prev = [];
    }
    if (!gp) return;

    const now = [];
    let any = false;
    for (let i = 0; i < gp.buttons.length; i++) {
      const b = gp.buttons[i];
      now[i] = !!(b && (b.pressed || b.value > 0.5));
      if (now[i]) any = true;
    }
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, sx = gp.axes[2] || 0, sy = gp.axes[3] || 0;
    const m = Math.hypot(ax, ay), sm = Math.hypot(sx, sy);
    if (any || m > DEAD || sm > DEAD) realMove = 0;
    if (!active) {
      // 다른 입력(마우스/터치)을 쓰다가 패드로 돌아온 첫 입력은 커서를 다시 보여주는 데만 쓴다.
      if (any || m > DEAD || sm > DEAD) { activate(); prev = now; }
      return;
    }
    slow = !!now[BTN.LT];

    let moved = false;
    if (m > DEAD) {
      const k = (m - DEAD) / (1 - DEAD);
      const sp = (CUR_SPEED * k * k + 70 * k) * (slow ? 0.3 : 1);
      cx += ax / m * sp * dt; cy += ay / m * sp * dt;
      placeCursor();
      moved = true;
    }

    for (let i = 0; i < now.length; i++) {
      if (now[i] && !prev[i]) onPress(i);
      else if (!now[i] && prev[i] && i === BTN.A && held) releaseA();
    }
    // 십자키 반복 입력
    let dirHeld = null;
    DIRS.forEach((d) => { if (now[d[0]]) dirHeld = d[1]; });
    if (dirHeld !== repKey) { repKey = dirHeld; repAt = t + REP_FIRST; }
    else if (repKey && t >= repAt) { repAt = t + REP_NEXT; dpad(repKey); }
    prev = now;
    smWatch();

    if (sm > DEAD) {
      const k = (sm - DEAD) / (1 - DEAD), sp = SCROLL_SPEED * k * k * dt;
      const tgt = under();
      if (Math.abs(sy) > 0.15) { const el = scrollTarget(tgt, true); if (el) el.scrollTop += sy / sm * sp; }
      if (Math.abs(sx) > 0.15) { const el = scrollTarget(tgt, false); if (el) el.scrollLeft += sx / sm * sp; }
    }

    // 커서 아래 요소 추적(커서가 가만히 있어도 메뉴가 뜨거나 화면이 바뀌면 달라진다)
    const u = under();
    if (dragging) { if (moved) moveDrag(); }
    else {
      setHover(u);
      if (moved) {
        if (held && rangeEl) setRange();
        else if (held && dragSrc && !dragTried && Math.hypot(cx - downX, cy - downY) > DRAG_PX) tryStartDrag();
        if (!dragging) fire("mousemove", u);
      }
    }

    if (oskOn) oskPreview();
  }

  /* ---------------- 연결 / 해제 ---------------- */
  function padName(gp) {
    return ((gp && gp.id) || "").replace(/\s*\((?:STANDARD GAMEPAD\s*)?Vendor:.*\)\s*$/i, "").trim() || "게임패드";
  }
  function anyPad() {
    if (!HAS_PAD) return null;
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) return pads[i];
    return null;
  }
  function toast(msg, opts) {
    if (typeof showToast === "function") { try { showToast(msg, opts || {}); } catch (e) {} }
  }
  function start() {
    trayEl.classList.add("on");
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); }
  }
  window.addEventListener("gamepadconnected", (e) => {
    const first = !trayEl.classList.contains("on");
    start();
    if (first) toast("🎮 게임패드가 연결되었습니다\n" + padName(e.gamepad) + "\nBack(Select) 버튼을 누르면 조작 안내가 나옵니다.", { sticky: true });
  });
  window.addEventListener("gamepaddisconnected", () => {
    if (anyPad()) return;
    deactivate();
    if (!oskDefault()) oskClose();
    toggleHelp(false);
    trayEl.classList.remove("on");
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    padIndex = null; prev = []; repKey = null;
    toast("🎮 게임패드 연결이 해제되었습니다.");
  });
  if (anyPad()) start(); // 이미 연결된 채로 페이지를 연 경우(브라우저가 알려주는 경우에 한해)
})();
