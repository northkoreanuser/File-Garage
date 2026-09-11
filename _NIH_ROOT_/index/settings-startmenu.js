/* ============ 환경설정 (윈도우 설정창 스타일 + 로컬 스토리지) ============
   - 수정/삭제는 이 페이지에서 직접 할 수 없다(정적 사이트라 쓰기 권한이 없음).
     대신 GitHub의 해당 파일 위치로 이동시키는 것 뿐이며, 그마저도 기본은 꺼져 있다.
   - 수정/삭제 기능은 아예 없다: 이 페이지는 정적 사이트라 쓰기 권한이 없고, 색인과 실제
     저장소가 어긋날 위험도 있어서 굳이 제공하지 않는다. git으로 직접 고치고 커밋하는 편이 낫다.
================================================================== */
const DEFAULT_SETTINGS = {
  githubLinksEnabled: true,
  doubleClickAction: "open", // "open" | "download"
  searchScope: "subtree",    // "subtree"(현재 폴더의 하위만) | "all"(전체 저장소)
  searchRelativePath: true,  // 검색 결과 위치를 현재 폴더 기준 상대 경로로 표시할지
  aeroEnabled: true,         // 반투명 블러("에어로") 효과 - 기본 활성화
  trayIconCount: 25,         // 트레이 빠른 실행 아이콘 최대 개수 (최소 1, 최대 25)
  dfEditorTheme: "dark",     // 내장 에디터(옵시디언 스타일) 테마
  theme: "default"           // 창 스킨: "default" | "win98" (_NIH_ROOT_/ui/theme/<이름>/style.css)
};
// "default"는 Windows 11 스타일(사용자 지시: "지금 기본"). 나머지는 각 버전의 폴더명(win2000,
// winxp, winvista, win7, win8, win10, win98)과 그대로 짝지어 _NIH_ROOT_/ui/theme/<name>/style.css를
// 가리킨다(themeStylesheetUrl).
const AVAILABLE_THEMES = new Set(["default", "win98", "win2000", "winxp", "winvista", "win7", "win8", "win10"]);
// _NIH_ROOT_ 아래 있으므로 색인/트리에는 절대 나타나지 않지만, GitHub Pages는 그대로 서빙하므로
// index.html과 같은 origin의 상대 경로로 직접 불러온다(base64 내장 없이, 진짜 파일 그대로).
function themeStylesheetUrl(name) {
  return `_NIH_ROOT_/ui/theme/${AVAILABLE_THEMES.has(name) ? name : "default"}/style.css`;
}
function applyTheme(name) {
  if (!els.themeLink) return;
  els.themeLink.href = themeStylesheetUrl(name);
  document.body.classList.toggle("theme-win98", name === "win98");
}
function settingsKey() { return `idx:${repoName}:settings`; }
function loadSettings() {
  let s = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(settingsKey());
    if (raw) s = { ...s, ...JSON.parse(raw) };
  } catch (e) { /* 무시 */ }
  if (s.doubleClickAction !== "download") s.doubleClickAction = "open";
  if (s.searchScope !== "all") s.searchScope = "subtree";
  s.searchRelativePath = s.searchRelativePath !== false;
  s.aeroEnabled = s.aeroEnabled !== false;
  s.trayIconCount = Math.max(1, Math.min(25, Number(s.trayIconCount) || DEFAULT_SETTINGS.trayIconCount));
  if (s.dfEditorTheme !== "light") s.dfEditorTheme = "dark";
  if (!AVAILABLE_THEMES.has(s.theme)) s.theme = "default";
  return s;
}
function applyAeroToDocument() {
  document.body.classList.toggle("no-aero", !settings.aeroEnabled);
}
function saveSettings() {
  try { localStorage.setItem(settingsKey(), JSON.stringify(settings)); } catch (e) {}
}
let settings = { ...DEFAULT_SETTINGS };

