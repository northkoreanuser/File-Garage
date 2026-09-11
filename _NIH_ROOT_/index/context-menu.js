/* ============ 우클릭 커스텀 메뉴 (브라우저 기본 메뉴는 막는다) ============ */
let activeCtxMenu = null;
function closeContextMenu() {
  if (activeCtxMenu) { activeCtxMenu.remove(); activeCtxMenu = null; }
}
function showContextMenu(x, y, items) {
  closeContextMenu();
  if (!items.length) return;
  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  items.forEach(it => {
    const row = document.createElement("div");
    row.className = "ctx-item";
    row.textContent = it.label;
    row.onclick = (e) => { e.stopPropagation(); closeContextMenu(); it.action(); };
    menu.appendChild(row);
  });
  document.body.appendChild(menu);
  const w = menu.offsetWidth, h = menu.offsetHeight;
  let left = x, top = y;
  if (left + w > window.innerWidth) left = window.innerWidth - w - 4;
  if (top + h > window.innerHeight) top = window.innerHeight - h - 4;
  menu.style.left = Math.max(4, left) + "px";
  menu.style.top = Math.max(4, top) + "px";
  activeCtxMenu = menu;
}
function buildFileMenuItems(it) {
  if (it.type === "folder") {
    // 바탕화면(가상 파일시스템) 안의 폴더는 실제 저장소 폴더와 달리 쓰기가 가능하므로, 진짜
    // 탐색기와 하나로 통합된 지금은 여기서도 새 폴더/이름변경/삭제 등 CRUD 메뉴를 그대로 제공한다.
    if (isDesktopPath(it.path)) return dfsDesktopFolderMenuItems(it);
    return [];
  }
  if (it.dfsNode) return dfsDesktopFileMenuItems(it);
  const items = [];
  if (it.type === "html") items.push({ label: "새 탭에서 열기", action: () => activate(it) });
  // 열기/다운로드는 이 사이트에서는 항상 로컬 프로그램(webhook)을 통해서만 가능하므로
  // 굳이 "로컬 프로그램으로"라고 설명을 덧붙이지 않는다.
  items.push({ label: "열기", action: () => localHelperOpen(it) });
  items.push({ label: "다운로드", action: () => localHelperDownload(it) });
  // 실제 저장소 파일은 이 페이지가 직접 쓸 수 없으므로 항상 읽기 전용으로만 내장 에디터에서 연다.
  items.push({ label: "에디터로 열기", action: () => dfsOpenReadonlyRepoFile(it) });
  if (settings.githubLinksEnabled) {
    items.push({ label: "브라우저에서 보기", action: () => viewOnPages(it) });
    items.push({ label: "저장소에서 보기", action: () => openInRepo(it) });
    items.push({ label: "브라우저에서 다운로드", action: () => downloadFromGithub(it) });
  }
  return items;
}
/* ---------------- 바탕화면(가상 파일시스템) 항목의 우클릭 메뉴 (통합된 진짜 탐색기 창용) ----------------
   내용창/트리 어디서 온 항목이든 재사용할 수 있도록, id를 알면(it.dfsFolderId) 그걸 바로 쓰고
   모르면(트리에서 온 폴더처럼) 경로로 다시 찾는다. dfs* CRUD 함수들은 전부 그대로 재사용한다. */
