// ══════════════════ 토너먼트 완전 사망 ══════════════════
// 목숨이 다 떨어지면 검은 화면에 'ㅇㅇㅇ는 죽었다.' 누르면 그 이름은 지워지고 처음부터(새 서약서). 이때의 서약서는 마우스 3번으로 스킵 가능.
const josaNeun = n => jo(n, '은').slice(String(n).length); // 은/는
// 꼼수 방지: 죽는 순간 저장해 두므로 F5를 눌러도 이 화면이 그대로 다시 뜬다 (누르기 전까지)
// 묘비 날짜: 사망은 1980~1999년 중 무작위, 월·일은 오늘. 출생은 그보다 19~64년 전의 있을 법한 날짜.
// ── 숙청 보고서: 죽으면 서류상으로 처리된다. 서기장 동지에게 올라가는 처리 보고서가 타자기로 찍히고, [확인]을 누르면 결재 도장.
// 사망 연도는 1980~1999 무작위(월·일은 오늘), 생년월일은 그보다 19~64년 전 그럴듯하게. 번호·날짜는 저장 → F5에도 같은 서류.
function tdMake(d) {
  const now = new Date(), p2 = n => String(n).padStart(2, '0'), p5 = n => String(n).padStart(5, '0');
  const dy = 1980 + rand(20), dm = now.getMonth() + 1, dd = Math.min(now.getDate(), new Date(dy, dm, 0).getDate()); // 2월 29일 같은 날은 그 해에 맞춤
  const by = dy - (19 + rand(46)), bm = 1 + rand(12), bd = 1 + rand(new Date(by, bm, 0).getDate());
  return { birth: `${by}. ${p2(bm)}. ${p2(bd)}`, death: `${dy}. ${p2(dm)}. ${p2(dd)}`, no: p5(rand(100000)), rep: `${dy % 100}-${p2(dm)}${p2(dd)}/${1 + rand(899)}`, age: dy - by - ((bm > dm || (bm === dm && bd > dd)) ? 1 : 0) };
}
// 서류 브금: 사면 = 행진곡, 사망 = 장송곡. 서류가 닫히면 원래 곡으로.
function docMusic(v) { if (A.crowdStop) A.crowdStop(); if (!musicOn) { Music.stop(); return; } A.init(); Music.rate = 1; if (Music.on) Music.switchTo(v); else { Music.variant = v; Music.start(); } }
function docMusicEnd() { if (state.started && musicOn) Music.switchTo(state.seats.some(x => x && x.nemesis) ? 'nemesis' : null); else { Music.stop(); Music.variant = null; } }
function musicCut() { if (!Music.on) return; const r = Music.run, t = A.now(); Music.stop(); r.gain.cancelScheduledValues(t); r.gain.setValueAtTime(r.gain.value, t); r.gain.linearRampToValueAtTime(0, t + .04); } // 총성에 뚝
// 처음 보는 서류는 스킵 불가. 한 번 끝까지 본(확인까지 누른) 서류만 스킵 허가 — 인사기록 카드는 층별(그 층까지 내려가 본 만큼)
const docSeen = k => !!S.get('docSeen', {})[k] || (/^f\d$/.test(k) && +k[1] <= tourBest) || ((k === 'volkov' || k === 'pardon') && tourBest >= FLOORS); // 예전 기록: 통과해 본 층은 도달한 것
const docMark = k => { const o = S.get('docSeen', {}); if (!o[k]) { o[k] = true; S.set('docSeen', o); } };
function tourDeathScreen(o) {
  const d = o && o.name != null ? o : (S.get('tourDeadScreen', null) || { name: state.name || '무명', f: o.f, best: tourBest });
  if (document.getElementById('tourDead')) return new Promise(() => {});
  if (!d.doc) { d.doc = tdMake(d); if (d.will) d.doc.cens = censorPick(d.will); if (!d.preview && S.get('tourDeadScreen', null)) S.set('tourDeadScreen', d); }
  const nm = d.name || '무명', D = d.doc, where = '제7수용소 심문실'; // 어디서 어떻게 죽든 서류상은 심문실 (정상 절차로 처리된 척)
  const el = document.createElement('div'); el.id = 'tourDead';
  el.innerHTML = `<div class="paper rp" id="rpPaper"><div class="p-head"><span class="rp-t">극비 · 처리 보고 № ${D.rep}</span><svg viewBox="0 0 100 100"><polygon points="50,4 61,38 97,38 68,59 79,94 50,72 21,94 32,59 3,38 39,38" fill="#8a1a14"/></svg></div>
    <p class="rp-t rp-to">수신: 위대하신 스탈린 서기장 동지</p><p class="rp-t rp-to">발신: 소비에트 사회주의 공화국 연방 국가보안위원회(KGB) 제7수용소 특별처리과</p>
    <h2 class="rp-t">숙청 완료 보고</h2>
    <div class="rp-grid"><span class="rp-t">사망자 번호</span><b class="rp-t">제 ${D.no} 호</b><span class="rp-t">성명</span><b class="rp-t">${esc(nm)}</b><span class="rp-t">생년월일</span><b class="rp-t">${D.birth} (향년 ${D.age}세)</b><span class="rp-t">사망일</span><b class="rp-t">${D.death}</b><span class="rp-t">처리 장소</span><b class="rp-t">${where}</b></div>
    <p class="rp-t rp-body">一. 상기 반혁명 분자는 특별사면 규정에 의거하여 자원 서약서에 자필 서명하였으며, 지정된 테이블에서 리볼버 1발로 처리되었음.</p>
    <p class="rp-t rp-body">二. ${d.debug ? '본 건은 내부 점검 목적으로 처리됨.' : `당해 인원은 ${d.best ? 'B' + d.best + '까지 통과하였으나' : '한 층도 통과하지 못하였으며'}, 사면 심사는 이로써 종결됨. 관련 기록은 전량 말소함.</p>`}
    ${d.will ? `<p class="rp-t rp-body rp-will">三. 당해 인원의 유언: “${esc(d.will)}”</p>` : ''}
    <p class="rp-t rp-end">이상 보고함.</p><p class="rp-t rp-end rp-glory">영광스러운 소비에트 연방 만세.</p>
    <div class="p-foot"><small class="rp-t">사본 없음 · 열람 후 소각</small><button class="p-btn" id="rpOk">확인</button></div><div class="stamp rp-stamp">결재</div></div>`;
  document.body.appendChild(el); docMusic('dirge'); autoPause('tourdead', true);
  rpRun(el, () => { if (d.preview) return setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); autoPause('tourdead', false); docMusicEnd(); }, 700); }, 1300); // 디버그 가짜 보고서: 이름 안 지움
    docMark('death'); S.set('ctTourDeath', true); S.del('name'); S.del('tourDeadScreen'); S.set('mode', 'vs'); // 죽으면 1:1로 돌아가서 새로 시작
    setTimeout(() => { el.classList.add('out'); setTimeout(() => location.reload(), 700); }, 1300); }, false, { noSkip: !d.preview && !docSeen('death'), onDone: d.will ? () => censorRun(el.querySelector('.rp-will'), d.will, D.cens || []) : null });
  return new Promise(() => {});
}
// 타자기로 서류를 찍어 내려가는 공통 연출 (숙청 보고 · 사면 결정서)
function rpRun(el, onOk, pardon, opt) {
  toggleDbg(false); if (!ruleOv.classList.contains('hide')) ruleClose(); // 서류가 뜨면 디버그·룰북은 닫는다 (브금도 안 어울림)
  const paper = el.querySelector('#rpPaper'), items = [...paper.querySelectorAll('.rp-t')], full = items.map(e => e.textContent); let tok = 1, done = false;
  items.forEach(e => { e.classList.add('rp-ghost'); });
  const stopN = opt && opt.stopAt ? items.indexOf(opt.stopAt) : -1; // 가짜 사면: 이 칸까지만 찍고 멈춘다
  const stop = () => { done = true; tok++; opt.onStop(); };
  const finish = () => { if (done) return;
    if (stopN >= 0) { items.forEach((e, n) => { if (n > stopN) return; e.textContent = full[n]; e.classList.remove('rp-ghost'); const b = e.closest('.p-head,.rp-grid'); if (b) b.classList.add('l1'); }); items[stopN].classList.add('rp-twist'); return stop(); }
    done = true; tok++; items.forEach((e, n) => { e.textContent = full[n]; e.classList.remove('rp-ghost'); }); paper.classList.add('rp-done'); if (opt && opt.onDone) opt.onDone(); };
  const type = () => { A.init(); let li = 0; const my = tok;
    const line = () => { if (my !== tok) return; if (li >= items.length) return finish(); const e = items[li], t = full[li], st = typeSteps(t); let k = 0; const g = e.closest('.rp-grid'); if (g) g.classList.add('l1'); if (li === stopN) e.classList.add('rp-twist'); // 표 윗선은 표를 치기 시작할 때 · 처분 칸은 삐뚤게
      const step = () => { if (my !== tok) return; const x = st[k++]; if (!x) { e.textContent = t; e.classList.remove('rp-ghost'); li++; const box = e.closest('.p-head,.rp-grid'); if (box && !box.querySelector('.rp-ghost')) box.classList.add('l2'); if (li - 1 === stopN) return stop(); if (e.classList.contains('rp-body') || e.tagName === 'H2' || e.classList.contains('rp-end')) A.typeDing(); setTimeout(line, e.tagName === 'B' || e.tagName === 'SPAN' && e.parentNode.classList.contains('rp-grid') ? 90 : 420); return; }
        e.innerHTML = `<span class="ct-ink">${esc(x.t)}</span>${esc(t.slice(x.t.length))}`; /\s/.test(x.ch) ? A.typeSpace() : A.typeKey(.9);
        setTimeout(step, /\s/.test(x.ch) ? 45 : x.blip ? 34 + Math.random() * 18 : 20); };
      step(); };
    setTimeout(line, 700); };
  // 스킵: 서류 아무 데나 누르면 남은 걸 한 번에 (확인 버튼 제외)
  el.addEventListener('click', e => { if (e.target.closest('#rpOk') || (opt && opt.noSkip)) return; if (!done) { finish(); A.typeKey(1.2); } }); // 가짜 사면은 연출이라 스킵 불가
  el.querySelector('#rpOk').addEventListener('click', () => { if (!done) return opt && opt.noSkip ? null : finish(); if (paper.classList.contains('stamped') || paper._ok) return; paper._ok = 1;
    const go = () => { A.init(); A.stamp && A.stamp(); paper.classList.add('stamped'); onOk(); }; // 결재 도장
    if (opt && opt.preOk) { paper.classList.add('signing'); opt.preOk().then(go); } else go(); }); // preOk: 서명을 먼저 적고 도장
  // 소리는 사용자가 한 번 만진 뒤에만 난다 → 이미 오디오가 살아 있으면 바로, 아니면 첫 입력에 시작
  if (A.ctx && A.ctx.state === 'running') { if (!pardon) { A.thump(A.now(), 60, 28, .8, 1.4, A.bus(1, 0, .6)); A.tinnitus && A.tinnitus(5); } type(); }
  else { el.classList.add('rp-wait'); const go = () => { ['pointerdown', 'keydown'].forEach(ev => document.removeEventListener(ev, go, true)); el.classList.remove('rp-wait'); A.init(); A.resume(); type(); }; ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, go, true)); }
}

