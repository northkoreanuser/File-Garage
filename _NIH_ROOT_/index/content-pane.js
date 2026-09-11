/* ============ 내용창(오른쪽) ============ */
async function renderContentPane() {
  currentHeading = null;
  els.contentPane.innerHTML = '<div class="status-msg">불러오는 중...</div>';
  let entry;
  try {
    entry = await loadDir(currentPath);
  } catch (err) {
    currentItems = [];
    els.contentPane.innerHTML = `<div class="empty-msg">폴더를 열지 못했습니다: ${escapeHtml(err.message)}</div>`;
    updateStatus();
    return;
  }
  currentItems = [
    ...entry.folders.map(name => ({ name, path: [...currentPath, name], type: "folder", dfsFolderId: entry.folderNodes ? entry.folderNodes.get(name)?.id : undefined })),
    ...entry.files.map(f => ({ name: f.name, size: f.size, path: [...currentPath, f.name], type: isHtml(f.name) ? "html" : "file", dfsNode: f.dfsNode }))
  ];
  currentOpts = { emptyText: "이 폴더는 비어 있습니다." };
  paintContentPane();
  updateStatus();
}

/* 검색 결과 위치 표시용: fromArr 기준 toArr의 상대 경로 ("../"를 포함할 수 있음) */
function relativePathBetween(fromArr, toArr) {
  let i = 0;
  while (i < fromArr.length && i < toArr.length && fromArr[i] === toArr[i]) i++;
  const ups = fromArr.length - i;
  const rest = toArr.slice(i);
  const parts = [];
  for (let k = 0; k < ups; k++) parts.push("..");
  const joined = parts.concat(rest).join("/");
  return joined || ".";
}
function dirLabelFor(it, opts) {
  const dirParts = it.path.slice(0, -1);
  if (opts.relativeTo) {
    const rel = relativePathBetween(opts.relativeTo, dirParts);
    return rel === "." ? "(현재 폴더)" : rel;
  }
  return dirParts.join("/") || repoName;
}
function buildGrid(items, opts) {
  if (items.length === 0) {
    const div = document.createElement("div");
    div.className = "empty-msg";
    div.textContent = opts.emptyText || "이 폴더는 비어 있습니다.";
    return div;
  }
  const grid = document.createElement("div");
  grid.className = "grid";
  // 바탕화면(가상 파일시스템) 폴더를 보고 있을 때만 그리드 안에서 드래그로 옮기기/OS 파일 드롭이
  // 동작한다 - 실제 저장소 폴더는 읽기 전용이라 옮길 수 없기 때문(하나로 통합된 창이라 지금
  // 보고 있는 위치가 바탕화면인지 여부로 판단한다).
  const desktopMode = !opts.flat && isDesktopPath(currentPath);
  items.forEach(it => {
    const key = it.path.join("/");
    const isMultiSel = multiSelected.size > 1 && multiSelected.has(key);
    const isSingleSel = multiSelected.size <= 1 && selected && selected.path.join("/") === key;
    const cell = document.createElement("div");
    cell.className = "grid-item" + (opts.flat ? " flat" : "") + ((isMultiSel || isSingleSel) ? " selected" : "");
    cell.dataset.key = key;
    const icon = it.dfsNode ? dfsIconGlyphFor(it.dfsNode, 32) : (it.type === "folder" ? folderIcon(32, false) : it.type === "html" ? htmlFileIcon(32) : fileIcon(32));
    const subHtml = opts.flat ? `<div class="sub">${escapeHtml(dirLabelFor(it, opts))}</div>` : "";
    cell.innerHTML = `<div class="icon">${icon}</div><div class="label">${escapeHtml(it.name)}</div>${subHtml}`;
    cell.onclick = () => {
      els.contentPane.focus();
      multiSelected.clear();
      selected = { path: it.path, name: it.name, type: it.type };
      paintContentPane();
      updateStatus();
    };
    cell.ondblclick = () => activate(it);
    cell.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (multiSelected.size > 1 && multiSelected.has(key)) {
        showContextMenu(e.clientX, e.clientY, buildMultiFileMenuItems([...multiSelected]));
        return;
      }
      multiSelected.clear();
      selected = { path: it.path, name: it.name, type: it.type };
      paintContentPane();
      showContextMenu(e.clientX, e.clientY, buildFileMenuItems(it));
    };
    if (desktopMode) {
      const srcId = it.type === "folder" ? it.dfsFolderId : (it.dfsNode ? it.dfsNode.id : null);
      if (srcId != null) {
        cell.draggable = true;
        cell.addEventListener("dragstart", (e) => {
          // els.contentPane에 걸려있는 전역 dragstart 리스너(밑에서 텍스트/이미지 드래그를 막으려고
          // e.preventDefault()를 부름)가 이 이벤트까지 취소해버리면 드래그 자체가 바로 끊기므로,
          // 버블링을 막아서 그 리스너에 닿지 않게 한다.
          e.stopPropagation();
          e.dataTransfer.setData("text/plain", String(srcId));
          e.dataTransfer.effectAllowed = "move";
        });
      }
      if (it.type === "folder" && it.dfsFolderId != null) {
        cell.addEventListener("dragover", (e) => {
          if (!e.dataTransfer) return;
          const types = Array.from(e.dataTransfer.types || []);
          if (types.indexOf("Files") === -1 && types.indexOf("text/plain") === -1) return;
          e.preventDefault();
          cell.classList.add("df-drop-target");
        });
        cell.addEventListener("dragleave", () => cell.classList.remove("df-drop-target"));
        cell.addEventListener("drop", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          cell.classList.remove("df-drop-target");
          // 진짜 컴퓨터(OS)에서 파일을 이 폴더 칸 위로 끌어다 놓은 경우: 텍스트 파일이면 그
          // 폴더 안으로 즉시 가져온다.
          if (e.dataTransfer.files && e.dataTransfer.files.length) {
            await dfsImportOsFileList(it.dfsFolderId, e.dataTransfer.files, () => renderContentPane());
            return;
          }
          const draggedId = Number(e.dataTransfer.getData("text/plain"));
          if (!draggedId || draggedId === it.dfsFolderId) return;
          const srcNode = await dfsDb.nodes.get(draggedId);
          if (!srcNode) return;
          const ok = await dfsMove(srcNode, it.dfsFolderId);
          if (ok) showToast(`"${srcNode.name}"을(를) "${it.name}" 폴더로 옮겼습니다.`);
          await dfsBroadcastChange();
        });
      }
    }
    grid.appendChild(cell);
  });
  return grid;
}
function paintContentPane() {
  els.contentPane.innerHTML = "";
  if (currentHeading) {
    const h = document.createElement("div");
    h.className = "search-heading";
    h.textContent = currentHeading;
    els.contentPane.appendChild(h);
  }
  els.contentPane.appendChild(buildGrid(currentItems, currentOpts));
}

