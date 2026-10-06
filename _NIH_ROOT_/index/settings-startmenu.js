/* ============ 환경설정 (윈도우 설정창 스타일 + 로컬 스토리지) ============
   - 수정/삭제는 이 페이지에서 직접 할 수 없다(정적 사이트라 쓰기 권한이 없음).
     대신 GitHub의 해당 파일 위치로 이동시키는 것 뿐이며, 그마저도 기본은 꺼져 있다.
   - 수정/삭제 기능은 아예 없다: 이 페이지는 정적 사이트라 쓰기 권한이 없고, 색인과 실제
     저장소가 어긋날 위험도 있어서 굳이 제공하지 않는다. git으로 직접 고치고 커밋하는 편이 낫다.
================================================================== */
const DEFAULT_SETTINGS = {
  githubLinksEnabled: true,
  // "helper"(로컬 헬퍼로 열기 - 예전의 "open", 요청 #142로 기본값이 됨) | "newtab"(새 탭에서 열기 -
  // 이 사이트 자체의 배포된 주소로 열기) | "text"(텍스트로 열기 - 우클릭의 "브라우저에서 보기"와
  // 동일, GitHub raw 주소) | "download"(헬퍼의 다운로드 기능) | "repo"(저장소에서 보기 - GitHub의
  // blob 화면, 요청 #142로 추가 - settings.githubLinksEnabled가 꺼져 있으면 newtab처럼 동작)
  doubleClickAction: "helper",
  searchScope: "subtree",    // "subtree"(현재 폴더의 하위만) | "all"(전체 저장소)
  searchRelativePath: true,  // 검색 결과 위치를 현재 폴더 기준 상대 경로로 표시할지
  searchByName: true,        // 검색 시 파일/폴더 이름 매칭
  searchByTag: true,         // 검색 시 #hashtag.json 태그 매칭 (둘 다 기본 켜짐)
  aeroEnabled: true,         // 반투명 블러("에어로") 효과 - 기본 활성화
  trayIconCount: 25,         // 트레이 빠른 실행 아이콘 최대 개수 (최소 1, 최대 25)
  dfEditorTheme: "dark",     // 내장 에디터(옵시디언 스타일) 테마
  theme: "win7",             // 창 스킨: "default"(win11) | "win98" | ... (_NIH_ROOT_/index/ui/theme/<이름>/style.css)
  // 요청 #121: 스킨 폴더 안에도 icon_set.json이 있을 수 있다(메뉴 메이커에서 "스킨용으로 저장"한
  // 것). 이 값을 켜면 지금 스킨의 icon_set.json이 겹치는 항목에서 기본(공용) icon_set.json보다
  // 우선한다(둘 다 없는 쪽은 있는 쪽 그대로 씀 - mergeIconMap 참고). 요청 #163: 스킨별로 아이콘을
  // 따로 꾸며두는 게 보통은 의도한 커스터마이징이므로 기본값을 켬으로 바꾼다(예전엔 꺼짐이 기본).
  skinIconPriority: true,
  // 아이콘과 완전히 같은 개념을 사운드에도 적용 - 메뉴 메이커의 사운드 탭에도 "스킨용으로 저장"
  // 체크박스가 생겨서 스킨 폴더 안에 sound_set.json을 따로 둘 수 있다(skinIconPriority와 같은
  // 기본값 이유로 기본을 켬으로 둔다 - mergeSoundSetConfigs 참고).
  skinSoundPriority: true,
  // 요청 #152: "페이지를 열 때마다 로컬 헬퍼(웹훅)가 켜져 있는지 미리 조용히 확인해두는 것" -
  // 브라우저의 로컬 네트워크 접근 권한 팝업이 뜰 수 있어 기본은 꺼둔다. 웹훅이 한 번이라도
  // 응답하면(연결 확인·다운로드 성공·실패 모두 포함, local-helper.js의 dfNoteWebhookInUse) 자동으로 켜진다.
  checkHelperOnLoad: false,
  // 요청 #128: "페이지 로드시 전체화면" - 기본 켬. 실제로는 브라우저 정책상 사용자 동작(클릭) 없이
  // 전체화면 API를 부를 수 없어서, 로드 후 첫 클릭에 자동으로 들어간다(dfArmFullscreenOnNextClick
  // 참고). 새 탭/링크를 여는 모든 곳은 열기 직전에 전체화면을 풀고(dfOpenNewTab), 그 탭에서 돌아오면
  // (visibilitychange) 다시 자동으로 들어간다 - 단, 사용자가 직접(Esc 등으로) 풀었을 때는 제외.
  fullscreenOnLoad: true,
  // 요청 #160: Ctrl+W/Alt+W로 탐색기 창을 닫을 때마다 뜨는 확인창(요청 #127)이 매번 번거롭다는
  // 의견에 따라, 이 확인창을 아예 건너뛸 수 있는 옵션을 추가한다 - 기본은 꺼짐(기존과 동일하게
  // 항상 확인창을 띄움, 실수로 닫는 것 방지가 원래 목적이었으므로).
  closeWindowWithoutConfirm: false,
  // 요청: "작업 표시줄 탐색기 클릭시 이전 위치 열기 = 기본값(누르면 자동 동작)" - 닫혀 있던
  // 탐색기를 작업표시줄 클릭으로 다시 열면 이제 이 켜고 끌 수 있는 설정 없이 항상 닫기 전 마지막
  // 위치(+트리 펼침 상태)에서 이어서 연다(window-chrome.js의 taskbarApp.onclick). 예전엔 이
  // 동작이 기본 꺼짐인 별도 설정(reopenAtLastLocation)과, 그 설정과 무관하게 항상 마지막
  // 위치로 여는 우클릭 메뉴의 "이전 위치 열기" 항목 두 가지로 나뉘어 있었는데, 클릭 자체가 이미
  // "이전 위치 열기"와 똑같이 동작하게 되면서 그 메뉴 항목은 중복이라 제거했다(우클릭 메뉴는
  // 이제 "열기" 하나만 보여준다).
  // 요청 #163: 기본은 꺼짐(예전과 동일하게 새 탭을 열면 전체화면을 먼저 풂) - 켜두면 새 "탭"을 열
  // 때도(팝업은 원래도 항상 유지) 전체화면을 풀지 않는다.
  keepFullscreenOnNewTab: false
};
// "default"는 Windows 11 스타일 폴더명이고, 기본으로 적용되는 스킨은 "win7"이다(사용자 지시 -
// "스킨 기본을 7을 기본으로"). 나머지는 각 버전의 폴더명(win2000, winxp, winvista, win7, win8,
// win10, win98)과 그대로 짝지어 _NIH_ROOT_/index/ui/theme/<name>/style.css를 가리킨다(themeStylesheetUrl).
const AVAILABLE_THEMES = new Set(["default", "win98", "win2000", "winxp", "winvista", "win7", "win8", "win10"]);
// _NIH_ROOT_ 아래 있으므로 색인/트리에는 절대 나타나지 않지만, GitHub Pages는 그대로 서빙하므로
// index.html과 같은 origin의 상대 경로로 직접 불러온다(base64 내장 없이, 진짜 파일 그대로).
// ui 폴더는 _NIH_ROOT_/index/ui 아래로 옮겨졌다(사용자 지시 - 인덱스 관련 리소스를 index/ 밑으로 모음).
function themeStylesheetUrl(name) {
  // ?v= : index.html의 빌드 번호(NIH_VER) - 테마 css가 예전 것으로 캐시되지 않게 한다.
  return `_NIH_ROOT_/index/ui/theme/${AVAILABLE_THEMES.has(name) ? name : "win7"}/style.css` + (window.NIH_VER ? "?v=" + window.NIH_VER : "");
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
  // 예전 저장값 마이그레이션: "open"과 그 외 알 수 없는 값은 지금 기본값인 "helper"로.
  if (s.doubleClickAction === "open" || !["newtab", "helper", "text", "download", "repo"].includes(s.doubleClickAction)) {
    s.doubleClickAction = "helper";
  }
  if (s.searchScope !== "all") s.searchScope = "subtree";
  s.searchRelativePath = s.searchRelativePath !== false;
  s.searchByName = s.searchByName !== false;
  s.searchByTag = s.searchByTag !== false;
  s.aeroEnabled = s.aeroEnabled !== false;
  s.trayIconCount = Math.max(1, Math.min(25, Number(s.trayIconCount) || DEFAULT_SETTINGS.trayIconCount));
  if (s.dfEditorTheme !== "light") s.dfEditorTheme = "dark";
  if (!AVAILABLE_THEMES.has(s.theme)) s.theme = "win7";
  s.skinIconPriority = s.skinIconPriority === true;
  s.skinSoundPriority = s.skinSoundPriority === true;
  s.fullscreenOnLoad = s.fullscreenOnLoad !== false;
  s.checkHelperOnLoad = s.checkHelperOnLoad === true;
  s.closeWindowWithoutConfirm = s.closeWindowWithoutConfirm === true;
  s.keepFullscreenOnNewTab = s.keepFullscreenOnNewTab === true;
  return s;
}
function applyAeroToDocument() {
  document.body.classList.toggle("no-aero", !settings.aeroEnabled);
}
function saveSettings() {
  try { localStorage.setItem(settingsKey(), JSON.stringify(settings)); } catch (e) {}
}
let settings = { ...DEFAULT_SETTINGS };