function applySettingsToPanel() {
  if (els.setTheme) els.setTheme.value = settings.theme;
  els.setGithubLinks.checked = settings.githubLinksEnabled;
  els.setDoubleClick.value = settings.doubleClickAction;
  els.setSearchScope.value = settings.searchScope;
  els.setSearchRelative.checked = settings.searchRelativePath;
  if (els.setAeroEnabled) els.setAeroEnabled.checked = settings.aeroEnabled;
  if (els.setTrayIconCount) els.setTrayIconCount.value = settings.trayIconCount;
}
function applySearchPlaceholder() {
  els.searchInput.placeholder = settings.searchScope === "all" ? "전체 검색" : "현재 폴더 검색";
}
function setupSettingsPanel() {
  els.settingsMenuRow.onclick = (e) => {
    e.stopPropagation();
    els.startMenu.classList.remove("open");
    closeAllSubmenus();
    openSettingsPanel();
  };
  els.settingsCloseBtn.onclick = () => els.settingsOverlay.classList.remove("open");
  els.settingsOverlay.onclick = (e) => { if (e.target === els.settingsOverlay) els.settingsOverlay.classList.remove("open"); };

  if (els.setTheme) {
    els.setTheme.onchange = () => {
      settings.theme = AVAILABLE_THEMES.has(els.setTheme.value) ? els.setTheme.value : "default";
      saveSettings();
      applyTheme(settings.theme);
    };
  }
  els.setGithubLinks.onchange = () => { settings.githubLinksEnabled = els.setGithubLinks.checked; saveSettings(); };
  els.setDoubleClick.onchange = () => {
    settings.doubleClickAction = els.setDoubleClick.value;
    saveSettings();
  };
  els.setSearchScope.onchange = () => {
    settings.searchScope = els.setSearchScope.value === "all" ? "all" : "subtree";
    saveSettings();
    applySearchPlaceholder();
  };
  els.setSearchRelative.onchange = () => {
    settings.searchRelativePath = els.setSearchRelative.checked;
    saveSettings();
  };
  if (els.setAeroEnabled) {
    els.setAeroEnabled.onchange = () => {
      settings.aeroEnabled = els.setAeroEnabled.checked;
      saveSettings();
      applyAeroToDocument();
    };
  }
  if (els.setTrayIconCount) {
    els.setTrayIconCount.onchange = () => {
      settings.trayIconCount = Math.max(1, Math.min(25, Number(els.setTrayIconCount.value) || DEFAULT_SETTINGS.trayIconCount));
      els.setTrayIconCount.value = settings.trayIconCount;
      saveSettings();
      if (lastTrayItems) renderTrayIcons(lastTrayItems);
    };
  }
  els.setPreloadAllBtn.onclick = async () => {
    els.setPreloadAllBtn.disabled = true;
    try {
      await preloadAllToCache();
    } finally {
      els.setPreloadAllBtn.disabled = false;
    }
  };
  els.setKillHelperBtn.onclick = async () => {
    els.setKillHelperBtn.disabled = true;
    try {
      await killAllHelperPorts();
      showToast("로컬 헬퍼 종료 요청을 보냈습니다.", { kind: "info" });
    } finally {
      els.setKillHelperBtn.disabled = false;
    }
  };
  els.setDownloadHelperBtn.onclick = () => downloadRealFileDirect(LOCALSERVER_TOOL_PATH, "localserver.ahk");
}
function openSettingsPanel() {
  applySettingsToPanel();
  els.settingsOverlay.classList.add("open");
}

/* ============ 시작 메뉴 (GitHub 계정 카드) ============ */
function setupStartMenu(owner) {
  const name = owner || "Guest";
  els.startUserName.textContent = name;
  els.startAvatar.innerHTML = "";
  if (owner) {
    els.startUserLink.href = `https://github.com/${owner}`;
    els.startUserLink.style.display = "";
    const img = document.createElement("img");
    img.src = `https://github.com/${owner}.png?size=88`;
    img.alt = "";
    img.onerror = () => { els.startAvatar.innerHTML = ""; els.startAvatar.textContent = name.charAt(0).toUpperCase(); };
    els.startAvatar.appendChild(img);
  } else {
    els.startUserLink.style.display = "none";
    els.startAvatar.textContent = "?";
  }
  els.startBtn.onclick = (e) => { e.stopPropagation(); els.startMenu.classList.toggle("open"); };
  els.startMenu.addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", () => { els.startMenu.classList.remove("open"); closeAllSubmenus(); });
}

