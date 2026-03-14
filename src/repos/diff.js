import * as Diff from 'diff';

export async function showDiffViewer(filename, localContent, remoteContent) {
  return new Promise((resolve) => {
    const diff = Diff.diffLines(remoteContent || '', localContent || '');

    let leftLines = '';
    let rightLines = '';
    let leftNum = 1;
    let rightNum = 1;
    let additions = 0;
    let deletions = 0;

    diff.forEach((part) => {
      const lines = part.value.replace(/</g, '&lt;').replace(/>/g, '&gt;').split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      if (part.added) {
        additions += lines.length;
        lines.forEach(line => {
          leftLines += `<div class="gh-diff-row"><div class="gh-diff-num"></div><div class="gh-diff-empty"></div></div>`;
          rightLines += `<div class="gh-diff-row gh-diff-add-bg"><div class="gh-diff-num">${rightNum++}</div><div class="gh-diff-add">+ ${line}</div></div>`;
        });
      } else if (part.removed) {
        deletions += lines.length;
        lines.forEach(line => {
          leftLines += `<div class="gh-diff-row gh-diff-rem-bg"><div class="gh-diff-num">${leftNum++}</div><div class="gh-diff-rem">- ${line}</div></div>`;
          rightLines += `<div class="gh-diff-row"><div class="gh-diff-num"></div><div class="gh-diff-empty"></div></div>`;
        });
      } else {
        lines.forEach(line => {
          leftLines += `<div class="gh-diff-row"><div class="gh-diff-num">${leftNum++}</div><div class="gh-diff-line">  ${line}</div></div>`;
          rightLines += `<div class="gh-diff-row"><div class="gh-diff-num">${rightNum++}</div><div class="gh-diff-line">  ${line}</div></div>`;
        });
      }
    });

    const ext = filename.split('.').pop();
    const overlay = document.createElement('div');
    overlay.id = 'gh-diff-overlay';

    overlay.innerHTML = `
      <div class="gh-diff-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="gh-diff-close">← Back</div>
          <span style="font-weight: 600; color: var(--gh-text); font-size: 15px;">Diff: ${filename}</span>
          <span class="gh-diff-stats">
            <span style="color: #3fb950;">+${additions}</span>
            <span style="color: #f85149;">-${deletions}</span>
          </span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="gh-diff-merge" class="gh-btn gh-btn-secondary">Manual Merge</button>
          <button id="gh-diff-accept-remote" class="gh-btn gh-btn-danger">Accept Remote</button>
          <button id="gh-diff-accept-local" class="gh-btn gh-btn-success">Accept Local</button>
        </div>
      </div>
      <div class="gh-diff-split-view language-${ext}">
        <div class="gh-diff-pane">
          <div class="gh-diff-pane-title">Remote (GitHub)</div>
          <div class="gh-diff-code">${leftLines}</div>
        </div>
        <div class="gh-diff-pane">
          <div class="gh-diff-pane-title">Local (Device)</div>
          <div class="gh-diff-code">${rightLines}</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (choice) => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      resolve(choice);
    };

    overlay.querySelector('#gh-diff-close').onclick = () => cleanup(null);
    overlay.querySelector('#gh-diff-accept-remote').onclick = () => cleanup('remote');
    overlay.querySelector('#gh-diff-accept-local').onclick = () => cleanup('local');
    overlay.querySelector('#gh-diff-merge').onclick = () => cleanup('merge');
  });
}
