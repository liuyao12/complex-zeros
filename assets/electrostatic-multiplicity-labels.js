(() => {
  'use strict';

  const overlay = document.getElementById('ef-overlay');
  if (!overlay) return;

  const NS = 'http://www.w3.org/2000/svg';
  let queued = false;
  let updating = false;

  const style = document.createElement('style');
  style.id = 'ef-multiplicity-label-styles';
  style.textContent = `
    #ef-overlay .ef-charge-sign { display: none !important; }
    #ef-overlay .ef-multiplicity-label {
      fill: #06131d;
      font: 900 10px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
      text-anchor: middle;
      dominant-baseline: central;
      pointer-events: none;
      user-select: none;
      paint-order: stroke;
      stroke: rgba(255,255,255,.22);
      stroke-width: .75px;
      vector-effect: non-scaling-stroke;
    }
    #ef-overlay .ef-multiplicity-label.is-multiple {
      font-size: 8.5px;
      letter-spacing: -.04em;
    }
  `;
  document.head.append(style);

  function centerOf(node) {
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

  function grouped(nodes) {
    const groups = [];
    for (const node of nodes) {
      const center = centerOf(node);
      if (!center) continue;
      let group = groups.find(item => Math.hypot(item.center.x - center.x, item.center.y - center.y) < .65);
      if (!group) {
        group = { center, nodes: [] };
        groups.push(group);
      }
      group.nodes.push(node);
    }
    return groups;
  }

  function makeLabel(x, y, text, multiple) {
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', x);
    label.setAttribute('y', y + .35);
    label.setAttribute('class', `ef-multiplicity-label${multiple ? ' is-multiple' : ''}`);
    label.setAttribute('aria-hidden', 'true');
    label.textContent = text;
    return label;
  }

  function update() {
    queued = false;
    if (updating) return;
    updating = true;
    try {
      for (const label of overlay.querySelectorAll('.ef-multiplicity-label')) label.remove();
      for (const node of overlay.querySelectorAll('.ef-zero,.ef-pole')) node.style.removeProperty('display');

      const configurations = [
        { selector: '.ef-zero', sign: '+' },
        { selector: '.ef-pole', sign: '−' }
      ];

      for (const configuration of configurations) {
        const groups = grouped([...overlay.querySelectorAll(configuration.selector)]);
        for (const group of groups) {
          const multiplicity = group.nodes.length;
          group.nodes.slice(1).forEach(node => { node.style.display = 'none'; });
          const text = multiplicity > 1 ? `${configuration.sign}${multiplicity}` : configuration.sign;
          overlay.append(makeLabel(group.center.x, group.center.y, text, multiplicity > 1));

          const title = group.nodes[0].querySelector('title');
          if (title && multiplicity > 1) {
            title.textContent = `${configuration.sign === '+' ? 'positive' : 'negative'} planar charge of multiplicity ${multiplicity}`;
          }
        }
      }
    } finally {
      updating = false;
    }
  }

  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  new MutationObserver(mutations => {
    if (updating) return;
    const external = mutations.some(mutation =>
      [...mutation.addedNodes, ...mutation.removedNodes].some(node =>
        !(node.nodeType === 1 && node.classList?.contains('ef-multiplicity-label'))
      )
    );
    if (external) queueUpdate();
  }).observe(overlay, { childList: true, subtree: false });

  queueUpdate();
})();
