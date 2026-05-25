(function () {
  const nav = document.querySelector(".site-nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

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
  let width = 0;
  let height = 0;
  let motes = [];
  let raf = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(50, Math.min(140, Math.floor((width * height) / 10500)));
    motes = Array.from({ length: count }, () => ({
      x: rand(-width * 0.1, width * 1.1),
      y: rand(-height * 0.05, height * 1.05),
      r: rand(0.55, 2.4),
      a: rand(0.16, 0.54),
      vx: rand(-0.035, 0.035),
      vy: rand(-0.018, 0.028),
      pulse: rand(0, Math.PI * 2)
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    motes.forEach(mote => {
      mote.x += mote.vx;
      mote.y += mote.vy;
      mote.pulse += 0.008;

      if (mote.x < -20) mote.x = width + 20;
      if (mote.x > width + 20) mote.x = -20;
      if (mote.y < -20) mote.y = height + 20;
      if (mote.y > height + 20) mote.y = -20;

      const glow = mote.r * 5.8;
      const alpha = mote.a + Math.sin(mote.pulse) * 0.06;
      const gradient = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, glow);
      gradient.addColorStop(0, `rgba(240, 208, 96, ${alpha})`);
      gradient.addColorStop(0.28, `rgba(212, 168, 67, ${alpha * 0.52})`);
      gradient.addColorStop(1, "rgba(212, 168, 67, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, glow, 0, Math.PI * 2);
      ctx.fill();
    });
    raf = window.requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(raf));
})();
