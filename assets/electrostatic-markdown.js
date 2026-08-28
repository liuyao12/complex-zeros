(() => {
  const script = document.currentScript;
  const markdownPath = script?.dataset?.markdown || 'docs/electrostatic-field-lines.md';

  const stageRules = [
    { test: text => /^Two points with opposite signs/i.test(text), preset: 'dipole' },
    { test: text => /^Two points with like signs/i.test(text), preset: 'like' },
    { test: text => /^Two weighted charges:/i.test(text), preset: 'weighted' },
    { test: text => /^Three positive charges:/i.test(text), preset: 'cubic' },
    { test: text => /^Three signed points:/i.test(text), preset: 'mixed' }
  ];

  const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const inlineMarkdown = source => {
    let text = escapeHtml(source);
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${escapeHtml(href)}">${label}</a>`);
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    text = text.replace(/\$([^$\n]+)\$/g, (_, expr) => `\\(${expr.trim()}\\)`);
    return text;
  };

  const slugify = text => text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  function renderMarkdown(markdown) {
    const body = markdown.replace(/^<!--([\s\S]*?)-->\s*/, '').trim();
    const lines = body.split(/\r?\n/);
    const nodes = [];
    const usedIds = new Map();
    let i = 0;

    const headingId = text => {
      const base = slugify(text) || 'section';
      const count = usedIds.get(base) || 0;
      usedIds.set(base, count + 1);
      return count ? `${base}-${count + 1}` : base;
    };

    const pushParagraph = collected => {
      const text = collected.join(' ').trim();
      if (!text) return;
      const p = document.createElement('p');
      p.innerHTML = inlineMarkdown(text);
      nodes.push(p);
    };

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i += 1; continue; }
      if (/^#\s+/.test(line)) { i += 1; continue; }
      if (/^##\s+/.test(line)) {
        const text = line.replace(/^##\s+/, '').trim();
        const h2 = document.createElement('h2');
        h2.id = headingId(text);
        h2.innerHTML = inlineMarkdown(text);
        const rule = stageRules.find(item => item.test(text));
        if (rule) h2.dataset.demoPreset = rule.preset;
        nodes.push(h2); i += 1; continue;
      }
      if (/^###\s+/.test(line)) {
        const text = line.replace(/^###\s+/, '').trim();
        const h3 = document.createElement('h3');
        h3.id = headingId(text);
        h3.innerHTML = inlineMarkdown(text);
        nodes.push(h3); i += 1; continue;
      }
      if (/^\$\$\s*$/.test(line)) {
        i += 1;
        const math = [];
        while (i < lines.length && !/^\$\$\s*$/.test(lines[i])) { math.push(lines[i]); i += 1; }
        i += 1;
        const div = document.createElement('div');
        div.className = 'math-display';
        div.textContent = `\\[${math.join('\n').trim()}\\]`;
        nodes.push(div); continue;
      }
      if (/^>\s?/.test(line)) {
        const quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1; }
        const blockquote = document.createElement('blockquote');
        const p = document.createElement('p');
        p.innerHTML = inlineMarkdown(quote.join(' '));
        blockquote.append(p); nodes.push(blockquote); continue;
      }
      if (/^[-*]\s+/.test(line)) {
        const ul = document.createElement('ul');
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
          const li = document.createElement('li');
          li.innerHTML = inlineMarkdown(lines[i].replace(/^[-*]\s+/, ''));
          ul.append(li); i += 1;
        }
        nodes.push(ul); continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        const ol = document.createElement('ol');
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          const li = document.createElement('li');
          li.innerHTML = inlineMarkdown(lines[i].replace(/^\d+\.\s+/, ''));
          ol.append(li); i += 1;
        }
        nodes.push(ol); continue;
      }

      const paragraph = [];
      while (i < lines.length && lines[i].trim() &&
        !/^#{1,3}\s+/.test(lines[i]) && !/^\$\$\s*$/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) && !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i])) {
        paragraph.push(lines[i].trim()); i += 1;
      }
      pushParagraph(paragraph);
    }
    return nodes;
  }

  async function loadArticle() {
    const article = document.querySelector('.article-content');
    if (!article) return;
    try {
      const response = await fetch(markdownPath, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const markdown = await response.text();
      const demo = article.querySelector('.floating-demo');
      const rendered = renderMarkdown(markdown);
      const firstIllustratedSection = rendered.findIndex(node => node.dataset?.demoPreset);
      if (demo) rendered.splice(firstIllustratedSection >= 0 ? firstIllustratedSection : 2, 0, demo);
      article.replaceChildren(...rendered);
      window.dispatchEvent(new CustomEvent('electrostatic:markdown-rendered'));
      if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise([article]).then(() => {
          window.dispatchEvent(new CustomEvent('electrostatic:typeset-complete'));
        });
      }
    } catch (error) {
      console.warn(`Could not load ${markdownPath}`, error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadArticle, { once: true });
  else loadArticle();
})();
