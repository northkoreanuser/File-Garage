// ══════════════════ 화면 맞춤: 700~1100px은 데스크톱 배치를 축소 ══════════════════
const DESIGN_W = 1100;
function fitScreen() { const w = document.documentElement.clientWidth, z = (w >= 700 && w < DESIGN_W) ? w / DESIGN_W : 0; $('#app').style.zoom = z ? z.toFixed(3) : ''; $('#app').style.minHeight = z ? `calc(100vh / ${z.toFixed(3)})` : ''; }
window.addEventListener('resize', fitScreen); fitScreen();

// ══════════════════ 초기화 ══════════════════
buildCylinder(); applyModeUI(); applyMusicUI(); renderLB();
if (state.name && !nameOk(state.name)) forceRename();
else if (state.name) { $('#wName').textContent = state.name; welcome.classList.remove('hide'); }
else openContract();

