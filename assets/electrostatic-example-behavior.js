(() => {
  'use strict';

  const presetSelect = document.getElementById('ef-preset');
  const angleInput = document.getElementById('ef-angle');
  const graphToggle = document.getElementById('ef-graph-toggle');
  const graphControl = graphToggle?.closest('label');
  const singularButton = document.getElementById('ef-singular');
  const stage = document.getElementById('ef-stage');
  const card = document.getElementById('ef-card');
  const overlay = document.getElementById('ef-overlay');

  if (!presetSelect || !angleInput || !graphToggle || !stage || !card) return;

  const simplePresets = new Set(['dipole', 'like']);
  const loopPeriodMs = 12000;
  const frameIntervalMs = 1000 / 15;

  let graphPreference = graphToggle.checked;
  let forcingGraph = false;
  let graphTheorem = null;
  let scrollQueued = false;
  let loopEpoch = performance.now() - (+angleInput.value / 180) * loopPeriodMs;
  let lastAngleFrame = 0;
  let interactionActive = false;
  let pauseUntil = 0;
  let cardVisible = true;

  const isSimplePreset = () => simplePresets.has(presetSelect.value);

  function graphHasBeenIntroduced() {
    if (!graphTheorem) return false;
    return graphTheorem.getBoundingClientRect().top <= window.innerHeight * .34;
  }

  function graphIsAllowed() {
    return !isSimplePreset() && graphHasBeenIntroduced();
  }

  function removeHiddenGraphArtifacts() {
    if (!overlay || graphToggle.checked) return;
    for (const element of overlay.querySelectorAll('.ef-graph,.ef-selected-critical')) element.remove();
    for (const line of overlay.querySelectorAll('line[stroke="rgba(255,226,137,.98)"]')) line.remove();
  }

  function setGraphChecked(checked) {
    if (graphToggle.checked === checked) return;
    forcingGraph = true;
    graphToggle.checked = checked;
    graphToggle.dispatchEvent(new Event('change', { bubbles: true }));
    forcingGraph = false;
  }

  function applyGraphPolicy() {
    const allowed = graphIsAllowed();
    if (graphControl) graphControl.hidden = !allowed;
    if (!allowed) setGraphChecked(false);
    else setGraphChecked(graphPreference);
    removeHiddenGraphArtifacts();
  }

  function queueGraphPolicy() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      applyGraphPolicy();
    });
  }

  function resetLoopEpoch(now = performance.now()) {
    const degrees = ((+angleInput.value % 180) + 180) % 180;
    loopEpoch = now - degrees / 180 * loopPeriodMs;
  }

  function syncPresetBehavior() {
    resetLoopEpoch();
    if (singularButton) singularButton.disabled = presetSelect.value === 'dipole';
    applyGraphPolicy();
  }

  if (overlay) {
    new MutationObserver(() => requestAnimationFrame(removeHiddenGraphArtifacts)).observe(overlay, {
      childList: true,
      subtree: true
    });
  }

  graphToggle.addEventListener('change', () => {
    if (!forcingGraph && graphIsAllowed()) graphPreference = graphToggle.checked;
  });

  presetSelect.addEventListener('change', syncPresetBehavior);

  angleInput.addEventListener('pointerdown', () => {
    interactionActive = true;
  });
  angleInput.addEventListener('focus', () => {
    interactionActive = true;
  });
  angleInput.addEventListener('blur', () => {
    interactionActive = false;
    pauseUntil = performance.now() + 1200;
    resetLoopEpoch();
  });
  angleInput.addEventListener('input', () => {
    if (interactionActive) resetLoopEpoch();
  });
  angleInput.addEventListener('pointerup', () => {
    interactionActive = false;
    pauseUntil = performance.now() + 1200;
    resetLoopEpoch();
  });
  angleInput.addEventListener('pointercancel', () => {
    interactionActive = false;
    pauseUntil = performance.now() + 1200;
    resetLoopEpoch();
  });

  stage.addEventListener('pointerdown', () => {
    interactionActive = true;
  }, true);
  window.addEventListener('pointerup', () => {
    if (!interactionActive) return;
    interactionActive = false;
    pauseUntil = performance.now() + 900;
    resetLoopEpoch();
  }, true);
  window.addEventListener('pointercancel', () => {
    interactionActive = false;
    pauseUntil = performance.now() + 900;
    resetLoopEpoch();
  }, true);

  function animateParameter(timestamp) {
    requestAnimationFrame(animateParameter);
    if (!cardVisible || document.hidden || !isSimplePreset()) return;
    if (interactionActive || timestamp < pauseUntil) return;
    if (timestamp - lastAngleFrame < frameIntervalMs) return;
    lastAngleFrame = timestamp;

    const degrees = ((timestamp - loopEpoch) % loopPeriodMs) / loopPeriodMs * 180;
    angleInput.value = degrees.toFixed(2);
    angleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  new IntersectionObserver(entries => {
    cardVisible = entries.some(entry => entry.isIntersecting);
  }, { threshold: .02 }).observe(card);

  function articleReady() {
    graphTheorem = document.getElementById('theorem-the-newton-graph-from-singular-pencil-members');
    queueGraphPolicy();
  }

  window.addEventListener('electrostatic:markdown-rendered', articleReady);
  window.addEventListener('electrostatic:typeset-complete', articleReady);
  window.addEventListener('scroll', queueGraphPolicy, { passive: true });
  window.addEventListener('resize', queueGraphPolicy);

  requestAnimationFrame(() => {
    articleReady();
    syncPresetBehavior();
    requestAnimationFrame(animateParameter);
  });
})();
