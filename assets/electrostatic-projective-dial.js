(() => {
  'use strict';

  const stage = document.getElementById('ef-stage');
  const overlay = document.getElementById('ef-overlay');
  const presetSelect = document.getElementById('ef-preset');
  const angleInput = document.getElementById('ef-angle');
  const nativeControl = angleInput?.closest('.angle-control');
  const angleRow = nativeControl?.closest('.angle-row');
  const sourceMarks = nativeControl?.querySelector('.ef-singular-marks');
  const focusCanvas = document.getElementById('ef-curve-focus');
  const staticCanvas = document.getElementById('ef-static');

  if (!stage || !overlay || !presetSelect || !angleInput || !nativeControl || !angleRow) return;

  const simplePresets = new Set(['dipole', 'like']);
  const state = {
    paused: false,
    dragging: false,
    transitionFrame: 0,
    marksQueued: false,
    blurTimer: 0
  };

  const panel = document.createElement('div');
  panel.className = 'ef-projective-parameter-panel';
  panel.innerHTML = `
    <span class="ef-projective-parameter-label">pencil parameter</span>
    <div class="ef-projective-parameter-controls">
      <div class="ef-projective-dial" role="slider" tabindex="0"
           aria-label="Pencil parameter on the real projective line"
           aria-valuemin="0" aria-valuemax="180" aria-valuenow="45">
        <span class="ef-projective-ring" aria-hidden="true"></span>
        <span class="ef-projective-indicator" aria-hidden="true"></span>
        <span class="ef-projective-knob" aria-hidden="true"></span>
        <span class="ef-projective-center" aria-hidden="true">ℝP¹</span>
        <span class="ef-projective-marks" aria-label="Singular pencil parameters"></span>
      </div>
      <button type="button" class="ef-projective-animation-toggle" aria-pressed="false">Pause</button>
      <output class="ef-projective-angle-value">45°</output>
    </div>`;
  angleRow.append(panel);

  const dial = panel.querySelector('.ef-projective-dial');
  const indicator = panel.querySelector('.ef-projective-indicator');
  const knob = panel.querySelector('.ef-projective-knob');
  const marksLayer = panel.querySelector('.ef-projective-marks');
  const animateButton = panel.querySelector('.ef-projective-animation-toggle');
  const dialValue = panel.querySelector('.ef-projective-angle-value');

  nativeControl.classList.add('ef-hidden-native-parameter');

  function installStyles() {
    if (document.getElementById('ef-projective-dial-styles')) return;
    const style = document.createElement('style');
    style.id = 'ef-projective-dial-styles';
    style.textContent = `
      .ef-hidden-native-parameter {
        position: absolute !important;
        left: -10000px !important;
        top: auto !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .angle-row { position: relative; display: block !important; }
      .ef-projective-parameter-panel {
        display: grid;
        grid-template-columns: auto minmax(0,1fr);
        align-items: center;
        gap: 8px 12px;
        width: 100%;
      }
      .ef-projective-parameter-label {
        color: var(--muted);
        font-size: 12px;
        font-weight: 750;
        white-space: nowrap;
      }
      .ef-projective-parameter-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .ef-projective-dial {
        --dial-size: 84px;
        position: relative;
        flex: 0 0 var(--dial-size);
        width: var(--dial-size);
        height: var(--dial-size);
        border-radius: 50%;
        touch-action: none;
        cursor: grab;
        user-select: none;
      }
      .ef-projective-dial:active { cursor: grabbing; }
      .ef-projective-dial:focus-visible {
        outline: 2px solid var(--accent-2);
        outline-offset: 3px;
      }
      .ef-projective-ring {
        position: absolute;
        inset: 7px;
        border: 2px solid rgba(24,33,31,.26);
        border-radius: 50%;
        background:
          radial-gradient(circle, rgba(255,255,255,.96) 0 47%, transparent 48%),
          conic-gradient(from -90deg, rgba(22,135,117,.16), rgba(49,95,159,.16), rgba(22,135,117,.16));
        box-shadow: inset 0 0 0 5px rgba(255,255,255,.62), 0 1px 4px rgba(24,33,31,.12);
      }
      .ef-projective-indicator {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 2px;
        height: 28px;
        border-radius: 999px;
        background: var(--accent);
        transform-origin: 50% 100%;
        transform: translate(-50%,-100%) rotate(0deg);
        box-shadow: 0 0 5px rgba(22,135,117,.3);
        pointer-events: none;
      }
      .ef-projective-knob {
        position: absolute;
        left: 50%;
        top: 8px;
        width: 11px;
        height: 11px;
        border: 1.5px solid #06131d;
        border-radius: 50%;
        background: #fff;
        transform: translate(-50%,-50%);
        box-shadow: 0 1px 5px rgba(0,0,0,.26);
        pointer-events: none;
      }
      .ef-projective-center {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
        color: var(--muted);
        font: 750 11px/1 ui-serif,Georgia,serif;
        pointer-events: none;
      }
      .ef-projective-marks { position: absolute; inset: 0; pointer-events: none; }
      .ef-projective-singular-mark {
        position: absolute;
        display: grid;
        place-items: center;
        width: 14px;
        height: 14px;
        border: 1.5px solid rgba(6,19,29,.92);
        border-radius: 50%;
        background: #ffad52;
        color: #07131d;
        padding: 0;
        font: 900 8px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
        box-shadow: 0 0 0 1px rgba(255,255,255,.75), 0 2px 5px rgba(0,0,0,.22);
        cursor: pointer;
        pointer-events: auto;
        transform: translate(-50%,-50%);
        transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
      }
      .ef-projective-singular-mark:hover,
      .ef-projective-singular-mark:focus-visible {
        transform: translate(-50%,-50%) scale(1.2);
        outline: none;
        box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 3px 8px rgba(0,0,0,.28);
      }
      .ef-projective-singular-mark.is-current {
        background: #fff0b8;
        box-shadow: 0 0 0 2px #ffad52, 0 0 9px rgba(255,173,82,.85);
      }
      .ef-projective-animation-toggle {
        min-width: 76px;
        min-height: 34px;
        border: 1px solid rgba(24,33,31,.18) !important;
        border-radius: 999px !important;
        background: #fff !important;
        color: var(--ink) !important;
        font-weight: 750 !important;
        cursor: pointer;
      }
      .ef-projective-animation-toggle[aria-pressed="true"] {
        border-color: var(--accent) !important;
        background: rgba(22,135,117,.1) !important;
        color: var(--accent) !important;
      }
      .ef-projective-angle-value {
        min-width: 43px;
        color: var(--ink);
        font: 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        text-align: right;
      }
      .ef-singular-marks { display: none !important; }
      @media (max-width: 640px) {
        .ef-projective-parameter-panel { grid-template-columns: 1fr; }
        .ef-projective-parameter-label { display: none; }
        .ef-projective-parameter-controls { justify-content: center; }
      }
    `;
    document.head.append(style);
  }

  const modPi = t => ((t % Math.PI) + Math.PI) % Math.PI;

  function degrees() {
    const value = +angleInput.value || 0;
    return ((value % 180) + 180) % 180;
  }

  function theta() {
    return degrees() * Math.PI / 180;
  }

  function setDegrees(value) {
    const normalized = ((value % 180) + 180) % 180;
    angleInput.value = normalized.toFixed(2);
    angleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyMemberMode() {
    const simple = simplePresets.has(presetSelect.value);
    if (focusCanvas) focusCanvas.style.display = simple ? 'block' : 'none';
    if (staticCanvas) staticCanvas.style.opacity = simple ? '0.28' : '1';
  }

  function updateDial() {
    const value = degrees();
    const rotation = 2 * value;
    indicator.style.transform = `translate(-50%,-100%) rotate(${rotation}deg)`;
    const phi = (2 * value - 90) * Math.PI / 180;
    const radius = dial.clientWidth / 2 - 8;
    knob.style.left = `${dial.clientWidth / 2 + radius * Math.cos(phi)}px`;
    knob.style.top = `${dial.clientHeight / 2 + radius * Math.sin(phi)}px`;
    dialValue.value = `${value.toFixed(value % 1 ? 1 : 0)}°`;
    dialValue.textContent = dialValue.value;
    dial.setAttribute('aria-valuenow', value.toFixed(2));
    dial.setAttribute('aria-valuetext', `${value.toFixed(1)} degrees modulo 180`);
    syncMarks();
    applyMemberMode();
  }

  function thetaFromPointer(event) {
    const rect = dial.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    let phi = Math.atan2(dy, dx) + Math.PI / 2;
    phi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return phi / 2;
  }

  function beginManual() {
    if (!state.paused) angleInput.focus({ preventScroll: true });
  }

  function endManual(delay = 0) {
    clearTimeout(state.blurTimer);
    if (state.paused) return;
    state.blurTimer = setTimeout(() => angleInput.blur(), delay);
  }

  function setPaused(paused) {
    state.paused = paused;
    animateButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
    animateButton.textContent = paused ? 'Animate' : 'Pause';
    if (paused) angleInput.focus({ preventScroll: true });
    else angleInput.blur();
  }

  animateButton.addEventListener('click', () => setPaused(!state.paused));

  dial.addEventListener('pointerdown', event => {
    event.preventDefault();
    state.dragging = true;
    beginManual();
    dial.setPointerCapture?.(event.pointerId);
    setDegrees(thetaFromPointer(event) * 180 / Math.PI);
  });
  dial.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    setDegrees(thetaFromPointer(event) * 180 / Math.PI);
  });
  const finishDrag = event => {
    if (!state.dragging) return;
    state.dragging = false;
    dial.releasePointerCapture?.(event.pointerId);
    endManual();
  };
  dial.addEventListener('pointerup', finishDrag);
  dial.addEventListener('pointercancel', finishDrag);

  dial.addEventListener('keydown', event => {
    let delta = event.shiftKey ? 5 : 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta *= -1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta *= 1;
    else if (event.key === 'Home') delta = -degrees();
    else if (event.key === 'End') delta = 179.75 - degrees();
    else return;
    event.preventDefault();
    beginManual();
    setDegrees(degrees() + delta);
    endManual(650);
  });

  function smoothToTheta(target) {
    cancelAnimationFrame(state.transitionFrame);
    beginManual();
    const start = theta();
    let delta = target - start;
    if (delta > Math.PI / 2) delta -= Math.PI;
    if (delta < -Math.PI / 2) delta += Math.PI;
    const started = performance.now();
    const duration = 520;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = now => {
      const u = Math.min(1, (now - started) / duration);
      setDegrees(modPi(start + delta * ease(u)) * 180 / Math.PI);
      if (u < 1) state.transitionFrame = requestAnimationFrame(step);
      else endManual();
    };
    state.transitionFrame = requestAnimationFrame(step);
  }

  function sourceMarkData() {
    if (!sourceMarks) return [];
    return [...sourceMarks.querySelectorAll('.ef-singular-mark')].map(button => ({
      percent: parseFloat(button.style.left) || 0,
      label: button.textContent || '',
      title: button.title || 'Singular member'
    }));
  }

  function syncMarks() {
    marksLayer.replaceChildren();
    const current = theta();
    const radius = dial.clientWidth / 2 - 7;
    sourceMarkData().forEach(mark => {
      const target = mark.percent / 100 * Math.PI;
      const phi = 2 * target - Math.PI / 2;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ef-projective-singular-mark';
      button.style.left = `${dial.clientWidth / 2 + radius * Math.cos(phi)}px`;
      button.style.top = `${dial.clientHeight / 2 + radius * Math.sin(phi)}px`;
      button.textContent = mark.label;
      button.title = mark.title;
      button.setAttribute('aria-label', mark.title);
      const distance = Math.min(Math.abs(current - target), Math.PI - Math.abs(current - target));
      button.classList.toggle('is-current', distance < Math.PI / 180 * 1.1);
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
      });
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        smoothToTheta(target);
      });
      marksLayer.append(button);
    });
  }

  function queueMarks() {
    if (state.marksQueued) return;
    state.marksQueued = true;
    requestAnimationFrame(() => {
      state.marksQueued = false;
      syncMarks();
    });
  }

  if (sourceMarks) {
    new MutationObserver(queueMarks).observe(sourceMarks, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function rewriteCopy() {
    for (const paragraph of document.querySelectorAll('.article-content p')) {
      const text = paragraph.textContent || '';
      if (!text.includes('angle slider') && !text.includes('Jump to a singular member')) continue;
      paragraph.innerHTML = paragraph.innerHTML
        .replace(
          /The angle slider selects one member of the pencil; <strong>Jump to a singular member<\/strong> chooses a member through an equilibrium point\./,
          'The circular \\(\\mathbb{RP}^1\\) dial selects one member of the pencil. Numbered orange marks select singular members through the equilibrium points, and <strong>Animate/Pause</strong> controls the loop.'
        )
        .replace(
          /The angle slider selects one member of the pencil\. Numbered orange marks on the slider are the singular members through the equilibrium points\./,
          'The circular \\(\\mathbb{RP}^1\\) dial selects one member of the pencil. Numbered orange marks select singular members through the equilibrium points, and <strong>Animate/Pause</strong> controls the loop.'
        );
    }
  }

  angleInput.addEventListener('input', updateDial);
  presetSelect.addEventListener('change', updateDial);
  window.addEventListener('resize', updateDial);
  new ResizeObserver(updateDial).observe(stage);
  window.addEventListener('electrostatic:markdown-rendered', rewriteCopy);

  installStyles();
  updateDial();
})();