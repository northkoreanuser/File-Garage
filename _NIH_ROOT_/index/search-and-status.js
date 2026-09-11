/* ============ 검색 — 모든 하위 pages.json을 끝까지 읽어서 전체에서 찾는다 ============ */
// 검색 범위(scope)+시작 경로(root)별로 인덱스를 캐싱해둔다. 개별 폴더 자체는 loadDir가 이미
// dirCache/localStorage로 캐싱하므로, 여기서는 그냥 재귀 순회 결과(Promise)만 재사용한다.
const indexPromiseCache = new Map();
function ensureIndexFor(rootPath) {
  const key = rootPath.join("/");
  if (!indexPromiseCache.has(key)) indexPromiseCache.set(key, crawlAll(rootPath));
  return indexPromiseCache.get(key);
}
async function crawlAll(pathArr) {
  const entry = await loadDir(pathArr);
  let results = [];
  entry.folders.forEach(name => results.push({ name, path: [...pathArr, name], type: "folder" }));
  entry.files.forEach(f => results.push({ name: f.name, size: f.size, path: [...pathArr, f.name], type: isHtml(f.name) ? "html" : "file" }));
  for (const name of entry.folders) {
    const sub = await crawlAll([...pathArr, name]);
    results = results.concat(sub);
  }
  return results;
}
let searchDebounce = null;
els.searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(runSearch, 200);
});
async function runSearch() {
  const raw = els.searchInput.value.trim();
  const q = raw.toLowerCase();
  if (!q) { await renderContentPane(); return; }
  const scope = settings.searchScope === "all" ? "all" : "subtree";
  const rootPath = scope === "all" ? [] : currentPath;
  els.contentPane.innerHTML = `<div class="status-msg">검색 중... (${scope === "all" ? "전체 저장소" : "현재 폴더의 하위 폴더"}를 읽는 중)</div>`;
  let all;
  try {
    all = await ensureIndexFor(rootPath);
  } catch (err) {
    els.contentPane.innerHTML = `<div class="empty-msg">검색 중 오류: ${escapeHtml(err.message)}</div>`;
    return;
  }
  if (els.searchInput.value.trim().toLowerCase() !== q) return; // 그 사이 검색어가 바뀌었으면 무시
  const matches = all.filter(it => it.name.toLowerCase().includes(q));
  currentItems = matches;
  currentOpts = {
    flat: true,
    emptyText: "일치하는 항목이 없습니다.",
    relativeTo: settings.searchRelativePath ? currentPath : null
  };
  currentHeading = `"${raw}" 검색 결과 (${matches.length}개)`;
  selected = null;
  multiSelected.clear();
  paintContentPane();
  updateStatus();
}
/* ============ 환경설정: 전체 저장소를 미리 로컬 스토리지에 캐싱 ============ */
async function preloadAllToCache() {
  showToast("전체 폴더를 미리 불러오는 중...");
  let count = 0;
  async function walk(pathArr) {
    const entry = await loadDir(pathArr);
    count++;
    for (const name of entry.folders) {
      await walk([...pathArr, name]);
    }
  }
  try {
    await walk([]);
    showToast(`전체 미리 불러오기 완료 (${count}개 폴더)`);
  } catch (e) {
    showToast(`미리 불러오기 중 오류: ${e.message}`, { kind: "warn" });
  }
}

/* ============ 주소표시줄(브레드크럼) ============ */
function renderBreadcrumb() {
  // 탐색기 상단 타이틀바 = 현재 폴더 이름 (윈도우 탐색기가 이렇게 동작함). 루트면 저장소 이름.
  els.winTitle.textContent = currentPath.length ? currentPath[currentPath.length - 1] : (repoName || "Repo Index");
  els.breadcrumb.innerHTML = "";
  const rootCrumb = document.createElement("span");
  rootCrumb.className = "crumb";
  rootCrumb.textContent = repoName || "루트";
  rootCrumb.onclick = () => navigate([]);
  els.breadcrumb.appendChild(rootCrumb);

  currentPath.forEach((name, i) => {
    els.breadcrumb.insertAdjacentHTML("beforeend", `<span class="crumb-sep">›</span>`);
    const c = document.createElement("span");
    c.className = "crumb";
    c.textContent = name;
    const p = currentPath.slice(0, i + 1);
    c.onclick = () => navigate(p);
    els.breadcrumb.appendChild(c);
  });
}

