/* ============================================================================
   메뉴 메이커 (시작 메뉴 + 트레이 GUI 편집기)
   ----------------------------------------------------------------------------
   사용자 지시: "menu.json 메이커 GUI로 메뉴를 바로 넣었다 뺏다도 가능, 아이콘(base64 붙여 넣어도
   됨) URL 이름 지정 가능". editor.js와 완전히 같은 방식으로("에디터는 GUI 내부가 아니라 새 탭으로
   열어") about:blank 새 탭에 완전히 독립된 문서를 write한다 - 이 페이지(opener)의 함수는 열 때
   초기 데이터(현재 menu.json 내용)를 건네주는 용도로만 한 번 쓰고, 그 뒤로는 새 탭이 자기 스스로
   완결된다(저장/다운로드도 opener 없이 직접 웹훅을 두드린다 - 에디터의 다운로드 버튼과 동일한 패턴).
================================================================================= */
const DF_MENUMAKER_PAGE_CSS = `
  html, body { margin: 0; height: 100%; }
  * { box-sizing: border-box; }
  body { font: 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .mm-root { position: fixed; inset: 0; display: flex; flex-direction: column; background: var(--mm-bg,#14161b); color: var(--mm-text,#d7dae0); }
  .mm-root { --mm-bg:#14161b; --mm-panel:#181b21; --mm-panel2:#1d2129; --mm-border:#2b3039; --mm-text:#d7dae0; --mm-muted:#858c99; --mm-accent:#8b7cf6; --mm-accent2:#a89dff; --mm-hover:#ffffff08; --mm-sel:#8b7cf633; }
  .mm-top { height: 44px; flex: 0 0 44px; display: flex; align-items: center; gap: 8px; padding: 0 12px; background: var(--mm-panel); border-bottom: 1px solid var(--mm-border); }
  .mm-top .mm-title { font-size: 13.5px; font-weight: 700; }
  .mm-top .mm-spacer { flex: 1; }
  .mm-top button, .mm-panel button, .mm-row-btn { border: 1px solid var(--mm-border); background: transparent; color: var(--mm-muted); height: 28px; padding: 0 10px; border-radius: 6px; cursor: pointer; font: inherit; font-size: 12.5px; }
  .mm-top button:hover, .mm-panel button:hover, .mm-row-btn:hover { background: var(--mm-hover); color: var(--mm-text); }
  .mm-top .mm-save-state { font-size: 11px; color: var(--mm-muted); font-family: "SFMono-Regular",Consolas,monospace; }
  .mm-body { flex: 1; min-height: 0; display: flex; }
  .mm-lists { width: 320px; flex: 0 0 320px; border-right: 1px solid var(--mm-border); overflow: auto; padding: 12px; }
  .mm-panel { flex: 1; min-width: 0; overflow: auto; padding: 18px 24px; }
  .mm-section-head { display: flex; align-items: center; gap: 8px; margin: 14px 0 6px; }
  .mm-section-head:first-child { margin-top: 0; }
  .mm-section-head h3 { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--mm-muted); text-transform: uppercase; letter-spacing: .04em; flex: 1; }
  .mm-list { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; }
  .mm-item-row { display: flex; align-items: center; gap: 6px; padding: 5px 6px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
  .mm-item-row:hover { background: var(--mm-hover); }
  .mm-item-row.selected { background: var(--mm-sel); border-color: var(--mm-accent); }
  .mm-item-icon { width: 18px; height: 18px; border-radius: 4px; overflow: hidden; flex: 0 0 18px; display: flex; align-items: center; justify-content: center; background: var(--mm-panel2); font-size: 10.5px; color: var(--mm-muted); }
  .mm-item-icon img { width: 100%; height: 100%; object-fit: cover; }
  .mm-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
  .mm-item-name.empty { color: var(--mm-muted); font-style: italic; }
  .mm-item-btns { display: none; gap: 2px; }
  .mm-item-row:hover .mm-item-btns, .mm-item-row.selected .mm-item-btns { display: flex; }
  .mm-item-btns .mm-row-btn { height: 20px; width: 20px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1; }
  .mm-children { margin-left: 18px; border-left: 1px dashed var(--mm-border); padding-left: 6px; }
  .mm-add-row { width: 100%; margin-top: 2px; text-align: left; color: var(--mm-muted); }
  .mm-field { margin-bottom: 14px; }
  .mm-field label { display: block; font-size: 11.5px; color: var(--mm-muted); margin-bottom: 4px; }
  .mm-field input[type=text], .mm-field input[type=number], .mm-field input[type=url] { width: 100%; background: var(--mm-panel2); border: 1px solid var(--mm-border); color: var(--mm-text); border-radius: 6px; padding: 7px 9px; font: inherit; font-size: 12.5px; }
  .mm-field input[type=text]:focus, .mm-field input[type=number]:focus, .mm-field input[type=url]:focus { outline: 1px solid var(--mm-accent); }
  .mm-check-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; margin-bottom: 10px; }
  .mm-dims { display: flex; gap: 10px; }
  .mm-dims .mm-field { flex: 1; }
  .mm-icon-editor { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .mm-icon-preview { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: var(--mm-panel2); border: 1px solid var(--mm-border); display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--mm-muted); flex: 0 0 40px; }
  .mm-icon-preview img { width: 100%; height: 100%; object-fit: cover; }
  .mm-icon-actions { display: flex; flex-direction: column; gap: 4px; }
  .mm-icon-actions .mm-hint { font-size: 10.5px; color: var(--mm-muted); }
  .mm-empty-hint { color: var(--mm-muted); font-size: 12.5px; padding: 40px 0; text-align: center; }
  .mm-submenu-note { font-size: 11.5px; color: var(--mm-muted); background: var(--mm-panel2); border: 1px solid var(--mm-border); border-radius: 6px; padding: 8px 10px; margin-bottom: 14px; }
  .mm-section-sub { font-size: 10.5px; color: var(--mm-muted); margin: 2px 0 6px; }
  .mm-special-row { display: flex; align-items: center; gap: 6px; padding: 5px 6px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
  .mm-special-row:hover { background: var(--mm-hover); }
  .mm-special-row.selected { background: var(--mm-sel); border-color: var(--mm-accent); }
  .mm-key-input { font-family: "SFMono-Regular",Consolas,monospace; }
`;