// 토너먼트 우승: 특별사면 결정서 (디버그에서도 열람 가능, 이때는 진행 상황과 무관)
function tourPardonScreen(o) {
  const d = o || {}, nm = d.name || state.name || '무명', D = tdMake(d), fake = d.fake; // fake: 'tear'(처분 칸에서 찢김) · 'stamp'(석방 누르면 처형 도장)
  if (document.getElementById('tourDead')) return Promise.resolve();
  const el = document.createElement('div'); el.id = 'tourDead'; el.className = 'pardon';
  el.innerHTML = `<div class="paper rp" id="rpPaper"><div class="p-head"><span class="rp-t">특별사면 결정서 № ${D.rep}</span><svg viewBox="0 0 100 100"><polygon points="50,4 61,38 97,38 68,59 79,94 50,72 21,94 32,59 3,38 39,38" fill="#8a1a14"/></svg></div>
    <p class="rp-t rp-to">수신: 굴라크 제7수용소 소장</p><p class="rp-t rp-to">발신: 소비에트 사회주의 공화국 연방 국가보안위원회(KGB) 제7수용소 특별처리과</p>
    <h2 class="rp-t">특별사면 결정</h2>
    <div class="rp-grid"><span class="rp-t">수형자 번호</span><b class="rp-t">제 ${D.no} 호</b><span class="rp-t">성명</span><b class="rp-t">${esc(nm)}</b><span class="rp-t">생년월일</span><b class="rp-t">${D.birth} (${D.age}세)</b><span class="rp-t">결정일</span><b class="rp-t">${D.death}</b><span class="rp-t">처분</span><b class="rp-t rp-cf">잔여 형기 전부 면제 · 즉시 ${fake === 'tear' ? '처형' : '석방'}</b>${d.prize ? `<span class="rp-t">석방 지원금</span><b class="rp-t">${won(d.prize)}</b>` : ''}${d.packs ? `<span class="rp-t">영치품 반환</span><b class="rp-t">미사용 목숨 ${d.packs * 3}개 · ${won(d.refund)} (구매권 ${d.packs}회)</b>` : ''}</div>
    <p class="rp-t rp-body">一. ${fake ? '상기 수형자는 특별사면 자원 서약을 거부하였음. 본 위원회는 당해 인원의 솔직함을 높이 평가함.' : d.debug ? '본 결정서는 내부 점검 목적으로 발급됨. 효력 없음.' : '상기 수형자는 특별사면 자원 서약서에 의거하여 제7수용소 지하 B1부터 B7까지 전 과정을 통과하였으며, 처형 책임자 볼코프는 당해 테이블에서 처리되었음.'}</p>
    <p class="rp-t rp-body">二. 이에 ${fake ? '' : '서약서 四조에 따라 '}잔여 형기 전부를 면제하고 즉시 석방함. 관련 수용 기록은 전량 소각함.</p>
    <p class="rp-t rp-body">三. 석방자는 수용소 내에서 보고 들은 일체를 발설하지 아니한다. 위반 시 본 결정은 소급하여 무효로 하며, 당해 인원은 제7수용소로 재수용함.</p>
    <p class="rp-t rp-end">이상 결정함.</p><p class="rp-t rp-end rp-glory">영광스러운 소비에트 연방 만세.</p>
    <div class="p-foot"><small class="rp-t">사본 1부 · 석방 시 지참</small><button class="p-btn" id="rpOk">석방</button></div><div class="stamp rp-stamp">사면</div>${fake === 'stamp' ? '<div class="stamp rp-stamp rp-stamp2">처형</div>' : ''}</div>`;
  document.body.appendChild(el); docMusic('victory'); autoPause('tourdead', true);
  const seen = !!d.preview; // 거부 연출(진짜)은 절대 스킵 불가 · 디버그 미리보기만 스킵 가능
  if (fake) return new Promise(() => rpRun(el, () => { if (fake === 'stamp') ctFakeKill(el, nm, 'stamp', d.preview); }, true, fake === 'tear' ? { noSkip: !seen, stopAt: el.querySelector('.rp-cf'), onStop: () => ctFakeKill(el, nm, 'tear', d.preview) } : { noSkip: !seen }));
  return new Promise(res => rpRun(el, () => { setTimeout(() => { A.jackpot && A.jackpot(); }, 350); if (!d.debug) docMark('pardon');
    // 석방된 사람은 테이블에 남지 않는다: 새로고침 없이 다른 수형자 이름으로 덮어쓴다
    const nn = pick(NAMES.filter(n => nameLen(n) <= NAME_MAX && n !== nm)); state.name = nn; S.set('name', nn);
    state.seats.forEach(x => { if (x && x.kind === 'human') x.name = nn; }); nameInput.value = nn; renderAll();
    log(`${esc(jo(nm, '은'))} 석방되었다. 새 수형자 <b>${esc(nn)}</b>${jo(nn, '이').slice(nn.length)} 테이블에 앉는다.`, 'sys');
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); autoPause('tourdead', false); docMusicEnd(); res(); }, 700); }, 1900); }, true, { noSkip: !d.debug && !docSeen('pardon') }));
}

