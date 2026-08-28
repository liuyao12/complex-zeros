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

  if (!presetSelect || !angleInput || !graphToggle || !stage || !card || !overlay) return;

  const simplePresets = new Set(['dipole', 'like']);
  const animationPeriod = preset => simplePresets.has(preset) ? 12000 : 18000;
  const animationFrameInterval = preset => {
    if (simplePresets.has(preset)) return 1000 / 15;
    return graphToggle.checked ? 1000 / 7 : 1000 / 10;
  };

  let graphPreference = graphToggle.checked;
  let forcingGraph = false;
  let graphTheorem = null;
  let scrollQueued = false;
  let loopEpoch = performance.now() - (+angleInput.value / 180) * animationPeriod(presetSelect.value);
  let lastAngleFrame = 0;
  let interactionActive = false;
  let pauseUntil = 0;
  let cardVisible = true;
  let annotationQueued = false;
  let probePreset = '';
  let probeAlpha = null;

  const isSimplePreset = () => simplePresets.has(presetSelect.value);

  function installAnnotationStyles() {
    if (document.getElementById('ef-force-construction-styles')) return;
    const style = document.createElement('style');
    style.id = 'ef-force-construction-styles';
    style.textContent = `
      .ef-force-construction{pointer-events:none}
      .ef-force-point{fill:#fff;stroke:#06131d;stroke-width:2.2;vector-effect:non-scaling-stroke}
      .ef-force-component,.ef-force-total{fill:none;stroke-linecap:round;vector-effect:non-scaling-stroke}
      .ef-force-component{stroke-width:2.5;opacity:.96}
      .ef-force-total{stroke:#ffd66b;stroke-width:4;filter:drop-shadow(0 0 2px rgba(255,214,107,.42))}
      .ef-force-label{font:700 12px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;paint-order:stroke;stroke:#07131d;stroke-width:3px;stroke-linejoin:round}
      .ef-force-point-ring{fill:none;stroke:rgba(255,255,255,.5);stroke-width:1.2;stroke-dasharray:3 3;vector-effect:non-scaling-stroke}
    `;
    document.head.append(style);
  }

  function graphHasBeenIntroduced() {
    if (!graphTheorem) return false;
    return graphTheorem.getBoundingClientRect().top <= window.innerHeight * .34;
  }

  function graphIsAllowed() {
    return !isSimplePreset() && graphHasBeenIntroduced();
  }

  function removeHiddenGraphArtifacts() {
    if (graphToggle.checked) return;
    for (const element of overlay.querySelectorAll('.ef-graph,.ef-selected-critical,.ef-critical')) element.remove();
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
    queueForceConstruction();
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
    loopEpoch = now - degrees / 180 * animationPeriod(presetSelect.value);
  }

  function syncPresetBehavior() {
    probePreset = '';
    probeAlpha = null;
    resetLoopEpoch();
    if (singularButton) singularButton.disabled = presetSelect.value === 'dipole';
    applyGraphPolicy();
    queueForceConstruction();
  }

  graphToggle.addEventListener('change', () => {
    if (!forcingGraph && graphIsAllowed()) graphPreference = graphToggle.checked;
    queueForceConstruction();
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
    queueForceConstruction();
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

  singularButton?.addEventListener('click', () => {
    pauseUntil = performance.now() + 2600;
    requestAnimationFrame(() => resetLoopEpoch());
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

  overlay.addEventListener('pointerdown', event => {
    if (!event.target.closest?.('.ef-critical')) return;
    pauseUntil = performance.now() + 2600;
    requestAnimationFrame(() => resetLoopEpoch());
  }, true);

  function animateParameter(timestamp) {
    requestAnimationFrame(animateParameter);
    if (!cardVisible || document.hidden) return;
    if (interactionActive || timestamp < pauseUntil) return;
    const interval = animationFrameInterval(presetSelect.value);
    if (timestamp - lastAngleFrame < interval) return;
    lastAngleFrame = timestamp;

    const period = animationPeriod(presetSelect.value);
    const degrees = ((timestamp - loopEpoch) % period) / period * 180;
    angleInput.value = degrees.toFixed(2);
    angleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  new IntersectionObserver(entries => {
    cardVisible = entries.some(entry => entry.isIntersecting);
  }, { threshold: .02 }).observe(card);

  const complex = {
    sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
    add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
    mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
    div: (a, b) => {
      const d = b.re * b.re + b.im * b.im || 1e-300;
      return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
    },
    scale: (a, s) => ({ re: a.re * s, im: a.im * s }),
    abs2: a => a.re * a.re + a.im * a.im,
    abs: a => Math.hypot(a.re, a.im),
    exp: t => ({ re: Math.cos(t), im: Math.sin(t) })
  };

  function nodeCenter(node) {
    if (node.tagName.toLowerCase() === 'circle') {
      return { x: +node.getAttribute('cx'), y: +node.getAttribute('cy') };
    }
    try {
      const box = node.getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    } catch {
      return null;
    }
  }

  function chargeData() {
    const positives = [...overlay.querySelectorAll('.ef-zero')]
      .map(nodeCenter)
      .filter(Boolean)
      .map((point, index) => ({ q: 1, index, screen: point, z: { re: point.x, im: -point.y } }));
    const negatives = [...overlay.querySelectorAll('.ef-pole')]
      .map(nodeCenter)
      .filter(Boolean)
      .map((point, index) => ({ q: -1, index, screen: point, z: { re: point.x, im: -point.y } }));
    return [...positives, ...negatives];
  }

  function valueForCharges(z, charges) {
    let value = { re: 1, im: 0 };
    for (const charge of charges) {
      const dz = complex.sub(z, charge.z);
      value = charge.q > 0 ? complex.mul(value, dz) : complex.div(value, dz);
    }
    return value;
  }

  function rotatedValue(alpha, source, radius, theta, charges) {
    const z = complex.add(source, complex.scale(complex.exp(alpha), radius));
    const f = valueForCharges(z, charges);
    const rotated = complex.mul(f, complex.exp(-theta));
    return { z, imaginary: rotated.im, real: rotated.re };
  }

  function angularDistance(a, b) {
    const twoPi = 2 * Math.PI;
    return Math.abs(((a - b + Math.PI) % twoPi + twoPi) % twoPi - Math.PI);
  }

  function rootsOnProbeCircle(source, radius, theta, charges) {
    const count = 192;
    const roots = [];
    const sample = alpha => rotatedValue(alpha, source, radius, theta, charges);

    for (let i = 0; i < count; i += 1) {
      const a0 = 2 * Math.PI * i / count;
      const a1 = 2 * Math.PI * (i + 1) / count;
      const v0 = sample(a0).imaginary;
      const v1 = sample(a1).imaginary;
      if (!Number.isFinite(v0) || !Number.isFinite(v1)) continue;
      if (Math.abs(v0) < 1e-9) roots.push(a0);
      if (v0 * v1 > 0) continue;

      let lo = a0, hi = a1, flo = v0;
      for (let k = 0; k < 34; k += 1) {
        const mid = (lo + hi) / 2;
        const fm = sample(mid).imaginary;
        if (!Number.isFinite(fm)) break;
        if (Math.abs(fm) < 1e-12) { lo = hi = mid; break; }
        if (flo * fm <= 0) hi = mid;
        else { lo = mid; flo = fm; }
      }
      roots.push(((lo + hi) / 2) % (2 * Math.PI));
    }

    const deduped = [];
    for (const root of roots) {
      if (!deduped.some(other => angularDistance(root, other) < 1e-3)) deduped.push(root);
    }
    return deduped;
  }

  function chooseProbePoint(charges) {
    if (!isSimplePreset()) return null;
    const source = charges.find(charge => charge.q > 0);
    if (!source || charges.length < 2) return null;
    let nearest = Infinity;
    for (const charge of charges) {
      if (charge === source) continue;
      nearest = Math.min(nearest, Math.hypot(charge.screen.x - source.screen.x, charge.screen.y - source.screen.y));
    }
    if (!(nearest > 8)) return null;

    const radius = Math.max(10, Math.min(92, .34 * nearest));
    const theta = (+angleInput.value || 0) * Math.PI / 180;
    const roots = rootsOnProbeCircle(source.z, radius, theta, charges);
    if (!roots.length) return null;

    if (probePreset !== presetSelect.value) {
      probePreset = presetSelect.value;
      probeAlpha = null;
    }

    let alpha;
    if (probeAlpha == null) {
      alpha = roots[0];
      let bestReal = -Infinity;
      for (const root of roots) {
        const real = rotatedValue(root, source.z, radius, theta, charges).real;
        if (real > bestReal) { bestReal = real; alpha = root; }
      }
    } else {
      alpha = roots.reduce((best, root) =>
        angularDistance(root, probeAlpha) < angularDistance(best, probeAlpha) ? root : best,
      roots[0]);
    }
    probeAlpha = alpha;

    const z = complex.add(source.z, complex.scale(complex.exp(alpha), radius));
    return { z, screen: { x: z.re, y: -z.im } };
  }

  function fieldComponents(point, charges) {
    return charges.map(charge => {
      const dz = complex.sub(point, charge.z);
      const d2 = complex.abs2(dz) || 1e-300;
      return { charge, vector: complex.scale(dz, charge.q / d2) };
    });
  }

  function marker(defs, id, color) {
    const markerNode = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    markerNode.setAttribute('id', id);
    markerNode.setAttribute('viewBox', '0 0 10 10');
    markerNode.setAttribute('refX', '8.4');
    markerNode.setAttribute('refY', '5');
    markerNode.setAttribute('markerWidth', '7');
    markerNode.setAttribute('markerHeight', '7');
    markerNode.setAttribute('orient', 'auto-start-reverse');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('fill', color);
    markerNode.append(path);
    defs.append(markerNode);
  }

  function svgNode(name, attributes = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  function drawArrow(group, start, vector, scaleFactor, color, markerId, label, total = false) {
    const end = {
      x: start.x + vector.re * scaleFactor,
      y: start.y - vector.im * scaleFactor
    };
    const line = svgNode('line', {
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: color,
      class: total ? 'ef-force-total' : 'ef-force-component',
      'marker-end': `url(#${markerId})`
    });
    group.append(line);

    const magnitude = Math.hypot(end.x - start.x, end.y - start.y);
    if (magnitude > 17) {
      const text = svgNode('text', {
        x: end.x + (end.x >= start.x ? 7 : -7),
        y: end.y + (end.y >= start.y ? 13 : -7),
        fill: color,
        class: 'ef-force-label',
        'text-anchor': end.x >= start.x ? 'start' : 'end'
      });
      text.textContent = label;
      group.append(text);
    }
  }

  function drawForceConstruction() {
    overlay.querySelector('.ef-force-construction')?.remove();
    if (!isSimplePreset()) return;

    const charges = chargeData();
    if (charges.length !== 2) return;
    const probe = chooseProbePoint(charges);
    if (!probe) return;

    const components = fieldComponents(probe.z, charges);
    const total = components.reduce((sum, item) => complex.add(sum, item.vector), { re: 0, im: 0 });
    const magnitudes = [...components.map(item => complex.abs(item.vector)), complex.abs(total)].filter(Number.isFinite);
    const maxMagnitude = Math.max(...magnitudes, 1e-12);
    const scaleFactor = 74 / maxMagnitude;

    const group = svgNode('g', { class: 'ef-force-construction' });
    const defs = svgNode('defs');
    marker(defs, 'ef-force-arrow-positive-1', '#57c9ff');
    marker(defs, 'ef-force-arrow-positive-2', '#a895ff');
    marker(defs, 'ef-force-arrow-negative', '#ff6f91');
    marker(defs, 'ef-force-arrow-total', '#ffd66b');
    group.append(defs);

    const componentColors = [];
    let positiveIndex = 0;
    for (const item of components) {
      if (item.charge.q < 0) componentColors.push({ color: '#ff6f91', markerId: 'ef-force-arrow-negative' });
      else {
        positiveIndex += 1;
        componentColors.push(positiveIndex === 1
          ? { color: '#57c9ff', markerId: 'ef-force-arrow-positive-1' }
          : { color: '#a895ff', markerId: 'ef-force-arrow-positive-2' });
      }
    }

    const labels = ['E₁', 'E₂'];
    components.forEach((item, index) => {
      drawArrow(group, probe.screen, item.vector, scaleFactor,
        componentColors[index].color, componentColors[index].markerId, labels[index]);
    });
    drawArrow(group, probe.screen, total, scaleFactor, '#ffd66b', 'ef-force-arrow-total', 'E', true);

    group.append(svgNode('circle', {
      cx: probe.screen.x,
      cy: probe.screen.y,
      r: 10,
      class: 'ef-force-point-ring'
    }));
    group.append(svgNode('circle', {
      cx: probe.screen.x,
      cy: probe.screen.y,
      r: 4.8,
      class: 'ef-force-point'
    }));

    overlay.append(group);
  }

  function queueForceConstruction() {
    if (annotationQueued) return;
    annotationQueued = true;
    requestAnimationFrame(() => {
      annotationQueued = false;
      removeHiddenGraphArtifacts();
      drawForceConstruction();
    });
  }

  new MutationObserver(mutations => {
    const hasExternalChange = mutations.some(mutation => {
      const changed = [...mutation.addedNodes, ...mutation.removedNodes];
      return changed.some(node => !(node.nodeType === 1 && node.classList?.contains('ef-force-construction')));
    });
    if (hasExternalChange) queueForceConstruction();
  }).observe(overlay, { childList: true, subtree: false });

  function articleReady() {
    graphTheorem = document.getElementById('theorem-the-newton-graph-from-singular-pencil-members');
    queueGraphPolicy();
    queueForceConstruction();
  }

  window.addEventListener('electrostatic:markdown-rendered', articleReady);
  window.addEventListener('electrostatic:typeset-complete', articleReady);
  window.addEventListener('scroll', queueGraphPolicy, { passive: true });
  window.addEventListener('resize', () => {
    queueGraphPolicy();
    queueForceConstruction();
  });

  installAnnotationStyles();
  requestAnimationFrame(() => {
    articleReady();
    syncPresetBehavior();
    queueForceConstruction();
    requestAnimationFrame(animateParameter);
  });
})();