function dfMmFnBundle() {
  return [escapeHtml].map(fn => fn.toString()).join("\n");
}

function dfsBuildMenuMakerPageHtml(initialData) {
  // "</script"가 그대로 들어있으면(아이콘 URL이나 이름에 우연히 포함될 수 있음) 이 문자열을 담을
  // <script> 태그 자체가 거기서 끊겨버리므로, JSON 문자열 안의 그 시퀀스만 이스케이프해 둔다.
  const dataJson = JSON.stringify(initialData || { start: [], tray: [] }).replace(/<\/script/gi, "<\\/script");
  const bodyHtml = `
    <div class="mm-root" id="mmRoot">
      <div class="mm-top">
        <span class="mm-title">메뉴 메이커</span>
        <span class="mm-spacer"></span>
        <span class="mm-save-state" id="mmSaveState"></span>
        <button id="mmImport" title="디스크에 있는 menu.json 파일을 불러와 현재 내용을 덮어씁니다">가져오기</button>
        <input type="file" id="mmImportFile" accept=".json,application/json" style="display:none;">
        <button id="mmSave">저장/다운로드</button>
      </div>
      <div class="mm-body">
        <div class="mm-lists">
          <div class="mm-section-head"><h3>시작 메뉴</h3></div>
          <div class="mm-list" id="mmStartList"></div>
          <button class="mm-add-row" id="mmAddStart">+ 새 항목 추가</button>
          <div class="mm-section-head"><h3>트레이(빠른 실행)</h3></div>
          <div class="mm-list" id="mmTrayList"></div>
          <button class="mm-add-row" id="mmAddTray">+ 새 항목 추가</button>
          <div class="mm-section-head"><h3>특수 아이콘</h3></div>
          <div class="mm-section-sub">바탕화면·트리에 쓰이는 고정 아이콘 2개(비워두면 기본 아이콘 사용)</div>
          <div class="mm-list" id="mmSpecialIconList"></div>
          <div class="mm-section-head"><h3>폴더별 아이콘</h3></div>
          <div class="mm-section-sub">저장소 안의 특정 폴더 경로에 아이콘을 지정합니다 (예: docs/images)</div>
          <div class="mm-list" id="mmIconFolderList"></div>
          <button class="mm-add-row" id="mmAddIconFolder">+ 폴더 아이콘 추가</button>
          <div class="mm-section-head"><h3>확장자별 아이콘</h3></div>
          <div class="mm-section-sub">파일 확장자(점 없이, 예: pdf)에 아이콘을 지정합니다</div>
          <div class="mm-list" id="mmIconExtList"></div>
          <button class="mm-add-row" id="mmAddIconExt">+ 확장자 아이콘 추가</button>
        </div>
        <div class="mm-panel" id="mmPanel"></div>
      </div>
    </div>`;
  const runtime = `
(function(){
  var DATA = ${dataJson};
  DATA.start = Array.isArray(DATA.start) ? DATA.start : [];
  DATA.tray = Array.isArray(DATA.tray) ? DATA.tray : [];
  // menu.json의 "icons" 섹션(폴더/확장자별 커스텀 아이콘 + 저장소 루트/휴지통 아이콘) - state.js의
  // customIconConfig와 완전히 같은 모양이다. folders/extensions는 {경로: 아이콘} 객체지만 편집
  // UI에서는 순서가 있는 목록으로 다루는 게 훨씬 편해서 배열로 풀어서 들고 있다가 저장할 때 다시
  // 객체로 합친다(serialize 참고).
  var rawIcons = (DATA.icons && typeof DATA.icons === "object") ? DATA.icons : {};
  DATA.iconRepoRoot = typeof rawIcons.repoRoot === "string" ? rawIcons.repoRoot : "";
  DATA.iconRecycleBin = typeof rawIcons.recycleBin === "string" ? rawIcons.recycleBin : "";
  DATA.iconFolders = (rawIcons.folders && typeof rawIcons.folders === "object")
    ? Object.keys(rawIcons.folders).map(function(k) { return { key: k, icon: rawIcons.folders[k] }; }) : [];
  DATA.iconExts = (rawIcons.extensions && typeof rawIcons.extensions === "object")
    ? Object.keys(rawIcons.extensions).map(function(k) { return { key: k, icon: rawIcons.extensions[k] }; }) : [];
  delete DATA.icons;
  var sel = null; // { section: "start"|"tray"|"iconFolders"|"iconExts"|"iconRepoRoot"|"iconRecycleBin", path/idx: ... }
  var dirty = false;

  var startListEl = document.getElementById("mmStartList");
  var trayListEl = document.getElementById("mmTrayList");
  var specialIconListEl = document.getElementById("mmSpecialIconList");
  var iconFolderListEl = document.getElementById("mmIconFolderList");
  var iconExtListEl = document.getElementById("mmIconExtList");
  var panelEl = document.getElementById("mmPanel");
  var saveStateEl = document.getElementById("mmSaveState");

  function blankItem() { return { name: "새 항목", url: "", icon: "", newTab: true, popup: false, width: 900, height: 640 }; }
  function setDirty() { dirty = true; saveStateEl.textContent = "저장 안 됨"; }

  function resolveParent(section, path) {
    var arr = DATA[section];
    for (var i = 0; i < path.length - 1; i++) {
      var node = arr[path[i]];
      if (!node.items) node.items = [];
      arr = node.items;
    }
    return { arr: arr, idx: path[path.length - 1] };
  }
  function getItem(section, path) {
    var r = resolveParent(section, path);
    return r.arr[r.idx];
  }
  function samePath(a, b) {
    if (!a || !b || a.section !== b.section || a.path.length !== b.path.length) return false;
    for (var i = 0; i < a.path.length; i++) if (a.path[i] !== b.path[i]) return false;
    return true;
  }

  function iconThumbHtml(icon, name) {
    if (icon) return '<img src="' + escapeHtml(icon) + '" alt="">';
    return escapeHtml(((name || "?").trim().charAt(0) || "?").toUpperCase());
  }

  function renderList(section, arr, container, path) {
    container.innerHTML = "";
    arr.forEach(function(item, idx) {
      var thisPath = path.concat([idx]);
      var row = document.createElement("div");
      row.className = "mm-item-row" + (sel && samePath(sel, { section: section, path: thisPath }) ? " selected" : "");
      var iconEl = document.createElement("div");
      iconEl.className = "mm-item-icon";
      iconEl.innerHTML = iconThumbHtml(item.icon, item.name);
      row.appendChild(iconEl);
      var nameEl = document.createElement("span");
      nameEl.className = "mm-item-name" + (item.name ? "" : " empty");
      nameEl.textContent = item.name || "(이름 없음)";
      row.appendChild(nameEl);
      var btns = document.createElement("div");
      btns.className = "mm-item-btns";
      var upBtn = document.createElement("button"); upBtn.className = "mm-row-btn"; upBtn.title = "위로"; upBtn.textContent = "\\u25B2";
      upBtn.onclick = function(e) { e.stopPropagation(); if (idx > 0) { var t = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = t; setDirty(); renderAll(); } };
      var downBtn = document.createElement("button"); downBtn.className = "mm-row-btn"; downBtn.title = "아래로"; downBtn.textContent = "\\u25BC";
      downBtn.onclick = function(e) { e.stopPropagation(); if (idx < arr.length - 1) { var t = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = t; setDirty(); renderAll(); } };
      var delBtn = document.createElement("button"); delBtn.className = "mm-row-btn"; delBtn.title = "삭제"; delBtn.textContent = "\\u2715";
      delBtn.onclick = function(e) {
        e.stopPropagation();
        arr.splice(idx, 1);
        if (sel && samePath(sel, { section: section, path: thisPath })) sel = null;
        setDirty();
        renderAll();
      };
      btns.appendChild(upBtn); btns.appendChild(downBtn); btns.appendChild(delBtn);
      row.appendChild(btns);
      row.onclick = function() { sel = { section: section, path: thisPath }; renderAll(); };
      container.appendChild(row);

      // 시작 메뉴 항목만 하위 메뉴(submenu)를 가질 수 있다(트레이는 항상 낱개 아이콘 -
      // settings-startmenu.js의 renderAppList/renderTrayIcons과 같은 규칙).
      if (section === "start") {
        var childWrap = document.createElement("div");
        childWrap.className = "mm-children";
        if (Array.isArray(item.items) && item.items.length) {
          renderList(section, item.items, childWrap, thisPath);
        }
        var addChildBtn = document.createElement("button");
        addChildBtn.className = "mm-add-row";
        addChildBtn.textContent = "+ 하위 메뉴 추가";
        addChildBtn.onclick = function(e) {
          e.stopPropagation();
          if (!item.items) item.items = [];
          item.items.push(blankItem());
          sel = { section: section, path: thisPath.concat([item.items.length - 1]) };
          setDirty();
          renderAll();
        };
        childWrap.appendChild(addChildBtn);
        container.appendChild(childWrap);
      }
    });
  }

  // 폴더별/확장자별 아이콘 목록(각각 {key, icon} 배열) - 시작메뉴/트레이의 renderList와 달리
  // 하위 메뉴나 순서 바꾸기가 없는 단순 평면 목록이라 별도 렌더 함수로 뺐다.
  function renderIconKeyList(section, arr, container, placeholder) {
    container.innerHTML = "";
    arr.forEach(function(item, idx) {
      var row = document.createElement("div");
      row.className = "mm-item-row" + (sel && sel.section === section && sel.idx === idx ? " selected" : "");
      var iconEl = document.createElement("div");
      iconEl.className = "mm-item-icon";
      iconEl.innerHTML = iconThumbHtml(item.icon, item.key);
      row.appendChild(iconEl);
      var nameEl = document.createElement("span");
      nameEl.className = "mm-item-name" + (item.key ? "" : " empty");
      nameEl.textContent = item.key || placeholder;
      row.appendChild(nameEl);
      var btns = document.createElement("div");
      btns.className = "mm-item-btns";
      var delBtn = document.createElement("button"); delBtn.className = "mm-row-btn"; delBtn.title = "삭제"; delBtn.textContent = "✕";
      delBtn.onclick = function(e) {
        e.stopPropagation();
        arr.splice(idx, 1);
        if (sel && sel.section === section && sel.idx === idx) sel = null;
        setDirty();
        renderAll();
      };
      btns.appendChild(delBtn);
      row.appendChild(btns);
      row.onclick = function() { sel = { section: section, idx: idx }; renderAll(); };
      container.appendChild(row);
    });
  }

  // 저장소 루트 / 휴지통 - 고정 슬롯 2개짜리 목록(추가/삭제 없이 항상 존재, 클릭하면 편집 패널로).
  function renderSpecialIconList() {
    specialIconListEl.innerHTML = "";
    [
      { section: "iconRepoRoot", label: "저장소 루트 아이콘", get: function() { return DATA.iconRepoRoot; } },
      { section: "iconRecycleBin", label: "휴지통 아이콘", get: function() { return DATA.iconRecycleBin; } }
    ].forEach(function(spec) {
      var row = document.createElement("div");
      row.className = "mm-special-row" + (sel && sel.section === spec.section ? " selected" : "");
      var iconEl = document.createElement("div");
      iconEl.className = "mm-item-icon";
      iconEl.innerHTML = iconThumbHtml(spec.get(), spec.label);
      row.appendChild(iconEl);
      var nameEl = document.createElement("span");
      nameEl.className = "mm-item-name";
      nameEl.textContent = spec.label;
      row.appendChild(nameEl);
      row.onclick = function() { sel = { section: spec.section }; renderAll(); };
      specialIconListEl.appendChild(row);
    });
  }

  // 아이콘 편집기(미리보기 + URL 입력 + 붙여넣기(Ctrl+V) + 파일 선택 -> base64) - 시작메뉴/트레이
  // 항목뿐 아니라 아래의 폴더별/확장자별/특수(저장소 루트·휴지통) 아이콘 편집 패널에서도 그대로
  // 재사용한다(예전엔 시작메뉴/트레이 패널에만 인라인으로 있었다).
  function buildIconEditorField(labelText, initialIcon, previewName, onChange) {
    var iconWrap = document.createElement("div");
    iconWrap.className = "mm-field";
    var iconLabel = document.createElement("label");
    iconLabel.textContent = labelText;
    iconWrap.appendChild(iconLabel);
    var iconRow = document.createElement("div");
    iconRow.className = "mm-icon-editor";
    var iconPreview = document.createElement("div");
    iconPreview.className = "mm-icon-preview";
    var currentIcon = initialIcon || "";
    function refreshIconPreview() { iconPreview.innerHTML = iconThumbHtml(currentIcon, previewName); }
    refreshIconPreview();
    var iconActions = document.createElement("div");
    iconActions.className = "mm-icon-actions";
    var iconUrlInput = document.createElement("input");
    iconUrlInput.type = "text"; iconUrlInput.placeholder = "아이콘 URL 또는 붙여넣기(Ctrl+V)로 이미지 삽입";
    iconUrlInput.value = currentIcon;
    function setIcon(v) { currentIcon = v; iconUrlInput.value = v; refreshIconPreview(); onChange(v); }
    iconUrlInput.oninput = function() { setIcon(iconUrlInput.value); };
    iconUrlInput.onpaste = function(e) {
      var items = (e.clipboardData && e.clipboardData.items) || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf("image/") === 0) {
          var file = items[i].getAsFile();
          if (!file) continue;
          e.preventDefault();
          var reader = new FileReader();
          reader.onload = function() { setIcon(reader.result); };
          reader.readAsDataURL(file);
          return;
        }
      }
      // 이미지가 아니면(그냥 URL 텍스트 등) 기본 붙여넣기 동작 그대로 둔다
    };
    var fileInput = document.createElement("input");
    fileInput.type = "file"; fileInput.accept = "image/*"; fileInput.style.display = "none";
    fileInput.onchange = function() {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function() { setIcon(reader.result); };
      reader.readAsDataURL(file);
    };
    var fileBtn = document.createElement("button");
    fileBtn.textContent = "이미지 파일 선택";
    fileBtn.onclick = function() { fileInput.click(); };
    var hint = document.createElement("div");
    hint.className = "mm-hint";
    hint.textContent = "이미지를 클립보드에 복사한 뒤 위 입력칸에 Ctrl+V로 붙여넣어도 base64로 바로 들어갑니다.";
    iconActions.appendChild(iconUrlInput);
    var actionsBtnRow = document.createElement("div");
    actionsBtnRow.style.display = "flex"; actionsBtnRow.style.gap = "6px";
    actionsBtnRow.appendChild(fileBtn);
    iconActions.appendChild(actionsBtnRow);
    iconActions.appendChild(hint);
    iconRow.appendChild(iconPreview);
    iconRow.appendChild(iconActions);
    iconRow.appendChild(fileInput);
    iconWrap.appendChild(iconRow);
    return iconWrap;
  }

  function fieldInto(panel, labelText, inputEl) {
    var wrap = document.createElement("div");
    wrap.className = "mm-field";
    var label = document.createElement("label");
    label.textContent = labelText;
    wrap.appendChild(label);
    wrap.appendChild(inputEl);
    panel.appendChild(wrap);
    return wrap;
  }

  // 폴더별/확장자별 아이콘 목록의 한 항목(경로 또는 확장자 문자열 + 아이콘) 편집 패널.
  function renderIconKeyPanel() {
    var arr = sel.section === "iconFolders" ? DATA.iconFolders : DATA.iconExts;
    var item = arr[sel.idx];
    if (!item) { sel = null; renderPanel(); return; }
    var isFolder = sel.section === "iconFolders";
    panelEl.innerHTML = "";
    var note = document.createElement("div");
    note.className = "mm-submenu-note";
    note.textContent = isFolder
      ? "저장소 루트 기준 폴더 경로를 입력하세요(예: docs/images). 대소문자를 구분합니다."
      : "점(.) 없이 확장자만 입력하세요(예: pdf, png). 대소문자는 구분하지 않습니다.";
    panelEl.appendChild(note);

    var keyInput = document.createElement("input");
    keyInput.type = "text"; keyInput.className = "mm-key-input";
    keyInput.placeholder = isFolder ? "예: docs/images" : "예: pdf";
    keyInput.value = item.key || "";
    keyInput.oninput = function() { item.key = keyInput.value; setDirty(); renderLists(); };
    fieldInto(panelEl, isFolder ? "폴더 경로" : "확장자", keyInput);

    var iconField = buildIconEditorField("아이콘", item.icon, item.key || "?", function(newIcon) {
      item.icon = newIcon; setDirty(); renderLists();
    });
    panelEl.appendChild(iconField);
  }

  // 저장소 루트 / 휴지통 - 목록이 아니라 고정 슬롯 2개짜리 단일 아이콘 편집 패널.
  function renderSpecialIconPanel() {
    var isRepoRoot = sel.section === "iconRepoRoot";
    var label = isRepoRoot ? "저장소 루트 아이콘" : "휴지통 아이콘";
    panelEl.innerHTML = "";
    var note = document.createElement("div");
    note.className = "mm-submenu-note";
    note.textContent = (isRepoRoot
      ? "바탕화면과 트리 맨 위의 저장소 루트 폴더에 쓰이는 아이콘입니다."
      : "바탕화면과 트리의 휴지통에 쓰이는 아이콘입니다.") + " 비워두면 기본 아이콘을 사용합니다.";
    panelEl.appendChild(note);
    var iconField = buildIconEditorField(label, isRepoRoot ? DATA.iconRepoRoot : DATA.iconRecycleBin, label, function(newIcon) {
      if (isRepoRoot) DATA.iconRepoRoot = newIcon; else DATA.iconRecycleBin = newIcon;
      setDirty(); renderLists();
    });
    panelEl.appendChild(iconField);
  }

  function renderPanel() {
    if (!sel) { panelEl.innerHTML = '<div class="mm-empty-hint">왼쪽에서 항목을 고르거나 "+ 새 항목 추가"로 새로 만드세요.</div>'; return; }
    if (sel.section === "iconFolders" || sel.section === "iconExts") { renderIconKeyPanel(); return; }
    if (sel.section === "iconRepoRoot" || sel.section === "iconRecycleBin") { renderSpecialIconPanel(); return; }
    var item = getItem(sel.section, sel.path);
    if (!item) { sel = null; renderPanel(); return; }
    var hasChildren = sel.section === "start" && Array.isArray(item.items) && item.items.length > 0;
    panelEl.innerHTML = "";

    if (hasChildren) {
      var note = document.createElement("div");
      note.className = "mm-submenu-note";
      note.textContent = "이 항목은 하위 메뉴가 있어 클릭하면 주소로 이동하는 대신 하위 메뉴가 펼쳐집니다(이름/아이콘만 사용됨).";
      panelEl.appendChild(note);
    }

    function field(labelText, inputEl) { return fieldInto(panelEl, labelText, inputEl); }

    var nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.value = item.name || "";
    nameInput.oninput = function() { item.name = nameInput.value; setDirty(); renderLists(); };
    field("이름", nameInput);

    var urlInput = document.createElement("input");
    urlInput.type = "url"; urlInput.placeholder = "https://...";
    urlInput.value = item.url || "";
    urlInput.oninput = function() { item.url = urlInput.value; setDirty(); };
    field("주소(URL)", urlInput);

    var iconField = buildIconEditorField("아이콘", item.icon, item.name, function(newIcon) {
      item.icon = newIcon; setDirty(); renderLists();
    });
    panelEl.appendChild(iconField);

    if (!hasChildren) {
      var newTabRow = document.createElement("label");
      newTabRow.className = "mm-check-row";
      var newTabCb = document.createElement("input");
      newTabCb.type = "checkbox"; newTabCb.checked = item.newTab !== false;
      newTabCb.onchange = function() { item.newTab = newTabCb.checked; setDirty(); };
      newTabRow.appendChild(newTabCb);
      newTabRow.appendChild(document.createTextNode(" 새 탭에서 열기"));
      panelEl.appendChild(newTabRow);

      var popupRow = document.createElement("label");
      popupRow.className = "mm-check-row";
      var popupCb = document.createElement("input");
      popupCb.type = "checkbox"; popupCb.checked = !!item.popup;
      popupRow.appendChild(popupCb);
      popupRow.appendChild(document.createTextNode(" 팝업 창으로 열기(체크 해제 시 새/현재 탭)"));
      panelEl.appendChild(popupRow);

      var dimsWrap = document.createElement("div");
      dimsWrap.className = "mm-dims";
      dimsWrap.style.display = item.popup ? "flex" : "none";
      var wInput = document.createElement("input");
      wInput.type = "number"; wInput.min = "200"; wInput.value = item.width || 900;
      wInput.oninput = function() { item.width = Number(wInput.value) || 900; setDirty(); };
      var wField = document.createElement("div"); wField.className = "mm-field";
      var wLabel = document.createElement("label"); wLabel.textContent = "팝업 너비";
      wField.appendChild(wLabel); wField.appendChild(wInput);
      var hInput = document.createElement("input");
      hInput.type = "number"; hInput.min = "150"; hInput.value = item.height || 640;
      hInput.oninput = function() { item.height = Number(hInput.value) || 640; setDirty(); };
      var hField = document.createElement("div"); hField.className = "mm-field";
      var hLabel = document.createElement("label"); hLabel.textContent = "팝업 높이";
      hField.appendChild(hLabel); hField.appendChild(hInput);
      dimsWrap.appendChild(wField); dimsWrap.appendChild(hField);
      panelEl.appendChild(dimsWrap);
      popupCb.onchange = function() { item.popup = popupCb.checked; dimsWrap.style.display = item.popup ? "flex" : "none"; setDirty(); };
    }
  }

  function renderLists() {
    renderList("start", DATA.start, startListEl, []);
    renderList("tray", DATA.tray, trayListEl, []);
    renderSpecialIconList();
    renderIconKeyList("iconFolders", DATA.iconFolders, iconFolderListEl, "(경로 없음)");
    renderIconKeyList("iconExts", DATA.iconExts, iconExtListEl, "(확장자 없음)");
  }
  function renderAll() { renderLists(); renderPanel(); }

  document.getElementById("mmAddStart").onclick = function() {
    DATA.start.push(blankItem());
    sel = { section: "start", path: [DATA.start.length - 1] };
    setDirty(); renderAll();
  };
  document.getElementById("mmAddTray").onclick = function() {
    DATA.tray.push(blankItem());
    sel = { section: "tray", path: [DATA.tray.length - 1] };
    setDirty(); renderAll();
  };
  document.getElementById("mmAddIconFolder").onclick = function() {
    DATA.iconFolders.push({ key: "", icon: "" });
    sel = { section: "iconFolders", idx: DATA.iconFolders.length - 1 };
    setDirty(); renderAll();
  };
  document.getElementById("mmAddIconExt").onclick = function() {
    DATA.iconExts.push({ key: "", icon: "" });
    sel = { section: "iconExts", idx: DATA.iconExts.length - 1 };
    setDirty(); renderAll();
  };

  // 가져오기(필수 기능): 디스크에 있는 menu.json(또는 같은 형식의 파일)을 골라서 통째로 불러온다.
  // 이미 편집 중인 내용이 있으면 덮어쓰기 전에 한 번 확인한다.
  var importFileInput = document.getElementById("mmImportFile");
  document.getElementById("mmImport").onclick = function() {
    if (dirty && !confirm("저장하지 않은 변경 사항이 있습니다. 지금 파일을 불러오면 현재 내용을 덮어씁니다. 계속할까요?")) return;
    importFileInput.value = "";
    importFileInput.click();
  };
  importFileInput.onchange = function() {
    var file = importFileInput.files && importFileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      var parsed;
      try { parsed = JSON.parse(String(reader.result)); } catch (e) {
        alert("이 파일은 올바른 JSON이 아닙니다: " + e.message);
        return;
      }
      if (!parsed || typeof parsed !== "object") { alert("이 파일의 형식을 알아볼 수 없습니다."); return; }
      DATA.start = Array.isArray(parsed.start) ? parsed.start : [];
      DATA.tray = Array.isArray(parsed.tray) ? parsed.tray : [];
      var rawIcons2 = (parsed.icons && typeof parsed.icons === "object") ? parsed.icons : {};
      DATA.iconRepoRoot = typeof rawIcons2.repoRoot === "string" ? rawIcons2.repoRoot : "";
      DATA.iconRecycleBin = typeof rawIcons2.recycleBin === "string" ? rawIcons2.recycleBin : "";
      DATA.iconFolders = (rawIcons2.folders && typeof rawIcons2.folders === "object")
        ? Object.keys(rawIcons2.folders).map(function(k) { return { key: k, icon: rawIcons2.folders[k] }; }) : [];
      DATA.iconExts = (rawIcons2.extensions && typeof rawIcons2.extensions === "object")
        ? Object.keys(rawIcons2.extensions).map(function(k) { return { key: k, icon: rawIcons2.extensions[k] }; }) : [];
      sel = null;
      setDirty();
      renderAll();
      saveStateEl.textContent = file.name + " 불러옴 - 저장 안 됨";
    };
    reader.onerror = function() { alert("파일을 읽는 중 오류가 발생했습니다."); };
    reader.readAsText(file);
  };

  // 저장/다운로드: 에디터(editor.js)의 다운로드 버튼과 완전히 같은 패턴 - 로컬 헬퍼(웹훅)가 켜져
  // 있으면 웹훅으로 저장 대화상자, 아니면 브라우저 자체 blob 다운로드로 떨어진다. 저장 위치는 항상
  // 사용자가 직접 고르므로(정적 사이트라 저장소에 바로 쓸 수 없음), 받은 menu.json을 저장소의
  // _NIH_ROOT_/index/menu.json 위치에 덮어써야 실제로 반영된다(환경설정의 안내 문구 참고).
  function cleanItem(it) {
    var out = { name: it.name || "", url: it.url || "", icon: it.icon || "" };
    if (it.newTab === false) out.newTab = false;
    if (it.popup) { out.popup = true; out.width = it.width || 900; out.height = it.height || 640; }
    if (Array.isArray(it.items) && it.items.length) out.items = it.items.map(cleanItem);
    return out;
  }
  // 편집용 배열({key, icon}[])을 실제 menu.json 스키마의 객체({경로/확장자: 아이콘})로 되돌린다.
  // 폴더 경로는 앞뒤 슬래시를 정리하고, 확장자는 점을 떼고 소문자로 맞춘다. key나 icon이 비어있는
  // 행은 저장하지 않는다(입력 중인 빈 행 등).
  function serializeIconMap(arr, normalizeKey) {
    var out = {};
    arr.forEach(function(it) {
      var key = normalizeKey((it.key || "").trim());
      if (!key || !it.icon) return;
      out[key] = it.icon;
    });
    return out;
  }
  function serialize() {
    var icons = {
      folders: serializeIconMap(DATA.iconFolders, function(k) { return k.replace(/^\\/+|\\/+$/g, ""); }),
      extensions: serializeIconMap(DATA.iconExts, function(k) { return k.replace(/^\\.+/, "").toLowerCase(); }),
      repoRoot: DATA.iconRepoRoot || "",
      recycleBin: DATA.iconRecycleBin || ""
    };
    return JSON.stringify({ start: DATA.start.map(cleanItem), tray: DATA.tray.map(cleanItem), icons: icons }, null, 2);
  }
  var HELPER_PORT_MIN = 8000, HELPER_PORT_MAX = 8020;
  var HELPER_SIG = "AHK-REPO-INDEXER-LOCALHELPER-v1";
  function pingHelperPort(port) {
    return fetch("http://127.0.0.1:" + port + "/ping", { signal: AbortSignal.timeout(800) })
      .then(function(res) { if (!res.ok) return null; return res.text().then(function(t) { return t.trim() === HELPER_SIG ? port : null; }); })
      .catch(function() { return null; });
  }
  function findHelperPort() {
    var ports = [];
    for (var p = HELPER_PORT_MIN; p <= HELPER_PORT_MAX; p++) ports.push(p);
    return Promise.all(ports.map(pingHelperPort)).then(function(results) {
      var found = results.filter(function(p) { return p !== null; }).sort(function(a, b) { return a - b; });
      return found.length ? found[0] : null;
    });
  }
  function blobDownload(text) {
    var blob = new Blob([text], { type: "application/json;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "menu.json"; a.click();
    URL.revokeObjectURL(a.href);
    saveStateEl.textContent = "브라우저로 다운로드됨 - 저장소의 _NIH_ROOT_/index/menu.json에 덮어써 주세요";
    dirty = false;
  }
  var saveBtn = document.getElementById("mmSave");
  saveBtn.onclick = function() {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    var oldLabel = saveBtn.textContent;
    saveBtn.textContent = "확인 중...";
    var text = serialize();
    findHelperPort().then(function(port) {
      saveBtn.disabled = false;
      saveBtn.textContent = oldLabel;
      if (port === null) { blobDownload(text); return; }
      return fetch("http://127.0.0.1:" + port + "/savecontent?name=" + encodeURIComponent("menu.json"), {
        method: "POST",
        body: text
      }).then(function(res) {
        return res.text().then(function(t) {
          if (!res.ok) throw new Error(String(res.status));
          if (t.indexOf("CANCELLED") !== -1) { saveStateEl.textContent = "다운로드가 취소되었습니다"; return; }
          saveStateEl.textContent = "웹훅으로 다운로드됨 - 저장소의 _NIH_ROOT_/index/menu.json에 덮어써 주세요";
          dirty = false;
        });
      });
    }).catch(function() {
      saveBtn.disabled = false;
      saveBtn.textContent = oldLabel;
      blobDownload(text);
    });
  };
  window.addEventListener("beforeunload", function(e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });
  // 에디터(editor.js)와 같은 습관으로 Ctrl+S도 저장 버튼과 동일하게 동작하게 해준다(UX 개선).
  window.addEventListener("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      saveBtn.click();
    }
  });

  renderAll();
})();
`;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>메뉴 메이커</title>
<style>${DF_MENUMAKER_PAGE_CSS}</style>
</head>
<body>
${bodyHtml}
<script>
${dfMmFnBundle()}
${runtime}
</script>
</body>
</html>`;
}

// 메뉴 메이커를 완전히 독립된 새 탭으로 연다(에디터와 같은 이유 - about:blank + document.write).
// 이 페이지(opener)의 loadMenuConfig()로 현재 _NIH_ROOT_/index/menu.json 내용을 한 번 읽어와
// 초기 데이터로 건네주기만 하고, 그 뒤로는 opener 없이도 새 탭 혼자 완결된다.
async function dfsOpenMenuMakerInNewTab() {
  let initial = null;
  try { initial = await loadMenuConfig(); } catch (e) { /* 무시 */ }
  const html = dfsBuildMenuMakerPageHtml(initial || { start: [], tray: [] });
  const win = window.open("about:blank", "_blank");
  if (!win) { showToast("팝업이 차단되었습니다. 브라우저 설정에서 이 사이트의 팝업을 허용해주세요.", { kind: "warn" }); return null; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return win;
}