const STAR_SVG = '<svg viewBox="0 0 100 100"><polygon points="50,4 61,38 97,38 68,59 79,94 50,72 21,94 32,59 3,38 39,38" fill="#8a1a14"/></svg>';
// ══════════════════ 공문서: 인사기록 카드 · 볼코프 처리 보고 · 유언 검열 ══════════════════
// 공통: 서류 한 장 띄우고 [버튼] → 도장 → 닫힘 (클릭 스킵 가능)
function rpDoc(html, o = {}) {
  if (document.getElementById('tourDead')) return Promise.resolve();
  const el = document.createElement('div'); el.id = 'tourDead'; if (o.cls) el.className = o.cls; el.innerHTML = html;
  document.body.appendChild(el); if (o.music) docMusic(o.music); autoPause('tourdead', true);
  return new Promise(res => rpRun(el, () => { if (o.seen) docMark(o.seen); setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); autoPause('tourdead', false); res(); }, 600); }, o.hold || 900); }, true, { noSkip: !!o.seen && !docSeen(o.seen) }));
}
// 상대 인사기록 카드: 토너먼트에서 새 상대를 만날 때마다
const CRIMES = ['배급 빵 무단 증량', '지도자 초상화에 커피를 엎지름', '외국 라디오 청취', '반소 농담 유포 (3회)', '공장 할당량 미달', '콜호스 감자 절도', '재즈 음반 소지', '5개년 계획에 대한 의심 표명', '당원증 분실',
  '서기장 동지 연설 중 하품', '인민의 트랙터 무단 사용', '이웃 신고 누락', '청바지 밀수', '체스 대회에서 당 간부를 이김', '호밀 수확량 허위 보고', '벽신문 낙서', '열차 시간표 비판', '국영 상점 줄 새치기'];
