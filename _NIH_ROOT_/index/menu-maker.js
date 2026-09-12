/* ============================================================================
   메뉴 메이커 (시작 메뉴 + 트레이 + 아이콘 + 사운드 GUI 편집기)
   ----------------------------------------------------------------------------
   사용자 지시: "menu.json 메이커 GUI로 메뉴를 바로 넣었다 뺏다도 가능, 아이콘(base64 붙여 넣어도
   됨) URL 이름 지정 가능". 예전엔 editor.js와 완전히 같은 방식으로 about:blank 새 탭에 독립된
   문서를 write했지만, 요청 #135로 이제 app-window.js의 dfCreateAppWindow가 만든 앱 내 창으로
   연다. 한 번에 하나만 떠야 하므로(싱글턴) 호출부(dfsOpenMenuMakerInWindow)가 기존 핸들을
   기억해뒀다가 이미 열려 있으면 새로 만들지 않고 그 창을 앞으로 가져오기만 한다 - 그래서 이
   파일 안의 document.getElementById/querySelectorAll 호출들은 (에디터처럼 root로 스코프를
   한정하지 않고) 예전 그대로 전역 document를 그대로 쓴다. 인스턴스가 항상 최대 하나뿐이라
   충돌할 일이 없기 때문이다. 저장/다운로드도 여전히 이 페이지를 거치지 않고 직접 웹훅을
   두드린다(에디터의 다운로드 버튼과 동일한 패턴, local-helper.js의 ensureHelperPort 공유).

   요청 #122: "메뉴 메이커를 메뉴/아이콘/사운드 3개 탭으로 분리하고, 각각 menu_set.json/
   icon_set.json/sound_set.json 세 파일로 저장한다. 사운드는 모든 상황을 세세하게 나열해서 지정
   가능하게 한다." - 세 파일의 실제 스키마와 시나리오 목록은 state.js(customIconConfig,
   DF_SOUND_SCENARIOS)와 settings-startmenu.js(loadAllMenuMakerConfigs)를 그대로 따른다.
================================================================================= */
const DF_MENUMAKER_PAGE_CSS = `
  html, body { margin: 0; height: 100%; }
  * { box-sizing: border-box; }
  body { font: 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .mm-root { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; background: var(--mm-bg,#14161b); color: var(--mm-text,#d7dae0); }
  .mm-root { --mm-bg:#14161b; --mm-panel:#181b21; --mm-panel2:#1d2129; --mm-border:#2b3039; --mm-text:#d7dae0; --mm-muted:#858c99; --mm-accent:#8b7cf6; --mm-accent2:#a89dff; --mm-hover:#ffffff08; --mm-sel:#8b7cf633; }
  .mm-top { height: 44px; flex: 0 0 44px; display: flex; align-items: center; gap: 8px; padding: 0 12px; background: var(--mm-panel); border-bottom: 1px solid var(--mm-border); }
  .mm-top .mm-title { font-size: 13.5px; font-weight: 700; }
  .mm-top .mm-spacer { flex: 1; }
  .mm-tabs { display: flex; gap: 4px; }
  .mm-tab { border: 1px solid var(--mm-border); background: transparent; color: var(--mm-muted); height: 28px; padding: 0 12px; border-radius: 6px; cursor: pointer; font: inherit; font-size: 12.5px; }
  .mm-tab:hover { background: var(--mm-hover); color: var(--mm-text); }
  .mm-tab.active { background: var(--mm-sel); border-color: var(--mm-accent); color: var(--mm-text); }
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
  .mm-icon-actions { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
  .mm-icon-actions .mm-hint { font-size: 10.5px; color: var(--mm-muted); }
  .mm-empty-hint { color: var(--mm-muted); font-size: 12.5px; padding: 40px 0; text-align: center; }
  .mm-submenu-note { font-size: 11.5px; color: var(--mm-muted); background: var(--mm-panel2); border: 1px solid var(--mm-border); border-radius: 6px; padding: 8px 10px; margin-bottom: 14px; }
  .mm-section-sub { font-size: 10.5px; color: var(--mm-muted); margin: 2px 0 6px; }
  .mm-special-row { display: flex; align-items: center; gap: 6px; padding: 5px 6px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
  .mm-special-row:hover { background: var(--mm-hover); }
  .mm-special-row.selected { background: var(--mm-sel); border-color: var(--mm-accent); }
  .mm-key-input { font-family: "SFMono-Regular",Consolas,monospace; }
`;

// 메뉴 메이커 창 본문 HTML(창 자체의 타이틀바/이동/크기조절/닫기는 app-window.js의
// dfCreateAppWindow가 담당하므로, 여기서는 그 .app-win-body 안에 들어갈 내용만 만든다).
function dfsBuildMenuMakerBodyHtml() {
  return `
    <div class="mm-root" id="mmRoot">
      <div class="mm-top">
        <span class="mm-title">메뉴 메이커</span>
        <div class="mm-tabs" id="mmTabs">
          <button class="mm-tab" data-tab="menu">메뉴</button>
          <button class="mm-tab" data-tab="icon">아이콘</button>
          <button class="mm-tab" data-tab="sound">사운드</button>
        </div>
        <span class="mm-spacer"></span>
        <span class="mm-save-state" id="mmSaveState"></span>
        <button id="mmClearLocal" title="편집 중 계속 반영해온 로컬 미리보기를 지우고, 다음에 열 때부터 다시 실제 저장소 파일 내용을 씀">로컬 미리보기 초기화</button>
        <button id="mmImport">가져오기</button>
        <input type="file" id="mmImportFile" accept=".json,application/json" style="display:none;">
        <button id="mmSave">저장/다운로드(전체)</button>
      </div>
      <div class="mm-body">
        <div class="mm-lists" id="mmListsBody"></div>
        <div class="mm-panel" id="mmPanel"></div>
      </div>
    </div>`;
}

