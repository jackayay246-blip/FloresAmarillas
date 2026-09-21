(() => {
  "use strict";

  const appShell = document.getElementById("appShell");
  const welcomeScreen = document.getElementById("welcomeScreen");
  const startFlower = document.getElementById("startFlower");
  const universe = document.getElementById("universe");
  const orbitStage = document.getElementById("orbitStage");
  const orbitNodes = [...document.querySelectorAll(".orbit-node")];
  const coreFlower = document.getElementById("coreFlower");
  const ringAnchor = document.getElementById("ringAnchor");
  const starfield = document.getElementById("starfield");
  const particleBurst = document.getElementById("particleBurst");
  const messageCard = document.getElementById("messageCard");
  const messageText = document.getElementById("messageText");
  const soundToggle = document.getElementById("soundToggle");
  const soundText = document.getElementById("soundText");
  const ambientAudio = document.getElementById("ambientAudio");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let hasEntered = false;
  let sceneActive = false;
  let reducedMotion = motionQuery.matches;
  let rafId = null;
  let lastFrame = 0;
  let orbitAngle = 0;
  let orbitFrozenUntil = 0;
  let activeNode = null;
  let messageTimer = null;
  let resizeTimer = null;

  const parallax = {
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
  };

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createAmbientParticles() {
    const isSmallScreen = window.innerWidth < 600;
    const total = isSmallScreen ? 38 : 58;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < total; index += 1) {
      const particle = document.createElement("span");
      const spark = index % 9 === 0;
      const size = randomBetween(spark ? 1.4 : 0.7, spark ? 2.5 : 1.75).toFixed(2);

      particle.className = `ambient-particle${spark ? " is-spark" : ""}`;
      particle.style.left = `${randomBetween(1, 99).toFixed(2)}%`;
      particle.style.top = `${randomBetween(1, 99).toFixed(2)}%`;
      particle.style.setProperty("--size", `${size}px`);
      particle.style.setProperty("--duration", `${randomBetween(5.8, 12.5).toFixed(2)}s`);
      particle.style.setProperty("--delay", `${randomBetween(-12, 0).toFixed(2)}s`);
      particle.style.setProperty("--particle-opacity", randomBetween(0.24, spark ? 0.86 : 0.65).toFixed(2));
      particle.style.setProperty("--drift-x", `${randomBetween(-13, 13).toFixed(1)}px`);
      particle.style.setProperty("--drift-y", `${randomBetween(-18, 10).toFixed(1)}px`);
      particle.style.setProperty("--particle-color", spark ? "#f6c945" : index % 3 === 0 ? "#fff7d6" : "#ffd84d");
      fragment.appendChild(particle);
    }

    starfield.replaceChildren(fragment);
  }

  function getBurstOrigin(element) {
    const elementRect = element.getBoundingClientRect();
    const shellRect = appShell.getBoundingClientRect();

    return {
      x: elementRect.left - shellRect.left + elementRect.width / 2,
      y: elementRect.top - shellRect.top + elementRect.height / 2,
    };
  }

  function emitParticles(element, requestedCount = 12) {
    const origin = getBurstOrigin(element);
    const count = reducedMotion ? Math.min(4, requestedCount) : requestedCount;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("span");
      const angle = randomBetween(0, Math.PI * 2);
      const distance = randomBetween(24, reducedMotion ? 48 : 92);
      const isPetal = index % 4 === 0;
      const color = index % 3 === 0 ? "#fff7d6" : index % 3 === 1 ? "#ffd84d" : "#ffb800";

      particle.className = `burst-particle${isPetal ? " is-petal" : ""}`;
      particle.style.left = `${origin.x}px`;
      particle.style.top = `${origin.y}px`;
      particle.style.setProperty("--burst-size", `${randomBetween(3, 6.2).toFixed(2)}px`);
      particle.style.setProperty("--burst-x", `${(Math.cos(angle) * distance).toFixed(1)}px`);
      particle.style.setProperty("--burst-y", `${(Math.sin(angle) * distance - randomBetween(8, 28)).toFixed(1)}px`);
      particle.style.setProperty("--burst-rotate", `${randomBetween(-210, 210).toFixed(0)}deg`);
      particle.style.setProperty("--burst-color", color);
      particle.addEventListener("animationend", () => particle.remove(), { once: true });
      fragment.appendChild(particle);
    }

    particleBurst.appendChild(fragment);
  }

  function showMessage(message) {
    window.clearTimeout(messageTimer);
    messageText.textContent = message;
    messageCard.classList.add("is-visible");
    messageTimer = window.setTimeout(() => {
      messageCard.classList.remove("is-visible");
    }, 4300);
  }

  function renderOrbit(now) {
    if (!sceneActive || !orbitStage.clientWidth) return;

    const stageBounds = orbitStage.getBoundingClientRect();
    const baseRadius = Math.min(stageBounds.width, stageBounds.height) * 0.34;
    const orbitX = baseRadius;
    const orbitY = baseRadius * 0.46;
    const interactionActive = now < orbitFrozenUntil;

    orbitNodes.forEach((node) => {
      const startAngle = Number(node.dataset.angle || 0);
      const distance = Number(node.dataset.radius || 1);
      const radians = ((startAngle + orbitAngle) * Math.PI) / 180;
      const depth = (Math.sin(radians) + 1) / 2;
      const x = Math.cos(radians) * orbitX * distance + parallax.currentX * (0.35 + depth * 0.35);
      const y = Math.sin(radians) * orbitY * distance + parallax.currentY * (0.28 + depth * 0.32);
      const selected = interactionActive && activeNode === node;
      const scale = (0.72 + depth * 0.4) * (selected ? 1.2 : 1);
      const opacity = 0.43 + depth * 0.57;
      const blur = Math.max(0, (1 - depth) * 0.65);

      node.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
      node.style.opacity = opacity.toFixed(3);
      node.style.zIndex = String(8 + Math.round(depth * 42));
      node.style.setProperty("--node-blur", `${blur.toFixed(2)}px`);
    });

    if (!interactionActive) activeNode = null;

    ringAnchor.style.setProperty("--ring-x", `${(parallax.currentX * 0.55).toFixed(2)}px`);
    ringAnchor.style.setProperty("--ring-y", `${(parallax.currentY * 0.45).toFixed(2)}px`);
    starfield.style.transform = `translate3d(${(-parallax.currentX * 0.55).toFixed(2)}px, ${(-parallax.currentY * 0.55).toFixed(2)}px, 0)`;
  }

  function updateParallax() {
    parallax.currentX += (parallax.targetX - parallax.currentX) * 0.055;
    parallax.currentY += (parallax.targetY - parallax.currentY) * 0.055;
  }

  function animationLoop(now) {
    rafId = null;

    if (!sceneActive || reducedMotion || document.hidden) return;

    const delta = Math.min(now - lastFrame || 16.67, 48);
    lastFrame = now;
    updateParallax();

    if (now >= orbitFrozenUntil) {
      orbitAngle = (orbitAngle + delta * 0.01125) % 360;
    }

    renderOrbit(now);
    rafId = window.requestAnimationFrame(animationLoop);
  }

  function startSceneLoop() {
    if (!sceneActive) return;

    const now = performance.now();
    renderOrbit(now);

    if (reducedMotion || document.hidden || rafId) return;
    lastFrame = now;
    rafId = window.requestAnimationFrame(animationLoop);
  }

  function stopSceneLoop() {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }

  function activateDetail(element) {
    const now = performance.now();
    const message = element.dataset.message;

    orbitFrozenUntil = now + 820;
    activeNode = element.classList.contains("orbit-node") ? element : null;
    element.classList.add("is-selected");
    emitParticles(element, element === coreFlower ? 16 : 12);
    showMessage(message);

    window.setTimeout(() => {
      element.classList.remove("is-selected");
    }, 920);

    renderOrbit(now);
  }

  function enterExperience() {
    if (hasEntered) return;
    hasEntered = true;
    startFlower.classList.add("is-activated");
    emitParticles(startFlower, 18);

    window.setTimeout(() => {
      welcomeScreen.classList.add("is-leaving");
      universe.classList.add("is-visible");
      universe.setAttribute("aria-hidden", "false");
      soundToggle.disabled = false;
      sceneActive = true;
      window.requestAnimationFrame(startSceneLoop);
    }, 180);

    window.setTimeout(() => {
      welcomeScreen.setAttribute("aria-hidden", "true");
      welcomeScreen.hidden = true;
    }, 1100);
  }

  function updateParallaxTarget(clientX, clientY) {
    if (reducedMotion) return;

    const xRatio = clientX / Math.max(window.innerWidth, 1) - 0.5;
    const yRatio = clientY / Math.max(window.innerHeight, 1) - 0.5;
    parallax.targetX = xRatio * 13;
    parallax.targetY = yRatio * 11;
  }

  async function toggleAudio() {
    const source = appShell.dataset.audioSrc.trim();

    if (!source) {
      showMessage("El control está listo para una pista libre de derechos. Añade su ruta en data-audio-src.");
      emitParticles(soundToggle, 7);
      return;
    }

    if (!ambientAudio.getAttribute("src")) {
      ambientAudio.src = source;
      ambientAudio.load();
    }

    if (ambientAudio.paused) {
      try {
        await ambientAudio.play();
        soundToggle.classList.add("is-playing");
        soundToggle.setAttribute("aria-pressed", "true");
        soundToggle.setAttribute("aria-label", "Silenciar sonido");
        soundText.textContent = "Silenciar sonido";
        soundToggle.querySelector(".sound-icon").textContent = "🔊";
      } catch (error) {
        showMessage("No se pudo iniciar el audio. Comprueba la ruta del archivo y vuelve a intentarlo.");
      }
    } else {
      ambientAudio.pause();
      soundToggle.classList.remove("is-playing");
      soundToggle.setAttribute("aria-pressed", "false");
      soundToggle.setAttribute("aria-label", "Activar sonido");
      soundText.textContent = "Activar sonido";
      soundToggle.querySelector(".sound-icon").textContent = "🔇";
    }
  }

  function onMotionPreferenceChange(event) {
    reducedMotion = event.matches;

    if (reducedMotion) {
      stopSceneLoop();
      parallax.targetX = 0;
      parallax.targetY = 0;
      parallax.currentX = 0;
      parallax.currentY = 0;
      renderOrbit(performance.now());
    } else {
      startSceneLoop();
    }
  }

  startFlower.addEventListener("click", enterExperience);
  orbitNodes.forEach((node) => node.addEventListener("click", () => activateDetail(node)));
  coreFlower.addEventListener("click", () => activateDetail(coreFlower));
  soundToggle.addEventListener("click", toggleAudio);

  appShell.addEventListener(
    "pointermove",
    (event) => {
      updateParallaxTarget(event.clientX, event.clientY);
    },
    { passive: true },
  );

  appShell.addEventListener(
    "pointerleave",
    () => {
      parallax.targetX = 0;
      parallax.targetY = 0;
    },
    { passive: true },
  );

  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => renderOrbit(performance.now()), 90);
    },
    { passive: true },
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSceneLoop();
    } else {
      startSceneLoop();
    }
  });

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", onMotionPreferenceChange);
  } else {
    motionQuery.addListener(onMotionPreferenceChange);
  }

  createAmbientParticles();
})();