const CRIME_P = { drunk: ['밀주 제조', '근무 중 음주 (상습)'], calculator: ['5개년 계획 수치 재계산', '통계국 자료 무단 검산'], coward: ['징집 기피', '공개 비판 회의 불참'], provocateur: ['반소 농담 유포 (상습)', '정치 강연 중 야유'],
  veteran: ['전선 이탈 혐의', '훈장 무단 착용'], gambler: ['불법 카드 도박장 운영', '국채 투기'], berserker: ['공장 감독관 폭행', '기물 파손'], mimic: ['당 간부 사칭', '서명 위조'], mindgamer: ['허위 자백 유도', '심문관 매수 시도'], fatalist: ['노동 거부', '종교 서적 소지'], strategist: ['군사 지도 무단 소지', '비밀 회합 주도'] };
const PSYCH = { berserker: '충동적이며 공격성이 강함. 위험을 스스로 키움.', coward: '비협조적이며 겁이 많음. 결정적 순간에 회피함.', gambler: '확률을 무시하고 판을 키우는 경향.', calculator: '매사를 계산함. 감정 반응 거의 없음.',
  strategist: '냉정하고 계획적임. 상대의 수를 읽음.', fatalist: '생사에 무관심함. 운명을 믿음.', mimic: '타인의 행동을 모방함. 자기 의지 불분명.', mindgamer: '언동으로 상대를 흔듦. 거짓말에 능함.', veteran: '전장 경험 다수. 손이 떨리지 않음.',
  drunk: '상시 음주 상태. 판단력 불량하나 예측 불가.', provocateur: '언동이 불량하며 상대를 도발함.' };
const VOLKOV_CRIME = '특별사면 결정서 은닉 (다수)'; // 인사기록 카드에선 검게 가려지고, 죽고 나서 처리 보고서에서 드러난다
function tourDossier(seat) {
  const o = tour.opp || {}; if (!o.file) { const p = seat.pers, D = tdMake({});
    o.file = { no: D.no, crime: Math.random() < .55 && CRIME_P[p] ? pick(CRIME_P[p]) : pick(CRIMES), term: 5 + rand(21), rep: D.rep }; S.set('tour', tour); }
  const F = o.file, boss = seat.boss, nem = seat.nemesis && nemesis;
  // 이감 명령을 겸한다: 플레이어를 이 층으로 옮겼다는 걸 간접적으로 (지난 층 상대는 말소)
  const me = esc(state.name || '무명'), f = tour.floor, prev = tour.prevOpp ? esc(tour.prevOpp) : '';
  const who = boss ? '담당관과' : '수형자와', nm0 = state.name || '무명';
  const moveLine = f === 1 ? `신규 참가 수형자 ${esc(jo(nm0, '을'))} 지하 B1로 이송하여 상기 ${who} 동일 테이블에 배정함.`
    : `지하 ${jo('B' + (f - 1), '을')} 통과한 수형자 ${esc(jo(nm0, '을'))} ${jo('B' + f, '으로')} 이감하여 상기 ${who} 동일 테이블에 배정함.${prev ? ` B${f - 1}의 수형자 ${esc(jo(tour.prevOpp, '은'))} 기록에서 말소됨.` : ''}`;
  const row = (k, v, x = '') => `<span class="rp-t">${k}</span><b class="rp-t${x}">${v}</b>`;
  const grid = boss ? row('성명', esc(seat.name)) + row('직위', '제7수용소 처형 책임자') + row('소속', 'KGB 특별처리과') + row('죄목', VOLKOV_CRIME, ' rp-redact') + row('심리 소견', '열람 권한 없음', ' rp-redact')
    : row('수형자 번호', `제 ${F.no} 호`) + row('성명', esc(seat.name)) + row('죄목', F.crime) + row('형기', `${F.term}년`) + row('심리 소견', PSYCH[seat.pers] || '특이사항 없음');
  const html = `<div class="paper rp" id="rpPaper"><div class="p-head"><span class="rp-t">인사기록 카드 № ${F.rep}</span>STAR</div>
    <p class="rp-t rp-to">제7수용소 특별처리과 · 이감 및 대국 배정 명령</p>
    <h2 class="rp-t">${boss ? '담당관 기록' : '수형자 인사기록'}</h2>
    <div class="rp-grid">${grid}</div>
    <p class="rp-t rp-body">一. ${moveLine}</p>
    <p class="rp-t rp-body">二. ${boss ? '담당관을 쓰러뜨린 자에 한하여 사면 심사를 종결함.' : '먼저 쓰러지는 자는 기록에서 말소함.'}</p>
    ${nem ? `<p class="rp-t rp-body rp-nem">※ 전과: 수형자 ${esc(nem.victim || state.name || '무명')} 처리 (지하 B${tour.floor})</p>` : ''}
    <div class="p-foot"><small class="rp-t">${boss ? '대외비 · 열람 후 반납' : '열람 후 반납'}</small><button class="p-btn" id="rpOk">착석</button></div><div class="stamp rp-stamp">배정</div>${nem ? '<div class="stamp rp-stamp rp-stamp-nem">숙적</div>' : ''}</div>`.replace('STAR', STAR_SVG);
  return rpDoc(html, { cls: 'dossier', hold: 700, seen: 'f' + tour.floor }); // 그 층까지 내려가 본 적 있어야 스킵
}
// 볼코프 처리 보고: 사형수들에게 쓰던 양식 그대로
function volkovReport() {
  const D = tdMake({});
  return rpDoc(`<div class="paper rp" id="rpPaper"><div class="p-head"><span class="rp-t">극비 · 처리 보고 № ${D.rep}</span>${STAR_SVG}</div>
    <p class="rp-t rp-to">수신: 위대하신 스탈린 서기장 동지</p><p class="rp-t rp-to">발신: 소비에트 사회주의 공화국 연방 국가보안위원회(KGB) 제7수용소 특별처리과</p>
    <h2 class="rp-t">숙청 완료 보고</h2>
    <div class="rp-grid"><span class="rp-t">사망자 번호</span><b class="rp-t">제 00007 호</b><span class="rp-t">성명</span><b class="rp-t">볼코프</b><span class="rp-t">직위</span><b class="rp-t">제7수용소 처형 책임자</b><span class="rp-t">죄목</span><b class="rp-t">${VOLKOV_CRIME}</b><span class="rp-t">사망일</span><b class="rp-t">${D.death}</b><span class="rp-t">처리 장소</span><b class="rp-t">제7수용소 심문실</b></div>
    <p class="rp-t rp-body">一. 상기 인원은 특별사면 심사 최종 단계에서 직무 수행 중 리볼버 1발로 처리되었음.</p>
    <p class="rp-t rp-body">二. 당해 직위는 즉시 후임자로 충원함. 관련 기록은 전량 말소함.</p>
    <p class="rp-t rp-end">이상 보고함.</p><p class="rp-t rp-end rp-glory">영광스러운 소비에트 연방 만세.</p>
    <div class="p-foot"><small class="rp-t">사본 없음 · 열람 후 소각</small><button class="p-btn" id="rpOk">확인</button></div><div class="stamp rp-stamp">결재</div></div>`, { music: 'dirge', hold: 1100, seen: 'volkov' });
}
// 유언 검열: 보고서가 다 찍히면 단어 절반쯤을 검게 긋고 '검열필'
function censorPick(w) { const t = w.split(/(\s+)/), idx = t.map((x, i) => /\S/.test(x) ? i : -1).filter(i => i >= 0);
  const n = idx.length <= 1 ? idx.length : Math.max(1, Math.round(idx.length * (.4 + Math.random() * .25))), pickd = idx.slice().sort(() => Math.random() - .5).slice(0, n); return pickd; }
