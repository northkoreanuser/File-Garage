/* ============ Alt+방향키 / Backspace = 뒤로·앞으로 가기 ============
   Alt+←/→(그리고 Alt+↑/↓)는 브라우저 자체의 "뒤로/앞으로 가기"와 겹쳐서, 그냥 두면
   진짜 탐색기/바탕화면/가상 탐색기 창 어디에서 눌러도 이 페이지를 벗어나 이전/다음
   사이트로 이동해버릴 수 있다. 그래서 전역(캡처 단계)에서 항상 기본 동작을 막고,
   대신 Alt+←/→는 진짜 탐색기의 자체 뒤로/앞으로 내비게이션으로 연결한다.
   Backspace도 같은 방식의 "뒤로가기" 단축키로 취급하되, 입력 중인 텍스트를 지우는
   본래 동작과 겹치지 않도록 input/textarea/contenteditable에 포커스가 있을 때는 제외한다. */
document.addEventListener("keydown", (e) => {
  if (e.altKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
    e.preventDefault();
    if (e.key === "ArrowLeft") goBack();
    else if (e.key === "ArrowRight") goForward();
    return;
  }
  if (e.key === "Backspace") {
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    const isEditable = tag === "input" || tag === "textarea" || (e.target && e.target.isContentEditable);
    if (!isEditable) { e.preventDefault(); goBack(); }
  }
  if (e.key === "F2") {
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    const isEditable = tag === "input" || tag === "textarea" || (e.target && e.target.isContentEditable);
    if (!isEditable) { e.preventDefault(); triggerF2Rename(); }
  }
  // Delete = 지금 선택된 항목 삭제. 실제 저장소 파일/폴더는 애초에 "삭제" 메뉴 자체가 없으므로
  // (읽기 전용) 자동으로 아무 일도 일어나지 않는다 - 바탕화면(가상 파일시스템) 항목에서만 동작한다.
  if (e.key === "Delete") {
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    const isEditable = tag === "input" || tag === "textarea" || (e.target && e.target.isContentEditable);
    if (!isEditable) { e.preventDefault(); triggerDeleteSelected(); }
  }
}, true);
/* F2 = 지금 선택된 항목 이름 변경(실제 윈도우 탐색기와 동일) - 바탕화면 아이콘에 포커스가 있으면
   그 아이콘을, 아니면 내용창(오른쪽)에 단일 선택된 항목을, 그것도 아니면 트리(왼쪽)에서 강조된
   파일이나 지금 선택된 폴더를 대상으로 한다. 메뉴를 직접 다시 만들지 않고 buildFileMenuItems()가
   이미 만드는 "이름 변경" 항목의 동작을 그대로 재사용한다(실제 저장소 항목처럼 메뉴 자체가 없으면
   아무 일도 일어나지 않는다). */
function triggerF2Rename() {
  if (document.activeElement === els.dfIconLayer) { dfsRenameSelectedIcon(); return; }
  const findRenameAction = (items) => { const found = items.find(it => it.label === "이름 변경"); return found ? found.action : null; };
  const navFocused = document.activeElement === els.navPane;
  if (!navFocused && selected && multiSelected.size <= 1) {
    const it = currentItems.find(i => i.path.join("/") === selected.path.join("/"));
    if (it) { const action = findRenameAction(buildFileMenuItems(it)); if (action) action(); }
    return;
  }
  if (treeFileHighlightKey !== null) {
    const entry = flattenVisibleTree().find(en => en.key === treeFileHighlightKey);
    if (entry && entry.item) { const action = findRenameAction(buildFileMenuItems(entry.item)); if (action) action(); }
    return;
  }
  if (currentPath.length > 0) {
    const it = { name: currentPath[currentPath.length - 1], path: currentPath, type: "folder" };
    const action = findRenameAction(buildFileMenuItems(it));
    if (action) action();
  }
}
/* Delete = 지금 선택된 항목 삭제. triggerF2Rename과 완전히 같은 구조로, 대상을 찾는 우선순위만
   그대로 재사용하고 찾는 메뉴 라벨만 "삭제"로 바꿨다. 바탕화면 아이콘은 여러 개 선택돼 있어도
   한 번에(확인 대화상자 하나로) 지울 수 있지만, 내용창(트리 통합) 쪽은 F2와 마찬가지로 단일
   선택일 때만 동작한다(다중 선택 시 확인 대화상자가 여러 개 겹쳐 뜨는 걸 피하기 위함). */
function triggerDeleteSelected() {
  if (document.activeElement === els.dfIconLayer) { dfsDeleteSelectedIcons(); return; }
  const findDeleteAction = (items) => { const found = items.find(it => it.label === "삭제"); return found ? found.action : null; };
  const navFocused = document.activeElement === els.navPane;
  if (!navFocused && selected && multiSelected.size <= 1) {
    const it = currentItems.find(i => i.path.join("/") === selected.path.join("/"));
    if (it) { const action = findDeleteAction(buildFileMenuItems(it)); if (action) action(); }
    return;
  }
  if (treeFileHighlightKey !== null) {
    const entry = flattenVisibleTree().find(en => en.key === treeFileHighlightKey);
    if (entry && entry.item) { const action = findDeleteAction(buildFileMenuItems(entry.item)); if (action) action(); }
  }
}

