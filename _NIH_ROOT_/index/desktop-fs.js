/* ============================================================================
   바탕화면 가상 파일시스템(desktop virtual filesystem) - dexie(IndexedDB)에 저장
   ============================================================================
   - .desktop 배경에 아이콘으로 폴더/파일이 놓인다. 더블클릭하면 폴더는 새 탐색기 창으로,
     파일은 그 창 안에서 화면 전환으로(옵시디언 스타일) 내장 에디터가 뜬다.
   - "진짜" 탐색기(GitHub 리포 브라우저, #win)는 하나만 존재하지만, 이 가상 폴더들은
     설정에서 정한 개수까지 동시에 여러 창으로 열 수 있다(실제 윈도우 탐색기와 동일 - #win 자체는
     중복 실행 불가능하고 이 가상 폴더 창들만 여러 개 가능).
   - 업로드받은 옵시디언 스타일 마크다운/HTML 에디터의 핵심 기능(마크다운 렌더링, HTML 샌드박스
     미리보기, 코드블록 복사, 굵게/기울임/링크 단축키, 단어수 상태줄, M/H/T 모드, 테마)을 그대로
     가져와 쓰되, 주소창(#) 압축저장/공유 기능만은 뺐다 - 이 페이지가 이미 #을 경로/트리 상태
     저장용으로 쓰고 있어서 중복 구현이 불가능하기 때문(사용자 요청사항).
================================================================================= */

const DFS_DESKTOP_ROOT = "desktop";
let dfsDb = null;

function dfsInitDb() {
  // dexie.min.js는 외부 CDN에서 불러오므로, 네트워크 차단/오프라인 등으로 못 불러왔을 수도 있다.
  // 그런 경우에도 "진짜" 저장소 탐색기(메인 기능)는 전혀 영향받지 않고 정상 동작해야 하므로,
  // 바탕화면 가상 파일시스템 기능만 조용히 비활성화한다(dfsDb=null → 각 함수가 방어적으로 처리).
  if (typeof Dexie === "undefined") {
    console.warn("Dexie를 불러오지 못해 바탕화면 가상 파일시스템 기능을 사용할 수 없습니다.");
    dfsDb = null;
    return;
  }
  try {
    const { repo } = getOwnerRepo();
    const label = repo || "default";
    dfsDb = new Dexie(`idx-desktopfs-${label}`);
    dfsDb.version(1).stores({ nodes: "++id, parentId, name" });
  } catch (e) {
    console.warn("바탕화면 가상 파일시스템 초기화 실패:", e);
    dfsDb = null;
  }
}

