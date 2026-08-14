"use strict";

// Color each critical lemniscate by its critical level.  Every connected
// component retained for the same value |P(w)| gets the same color, including
// the exact local node patch at w.  Lower levels are blue; higher levels are
// gold, with a muted violet transition rather than a full rainbow.

function mixChannel(a, b, t) {
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
}

function levelRgb(t) {
  const low = [72, 151, 255];
  const mid = [184, 162, 224];
  const high = [255, 181, 78];
  if (t <= 0.5) {
    const u = 2 * t;
    return low.map((x, i) => mixChannel(x, mid[i], u));
  }
  const u = 2 * t - 1;
  return mid.map((x, i) => mixChannel(x, high[i], u));
}

function levelRgba(t, alpha) {
  const [r, g, b] = levelRgb(t);
  return `rgba(${r},${g},${b},${alpha})`;
}

function normalizedCriticalLevel(level, lo, hi) {
  if (!(hi > lo)) return 0.5;
  return Math.max(0, Math.min(1, (level - lo) / (hi - lo)));
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
  const lo = groups[0].level;
  const hi = groups[groups.length - 1].level;
  for (const group of groups) {
    group.t = normalizedCriticalLevel(group.level, lo, hi);
  }

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
  const attachmentThreshold = Math.max(4.5, 2.4 * Math.hypot(sx, sy));
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = highQuality ? 1.65 : 1.3;

  for (const group of groups) {
    ctx.strokeStyle = levelRgba(group.t, 0.82);
    const segments = collectMarchSegments(grid, N, group.level, sx, sy);
    for (const component of marchComponents(segments)) {
      if (componentMeetsCriticalPoint(component, group.entries, attachmentThreshold)) {
        strokeSegments(ctx, component);
      }
    }
  }

  const patches = entries.map(entry => {
    let group = groups[0];
    for (const candidate of groups) {
      if (Math.abs(candidate.level - entry.level) < Math.abs(group.level - entry.level)) {
        group = candidate;
      }
    }
    return {
      entry,
      group,
      radius: nodePatchRadius(entry, entries, highQuality)
    };
  });
  const pixelsPerUnit = Math.min(w, h) / (2 * state.zView.half);

  // Remove the coarse marching-square crossing and replace it by branches on
  // the exact real-algebraic level |P(z)|^2 = |P(w)|^2, all meeting at w.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (const patch of patches) {
    const p = toScreen(patch.entry.w, state.zView, zPlot);
    ctx.beginPath();
    ctx.arc(p.x, p.y, patch.radius * pixelsPerUnit * 1.03 + 1.7, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = highQuality ? 2.05 : 1.65;
  for (const patch of patches) {
    ctx.strokeStyle = levelRgba(patch.group.t, 0.98);
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

scheduleRender(true);
