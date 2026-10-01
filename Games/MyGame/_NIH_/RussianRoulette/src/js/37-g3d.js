// ══════════════════ 3D 무대: 테이블 + 실측 리볼버 (Three.js) ══════════════════
// 게임 로직은 그대로. 2D 실린더(DOM) 상태를 매 프레임 읽어 3D로 그린다. THREE가 없으면 2D 그대로.
// 총은 실제 게임용 3D 에셋(CC0, loafbrr_1)을 그대로 쓴다: 텍스처·노멀맵·리그(공이치기·방아쇠·크레인·실린더·탄 6발).
// 실린더 뒷면은 실총처럼 프레임(리코일 실드)에 가려 있고, 장전할 때 크레인이 스윙아웃해야 보인다.
const G3D = (() => {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader || typeof REVOLVER_GLB_B64 === 'undefined') return null;
  if (typeof THREE === 'undefined') return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  const area = $('.cyl-area'), cv = renderer.domElement; cv.className = 'g3d-cv'; area.appendChild(cv);
  document.body.classList.add('g3d');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 200);
  const CAM0 = new THREE.Vector3(0, 11.5, 11.8), LOOK = new THREE.Vector3(0, -2.2, -.2);

  // ── 반사용 환경맵
  { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.background = new THREE.Color(0x050403);
    const box = (c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); es.add(m); };
    box(0xfff0d0, 0, 6, 0, 3, .2, 3); box(0x7a1810, -6, 1, 0, .2, 6, 8); box(0x2a1e14, 6, 0, 0, .2, 6, 8); box(0x6a5030, 0, 1, 7, 6, 3, .2); box(0xffffff, 3, 4, -5, 2, 1, .2);
    scene.environment = pm.fromScene(es, .04).texture; pm.dispose(); }

  // ── 절차적 텍스처
  const canvasTex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } t.anisotropy = 4; return t; };
  const woodTex = (base, dark, lines, check) => canvasTex(512, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < lines; i++) { const y = Math.random() * h; g.strokeStyle = `rgba(${dark},${.08 + Math.random() * .22})`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 6 + (Math.random() - .5) * 3); g.stroke(); }
    if (check) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2; for (let k = -w; k < w * 2; k += 7) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); } } }, 1);
  const tableTex = woodTex('#2a170c', '10,4,1', 90);
  const feltTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#0e2a1c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '60,110,80'},${Math.random() * .25})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } }, 6);
  const gripTexSW = woodTex('#5a2a12', '25,8,2', 70, true); gripTexSW.repeat.set(.09, .09);
  const gripTexNG = woodTex('#4a2410', '20,6,1', 60, true); gripTexNG.repeat.set(.09, .09);

  // ── 재질
  const M = {
    blue: new THREE.MeshStandardMaterial({ color: 0x191d24, metalness: .92, roughness: .3, envMapIntensity: 1.0 }),
    blueW: new THREE.MeshStandardMaterial({ color: 0x232830, metalness: .92, roughness: .42, envMapIntensity: .9 }), // 닳은 부분
    steel: new THREE.MeshStandardMaterial({ color: 0x5a616b, metalness: 1, roughness: .26, envMapIntensity: 1.2 }),
    case: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 1, roughness: .35 }), // 공이치기·방아쇠 (케이스 하드닝 느낌)
    dark: new THREE.MeshStandardMaterial({ color: 0x030304, metalness: .3, roughness: .9 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd6a347, metalness: 1, roughness: .28, envMapIntensity: 1.4 }),
    primer: new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 1, roughness: .25 }),
    lead: new THREE.MeshStandardMaterial({ color: 0x6d6a66, metalness: .6, roughness: .5 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a24c, metalness: 1, roughness: .3 }),
    woodSW: new THREE.MeshStandardMaterial({ map: gripTexSW, metalness: .02, roughness: .6 }),
    woodNG: new THREE.MeshStandardMaterial({ map: gripTexNG, metalness: .02, roughness: .65 }),
    soot: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .75, depthWrite: false }),
  };

  // ── 조명
  scene.add(new THREE.AmbientLight(0x3a2c22, .35));
  const lamp = new THREE.SpotLight(0xffe2b0, 2.8, 40, .6, .55, 1.2); lamp.position.set(.4, 12, 3); lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.0004; lamp.shadow.radius = 4; scene.add(lamp); scene.add(lamp.target); lamp.target.position.set(0, -3, 0);
  const rim = new THREE.PointLight(0xff3a20, .45, 22); rim.position.set(-6, 1, -6); scene.add(rim);
  const fill = new THREE.PointLight(0x9ab0d0, .6, 22); fill.position.set(6, 3, 8); scene.add(fill);
  const flashL = new THREE.PointLight(0xffb060, 0, 14, 2); scene.add(flashL);

  // ── 테이블
  const TY = -4.2;
  { const felt = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshStandardMaterial({ map: feltTex, roughness: .95, metalness: 0 }));
    felt.rotation.x = -Math.PI / 2; felt.position.y = TY; felt.receiveShadow = true; scene.add(felt);
    const rimM = new THREE.MeshStandardMaterial({ map: tableTex, roughness: .45, metalness: .1 });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(30, .5, 1.2), rimM); edge.position.set(0, TY + .1, 6.3); edge.receiveShadow = true; scene.add(edge);
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .08, 32), M.brass); c.position.set(3.6 + (i % 2) * .12, TY + .05 + i * .085, 3.0 - (i % 3) * .06); c.castShadow = true; c.receiveShadow = true; scene.add(c); } }

  // ══ 리볼버 (GLB 에셋) ══
  const U = 22; // 1m → 22 무대 단위 (에셋 전장 약 34cm → 7.5)
  const gun = new THREE.Group(); scene.add(gun);            // 포즈 (테이블 · 장전 · 조준)
  const kickG = new THREE.Group(); gun.add(kickG);          // 반동
  const wrap = new THREE.Group(); wrap.scale.setScalar(U); wrap.rotation.y = Math.PI; kickG.add(wrap); // 에셋 좌표(m, 총구 +z) → 무대(총구 -z)
  let model = null;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  // 애니메이션 클립에서 관절의 순간 변환을 뽑는다
  function sampleM(clip, name, t) { const p = V3(), q = new THREE.Quaternion(), s = V3(1, 1, 1);
    clip.tracks.forEach(tr => { const k = tr.name.lastIndexOf('.'), n = tr.name.slice(0, k), prop = tr.name.slice(k + 1); if (n !== name) return;
      const v = Array.from(tr.createInterpolant().evaluate(t)); if (prop === 'position') p.fromArray(v); else if (prop === 'quaternion') q.fromArray(v); else if (prop === 'scale') s.fromArray(v); });
    return new THREE.Matrix4().compose(p, q, s); }
  // 순수 회전 + 이동 → 회전축 · 각도 · 피벗
  function pivotOf(M) { const p = V3(), q = new THREE.Quaternion(), s = V3(); M.decompose(p, q, s);
    let ax = V3(q.x, q.y, q.z); if (ax.lengthSq() < 1e-10) return { ax: V3(0, 0, 1), ang: 0, P: V3() };
    const ang = 2 * Math.acos(Math.min(1, Math.abs(q.w))); ax.normalize(); if (q.w < 0) ax.negate();
    const e = new THREE.Matrix4().makeRotationFromQuaternion(q).elements;
    const A = new THREE.Matrix3().set(1 - e[0] + ax.x * ax.x, -e[4] + ax.x * ax.y, -e[8] + ax.x * ax.z, -e[1] + ax.y * ax.x, 1 - e[5] + ax.y * ax.y, -e[9] + ax.y * ax.z, -e[2] + ax.z * ax.x, -e[6] + ax.z * ax.y, 1 - e[10] + ax.z * ax.z);
    return { ax, ang, P: p.clone().applyMatrix3(A.invert()) }; }
  const rotAbout = (ax, ang, P) => new THREE.Matrix4().makeTranslation(P.x, P.y, P.z).multiply(new THREE.Matrix4().makeRotationAxis(ax, ang)).multiply(new THREE.Matrix4().makeTranslation(-P.x, -P.y, -P.z));
  const setBone = (b, M, sc = 1) => { if (!b) return; M.decompose(b.position, b.quaternion, b.scale); b.scale.multiplyScalar(sc); };

  function initModel(g) {
    const root = g.scene, clips = {}; g.animations.forEach(c => clips[c.name] = c);
    const B = n => root.getObjectByName(n);
    const handle = 'DEF_RevolverHandle';
    const relTo = (clip, name, t) => new THREE.Matrix4().copy(sampleM(clip, handle, t)).invert().multiply(sampleM(clip, name, t));
    const hinge = pivotOf(relTo(clips.Reload, 'DEF_ReloadingHinge', .333));
    const step = pivotOf(relTo(clips.Shoot, 'DEF_Cylinder', .45));
    const ham = pivotOf(relTo(clips.Shoot, 'DEF_Hammer', .115));
    const trg = pivotOf(relTo(clips.Shoot, 'DEF_Trigger', .1));
    let gunMesh = null, ammo = null;
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.name === 'gun' || (o.material && o.material.name === 'gun')) gunMesh = o; else ammo = o; }
      if (o.material) { o.material.envMapIntensity = 1.0; o.material.color.setScalar(.85); } }); // 알베도 한 톤 낮춤
    // 탄 관절별 위치 (약실 배치)
    const pos = ammo.geometry.attributes.position, si = ammo.geometry.attributes.skinIndex, sw = ammo.geometry.attributes.skinWeight, bonesArr = ammo.skeleton.bones;
    const acc = {};
    for (let k = 0; k < pos.count; k++) { let bi = si.getX(k), w = sw.getX(k); [['getY'], ['getZ'], ['getW']].forEach(([f]) => { if (sw[f](k) > w) { w = sw[f](k); bi = si[f](k); } });
      const nm = bonesArr[bi].name; const a = acc[nm] || (acc[nm] = { x: 0, y: 0, n: 0, zmin: 1e9, zmax: -1e9 }); a.x += pos.getX(k); a.y += pos.getY(k); a.n++; a.zmin = Math.min(a.zmin, pos.getZ(k)); a.zmax = Math.max(a.zmax, pos.getZ(k)); }
    const Pc = step.P.clone(), axC = V3(0, 0, 1);
    const ring = (prefix) => Object.keys(acc).filter(n => n.startsWith(prefix) && !(prefix === 'DEF_Bullet' && n.startsWith('DEF_BulletFired'))).map(n => { const a = acc[n], x = a.x / a.n, y = a.y / a.n;
      let ang = Math.atan2(-(x - Pc.x), y - Pc.y); if (ang < 0) ang += Math.PI * 2; return { name: n, bone: B(n), ang, x, y, rear: a.zmin, r: Math.hypot(x - Pc.x, y - Pc.y) }; }).sort((a, b) => a.ang - b.ang);
    const live = ring('DEF_Bullet'), fired = ring('DEF_BulletFired');
    const rc = live.reduce((s, b) => s + b.r, 0) / live.length, rear = live.reduce((s, b) => Math.min(s, b.rear), 1);
    gunMesh.geometry.computeBoundingBox(); const bb = gunMesh.geometry.boundingBox;
    const boreY = Pc.y + rc;
    wrap.add(root);
    { const c = bb.getCenter(V3()); wrap.position.set(c.x * U, -c.y * U, c.z * U); } // 모델 중심을 포즈 원점에
    model = { root, B, hinge, ham, trg, Pc, axC, live, fired, rc, rear, bb, boreY,
      muzzle: V3(0, boreY, bb.max.z + .002), halfT: Math.max(Math.abs(bb.min.x), bb.max.x) * U,
      bones: { handle: B(handle), hinge: B('DEF_ReloadingHinge'), cyl: B('DEF_Cylinder'), ham: B('DEF_Hammer'), trg: B('DEF_Trigger') } };
    // 총구 화염: 총열 축을 품은 십자 판 3장 + 정면 별 모양 (가산 합성)
    { const star = canvasTex(128, 128, (g, w) => { g.translate(64, 64); for (let k = 0; k < 9; k++) { g.rotate(Math.PI * 2 / 9); const L = 30 + Math.random() * 34; const gr = g.createLinearGradient(0, 0, 0, -L); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(.35, 'rgba(255,200,90,.9)'); gr.addColorStop(1, 'rgba(255,90,10,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-5, 0); g.lineTo(0, -L); g.lineTo(5, 0); g.fill(); }
        const r = g.createRadialGradient(0, 0, 0, 0, 0, 22); r.addColorStop(0, 'rgba(255,255,240,1)'); r.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = r; g.fillRect(-22, -22, 44, 44); });
      const cone = canvasTex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(.3, 'rgba(255,190,80,.95)'); gr.addColorStop(1, 'rgba(255,80,10,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2 - 6, h); g.quadraticCurveTo(0, h * .45, w / 2, 0); g.quadraticCurveTo(w, h * .45, w / 2 + 6, h); g.fill(); });
      const mf = new THREE.Group(), mk = (map, w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      [0, 1, 2].forEach(k => { const m = mk(cone, .045, .14); m.rotation.x = Math.PI / 2; m.position.z = .07; const w2 = new THREE.Group(); w2.add(m); w2.rotation.z = k * Math.PI / 3; mf.add(w2); });
      const front = mk(star, .11, .11); front.position.z = .004; mf.add(front);
      mf.position.copy(model.muzzle); mf.visible = false; wrap.add(mf); model.mflash = mf; }
    snapDirty = true;
  }
  new THREE.GLTFLoader().parse(Uint8Array.from(atob(REVOLVER_GLB_B64), c => c.charCodeAt(0)).buffer, '', initModel, e => { console.warn('revolver glb', e); document.body.classList.remove('g3d'); cv.remove(); });

  // 약실 i(게임) → 에셋의 탄 관절: 6발은 그대로, 5·7발은 가장 가까운 각도의 약실
  const slotOf = (arr, i) => { const a = i * Math.PI * 2 / state.N; let best = arr[0], d = 9; arr.forEach(b => { const x = Math.abs(Math.atan2(Math.sin(b.ang - a), Math.cos(b.ang - a))); if (x < d) { d = x; best = b; } }); return best; };
  let hamA = 0, open = 0, cylM = new THREE.Matrix4(), hingeM = new THREE.Matrix4();
  function pose(theta, openAmt, cock) {
    const m = model, Bn = m.bones;
    hingeM = rotAbout(m.hinge.ax, m.hinge.ang * openAmt, m.hinge.P);
    cylM = hingeM.clone().multiply(rotAbout(m.axC, theta, m.Pc));
    setBone(Bn.handle, new THREE.Matrix4()); setBone(Bn.hinge, hingeM); setBone(Bn.cyl, cylM);
    setBone(Bn.ham, rotAbout(m.ham.ax, m.ham.ang * cock, m.ham.P)); setBone(Bn.trg, rotAbout(m.trg.ax, m.trg.ang * cock * .5, m.trg.P));
    // 탄: 장전된 약실만 보이게 (게임 약실 수와 에셋 6발 대응)
    const showLive = new Set(), showFired = new Set();
    for (let i = 0; i < state.N; i++) { const e = chEl(i); if (!e) continue; const cl = e.classList;
      if (cl.contains('reveal')) showFired.add(slotOf(m.fired, i).name); else if (cl.contains('loaded') || cl.contains('dbg')) showLive.add(slotOf(m.live, i).name); }
    m.live.forEach(b => setBone(b.bone, cylM, showLive.has(b.name) ? 1 : 0));
    m.fired.forEach(b => setBone(b.bone, cylM, showFired.has(b.name) ? 1 : 0));
  }
  const chamberRear = i => { const b = slotOf(model.live, i); return V3(b.x, b.y, b.rear).applyMatrix4(cylM); };

  // ── 탄 모형 (날아드는 탄 · 튀는 탄피) — 에셋 좌표(m)
  function makeRound(spent) { const g = new THREE.Group(), len = .029, cr = .0047;
    const cs = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr, len, 20), M.brass); cs.rotation.x = Math.PI / 2; cs.position.z = len / 2; g.add(cs);
    const rm = new THREE.Mesh(new THREE.CylinderGeometry(.0056, .0056, .0013, 24), M.brass); rm.rotation.x = Math.PI / 2; g.add(rm);
    const pr = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, .0004, 16), M.primer); pr.rotation.x = Math.PI / 2; pr.position.z = -.0007; g.add(pr);
    if (!spent) { const nz = new THREE.Mesh(new THREE.SphereGeometry(cr * .97, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.lead); nz.rotation.x = Math.PI / 2; nz.position.z = len; nz.scale.set(1, 1.5, 1); g.add(nz); }
    g.traverse(o => o.castShadow = true); return g; }
  const flying = [];

  // ── 연기 · 섬광
  const smokeTex = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(210,205,200,.55)'); r.addColorStop(1, 'rgba(210,205,200,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const smokes = [];
  const muzzleWorld = () => wrap.localToWorld(model.muzzle.clone());
  function puff(n = 16) { if (!model) return; const muz = muzzleWorld();
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); s.position.copy(muz); s.scale.setScalar(.4);
      scene.add(s); smokes.push({ s, t: 0, life: 2 + Math.random() * 1.6, v: V3((Math.random() - .5) * .8, .6 + Math.random() * .7, (Math.random() - .3) * .8), g: .8 + Math.random() * 1.6 }); } }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,250,220,1)'); r.addColorStop(.3, 'rgba(255,170,60,.8)'); r.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.scale.setScalar(3); scene.add(glow);

  // ── 2D 신호 → 3D
  let kick = 0, nudge = 0, flash = 0;
  cylWrap.addEventListener('animationstart', e => { if (e.animationName === 'kick') kick = 1; else if (e.animationName === 'nudge2') nudge = 1; });
  $('#muzzle').addEventListener('animationstart', () => { flash = 1; puff(); if (model && model.mflash) { model.mflash.rotation.z = Math.random() * Math.PI; model.mflash.scale.set(.8 + Math.random() * .5, .8 + Math.random() * .5, .8 + Math.random() * .7); } });
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (!n.classList || !model) return;
    if (n.classList.contains('round-in')) { // 장전: 스윙아웃한 실린더의 맨 위 약실로 한 발
      const r = makeRound(false); wrap.add(r); const i = topIdx();
      flying.push({ obj: r, t: 0, dur: .55, kind: 'in', i, off: V3(0, .035, -.13) });
    } else if (n.classList.contains('casing')) { // 탄피: 추출봉에 밀려 튀어나온다
      const r = makeRound(true), wp = wrap.localToWorld(chamberRear(topIdx()));
      r.position.copy(wp); r.quaternion.copy(wrap.getWorldQuaternion(new THREE.Quaternion())); r.scale.setScalar(U); scene.add(r);
      flying.push({ obj: r, t: 0, dur: 2.4, kind: 'out', v: V3((Math.random() < .5 ? -1 : 1) * (1.5 + Math.random() * 1.5), 3 + Math.random() * 1.5, 1 + Math.random()), w: V3(Math.random() * 14, Math.random() * 14, Math.random() * 14) });
    }
  }))).observe(cylWrap.parentNode, { childList: true, subtree: true });

  function fit() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  new ResizeObserver(fit).observe(cv); fit();

  // ── 포즈 (무대 좌표: 총구 -z, 위 +y, 총의 오른쪽 +x)
  const eTmp = new THREE.Euler(), pTarget = V3(), qTarget = new THREE.Quaternion();
  const quatYXZ = (yaw, pitch, roll) => new THREE.Quaternion().setFromEuler(eTmp.set(pitch, yaw, roll, 'YXZ'));
  function poseTable(sd) { // 오른쪽 옆면을 펠트에 대고 눕힌다 → 총구가 차례인 사람 쪽
    qTarget.copy(quatYXZ(sd * (Math.PI / 2 - .2), 0, 0).multiply(quatYXZ(0, 0, -Math.PI / 2)));
    pTarget.set(-sd * .4, TY + model.halfT + .02, .3); }
  function poseLoad() { pTarget.set(.3, TY + 4.4, 1.8); qTarget.copy(quatYXZ(-.7, -1.15, .5)); } // 총을 들어 총구를 아래로 → 스윙아웃한 실린더 뒷면이 카메라로
  function poseAim(sd) { pTarget.set(-sd * .6, TY + 3.0, 1.0); qTarget.copy(quatYXZ(sd * 1.1, .12, 0)); } // 들어 올려 그 사람 쪽으로

  // ── 관자놀이 총 이미지: 같은 3D 에셋을 왼쪽 옆에서 찍는다 (공이치기 젖힘)
  let snapDirty = false; let snapURL = null;
  const imgs = seatEls.map(el => { const im = document.createElement('img'); im.className = 'gunpt gunimg'; im.alt = ''; el.appendChild(im); return im; });
  function snapshot() {
    snapDirty = false;
    if (snapURL) { imgs.forEach(im => im.src = snapURL); document.body.classList.add('g3dimg'); return; }
    const W = 600, H = 352, keep = [];
    scene.children.forEach(o => { if (o !== gun && !o.isLight) { keep.push([o, o.visible]); o.visible = false; } });
    const gp = gun.position.clone(), gq = gun.quaternion.clone();
    const wp0 = wrap.position.clone(); wrap.position.set(0, 0, 0);
    gun.position.set(0, 0, 0); gun.quaternion.identity(); kickG.position.set(0, 0, 0); kickG.rotation.set(0, 0, 0);
    pose(0, 0, 1); gun.updateMatrixWorld(true);
    const bb = model.bb, zm = -bb.max.z * U, zr = -bb.min.z * U + .1, yTop = (bb.max.y + .012) * U, yBot = bb.min.y * U - .1, yMz = model.boreY * U;
    const Hd = Math.max((zr - zm) / .94 / (W / H), (yTop - yMz) / .3, (yMz - yBot) / .66), Wd = Hd * W / H;
    const left = zm - .03 * Wd, top = yMz + .32 * Hd;
    const oc = new THREE.OrthographicCamera(left, left + Wd, top, top - Hd, .1, 100); oc.position.set(-30, 0, 0); oc.up.set(0, 1, 0); oc.lookAt(0, 0, 0);
    const key = new THREE.DirectionalLight(0xf4f0ea, 1.1); key.position.set(-10, 8, 4); scene.add(key);
    const kr = new THREE.DirectionalLight(0x8090a8, .5); kr.position.set(-4, -2, -10); scene.add(kr);
    const pr = renderer.getPixelRatio(), sz = renderer.getSize(new THREE.Vector2()), vis = lamp.visible;
    renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0); lamp.visible = false;
    renderer.render(scene, oc); snapURL = cv.toDataURL('image/png');
    lamp.visible = vis; scene.remove(key); scene.remove(kr); renderer.setPixelRatio(pr); renderer.setSize(sz.x, sz.y, false);
    keep.forEach(([o, v]) => o.visible = v); gun.position.copy(gp); gun.quaternion.copy(gq); wrap.position.copy(wp0);
    imgs.forEach(im => im.src = snapURL); document.body.classList.add('g3dimg');
  }

  // ── 매 프레임
  const clock = new THREE.Clock(); let T = 0, sideWant = 1, first = true;
  function cssAngle(el) { const m = getComputedStyle(el).transform; if (!m || m === 'none') return 0; const v = m.match(/matrix\(([^)]+)\)/); if (!v) return 0; const p = v[1].split(',').map(parseFloat); return Math.atan2(p[1], p[0]); }
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden || !document.body.classList.contains('g3d')) return; // 2D 표시 중엔 렌더링 쉼
    const dt = Math.min(clock.getDelta(), .05); T += dt;
    if (!model) { renderer.render(scene, cam); return; }
    if (snapDirty) snapshot();
    const cocked = hammer.classList.contains('cocked'); hamA += ((cocked ? 1 : 0) - hamA) * (cocked ? .3 : .6);
    const isOpen = cylWrap.classList.contains('open'); open += ((isOpen ? 1 : 0) - open) * Math.min(1, dt * 7);
    pose(cssAngle(cylRot), open, hamA);
    // 포즈 결정
    const aimI = seatEls.findIndex(el => el.classList.contains('aim'));
    const want = state.seats && state.seats.length && state.turn === 1 ? -1 : 1;
    if (want !== sideWant) { sideWant = want; if (A.ctx && open < .1 && aimI < 0) A.tick(); }
    const F = window.__g3dForce; // (테스트용) 포즈 강제
    if (F) { if (F.open != null) { open = F.open; pose(cssAngle(cylRot), open, hamA); } F.pose === 'load' ? poseLoad() : F.pose === 'aim' ? poseAim(F.side || 1) : poseTable(F.side || 1); if (F.q) qTarget.copy(quatYXZ(...F.q)); if (F.p) pTarget.set(...F.p); }
    else if (open > .05 || isOpen) poseLoad(); else if (aimI >= 0) poseAim(aimI === 0 ? 1 : -1); else poseTable(sideWant);
    const k = first || F ? 1 : Math.min(1, dt * 5); first = false;
    gun.position.lerp(pTarget, k); gun.quaternion.slerp(qTarget, k);
    kick *= .86; nudge *= .82;
    kickG.rotation.x = kick * .45; kickG.position.z = kick * .6; kickG.position.y = nudge * .15;
    if (aimI >= 0) { const sh = cocked ? .06 : .03; kickG.position.x = (Math.random() - .5) * sh; kickG.position.y += (Math.random() - .5) * sh; } else kickG.position.x = 0; // 손 떨림
    // 섬광
    gun.visible = !document.body.classList.contains('cointoss'); // 동전 던질 때는 총이 아직 테이블에 없다
    if (model.mflash) { model.mflash.visible = flash > .25; model.mflash.children.forEach(c => c.traverse(o => { if (o.material) o.material.opacity = Math.min(1, flash * 1.3); })); }
    flash *= .8; flashL.intensity = flash * 10; { const m = muzzleWorld(); flashL.position.copy(m); glow.position.copy(m); } glow.material.opacity = flash; glow.scale.setScalar(2 + flash * 3);
    // 전등 · 카메라
    lamp.position.x = .4 + Math.sin(T * .9) * .8; lamp.intensity = 2.7 + Math.sin(T * 13) * .04 + (Math.random() < .004 ? -1.2 : 0);
    cam.position.set(CAM0.x + Math.sin(T * .35) * .2 + (Math.random() - .5) * kick * .35, CAM0.y + Math.sin(T * .5) * .08 + (Math.random() - .5) * kick * .35, CAM0.z); cam.lookAt(LOOK);
    // 날아가는 탄 · 탄피
    for (let q = flying.length - 1; q >= 0; q--) { const f = flying[q]; f.t += dt; const u = Math.min(1, f.t / f.dur);
      if (f.kind === 'in') { const to = chamberRear(f.i), from = to.clone().add(f.off), e2 = 1 - Math.pow(1 - u, 3);
        f.obj.position.lerpVectors(from, to, e2); f.obj.quaternion.setFromRotationMatrix(cylM);
        if (u >= 1) { wrap.remove(f.obj); flying.splice(q, 1); } }
      else { f.v.y -= 9.8 * dt; f.obj.position.addScaledVector(f.v, dt); f.obj.rotation.x += f.w.x * dt; f.obj.rotation.y += f.w.y * dt; f.obj.rotation.z += f.w.z * dt;
        if (f.obj.position.y < TY + .2) { f.obj.position.y = TY + .2; f.v.y *= -.35; f.v.x *= .6; f.v.z *= .6; f.w.multiplyScalar(.5); }
        if (u >= 1) { scene.remove(f.obj); flying.splice(q, 1); } } }
    for (let q = smokes.length - 1; q >= 0; q--) { const p = smokes[q]; p.t += dt; const u = p.t / p.life;
      p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(.985); p.s.scale.setScalar(.5 + u * 3.2 * p.g); p.s.material.opacity = (u < .1 ? u / .1 : 1 - u) * .5;
      if (u >= 1) { scene.remove(p.s); p.s.material.dispose(); smokes.splice(q, 1); } }
    renderer.render(scene, cam);
  }
  frame();
  return { scene, get model() { return model; } };
})();
// 총은 3D 전용 (2D 그림은 삭제). 3D를 못 띄우는 환경이면 안내만 띄우고 게임은 확률 표시로 진행된다.
if (!G3D) $('.cyl-area').insertAdjacentHTML('beforeend', '<div class="no3d">이 환경에선 3D 총을 띄울 수 없다<br>(WebGL 미지원) — 게임은 그대로 진행된다</div>');
