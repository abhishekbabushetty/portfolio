/* =========================================================
   ABHISHEK.OS — core orchestration
   boot · smooth scroll · cursor · HUD · reveals · ring · eggs
   ========================================================= */
(function () {
  const AS = (window.AS = window.AS || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const html = document.documentElement;

  if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); html.classList.add('js-anim'); }

  /* ---------------- smooth scroll ---------------- */
  function initLenis() {
    if (reduced || !window.Lenis) return;
    try {
      const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      AS.lenis = lenis;
      lenis.on('scroll', (e) => {
        AS.velocity = e.velocity || 0;
        hasGSAP && ScrollTrigger.update();
        AS.particles && AS.particles.setVelocity(e.velocity || 0);
      });
      if (hasGSAP) { gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
      else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    } catch (e) { AS.lenis = null; }
  }
  AS.scrollTo = function (target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (AS.lenis) AS.lenis.scrollTo(el, { offset: 0, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  /* ---------------- utilities ---------------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
    [...text].forEach((c) => {
      const w = document.createElement('span'); w.className = 'chw';
      const s = document.createElement('span'); s.className = 'ch'; s.textContent = c === ' ' ? ' ' : c;
      w.appendChild(s); el.appendChild(w);
    });
    return $$('.ch', el);
  }
  function splitWords(el, cls) {
    // wraps every word of text nodes in <span class="w"><span>word</span></span>, keeping inline elements
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = cls || 'w';
            const i = document.createElement('span'); i.textContent = t;
            w.appendChild(i); frag.appendChild(w); out.push(i);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    };
    walk(el);
    return out;
  }
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ABCDEFX';
  function scramble(el, to, dur = 0.8) {
    if (reduced) { el.textContent = to; return; }
    const from = el.textContent;
    const len = Math.max(from.length, to.length);
    const q = [];
    for (let i = 0; i < len; i++) { const s = Math.random() * 0.4 * dur, e = s + 0.3 * dur + Math.random() * 0.3 * dur; q.push({ f: from[i] || '', t: to[i] || '', s, e }); }
    const t0 = performance.now();
    cancelAnimationFrame(el._scr);
    const step = () => {
      const t = (performance.now() - t0) / 1000;
      let out = '', done = 0;
      q.forEach((c) => {
        if (t >= c.e) { done++; out += c.t; }
        else if (t >= c.s) out += `<span class="scr">${GLYPHS[(Math.random() * GLYPHS.length) | 0]}</span>`;
        else out += c.f;
      });
      el.innerHTML = out;
      if (done < q.length) el._scr = requestAnimationFrame(step);
    };
    step();
  }
  AS.scramble = scramble;

  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('is-on'), 2400);
  }
  AS.toast = toast;

  /* ---------------- boot sequence ---------------- */
  function boot(done) {
    const el = $('#boot');
    if (!el || !hasGSAP) { el && el.remove(); done(); return; }
    let seen = false;
    try { seen = sessionStorage.getItem('as-booted') === '1'; } catch (e) {}
    document.body.classList.add('is-booting');
    const lines = [
      ['dim', 'ABHISHEK.OS v2026.11 — cold start'],
      ['', 'mounting neural core ........................ <span class="ok">ok</span>'],
      ['', 'loading memory · 20+ systems ................ <span class="ok">ok</span>'],
      ['', 'mounting keskur · web / android / ios ....... <span class="ok">ok</span>'],
      ['', 'indexing wins · 6 national titles ........... <span class="ok">ok</span>'],
      ['', 'warming agents · CrewAI / LangGraph / AutoGen  <span class="ok">ok</span>'],
      ['', 'linking stack · FastAPI ⇄ React ⇄ PyTorch ... <span class="ok">ok</span>'],
      ['ok', '› ready. welcome, human.']
    ];
    const log = $('#bootLog'), count = $('#bootCount'), bar = $('#bootBar');
    const total = reduced ? 0.3 : seen ? 0.6 : 2.0;
    const st = { p: 0 };
    let shown = 0, finished = false;
    const tl = gsap.timeline();
    tl.to(st, {
      p: 100, duration: total, ease: 'power2.inOut',
      onUpdate() {
        const v = Math.round(st.p);
        count.textContent = String(v).padStart(3, '0');
        bar.style.width = v + '%';
        const want = Math.floor((st.p / 100) * lines.length + 0.2);
        while (shown < Math.min(want, lines.length)) {
          const d = document.createElement('div'); d.className = lines[shown][0]; d.innerHTML = lines[shown][1]; log.appendChild(d); shown++;
        }
      }
    });
    tl.add(finish, '+=0.15');
    function finish() {
      if (finished) return; finished = true;
      tl.kill();
      try { sessionStorage.setItem('as-booted', '1'); } catch (e) {}
      gsap.to(el, {
        clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0.01 : 0.9, ease: 'expo.inOut',
        onComplete() { el.remove(); document.body.classList.remove('is-booting'); }
      });
      setTimeout(done, reduced ? 0 : 350);
    }
    el.style.clipPath = 'inset(0 0 0% 0)';
    const skip = () => finish();
    el.addEventListener('click', skip);
    window.addEventListener('keydown', function k() { skip(); window.removeEventListener('keydown', k); });
  }

  /* ---------------- hero ---------------- */
  let heroChars = [];
  function prepHero() {
    $$('.hero__word[data-chars]').forEach((w) => { heroChars = heroChars.concat(splitChars(w)); });
  }
  function introHero() {
    AS.particles && AS.particles.reveal && AS.particles.reveal();
    if (!hasGSAP) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(heroChars, { y: 0, duration: 1.4, stagger: 0.045 })
      .fromTo('.hero__b', { opacity: 0, scale: 0.4, rotate: -20 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.4, ease: 'elastic.out(1, 0.6)' }, 0.35)
      .fromTo('.hero [data-intro]:not(.hero__b)', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.5);
    startRotator();
    // parallax: name drifts and fades as you scroll away
    gsap.to('.hero__name', { yPercent: -18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  function heroWeight() {
    if (!fine || reduced) return;
    const hero = $('#hero');
    const state = heroChars.map((c) => ({ c, w: 520 }));
    let mx = -9999, my = -9999, raf = 0, running = false;
    hero.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (!running) { running = true; raf = requestAnimationFrame(loop); } });
    hero.addEventListener('pointerleave', () => { mx = my = -9999; });
    function loop() {
      let moving = false;
      state.forEach((o) => {
        const r = o.c.parentNode.getBoundingClientRect();   // wrapper isn't moved by the intro animation
        const d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
        const f = Math.max(0, 1 - d / 340);
        const target = 520 + f * f * 380;
        o.w += (target - o.w) * 0.16;
        if (Math.abs(target - o.w) > 0.5) moving = true;
        o.c.style.fontWeight = Math.round(o.w);
        o.c.style.color = f > 0.6 ? 'var(--acc)' : '';
      });
      if (moving || mx > -9999) raf = requestAnimationFrame(loop);
      else running = false;
    }
  }

  function startRotator() {
    const el = $('#rotator'); if (!el) return;
    const words = ['agents that reason.', 'products end to end.', 'apps for Android & iOS.', 'systems that see.', 'voices that answer.', 'startups from zero.'];
    let i = 0;
    setInterval(() => { i = (i + 1) % words.length; scramble(el, words[i], 1); }, 3200);
  }

  /* ---------------- HUD / rail / sections ---------------- */
  function initSections() {
    const hud = $('.hud'), idx = $('#hudIdx'), name = $('#hudName');
    const sections = $$('main section[data-section]');
    const railLinks = $$('.rail a');
    let current = null;
    function activate(sec) {
      if (current === sec) return; current = sec;
      const i = sections.indexOf(sec);
      idx.textContent = String(i).padStart(2, '0');
      scramble(name, sec.dataset.section, 0.6);
      railLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.rail === sec.id));
      window.dispatchEvent(new CustomEvent('as:section', { detail: sec.id }));
    }
    if (hasGSAP) {
      sections.forEach((sec) => {
        ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && activate(sec) });
      });
    } else {
      const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && activate(e.target)), { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => io.observe(s));
    }
    activate(sections[0]);
    const bar = $('#progressBar');
    const onScroll = () => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      hud.classList.toggle('is-scrolled', y > 40);
      if (bar) bar.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = $(id); if (!el) return;
      e.preventDefault();
      closeMenu();
      AS.scrollTo(el);
    });
  }

  /* ---------------- menu ---------------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn');
  function openMenu() {
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false'); menuBtn.setAttribute('aria-expanded', 'true');
    $$('.menu__nav a').forEach((a, i) => (a.style.transitionDelay = `${0.15 + i * 0.05}s`));
    AS.lenis && AS.lenis.stop();
  }
  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); menuBtn.setAttribute('aria-expanded', 'false');
    $$('.menu__nav a').forEach((a) => (a.style.transitionDelay = '0s'));
    AS.lenis && AS.lenis.start();
  }
  function initMenu() {
    menuBtn.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------------- reveals ---------------- */
  function initReveals() {
    if (!hasGSAP) return;
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true }),
      // a fast jump (menu, agent, anchor) can skip past elements entirely — never leave them hidden
      onLeave: (els) => gsap.set(els, { opacity: 1, y: 0 }),
      onEnterBack: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', overwrite: true })
    });
    $$('[data-title]').forEach((t) => {
      const words = splitWords(t);
      gsap.set(words, { yPercent: 110 });
      ScrollTrigger.create({ trigger: t, start: 'top 85%', once: true, onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.06 }) });
    });
    // manifesto: words light up as you read
    const man = $('[data-words]');
    if (man) {
      const words = splitWords(man, 'mw');
      const spans = $$('.mw', man);
      gsap.to(spans, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: man, start: 'top 78%', end: 'bottom 45%', scrub: 0.6 } });
    }
    // counters
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10), suf = el.dataset.suffix || '';
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: to, duration: 2, ease: 'expo.out', onUpdate: () => (el.textContent = o.v.toFixed(dec) + suf) })
      });
    });
  }
  function noGsapCounters() {
    if (hasGSAP) return;
    $$('[data-count]').forEach((el) => { el.textContent = parseFloat(el.dataset.count).toFixed(parseInt(el.dataset.decimals || '0', 10)) + (el.dataset.suffix || ''); });
  }

  /* ---------------- marquees (velocity-reactive) ---------------- */
  function initMarquees() {
    const ms = $$('[data-marquee]').map((m) => {
      const track = $('.marquee__track', m);
      track.innerHTML += track.innerHTML; // duplicate for seamless loop
      return { track, dir: parseFloat(m.dataset.marquee) || 1, x: 0, w: 0 };
    });
    const measure = () => ms.forEach((m) => (m.w = m.track.scrollWidth / 2));
    measure(); window.addEventListener('resize', measure);
    let vel = 0, sdir = 1, lastY = window.scrollY;
    window.addEventListener('scroll', () => { const y = window.scrollY; const d = y - lastY; if (d) sdir = Math.sign(d); vel = Math.min(Math.abs(d), 80); lastY = y; }, { passive: true });
    (function tick() {
      requestAnimationFrame(tick);
      if (reduced) return;
      vel *= 0.92;
      ms.forEach((m) => {
        m.x -= (0.6 + vel * 0.35) * m.dir * sdir;
        if (m.w) { if (m.x <= -m.w) m.x += m.w; if (m.x > 0) m.x -= m.w; }
        m.track.style.transform = `translate3d(${m.x}px,0,0)`;
      });
    })();
  }

  /* ---------------- experience accordion ---------------- */
  function initXP() {
    $$('.xp__head').forEach((b) => {
      b.addEventListener('click', () => {
        const item = b.closest('.xp__item');
        const open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', String(open));
        setTimeout(() => hasGSAP && ScrollTrigger.refresh(), 750);
      });
    });
  }

  /* ---------------- horizontal lab ---------------- */
  function initLab() {
    if (!hasGSAP || reduced) return;
    const track = $('#labTrack'), lab = $('#lab'), count = $('#labCount'), bar = $('#labBar');
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1100px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const projs = $$('.proj', track);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: lab, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (s) => {
            const i = Math.min(projs.length - 1, Math.floor(s.progress * projs.length));
            count.textContent = String(i + 1).padStart(2, '0');
            bar.style.width = `${(s.progress * 100).toFixed(1)}%`;
          }
        }
      });
      // subtle depth: each card's canvas shifts against the scroll
      projs.forEach((p) => {
        gsap.fromTo(p.querySelector('.proj__info'), { x: 40 }, { x: -10, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      // velocity skew: cards lean into the motion
      let skew = 0, alive = true;
      (function lean() {
        if (!alive) return;
        requestAnimationFrame(lean);
        const target = Math.max(-6, Math.min(6, -(AS.velocity || 0) * 0.22));
        skew += (target - skew) * 0.12;
        if (Math.abs(skew) < 0.01 && Math.abs(target) < 0.01) skew = 0;
        track.style.setProperty('--skew', `${skew.toFixed(2)}deg`);
      })();
      return () => { alive = false; track.style.removeProperty('--skew'); gsap.set(track, { clearProps: 'transform' }); };
    });
  }

  /* ---------------- 3D ring of wins ---------------- */
  function initRing() {
    const ring = $('#ring'), stage = $('#ringStage');
    if (!ring) return;
    const cards = $$('.win', stage);
    const N = cards.length, step = 360 / N;
    let rot = 0, vel = 0, dragging = false, startX = 0, startRot = 0, moved = 0, R = 420, lastX = 0, enabled = false, inView = false;
    function layout() {
      enabled = window.innerWidth > 760;
      if (!enabled) { cards.forEach((c) => (c.style.transform = '')); return; }
      const w = stage.offsetWidth;
      R = Math.round((w / 2) / Math.tan(Math.PI / N)) + 40;
      ring.style.height = `${stage.offsetHeight + 120}px`;
    }
    layout(); window.addEventListener('resize', layout);
    new IntersectionObserver((es) => es.forEach((e) => (inView = e.isIntersecting))).observe(ring);
    function render() {
      stage.style.transform = `translateZ(${-R}px) rotateY(${rot}deg)`;
      cards.forEach((c, i) => {
        const a = i * step;
        c.style.transform = `rotateY(${a}deg) translateZ(${R}px)`;
        const rel = (((a + rot) % 360) + 540) % 360 - 180; // -180..180, 0 = front
        const f = 1 - Math.min(Math.abs(rel), 120) / 120;
        c.style.opacity = (0.25 + f * 0.75).toFixed(3);
        c.style.pointerEvents = Math.abs(rel) < 40 ? 'auto' : 'none';
      });
    }
    ring.addEventListener('pointerdown', (e) => {
      if (!enabled) return;
      dragging = true; moved = 0; startX = lastX = e.clientX; startRot = rot; vel = 0;
      ring.setPointerCapture(e.pointerId);
    });
    ring.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx));
      rot = startRot + dx * 0.25; vel = (e.clientX - lastX) * 0.25; lastX = e.clientX;
    });
    const up = () => { dragging = false; };
    ring.addEventListener('pointerup', up); ring.addEventListener('pointercancel', up);
    ring.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    cards.forEach((c) => c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
    (function tick() {
      requestAnimationFrame(tick);
      if (!enabled || !inView) return;
      if (!dragging) {
        vel *= 0.95;
        rot += vel + (reduced ? 0 : -0.06);
        if (Math.abs(vel) < 0.02) {
          // gently settle to nearest card
          const target = Math.round(rot / step) * step;
          rot += (target - rot) * 0.02;
        }
      }
      render();
    })();
  }

  /* ---------------- cursor & magnetics ---------------- */
  function initCursor() {
    if (!fine) return;
    html.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), lab = $('.cursor__label');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; cur.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    window.addEventListener('pointerdown', () => cur.classList.add('is-down'));
    window.addEventListener('pointerup', () => cur.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, input, [role="button"]');
      if (labelled) { lab.textContent = labelled.dataset.cursor; cur.classList.add('is-label'); cur.classList.remove('is-hover'); }
      else if (interactive) { cur.classList.add('is-hover'); cur.classList.remove('is-label'); }
      else cur.classList.remove('is-hover', 'is-label');
    });
    (function tick() {
      requestAnimationFrame(tick);
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    })();
  }
  function initMagnetic() {
    if (!fine || reduced) return;
    $$('[data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.3;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
        el.style.transition = 'transform 0.15s ease-out';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; el.style.transition = 'transform 0.7s cubic-bezier(0.16,1,0.3,1)'; });
    });
  }

  /* ---------------- clock, copy, easter eggs ---------------- */
  function initClock() {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    const els = [$('#hudTime'), $('#istTime')].filter(Boolean);
    const tick = () => { const s = fmt.format(new Date()); els.forEach((e) => (e.textContent = s)); };
    tick(); setInterval(tick, 15000);
  }
  function initCopy() {
    $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
      const v = b.dataset.copy;
      try { await navigator.clipboard.writeText(v); }
      catch (e) { const t = document.createElement('textarea'); t.value = v; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (_) {} t.remove(); }
      b.textContent = 'copied ✓'; toast('Email copied — talk soon!');
      setTimeout(() => (b.textContent = 'copy'), 2000);
    }));
  }
  function initShock() {
    window.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, textarea, canvas, .agent, .menu, .ring, .proj, .graph, label')) return;
      AS.particles && AS.particles.shock && AS.particles.shock(e.clientX, e.clientY);
      if (reduced) return;
      const r = document.createElement('span'); r.className = 'ripple';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.appendChild(r); setTimeout(() => r.remove(), 1200);
    });
  }
  /* ---------------- founder: the stack lights up from the ground up ---------------- */
  function initLayers() {
    const list = $('#layers'); if (!list) return;
    const layers = $$('.layer', list);   // top to bottom, in reading order
    const N = layers.length;
    const light = (k) => {
      layers.forEach((l, i) => l.classList.toggle('is-lit', i < k));
      list.style.setProperty('--lit', (k / N).toFixed(3));
    };
    if (!hasGSAP || reduced) { light(N); return; }
    ScrollTrigger.create({
      trigger: list, start: 'top 80%', end: 'bottom 55%', scrub: true,
      onUpdate: (s) => light(Math.round(s.progress * N))
    });
  }

  /* ---------------- archive: filters + floating tech preview ---------------- */
  function initArchive() {
    const list = $('#arc'); if (!list) return;
    const items = $$('.arc__item', list);
    const filters = $('#arcFilters');
    const cats = [['all', 'All'], ['agents', 'Agents'], ['vision', 'Vision'], ['voice', 'Voice'], ['devtools', 'Dev tools'], ['data', 'Data'], ['iot', 'IoT'], ['more', 'More']];
    cats.forEach(([key, label]) => {
      const n = key === 'all' ? items.length : items.filter((i) => i.dataset.cat === key).length;
      if (!n) return;
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `${label} <small>${n}</small>`;
      if (key === 'all') b.classList.add('is-active');
      b.addEventListener('click', () => {
        filters.querySelectorAll('button').forEach((x) => x.classList.toggle('is-active', x === b));
        items.forEach((it) => {
          const show = key === 'all' || it.dataset.cat === key;
          it.classList.toggle('is-hidden', !show);
          if (show) { it.style.opacity = 1; it.style.transform = 'none'; }
        });
        if (hasGSAP) {
          const vis = items.filter((i) => !i.classList.contains('is-hidden'));
          gsap.fromTo(vis, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'expo.out' });
          ScrollTrigger.refresh();
        }
      });
      filters.appendChild(b);
    });
    if (!fine) return;
    const fl = $('#arcFloat');
    let x = 0, y = 0, fx = 0, fy = 0, on = false;
    items.forEach((it) => {
      it.addEventListener('pointerenter', () => {
        const tags = it.querySelector('.arc__tags').textContent;
        fl.innerHTML = `<b>${tags}</b>` + it.dataset.tech.split('·').map((t) => `<span>${t.trim()}</span>`).join('');
        fl.classList.add('is-on'); on = true;
      });
      it.addEventListener('pointerleave', () => { fl.classList.remove('is-on'); on = false; });
    });
    window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    (function tick() {
      requestAnimationFrame(tick);
      if (!on && !fl.classList.contains('is-on')) return;
      fx += (x + 28 - fx) * 0.16; fy += (y + 24 - fy) * 0.16;
      const maxX = window.innerWidth - 280;
      fl.style.transform = `translate(${Math.min(fx, maxX)}px, ${fy}px)`;
    })();
  }

  /* ---------------- figure caption: names the formation the dots are in ---------------- */
  function initFigure() {
    const num = $('#figNum'), label = $('#figLabel'), cap = $('#figCap');
    if (!cap) return;
    window.addEventListener('as:figure', (e) => {
      num.textContent = 'FIG.' + String(e.detail.index).padStart(2, '0');
      scramble(label, e.detail.label, 0.7);
      cap.classList.add('is-on');
    });
  }

  function initKonami() {
    const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let i = 0;
    window.addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = k === seq[i] ? i + 1 : k === seq[0] ? 1 : 0;
      if (i === seq.length) {
        i = 0;
        AS.particles && AS.particles.burst();
        document.body.classList.add('hyper');
        toast('Hyperdrive engaged ⚡ you found the secret.');
        setTimeout(() => document.body.classList.remove('hyper'), 3500);
      }
    });
  }
  function signature() {
    try {
      console.log('%c ABHISHEK.OS ', 'background:#c8f542;color:#0b0c05;font:600 14px monospace;padding:6px 10px;border-radius:6px');
      console.log('%cHey, fellow builder 👋  Hand-built with three.js, GSAP and a lot of canvas. Let\'s talk: abhishetty1506@gmail.com', 'color:#a4aaa6;font:12px monospace');
    } catch (e) {}
  }

  /* ---------------- go ---------------- */
  function start() {
    // the intro is choreographed from the top, so always begin there (unless deep-linked)
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) window.scrollTo(0, 0);
    initLenis();
    AS.particles && AS.particles.init && AS.particles.init();
    prepHero();
    initMenu();
    initAnchors();
    initCursor();
    initMagnetic();
    initClock();
    initCopy();
    initKonami();
    initFigure();
    initShock();
    AS.sound && AS.sound.init();
    initXP();
    initMarquees();
    noGsapCounters();
    AS.agent && AS.agent.init();
    AS.labs && AS.labs.init();
    AS.graph && AS.graph.init();
    initLab();          // pin must be created before section triggers below it
    initReveals();
    initSections();
    initRing();
    initLayers();
    initArchive();
    heroWeight();
    signature();
    boot(() => {
      introHero();
      hasGSAP && ScrollTrigger.refresh();
    });
    const toTop = () => { if (location.hash) return; window.scrollTo(0, 0); AS.lenis && AS.lenis.scrollTo(0, { immediate: true, force: true }); };
    toTop();
    window.addEventListener('load', () => { toTop(); hasGSAP && ScrollTrigger.refresh(); });
    window.addEventListener('pageshow', toTop);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => hasGSAP && ScrollTrigger.refresh());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
