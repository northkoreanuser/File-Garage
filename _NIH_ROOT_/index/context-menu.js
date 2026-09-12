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
  // 요청 #113: 휴지통 안의 항목(파일/폴더 모두)은 CRUD 메뉴 대신 복원/영구 삭제 두 개만 제공한다
  // (실제 윈도우 휴지통과 동일 - 이름 변경/새 폴더/복사 등은 휴지통 안에서는 의미가 없음).
  if (isRecycleBinPath(it.path)) return dfsRecycleBinItemMenuItems(it);
  if (it.type === "folder") {
    // 바탕화면(가상 파일시스템) 안의 폴더는 실제 저장소 폴더와 달리 쓰기가 가능하므로, 진짜
    // 탐색기와 하나로 통합된 지금은 여기서도 새 폴더/이름변경/삭제 등 CRUD 메뉴를 그대로 제공한다.
    if (isDesktopPath(it.path)) return dfsDesktopFolderMenuItems(it);
    // 실제 저장소 폴더는 읽기 전용이지만(CRUD 메뉴 없음), 파일처럼 다운로드/저장소에서 보기는
    // 할 수 있어야 한다(사용자 지시 - "폴더 우클릭 메뉴 다운로드, 저장소에서 보기"). "저장소에서
    // 보기"는 GitHub의 tree 주소(.../tree/브랜치/경로)로 열리므로, 더블클릭 없이도 우클릭
    // 메뉴만으로 그 폴더 안으로 들어갈 수 있도록 "열기"도 맨 앞에 넣는다(사용자 지시 - "이런
    // 주소도 가능하다, 그러므로 열기 메뉴가 필요하다").
    const items = [{ label: "열기", action: () => navigate(it.path) }, { label: "다운로드", action: () => downloadFolderRecursive(it) }];
    if (settings.githubLinksEnabled) items.push({ label: "저장소에서 보기", action: () => openFolderInRepo(it) });
    dfsPushIconSettingsMenuItem(items);
    return items;
  }
  if (it.dfsNode) return dfsDesktopFileMenuItems(it);
  const items = [];
  // "새 탭에서 열기"는 이제 더블클릭 기본 동작(newtab)과 짝을 맞춰 모든 파일 형식에 표시한다 -
  // 예전엔 html 전용이었다(사용자 지시로 일반화됨).
  items.push({ label: "새 탭에서 열기", action: () => viewAsHostedPage(it) });
  // 열기/다운로드는 이 사이트에서는 항상 로컬 프로그램(webhook)을 통해서만 가능하므로
  // 굳이 "로컬 프로그램으로"라고 설명을 덧붙이지 않는다.
  items.push({ label: "열기", action: () => localHelperOpen(it) });
  items.push({ label: "다운로드", action: () => localHelperDownload(it) });
  // 실제 저장소 파일은 원본에는 쓸 수 없지만(GitHub에 직접 못 씀), 에디터 자체는 수정 가능하다 -
  // 저장하면 이 가짜 OS의 바탕화면(가상 파일시스템)에 새 파일로 저장된다(사용자 지시).
  items.push({ label: "에디터로 열기", action: () => dfsOpenRepoFileInEditor(it) });
  if (settings.githubLinksEnabled) {
    items.push({ label: "브라우저에서 보기", action: () => viewOnPages(it) });
    items.push({ label: "저장소에서 보기", action: () => openInRepo(it) });
    items.push({ label: "브라우저에서 다운로드", action: () => downloadFromGithub(it) });
  }
  dfsPushIconSettingsMenuItem(items);
  return items;
}
// 요청 #137: 파일/폴더 우클릭 메뉴는(가상 바탕화면이든 실제 저장소든) 전부 이 한 줄로 끝에
// "아이콘 설정"을 덧붙여 메뉴 메이커의 아이콘 탭으로 바로 연결한다 - 여러 메뉴 빌더 함수에서
// 공통으로 재사용(dfsDesktopFolderMenuItems/dfsDesktopFileMenuItems/buildFileMenuItems).
function dfsPushIconSettingsMenuItem(items) {
  if (typeof dfsOpenMenuMakerInWindow === "function") {
    items.push({ label: "아이콘 설정", action: () => dfsOpenMenuMakerInWindow({ initialTab: "icon" }) });
  }
}
/* ---------------- 바탕화면(가상 파일시스템) 항목의 우클릭 메뉴 (통합된 진짜 탐색기 창용) ----------------
   내용창/트리 어디서 온 항목이든 재사용할 수 있도록, id를 알면(it.dfsFolderId) 그걸 바로 쓰고
   모르면(트리에서 온 폴더처럼) 경로로 다시 찾는다. dfs* CRUD 함수들은 전부 그대로 재사용한다. */
