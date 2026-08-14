// Refinements: critical lemniscates only, analytic node patches, and a
// separate compactified control for the additive constant c.

const cControl = document.getElementById('cControl');
const cSvg = document.getElementById('cSvg');

function rawEvtPoint(e, el) {
  const r = el.getBoundingClientRect();
  return {x: e.clientX - r.left, y: e.clientY - r.top};
}

// The existing window-level drag handler calls evtPoint(e, zPlot). Redirect
// that coordinate conversion while the separately housed c-control is active.
evtPoint = function(e, el) {
  return rawEvtPoint(e, state.dragging?.kind === 'c' ? cControl : el);
};

compactWidgetGeometry = function() {
  const {w, h} = dims(cControl);
  const radius = Math.max(42, Math.min(w, h) / 2 - 11);
  return {cx: w / 2, cy: h / 2, radius, inner: radius - 10};
};

startDrag = function(e, kind, index) {
  e.preventDefault();
  e.stopPropagation();
  const host = kind === 'c' ? cControl : zPlot;
  const p = rawEvtPoint(e, host);
  state.dragging = {
    kind, index, pointerId: e.pointerId,
    startX: p.x, startY: p.y, moved: false
  };
  if (kind === 'z' || kind === 'w') {
    const members = groupIndices(kind, index), points = pointsFor(kind);
    state.dragging.members = members;
    state.dragging.initial = members.map(i => cloneC(points[i]));
    state.dragging.startWorld = fromScreen(p.x, p.y, state.zView, zPlot);
  } else if (kind === 'c') {
    state.dragging.valueScale = compactValueScale();
    state.dragging.widget = compactWidgetGeometry();
  }
  host.setPointerCapture?.(e.pointerId);
};

function uniqueCriticalEntries() {
  const disk = smallestEnclosingCircle(state.Z);
  const spatialTol = Math.max(1e-9, disk.radius * 1e-7);
  const entries = [];
  for (const w of state.W) {
    if (entries.some(q => dist(q.w, w) <= spatialTol)) continue;
    const pw = polyEval(state.P, w);
    if (abs(pw) <= 1e-11) continue; // a multiple root: level zero is isolated
    const local = criticalLocalExpansion(w);
    if (!local) continue;
    entries.push({
      w: cloneC(w), pw, local,
      level: Math.log(abs(pw)),
      level2: abs2(pw)
    });
  }
  return entries;
}

function algebraicLevelValue(z, level2) {
  return abs2(polyEval(state.P, z)) - level2;
}

function correctBranchAngle(entry, radius, theta) {
  const {w, level2, local} = entry;
  const order = local.order;
  const f = t => algebraicLevelValue(add(w, scale(expi(t), radius)), level2);

  // In the leading homogeneous term, adjacent rays are pi/order apart.
  // This bracket is narrower than that spacing and normally contains exactly
  // the continuation of the chosen branch.
  const span = 0.43 * Math.PI / order;
  let a = theta - span, b = theta + span;
  let fa = f(a), fb = f(b);
  if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb <= 0) {
    for (let k = 0; k < 24; k++) {
      const m = (a + b) / 2, fm = f(m);
      if (!Number.isFinite(fm)) break;
      if (fa * fm <= 0) { b = m; fb = fm; }
      else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }

  // Fallback Newton correction in the angular variable.
  let t = theta;
  for (let k = 0; k < 9; k++) {
    const radial = scale(expi(t), radius);
    const z = add(w, radial);
    const p = polyEval(state.P, z), dp = polyEval(state.dP, z);
    const dz = C(-radial.im, radial.re); // i * radial
    const value = abs2(p) - level2;
    const slope = 2 * mul(conj(p), mul(dp, dz)).re;
    if (!Number.isFinite(value) || !Number.isFinite(slope) || Math.abs(slope) < 1e-18) break;
    const step = Math.max(-span / 2, Math.min(span / 2, value / slope));
    t -= step;
    if (Math.abs(step) < 1e-11) break;
  }
  return t;
}

function nodePatchRadius(entry, entries, highQuality) {
  const pixelUnit = 2 * state.zView.half / Math.min(zPlot.clientWidth, zPlot.clientHeight);
  const disk = smallestEnclosingCircle(state.Z);
  let radius = pixelUnit * (highQuality ? 27 : 17);
  radius = Math.min(radius, Math.max(pixelUnit * 10, 0.16 * Math.max(disk.radius, pixelUnit)));

  let nearest = Infinity;
  for (const z of state.Z) nearest = Math.min(nearest, dist(entry.w, z));
  for (const q of entries) if (q !== entry) nearest = Math.min(nearest, dist(entry.w, q.w));
  if (Number.isFinite(nearest)) radius = Math.min(radius, 0.28 * nearest);
  return Math.max(pixelUnit * 8, radius);
}

