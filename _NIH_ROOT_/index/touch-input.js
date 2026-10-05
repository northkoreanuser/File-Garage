/* ============================================================================
   터치 입력 대응 (안드로이드 / 갤럭시 Z 폴드8)
   ----------------------------------------------------------------------------
   이 앱 전체(탐색기 창, 뷰어/에디터 창, 바탕화면 아이콘, 트리/그리드, 작업표시줄, 시작 메뉴,
   컨텍스트 메뉴 등 - "모든 창들")가 처음부터 마우스 이벤트(mousedown/mousemove/mouseup/click/
   dblclick/contextmenu) 기준으로 짜여 있으므로, 터치를 그 마우스 이벤트로 그대로 "번역"해서
   보내주는 게 가장 안전하다 - 기존 10000줄 넘는 로직을 하나하나 손대지 않고도 창 드래그/리사이즈/
   아이콘 드래그/러버밴드 선택/버튼 클릭이 전부 그대로 동작한다.

   요구한 대응:
     - 손가락 하나로 한 번 톡 누르면 좌클릭(탭 = 클릭)
     - 누른 채로 움직이면 드래그(좌클릭을 누른 채 움직이는 것과 같다 - 창 드래그도 이걸로 된다)
     - 손가락 하나로 빠르게 두 번 톡톡(더블 탭) = 더블 클릭 그대로(파일/폴더 더블클릭 실행, 타이틀바
       더블클릭 최대화 등 기존 dblclick 동작 전부 그대로 탄다)
     - 두 손가락으로 동시에 탭 = 우클릭(컨텍스트 메뉴)
     - 손가락 하나로 움직이지 않고 꾹 누르고 있어도(롱프레스) = 우클릭(컨텍스트 메뉴). 바탕화면/
       내용창의 빈 곳처럼 두 손가락을 대기 불편한 자리에서도 한 손으로 메뉴를 열 수 있어야 하므로
       추가했다 - 두 손가락 탭과 같은 결과를 내는 또 하나의 방법일 뿐, 둘 다 그대로 쓸 수 있다.

   입력창(input/textarea/[contenteditable])·비디오·오디오·iframe 위에서는 이 번역을 하지 않고
   완전히 네이티브 터치 동작(커서 위치 지정, 텍스트 선택, 재생 컨트롤 등)에 맡긴다.
================================================================================= */
(function () {
  "use strict";

  const TAP_MOVE_PX = 10;      // 이보다 더 움직이면 탭이 아니라 드래그로 본다
  const DOUBLE_TAP_MS = 350;   // 이 시간 안에 다시 누르면 더블 탭 후보
  const DOUBLE_TAP_PX = 40;    // 두 탭의 위치가 이 거리 안이어야 더블 탭으로 본다
  const LONG_PRESS_MS = 500;   // 이 시간만큼 움직이지 않고 누르고 있으면 롱프레스(=우클릭)로 본다(안드로이드 기본 롱프레스 시간과 동일)

  const IGNORE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), video, audio, iframe';

  function isTouchCapable() {
    return ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0 || (navigator.msMaxTouchPoints || 0) > 0;
  }

  function dispatchMouse(type, x, y, target, button, buttons) {
    const ev = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: button === undefined ? 0 : button,
      buttons: buttons === undefined ? 1 : buttons,
    });
    (target || document).dispatchEvent(ev);
    return ev;
  }

  /* ---------------- 터치 -> 마우스 번역 상태 기계 ----------------
     한 손가락(singleActive)과 두 손가락 이상(gestureConsumed)을 구분해서 다룬다. */
  let singleActive = false;   // 지금 손가락 하나로 mousedown을 보내놓고 mouseup을 기다리는 중인지
  let dragOwnsGesture = false; // 그 mousedown을 앱이 자기 드래그(창 이동/리사이즈 등)로 받아갔는지(preventDefault로 표시)
  let moved = false;
  let downX = 0, downY = 0, lastX = 0, lastY = 0;
  let downTarget = null;
  let lastTapTime = 0, lastTapX = 0, lastTapY = 0;
  let gestureConsumed = false; // 이번 멀티터치(또는 더블 탭) 제스처를 이미 우클릭으로 처리했으니 나머지는 무시
  let longPressTimer = null;
  let longPressFired = false; // 이번 탭이 롱프레스로 이미 우클릭 처리됐으니 손을 뗄 때 click을 또 보내면 안 됨

  function clearLongPressTimer() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  function resetSingle() {
    singleActive = false;
    dragOwnsGesture = false;
    moved = false;
    downTarget = null;
    clearLongPressTimer();
  }

  function onTouchStart(e) {
    const target = e.target;
    if (target && target.closest && target.closest(IGNORE_SELECTOR)) return; // 입력창 등은 완전히 네이티브에 맡김

    if (e.touches.length >= 2) {
      // 두 손가락 탭 = 우클릭. 손가락 하나가 먼저 닿아 mousedown을 이미 보낸 상태였다면(살짝 시차를
      // 두고 두 번째 손가락이 닿은 경우) 그 mousedown을 조용히 mouseup으로 마무리하고 우클릭으로 넘어간다.
      if (singleActive) {
        if (!longPressFired) dispatchMouse("mouseup", lastX, lastY, downTarget);
        resetSingle();
        longPressFired = false;
      }
      e.preventDefault();
      const t = e.touches[0];
      const menuTarget = document.elementFromPoint(t.clientX, t.clientY) || target;
      dispatchMouse("contextmenu", t.clientX, t.clientY, menuTarget, 2, 2);
      gestureConsumed = true;
      return;
    }

    if (gestureConsumed) return; // 남은 손가락 하나가 아직 화면에서 안 떨어진 상태 - 새 제스처로 취급하지 않음

    const t = e.touches[0];
    downX = lastX = t.clientX;
    downY = lastY = t.clientY;
    moved = false;
    downTarget = document.elementFromPoint(downX, downY) || target;

    singleActive = true;
    longPressFired = false;
    const md = dispatchMouse("mousedown", downX, downY, downTarget, 0, 1);
    // 앱이 이 mousedown으로 직접 드래그를 시작하는 경우에만(타이틀바 이동, 리사이즈 손잡이, 아이콘/
    // 러버밴드 드래그 등 - 전부 자기 mousedown 핸들러에서 preventDefault를 부른다) 터치 이동을 가로채
    // 네이티브 스크롤을 막는다. 그 외(버튼, 리스트 항목 등 평범한 탭)는 그대로 둬서 스크롤 가능한
    // 영역은 손가락으로 계속 자연스럽게 스크롤된다.
    dragOwnsGesture = md.defaultPrevented;
    if (dragOwnsGesture) e.preventDefault();

    // 롱프레스 = 우클릭. 움직이면(onTouchMove) 취소되고, 이미 다른 메뉴가 열려 있으면(예: 방금
    // 연 메뉴의 하위 항목을 손가락으로 계속 누르고 있는 경우) 또 하나의 메뉴를 겹쳐 열지 않는다.
    const pressTarget = downTarget, pressX = downX, pressY = downY;
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      if (!singleActive || moved || document.querySelector(".ctx-menu")) return;
      dispatchMouse("mouseup", pressX, pressY, pressTarget);
      dispatchMouse("contextmenu", pressX, pressY, pressTarget, 2, 2);
      longPressFired = true;
    }, LONG_PRESS_MS);
  }

  function onTouchMove(e) {
    if (gestureConsumed || !singleActive) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    lastX = t.clientX;
    lastY = t.clientY;
    if (!moved && Math.hypot(lastX - downX, lastY - downY) > TAP_MOVE_PX) {
      moved = true;
      clearLongPressTimer(); // 움직였으면 롱프레스가 아니라 드래그 의도이므로 취소
    }
    // mousemove는 항상 보낸다 - 창 드래그/리사이즈/아이콘 드래그 등 기존 로직은 전부 window의
    // mousemove를 듣고 있으므로(대상 엘리먼트와 무관) document에 쏘는 것만으로 충분하다.
    dispatchMouse("mousemove", lastX, lastY, document, 0, 1);
    if (dragOwnsGesture) e.preventDefault(); // 드래그 중일 때만 화면 스크롤을 막는다
  }

  function onTouchEnd(e) {
    if (gestureConsumed) {
      if (e.touches.length === 0) gestureConsumed = false;
      return;
    }
    if (!singleActive) return;
    if (e.touches.length > 0) return; // 다른 손가락이 아직 남아있으면 그 손가락이 뗄 때까지 대기

    // 우리가 직접 mousedown/click을 합성해서 보냈으므로, 브라우저가 이 터치로부터 또 자기 나름의
    // 호환 마우스 이벤트/클릭을 만들어내면 두 번 눌린 것처럼 동작한다 - 항상 막는다(스크롤은 이미
    // touchmove 단계에서 끝난 뒤라 여기서 막아도 스크롤 자체엔 영향 없음).
    e.preventDefault();

    if (longPressFired) {
      // 롱프레스 타이머가 이미 mouseup까지 보내고 우클릭 메뉴를 열어뒀다 - 지금 손을 떼는 건 그
      // 메뉴가 뜬 채로 화면에서 손가락을 치우는 것일 뿐이니 click을 또 보내지 않는다.
      resetSingle();
      return;
    }

    dispatchMouse("mouseup", lastX, lastY, downTarget);
    if (!moved) {
      dispatchMouse("click", lastX, lastY, downTarget);
      const now = Date.now();
      const isDoubleTap = (now - lastTapTime) < DOUBLE_TAP_MS &&
        Math.hypot(downX - lastTapX, downY - lastTapY) < DOUBLE_TAP_PX;
      if (isDoubleTap) {
        // 실제 더블클릭과 같은 순서(click, click, 그 다음 dblclick) - 우리가 click을 직접 합성해서
        // 보내므로 브라우저가 dblclick까지 저절로 만들어주지는 않는다(합성 이벤트라 신뢰되지 않음),
        // 여기서 같이 쏴준다. 파일/폴더 더블클릭 실행, 타이틀바 더블클릭 최대화 등 기존 dblclick
        // 핸들러가 그대로 이걸 받는다.
        dispatchMouse("dblclick", lastX, lastY, downTarget, 0, 1);
        lastTapTime = 0; // 연속 3번째 탭이 또 더블탭으로 묶이지 않도록 초기화
      } else {
        lastTapTime = now;
        lastTapX = downX;
        lastTapY = downY;
      }
    } else {
      lastTapTime = 0; // 드래그였으면 다음 탭과 묶어 더블탭으로 판정하지 않는다
    }
    resetSingle();
  }

  function onTouchCancel() {
    if (singleActive && !longPressFired) dispatchMouse("mouseup", lastX, lastY, downTarget);
    resetSingle();
    longPressFired = false;
    gestureConsumed = false;
  }

  if (isTouchCapable()) {
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", onTouchCancel, { passive: false });

    // 터치 손잡이(타이틀바/리사이즈 모서리/아이콘 등)에서는 브라우저가 자기 나름의 스크롤/더블탭
    // 확대 제스처를 미리 채가지 않도록 touch-action을 꺼두고, 롱프레스 시 안드로이드/iOS 기본
    // 말풍선(텍스트 선택/이미지 저장 메뉴 등)도 꺼서 우리가 만든 더블클릭/우클릭 번역과 겹치지
    // 않게 한다. 내용을 스크롤해야 하는 영역(content-pane/nav-pane/트리/시작 메뉴 목록 등)은
    // 일부러 빼서 손가락 스크롤이 계속 자연스럽게 되게 둔다.
    const css =
      '.titlebar, .rz, .df-icon, .taskbar-app, .start-btn, .tray-icon, .tool-btn, .tb-btn, .tb-controls { touch-action: none; }\n' +
      '.df-icon, .titlebar, .taskbar, .start-menu, .tb-btn, .tool-btn, .context-menu { -webkit-touch-callout: none; -webkit-user-drag: none; }';
    if (typeof dfInjectStyleOnce === "function") {
      dfInjectStyleOnce("df-touch-css", css);
    } else {
      const style = document.createElement("style");
      style.id = "df-touch-css";
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  /* ---------------- 화면 크기 변화(폴드8 접기/펼치기, 회전) 대응 ----------------
     한 번 드래그/리사이즈해서 "positioned"가 된 창들은 그 뒤로 고정 좌표(left/top, 경우에 따라
     width/height)를 그대로 유지한다 - 폴드8을 접었다 펼치거나 화면을 돌리면 뷰포트 크기 자체가
     확 바뀌는데, 그 좌표가 새 화면 기준으로 다시 맞춰지지 않으면 창이 화면 밖으로 밀려나거나
     반쯤 잘려서 손이 안 닿게 될 수 있다. 뷰포트가 바뀔 때마다 열려 있는 모든 창을 새 화면 크기
     안으로 다시 눌러준다. */
  function reclampWindow(win) {
    if (!win.classList.contains("positioned") || win.classList.contains("maximized")) return;
    const TASKBAR_H = 48, MARGIN = 8, MIN_VISIBLE = 80;
    const rect = win.getBoundingClientRect();
    const maxW = Math.max(240, window.innerWidth - MARGIN * 2);
    const maxH = Math.max(160, window.innerHeight - TASKBAR_H - MARGIN * 2);
    let w = rect.width, h = rect.height;
    if (w > maxW) { w = maxW; win.style.width = w + "px"; }
    if (h > maxH) { h = maxH; win.style.height = h + "px"; }
    let left = parseFloat(win.style.left);
    let top = parseFloat(win.style.top);
    if (!isFinite(left)) left = rect.left;
    if (!isFinite(top)) top = rect.top;
    // window-chrome.js의 드래그 클램프는 "타이틀바만 작업표시줄 위로 남으면 됨"(본문이 화면
    // 아래로 넘쳐도 허용 - 창 크기는 그대로 두고 위치만 옮기는 상황이라 그렇다)이지만, 여기서는
    // 위에서 폭/높이 자체를 화면에 맞춰 줄였으므로 위쪽 좌표도 그 줄어든 높이 기준으로 다시 잡아야
    // 창 전체(본문까지)가 화면 안에 온전히 들어온다 - 안 그러면 높이는 줄었는데 위쪽 좌표가 옛
    // 화면 기준 그대로 남아 아래쪽이 작업표시줄 뒤로 잘려 보일 수 있다.
    left = Math.max(-(w - MIN_VISIBLE), Math.min(left, window.innerWidth - MIN_VISIBLE));
    const maxTop = Math.max(0, window.innerHeight - TASKBAR_H - h);
    top = Math.max(0, Math.min(top, maxTop));
    win.style.left = left + "px";
    win.style.top = top + "px";
  }
  function reclampAllWindows() {
    document.querySelectorAll(".window").forEach((win) => {
      if (win.classList.contains("closed") || win.classList.contains("minimized")) return;
      reclampWindow(win);
    });
  }
  let reclampTimer = null;
  function scheduleReclamp() {
    // 접기/펼치기나 회전 중에는 resize 이벤트가 짧은 시간에 연달아 여러 번 올 수 있어 묶어서(디바운스)
    // 마지막 상태 기준으로 한 번만 정리한다.
    clearTimeout(reclampTimer);
    reclampTimer = setTimeout(reclampAllWindows, 120);
  }
  window.addEventListener("resize", scheduleReclamp);
  window.addEventListener("orientationchange", scheduleReclamp);
})();
