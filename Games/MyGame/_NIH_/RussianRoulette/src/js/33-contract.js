// ══════════════════ 계약서: 타자기 ══════════════════
// 계약서는 빈 종이에서 시작한다. 머리글(계약서 №)·제목·설명·조항·'서명'·안내문·버튼 글자까지 전부 타자기로 한 자모씩 찍힌다.
// 한글은 자모가 조합되는 과정이 보이는 속도. 서명칸 밑줄·버튼은 자기 차례가 오면 나타난다. 종이를 누르면(입력칸·버튼 제외) 남은 걸 한 번에.
// 소리는 실제 수동 타자기를 본뜸: 활자대가 롤러를 때리는 날카로운 '탁'(짧은 광대역 충격 + 쇠 활자대의 비조화 울림 + 롤러의 둔한 울림)
// → 30~45ms 뒤 캐리지가 한 칸 넘어가는 이스케이프먼트 '틱'. 스페이스는 활자 없이 둔한 '툭'+틱. 줄 끝은 종 '땡' + 캐리지 리턴 래칫 '드르륵' + 멈추는 '쿵'.
A.typeKey = function (v = 1) { if (!this.ctx) return; const t = this.now(), pan = (Math.random() - .5) * .5, b = this.bus(.8 * v, pan, .08), j = .92 + Math.random() * .16;
  this.burst(t, .0025, 'highpass', 1500, .7, 1.6, b); // 활자가 롤러를 때리는 순간 (아주 짧은 광대역)
  this.burst(t + .001, .006, 'bandpass', 3000 * j, 1.5, .7, b); // 종이·리본 '착'
  this.modal(t + .001, [1180 * j, 2410 * j, 3760 * j, 5230 * j], [.05, .034, .022, .014], [.13, .08, .045, .02], b, .04); // 쇠 활자대·링크 울림
  this.thump(t, 230 * j, 120, .045, .5, b); // 롤러·몸체의 둔한 울림
  const e = t + .03 + Math.random() * .015; this.burst(e, .004, 'highpass', 3200, .8, .35, b); this.modal(e, [4300 * j], [.012], [.05], b, .03); }; // 이스케이프먼트 틱
A.typeSpace = function () { if (!this.ctx) return; const t = this.now(), b = this.bus(.7, 0, .06);
  this.thump(t, 160, 80, .05, .55, b); this.burst(t, .01, 'lowpass', 900, .7, .5, b);
  const e = t + .035; this.burst(e, .004, 'highpass', 3200, .8, .3, b); };
A.typeDing = function () { if (!this.ctx) return; const t = this.now(), b = this.bus(.9, .35, .35);
  this.modal(t, [2093, 2093 * 2.76, 2093 * 5.4, 2093 * 8.9], [1.3, .7, .35, .2], [.14, .05, .025, .01], b, .002); // 종 '땡' (종의 비조화 배음)
  const n = 16; for (let k = 0; k < n; k++) { const u = k / n, tt = t + .22 + .5 * (u * u * .55 + u * .45); // 캐리지 리턴: 래칫이 빨라졌다 느려지며 드르륵
    this.burst(tt, .005, 'highpass', 2200 + Math.random() * 800, .9, .22 * (1 - u * .4), b); }
  this.burst(t + .22, .5, 'bandpass', 700, .8, .12, b); // 캐리지 미끄러지는 소리
  this.thump(t + .74, 110, 50, .14, 1, b); this.burst(t + .74, .03, 'lowpass', 700, .7, .6, b); }; // 끝에 부딪혀 멈추는 '쿵'
A.stamp = function () { if (!this.ctx) return; const t = this.now(), b = this.bus(1.3, 0, .3);
  this.burst(t, .025, 'highpass', 900, .7, .9, b); this.thump(t, 130, 42, .22, 1.6, b); this.thump(t + .004, 70, 34, .3, 1.1, b);
  this.burst(t, .14, 'lowpass', 520, .7, 1.4, b); this.modal(t + .01, [240, 390, 610], [.18, .12, .08], [.18, .1, .05], b, .03); this.burst(t + .09, .18, 'bandpass', 3200, 1.2, .18, b); };
