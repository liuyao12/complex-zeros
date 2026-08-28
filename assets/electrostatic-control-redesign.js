(() => {
  'use strict';

  const dial = document.querySelector('.ef-projective-dial');
  const marksLayer = document.querySelector('.ef-projective-marks');
  if (!dial || !marksLayer) return;

  document.querySelector('.configuration-label')?.remove();

  const style = document.createElement('style');
  style.id = 'ef-control-redesign-styles';
  style.textContent = `
    .ef-projective-parameter-panel {
      grid-template-columns: auto minmax(0, 1fr) !important;
      gap: 10px 16px !important;
      padding: 2px 2px 4px;
    }
    .ef-projective-parameter-controls {
      gap: 16px !important;
    }
    .ef-projective-dial {
      --dial-size: 128px !important;
    }
    .ef-projective-ring {
      inset: 11px !important;
      border-width: 2.5px !important;
      background:
        radial-gradient(circle, rgba(255,255,255,.98) 0 49%, transparent 50%),
        conic-gradient(from -90deg,
          rgba(22,135,117,.20),
          rgba(49,95,159,.18),
          rgba(22,135,117,.20)) !important;
      box-shadow:
        inset 0 0 0 7px rgba(255,255,255,.68),
        0 2px 8px rgba(24,33,31,.13) !important;
    }
    .ef-projective-indicator {
      width: 3px !important;
      height: 43px !important;
      box-shadow: 0 0 7px rgba(22,135,117,.38) !important;
    }
    .ef-projective-knob {
      width: 13px !important;
      height: 13px !important;
      border-width: 2px !important;
    }
    .ef-projective-center {
      font-size: 14px !important;
      font-weight: 800 !important;
    }
    .ef-projective-animation-toggle {
      min-width: 84px !important;
      min-height: 38px !important;
    }
    .ef-projective-angle-value {
      min-width: 48px !important;
      font-size: 13px !important;
    }

    /* Critical parameters are teeth cut across the parameter circle.  The
       button remains as an invisible, accessible hit target, but no button
       shape or number is shown. */
    .ef-projective-singular-mark {
      --ef-tooth-rotation: 0rad;
      width: 25px !important;
      height: 29px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: transparent !important;
      padding: 0 !important;
      font-size: 0 !important;
      box-shadow: none !important;
      transform: translate(-50%, -50%) rotate(var(--ef-tooth-rotation)) !important;
      overflow: visible;
    }
    .ef-projective-singular-mark::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 5px;
      height: 18px;
      border: 1.5px solid rgba(6,19,29,.92);
      border-radius: 2px;
      background: #ffad52;
      box-shadow: 0 0 0 1px rgba(255,255,255,.72), 0 1px 4px rgba(0,0,0,.22);
      transform: translate(-50%, -50%);
      transform-origin: center;
      transition: height 120ms ease, width 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }
    .ef-projective-singular-mark:hover,
    .ef-projective-singular-mark:focus-visible {
      outline: none !important;
      transform: translate(-50%, -50%) rotate(var(--ef-tooth-rotation)) !important;
    }
    .ef-projective-singular-mark:hover::before,
    .ef-projective-singular-mark:focus-visible::before {
      width: 6px;
      height: 23px;
      background: #ffc169;
      box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 2px 7px rgba(0,0,0,.28);
    }
    .ef-projective-singular-mark.is-current::before {
      width: 6px;
      height: 24px;
      background: #fff0b8;
      box-shadow: 0 0 0 2px #ffad52, 0 0 11px rgba(255,173,82,.92);
    }

    @media (max-width: 640px) {
      .ef-projective-dial { --dial-size: 116px !important; }
      .ef-projective-parameter-controls { gap: 12px !important; }
      .ef-projective-animation-toggle { min-width: 78px !important; }
    }
  `;
  document.head.append(style);

  let queued = false;

  function orientTeeth() {
    queued = false;
    const cx = dial.clientWidth / 2;
    const cy = dial.clientHeight / 2;

    for (const mark of marksLayer.querySelectorAll('.ef-projective-singular-mark')) {
      const x = parseFloat(mark.style.left);
      const y = parseFloat(mark.style.top);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

      // A vertical tooth at the top has rotation zero.  Rotate it radially as
      // it moves around the projective parameter circle.
      const rotation = Math.atan2(y - cy, x - cx) + Math.PI / 2;
      mark.style.setProperty('--ef-tooth-rotation', `${rotation}rad`);
      if (mark.textContent) mark.textContent = '';
    }
  }

  function queueOrientTeeth() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(orientTeeth);
  }

  new MutationObserver(queueOrientTeeth).observe(marksLayer, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  new ResizeObserver(queueOrientTeeth).observe(dial);
  window.addEventListener('resize', queueOrientTeeth);

  queueOrientTeeth();
})();