/* ============ 요청 #136: 환경설정도 메뉴 메이커(#135)처럼 앱 내 창(app-window.js)으로
   ----------------------------------------------------------------------------
   #settingsOverlay/.settings-panel 고정 오버레이 div는 index.html에서 아예 없앴다. 대신 열 때마다
   dfCreateAppWindow로 새 .app-win을 만든다 - 그래서 setTheme 등 안의 입력 엘리먼트들도 더 이상
   페이지 로드 시점에 고정으로 존재하지 않고(state.js의 els 목록에서도 뺐음), 창을 열 때마다
   dfInitSettingsWindow(handle)가 그 안에서 새로 찾아 이벤트를 건다. 메뉴 메이커처럼 한 번에 하나만
   떠야 하므로 dfSettingsWinHandle로 스스로 싱글턴을 지킨다. 저장은 각 입력의 onchange에서 바로
   이뤄지므로(파일처럼 따로 "저장" 버튼이 없음) dirty 상태/닫기 확인은 필요 없다.
   .settings-body/.settings-row/.settings-check/.settings-hint/.settings-label/.settings-select/
   .settings-divider/.settings-button(-neutral) CSS 클래스는 위치잡기와 무관한 "내용" 스타일이라
   그대로 재사용한다 - search-and-status.js의 시계/날씨/배터리 상세 팝업도 같은 클래스를 쓰므로(자기만의
   오버레이 div를 직접 만들어 쓰는 방식 그대로 둠) 그 CSS 정의 자체는 건드리지 않는다.
   .settings-overlay/.settings-panel/.settings-titlebar/.settings-close 클래스는 CSS에는 남아있지만
   이 앱(메인 환경설정)에서는 이제 아무도 안 쓴다. */
function dfsBuildSettingsBodyHtml() {
  return `
    <div class="settings-body">
      <div class="settings-row">
        <span class="settings-label">테마</span>
        <select class="settings-select" id="setTheme">
          <option value="win98">Windows 98</option>
          <option value="win2000">Windows 2000</option>
          <option value="winxp">Windows XP</option>
          <option value="winvista">Windows Vista</option>
          <option value="win7">Windows 7 (기본)</option>
          <option value="win8">Windows 8</option>
          <option value="win10">Windows 10</option>
          <option value="default">Windows 11</option>
        </select>
      </div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setSkinIconPriority"> 스킨 아이콘 우선</label>
        <div class="settings-hint">기본은 icon_set.json의 아이콘이 우선이고(겹치지 않는 항목은 스킨 쪽도 그대로 씀), 이 옵션을 켜면 지금 스킨의 icon_set.json(메뉴 메이커에서 "스킨용으로 저장"한 것)이 겹치는 항목에서 기본보다 우선합니다.</div>
      </div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setSkinSoundPriority"> 스킨 사운드 우선</label>
        <div class="settings-hint">아이콘과 같은 방식입니다 - 기본은 sound_set.json의 소리가 우선이고, 이 옵션을 켜면 지금 스킨의 sound_set.json(메뉴 메이커 사운드 탭에서 "스킨용으로 저장"한 것)이 겹치는 상황에서 기본보다 우선합니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setFullscreenOnLoad"> 페이지 로드시 전체화면</label>
        <div class="settings-hint">브라우저 정책상 클릭 등 사용자 동작이 있어야 전체화면으로 들어갈 수 있어서, 실제로는 페이지를 연 뒤 처음 클릭할 때 전체화면이 됩니다. 팝업(작은 별도 창)은 전체화면을 풀지 않고 그대로 유지하며, 새 탭을 여는 동작을 하면(아래 옵션이 꺼져 있는 한) 먼저 전체화면을 풀고 열고, 그 탭에서 돌아오면 다시 자동으로 전체화면이 됩니다(Esc 등으로 직접 전체화면을 풀었을 때는 그 뒤로 자동으로 다시 들어가지 않습니다).</div>
        <button class="settings-button settings-button-neutral" id="setForceFullscreenBtn" style="margin-top:6px;">지금 바로 전체화면으로 전환</button>
      </div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setKeepFullscreenOnNewTab"> 새 탭을 열어도 전체화면 유지</label>
        <div class="settings-hint">기본은 꺼짐입니다 - 새 탭을 열 때마다 전체화면을 풀었다가 돌아오면 다시 들어갑니다. 켜두면 새 탭을 열어도 전체화면을 풀지 않습니다(팝업은 이 설정과 무관하게 항상 전체화면을 유지합니다).</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setGithubLinks"> GitHub 바로가기 표시</label>
        <div class="settings-hint">우클릭 메뉴에 "raw 보기 / 저장소에서 보기 / 브라우저에서 다운로드"를 추가로 표시합니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <span class="settings-label">파일 더블클릭 시 동작 (폴더 · md 파일 제외, html 포함)</span>
        <select class="settings-select" id="setDoubleClick">
          <option value="helper">열기(로컬, 기본값)</option>
          <option value="newtab">열기(새 탭에서 열기)</option>
          <option value="text">텍스트로 열기</option>
          <option value="download">다운로드</option>
          <option value="repo">저장소에서 보기(GitHub)</option>
        </select>
        <div class="settings-hint">"저장소에서 보기"는 GitHub 바로가기 표시(위 설정)가 꺼져 있으면 새 탭에서 열기로 대신 동작합니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <span class="settings-label">검색 범위</span>
        <select class="settings-select" id="setSearchScope">
          <option value="subtree">현재 폴더의 하위 폴더만</option>
          <option value="all">전체 저장소</option>
        </select>
      </div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setSearchRelative"> 검색 결과 위치를 현재 폴더 기준 상대 경로로 표시</label>
      </div>
      <!-- 요청: "환경설정 → 검색 창에 검색 모드 넣기(설정 이관)" - 검색 모드(이름/태그) 체크박스는
           검색할 때마다 여기까지 들어와서 바꾸기 번거롭다는 지적으로 검색창 옆의 작은 버튼(index.html의
           #btnSearchMode, search-and-status.js의 openSearchModeMenu)으로 옮겼다. settings.searchByName/
           searchByTag 값 자체와 "최소 하나는 켜져 있어야 함" 로직은 그대로이고, 그걸 바꾸는 UI
           위치만 옮겨졌다. -->
      <div class="settings-divider"></div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setAeroEnabled"> 에어로(반투명 블러 효과) 사용</label>
        <div class="settings-hint">작업표시줄/시작 메뉴/설정 창/우클릭 메뉴의 반투명 유리 효과를 켜고 끕니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <span class="settings-label">트레이 빠른 실행 아이콘 개수 (1~25)</span>
        <input type="number" class="settings-select" id="setTrayIconCount" min="1" max="25" step="1">
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <span class="settings-label">로컬 캐시</span>
        <button class="settings-button settings-button-neutral" id="setPreloadAllBtn">전체 폴더 미리 불러오기</button>
        <div class="settings-hint">저장소 전체를 지금 미리 순회해서 로컬 스토리지에 캐시해둡니다(폴더가 많으면 시간이 걸릴 수 있음).</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <span class="settings-label">메뉴 메이커</span>
        <button class="settings-button settings-button-neutral" id="setMenuMakerBtn">메뉴 메이커 열기</button>
        <div class="settings-hint">시작 메뉴/트레이(menu_set.json), 폴더·확장자별 아이콘(icon_set.json), 상황별 알림음(sound_set.json)을 탭으로 나눠 새 탭의 GUI로 편집합니다 - 항목을 넣었다 뺐다 하고 순서도 바꿀 수 있고, 이름·주소·아이콘(URL 또는 이미지 붙여넣기)·소리 지정, 하위 메뉴 구성이 가능합니다. 저장은 다른 저장/다운로드 버튼과 같은 방식이며, 받은 파일을 저장소의 _NIH_ROOT_/index/ 안 같은 이름 위치에 덮어써야 실제로 반영됩니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setCheckHelperOnLoad"> 페이지를 열 때 로컬 웹훅 자동 확인</label>
        <div class="settings-hint">기본은 꺼짐입니다(브라우저의 로컬 네트워크 접근 권한 팝업이 뜰 수 있음) - 켜두면 페이지를 열 때마다 로컬 헬퍼가 실행 중인지 조용히 미리 확인해둡니다. 웹훅으로 다운로드를 한 번이라도 성공하면 이후로는 자동으로 켜집니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setCloseWithoutConfirm"> 탐색기 창을 닫을 때 확인창 없이 바로 닫기</label>
        <div class="settings-hint">기본은 꺼짐입니다 - Ctrl+W/Alt+W나 닫기 버튼을 누르면 실수 방지를 위해 항상 확인창을 먼저 띄웁니다. 켜두면 확인 없이 바로 닫힙니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setFakeRotate"> 가짜 가로 모드 (세로로 고정된 터치 기기)</label>
        <div class="settings-hint">기본은 켜짐입니다 - 터치 기기에서 화면이 세로로 길면 전체를 시계 방향으로 90° 돌려 가로 화면처럼 씁니다(터치 판정도 같이 돌아감). 기기를 실제로 가로로 돌리면 자동으로 풀립니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <label class="settings-check"><input type="checkbox" id="setOskDefault"> 가상 키보드 기본 사용</label>
        <div class="settings-hint">기본은 켜짐입니다 - 키보드든 패드든 무엇이 연결돼 있든 입력창을 누르면 이 앱의 가상 키보드를 띄우고, 폰 자체의 화면 키보드는 올라오지 않게 막습니다. 끄면 폰 키보드를 막지 않고, 가상 키보드는 게임패드로 조작할 때만 뜹니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <span class="settings-label">로컬 헬퍼(웹훅)</span>
        <button class="settings-button settings-button-neutral" id="setDownloadHelperBtn">웹훅 받기</button>
        <button class="settings-button" id="setKillHelperBtn">웹훅 종료</button>
        <div class="settings-hint">"웹훅 받기"는 저장소의 localserver.ahk를 바로 내려받습니다(받은 뒤 실행하세요). "웹훅 종료"는 실행 중인 로컬 헬퍼를 끕니다 - 트레이 아이콘이 없어서 마우스로는 끌 수 없으므로 끄려면 이 버튼을 사용하세요. (8000~8020 전체 포트에 종료 요청을 보냅니다) 그 밖의 외부 도구/파일 다운로드는 아래 "툴박스"에서 관리합니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <span class="settings-label">툴박스</span>
        <button class="settings-button settings-button-neutral" id="setToolboxMakerBtn">툴박스 메이커 열기</button>
        <div class="settings-hint">탐색기의 "툴박스" 위치에 보여줄 외부 링크(exe/zip 등 어떤 주소든) 목록을 GUI로 편집합니다(toolbox_set.json). 이름/주소(URL)/아이콘을 지정하면, 탐색기 안에서는 실제로 존재하는 파일처럼 나타나고 열면 그 주소로 이동합니다 - 절대/상대 경로 구분 없이 아무 사이트의 주소나 넣을 수 있습니다. 저장은 다른 저장/다운로드 버튼과 같은 방식이며, 받은 파일을 저장소의 _NIH_ROOT_/index/toolbox_set.json 위치에 덮어써야 실제로 반영됩니다.</div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <div class="settings-hint">빌드 ${window.NIH_VER || "?"}</div>
      </div>
    </div>
  `;
}

