/* ============ 폴더 데이터 로드 (꼬리에 꼬리를 무는 방식 + 로컬 캐시) ============
   사용자 리포트: "폴더 눌러도 반응이 없다 / 열기를 눌러도 캔슬되거나 빈 폴더로 나온다" -
   원인 두 가지를 같이 고쳤다.
   1) localStorage 캐시(readCache)를 예전엔 내용이 비어있어도(폴더/파일 모두 0개) 무조건
      신뢰하고 그대로 돌려줬다. 그런데 pages.json이 아직 갱신되기 전(색인이 안 된 상태)에 한
      번이라도 빈 상태로 캐시가 만들어지면, 그 뒤로 실제 내용이 생겨도 영원히 "빈 폴더"만 보이는
      문제가 있었다 - 이제 캐시가 비어있으면 신뢰하지 않고 다시 읽는다("로컬 저장소는 빠르니까"
      매번 다시 확인해도 부담이 없다).
   2) pages.json 요청 자체가 응답하지 않고 멈춰버리면(네트워크 문제 등) 그걸 기다리는 동안 클릭이
      "반응 없음"처럼 보였다 - 이제 5초 타임아웃을 걸어서, 그 안에 응답이 없으면 GitHub API로
      직접 폴더 내용을 읽어오는 것으로 자동 대체한다(최후 수단). ============ */
