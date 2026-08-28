(() => {
  'use strict';

  const overlay = document.getElementById('ef-overlay');
  const stage = document.getElementById('ef-stage');
  if (!overlay || !stage) return;

  const NS = 'http://www.w3.org/2000/svg';
  let queued = false;
  let refining = false;

  function svgNode(name, attributes = {}) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  function installStyles() {
    if (document.getElementById('ef-charge-vector-refinement-styles')) return;
    const style = document.createElement('style');
    style.id = 'ef-charge-vector-refinement-styles';
    style.textContent = `
      .charge-glyph.negative {
        border-radius: 50% !important;
        transform: none !important;
      }
      .charge-glyph.negative > span {
        transform: none !important;
      }
      .ef-charge-sign {
        fill: #06131d;
        font: 900 11px/1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        text-anchor: middle;
        dominant-baseline: central;
        pointer-events: none;
        user-select: none;
        paint-order: stroke;
        stroke: rgba(255,255,255,.18);
        stroke-width: .7px;
        vector-effect: non-scaling-stroke;
      }
      .ef-force-label {
        display: none !important;
      }
      .ef-force-parallelogram {
        fill: none;
        stroke: rgba(235,245,250,.67);
        stroke-width: 1.55;
        stroke-dasharray: 5 4;
        stroke-linecap: round;
        vector-effect: non-scaling-stroke;
        pointer-events: none;
      }
    `;
    document.head.append(style);
  }

  function centerOf(node) {
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

  function circlePath(cx, cy, radius) {
    return [
      `M ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
      'Z'
    ].join(' ');
  }

  function refineChargeNodes() {
    for (const old of overlay.querySelectorAll('.ef-charge-sign')) old.remove();

    const charges = [
      ...[...overlay.querySelectorAll('.ef-zero')].map(node => ({ node, sign: '+' })),
      ...[...overlay.querySelectorAll('.ef-pole')].map(node => ({ node, sign: '−' }))
    ];

    for (const charge of charges) {
      const center = centerOf(charge.node);
      if (!center) continue;

      if (charge.sign === '−' && charge.node.tagName.toLowerCase() === 'path') {
        charge.node.setAttribute('d', circlePath(center.x, center.y, 7.3));
      }

      const sign = svgNode('text', {
        x: center.x,
        y: center.y + .35,
        class: 'ef-charge-sign',
        'aria-hidden': 'true'
      });
      sign.textContent = charge.sign;
      overlay.append(sign);
    }
  }

  function fixedSizeArrowheads(group) {
    for (const marker of group.querySelectorAll('marker')) {
      marker.setAttribute('markerUnits', 'userSpaceOnUse');
      marker.setAttribute('markerWidth', '8');
      marker.setAttribute('markerHeight', '8');
      marker.setAttribute('refX', '8.35');
      marker.setAttribute('refY', '5');
    }
  }

  function chargeRecords() {
    return [
      ...[...overlay.querySelectorAll('.ef-zero')].map(node => ({ q: 1, center: centerOf(node) })),
      ...[...overlay.querySelectorAll('.ef-pole')].map(node => ({ q: -1, center: centerOf(node) }))
    ].filter(record => record.center);
  }

  function setLine(line, start, vector, scaleFactor) {
    line.setAttribute('x1', start.x);
    line.setAttribute('y1', start.y);
    line.setAttribute('x2', start.x + scaleFactor * vector.x);
    line.setAttribute('y2', start.y + scaleFactor * vector.y);
  }

  function rescaleForceVectors(group) {
    for (const label of group.querySelectorAll('.ef-force-label')) label.remove();

    const components = [...group.querySelectorAll('.ef-force-component')];
    const totalLine = group.querySelector('.ef-force-total');
    const probe = centerOf(group.querySelector('.ef-force-point'));
    const charges = chargeRecords();
    if (!probe || !totalLine || components.length !== charges.length || !components.length) return;

    const canvasScale = Math.max(1, Math.min(stage.clientWidth, stage.clientHeight));
    const scaleFactor = 0.016 * canvasScale * canvasScale;

    const total = { x: 0, y: 0 };
    charges.forEach((charge, index) => {
      const dx = probe.x - charge.center.x;
      const dy = probe.y - charge.center.y;
      const d2 = dx * dx + dy * dy;
      if (!(d2 > 1e-12)) return;

      const vector = {
        x: charge.q * dx / d2,
        y: charge.q * dy / d2
      };
      total.x += vector.x;
      total.y += vector.y;
      setLine(components[index], probe, vector, scaleFactor);
    });

    setLine(totalLine, probe, total, scaleFactor);
  }

  function addParallelogram(group) {
    group.querySelector('.ef-force-parallelogram-layer')?.remove();

    const components = [...group.querySelectorAll('.ef-force-component')];
    const total = group.querySelector('.ef-force-total');
    if (components.length !== 2 || !total) return;

    const endpoint = line => ({
      x: +line.getAttribute('x2'),
      y: +line.getAttribute('y2')
    });
    const end1 = endpoint(components[0]);
    const end2 = endpoint(components[1]);
    const totalEnd = endpoint(total);
    if (![end1.x, end1.y, end2.x, end2.y, totalEnd.x, totalEnd.y].every(Number.isFinite)) return;

    const layer = svgNode('g', { class: 'ef-force-parallelogram-layer' });
    layer.append(
      svgNode('line', {
        x1: end1.x,
        y1: end1.y,
        x2: totalEnd.x,
        y2: totalEnd.y,
        class: 'ef-force-parallelogram'
      }),
      svgNode('line', {
        x1: end2.x,
        y1: end2.y,
        x2: totalEnd.x,
        y2: totalEnd.y,
        class: 'ef-force-parallelogram'
      })
    );

    const firstArrow = group.querySelector('.ef-force-component,.ef-force-total');
    group.insertBefore(layer, firstArrow || null);
  }

  function refineForceConstruction() {
    const group = overlay.querySelector('.ef-force-construction');
    if (!group) return;

    fixedSizeArrowheads(group);
    rescaleForceVectors(group);
    addParallelogram(group);
  }

  function refine() {
    if (refining) return;
    refining = true;
    try {
      refineChargeNodes();
      refineForceConstruction();
    } finally {
      refining = false;
      queued = false;
    }
  }

  function queueRefine() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refine);
  }

  const owned = node => node?.nodeType === 1 && (
    node.matches?.('.ef-charge-sign,.ef-multiplicity-label,.ef-force-parallelogram-layer') ||
    node.closest?.('.ef-force-parallelogram-layer')
  );

  new MutationObserver(mutations => {
    const externalChange = mutations.some(mutation =>
      [...mutation.addedNodes, ...mutation.removedNodes].some(node => !owned(node))
    );
    if (externalChange) refine();
  }).observe(overlay, { childList: true, subtree: true });

  new ResizeObserver(queueRefine).observe(stage);

  installStyles();
  queueRefine();
})();