function traceNodeBranches(entry, radius, highQuality) {
  const B = mul(conj(entry.pw), entry.local.coefficient);
  const order = entry.local.order;
  const rays = 2 * order;
  const count = highQuality ? 20 : 11;
  const branches = [];

  for (let k = 0; k < rays; k++) {
    let theta = (Math.PI / 2 - arg(B) + k * Math.PI) / order;
    const points = [cloneC(entry.w)];
    for (let j = 1; j <= count; j++) {
      const t = j / count;
      const r = radius * (0.035 + 0.965 * Math.pow(t, 1.12));
      theta = correctBranchAngle(entry, r, theta);
      points.push(add(entry.w, scale(expi(theta), r)));
    }
    branches.push(points);
  }
  return branches;
}

// Draw only the critical lemniscates |P| = |P(w)|. The global portions use
// marching squares; a small neighborhood of every non-root critical point is
// then replaced by branches corrected against the exact real-algebraic
// equation |P(z)|^2 - |P(w)|^2 = 0, all meeting exactly at w.
drawLandscape = function(highQuality = true) {
  const show = document.getElementById('landscapeToggle').checked;
  const {w, h} = resizeCanvas(landscapeCanvas, zPlot);
  const ctx = landscapeCanvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (!show) return;

  const entries = uniqueCriticalEntries();
  if (!entries.length) return;
  const criticalLevels = dedupeLevels(entries.map(q => q.level), highQuality ? 1e-9 : 1e-7);
  const side = Math.min(w, h);
  const N = highQuality
    ? Math.max(145, Math.min(245, Math.round(side / 3.0)))
    : Math.max(70, Math.min(108, Math.round(side / 6.5)));
  const row = N + 1, grid = new Float64Array(row * row);

  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const z = fromScreen(i / N * zPlot.clientWidth, j / N * zPlot.clientHeight, state.zView, zPlot);
    grid[j * row + i] = Math.log(Math.max(1e-300, abs(polyEval(state.P, z))));
  }

  const sx = w / N, sy = h / N;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(222,235,242,.58)';
  ctx.lineWidth = highQuality ? 1.25 : 1.05;
  for (const level of criticalLevels) marchLevel(ctx, grid, N, level, sx, sy);

  const patches = entries.map(entry => ({
    entry,
    radius: nodePatchRadius(entry, entries, highQuality)
  }));
  const pixelsPerUnit = Math.min(w, h) / (2 * state.zView.half);

  // Remove the ambiguous coarse crossing before inserting the local algebraic node.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (const patch of patches) {
    const p = toScreen(patch.entry.w, state.zView, zPlot);
    ctx.beginPath();
    ctx.arc(p.x, p.y, patch.radius * pixelsPerUnit * 1.03 + 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(242,248,250,.90)';
  ctx.lineWidth = highQuality ? 1.7 : 1.35;
  for (const patch of patches) {
    for (const branch of traceNodeBranches(patch.entry, patch.radius, highQuality)) {
      ctx.beginPath();
      branch.forEach((z, i) => {
        const p = toScreen(z, state.zView, zPlot);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  }
  ctx.restore();
};

// The compactified value control is now rendered in its own sidebar card.
drawCompactValueControl = function() {
  const {w, h} = dims(cControl);
  cSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  clearSvg(cSvg);
  const g = compactWidgetGeometry(), values = criticalValues(), s = compactValueScale(values);
  const group = svgEl('g', {'aria-label': 'compactified value control'});
  group.appendChild(svgEl('circle', {cx: g.cx, cy: g.cy, r: g.radius, class: 'compact-bg'}));
  for (const frac of [.50, .75]) group.appendChild(svgEl('circle', {cx: g.cx, cy: g.cy, r: g.inner * frac, class: 'compact-ring'}));
  group.appendChild(svgEl('line', {x1: g.cx - g.inner, y1: g.cy, x2: g.cx + g.inner, y2: g.cy, class: 'compact-axis'}));
  group.appendChild(svgEl('line', {x1: g.cx, y1: g.cy - g.inner, x2: g.cx, y2: g.cy + g.inner, class: 'compact-axis'}));
  const inf = svgEl('text', {x: g.cx, y: g.cy - g.radius + 12, 'text-anchor': 'middle', class: 'compact-caption'});
  inf.textContent = '∞';
  group.appendChild(inf);
  for (const v of values) {
    const p = compactToScreen(v, s, g);
    group.appendChild(svgEl('circle', {cx: p.x, cy: p.y, r: 3.4, class: 'critical-value-node'}));
  }
  const cp = compactToScreen(state.c, s, g);
  group.appendChild(svgEl('circle', {cx: cp.x, cy: cp.y, r: 7.2, class: 'node parameter-node'}));
  cSvg.appendChild(group);
};

cSvg.addEventListener('pointerdown', e => {
  startDrag(e, 'c', 0);
  const d = state.dragging;
  const p = rawEvtPoint(e, cControl);
  setC(compactFromScreen(p.x, p.y, d.valueScale, d.widget));
  scheduleRender(false);
});

new ResizeObserver(() => scheduleRender(true)).observe(cControl);
scheduleRender(true);