/* ============ 상태표시줄 / 툴바 상태 ============ */
function updateStatus() {
  let text = `${currentItems.length}개 항목`;
  if (multiSelected.size > 1) text += `  |  ${multiSelected.size}개 선택됨`;
  else if (selected) text += `  |  선택됨: ${selected.name}`;
  els.statusText.textContent = text;

  els.btnBack.disabled = historyIndex <= 0;
  els.btnForward.disabled = historyIndex >= history.length - 1;
  els.btnUp.disabled = currentPath.length === 0;
}

/* ============ 시계 (12시간제 + 오전/오후 + 초 표시) ============
   예: "오후 11:55:28" / "2026-09-07 (월요일)" */
function updateClock() {
  const now = new Date();
  const h24 = now.getHours();
  const ampm = h24 < 12 ? "오전" : "오후";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const weekday = now.toLocaleDateString("ko-KR", { weekday: "long" });
  els.clock.innerHTML = `${ampm} ${h12}:${mm}:${ss}<br>${yyyy}-${mo}-${dd} (${weekday})`;
}
updateClock();
setInterval(updateClock, 1000);

/* ============ 날씨 (Open-Meteo, API 키 불필요) ============
   브라우저 로케일로 국가를 추정해서(위치 권한 요청 없이) 그 나라 대표 도시 좌표로 조회한다.
   시작 바 시계 옆에 아이콘+기온만 간단히 표시하고, 누르면 자세한 정보를 창으로 띄운다. */
