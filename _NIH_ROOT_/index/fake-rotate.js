/* ============================================================================
   가짜 가로 모드 (세로로 고정된 터치 기기에서 화면 전체를 시계 방향으로 90° 돌려 가로처럼 쓴다)
   ----------------------------------------------------------------------------
   <head>에서 가장 먼저 실행된다. 하는 일은 두 가지다.

   1) 화면: <html>에 .fakerot 클래스를 붙이고 <body>를 CSS로 90° 돌린다. body의 폭/높이를 실제
      뷰포트의 높이/폭으로 맞바꾸므로 그 안의 레이아웃(position:fixed 포함 - 변형된 body가 기준
      블록이 된다)은 전부 "가로 화면"으로 짜인다. 테마 CSS의 vw/vh는 var(--vw)/var(--vh)로 바꿔
      뒀고 여기서 그 값을 돌린 뒤의 크기로 넣어준다.

   2) 좌표: 이 앱은 10000줄 넘게 clientX/clientY, getBoundingClientRect, innerWidth/innerHeight,
      elementFromPoint 기준으로 짜여 있다. 그걸 하나하나 고치지 않고, 브라우저의 그 API들 자체를
      "돌린 뒤의 좌표계(논리 좌표)"로 돌려주도록 감싼다. 그래서 다른 스크립트는 화면이 돌아갔다는
      사실을 전혀 모른 채 그대로 동작한다(창 드래그, 메뉴 위치, 터치 번역, 게임패드 커서 전부).
        - 읽기: MouseEvent/Touch의 clientX·clientY·pageX·pageY·x·y, Element/Range의
                getBoundingClientRect, window.innerWidth·innerHeight
        - 쓰기: document.elementFromPoint(s), new MouseEvent/PointerEvent/WheelEvent/DragEvent의
                clientX·clientY (논리 좌표를 받아 실제 좌표로 바꿔 넣는다)
      가짜 가로 모드가 꺼져 있으면 전부 원래 값을 그대로 돌려준다.

   켜지는 조건: 설정이 켜져 있고(기본 켬) + 터치가 주 입력인 기기 + 화면이 세로로 긴 상태.
   실제로 기기를 가로로 돌리면 자동으로 꺼진다. 키보드나 게임패드를 연결해도 그대로 유지된다.
   좁은 화면 규칙(예전 @media (max-width:720px))도 돌린 뒤의 폭으로 판단해 <html>.narrow로 표시한다.
================================================================================= */
(function () {
  "use strict";
  const LS_KEY = "nih:fakeRotate"; // "off"면 끔 (환경설정 창의 체크박스)
  const root = document.documentElement;

  function findDesc(obj, name) {
    for (let o = obj; o; o = Object.getPrototypeOf(o)) {
      const d = Object.getOwnPropertyDescriptor(o, name);
      if (d) return d;
    }
    return null;
  }
  const dW = findDesc(window, "innerWidth"), dH = findDesc(window, "innerHeight");
  const canWrap = !!(dW && dH && dW.get && dH.get);
  const physW = () => canWrap ? dW.get.call(window) : window.innerWidth;
  const physH = () => canWrap ? dH.get.call(window) : window.innerHeight;

  let R = false; // 지금 돌아가 있는지

  const toLog = (px, py) => R ? [py, physW() - px] : [px, py];   // 실제 화면 좌표 -> 돌린 뒤의 좌표
  const toPhys = (lx, ly) => R ? [physW() - ly, lx] : [lx, ly];  // 그 반대

  /* ---------------- 좌표 API 감싸기 ---------------- */
  if (canWrap) {
    Object.defineProperty(window, "innerWidth", { configurable: true, enumerable: true, get: () => R ? physH() : physW(), set: dW.set });
    Object.defineProperty(window, "innerHeight", { configurable: true, enumerable: true, get: () => R ? physW() : physH(), set: dH.set });

    const wrapXY = (proto, xName, yName) => {
      const dx = proto && Object.getOwnPropertyDescriptor(proto, xName), dy = proto && Object.getOwnPropertyDescriptor(proto, yName);
      if (!dx || !dy || !dx.get || !dy.get) return;
      Object.defineProperty(proto, xName, { configurable: true, enumerable: dx.enumerable, get() { return R ? dy.get.call(this) : dx.get.call(this); } });
      Object.defineProperty(proto, yName, { configurable: true, enumerable: dy.enumerable, get() { return R ? physW() - dx.get.call(this) : dy.get.call(this); } });
    };
    // 가짜 가로 모드에서는 문서 자체가 스크롤되지 않으므로(html overflow:hidden) page 좌표 = client 좌표다.
    if (window.MouseEvent) {
      wrapXY(MouseEvent.prototype, "clientX", "clientY");
      wrapXY(MouseEvent.prototype, "pageX", "pageY");
      wrapXY(MouseEvent.prototype, "x", "y");
    }
    if (window.Touch) {
      wrapXY(Touch.prototype, "clientX", "clientY");
      wrapXY(Touch.prototype, "pageX", "pageY");
    }

    const wrapRect = (proto) => {
      if (!proto || !proto.getBoundingClientRect) return;
      const orig = proto.getBoundingClientRect;
      proto.getBoundingClientRect = function () {
        const r = orig.call(this);
        if (!R) return r;
        return new DOMRect(r.top, physW() - r.right, r.height, r.width);
      };
    };
    wrapRect(Element.prototype);
    if (window.Range) wrapRect(Range.prototype);

    ["elementFromPoint", "elementsFromPoint"].forEach((name) => {
      const orig = Document.prototype[name];
      if (!orig) return;
      Document.prototype[name] = function (x, y) {
        if (R) { const p = toPhys(x, y); x = p[0]; y = p[1]; }
        return orig.call(this, x, y);
      };
    });

    // 스크립트가 직접 만드는 마우스 이벤트(터치 번역, 메뉴 호출 키, 게임패드 커서)는 논리 좌표를 넣는다 -
    // 위의 getter가 다시 논리 좌표로 바꿔 읽으므로, 만들 때 실제 좌표로 바꿔 넣어야 값이 맞는다.
    ["MouseEvent", "PointerEvent", "WheelEvent", "DragEvent"].forEach((name) => {
      const Native = window[name];
      if (typeof Native !== "function") return;
      window[name] = new Proxy(Native, {
        construct(target, args, newTarget) {
          const init = args[1];
          if (R && init && (init.clientX != null || init.clientY != null)) {
            const copy = Object.assign({}, init);
            const p = toPhys(+init.clientX || 0, +init.clientY || 0);
            copy.clientX = p[0]; copy.clientY = p[1];
            args = [args[0], copy];
          }
          return Reflect.construct(target, args, newTarget);
        }
      });
    });
  }

  /* ---------------- 화면 돌리기 ---------------- */
  const style = document.createElement("style");
  style.id = "fake-rotate-css";
  style.textContent =
    "html.fakerot { overflow: hidden; height: 100%; }\n" +
    "html.fakerot body { position: fixed; top: 0; left: var(--fr-pw); width: var(--fr-lw); height: var(--fr-lh);" +
    " min-height: 0; margin: 0; overflow: hidden; transform-origin: 0 0; transform: rotate(90deg); }";
  (document.head || root).appendChild(style);

  function enabled() {
    try { return localStorage.getItem(LS_KEY) !== "off"; } catch (e) { return true; }
  }
  function isTouchDevice() {
    const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
    const coarse = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : touch;
    return touch && coarse;
  }
  function isEditing() {
    const a = document.activeElement;
    return !!(a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable));
  }
  let decidedOnce = false;
  function update() {
    const w = physW(), h = physH();
    let want = canWrap && enabled() && isTouchDevice() && h > w * 1.08;
    // 화면 키보드가 올라오면 뷰포트 높이가 줄어 "세로로 긴 화면"이 아니게 보일 수 있다 - 글자를
    // 입력하는 동안에는(입력창에 포커스가 있는 동안) 방향 판단을 바꾸지 않는다.
    if (decidedOnce && isEditing() && enabled() && isTouchDevice()) want = R;
    decidedOnce = true;
    const changed = want !== R;
    R = want;
    root.classList.toggle("fakerot", R);
    const st = root.style;
    if (R) {
      st.setProperty("--fr-pw", w + "px");
      st.setProperty("--fr-lw", h + "px");
      st.setProperty("--fr-lh", w + "px");
      st.setProperty("--vw", (h / 100) + "px");
      st.setProperty("--vh", (w / 100) + "px");
    } else {
      ["--fr-pw", "--fr-lw", "--fr-lh", "--vw", "--vh"].forEach((k) => st.removeProperty(k));
    }
    root.classList.toggle("narrow", (R ? h : w) <= 720);
    return changed;
  }
  update();
  // 캡처 단계로 걸어 다른 스크립트의 resize 리스너(창 다시 맞추기 등)보다 먼저 상태를 갱신한다.
  window.addEventListener("resize", update, true);
  window.addEventListener("orientationchange", update, true);

  window.FakeRot = {
    get on() { return R; },
    enabled: enabled,
    setEnabled(on) {
      try { if (on) localStorage.removeItem(LS_KEY); else localStorage.setItem(LS_KEY, "off"); } catch (e) {}
      // 열려 있는 창들이 새 화면 크기에 다시 맞춰지도록(touch-input.js의 reclamp 등) resize를 알린다.
      if (update()) window.dispatchEvent(new Event("resize"));
    },
    toLog: toLog,
    toPhys: toPhys,
    update: update
  };
})();
