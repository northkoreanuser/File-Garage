/* ============ 로컬 헬퍼(localserver.ahk) — 우클릭 "열기"/"다운로드" ============
   HTTPS 페이지에서 http://127.0.0.1로 fetch하는 거라 처음 한 번은 브라우저의
   로컬 네트워크 접근 권한 팝업이 뜬다 (그게 정상). 그래서 페이지 열자마자가
   아니라 실제로 열기/다운로드를 누른 시점에만 확인한다.
================================================================== */
const LOCAL_HELPER_PORT_MIN = 8000; // localserver.ahk와 같은 범위. 고정 포트가 아니라 양쪽 다 이 범위를 스캔해서 맞춘다.
const LOCAL_HELPER_PORT_MAX = 8020;
// 8000~8020 사이에 이미 다른 무관한 프로그램이 떠있을 수 있으므로, 단순 "OK" 응답만으로는
// 그게 우리 헬퍼인지 확신할 수 없다. localserver.ahk의 HELPER_SIGNATURE와 정확히 같은 문자열이어야만 인정한다.
const HELPER_SIGNATURE = "AHK-REPO-INDEXER-LOCALHELPER-v1";
let cachedHelperPort = null; // 한 번 찾으면 이 페이지가 살아있는 동안은 재사용

/* ============ 도구 파일 실제 위치 (base64 내장 대신 저장소의 진짜 파일을 그대로 가리킴) ============
   예전엔 index.html 안에 localserver.ahk/indexer.ahk를 base64로 통째로 내장해서(VIRTUAL_FILES)
   "루트에 항상 있는 가상 파일"처럼 보여줬는데, 파일이 바뀔 때마다 base64도 같이 다시 만들어
   넣어야 해서 유지보수가 나빴다(사용자 지시로 제거). 대신 이 두 파일은 저장소의
   _NIH_ROOT_/tools/ 폴더에 실제 파일로 둔다 - _NIH_ROOT_는 이름에 "_NIH_"가 들어있어서
   filterNames가 이미 모든 위치에서 통째로 숨겨주므로(탐색기 트리/검색 어디에도 안 나타남),
   "가상 파일"처럼 따로 특별 취급할 필요가 없다. GitHub Pages는 색인(pages.json)과 무관하게
   저장소의 모든 실제 파일을 그대로 서빙하므로, 경로만 알면(absoluteFileUrl) 내려받는 데
   아무 문제가 없다. ============ */
const LOCALSERVER_TOOL_PATH = ["_NIH_ROOT_", "tools", "localserver.ahk"];
// 로컬 헬퍼 없이(당연히 - 헬퍼가 없어서 이 함수를 부르는 상황이므로) 브라우저 자체 다운로드로
// 저장소의 실제 파일을 바로 내려받는다. localHelperDownload를 거치면 헬퍼가 없을 때 다시
// offerHelperDownload를 부르는 순환에 빠지므로, 일부러 별도 경로로 둔다(닭과 달걀 문제 회피).
function downloadRealFileDirect(pathArr, filename) {
  const a = document.createElement("a");
  a.href = absoluteFileUrl(pathArr);
  a.download = filename || pathArr[pathArr.length - 1];
  document.body.appendChild(a);
  a.click();
  a.remove();
}
/* 웹훅(localserver.ahk)이 필요한 동작(열기/다운로드 등)인데 실행 중인 게 안 잡힐 때: 브라우저
   기본 alert 대신, 이 앱의 다른 대화상자들과 똑같은 CSS 커스텀 확인창(Windows 스타일 질문
   창)으로 "받으시겠습니까?"를 직접 물어본다(사용자 지시) - "받기"를 누르면 즉시 내려받고,
   받은 뒤 실행해서 해당 동작을 다시 시도하도록 안내한다. */
async function offerHelperDownload(actionLabel) {
  const ok = await showConfirmDialog(
    `"${actionLabel}" 기능에는 로컬 헬퍼(localserver.ahk)가 필요한데, 실행 중인 것을 찾지 못했습니다.\n\nlocalserver.ahk를 받으시겠습니까? 받은 뒤 실행하고 "${actionLabel}"를 다시 시도해주세요.`,
    { okLabel: "받기", cancelLabel: "취소" }
  );
  if (ok) downloadRealFileDirect(LOCALSERVER_TOOL_PATH, "localserver.ahk");
}

