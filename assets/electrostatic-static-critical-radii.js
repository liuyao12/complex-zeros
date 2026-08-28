(() => {
  'use strict';

  const dial = document.querySelector('.ef-projective-dial');
  const angleInput = document.getElementById('ef-angle');
  const presetSelect = document.getElementById('ef-preset');
  const sourceMarks = angleInput?.closest('.angle-control')?.querySelector('.ef-singular-marks');
  const dynamicMarks = dial?.querySelector('.ef-projective-marks');
  const pauseButton = document.querySelector('.ef-projective-animation-toggle');

  if (!dial || !angleInput || !sourceMarks) return;

  // The original dial rebuilt its visible marks on every animated parameter
  // frame. Keep those internal marks available as a data source, but never
  // display them. The visible critical radii below are rebuilt only when their
  // angles actually change, i.e. when the charge configuration changes.
  if (dynamicMarks) {
    dynamicMarks.hidden = true;
    dynamicMarks.setAttribute('aria-hidden', 'true');
  }

  const radiiLayer = document.createElement('span');
  radiiLayer.className = 'ef-fixed-critical-radii';
  radiiLayer.setAttribute('aria-label', 'Critical parameters of the pencil');
  dial.append(radiiLayer);

  const style = document.createElement('style');
  style.id = 'ef-static-critical-radii-styles';
  style.textContent = `
    /* A plain projective circle with one moving radius. */
    .ef-projective-ring {
      background: rgba(255,255,255,.98) !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.72),
        0 2px 7px rgba(24,33,31,.12) !important;
    }
    .ef-projective-knob {
      display: none !important;
    }
    .ef-projective-indicator {
      width: 2.5px !important;
      height: 48px !important;
      border-radius: 999px !important;
      background: var(--accent) !important;
      box-shadow: none !important;
      z-index: 4;
    }
    .ef-projective-center {
      z-index: 5;
      padding: 4px 5px;
      border-radius: 999px;
      background: rgba(255,255,255,.9);
    }
    .ef-projective-marks {
      display: none !important;
    }

    /* Critical parameters are fixed radial notches. Their transparent button
       supplies a comfortable hit target, but the visible object is only a
       short radius crossing the circumference. */
    .ef-fixed-critical-radii {
      position: absolute;
      inset: 0;
      z-index: 6;
      pointer-events: none;
    }
    .ef-fixed-critical-radius {
      --ef-critical-radius-rotation: 0rad;
      position: absolute;
      width: 30px;
      height: 30px;
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
      pointer-events: auto;
      transform:
        translate(-50%, -50%)
        rotate(var(--ef-critical-radius-rotation));
      overflow: visible;
    }
    .ef-fixed-critical-radius::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 3px;
      height: 19px;
      border-radius: 999px;
      background: #e98a2d;
      box-shadow: 0 0 0 1px rgba(255,255,255,.75);
      transform: translate(-50%, -50%);
      transition: width 110ms ease, height 110ms ease, background 110ms ease;
    }
    .ef-fixed-critical-radius:hover,
    .ef-fixed-critical-radius:focus-visible {
      outline: none;
    }
    .ef-fixed-critical-radius:hover::before,
    .ef-fixed-critical-radius:focus-visible::before {
      width: 4px;
      height: 23px;
      background: #f3a34e;
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
    cancelAnimationFrame(transitionFrame);
    const start = currentTheta();
    let delta = target - start;
    if (delta > Math.PI / 2) delta -= Math.PI;
    if (delta < -Math.PI / 2) delta += Math.PI;

    const started = performance.now();
    const duration = 460;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const paused = pauseButton?.getAttribute('aria-pressed') === 'true';
    angleInput.focus({ preventScroll: true });

    const step = now => {
      const u = Math.min(1, (now - started) / duration);
      setTheta(start + delta * ease(u));
      if (u < 1) transitionFrame = requestAnimationFrame(step);
      else if (!paused) angleInput.blur();
    };
    transitionFrame = requestAnimationFrame(step);
  }

  function layoutCriticalRadii() {
    radiiLayer.replaceChildren();
    const center = dial.clientWidth / 2;
    const radius = center - 11;

    cachedMarks.forEach((mark, index) => {
      const target = mark.percent / 100 * Math.PI;
      const phi = 2 * target - Math.PI / 2;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ef-fixed-critical-radius';
      button.style.left = `${center + radius * Math.cos(phi)}px`;
      button.style.top = `${center + radius * Math.sin(phi)}px`;
      button.style.setProperty(
        '--ef-critical-radius-rotation',
        `${phi + Math.PI / 2}rad`
      );
      button.title = mark.title;
      button.setAttribute('aria-label', mark.title || `Critical parameter ${index + 1}`);
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
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

  // The hidden source layer is regenerated during animation. The signature
  // check makes those no-op updates free: the visible radii change only when
  // the critical angles themselves change after moving or replacing charges.
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