function dfsDesktopResolveFolderId(it) {
  return it.dfsFolderId != null ? Promise.resolve(it.dfsFolderId) : dfsResolvePathToFolderId(it.path);
}
function dfsDesktopFolderMenuItems(it) {
  const refresh = () => dfsBroadcastChange();
  return [
    { label: "열기", action: () => navigate(it.path) },
    { label: "이름 변경", action: async () => {
      const folderId = await dfsDesktopResolveFolderId(it);
      const node = folderId != null ? await dfsDb.nodes.get(folderId) : null;
      if (node) await dfsPromptRename(node, refresh);
    } },
    { label: "복사", action: async () => {
      const folderId = await dfsDesktopResolveFolderId(it);
      if (folderId != null) { dfsClipboard = { id: folderId, mode: "copy" }; showToast(`"${it.name}"을(를) 복사했습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`); }
    } },
    { label: "잘라내기", action: async () => {
      const folderId = await dfsDesktopResolveFolderId(it);
      if (folderId != null) { dfsClipboard = { id: folderId, mode: "cut" }; showToast(`"${it.name}"을(를) 잘라냈습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`); }
    } },
    { label: "삭제", action: async () => {
      const folderId = await dfsDesktopResolveFolderId(it);
      const node = folderId != null ? await dfsDb.nodes.get(folderId) : null;
      if (!node) return;
      const ok = await showConfirmDialog(`"${node.name}"을(를) 삭제할까요? (안에 있는 것도 모두 삭제됩니다)`);
      if (!ok) return;
      await dfsDelete(node);
      await refresh();
    } }
  ];
}
function dfsDesktopFileMenuItems(it) {
  const refresh = () => dfsBroadcastChange();
  const node = it.dfsNode;
  if (node.type === "shortcut") {
    return [
      { label: "열기", action: () => dfsActivate(node) },
      { label: "이름 변경", action: async () => dfsPromptRename(node, refresh) },
      { label: "복사", action: () => { dfsClipboard = { id: node.id, mode: "copy" }; showToast(`"${node.name}"을(를) 복사했습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`); } },
      { label: "잘라내기", action: () => { dfsClipboard = { id: node.id, mode: "cut" }; showToast(`"${node.name}"을(를) 잘라냈습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`); } },
      { label: "삭제", action: async () => {
        const ok = await showConfirmDialog(`"${node.name}"을(를) 삭제할까요?`);
        if (!ok) return;
        await dfsDelete(node);
        await refresh();
      } }
    ];
  }
  return [
    { label: "에디터로 열기", action: () => dfsActivate(node) },
    // 실제 탐색기 파일 메뉴와 순서를 맞춘다: 다운로드(웹훅으로 로컬 헬퍼가 저장) 다음
    // 브라우저에서 다운로드(강제 blob 다운로드).
    { label: "다운로드", action: () => localHelperSaveContent(node.name, node.content || "") },
    { label: "브라우저에서 다운로드", action: () => dfsDownloadVirtualFile(node) },
    { label: "이름 변경", action: async () => dfsPromptRename(node, refresh) },
    { label: "복사", action: () => { dfsClipboard = { id: node.id, mode: "copy" }; showToast(`"${node.name}"을(를) 복사했습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`); } },
    { label: "잘라내기", action: () => { dfsClipboard = { id: node.id, mode: "cut" }; showToast(`"${node.name}"을(를) 잘라냈습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`); } },
    { label: "바로가기 만들기", action: async () => { await dfsCreateShortcut(node); await refresh(); } },
    { label: "삭제", action: async () => {
      const ok = await showConfirmDialog(`"${node.name}"을(를) 삭제할까요?`);
      if (!ok) return;
      await dfsDelete(node);
      await refresh();
    } }
  ];
}
// 기본 우클릭 메뉴가 우리 커스텀 메뉴와 같이 뜨는 걸 막기 위해 최대한 이중으로 막는다:
// capture 단계(가장 먼저 실행) + bubble 단계 + document.oncontextmenu까지 전부 false 처리.
function blockNativeContextMenu(e) { e.preventDefault(); return false; }
document.addEventListener("contextmenu", blockNativeContextMenu, true);
document.addEventListener("contextmenu", blockNativeContextMenu, false);
document.oncontextmenu = () => false;
document.addEventListener("click", closeContextMenu);
document.addEventListener("scroll", closeContextMenu, true);

// 실제 탐색기처럼 Tab이 브라우저 포커스 순환을 마구 돌리지 않게 막는다 (단순하게 그냥 전부 막음).
document.addEventListener("keydown", (e) => { if (e.key === "Tab") e.preventDefault(); }, true);