// 메뉴 메이커 창의 실제 동작을 연결한다. 싱글턴이라(dfsOpenMenuMakerInWindow가 보장) 아래
// document.getElementById/querySelectorAll 호출들은 root로 스코프를 한정하지 않고 그대로
// 전역 document를 쓴다 - 인스턴스가 항상 최대 하나뿐이라 충돌할 일이 없다(에디터는 여러 개
// 동시에 열릴 수 있어서 반드시 스코프를 지켜야 했던 것과 대조적).
function dfInitMenuMakerWindow(handle, initialData, state, initialTab) {
  var RAW = initialData || { menu: { start: [], tray: [] }, icons: {}, sounds: {} };
  var SOUND_SCENARIOS = DF_SOUND_SCENARIOS;
  var DATA = {};
  DATA.start = Array.isArray(RAW.menu && RAW.menu.start) ? RAW.menu.start : [];
  DATA.tray = Array.isArray(RAW.menu && RAW.menu.tray) ? RAW.menu.tray : [];
  // icon_set.json - state.js의 customIconConfig와 완전히 같은 모양이다. folders/extensions는
  // {경로: 아이콘} 객체지만 편집 UI에서는 순서가 있는 목록으로 다루는 게 훨씬 편해서 배열로 풀어서
  // 들고 있다가 저장할 때 다시 객체로 합친다(serializeIconSet 참고).
  var rawIcons = (RAW.icons && typeof RAW.icons === "object") ? RAW.icons : {};
  DATA.iconRepoRoot = typeof rawIcons.repoRoot === "string" ? rawIcons.repoRoot : "";
  DATA.iconRecycleBin = typeof rawIcons.recycleBin === "string" ? rawIcons.recycleBin : "";
  DATA.iconFolders = (rawIcons.folders && typeof rawIcons.folders === "object")
    ? Object.keys(rawIcons.folders).map(function(k) { return { key: k, icon: rawIcons.folders[k] }; }) : [];
  DATA.iconExts = (rawIcons.extensions && typeof rawIcons.extensions === "object")
    ? Object.keys(rawIcons.extensions).map(function(k) { return { key: k, icon: rawIcons.extensions[k] }; }) : [];
  // 요청 #121: 스킨 폴더(_NIH_ROOT_/index/ui/theme/<스킨>/) 안의 icon_set.json도 opener가
  // 미리 같이 읽어서 건네준다(RAW.skinIcons/RAW.skinName) - "스킨용으로 저장" 체크박스로 편집
  // 대상을 이 데이터셋으로 바꿔 쓸 수 있게 한다. menu_set.json/sound_set.json은 스킨용이라는
  // 개념 자체가 없다(항상 기본 위치에서만 읽고 쓴다).
  var rawSkinIcons = (RAW.skinIcons && typeof RAW.skinIcons === "object") ? RAW.skinIcons : {};
  DATA.skinName = typeof RAW.skinName === "string" && RAW.skinName ? RAW.skinName : "win7";
  DATA.skinIconRepoRoot = typeof rawSkinIcons.repoRoot === "string" ? rawSkinIcons.repoRoot : "";
  DATA.skinIconRecycleBin = typeof rawSkinIcons.recycleBin === "string" ? rawSkinIcons.recycleBin : "";
  DATA.skinIconFolders = (rawSkinIcons.folders && typeof rawSkinIcons.folders === "object")
    ? Object.keys(rawSkinIcons.folders).map(function(k) { return { key: k, icon: rawSkinIcons.folders[k] }; }) : [];
  DATA.skinIconExts = (rawSkinIcons.extensions && typeof rawSkinIcons.extensions === "object")
    ? Object.keys(rawSkinIcons.extensions).map(function(k) { return { key: k, icon: rawSkinIcons.extensions[k] }; }) : [];
  DATA.iconForSkin = false; // "스킨용으로 저장" 체크 여부 - 지금 아이콘 탭이 base/스킨 중 어느 데이터셋을 보여주는 중인지
  // sound_set.json - 키는 항상 SOUND_SCENARIOS에 나열된 시나리오 전체(빠진 키는 빈 문자열로
  // 채워서, 사운드 탭이 "이 앱에서 소리를 낼 수 있는 모든 경우"를 늘 전부 보여주게 한다).
  var rawSounds = (RAW.sounds && typeof RAW.sounds === "object") ? RAW.sounds : {};
  DATA.sounds = {};
  SOUND_SCENARIOS.forEach(function(s) { DATA.sounds[s.key] = typeof rawSounds[s.key] === "string" ? rawSounds[s.key] : ""; });

  // 아이콘 탭의 "스킨용으로 저장" 체크박스를 켜고 끌 때 쓴다. DATA.iconFolders/iconExts/
  // iconRepoRoot/iconRecycleBin은 항상 "지금 화면에 보이는" 데이터셋을 가리키는 필드 하나로
  // 고정해두고(다른 코드 전체가 이 네 필드만 보고 있음), 전환할 때만 base<->skin 두 자리에
  // 값을 옮겨 담는다 - 이렇게 하면 편집/렌더/저장/가져오기 로직을 전혀 안 건드려도 된다.
  function setIconForSkin(flag) {
    flag = !!flag;
    if (flag === DATA.iconForSkin) return;
    if (flag) {
      DATA.baseIconFolders = DATA.iconFolders; DATA.baseIconExts = DATA.iconExts;
      DATA.baseIconRepoRoot = DATA.iconRepoRoot; DATA.baseIconRecycleBin = DATA.iconRecycleBin;
      DATA.iconFolders = DATA.skinIconFolders; DATA.iconExts = DATA.skinIconExts;
      DATA.iconRepoRoot = DATA.skinIconRepoRoot; DATA.iconRecycleBin = DATA.skinIconRecycleBin;
    } else {
      DATA.skinIconFolders = DATA.iconFolders; DATA.skinIconExts = DATA.iconExts;
      DATA.skinIconRepoRoot = DATA.iconRepoRoot; DATA.skinIconRecycleBin = DATA.iconRecycleBin;
      DATA.iconFolders = DATA.baseIconFolders; DATA.iconExts = DATA.baseIconExts;
      DATA.iconRepoRoot = DATA.baseIconRepoRoot; DATA.iconRecycleBin = DATA.baseIconRecycleBin;
    }
    DATA.iconForSkin = flag;
  }

  // 요청 #137: 우클릭 위치에 따라 메뉴 메이커를 열 때 바로 해당 탭으로 들어가야 한다(트레이/시작
  // 메뉴 우클릭 -> 메뉴 탭, 파일/폴더 우클릭 -> 아이콘 탭) - 호출부(dfsOpenMenuMakerInWindow)가
  // 넘겨주는 initialTab을 그대로 시작 탭으로 쓴다(모르는 값이거나 없으면 기존처럼 "menu").
  var currentTab = (initialTab === "icon" || initialTab === "sound") ? initialTab : "menu"; // "menu" | "icon" | "sound"
  var sel = null; // { section: "start"|"tray"|"iconFolders"|"iconExts"|"iconRepoRoot"|"iconRecycleBin"|"sound", path/idx/key: ... }

  var listsBodyEl = document.getElementById("mmListsBody");
  var panelEl = document.getElementById("mmPanel");
  var saveStateEl = document.getElementById("mmSaveState");
  var importBtn = document.getElementById("mmImport");
  // 요청 #123: 로컬 반영을 그만 쓰고(지금 켜져 있는 3가지: 메뉴/아이콘 기본/아이콘 스킨/사운드
  // 전부) 다음에 열 때부터 다시 실제 저장소 파일 내용을 쓰게 한다. 지금 화면에 편집 중인(아직
  // 저장 안 한) 내용은 지우지 않는다 - "저장"은 별개다.
  document.getElementById("mmClearLocal").onclick = async function() {
    // 앱 안에 이미 CSS 커스텀 확인창이 있으므로(같은 문서 안이 됐으니) 브라우저 native confirm()
    // 대신 그걸 그대로 쓴다(요청 #135 - 예전엔 완전히 별개 문서였어서 native 팝업이 그나마
    // 자연스러웠지만, 이제는 어울리지 않는다).
    const ok = await showConfirmDialog('이 브라우저에 임시로 반영해온 로컬 미리보기(메뉴/아이콘 기본/아이콘 스킨("' + DATA.skinName + '")/사운드 전체)를 지웁니다. 다음에 열 때부터는 다시 실제 저장소 파일 내용을 쓰게 됩니다(지금 화면에서 편집 중인 내용은 지워지지 않습니다). 계속할까요?');
    if (!ok) return;
    dfClearLocalOverride(dfLsMenuKey());
    dfClearLocalOverride(dfLsIconKey());
    dfClearLocalOverride(dfLsIconSkinKey(DATA.skinName));
    dfClearLocalOverride(dfLsSoundKey());
    saveStateEl.textContent = "로컬 미리보기를 초기화했습니다 - 다음에 열 때부터 실제 파일 내용을 다시 씀";
  };

  function tabLabel(t) { return t === "menu" ? "메뉴" : t === "icon" ? "아이콘" : "사운드"; }
  function tabFileName(t) { return t === "menu" ? "menu_set.json" : t === "icon" ? "icon_set.json" : "sound_set.json"; }

  function blankItem() { return { name: "새 항목", url: "", icon: "", popup: false, width: 900, height: 640 }; }
  function setDirty() { state.dirty = true; saveStateEl.textContent = "저장 안 됨"; persistLocalOverride(); }
  // 요청 #123: 편집(가져오기 포함, setDirty가 불리는 모든 곳)이 있을 때마다 "지금 탭"에 해당하는
  // 내용을 localStorage에 즉시 반영한다 - 아직 실제 파일로 저장/다운로드하지 않아도 이 브라우저
  // 에서는 곧바로 테스트해볼 수 있다. 아이콘 탭은 "스킨용으로 저장" 체크 여부에 따라 base/스킨
  // 중 지금 편집 중인 쪽의 키에만 쓴다.
  // 요청 #135로 메뉴 메이커가 별개의 탭이 아니라 이 문서 자신 안의 창이 된 뒤로는, storage
  // 이벤트가 저절로 메인 화면을 다시 그려주지 않는다(storage 이벤트는 값을 바꾼 문서 "자신"
  // 에게는 절대 오지 않고, 오직 같은 오리진의 "다른" 문서/탭에만 온다 - 이제 메인 화면과 메뉴
  // 메이커가 같은 문서이므로 이 경로가 완전히 끊긴다). 그래서 settings-startmenu.js가 이미
  // 갖고 있는 디바운스 갱신 함수(dfDebouncedLsRefresh)들을 여기서 같은 문서 안이므로 직접
  // 불러 즉시 다시 그린다 - 혹시 같은 리포를 다른 탭에서도 열어뒀다면(진짜 별개 문서) 거기서는
  // 여전히 storage 이벤트로 반영된다(settings-startmenu.js의 storage 리스너는 그대로 남겨둔다).
  function persistLocalOverride() {
    if (currentTab === "menu") {
      dfWriteLocalOverride(dfLsMenuKey(), serializeMenuSet());
      dfDebouncedLsRefresh("menu", () => {
        loadMenuSetConfig().then(menu => {
          const m = menu || { start: [], tray: [] };
          renderAppList(m.start, els.startApps);
          renderTrayIcons(m.tray);
        });
      });
    } else if (currentTab === "icon") {
      dfWriteLocalOverride(DATA.iconForSkin ? dfLsIconSkinKey(DATA.skinName) : dfLsIconKey(), serializeIconSet());
      dfDebouncedLsRefresh("icon", refreshMergedIconConfig);
    } else if (currentTab === "sound") {
      dfWriteLocalOverride(dfLsSoundKey(), serializeSoundSet());
      dfDebouncedLsRefresh("sound", () => loadSoundSetConfig().then(applySoundSetConfig));
    }
  }

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
      var upBtn = document.createElement("button"); upBtn.className = "mm-row-btn"; upBtn.title = "위로"; upBtn.textContent = "▲";
      upBtn.onclick = function(e) { e.stopPropagation(); if (idx > 0) { var t = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = t; setDirty(); renderAll(); } };
      var downBtn = document.createElement("button"); downBtn.className = "mm-row-btn"; downBtn.title = "아래로"; downBtn.textContent = "▼";
      downBtn.onclick = function(e) { e.stopPropagation(); if (idx < arr.length - 1) { var t = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = t; setDirty(); renderAll(); } };
      var delBtn = document.createElement("button"); delBtn.className = "mm-row-btn"; delBtn.title = "삭제"; delBtn.textContent = "✕";
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
  function renderSpecialIconList(container) {
    container.innerHTML = "";
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
      container.appendChild(row);
    });
  }

  // 요청 #122: 사운드 탭 - 추가/삭제 없이 SOUND_SCENARIOS에 나열된 상황 전체를 고정 목록으로
  // 보여준다(그 상황에 소리가 지정돼 있으면 🔊, 아니면 🔈로 한눈에 구분).
  function renderSoundList(container) {
    container.innerHTML = "";
    SOUND_SCENARIOS.forEach(function(s) {
      var row = document.createElement("div");
      row.className = "mm-item-row" + (sel && sel.section === "sound" && sel.key === s.key ? " selected" : "");
      var iconEl = document.createElement("div");
      iconEl.className = "mm-item-icon";
      iconEl.textContent = DATA.sounds[s.key] ? "🔊" : "🔈";
      row.appendChild(iconEl);
      var nameEl = document.createElement("span");
      nameEl.className = "mm-item-name";
      nameEl.textContent = s.label;
      row.appendChild(nameEl);
      row.onclick = function() { sel = { section: "sound", key: s.key }; renderAll(); };
      container.appendChild(row);
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

  // 요청 #122: 사운드 편집기 - 아이콘 편집기와 같은 뼈대(미리보기/URL/파일선택)를 쓰되, 이미지 대신
  // 소리(URL 또는 base64)를 다루고, 미리듣기 재생 버튼과 지우기 버튼이 추가로 있다.
  function buildSoundEditorField(labelText, initialSrc, onChange) {
    var wrap = document.createElement("div");
    wrap.className = "mm-field";
    var label = document.createElement("label");
    label.textContent = labelText;
    wrap.appendChild(label);
    var row = document.createElement("div");
    row.className = "mm-icon-editor";
    var preview = document.createElement("div");
    preview.className = "mm-icon-preview";
    var current = initialSrc || "";
    function refreshPreview() { preview.textContent = current ? "🔊" : "🔈"; }
    refreshPreview();
    var actions = document.createElement("div");
    actions.className = "mm-icon-actions";
    var urlInput = document.createElement("input");
    urlInput.type = "text"; urlInput.placeholder = "소리 URL 또는 base64, 혹은 아래에서 파일 선택";
    urlInput.value = current;
    function setSrc(v) { current = v; urlInput.value = v; refreshPreview(); onChange(v); }
    urlInput.oninput = function() { setSrc(urlInput.value); };
    var fileInput = document.createElement("input");
    fileInput.type = "file"; fileInput.accept = "audio/*"; fileInput.style.display = "none";
    fileInput.onchange = function() {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function() { setSrc(reader.result); };
      reader.readAsDataURL(file);
    };
    var fileBtn = document.createElement("button");
    fileBtn.textContent = "소리 파일 선택";
    fileBtn.onclick = function() { fileInput.click(); };
    var playBtn = document.createElement("button");
    playBtn.textContent = "▶ 미리듣기";
    playBtn.onclick = function() {
      if (!current) return;
      try { new Audio(current).play().catch(function() {}); } catch (e) { /* 무시 */ }
    };
    var clearBtn = document.createElement("button");
    clearBtn.textContent = "지우기";
    clearBtn.onclick = function() { setSrc(""); };
    var hint = document.createElement("div");
    hint.className = "mm-hint";
    hint.textContent = "짧은 알림음(mp3/wav 등) 파일의 URL을 입력하거나 파일을 선택하면 base64로 저장됩니다. 비워두면 이 상황에서는 소리가 나지 않습니다.";
    actions.appendChild(urlInput);
    var btnRow = document.createElement("div");
    btnRow.style.display = "flex"; btnRow.style.gap = "6px"; btnRow.style.flexWrap = "wrap";
    btnRow.appendChild(fileBtn); btnRow.appendChild(playBtn); btnRow.appendChild(clearBtn);
    actions.appendChild(btnRow);
    actions.appendChild(hint);
    row.appendChild(preview);
    row.appendChild(actions);
    row.appendChild(fileInput);
    wrap.appendChild(row);
    return wrap;
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
      ? "바탕 화면과 트리 맨 위의 저장소 루트 폴더에 쓰이는 아이콘입니다."
      : "바탕 화면과 트리의 휴지통에 쓰이는 아이콘입니다.") + " 비워두면 기본 아이콘을 사용합니다.";
    panelEl.appendChild(note);
    var iconField = buildIconEditorField(label, isRepoRoot ? DATA.iconRepoRoot : DATA.iconRecycleBin, label, function(newIcon) {
      if (isRepoRoot) DATA.iconRepoRoot = newIcon; else DATA.iconRecycleBin = newIcon;
      setDirty(); renderLists();
    });
    panelEl.appendChild(iconField);
  }

  // 사운드 탭 - 선택된 시나리오 하나의 편집 패널.
  function renderSoundPanel() {
    var spec = null;
    for (var i = 0; i < SOUND_SCENARIOS.length; i++) { if (SOUND_SCENARIOS[i].key === sel.key) { spec = SOUND_SCENARIOS[i]; break; } }
    if (!spec) { sel = null; renderPanel(); return; }
    panelEl.innerHTML = "";
    var note = document.createElement("div");
    note.className = "mm-submenu-note";
    note.textContent = spec.hint || "";
    panelEl.appendChild(note);
    var field = buildSoundEditorField(spec.label, DATA.sounds[spec.key], function(newSrc) {
      DATA.sounds[spec.key] = newSrc; setDirty(); renderLists();
    });
    panelEl.appendChild(field);
  }

  function renderPanel() {
    if (currentTab === "sound") {
      if (!sel || sel.section !== "sound") { panelEl.innerHTML = '<div class="mm-empty-hint">왼쪽에서 상황을 하나 골라 소리를 지정하세요.</div>'; return; }
      renderSoundPanel();
      return;
    }
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
      // 요청 #131: "기본 상태는 새 탭 열기(표시 안 함)이고, 팝업으로 띄울지 여부만 선택하게 UI
      // 단순화" - 예전엔 "새 탭에서 열기"/"팝업" 체크박스 2개였는데, 이제 새 탭 열기는 항상 기본값
      // 이라 화면에 안 보이고 팝업 여부만 고른다(체크 해제 = 새 탭, 체크 = 팝업).
      var popupRow = document.createElement("label");
      popupRow.className = "mm-check-row";
      var popupCb = document.createElement("input");
      popupCb.type = "checkbox"; popupCb.checked = !!item.popup;
      popupRow.appendChild(popupCb);
      popupRow.appendChild(document.createTextNode(" 팝업 창으로 열기(체크 해제 시 새 탭)"));
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

  // 탭별로 왼쪽 목록(mmListsBody) 전체를 새로 그린다 - 탭마다 다루는 섹션이 완전히 다르므로,
  // 컨테이너를 매번 갈아치우는 게 세 탭 각각을 따로 상태로 들고 있는 것보다 훨씬 단순하다.
  function renderMenuTabLists() {
    listsBodyEl.innerHTML =
      '<div class="mm-section-head"><h3>시작 메뉴</h3></div>' +
      '<div class="mm-list" id="mmStartList"></div>' +
      '<button class="mm-add-row" id="mmAddStart">+ 새 항목 추가</button>' +
      '<div class="mm-section-head"><h3>트레이(빠른 실행)</h3></div>' +
      '<div class="mm-list" id="mmTrayList"></div>' +
      '<button class="mm-add-row" id="mmAddTray">+ 새 항목 추가</button>';
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
    renderList("start", DATA.start, document.getElementById("mmStartList"), []);
    renderList("tray", DATA.tray, document.getElementById("mmTrayList"), []);
  }
  function renderIconTabLists() {
    listsBodyEl.innerHTML =
      '<div class="mm-section-head"><h3>스킨용 저장</h3></div>' +
      '<label class="mm-check-row"><input type="checkbox" id="mmIconForSkin"' + (DATA.iconForSkin ? ' checked' : '') + '> "' + escapeHtml(DATA.skinName) + '" 스킨용으로 저장</label>' +
      '<div class="mm-section-sub">체크하면 지금부터 아이콘 탭에서 편집/저장하는 내용이 기본 icon_set.json이 아니라 현재 스킨(' + escapeHtml(DATA.skinName) + ')만의 icon_set.json이 되고, 저장 버튼을 눌러도 시작 메뉴/트레이/사운드는 저장하지 않습니다. 체크를 풀면 다시 기본 icon_set.json으로 돌아옵니다(편집 중이던 두 내용은 서로 지워지지 않고 각자 남아있습니다).</div>' +
      '<div class="mm-section-head"><h3>특수 아이콘</h3></div>' +
      '<div class="mm-section-sub">바탕 화면·트리에 쓰이는 고정 아이콘 2개(비워두면 기본 아이콘 사용)</div>' +
      '<div class="mm-list" id="mmSpecialIconList"></div>' +
      '<div class="mm-section-head"><h3>폴더별 아이콘</h3></div>' +
      '<div class="mm-section-sub">저장소 안의 특정 폴더 경로에 아이콘을 지정합니다 (예: docs/images)</div>' +
      '<div class="mm-list" id="mmIconFolderList"></div>' +
      '<button class="mm-add-row" id="mmAddIconFolder">+ 폴더 아이콘 추가</button>' +
      '<div class="mm-section-head"><h3>확장자별 아이콘</h3></div>' +
      '<div class="mm-section-sub">파일 확장자(점 없이, 예: pdf)에 아이콘을 지정합니다</div>' +
      '<div class="mm-list" id="mmIconExtList"></div>' +
      '<button class="mm-add-row" id="mmAddIconExt">+ 확장자 아이콘 추가</button>';
    document.getElementById("mmIconForSkin").onchange = function(e) {
      setIconForSkin(e.target.checked);
      sel = null;
      renderAll();
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
    renderSpecialIconList(document.getElementById("mmSpecialIconList"));
    renderIconKeyList("iconFolders", DATA.iconFolders, document.getElementById("mmIconFolderList"), "(경로 없음)");
    renderIconKeyList("iconExts", DATA.iconExts, document.getElementById("mmIconExtList"), "(확장자 없음)");
  }
  function renderSoundTabLists() {
    listsBodyEl.innerHTML =
      '<div class="mm-section-head"><h3>상황별 알림음</h3></div>' +
      '<div class="mm-section-sub">이 앱에서 소리를 낼 수 있는 모든 상황입니다. 항목을 추가/삭제할 수는 없고, 각 상황에 소리를 지정하거나 비워둘 수만 있습니다.</div>' +
      '<div class="mm-list" id="mmSoundList"></div>';
    renderSoundList(document.getElementById("mmSoundList"));
  }
  function renderLists() {
    if (currentTab === "menu") renderMenuTabLists();
    else if (currentTab === "icon") renderIconTabLists();
    else renderSoundTabLists();
  }
  function renderAll() { renderLists(); renderPanel(); }

  function updateTabButtons() {
    var btns = document.querySelectorAll(".mm-tab");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].getAttribute("data-tab") === currentTab);
    }
    importBtn.title = "현재 탭(" + tabLabel(currentTab) + ")에 해당하는 " + tabFileName(currentTab) + " 파일을 불러와 이 탭의 내용을 덮어씁니다";
  }
  var tabBtns = document.querySelectorAll(".mm-tab");
  for (var ti = 0; ti < tabBtns.length; ti++) {
    tabBtns[ti].onclick = function(e) {
      currentTab = e.currentTarget.getAttribute("data-tab");
      sel = null;
      updateTabButtons();
      renderAll();
    };
  }
  updateTabButtons();
  // 요청 #137: 메뉴 메이커는 싱글턴이라(이미 열려 있으면 dfsOpenMenuMakerInWindow가 새로 만들지
  // 않고 기존 창을 재사용) 우클릭 위치별로 탭을 다시 지정하려면 이미 열려 있는 창의 탭도 밖에서
  // 바꿀 수 있어야 한다 - 탭 버튼 클릭과 같은 로직을 handle에 얹어 외부(menu-maker.js 맨 아래의
  // dfsOpenMenuMakerInWindow)에서 부를 수 있게 한다.
  handle.switchTab = function(tab) {
    if (tab !== "menu" && tab !== "icon" && tab !== "sound") return;
    currentTab = tab;
    sel = null;
    updateTabButtons();
    renderAll();
  };

  // 가져오기: 디스크에 있는 JSON 파일을 골라서 "현재 탭"의 내용을 통째로 덮어쓴다(탭마다 파일이
  // 따로 있으므로, 탭 전환으로 어느 파일을 불러올지 정하고 이 버튼 하나만 재사용한다). 이미 편집
  // 중인 내용이 있으면 덮어쓰기 전에 한 번 확인한다.
  var importFileInput = document.getElementById("mmImportFile");
  importBtn.onclick = async function() {
    if (state.dirty) {
      const ok = await showConfirmDialog('저장하지 않은 변경 사항이 있습니다. 지금 파일을 불러오면 현재 탭("' + tabLabel(currentTab) + '")의 내용을 덮어씁니다. 계속할까요?');
      if (!ok) return;
    }
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
        showToast("이 파일은 올바른 JSON이 아닙니다: " + e.message, { kind: "warn", sound: "error_generic" });
        return;
      }
      if (!parsed || typeof parsed !== "object") { showToast("이 파일의 형식을 알아볼 수 없습니다.", { kind: "warn", sound: "error_generic" }); return; }
      if (currentTab === "menu") {
        DATA.start = Array.isArray(parsed.start) ? parsed.start : [];
        DATA.tray = Array.isArray(parsed.tray) ? parsed.tray : [];
      } else if (currentTab === "icon") {
        DATA.iconRepoRoot = typeof parsed.repoRoot === "string" ? parsed.repoRoot : "";
        DATA.iconRecycleBin = typeof parsed.recycleBin === "string" ? parsed.recycleBin : "";
        DATA.iconFolders = (parsed.folders && typeof parsed.folders === "object")
          ? Object.keys(parsed.folders).map(function(k) { return { key: k, icon: parsed.folders[k] }; }) : [];
        DATA.iconExts = (parsed.extensions && typeof parsed.extensions === "object")
          ? Object.keys(parsed.extensions).map(function(k) { return { key: k, icon: parsed.extensions[k] }; }) : [];
      } else {
        SOUND_SCENARIOS.forEach(function(s) { DATA.sounds[s.key] = typeof parsed[s.key] === "string" ? parsed[s.key] : ""; });
      }
      sel = null;
      setDirty();
      renderAll();
      saveStateEl.textContent = file.name + " 불러옴(" + tabLabel(currentTab) + ") - 저장 안 됨";
    };
    reader.onerror = function() { showToast("파일을 읽는 중 오류가 발생했습니다.", { kind: "warn", sound: "error_generic" }); };
    reader.readAsText(file);
  };

  // 저장/다운로드: 에디터(editor.js)의 다운로드 버튼과 완전히 같은 패턴 - 로컬 헬퍼(웹훅)가 켜져
  // 있으면 웹훅으로 저장 대화상자, 아니면 브라우저 자체 blob 다운로드로 떨어진다. 저장 위치는 항상
  // 사용자가 직접 고르므로(정적 사이트라 저장소에 바로 쓸 수 없음), 받은 세 파일을 저장소의
  // _NIH_ROOT_/index/ 안 같은 이름 위치에 덮어써야 실제로 반영된다(환경설정의 안내 문구 참고).
  // 요청 #122: 탭이 3개로 나뉘어도 저장 버튼은 하나로 - 항상 세 파일을 한꺼번에 저장한다
  // (다른 탭에서 손댄 내용을 안 저장하고 놓치는 실수를 막기 위함).
  // 요청 #121: 단, 아이콘 탭에서 "스킨용으로 저장"이 체크돼 있으면 예외 - icon_set.json
  // 하나만 그 스킨용으로 저장하고 menu_set.json/sound_set.json은 건너뛴다(filesToSave 참고).
  // 요청 #131: newTab(새 탭/현재 탭 선택)은 더 이상 UI에 없다 - 항상 새 탭이 기본이고, popup만
  // 선택 사항이다. 예전 menu_set.json에 newTab:false가 남아있어도 다음 저장부터는 사라진다.
  function cleanItem(it) {
    var out = { name: it.name || "", url: it.url || "", icon: it.icon || "" };
    if (it.popup) { out.popup = true; out.width = it.width || 900; out.height = it.height || 640; }
    if (Array.isArray(it.items) && it.items.length) out.items = it.items.map(cleanItem);
    return out;
  }
  // 편집용 배열({key, icon}[])을 실제 icon_set.json 스키마의 객체({경로/확장자: 아이콘})로 되돌린다.
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
  function serializeMenuSet() {
    return JSON.stringify({ start: DATA.start.map(cleanItem), tray: DATA.tray.map(cleanItem) }, null, 2);
  }
  function serializeIconSet() {
    return JSON.stringify({
      folders: serializeIconMap(DATA.iconFolders, function(k) { return k.replace(/^\/+|\/+$/g, ""); }),
      extensions: serializeIconMap(DATA.iconExts, function(k) { return k.replace(/^\.+/, "").toLowerCase(); }),
      repoRoot: DATA.iconRepoRoot || "",
      recycleBin: DATA.iconRecycleBin || ""
    }, null, 2);
  }
  function serializeSoundSet() {
    var out = {};
    SOUND_SCENARIOS.forEach(function(s) { out[s.key] = DATA.sounds[s.key] || ""; });
    return JSON.stringify(out, null, 2);
  }
  function filesToSave() {
    // 요청 #121: "스킨용으로 저장"이 체크된 상태면 icon_set.json 하나만 저장하고(그 스킨 폴더용),
    // 시작 메뉴/트레이(menu_set.json)와 사운드(sound_set.json)는 아예 저장하지 않는다.
    if (DATA.iconForSkin) return [{ name: "icon_set.json", text: serializeIconSet() }];
    return [
      { name: "menu_set.json", text: serializeMenuSet() },
      { name: "icon_set.json", text: serializeIconSet() },
      { name: "sound_set.json", text: serializeSoundSet() }
    ];
  }
  // 포트 탐색은 이 파일 안에서 다시 구현하지 않고 local-helper.js의 ensureHelperPort를 그대로
  // 쓴다(요청 #135 - 에디터와 같은 이유: 포트 캐싱을 공유하고, 처음 찾았을 때 dfNoteWebhookConnected
  // (#134 자동 활성화)도 자연히 같이 탄다).
  function blobDownloadOne(file, delayMs) {
    return new Promise(function(resolve) {
      setTimeout(function() {
        var blob = new Blob([file.text], { type: "application/json;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
        URL.revokeObjectURL(a.href);
        resolve();
      }, delayMs);
    });
  }
  function blobDownloadAll(files) {
    // 연속으로 너무 빨리 여러 개를 내려받으면 브라우저가 일부를 막을 수 있어(다중 다운로드 차단),
    // 다른 곳(폴더 다중 다운로드 등)과 같은 습관으로 살짝 간격을 두고 순서대로 내려받는다.
    return files.reduce(function(chain, file, idx) {
      return chain.then(function() { return blobDownloadOne(file, idx === 0 ? 0 : 150); });
    }, Promise.resolve()).then(function() {
      saveStateEl.textContent = DATA.iconForSkin
        ? ('브라우저로 다운로드됨(icon_set.json, "' + DATA.skinName + '" 스킨용) - 저장소의 _NIH_ROOT_/index/ui/theme/' + DATA.skinName + '/ 안에 덮어써 주세요')
        : "브라우저로 다운로드됨(menu_set/icon_set/sound_set.json) - 저장소의 _NIH_ROOT_/index/ 안에 덮어써 주세요";
      state.dirty = false;
    });
  }
  function webhookSaveAll(port, files) {
    return files.reduce(function(chain, file) {
      return chain.then(function() {
        return fetch("http://127.0.0.1:" + port + "/savecontent?name=" + encodeURIComponent(file.name), {
          method: "POST",
          body: file.text
        }).then(function(res) {
          return res.text().then(function(t) {
            if (!res.ok) throw new Error(String(res.status));
            return t.indexOf("CANCELLED") !== -1;
          });
        });
      });
    }, Promise.resolve(false)).then(function(lastCancelled) {
      if (lastCancelled) { saveStateEl.textContent = "다운로드가 취소되었습니다"; return; }
      saveStateEl.textContent = DATA.iconForSkin
        ? ('웹훅으로 다운로드됨(icon_set.json, "' + DATA.skinName + '" 스킨용) - 저장소의 _NIH_ROOT_/index/ui/theme/' + DATA.skinName + '/ 안에 덮어써 주세요')
        : "웹훅으로 다운로드됨(menu_set/icon_set/sound_set.json) - 저장소의 _NIH_ROOT_/index/ 안에 덮어써 주세요";
      state.dirty = false;
    });
  }
  var saveBtn = document.getElementById("mmSave");
  saveBtn.onclick = async function() {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    var oldLabel = saveBtn.textContent;
    saveBtn.textContent = "확인 중...";
    var files = filesToSave();
    try {
      var port = await ensureHelperPort();
      saveBtn.disabled = false;
      saveBtn.textContent = oldLabel;
      if (port === null) { await blobDownloadAll(files); return; }
      await webhookSaveAll(port, files);
    } catch (e) {
      saveBtn.disabled = false;
      saveBtn.textContent = oldLabel;
      await blobDownloadAll(files);
    }
  };
  // 저장 안 한 내용이 있는지는 이제 이 창 전체의 beforeunload(app-window.js의 공용 리스너, 이
  // 창을 열 때 넘긴 isDirty)가 대신 확인해준다 - 예전처럼 이 창만 따로 window에 걸지 않는다.
  // 에디터(editor.js)와 같은 습관으로 Ctrl+S도 저장 버튼과 동일하게 동작하게 해준다(UX 개선).
  // 전역 window가 아니라 이 창 엘리먼트에만 붙여서, 메뉴 메이커가 배경에 열려 있어도 다른 창에
  // 포커스가 있을 때는(이벤트가 이 엘리먼트까지 버블링되지 않으므로) 반응하지 않는다.
  handle.el.addEventListener("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      saveBtn.click();
    }
  });

  renderAll();
}

