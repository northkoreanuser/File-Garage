// ══════════════════ 피 (캔버스) ══════════════════
const Blood = {
  wrap: $('#blood'), st: $('#bStain'), fx: $('#bFx'), parts: [], drips: [], raf: 0,
  COL: ['#7a0008', '#6a0006', '#8c0a0f', '#5c0005', '#930d14'],
  size() {
    const d = Math.min(window.devicePixelRatio || 1, 2); this.W = innerWidth; this.H = innerHeight;
    [this.st, this.fx].forEach(c => { c.width = this.W * d; c.height = this.H * d; c.getContext('2d').setTransform(d, 0, 0, d, 0, 0); });
    this.s = this.st.getContext('2d'); this.f = this.fx.getContext('2d');
  },
  blob(x, y, R) {
    const g = this.s; g.fillStyle = '#6a0006';
    g.beginPath(); for (let a = 0; a <= Math.PI * 2 + .01; a += Math.PI / 18) { const r = R * (.7 + Math.random() * .45); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill();
    for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, d = R * (.8 + Math.random() * 1.4), r = R * (.06 + Math.random() * .22);
      g.fillStyle = pick(this.COL); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, 7); g.fill();
      g.lineWidth = r * .8; g.strokeStyle = g.fillStyle; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + Math.cos(a) * R * .6, y + Math.sin(a) * R * .6); g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); g.stroke(); }
    const rg = g.createRadialGradient(x - R * .3, y - R * .3, 2, x, y, R); rg.addColorStop(0, 'rgba(255,90,90,.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
  },
  splat(x, y) {
    cancelAnimationFrame(this.raf); this.size();
    this.wrap.style.transition = 'none'; this.wrap.style.opacity = 1;
    this.parts = []; this.drips = [];
    this.blob(x, y, 46 + Math.random() * 30);
    for (let i = 0; i < 190; i++) { const a = Math.random() * Math.PI * 2, sp = 3 + Math.pow(Math.random(), 2) * 24;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, r: .8 + Math.random() * 4.5, life: 14 + Math.random() * 40, c: pick(this.COL) }); }
    const n = 16 + rand(10);
    for (let i = 0; i < n; i++) this.drips.push({ x: Math.random() * this.W, y: -4, w: 3 + Math.random() * 10, v: .4 + Math.random() * 1.2, a: .015 + Math.random() * .05, delay: rand(50), pause: 0, c: pick(this.COL) });
    for (let i = 0; i < 9; i++) this.drips.push({ x: x + (Math.random() - .5) * 110, y: y + Math.random() * 30, w: 3 + Math.random() * 7, v: .3, a: .02 + Math.random() * .04, delay: 10 + rand(30), pause: 0, c: pick(this.COL) });
    // 화면 상단 튀김
    for (let i = 0; i < 7; i++) this.blob(Math.random() * this.W, -10 + Math.random() * 20, 14 + Math.random() * 26);
    this.loop();
  },
  loop() {
    const s = this.s, f = this.f; f.clearRect(0, 0, this.W, this.H);
    this.parts = this.parts.filter(p => {
      p.vy += .5; p.vx *= .985; const ox = p.x, oy = p.y; p.x += p.vx; p.y += p.vy; p.life--;
      f.strokeStyle = p.c; f.lineWidth = p.r * 1.6; f.lineCap = 'round'; f.beginPath(); f.moveTo(ox, oy); f.lineTo(p.x, p.y); f.stroke();
      if (p.life <= 0 || p.y > this.H) {
        const ang = Math.atan2(p.vy, p.vx); s.fillStyle = p.c; s.beginPath(); s.ellipse(p.x, p.y, p.r * 2.2, p.r * 1.3, ang, 0, 7); s.fill();
        if (p.r > 3.4 && Math.random() < .35) this.drips.push({ x: p.x, y: p.y, w: p.r * 1.1, v: .2, a: .02 + Math.random() * .03, delay: 0, pause: 0, c: p.c });
        return false; }
      return true; });
    this.drips = this.drips.filter(d => {
      if (d.delay > 0) { d.delay--; return true; }
      if (d.pause > 0) d.pause--;
      else { const ny = d.y + d.v; d.v = Math.min(d.v + d.a, 5); if (Math.random() < .012) { d.pause = 10 + rand(40); d.v *= .3; }
        s.strokeStyle = d.c; s.lineWidth = d.w; s.lineCap = 'round'; s.beginPath(); s.moveTo(d.x, d.y); s.lineTo(d.x + (Math.random() - .5) * .6, ny); s.stroke();
        d.y = ny; d.w *= .9982; }
      f.fillStyle = d.c; f.beginPath(); f.ellipse(d.x, d.y + d.w * .35, d.w * .78, d.w * 1.05, 0, 0, 7); f.fill();
      f.fillStyle = 'rgba(255,160,160,.22)'; f.beginPath(); f.arc(d.x - d.w * .25, d.y + d.w * .1, d.w * .22, 0, 7); f.fill();
      return d.y < this.H + 20 && d.w > .9; });
    if (this.parts.length || this.drips.length) this.raf = requestAnimationFrame(() => this.loop());
  },
  fade() { this.wrap.style.transition = 'opacity 1.4s'; this.wrap.style.opacity = 0;
    setTimeout(() => { if (this.wrap.style.opacity === '0') { cancelAnimationFrame(this.raf); this.parts = []; this.drips = []; this.s && this.s.clearRect(0, 0, this.W, this.H); this.f && this.f.clearRect(0, 0, this.W, this.H); } }, 1500); },
  clear() { cancelAnimationFrame(this.raf); this.parts = []; this.drips = []; this.wrap.style.opacity = 0; if (this.s) { this.s.clearRect(0, 0, this.W, this.H); this.f.clearRect(0, 0, this.W, this.H); } },
};
function bleedCard(i) {
  const b = seatEls[i].querySelector('.bleed'); b.innerHTML = '<div class="splat"></div>';
  const n = 6 + rand(5);
  for (let j = 0; j < n; j++) { const d = document.createElement('i'); d.className = 'drip';
    d.style.cssText = `left:${4 + Math.random() * 90}%;--w:${4 + Math.random() * 9}px;--h:${25 + Math.random() * 70}%;--d:${1.6 + Math.random() * 3}s;--dl:${.1 + Math.random() * .8}s`; b.appendChild(d); }
}
function showDeath(seat, lastWords, chamber) {
  const nm = $('#dzName'), chars = [...seat.name];
  const unit = chars.reduce((a, ch) => a + (/[ㄱ-힝一-鿿]/.test(ch) ? 1 : .62), 0);
  nm.style.fontSize = Math.min(innerWidth * .9 / Math.max(unit, 1.6), 280) + 'px';
  nm.innerHTML = chars.map((c, j) => `<span style="animation-delay:${.15 + j * .09}s">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('') + '<div class="dz-drips"></div>';
  const dr = nm.querySelector('.dz-drips');
  for (let j = 0; j < 12; j++) { const d = document.createElement('i');
    d.style.cssText = `left:${Math.random() * 96}%;--w:${4 + Math.random() * 10}px;--h:${30 + Math.random() * 120}px;--d:${1.4 + Math.random() * 2.4}s;--dl:${.6 + Math.random() * .8}s`; dr.appendChild(d); }
  const who = seat.kind === 'human' ? '플레이어' : PERS[seat.pers].ko;
  $('#dzSub').textContent = `${who} · ${chamber}번째 약실 · ${state.mode === 'tour' ? '지하 B' + tour.floor : state.round + '라운드'}`;
  $('#dzQuote').textContent = lastWords ? `“${lastWords}”` : '';
  $('#deathBg').classList.add('show'); $('#death').classList.add('show');
}
function hideDeath() { $('#deathBg').classList.remove('show'); $('#death').classList.remove('show'); }