function censorRun(p, will, marks) {
  const t = will.split(/(\s+)/), pre = p.textContent.slice(0, p.textContent.indexOf('“') + 1);
  p.innerHTML = esc(pre) + t.map((x, i) => marks.includes(i) ? `<span class="rd">${esc(x)}</span>` : esc(x)).join('') + '”<span class="rp-cens">검열필</span>';
  const rds = [...p.querySelectorAll('.rd')]; let k = 0;
  const next = () => { if (!p.isConnected) return; if (k >= rds.length) { setTimeout(() => { p.classList.add('censed'); A.stamp && A.stamp(); }, 350); return; }
    rds[k++].classList.add('on'); A.burst && A.burst(A.now(), .09, 'bandpass', 900 + Math.random() * 500, .7, .25, A.bus(.8, 0, .05)); setTimeout(next, 170); };
  setTimeout(next, 500);
}

// ── 토너먼트 참가 서약: 새 토너먼트를 시작할 때마다. 규칙이 타자로 찍히고(클릭 스킵), 거부해도 불이익 없이 원래 모드로.
const tourSigned = () => !!(tour.signed || tour.floor > 1 || tour.lives < 3 || (tour.opp && tour.opp.filed)); // 이미 진행 중인 토너먼트는 서명한 것으로
// 서명칸에 이름을 한 자씩 적는다 (자모 조합이 보이게)
function penType(el, t) { return new Promise(r => { const st = typeSteps(t); let k = 0; el.textContent = ''; el.classList.add('on');
  const step = () => { const x = st[k++]; if (!x) return setTimeout(r, 350); el.textContent = x.t; /\s/.test(x.ch) ? A.typeSpace() : A.typeKey(.8); setTimeout(step, x.blip ? 85 + Math.random() * 30 : 40); };
  setTimeout(step, 200); }); }
