(() => {
  'use strict';

  function wirePausedMarkClicks() {
    const marks = document.querySelector('.ef-dial-marks');
    const toggle = document.querySelector('.ef-animation-toggle');
    if (!marks || !toggle || marks.dataset.pauseGuard === 'true') return;
    marks.dataset.pauseGuard = 'true';
    marks.addEventListener('pointerdown', event => {
      if (toggle.getAttribute('aria-pressed') !== 'true') return;
      // Keep the hidden native range focused: the underlying animation loop
      // uses that focus state as its persistent pause signal.
      event.preventDefault();
    }, true);
  }

  function rewriteControlCopy() {
    for (const paragraph of document.querySelectorAll('.article-content p')) {
      const text = paragraph.textContent || '';
      if (!text.includes('angle slider') && !text.includes('Jump to a singular member')) continue;
      paragraph.innerHTML = paragraph.innerHTML
        .replace(
          /The angle slider selects one member of the pencil; <strong>Jump to a singular member<\/strong> chooses a member through an equilibrium point\./,
          'The circular \\(\\mathbb{RP}^1\\) dial selects one member of the pencil. Numbered orange marks select singular members through the equilibrium points, and <strong>Animate/Pause</strong> controls the loop.'
        )
        .replace(
          /The angle slider selects one member of the pencil\. Numbered orange marks on the slider are the singular members through the equilibrium points\./,
          'The circular \\(\\mathbb{RP}^1\\) dial selects one member of the pencil. Numbered orange marks select singular members through the equilibrium points, and <strong>Animate/Pause</strong> controls the loop.'
        );
    }
  }

  window.addEventListener('electrostatic:markdown-rendered', () => {
    rewriteControlCopy();
    wirePausedMarkClicks();
  });
  window.addEventListener('electrostatic:typeset-complete', wirePausedMarkClicks);
  requestAnimationFrame(wirePausedMarkClicks);
})();