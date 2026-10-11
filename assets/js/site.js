/* Savana Jerky v2 „Studio“ – interakce stránky (bez knihoven). 3D sáček je v pouch3d.js. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);

  /* ---------- data příchutí (sdílí je i 3D sáček) ---------- */
  const FLAVORS = {
    'hovezi-classic': { line: 'Hovězí jerky', name: 'Classic', desc: 'Kýta z českého skotu s černým pepřem a česnekem.', weight: '50 g', price: '99 Kč', heat: 1 },
    'hovezi-chilli': { line: 'Hovězí jerky', name: 'Chilli', desc: 'Pikantní varianta s chipotle a uzenou paprikou.', weight: '50 g', price: '99 Kč', heat: 4 },
    'pstrosi-natural': { line: 'Pštrosí jerky', name: 'Natural', desc: 'Velmi libové pštrosí maso jen se solí a bylinkami.', weight: '40 g', price: '149 Kč', heat: 0 },
    'pstrosi-pepr': { line: 'Pštrosí jerky', name: 'Pepř', desc: 'Hrubě mletý černý pepř a rozmarýn. Prémiová specialita.', weight: '40 g', price: '149 Kč', heat: 2 },
  };
  const card = $('.flavor-card');
  const setFlavor = (id) => {
    const f = FLAVORS[id];
    if (!f) return;
    $$('.flavor-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.flavor === id)));
    card.classList.remove('is-swapping'); void card.offsetWidth; card.classList.add('is-swapping');
    $('[data-f="line"]', card).textContent = f.line;
    $('[data-f="name"]', card).textContent = f.name;
    $('[data-f="desc"]', card).textContent = f.desc;
    $('[data-f="weight"]', card).textContent = f.weight;
    $('[data-f="price"]', card).textContent = f.price;
    $('[data-f="heat"]', card).innerHTML = [0, 1, 2, 3, 4].map((i) => `<i${i < f.heat ? ' class="on"' : ''}></i>`).join('');
    const fb = $('.stage-fallback');
    if (fb) { const l = id.split('-'); fb.src = `assets/img/${l[0]}-jerky-${l[1]}-760.webp`; }
    window.dispatchEvent(new CustomEvent('jerky:flavor', { detail: id }));
  };
  $$('.flavor-tabs button').forEach((b) => b.addEventListener('click', () => setFlavor(b.dataset.flavor)));

  /* ---------- navigace ---------- */
  const nav = $('[data-nav]');
  const links = $$('.nav-links a');
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) so.observe(s); });
  }

  /* ---------- odhalení prvků ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in'); io.unobserve(e.target);
    }), { threshold: .15 });
    $$('[data-reveal]').forEach((el, i) => { el.style.setProperty('--d', `${(i % 3) * .1}s`); io.observe(el); });
  } else $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));

  /* ---------- počítadla ---------- */
  const count = (el) => {
    const to = +el.dataset.count, t0 = performance.now();
    const step = (t) => { const p = clamp((t - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduce) {
    const co = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { count(e.target); co.unobserve(e.target); } }), { threshold: .6 });
    $$('[data-count]').forEach((el) => co.observe(el));
  }

  /* ---------- karty se naklání k ruce ---------- */
  const group = $('[data-tilt-group]');
  if (group && !reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cards = $$('[data-tilt]', group);
    group.addEventListener('pointermove', (e) => {
      cards.forEach((c) => {
        const r = c.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 2), -1, 1);
        const dy = clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 2), -1, 1);
        c.style.setProperty('--ry', `${(dx * 10).toFixed(2)}deg`);
        c.style.setProperty('--rx', `${(-dy * 8).toFixed(2)}deg`);
      });
    });
    group.addEventListener('pointerleave', () => cards.forEach((c) => { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }));
  }

  /* ---------- manifest: rozdělení na slova ---------- */
  const mText = $('[data-words]');
  let words = [];
  if (mText) {
    const hot = /2,5|1 kg|jerky|bílkoviny|Vysočiny|glutamátu/i;
    const tokens = mText.textContent.trim().split(/ +/);
    mText.innerHTML = tokens.map((t) => `<span class="w${hot.test(t) ? ' hot' : ''}">${t}</span>`).join(' ');
    words = $$('.w', mText);
  }

  /* ---------- ciferník výroby ---------- */
  const clock = $('[data-clock]');
  const dial = $('.dial');
  const steps = $$('.clock-steps li');
  const TIMES = ['00:00', '01:00', '24:00', '32:00', '33:00', '34:00'];
  if (dial) { // rysky ciferníku
    const g = $('.dial-ticks', dial), ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2, major = i % 4 === 0, r1 = major ? 160 : 168, r2 = 178;
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', 200 + Math.sin(a) * r1); l.setAttribute('y1', 200 - Math.cos(a) * r1);
      l.setAttribute('x2', 200 + Math.sin(a) * r2); l.setAttribute('y2', 200 - Math.cos(a) * r2);
      if (major) l.setAttribute('class', 'major');
      g.appendChild(l);
      if (major) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', 200 + Math.sin(a) * 140); t.setAttribute('y', 200 - Math.cos(a) * 140);
        t.textContent = String((i / 2) % 24).padStart(2, '0'); g.appendChild(t);
      }
    }
  }

  /* ---------- tiskárna účtenky ---------- */
  const printer = $('[data-printer]');
  if (printer) {
    const start = () => { printer.classList.add('is-printing', 'is-printed'); setTimeout(() => printer.classList.remove('is-printing'), 3500); };
    if ('IntersectionObserver' in window && !reduce) {
      const po = new IntersectionObserver(([e]) => { if (e.isIntersecting) { start(); po.disconnect(); } }, { threshold: .35 });
      po.observe(printer);
    } else printer.classList.add('is-printed');
  }

  /* ---------- scroll smyčka ---------- */
  const drifts = reduce ? [] : $$('[data-drift]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight;
    nav.classList.toggle('is-scrolled', scrollY > 20);

    if (words.length) {
      const r = mText.getBoundingClientRect();
      const p = reduce ? 1 : clamp((vh * .85 - r.top) / (r.height + vh * .35));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    }
    for (const d of drifts) {
      const r = d.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      d.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * +d.dataset.drift).toFixed(1)}px`;
    }
    if (clock && dial) {
      const r = clock.getBoundingClientRect();
      const sticky = getComputedStyle($('.clock-sticky')).position === 'sticky';
      const p = sticky ? clamp(-r.top / (r.height - vh)) : clamp((vh * .8 - r.top) / r.height);
      dial.style.setProperty('--p', p.toFixed(4));
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length * .999));
      steps.forEach((s, i) => { s.classList.toggle('is-active', i === idx); s.classList.toggle('is-done', i < idx); });
      $('[data-dial-time]').textContent = TIMES[idx];
      $('[data-dial-label]').textContent = $('span', steps[idx]).textContent;
    }
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  onScroll();

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
