/* ============ 주소창(#) 변경 -> 실제 탐색 반영 ============
   예전엔 main() 안의 hashchange 리스너에 인라인으로만 있었는데, 버그 리포트("바탕화면의 레포
   바로가기를 더블클릭하면 새 탭이 열리고, 그마저도 폴더/파일이 제대로 안 열림")를 고치면서 이
   로직을 재사용해야 했다 - 바로가기가 가리키는 주소가 사실 이 페이지 자기 자신을 가리키는
   딥링크(dfsCreateDesktopShortcutFromRepoItem 등, state.js의 dfSamePageDeepLinkHash 참고)라면,
   새 탭을 여는 대신 지금 이 탭의 location.hash를 그대로 바꿔서 이 리스너가 처리하게 하면 된다
   (실제 탐색기 창처럼 동작 - 새 창이 뜨지 않고, 이미 초기화된 상태를 그대로 재사용하므로 새
   탭에서 초기화 타이밍 문제로 폴더/파일이 안 열리던 문제도 함께 해결된다). 해시가 지금과 완전히
   같을 때는(예: 같은 바로가기를 다시 더블클릭) hashchange 이벤트 자체가 안 뜨므로, state.js의
   dfNavigateSamePageLink가 그 경우엔 이 함수를 직접 불러 재적용한다. */
/* ============ 해시/기억된 경로 -> 실제 폴더 이동 "또는" 파일 활성화 ============
   버그 리포트: "파일을 가리키는 바로가기(예: 레포 이미지 파일)를 더블클릭하면 그 파일이 있는
   폴더까지만 이동하고, 정작 그 파일 자체는 열리지 않는다." 원인은 resolveInitialPath()가 애초에
   "존재하는 폴더"만 찾는 함수였다는 데 있다 - loadDir()가 실패할 때마다(파일 이름은 폴더로서
   조회하면 항상 실패하므로) 마지막 조각을 하나씩 잘라내며 재시도하다가 결국 파일의 부모 폴더에서
   멈춰버리고, 파일 자체를 "여는" 시도는 아예 없었다. 여기서는 경로의 마지막 조각이 실제로는
   폴더가 아니라 파일/바로가기인지 먼저 확인해서, 맞다면 부모 폴더로 이동한 뒤 그 파일이 실제로
   더블클릭됐을 때와 완전히 같은 방식으로 열리게 한다 - 바탕화면 경로는 dfsActivate(node)(확장자별
   설정 포함, 위 dfsBuildIconMenuItems/dfsDesktopFileMenuItems 수정과 동일한 이유로 여기선 "더블
   클릭"과 같은 취급이라 dfsActivate가 맞다), 실제 저장소 경로는 keyboard-and-activate.js의
   activate()(에디터/미디어 뷰어/확장자별 설정 등 실제 더블클릭과 완전히 동일한 경로를 탄다). */