const COUNTRY_LATLON = {
  KR: { name: "대한민국", city: "서울", lat: 37.5665, lon: 126.9780 },
  US: { name: "미국", city: "뉴욕", lat: 40.7128, lon: -74.0060 },
  JP: { name: "일본", city: "도쿄", lat: 35.6762, lon: 139.6503 },
  CN: { name: "중국", city: "베이징", lat: 39.9042, lon: 116.4074 },
  GB: { name: "영국", city: "런던", lat: 51.5074, lon: -0.1278 },
  DE: { name: "독일", city: "베를린", lat: 52.5200, lon: 13.4050 },
  FR: { name: "프랑스", city: "파리", lat: 48.8566, lon: 2.3522 },
  CA: { name: "캐나다", city: "토론토", lat: 43.6532, lon: -79.3832 },
  AU: { name: "호주", city: "시드니", lat: -33.8688, lon: 151.2093 },
  IN: { name: "인도", city: "뉴델리", lat: 28.6139, lon: 77.2090 },
};
const WMO_WEATHER = {
  0: { icon: "☀️", label: "맑음" }, 1: { icon: "🌤️", label: "대체로 맑음" },
  2: { icon: "⛅", label: "부분적으로 흐림" }, 3: { icon: "☁️", label: "흐림" },
  45: { icon: "🌫️", label: "안개" }, 48: { icon: "🌫️", label: "서리 안개" },
  51: { icon: "🌦️", label: "약한 이슬비" }, 53: { icon: "🌦️", label: "이슬비" }, 55: { icon: "🌦️", label: "강한 이슬비" },
  56: { icon: "🌧️", label: "약한 어는 이슬비" }, 57: { icon: "🌧️", label: "어는 이슬비" },
  61: { icon: "🌧️", label: "약한 비" }, 63: { icon: "🌧️", label: "비" }, 65: { icon: "🌧️", label: "강한 비" },
  66: { icon: "🌧️", label: "약한 어는 비" }, 67: { icon: "🌧️", label: "어는 비" },
  71: { icon: "🌨️", label: "약한 눈" }, 73: { icon: "🌨️", label: "눈" }, 75: { icon: "🌨️", label: "강한 눈" }, 77: { icon: "🌨️", label: "싸락눈" },
  80: { icon: "🌦️", label: "약한 소나기" }, 81: { icon: "🌦️", label: "소나기" }, 82: { icon: "🌧️", label: "강한 소나기" },
  85: { icon: "🌨️", label: "약한 눈 소나기" }, 86: { icon: "🌨️", label: "강한 눈 소나기" },
  95: { icon: "⛈️", label: "뇌우" }, 96: { icon: "⛈️", label: "우박을 동반한 뇌우" }, 99: { icon: "⛈️", label: "강한 우박을 동반한 뇌우" },
};
function weatherInfoFor(code) { return WMO_WEATHER[code] || { icon: "🌡️", label: "알 수 없음" }; }
function guessLocationInfo() {
  let region = null;
  try {
    region = new Intl.Locale(navigator.language).maximize().region;
  } catch (e) { /* 무시 */ }
  if (!region) {
    const parts = (navigator.language || "").split("-");
    region = parts.length > 1 ? parts[1].toUpperCase() : null;
  }
  return COUNTRY_LATLON[region] || COUNTRY_LATLON.KR;
}
let weatherData = null;
let weatherLoc = null;
function renderWeatherWidget() {
  if (!els.weatherWidget) return;
  if (!weatherData) { els.weatherWidget.style.display = "none"; els.weatherWidget.innerHTML = ""; return; }
  const info = weatherInfoFor(weatherData.weather_code);
  const temp = Math.round(weatherData.temperature_2m);
  els.weatherWidget.style.display = "flex";
  els.weatherWidget.innerHTML = `<span class="wicon">${info.icon}</span><span>${temp}°</span>`;
}
async function loadWeather() {
  weatherLoc = guessLocationInfo();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLoc.lat}&longitude=${weatherLoc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    weatherData = data.current || null;
  } catch (e) {
    weatherData = null;
  }
  renderWeatherWidget();
}
function closeWeatherDetail() {
  const overlay = document.getElementById("weatherOverlay");
  if (overlay) overlay.remove();
}
function showWeatherDetail() {
  if (!weatherData || !weatherLoc) return;
  closeWeatherDetail();
  const info = weatherInfoFor(weatherData.weather_code);
  const overlay = document.createElement("div");
  overlay.id = "weatherOverlay";
  overlay.className = "settings-overlay open";
  overlay.innerHTML = `
    <div class="settings-panel" style="width:300px;">
      <div class="settings-titlebar">
        <span>날씨</span>
        <button class="settings-close" id="weatherCloseBtn">닫기</button>
      </div>
      <div class="settings-body">
        <div class="weather-place">${escapeHtml(weatherLoc.name)} · ${escapeHtml(weatherLoc.city)}</div>
        <div class="weather-big">
          <span class="wicon-big">${info.icon}</span>
          <span class="temp-big">${Math.round(weatherData.temperature_2m)}°C</span>
        </div>
        <div class="weather-desc">${info.label}</div>
        <div class="settings-divider"></div>
        <div class="weather-detail-row">체감 온도: ${Math.round(weatherData.apparent_temperature)}°C</div>
        <div class="weather-detail-row">습도: ${weatherData.relative_humidity_2m}%</div>
        <div class="weather-detail-row">풍속: ${weatherData.wind_speed_10m} km/h</div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("weatherCloseBtn").onclick = closeWeatherDetail;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeWeatherDetail(); });
}
if (els.weatherWidget) els.weatherWidget.onclick = showWeatherDetail;
loadWeather();
setInterval(loadWeather, 15 * 60 * 1000); // 15분마다 갱신

/* ============ 배터리(트레이, 날씨 왼쪽) ============
   navigator.getBattery()는 Battery Status API - 노트북처럼 배터리가 있는 기기의 브라우저에서만
   값을 준다. 지원하지 않는 브라우저(사파리 등)나 권한이 없는 환경에서는 조용히 숨긴다(에러 없이). */
function renderBatteryWidget(level, charging) {
  if (!els.batteryWidget) return;
  if (level == null) { els.batteryWidget.style.display = "none"; els.batteryWidget.innerHTML = ""; return; }
  const pct = Math.round(level * 100);
  const icon = charging ? "🔌" : (pct <= 20 ? "🪫" : "🔋");
  els.batteryWidget.style.display = "flex";
  els.batteryWidget.title = `배터리 ${pct}%${charging ? " (충전 중)" : ""}`;
  els.batteryWidget.innerHTML = `<span class="bicon">${icon}</span><span>${pct}%</span>`;
}
async function loadBattery() {
  if (!navigator.getBattery) { renderBatteryWidget(null); return; }
  try {
    const battery = await navigator.getBattery();
    const update = () => renderBatteryWidget(battery.level, battery.charging);
    update();
    battery.addEventListener("levelchange", update);
    battery.addEventListener("chargingchange", update);
  } catch (e) {
    renderBatteryWidget(null);
  }
}
loadBattery();

