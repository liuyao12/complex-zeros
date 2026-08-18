"use strict";

// ---------- rootwise rational-Sendov normalization ----------
// The Videnskii–Buff theorem applies to any circular region containing the
// complete zero fiber. For a particular finite zero a, the smallest disk
// centered at a that contains every zero has radius
//
//     r(a) = max_{alpha in Z(f)} |a-alpha|.
//
// This is the natural denominator for a root-by-root diagnostic. The yellow
// disk remains the globally smallest zero-enclosing disk, whose radius R0 is a
// useful configuration scale but is not the rootwise theorem's denominator.

function r7RootRadius(zero) {
  let radius = 0;
  for (const other of state.zeros) radius = Math.max(radius, dist(zero, other));
  return radius;
}

r5ComputeZeroMetrics = function(flow, zeroDiskData) {
  const criticalSites = r5FiniteCriticalSites();
  const zeroBranches = (flow.branches || []).filter(branch => branch.type === "zero");

  return state.zeros.map((zero, index) => {
    const rootRadius = r7RootRadius(zero);
    const direct = groupMembers("zero", index).length > 1 ||
      criticalSites.some(w => dist(w, zero) <= 2e-8 * Math.max(1, cabs(zero)));

    let selected = null;
    let arc = direct ? 0 : NaN;
    let incidentChord = direct ? 0 : NaN;

    if (!direct) {
      const candidates = zeroBranches.filter(branch => branch.resolved && branch.endpoint === index);
      for (const branch of candidates) {
        const value = r5BranchArcLength(branch);
        if (!selected || value < arc || (!Number.isFinite(arc) && Number.isFinite(value))) {
          selected = branch;
          arc = value;
          const start = branch.segments?.[0]?.[0];
          incidentChord = start ? dist(start, zero) : NaN;
        }
      }
    }

    let nearestChord = Infinity;
    for (const w of criticalSites) nearestChord = Math.min(nearestChord, dist(zero, w));
    if (!criticalSites.length) nearestChord = NaN;

    const normalize = value => {
      if (!zeroDiskData.available) return NaN;
      if (rootRadius <= 1e-14) return value === 0 ? 0 : Infinity;
      return value / rootRadius;
    };

    return {
      index,
      zero,
      rootRadius,
      direct,
      branch: selected,
      arc,
      incidentChord,
      nearestChord,
      arcRatio: normalize(arc),
      incidentRatio: normalize(incidentChord),
      nearestRatio: normalize(nearestChord)
    };
  });
};

state.r7HoverRoot = null;

function r7RemoveRootwiseDisk() {
  for (const element of [...svg.querySelectorAll(".rootwise-disk,.rootwise-root-ring")]) {
    element.remove();
  }
}

function r7DrawRootwiseDisk() {
  r7RemoveRootwiseDisk();
  const index = state.r7HoverRoot;
  const metric = state.flow?.zeroMetrics?.find(item => item.index === index);
  if (!metric || !(metric.rootRadius > 0)) return;

  const {w, h} = dims(plot);
  const center = toScreen(metric.zero);
  const pixelsPerUnit = Math.min(w, h) / (2 * state.view.half);
  const circle = svgEl("circle", {
    cx: center.x,
    cy: center.y,
    r: metric.rootRadius * pixelsPerUnit,
    class: "rootwise-disk"
  });
  const ring = svgEl("circle", {
    cx: center.x,
    cy: center.y,
    r: 12,
    class: "rootwise-root-ring"
  });
  r5InsertBeforeGraph(circle);
  svg.appendChild(ring);
}

const r7BaseRenderSvg = renderSvg;
renderSvg = function(quality) {
  r7BaseRenderSvg(quality);
  r7DrawRootwiseDisk();
};

