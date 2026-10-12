import * as Diff from 'diff';
import type { DiffChoice } from '../types/plugin';
import { lucideIcons } from './icons';

export async function showDiffViewer(
  filename: string,
  localContent: string,
  remoteContent: string
): Promise<DiffChoice> {
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
        lines.forEach((line) => {
          leftLines += '<div class="gh-diff-row"><div class="gh-diff-num"></div><div class="gh-diff-empty"></div></div>';
          rightLines += `<div class="gh-diff-row gh-diff-add-bg"><div class="gh-diff-num">${rightNum++}</div><div class="gh-diff-add">+ ${line}</div></div>`;
        });
      } else if (part.removed) {
        deletions += lines.length;
        lines.forEach((line) => {
          leftLines += `<div class="gh-diff-row gh-diff-rem-bg"><div class="gh-diff-num">${leftNum++}</div><div class="gh-diff-rem">- ${line}</div></div>`;
          rightLines += '<div class="gh-diff-row"><div class="gh-diff-num"></div><div class="gh-diff-empty"></div></div>';
        });
      } else {
        lines.forEach((line) => {
          leftLines += `<div class="gh-diff-row"><div class="gh-diff-num">${leftNum++}</div><div class="gh-diff-line">  ${line}</div></div>`;
          rightLines += `<div class="gh-diff-row"><div class="gh-diff-num">${rightNum++}</div><div class="gh-diff-line">  ${line}</div></div>`;
        });
      }
    });

    const ext = filename.split('.').pop() || 'txt';
    const overlay = document.createElement('div');
    overlay.id = 'gh-diff-overlay';

    overlay.innerHTML = `
      <div class="gh-diff-header">
        <div class="gh-diff-header-left">
          <button id="gh-diff-close" class="gh-btn gh-btn-secondary gh-diff-back-btn" title="Cancel and Return">
            ${lucideIcons.back}
            <span>Back</span>
          </button>
          <span class="gh-diff-title" title="${filename}">Diff: ${filename}</span>
          <span class="gh-diff-stats" title="Additions & Deletions">
            <span class="gh-diff-stat-add">+${additions}</span>
            <span class="gh-diff-stat-rem">-${deletions}</span>
          </span>
        </div>
        <div class="gh-diff-actions">
          <button id="gh-diff-merge" class="gh-btn gh-btn-secondary" title="Open local & remote in separate editor tabs">
            ${lucideIcons.gitMerge}
            <span>Manual Merge</span>
          </button>
          <button id="gh-diff-accept-remote" class="gh-btn gh-btn-danger" title="Overwrite local file with remote content">
            ${lucideIcons.pull}
            <span>Accept Remote</span>
          </button>
          <button id="gh-diff-accept-local" class="gh-btn gh-btn-success" title="Keep local file and overwrite remote">
            ${lucideIcons.check}
            <span>Accept Local</span>
          </button>
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

    const cleanup = (choice: DiffChoice) => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      resolve(choice);
    };

    const closeBtn = overlay.querySelector<HTMLElement>('#gh-diff-close');
    if (closeBtn) closeBtn.onclick = () => cleanup(null);

    const acceptRemoteBtn = overlay.querySelector<HTMLElement>('#gh-diff-accept-remote');
    if (acceptRemoteBtn) acceptRemoteBtn.onclick = () => cleanup('remote');

    const acceptLocalBtn = overlay.querySelector<HTMLElement>('#gh-diff-accept-local');
    if (acceptLocalBtn) acceptLocalBtn.onclick = () => cleanup('local');

    const mergeBtn = overlay.querySelector<HTMLElement>('#gh-diff-merge');
    if (mergeBtn) mergeBtn.onclick = () => cleanup('merge');
  });
}