/* ============ start.json / tray.json ============ */
async function loadJsonConfig(name) {
  try {
    const res = await fetch(name, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : null;
  } catch (e) {
    return null; // 파일이 없거나 형식이 잘못돼도 조용히 무시 (선택 기능이므로)
  }
}
function makeAppIcon(item, className) {
  const wrap = document.createElement("div");
  wrap.className = className;
  if (item.icon) {
    const img = document.createElement("img");
    img.src = item.icon;
    img.alt = "";
    img.onerror = () => { wrap.innerHTML = ""; wrap.textContent = (item.name || "?").charAt(0).toUpperCase(); };
    wrap.appendChild(img);
  } else {
    wrap.textContent = (item.name || "?").charAt(0).toUpperCase();
  }
  return wrap;
}
function activateExternalItem(item) {
  if (!item || !item.url) return;
  if (item.popup) {
    const w = item.width || 900;
    const h = item.height || 640;
    const left = Math.round(((window.screen.width || 1280) - w) / 2);
    const top = Math.round(((window.screen.height || 800) - h) / 2);
    window.open(item.url, "_blank", `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
  } else {
    window.open(item.url, item.newTab === false ? "_self" : "_blank", "noopener,noreferrer");
  }
}
function closeAllSubmenus() {
  openSubmenuEls.forEach(el => el.remove());
  openSubmenuEls = [];
}
function positionFloating(el, anchorRect) {
  document.body.appendChild(el);
  el.classList.add("open");
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = anchorRect.right + 4;
  if (left + w > window.innerWidth) left = anchorRect.left - w - 4;
  if (left < 4) left = 4;
  let top = anchorRect.top;
  if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;
  if (top < 4) top = 4;
  el.style.left = left + "px";
  el.style.top = top + "px";
}
function openSubmenuFor(row, items) {
  // row를 포함하는(조상인) 서브메뉴는 유지하고, 나머지 가지만 정리한다
  openSubmenuEls = openSubmenuEls.filter(el => {
    if (el.contains(row)) return true;
    el.remove();
    return false;
  });
  const sub = document.createElement("div");
  sub.className = "start-submenu";
  renderAppList(items, sub);
  sub.addEventListener("click", ev => ev.stopPropagation());
  positionFloating(sub, row.getBoundingClientRect());
  openSubmenuEls.push(sub);
}
function renderAppList(items, container) {
  container.innerHTML = "";
  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "start-app-row";
    row.appendChild(makeAppIcon(item, "start-app-icon"));
    const nameEl = document.createElement("span");
    nameEl.className = "start-app-name";
    nameEl.textContent = item.name || "(이름 없음)";
    row.appendChild(nameEl);

    const hasChildren = Array.isArray(item.items) && item.items.length > 0;
    if (hasChildren) {
      const chev = document.createElement("span");
      chev.className = "start-app-chevron";
      chev.textContent = "▸";
      row.appendChild(chev);
      row.onclick = (e) => { e.stopPropagation(); openSubmenuFor(row, item.items); };
    } else {
      row.onclick = (e) => {
        e.stopPropagation();
        activateExternalItem(item);
        closeAllSubmenus();
        els.startMenu.classList.remove("open");
      };
    }
    container.appendChild(row);
  });
}
let lastTrayItems = null;
function renderTrayIcons(items) {
  lastTrayItems = items;
  els.trayIcons.innerHTML = "";
  const maxIcons = (settings && settings.trayIconCount) || DEFAULT_SETTINGS.trayIconCount;
  items.slice(0, maxIcons).forEach(item => {
    const btn = makeAppIcon(item, "tray-icon");
    btn.title = item.name || "";
    btn.onclick = () => activateExternalItem(item);
    els.trayIcons.appendChild(btn);
  });
}

