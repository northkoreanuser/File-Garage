// ══════════════════ 암시장 ══════════════════
const LIFE_EVERY = 10;
const lifeAllow = () => Math.floor(wins / LIFE_EVERY) - lifeBought;
const SHOP = [
  { id: 'vodka', ic: '🍸', name: '보드카 한 잔', price: 300,
    desc: () => timerOn() ? '이번 판 시간 제한 +5초, 손떨림 1단계 감소.' : '<em>시간 제한이 꺼져 있어 살 수 없다.</em>',
    can: () => roundLive() && !state.vodka && timerOn(), owned: () => state.vodka,
    buy() { state.vodka = true; A.glass(); setMsg('보드카 한 잔. 손이 조금 진정된다.', 'info'); log('암시장 — 보드카 한 잔.', 'sys'); } },
  { id: 'spin', ic: '×2', name: '두 번째 스핀권', price: 10000,
    desc: () => '이번 판 스핀을 한 번 더 쓸 수 있다.',
    can: () => roundLive() && !state.spinTicket, owned: () => state.spinTicket,
    buy() { state.spinTicket = true; const h = humanS(); if (h.used.spin) h.used.spin = false; else h.spinExtra = 1; A.coin(3); setMsg('딜러가 스핀권 한 장을 슬쩍 건넨다.', 'info'); log('암시장 — 두 번째 스핀권.', 'sys'); } },
  { id: 'life', ic: '♥', name: '목숨 추가 ×3', price: 20000,
    desc: () => state.mode !== 'tour' ? '<em>토너먼트 전용.</em>' : `토너먼트 목숨 <b>+3</b>. 우승하면 기본 3개를 뺀 남은 목숨을 3개 단위로 환불. ${LIFE_EVERY}승마다 1회 구매 가능 — 남은 횟수 <b>${Math.max(0, lifeAllow())}</b> (승리 ${wins})`,
    can: () => state.started && state.mode === 'tour' && lifeAllow() > 0 && !state.over, owned: () => false,
    buy() { lifeBought++; S.set('lifeBought', lifeBought); tour.lives += 3; S.set('tour', tour); const h = humanS(); if (h) h.injured = Math.max(0, 3 - tour.lives); A.coin(5); setMsg('검은 봉투가 건네진다. 목숨이 셋 늘었다.', 'info'); log('암시장 — 목숨 +3.', 'sys'); } },
];
const humanS = () => state.seats.find(s => s && s.kind === 'human');
const roundLive = () => state.started && state.mode !== 'auto' && !state.busyLoad && !state.over && !!humanS();
function renderShop() {
  $('#shopBank').textContent = won(money.v);
  $('#shopList').innerHTML = SHOP.map(it => { const own = it.owned(), ok = it.can() && money.v >= it.price;
    return `<div class="si ${own ? 'owned' : ''}"><div class="ic">${it.ic}</div><div class="tx"><div class="nm">${it.name}</div><div class="ds">${it.desc()}</div></div>
      <button data-buy="${it.id}" ${ok ? '' : 'disabled'}>${own ? '사용 중' : won(it.price)}</button></div>`; }).join('');
}
$('#shopBtn').addEventListener('click', e => { e.stopPropagation(); renderShop(); $('#shopPop').classList.toggle('open'); $('#setPop').classList.remove('open'); });
$('#shopList').addEventListener('click', e => {
  const id = e.target.dataset.buy; if (!id) return; const it = SHOP.find(x => x.id === id);
  if (!it.can() || money.v < it.price) return;
  money.v -= it.price; saveMoney(); it.buy(); if (state.mode === 'tour') { tour.shopSpent = (tour.shopSpent || 0) + it.price; if (id === 'life') tour.lifeBuys = (tour.lifeBuys || 0) + 1; S.set('tour', tour); } save(); renderAll(); // 암시장 대금은 포기 몰수 때 손실로 안 침
});

