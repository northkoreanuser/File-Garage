/* ============ 아이콘 ============ */
function folderIcon(size, blue) {
  const top = blue ? "#63B3FF" : "#FFCA5F";
  const bot = blue ? "#2E7BE0" : "#FFB13B";
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8a2 2 0 0 1 2-2h6.17a2 2 0 0 1 1.41.59L14.83 9H27a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" fill="${top}"/>
    <path d="M3 12h26v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V12z" fill="${bot}"/>
  </svg>`;
}
function fileIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2h11l7 7v19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#eef1f4" stroke="#c7ccd1" stroke-width="1"/>
    <path d="M19 2v6a1 1 0 0 0 1 1h6" fill="none" stroke="#c7ccd1" stroke-width="1"/>
  </svg>`;
}
function htmlFileIcon(size) {
  const badge = Math.round(size * 0.5);
  return `<span style="position:relative;display:inline-block;width:${size}px;height:${size}px;">
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2h11l7 7v19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#eaf2fd" stroke="#8fb8ea" stroke-width="1"/>
      <path d="M19 2v6a1 1 0 0 0 1 1h6" fill="none" stroke="#8fb8ea" stroke-width="1"/>
    </svg>
    <svg width="${badge}" height="${badge}" viewBox="0 0 16 16" style="position:absolute;right:-2px;bottom:-2px;">
      <circle cx="8" cy="8" r="7" fill="#2b7de9" stroke="#fff" stroke-width="1.4"/>
      <path d="M6 10L10 6M10 6H7M10 6V9" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>`;
}

// 휴지통(바탕화면 + 트리) 기본 아이콘 - 커스텀 아이콘(icon_set.json의 recycleBin)이 없을 때 쓴다.
function trashIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 11h14l-1.2 15.5A2 2 0 0 1 19.8 28H12.2a2 2 0 0 1-2-1.5L9 11z" fill="#d7dbe1" stroke="#8b929c" stroke-width="1"/>
    <path d="M6.5 11h19" stroke="#8b929c" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M12.5 8.2A1.5 1.5 0 0 1 14 6.7h4A1.5 1.5 0 0 1 19.5 8.2V11h-7V8.2z" fill="#eef1f4" stroke="#8b929c" stroke-width="1"/>
    <path d="M13 14.5v9M16 14.5v9M19 14.5v9" stroke="#8b929c" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
}

/* ============ owner/repo 추출 (하드코딩 금지) ============ */
function getOwnerRepo() {
  const owner = location.hostname.split(".")[0] || "";
  const repo = location.pathname.split("/").filter(Boolean)[0] || "";
  return { owner, repo };
}