let dfSettingsWinHandle = null;
function dfApplySettingsToPanel(root) {
  const $ = (id) => root.querySelector("#" + id);
  if ($("setTheme")) $("setTheme").value = settings.theme;
  $("setGithubLinks").checked = settings.githubLinksEnabled;
  $("setDoubleClick").value = settings.doubleClickAction;
  $("setSearchScope").value = settings.searchScope;
  $("setSearchRelative").checked = settings.searchRelativePath;
  if ($("setAeroEnabled")) $("setAeroEnabled").checked = settings.aeroEnabled;
  if ($("setTrayIconCount")) $("setTrayIconCount").value = settings.trayIconCount;
  if ($("setSkinIconPriority")) $("setSkinIconPriority").checked = settings.skinIconPriority;
  if ($("setSkinSoundPriority")) $("setSkinSoundPriority").checked = settings.skinSoundPriority;
  if ($("setFullscreenOnLoad")) $("setFullscreenOnLoad").checked = settings.fullscreenOnLoad;
  if ($("setCheckHelperOnLoad")) $("setCheckHelperOnLoad").checked = settings.checkHelperOnLoad;
  if ($("setCloseWithoutConfirm")) $("setCloseWithoutConfirm").checked = settings.closeWindowWithoutConfirm;
  if ($("setKeepFullscreenOnNewTab")) $("setKeepFullscreenOnNewTab").checked = settings.keepFullscreenOnNewTab;
}
function applySearchPlaceholder() {
  els.searchInput.placeholder = settings.searchScope === "all" ? "전체 검색" : "현재 폴더 검색";
}

// 요청 #134/#136: 웹훅이 막 연결되어 더블클릭 동작을 자동으로 "열기(로컬)"로 바꿀 때, 환경설정
// 창이 이미 열려 있었다면 그 안의 선택창에도 바로 반영한다(local-helper.js에서 호출). 안 열려
// 있으면 다음에 열 때 dfApplySettingsToPanel이 최신 settings 값을 다시 읽어오므로 따로 할 일 없다.
function dfSettingsReflectDoubleClick(value) {
  if (!dfSettingsWinHandle) return;
  const sel = dfSettingsWinHandle.bodyEl.querySelector("#setDoubleClick");
  if (sel) sel.value = value;
}
// 요청 #152: 웹훅이 처음 응답해서(연결·성공·실패 무관) "페이지를 열 때 로컬 웹훅 자동 확인"이 자동으로 켜질 때,
// 환경설정 창이 열려 있었다면 체크박스에도 바로 반영한다(dfNoteWebhookInUse에서 호출).
function dfSettingsReflectCheckHelperOnLoad(value) {
  if (!dfSettingsWinHandle) return;
  const cb = dfSettingsWinHandle.bodyEl.querySelector("#setCheckHelperOnLoad");
  if (cb) cb.checked = value;
}

