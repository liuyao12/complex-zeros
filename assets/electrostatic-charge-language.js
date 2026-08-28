(() => {
  'use strict';

  const status = document.getElementById('ef-status');
  const overlay = document.getElementById('ef-overlay');

  function translateStatus() {
    if (!status) return;
    let text = status.textContent || '';
    text = text
      .replace(/^one zero and one pole\./, 'opposite unit charges.')
      .replace(/^two like charges \/ two zeros\./, 'two like unit charges.')
      .replace(/^one \+2 charge and one -1 charge: a cubic pencil\./, 'one +2 charge and one −1 charge: a cubic pencil.')
      .replace(/^three zeros: a cubic pencil\./, 'three positive unit charges: a cubic pencil.')
      .replace(/^two zeros and one pole\./, 'two positive and one negative unit charge.')
      .replace(/finite critical point/g, 'finite equilibrium point');
    if (text !== status.textContent) status.textContent = text;
  }

  const titleLanguage = new Map([
    ['zero / positive Bôcher charge', 'positive planar charge'],
    ['pole / negative Bôcher charge', 'negative planar charge'],
    ['critical point: click for its singular pencil member', 'equilibrium point: click for its singular pencil member']
  ]);

  function translateTitles() {
    if (!overlay) return;
    for (const title of overlay.querySelectorAll('title')) {
      const replacement = titleLanguage.get(title.textContent);
      if (replacement) title.textContent = replacement;
    }
  }

  translateStatus();
  translateTitles();

  if (status) {
    new MutationObserver(translateStatus).observe(status, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
  if (overlay) {
    new MutationObserver(translateTitles).observe(overlay, {
      childList: true,
      subtree: true
    });
  }
})();