r5RenderBars = function() {
  if (!r5Bars || !r5Axis || !r5Summary || !r5Status) return;
  const flow = state.flow;
  const zeroDiskData = flow?.zeroDiskData || r5ZeroDiskData();
  const metrics = flow?.zeroMetrics || [];

  if (!zeroDiskData.available) {
    r5Status.textContent = "rootwise radii unavailable";
    r5Bars.innerHTML = "";
    r5Axis.innerHTML = "";
    r5Summary.textContent = zeroDiskData.reason;
    return;
  }

  const globalRadius = zeroDiskData.disk.radius;
  r5Status.textContent = `global R₀ ${globalRadius.toFixed(4)} · ${metrics.length} finite Z`;

  const ordered = metrics.slice().sort((a, b) => {
    const ar = a.arcRatio, br = b.arcRatio;
    if (!Number.isFinite(ar) && !Number.isFinite(br)) return a.index - b.index;
    if (!Number.isFinite(ar)) return -1;
    if (!Number.isFinite(br)) return 1;
    return br - ar;
  });

  const finiteArc = ordered.map(metric => metric.arcRatio).filter(Number.isFinite);
  const finiteNearest = ordered.map(metric => metric.nearestRatio).filter(Number.isFinite);
  const maxArc = finiteArc.length ? Math.max(...finiteArc) : 0;
  const maxNearest = finiteNearest.length ? Math.max(...finiteNearest) : 0;
  const scaleMax = Math.max(1.15, Math.ceil((Math.max(maxArc, maxNearest) + .05) * 10) / 10);
  const pct = value => Number.isFinite(value)
    ? Math.max(0, Math.min(100, 100 * value / scaleMax))
    : 100;
  const onePct = 100 / scaleMax;

  r5Bars.innerHTML = ordered.map(metric => {
    const unresolved = Number.isNaN(metric.arcRatio);
    const infinite = metric.arcRatio === Infinity;
    const overOne = Number.isFinite(metric.arcRatio) && metric.arcRatio > 1 + 1e-6;
    const title = [
      `arc ${r5ValueText(metric.arc)}`,
      `incident chord ${r5ValueText(metric.incidentChord)}`,
      `nearest critical chord ${r5ValueText(metric.nearestChord)}`,
      `r(a) ${metric.rootRadius.toPrecision(6)}`,
      `global R0 ${globalRadius.toPrecision(6)}`
    ].join("; ");
    const nearest = Number.isFinite(metric.nearestRatio)
      ? `<span class="r5-nearest-marker" style="left:${pct(metric.nearestRatio).toFixed(3)}%" title="nearest critical chord / r(a) = ${metric.nearestRatio.toFixed(5)}"></span>`
      : "";

    return `<div class="r5-row" data-root-index="${metric.index}" title="${title}">
      <span class="r5-root-dot"></span>
      <span class="r5-track">
        <span class="r5-fill${overOne ? " over-one" : ""}${infinite ? " infinite" : ""}${unresolved ? " unresolved" : ""}" style="width:${unresolved ? 0 : pct(metric.arcRatio).toFixed(3)}%"></span>
        <span class="r5-threshold one" style="left:${onePct.toFixed(3)}%"></span>
        ${nearest}
      </span>
      <span class="r5-value${infinite ? " over" : ""}">${r5RatioText(metric.arcRatio)}</span>
    </div>`;
  }).join("");

  const ticks = [0, 1];
  if (scaleMax > 1.16) ticks.push(scaleMax);
  r5Axis.innerHTML = ticks.map(value =>
    `<span style="left:${(100 * value / scaleMax).toFixed(3)}%">${value === scaleMax && value !== 1 ? value.toFixed(1) : value}</span>`
  ).join("");

  for (const row of r5Bars.querySelectorAll(".r5-row")) {
    const index = +row.dataset.rootIndex;
    row.addEventListener("mouseenter", () => {
      state.r7HoverRoot = index;
      r7DrawRootwiseDisk();
    });
    row.addEventListener("mouseleave", () => {
      if (state.r7HoverRoot === index) state.r7HoverRoot = null;
      r7RemoveRootwiseDisk();
    });
  }

  const resolved = metrics.filter(metric => !Number.isNaN(metric.arcRatio)).length;
  const infinite = metrics.filter(metric => metric.arcRatio === Infinity).length;
  const maxFiniteArc = finiteArc.length ? Math.max(...finiteArc) : NaN;
  const largestNearest = finiteNearest.length ? Math.max(...finiteNearest) : NaN;

  let text = "For each zero a, the denominator is r(a)=max{|a−α|: α is a zero}. " +
    "The orange marker is the nearest critical-point chord divided by r(a), and the rational circular-region theorem gives ≤1. " +
    "The white bar is the shortest incident Newton-edge arc divided by r(a), a stronger experimental quantity. " +
    "The yellow disk is the globally smallest zero-enclosing disk and is shown only as context.";
  if (Number.isFinite(maxFiniteArc)) text += ` Largest finite arc ratio: ${maxFiniteArc.toFixed(4)}.`;
  if (Number.isFinite(largestNearest)) text += ` Largest nearest-critical ratio: ${largestNearest.toFixed(4)}.`;
  if (resolved < metrics.length) text += ` ${metrics.length - resolved} zero${metrics.length - resolved === 1 ? " is" : "s are"} unresolved.`;
  if (infinite) text += ` ${infinite} selected edge${infinite === 1 ? " crosses" : "s cross"} ∞ and therefore has infinite Euclidean length in this chart.`;
  r5Summary.textContent = text;
};