/* ============ GitHub 바로가기 (보기/다운로드/수정/삭제) ============
   이 페이지 자체는 정적 사이트라 파일을 직접 쓸 수 없다. 수정/삭제는 항상
   GitHub의 해당 파일 위치로 이동시키는 것으로 대신한다 (그마저도 환경설정에서
   기본은 꺼져 있음 - 색인과 저장소가 어긋날 수 있어서, 직접 git으로 지우고
   커밋하는 편이 더 안전하기 때문).
================================================================== */
let cachedDefaultBranch = null;
async function getDefaultBranchCached() {
  if (cachedDefaultBranch) return cachedDefaultBranch;
  const { owner, repo } = getOwnerRepo();
  if (!owner || !repo) return "main";
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    cachedDefaultBranch = data.default_branch || "main";
  } catch (e) {
    cachedDefaultBranch = "main"; // 조회 실패해도 링크 자체는 열리도록 합리적인 기본값으로 진행
  }
  return cachedDefaultBranch;
}
function githubItemPath(it) { return it.path.map(encodeURIComponent).join("/"); }
async function githubRawUrl(it) {
  const { owner, repo } = getOwnerRepo();
  const branch = await getDefaultBranchCached();
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${githubItemPath(it)}`;
}
// "저장소에서 보기" - GitHub 저장소 화면(blob 뷰어, 커밋 이력 등 GitHub UI 그대로)으로 이동
async function openInRepo(it) {
  const { owner, repo } = getOwnerRepo();
  const branch = await getDefaultBranchCached();
  dfOpenNewTab(`https://github.com/${owner}/${repo}/blob/${branch}/${githubItemPath(it)}`, "_blank", "noopener,noreferrer");
}
// 폴더용 "저장소에서 보기" - 파일의 blob 뷰어 대신 GitHub의 폴더 트리 화면으로 이동한다
// (사용자가 준 예시: https://github.com/<owner>/<repo>/tree/main/_NIH_ROOT_). 루트 폴더(path가
// 빈 배열)는 트리 URL 자체가 그냥 저장소 메인 화면과 같다.
async function openFolderInRepo(it) {
  const { owner, repo } = getOwnerRepo();
  const branch = await getDefaultBranchCached();
  const path = githubItemPath(it);
  const url = path
    ? `https://github.com/${owner}/${repo}/tree/${branch}/${path}`
    : `https://github.com/${owner}/${repo}`;
  dfOpenNewTab(url, "_blank", "noopener,noreferrer");
}
// ============ JSZip 지연 로딩 (바탕화면 가상 폴더를 zip으로 통째로 다운로드할 때만 필요) ============
// 항상 쓰는 기능이 아니므로 페이지 로드시 무조건 불러오지 않고, 실제로 폴더 다운로드를 처음 시도할
// 때 딱 한 번만 CDN에서 불러온다(dexie처럼 이 저장소가 이미 쓰고 있는 것과 같은 CDN).
let jszipLoadPromise = null;
function ensureJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (jszipLoadPromise) return jszipLoadPromise;
  jszipLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => { jszipLoadPromise = null; reject(new Error("JSZip을 불러오지 못했습니다(네트워크 확인)")); };
    document.head.appendChild(s);
  });
  return jszipLoadPromise;
}
// "Pages에서 보기" - raw 파일 URL을 그대로 새 탭에 띄운다. 텍스트/이미지는 브라우저가 그대로 보여준다
// (다운로드가 아니라 "그 페이지 자체를 보는" 용도 - 강제 다운로드는 아래 downloadFromGithub가 담당).
async function viewOnPages(it) {
  const url = await githubRawUrl(it);
  dfOpenNewTab(url, "_blank", "noopener,noreferrer");
}
// "GitHub에서 다운로드" - 단순 링크 이동이 아니라 fetch로 받아서 blob으로 강제 저장한다.
// (raw.githubusercontent.com은 텍스트/이미지를 그냥 열어버리기 때문에, 링크 이동만으로는 다운로드가 안 됨)
async function downloadFromGithub(it) {
  const url = await githubRawUrl(it);
  showToast(`브라우저에서 다운로드 중: ${it.name}`, { sound: "download_start" });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = it.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
    showToast(`다운로드 완료: ${it.name}`, { sound: "download_complete" });
  } catch (e) {
    showToast(`GitHub 다운로드 오류: ${e.message}`, { kind: "warn", sound: "download_error" });
  }
}

/* ============ icon_set.json: 폴더/확장자별 커스텀 아이콘(URL 또는 base64) (요청 #122로 menu.json에서
   분리) ============
   메뉴 메이커(menu-maker.js)의 "아이콘" 탭에서 편집하고, bootstrap.js가 부팅 시
   loadIconSetConfig()로 읽어와 applyCustomIconConfig()로 이 변수에 채워 넣는다. 폴더는 경로
   ("A/B"처럼 "/"로 join한 문자열, 루트는 빈 문자열)로, 파일은 확장자(점 없이, 소문자)로 키를
   삼는다. repoRoot/recycleBin은 바탕화면·트리의 "저장소 루트" 아이콘과 "휴지통" 아이콘을 각각
   따로 지정한다. */