async function dfResolvePathAndActivate(p) {
  if (!p || p.length === 0) { await navigate([]); return; }
  if (isDfsPath(p)) {
    if (p.length >= 2) {
      const node = await dfsNodeAtPath(p).catch(() => null);
      if (node) {
        if (node.type === "folder") { await navigate(p); return; }
        // 파일/바로가기: 부모 폴더로 이동해서 맥락을 보여준 뒤, 더블클릭과 똑같이 활성화한다.
        await navigate(p.slice(0, -1));
        dfsActivate(node);
        return;
      }
    }
    // 못 찾았으면(삭제/이름 변경 등) 예전처럼 실제로 존재하는 조상 폴더까지만 이동한다.
    await navigate(await resolveInitialPath(p));
    return;
  }
  // 실제 저장소 경로: 우선 폴더로서 존재하는지 시도한다(대부분의 정상적인 폴더 이동 케이스).
  try {
    await loadDir(p);
    await navigate(p);
    return;
  } catch (e) { /* 폴더가 아니거나 없으면 아래에서 "파일"인지 확인한다 */ }
  const parentPath = p.slice(0, -1);
  const name = p[p.length - 1];
  try {
    const dir = await loadDir(parentPath);
    const f = (dir.files || []).find(x => x.name === name);
    if (f) {
      await navigate(parentPath);
      // content-pane.js가 실제 파일 행에 만드는 것과 같은 모양의 it 객체 - activate()가 그대로
      // 더블클릭 때와 동일한 판단(에디터/뷰어/확장자별 설정)을 내리게 한다.
      activate({ name: f.name, size: f.size, crc32: f.crc32, path: p, type: fileTypeFor(f.name), dfsNode: f.dfsNode });
      return;
    }
  } catch (e) { /* 부모 폴더까지 없으면 아래 최종 대체 로직으로 넘어간다 */ }
  // 파일도 못 찾았으면(삭제/이름 변경 등) 예전처럼 실제로 존재하는 조상 폴더까지만 이동한다.
  await navigate(await resolveInitialPath(p));
}
function dfApplyHashNavigation() {
  const hasHash = !!location.hash && location.hash !== "#";
  if (hasHash) {
    // 링크/뒤로가기로 플래그먼트가 생기면(공유 링크 등) 창이 닫혀 있었어도 함께 연다.
    if (els.win.classList.contains("closed")) {
      els.win.classList.remove("closed");
      els.taskbarApp.classList.add("active");
      persistWindowOpen(true);
    }
    // 해시에 적힌 트리 열림/닫힘 상태를 그대로 따른다(없으면 열림이 디폴트).
    if (hashToNavOpen(location.hash)) { if (!isNavPaneOpen()) els.navPane.classList.add("open"); }
    else { if (isNavPaneOpen()) els.navPane.classList.remove("open"); }
  }
  const p = hashToPath(location.hash) || [];
  if (p.join("/") !== currentPath.join("/")) {
    // 해시가 바뀌어서(뒤로/앞으로 가기, 바로가기 더블클릭 등) 새 경로로 점프하는 것 - 폴더면
    // navigate()가 트리도 실시간으로 드러내고, 파일이면(위 dfResolvePathAndActivate 참고) 부모
    // 폴더로 이동한 뒤 실제 더블클릭과 같은 방식으로 열어준다.
    dfResolvePathAndActivate(p);
  }
}

