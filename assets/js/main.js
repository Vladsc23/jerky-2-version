/* Savana Jerky – interakce a přechody (bez knihoven) */
(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = $('.site-header');

  /* ---------- mobilní menu ---------- */
  const toggle = $('.nav-toggle');
  const setNav = (open) => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
  $$('.site-nav a').forEach((a) => a.addEventListener('click', () => setNav(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

  /* ---------- odhalování obsahu při scrollu ---------- */
  $$('[data-stagger]').forEach((group) => {
    $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 6) * 0.09}s`));
  });
  const finishReveal = (el) => {
    // po doběhnutí animace vrátíme prvku jeho vlastní hover přechody
    const delay = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
    setTimeout(() => { el.removeAttribute('data-reveal'); el.style.removeProperty('--d'); }, (delay + 1.15) * 1000);
  };
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        finishReveal(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    $$('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    $$('[data-reveal]').forEach((el) => { el.classList.add('is-visible'); el.removeAttribute('data-reveal'); });
  }

  /* ---------- počítadla čísel ---------- */
  const fmt = (n, dec) => n.toLocaleString('cs-CZ', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const runCounter = (el) => {
    const to = parseFloat(el.dataset.countTo);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = fmt(to, dec); return; }
    const t0 = performance.now(), dur = 1600;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(to * e, dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCounter(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$('[data-count-to]').forEach((el) => co.observe(el));
  }

  /* ---------- aktivní položka menu ---------- */
  const navLinks = $$('.site-nav ul a');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => so.observe(s));
  }

  /* ---------- scroll: hlavička, progres, parallax, časová osa ---------- */
  const progress = $('.scroll-progress');
  const toTop = $('.to-top');
  const parallax = reduceMotion ? [] : $$('[data-parallax]');
  const steps = $('.steps');
  let ticking = false;

  const onScroll = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    header.classList.toggle('is-scrolled', y > 30);
    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    toTop.classList.toggle('is-visible', y > vh * 1.2);

    for (const el of parallax) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const speed = parseFloat(el.dataset.parallax) || 0;
      const offset = (r.top + r.height / 2 - vh / 2) * speed;
      el.style.translate = `0 ${(-offset).toFixed(1)}px`;
    }

    if (steps) {
      const r = steps.getBoundingClientRect();
      const p = Math.min(Math.max((vh * 0.75 - r.top) / r.height, 0), 1);
      steps.style.setProperty('--line', reduceMotion ? 1 : p.toFixed(3));
    }
  };
  const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', requestTick, { passive: true });
  addEventListener('resize', requestTick);
  onScroll();

  /* ---------- filtr produktů (plynulý přechod přes View Transitions) ---------- */
  const filterBtns = $$('.filter-btn');
  const pill = $('.filter-pill');
  const products = $$('.product');
  products.forEach((p, i) => { p.style.viewTransitionName = `produkt-${i + 1}`; });
  const movePill = (btn) => {
    pill.style.width = `${btn.offsetWidth}px`;
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
  };
  const applyFilter = (value) => {
    products.forEach((p) => p.classList.toggle('is-hidden', value !== 'vse' && p.dataset.line !== value));
  };
  filterBtns.forEach((btn) => btn.addEventListener('click', () => {
    if (btn.classList.contains('is-active')) return;
    filterBtns.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    movePill(btn);
    products.forEach((p) => { p.classList.add('is-visible'); p.removeAttribute('data-reveal'); });
    if (document.startViewTransition && !reduceMotion) document.startViewTransition(() => applyFilter(btn.dataset.filter));
    else applyFilter(btn.dataset.filter);
  }));
  const initPill = () => movePill($('.filter-btn.is-active'));
  initPill();
  addEventListener('resize', initPill);
  document.fonts?.ready.then(initPill);

  /* ---------- 3D náklon sáčku při najetí myší ---------- */
  if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.product-media').forEach((media) => {
      const img = $('img', media);
      media.addEventListener('pointermove', (e) => {
        const r = media.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        img.style.setProperty('--ry', `${(x * 18).toFixed(2)}deg`);
        img.style.setProperty('--rx', `${(-y * 12).toFixed(2)}deg`);
      });
      media.addEventListener('pointerleave', () => { img.style.removeProperty('--ry'); img.style.removeProperty('--rx'); });
    });
  }

  /* ---------- tlačítka „Objednat“ předvyplní formulář ---------- */
  const tema = $('#f-tema');
  if (tema) $$('[data-product]').forEach((a) => a.addEventListener('click', () => {
    const opt = [...tema.options].find((o) => o.text === a.dataset.product);
    if (opt) tema.value = opt.value;
  }));

  /* ---------- kontaktní formulář → e-mail (bez serveru) ---------- */
  const form = $('form.contact-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach((inp) => {
      const valid = inp.value.trim() !== '' && inp.checkValidity();
      inp.closest('.field').classList.toggle('is-invalid', !valid);
      if (!valid && ok) { inp.focus(); ok = false; }
    });
    const status = $('.form-status', form);
    if (!ok) { status.textContent = 'Vyplňte prosím jméno a platný e-mail.'; return; }
    const d = Object.fromEntries(new FormData(form));
    const subject = `Dotaz z webu – ${d.tema}`;
    const body = `Jméno: ${d.jmeno}\nE-mail: ${d.email}\nZájem o: ${d.tema}\n\n${d.zprava || ''}`;
    location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Děkujeme! Otevíráme váš e-mailový program…';
  });

  /* ---------- rok v patičce ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