/* ============ 내용창 드래그(러버밴드) 다중 선택 ============
   빈 배경에서 마우스를 누른 채 드래그하면 사각형과 겹치는 항목들을 모두 선택한다.
   selectBox와 겹치는지는 offsetLeft/Top 기준(스크롤과 무관한 콘텐츠 좌표계)으로 계산한다. */
let dragSelectStart = null;
els.contentPane.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (e.target.closest(".grid-item")) return; // 아이템 위에서 시작하면 드래그 선택을 시작하지 않음
  e.preventDefault();
  els.contentPane.focus();
  const rect = els.contentPane.getBoundingClientRect();
  dragSelectStart = { x: e.clientX - rect.left + els.contentPane.scrollLeft, y: e.clientY - rect.top + els.contentPane.scrollTop };
  const box = document.createElement("div");
  box.className = "select-box";
  box.id = "dragSelectBox";
  els.contentPane.appendChild(box);
  multiSelected.clear();
  selected = null;
});
window.addEventListener("mousemove", (e) => {
  if (!dragSelectStart) return;
  const box = document.getElementById("dragSelectBox");
  if (!box) return;
  const rect = els.contentPane.getBoundingClientRect();
  const curX = e.clientX - rect.left + els.contentPane.scrollLeft;
  const curY = e.clientY - rect.top + els.contentPane.scrollTop;
  const left = Math.min(dragSelectStart.x, curX), top = Math.min(dragSelectStart.y, curY);
  const w = Math.abs(curX - dragSelectStart.x), h = Math.abs(curY - dragSelectStart.y);
  box.style.left = left + "px"; box.style.top = top + "px"; box.style.width = w + "px"; box.style.height = h + "px";

  const boxRect = { left, top, right: left + w, bottom: top + h };
  multiSelected.clear();
  els.contentPane.querySelectorAll(".grid-item").forEach(cell => {
    const cLeft = cell.offsetLeft, cTop = cell.offsetTop;
    const cRect = { left: cLeft, top: cTop, right: cLeft + cell.offsetWidth, bottom: cTop + cell.offsetHeight };
    const intersects = !(cRect.left > boxRect.right || cRect.right < boxRect.left || cRect.top > boxRect.bottom || cRect.bottom < boxRect.top);
    if (intersects) { multiSelected.add(cell.dataset.key); cell.classList.add("selected"); }
    else cell.classList.remove("selected");
  });
});
window.addEventListener("mouseup", () => {
  if (!dragSelectStart) return;
  dragSelectStart = null;
  const box = document.getElementById("dragSelectBox");
  if (box) box.remove();
  if (multiSelected.size === 1) {
    // 하나만 걸렸으면 일반 단일 선택으로 취급
    const key = [...multiSelected][0];
    const it = currentItems.find(i => i.path.join("/") === key);
    multiSelected.clear();
    if (it) selected = { path: it.path, name: it.name, type: it.type };
    paintContentPane();
  }
  updateStatus();
});
els.navPane.addEventListener("dragstart", (e) => e.preventDefault());
els.contentPane.addEventListener("dragstart", (e) => e.preventDefault());