function absoluteFileUrl(path) {
  const base = location.origin + location.pathname.replace(/[^/]*$/, "");
  return base + path.map(encodeURIComponent).join("/");
}
async function pingPort(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/ping`, { signal: AbortSignal.timeout(800) });
    if (!res.ok) return false;
    const text = await res.text();
    return text.trim() === HELPER_SIGNATURE;
  } catch (e) {
    return false;
  }
}
// 8000~8020을 전부 동시에 스캔해서(끝까지 기다림) 우리 서명으로 응답한 포트들을 오름차순으로 반환한다.
// 웹훅이 실수로 중복 실행됐을 수도 있으므로(예: 스크립트를 두 번 실행) "가장 먼저 응답한 포트"가 아니라
// "가장 낮은 포트 번호"를 정본으로 삼아야 하고, 중복 실행 여부도 판단해야 하므로 race가 아니라 전수 스캔한다.
async function scanAllHelperPorts() {
  const ports = [];
  for (let p = LOCAL_HELPER_PORT_MIN; p <= LOCAL_HELPER_PORT_MAX; p++) ports.push(p);
  const results = await Promise.all(ports.map(p => pingPort(p).then(ok => ok ? p : null)));
  return results.filter(p => p !== null).sort((a, b) => a - b);
}
// 기존 호출부(ensureHelperPort 등) 호환용: 전수 스캔해서 가장 낮은 포트(없으면 null)만 돌려준다.
async function scanForHelperPort() {
  const found = await scanAllHelperPorts();
  return found.length ? found[0] : null;
}
async function ensureHelperPort() {
  if (cachedHelperPort !== null && (await pingPort(cachedHelperPort))) return cachedHelperPort;
  cachedHelperPort = await scanForHelperPort();
  return cachedHelperPort;
}
// 특정 포트에 종료 요청을 보낸다 (응답이 오든 안 오든, 연결이 끊기든 상관없이 실패는 그냥 무시한다 -
// 어차피 목적은 "떠 있으면 끄기"이고, 이미 꺼져있었다면 애초에 에러가 나는 게 정상이다).
async function killHelperPort(port) {
  try {
    await fetch(`http://127.0.0.1:${port}/kill`, { signal: AbortSignal.timeout(800) });
  } catch (e) { /* 무시 - 응답 전에 프로세스가 죽거나(정상), 애초에 그 포트에 아무것도 없거나 */ }
}
// 환경설정의 "웹훅 종료" 버튼: 혹시 몇 개가 떠있는지 몰라도 되도록 범위 전체에 킬을 날린다.
async function killAllHelperPorts() {
  const ports = [];
  for (let p = LOCAL_HELPER_PORT_MIN; p <= LOCAL_HELPER_PORT_MAX; p++) ports.push(p);
  await Promise.allSettled(ports.map(p => killHelperPort(p)));
  cachedHelperPort = null;
}
// 페이지 로드시 호출: 실수로 localserver.ahk가 두 번 이상 실행됐을 수 있으므로(두 번째는 더 높은
// 포트를 잡음) 전수 스캔해서 하나보다 많이 발견되면 가장 낮은 포트만 남기고 나머지는 모두 끈다.
async function initHelperPortAndCollapseDuplicates() {
  const found = await scanAllHelperPorts();
  if (found.length === 0) { cachedHelperPort = null; return; }
  cachedHelperPort = found[0];
  if (found.length > 1) {
    const extras = found.slice(1);
    await Promise.allSettled(extras.map(p => killHelperPort(p)));
    showToast(`로컬 헬퍼가 여러 개 실행 중이어서(포트 ${found.join(", ")}) 가장 낮은 포트(${found[0]})만 남기고 정리했습니다.`);
  }
}
function sizeQueryParam(it) {
  return (it && it.size > 0) ? `&size=${encodeURIComponent(it.size)}` : "";
}
async function localHelperOpen(it) {
  const port = await ensureHelperPort();
  if (port === null) { offerHelperDownload("열기"); return; }
  const url = absoluteFileUrl(it.path);
  showToast(`여는 중: ${it.name}`);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/open?url=${encodeURIComponent(url)}${sizeQueryParam(it)}`);
    if (!res.ok) throw new Error(String(res.status));
    showToast(`열었습니다: ${it.name}`);
  } catch (e) {
    showToast(`여는 중 오류: ${e.message}`, { kind: "warn" });
  }
}
async function localHelperDownload(it) {
  const port = await ensureHelperPort();
  if (port === null) { offerHelperDownload("다운로드"); return; }
  const url = absoluteFileUrl(it.path);
  showToast(`저장 위치를 선택하세요: ${it.name}`);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/download?url=${encodeURIComponent(url)}${sizeQueryParam(it)}`);
    const text = await res.text();
    if (!res.ok) throw new Error(String(res.status));
    showToast(text.includes("CANCELLED") ? "다운로드가 취소되었습니다." : `다운로드 완료: ${it.name}`);
  } catch (e) {
    showToast(`다운로드 오류: ${e.message}`, { kind: "warn" });
  }
}
// 브라우저 자체 저장소(바탕화면 가상 파일시스템)에만 있는 파일은 서버에 URL이 없으므로
// /download처럼 url= 파라미터로 받아올 수 없다. 대신 이미 갖고 있는 내용을 그대로 로컬
// 헬퍼에 POST로 보내고, 헬퍼가 저장 대화상자를 띄워서 저장한다.
async function localHelperSaveContent(name, content) {
  const port = await ensureHelperPort();
  if (port === null) { offerHelperDownload("다운로드"); return; }
  showToast(`저장 위치를 선택하세요: ${name}`);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/savecontent?name=${encodeURIComponent(name)}`, {
      method: "POST",
      body: content ?? ""
    });
    const text = await res.text();
    if (!res.ok) throw new Error(String(res.status));
    showToast(text.includes("CANCELLED") ? "다운로드가 취소되었습니다." : `다운로드 완료: ${name}`);
  } catch (e) {
    showToast(`다운로드 오류: ${e.message}`, { kind: "warn" });
  }
}

