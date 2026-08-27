(() => {
  'use strict';

  const C = (re = 0, im = 0) => ({ re, im });
  const add = (a, b) => C(a.re + b.re, a.im + b.im);
  const sub = (a, b) => C(a.re - b.re, a.im - b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const div = (a, b) => {
    const d = b.re * b.re + b.im * b.im || 1e-300;
    return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  };
  const scale = (a, s) => C(a.re * s, a.im * s);
  const neg = a => C(-a.re, -a.im);
  const conj = a => C(a.re, -a.im);
  const abs2 = a => a.re * a.re + a.im * a.im;
  const cabs = a => Math.hypot(a.re, a.im);
  const carg = a => Math.atan2(a.im, a.re);
  const dist = (a, b) => cabs(sub(a, b));
  const expi = t => C(Math.cos(t), Math.sin(t));
  const clone = a => C(a.re, a.im);
  const finiteC = a => Number.isFinite(a.re) && Number.isFinite(a.im);
  const modPi = t => ((t % Math.PI) + Math.PI) % Math.PI;
  const angleDistance = (a, b) => {
    const d = Math.abs(modPi(a) - modPi(b));
    return Math.min(d, Math.PI - d);
  };

  const polyEval = (a, z) => {
    let y = C();
    for (let k = a.length - 1; k >= 0; k -= 1) y = add(mul(y, z), a[k]);
    return y;
  };
  const polyDerivative = a => a.length <= 1 ? [C()] : a.slice(1).map((v, k) => scale(v, k + 1));
  const polyMul = (a, b) => {
    const out = Array.from({ length: a.length + b.length - 1 }, () => C());
    for (let i = 0; i < a.length; i += 1) {
      for (let j = 0; j < b.length; j += 1) out[i + j] = add(out[i + j], mul(a[i], b[j]));
    }
    return out;
  };
  const trimPoly = a => {
    const out = a.map(clone);
    let m = 0;
    for (const z of out) m = Math.max(m, cabs(z));
    const tol = 1e-12 * Math.max(1, m);
    while (out.length > 1 && cabs(out.at(-1)) < tol) out.pop();
    return out;
  };
  const polySub = (a, b) => {
    const n = Math.max(a.length, b.length);
    return trimPoly(Array.from({ length: n }, (_, i) => sub(a[i] || C(), b[i] || C())));
  };
  const polyFromRoots = roots => {
    let a = [C(1, 0)];
    for (const r of roots) a = polyMul(a, [neg(r), C(1, 0)]);
    return a;
  };
  const factorial = n => {
    let x = 1;
    for (let k = 2; k <= n; k += 1) x *= k;
    return x;
  };

  function solvePolynomial(coeffs, seeds = null) {
    let a = trimPoly(coeffs);
    const n = a.length - 1;
    if (n <= 0) return [];
    const lead = a[n];
    a = a.map(z => div(z, lead));
    const da = polyDerivative(a);
    let roots;
    if (seeds && seeds.length === n && seeds.every(finiteC)) {
      roots = seeds.map((z, k) => add(z, scale(expi(1.31 * k + .47), 1e-5)));
    } else {
      let radius = 1;
      for (let k = 0; k < n; k += 1) {
        const ak = cabs(a[k]);
        if (ak > 0) radius = Math.max(radius, 2 * Math.pow(ak, 1 / (n - k)));
      }
      roots = Array.from({ length: n }, (_, k) => scale(expi(2 * Math.PI * (k + .29) / n), radius * (.74 + .18 * (k + .5) / n)));
    }
    let rootScale = Math.max(1, ...roots.map(cabs));
    for (let iter = 0; iter < 260; iter += 1) {
      let maxCorrection = 0;
      const next = roots.map((z, i) => {
        const p = polyEval(a, z);
        const dp = polyEval(da, z);
        let newton = cabs(dp) > 1e-18 ? div(p, dp) : scale(expi(iter * .31 + i), 1e-5);
        let sum = C();
        for (let j = 0; j < n; j += 1) {
          if (j === i) continue;
          let dz = sub(z, roots[j]);
          if (cabs(dz) < 1e-13) dz = add(dz, scale(expi(iter + i + j), 1e-9));
          sum = add(sum, div(C(1, 0), dz));
        }
        const den = sub(C(1, 0), mul(newton, sum));
        let correction = cabs(den) > 1e-14 ? div(newton, den) : newton;
        if (!finiteC(correction)) correction = scale(expi(i + .2 * iter), 1e-5);
        const cap = Math.max(1, rootScale * .55);
        if (cabs(correction) > cap) correction = scale(correction, cap / cabs(correction));
        maxCorrection = Math.max(maxCorrection, cabs(correction));
        return sub(z, correction);
      });
      roots = next;
      rootScale = Math.max(1, ...roots.map(cabs));
      if (maxCorrection < 2e-13) break;
    }
    return roots.map(z0 => {
      let z = z0;
      for (let k = 0; k < 18; k += 1) {
        const p = polyEval(a, z);
        const dp = polyEval(da, z);
        if (cabs(dp) < 1e-18) break;
        const correction = div(p, dp);
        if (!finiteC(correction)) break;
        z = sub(z, correction);
        if (cabs(correction) < 2e-14) break;
      }
      return z;
    });
  }

  const presets = {
    dipole: {
      name: 'one zero and one pole',
      zeros: [C(-1, 0)],
      poles: [C(1, 0)],
      angle: 58,
      half: 2.05
    },
    like: {
      name: 'two like charges / two zeros',
      zeros: [C(-1, 0), C(1, 0)],
      poles: [],
      angle: 42,
      half: 2.05
    },
    cubic: {
      name: 'three zeros: a cubic pencil',
      zeros: [C(-1, 0), C(1, 0), C(0, 1)],
      poles: [],
      angle: null,
      half: 2.1
    },
    mixed: {
      name: 'two zeros and one pole',
      zeros: [C(-1, 0), C(1, 0)],
      poles: [C(0, 1)],
      angle: null,
      half: 2.25
    }
  };

  const stage = document.getElementById('ef-stage');
  const staticCanvas = document.getElementById('ef-static');
  const particleCanvas = document.getElementById('ef-particles');
  const overlay = document.getElementById('ef-overlay');
  const presetSelect = document.getElementById('ef-preset');
  const angleInput = document.getElementById('ef-angle');
  const angleOutput = document.getElementById('ef-angle-value');
  const singularButton = document.getElementById('ef-singular');
  const fitButton = document.getElementById('ef-fit');
  const pencilToggle = document.getElementById('ef-pencil-toggle');
  const potentialToggle = document.getElementById('ef-potential-toggle');
  const graphToggle = document.getElementById('ef-graph-toggle');
  const flowToggle = document.getElementById('ef-flow-toggle');
  const status = document.getElementById('ef-status');
  const floatingDemo = document.querySelector('.floating-demo');
  const card = document.getElementById('ef-card');
  const dragHandle = document.getElementById('ef-window-drag');
  const resizeHandle = document.getElementById('ef-window-resize');
  const NS = 'http://www.w3.org/2000/svg';

  if (!stage || !staticCanvas || !particleCanvas || !overlay) return;

  const state = {
    preset: 'cubic',
    zeros: [],
    poles: [],
    P: [], Q: [], Pd: [], Qd: [], D: [], Dd: [],
    critical: [],
    theta: Math.PI / 4,
    selectedCritical: 0,
    view: { cx: 0, cy: .3, half: 2.1 },
    dragging: null,
    renderQueued: false,
    highQuality: true,
    visible: true,
    particles: [],
    lastFrame: 0,
    animationFrame: 0
  };

  function dims() { return { w: stage.clientWidth, h: stage.clientHeight }; }
  function toScreen(z) {
    const { w, h } = dims();
    const s = Math.min(w, h) / (2 * state.view.half);
    return { x: w / 2 + (z.re - state.view.cx) * s, y: h / 2 - (z.im - state.view.cy) * s };
  }
  function fromScreen(x, y) {
    const { w, h } = dims();
    const s = Math.min(w, h) / (2 * state.view.half);
    return C(state.view.cx + (x - w / 2) / s, state.view.cy - (y - h / 2) / s);
  }
  function eventPoint(e) {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function svgEl(name, attrs = {}) {
    const el = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    return el;
  }
  function clearOverlay() { while (overlay.firstChild) overlay.removeChild(overlay.firstChild); }

  function resizeCanvas(canvas) {
    const { w, h } = dims();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw; canvas.height = ph;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  function recompute() {
    const oldCritical = state.critical.map(clone);
    state.P = polyFromRoots(state.zeros);
    state.Q = polyFromRoots(state.poles);
    state.Pd = polyDerivative(state.P);
    state.Qd = polyDerivative(state.Q);
    state.D = trimPoly(polySub(polyMul(state.Pd, state.Q), polyMul(state.P, state.Qd)));
    state.Dd = polyDerivative(state.D);
    const roots = solvePolynomial(state.D, oldCritical);
    state.critical = roots.filter(w => {
      const p = polyEval(state.P, w), q = polyEval(state.Q, w);
      return cabs(p) > 1e-7 && cabs(q) > 1e-7;
    });
    if (state.selectedCritical >= state.critical.length) state.selectedCritical = 0;
  }

  function fValue(z) { return div(polyEval(state.P, z), polyEval(state.Q, z)); }
  function logAbsF(z) {
    return Math.log(Math.max(1e-300, cabs(polyEval(state.P, z)))) -
      Math.log(Math.max(1e-300, cabs(polyEval(state.Q, z))));
  }
  function singularAngles() { return state.critical.map(w => modPi(carg(fValue(w)))); }

  function setPreset(name, { fromArticle = false } = {}) {
    const preset = presets[name] || presets.cubic;
    state.preset = name;
    state.zeros = preset.zeros.map(clone);
    state.poles = preset.poles.map(clone);
    state.view = { cx: 0, cy: name === 'cubic' || name === 'mixed' ? .28 : 0, half: preset.half };
    state.selectedCritical = 0;
    recompute();
    const angles = singularAngles();
    const degrees = preset.angle == null && angles.length ? angles[0] * 180 / Math.PI : preset.angle;
    state.theta = modPi((degrees || 0) * Math.PI / 180);
    presetSelect.value = name;
    syncAngleControl();
    resetParticles();
    scheduleRender(true);
    if (!fromArticle) stage.scrollIntoView?.({ block: 'nearest' });
  }

  function syncAngleControl() {
    const degrees = modPi(state.theta) * 180 / Math.PI;
    angleInput.value = degrees.toFixed(2);
    angleOutput.value = `${degrees.toFixed(degrees % 1 ? 1 : 0)}°`;
  }

  function fitView() {
    const pts = [...state.zeros, ...state.poles, ...state.critical];
    if (!pts.length) return;
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const z of pts) {
      minx = Math.min(minx, z.re); maxx = Math.max(maxx, z.re);
      miny = Math.min(miny, z.im); maxy = Math.max(maxy, z.im);
    }
    state.view.cx = (minx + maxx) / 2;
    state.view.cy = (miny + maxy) / 2;
    state.view.half = Math.max(.8, (maxx - minx) / 2, (maxy - miny) / 2) * 1.55;
    resetParticles(); scheduleRender(true);
  }

  function niceStep(x) {
    const p = 10 ** Math.floor(Math.log10(x));
    const m = x / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  function drawGrid() {
    const { w, h } = dims();
    const den = Math.min(w, h);
    const halfX = state.view.half * w / den;
    const halfY = state.view.half * h / den;
    const xmin = state.view.cx - halfX, xmax = state.view.cx + halfX;
    const ymin = state.view.cy - halfY, ymax = state.view.cy + halfY;
    const step = niceStep(2 * state.view.half / 5);
    for (let x = Math.ceil(xmin / step) * step; x <= xmax; x += step) {
      const p = toScreen(C(x, 0));
      overlay.appendChild(svgEl('line', { x1: p.x, y1: 0, x2: p.x, y2: h, class: Math.abs(x) < 1e-12 ? 'ef-axis' : 'ef-grid' }));
    }
    for (let y = Math.ceil(ymin / step) * step; y <= ymax; y += step) {
      const p = toScreen(C(0, y));
      overlay.appendChild(svgEl('line', { x1: 0, y1: p.y, x2: w, y2: p.y, class: Math.abs(y) < 1e-12 ? 'ef-axis' : 'ef-grid' }));
    }
  }

  function edgePoint(edge, x, y, a, b, c, d, level) {
    const interp = (v0, v1) => {
      const den = v1 - v0;
      return Math.max(0, Math.min(1, Math.abs(den) < 1e-14 ? .5 : (level - v0) / den));
    };
    if (edge === 0) { const t = interp(a, b); return [x + t, y]; }
    if (edge === 1) { const t = interp(b, c); return [x + 1, y + t]; }
    if (edge === 2) { const t = interp(d, c); return [x + t, y + 1]; }
    const t = interp(a, d); return [x, y + t];
  }

  function marchLevel(ctx, grid, N, level, sx, sy) {
    ctx.beginPath();
    const row = N + 1;
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const a = grid[y * row + x], b = grid[y * row + x + 1];
        const c = grid[(y + 1) * row + x + 1], d = grid[(y + 1) * row + x];
        if (!Number.isFinite(a + b + c + d)) continue;
        const mask = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
        if (mask === 0 || mask === 15) continue;
        const crossings = [];
        if ((a > level) !== (b > level)) crossings.push(0);
        if ((b > level) !== (c > level)) crossings.push(1);
        if ((d > level) !== (c > level)) crossings.push(2);
        if ((a > level) !== (d > level)) crossings.push(3);
        const segment = (e0, e1) => {
          const p = edgePoint(e0, x, y, a, b, c, d, level);
          const q = edgePoint(e1, x, y, a, b, c, d, level);
          ctx.moveTo(p[0] * sx, p[1] * sy); ctx.lineTo(q[0] * sx, q[1] * sy);
        };
        if (crossings.length === 2) { segment(crossings[0], crossings[1]); continue; }
        if (crossings.length !== 4) continue;
        const high = (a + b + c + d) / 4 > level;
        if (mask === 5) {
          if (high) { segment(0, 1); segment(2, 3); }
          else { segment(0, 3); segment(1, 2); }
        } else if (mask === 10) {
          if (high) { segment(0, 3); segment(1, 2); }
          else { segment(0, 1); segment(2, 3); }
        }
      }
    }
    ctx.stroke();
  }

  function sampleGrid(N) {
    const row = N + 1;
    const U = new Float64Array(row * row);
    const V = new Float64Array(row * row);
    const L = new Float64Array(row * row);
    const { w, h } = dims();
    for (let j = 0; j <= N; j += 1) {
      for (let i = 0; i <= N; i += 1) {
        const z = fromScreen(i / N * w, j / N * h);
        const p = polyEval(state.P, z), q = polyEval(state.Q, z);
        const pq = mul(p, conj(q));
        const k = j * row + i;
        U[k] = pq.re; V[k] = pq.im;
        L[k] = Math.max(-32, Math.min(32, Math.log(Math.max(1e-300, cabs(p))) - Math.log(Math.max(1e-300, cabs(q)))));
      }
    }
    return { U, V, L, row };
  }

  function drawStatic(highQuality) {
    const { ctx, w, h } = resizeCanvas(staticCanvas);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#07131d'; ctx.fillRect(0, 0, w, h);
    const N = highQuality ? Math.max(135, Math.min(220, Math.round(Math.min(w, h) / 2.8))) : Math.max(70, Math.min(100, Math.round(Math.min(w, h) / 5.8)));
    const sampled = sampleGrid(N);
    const sx = w / N, sy = h / N;
    const temp = new Float64Array(sampled.U.length);

    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    if (potentialToggle.checked) {
      const criticalLevels = state.critical.map(w0 => logAbsF(w0)).filter(Number.isFinite).sort((a, b) => a - b);
      const regular = [-2, -1, 0, 1, 2];
      ctx.lineWidth = highQuality ? .8 : .65;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(127, 212, 192, .17)';
      for (const level of regular) marchLevel(ctx, sampled.L, N, level, sx, sy);
      ctx.strokeStyle = 'rgba(122, 232, 202, .42)';
      ctx.lineWidth = highQuality ? 1.35 : 1;
      for (const level of criticalLevels) marchLevel(ctx, sampled.L, N, level, sx, sy);
      ctx.setLineDash([]);
    }

    if (pencilToggle.checked) {
      const count = highQuality ? 12 : 8;
      ctx.lineWidth = highQuality ? 1.05 : .85;
      for (let k = 0; k < count; k += 1) {
        const theta = Math.PI * k / count;
        const ct = Math.cos(theta), st = Math.sin(theta);
        for (let i = 0; i < temp.length; i += 1) temp[i] = sampled.V[i] * ct - sampled.U[i] * st;
        ctx.strokeStyle = `hsla(${196 + 25 * k / Math.max(1, count - 1)}, 55%, 76%, .22)`;
        marchLevel(ctx, temp, N, 0, sx, sy);
      }
    }

    const ct = Math.cos(state.theta), st = Math.sin(state.theta);
    for (let i = 0; i < temp.length; i += 1) temp[i] = sampled.V[i] * ct - sampled.U[i] * st;
    ctx.strokeStyle = 'rgba(255, 212, 107, .98)';
    ctx.lineWidth = highQuality ? 2.35 : 1.8;
    ctx.shadowColor = 'rgba(255, 192, 72, .28)'; ctx.shadowBlur = 4;
    marchLevel(ctx, temp, N, 0, sx, sy);
    ctx.restore();
  }

  function localCriticalData(w) {
    const p = polyEval(state.P, w), q = polyEval(state.Q, w);
    if (cabs(p) < 1e-9 || cabs(q) < 1e-9) return null;
    let derivative = state.D;
    for (let m = 1; m <= state.D.length; m += 1) {
      derivative = polyDerivative(derivative);
      const value = polyEval(derivative, w);
      if (cabs(value) > 1e-8 * Math.max(1, cabs(p) * cabs(q))) {
        const order = m + 1;
        const relativeCoefficient = div(value, scale(mul(p, q), factorial(m) * order));
        return { order, relativeCoefficient };
      }
    }
    return null;
  }

  function newtonVelocity(z, down) {
    const d = polyEval(state.D, z);
    if (cabs(d) < 1e-18) return null;
    let v = div(mul(polyEval(state.P, z), polyEval(state.Q, z)), d);
    if (down) v = neg(v);
    return finiteC(v) ? v : null;
  }

  function traceBranch(w, criticalIndex, type, arm, highQuality) {
    const local = localCriticalData(w);
    if (!local) return null;
    const down = type === 'zero';
    const theta = ((down ? Math.PI : 0) - carg(local.relativeCoefficient) + 2 * Math.PI * arm) / local.order;
    const worldStep = Math.max(state.view.half * (highQuality ? .0045 : .010), 2e-5);
    const eps = worldStep * .62;
    const hit = worldStep * 2.8;
    const { w: width, h: height } = dims();
    const den = Math.min(width, height);
    const escape = state.view.half * Math.max(width, height) / den * 1.35;
    let z = add(w, scale(expi(theta), eps));
    const points = [clone(w), clone(z)];
    const maxSteps = highQuality ? 2600 : 800;
    let resolved = false;
    let endpoint = -1;
    for (let k = 0; k < maxSteps; k += 1) {
      const targets = down ? state.zeros : state.poles;
      let nearest = Infinity, nearestIndex = -1;
      for (let i = 0; i < targets.length; i += 1) {
        const d = dist(z, targets[i]);
        if (d < nearest) { nearest = d; nearestIndex = i; }
      }
      if (nearest < hit) {
        points.push(clone(targets[nearestIndex])); resolved = true; endpoint = nearestIndex; break;
      }
      for (let i = 0; i < state.critical.length; i += 1) {
        if (i !== criticalIndex && dist(z, state.critical[i]) < hit * 1.25) return { points, resolved: false, type, endpoint: -1 };
      }
      let v = newtonVelocity(z, down);
      if (!v) break;
      v = scale(v, 1 / cabs(v));
      const mid = add(z, scale(v, worldStep * .5));
      let v2 = newtonVelocity(mid, down);
      if (!v2) break;
      v2 = scale(v2, 1 / cabs(v2));
      z = add(z, scale(v2, worldStep));
      if (k % (highQuality ? 2 : 1) === 0) points.push(clone(z));
      if (Math.abs(z.re - state.view.cx) > escape || Math.abs(z.im - state.view.cy) > escape) {
        points.push(clone(z));
        if (!down && state.poles.length === 0) resolved = true;
        break;
      }
    }
    return { points, resolved, type, endpoint };
  }

  function graphData(highQuality) {
    const branches = [];
    state.critical.forEach((w, index) => {
      const local = localCriticalData(w);
      if (!local) return;
      for (let arm = 0; arm < local.order; arm += 1) {
        const down = traceBranch(w, index, 'zero', arm, highQuality);
        const up = traceBranch(w, index, 'pole', arm, highQuality);
        if (down) branches.push(down);
        if (up) branches.push(up);
      }
    });
    return branches;
  }

  function pathString(points) {
    let d = '';
    points.forEach((z, i) => {
      const p = toScreen(z);
      d += `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    });
    return d;
  }

  function drawLocalNodePatch() {
    const selected = state.critical[state.selectedCritical];
    if (!selected || angleDistance(state.theta, modPi(carg(fValue(selected)))) > Math.PI / 180 * 1.2) return;
    const local = localCriticalData(selected);
    if (!local) return;
    const p = toScreen(selected);
    overlay.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 11, class: 'ef-selected-critical' }));
    const base = carg(local.relativeCoefficient);
    const radiusPx = 25;
    for (let k = 0; k < 2 * local.order; k += 1) {
      const phi = (k * Math.PI - base) / local.order;
      overlay.appendChild(svgEl('line', {
        x1: p.x, y1: p.y,
        x2: p.x + radiusPx * Math.cos(phi),
        y2: p.y - radiusPx * Math.sin(phi),
        stroke: 'rgba(255,226,137,.98)',
        'stroke-width': 2.2,
        'stroke-linecap': 'round',
        'vector-effect': 'non-scaling-stroke',
        'pointer-events': 'none'
      }));
    }
  }

  function drawOverlay(highQuality) {
    const { w, h } = dims();
    overlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
    clearOverlay();
    drawGrid();

    if (graphToggle.checked) {
      for (const branch of graphData(highQuality)) {
        if (branch.points.length < 2) continue;
        const cls = `ef-graph ${branch.type === 'pole' ? 'poleward' : ''} ${branch.resolved ? '' : 'unresolved'}`;
        overlay.appendChild(svgEl('path', { d: pathString(branch.points), class: cls.trim() }));
      }
    }

    drawLocalNodePatch();

    state.critical.forEach((w0, index) => {
      const p = toScreen(w0);
      const node = svgEl('circle', { cx: p.x, cy: p.y, r: 6.2, class: 'ef-node ef-critical', 'data-kind': 'critical', 'data-index': index });
      node.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        state.selectedCritical = index;
        state.theta = modPi(carg(fValue(state.critical[index])));
        syncAngleControl(); scheduleRender(true);
      });
      const title = svgEl('title'); title.textContent = 'critical point: click for its singular pencil member';
      node.append(title); overlay.appendChild(node);
    });

    for (const kind of ['pole', 'zero']) {
      const points = kind === 'zero' ? state.zeros : state.poles;
      points.forEach((z, index) => {
        const p = toScreen(z);
        let node;
        if (kind === 'zero') node = svgEl('circle', { cx: p.x, cy: p.y, r: 7.3, class: 'ef-node ef-zero', 'data-kind': kind, 'data-index': index });
        else node = svgEl('path', { d: `M ${p.x} ${p.y - 8} L ${p.x + 8} ${p.y} L ${p.x} ${p.y + 8} L ${p.x - 8} ${p.y} Z`, class: 'ef-node ef-pole', 'data-kind': kind, 'data-index': index });
        node.addEventListener('pointerdown', startPointDrag);
        const title = svgEl('title'); title.textContent = kind === 'zero' ? 'zero / positive Bôcher charge' : 'pole / negative Bôcher charge';
        node.append(title); overlay.appendChild(node);
      });
    }
  }

  function updateStatus() {
    const m = state.zeros.length, n = state.poles.length;
    const degree = m + n;
    const angles = singularAngles();
    let singularText = '';
    if (angles.length) {
      let nearest = 0;
      for (let i = 1; i < angles.length; i += 1) if (angleDistance(state.theta, angles[i]) < angleDistance(state.theta, angles[nearest])) nearest = i;
      const delta = angleDistance(state.theta, angles[nearest]) * 180 / Math.PI;
      singularText = delta < .75 ? ` The emphasized member is singular at the highlighted critical point.` : ` Nearest singular angle is ${delta.toFixed(1)}° away.`;
    }
    status.textContent = `${presets[state.preset].name}. Field-line degree ≤ ${degree}. ${state.critical.length} finite critical point${state.critical.length === 1 ? '' : 's'}.${singularText}`;
  }

  function scheduleRender(highQuality = false) {
    state.highQuality = state.highQuality || highQuality;
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(() => {
      state.renderQueued = false;
      const quality = state.highQuality;
      state.highQuality = false;
      drawStatic(quality); drawOverlay(quality); updateStatus();
    });
  }

  function startPointDrag(e) {
    e.preventDefault(); e.stopPropagation();
    const kind = e.currentTarget.dataset.kind;
    const index = +e.currentTarget.dataset.index;
    const p = eventPoint(e);
    const pts = kind === 'zero' ? state.zeros : state.poles;
    state.dragging = { kind, index, pointerId: e.pointerId, start: p, initial: clone(pts[index]) };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0 || state.dragging || e.target.closest?.('.ef-node')) return;
    e.preventDefault();
    const p = eventPoint(e);
    state.dragging = { kind: 'pan', pointerId: e.pointerId, start: p, cx: state.view.cx, cy: state.view.cy, half: state.view.half };
    stage.classList.add('is-panning');
    stage.setPointerCapture?.(e.pointerId);
  });

  window.addEventListener('pointermove', e => {
    const d = state.dragging;
    if (!d || e.pointerId !== d.pointerId) return;
    const p = eventPoint(e);
    if (d.kind === 'pan') {
      const units = 2 * d.half / Math.min(stage.clientWidth, stage.clientHeight);
      state.view.cx = d.cx - (p.x - d.start.x) * units;
      state.view.cy = d.cy + (p.y - d.start.y) * units;
    } else {
      const pts = d.kind === 'zero' ? state.zeros : state.poles;
      pts[d.index] = fromScreen(p.x, p.y);
      recompute();
    }
    resetParticles(); scheduleRender(false);
  });

  window.addEventListener('pointerup', e => {
    if (!state.dragging || e.pointerId !== state.dragging.pointerId) return;
    state.dragging = null; stage.classList.remove('is-panning');
    resetParticles(); scheduleRender(true);
  });
  window.addEventListener('pointercancel', () => {
    state.dragging = null; stage.classList.remove('is-panning'); scheduleRender(true);
  });

  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const p = eventPoint(e), before = fromScreen(p.x, p.y);
    state.view.half = Math.max(.3, Math.min(25, state.view.half * Math.exp(Math.sign(e.deltaY) * .13)));
    const after = fromScreen(p.x, p.y);
    state.view.cx += before.re - after.re; state.view.cy += before.im - after.im;
    resetParticles(); scheduleRender(true);
  }, { passive: false });

  presetSelect.addEventListener('change', () => setPreset(presetSelect.value));
  angleInput.addEventListener('input', () => {
    state.theta = modPi(+angleInput.value * Math.PI / 180);
    syncAngleControl(); scheduleRender(false);
  });
  angleInput.addEventListener('change', () => scheduleRender(true));
  singularButton.addEventListener('click', () => {
    if (!state.critical.length) return;
    state.selectedCritical = (state.selectedCritical + 1) % state.critical.length;
    state.theta = modPi(carg(fValue(state.critical[state.selectedCritical])));
    syncAngleControl(); scheduleRender(true);
  });
  fitButton.addEventListener('click', fitView);
  for (const toggle of [pencilToggle, potentialToggle, graphToggle]) toggle.addEventListener('change', () => scheduleRender(true));
  flowToggle.addEventListener('change', () => {
    if (!flowToggle.checked) clearParticles();
    else resetParticles();
  });

  function particleBounds() {
    const { w, h } = dims(), den = Math.min(w, h);
    const hx = state.view.half * w / den * 1.12, hy = state.view.half * h / den * 1.12;
    return { xmin: state.view.cx - hx, xmax: state.view.cx + hx, ymin: state.view.cy - hy, ymax: state.view.cy + hy };
  }
  function inside(z, b) { return z.re >= b.xmin && z.re <= b.xmax && z.im >= b.ymin && z.im <= b.ymax; }
  function spawnParticle() {
    const b = particleBounds();
    let z;
    if (state.poles.length && Math.random() < .72) {
      const pole = state.poles[Math.floor(Math.random() * state.poles.length)];
      const unit = 2 * state.view.half / Math.min(stage.clientWidth, stage.clientHeight);
      z = add(pole, scale(expi(2 * Math.PI * Math.random()), unit * (10 + 22 * Math.random())));
    } else if (!state.poles.length && Math.random() < .7) {
      const side = Math.floor(4 * Math.random()), t = Math.random();
      if (side === 0) z = C(b.xmin, b.ymin + t * (b.ymax - b.ymin));
      else if (side === 1) z = C(b.xmax, b.ymin + t * (b.ymax - b.ymin));
      else if (side === 2) z = C(b.xmin + t * (b.xmax - b.xmin), b.ymin);
      else z = C(b.xmin + t * (b.xmax - b.xmin), b.ymax);
    } else z = C(b.xmin + Math.random() * (b.xmax - b.xmin), b.ymin + Math.random() * (b.ymax - b.ymin));
    return { z, prev: null, age: 0, ttl: 2.2 + 3.2 * Math.random(), alpha: .18 + .25 * Math.random() };
  }
  function resetParticles() {
    const count = Math.max(28, Math.min(70, 62 - 4 * (state.zeros.length + state.poles.length + state.critical.length)));
    state.particles = Array.from({ length: count }, spawnParticle);
    clearParticles();
  }
  function clearParticles() {
    const { ctx, w, h } = resizeCanvas(particleCanvas);
    ctx.clearRect(0, 0, w, h);
  }
  function nearest(z, pts) {
    let d = Infinity;
    for (const p of pts) d = Math.min(d, dist(z, p));
    return d;
  }
  function animate(timestamp) {
    state.animationFrame = requestAnimationFrame(animate);
    if (!state.visible || !flowToggle.checked) { state.lastFrame = timestamp; return; }
    const { ctx, w, h } = resizeCanvas(particleCanvas);
    const dt = Math.max(.009, Math.min(.04, (timestamp - (state.lastFrame || timestamp)) / 1000));
    state.lastFrame = timestamp;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,.085)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    const b = particleBounds();
    const unit = 2 * state.view.half / Math.min(stage.clientWidth, stage.clientHeight);
    for (let i = 0; i < state.particles.length; i += 1) {
      let p = state.particles[i];
      if (!inside(p.z, b) || nearest(p.z, state.zeros) < unit * 8 || nearest(p.z, state.critical) < unit * 5 || p.age > p.ttl) {
        p = spawnParticle(); state.particles[i] = p; continue;
      }
      let v = newtonVelocity(p.z, true);
      if (!v || cabs(v) < 1e-16) { state.particles[i] = spawnParticle(); continue; }
      const rawSpeed = cabs(v);
      v = scale(v, 1 / rawSpeed);
      const step = unit * (27 + 18 * Math.tanh(Math.log1p(rawSpeed))) * dt;
      const mid = add(p.z, scale(v, step * .5));
      let v2 = newtonVelocity(mid, true);
      if (!v2 || cabs(v2) < 1e-16) { state.particles[i] = spawnParticle(); continue; }
      v2 = scale(v2, 1 / cabs(v2));
      const next = add(p.z, scale(v2, step));
      if (!finiteC(next)) { state.particles[i] = spawnParticle(); continue; }
      const a = toScreen(p.z), q = toScreen(next);
      ctx.save();
      ctx.strokeStyle = `rgba(122,204,255,${p.alpha})`;
      ctx.lineWidth = .85;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      ctx.fillStyle = `rgba(245,251,255,${Math.min(.8, p.alpha + .3)})`;
      ctx.beginPath(); ctx.arc(q.x, q.y, 1.05, 0, 2 * Math.PI); ctx.fill();
      ctx.restore();
      p.prev = p.z; p.z = next; p.age += dt;
    }
  }

  const visibilityObserver = new IntersectionObserver(entries => {
    state.visible = entries.some(entry => entry.isIntersecting);
  }, { threshold: .02 });
  visibilityObserver.observe(card);

  let stageHeadings = [];
  let stageScrollQueued = false;
  function syncPresetToScroll() {
    stageScrollQueued = false;
    if (!stageHeadings.length || state.dragging) return;
    const marker = window.innerHeight * .34;
    let chosen = null;
    for (const heading of stageHeadings) {
      if (heading.getBoundingClientRect().top <= marker) chosen = heading;
      else break;
    }
    if (chosen && chosen.dataset.demoPreset !== state.preset) {
      setPreset(chosen.dataset.demoPreset, { fromArticle: true });
    }
  }
  function queueStageScrollSync() {
    if (stageScrollQueued) return;
    stageScrollQueued = true;
    requestAnimationFrame(syncPresetToScroll);
  }
  function setupStageSync() {
    stageHeadings = [...document.querySelectorAll('[data-demo-preset]')];
    queueStageScrollSync();
  }
  window.addEventListener('electrostatic:markdown-rendered', setupStageSync);
  window.addEventListener('scroll', queueStageScrollSync, { passive: true });
  window.addEventListener('resize', queueStageScrollSync);
  requestAnimationFrame(setupStageSync);
  setTimeout(setupStageSync, 500);

  let windowDrag = null;
  dragHandle.addEventListener('pointerdown', e => {
    e.preventDefault();
    const current = parseFloat(getComputedStyle(floatingDemo).getPropertyValue('--demo-drag-y')) || 0;
    windowDrag = { id: e.pointerId, y: e.clientY, current };
    floatingDemo.classList.add('is-dragging');
    dragHandle.setPointerCapture?.(e.pointerId);
  });
  window.addEventListener('pointermove', e => {
    if (!windowDrag || e.pointerId !== windowDrag.id) return;
    const value = Math.max(-window.innerHeight * .35, Math.min(window.innerHeight * .35, windowDrag.current + e.clientY - windowDrag.y));
    floatingDemo.style.setProperty('--demo-drag-y', `${value}px`);
  });
  window.addEventListener('pointerup', e => {
    if (windowDrag?.id === e.pointerId) { windowDrag = null; floatingDemo.classList.remove('is-dragging'); }
  });

  let windowResize = null;
  resizeHandle.addEventListener('pointerdown', e => {
    e.preventDefault();
    const rect = card.getBoundingClientRect();
    windowResize = { id: e.pointerId, x: e.clientX, y: e.clientY, width: rect.width, height: stage.clientHeight };
    resizeHandle.setPointerCapture?.(e.pointerId);
  });
  window.addEventListener('pointermove', e => {
    if (!windowResize || e.pointerId !== windowResize.id) return;
    const width = Math.max(380, Math.min(720, windowResize.width - (e.clientX - windowResize.x)));
    const height = Math.max(280, Math.min(620, windowResize.height + (e.clientY - windowResize.y)));
    floatingDemo.style.setProperty('--demo-width', `${width}px`);
    floatingDemo.style.setProperty('--demo-canvas-height', `${height}px`);
    resetParticles(); scheduleRender(false);
  });
  window.addEventListener('pointerup', e => {
    if (windowResize?.id === e.pointerId) { windowResize = null; resetParticles(); scheduleRender(true); }
  });

  new ResizeObserver(() => { resetParticles(); scheduleRender(true); }).observe(stage);

  setPreset('cubic', { fromArticle: true });
  state.animationFrame = requestAnimationFrame(animate);
})();