let customIconConfig = { folders: {}, extensions: {}, repoRoot: "", recycleBin: "" };
function applyCustomIconConfig(icons) {
  const src = icons || {};
  customIconConfig = {
    folders: (src.folders && typeof src.folders === "object") ? src.folders : {},
    extensions: (src.extensions && typeof src.extensions === "object") ? src.extensions : {},
    repoRoot: typeof src.repoRoot === "string" ? src.repoRoot : "",
    recycleBin: typeof src.recycleBin === "string" ? src.recycleBin : ""
  };
}
function customImgIcon(src, size) {
  return `<img src="${escapeHtml(src)}" width="${size}" height="${size}" style="object-fit:contain;border-radius:3px;" alt="">`;
}
// 실제 저장소 폴더 아이콘 - pathArr가 그 폴더의 경로(루트는 []). blue는 트리 루트처럼 파란 폴더
// 아이콘을 쓸지 여부(커스텀 아이콘이 있으면 이 값은 무시된다).
function resolveFolderIcon(pathArr, size, blue) {
  const custom = customIconConfig.folders[pathArr.join("/")];
  if (custom) return customImgIcon(custom, size);
  return folderIcon(size, blue);
}
function resolveFileIcon(name, size) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const custom = ext && customIconConfig.extensions[ext];
  if (custom) return customImgIcon(custom, size);
  return isHtml(name) ? htmlFileIcon(size) : fileIcon(size);
}
function resolveRepoRootIcon(size) {
  return customIconConfig.repoRoot ? customImgIcon(customIconConfig.repoRoot, size) : folderIcon(size, true);
}
function resolveRecycleBinIcon(size) {
  return customIconConfig.recycleBin ? customImgIcon(customIconConfig.recycleBin, size) : trashIcon(size);
}

/* ============ sound_set.json: 상황별 알림음 (요청 #122) ============
   메뉴 메이커의 "사운드" 탭에서 편집하고, bootstrap.js가 부팅 시 loadSoundSetConfig()로 읽어와
   applySoundSetConfig()로 이 변수에 채워 넣는다. 키는 아래 DF_SOUND_SCENARIOS에 나열된 시나리오
   식별자, 값은 소리 파일의 URL 또는 base64 데이터 URI다(비어 있으면 그 상황엔 소리를 재생하지
   않음 - 기본값은 전부 무음). 이 앱에서 실제로 구분해 소리를 낼 수 있는 모든 경우를 나열한다. */
const DF_SOUND_SCENARIOS = [
  { key: "notify_success", label: "일반 알림(성공)", hint: "대부분의 성공 토스트(기본 종류)" },
  { key: "notify_info", label: "안내 알림", hint: "정보성 안내 토스트" },
  { key: "notify_warn", label: "경고/오류 알림", hint: "실패·경고 토스트 전체" },
  { key: "download_start", label: "다운로드 시작", hint: "저장 위치 선택 등 다운로드가 시작될 때" },
  { key: "download_complete", label: "다운로드 완료", hint: "파일/폴더 다운로드가 끝났을 때" },
  { key: "download_cancel", label: "다운로드 취소", hint: "사용자가 저장 위치 선택 등을 취소했을 때" },
  { key: "download_error", label: "다운로드 오류", hint: "다운로드 중 네트워크 등 오류가 났을 때" },
  { key: "delete_to_recyclebin", label: "휴지통으로 삭제", hint: "파일/폴더를 휴지통으로 옮길 때" },
  { key: "recyclebin_empty", label: "휴지통 비우기", hint: "휴지통을 완전히 비웠을 때" },
  { key: "restore_from_recyclebin", label: "휴지통에서 복원", hint: "휴지통의 항목을 되돌렸을 때" },
  { key: "move_or_copy", label: "이동/복사/이름변경 완료", hint: "드래그 이동, 붙여넣기, 이름 변경이 끝났을 때" },
  { key: "copy_to_clipboard", label: "클립보드에 복사", hint: "복사/잘라내기, 주소·경로 복사" },
  { key: "webhook_connected", label: "로컬 헬퍼(웹훅) 연결됨", hint: "로컬 헬퍼가 처음 확인(ping)됐을 때" },
  { key: "window_open", label: "탐색기 창 열기", hint: "탐색기 창이 열릴 때" },
  { key: "window_close", label: "탐색기 창 닫기", hint: "탐색기 창이 닫힐 때" },
  { key: "window_minimize", label: "창 최소화", hint: "탐색기 창을 최소화할 때" },
  { key: "window_maximize_restore", label: "창 최대화/복원", hint: "탐색기 창을 최대화하거나 원래 크기로 되돌릴 때" },
  { key: "error_generic", label: "일반 오류", hint: "이름 충돌 등 조작이 거부되는 일반 오류" }
];
let soundSetConfig = {};
function applySoundSetConfig(sounds) {
  soundSetConfig = (sounds && typeof sounds === "object") ? sounds : {};
}
// 같은 소리(같은 src 문자열)를 매번 새 Audio()로 만들지 않고 재사용한다 - 짧은 시간에 반복
// 재생되어도(연속 삭제 등) currentTime을 되돌려서 처음부터 다시 재생한다.
const dfSoundCache = {};
function dfsPlaySound(scenarioKey) {
  const src = soundSetConfig[scenarioKey];
  if (!src) return; // 그 상황에 소리가 지정 안 돼 있으면(기본값) 조용히 아무것도 하지 않는다
  try {
    let audio = dfSoundCache[src];
    if (!audio) { audio = new Audio(src); dfSoundCache[src] = audio; }
    audio.currentTime = 0;
    audio.play().catch(() => {}); // 브라우저 자동재생 정책 등으로 실패해도 부수 기능이니 조용히 무시
  } catch (e) { /* 무시 */ }
}