/* ============ 내용창(바탕화면 경로일 때만): 빈 영역 우클릭 메뉴 + 진짜 컴퓨터(OS) 파일 드롭 가져오기 ============
   진짜 저장소 폴더는 읽기 전용이라 해당 없음 - 지금 보고 있는 경로(currentPath)가 바탕화면
   안일 때만 동작한다(하나로 통합된 창이라 매번 currentPath로 판단). 리스너는 렌더될 때마다
   새로 붙이지 않고 한 번만 등록한다(중복 등록 버그 방지 - 이전에 겪었던 문제). ============ */
els.contentPane.addEventListener("dragover", (e) => {
  if (!isDesktopPath(currentPath)) return;
  if (e.target.closest(".grid-item")) return; // 폴더 칸 위는 그 칸 자체의 리스너가 처리
  if (!e.dataTransfer || Array.from(e.dataTransfer.types || []).indexOf("Files") === -1) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});
els.contentPane.addEventListener("drop", async (e) => {
  if (!isDesktopPath(currentPath)) return;
  if (e.target.closest(".grid-item")) return;
  if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
  e.preventDefault();
  const folderId = await dfsResolvePathToFolderId(currentPath);
  if (folderId == null) return;
  await dfsImportOsFileList(folderId, e.dataTransfer.files, () => renderContentPane());
});
els.contentPane.addEventListener("contextmenu", (e) => {
  if (!isDesktopPath(currentPath)) return;
  if (e.target.closest(".grid-item")) return;
  e.preventDefault();
  e.stopPropagation();
  dfsResolvePathToFolderId(currentPath).then(folderId => {
    if (folderId == null) return;
    showContextMenu(e.clientX, e.clientY, dfsBuildEmptyAreaMenuItems(folderId, () => dfsBroadcastChange()));
  });
});

/* ============ 내용창(오른쪽) 방향키 내비게이션: 상하좌우 = 그리드 이동, 엔터 = 폴더 진입/파일 열기 시도.
   다중 선택 상태(2개 이상)에서 엔터는 "다중 열기"(위험함) 대신 순차 다운로드로 대체한다. ============ */
