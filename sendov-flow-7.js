"use strict";

// Draw only the finitely many critical levels |P(z)| = |P(w)|.  All connected
// components belonging to one level share one color; lower levels are cool and
// higher levels are warm.  Near each critical point, the coarse marching-square
// curve is replaced by branches corrected to the exact algebraic equation
// |P(z)|^2 - |P(w)|^2 = 0, so the node occurs exactly at w.

function criticalLevelGroups(entries, tolerance = 1e-9) {
  const sorted = entries.slice().sort((a, b) => a.level - b.level);
  const groups = [];
  for (const entry of sorted) {
    const group = groups[groups.length - 1];
    const scale = 1 + Math.abs(entry.level) + (group ? Math.abs(group.level) : 0);
    if (!group || Math.abs(entry.level - group.level) > tolerance * scale) {
      groups.push({level: entry.level, entries: [entry]});
    } else {
      group.entries.push(entry);
      group.level = group.entries.reduce((sum, q) => sum + q.level, 0) /
        group.entries.length;
    }
  }
  return groups;
}

function criticalLevelColor(index, count) {
  const t = count <= 1 ? 0.5 : index / (count - 1);
  // Increasing log|P|: blue -> cyan/green -> gold -> coral.
  const hue = 220 - 198 * t;
  const lightness = 69 - 5 * Math.abs(2 * t - 1);
  return `hsl(${hue.toFixed(1)} 82% ${lightness.toFixed(1)}%)`;
}

drawLandscape = function(highQuality = true) {
  const show = document.getElementById('landscapeToggle').checked;
  const {w, h} = resizeCanvas(landscapeCanvas, zPlot);
  const ctx = landscapeCanvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (!show) return;

  const entries = uniqueCriticalEntries();
  if (!entries.length) return;
  const groups = criticalLevelGroups(entries, highQuality ? 1e-9 : 1e-7);
  const entryColors = new Map();
  groups.forEach((group, index) => {
    group.color = criticalLevelColor(index, groups.length);
    for (const entry of group.entries) entryColors.set(entry, group.color);
  });

  const side = Math.min(w, h);
  const N = highQuality
    ? Math.max(165, Math.min(280, Math.round(side / 2.65)))
    : Math.max(78, Math.min(120, Math.round(side / 5.8)));
  const row = N + 1;
  const grid = new Float64Array(row * row);

  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const z = fromScreen(
      i / N * zPlot.clientWidth,
      j / N * zPlot.clientHeight,
      state.zView,
      zPlot
    );
    grid[j * row + i] = Math.log(Math.max(1e-300, abs(polyEval(state.P, z))));
  }

  const sx = w / N, sy = h / N;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = highQuality ? 1.45 : 1.15;

  // These are all components of the critical levels, and no other contours.
  for (const group of groups) {
    ctx.strokeStyle = group.color;
    marchLevel(ctx, grid, N, group.level, sx, sy);
  }

  const patches = entries.map(entry => ({
    entry,
    radius: nodePatchRadius(entry, entries, highQuality)
  }));
  const pixelsPerUnit = Math.min(w, h) / (2 * state.zView.half);

  // Remove the ambiguous pixel-scale crossing before drawing the exact node.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (const patch of patches) {
    const p = toScreen(patch.entry.w, state.zView, zPlot);
    ctx.beginPath();
    ctx.arc(p.x, p.y, patch.radius * pixelsPerUnit * 1.03 + 1.7, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = highQuality ? 1.95 : 1.55;
  for (const patch of patches) {
    ctx.strokeStyle = entryColors.get(patch.entry) || 'rgba(245,250,252,.96)';
    for (const branch of traceNodeBranches(patch.entry, patch.radius, highQuality)) {
      ctx.beginPath();
      branch.forEach((z, i) => {
        const p = toScreen(z, state.zView, zPlot);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  }
  ctx.restore();
};

// The red ascending separatrices were only a landscape aid.  The displayed
// graph is now precisely the descending Newton graph from W to Z, with the
// branch used in each bar drawn thickest.
const renderCriticalLevelsOnly = renderZ;
renderZ = function(full = true) {
  renderCriticalLevelsOnly(full);
  for (const ridge of [...zSvg.querySelectorAll('.flow.ridge')]) ridge.remove();
};

// Make the whole main plane pannable by dragging anywhere except a draggable
// root or critical-point node.  The existing pointer-up handler completes the
// interaction and requests a high-resolution redraw.
const panStyle = document.createElement('style');
panStyle.textContent = `
  .plotbox { cursor: grab; }
  .plotbox.panning { cursor: grabbing; }
  .plotbox .node { cursor: grab; }
  .flow, .focus-boundary, .enclosing-disk, .disk-center { pointer-events: none; }
  .flow.ridge { display: none !important; }
`;
document.head.appendChild(panStyle);

zPlot.addEventListener('pointerdown', e => {
  if (e.button !== 0 || state.dragging) return;
  if (e.target.closest?.('.node')) return;
  e.preventDefault();
  const p = rawEvtPoint(e, zPlot);
  state.dragging = {
    kind: 'pan',
    pointerId: e.pointerId,
    startX: p.x,
    startY: p.y,
    startViewCx: state.zView.cx,
    startViewCy: state.zView.cy,
    startHalf: state.zView.half,
    moved: false
  };
  zPlot.classList.add('panning');
  zPlot.setPointerCapture?.(e.pointerId);
});

window.addEventListener('pointermove', e => {
  const d = state.dragging;
  if (!d || d.kind !== 'pan' || e.pointerId !== d.pointerId) return;
  e.preventDefault();
  const p = rawEvtPoint(e, zPlot);
  const dx = p.x - d.startX;
  const dy = p.y - d.startY;
  const unitsPerPixel = 2 * d.startHalf /
    Math.min(zPlot.clientWidth, zPlot.clientHeight);
  state.zView.cx = d.startViewCx - dx * unitsPerPixel;
  state.zView.cy = d.startViewCy + dy * unitsPerPixel;
  d.moved = d.moved || Math.hypot(dx, dy) > 2;
  scheduleRender(false);
}, {passive: false});

for (const eventName of ['pointerup', 'pointercancel']) {
  window.addEventListener(eventName, () => zPlot.classList.remove('panning'));
}

scheduleRender(true);