/* ============ 메뉴 메이커 로컬 반영(요청 #123) ============
   "메뉴 메이커에서 로컬 반영이 우선이고, json을 업로드해서 불러오면 로컬 스토리지를 다시
   덮어씀. 메뉴 추가/수정 시 로컬스토리지에 바로 반영되어야 즉시 테스트 가능" - 편집할 때마다
   (가져오기 포함) 그 내용을 여기 정의된 키로 localStorage에 바로 써두면, 실제 파일을 아직
   저장소에 반영하지 않았어도 이 브라우저에서는 즉시 반영된 걸로 취급해 테스트할 수 있다(로더가
   실제 파일보다 이 값을 먼저 확인 - settings-startmenu.js의 loadMenuSetConfig 등 참고).
   요청 #135로 메뉴 메이커가 별개의 새 탭이 아니라 이 문서 자신 안의 앱 내 창이 된 뒤로는, 이
   함수들을 menu-maker.js용으로 따로 복사해 넣을 필요가 없어졌다(같은 전역 스코프를 그냥 공유).
   대신 메인 화면을 즉시 다시 그리는 부분은 storage 이벤트(다른 문서에서 바뀔 때만 옴)가 아니라
   menu-maker.js의 persistLocalOverride가 settings-startmenu.js의 dfDebouncedLsRefresh를 직접
   불러 처리한다(그 파일의 storage 리스너 주석 참고). */
function dfLsMenuKey() { return "dfLocalMenuSetV1"; }
function dfLsIconKey() { return "dfLocalIconSetV1"; }
function dfLsIconSkinPrefix() { return "dfLocalIconSetSkinV1:"; }
function dfLsIconSkinKey(skinName) { return dfLsIconSkinPrefix() + (skinName || "win7"); }
function dfLsSoundKey() { return "dfLocalSoundSetV1"; }
function dfReadLocalOverride(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed : null;
  } catch (e) {
    return null; // 저장된 값이 깨졌어도 조용히 무시하고 실제 파일을 쓰게 한다
  }
}
function dfWriteLocalOverride(key, jsonText) {
  try { localStorage.setItem(key, jsonText); } catch (e) { /* 저장공간 부족 등은 조용히 무시(부수 기능) */ }
}
function dfClearLocalOverride(key) {
  try { localStorage.removeItem(key); } catch (e) { /* 무시 */ }
}

/* ============ 전체화면 자동 진입/해제 (요청 #128) ============
   "환경설정에 '페이지 로드시 전체화면' 옵션(기본 켬). 새 탭을 여는 모든 기능/링크를 누르면
   전체화면을 먼저 풀고 열며, 그 탭에서 돌아오면 다시 자동으로 전체화면(사용자가 직접 푼 경우는
   제외)." - 브라우저는 사용자 동작(클릭 등) 없이는 전체화면 API를 거부하므로, "로드시 전체화면"은
   실제로는 로드 후 첫 클릭에 들어가는 식으로 구현한다(dfArmFullscreenOnNextClick). 새 탭/링크를
   여는 모든 곳은 dfOpenNewTab()을 거치게 해서 열기 직전에 전체화면을 풀고, 그 탭에서 돌아오면
   (visibilitychange) 다시 들어간다 - 단, 사용자가 Esc/F11 등으로 "직접" 뺀 경우는 우리가 부른 게
   아니므로 dfFsUserOptedOut을 세워 그 뒤로는 자동으로 다시 넣지 않는다(설정을 다시 켜면 해제). */
