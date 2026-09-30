(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Mobile menu
  const toggle = $('.mobile-menu-toggle'), mnav = $('#mobile-nav');
  const setMenu = (open) => { mnav.hidden = !open; toggle.setAttribute('aria-expanded', open); toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню'); };
  toggle.addEventListener('click', () => setMenu(mnav.hidden));
  $$('a', mnav).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // Header: glass on scroll
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Stagger children of .stagger groups
  $$('.stagger').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--d', `${i * 0.07}s`)));

  // Ticker: two copies per half so the loop has no gap even on very wide screens
  const tt = $('.ticker-track');
  if (tt) tt.append(...[...tt.children].map((n) => n.cloneNode(true)));

  // Odometer counters: every digit rolls like a counter drum, once, when the strip first
  // scrolls into view. HTML keeps final values for no-JS and crawlers.
  const odo = $('.numbers-grid');
  if (odo && !reduce) {
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
      odo.classList.remove('counted');
      strips.forEach((s) => { s.style.transition = 'none'; s.style.transform = 'translateY(0)'; });
      odo.offsetHeight; // restart the transition
      strips.forEach((s, i) => {
        s.style.transition = `transform ${1.5 + i * 0.12}s cubic-bezier(.15,.85,.25,1)`;
        s.style.transform = `translateY(-${(20 + +s.dataset.d) * 1.15}em)`; // lands on the 3rd lap
      });
      clearTimeout(odo._t);
      odo._t = setTimeout(() => odo.classList.add('counted'), 1500 + strips.length * 120);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { roll(); io.disconnect(); } }, { threshold: 0.6 });
      io.observe(odo);
    } else roll();
  } else if (odo) odo.classList.add('counted');

  // Scroll reveal
  const reveals = $$('.reveal');
  const onVisible = (el) => el.classList.add('visible');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { onVisible(en.target); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach(onVisible);

  // Parallax on the MRI photo
  const par = $$('.parallax');
  if (!reduce && par.length) {
    let ticking = false;
    const update = () => {
      ticking = false;
      par.forEach((img) => {
        if (innerWidth <= 680) { img.style.transform = ''; return; }
        const r = img.parentElement.getBoundingClientRect();
        // image is 18% taller than its frame, so it may shift at most ±8% of the frame height
        const off = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
        img.style.transform = `translateY(${(-off * r.height * 0.08).toFixed(1)}px)`;
      });
    };
    const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    update();
  }

  // Reviews carousel
  const car = $('.carousel');
  if (car) {
    const track = $('.car-track', car), cards = [...track.children], dots = $('.car-dots', car);
    const perView = () => innerWidth >= 1024 ? 3 : innerWidth > 680 ? 2 : 1;
    const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
    const maxIndex = () => cards.length - perView();
    const index = () => Math.min(Math.round(track.scrollLeft / step()), maxIndex());
    const go = (i) => {
      const m = maxIndex();
      if (i > m) i = 0;
      if (i < 0) i = m;
      track.scrollTo({ left: i * step(), behavior: reduce ? 'auto' : 'smooth' });
    };
    const buildDots = () => {
      dots.innerHTML = '';
      for (let i = 0; i <= maxIndex(); i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', `Отзыв ${i + 1}`);
        b.addEventListener('click', () => go(i));
        dots.append(b);
      }
      update();
    };
    const update = () => {
      const i = index(), pv = perView();
      [...dots.children].forEach((d, k) => d.setAttribute('aria-selected', k === i));
      const active = i + (pv === 3 ? 1 : 0);
      cards.forEach((c, k) => c.classList.toggle('is-active', pv === 2 ? (k === i || k === i + 1) : k === active));
    };
    $('.car-prev', car).addEventListener('click', () => go(index() - 1));
    $('.car-next', car).addEventListener('click', () => go(index() + 1));
    let raf = 0;
    track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
    });
    let lastW = innerWidth;
    addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; buildDots(); } });
    buildDots();

    if (!reduce) {
      let paused = false;
      ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => car.addEventListener(ev, () => { paused = true; }, { passive: true }));
      ['mouseleave', 'focusout', 'touchend'].forEach((ev) => car.addEventListener(ev, () => { paused = false; }, { passive: true }));
      setInterval(() => { if (!paused && !document.hidden) go(index() + 1); }, 5000);
    }
  }
})();
