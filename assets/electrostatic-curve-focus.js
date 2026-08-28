(() => {
  'use strict';

  const stage = document.getElementById('ef-stage');
  const staticCanvas = document.getElementById('ef-static');
  const particleCanvas = document.getElementById('ef-particles');
  const overlay = document.getElementById('ef-overlay');
  const presetSelect = document.getElementById('ef-preset');
  const angleInput = document.getElementById('ef-angle');
  const singularButton = document.getElementById('ef-singular');
  const angleControl = angleInput?.closest('.angle-control');

  if (!stage || !staticCanvas || !particleCanvas || !overlay || !presetSelect || !angleInput || !angleControl) return;

  const simplePresets = new Set(['dipole', 'like']);
  const focusCanvas = document.createElement('canvas');
  focusCanvas.id = 'ef-curve-focus';
  focusCanvas.setAttribute('aria-hidden', 'true');
  stage.insertBefore(focusCanvas, particleCanvas);

  const marksLayer = document.createElement('div');
  marksLayer.className = 'ef-singular-marks';
  marksLayer.setAttribute('aria-label', 'Singular pencil parameters');
  angleControl.append(marksLayer);

  if (singularButton) singularButton.hidden = true;
  staticCanvas.style.opacity = '0.28';

  const state = {
    renderQueued: false,
    lastPreset: '',
    probeAlpha: null,
    currentCritical: [],
    transitionFrame: 0
  };

  function installStyles() {
    if (document.getElementById('ef-curve-focus-styles')) return;
    const style = document.createElement('style');
    style.id = 'ef-curve-focus-styles';
    style.textContent = `
      #ef-curve-focus {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      }
      #ef-particles { z-index: 2; }
      #ef-overlay { z-index: 3; }
      #ef-static { transition: opacity 120ms linear; }
      .action-row:has(#ef-singular[hidden]) { justify-content: flex-end; }
      .ef-singular-marks {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: 7;
      }
      .ef-singular-mark {
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
        font: 900 8px/1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        box-shadow: 0 0 0 1px rgba(255,255,255,.68), 0 2px 5px rgba(0,0,0,.22);
        cursor: pointer;
        pointer-events: auto;
        transform: translate(-50%, -50%);
        transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
      }
      .ef-singular-mark:hover,
      .ef-singular-mark:focus-visible {
        transform: translate(-50%, -50%) scale(1.22);
        outline: none;
        box-shadow: 0 0 0 2px rgba(255,255,255,.88), 0 3px 8px rgba(0,0,0,.3);
      }
      .ef-singular-mark.is-current {
        background: #fff0b8;
        box-shadow: 0 0 0 2px #ffad52, 0 0 9px rgba(255,173,82,.85);
      }
    `;
    document.head.append(style);
  }

  const C = (re = 0, im = 0) => ({ re, im });
  const add = (a, b) => C(a.re + b.re, a.im + b.im);
  const sub = (a, b) => C(a.re - b.re, a.im - b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const div = (a, b) => {
    const d = b.re * b.re + b.im * b.im || 1e-300;
    return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  };
  const scale = (a, s) => C(a.re * s, a.im * s);
  const cabs = a => Math.hypot(a.re, a.im);
  const carg = a => Math.atan2(a.im, a.re);
  const conj = a => C(a.re, -a.im);
  const expi = t => C(Math.cos(t), Math.sin(t));
  const csqrt = z => {
    const r = cabs(z);
    const re = Math.sqrt(Math.max(0, (r + z.re) / 2));
    const im = Math.sign(z.im || 1) * Math.sqrt(Math.max(0, (r - z.re) / 2));
    return C(re, im);
  };
  const modPi = t => ((t % Math.PI) + Math.PI) % Math.PI;
  const angularDistancePi = (a, b) => {
    const d = Math.abs(modPi(a) - modPi(b));
    return Math.min(d, Math.PI - d);
  };

  function nodeCenter(node) {
    if (!node) return null;
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

  function chargesFromOverlay() {
    const positives = [...overlay.querySelectorAll('.ef-zero')]
      .map(nodeCenter)
      .filter(Boolean)
      .map((screen, index) => ({ q: 1, index, screen, z: C(screen.x, -screen.y) }));
    const negatives = [...overlay.querySelectorAll('.ef-pole')]
      .map(nodeCenter)
      .filter(Boolean)
      .map((screen, index) => ({ q: -1, index, screen, z: C(screen.x, -screen.y) }));
    return [...positives, ...negatives];
  }

  function polyMul(a, b) {
    const out = Array.from({ length: a.length + b.length - 1 }, () => C());
    for (let i = 0; i < a.length; i += 1) {
      for (let j = 0; j < b.length; j += 1) out[i + j] = add(out[i + j], mul(a[i], b[j]));
    }
    return out;
  }

  function equilibriumPolynomial(charges) {
    let sum = [C()];
    charges.forEach((charge, omitted) => {
      let term = [C(1, 0)];
      charges.forEach((other, index) => {
        if (index === omitted) return;
        term = polyMul(term, [scale(other.z, -1), C(1, 0)]);
      });
      if (sum.length < term.length) sum.push(...Array.from({ length: term.length - sum.length }, () => C()));
      term.forEach((coefficient, index) => {
        sum[index] = add(sum[index], scale(coefficient, charge.q));
      });
    });
    while (sum.length > 1 && cabs(sum.at(-1)) < 1e-10) sum.pop();
    return sum;
  }

  function solveSmallPolynomial(coefficients) {
    const degree = coefficients.length - 1;
    if (degree <= 0) return [];
    if (degree === 1) return [div(scale(coefficients[0], -1), coefficients[1])];
    if (degree === 2) {
      const [c, b, a] = coefficients;
      const discriminant = sub(mul(b, b), scale(mul(a, c), 4));
      const rootDisc = csqrt(discriminant);
      const denominator = scale(a, 2);
      return [
        div(add(scale(b, -1), rootDisc), denominator),
        div(sub(scale(b, -1), rootDisc), denominator)
      ];
    }
    return [];
  }

  function fValue(z, charges) {
    let value = C(1, 0);
    for (const charge of charges) {
      const dz = sub(z, charge.z);
      value = charge.q > 0 ? mul(value, dz) : div(value, dz);
    }
    return value;
  }

  function criticalData(charges) {
    const roots = solveSmallPolynomial(equilibriumPolynomial(charges));
    return roots
      .filter(root => charges.every(charge => cabs(sub(root, charge.z)) > 1e-5))
      .map((z, index) => ({
        z,
        index,
        theta: modPi(carg(fValue(z, charges)))
      }))
      .sort((a, b) => a.theta - b.theta);
  }

  function positionMarksLayer() {
    const inputRect = angleInput.getBoundingClientRect();
    const controlRect = angleControl.getBoundingClientRect();
    marksLayer.style.left = `${inputRect.left - controlRect.left}px`;
    marksLayer.style.top = `${inputRect.top - controlRect.top + inputRect.height / 2}px`;
    marksLayer.style.width = `${inputRect.width}px`;
  }

  function currentTheta() {
    return modPi((+angleInput.value || 0) * Math.PI / 180);
  }

  function smoothToTheta(targetTheta) {
    cancelAnimationFrame(state.transitionFrame);
    const startTheta = currentTheta();
    let delta = targetTheta - startTheta;
    if (delta > Math.PI / 2) delta -= Math.PI;
    if (delta < -Math.PI / 2) delta += Math.PI;
    const duration = 520;
    const startTime = performance.now();
    angleInput.focus({ preventScroll: true });

    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = now => {
      const u = Math.min(1, (now - startTime) / duration);
      const theta = modPi(startTheta + delta * ease(u));
      angleInput.value = (theta * 180 / Math.PI).toFixed(2);
      angleInput.dispatchEvent(new Event('input', { bubbles: true }));
      if (u < 1) state.transitionFrame = requestAnimationFrame(step);
      else {
        angleInput.blur();
        scheduleRender();
      }
    };
    state.transitionFrame = requestAnimationFrame(step);
  }

  function renderSingularMarks(charges) {
    state.currentCritical = criticalData(charges);
    marksLayer.replaceChildren();
    positionMarksLayer();
    const theta = currentTheta();

    state.currentCritical.forEach((critical, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ef-singular-mark';
      button.style.left = `${critical.theta / Math.PI * 100}%`;
      button.style.top = '0px';
      button.textContent = String(index + 1);
      const degrees = critical.theta * 180 / Math.PI;
      button.title = `Singular member through equilibrium point ${index + 1} (${degrees.toFixed(1)}°)`;
      button.setAttribute('aria-label', button.title);
      button.classList.toggle('is-current', angularDistancePi(theta, critical.theta) < Math.PI / 180 * 1.1);
      button.addEventListener('click', event => {
        event.preventDefault();
        smoothToTheta(critical.theta);
      });
      marksLayer.append(button);
    });
  }

  function resizeFocusCanvas() {
    const w = Math.max(1, Math.round(stage.clientWidth));
    const h = Math.max(1, Math.round(stage.clientHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (focusCanvas.width !== pw || focusCanvas.height !== ph) {
      focusCanvas.width = pw;
      focusCanvas.height = ph;
      focusCanvas.style.width = `${w}px`;
      focusCanvas.style.height = `${h}px`;
    }
    const ctx = focusCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  function pencilValue(screen, charges, theta) {
    const z = C(screen.x, -screen.y);
    let p = C(1, 0);
    let q = C(1, 0);
    for (const charge of charges) {
      const dz = sub(z, charge.z);
      if (charge.q > 0) p = mul(p, dz);
      else q = mul(q, dz);
    }
    return mul(mul(p, conj(q)), expi(-theta)).im;
  }

  function edgePoint(edge, x, y, a, b, c, d) {
    const interpolation = (v0, v1) => {
      const denominator = v1 - v0;
      return Math.max(0, Math.min(1, Math.abs(denominator) < 1e-14 ? .5 : -v0 / denominator));
    };
    if (edge === 0) { const t = interpolation(a, b); return [x + t, y]; }
    if (edge === 1) { const t = interpolation(b, c); return [x + 1, y + t]; }
    if (edge === 2) { const t = interpolation(d, c); return [x + t, y + 1]; }
    const t = interpolation(a, d); return [x, y + t];
  }

  function drawFullMember(ctx, w, h, charges, theta) {
    const N = simplePresets.has(presetSelect.value) ? 104 : 118;
    const row = N + 1;
    const values = new Float64Array(row * row);
    for (let j = 0; j <= N; j += 1) {
      const y = j / N * h;
      for (let i = 0; i <= N; i += 1) {
        const x = i / N * w;
        values[j * row + i] = pencilValue({ x, y }, charges, theta);
      }
    }

    const sx = w / N;
    const sy = h / N;
    ctx.save();
    ctx.beginPath();
    for (let j = 0; j < N; j += 1) {
      for (let i = 0; i < N; i += 1) {
        const a = values[j * row + i];
        const b = values[j * row + i + 1];
        const c = values[(j + 1) * row + i + 1];
        const d = values[(j + 1) * row + i];
        if (![a, b, c, d].every(Number.isFinite)) continue;
        const crossings = [];
        if ((a > 0) !== (b > 0)) crossings.push(0);
        if ((b > 0) !== (c > 0)) crossings.push(1);
        if ((d > 0) !== (c > 0)) crossings.push(2);
        if ((a > 0) !== (d > 0)) crossings.push(3);
        const segment = (e0, e1) => {
          const p = edgePoint(e0, i, j, a, b, c, d);
          const q = edgePoint(e1, i, j, a, b, c, d);
          ctx.moveTo(p[0] * sx, p[1] * sy);
          ctx.lineTo(q[0] * sx, q[1] * sy);
        };
        if (crossings.length === 2) segment(crossings[0], crossings[1]);
        else if (crossings.length === 4) {
          const centerHigh = (a + b + c + d) / 4 > 0;
          const mask = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
          if (mask === 5) {
            if (centerHigh) { segment(0, 1); segment(2, 3); }
            else { segment(0, 3); segment(1, 2); }
          } else if (mask === 10) {
            if (centerHigh) { segment(0, 3); segment(1, 2); }
            else { segment(0, 1); segment(2, 3); }
          }
        }
      }
    }
    ctx.strokeStyle = 'rgba(255, 215, 118, .38)';
    ctx.lineWidth = 1.05;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  function rootsOnProbeCircle(source, radius, theta, charges) {
    const count = 196;
    const roots = [];
    const value = alpha => {
      const z = add(source, scale(expi(alpha), radius));
      return { z, value: mul(fValue(z, charges), expi(-theta)) };
    };
    for (let i = 0; i < count; i += 1) {
      const a0 = 2 * Math.PI * i / count;
      const a1 = 2 * Math.PI * (i + 1) / count;
      const f0 = value(a0).value.im;
      const f1 = value(a1).value.im;
      if (!Number.isFinite(f0) || !Number.isFinite(f1) || f0 * f1 > 0) continue;
      let lo = a0;
      let hi = a1;
      let flo = f0;
      for (let k = 0; k < 34; k += 1) {
        const mid = (lo + hi) / 2;
        const fm = value(mid).value.im;
        if (!Number.isFinite(fm)) break;
        if (flo * fm <= 0) hi = mid;
        else { lo = mid; flo = fm; }
      }
      roots.push((lo + hi) / 2);
    }
    return roots.filter((root, index) => roots.findIndex(other => Math.abs(root - other) < 1e-3) === index);
  }

  function chooseSeed(charges, theta) {
    const source = charges.find(charge => charge.q > 0) || charges[0];
    if (!source) return null;
    let nearest = Infinity;
    charges.forEach(charge => {
      if (charge === source) return;
      nearest = Math.min(nearest, Math.hypot(charge.screen.x - source.screen.x, charge.screen.y - source.screen.y));
    });
    if (!Number.isFinite(nearest)) nearest = Math.min(stage.clientWidth, stage.clientHeight) * .45;
    const radius = Math.max(14, Math.min(95, .34 * nearest));
    const roots = rootsOnProbeCircle(source.z, radius, theta, charges);
    if (!roots.length) return null;

    if (state.lastPreset !== presetSelect.value) {
      state.lastPreset = presetSelect.value;
      state.probeAlpha = null;
    }
    let alpha;
    if (state.probeAlpha == null) {
      alpha = roots[0];
      let best = -Infinity;
      roots.forEach(root => {
        const z = add(source.z, scale(expi(root), radius));
        const real = mul(fValue(z, charges), expi(-theta)).re;
        if (real > best) { best = real; alpha = root; }
      });
    } else {
      const distance = (a, b) => Math.abs(((a - b + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
      alpha = roots.reduce((best, root) => distance(root, state.probeAlpha) < distance(best, state.probeAlpha) ? root : best, roots[0]);
    }
    state.probeAlpha = alpha;
    const z = add(source.z, scale(expi(alpha), radius));
    return { x: z.re, y: -z.im };
  }

  function fieldAt(point, charges) {
    const field = { x: 0, y: 0 };
    for (const charge of charges) {
      const dx = point.x - charge.screen.x;
      const dy = point.y - charge.screen.y;
      const d2 = dx * dx + dy * dy;
      if (!(d2 > 1e-12)) continue;
      field.x += charge.q * dx / d2;
      field.y += charge.q * dy / d2;
    }
    return field;
  }

  function traceDirection(seed, charges, direction, w, h) {
    const points = [{ ...seed }];
    const step = 2.05;
    const hitRadius = 8.5;
    const maxSteps = 2400;
    let point = { ...seed };

    for (let k = 0; k < maxSteps; k += 1) {
      let nearest = null;
      let nearestDistance = Infinity;
      charges.forEach(charge => {
        const d = Math.hypot(point.x - charge.screen.x, point.y - charge.screen.y);
        if (d < nearestDistance) { nearestDistance = d; nearest = charge; }
      });
      if (nearest && nearestDistance < hitRadius) {
        points.push({ ...nearest.screen });
        break;
      }
      if (point.x < -30 || point.x > w + 30 || point.y < -30 || point.y > h + 30) break;

      let v = fieldAt(point, charges);
      let speed = Math.hypot(v.x, v.y);
      if (!(speed > 1e-9)) break;
      v = { x: direction * v.x / speed, y: direction * v.y / speed };
      const mid = { x: point.x + v.x * step / 2, y: point.y + v.y * step / 2 };
      let vm = fieldAt(mid, charges);
      speed = Math.hypot(vm.x, vm.y);
      if (!(speed > 1e-9)) break;
      vm = { x: direction * vm.x / speed, y: direction * vm.y / speed };
      point = { x: point.x + vm.x * step, y: point.y + vm.y * step };
      if (k % 2 === 0) points.push({ ...point });
    }
    return points;
  }

  function drawHighlightedBranch(ctx, w, h, charges, theta) {
    const seed = chooseSeed(charges, theta);
    if (!seed) return;
    const backward = traceDirection(seed, charges, -1, w, h).reverse();
    const forward = traceDirection(seed, charges, 1, w, h);
    const points = [...backward.slice(0, -1), ...forward];
    if (points.length < 2) return;

    ctx.save();
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = 'rgba(255, 222, 126, .99)';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 200, 78, .5)';
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    state.renderQueued = false;
    const charges = chargesFromOverlay();
    const { ctx, w, h } = resizeFocusCanvas();
    ctx.clearRect(0, 0, w, h);
    if (charges.length < 2) return;
    const theta = currentTheta();
    drawFullMember(ctx, w, h, charges, theta);
    drawHighlightedBranch(ctx, w, h, charges, theta);
    renderSingularMarks(charges);
  }

  function scheduleRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(render);
  }

  angleInput.addEventListener('input', scheduleRender);
  presetSelect.addEventListener('change', () => {
    state.probeAlpha = null;
    scheduleRender();
  });
  window.addEventListener('resize', scheduleRender);
  new ResizeObserver(scheduleRender).observe(stage);
  new MutationObserver(mutations => {
    const changed = mutations.some(mutation =>
      [...mutation.addedNodes, ...mutation.removedNodes].some(node =>
        node.nodeType === 1 && !node.matches?.('.ef-charge-sign,.ef-force-construction,.ef-force-parallelogram-layer')
      )
    );
    if (changed) scheduleRender();
  }).observe(overlay, { childList: true, subtree: false });

  window.addEventListener('electrostatic:markdown-rendered', () => {
    for (const paragraph of document.querySelectorAll('.article-content p')) {
      if (!paragraph.textContent.includes('Jump to a singular member')) continue;
      paragraph.innerHTML = paragraph.innerHTML.replace(
        /The angle slider selects one member of the pencil; <strong>Jump to a singular member<\/strong> chooses a member through an equilibrium point\./,
        'The angle slider selects one member of the pencil. Numbered orange marks on the slider are the singular members through the equilibrium points.'
      );
    }
  });

  installStyles();
  scheduleRender();
})();