// ---------- adaptive Newton-flow field lines ----------
// The exact separatrix graph remains the thick white skeleton. This layer is
// deliberately cheaper: sparse, low-opacity streamlines are recomputed at a
// reduced rate while dragging and refined once interaction stops.

const r7FieldCanvas = document.getElementById("fieldCanvas");
const r7FieldToggle = document.getElementById("fieldToggle");
const r7FieldState = {
  key: "",
  lines: [],
  lowTimestamp: 0
};

function r7ResizeFieldCanvas() {
  if (!r7FieldCanvas) return null;
  const width = Math.max(1, Math.floor(plot.clientWidth));
  const height = Math.max(1, Math.floor(plot.clientHeight));
  if (r7FieldCanvas.width !== width || r7FieldCanvas.height !== height) {
    r7FieldCanvas.width = width;
    r7FieldCanvas.height = height;
  }
  return {width, height};
}

function r7FieldKey(quality) {
  const coords = [...state.zeros, C(NaN, NaN), ...state.poles]
    .map(z => Number.isFinite(z.re) ? `${z.re.toFixed(5)},${z.im.toFixed(5)}` : "|")
    .join(";");
  return `${quality ? 1 : 0}|${state.view.cx.toFixed(5)},${state.view.cy.toFixed(5)},${state.view.half.toFixed(5)}|${coords}`;
}

function r7ViewportBounds(margin = .10) {
  const {w, h} = dims(plot);
  const den = Math.min(w, h);
  const halfX = state.view.half * w / den;
  const halfY = state.view.half * h / den;
  return {
    xmin: state.view.cx - halfX * (1 + margin),
    xmax: state.view.cx + halfX * (1 + margin),
    ymin: state.view.cy - halfY * (1 + margin),
    ymax: state.view.cy + halfY * (1 + margin)
  };
}

function r7InsideBounds(z, bounds) {
  return z.re >= bounds.xmin && z.re <= bounds.xmax &&
    z.im >= bounds.ymin && z.im <= bounds.ymax;
}

function r7NearestDistance(z, targets) {
  let nearest = Infinity;
  let index = -1;
  for (let i = 0; i < targets.length; i++) {
    const value = dist(z, targets[i]);
    if (value < nearest) {
      nearest = value;
      index = i;
    }
  }
  return {distance: nearest, index};
}

function r7TraceDirection(seed, down, cfg) {
  const pointsOut = [clone(seed)];
  const targets = down ? state.zeros : state.poles;
  let z = clone(seed);
  let lastCell = "";
  let repeatedCells = 0;

  for (let stepIndex = 0; stepIndex < cfg.maxSteps; stepIndex++) {
    const endpoint = r7NearestDistance(z, targets);
    if (stepIndex > 1 && endpoint.distance < cfg.hitRadius) {
      if (endpoint.index >= 0) pointsOut.push(clone(targets[endpoint.index]));
      break;
    }

    const saddle = r7NearestDistance(z, state.critical);
    if (stepIndex > 3 && saddle.distance < cfg.saddleRadius) break;

    let velocity = newtonVelocity(state.P, state.Q, state.D, z, down);
    if (!velocity) break;
    const speed = cabs(velocity);
    if (!(speed > 1e-16)) break;
    velocity = scale(velocity, 1 / speed);

    const featureDistance = Math.min(endpoint.distance, saddle.distance);
    const localStep = Number.isFinite(featureDistance)
      ? Math.max(cfg.step * .24, Math.min(cfg.step, featureDistance * .28))
      : cfg.step;

    const midpoint = add(z, scale(velocity, localStep * .5));
    let midpointVelocity = newtonVelocity(state.P, state.Q, state.D, midpoint, down);
    if (!midpointVelocity) break;
    const midpointSpeed = cabs(midpointVelocity);
    if (!(midpointSpeed > 1e-16)) break;
    midpointVelocity = scale(midpointVelocity, 1 / midpointSpeed);

    const next = add(z, scale(midpointVelocity, localStep));
    if (!finiteC(next)) break;
    z = next;
    if (stepIndex % cfg.storeEvery === 0) pointsOut.push(clone(z));

    if (!r7InsideBounds(z, cfg.bounds)) {
      pointsOut.push(clone(z));
      break;
    }

    if (stepIndex > 30 && dist(z, seed) < cfg.step * 1.2) break;

    const screen = toScreen(z);
    const cell = `${Math.floor(screen.x / cfg.loopCell)},${Math.floor(screen.y / cfg.loopCell)}`;
    if (cell === lastCell) repeatedCells++;
    else {
      lastCell = cell;
      repeatedCells = 0;
    }
    if (repeatedCells > 18) break;
  }

  return pointsOut;
}