/* ---------------- 이름 규칙: 윈도우 금지 문자/예약어 + 충돌 시 번호 붙이기 ---------------- */
const DFS_RESERVED_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
]);
function dfsValidateName(raw) {
  const name = (raw || "").trim();
  if (!name) return "이름을 입력하세요.";
  if (/[\\/:*?"<>|]/.test(name)) return '\\ / : * ? " < > | 문자는 이름에 쓸 수 없습니다.';
  if (/[ .]$/.test(name)) return "이름 끝에 공백이나 마침표를 쓸 수 없습니다.";
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  if (DFS_RESERVED_NAMES.has(name.toUpperCase()) || DFS_RESERVED_NAMES.has(base.toUpperCase())) {
    return `"${name}"은(는) 시스템에서 예약된 이름이라 쓸 수 없습니다.`;
  }
  return null;
}
function dfsSplitExt(name) {
  const dot = name.lastIndexOf(".");
  const hasExt = dot > 0 && dot < name.length - 1;
  return hasExt ? { base: name.slice(0, dot), ext: name.slice(dot) } : { base: name, ext: "" };
}
async function dfsUniqueName(parentId, desiredName) {
  const siblings = await dfsDb.nodes.where("parentId").equals(parentId).toArray();
  const taken = new Set(siblings.map(s => s.name.toLowerCase()));
  if (!taken.has(desiredName.toLowerCase())) return desiredName;
  const { base, ext } = dfsSplitExt(desiredName);
  let n = 2;
  while (true) {
    const candidate = `${base} (${n})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
    n++;
  }
}
function dfsSuffixedName(name, suffix) {
  const { base, ext } = dfsSplitExt(name);
  return `${base} - ${suffix}${ext}`;
}

/* ---------------- CRUD ---------------- */
async function dfsChildren(parentId) {
  const rows = await dfsDb.nodes.where("parentId").equals(parentId).toArray();
  rows.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : (b.type === "folder" ? 1 : 0);
    return a.name.localeCompare(b.name, "ko");
  });
  return rows;
}
async function dfsNextIconPos(parentId) {
  // 이미 있는 아이콘 개수를 보고 격자 형태로 다음 좌표를 대충 잡아준다(겹쳐서 쌓이는 것 방지).
  const siblings = await dfsDb.nodes.where("parentId").equals(parentId).toArray();
  const col = siblings.length % 6, row = Math.floor(siblings.length / 6);
  return { x: 24 + col * 96, y: 24 + row * 100 };
}
async function dfsCreateFolder(parentId) {
  const name = await dfsUniqueName(parentId, "새 폴더");
  const now = Date.now();
  const pos = await dfsNextIconPos(parentId);
  const id = await dfsDb.nodes.add({ parentId, type: "folder", name, x: pos.x, y: pos.y, createdAt: now, updatedAt: now });
  return dfsDb.nodes.get(id);
}
const DFS_FILE_DEFAULTS = {
  txt: { label: "새 텍스트 문서.txt", fileType: "txt" },
  md: { label: "새 Markdown 문서.md", fileType: "md" },
  html: { label: "새 HTML 문서.html", fileType: "html" }
};
async function dfsCreateFile(parentId, kind) {
  const d = DFS_FILE_DEFAULTS[kind] || DFS_FILE_DEFAULTS.txt;
  const name = await dfsUniqueName(parentId, d.label);
  const now = Date.now();
  const pos = await dfsNextIconPos(parentId);
  const id = await dfsDb.nodes.add({ parentId, type: "file", name, content: "", fileType: d.fileType, x: pos.x, y: pos.y, createdAt: now, updatedAt: now });
  return dfsDb.nodes.get(id);
}
// ---------------- OS(진짜 컴퓨터)에서 파일을 드래그해서 떨어뜨렸을 때 즉시 가져오기 ----------------
// 텍스트형 파일(ini/json/xml/cmd/vbs/ps1/ahk/txt/md/html 등)만 지원한다 - 이 앱의 가상 파일시스템은
// 애초에 텍스트 내용만 저장할 수 있기 때문에, 바이너리 파일은 읽어봐도 저장할 방법이 없다.
async function dfsImportOsFile(parentId, file) {
  let text;
  try {
    text = await file.text();
  } catch (e) {
    showToast(`"${file.name}"을(를) 읽지 못했습니다: ${e.message}`, { kind: "warn" });
    return null;
  }
  if (!dfLooksLikeText(text.slice(0, 8000))) {
    showToast(`"${file.name}"은(는) 텍스트 파일이 아닌 것 같아 가져오지 않았습니다.`, { kind: "warn" });
    return null;
  }
  const name = await dfsUniqueName(parentId, file.name || "새 파일.txt");
  const now = Date.now();
  const pos = await dfsNextIconPos(parentId);
  const id = await dfsDb.nodes.add({ parentId, type: "file", name, content: text, fileType: dfDetectFileType(name), x: pos.x, y: pos.y, createdAt: now, updatedAt: now });
  return dfsDb.nodes.get(id);
}
async function dfsImportOsFileList(parentId, fileList, refresh) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  let ok = 0;
  for (const f of files) {
    if (await dfsImportOsFile(parentId, f)) ok++;
  }
  if (ok > 0) {
    showToast(`${ok}개 파일을 가져왔습니다.`);
    if (refresh) await refresh();
    await dfsBroadcastChange();
  }
}
async function dfsDeepCopyChildren(fromId, toId) {
  const kids = await dfsDb.nodes.where("parentId").equals(fromId).toArray();
  for (const kid of kids) {
    const now = Date.now();
    const copy = { parentId: toId, type: kid.type, name: kid.name, createdAt: now, updatedAt: now };
    if (kid.type === "file") { copy.content = kid.content; copy.fileType = kid.fileType; }
    if (kid.type === "shortcut") copy.targetId = kid.targetId;
    const newId = await dfsDb.nodes.add(copy);
    if (kid.type === "folder") await dfsDeepCopyChildren(kid.id, newId);
  }
}
async function dfsCopyInto(node, parentId, desiredName) {
  const name = await dfsUniqueName(parentId, desiredName || node.name);
  const now = Date.now();
  const pos = await dfsNextIconPos(parentId);
  const copy = { parentId, type: node.type, name, x: pos.x, y: pos.y, createdAt: now, updatedAt: now };
  if (node.type === "file") { copy.content = node.content; copy.fileType = node.fileType; }
  if (node.type === "shortcut") copy.targetId = node.targetId;
  const id = await dfsDb.nodes.add(copy);
  if (node.type === "folder") await dfsDeepCopyChildren(node.id, id);
  return dfsDb.nodes.get(id);
}
async function dfsDuplicate(node) {
  return dfsCopyInto(node, node.parentId, dfsSuffixedName(node.name, "복사본"));
}
async function dfsCreateShortcut(node) {
  const name = await dfsUniqueName(node.parentId, dfsSuffixedName(node.name, "바로가기"));
  const now = Date.now();
  const pos = await dfsNextIconPos(node.parentId);
  const id = await dfsDb.nodes.add({ parentId: node.parentId, type: "shortcut", name, targetId: node.id, x: pos.x, y: pos.y, createdAt: now, updatedAt: now });
  return dfsDb.nodes.get(id);
}
async function dfsRename(node, newNameRaw) {
  const err = dfsValidateName(newNameRaw);
  if (err) { showToast(err, { kind: "warn" }); return false; }
  const newName = newNameRaw.trim();
  const siblings = await dfsDb.nodes.where("parentId").equals(node.parentId).toArray();
  const clash = siblings.some(s => s.id !== node.id && s.name.toLowerCase() === newName.toLowerCase());
  if (clash) { showToast(`"${newName}" 이름이 이미 있습니다.`, { kind: "warn" }); return false; }
  await dfsDb.nodes.update(node.id, { name: newName, updatedAt: Date.now() });
  return true;
}
async function dfsDeleteDeep(id) {
  const kids = await dfsDb.nodes.where("parentId").equals(id).toArray();
  for (const kid of kids) await dfsDeleteDeep(kid.id);
  await dfsDb.nodes.delete(id);
}
async function dfsDelete(node) {
  if (node.type === "folder") await dfsDeleteDeep(node.id);
  else await dfsDb.nodes.delete(node.id);
  await dfsCloseWindowsShowing(node.id);
}
async function dfsIsDescendant(maybeAncestorId, folderId) {
  let p = folderId;
  while (p !== DFS_DESKTOP_ROOT && p != null) {
    if (p === maybeAncestorId) return true;
    const parentNode = await dfsDb.nodes.get(p);
    if (!parentNode) break;
    p = parentNode.parentId;
  }
  return false;
}
async function dfsMove(node, newParentId) {
  if (node.id === newParentId) return false;
  if (node.type === "folder" && await dfsIsDescendant(node.id, newParentId)) {
    showToast("폴더를 자기 자신의 하위로 옮길 수 없습니다.", { kind: "warn" });
    return false;
  }
  if (node.parentId === newParentId) return true;
  const newName = await dfsUniqueName(newParentId, node.name);
  await dfsDb.nodes.update(node.id, { parentId: newParentId, name: newName, updatedAt: Date.now() });
  return true;
}

/* ---------------- 클립보드(복사/잘라내기/붙여넣기) - 앱 전체에서 하나만 공유 ---------------- */
let dfsClipboard = null; // { id, mode: "copy" | "cut" }
async function dfsPasteInto(parentId) {
  if (!dfsClipboard) return;
  const node = await dfsDb.nodes.get(dfsClipboard.id);
  if (!node) { dfsClipboard = null; return; }
  if (dfsClipboard.mode === "copy") {
    await dfsCopyInto(node, parentId);
  } else {
    const ok = await dfsMove(node, parentId);
    if (ok) dfsClipboard = null; else return;
  }
  await dfsBroadcastChange();
}

/* ---------------- 변경 후 화면 갱신: 바탕화면 아이콘 + (통합된) 진짜 탐색기 창 ----------------
   예전에는 팝업으로 여러 개 떠 있는 가상 탐색기 창들을 전부 돌면서 새로고침했지만, 이제 바탕화면은
   "진짜" 탐색기 창(#win) 하나로 완전히 통합됐으므로(사용자 지시), 지금 그 창이 보여주고 있는
   위치(currentPath) 하나만 다시 그리면 된다. 바탕화면 관련 폴더 캐시는 dexie가 항상 최신
   정본이므로, 무엇이 바뀌었든 캐시된 항목을 전부 지워서 다음에 다시 읽을 때 최신 상태로
   채워지게 한다. */
async function dfsBroadcastChange() {
  await dfsRenderDesktop();
  for (const k of [...dirCache.keys()]) {
    if (k === DESKTOP_TREE_NAME || k.startsWith(DESKTOP_TREE_NAME + "/")) dirCache.delete(k);
  }
  await revealPath(currentPath).catch(() => {});
  await renderContentPane();
  renderNavPane();
}
async function dfsCloseWindowsShowing(nodeId) {
  // 지금 통합된 진짜 탐색기 창(#win)이 방금 삭제된 폴더(또는 그 하위)를 보고 있었다면, 더는
  // 보여줄 게 없으므로 바탕화면 루트로 이동한다(실제 탐색기도 보던 폴더가 사라지면 오류 대신
  // 상위/기본 위치로 돌아가는 것과 같은 동작).
  if (!isDesktopPath(currentPath)) return;
  const curFolderId = await dfsResolvePathToFolderId(currentPath);
  // 못 찾으면(curFolderId==null) 지금 보던 위치 자체가 깨진 것이므로(방금 삭제됐거나 그 하위였음)
  // 마찬가지로 바탕화면 루트로 돌아간다.
  if (curFolderId == null || curFolderId === nodeId || await dfsIsDescendant(nodeId, curFolderId)) {
    navigate([DESKTOP_TREE_NAME]);
  }
}

/* ---------------- 아이콘 그리기 ---------------- */
function dfsIconGlyphFor(node, size) {
  let inner;
  if (node.type === "folder") inner = folderIcon(size, false);
  else if (node.type === "shortcut") inner = fileIcon(size);
  else inner = node.fileType === "html" ? htmlFileIcon(size) : fileIcon(size);
  const badge = node.type === "shortcut" ? '<span class="df-icon-shortcut-badge">↪</span>' : "";
  return `<span style="position:relative;display:inline-block;">${inner}${badge}</span>`;
}

/* ---------------- 데스크탑 아이콘 ---------------- */
let dfsSelectedIconId = null;
// 러버밴드(드래그) 또는 Ctrl/Shift+클릭으로 여러 개를 한꺼번에 선택한 아이콘 id들.
// 단일 선택(dfsSelectedIconId)과는 서로 배타적 - 하나가 채워지면 다른 하나는 비운다.
let dfsMultiSelected = new Set();
async function dfsRenderDesktop() {
  if (!dfsDb) return;
  const items = await dfsChildren(DFS_DESKTOP_ROOT);
  els.dfIconLayer.innerHTML = "";
  items.forEach(node => {
    const icon = document.createElement("div");
    const isSelected = dfsSelectedIconId === node.id || dfsMultiSelected.has(node.id);
    icon.className = "df-icon" + (isSelected ? " selected" : "");
    icon.style.left = (node.x ?? 24) + "px";
    icon.style.top = (node.y ?? 24) + "px";
    icon.dataset.id = String(node.id);
    icon.innerHTML = `<div class="df-icon-glyph">${dfsIconGlyphFor(node, 40)}</div><div class="df-icon-label">${escapeHtml(node.name)}</div>`;
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        // 실제 윈도우처럼 Ctrl(또는 Shift)+클릭으로 여러 개를 하나씩 누적/해제한다.
        // 지금까지 단일 선택(dfsSelectedIconId)이었다면, 그 아이콘부터 먼저 다중 선택 집합에
        // 옮겨 담아야 "하나 고른 채로 Ctrl+클릭"이 진짜로 두 개를 선택한 게 된다.
        if (dfsSelectedIconId !== null) { dfsMultiSelected.add(dfsSelectedIconId); dfsSelectedIconId = null; }
        if (dfsMultiSelected.has(node.id)) dfsMultiSelected.delete(node.id);
        else dfsMultiSelected.add(node.id);
      } else {
        dfsMultiSelected.clear();
        dfsSelectedIconId = node.id;
      }
      dfsRenderDesktop();
    });
    icon.addEventListener("dblclick", () => dfsActivate(node));
    icon.addEventListener("contextmenu", (e) => {
      e.preventDefault(); e.stopPropagation();
      // 이미 다중 선택에 포함된 아이콘을 우클릭하면 그 선택을 유지하고(실제 탐색기와 동일),
      // 선택 밖의 아이콘을 우클릭하면 그 아이콘 하나로 선택을 좁힌다.
      if (!dfsMultiSelected.has(node.id)) {
        dfsMultiSelected.clear();
        dfsSelectedIconId = node.id;
        dfsRenderDesktop();
      }
      showContextMenu(e.clientX, e.clientY, dfsBuildIconMenuItems(node));
    });
    dfsSetupIconDrag(icon, node);
    els.dfIconLayer.appendChild(icon);
  });
}
let dfsSuppressNextDesktopClick = false;
document.addEventListener("click", () => {
  if (dfsSuppressNextDesktopClick) { dfsSuppressNextDesktopClick = false; return; }
  if (dfsSelectedIconId !== null || dfsMultiSelected.size) {
    dfsSelectedIconId = null;
    dfsMultiSelected.clear();
    dfsRenderDesktop();
  }
});
document.querySelector(".desktop").addEventListener("contextmenu", (e) => {
  if (e.target.closest(".df-icon") || e.target.closest(".window")) return;
  e.preventDefault();
  if (!dfsDb) return; // dexie를 못 불러왔으면 바탕화면 기능 자체를 조용히 비활성화
  const items = [
    { label: "탐색기로 열기", action: () => openRealExplorerAt([DESKTOP_TREE_NAME]) },
    ...dfsBuildEmptyAreaMenuItems(DFS_DESKTOP_ROOT, () => dfsBroadcastChange())
  ];
  showContextMenu(e.clientX, e.clientY, items);
});
// 진짜 컴퓨터(OS)에서 파일을 드래그해서 바탕화면에 떨어뜨리면 텍스트 파일에 한해 즉시 가져온다.
// 폴더 아이콘 위에 놓으면 그 폴더 안으로, 빈 바탕화면에 놓으면 바탕화면 자체로 들어간다.
// 어떤 창(.window) 위로 떨어진 경우는 그 창 자신의 drop 핸들러가 처리하므로 여기서는 무시한다.
document.querySelector(".desktop").addEventListener("dragover", (e) => {
  if (!dfsDb) return;
  if (e.target.closest(".window")) return;
  if (!e.dataTransfer || Array.from(e.dataTransfer.types || []).indexOf("Files") === -1) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});
document.querySelector(".desktop").addEventListener("drop", async (e) => {
  if (!dfsDb) return;
  if (e.target.closest(".window")) return;
  if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
  e.preventDefault();
  const under = dfsElementUnder(e.clientX, e.clientY);
  let targetId = DFS_DESKTOP_ROOT;
  if (under && under.classList.contains("df-icon") && under.dataset.id) {
    const node = await dfsDb.nodes.get(Number(under.dataset.id));
    if (node && node.type === "folder") targetId = node.id;
  }
  await dfsImportOsFileList(targetId, e.dataTransfer.files, () => dfsRenderDesktop());
});

/* ---------------- 바탕화면 빈 공간 드래그 = 러버밴드(고무줄) 다중 선택 ----------------
   내용창(#contentPane)의 다중 선택 드래그와 같은 개념을 바탕화면 아이콘에도 그대로 적용한다.
   아이콘이 없는 빈 곳을 누른 채 끌면 그 사각형과 겹치는 아이콘들이 모두 선택된다. 문턱값(3px)
   이상 움직여야 진짜 드래그로 인정하고, 그 전에 손을 떼면 그냥 "빈 곳 클릭"으로 취급해 기존
   click 리스너가 선택 해제를 담당한다(아래 dfsSuppressNextDesktopClick 참고 - 드래그로 막
   선택을 확정한 순간 뒤따라오는 click 이벤트가 그 선택을 바로 지워버리지 않도록 한 번 막는다). */
let dfsBoxSelectStart = null;
document.querySelector(".desktop").addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (!dfsDb) return;
  if (e.target.closest(".df-icon") || e.target.closest(".window") || e.target.closest(".taskbar") || e.target.closest(".start-menu")) return;
  dfsBoxSelectStart = { x: e.clientX, y: e.clientY };
});
window.addEventListener("mousemove", (e) => {
  if (!dfsBoxSelectStart) return;
  let box = document.getElementById("dfSelectBox");
  const dx = e.clientX - dfsBoxSelectStart.x, dy = e.clientY - dfsBoxSelectStart.y;
  if (!box) {
    if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return; // 문턱값 전엔 박스를 만들지 않는다(단순 클릭과 구분)
    box = document.createElement("div");
    box.className = "df-select-box";
    box.id = "dfSelectBox";
    document.body.appendChild(box);
  }
  const left = Math.min(dfsBoxSelectStart.x, e.clientX), top = Math.min(dfsBoxSelectStart.y, e.clientY);
  const w = Math.abs(dx), h = Math.abs(dy);
  box.style.left = left + "px"; box.style.top = top + "px";
  box.style.width = w + "px"; box.style.height = h + "px";
  const rect = { left, top, right: left + w, bottom: top + h };
  els.dfIconLayer.querySelectorAll(".df-icon").forEach(el => {
    const r = el.getBoundingClientRect();
    const intersects = r.left < rect.right && r.right > rect.left && r.top < rect.bottom && r.bottom > rect.top;
    el.classList.toggle("selected", intersects); // 최종 상태는 mouseup에서 dfsMultiSelected로 확정
  });
});
window.addEventListener("mouseup", () => {
  if (!dfsBoxSelectStart) return;
  dfsBoxSelectStart = null;
  const box = document.getElementById("dfSelectBox");
  if (!box) return; // 문턱값을 못 넘겼으면 = 그냥 빈 곳 클릭, 뒤이은 click 리스너에 맡긴다
  box.remove();
  const ids = [];
  els.dfIconLayer.querySelectorAll(".df-icon.selected").forEach(el => ids.push(Number(el.dataset.id)));
  dfsSelectedIconId = null;
  dfsMultiSelected = new Set(ids);
  dfsSuppressNextDesktopClick = true;
  dfsRenderDesktop();
});

function dfsSetupIconDrag(iconEl, node) {
  let dragging = false, moved = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
  // 아이콘이 드래그로 화면 맨 아래 작업표시줄 밑을 뚫고 내려가거나 화면 오른쪽 밖으로 나가지
  // 않도록, 아이콘층(.df-icon-layer, 이미 작업표시줄 높이만큼 bottom을 뺀 영역) 자기 자신의
  // 크기 안으로만 좌표를 묶어둔다.
  function clamp(left, top) {
    const maxLeft = Math.max(0, els.dfIconLayer.clientWidth - iconEl.offsetWidth);
    const maxTop = Math.max(0, els.dfIconLayer.clientHeight - iconEl.offsetHeight);
    return { left: Math.max(0, Math.min(left, maxLeft)), top: Math.max(0, Math.min(top, maxTop)) };
  }
  iconEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    origLeft = parseFloat(iconEl.style.left) || 0;
    origTop = parseFloat(iconEl.style.top) || 0;
    e.stopPropagation();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
    if (!moved) return;
    const pos = clamp(origLeft + dx, origTop + dy);
    iconEl.style.left = pos.left + "px";
    iconEl.style.top = pos.top + "px";
    iconEl.style.zIndex = 5;
    els.dfIconLayer.querySelectorAll(".df-icon").forEach(el => el.classList.remove("df-drop-target"));
    const under = dfsElementUnder(e.clientX, e.clientY, iconEl);
    if (under && under.dataset.id) document.querySelector(`.df-icon[data-id="${under.dataset.id}"]`)?.classList.add("df-drop-target");
  });
  window.addEventListener("mouseup", async (e) => {
    if (!dragging) return;
    dragging = false;
    els.dfIconLayer.querySelectorAll(".df-icon").forEach(el => el.classList.remove("df-drop-target"));
    iconEl.style.zIndex = "";
    if (!moved) return;
    const under = dfsElementUnder(e.clientX, e.clientY, iconEl);
    if (under && under.dataset.id) {
      const targetId = Number(under.dataset.id);
      const target = await dfsDb.nodes.get(targetId);
      if (target && target.type === "folder" && target.id !== node.id) {
        const ok = await dfsMove(node, target.id);
        if (ok) showToast(`"${node.name}"을(를) "${target.name}" 폴더로 옮겼습니다.`);
        await dfsBroadcastChange();
        return;
      }
    }
    const pos = clamp(parseFloat(iconEl.style.left) || 0, parseFloat(iconEl.style.top) || 0);
    await dfsDb.nodes.update(node.id, { x: pos.left, y: pos.top });
  });
}
function dfsElementUnder(clientX, clientY, excludeEl) {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    const iconEl = el.closest(".df-icon, .grid-item");
    if (iconEl && iconEl !== excludeEl) return iconEl;
  }
  return null;
}

/* ---------------- 우클릭 메뉴 빌더 (데스크탑 아이콘 / 창 안 그리드 아이템 공용) ---------------- */
function dfsBuildIconMenuItems(node, opts = {}) {
  const refresh = opts.refresh || dfsBroadcastChange;
  const items = [];
  if (node.type === "folder") {
    items.push({ label: "열기", action: () => dfsActivate(node) });
  } else if (node.type === "shortcut") {
    items.push({ label: "열기", action: () => dfsActivate(node) });
  } else {
    items.push({ label: "에디터로 열기", action: () => dfsActivate(node) });
    // 실제 탐색기 파일 메뉴와 순서를 맞춘다: 다운로드(웹훅으로 로컬 헬퍼가 저장) 다음
    // 브라우저에서 다운로드(강제 blob 다운로드).
    items.push({ label: "다운로드", action: () => localHelperSaveContent(node.name, node.content || "") });
    items.push({ label: "브라우저에서 다운로드", action: () => dfsDownloadVirtualFile(node) });
  }
  items.push({ label: "이름 변경", action: () => dfsPromptRename(node, refresh) });
  items.push({ label: "복사", action: () => { dfsClipboard = { id: node.id, mode: "copy" }; showToast(`"${node.name}"을(를) 복사했습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`); } });
  items.push({ label: "잘라내기", action: () => { dfsClipboard = { id: node.id, mode: "cut" }; showToast(`"${node.name}"을(를) 잘라냈습니다. 붙여넣을 위치에서 붙여넣기를 선택하세요.`); } });
  if (node.type !== "shortcut") {
    items.push({ label: "바로가기 만들기", action: async () => { await dfsCreateShortcut(node); await refresh(); } });
  }
  items.push({ label: "삭제", action: async () => {
    const ok = await showConfirmDialog(`"${node.name}"을(를) 삭제할까요?${node.type === "folder" ? " (안에 있는 것도 모두 삭제됩니다)" : ""}`);
    if (!ok) return;
    await dfsDelete(node);
    await refresh();
  } });
  return items;
}
function dfsBuildEmptyAreaMenuItems(parentId, refresh) {
  const items = [
    { label: "새 폴더", action: async () => { await dfsCreateFolder(parentId); await refresh(); } },
    { label: "새 텍스트 문서", action: async () => { await dfsCreateFile(parentId, "txt"); await refresh(); } },
    { label: "새 Markdown 문서", action: async () => { await dfsCreateFile(parentId, "md"); await refresh(); } },
    { label: "새 HTML 문서", action: async () => { await dfsCreateFile(parentId, "html"); await refresh(); } },
  ];
  if (dfsClipboard) items.push({ label: "붙여넣기", action: async () => { await dfsPasteInto(parentId); await refresh(); } });
  items.push({ label: "새로고침", action: () => refresh() });
  return items;
}
async function dfsPromptRename(node, refresh) {
  const next = await showPromptDialog("새 이름", node.name);
  if (next == null) return;
  const ok = await dfsRename(node, next);
  if (ok) refresh();
}
async function dfsDownloadVirtualFile(node) {
  const blob = new Blob([node.content || ""], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = node.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- 활성화(더블클릭) ----------------
   에디터는 더 이상 탐색기 창 내부에서 그려지지 않는다 - 파일을 열면 완전히 독립된
   새 탭(dfsOpenFileInNewTab)으로 뜬다. */
async function dfsActivate(node) {
  if (node.type === "folder") {
    // 이제 별도 팝업 창이 아니라, 하나로 통합된 "진짜" 탐색기 창(#win)에서 이 폴더의 바탕화면
    // 경로(["바탕화면", ...조상들..., 이 폴더])로 이동시킨다.
    const chain = await dfsBuildPath(node.id);
    openRealExplorerAt([DESKTOP_TREE_NAME, ...chain.map(seg => seg.name)]);
    return;
  }
  if (node.type === "shortcut") {
    const target = await dfsDb.nodes.get(node.targetId);
    if (!target) { showToast("바로가기 대상을 찾을 수 없습니다(삭제된 항목).", { kind: "warn" }); return; }
    return dfsActivate(target);
  }
  dfsOpenFileInNewTab(node, { readonly: false });
}

/* ============================================================================
   바탕화면 경로 유틸
   ----------------------------------------------------------------------------
   예전에는 바탕화면 폴더를 열면 "진짜" 탐색기(#win)와 별개로 여러 개 동시에 뜰 수 있는 팝업
   창(dfsOpenExplorerWindow)을 새로 만들었지만, 이제는 완전히 하나의 창으로 통합됐다(사용자
   지시) - 바탕화면 폴더를 열면 그냥 #win이 ["바탕화면", ...] 경로로 이동한다(openRealExplorerAt
   / dfsActivate 참고). 아래 dfsBuildPath만 그 경로를 계산하기 위해 남아 있다.
================================================================================= */
async function dfsBuildPath(folderId) {
  // desktop root부터 folderId까지 [{id,name}, ...] (desktop 자체는 포함 안 함, folderId===DESKTOP_ROOT면 빈 배열)
  const chain = [];
  let cur = folderId;
  while (cur !== DFS_DESKTOP_ROOT && cur != null) {
    const node = await dfsDb.nodes.get(cur);
    if (!node) break;
    chain.unshift({ id: node.id, name: node.name });
    cur = node.parentId;
  }
  return chain;
}

dfsInitDb();