// 서명 서류 공통: [아니오 버튼] [서명 버튼] → 'ok' | 'no'. onNo가 있으면 거부 처리를 넘긴다
function signDoc(html, o) {
  return new Promise(res => {
    if (document.getElementById('tourDead')) return res(null);
    const el = document.createElement('div'); el.id = 'tourDead'; el.className = 'dossier tcontract'; el.innerHTML = html;
    document.body.appendChild(el); autoPause('tourdead', true); const paper = el.querySelector('#rpPaper');
    const close = (v, ms) => setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); autoPause('tourdead', false); res(v); }, 600); }, ms);
    rpRun(el, () => { if (o.seen) docMark(o.seen); close('ok', 1100); }, true, { noSkip: !!o.seen && !docSeen(o.seen), preOk: () => penType(el.querySelector('.rp-pen'), o.name) });
    el.querySelector('#rpNo').addEventListener('click', e => { e.stopPropagation(); if (!paper.classList.contains('rp-done') || paper.classList.contains('stamped') || paper._ok || el._no) return; el._no = 1;
      if (o.seen) docMark(o.seen); A.init(); A.typeKey(1); if (o.onNo) o.onNo(el, paper); else close('no', 250); });
  });
}
const docHead = (no, to, h2) => `<div class="paper rp" id="rpPaper"><div class="p-head"><span class="rp-t">${no}</span>${STAR_SVG}</div><p class="rp-t rp-to">${to}</p><h2 class="rp-t">${h2}</h2>`;
const docGrid = rows => `<div class="rp-grid">${rows.map(([k, v]) => `<span class="rp-t">${k}</span><b class="rp-t">${v}</b>`).join('')}</div>`;
const docSig = nm => `<div class="rp-sigl"><span class="rp-t">서명</span><b class="rp-pen">${esc(nm)}</b></div>`;
// ── 토너먼트 포기: 포기 각서(목숨 반환) → 번 돈이 있으면 몰수 동의서(거부하면 사살) → 1:1로
function tourLifeRefund() { // 우승·포기 공통: 기본 3개를 뺀 남은 목숨을 3개 묶음 단위로 (5개 → 0 · 6 → 1 · 60 → 19)
  const cap = tour.lifeBuys != null ? Math.min(tour.lifeBuys, lifeBought) : lifeBought;
  const packs = Math.max(0, Math.min(cap, Math.floor((tour.lives - 3) / 3))); return { packs, refund: packs * SHOP.find(x => x.id === 'life').price };
}
async function tourForfeit() {
  if (state.mode !== 'tour' || !state.started || state.over || document.getElementById('tourDead')) return;
  const nm = state.name || '무명', D = tdMake({}), R = tourLifeRefund(), f = tour.floor;
  const ok = await signDoc(docHead(`포기 각서 № ${D.rep}`, '제7수용소 특별처리과 제출', '특별사면 심사 포기 각서')
    + docGrid([['수형자 번호', `제 ${D.no} 호`], ['성명', esc(nm)], ['도달 층', `지하 B${f}`], ['남은 목숨', `${tour.lives}개`], ...(R.packs ? [['반환', `미사용 목숨 ${R.packs * 3}개 · ${won(R.refund)} (구매권 ${R.packs}회)`]] : [])])
    + `<p class="rp-t rp-body">一. 본인은 특별사면 심사를 자진하여 포기하며, 이로써 사면 자격을 상실한다.</p>
       <p class="rp-t rp-body">二. 암시장에서 구매한 목숨 중 남은 분량은 기본 3개를 제외하고 3개 단위로 반환받는다.</p>
       <p class="rp-t rp-body">三. 본인은 심사 기간 중 보고 들은 일체를 발설하지 아니한다.</p>`
    + docSig(nm) + `<div class="p-foot"><small class="rp-t">사본 없음 · 담당관 보관</small><span class="p-btns"><button class="p-btn p-no" id="rpNo">철회한다</button><button class="p-btn" id="rpOk">서명한다 →</button></span></div><div class="stamp rp-stamp">수리</div></div>`,
    { name: nm, seen: 'forfeit' });
  if (ok !== 'ok') return;
  if (R.packs) { lifeBought -= R.packs; S.set('lifeBought', lifeBought); tbank += R.refund; log(`남은 목숨 ${R.packs * 3}개 반환 — 구매권 ${R.packs}회 · ${won(R.refund)} 환불.`, 'spin'); }
  // 몰수: 입장 때 지갑 기준, 암시장 대금은 손실로 치지 않음 → 순수익 = 지금 - 입장 + 암시장 사용 - 환불
  const S0 = tour.startMoney, P = tour.shopSpent || 0, gain = S0 == null ? 0 : tbank - S0 + P - R.refund;
  if (gain > 0) {
    const D2 = tdMake({}), after = Math.max(0, tbank - gain);
    const r = await signDoc(docHead(`몰수 동의서 № ${D2.rep}`, '제7수용소 특별처리과', '금품 몰수 동의서')
      + docGrid([['성명', esc(nm)], ['입장 시 소지금', won(S0)], ['현재 소지금', won(tbank)], ['암시장 사용', won(P)], ['몰수 금액', won(gain)]])
      + `<p class="rp-t rp-body">一. 본인은 특별사면 심사 기간 중 취득한 금품 ${won(gain)} 전액을 국가에 귀속시키는 데 동의한다.</p>
         <p class="rp-t rp-body">二. 암시장 구매 대금은 몰수 대상에서 제외한다.</p>
         <p class="rp-t rp-body">三. 본인은 제7수용소의 존재와 심사 내용 일체에 대하여 발설하지 아니하며, 위반 시 어떠한 처분도 감수한다.</p>
         <p class="rp-t rp-body">四. 본 동의는 자발적인 것이다.</p>`
      + docSig(nm) + `<div class="p-foot"><small class="rp-t">사본 없음 · 열람 후 소각</small><span class="p-btns"><button class="p-btn p-no" id="rpNo">거부한다</button><button class="p-btn" id="rpOk">동의한다 →</button></span></div><div class="stamp rp-stamp">몰수</div></div>`,
      { name: nm, seen: 'confisc', onNo: async (el, paper) => { // 거부 = 그 자리에서 사살 (서류엔 안 적혀 있음)
          tbank = 0; saveMoney(); log(`몰수 거부 — 토너먼트 지갑 전액 몰수.`, 'kill'); // 거부 = 사살 + 지갑 전액 몰수 (동의하면 이득분만)
          S.set('tourDeadScreen', { name: nm, f, best: tourBest }); tourReset(); S.del('save_tour'); document.body.classList.add('ct-exec');
          await sleep(900); const g = await ctShoot(paper, true); paper.classList.add('rp-hit');
          await sleep(2800); el.classList.add('out'); g.style.transition = 'opacity .8s'; g.style.opacity = 0; await sleep(800);
          el.remove(); Blood.clear(); g.remove(); document.body.classList.remove('ct-exec'); tourDeathScreen(S.get('tourDeadScreen', null)); } });
    if (r !== 'ok') return;
    tbank = after; log(`토너먼트 수익 ${won(gain)} 몰수.`, 'kill');
  }
  saveMoney(); tourReset(); S.del('save_tour'); log('토너먼트 포기 — 사면 심사 종결.', 'sys'); switchMode('vs');
}
$('#forfeitBtn').addEventListener('click', e => { e.stopPropagation(); tourForfeit(); });
function tourContract() {
  return new Promise(res => {
    if (document.getElementById('tourDead')) return res(false);
    const D = tdMake({}), nm = state.name || '무명';
    const cl = ['본 심사는 지하 B1부터 B7까지 일곱 개 층으로 구성된다. 층마다 배정된 수형자 1인과 대국한다.',
      '층을 통과할 때마다 층수 × ₽300을 지급한다. B7을 통과한 자에게는 ₽5,000을 추가 지급하고 특별사면한다.',
      '판돈은 층수에 비례하여 오르며, 대출은 허용되지 않는다.',
      '목숨은 셋으로 한다. 쓰러진 자는 부상을 입은 채(제한 시간 −3초) 같은 상대와 재대결한다.',
      '목숨을 모두 잃은 자는 숙청하며, 그 이름은 기록에서 말소한다.',
      'B5는 판돈 ×2, B6는 제한 시간 8초, B7은 담당관 볼코프의 규칙(2발 장전 · 스핀 금지)을 따른다. 그 외 층은 판에 따라 아이템을 금지할 수 있다.',
      '본 서약은 자원에 의한 것이며, 거부하여도 불이익은 없다.'];
    const NUM = '一二三四五六七';
    const el = document.createElement('div'); el.id = 'tourDead'; el.className = 'dossier tcontract';
    el.innerHTML = `<div class="paper rp" id="rpPaper"><div class="p-head"><span class="rp-t">참가 서약서 № ${D.rep}</span>${STAR_SVG}</div>
      <p class="rp-t rp-to">굴라크 제7수용소 · 특별사면 심사 규정</p>
      <h2 class="rp-t">특별사면 심사 참가 서약</h2>
      ${cl.map((c, i) => `<p class="rp-t rp-body">${NUM[i]}. ${c}</p>`).join('')}
      <div class="rp-sigl"><span class="rp-t">서명</span><b class="rp-pen">${esc(nm)}</b></div>
      <div class="p-foot"><small class="rp-t">사본 1부 · 담당관 보관</small><span class="p-btns"><button class="p-btn p-no" id="rpNo">거부한다</button><button class="p-btn" id="rpOk">서명한다 →</button></span></div><div class="stamp rp-stamp">접수</div></div>`;
    document.body.appendChild(el); autoPause('tourdead', true);
    const paper = el.querySelector('#rpPaper');
    const close = ok => setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); autoPause('tourdead', false); res(ok); }, 600); }, ok ? 1300 : 250);
    rpRun(el, () => { docMark('tc'); close(true); }, true, { noSkip: !docSeen('tc'), preOk: () => penType(el.querySelector('.rp-pen'), nm) }); // 서명·거부 이력이 있어야 스킵
    el.querySelector('#rpNo').addEventListener('click', e => { e.stopPropagation(); if (!paper.classList.contains('rp-done') || paper.classList.contains('stamped') || paper._ok || el._no) return; el._no = 1; docMark('tc'); A.init(); A.typeKey(1); close(false); });
  });
}
{ const sm = switchMode; switchMode = function (m) {
    if (m === 'tour' && state.mode !== 'tour' && state.started && !tourSigned()) { // 서명해야 들어간다 · 거부하면 지금 모드 그대로
      tourContract().then(ok => { if (!ok) return; tour.signed = true; tour.startMoney = tbank; tour.shopSpent = 0; tour.lifeBuys = 0; S.set('tour', tour); sm('tour'); }); return; } // 입장 때 지갑 = 몰수 기준
    return sm.apply(this, arguments); };
  const b0 = begin; begin = function () { // 토너먼트 모드로 켜졌는데 서명 전이면: 1:1로 시작
    const need = state.mode === 'tour' && !tourSigned(); if (need) sm('vs');
    b0.apply(this, arguments); }; } // 서명 전 토너먼트로 켜지면 그냥 1:1 (서약서는 토너먼트 버튼을 눌렀을 때만)

