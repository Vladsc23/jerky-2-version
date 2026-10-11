/* Savana Jerky v2 – interaktivní 3D sáček ve „studiu“.
   Tažením myší/prstem ho otočíte, sám se lehce pohupuje, při změně příchutě se protočí a vymění etiketu.
   Když WebGL nebo knihovna nejsou k dispozici, zůstane vidět statický obrázek sáčku. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.querySelector('[data-stage]');
const canvas = stage && stage.querySelector('.stage-canvas');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-3, 5, 4.5);
  const rim = new THREE.DirectionalLight(0xffd29a, 2.2); rim.position.set(4.5, 3, -4);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(3, 1, 5);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  camera.position.set(0, 0.9, 5.2);
  camera.lookAt(0, 0.78, 0);

  /* ---------- geometrie sáčku (stand-up pouch) ---------- */
  const PW = 1, PH = 1.55, PT = 0.15, NU = 90, NV = 130;
  const clamp = (x, a = 0, b = 1) => Math.min(Math.max(x, a), b);
  const surface = (sgn, ph) => {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < NU; i++) {
      const U = i / (NU - 1);
      for (let j = 0; j < NV; j++) {
        const V = j / (NV - 1);
        const uu = clamp((U - 0.035) / 0.93), vv = clamp(V / 0.885);
        const bx = Math.pow(Math.max(1 - Math.pow(Math.abs(2 * uu - 1), 3.2), 0), 0.5);
        const by = Math.pow(Math.max(1 - Math.pow(vv, 2.6), 0), 0.62);
        let z = PT * bx * by;
        if (z > 0) z += bx * (0.0032 * Math.sin(15 * U + 6 * V + ph) * Math.sin(10 * V + ph * 2) + 0.0022 * Math.sin(29 * U - 12 * V + ph * 3));
        pos.push((U - 0.5) * PW, V * PH, sgn * z);
        uv.push(sgn > 0 ? U : 1 - U, V);
      }
    }
    for (let i = 0; i < NU - 1; i++) for (let j = 0; j < NV - 1; j++) {
      const a = i * NV + j, b = a + NV;
      if (sgn > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return { g, pos };
  };
  const front = surface(1, 1.3), back = surface(-1, 4.1);
  const bottom = (() => {
    const pos = [], uv = [], idx = [];
    for (const s of [front, back]) for (let i = 0; i < NU; i++) { const k = i * NV * 3; pos.push(s.pos[k], 0, s.pos[k + 2]); uv.push(i / (NU - 1), 0.004); }
    for (let i = 0; i < NU - 1; i++) idx.push(i, NU + i, i + 1, i + 1, NU + i, NU + i + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  })();
  const mat = () => new THREE.MeshPhysicalMaterial({ roughness: 0.4, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.2 });
  const mFront = mat(), mBack = mat(), mBottom = mat(); mBottom.side = THREE.DoubleSide;
  const pivot = new THREE.Group();          // otáčí se kolem středu sáčku
  const pouch = new THREE.Group();
  pouch.add(new THREE.Mesh(front.g, mFront), new THREE.Mesh(back.g, mBack), new THREE.Mesh(bottom, mBottom));
  pouch.position.y = -PH / 2;
  pivot.add(pouch); pivot.position.y = PH / 2 + 0.02;
  scene.add(pivot);

  /* ---------- textury etiket ---------- */
  const loader = new THREE.TextureLoader();
  const cache = {};
  const load = (url) => new Promise((ok, err) => loader.load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); ok(t);
  }, undefined, err));
  const textures = (id) => cache[id] || (cache[id] = Promise.all([load(`assets/tex/${id}.jpg`), load(`assets/tex/${id}-zadni.jpg`)]));
  const apply = ([f, b]) => { mFront.map = f; mBottom.map = f; mBack.map = b; for (const m of [mFront, mBack, mBottom]) m.needsUpdate = true; };

  /* ---------- velikost ---------- */
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // sáček se vždy vejde na výšku i šířku plátna
    const fitH = 1.9 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const fitW = 1.5 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.position.z = Math.max(fitH, fitW) + 0.2;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);

  /* ---------- ovládání: tažení + setrvačnost ---------- */
  let rotY = -0.35, vel = 0, tiltX = 0, dragging = false, lastX = 0, lastY = 0, idleT = 0, spin = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId);
    stage.classList.add('was-dragged');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vel = dx * 0.012; rotY += vel;
    tiltX = clamp(tiltX + dy * 0.004, -0.35, 0.35);
    idleT = 0;
  });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  /* ---------- změna příchutě: rychlé protočení, etiketa se vymění v půlce ---------- */
  let pending = null;
  window.addEventListener('jerky:flavor', async (e) => {
    const tex = await textures(e.detail);
    if (reduce) { apply(tex); return; }
    pending = tex; spin = Math.PI * 2;
  });

  let visible = true, raf = 0, last = performance.now(), t = 0;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    if (!dragging) {
      vel *= 0.94; rotY += vel;
      idleT += dt;
      if (idleT > 1.5 && Math.abs(vel) < 0.002 && !reduce) rotY += (Math.sin(t * 0.6) * 0.45 - 0.2 - rotY) * 0.01; // klidné pohupování
      tiltX *= 0.92;
    }
    if (spin > 0) {
      const step = Math.min(spin, dt * 9);
      const before = spin; spin -= step;
      if (pending && before > Math.PI && spin <= Math.PI) { apply(pending); pending = null; } // sáček je k nám zády
    }
    pivot.rotation.y = rotY + (Math.PI * 2 - spin) % (Math.PI * 2);
    pivot.rotation.x = tiltX + (reduce ? 0 : Math.sin(t * 1.1) * 0.025);
    pivot.position.y = PH / 2 + 0.02 + (reduce ? 0 : Math.sin(t * 1.4) * 0.025);
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(frame);
  }

  textures('hovezi-classic').then((tex) => {
    apply(tex); resize(); raf = requestAnimationFrame(frame);
    stage.classList.add('is-3d');
    ['hovezi-chilli', 'pstrosi-natural', 'pstrosi-pepr'].forEach((id) => setTimeout(() => textures(id), 1500)); // přednačtení
  });
}

if (canvas) {
  try {
    const test = document.createElement('canvas');
    if (test.getContext('webgl2') || test.getContext('webgl')) start();
  } catch (e) { console.warn('3D sáček není k dispozici, zobrazuji obrázek.', e); }
}
