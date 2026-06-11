(function () {
  const ENDPOINT = "https://dash.thegoldenunicorns.com/api/founder-signal-events";
  const TRACKED_CTA_CLASSES = ["nav-cta", "button"];
  const CONSENT_KEY = "tgu_public_cookie_consent";
  const CONSENT_ACCEPTED = "accepted";
  const CONSENT_DECLINED = "declined";

  function getConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch (err) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch (err) {
      // ignore storage failures
    }
  }

  function hasAnalyticsConsent() {
    return getConsent() === CONSENT_ACCEPTED;
  }

  function buildCookieBanner() {
    const banner = document.createElement("aside");
    banner.className = "cookie-banner";
    banner.setAttribute("aria-label", "Cookie consent");
    banner.hidden = true;
    banner.innerHTML = `
      <div class="cookie-banner__copy">
        <p>We use a small amount of analytics to understand how the public site is used.</p>
      </div>
      <div class="cookie-banner__actions">
        <button class="cookie-button cookie-button--ghost" type="button" data-cookie-decline>Decline</button>
        <button class="cookie-button" type="button" data-cookie-accept>Accept</button>
        <a class="cookie-link" href="/cookie-policy/">Cookie Policy</a>
      </div>
    `;
    return banner;
  }

  function mountCookieBanner() {
    const shell = document.querySelector(".site-shell") || document.body;
    const banner = buildCookieBanner();
    shell.appendChild(banner);

    const hideBanner = () => {
      banner.classList.remove("is-visible");
      window.setTimeout(() => {
        banner.hidden = true;
      }, 260);
    };

    const showBanner = () => {
      banner.hidden = false;
      window.requestAnimationFrame(() => {
        banner.classList.add("is-visible");
      });
    };

    banner.querySelector("[data-cookie-accept]").addEventListener("click", () => {
      setConsent(CONSENT_ACCEPTED);
      hideBanner();
      sendFounderEvent("page_view");
    });

    banner.querySelector("[data-cookie-decline]").addEventListener("click", () => {
      setConsent(CONSENT_DECLINED);
      hideBanner();
    });

    return { showBanner, hideBanner };
  }

  function founderTrackingEnabled() {
    return /(^|\.)thegoldenunicorns\.com$/i.test(window.location.hostname);
  }

  function founderId(storage, key, prefix) {
    try {
      const existing = storage.getItem(key);
      if (existing) return existing;
      const fresh = prefix + "_" + Math.random().toString(36).slice(2, 12);
      storage.setItem(key, fresh);
      return fresh;
    } catch (err) {
      return prefix + "_" + Math.random().toString(36).slice(2, 12);
    }
  }

  function sendFounderEvent(eventName, extra) {
    if (!founderTrackingEnabled() || !hasAnalyticsConsent()) return;

    const payload = JSON.stringify({
      source: "public_site",
      event_name: eventName,
      session_id: founderId(window.sessionStorage, "tgu_public_founder_session_id", "ps"),
      anonymous_id: founderId(window.localStorage, "tgu_public_founder_anonymous_id", "pa"),
      page_path: window.location.pathname,
      page_title: document.title,
      ...(extra || {}),
    });

    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
        return;
      } catch (err) {
        // Fall back to fetch below.
      }
    }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      mode: "cors",
    }).catch(() => {});
  }

  function slug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  const cookieBanner = mountCookieBanner();
  const onHomeSplash = !!document.getElementById("splash-unicorn");
  const currentConsent = getConsent();
  if (hasAnalyticsConsent()) {
    sendFounderEvent("page_view");
  } else if (!currentConsent && !onHomeSplash) {
    cookieBanner.showBanner();
  }

  document.addEventListener("click", event => {
    const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor) return;

    const href = anchor.getAttribute("href") || "";
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      return;
    }

    const isApply = /membership\.thegoldenunicorns\.com\/apply/i.test(anchor.href || href) || /\/apply\/?$/i.test(href);
    const isTrackedCta = isApply || TRACKED_CTA_CLASSES.some(className => anchor.classList.contains(className));

    if (!isTrackedCta) return;

    sendFounderEvent(isApply ? "apply_click" : "cta_click", {
      cta_key: isApply ? (slug(anchor.textContent) || "apply") + "_apply" : (slug(anchor.textContent) || slug(href) || "cta"),
      meta: {
        href: anchor.href || href,
      },
    });
  }, true);

  const nav = document.querySelector(".site-nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Unicorn fades in on load; nav/wordmark/Instagram revealed on click
  const splashLogo = document.getElementById("splash-logo");
  const splashWordmark = document.getElementById("splash-wordmark");
  const splashSubtitle = document.getElementById("splash-subtitle");
  const splashBottom = document.querySelector(".splash-bottom");
  if (splashLogo) requestAnimationFrame(() => splashLogo.classList.add("is-loaded"));

  // Click unicorn to reveal nav — no unicorn movement, nav fades in only
  const splashUnicorn = document.getElementById("splash-unicorn");
  const splashNav = document.getElementById("splash-nav");
  if (splashUnicorn && splashNav) {
    splashUnicorn.addEventListener("click", () => {
      splashNav.classList.add("is-revealed");
      splashNav.removeAttribute("aria-hidden");
      splashUnicorn.setAttribute("aria-expanded", "true");
      if (splashWordmark) splashWordmark.classList.add("is-revealed");
      if (splashSubtitle) splashSubtitle.classList.add("is-revealed");
      if (splashBottom) splashBottom.classList.add("is-revealed");
      if (!getConsent()) cookieBanner.showBanner();
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
      // threshold:0 + a bottom rootMargin reveals an element once its top
      // has scrolled a little into view. A percentage threshold (was 0.12)
      // can NEVER be reached by an element taller than the viewport — e.g. the
      // 16,900px /terms/ .legal block maxes out at ~5% visibility, so it
      // stayed at opacity:0 forever. This works for any element height.
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
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
        o: Math.random() * 0.37 + 0.12,
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
  sg.addColorStop(0.00, "rgba(248, 222, 132, 0.88)");
  sg.addColorStop(0.12, "rgba(232, 193, 74, 0.58)");
  sg.addColorStop(0.35, "rgba(212, 168, 67, 0.24)");
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