function r7PolylineScreenLength(pointsIn) {
  let length = 0;
  for (let i = 1; i < pointsIn.length; i++) {
    const a = toScreen(pointsIn[i - 1]);
    const b = toScreen(pointsIn[i]);
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return length;
}

function r7BuildFieldSeeds(cfg) {
  const seeds = [];
  const pixelsPerUnit = Math.min(plot.clientWidth, plot.clientHeight) / (2 * state.view.half);
  const ringRadius = (cfg.quality ? 13 : 16) / pixelsPerUnit;

  if (state.poles.length) {
    const perPole = Math.max(4, Math.min(cfg.quality ? 10 : 6,
      Math.floor((cfg.lineCap * .55) / Math.max(1, state.poles.length))));
    for (let poleIndex = 0; poleIndex < state.poles.length; poleIndex++) {
      const pole = state.poles[poleIndex];
      for (let arm = 0; arm < perPole; arm++) {
        const phase = 2 * Math.PI * (arm + .31 * poleIndex) / perPole;
        seeds.push(add(pole, scale(expi(phase), ringRadius)));
      }
    }
  }

  const bounds = r7ViewportBounds(.02);
  const aspect = plot.clientWidth / Math.max(1, plot.clientHeight);
  const nx = cfg.quality ? 11 : 7;
  const ny = Math.max(5, Math.round(nx / Math.max(.55, aspect)));
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const jitterX = ((i * 37 + j * 17) % 11) / 11 - .5;
      const jitterY = ((i * 19 + j * 43) % 13) / 13 - .5;
      const x = bounds.xmin + (i + .5 + .22 * jitterX) / nx * (bounds.xmax - bounds.xmin);
      const y = bounds.ymin + (j + .5 + .22 * jitterY) / ny * (bounds.ymax - bounds.ymin);
      seeds.push(C(x, y));
    }
  }
  return seeds;
}

function r7ComputeFieldLines(quality) {
  const {w, h} = dims(plot);
  const degree = Math.max(2, state.degree || Math.max(state.zeros.length, state.poles.length));
  const pixelsPerUnit = Math.min(w, h) / (2 * state.view.half);
  const lineCap = quality
    ? Math.max(28, Math.min(72, 80 - 4 * degree))
    : Math.max(14, Math.min(32, 35 - degree));
  const maxSteps = quality
    ? Math.max(230, Math.min(560, 610 - 18 * degree))
    : Math.max(95, Math.min(220, 235 - 6 * degree));

  const cfg = {
    quality,
    lineCap,
    maxSteps,
    step: (quality ? 4.6 : 7.2) / pixelsPerUnit,
    hitRadius: (quality ? 5.2 : 7.5) / pixelsPerUnit,
    saddleRadius: (quality ? 3.2 : 5.0) / pixelsPerUnit,
    storeEvery: quality ? 1 : 2,
    loopCell: quality ? 7 : 11,
    bounds: r7ViewportBounds(.12)
  };

  const occupancyCell = quality ? 16 : 25;
  const occupied = new Set();
  const lines = [];

  for (const seed of r7BuildFieldSeeds(cfg)) {
    if (lines.length >= lineCap) break;
    if (!r7InsideBounds(seed, cfg.bounds)) continue;

    const endpointDistance = Math.min(
      r7NearestDistance(seed, state.zeros).distance,
      r7NearestDistance(seed, state.poles).distance,
      r7NearestDistance(seed, state.critical).distance
    );
    if (endpointDistance < cfg.hitRadius * 1.5) continue;

    const backward = r7TraceDirection(seed, false, cfg);
    const forward = r7TraceDirection(seed, true, cfg);
    const pointsCombined = backward.slice().reverse().concat(forward.slice(1));
    if (pointsCombined.length < 8 || r7PolylineScreenLength(pointsCombined) < 48) continue;

    const cells = [];
    let fresh = 0;
    for (let i = 0; i < pointsCombined.length; i += quality ? 3 : 2) {
      const p = toScreen(pointsCombined[i]);
      const key = `${Math.floor(p.x / occupancyCell)},${Math.floor(p.y / occupancyCell)}`;
      cells.push(key);
      if (!occupied.has(key)) fresh++;
    }
    const novelty = cells.length ? fresh / cells.length : 0;
    if (lines.length > 4 && novelty < (quality ? .38 : .48)) continue;

    for (const cell of cells) occupied.add(cell);
    lines.push(pointsCombined);
  }

  return lines;
}