function dfInitSettingsWindow(handle) {
  const root = handle.bodyEl;
  const $ = (id) => root.querySelector("#" + id);
  dfApplySettingsToPanel(root);

  if ($("setFullscreenOnLoad")) {
    $("setFullscreenOnLoad").onchange = () => {
      settings.fullscreenOnLoad = $("setFullscreenOnLoad").checked;
      saveSettings();
      if (settings.fullscreenOnLoad) {
        // 지금 이 클릭 자체가 사용자 동작이니 바로 전체화면으로 들어갈 수 있다 - 그리고 이전에
        // "사용자가 직접 풂"으로 기록돼 있던 상태도 이 설정을 다시 켰다는 건 다시 자동으로 들어가고
        // 싶다는 뜻이니 해제해준다.
        dfFsUserOptedOut = false;
        dfRequestFullscreenQuiet();
      } else if (dfIsFullscreen()) {
        // 설정을 꺼서 나가는 경우다 - dfFsIntentionalExit를 세우지 않고 그냥 나가면, fullscreenchange
        // 리스너가 "사용자가 직접 뺀 것"과 같은 경로로 처리해 dfFsWantReenter도 안 서고 자동으로 다시
        // 안 들어가게 되는데, 지금 설정이 꺼진 상태이므로 그게 정확히 원하는 동작이다.
        const p = document.exitFullscreen();
        if (p && p.catch) p.catch(() => {});
      }
    };
  }

  // 가짜 가로 모드(fake-rotate.js) - 저장소 이름과 무관한 자체 localStorage 키를 쓴다(head에서 가장 먼저 읽어야 해서).
  if ($("setFakeRotate") && window.FakeRot) {
    $("setFakeRotate").checked = FakeRot.enabled();
    $("setFakeRotate").onchange = () => FakeRot.setEnabled($("setFakeRotate").checked);
  }

  // 가상 키보드 기본 사용(gamepad.js) - 가짜 가로 모드와 같은 이유로 자체 localStorage 키를 쓴다.
  if ($("setOskDefault") && window.GpOsk) {
    $("setOskDefault").checked = GpOsk.enabled();
    $("setOskDefault").onchange = () => GpOsk.setEnabled($("setOskDefault").checked);
  }

  if ($("setTheme")) {
    $("setTheme").onchange = () => {
      settings.theme = AVAILABLE_THEMES.has($("setTheme").value) ? $("setTheme").value : "default";
      saveSettings();
      applyTheme(settings.theme);
      // 요청 #121: 스킨이 바뀌면 그 스킨의 icon_set.json(있다면)을 기본과 다시 병합해서 반영한다.
      refreshMergedIconConfig();
      // 사운드도 스킨별 sound_set.json이 있을 수 있으므로 아이콘과 똑같이 다시 병합한다.
      refreshMergedSoundConfig();
      // 요청: 메뉴 메이커가 이미 열려 있으면(싱글턴) 그 안의 "OO 스킨용으로 저장" 이름 표시도
      // 새로고침(F5) 없이 바로 지금 스킨 이름으로 갱신한다(menu-maker.js의 handle.updateSkinName).
      if (dfMenuMakerWinHandle && dfMenuMakerWinHandle.updateSkinName) dfMenuMakerWinHandle.updateSkinName(settings.theme);
    };
  }
  if ($("setSkinIconPriority")) {
    $("setSkinIconPriority").onchange = () => {
      settings.skinIconPriority = $("setSkinIconPriority").checked;
      saveSettings();
      refreshMergedIconConfig();
    };
  }
  if ($("setSkinSoundPriority")) {
    $("setSkinSoundPriority").onchange = () => {
      settings.skinSoundPriority = $("setSkinSoundPriority").checked;
      saveSettings();
      refreshMergedSoundConfig();
    };
  }
  $("setGithubLinks").onchange = () => { settings.githubLinksEnabled = $("setGithubLinks").checked; saveSettings(); };
  if ($("setCheckHelperOnLoad")) {
    $("setCheckHelperOnLoad").onchange = () => {
      settings.checkHelperOnLoad = $("setCheckHelperOnLoad").checked;
      saveSettings();
    };
  }
  if ($("setCloseWithoutConfirm")) {
    $("setCloseWithoutConfirm").onchange = () => {
      settings.closeWindowWithoutConfirm = $("setCloseWithoutConfirm").checked;
      saveSettings();
    };
  }
  if ($("setKeepFullscreenOnNewTab")) {
    $("setKeepFullscreenOnNewTab").onchange = () => {
      settings.keepFullscreenOnNewTab = $("setKeepFullscreenOnNewTab").checked;
      saveSettings();
    };
  }
  // 요청 #163: "F11을 누르세요"라고 안내하는 것보다, 버튼 하나로 바로 전체화면에 들어가게 하는 게
  // 더 자연스럽다는 지적 - 토글이 아니라 지금 이 클릭(사용자 동작으로 인정됨)에 바로 실행하는
  // 일회성 버튼이다. 이미 전체화면이면 조용히 아무 일도 하지 않는다.
  if ($("setForceFullscreenBtn")) {
    $("setForceFullscreenBtn").onclick = () => {
      if (!dfIsFullscreen()) dfRequestFullscreenQuiet();
    };
  }
  $("setDoubleClick").onchange = () => {
    settings.doubleClickAction = $("setDoubleClick").value;
    saveSettings();
  };
  $("setSearchScope").onchange = () => {
    settings.searchScope = $("setSearchScope").value === "all" ? "all" : "subtree";
    saveSettings();
    applySearchPlaceholder();
  };
  $("setSearchRelative").onchange = () => {
    settings.searchRelativePath = $("setSearchRelative").checked;
    saveSettings();
  };
  // setSearchByName/setSearchByTag 체크박스는 더 이상 이 창에 없다(설정 이관 - 위 HTML 주석
  // 참고) - search-and-status.js의 openSearchModeMenu/setSearchModeOption이 대신 처리한다.
  if ($("setAeroEnabled")) {
    $("setAeroEnabled").onchange = () => {
      settings.aeroEnabled = $("setAeroEnabled").checked;
      saveSettings();
      applyAeroToDocument();
    };
  }
  if ($("setTrayIconCount")) {
    $("setTrayIconCount").onchange = () => {
      settings.trayIconCount = Math.max(1, Math.min(25, Number($("setTrayIconCount").value) || DEFAULT_SETTINGS.trayIconCount));
      $("setTrayIconCount").value = settings.trayIconCount;
      saveSettings();
      if (lastTrayItems) renderTrayIcons(lastTrayItems);
    };
  }
  $("setPreloadAllBtn").onclick = async () => {
    $("setPreloadAllBtn").disabled = true;
    try {
      await preloadAllToCache();
    } finally {
      $("setPreloadAllBtn").disabled = false;
    }
  };
  $("setKillHelperBtn").onclick = async () => {
    $("setKillHelperBtn").disabled = true;
    try {
      await killAllHelperPorts();
      showToast("로컬 헬퍼 종료 요청을 보냈습니다.", { kind: "info", sound: "notify_info" });
    } finally {
      $("setKillHelperBtn").disabled = false;
    }
  };
  $("setDownloadHelperBtn").onclick = () => downloadRealFileDirect(LOCALSERVER_TOOL_PATH, "localserver.ahk");
  if ($("setToolboxMakerBtn")) $("setToolboxMakerBtn").onclick = () => dfsOpenMenuMakerInWindow({ initialTab: "toolbox" });
  // 요청 #136: 환경설정도 이제 앱 내 창이라 메뉴 메이커와 같은 z-index 공간을 쓰므로(둘 다
  // dfCreateAppWindow), 예전 #135 시절 필요했던 "메뉴 메이커를 열기 전에 환경설정 오버레이부터
  // 닫기"는 더 이상 필요 없다 - 두 창이 동시에 떠 있어도 각자 독립적으로 옮기고 포커스할 수 있다.
  if ($("setMenuMakerBtn")) $("setMenuMakerBtn").onclick = () => {
    dfsOpenMenuMakerInWindow();
  };
}

function setupSettingsPanel() {
  els.settingsMenuRow.onclick = (e) => {
    e.stopPropagation();
    els.startMenu.classList.remove("open");
    closeAllSubmenus();
    dfsOpenSettingsWindow();
  };
}

function dfsOpenSettingsWindow() {
  if (dfSettingsWinHandle) { dfSettingsWinHandle.focus(); return dfSettingsWinHandle; }
  const handle = dfCreateAppWindow({
    title: "환경설정",
    icon: "⚙", // 자리표시자 - 아래서 renderSettingsIconInto로 실제 커스텀 아이콘(있으면, onerror 폴백 포함)을 채운다
    width: 460,
    height: 620,
    bodyHtml: dfsBuildSettingsBodyHtml(),
    onClose: () => { dfSettingsWinHandle = null; },
  });
  dfSettingsWinHandle = handle;
  renderSettingsIconInto(handle.el.querySelector(".tb-icon"));
  dfInitSettingsWindow(handle);
  return handle;
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
  els.startBtn.onclick = (e) => { e.stopPropagation(); toggleStartMenu(); };
  els.startMenu.addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", () => { els.startMenu.classList.remove("open"); closeAllSubmenus(); });
}
// 요청 #164: Ctrl+Win(윈도우 키) 단축키로도 시작 메뉴를 열고 닫을 수 있게 - keyboard-and-activate.js의
// 전역 keydown 리스너에서 호출한다(시작 버튼 클릭과 완전히 같은 동작).
/* 시작 메뉴 방향키 이동 (버그 리포트: 시작 메뉴를 열어도 방향키가 뒤의 탐색기 선택을 움직였다)
   시작 메뉴가 열려 있는 동안에는 방향키/Enter/Esc를 여기서 가로채 메뉴 안에서만 쓴다(게임패드의 십자키도
   방향키로 들어오므로 같이 해결된다).
     - 위/아래: 항목 이동(끝에서 반대쪽으로), 오른쪽/Enter: 하위 메뉴 열기 또는 실행, 왼쪽: 하위 메뉴 닫기
     - Esc 또는 다시 토글: 닫고, 키보드 포커스를 메뉴를 열기 전 자리로 되돌린다
   fromKey: 키보드/패드로 열었을 때 true - 첫 항목을 바로 강조한다(마우스로 열면 강조 없이 시작). */
