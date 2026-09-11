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
    // 같은 방식 - buildTreeDom 참고), 부팅 시점에 한 번 미리 읽어 dirCache를 채워둔다.
    if (dfsDb) await loadDir([DESKTOP_TREE_NAME]).catch(() => {});

    els.navPane.classList.add("open");
  }
  // shouldStartOpen이 false면 #win은 HTML 기본값(class="window closed")대로 닫힌 채 시작한다 -
  // 진짜 리포 pages.json도 이 시점엔 아예 안 읽는다(창을 열 때 taskbarApp.onclick이 navigate([])로
  // 그때 가서 새로 읽음).

  renderNavPane();
  renderBreadcrumb();

  // 페이지 로드시 로컬 헬퍼가 켜져 있는지 조용히 한 번 확인해둔다 (다운로드 안내 등 아무것도 띄우지 않음 -
  // 그냥 나중에 열기/다운로드를 누를 때 바로 쓸 수 있도록 미리 캐싱만 해두는 것).
  // 동시에, 실수로 두 번 실행됐을 수 있는 중복 웹훅도 감지해서 가장 낮은 포트만 남기고 정리한다.
  initHelperPortAndCollapseDuplicates();

  window.addEventListener("hashchange", () => {
    const hasHash = !!location.hash && location.hash !== "#";
    if (hasHash) {
      // 링크/뒤로가기로 플래그먼트가 생기면(공유 링크 등) 창이 닫혀 있었어도 함께 연다.
      if (els.win.classList.contains("closed")) {
        els.win.classList.remove("closed");
        els.taskbarApp.classList.add("active");
        persistWindowOpen(true);
      }
      if (!isNavPaneOpen()) els.navPane.classList.add("open");
    }
    const p = hashToPath(location.hash) || [];
    if (p.join("/") !== currentPath.join("/")) {
      // 해시가 바뀌어서(뒤로/앞으로 가기 등) 새 경로로 점프하는 것 - navigate()가 트리도 실시간으로 드러낸다.
      resolveInitialPath(p).then(rp => navigate(rp));
    }
  });

  // menu.json(시작 메뉴 + 트레이 병합)은 있으면 반영, 없거나 잘못돼도 조용히 무시 (선택 기능).
  // _NIH_ROOT_/index/menu.json 하나에 있다(트리/색인에는 안 보이지만 GitHub Pages는 그대로 서빙 -
  // .nojekyll 필요, index.html 주석 참고). 예전의 두 파일(start.json/tray.json)은 더 이상 안 읽는다.
  loadMenuConfig().then(cfg => {
    if (!cfg) return;
    renderAppList(cfg.start, els.startApps);
    renderTrayIcons(cfg.tray);
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
    const resolved = await resolveInitialPath(initialPath || []);
    await navigate(resolved);
  }

  // 바탕화면 가상 파일시스템(dexie) 아이콘 렌더링 - 진짜 탐색기 창(#win)과는 완전히 독립적이다.
  dfsRenderDesktop().catch(e => console.error("바탕화면 로드 오류:", e));
}