// ── 서약 거부: 자원이라더니, 거부하면 그 자리에서 쏜다. 적힌 이름 그대로 숙청 보고서로.
const CT_GUN = `<svg viewBox="0 0 300 150"><defs><linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4b52"/><stop offset=".45" stop-color="#1c1d22"/><stop offset="1" stop-color="#08080a"/></linearGradient><linearGradient id="gw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a3620"/><stop offset="1" stop-color="#24140a"/></linearGradient><radialGradient id="gf"><stop offset="0" stop-color="#fff8d0"/><stop offset=".35" stop-color="#ffc040"/><stop offset="1" stop-color="rgba(255,90,0,0)"/></radialGradient></defs>
  <ellipse class="mz" cx="-6" cy="38" rx="46" ry="26" fill="url(#gf)"/>
  <rect x="0" y="30" width="136" height="16" rx="3" fill="url(#gm)"/><rect x="4" y="25" width="7" height="7" fill="#1c1d22"/><rect x="10" y="28" width="120" height="3" fill="#5c5e66" opacity=".6"/>
  <path d="M122 24 H206 L214 40 V78 H176 L168 90 H122 Z" fill="url(#gm)"/>
  <rect x="130" y="34" width="62" height="42" rx="8" fill="url(#gm)" stroke="#000" stroke-width="1.5"/><path d="M140 40 V70 M152 38 V72 M164 38 V72 M176 38 V72 M186 40 V70" stroke="#000" stroke-width="3" opacity=".55"/>
  <path d="M204 26 L214 8 L226 12 L218 34 Z" fill="#1c1d22"/>
  <path d="M170 78 Q168 108 196 106 Q208 104 206 80" fill="none" stroke="#1c1d22" stroke-width="5"/><path d="M186 80 Q184 94 192 100" stroke="#0e0e10" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M200 70 Q226 64 234 70 L282 132 Q284 146 266 146 L238 146 Q222 144 218 130 Z" fill="url(#gw)"/><path d="M226 88 L262 136" stroke="#1a0d05" stroke-width="2" opacity=".6"/>
</svg>`;
// 총이 들어와 겨누고 쏜다 (target 위치에 피)
async function ctShoot(target, fast) {
  clearTimeout(ctPeekT); const g = document.getElementById('ctGun') || ctGunEl(); g.classList.remove('peek'); document.body.classList.add('ct-exec');
  void g.offsetWidth; g.classList.add('in'); await sleep(fast ? 800 : 1300); A.cock && A.cock(); await sleep(fast ? 800 : 1200);
  musicCut(); A.gun(true); g.classList.add('bang');
  const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  const r = target.getBoundingClientRect(); Blood.splat(r.left + r.width * .5, r.top + r.height * .45);
  A.tinnitus && A.tinnitus(6); return g;
}
A.tear = function () { if (!this.ctx) return; const t = this.now(), b = this.bus(1, 0, .12); // 종이 찢는 소리: 짧은 섬유 끊김이 빠르게 이어짐
  for (let k = 0; k < 24; k++) this.burst(t + k * .015 + Math.random() * .01, .015 + Math.random() * .02, 'bandpass', 1600 + Math.random() * 2800, .9, .3 + Math.random() * .35, b);
  this.burst(t, .4, 'highpass', 2400, .6, .22, b); };
