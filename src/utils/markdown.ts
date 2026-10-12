import { lucideIcons } from '../ui/icons';

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function renderMarkdown(md: string): string {
  if (!md) return '';

  const codeBlocks: string[] = [];
  let text = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const safeCode = escapeHtml(code.trimEnd());
    const langLabel = lang ? `<div class="gh-code-block-header"><span>${lang}</span><button class="gh-btn-icon gh-copy-code-btn" data-code="${encodeURIComponent(code.trimEnd())}" title="Copy code">${lucideIcons.copy}</button></div>` : `<div class="gh-code-block-header"><button class="gh-btn-icon gh-copy-code-btn" data-code="${encodeURIComponent(code.trimEnd())}" title="Copy code">${lucideIcons.copy}</button></div>`;
    const block = `
      <div class="gh-code-block-wrap">
        ${langLabel}
        <pre class="gh-code-block"><code>${safeCode}</code></pre>
      </div>
    `;
    codeBlocks.push(block);
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
  });

  const inlineCodes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_match, code) => {
    inlineCodes.push(`<code class="gh-inline-code">${escapeHtml(code)}</code>`);
    return `___INLINE_CODE_${inlineCodes.length - 1}___`;
  });

  const lines = text.split('\n');
  const outLines: string[] = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableRows: string[] = [];

  const closeList = () => {
    if (inUl) {
      outLines.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      outLines.push('</ol>');
      inOl = false;
    }
  };

  const flushTable = () => {
    if (!inTable) return;
    inTable = false;
    if (tableRows.length === 0) return;

    let tableHtml = '<div class="gh-table-wrap"><table class="gh-markdown-table">';
    const headerRow = tableRows[0];
    const headerCells = headerRow.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
    tableHtml += '<thead><tr>' + headerCells.map((c) => `<th>${parseInline(c)}</th>`).join('') + '</tr></thead>';

    const bodyRows = tableRows.slice(2);
    if (bodyRows.length > 0) {
      tableHtml += '<tbody>';
      for (const row of bodyRows) {
        const cells = row.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
        tableHtml += '<tr>' + cells.map((c) => `<td>${parseInline(c)}</td>`).join('') + '</tr>';
      }
      tableHtml += '</tbody>';
    }
    tableHtml += '</table></div>';
    outLines.push(tableHtml);
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeList();
      inTable = true;
      tableRows.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      closeList();
      const isChecked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
      const content = trimmed.substring(6);
      const checkIcon = isChecked
        ? `<span class="gh-custom-checkbox checked">${lucideIcons.check}</span>`
        : `<span class="gh-custom-checkbox"></span>`;
      outLines.push(`
        <div class="gh-task-item ${isChecked ? 'completed' : ''}">
          ${checkIcon}
          <span class="gh-task-text">${parseInline(content)}</span>
        </div>
      `);
      continue;
    }

    if (/^(\*|-|\+)\s+/.test(trimmed)) {
      if (inOl) {
        outLines.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        outLines.push('<ul class="gh-markdown-list">');
        inUl = true;
      }
      const itemContent = trimmed.replace(/^(\*|-|\+)\s+/, '');
      outLines.push(`<li>${parseInline(itemContent)}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (inUl) {
        outLines.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        outLines.push('<ol class="gh-markdown-list ordered">');
        inOl = true;
      }
      const itemContent = trimmed.replace(/^\d+\.\s+/, '');
      outLines.push(`<li>${parseInline(itemContent)}</li>`);
      continue;
    }

    closeList();

    if (/^######\s+(.*)/.test(trimmed)) {
      outLines.push(`<h6 class="gh-md-h6">${parseInline(trimmed.replace(/^######\s+/, ''))}</h6>`);
    } else if (/^#####\s+(.*)/.test(trimmed)) {
      outLines.push(`<h5 class="gh-md-h5">${parseInline(trimmed.replace(/^#####\s+/, ''))}</h5>`);
    } else if (/^####\s+(.*)/.test(trimmed)) {
      outLines.push(`<h4 class="gh-md-h4">${parseInline(trimmed.replace(/^####\s+/, ''))}</h4>`);
    } else if (/^###\s+(.*)/.test(trimmed)) {
      outLines.push(`<h3 class="gh-md-h3">${parseInline(trimmed.replace(/^###\s+/, ''))}</h3>`);
    } else if (/^##\s+(.*)/.test(trimmed)) {
      outLines.push(`<h2 class="gh-md-h2">${parseInline(trimmed.replace(/^##\s+/, ''))}</h2>`);
    } else if (/^#\s+(.*)/.test(trimmed)) {
      outLines.push(`<h1 class="gh-md-h1">${parseInline(trimmed.replace(/^#\s+/, ''))}</h1>`);
    } else if (/^>\s+(.*)/.test(trimmed)) {
      outLines.push(`<blockquote class="gh-md-quote">${parseInline(trimmed.replace(/^>\s+/, ''))}</blockquote>`);
    } else if (/^---$|^\*\*\*$|^___$/.test(trimmed)) {
      outLines.push('<hr class="gh-md-hr">');
    } else if (trimmed.length === 0) {
      outLines.push('');
    } else {
      outLines.push(`<p class="gh-md-p">${parseInline(trimmed)}</p>`);
    }
  }

  closeList();
  flushTable();

  let resultHtml = outLines.join('\n');

  resultHtml = resultHtml.replace(/___CODE_BLOCK_(\d+)___/g, (_m, idx) => {
    return codeBlocks[Number(idx)] || '';
  });

  resultHtml = resultHtml.replace(/___INLINE_CODE_(\d+)___/g, (_m, idx) => {
    return inlineCodes[Number(idx)] || '';
  });

  return resultHtml;
}

function parseInline(text: string): string {
  let s = text;

  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="gh-md-img" loading="lazy">`;
  });

  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="gh-md-link">${escapeHtml(label)} <span class="gh-link-ext">${lucideIcons.externalLink}</span></a>`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_]+)_/g, '<em>$1</em>');

  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return s;
}

export function attachMarkdownEventHandlers(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.gh-copy-code-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = decodeURIComponent(btn.dataset.code || '');
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(code);
        btn.classList.add('copied');
        btn.innerHTML = lucideIcons.check;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = lucideIcons.copy;
        }, 1800);
      }
    });
  });
}