function r7DrawArrow(ctx, pointsIn, fraction) {
  if (pointsIn.length < 4) return;
  const screen = pointsIn.map(toScreen);
  const lengths = [];
  let total = 0;
  for (let i = 1; i < screen.length; i++) {
    total += Math.hypot(screen[i].x - screen[i - 1].x, screen[i].y - screen[i - 1].y);
    lengths.push(total);
  }
  if (total < 50) return;
  const target = total * fraction;
  let index = lengths.findIndex(value => value >= target);
  if (index < 0) index = lengths.length - 1;
  const a = screen[index];
  const b = screen[index + 1];
  if (!a || !b) return;
  const dx = b.x - a.x, dy = b.y - a.y;
  const norm = Math.hypot(dx, dy);
  if (!(norm > 1e-6)) return;
  const ux = dx / norm, uy = dy / norm;
  const px = -uy, py = ux;
  const tipX = b.x, tipY = b.y;
  const backX = tipX - 5.2 * ux, backY = tipY - 5.2 * uy;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(backX + 2.2 * px, backY + 2.2 * py);
  ctx.lineTo(backX - 2.2 * px, backY - 2.2 * py);
  ctx.closePath();
  ctx.fill();
}

function r7PaintFieldLines(lines, quality) {
  const size = r7ResizeFieldCanvas();
  if (!size || !r7FieldCanvas) return;
  const ctx = r7FieldCanvas.getContext("2d");
  ctx.clearRect(0, 0, size.width, size.height);
  if (!r7FieldToggle?.checked) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = quality ? "rgba(142,181,202,.30)" : "rgba(142,181,202,.22)";
  ctx.fillStyle = quality ? "rgba(167,201,219,.48)" : "rgba(167,201,219,.30)";
  ctx.lineWidth = quality ? .95 : .75;

  for (const line of lines) {
    ctx.beginPath();
    line.forEach((z, index) => {
      const p = toScreen(z);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    if (quality) {
      r7DrawArrow(ctx, line, .43);
      if (r7PolylineScreenLength(line) > 260) r7DrawArrow(ctx, line, .72);
    }
  }
  ctx.restore();
}

function r7DrawFieldLines(quality) {
  const size = r7ResizeFieldCanvas();
  if (!size || !r7FieldCanvas) return;
  const ctx = r7FieldCanvas.getContext("2d");
  if (!r7FieldToggle?.checked) {
    ctx.clearRect(0, 0, size.width, size.height);
    return;
  }

  const now = performance.now();
  if (!quality && now - r7FieldState.lowTimestamp < 72) return;
  if (!quality) r7FieldState.lowTimestamp = now;

  const key = r7FieldKey(quality);
  if (key !== r7FieldState.key) {
    r7FieldState.lines = r7ComputeFieldLines(quality);
    r7FieldState.key = key;
  }
  r7PaintFieldLines(r7FieldState.lines, quality);
}

const r7BaseRender = render;
render = function(quality) {
  r7DrawFieldLines(quality);
  r7BaseRender(quality);
};

r7FieldToggle?.addEventListener("change", () => {
  r7FieldState.key = "";
  scheduleRender(true);
});

new ResizeObserver(() => {
  r7FieldState.key = "";
  scheduleRender(true);
}).observe(plot);

state.dataDirty = true;
scheduleRender(true);