els.contentPane.tabIndex = 0;
els.contentPane.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (multiSelected.size > 1) {
      handleMultiDownload(itemsFromKeys([...multiSelected]));
      return;
    }
    if (selected) {
      const it = currentItems.find(i => i.path.join("/") === selected.path.join("/"));
      if (it) activate(it);
    }
    return;
  }
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
  e.preventDefault();
  if (currentItems.length === 0) return;
  const cellW = currentOpts.flat ? 132 : 96;
  const gap = 4;
  const containerW = els.contentPane.clientWidth - 28; // padding 14px * 2
  const columns = Math.max(1, Math.floor((containerW + gap) / (cellW + gap)));
  let idx = selected ? currentItems.findIndex(it => it.path.join("/") === selected.path.join("/")) : -1;
  if (idx === -1) idx = 0;
  if (e.key === "ArrowRight") idx = Math.min(currentItems.length - 1, idx + 1);
  else if (e.key === "ArrowLeft") idx = Math.max(0, idx - 1);
  else if (e.key === "ArrowDown") idx = Math.min(currentItems.length - 1, idx + columns);
  else if (e.key === "ArrowUp") idx = Math.max(0, idx - columns);
  const it = currentItems[idx];
  if (!it) return;
  multiSelected.clear();
  selected = { path: it.path, name: it.name, type: it.type };
  paintContentPane();
  updateStatus();
  const cell = els.contentPane.querySelector(`[data-key="${CSS.escape(it.path.join("/"))}"]`);
  if (cell) cell.scrollIntoView({ block: "nearest" });
});

/* ============ 다중 선택 다운로드: 다중 "열기"는 위험하므로 대신 폴더를 한 번만 고르고
   그 폴더에 순차적으로 저장한다 (localserver.ahk의 /pickfolder + /savetofolder 사용). ============ */
function itemsFromKeys(keys) {
  return keys.map(k => currentItems.find(it => it.path.join("/") === k)).filter(Boolean);
}
function buildMultiFileMenuItems(keys) {
  const items = itemsFromKeys(keys);
  // 바탕화면(가상 파일시스템) 항목은 실제 서버 URL이 없으므로(로컬 헬퍼의 /savetofolder는 진짜
  // 저장소 파일에만 쓸 수 있음) 다중 "다운로드" 대상에서 제외한다 - 여러 개를 동시에 골랐을 때는
  // 항목별 개별 메뉴(다운로드/브라우저에서 다운로드)를 대신 쓴다.
  const fileCount = items.filter(it => it.type !== "folder" && !it.dfsNode).length;
  if (fileCount === 0) return [];
  return [{ label: `다운로드 (${fileCount}개)`, action: () => handleMultiDownload(items) }];
}
async function handleMultiDownload(items) {
  // 바탕화면(가상 파일시스템) 파일은 로컬 헬퍼의 /savetofolder로 저장할 실제 서버 파일이
  // 아니므로(dexie 콘텐츠) 폴더와 마찬가지로 다중 다운로드 대상에서 제외한다.
  const files = items.filter(it => it.type !== "folder" && !it.dfsNode);
  const skippedFolders = items.length - files.length;
  if (files.length === 0) { showToast("다운로드할 파일이 없습니다(폴더는 제외됩니다).", { kind: "warn" }); return; }

  const port = await ensureHelperPort();
  if (port === null) { offerHelperDownload("다운로드"); return; }

  showToast("저장할 폴더를 선택하세요...");
  let folder;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/pickfolder`);
    folder = (await res.text()).trim();
  } catch (e) {
    showToast(`폴더 선택 중 오류: ${e.message}`, { kind: "warn" });
    return;
  }
  if (!folder || folder === "CANCELLED") {
    showToast("다운로드가 취소되었습니다.");
    return;
  }

  let okCount = 0, failCount = 0;
  for (let i = 0; i < files.length; i++) {
    const it = files[i];
    showToast(`다운로드 중 (${i + 1}/${files.length}): ${it.name}`);
    const url = absoluteFileUrl(it.path);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/savetofolder?url=${encodeURIComponent(url)}&folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(it.name)}${sizeQueryParam(it)}`);
      if (!res.ok) throw new Error(String(res.status));
      okCount++;
    } catch (e) {
      failCount++;
    }
  }
  let msg = `다중 다운로드 완료: ${okCount}개`;
  if (failCount) msg += `, 실패 ${failCount}개`;
  if (skippedFolders) msg += ` (폴더 ${skippedFolders}개는 제외됨)`;
  showToast(msg, failCount ? { kind: "warn" } : {});
}