function dfsDesktopResolveFolderId(it) {
  return it.dfsFolderId != null ? Promise.resolve(it.dfsFolderId) : dfsResolvePathToFolderId(it.path);
}
function dfsDesktopFolderMenuItems(it) {
  const refresh = () => dfsBroadcastChange();
  const items = [
    { label: "열기", action: () => navigate(it.path) },
    { label: "다운로드", action: async () => {
      const folderId = await dfsDesktopResolveFolderId(it);
      const node = folderId != null ? await dfsDb.nodes.get(folderId) : null;
      if (node) await dfsDownloadFolderRecursive(node);
    } },
    { label: "이름 변경", action: async () => {
      const folderId = await dfsDesktopResolveFolderId(it);
      const node = folderId != null ? await dfsDb.nodes.get(folderId) : null;
      if (node) await dfsPromptRename(node, refresh);
    } },
    { label: "복사", action: async () => {
      const folderId = await dfsDesktopResolveFolderId(it);
      if (folderId != null) { dfsClipboard = { id: folderId, mode: "copy" }; showToast(`"${it.name}"을(를) 복사했습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`, { sound: "copy_to_clipboard" }); }
    } },
    { label: "잘라내기", action: async () => {
      const folderId = await dfsDesktopResolveFolderId(it);
      if (folderId != null) { dfsClipboard = { id: folderId, mode: "cut" }; showToast(`"${it.name}"을(를) 잘라냈습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`, { sound: "copy_to_clipboard" }); }
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
  dfsPushIconSettingsMenuItem(items);
  return items;
}
/* ---------------- 휴지통 안 항목의 우클릭 메뉴 (요청 #113) ----------------
   내용창 칸(it.dfsNode/it.dfsFolderId로 이미 노드를 앎)이든 트리 행(경로로만 앎)이든 재사용
   가능하도록 dfsDesktopResolveFolderId와 같은 방식으로 노드를 다시 찾는다. */
function dfsRecycleBinResolveNode(it) {
  if (it.dfsNode) return Promise.resolve(it.dfsNode);
  return dfsDesktopResolveFolderId(it).then(id => id != null ? dfsDb.nodes.get(id) : null);
}
function dfsRecycleBinItemMenuItems(it) {
  const refresh = () => dfsBroadcastChange();
  return [
    { label: "복원", action: async () => {
      const node = await dfsRecycleBinResolveNode(it);
      if (node) { await dfsRestoreFromRecycleBin(node); await refresh(); }
    } },
    { label: "영구 삭제", action: async () => {
      const node = await dfsRecycleBinResolveNode(it);
      if (!node) return;
      const ok = await showConfirmDialog(`"${node.name}"을(를) 영구적으로 삭제할까요? (복구할 수 없습니다)`);
      if (!ok) return;
      await dfsPermanentlyDelete(node);
      await refresh();
    } }
  ];
}
function dfsDesktopFileMenuItems(it) {
  const refresh = () => dfsBroadcastChange();
  const node = it.dfsNode;
  if (node.type === "shortcut") {
    const shortcutItems = [
      { label: "열기", action: () => dfsActivate(node) },
      { label: "이름 변경", action: async () => dfsPromptRename(node, refresh) },
      { label: "복사", action: () => { dfsClipboard = { id: node.id, mode: "copy" }; showToast(`"${node.name}"을(를) 복사했습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`, { sound: "copy_to_clipboard" }); } },
      { label: "잘라내기", action: () => { dfsClipboard = { id: node.id, mode: "cut" }; showToast(`"${node.name}"을(를) 잘라냈습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`, { sound: "copy_to_clipboard" }); } },
      { label: "삭제", action: async () => {
        const ok = await showConfirmDialog(`"${node.name}"을(를) 삭제할까요?`);
        if (!ok) return;
        await dfsDelete(node);
        await refresh();
      } }
    ];
    dfsPushIconSettingsMenuItem(shortcutItems);
    return shortcutItems;
  }
  const fileItems = [
    { label: "에디터로 열기", action: () => dfsActivate(node) },
    // 실제 탐색기 파일 메뉴와 순서를 맞춘다: 다운로드(웹훅으로 로컬 헬퍼가 저장) 다음
    // 브라우저에서 다운로드(강제 blob 다운로드).
    { label: "다운로드", action: () => localHelperSaveContent(node.name, node.content || "") },
    { label: "브라우저에서 다운로드", action: () => dfsDownloadVirtualFile(node) },
    { label: "이름 변경", action: async () => dfsPromptRename(node, refresh) },
    { label: "복사", action: () => { dfsClipboard = { id: node.id, mode: "copy" }; showToast(`"${node.name}"을(를) 복사했습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`, { sound: "copy_to_clipboard" }); } },
    { label: "잘라내기", action: () => { dfsClipboard = { id: node.id, mode: "cut" }; showToast(`"${node.name}"을(를) 잘라냈습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`, { sound: "copy_to_clipboard" }); } },
    { label: "바로가기 만들기", action: async () => { await dfsCreateShortcut(node); await refresh(); } },
    { label: "삭제", action: async () => {
      const ok = await showConfirmDialog(`"${node.name}"을(를) 삭제할까요?`);
      if (!ok) return;
      await dfsDelete(node);
      await refresh();
    } }
  ];
  dfsPushIconSettingsMenuItem(fileItems);
  return fileItems;
}
/* ============ 브라우저 기본 우클릭 메뉴/드래그 선택 우회 방지 (강화판) ============
   사용자 리포트: 예전 방식(contextmenu 이벤트만 막음)은 일부 우회 경로를 못 막았다 - 예를 들어
   오른쪽 버튼으로 누른 채 드래그하다 페이지 밖(또는 다른 요소) 위에서 놓으면 일부 브라우저/OS
   조합에서 contextmenu 이벤트 자체가 안 뜨고 곧장 다른 기본 동작(네이티브 텍스트 선택/드래그
   등)으로 새는 경우가 있었다. 참조 코드처럼 두 겹으로 막는다:
     1) contextmenu 이벤트는 여전히 각 요소(아이콘/트리 행/내용창 등)마다 다른 메뉴를 만들어야
        하므로(참조 코드처럼 전역 메뉴 하나로 통일 못 함), 여기서는 stopImmediatePropagation을
        쓰지 않고 preventDefault만 하는 최종 안전망으로 남겨둔다 - 각 요소의 개별 contextmenu
        핸들러(버블 단계)는 그대로 자기 메뉴를 연다.
     2) 오른쪽 버튼 mousedown 자체를 캡처 단계에서 기본 동작을 막아서, 브라우저가 "우클릭 드래그"로
        뭔가를 시작할 계기 자체를 원천 차단한다(참조 코드의 핵심 아이디어) - 이렇게 하면 설령
        contextmenu 이벤트가 새더라도 애초에 새어나갈 네이티브 동작이 없다.
     3) 텍스트/아이콘을 네이티브로 드래그해서 끌어내는 것도(=이 페이지가 진짜 웹페이지라는 티가
        나는 대표적인 우회 경로) input/textarea를 제외한 모든 곳에서 막는다.
   CSS 쪽에서도 body 전체에 user-select:none을 걸고 입력창(input/textarea)에서만 다시 풀어주는
   식으로 짝을 맞췄다(각 테마의 style.css 참고) - 드래그로 화면 텍스트가 긁히는 것 자체를
   막아야 애초에 "드래그 선택 -> 우클릭 -> 복사" 같은 우회가 성립하지 않는다. ==================== */
function blockNativeContextMenu(e) { e.preventDefault(); return false; }
window.addEventListener("contextmenu", blockNativeContextMenu, { capture: true, passive: false });
document.oncontextmenu = () => false;
window.addEventListener("mousedown", (e) => {
  if (e.button === 2) e.preventDefault();
}, { capture: true, passive: false });
document.addEventListener("dragstart", (e) => {
  const tag = (e.target && e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return; // 입력창 안에서 텍스트를 드래그로 재배치하는 건 정상 동작이므로 예외
  // 버그 리포트: 이 캡처 단계 차단기가 draggable="true"로 표시해둔 이 앱 "자신"의 요소(가상
  // 파일시스템 내용창의 칸 - content-pane.js의 cell.draggable=true)까지 막아버려서, 폴더 안에서
  // 항목을 다른 폴더 위로 끌어다 옮기는 내부 드래그 자체가 아예 시작도 못 하고 있었다. 그 칸의
  // 자체 dragstart 핸들러가 stopPropagation으로 버블링은 막아뒀지만, 이 리스너는 캡처 단계라서
  // 그보다 먼저 실행돼 preventDefault로 드래그를 끊어버린 것 - 이 앱이 의도적으로 드래그 가능하게
  // 표시해둔 요소는 예외로 둔다(막아야 할 건 브라우저가 "저절로" 드래그 가능하게 만든 이미지/텍스트
  // /링크 같은 것들뿐).
  if (e.target && e.target.closest && e.target.closest('[draggable="true"]')) return;
  e.preventDefault();
}, true);
document.addEventListener("click", closeContextMenu);
document.addEventListener("scroll", closeContextMenu, true);

// 실제 탐색기처럼 Tab이 브라우저 포커스 순환을 마구 돌리지 않게 막는다 (단순하게 그냥 전부 막음).
document.addEventListener("keydown", (e) => { if (e.key === "Tab") e.preventDefault(); }, true);

/* ============ 요청 #119/#120: ESC로 모든 우클릭 메뉴 닫기 + 키보드 "컨텍스트 메뉴 호출" 키로
   지금 선택된 항목의 메뉴 열기 ============
   실제 우클릭을 흉내내려고, 대상 DOM 요소에 실제 contextmenu 이벤트를 그 요소의 중심 좌표로 직접
   발생시킨다(dispatchEvent) - 이러면 각 요소가 이미 갖고 있는 우클릭 핸들러(선택 상태 갱신 + 메뉴
   구성)를 그대로 재사용하게 돼서 메뉴 내용이 실제 우클릭과 완전히 같아지고 로직이 중복되지 않는다.
   지금 어느 영역(바탕화면 아이콘층/통합 탐색기 내용창/왼쪽 트리)에 키보드 포커스가 있는지로 대상을
   정하고, 그 안에서 선택된 항목이 없으면 그 영역의 빈 곳 메뉴로, 그것도 없으면(예: 아무데도 포커스
   가 없음) 최종적으로 바탕화면 빈 곳 메뉴로 대체한다. */
function findContextMenuKeyTarget() {
  const active = document.activeElement;
  if (els.dfIconLayer && active === els.dfIconLayer && typeof dfsFindContextMenuKeyIcon === "function") {
    return dfsFindContextMenuKeyIcon();
  }
  if (els.contentPane && active === els.contentPane && typeof findContentPaneContextMenuKeyCell === "function") {
    return findContentPaneContextMenuKeyCell();
  }
  if (els.navPane && active === els.navPane) {
    return els.navPane.querySelector(".selected");
  }
  return null;
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (activeCtxMenu) { e.preventDefault(); e.stopPropagation(); closeContextMenu(); }
    return; // ESC의 다른 동작(대화상자 취소 등)은 각자의 리스너가 그대로 처리하도록 건드리지 않음
  }
  if (e.key !== "ContextMenu") return; // 풀사이즈/오피스 키보드에만 있는 "메뉴 호출" 키
  e.preventDefault();
  const target = findContextMenuKeyTarget();
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  if (target) {
    const r = target.getBoundingClientRect();
    target.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
    }));
    return;
  }
  const active = document.activeElement;
  if (els.contentPane && active === els.contentPane && typeof contentPaneOpenBackgroundMenu === "function") {
    contentPaneOpenBackgroundMenu(cx, cy);
    return;
  }
  // 그 외(트리에 포커스가 있었지만 선택된 게 없거나, 바탕화면에 포커스가 있는데 선택된 아이콘이
  // 없거나, 아무 데도 포커스가 없는 경우)는 실제 윈도우처럼 결국 바탕화면 컨텍스트로 대체한다.
  if (typeof dfsDb !== "undefined" && dfsDb && typeof dfsBuildDesktopBackgroundMenuItems === "function") {
    showContextMenu(cx, cy, dfsBuildDesktopBackgroundMenuItems());
  }
});

