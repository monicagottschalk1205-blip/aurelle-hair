/* Aurelle Hair Atelier
   opener (five flashes, then it opens like doors) -> hero (slideshow + staggered words)
   -> about: headline, the extruded A on its own; scroll and you fall into a photo through the A,
      big photos slide past sideways ("The Work"), then the A zooms back out -> about text */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasG = typeof gsap !== 'undefined';

  /* ---------------- photos ---------------- */
  const img = n => `images/${n}.jpg`;
  const FLASH = [
    { n: 'h02', word: 'Cut',    x: '6%',  y: '28%' },
    { n: 'r10', word: 'Color',  x: '50%', y: '30%', c: 1 },
    { n: 'r05', word: 'Style',  x: '8%',  y: '40%' },
    { n: 'r03', word: 'Shine',  x: '54%', y: '24%' },
    { n: 'r02', word: 'Aurelle', x: '50%', y: '34%', c: 1, last: 1 }
  ];
  const SLIDES = ['h06', 'r12', 'r05', 'r03', 'h02', 'r02'];   // the first one is NOT the opener's last photo
  // the work: real salon shots, no faces (backs of heads, foils, color bowls, finished hair)
  const GALLERY = ['s06', 'r01', 's02', 'r06', 's04', 'r07', 's05', 'r13', 's08', 'r11'];

  /* ---------------- the extruded A (same shape as logo.svg) ---------------- */
  const OUTER = [[282,0],[368,0],[606,632],[692,646],[692,664],[400,664],[400,646],[494,632],[426,452],[159,452],[96,632],[150,646],[150,664],[-10,664],[-10,646],[60,632]];
  const HOLE = [[288,85],[418,430],[167,430]];
  const V = [190, -135];
  const BBOX = { x: -10, y: -135, w: 902, h: 799 };
  function logoParts() {
    const q = [];
    const add = (poly, hole) => poly.forEach((a, i) => {
      const b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dy = b[1] - a[1];
      const nx = hole ? -dy : dy, ny = hole ? dx : -dx;
      if (nx * V[0] + ny * V[1] > 0) q.push([a, b]);
    });
    add(OUTER, false); add(HOLE, true);
    q.sort((e, f) => (e[0][0] + e[1][0]) / 2 * V[0] + (e[0][1] + e[1][1]) / 2 * V[1] - ((f[0][0] + f[1][0]) / 2 * V[0] + (f[0][1] + f[1][1]) / 2 * V[1]));
    return q.map(([a, b]) => `${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0] + V[0]},${b[1] + V[1]} ${a[0] + V[0]},${a[1] + V[1]}`);
  }
  const P = d => 'M' + d.map(p => p.join(',')).join(' L') + ' Z';

  // the about section's logo (in front of the portrait): it draws itself as you scroll to it
  const aboutEl = $('#aboutLogo');
  let aboutParts = [];
  if (aboutEl) {
    const sw = 2.4;
    aboutEl.innerHTML = `<svg viewBox="-20 -150 920 840" role="img" aria-label="Aurelle monogram" style="color:var(--brown)">` +
      logoParts().map(p => `<polygon points="${p}" pathLength="1" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="round"/>`).join('') +
      `<path d="${P(OUTER)} ${P(HOLE)}" pathLength="1" fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
    aboutParts = $$('polygon,path', aboutEl);
    aboutParts.forEach(p => { p.style.strokeDasharray = 1; p.style.strokeDashoffset = 1; });
  }
  function drawAbout() {
    if (!aboutEl) return;
    const r = aboutEl.getBoundingClientRect(), vh = innerHeight;
    const p = clamp((vh - r.top) / (vh * 0.75)), n = aboutParts.length;
    aboutParts.forEach((el, i) => {
      const t = clamp((p * 1.5 - (i / n) * 0.7) / 0.5);
      el.style.strokeDashoffset = (1 - t).toFixed(4);
      el.setAttribute('fill', t >= 1 ? 'var(--cream)' : 'none');
    });
  }

  // the small logo in the top bar
  const mini = $('[data-logo="mini"]');
  if (mini) {
    mini.innerHTML = `<svg viewBox="-20 -150 920 840" role="img" aria-label="Aurelle monogram">` +
      logoParts().map(p => `<polygon points="${p}" fill="none" stroke="currentColor" stroke-width="22" stroke-linejoin="round"/>`).join('') +
      `<path d="${P(OUTER)} ${P(HOLE)}" fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="22" stroke-linejoin="round"/></svg>`;
  }

  /* ---------------- hero slideshow ---------------- */
  const slidesEl = $('#slides');
  function startSlides() {
    SLIDES.forEach((n, i) => {
      const s = document.createElement('div');
      s.className = 'slide' + (i === 0 ? ' on' : '');
      s.innerHTML = `<img src="${img(n)}" alt="">`;
      slidesEl.appendChild(s);
    });
    const all = $$('.slide', slidesEl);
    let k = 0;
    setInterval(() => { all[k].classList.remove('on'); k = (k + 1) % all.length; all[k].classList.add('on'); }, 3400);
  }

  /* ---------------- the pinned story ---------------- */
  const sizes = {};
  const loadSizes = Promise.all(GALLERY.map(n => new Promise(res => {
    const i = new Image();
    i.onload = i.onerror = () => { sizes[n] = i.naturalWidth ? i.naturalHeight / i.naturalWidth : 1.3; res(); };
    i.src = img(n);
  })));

  const pin = $('#work'), stage = $('#stage'), svgBox = $('#stageSvg'), hz = $('#hz'), track = $('#track'), hudNum = $('#hudNum');
  let svg, quadEls = [], frontEl, hasSetup = false;
  let slidesEls = [], popEls = [], trackW = 0;
  let vw, vh, u, rest, fin, Z1, P1, B, D1, Z2, TAIL, pinTop;

  // largest 16:9-ish (viewport-shaped) window that fits entirely inside the A's counter (the triangle)
  function fitHole(aspect) {
    const [A, Bp, C] = HOLE;
    const sgn = (p, a, b) => (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
    const inTri = p => { const d1 = sgn(p, A, Bp), d2 = sgn(p, Bp, C), d3 = sgn(p, C, A); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
    const fits = (ox, oy, w) => { const h = w / aspect; return [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([sx, sy]) => inTri([ox + sx * w / 2, oy + sy * h / 2])); };
    let best = { w: 0, ox: 288, oy: 330 };
    for (let oy = 120; oy <= 430; oy += 6) for (let ox = 190; ox <= 390; ox += 6) {
      let lo = 0, hi = 300;
      for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (fits(ox, oy, m)) lo = m; else hi = m; }
      if (lo > best.w) best = { w: lo, ox, oy };
    }
    const w = best.w * 0.985;
    return { w, h: w / aspect, cx: best.ox, cy: best.oy };
  }

  function buildStage() {
    vw = innerWidth; vh = innerHeight;
    const Lw = Math.min(vw * 0.8, 860, BBOX.w * vh * 0.66 / BBOX.h);   // the logo, on its own, at rest
    u = Lw / BBOX.w;
    const cx = BBOX.x + BBOX.w / 2, cy = BBOX.y + BBOX.h / 2;
    rest = { w: vw / u, h: vh / u, cx, cy };
    const f = fitHole(vw / vh);
    fin = f;

    const quads = logoParts();
    const sw = 1.7 / u;
    svgBox.innerHTML =
      `<svg id="stageLogo" viewBox="0 0 10 10" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Aurelle monogram">` +
      `<defs><clipPath id="holeClip"><path d="${P(HOLE)}"/></clipPath></defs>` +
      quads.map(p => `<polygon points="${p}" pathLength="1" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="round"/>`).join('') +
      `<path id="frontFace" d="${P(OUTER)} ${P(HOLE)}" pathLength="1" fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="round"/>` +
      `</svg>`;
    svg = $('#stageLogo');
    quadEls = $$('polygon', svg);
    frontEl = $('#frontFace', svg);
    [...quadEls, frontEl].forEach(el => { el.style.strokeDasharray = 1; el.style.strokeDashoffset = 1; });

    // the work: a big "The Work" word, then big photos (all of them pop up, then slide sideways)
    const midH = Math.min(vh * 0.74, vw * 0.84);
    const gap = Math.max(vw * 0.04, 22);
    const wordW = Math.max(vw * 0.5, 280);
    track.innerHTML = '';
    trackW = Math.max(vw * 0.05, 18);
    const word = document.createElement('div');
    word.className = 'sl wordblk';
    word.style.width = wordW + 'px';
    word.style.marginLeft = trackW + 'px';
    word.innerHTML = '<span>The<br>Work</span>';
    track.appendChild(word);
    trackW += wordW;
    slidesEls = GALLERY.map(n => {
      const r = sizes[n] || 1.3;
      const fig = document.createElement('figure');
      fig.className = 'sl';
      const h = Math.min(midH, vw * 0.82 * r), w = h / r;
      fig.style.width = w + 'px'; fig.style.height = h + 'px'; fig.style.marginLeft = gap + 'px';
      fig.innerHTML = `<img src="${img(n)}" alt="">`;
      track.appendChild(fig);
      trackW += w + gap;
      return fig;
    });
    trackW += Math.max(vw * 0.05, 18);
    popEls = [word, ...slidesEls];
    trackW = Math.max(trackW, vw + 1);

    Z1 = vh * 1.15; P1 = vh * 0.75; B = trackW - vw; D1 = vh * 0.5; Z2 = vh * 1.15; TAIL = vh * 0.35;
    pin.style.height = (vh + Z1 + P1 + B + D1 + Z2 + TAIL) + 'px';
    pinTop = pin.getBoundingClientRect().top + scrollY;
    hasSetup = true;
    render(true);
  }

  function setViewBox(w, cx, cy) {
    const h = w * vh / vw;
    svg.setAttribute('viewBox', `${(cx - w / 2).toFixed(3)} ${(cy - h / 2).toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`);
  }
  // zoom amount t (0 = logo at rest, 1 = counter fills the screen); smooth in log space so it feels like a real zoom
  function zoomTo(t) {
    const w = rest.w * Math.pow(fin.w / rest.w, t);
    const s = (rest.w - w) / (rest.w - fin.w);
    setViewBox(w, lerp(rest.cx, fin.cx, s), lerp(rest.cy, fin.cy, s));
  }

  let curY = scrollY, target = scrollY, raf = 0, lastState = '';
  function render(force) {
    drawAbout();
    if (!hasSetup) return;
    // 1) the A draws itself while the stage rises into view
    const stageTop = pin.getBoundingClientRect().top;
    pinTop = stageTop + scrollY;                    // measured live, so late layout changes (fonts, images) never throw it off
    const y = curY - pinTop;                       // 0 when the stage pins
    const draw = clamp((vh - stageTop) / (vh * 0.9));
    const all = [...quadEls, frontEl], n = all.length;
    all.forEach((el, i) => {
      const t = clamp((draw * 1.5 - (i / n) * 0.7) / 0.5);
      el.style.strokeDashoffset = (1 - t).toFixed(4);
      el.setAttribute('fill', t >= 1 ? 'var(--cream)' : 'none');
    });

    const z1 = clamp(y / Z1), pp = clamp((y - Z1) / P1), b = clamp((y - Z1 - P1) / B), dd = clamp((y - Z1 - P1 - B) / D1), z2 = clamp((y - Z1 - P1 - B - D1) / Z2);
    const out3 = t => 1 - Math.pow(1 - t, 3);
    const showSvg = y < Z1 || y >= Z1 + P1 + B + D1;
    svgBox.style.visibility = showSvg ? 'visible' : 'hidden';
    hz.style.visibility = showSvg ? 'hidden' : 'visible';

    if (y < Z1) {
      // 2) zoom into the A by itself: its (blank) counter fills the screen
      zoomTo(inOut(z1));
    } else if (y >= Z1 + P1 + B + D1) {
      // 4) the work is gone; the A zooms back out (the scroll runs backwards)
      zoomTo(1 - inOut(z2));
    } else {
      // 3) "The Work" and the big photos pop up, then slide sideways, then fold away
      track.style.transform = `translate3d(${(-b * B).toFixed(1)}px,0,0)`;
      popEls.forEach((el, k) => {
        const kk = Math.min(k, 3);
        const inP = out3(clamp((pp * 1.7 - kk * 0.2) / 0.6));
        const outP = clamp((dd * 1.6 - (popEls.length - 1 - k) * 0.03) / 0.7);
        const v = inP * (1 - outP);
        el.style.opacity = v.toFixed(3);
        el.style.transform = `translateY(${((1 - inP) * 14 + outP * 6).toFixed(2)}vh) scale(${(0.9 + 0.1 * inP - 0.04 * outP).toFixed(3)})`;
      });
      const mid = vw / 2;
      let bi = 0, bd = 1e9;
      slidesEls.forEach((s2, i) => { const r = s2.getBoundingClientRect(); const dist = Math.abs(r.left + r.width / 2 - mid); if (dist < bd) { bd = dist; bi = i; } });
      hudNum.textContent = String(bi + 1).padStart(2, '0') + ' / ' + String(slidesEls.length).padStart(2, '0');
    }
    if (y < 0) zoomTo(0);

    // the top bar reads dark on the cream parts and light on the photos
    const onLight = true;
    const a = $('#about').getBoundingClientRect(), st = $('#story').getBoundingClientRect();
    bar.classList.toggle('on-light', (a.top < 40 && a.bottom > 40) || (st.top < 40 && st.bottom > 40 && onLight));
  }

  /* ---------------- scroll plumbing ---------------- */
  const bar = $('#bar');
  function tick() {
    raf = 0;
    const d = target - curY;
    if (Math.abs(d) < 0.2) { curY = target; render(); return; }
    curY += d * 0.16;
    render();
    raf = requestAnimationFrame(tick);
  }
  function onScroll() { target = scrollY; if (!raf) raf = requestAnimationFrame(tick); }

  function setupReveals() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    $$('.about-head, .about-photo, .about-bio > *, .about-copy > *, .reviews-head, .review').forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = (i % 3) * 0.08 + 's'; io.observe(el); });
  }

  function showFinal() {
    window.__aurReady = true;
    html.classList.add('ready');
    document.body.classList.remove('lock');
    $('#opener').style.display = 'none';
    if (!slidesEl.children.length) startSlides();
    if (hasG) {
      gsap.set($$('.w > span'), { yPercent: 0 });
      gsap.set([bar], { opacity: 1, y: 0 });
      gsap.set($$('.hero-l, .hero-r, .hero-c'), { opacity: 1 });
    }
    setupReveals();
    loadSizes.then(() => {
      buildStage();
      curY = target = scrollY;
      render(true);
    });
    addEventListener('scroll', onScroll, { passive: true });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { buildStage(); curY = target = scrollY; render(true); }, 200); });
    window.__aur = { jump: v => { target = curY = v; render(true); }, get pinTop() { return pinTop; }, get Z1() { return Z1; }, get B() { return B; }, get Z2() { return Z2; } };
  }

  /* ---------------- the opener ---------------- */
  function run() {
    document.body.classList.add('lock');
    html.classList.add('ready');           // layout exists; the opener covers it
    const flash = $('#flash'), fImg = $('img', flash), fWord = $('.fw', flash);
    const hl = $('.hl'), hr = $('.hr');
    const words = $$('.w > span'), small = $$('.hero-l, .hero-r, .hero-c');

    gsap.set(words, { yPercent: 110 });
    gsap.set(small, { opacity: 0 });
    gsap.set(bar, { opacity: 0, y: -14 });

    const setFlash = f => {
      fImg.src = img(f.n);
      fWord.textContent = f.word;
      fWord.style.left = f.x; fWord.style.top = f.y;
      fWord.style.transform = f.c ? 'translateX(-50%)' : 'none';
    };

    // build the two halves from the last flash so they look identical when they take over
    const last = FLASH[FLASH.length - 1];
    $$('.half').forEach(h => {
      $('img', h).src = img(last.n);
      const w = $('.fw', h); w.textContent = last.word; w.style.left = last.x; w.style.top = last.y; w.style.transform = 'translateX(-50%)';
    });

    const T = gsap.timeline({ defaults: { ease: 'none' } });
    gsap.set(flash, { opacity: 0 });
    let t = 0.35;
    FLASH.forEach(f => {
      T.call(() => setFlash(f), null, t);
      T.set(flash, { opacity: 1 }, t);
      if (!f.last) { T.set(flash, { opacity: 0 }, t + 0.36); t += 0.46; }   // a dark beat between flashes, like a shutter
      else t += 0.1;
    });
    T.addLabel('open', t + 0.75);
    T.set(hl, { visibility: 'visible' }, 'open')
     .set(hr, { visibility: 'visible' }, 'open')
     .set(flash, { opacity: 0 }, 'open')
     .to(hl, { xPercent: -101, duration: 1.25, ease: 'power4.inOut' }, 'open')
     .to(hr, { xPercent: 101, duration: 1.25, ease: 'power4.inOut' }, 'open')
     .add(() => { startSlides(); }, 'open+0.1')
     .to(words, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 'open+0.7')
     .to(bar, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 'open+1.1')
     .to(small, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 'open+1.3')
     .add(showFinal, '+=0.2');

    window.__aurT = T;
  }

  /* ---------------- go ---------------- */
  if (!hasG || reduce) { showFinal(); return; }
  const pre = FLASH.map(f => f.n).concat(SLIDES).filter((v, i, a) => a.indexOf(v) === i)
    .map(n => new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = img(n); }));
  const ready = Promise.all([document.fonts ? document.fonts.ready : 0, ...pre]);
  Promise.race([ready, new Promise(r => setTimeout(r, 3500))]).then(run);
})();