let dfFsIntentionalExit = false; // 우리가(새 탭을 열려고) 지금 exitFullscreen()을 부르는 중인지
let dfFsWantReenter = false;     // 그 탭에서 돌아오면 다시 전체화면으로 들어가야 하는지
let dfFsUserOptedOut = false;    // 사용자가 직접 전체화면을 뺐으면(그 뒤로 이 세션에서는 자동으로 안 넣음)
let dfFsArmedForClick = false;   // 다음 클릭에 전체화면 요청을 걸어둔 상태인지(중복 등록 방지)
function dfIsFullscreen() { return !!document.fullscreenElement; }
function dfRequestFullscreenQuiet() {
  try {
    const p = document.documentElement.requestFullscreen();
    if (p && p.catch) p.catch(() => {}); // 아직 사용자 동작이 인정 안 된 상태 등은 조용히 무시
  } catch (e) { /* 무시 */ }
}
// 다음 클릭 한 번에 전체화면 요청을 걸어둔다(로드 직후, 또는 다른 탭에서 돌아온 뒤 자동 재진입이
// 제스처 부족으로 막혔을 때의 대비책 - 둘 다 "클릭하면 바로 들어간다"로 자연스럽게 이어진다).
function dfArmFullscreenOnNextClick() {
  if (dfFsArmedForClick) return;
  dfFsArmedForClick = true;
  const handler = () => {
    dfFsArmedForClick = false;
    document.removeEventListener("click", handler, true);
    if (!settings.fullscreenOnLoad || dfFsUserOptedOut || dfIsFullscreen()) return;
    dfRequestFullscreenQuiet();
  };
  document.addEventListener("click", handler, true);
}
// 새 탭/링크를 여는 곳은 전부 이 함수를 거쳐서 window.open을 부른다 - 실제로 열기 직전에 지금
// 전체화면이면 풀어준다(전체화면 상태에서 새 탭이 뜨면 어색하고, 팝업 크기 지정도 무의미해짐).
function dfExitFullscreenForNewTab() {
  if (!dfIsFullscreen()) return;
  dfFsIntentionalExit = true;
  try {
    const p = document.exitFullscreen();
    if (p && p.catch) p.catch(() => { dfFsIntentionalExit = false; });
  } catch (e) { dfFsIntentionalExit = false; }
}
function dfOpenNewTab(url, target, features) {
  dfExitFullscreenForNewTab();
  return window.open(url, target, features);
}
// fullscreenchange로 "누가" 뺐는지 구분한다: dfFsIntentionalExit가 서 있으면 우리가 새 탭을 열려고
// 뺀 것(돌아오면 다시 넣어야 함), 아니면 사용자가 직접(Esc, F11, 브라우저 UI 등으로) 뺀 것(그
// 뒤로는 자동으로 다시 넣지 않음).
function dfSetupFullscreenAutoManagement() {
  document.addEventListener("fullscreenchange", () => {
    if (dfIsFullscreen()) { dfFsWantReenter = false; return; }
    if (dfFsIntentionalExit) {
      dfFsIntentionalExit = false;
      dfFsWantReenter = true;
    } else {
      dfFsUserOptedOut = true;
      dfFsWantReenter = false;
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (!settings.fullscreenOnLoad || dfFsUserOptedOut || !dfFsWantReenter || dfIsFullscreen()) return;
    dfRequestFullscreenQuiet(); // 탭 전환 자체가 사용자 동작으로 인정되는 경우도 있어 일단 시도
    dfArmFullscreenOnNextClick(); // 안 되면(대부분) 다음 클릭에 확실히 들어가게 대비
  });
  if (settings.fullscreenOnLoad) dfArmFullscreenOnNextClick();
  // <a target="_blank"> 같은 진짜 링크 클릭(JS의 window.open이 아닌 것)도 캡처링 단계에서 잡아서
  // 새 탭이 열리기 전에 전체화면을 풀어준다 - 링크의 기본 동작(새 탭 열기)은 그대로 두고 병행한다.
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[target="_blank"]');
    if (a) dfExitFullscreenForNewTab();
  }, true);
}