/* ============ 메인 ============ */
async function main() {
  // 탐색기 창의 초기 열림/닫힘 상태(사용자 지시 - "진짜 윈도우 바이브"): 최초 방문이거나 지난번에
  // 명시적으로 닫아뒀으면(btnClose) 창을 아예 띄우지 않는다. 지난번에 "켠 채로" 새로고침/재방문한
  // 경우(편의성)에만 열린 상태 그대로 + 위치/트리 펼침 기록을 복원한다. 주소창에 이미 경로
  // 플래그먼트가 있으면(공유된 링크로 들어온 경우 등) 그 의도를 존중해서 무조건 연 상태로 시작한다.
  const { owner, repo } = getOwnerRepo();
  repoName = repo || "Repo Index";
  // repoName을 먼저 정해야 windowOpenKey()/lastPathKey() 등이 올바른 localStorage 키를 가리킨다
  // (repoName이 아직 빈 문자열일 때 wasWindowOpenLastTime()을 부르면 엉뚱한 키를 읽게 됨).
  const hashHasPath = !!location.hash && location.hash !== "#";
  const shouldStartOpen = hashHasPath || wasWindowOpenLastTime();
  document.title = repoName;
  els.winTitle.textContent = repoName;
  if (owner && repo) {
    els.repoLink.innerHTML = `<a href="https://github.com/${owner}/${repo}" target="_blank" rel="noopener noreferrer">${owner}/${repo}</a>`;
  }
  settings = loadSettings();
  // 요청: 부팅음 - 자동재생이 막혀 있으니 로드 후 첫 클릭/터치/키 입력에 딱 한 번만 재생한다.
  // sound_set.json이 아직 비동기로 로딩 중이어도 상관없다(실제 재생 시점엔 이미 도착해 있는 게
  // 보통이고, 설령 안 왔어도 그때 soundSetConfig에 값이 없으면 그냥 조용히 아무 일도 안 한다).
  dfArmBootSoundOnFirstInteraction();
  dfSetupFullscreenAutoManagement();
  applyTheme(settings.theme);
  applySearchPlaceholder();
  applyAeroToDocument();
  setupSettingsPanel();
  setupStartMenu(owner);

  if (shouldStartOpen) {
    els.win.classList.remove("closed");
    els.taskbarApp.classList.add("active");
    persistWindowOpen(true);

    // 트리 펼침 상태 복원: 주소창(#...|tree=...)에 있으면 그걸 우선, 없으면 로컬 스토리지에 기억된 걸 사용
    const hashExpanded = hashToExpandedSet(location.hash);
    expanded = (hashExpanded && hashExpanded.size) ? hashExpanded : loadExpandedFromStorage();
    // 복원된 펼침 상태에는 현재 경로의 조상이 아닌 가지(예: 이전에 수동으로 펼쳐뒀던 다른 폴더)도
    // 있을 수 있다 - navigate()의 실시간 reveal은 "현재 경로"의 조상만 미리 읽어오므로, 그 외의
    // 가지들은 여기서 한 번에 미리 읽어와야 트리가 "불러오는 중..."에 계속 머물지 않는다.
    await Promise.all([...expanded].map(key => loadDir(key.split("/").filter(Boolean)).catch(() => {})));
    // 바탕화면 트리 행도 저장소 루트처럼 화살표 없이 바로 자기 자신의 자식들을 보여주므로(루트와
    // 같은 방식 - buildTreeDom 참고), 부팅 시점에 한 번 미리 읽어 dirCache를 채워둔다. 휴지통은
    // 트리에서 화살표로 펼치는 하위 트리는 없지만(요청 #113 - 단순 행 하나), 내용창에 들어갔을 때
    // 곧바로 보여주려면 마찬가지로 미리 읽어두는 게 좋다.
    if (dfsDb) await Promise.all([loadDir([DESKTOP_TREE_NAME]).catch(() => {}), loadDir([RECYCLEBIN_TREE_NAME]).catch(() => {})]);

    // 트리 칸(navPane) 기본 열림(사용자 지시 - "탐색기 열면 기본으로 트리 칸 열려있게" / "# 뒤에
    // 기록해둔다, 없으면 온이 디폴트") - 해시에 명시적으로 |nav=0이 있을 때만 닫힌 채로 시작한다.
    if (hashToNavOpen(location.hash)) els.navPane.classList.add("open");
  }
  // shouldStartOpen이 false면 #win은 HTML 기본값(class="window closed")대로 닫힌 채 시작한다 -
  // 진짜 리포 pages.json도 이 시점엔 아예 안 읽는다(창을 열 때 taskbarApp.onclick이 navigate([])로
  // 그때 가서 새로 읽음).

  renderNavPane();
  renderBreadcrumb();

  // 페이지 로드시 로컬 헬퍼가 켜져 있는지 조용히 한 번 확인해둔다 (다운로드 안내 등 아무것도 띄우지 않음 -
  // 그냥 나중에 열기/다운로드를 누를 때 바로 쓸 수 있도록 미리 캐싱만 해두는 것).
  // 동시에, 실수로 두 번 실행됐을 수 있는 중복 웹훅도 감지해서 가장 낮은 포트만 남기고 정리한다.
  // 요청 #152: 이 검사 자체가 브라우저의 로컬 네트워크 접근 권한 팝업을 띄울 수 있어서 기본은
  // 꺼져 있다(환경설정의 "페이지를 열 때 로컬 웹훅 자동 확인") - 웹훅으로 실제 다운로드가 한 번이라도
  // 성공하면 그 설정이 자동으로 켜져서, 그다음부터는 이 검사도 자동으로 실행된다.
  if (settings.checkHelperOnLoad) initHelperPortAndCollapseDuplicates();

  window.addEventListener("hashchange", dfApplyHashNavigation);

  // menu_set.json/icon_set.json/sound_set.json(요청 #122로 메뉴/아이콘/사운드 3개로 분리)은
  // 있으면 반영, 없거나 잘못돼도 조용히 무시(선택 기능). 전부 _NIH_ROOT_/index/ 안에 있다
  // (트리/색인에는 안 보이지만 GitHub Pages는 그대로 서빙 - .nojekyll 필요, index.html 주석 참고).
  loadAllMenuMakerConfigs().then(cfg => {
    renderAppList(cfg.menu.start, els.startApps);
    renderTrayIcons(cfg.menu.tray);
    // 폴더/확장자별 커스텀 아이콘 + 저장소 루트/휴지통 아이콘 반영. 이미 그려진 트리/바탕화면/
    // 내용창이 있으면(부팅 시점 타이밍에 따라) 새 아이콘 설정으로 다시 그린다.
    // 요청 #121: 기본 icon_set.json과 현재 스킨의 icon_set.json(있다면)을 병합해서 적용한다
    // (menu_set.json/sound_set.json은 스킨에 있어도 무시하고 항상 기본 것만 쓴다).
    applyCustomIconConfig(mergeIconSetConfigs(cfg.icons, cfg.skinIcons, settings.skinIconPriority));
    // 상황별 알림음(sound_set.json) 반영 - state.js의 dfsPlaySound가 이 설정을 참조한다.
    applySoundSetConfig(mergeSoundSetConfigs(cfg.sounds, cfg.skinSounds, settings.skinSoundPriority));
    // 요청 #143: 확장자별 더블클릭 개별 설정(extension_run_set.json) 반영 - keyboard-and-activate.js의
    // activate()가 extensionRunActionFor()로 이 설정을 참조한다.
    applyExtensionRunSetConfig(cfg.extRun);
    // 커스텀 아이콘 설정이 이 시점(비동기)에야 도착하므로, 이미 그려져 있던 타이틀바 아이콘도
    // 다시 계산해야 한다(부팅 직후엔 아직 customIconConfig가 비어 있어 기본 아이콘으로 그려졌었음).
    updateWinTitlebarIcon();
    renderSettingsMenuRowIcon();
    renderNavPane();
    if (els.win && !els.win.classList.contains("closed")) renderContentPane();
    if (dfsDb) dfsRenderDesktop();
  });

  if (shouldStartOpen) {
    // 시작 경로: 주소창 플래그먼트 우선, 없으면 로컬 스토리지에 기억된 경로 사용
    let initialPath = hashToPath(location.hash);
    if (!initialPath) {
      try {
        const remembered = JSON.parse(localStorage.getItem(lastPathKey()) || "null");
        if (Array.isArray(remembered)) initialPath = remembered;
      } catch (e) { /* 무시 */ }
    }
    // 공유된 딥링크가 파일을 가리키는 경우에도(위 dfResolvePathAndActivate 참고) 폴더 이동으로
    // 뭉개지 않고 실제로 그 파일을 열어준다.
    await dfResolvePathAndActivate(initialPath || []);
  }

  // 바탕화면 가상 파일시스템(dexie) 아이콘 렌더링 - 진짜 탐색기 창(#win)과는 완전히 독립적이다.
  // 요청 #167: 트리의 휴지통 행은 이 함수가 계산해두는 dfsRecycleBinHasItems 캐시를 읽어서 비었는지/
  // 찬 아이콘인지 정하는데, 위의 renderNavPane()은 이보다 먼저 실행돼서 아직 기본값(false)만 보고
  // 그렸다 - 부팅 시점에 휴지통이 이미 차 있었을 수 있으므로, 여기서 다 읽고 나면 트리를 한 번 더
  // 그려서 정확한 상태로 바로잡는다.
  // dfsRenderDesktop()이 dfsRecycleBinHasItems를 다시 계산하므로, 지금 휴지통을 보고 있었다면
  // 타이틀바 아이콘(비어있음/참 두 상태)도 함께 다시 맞춰준다.
  dfsRenderDesktop().then(() => { if (dfsDb) { renderNavPane(); updateWinTitlebarIcon(); } }).catch(e => console.error("바탕화면 로드 오류:", e));
}