let startKbPrevFocus = null;
function startMenuIsOpen() { return els.startMenu.classList.contains("open"); }
function startKbRows() {
  const subs = openSubmenuEls.filter(el => el.isConnected);
  const box = subs.length ? subs[subs.length - 1] : els.startMenu;
  return [...box.querySelectorAll(".start-app-row")].filter(r => r.offsetParent !== null);
}
function startKbCurrent() {
  const rows = startKbRows();
  return rows.find(r => r.classList.contains("kb-focus")) || null;
}
function startKbFocus(row) {
  document.querySelectorAll(".start-app-row.kb-focus").forEach(r => r.classList.remove("kb-focus"));
  if (!row) return;
  row.classList.add("kb-focus");
  if (row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
}
function closeStartMenu(restoreFocus) {
  closeAllSubmenus();
  els.startMenu.classList.remove("open");
  startKbFocus(null);
  const prev = startKbPrevFocus;
  startKbPrevFocus = null;
  if (restoreFocus && prev && prev !== document.body && prev.isConnected && prev.focus) prev.focus({ preventScroll: true });
}
function toggleStartMenu(fromKey) {
  if (startMenuIsOpen()) { closeStartMenu(true); return; }
  startKbPrevFocus = document.activeElement;
  els.startMenu.classList.add("open");
  startKbFocus(fromKey ? startKbRows()[0] : null);
}
function startKbOpenSub(row) {
  if (!row || !row.querySelector(".start-app-chevron")) return false;
  row.click(); // 하위 메뉴 열기(openSubmenuFor가 새 하위 메뉴를 목록 끝에 추가한다)
  const sub = openSubmenuEls[openSubmenuEls.length - 1];
  if (sub) { sub._kbParentRow = row; startKbFocus(startKbRows()[0]); }
  return true;
}
document.addEventListener("keydown", (e) => {
  if (!startMenuIsOpen()) return;
  if (typeof activeCtxMenu !== "undefined" && activeCtxMenu) return; // 시작 항목의 우클릭 메뉴가 떠 있으면 그쪽이 먼저
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Enter", "Escape"].includes(e.key)) return;
  e.preventDefault();
  e.stopImmediatePropagation(); // 뒤의 탐색기/바탕화면/트리의 방향키 이동이 같이 움직이지 않게
  if (e.key === "Escape") { closeStartMenu(true); return; }
  const rows = startKbRows();
  if (!rows.length) return;
  const cur = startKbCurrent(), i = cur ? rows.indexOf(cur) : -1;
  if (e.key === "ArrowDown") startKbFocus(rows[i < 0 ? 0 : (i + 1) % rows.length]);
  else if (e.key === "ArrowUp") startKbFocus(rows[i < 0 ? rows.length - 1 : (i - 1 + rows.length) % rows.length]);
  else if (e.key === "ArrowRight") { if (cur) startKbOpenSub(cur); else startKbFocus(rows[0]); }
  else if (e.key === "ArrowLeft") {
    const subs = openSubmenuEls.filter(el => el.isConnected);
    if (!subs.length) return;
    const last = subs[subs.length - 1], parent = last._kbParentRow;
    openSubmenuEls = openSubmenuEls.filter(el => el !== last);
    last.remove();
    startKbFocus(parent && parent.isConnected ? parent : startKbRows()[0]);
  }
  else if (e.key === "Enter") {
    if (!cur) return;
    if (!startKbOpenSub(cur)) cur.click(); // 실행(항목의 click이 메뉴도 닫는다 - 새로 뜬 창의 포커스는 건드리지 않음)
  }
}, true);

/* ============ menu_set.json / icon_set.json / sound_set.json (요청 #122) ============
   예전엔 _NIH_ROOT_/menu/ 아래 start.json+tray.json 두 파일 -> 그 다음엔 메뉴 메이커가 다루기
   쉽게 menu.json 하나로 병합(시작메뉴+트레이+아이콘 전부) -> 이제는 메뉴 메이커가 메뉴/아이콘/
   사운드 3개 탭으로 나뉘면서(사용자 지시) 그 구분을 파일 자체로도 반영해 3개로 다시 쪼갰다:
     - menu_set.json: { "start": [...], "tray": [...] } (예전 menu.json의 그 부분과 동일한 모양)
     - icon_set.json: { "folders": {}, "extensions": {}, "repoRoot": "", "recycleBin": "" }
       (예전 menu.json의 "icons" 섹션이 통째로 옮겨온 것과 같은 모양)
     - sound_set.json: { "<시나리오 키>": "<소리 URL 또는 base64>", ... } (신규 - state.js의
       DF_SOUND_SCENARIOS 참고)
   세 파일 다 없거나 형식이 잘못돼도 조용히 빈 설정으로 취급한다(선택 기능). */
const MENU_SET_JSON_PATH = "_NIH_ROOT_/index/menu_set.json";
const ICON_SET_JSON_PATH = "_NIH_ROOT_/index/icon_set.json";
const SOUND_SET_JSON_PATH = "_NIH_ROOT_/index/sound_set.json";
// 요청 #143: 메뉴 메이커 4번째 탭("확장자")이 다루는 파일 - { "확장자(점 없음,소문자)": "이니셜" }.
const EXTENSION_RUN_SET_JSON_PATH = "_NIH_ROOT_/index/extension_run_set.json";
// 요청: GitTool.7z처럼 언제든 쪼개지거나 늘어날 수 있는 외부/대용량 파일용 하드코딩 다운로드
// 버튼 대신, 툴박스(메뉴 메이커의 "툴박스" 탭)로 이런 항목들을 자유롭게 관리한다 - 모양은
// { "items": [ { "name": "...", "url": "...", "icon": "...", "popup": false }, ... ] }.
const TOOLBOX_SET_JSON_PATH = "_NIH_ROOT_/index/toolbox_set.json";
const DESKTOP_SET_JSON_PATH = "_NIH_ROOT_/index/desktop_set.json";
async function fetchJsonQuiet(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && typeof data === "object") ? data : null;
  } catch (e) {
    return null; // 파일이 없거나 형식이 잘못돼도 조용히 무시 (선택 기능이므로)
  }
}
async function loadMenuSetConfig() {
  // 요청 #123: 메뉴 메이커가 localStorage에 남겨둔 "로컬 반영"이 있으면 실제 파일보다 그걸 먼저 쓴다.
  const local = dfReadLocalOverride(dfLsMenuKey());
  if (local) return { start: Array.isArray(local.start) ? local.start : [], tray: Array.isArray(local.tray) ? local.tray : [] };
  const data = await fetchJsonQuiet(MENU_SET_JSON_PATH);
  if (!data) return null;
  return { start: Array.isArray(data.start) ? data.start : [], tray: Array.isArray(data.tray) ? data.tray : [] };
}
async function loadIconSetConfig() {
  const local = dfReadLocalOverride(dfLsIconKey());
  if (local) return local;
  const data = await fetchJsonQuiet(ICON_SET_JSON_PATH);
  return data || {};
}
async function loadSoundSetConfig() {
  const local = dfReadLocalOverride(dfLsSoundKey());
  if (local) return local;
  const data = await fetchJsonQuiet(SOUND_SET_JSON_PATH);
  return data || {};
}
async function loadExtensionRunSetConfig() {
  const local = dfReadLocalOverride(dfLsExtRunKey());
  if (local) return local;
  const data = await fetchJsonQuiet(EXTENSION_RUN_SET_JSON_PATH);
  return data || {};
}
async function loadToolboxSetConfig() {
  const local = dfReadLocalOverride(dfLsToolboxKey());
  if (local) return local;
  const data = await fetchJsonQuiet(TOOLBOX_SET_JSON_PATH);
  return data || {};
}
// 바탕 화면 링크(desktop_set.json) - 툴박스와 같은 방식(로컬 미리보기 override가 있으면 그것 우선).
async function loadDesktopSetConfig() {
  const local = dfReadLocalOverride(dfLsDesktopSetKey());
  if (local) return local;
  const data = await fetchJsonQuiet(DESKTOP_SET_JSON_PATH);
  return data || {};
}
async function refreshDesktopSetConfig() {
  applyDesktopSetConfig(await loadDesktopSetConfig());
  if (typeof dfsRenderDesktop === "function") dfsRenderDesktop();
}
// 요청 #121: 스킨 폴더(_NIH_ROOT_/index/ui/theme/<스킨>/) 안에도 icon_set.json이 있을 수 있다
// (메뉴 메이커의 "스킨용으로 저장" 체크박스로 만들어진다). menu_set.json/sound_set.json은 스킨
// 폴더에 있어도 절대 읽지 않는다 - 항상 기본(공용) 위치의 것만 쓴다. icon_set.json만 예외적으로
// 기본 + 스킨 둘 다 읽어서 병합한다(mergeIconSetConfigs 참고).
function skinIconSetPath(skinName) {
  return `_NIH_ROOT_/index/ui/theme/${AVAILABLE_THEMES.has(skinName) ? skinName : "win7"}/icon_set.json`;
}
async function loadSkinIconSetConfig(skinName) {
  const local = dfReadLocalOverride(dfLsIconSkinKey(skinName));
  if (local) return local;
  const data = await fetchJsonQuiet(skinIconSetPath(skinName));
  return data || {};
}
// 사운드도 아이콘과 똑같이 스킨 폴더 안에 자기만의 sound_set.json을 둘 수 있다("스킨용으로
// 저장" - 메뉴 메이커 사운드 탭). 이전에는 이 개념을 아이콘 탭에만 만들어두고 사운드 탭에는
// 빼먹었던 것을 여기서 icon과 완전히 같은 패턴(경로/로드/병합/새로고침)으로 채운다.
function skinSoundSetPath(skinName) {
  return `_NIH_ROOT_/index/ui/theme/${AVAILABLE_THEMES.has(skinName) ? skinName : "win7"}/sound_set.json`;
}
async function loadSkinSoundSetConfig(skinName) {
  const local = dfReadLocalOverride(dfLsSoundSkinKey(skinName));
  if (local) return local;
  const data = await fetchJsonQuiet(skinSoundSetPath(skinName));
  return data || {};
}
// sound_set.json은 icon_set.json의 folders/extensions와 같은 모양(그냥 {시나리오키: 소리} 평평한
// 객체 하나)이라 mergeIconMap을 그대로 재사용해도 되지만, 다른 이름(사운드)으로 부르는 쪽이 코드
// 읽을 때 헷갈리지 않으므로 얇은 함수 하나로 감싼다.
function mergeSoundSetConfigs(base, skin, skinPriority) {
  return mergeIconMap(base, skin, skinPriority);
}
// 겹치지 않는 키는 양쪽 다 그대로 살아남고, 겹치는 키만 우선순위대로 하나를 고른다.
function mergeIconMap(baseMap, skinMap, skinPriority) {
  const b = (baseMap && typeof baseMap === "object") ? baseMap : {};
  const s = (skinMap && typeof skinMap === "object") ? skinMap : {};
  return skinPriority ? Object.assign({}, b, s) : Object.assign({}, s, b);
}
function mergeIconSingle(baseVal, skinVal, skinPriority) {
  const bv = baseVal || "", sv = skinVal || "";
  return skinPriority ? (sv || bv) : (bv || sv);
}
function mergeIconSetConfigs(base, skin, skinPriority) {
  const b = base || {}, s = skin || {};
  // 휴지통은 비어있음/참 두 필드로 나뉜다 - 각 쪽이 새 필드를 안 갖고 있으면(구버전 icon_set.json)
  // 그쪽의 옛 recycleBin 한 필드를 대신 쓴다(state.js의 applyCustomIconConfig와 같은 마이그레이션).
  const bRecycleEmpty = b.recycleBinEmpty || b.recycleBin || "";
  const bRecycleFull = b.recycleBinFull || b.recycleBin || "";
  const sRecycleEmpty = s.recycleBinEmpty || s.recycleBin || "";
  const sRecycleFull = s.recycleBinFull || s.recycleBin || "";
  return {
    folders: mergeIconMap(b.folders, s.folders, skinPriority),
    extensions: mergeIconMap(b.extensions, s.extensions, skinPriority),
    repoRoot: mergeIconSingle(b.repoRoot, s.repoRoot, skinPriority),
    recycleBinEmpty: mergeIconSingle(bRecycleEmpty, sRecycleEmpty, skinPriority),
    recycleBinFull: mergeIconSingle(bRecycleFull, sRecycleFull, skinPriority),
    // 요청 #144: 바탕화면/환경설정 아이콘도 저장소 루트/휴지통과 같은 규칙으로 병합한다.
    desktop: mergeIconSingle(b.desktop, s.desktop, skinPriority),
    settings: mergeIconSingle(b.settings, s.settings, skinPriority)
  };
}
// 부팅 시(bootstrap.js)와 메뉴 메이커를 열 때(menu-maker.js) 둘 다 필요로 하므로, 병렬로 같이
// 읽어오는 편의 함수를 하나 둔다. 메뉴 메이커의 "스킨용으로 저장" 체크박스가 편집할 스킨의
// icon_set.json도 미리 같이 읽어와 skinIcons/skinName으로 함께 건네준다(dfsOpenMenuMakerInWindow가
// 창을 만들기 전에 한 번 호출해서 초기 데이터로 넘겨준다).
async function loadAllMenuMakerConfigs() {
  const [menu, icons, sounds, skinIcons, skinSounds, extRun, toolbox, desktop] = await Promise.all([
    loadMenuSetConfig(), loadIconSetConfig(), loadSoundSetConfig(), loadSkinIconSetConfig(settings.theme), loadSkinSoundSetConfig(settings.theme), loadExtensionRunSetConfig(), loadToolboxSetConfig(), loadDesktopSetConfig()
  ]);
  return { menu: menu || { start: [], tray: [] }, icons: icons || {}, sounds: sounds || {}, skinIcons: skinIcons || {}, skinSounds: skinSounds || {}, skinName: settings.theme, extRun: extRun || {}, toolbox: toolbox || { items: [] }, desktop: desktop || { items: [] } };
}
// 부팅 시 + 스킨/스킨아이콘우선 설정이 바뀔 때마다 다시 불러서 화면에 반영한다(applyCustomIconConfig
// 이후 화면들을 다시 그려야 실제로 아이콘이 바뀐 게 보인다).
async function refreshMergedIconConfig() {
  const [base, skin] = await Promise.all([loadIconSetConfig(), loadSkinIconSetConfig(settings.theme)]);
  applyCustomIconConfig(mergeIconSetConfigs(base, skin, settings.skinIconPriority));
  renderNavPane();
  renderSettingsMenuRowIcon();
  if (els.win && !els.win.classList.contains("closed")) renderContentPane();
  if (dfsDb) await dfsRenderDesktop();
  // 요청 #144: 환경설정 창이 이미 열려 있으면(편집하는 동안 즉시 확인 가능하도록) 타이틀바
  // 아이콘도 바로 다시 그린다 - 새로 열 때만 반영되면 편집 중엔 안 바뀐 것처럼 보인다.
  if (dfSettingsWinHandle) {
    const tbIcon = dfSettingsWinHandle.el.querySelector(".tb-icon");
    if (tbIcon) renderSettingsIconInto(tbIcon);
  }
}
// refreshMergedIconConfig와 완전히 같은 패턴 - 스킨/스킨사운드우선 설정이 바뀔 때마다(테마 변경,
// 체크박스 토글, 메뉴 메이커에서 사운드를 스킨용으로 저장해 localStorage가 바뀔 때) 기본+스킨
// sound_set.json을 다시 읽어 병합해서 soundSetConfig에 반영한다.
async function refreshMergedSoundConfig() {
  const [base, skin] = await Promise.all([loadSoundSetConfig(), loadSkinSoundSetConfig(settings.theme)]);
  applySoundSetConfig(mergeSoundSetConfigs(base, skin, settings.skinSoundPriority));
  // 요청 #144: 환경설정 창이 이미 열려 있으면(편집하는 동안 즉시 확인 가능하도록) 타이틀바
  // 아이콘도 바로 다시 그린다 - 새로 열 때만 반영되면 편집 중엔 안 바뀐 것처럼 보인다.
  if (dfSettingsWinHandle) {
    const tbIcon = dfSettingsWinHandle.el.querySelector(".tb-icon");
    if (tbIcon) renderSettingsIconInto(tbIcon);
  }
}
// 요청: 툴박스 이름에 백슬래시(\)로 폴더 경로를 적을 수 있게 되면서(state.js의 toolboxTree),
// 툴박스 안에도 저장소 폴더처럼 여러 단계 하위 폴더가 생길 수 있다 - 새로 반영할 때 dirCache에
// "툴박스" 루트 한 칸만 다시 채우면, 지금 그 하위 폴더를 보고 있거나(currentPath) 트리에서
// 펼쳐둔(expanded) 하위 폴더들은 예전 내용이 캐시에 그대로 남아있게(혹은 부팅 시점의 경합으로
// toolboxTree가 아직 비어있을 때 미리 캐시된 빈 폴더가 그대로 남게) 된다. dfsBroadcastChange
// (desktop-fs.js)와 같은 방식으로 "툴박스" 전체 접두사의 캐시를 지우고, 지금 보고 있는 경로 +
// 트리에서 펼쳐둔 툴박스 하위 경로들을 다시 읽어(revealPath) 채운다.
async function applyToolboxConfigAndRefresh(cfg) {
  applyToolboxConfig(cfg);
  for (const k of [...dirCache.keys()]) {
    if (k === TOOLBOX_TREE_NAME || k.indexOf(TOOLBOX_TREE_NAME + "/") === 0) dirCache.delete(k);
  }
  const toReveal = new Set([TOOLBOX_TREE_NAME]);
  if (isToolboxPath(currentPath)) toReveal.add(currentPath.join("/"));
  if (typeof expanded !== "undefined" && expanded) {
    expanded.forEach(k => { if (k === TOOLBOX_TREE_NAME || k.indexOf(TOOLBOX_TREE_NAME + "/") === 0) toReveal.add(k); });
  }
  await Promise.all([...toReveal].map(k => revealPath(k.split("/").filter(Boolean)).catch(() => {})));
}
// 툴박스(toolbox_set.json)는 아이콘/사운드와 달리 스킨별 파일이 없는 단순한 목록이라, 병합 없이
// 다시 읽어 반영하기만 하면 된다 - 부팅 시(bootstrap.js는 이미 읽어온 cfg.toolbox로 위
// applyToolboxConfigAndRefresh를 직접 부른다) + 툴박스 메이커에서 편집할 때(menu-maker.js의
// persistLocalOverride) + 다른 탭에서 바뀌었을 때(위 storage 리스너) 이 함수 하나로 처리한다.
// 지금 탐색기가 "툴박스" 폴더(하위 폴더 포함)를 보고 있으면 내용창도 즉시 다시 그려서 새로고침
// 없이 반영되게 한다.
async function refreshToolboxConfig() {
  const cfg = await loadToolboxSetConfig();
  await applyToolboxConfigAndRefresh(cfg);
  renderNavPane();
  if (els.win && !els.win.classList.contains("closed") && isToolboxPath(currentPath)) renderContentPane();
}
// 요청 #123: 메뉴 메이커가 localStorage의 "로컬 반영" 키를 바꾸면, 이 메인 페이지가 이미 열려
// 있어도 새로고침 없이 바로 다시 그린다. 요청 #135로 메뉴 메이커가 이 문서 자신 안의 앱 내
// 창이 된 뒤로는 이 storage 리스너 자체는 더 이상 그 경로로 타지 않는다(storage 이벤트는 값을
// 바꾼 문서 자신에게는 안 오므로, 같은 문서 안에서 바뀐 건 여기 안 걸린다 - 그 경로는 이제
// menu-maker.js의 persistLocalOverride가 아래 dfDebouncedLsRefresh를 직접 불러 처리한다). 이
// 리스너는 혹시 같은 리포를 다른 탭에서 "따로" 열어뒀을 때만 여전히 쓰인다(진짜 다른 문서).
// 메뉴 메이커의 입력창들은 대부분 oninput(글자 하나마다)에서 즉시 반영하므로, 이 이벤트도 타이핑
// 하는 동안 아주 빠르게 여러 번 온다 - 매번 그대로 다시 fetch/렌더하면 낭비도 크고(로컬 정적
// 서버에 짧은 순간 요청이 몰려 실패할 수도 있음), 화면도 깜빡인다. 그래서 같은 종류(메뉴/아이콘/
// 사운드)별로 살짝 묶어서(마지막 이벤트 뒤 250ms 조용하면 그때 딱 한 번) 반영한다.
const dfLsRefreshTimers = {};
function dfDebouncedLsRefresh(kind, fn) {
  if (dfLsRefreshTimers[kind]) clearTimeout(dfLsRefreshTimers[kind]);
  dfLsRefreshTimers[kind] = setTimeout(() => { dfLsRefreshTimers[kind] = null; fn(); }, 400);
}
window.addEventListener("storage", (e) => {
  if (!e.key) return;
  if (e.key === dfLsMenuKey()) {
    dfDebouncedLsRefresh("menu", () => {
      loadMenuSetConfig().then(menu => {
        const m = menu || { start: [], tray: [] };
        renderAppList(m.start, els.startApps);
        renderTrayIcons(m.tray);
      });
    });
  } else if (e.key === dfLsIconKey() || e.key.indexOf(dfLsIconSkinPrefix()) === 0) {
    dfDebouncedLsRefresh("icon", refreshMergedIconConfig);
  } else if (e.key === dfLsSoundKey() || e.key.indexOf(dfLsSoundSkinPrefix()) === 0) {
    dfDebouncedLsRefresh("sound", refreshMergedSoundConfig);
  } else if (e.key === dfLsExtRunKey()) {
    dfDebouncedLsRefresh("extRun", () => loadExtensionRunSetConfig().then(applyExtensionRunSetConfig));
  } else if (e.key === dfLsToolboxKey()) {
    dfDebouncedLsRefresh("toolbox", refreshToolboxConfig);
  } else if (e.key === dfLsDesktopSetKey()) {
    dfDebouncedLsRefresh("desktopSet", refreshDesktopSetConfig);
  }
});
function makeAppIcon(item, className) {
  const wrap = document.createElement("div");
  wrap.className = className;
  if (item.icon) {
    const img = document.createElement("img");
    img.src = resolveIconSrc(item.icon);
    img.alt = "";
    img.onerror = () => { wrap.innerHTML = ""; wrap.textContent = (item.name || "?").charAt(0).toUpperCase(); };
    wrap.appendChild(img);
  } else {
    // 아이콘을 지정하지 않았어도 주소가 이 페이지의 플래그먼트(#폴더/파일)면 그 대상의 아이콘을 자동으로 쓴다.
    const auto = item.url ? dfSamePageLinkIcon(item.url, 20) : null;
    // 요청: 시작 메뉴(와 트레이)도 툴박스/바탕 화면처럼 확장자별 아이콘을 쓴다 - 이름이나 주소의 파일명에 확장자가
    // 있으면(예: URL-Locker.html, tool.exe) 그 확장자의 아이콘, 없으면(일반 사이트 주소 등) 예전처럼 이름 첫 글자.
    const fileName = toolboxIconNameFor(item.name || "", item.url || "");
    if (auto) wrap.innerHTML = auto;
    else if (item.url && /\.(?=[A-Za-z0-9_]*[A-Za-z])[A-Za-z0-9_]{1,8}$/.test(fileName)) wrap.innerHTML = resolveFileIcon(fileName, 20, null);
    else wrap.textContent = (item.name || "?").charAt(0).toUpperCase();
  }
  return wrap;
}
// 요청 #131: menu_set.json 항목은 이제 "새 탭 열기"가 항상 기본값이고(선택할 필요 없음), 팝업
// 여부만 고른다. mode를 주면 항목에 저장된 기본값(item.popup)과 무관하게 그 자리에서 한 번만
// 강제로 그 방식으로 연다(트레이 우클릭 메뉴 등에서 사용 - dfSetupTrayIconContextMenu 참고).
// 탐색기(드라이브) 창을 띄워(닫힘/최소화 해제 + 맨 앞으로) 해시가 가리키는 곳으로 이동한다.
function dfShowExplorerAtHash(hash) {
  els.win.classList.remove("closed", "minimized");
  els.taskbarApp.classList.add("active");
  persistWindowOpen(true);
  if (typeof dfAppWinBringToFront === "function") dfAppWinBringToFront(els.win);
  dfNavigateSamePageLink(hash);
}
/* 이 사이트 안의 경로(이름 배열)를 가리키는 링크 열기.
   요청: "폴더 주소가 아닌 파일이면 드라이브 띄우지 마라"(음악 재생 창과 탐색기가 같이 떴음) - 그래서
     - 폴더(루트/툴박스/바탕 화면/휴지통 포함): 탐색기를 띄워 그 폴더로 이동
     - 파일: 탐색기는 건드리지 않고 그 파일만 더블클릭한 것처럼 연다(뷰어/플레이어/에디터 등)
     - 어느 쪽인지 목록에서 못 찾음: notFound()에 맡긴다
   폴더/파일 구분은 부모 폴더 목록에서 찾는다(파일 경로를 폴더로 읽어보려다 실패하는 헛요청을 하지 않는다). */
async function dfOpenInternalPath(p, notFound, onRepoFile) {
  const asFolder = () => dfShowExplorerAtHash("#" + pathToHash(p));
  if (p.length === 0 || (p.length === 1 && (isDfsPath(p) || isToolboxPath(p)))) { asFolder(); return; }
  const name = p[p.length - 1];
  try {
    if (isDfsPath(p)) {
      const node = await dfsNodeAtPath(p).catch(() => null);
      if (!node) { notFound(); return; }
      if (node.type === "folder") asFolder(); else dfsActivate(node);
      return;
    }
    const dir = await loadDir(p.slice(0, -1));
    if ((dir.folders || []).some(f => (f && f.name !== undefined ? f.name : f) === name)) { asFolder(); return; }
    const f = (dir.files || []).find(x => x.name === name);
    if (!f) { notFound(); return; }
    // 툴박스 항목이 자기 자신을 가리키는 주소면(#툴박스/자기이름) 끝없이 되돌아오므로 열지 않는다.
    if (f.toolboxNode) {
      const selfHash = dfSamePageDeepLinkHash(f.toolboxNode.url);
      if (selfHash != null && (hashToPath(selfHash) || []).join("/") === p.join("/")) return;
    }
    // 팝업으로 설정된 항목이 저장소의 평범한 파일을 가리키면, 더블클릭 동작(대개 새 탭 - 전체화면이 풀린다)으로
    // 넘기지 않고 호출한 쪽이 그 파일 주소를 팝업으로 열게 한다.
    if (onRepoFile && !f.dfsNode && !f.toolboxNode) { onRepoFile(p.map(encodeURIComponent).join("/")); return; }
    // content-pane.js가 파일 칸에 만드는 것과 같은 모양 - activate()가 실제 더블클릭과 똑같이 판단한다.
    activate({ name: f.name, size: f.size, crc32: f.crc32, path: p, type: fileTypeFor(f.name), dfsNode: f.dfsNode, toolboxNode: f.toolboxNode });
  } catch (e) {
    notFound();
  }
}
// 팝업 항목을 앱 안 창으로 연다(전체화면 유지용 - 위 activateExternalItem 참고). 프레임 안에 넣는 것을 거부하는
// 사이트는 빈 화면으로 나올 수 있어서, 위쪽 줄에 "새 창으로 열기"(진짜 팝업 - 이때는 브라우저가 전체화면을 푼다)를 둔다.
function dfOpenPopupInApp(item, w, h) {
  let url = item.url;
  try { url = new URL(item.url, location.href).href; } catch (e) {}
  const handle = dfCreateAppWindow({
    title: item.name || url,
    icon: item.iconHtml ? item.iconHtml : item.icon ? `<img src="${escapeHtml(resolveIconSrc(item.icon))}" style="width:16px;height:16px;object-fit:contain;" alt="">` : "\u{1F310}",
    width: w,
    height: h + 70, // 타이틀바 + 주소 줄만큼 더해서 안쪽 화면이 설정한 크기가 되게
    bodyHtml:
      '<div style="flex:0 0 auto;display:flex;gap:8px;align-items:center;padding:3px 8px;font-size:11.5px;background:rgba(0,0,0,.06);">' +
        `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.7;">${escapeHtml(url)}</span>` +
        '<button class="settings-button settings-button-neutral df-frame-out" title="화면이 비어 보이면(프레임을 거부하는 사이트) 진짜 새 창으로 엽니다 - 브라우저가 전체화면을 풉니다">새 창으로 열기</button>' +
      '</div>' +
      '<iframe style="flex:1;min-height:0;width:100%;border:0;background:#fff;" allow="clipboard-read; clipboard-write; fullscreen"></iframe>'
  });
  const frame = handle.bodyEl.querySelector("iframe");
  frame.src = item.frameSrc || url; // frameSrc: 창 안에 실제로 보여줄 주소가 따로 있을 때(raw 보기 - 받아온 내용의 blob:)
  handle.bodyEl.querySelector(".df-frame-out").onclick = () => { handle.close(); activateExternalItem(item, "realpopup"); };
  // 창을 끌거나 크기를 바꾸는 동안 마우스가 iframe 위로 지나가면 움직임이 끊긴다 - 그동안만 iframe이 마우스를 못 받게 한다.
  handle.el.addEventListener("mousedown", (e) => {
    if (e.target === frame) return;
    frame.style.pointerEvents = "none";
    const restore = () => { frame.style.pointerEvents = ""; window.removeEventListener("mouseup", restore, true); };
    window.addEventListener("mouseup", restore, true);
  }, true);
  return handle;
}
function activateExternalItem(item, mode) {
  if (!item || !item.url) return;
  // 요청: 주소가 "#툴박스"처럼 플래그먼트뿐이거나 이 페이지 자신의 주소 + 플래그먼트면 새 탭을 띄우지 않고
  // 지금 탐색기(드라이브) 창에서 그 위치를 연다 - 폴더면 이동, 파일이면 더블클릭한 것처럼 연다
  // (bootstrap.js의 dfApplyHashNavigation). 우클릭 메뉴에서 "새 탭/팝업으로 열기"를 직접 고른 경우(mode)는 그대로 둔다.
  if (!mode) {
    // 버그 리포트: 팝업으로 설정한 항목인데도 전체화면이 풀렸다 - 항목이 저장소 안의 파일을 가리키면 아래의
    // "드라이브에서 열기"가 팝업 설정을 무시하고 그 파일의 더블클릭 동작(새 탭 열기 = 전체화면 해제)으로 넘겨
    // 버리고 있었다. 팝업 항목이면 파일은 항상 팝업으로 연다(팝업은 전체화면을 풀지 않는다). 폴더는 그대로 탐색기.
    const asPopupFile = item.popup ? (fileUrl) => activateExternalItem(Object.assign({}, item, { url: fileUrl }), "popup") : null;
    const hash = dfSamePageDeepLinkHash(item.url);
    if (hash != null) {
      dfOpenInternalPath(hashToPath(hash) || [], () => dfShowExplorerAtHash(hash), asPopupFile);
      return;
    }
    // 저장소 안의 파일/폴더를 상대 경로로 적은 주소(예: "VishwaJai - Eastern Arctic Dubstep.mp3")도 탐색기에 실제로
    // 있는 항목이면 같은 방식으로 연다. 목록에 없으면(색인에 안 실린 파일 등) 예전처럼 새 탭/팝업.
    const repoPath = dfRepoPathFromUrl(item.url);
    if (repoPath) {
      dfOpenInternalPath(repoPath, () => activateExternalItem(item, item.popup ? "popup" : "tab"), item.popup ? () => activateExternalItem(item, "popup") : null);
      return;
    }
  }
  const asPopup = mode ? (mode === "popup" || mode === "realpopup") : !!item.popup;
  if (asPopup) {
    const w = item.width || 900;
    const h = item.height || 640;
    // 요청: "팝업으로 설정되면 절대 전체화면을 해제하지 마라." 이 앱은 팝업을 열 때 전체화면을 풀지 않지만(코드에
    // 그런 호출이 없다), 브라우저가 새 창이 뜨는 순간 스스로 전체화면을 풀어버리고 이건 페이지에서 막을 수 없다.
    // 그래서 전체화면인 동안에는 브라우저 창을 새로 띄우지 않고, 같은 크기의 앱 안 창(iframe)으로 연다 - 브라우저
    // 창이 생기지 않으니 전체화면이 풀릴 일이 없다. 전체화면이 아닐 때는 예전처럼 진짜 팝업 창으로 연다.
    if (dfIsFullscreen() && mode !== "realpopup") { dfOpenPopupInApp(item, w, h); return; }
    const left = Math.round(((window.screen.width || 1280) - w) / 2);
    const top = Math.round(((window.screen.height || 800) - h) / 2);
    dfOpenNewTab(item.url, "_blank", `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
  } else {
    dfOpenNewTab(item.url, "_blank", "noopener,noreferrer");
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
    // 요청 #137: 시작 메뉴 항목(및 서브메뉴 안의 항목)을 우클릭하면 바로 메뉴 메이커의 메뉴 탭으로
    // 연결한다 - 이 항목들이 곧 menu_set.json의 "start" 목록이므로, 트레이 아이콘 우클릭과 같은 맥락.
    row.oncontextmenu = (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: "메뉴 메이커에서 편집", action: () => dfsOpenMenuMakerInWindow({ initialTab: "menu" }) }
      ]);
    };
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
    // 요청 #131: 트레이 아이콘을 우클릭하면, 그 항목에 저장된 기본값과 무관하게 "팝업으로 열기"
    // (설정된 크기)나 "새 탭으로 열기" 중 그 자리에서 골라 한 번만 강제로 열 수 있다.
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      // 요청 #167: 트레이 아이콘 영역은 작업표시줄(#taskbar)의 자식이라, stopPropagation을 안 하면
      // 이 클릭이 그대로 위로 버블돼서 새로 추가된 작업표시줄 자체 우클릭 메뉴(window-chrome.js)까지
      // 같이 열려고 해서 방금 연 이 메뉴를 곧바로 덮어써버린다.
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, [
        { label: "팝업으로 열기", action: () => activateExternalItem(item, "popup") },
        { label: "새 탭으로 열기", action: () => activateExternalItem(item, "newtab") },
        // 요청 #137: 트레이 우클릭도 시작 메뉴 항목과 마찬가지로 메뉴 메이커의 메뉴 탭으로 바로 연결.
        { label: "메뉴 메이커에서 편집", action: () => dfsOpenMenuMakerInWindow({ initialTab: "menu" }) }
      ]);
    };
    els.trayIcons.appendChild(btn);
  });
}

