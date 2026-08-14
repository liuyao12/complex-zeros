"use strict";

// Keep only those connected components of a critical level set that actually
// meet a critical point.  A level |P|=|P(w)| can have unrelated components;
// these are not part of the critical lemniscate through w and are suppressed.

function criticalLevelGroups(entries, tolerance = 1e-9) {
  const sorted = entries.slice().sort((a, b) => a.level - b.level);
  const groups = [];
  for (const entry of sorted) {
    const group = groups[groups.length - 1];
    if (!group || Math.abs(entry.level - group.level) > tolerance) {
      groups.push({level: entry.level, entries: [entry]});
    } else {
      group.entries.push(entry);
      group.level = group.entries.reduce((s, q) => s + q.level, 0) / group.entries.length;
    }
  }
  return groups;
}

function collectMarchSegments(grid, N, level, sx, sy) {
  const segments = [];
  const row = N + 1;

  const addSegment = (e0, e1, x, y, a, b, c, d) => {
    const p = edgePoint(e0, x, y, a, b, c, d, level);
    const q = edgePoint(e1, x, y, a, b, c, d, level);
    segments.push({
      a: {x: p[0] * sx, y: p[1] * sy},
      b: {x: q[0] * sx, y: q[1] * sy}
    });
  };

  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const a = grid[y * row + x];
    const b = grid[y * row + x + 1];
    const c = grid[(y + 1) * row + x + 1];
    const d = grid[(y + 1) * row + x];
    if (!Number.isFinite(a + b + c + d)) continue;

    const mask = (a > level ? 1 : 0) | (b > level ? 2 : 0) |
      (c > level ? 4 : 0) | (d > level ? 8 : 0);
    if (mask === 0 || mask === 15) continue;

    const crossings = [];
    if ((a > level) !== (b > level)) crossings.push(0);
    if ((b > level) !== (c > level)) crossings.push(1);
    if ((d > level) !== (c > level)) crossings.push(2);
    if ((a > level) !== (d > level)) crossings.push(3);

    if (crossings.length === 2) {
      addSegment(crossings[0], crossings[1], x, y, a, b, c, d);
      continue;
    }
    if (crossings.length !== 4) continue;

    const centerHigh = (a + b + c + d) / 4 > level;
    if (mask === 5) {
      if (centerHigh) {
        addSegment(0, 1, x, y, a, b, c, d);
        addSegment(2, 3, x, y, a, b, c, d);
      } else {
        addSegment(0, 3, x, y, a, b, c, d);
        addSegment(1, 2, x, y, a, b, c, d);
      }
    } else if (mask === 10) {
      if (centerHigh) {
        addSegment(0, 3, x, y, a, b, c, d);
        addSegment(1, 2, x, y, a, b, c, d);
      } else {
        addSegment(0, 1, x, y, a, b, c, d);
        addSegment(2, 3, x, y, a, b, c, d);
      }
    }
  }
  return segments;
}

function marchComponents(segments) {
  const endpointMap = new Map();
  const key = p => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

  segments.forEach((segment, index) => {
    for (const p of [segment.a, segment.b]) {
      const k = key(p);
      if (!endpointMap.has(k)) endpointMap.set(k, []);
      endpointMap.get(k).push(index);
    }
  });

  const seen = new Uint8Array(segments.length);
  const components = [];
  for (let seed = 0; seed < segments.length; seed++) {
    if (seen[seed]) continue;
    const stack = [seed], component = [];
    seen[seed] = 1;
    while (stack.length) {
      const index = stack.pop();
      const segment = segments[index];
      component.push(segment);
      for (const p of [segment.a, segment.b]) {
        for (const neighbor of endpointMap.get(key(p)) || []) {
          if (!seen[neighbor]) {
            seen[neighbor] = 1;
            stack.push(neighbor);
          }
        }
      }
    }
    components.push(component);
  }
  return components;
}

function pixelSegmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const den = dx * dx + dy * dy;
  if (den < 1e-18) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / den));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function componentMeetsCriticalPoint(component, entries, threshold) {
  for (const entry of entries) {
    const p = toScreen(entry.w, state.zView, zPlot);
    for (const segment of component) {
      if (pixelSegmentDistance(p, segment.a, segment.b) <= threshold) return true;
    }
  }
  return false;
}

function strokeSegments(ctx, segments) {
  ctx.beginPath();
  for (const segment of segments) {
    ctx.moveTo(segment.a.x, segment.a.y);
    ctx.lineTo(segment.b.x, segment.b.y);
  }
  ctx.stroke();
}

// Replace the previous contour renderer.  We still patch the immediate
// neighborhood of each critical point with branches satisfying the exact
// real-algebraic equation |P(z)|^2-|P(w)|^2=0, so the node is explicit.
drawLandscape = function(highQuality = true) {
  const show = document.getElementById('landscapeToggle').checked;
  const {w, h} = resizeCanvas(landscapeCanvas, zPlot);
  const ctx = landscapeCanvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (!show) return;

  const entries = uniqueCriticalEntries();
  if (!entries.length) return;
  const groups = criticalLevelGroups(entries, highQuality ? 1e-9 : 1e-7);
  const side = Math.min(w, h);
  const N = highQuality
    ? Math.max(165, Math.min(280, Math.round(side / 2.65)))
    : Math.max(78, Math.min(120, Math.round(side / 5.8)));
  const row = N + 1;
  const grid = new Float64Array(row * row);

  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const z = fromScreen(i / N * zPlot.clientWidth, j / N * zPlot.clientHeight,
      state.zView, zPlot);
    grid[j * row + i] = Math.log(Math.max(1e-300, abs(polyEval(state.P, z))));
  }

  const sx = w / N, sy = h / N;
  const attachmentThreshold = Math.max(4.5, 2.4 * Math.hypot(sx, sy));
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(226,238,244,.68)';
  ctx.lineWidth = highQuality ? 1.35 : 1.1;

  for (const group of groups) {
    const segments = collectMarchSegments(grid, N, group.level, sx, sy);
    for (const component of marchComponents(segments)) {
      if (componentMeetsCriticalPoint(component, group.entries, attachmentThreshold)) {
        strokeSegments(ctx, component);
      }
    }
  }

  const patches = entries.map(entry => ({
    entry,
    radius: nodePatchRadius(entry, entries, highQuality)
  }));
  const pixelsPerUnit = Math.min(w, h) / (2 * state.zView.half);

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (const patch of patches) {
    const p = toScreen(patch.entry.w, state.zView, zPlot);
    ctx.beginPath();
    ctx.arc(p.x, p.y, patch.radius * pixelsPerUnit * 1.03 + 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(245,250,252,.96)';
  ctx.lineWidth = highQuality ? 1.8 : 1.45;
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

// Ascending red separatrices were a landscape aid, not part of the Z-W
// connecting graph. Remove them from the rendered SVG altogether.
const renderWithoutRidges = renderZ;
renderZ = function(full = true) {
  renderWithoutRidges(full);
  for (const ridge of [...zSvg.querySelectorAll('.flow.ridge')]) ridge.remove();
};

scheduleRender(true);