// 가짜 사면: 찢기거나(tear), 사면 도장 위에 처형 도장(stamp) → 총격 → 숙청 보고서
async function ctFakeKill(el, nm, how, preview) { // preview: 디버그 — 끝나면 가짜 사망 보고서 (이름 유지)
  const paper = el.querySelector('#rpPaper');
  if (how === 'tear') { await sleep(700);
    const c = paper.cloneNode(true); c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    Object.assign(c.style, { position: 'absolute', left: paper.offsetLeft + 'px', top: paper.offsetTop + 'px', width: paper.offsetWidth + 'px', height: paper.offsetHeight + 'px', margin: 0 });
    paper.classList.add('rp-half', 'rp-hl'); c.classList.add('rp-half', 'rp-hr'); el.appendChild(c); void c.offsetWidth;
    A.tear(); paper.classList.add('rp-torn'); c.classList.add('rp-torn'); await sleep(450);
  } else { await sleep(1000); paper.classList.add('stamped2'); A.stamp(); await sleep(900); }
  const g = await ctShoot(paper, true); if (how === 'stamp') paper.classList.add('rp-hit');
  await sleep(2800); el.classList.add('out'); g.style.transition = 'opacity .8s'; g.style.opacity = 0; await sleep(800);
  el.remove(); Blood.clear(); g.remove(); document.body.classList.remove('ct-exec');
  tourDeathScreen(preview ? { name: nm, f: tour.floor, best: tourBest, preview: true } : S.get('tourDeadScreen', null) || { name: nm, refuse: true });
}
// 거부 기믹: 50% 그 자리에서 사살 · 50% 가짜 사면 결정서 (그중 반은 처분 칸에서 찢기고, 반은 석방 누르면 처형 도장)
async function ctRefuse() {
  if (!CT.done || CT.exec) return; CT.exec = true;
  const v = nameInput.value.trim().replace(/\s+/g, ' '), nm = v && nameOk(v) ? v : ctName();
  A.init(); nameInput.readOnly = true; nameInput.blur(); contract.classList.add('ct-exec'); document.body.classList.add('ct-exec'); toggleDbg(false); if (!ruleOv.classList.contains('hide')) ruleClose();
  Music.stop && Music.stop(); if (A.crowdStop) A.crowdStop();
  S.set('tourDeadScreen', { name: nm, refuse: true }); // 거부하는 순간 기록 (F5로 도망 못 감)
  $('#pHint').textContent = '거부 의사가 확인되었다.'; A.typeKey(1); A.typeDing();
  const how = CT.force || (Math.random() < .5 ? 'shoot' : Math.random() < .5 ? 'tear' : 'stamp'); CT.force = null;
  if (how !== 'shoot') { // 가짜 사면
    clearTimeout(ctPeekT); const pg = document.getElementById('ctGun'); if (pg) pg.remove();
    await sleep(1100); contract.classList.add('fade'); await sleep(600); contract.classList.add('hide'); contract.classList.remove('fade', 'ct-exec');
    return tourPardonScreen({ name: nm, fake: how }); }
  await sleep(700); const g = await ctShoot(ctPaper); contract.classList.add('ct-shot');
  await sleep(2800); contract.classList.add('fade'); g.style.transition = 'opacity .8s'; g.style.opacity = 0; await sleep(900);
  Blood.clear(); g.remove(); document.body.classList.remove('ct-exec'); contract.classList.add('hide'); contract.classList.remove('fade', 'ct-exec', 'ct-shot');
  tourDeathScreen(S.get('tourDeadScreen', null) || { name: nm, refuse: true });
}
$('#refuseBtn').addEventListener('click', ctRefuse);
// 거부 버튼에 마우스를 올리면 화면 끝에 총이 슬쩍 비친다 (보일랑 말랑)
function ctGunEl() { const g = document.createElement('div'); g.id = 'ctGun'; g.innerHTML = CT_GUN; document.body.appendChild(g); return g; }
let ctPeekT = 0;
$('#refuseBtn').addEventListener('mouseenter', () => { if (!CT.done || CT.exec || contract.classList.contains('hide')) return; clearTimeout(ctPeekT);
  const g = document.getElementById('ctGun') || ctGunEl(); void g.offsetWidth; g.classList.add('peek'); });
$('#refuseBtn').addEventListener('mouseleave', () => { if (CT.exec) return; const g = document.getElementById('ctGun'); if (!g) return;
  g.classList.remove('peek'); ctPeekT = setTimeout(() => { if (!CT.exec) g.remove(); }, 1500); });

// 새로고침으로 도망쳐도 사망 화면 복귀
if (S.get('tourDeadScreen', null)) { contract.classList.add('hide'); welcome.classList.add('hide'); tourDeathScreen(S.get('tourDeadScreen')); }

// 웹게임 느낌 지우기: 우클릭 메뉴 · 드래그 · 텍스트 선택 막기 (입력칸은 예외)
document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
document.addEventListener('selectstart', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });

