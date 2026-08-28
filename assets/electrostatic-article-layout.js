(() => {
  'use strict';

  const article = document.querySelector('.article-content');
  const floatingDemo = document.querySelector('.floating-demo');
  const card = document.getElementById('ef-card');
  const presetSelect = document.getElementById('ef-preset');
  const tabs = [...document.querySelectorAll('[data-ef-preset-tab]')];
  const mobileQuery = window.matchMedia('(max-width: 940px)');
  let wrapQueued = false;
  let tabQueued = false;
  let targets = [];

  function syncTabs() {
    if (!presetSelect) return;
    const value = presetSelect.value;
    for (const tab of tabs) {
      const active = tab.dataset.efPresetTab === value;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    }
  }

  function queueTabSync() {
    if (tabQueued) return;
    tabQueued = true;
    requestAnimationFrame(() => {
      tabQueued = false;
      syncTabs();
    });
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      if (!presetSelect) return;
      presetSelect.value = tab.dataset.efPresetTab;
      presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
      queueTabSync();
    });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = Math.max(0, tabs.indexOf(tab));
      let next = current;
      if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      tabs[next]?.focus();
      tabs[next]?.click();
    });
  }

  function collectTargets() {
    if (!article) return;
    targets = [...article.children].filter(node =>
      node !== floatingDemo && !node.classList.contains('floating-demo')
    );
  }

  function clearWrap() {
    for (const node of targets) node.style.removeProperty('max-width');
  }

  function updateWrap() {
    wrapQueued = false;
    if (!article || !floatingDemo || !card) return;
    if (mobileQuery.matches) {
      clearWrap();
      return;
    }

    const articleRect = article.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const available = Math.floor(cardRect.left - articleRect.left - 30);
    if (available < 300 || cardRect.bottom <= 0 || cardRect.top >= window.innerHeight) {
      clearWrap();
      return;
    }

    const overlapTop = cardRect.top + 4;
    const overlapBottom = cardRect.bottom - 4;
    for (const node of targets) {
      const rect = node.getBoundingClientRect();
      const overlaps = rect.bottom > overlapTop && rect.top < overlapBottom;
      if (overlaps) node.style.maxWidth = `${available}px`;
      else node.style.removeProperty('max-width');
    }
  }

  function queueWrap() {
    if (wrapQueued) return;
    wrapQueued = true;
    requestAnimationFrame(updateWrap);
  }

  function articleReady() {
    collectTargets();
    queueTabSync();
    queueWrap();
    setTimeout(queueWrap, 80);
    setTimeout(queueWrap, 350);
  }

  window.addEventListener('electrostatic:markdown-rendered', articleReady);
  window.addEventListener('electrostatic:typeset-complete', articleReady);
  window.addEventListener('scroll', () => {
    queueTabSync();
    queueWrap();
  }, { passive: true });
  window.addEventListener('resize', queueWrap);
  window.addEventListener('pointermove', queueWrap, { passive: true });
  mobileQuery.addEventListener?.('change', queueWrap);
  presetSelect?.addEventListener('change', queueTabSync);

  if (article && card) {
    new ResizeObserver(queueWrap).observe(card);
    new ResizeObserver(queueWrap).observe(article);
  }

  // The exposition begins with the two-point dipole example. The main
  // interactive initializes itself before this companion script runs.
  requestAnimationFrame(() => {
    if (presetSelect && presetSelect.value !== 'dipole') {
      presetSelect.value = 'dipole';
      presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    queueTabSync();
    queueWrap();
  });
})();
