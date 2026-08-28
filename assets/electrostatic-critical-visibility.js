(() => {
  'use strict';

  const graphToggle = document.getElementById('ef-graph-toggle');
  const card = document.getElementById('ef-card');
  if (!graphToggle || !card) return;

  // Start with the graph genuinely off before the base renderer schedules its
  // first frame.  The graph is turned on automatically only after its theorem
  // has entered the exposition.
  graphToggle.checked = false;

  const style = document.createElement('style');
  style.id = 'ef-critical-visibility-style';
  style.textContent = `
    /* The base renderer rebuilds the SVG on every animated pencil frame.
       Hide graph-owned nodes by CSS in the same style calculation, rather
       than deleting them one animation frame later. */
    #ef-card:not(:has(#ef-graph-toggle:checked)) #ef-overlay .ef-graph,
    #ef-card:not(:has(#ef-graph-toggle:checked)) #ef-overlay .ef-critical,
    #ef-card:not(:has(#ef-graph-toggle:checked)) #ef-overlay .ef-selected-critical,
    #ef-card:not(:has(#ef-graph-toggle:checked)) #ef-overlay line[stroke="rgba(255,226,137,.98)"] {
      display: none !important;
    }
  `;
  document.head.append(style);

  let theorem = null;
  let autoEnabled = false;
  let userTouched = false;
  let queued = false;

  graphToggle.addEventListener('change', event => {
    if (event.isTrusted) userTouched = true;
  });

  function theoremIsActive() {
    if (!theorem) return false;
    return theorem.getBoundingClientRect().top <= window.innerHeight * 0.34;
  }

  function synchronize() {
    queued = false;
    theorem ||= document.getElementById('theorem-the-newton-graph-from-singular-pencil-members');
    if (!theoremIsActive() || autoEnabled || userTouched) return;

    autoEnabled = true;
    graphToggle.checked = true;
    graphToggle.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function queueSynchronize() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(synchronize);
  }

  window.addEventListener('electrostatic:markdown-rendered', queueSynchronize);
  window.addEventListener('electrostatic:typeset-complete', queueSynchronize);
  window.addEventListener('scroll', queueSynchronize, { passive: true });
  window.addEventListener('resize', queueSynchronize);
  requestAnimationFrame(queueSynchronize);
})();