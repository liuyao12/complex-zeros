(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const dial = document.querySelector('.ef-projective-dial');
  const angleInput = document.getElementById('ef-angle');
  const presetSelect = document.getElementById('ef-preset');
  const sourceMarks = angleInput?.closest('.angle-control')?.querySelector('.ef-singular-marks');
  const dynamicMarks = dial?.querySelector('.ef-projective-marks');
  const pauseButton = document.querySelector('.ef-projective-animation-toggle');

  if (!dial || !angleInput || !sourceMarks) return;

  // The source marks are recomputed by the algebraic layer. They remain hidden:
  // the visible orange hands below are rebuilt only when their parameter
  // values change, which happens when the charge configuration changes.
  if (dynamicMarks) {
    dynamicMarks.hidden = true;
    dynamicMarks.setAttribute('aria-hidden', 'true');
  }

  const rimSelector = document.createElementNS(NS, 'svg');
  rimSelector.classList.add('ef-projective-rim-selector');
  rimSelector.setAttribute('viewBox', '0 0 100 100');
  rimSelector.setAttribute('preserveAspectRatio', 'none');
  rimSelector.setAttribute('aria-hidden', 'true');
  const rimHit = document.createElementNS(NS, 'circle');
  rimHit.classList.add('ef-projective-rim-hit');
  rimHit.setAttribute('cx', '50');
  rimHit.setAttribute('cy', '50');
  rimHit.setAttribute('r', '41.5');
  rimSelector.append(rimHit);
  dial.append(rimSelector);

  const radiiLayer = document.createElement('span');
  radiiLayer.className = 'ef-fixed-critical-radii';
  radiiLayer.setAttribute('aria-label', 'Critical parameters of the pencil');
  dial.append(radiiLayer);

  const style = document.createElement('style');
  style.id = 'ef-static-critical-radii-styles';
  style.textContent = `
    /* A plain projective circle. The green moving object is only a radius. */
    .ef-projective-ring {
      background: rgba(255,255,255,.98) !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.72),
        0 2px 7px rgba(24,33,31,.12) !important;
    }
    .ef-projective-knob { display: none !important; }
    .ef-projective-indicator {
      width: 2.7px !important;
      height: calc(var(--dial-size) / 2 - 11px) !important;
      border-radius: 999px !important;
      background: var(--accent) !important;
      box-shadow: none !important;
      z-index: 7 !important;
    }
    .ef-projective-center {
      z-index: 8 !important;
      padding: 4px 5px;
      border-radius: 999px;
      background: rgba(255,255,255,.94);
      pointer-events: none;
    }
    .ef-projective-marks { display: none !important; }

    /* A broad invisible stroke makes every point of the rim selectable. */
    .ef-projective-rim-selector {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 5;
      overflow: visible;
      pointer-events: none;
    }
    .ef-projective-rim-hit {
      fill: none;
      stroke: rgba(0,0,0,.001);
      stroke-width: 15;
      pointer-events: stroke;
      cursor: pointer;
    }

    /* Each critical parameter is a fixed orange clock hand from the common
       center to the circumference. The transparent width is only a hit area. */
    .ef-fixed-critical-radii {
      position: absolute;
      inset: 0;
      z-index: 6;
      pointer-events: none;
    }
    .ef-fixed-critical-radius {
      --ef-critical-radius-rotation: 0rad;
      position: absolute;
      left: 50%;
      top: 50%;
      width: 22px;
      height: calc(var(--dial-size) / 2 - 11px);
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
      pointer-events: auto;
      transform-origin: 50% 100%;
      transform:
        translate(-50%, -100%)
        rotate(var(--ef-critical-radius-rotation));
    }
    .ef-fixed-critical-radius::before {
      content: "";
      position: absolute;
      left: 50%;
      bottom: 0;
      width: 2.4px;
      height: 100%;
      border-radius: 999px;
      background: rgba(224,119,31,.72);
      transform: translateX(-50%);
      transition: width 100ms ease, background 100ms ease;
    }
    .ef-fixed-critical-radius:hover,
    .ef-fixed-critical-radius:focus-visible {
      outline: none;
    }
    .ef-fixed-critical-radius:hover::before,
    .ef-fixed-critical-radius:focus-visible::before {
      width: 3.5px;
      background: rgba(224,119,31,.96);
    }
  `;
  document.head.append(style);

  let cachedMarks = [];
  let markSignature = null;
  let rebuildQueued = false;
  let transitionFrame = 0;

  const modPi = theta => ((theta % Math.PI) + Math.PI) % Math.PI;

  function currentTheta() {
    return modPi((+angleInput.value || 0) * Math.PI / 180);
  }

  function setTheta(theta) {
    angleInput.value = (modPi(theta) * 180 / Math.PI).toFixed(2);
    angleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function ensurePaused() {
    if (pauseButton?.getAttribute('aria-pressed') !== 'true') {
      pauseButton?.click();
    }
    // Focusing the hidden native range is also the base animation loop's pause
    // signal, and is a fallback if the visible pause control is unavailable.
    angleInput.focus({ preventScroll: true });
  }

  function readCriticalMarks() {
    return [...sourceMarks.querySelectorAll('.ef-singular-mark')]
      .map(mark => ({
        percent: parseFloat(mark.style.left),
        title: mark.title || mark.getAttribute('aria-label') || 'Singular member'
      }))
      .filter(mark => Number.isFinite(mark.percent))
      .sort((a, b) => a.percent - b.percent);
  }

  function signatureFor(marks) {
    return marks
      .map(mark => `${mark.percent.toFixed(7)}|${mark.title}`)
      .join(';');
  }

  function smoothToTheta(target) {
    ensurePaused();
    cancelAnimationFrame(transitionFrame);

    const start = currentTheta();
    let delta = modPi(target) - start;
    if (delta > Math.PI / 2) delta -= Math.PI;
    if (delta < -Math.PI / 2) delta += Math.PI;

    const started = performance.now();
    const duration = 480;
    const ease = t => 1 - Math.pow(1 - t, 3);

    const step = now => {
      const u = Math.min(1, (now - started) / duration);
      setTheta(start + delta * ease(u));
      if (u < 1) transitionFrame = requestAnimationFrame(step);
      else angleInput.focus({ preventScroll: true });
    };
    transitionFrame = requestAnimationFrame(step);
  }

  function thetaFromRimPointer(event) {
    const rect = dial.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const phi = Math.atan2(dy, dx);
    return modPi((phi + Math.PI / 2) / 2);
  }

  rimHit.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    smoothToTheta(thetaFromRimPointer(event));
  });

  function layoutCriticalRadii() {
    radiiLayer.replaceChildren();

    cachedMarks.forEach((mark, index) => {
      const target = mark.percent / 100 * Math.PI;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ef-fixed-critical-radius';
      // The projective circle goes once around while theta goes from 0 to pi.
      button.style.setProperty(
        '--ef-critical-radius-rotation',
        `${2 * target}rad`
      );
      button.title = mark.title;
      button.setAttribute('aria-label', mark.title || `Critical parameter ${index + 1}`);
      button.addEventListener('pointerdown', event => {
        event.stopPropagation();
      });
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        smoothToTheta(target);
      });
      radiiLayer.append(button);
    });
  }

  function updateCriticalRadiiFromCharges() {
    rebuildQueued = false;
    const marks = readCriticalMarks();
    const signature = signatureFor(marks);
    if (signature === markSignature) return;

    markSignature = signature;
    cachedMarks = marks;
    layoutCriticalRadii();
  }

  function queueCriticalUpdate() {
    if (rebuildQueued) return;
    rebuildQueued = true;
    requestAnimationFrame(updateCriticalRadiiFromCharges);
  }

  // The hidden source layer may be regenerated during animation, but the
  // signature ignores current-parameter styling. Consequently the visible
  // orange hands are unchanged unless the critical angles themselves change.
  new MutationObserver(queueCriticalUpdate).observe(sourceMarks, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'title', 'aria-label']
  });

  presetSelect?.addEventListener('change', queueCriticalUpdate);
  new ResizeObserver(layoutCriticalRadii).observe(dial);
  window.addEventListener('resize', layoutCriticalRadii);

  queueCriticalUpdate();
})();