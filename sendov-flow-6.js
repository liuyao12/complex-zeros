"use strict";

// Interaction and graph refinements:
//  * c snaps to a critical value only after a deliberate one-second dwell;
//  * a multiple root wins pointer hit-testing over its coincident critical point;
//  * the complete descending Newton graph remains visible, with measured
//    branches rendered most prominently by CSS.

const C_SNAP_ENTER_RADIUS = 9;
const C_SNAP_RELEASE_RADIUS = 14;
const C_SNAP_DWELL_MS = 1000;

state.cSnapValue = null;
state.cSnapPending = null;
state.cSnapPointer = null;

function cSnapCandidateAt(x, y, radius = C_SNAP_ENTER_RADIUS) {
  const g = compactWidgetGeometry();
  const values = criticalValues();
  const s = compactValueScale(values);
  let best = null;
  let bestDistance = radius;
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

function clearCSnapPending(render = true) {
  if (state.cSnapPending?.timer) clearTimeout(state.cSnapPending.timer);
  state.cSnapPending = null;
  if (render) scheduleRender(false);
}

function clearCSnapState(render = true) {
  state.cSnapValue = null;
  state.cSnapPointer = null;
  clearCSnapPending(render);
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

function updatePendingRing() {
  const pending = state.cSnapPending;
  if (!pending) return;
  const ring = document.getElementById('cSnapPendingRing');
  if (ring) {
    const progress = Math.max(0, Math.min(1,
      (performance.now() - pending.startedAt) / C_SNAP_DWELL_MS));
    const circumference = 2 * Math.PI * 11.5;
    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${circumference * (1 - progress)}`;
  }
  if (state.cSnapPending === pending) requestAnimationFrame(updatePendingRing);
}

function completePendingCSnap(pending) {
  if (state.cSnapPending !== pending) return;
  if (!state.dragging || state.dragging.kind !== 'c' || !state.cSnapPointer) {
    clearCSnapPending(false);
    return;
  }

  const candidate = cSnapCandidateAt(
    state.cSnapPointer.x,
    state.cSnapPointer.y,
    C_SNAP_ENTER_RADIUS
  );
  if (!candidate || !sameValue(candidate.value, pending.value)) {
    clearCSnapPending(true);
    return;
  }

  state.cSnapPending = null;
  state.cSnapValue = cloneC(pending.value);
  setC(pending.value);
  enforceCriticalFiber(pending.value);
  scheduleRender(false);
}

function armCSnap(candidate) {
  if (state.cSnapPending && sameValue(state.cSnapPending.value, candidate.value)) {
    return;
  }
  clearCSnapPending(false);
  const pending = {
    index: candidate.index,
    value: cloneC(candidate.value),
    startedAt: performance.now(),
    timer: null
  };
  pending.timer = setTimeout(() => completePendingCSnap(pending), C_SNAP_DWELL_MS);
  state.cSnapPending = pending;
  scheduleRender(false);
  requestAnimationFrame(updatePendingRing);
}

function dwellSnapCFromEvent(e) {
  if (!state.dragging || state.dragging.kind !== 'c') return;
  const p = rawEvtPoint(e, cControl);
  state.cSnapPointer = p;

  // Once snapped, keep c locked while the pointer remains in a slightly larger
  // release neighborhood. Moving clearly away releases it immediately.
  if (state.cSnapValue) {
    const held = cSnapCandidateAt(p.x, p.y, C_SNAP_RELEASE_RADIUS);
    if (held && sameValue(held.value, state.cSnapValue)) {
      setC(state.cSnapValue);
      enforceCriticalFiber(state.cSnapValue);
      scheduleRender(false);
      return;
    }
    state.cSnapValue = null;
  }

  const candidate = cSnapCandidateAt(p.x, p.y, C_SNAP_ENTER_RADIUS);
  if (!candidate) {
    clearCSnapPending(true);
    return;
  }
  armCSnap(candidate);
}

// The existing c-control handler performs the unconstrained move first. These
// later listeners watch whether the pointer remains very close to one orange
// critical value for a full second before locking c to it.
cSvg.addEventListener('pointerdown', dwellSnapCFromEvent);
window.addEventListener('pointermove', dwellSnapCFromEvent);
window.addEventListener('pointerup', () => clearCSnapPending(false));
window.addEventListener('pointercancel', () => clearCSnapPending(false));

const baseStartDragWithSeparateC = startDrag;
startDrag = function(e, kind, index) {
  if (kind !== 'c') clearCSnapState(false);
  baseStartDragWithSeparateC(e, kind, index);
};

const baseDrawCompactValueControlWithNodes = drawCompactValueControl;
drawCompactValueControl = function() {
  baseDrawCompactValueControlWithNodes();
  const values = criticalValues();
  const g = compactWidgetGeometry();
  const s = compactValueScale(values);

  if (state.cSnapPending) {
    for (const value of values) {
      if (!sameValue(value, state.cSnapPending.value)) continue;
      const p = compactToScreen(value, s, g);
      cSvg.appendChild(svgEl('circle', {
        id: 'cSnapPendingRing',
        cx: p.x, cy: p.y, r: 11.5,
        transform: `rotate(-90 ${p.x} ${p.y})`,
        class: 'c-snap-pending'
      }));
    }
    requestAnimationFrame(updatePendingRing);
  }

  if (!state.cSnapValue) return;
  const stillValid = values.some(value => sameValue(value, state.cSnapValue));
  if (!stillValid) {
    state.cSnapValue = null;
    return;
  }
  for (const value of values) {
    if (!sameValue(value, state.cSnapValue)) continue;
    const p = compactToScreen(value, s, g);
    cSvg.appendChild(svgEl('circle', {
      cx: p.x, cy: p.y, r: 11.5, class: 'c-snap-ring'
    }));
  }
};

// Resetting or randomizing changes the critical values, so any old snap or
// pending dwell must be discarded.
for (const id of ['resetBtn', 'randomBtn', 'degreeSelect']) {
  document.getElementById(id)?.addEventListener('change', () => clearCSnapState(false));
  document.getElementById(id)?.addEventListener('click', () => clearCSnapState(false));
}

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