function isHtml(name) { return /\.html$/i.test(name); }
function isMd(name) { return /\.md$/i.test(name); }
// 내용창/트리/검색 결과가 항목의 종류(type)를 다 같은 규칙으로 정하도록 한 곳에 모아둔다 - html은
// 기본적으로 "저장소에서 보기"(호스팅된 실제 페이지)가 아니라 다른 파일처럼 열기/다운로드 기본
// 동작을 따르고(사용자 지시), md는 더블클릭 기본 동작이 내장 에디터로 열기가 되도록(활성화
// 로직인 activate()에서 이 type 값으로 분기) 별도 종류로 구분해둔다.
function fileTypeFor(name) { return isHtml(name) ? "html" : isMd(name) ? "md" : "file"; }
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ============ 바탕화면을 트리/경로에 포함시키기 위한 예약 세그먼트 ============
   실제 탐색기의 경로는 항상 "이름의 배열"이다(currentPath, history, dirCache 키, 트리,
   해시 프래그먼트, localStorage 마지막 경로 전부 동일한 방식). 바탕화면(가상 파일시스템)도
   같은 방식으로 다루기 위해, 경로의 첫 번째 칸이 이 예약된 이름이면 "바탕화면 안"이라는
   뜻으로 취급한다 - dfsUniqueName이 같은 부모 안에서 이름을 항상 유일하게 보장하므로,
   진짜 저장소 경로와 완전히 같은 방식(이름만으로 매번 다시 찾기)으로 동작할 수 있다.
   기존 탐색기와 바탕화면(가상) 탐색기를 하나의 창으로 통합하기 위한 기반(사용자 지시). ============ */
// 사용자 지시: "바탕화면"이 아니라 "바탕 화면"(띄어쓰기 있음)이 실제 윈도우 표기와 일치함.
const DESKTOP_TREE_NAME = "바탕 화면";
function isDesktopPath(pathArr) { return pathArr.length > 0 && pathArr[0] === DESKTOP_TREE_NAME; }
// 요청 #113 - 사용자 지시: "휴지통도 탐색기에 합쳐라(그냥 트리에 들어있는거 말고 폴더처럼)".
// 바탕화면과 완전히 같은 방식(예약된 경로 첫 칸)으로 휴지통도 진짜 탐색기 경로처럼 다룬다 -
// dexie 안에서는 그냥 parentId가 DFS_RECYCLEBIN_ROOT인 또 다른 "루트"일 뿐이다.
const RECYCLEBIN_TREE_NAME = "휴지통";
function isRecycleBinPath(pathArr) { return pathArr.length > 0 && pathArr[0] === RECYCLEBIN_TREE_NAME; }
// 바탕화면이든 휴지통이든 - "실제 저장소가 아니라 dexie로 읽어야 하는 경로인가?"를 함께 물어야
// 하는 곳(loadDir 라우팅, 캐시 무효화 등)에서 쓴다.
function isDfsPath(pathArr) { return isDesktopPath(pathArr) || isRecycleBinPath(pathArr); }

