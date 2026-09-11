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
  window.open(`https://github.com/${owner}/${repo}/blob/${branch}/${githubItemPath(it)}`, "_blank", "noopener,noreferrer");
}
// "Pages에서 보기" - raw 파일 URL을 그대로 새 탭에 띄운다. 텍스트/이미지는 브라우저가 그대로 보여준다
// (다운로드가 아니라 "그 페이지 자체를 보는" 용도 - 강제 다운로드는 아래 downloadFromGithub가 담당).
async function viewOnPages(it) {
  const url = await githubRawUrl(it);
  window.open(url, "_blank", "noopener,noreferrer");
}
// "GitHub에서 다운로드" - 단순 링크 이동이 아니라 fetch로 받아서 blob으로 강제 저장한다.
// (raw.githubusercontent.com은 텍스트/이미지를 그냥 열어버리기 때문에, 링크 이동만으로는 다운로드가 안 됨)
async function downloadFromGithub(it) {
  const url = await githubRawUrl(it);
  showToast(`브라우저에서 다운로드 중: ${it.name}`);
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
    showToast(`다운로드 완료: ${it.name}`);
  } catch (e) {
    showToast(`GitHub 다운로드 오류: ${e.message}`, { kind: "warn" });
  }
}

function isHtml(name) { return /\.html$/i.test(name); }
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
const DESKTOP_TREE_NAME = "바탕화면";
function isDesktopPath(pathArr) { return pathArr.length > 0 && pathArr[0] === DESKTOP_TREE_NAME; }

/* ============ 색인 제외 규칙 (indexer.ahk가 이미 거르지만, html도 자체적으로 한번 더 거른다) ============
   - 이름에 "_NIH_"가 포함되면(대소문자 무관) 모든 위치에서 제외
     -> indexer.ahk/localserver.ahk/start.json/tray.json은 전부 _NIH_ROOT_ 폴더 안(정확히는
        _NIH_ROOT_/start.json, _NIH_ROOT_/tray.json, _NIH_ROOT_/tools/indexer.ahk,
        _NIH_ROOT_/tools/localserver.ahk)에 있으므로 이 규칙 하나로 자동으로 다 숨겨진다 -
        따로 이름을 하나하나 예외 목록에 넣을 필요가 없다(사용자 지시로 단순화).
   - "pages.json"은 모든 위치에서 제외
   - 루트에서는 .git / index.html / 바탕화면 도 추가로 제외
     ("바탕화면"은 트리에 별도 최상위 항목으로 추가되므로, 실제로 같은 이름의 저장소 폴더가 있어도
     루트 목록에는 나타나지 않게 한다 - 이름 충돌 방지)
============================================================================================= */
function filterNames(names, pathArr) {
  const isRoot = pathArr.length === 0;
  const rootOnly = new Set([".git", "index.html", DESKTOP_TREE_NAME]);
  return names.filter(name => {
    if (/_NIH_/i.test(name)) return false;
    if (name === "pages.json") return false;
    if (isRoot && rootOnly.has(name)) return false;
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
["winTitle","btnMin","btnMax","btnClose","btnNavToggle","btnBack","btnForward","btnUp",
 "btnRefresh","breadcrumb","searchInput","navPane","contentPane","statusText","repoLink",
 "win","taskbarApp","clock","batteryWidget","weatherWidget","titlebar","startBtn","startMenu","startAvatar","startUserName","dfIconLayer",
 "startUserLink","startApps","trayIcons","toast","settingsMenuRow","settingsOverlay",
 "settingsCloseBtn","setGithubLinks","setDoubleClick","setKillHelperBtn","setDownloadHelperBtn",
 "setSearchScope","setSearchRelative","setPreloadAllBtn","setAeroEnabled",
 "setTrayIconCount","setTheme","themeLink"
].forEach(id => els[id] = document.getElementById(id));
