(function () {
  const nav = document.querySelector(".site-nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Unicorn fades in on load; wordmark + Instagram are revealed on first click
  const splashLogo = document.getElementById("splash-logo");
  const splashWordmark = document.getElementById("splash-wordmark");
  const splashBottom = document.querySelector(".splash-bottom");
  if (splashLogo) requestAnimationFrame(() => splashLogo.classList.add("is-loaded"));

  // One-click unicorn reveal + visual feedback
  const splashUnicorn = document.getElementById("splash-unicorn");
  const splashNav = document.getElementById("splash-nav");
  if (splashUnicorn && splashNav) {
    splashUnicorn.addEventListener("click", () => {
      splashUnicorn.classList.remove("is-reacting");
      void splashUnicorn.offsetWidth;
      splashUnicorn.classList.add("is-reacting");
      splashUnicorn.classList.add("is-playing");

      splashNav.classList.add("is-revealed");
      splashNav.removeAttribute("aria-hidden");
      if (splashWordmark) splashWordmark.classList.add("is-revealed");
      if (splashBottom) splashBottom.classList.add("is-revealed");
    });
  }

  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add("is-visible"));
  }

  const canvas = document.getElementById("motes");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  const COUNT = window.innerWidth < 600 ? 500 : 900;
  const CLUSTERS = window.innerWidth < 600 ? 4 : 7;
  const dpr = window.devicePixelRatio || 1;
  let W, H, motes = [], clusters = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = canvas.width = Math.floor(rect.width * dpr);
    H = canvas.height = Math.floor(rect.height * dpr);
  }

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function initClusters() {
    clusters = Array.from({ length: CLUSTERS }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.012 * dpr,
      vy: -(Math.random() * 0.015 + 0.005) * dpr,
      sigma: (30 + Math.random() * 60) * dpr,
    }));
  }

  function init() {
    initClusters();
    motes = Array.from({ length: COUNT }, () => {
      const inCluster = Math.random() < 0.995;
      const cluster = inCluster ? clusters[Math.floor(Math.random() * clusters.length)] : null;
      return {
        cluster,
        offX: cluster ? gaussian() * cluster.sigma : 0,
        offY: cluster ? gaussian() * cluster.sigma : 0,
        wx: cluster ? null : Math.random() * W,
        wy: cluster ? null : Math.random() * H,
        r: (Math.random() < 0.2
            ? (Math.random() * 0.3 + 0.45)
            : (Math.random() * 0.25 + 0.15)
           ) * dpr,
        o: Math.random() * 0.52 + 0.16,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.012 + 0.004,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.008 + 0.002,
      };
    });
  }

  const SPRITE = 64;
  const glowSprite = document.createElement("canvas");
  glowSprite.width = glowSprite.height = SPRITE;
  const sctx = glowSprite.getContext("2d");
  const sg = sctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
  sg.addColorStop(0.00, "rgba(248, 222, 132, 1.00)");
  sg.addColorStop(0.12, "rgba(232, 193, 74, 0.78)");
  sg.addColorStop(0.35, "rgba(212, 168, 67, 0.30)");
  sg.addColorStop(1.00, "rgba(212, 168, 67, 0)");
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, SPRITE, SPRITE);

  function frame() {
    ctx.clearRect(0, 0, W, H);
    clusters.forEach(cl => {
      cl.x += cl.vx;
      cl.y += cl.vy;
      if (cl.y < -cl.sigma * 1.5) { cl.y = H + cl.sigma; cl.x = Math.random() * W; }
      if (cl.x < -cl.sigma * 1.5) cl.x = W + cl.sigma;
      if (cl.x > W + cl.sigma * 1.5) cl.x = -cl.sigma;
    });

    motes.forEach(m => {
      m.wobble += m.wobbleSpeed;
      m.pulse += m.pulseSpeed;
      let x, y;
      if (m.cluster) {
        x = m.cluster.x + m.offX + Math.sin(m.wobble) * 6 * dpr;
        y = m.cluster.y + m.offY + Math.cos(m.wobble * 0.7) * 4 * dpr;
      } else {
        m.wy -= 0.012 * dpr;
        m.wx += (Math.random() - 0.5) * 0.05 * dpr;
        if (m.wy < -10) { m.wy = H + 10; m.wx = Math.random() * W; }
        if (m.wx < -10) m.wx = W + 10;
        if (m.wx > W + 10) m.wx = -10;
        x = m.wx; y = m.wy;
      }
      const a = m.o * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(m.pulse)));
      const drawSize = m.r * 14;
      ctx.globalAlpha = a;
      ctx.drawImage(glowSprite, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  resize();
  init();

  let lastInitWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    resize();
    if (window.innerWidth !== lastInitWidth) {
      lastInitWidth = window.innerWidth;
      init();
    }
  }, { passive: true });

  requestAnimationFrame(frame);
})();
