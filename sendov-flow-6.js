"use strict";

// Interaction and graph refinements:
//  * snap c to critical values in the compactified value control;
//  * make a multiple root win pointer hit-testing over its coincident critical point;
//  * retain the complete descending Newton graph, with the measured branches
//    rendered most prominently by CSS.

state.cSnapValue = null;

function cSnapCandidateAt(x, y) {
  const g = compactWidgetGeometry();
  const values = criticalValues();
  const s = compactValueScale(values);
  let best = null;
  let bestDistance = 15;
  for (let i = 0; i < values.length; i++) {
    const p = compactToScreen(values[i], s, g);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = {index: i, value: values[i], distance: d};
    }
  }
  return best;
}

function sameValue(a, b) {
  return dist(a, b) <= 2e-8 * (1 + abs(a) + abs(b));
}

// When c equals a critical value, the corresponding point of W is genuinely
// a multiple root. The polynomial P is already exact; this only puts the
// numerically solved copies of that root exactly on the mathematical point and
// records them as a draggable stack.
function enforceCriticalFiber(value) {
  const values = criticalValues();
  const disk = smallestEnclosingCircle(state.Z);
  const spatialTol = Math.max(1e-8, disk.radius * 2e-7);
  const sites = [];

  for (let i = 0; i < state.W.length; i++) {
    if (!sameValue(values[i], value)) continue;
    const w = state.W[i];
    let site = sites.find(q => dist(q.w, w) <= spatialTol);
    if (!site) {
      site = {w: cloneC(w), derivativeMultiplicity: 0};
      sites.push(site);
    }
    site.derivativeMultiplicity++;
  }

  if (!sites.length) return;
  state.zGroups = singletonGroups(state.Z.length);
  const unused = new Set(state.Z.map((_, i) => i));
  let groupId = freshGroupId(state.zGroups);

  for (const site of sites) {
    const multiplicity = site.derivativeMultiplicity + 1;
    const chosen = [...unused]
      .sort((i, j) => dist(state.Z[i], site.w) - dist(state.Z[j], site.w))
      .slice(0, multiplicity);
    for (const i of chosen) {
      unused.delete(i);
      state.Z[i] = cloneC(site.w);
      state.zGroups[i] = groupId;
    }
    groupId++;
  }
}

function snapCFromEvent(e) {
  if (!state.dragging || state.dragging.kind !== 'c') return;
  const p = rawEvtPoint(e, cControl);
  const candidate = cSnapCandidateAt(p.x, p.y);
  if (!candidate) {
    state.cSnapValue = null;
    return;
  }
  state.cSnapValue = cloneC(candidate.value);
  setC(candidate.value);
  enforceCriticalFiber(candidate.value);
  scheduleRender(false);
}

// The existing c-control handler performs the unconstrained move first. These
// later listeners apply the snap, so leaving the snap radius immediately
// returns to ordinary free motion.
cSvg.addEventListener('pointerdown', snapCFromEvent);
window.addEventListener('pointermove', snapCFromEvent);

const baseStartDragWithSeparateC = startDrag;
startDrag = function(e, kind, index) {
  if (kind !== 'c') state.cSnapValue = null;
  baseStartDragWithSeparateC(e, kind, index);
};

const baseDrawCompactValueControlWithNodes = drawCompactValueControl;
drawCompactValueControl = function() {
  baseDrawCompactValueControlWithNodes();
  const values = criticalValues();
  let snapped = state.cSnapValue;
  if (!snapped || !sameValue(state.c, snapped)) {
    snapped = values.find(v => sameValue(v, state.c)) || null;
  }
  if (!snapped) return;

  const g = compactWidgetGeometry();
  const s = compactValueScale(values);
  for (const value of values) {
    if (!sameValue(value, snapped)) continue;
    const p = compactToScreen(value, s, g);
    cSvg.appendChild(svgEl('circle', {
      cx: p.x, cy: p.y, r: 11.5, class: 'c-snap-ring'
    }));
  }
};

// The renderer originally painted W after Z. At a multiple root this made the
// coincident critical point intercept the pointer. Moving root nodes to the
// end of the SVG keeps a snapped root stack draggable until it is clicked to
// split, exactly as its visual stacking suggests.
const baseRenderZWithCriticalLemniscates = renderZ;
renderZ = function(full = true) {
  baseRenderZWithCriticalLemniscates(full);
  for (const node of [...zSvg.querySelectorAll('.root-node')]) {
    zSvg.appendChild(node);
  }
};

scheduleRender(true);