let dfMenuMakerWinHandle = null;

// 메뉴 메이커를 앱 내 창으로 연다(요청 #135). 한 번에 하나만 떠야 하므로(싱글턴) 이미 열려있으면
// 새로 만들지 않고 그 창을 앞으로 가져오기만 한다. loadAllMenuMakerConfigs()로 현재
// menu_set/icon_set/sound_set.json 내용을 한 번 읽어와 초기 데이터로 건네주는 것은 그대로다.
// 요청 #137: 우클릭 위치별로 바로 알맞은 탭이 열려야 한다(트레이/시작메뉴 우클릭 -> 메뉴 탭,
// 파일/폴더 우클릭 -> 아이콘 탭) - opts.initialTab으로 지정한다. 이미 열려있던 창을 재사용할
// 때도(싱글턴이라 새로 안 만듦) handle.switchTab으로 그 자리에서 탭을 옮겨준다 - 안 그러면
// "메뉴 탭을 기대하고 우클릭했는데 아까 보던 아이콘 탭이 그대로 떠 있는" 상황이 된다.
async function dfsOpenMenuMakerInWindow(opts) {
  opts = opts || {};
  if (dfMenuMakerWinHandle) {
    dfMenuMakerWinHandle.focus();
    if (opts.initialTab) dfMenuMakerWinHandle.switchTab(opts.initialTab);
    return dfMenuMakerWinHandle;
  }
  let initial = null;
  try { initial = await loadAllMenuMakerConfigs(); } catch (e) { /* 무시 */ }
  const state = { dirty: false };
  dfInjectStyleOnce("dfMenuMakerStyle", DF_MENUMAKER_PAGE_CSS);
  const handle = dfCreateAppWindow({
    title: "메뉴 메이커",
    icon: "\u{1F4CB}",
    width: 980,
    height: 680,
    bodyHtml: dfsBuildMenuMakerBodyHtml(),
    isDirty: () => state.dirty,
    confirmClose: async () => {
      if (!state.dirty) return true;
      return await showConfirmDialog("저장하지 않은 변경 사항이 있습니다.\n저장하지 않고 닫으시겠습니까?", { okLabel: "닫기", cancelLabel: "취소" });
    },
    onClose: () => { dfMenuMakerWinHandle = null; },
  });
  dfMenuMakerWinHandle = handle;
  dfInitMenuMakerWindow(handle, initial || { menu: { start: [], tray: [] }, icons: {}, sounds: {} }, state, opts.initialTab);
  return handle;
}