async function loadDir(pathArr) {
  // 바탕화면(가상 파일시스템) 경로는 실제 저장소 pages.json이 아니라 dexie에서 읽는다 - 그 외
  // 나머지 경로/트리/내용창/방향키 로직은 전부 그대로 재사용된다(경로가 이름의 배열이라는
  // 점은 동일하기 때문). dirCache에도 똑같이 채워 넣어서 동기적으로 읽는 트리 그리기 함수들이
  // 그대로 동작하게 한다.
  if (isDesktopPath(pathArr)) return loadDesktopDir(pathArr);
  const key = pathArr.join("/");
  if (dirCache.has(key)) return dirCache.get(key);

  const cached = readCache(pathArr);
  if (cached && (cached.folders.length > 0 || cached.files.length > 0)) {
    dirCache.set(key, cached);
    return cached;
  }

  const prefix = pathArr.map(encodeURIComponent).join("/");
  const url = (prefix ? prefix + "/" : "") + "pages.json";
  let entry;
  try {
    const res = await fetchWithTimeout(url, 5000);
    if (!res.ok) throw new Error(`${url} 로드 실패: ${res.status}`);
    const data = await res.json();
    const folders = filterNames(Array.isArray(data.folders) ? data.folders : [], pathArr)
      .sort((a, b) => a.localeCompare(b, "ko"));
    // indexer.ahk가 파일마다 {name, size} 객체로 저장한다(웹훅 다운로드에 크기가 필요해서).
    // 혹시 예전 방식(순수 문자열 배열)의 pages.json이 섞여 있어도 방어적으로 처리한다.
    const rawFiles = Array.isArray(data.files) ? data.files : [];
    const fileObjs = rawFiles.map(f => typeof f === "string" ? { name: f, size: 0 } : { name: String(f.name || ""), size: Number(f.size) || 0 });
    const keptNames = new Set(filterNames(fileObjs.map(f => f.name), pathArr));
    const files = fileObjs.filter(f => keptNames.has(f.name)).sort((a, b) => a.name.localeCompare(b.name, "ko"));
    entry = { folders, files };
  } catch (e) {
    // pages.json이 5초 안에 응답하지 않거나(타임아웃) 요청 자체가 실패하면, 최후 수단으로
    // GitHub API에서 직접 읽어온다. 이것마저 실패하면(owner/repo를 모르거나 API 오류) 그대로
    // 오류를 던진다 - 호출하는 쪽(resolveInitialPath 등)이 이미 이 경우를 처리하고 있다.
    entry = await fetchGithubDirEntry(pathArr);
  }
  dirCache.set(key, entry);
  writeCache(pathArr, entry);
  return entry;
}
// AbortController로 시간 제한을 건 fetch - 응답이 없으면(타임아웃) AbortError로 실패해서
// 호출한 쪽의 catch로 넘어간다.
function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { cache: "no-store", signal: controller.signal }).finally(() => clearTimeout(timer));
}
// pages.json 대신 GitHub Contents API에서 직접 폴더 내용을 읽어 loadDir()과 같은
// {folders, files} 모양으로 돌려준다(최후 수단 - pages.json이 응답하지 않을 때만 쓰인다).
// keyboard-and-activate.js의 fetchGithubListing()은 "색인과 비교"용으로 이름만 필요해서
// 별개로 남겨뒀다(이쪽은 실제로 폴더를 그려야 하므로 type/size까지 필요).
async function fetchGithubDirEntry(pathArr) {
  const { owner, repo } = getOwnerRepo();
  if (!owner || !repo) throw new Error("owner/repo를 알 수 없습니다.");
  const apiPath = pathArr.map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${apiPath}`;
  const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  const folders = filterNames(list.filter(it => it.type === "dir").map(it => it.name), pathArr)
    .sort((a, b) => a.localeCompare(b, "ko"));
  const fileEntries = list.filter(it => it.type === "file").map(it => ({ name: it.name, size: Number(it.size) || 0 }));
  const keptFileNames = new Set(filterNames(fileEntries.map(f => f.name), pathArr));
  const files = fileEntries.filter(f => keptFileNames.has(f.name)).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return { folders, files };
}

/* ---------------- 바탕화면(가상 파일시스템) 경로 읽기 ----------------
   pathArr[0]이 DESKTOP_TREE_NAME인 경로를 dexie에서 읽어 loadDir()과 완전히 같은
   {folders:[이름,...], files:[{name,size,...},...]} 모양으로 돌려준다. 진짜 저장소와 달리
   폴더 이름만으로는 다시 조회하기 번거로우므로(매번 상위부터 걸어 내려가야 함), 여기서 만든
   folderNodes(Map) / files[].dfsNode 를 통해 각 항목의 실제 dexie id를 렌더링 쪽에 그대로
   실어 보낸다 - 우클릭 메뉴/드래그앤드롭 등에서 매번 다시 조회하지 않아도 되게 하기 위함.
   (localStorage에는 캐싱하지 않는다 - dexie 자체가 이미 로컬에 영구 저장되는 정본이기 때문.) */
async function dfsResolvePathToFolderId(pathArr) {
  // pathArr는 DESKTOP_TREE_NAME으로 시작하는 전체 경로. 반환값은 그 마지막 폴더의 dexie id
  // (DESKTOP_TREE_NAME 하나만 있으면 바탕화면 자기 자신 = DFS_DESKTOP_ROOT).
  if (!dfsDb) return null;
  let cur = DFS_DESKTOP_ROOT;
  for (let i = 1; i < pathArr.length; i++) {
    const kids = await dfsDb.nodes.where("parentId").equals(cur).toArray();
    const hit = kids.find(k => k.type === "folder" && k.name === pathArr[i]);
    if (!hit) return null;
    cur = hit.id;
  }
  return cur;
}
async function dfsNodeAtPath(pathArr) {
  // pathArr는 DESKTOP_TREE_NAME으로 시작. 마지막 항목은 폴더/파일/바로가기 무엇이든 될 수 있다.
  if (!dfsDb || !isDesktopPath(pathArr) || pathArr.length < 2) return null;
  const parentId = await dfsResolvePathToFolderId(pathArr.slice(0, -1));
  if (parentId == null) return null;
  const kids = await dfsDb.nodes.where("parentId").equals(parentId).toArray();
  return kids.find(k => k.name === pathArr[pathArr.length - 1]) || null;
}
async function loadDesktopDir(pathArr) {
  const key = pathArr.join("/");
  if (!dfsDb) { const entry = { folders: [], files: [] }; dirCache.set(key, entry); return entry; }
  const folderId = await dfsResolvePathToFolderId(pathArr);
  if (folderId == null) {
    dirCache.delete(key);
    throw new Error("폴더를 찾을 수 없습니다(삭제되었거나 이름이 바뀌었을 수 있음).");
  }
  const kids = await dfsChildren(folderId);
  const folderKids = kids.filter(k => k.type === "folder");
  const fileKids = kids.filter(k => k.type !== "folder");
  const folders = folderKids.map(k => k.name);
  const folderNodes = new Map(folderKids.map(k => [k.name, k]));
  const files = fileKids.map(k => ({
    name: k.name,
    size: k.type === "file" ? new Blob([k.content || ""]).size : 0,
    dfsNode: k
  }));
  const entry = { folders, files, folderNodes, dfsFolderId: folderId };
  dirCache.set(key, entry);
  return entry;
}

/* ============ 경로 <-> 주소창 플래그먼트(#...) ============
   형식: #<현재경로>|tree=<펼쳐진 트리 폴더 목록(콤마로 구분, 각각 encodeURIComponent)>
   |tree= 부분이 없으면 예전처럼 경로만 있는 것으로 취급(하위호환). ============ */
function pathToHash(pathArr) { return pathArr.map(encodeURIComponent).join("/"); }
function splitHash(hash) {
  const h = (hash || "").replace(/^#/, "");
  const idx = h.indexOf("|tree=");
  if (idx === -1) return { pathPart: h, treePart: "" };
  return { pathPart: h.slice(0, idx), treePart: h.slice(idx + 6) };
}
function hashToPath(hash) {
  const { pathPart } = splitHash(hash);
  if (!pathPart) return null;
  return pathPart.split("/").filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (e) { return s; } });
}
function hashToExpandedSet(hash) {
  const { treePart } = splitHash(hash);
  if (!treePart) return null;
  const set = new Set();
  treePart.split(",").filter(Boolean).forEach(enc => {
    try { set.add(decodeURIComponent(enc)); } catch (e) { /* 무시 */ }
  });
  return set;
}
function encodeExpandedForHash() {
  return [...expanded].map(encodeURIComponent).join(",");
}
function updateHashFragment() {
  const pathPart = pathToHash(currentPath);
  const treePart = encodeExpandedForHash();
  const hash = treePart ? `${pathPart}|tree=${treePart}` : pathPart;
  try { window.history.replaceState(null, "", "#" + hash); } catch (e) {}
}
function expandedStorageKey() { return `idx:${repoName}:expandedTree`; }
function loadExpandedFromStorage() {
  try {
    const raw = localStorage.getItem(expandedStorageKey());
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return new Set(arr); }
  } catch (e) { /* 무시 */ }
  return new Set();
}
function persistExpanded() {
  try { localStorage.setItem(expandedStorageKey(), JSON.stringify([...expanded])); } catch (e) {}
  // 주소창 플래그먼트(#경로|tree=...)는 탐색창(사이드바)이 접혀 있어도 항상 갱신한다(사용자 지시 -
  // "트리 닫아도 트리 기록 지우지 말고"). 사이드바를 접는 건 그냥 레이아웃 토글일 뿐, 위치/펼침
  // 기록과는 무관하다. 기록 자체가 완전히 사라지는 경우는 창을 아예 닫을 때뿐이다(btnClose 참고).
  updateHashFragment();
}
function isNavPaneOpen() { return !!(els.navPane && els.navPane.classList.contains("open")); }
function clearHashFragment() {
  try { window.history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
function openNavPane() {
  els.navPane.classList.add("open");
  updateHashFragment(); // 열자마자 지금 위치/펼침 상태를 주소창에 반영한다
}
function closeNavPane() {
  els.navPane.classList.remove("open");
  // 사이드바만 접는 것 - 주소창 플래그먼트(위치/트리 펼침 기록)는 그대로 둔다(사용자 지시).
  // 완전히 지우는 건 창을 닫을 때뿐(els.btnClose.onclick의 clearHashFragment() 참고).
}
/* 좁은 화면(오버레이 방식)에서 트리의 폴더를 클릭해 이동하면, 실제 모바일 탐색기 앱처럼 그 자리에서
   탐색창을 자동으로 접어 내용을 바로 보여준다. 넓은 화면(항상 옆에 두고 쓰는 형태)에서는 폴더를
   클릭할 때마다 탐색창이 접히면 오히려 불편하므로 이 자동 닫힘을 적용하지 않는다. */
function closeNavPaneIfNarrow() {
  if (window.matchMedia("(max-width: 720px)").matches) closeNavPane();
}
async function resolveInitialPath(pathArr) {
  let p = (pathArr || []).slice();
  while (p.length > 0) {
    try { await loadDir(p); return p; } catch (e) { p = p.slice(0, -1); }
  }
  return [];
}
/* 경로를 트리에서 "드러낸다" - 조상 경로를 전부 펼침 상태로 추가하고, 각 단계의 폴더 목록을
   실제로 읽어와서(caching) buildTreeDom이 "불러오는 중..."이 아니라 진짜 하위 폴더를 그릴 수 있게 한다. */
async function revealPath(pathArr) {
  // 트리 맨 위(저장소 루트)는 화살표 없이 dirCache.get("")만 있으면 renderNavPane이 곧장 그
  // 자식들을 그린다(buildTreeDom 참고) - 그런데 아래 for문은 pathArr의 "조상 경로"만 차례로
  // 읽어오다 보니 pathArr 자체가 빈 배열이 아닌 이상 빈 문자열("")은 한 번도 안 읽는다. 그래서
  // 주소창에 이미 폴더 경로가 있는 채로(예: #Games|tree=Tools, 공유된 링크 등) 시작하면 트리
  // 최상위가 텅 빈 채로 남는 버그가 있었다(경로가 없을 때만 우연히 내용창 쪽에서 루트를 따로
  // 읽어서 정상으로 보였음). 여기서 무조건 한 번 먼저 읽어서 항상 채워둔다.
  await loadDir([]).catch(() => {});
  for (let i = 0; i < pathArr.length; i++) {
    const prefix = pathArr.slice(0, i + 1);
    // 조상까지만 펼침 상태로 추가한다 - 마지막 항목(=지금 막 들어간 폴더 "본인")은 펼치지 않는다.
    // 실제 윈도우 탐색기와 동일하게, 폴더로 들어가는 것(선택+이동)과 트리에서 그 폴더 자체를
    // 펼치는 것(화살표를 눌러 그 하위를 보는 것)은 서로 다른 동작이다.
    if (i < pathArr.length - 1) expanded.add(prefix.join("/"));
    try { await loadDir(prefix); } catch (e) { break; }
  }
  persistExpanded();
}

/* ============ 탐색 (뒤로/앞으로/위로/새로고침) ============
   실시간으로 트리가 현재 위치를 따라간다 - 더블클릭으로 더 깊은 폴더에 들어가면(바보\보바\비보처럼
   계속 파고들면) 그 즉시 조상 폴더들이 트리에서 펼쳐지고 현재 폴더가 파란색으로 선택 표시된다.
   (한 번 펼쳐진 가지는 다른 곳으로 이동해도 자동으로 접히지 않는다 - 실제 탐색기와 동일) ============ */
async function navigate(path, record = true) {
  currentPath = path;
  selected = null;
  multiSelected.clear();
  treeFileHighlightKey = null; // 폴더로 이동하면 트리의 파란 선택 박스는 하나만 있어야 하므로 파일 강조는 해제
  treeFocusKey = null; // 선택이 새로 확정됐으니, 다음 방향키는 이 새 위치부터 다시 포커스를 잡는다
  els.searchInput.value = "";
  if (record) {
    history = history.slice(0, historyIndex + 1);
    history.push(path);
    historyIndex = history.length - 1;
  }
  await revealPath(path);
  try { localStorage.setItem(lastPathKey(), JSON.stringify(path)); } catch (e) {}
  renderBreadcrumb();
  await renderContentPane();
  renderNavPane();
}
function goBack() { if (historyIndex > 0) { historyIndex--; navigate(history[historyIndex], false); } }
function goForward() { if (historyIndex < history.length - 1) { historyIndex++; navigate(history[historyIndex], false); } }
els.btnBack.onclick = goBack;
els.btnForward.onclick = goForward;
els.btnUp.onclick = () => { if (currentPath.length > 0) navigate(currentPath.slice(0, -1)); };