/* ============ 색인 제외 규칙 (indexer.ahk가 이미 거르지만, html도 자체적으로 한번 더 거른다) ============
   - 이름에 "_NIH_"가 포함되면(대소문자 무관) 모든 위치에서 제외
     -> indexer.ahk/localserver.ahk/menu_set.json 등/index.html의 JS·CSS는 전부 _NIH_ROOT_
        폴더 안(_NIH_ROOT_/index/menu_set.json 등, _NIH_ROOT_/tools/indexer.ahk,
        _NIH_ROOT_/tools/localserver.ahk, _NIH_ROOT_/index/*.js, _NIH_ROOT_/index/ui/theme/*)에
        있으므로 이 규칙 하나로 자동으로 다 숨겨진다 - 따로 이름을 하나하나 예외 목록에 넣을 필요가 없다
        (사용자 지시로 단순화). 단, GitHub Pages가 이 폴더들을 실제로 서빙하려면 리포 루트에
        .nojekyll 빈 파일이 있어야 한다(Jekyll이 기본적으로 "_"로 시작하는 폴더를 빌드에서 빼버림).
   - "pages.json"은 모든 위치에서 제외
   - 루트에서는 .git / index.html / README.md / 바탕화면 도 추가로 제외
     ("바탕화면"은 트리에 별도 최상위 항목으로 추가되므로, 실제로 같은 이름의 저장소 폴더가 있어도
     루트 목록에는 나타나지 않게 한다 - 이름 충돌 방지. README.md는 GitHub이 저장소 페이지에서
     알아서 보여주는 설명용 파일이라 이 앱 자체 탐색기에는 중복으로 나타날 필요가 없다 - 사용자 지시)
============================================================================================= */
function filterNames(names, pathArr) {
  const isRoot = pathArr.length === 0;
  // 대소문자를 가리지 않고 비교한다 - 예를 들어 실제 저장소의 README 파일이 "readme.md"처럼
  // 소문자로 돼 있으면 정확히 "README.md"와만 비교하는 대소문자 구분 비교로는 못 걸러낸다(버그
  // 리포트: 루트에서 readme.md가 계속 보임). .nojekyll(GitHub Pages가 _NIH_ 폴더를 서빙하게
  // 해주는 설정 파일 - index.html 주석 참고)도 사용자용 색인에는 나올 이유가 없는 저장소 관리용
  // 파일이라 같이 숨긴다.
  const rootOnly = new Set([".git", "index.html", "readme.md", ".nojekyll", DESKTOP_TREE_NAME.toLowerCase(), RECYCLEBIN_TREE_NAME.toLowerCase()]);
  return names.filter(name => {
    if (/_NIH_/i.test(name)) return false;
    if (name === "pages.json") return false;
    if (isRoot && rootOnly.has(name.toLowerCase())) return false;
    return true;
  });
}

/* ============ 상태 ============ */
let repoName = "";
const dirCache = new Map();     // pathKey -> {folders:[...], files:[...]}
let currentPath = [];           // 내용창(오른쪽)에 열려있는 폴더
let selected = null;            // {path, name, type}
let multiSelected = new Set();  // 드래그 다중 선택된 항목들의 path key (내용창)
let expanded = new Set();       // 탐색창(왼쪽)에서 펼쳐진 폴더 pathKey
let treeFileHighlightKey = null; // 탐색창(왼쪽)에서 파란 포커스로 강조 중인 "파일" 행의 pathKey (내용창 선택과는 별개)
let treeFocusKey = null; // 방향키로 옮겨다니는 중인 "키보드 포커스" 행의 key (점선 테두리) - 파란 선택(치)과는 별개.
                          // 실제 윈도우처럼, 방향키는 이 포커스만 옮기고 엔터를 눌러야 비로소 선택(파란 박스)이 확정된다.
let history = [];               // 앱 자체 뒤로/앞으로 스택 (window.history와 다름, 이름 겹침 주의)
let historyIndex = -1;
let currentItems = [];          // 현재 내용창에 그려진 항목들
let currentOpts = {};
let currentHeading = null;
let statusFlashTimer = null;
let toastTimer = null;
let openSubmenuEls = [];

const els = {};
// 요청 #136: 환경설정 패널이 고정 오버레이(#settingsOverlay)에서 앱 내 창(app-window.js)으로
// 바뀌면서, 그 안의 입력들(setTheme/setDoubleClick/...)은 더 이상 페이지 로드 시점에 고정으로
// 존재하지 않는다(창을 열 때만 새로 만들어짐) - 그래서 이 정적 els 목록에서 뺐다. settings-startmenu.js의
// dfInitSettingsWindow(handle)가 열릴 때마다 handle.bodyEl 기준으로 새로 찾아 쓴다.
// settingsMenuRow(시작 메뉴의 "설정" 항목 자체)는 항상 고정으로 있으므로 그대로 둔다.
["winTitle","btnMin","btnMax","btnClose","btnNavToggle","btnBack","btnForward","btnUp",
 "btnRefresh","breadcrumb","searchInput","navPane","contentPane","statusText","repoLink",
 "win","taskbarApp","clock","batteryWidget","weatherWidget","titlebar","startBtn","startMenu","startAvatar","startUserName","dfIconLayer",
 "startUserLink","startApps","trayIcons","toast","settingsMenuRow","themeLink"
].forEach(id => els[id] = document.getElementById(id));