/* 새로고침 버튼: 페이지 새로고침이 아니라 "이 폴더" 캐시만 비우고 다시 읽기 + GitHub API로 일치 여부 확인 */
els.btnRefresh.onclick = async () => {
  const path = currentPath;
  // 바탕화면(가상 파일시스템) 경로는 애초에 GitHub 저장소와 무관한 로컬(dexie) 데이터이므로,
  // 실제 저장소용 "GitHub과 비교" 로직을 돌릴 이유가 없다 - 돌리면 owner/repo가 없거나
  // 엉뚱한 API 호출을 시도해 오류만 난다. 캐시만 비우고 다시 그린다.
  if (isDesktopPath(path)) {
    for (const k of [...dirCache.keys()]) {
      if (k === DESKTOP_TREE_NAME || k.startsWith(DESKTOP_TREE_NAME + "/")) dirCache.delete(k);
    }
    await revealPath(path).catch(() => {});
    await renderContentPane();
    renderNavPane();
    return;
  }
  clearCache(path);
  const [, ghResult] = await Promise.allSettled([
    renderContentPane(),
    fetchGithubListing(path)
  ]);
  renderNavPane();
  if (ghResult.status === "fulfilled") {
    compareWithIndex(path, ghResult.value);
  } else {
    showToast("GitHub 확인 실패: " + ghResult.reason.message, { kind: "warn" });
  }
};

async function fetchGithubListing(pathArr) {
  const { owner, repo } = getOwnerRepo();
  if (!owner || !repo) throw new Error("owner/repo를 알 수 없습니다.");
  const apiPath = pathArr.map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${apiPath}`;
  const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  const names = Array.isArray(data) ? data.map(it => it.name) : [];
  return filterNames(names, pathArr);
}
function compareWithIndex(pathArr, ghNames) {
  const entry = dirCache.get(pathArr.join("/")) || { folders: [], files: [] };
  const indexNames = [...entry.folders, ...entry.files.map(f => f.name)];
  const ghSet = new Set(ghNames);
  const idxSet = new Set(indexNames);
  const missing = ghNames.filter(n => !idxSet.has(n));   // GitHub엔 있는데 색인엔 없음
  const stale = indexNames.filter(n => !ghSet.has(n));   // 색인엔 있는데 GitHub엔 없음
  if (missing.length === 0 && stale.length === 0) {
    showToast("GitHub과 일치합니다.");
    return;
  }
  const lines = [];
  if (missing.length) lines.push(`색인에 없는 항목(GitHub엔 있음): ${missing.join(", ")}`);
  if (stale.length) lines.push(`색인에만 있는 항목(GitHub엔 없음): ${stale.join(", ")}`);
  showToast(lines.join("\n"), { kind: "warn", sticky: true });
}

/* 폴더 열기 / html 파일 열기(호스팅된 페이지) / 일반 파일은 환경설정의 더블클릭 동작을 따른다 */
async function activate(it) {
  // 바탕화면(가상 파일시스템) 파일/바로가기는 진짜 저장소 파일이 아니므로 dfs 전용 활성화
  // 로직(에디터 새 탭으로 열기 / 바로가기 따라가기)을 그대로 재사용한다.
  if (it.dfsNode) { dfsActivate(it.dfsNode); return; }
  const { path, type } = it;
  // 검색 결과 화면(currentOpts.flat)에서 점프해 들어가는 경우도 포함해서, navigate()가 실시간으로
  // 트리를 그 경로까지 펼쳐서 드러낸다(reveal).
  const isSearchJump = currentOpts.flat === true;
  if (type === "folder") {
    els.searchInput.value = "";
    await navigate(path);
    return;
  }
  // 검색 결과에서 파일을 여는 경우 - 실제로 그 폴더로 들어가진 않지만, 트리에서 그 파일의
  // 위치는 펼쳐서 보여준다("트리 안의 파일이 열리면 이전 트리 열기" - 실제 윈도우 동작).
  if (isSearchJump && path.length > 1) {
    revealPath(path.slice(0, -1)).then(renderNavPane);
  }
  if (type === "html") {
    const isIndex = path[path.length - 1].toLowerCase() === "index.html";
    let url;
    if (isIndex) {
      const dirPath = path.slice(0, -1);
      url = dirPath.length ? dirPath.map(encodeURIComponent).join("/") + "/" : "./";
    } else {
      url = path.map(encodeURIComponent).join("/");
    }
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  // 일반 파일: 환경설정에서 고른 더블클릭 동작을 따른다 (기본값은 "열기")
  if (settings.doubleClickAction === "download") {
    localHelperDownload(it);
  } else {
    localHelperOpen(it);
  }
}
function flashStatus(msg) {
  clearTimeout(statusFlashTimer);
  els.statusText.textContent = msg;
  statusFlashTimer = setTimeout(updateStatus, 1800);
}

