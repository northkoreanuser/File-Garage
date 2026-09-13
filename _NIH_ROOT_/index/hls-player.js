/* ============================================================================
   HLS 재생기 (요청: "hls 재생기 추가. 파일 확장자 연결은 메뉴 메이커의 확장자 탭에서 연결한다
   (하드코딩 연결은 하지 말고, 사용자가 찾아 쓰게 하면 좋음)")
   ----------------------------------------------------------------------------
   .m3u8(HLS 스트림) 같은 파일을 이 재생기로 열려면, 메뉴 메이커의 "확장자" 탭에서 원하는
   확장자를 등록하고 동작으로 "HLS 재생기로 열기"(state.js EXTENSION_RUN_ACTIONS의 "hls")를
   고르면 된다 - 이 파일 자체는 어떤 확장자와도 미리 엮여 있지 않다(하드코딩 금지 - 사용자 지시).
   더블클릭 시 실제 호출은 keyboard-and-activate.js의 runDoubleClickAction이 담당한다.

   재생 자체는 hls.js를 필요할 때(재생기를 처음 열 때)만 CDN에서 지연 로딩한다(state.js의
   ensureJSZip과 완전히 같은 패턴 - 항상 쓰는 기능이 아니므로 페이지 로드시 무조건 불러오지
   않는다). 사파리 등 <video> 태그가 HLS를 자체적으로 재생할 수 있는 브라우저에서는 hls.js 없이
   그대로 물려서 불필요한 네트워크 요청을 건너뛴다.

   에디터처럼 여러 개를 동시에 열어 나란히 볼 수 있는 게 자연스러우므로(메뉴 메이커와 달리) 이
   재생기는 싱글턴으로 만들지 않는다 - 열 때마다 새 창이 뜬다.
================================================================================= */
let dfHlsJsLoadPromise = null;
function dfEnsureHlsJs() {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (dfHlsJsLoadPromise) return dfHlsJsLoadPromise;
  dfHlsJsLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.17/hls.min.js";
    s.onload = () => resolve(window.Hls);
    s.onerror = () => { dfHlsJsLoadPromise = null; reject(new Error("hls.js를 불러오지 못했습니다(네트워크 확인)")); };
    document.head.appendChild(s);
  });
  return dfHlsJsLoadPromise;
}

const DF_HLS_PLAYER_CSS = `
  .hls-root { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; background: #000; }
  .hls-video-wrap { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .hls-video-wrap video { width: 100%; height: 100%; object-fit: contain; background: #000; }
  .hls-status { flex: 0 0 auto; padding: 6px 10px; font: 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color: #ddd; background: #111; border-top: 1px solid #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

// title: 창 타이틀바 문구(보통 파일 이름), url: 재생할 .m3u8(또는 그 외 hls.js가 지원하는) 주소.
function dfsOpenHlsPlayerWindow(title, url) {
  dfInjectStyleOnce("dfHlsPlayerStyle", DF_HLS_PLAYER_CSS);
  let hlsInstance = null;
  const handle = dfCreateAppWindow({
    title: title || "HLS 재생기",
    icon: "\u{25B6}\u{FE0F}",
    width: 900,
    height: 560,
    bodyHtml:
      '<div class="hls-root">' +
        '<div class="hls-video-wrap"><video controls autoplay playsinline></video></div>' +
        '<div class="hls-status"></div>' +
      '</div>',
    onClose: () => { if (hlsInstance) { try { hlsInstance.destroy(); } catch (e) { /* 무시 */ } } }
  });
  const video = handle.bodyEl.querySelector("video");
  const statusEl = handle.bodyEl.querySelector(".hls-status");
  statusEl.textContent = url;

  function playWithNativeHls() { video.src = url; }

  // 사파리처럼 <video>가 HLS를 자체적으로(hls.js 없이) 재생할 수 있으면 그대로 쓰고, 아니면
  // hls.js를 지연 로딩해서 붙인다(대부분의 크로미움/파이어폭스 계열이 이 경로를 탄다).
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    playWithNativeHls();
  } else {
    dfEnsureHlsJs().then((Hls) => {
      if (Hls && Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.ERROR, (_evt, data) => {
          if (data && data.fatal) statusEl.textContent = "재생 오류: " + (data.details || "알 수 없는 오류") + " - " + url;
        });
      } else {
        // hls.js 자체를 못 쓰는 아주 오래된 브라우저 - 마지막 시도로 네이티브 재생을 건다.
        playWithNativeHls();
      }
    }).catch((e) => {
      statusEl.textContent = "hls.js 로딩 실패: " + e.message;
      showToast(`HLS 재생기 로딩 실패: ${e.message}`, { kind: "warn", sound: "error_generic" });
    });
  }
  return handle;
}

// 저장소에 올라간 파일(.m3u8 등)을 HLS 재생기로 연다 - 메뉴 메이커의 확장자 탭에서 이 동작
// ("hls")으로 연결해둔 확장자를 더블클릭하면 keyboard-and-activate.js의 runDoubleClickAction이
// 이 함수를 부른다. 같은 오리진(GitHub Pages)의 상대 경로를 그대로 쓴다(viewAsHostedPage와 같은
// 방식) - HLS 재생목록(.m3u8)은 그 안에 상대경로로 세그먼트(.ts/.m4s)를 가리키는 경우가 많아서,
// raw.githubusercontent.com 같은 절대 주소로 바꿔치기하면 오히려 세그먼트를 못 찾을 수 있다.
// 이 페이지 자신의 주소(같은 저장소를 그대로 서빙하는 GitHub Pages)가 항상 세그먼트 상대경로와
// 맞아떨어진다.
function dfsOpenRepoFileInHlsPlayer(it) {
  const url = it.path.map(encodeURIComponent).join("/");
  dfsOpenHlsPlayerWindow(it.name, url);
}
