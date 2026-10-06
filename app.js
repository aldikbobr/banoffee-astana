(() => {
  window.__bnReady = true;
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = doc.classList.contains('motion');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const safe = (fn) => { try { fn(); } catch (e) { console.error(e); } };

  // Loader: hold until fonts are in (max 1.8 s, min 1.3 s), then lift the curtain and play the hero intro.
  safe(() => {
    const loader = $('.loader');
    const reveal = () => {
      doc.classList.add('loaded');
      setTimeout(() => { doc.classList.add('ready'); $('.hero-title')?.classList.add('in'); }, 260);
      setTimeout(() => loader?.remove(), 1500);
    };
    if (motion && loader) {
      const t0 = performance.now();
      const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
      Promise.race([fonts, new Promise((r) => setTimeout(r, 1800))]).then(() => setTimeout(reveal, Math.max(0, 1300 - (performance.now() - t0))));
    } else {
      doc.classList.add('loaded', 'ready');
      $('.hero-title')?.classList.add('in');
      loader?.remove();
    }
  });

  // Split headings into masked words; inline markup such as <em> is kept.
  const splitWords = (el, cls) => {
    let i = 0;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 1) { walk(n); return; }
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        const inner = document.createElement('span');
        inner.textContent = part;
        inner.style.setProperty('--wi', i++);
        if (cls) { inner.className = cls; frag.append(inner); return; }
        const w = document.createElement('span');
        w.className = 'sw';
        w.append(inner);
        frag.append(w);
      });
      n.replaceWith(frag);
    });
    walk(el);
    return $$(cls ? `.${cls}` : '.sw > span', el);
  };
  if (motion) $$('[data-split]').forEach((el) => splitWords(el));

  // Smooth scroll
  let lenis = null;
  safe(() => {
    if (!motion || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  });

  // Mobile menu
  const toggle = $('.menu-toggle'), mnav = $('#mobile-nav');
  const isOpen = () => doc.classList.contains('nav-open');
  const setMenu = (open) => {
    doc.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) {
      mnav.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => mnav.classList.add('open')));
      lenis ? lenis.stop() : (doc.style.overflow = 'hidden');
    } else {
      mnav.classList.remove('open');
      setTimeout(() => { if (!isOpen()) mnav.hidden = true; }, 800);
      lenis ? lenis.start() : (doc.style.overflow = '');
    }
  };
  toggle.addEventListener('click', () => setMenu(!isOpen()));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { setMenu(false); toggle.focus(); } });
  addEventListener('resize', () => { if (isOpen() && innerWidth > 1140) setMenu(false); });

  // Anchor links glide through Lenis
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : id.length > 1 && $(id);
    if (target === null || target === false) return;
    e.preventDefault();
    if (isOpen()) setMenu(false);
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -10, duration: 1.6 });
    else if (target === 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', target === 0 ? location.pathname : id);
  }));

  // Header: glass after the top, hides while scrolling down; progress bar; active nav link
  const header = $('.site-header'), prog = $('.scroll-progress span');
  const navLinks = $$('.desktop-nav a').map((a) => [a, $(a.getAttribute('href'))]).filter(([, s]) => s);
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    header.classList.toggle('scrolled', y > 20);
    if (y < 400 || y < lastY - 4) header.classList.remove('is-hidden');
    else if (y > lastY + 4 && !isOpen()) header.classList.add('is-hidden');
    lastY = y;
    const max = doc.scrollHeight - innerHeight;
    prog.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    const mid = innerHeight * 0.4;
    navLinks.forEach(([a, s]) => { const r = s.getBoundingClientRect(); a.classList.toggle('is-active', r.top <= mid && r.bottom > mid); });
    checkReveals();
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  // Scroll reveal: checked against the viewport on every scroll frame, so a fast jump (anchor link,
  // fling) never leaves skipped elements hidden above the fold.
  $$('.stg').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--d', `${i * 0.09}s`)));
  let pending = $$('.rv, [data-split]:not(.hero-title), .footer-word');
  const checkReveals = () => {
    if (!pending.length) return;
    const line = innerHeight * 0.92;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top > line) return true;
      el.classList.add('in');
      return false;
    });
  };
  onScroll();
  addEventListener('load', checkReveals);

  // Odometer: every digit rolls like a counter drum once the strip scrolls into view.
  safe(() => {
    const odo = $('.numbers-grid');
    if (!odo || !motion) return;
    $$('.count', odo).forEach((el) => {
      const text = el.textContent;
      el.insertAdjacentHTML('beforebegin', `<span class="sr-only">${text}</span>`);
      el.setAttribute('aria-hidden', 'true');
      el.textContent = '';
      [...text].forEach((ch) => {
        if (!/\d/.test(ch)) { el.append(ch); return; }
        const col = document.createElement('span'), strip = document.createElement('span');
        col.className = 'odo-col';
        strip.className = 'odo-strip';
        strip.dataset.d = ch;
        for (let i = 0; i < 30; i++) { const s = document.createElement('span'); s.textContent = i % 10; strip.append(s); }
        col.append(strip);
        el.append(col);
      });
    });
    const roll = () => {
      const strips = $$('.odo-strip', odo);
      strips.forEach((s, i) => {
        s.style.transition = `transform ${1.6 + i * 0.12}s cubic-bezier(.15,.85,.25,1)`;
        s.style.transform = `translateY(-${(20 + +s.dataset.d) * 1.15}em)`; // lands on the 3rd lap
      });
      setTimeout(() => odo.classList.add('counted'), 1600 + strips.length * 120);
    };
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { roll(); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(odo);
  });

  // Marquee: drifts on its own, speeds up and leans with scroll velocity, flips with scroll direction
  safe(() => {
    const mq = $('.marquee-track');
    if (!mq) return;
    mq.append(...[...mq.children].map((n) => n.cloneNode(true)));
    if (!motion) return;
    let x = 0, dir = -1, vel = 0, lastS = scrollY, half = mq.scrollWidth / 2, on = true;
    const measure = () => { half = mq.scrollWidth / 2; };
    addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    new IntersectionObserver((en) => { on = en[0].isIntersecting; }).observe(mq.parentElement);
    const tick = () => {
      const s = scrollY, d = s - lastS;
      lastS = s;
      if (d) dir = d > 0 ? -1 : 1;
      vel += (Math.min(Math.abs(d), 90) - vel) * 0.08;
      if (on) {
        x += dir * (0.7 + vel * 0.3);
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        mq.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${(dir * vel * 0.12).toFixed(2)}deg)`;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // Hero: layers drift with the pointer
  safe(() => {
    if (!motion || !finePointer) return;
    const hero = $('.hero'), layers = $$('.hero [data-depth]');
    let tx = 0, ty = 0, cx = 0, cy = 0, run = false;
    const loop = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      layers.forEach((l) => { const d = +l.dataset.depth; l.style.translate = `${(cx * d * 2).toFixed(2)}px ${(cy * d * 2).toFixed(2)}px`; });
      if (Math.abs(tx - cx) > 0.0004 || Math.abs(ty - cy) > 0.0004) requestAnimationFrame(loop); else run = false;
    };
    hero.addEventListener('pointermove', (e) => {
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
      if (!run) { run = true; requestAnimationFrame(loop); }
    });
  });

  // Magnetic buttons
  if (motion && finePointer) $$('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.34).toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });

  // Cursor: dot + trailing ring that grows over links and shows a label over photos
  safe(() => {
    if (!motion || !finePointer) return;
    const cur = $('.cursor'), dot = $('.cursor-dot', cur), ring = $('.cursor-ring', cur), label = $('.cursor-label', cur);
    let mx = -100, my = -100, rx = -100, ry = -100;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      cur.classList.remove('is-hidden');
    }, { passive: true });
    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener('pointerover', (e) => {
      const link = e.target.closest('a, button, summary, label, input, select, textarea');
      const tagged = !link && e.target.closest('[data-cursor]');
      cur.classList.toggle('is-link', !!link);
      cur.classList.toggle('is-label', !!tagged);
      if (tagged) label.textContent = tagged.dataset.cursor;
    });
    doc.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
  });

  // Scroll-driven scenes (GSAP)
  safe(() => {
    if (!motion || !hasGsap) return;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    // Story: "Banana + Toffee" folds into "Banoffee", the paragraph lights up word by word
    const story = $('.story');
    if (story) {
      story.classList.add('story-anim');
      const word = $('.story-word'), xs = $$('.x', word), ks = $$('.k', word);
      const words = splitWords($('.story-text'), 'wd');
      const finalScale = () => Math.min(2, (word.parentElement.clientWidth * 0.94) / ks.reduce((s, k) => s + k.offsetWidth, 0));
      const build = (pin) => {
        gsap.set(words, { opacity: 0.15 });
        const tl = gsap.timeline({ scrollTrigger: pin
          ? { trigger: story, start: 'top top', end: '+=170%', pin: true, scrub: 1, invalidateOnRefresh: true }
          : { trigger: story, start: 'top 75%', end: 'bottom 70%', scrub: 1, invalidateOnRefresh: true } });
        tl.fromTo(xs, { maxWidth: (i, el) => `${el.scrollWidth}px`, opacity: 1 }, { maxWidth: 0, opacity: 0, duration: 1, ease: 'power3.inOut', stagger: 0.05 }, 0.15)
          .fromTo(word, { scale: 1 }, { scale: finalScale, duration: 0.7, ease: 'power2.out' }, 0.95)
          .to(words, { opacity: 1, duration: 0.3, stagger: 0.035, ease: 'none' }, 0.5)
          .fromTo('.story-img', { scale: 0.8, rotate: -7, yPercent: 10 }, { scale: 1, rotate: 0, yPercent: 0, duration: 1.4, ease: 'power2.out' }, 0)
          .fromTo('.story-tag--a', { x: 90, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 0.25)
          .fromTo('.story-tag--b', { x: -90, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 0.55);
        return () => gsap.set([...xs, word, ...words], { clearProps: 'all' });
      };
      mm.add('(min-width: 901px)', () => build(true));
      mm.add('(max-width: 900px)', () => build(false));
    }

    // Menu: vertical scroll drives the shelf sideways on desktop
    mm.add('(min-width: 901px)', () => {
      const menu = $('.menu'), track = $('.menu-track'), bar = $('.menu-progress');
      if (!menu) return;
      menu.classList.add('is-h');
      track.removeAttribute('tabindex');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: menu, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true,
          onUpdate: (st) => bar.style.setProperty('--mp', Math.max(0.08, st.progress).toFixed(3)) },
      });
      $$('.dish-img img', track).forEach((img) => gsap.fromTo(img, { '--px': '-6%' }, { '--px': '6%', ease: 'none',
        scrollTrigger: { trigger: img.closest('.dish'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
      return () => { menu.classList.remove('is-h'); track.setAttribute('tabindex', '0'); gsap.set(track, { clearProps: 'all' }); };
    });

    // Hero eases away as you scroll past it
    gsap.to('.hero-visual', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { y: -70, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Glaze drips grow as the dark section arrives
    gsap.fromTo('.drip', { scaleY: 0.25 }, { scaleY: 1.2, ease: 'none', scrollTrigger: { trigger: '.cinna', start: 'top bottom', end: 'top 15%', scrub: true } });

    // Parallax inside arched photos
    $$('[data-parallax]').forEach((img) => gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

    // Gallery columns at different speeds
    $$('.g-col').forEach((col) => { const s = +col.dataset.speed; gsap.fromTo(col, { yPercent: s / 2 }, { yPercent: -s / 2, ease: 'none',
      scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } }); });

    // Order steps: the line fills as you read
    gsap.fromTo('.steps-line i', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 55%', scrub: true } });

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    addEventListener('load', refresh);
  });

  // Live "open now" for each branch, Astana time (UTC+5)
  safe(() => {
    const now = new Date(Date.now() + 5 * 3600e3);
    const m = now.getUTCHours() * 60 + now.getUTCMinutes();
    const toMin = (s) => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
    $$('[data-branch-status]').forEach((el) => {
      const { open, close } = el.dataset, o = toMin(open), c = toMin(close), isOpen = m >= o && m < c;
      el.classList.add(isOpen ? 'is-open' : 'is-closed');
      $('b', el).textContent = isOpen ? `Открыто до ${close}` : m < o ? `Закрыто · откроется в ${open}` : `Закрыто · откроется завтра в ${open}`;
    });
  });

  // Order builder → ready WhatsApp message
  safe(() => {
    const form = $('#builder');
    if (!form) return;
    const date = $('#b-date'), range = $('#b-guests'), out = $('#b-guests-out'), preview = $('#b-preview'), send = $('#b-send');
    const pad = (n) => String(n).padStart(2, '0');
    const t = new Date(Date.now() + 5 * 3600e3);
    date.min = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
    const fmt = (v) => { const [y, mo, d] = v.split('-').map(Number); return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, mo - 1, d)); };
    const people = (n) => `${n} ${n % 10 >= 1 && n % 10 <= 4 && (n % 100 < 11 || n % 100 > 14) ? 'человека' : 'человек'}`;
    const build = () => {
      const f = new FormData(form), branch = f.get('branch'), wish = (f.get('wish') || '').trim();
      const lines = ['Здравствуйте! Хочу оформить заказ в Banoffee:', `• ${f.get('what')}`];
      if (f.get('date')) lines.push(`• Дата: ${fmt(f.get('date'))}`);
      lines.push(`• На ${people(+f.get('guests'))}`);
      lines.push(branch.startsWith('Доставка') ? '• Нужна доставка по Астане' : `• Заберу: ${branch}`);
      if (wish) lines.push(`• Пожелания: ${wish}`);
      const text = lines.join('\n');
      out.textContent = range.value;
      range.style.setProperty('--fill', `${((range.value - range.min) / (range.max - range.min)) * 100}%`);
      preview.textContent = text;
      send.href = `https://wa.me/77029734891?text=${encodeURIComponent(text)}`;
    };
    form.addEventListener('input', build);
    form.addEventListener('change', build);
    form.addEventListener('submit', (e) => e.preventDefault());
    build();
  });

  // Reviews: two endless rows drifting in opposite directions
  if (motion) $$('.rev-row').forEach((row) => {
    const tr = $('.rev-track', row);
    [...tr.children].forEach((c) => { const cl = c.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); tr.append(cl); });
    row.classList.add('is-loop');
  });

  // FAQ: smooth open/close
  $$('.faq-list details').forEach((d) => {
    const s = $('summary', d), a = $('.faq-a', d);
    s.addEventListener('click', (e) => {
      if (reduce || !a.animate) return;
      e.preventDefault();
      const ease = 'cubic-bezier(.16,1,.3,1)';
      if (d.open) {
        const an = a.animate([{ height: `${a.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 420, easing: ease, fill: 'forwards' });
        an.onfinish = () => { d.open = false; an.cancel(); };
      } else {
        d.open = true;
        a.animate([{ height: '0px', opacity: 0 }, { height: `${a.offsetHeight}px`, opacity: 1 }], { duration: 600, easing: ease });
      }
    });
  });
})();