const CT = { tok: 0, done: true };
const ctPaper = $('#paper'), ctHead = ctPaper.querySelector('.p-head > span'), ctHeadHTML = ctHead.innerHTML;
// 가로선도 ━ 를 한 자씩 찍어 늘린다: 머리글 밑줄 · 서명칸 밑줄
ctPaper.querySelector('.p-head').insertAdjacentHTML('beforeend', '<span class="ct-rule" id="ctRuleH"></span>');
ctPaper.querySelector('.sig').insertAdjacentHTML('beforeend', '<span class="ct-rule" id="ctRuleS"></span>');
// 이름이 길면(최대 12자) 서명 글씨를 줄여 칸에 맞춘다
const ctFit = () => { const n = nameLen(nameInput.value || ''); nameInput.style.fontSize = Math.round(46 * Math.min(1, 7 / Math.max(n, 1))) + 'px'; };
nameInput.addEventListener('input', ctFit);
function ctItems() { // rule: ━ 선 · name: 서명칸에 이름 타이핑 · reveal: 시작할 때 / after: 끝났을 때 드러낼 클래스
  return [{ el: ctHead }, { el: $('#ctRuleH'), rule: 1, after: 'ct-h' }, { el: ctPaper.querySelector('h2') }, { el: ctPaper.querySelector('.sub') }, ...[...ctPaper.querySelectorAll('.cl')].map(el => ({ el, reveal: 'cl' })),
    { el: ctPaper.querySelector('.sig label') }, { el: nameInput, ph: 1 }, { el: $('#ctRuleS'), rule: 1, after: 'ct-in' }, { el: $('#pHint') }, { el: $('#refuseBtn'), reveal: 'ct-btn2', noDing: 1 }, { el: $('#signBtn'), reveal: 'ct-btn', noDing: 1 }, { el: nameInput, name: 1 }]; // 버튼이 먼저 생기고 글자가 찍힌다 · 이름은 맨 마지막
}
// 연출 전 준비: 종이는 처음부터 완성본 크기, 글자는 투명(CSS .ct-typing). 찍힌 부분만 .ct-ink로 잉크색.
function ctPrepare(nameToType) { // 조항 등장 애니메이션은 끈다 (끝나고 다시 페이드되지 않게)
  CT.tok++; CT.done = false; const items = ctItems(); CT.items = items;
  items.forEach(it => { if (!it.full) it.full = it.rule ? '' : it.ph ? (nameInput.dataset.ph || (nameInput.dataset.ph = nameInput.placeholder)) : it.name ? nameToType : it.el === ctHead ? ctHead.textContent : it.el.textContent; });
  ctPaper.classList.add('ct-typing'); ctPaper.classList.remove('ct-h', 'ct-in', 'ct-btn', 'ct-btn2');
  items.forEach(it => { const e = it.el; e.classList.remove('ct-on'); if (!it.rule && !it.name) { e.style.animation = 'none'; e.style.opacity = '1'; } if (it.rule) e.textContent = ''; else if (it.ph) e.placeholder = ''; else if (it.name) { e.value = ''; e.readOnly = true; } else if (e === ctHead) e.innerHTML = ctHeadHTML; else e.textContent = it.full; }); // 머리글은 #docNo 구조 유지
}
const ctName = () => (state.name && nameOk(state.name)) ? state.name : pick(NAMES.filter(n => nameLen(n) <= NAME_MAX)); // 쓰던 이름, 처음이면 무작위 러시아 이름
function ctStart() {
  if (CT.done || !CT.items) ctPrepare(ctName());
  const tok = CT.tok, items = CT.items;
  A.init(); let li = 0;
  const next = (it, ms) => { if (it.after) ctPaper.classList.add(it.after); if (!it.noDing && !it.rule) A.typeDing(); li++; setTimeout(line, ms); };
  const line = () => {
    if (tok !== CT.tok) return; if (li >= items.length) return ctFinish();
    const it = items[li], el = it.el; if (it.reveal === 'cl') el.classList.add('ct-on'); else if (it.reveal) ctPaper.classList.add(it.reveal);
    if (!it.rule && !it.name && !it.ph && el !== ctHead) it.full = el.textContent; // 안내문 등은 찍기 직전 문구로 (강제 재서명 안내 등)
    if (it.rule) { // ━ 를 폭이 찰 때까지 한 자씩
      const w = el.parentNode.getBoundingClientRect().width, n = Math.max(8, Math.ceil(w / 12.5)); let k = 0;
      const tick = () => { if (tok !== CT.tok) return; if (k >= n) return next(it, 380); el.textContent = '━'.repeat(++k); A.typeKey(.55); setTimeout(tick, 24 + Math.random() * 10); };
      return tick(); }
    const steps = typeSteps(it.full); let k = 0;
    const step = () => {
      if (tok !== CT.tok) return; const x = steps[k++];
      if (!x) return next(it, it.noDing ? 250 : it.name ? 420 : 640); // 종·캐리지 리턴이 끝나면 다음 줄
      if (it.name) { el.value = x.t; ctFit(); } else if (it.ph) el.placeholder = x.t; else el.innerHTML = `<span class="ct-ink">${esc(x.t)}</span>${esc(it.full.slice(x.t.length))}`; // 남은 글자는 투명한 채로 자리만
      if (it.reveal === 'cl') { const ink = el.firstChild, r = ink.getClientRects(), top = el.getBoundingClientRect().top; if (r.length) el.style.setProperty('--barH', (r[r.length - 1].bottom - top + 2) + 'px'); } // 인용 막대는 찍힌 줄까지만 (줄바꿈 뒤에 늘어남)
      const sp = /\s/.test(x.ch), pu = /[.,!?…~·:;'"“”()\-—№→]/.test(x.ch);
      sp ? A.typeSpace() : A.typeKey(pu ? .75 : 1);
      setTimeout(step, sp ? 60 : pu ? 110 : x.blip ? (it.name ? 90 : 44) + Math.random() * 22 : 26); }; // 이름은 한 글자씩 또박또박
    step(); };
  setTimeout(line, 650); // 종이가 날아와 자리 잡은 뒤
}
function ctFinish() { if (CT.done) return; CT.done = true; CT.tok++;
  (CT.items || []).forEach(it => { if (it.rule) it.el.textContent = ''; else if (it.ph) it.el.placeholder = it.full; else if (it.name) { it.el.value = it.full; it.el.readOnly = false; ctFit(); } else if (it.el === ctHead) it.el.innerHTML = ctHeadHTML; else it.el.textContent = it.full; it.el.classList.remove('ct-on'); it.el.style.removeProperty && it.el.style.removeProperty('--barH'); });
  CT.items = null; ctPaper.classList.remove('ct-typing'); ctPaper.classList.add('ct-h', 'ct-in', 'ct-btn', 'ct-btn2');
  if (!contract.classList.contains('hide')) setTimeout(() => { nameInput.focus(); const n = nameInput.value.length; nameInput.setSelectionRange(n, n); }, 50); } // 이제 수정 가능
// 스킵: 이름만 고치러 온 경우에만 서약서를 마우스로 3번 누르면 스킵. 처음 서명은 스킵 없음.
const CTS = { clicks: 0 };
function ctSkipNow() { ctFinish(); A.typeKey(1.2); A.typeDing(); }
ctPaper.addEventListener('click', e => { if (CT.done || (CT.first && !CT.tourDeath) || e.target.closest('input,button')) return; if (++CTS.clicks >= 3) { CTS.clicks = 0; ctSkipNow(); } });
{ const oc = openContract; openContract = function () { CT.first = !(state.name && nameOk(state.name)); CTS.clicks = 0; ctPrepare(ctName()); oc(); nameInput.value = ''; setTimeout(ctStart, 0); }; } // 종이가 뜨기 전에 먼저 비워 둔다 (숨겨지는 게 안 보이게)
nameInput.addEventListener('keydown', e => { if (!CT.done) { e.preventDefault(); e.stopImmediatePropagation(); } }, true); // 연출 끝날 때까지 이름 수정·서명 불가
nameInput.addEventListener('mousedown', e => { if (!CT.done) e.preventDefault(); }, true);
$('#signBtn').addEventListener('click', e => { if (!CT.done || CT.exec) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
// 첫 방문: 브라우저는 사용자가 뭔가 하기 전엔 소리를 막는다 → 빈 테이블에서 기다렸다가, 누르거나 키를 치는 순간 종이가 날아오고 연출 시작
CT.tourDeath = !!S.get('ctTourDeath', false); S.del('ctTourDeath'); // 토너먼트에서 죽어 이름이 지워진 경우엔 마우스 스킵 허용
if (!contract.classList.contains('hide')) { CT.first = true; if (!CT.items) ctPrepare(ctName()); contract.classList.add('ct-wait');
  const go = () => { ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, go, true)); A.init(); A.resume(); contract.classList.remove('ct-wait'); ctPaper.style.animation = 'none'; void ctPaper.offsetWidth; ctPaper.style.animation = ''; ctStart(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, go, true)); } // 첫 방문: HTML부터 빈 종이(ct-typing)로 시작

