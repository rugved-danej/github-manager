import { lucideIcons } from '../ui/icons';
import { fluentConfirm, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { formatRelativeTime } from '../utils/format';
import { logger } from '../utils/logger';
import { renderLoadingState, renderEmptyState } from '../ui/states';
import { renderMarkdown, attachMarkdownEventHandlers } from '../utils/markdown';
import type { GitHubAPI } from '../api/github';
import type { GitHubPullRequest, GitHubPullFile } from '../types/github';

export async function openPullRequestsModal(
  api: GitHubAPI,
  owner: string,
  repo: string,
  defaultBranch = 'main'
): Promise<void> {
  const modal = document.createElement('div');
  modal.className = 'gh-modal-backdrop';
  modal.innerHTML = `
    <div class="gh-modal-container" style="max-width: 500px; width: 95vw; height: 85vh; display: flex; flex-direction: column;">
      <div class="gh-modal-header">
        <div class="gh-modal-title">
          <span class="gh-modal-icon">${lucideIcons.pull}</span>
          <span class="gh-modal-text">${repo} - Pull Requests</span>
        </div>
        <button id="gh-prs-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
      </div>

      <div style="display: flex; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--gh-border); align-items: center; justify-content: space-between; flex-shrink: 0;">
        <div class="gh-filter-bar" style="margin: 0; padding: 0;">
          <button id="btn-prs-filter-open" class="gh-filter-pill active" data-state="open">
            ${lucideIcons.pull} Open
          </button>
          <button id="btn-prs-filter-closed" class="gh-filter-pill" data-state="closed">
            ${lucideIcons.check} Closed
          </button>
        </div>
        <button id="btn-create-new-pr" class="gh-btn gh-btn-sm gh-btn-success" style="padding: 4px 10px; font-size: 11px;">
          ${lucideIcons.plus} New PR
        </button>
      </div>

      <div id="gh-prs-content" style="flex: 1; overflow-y: auto; padding: 12px;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const contentEl = modal.querySelector<HTMLElement>('#gh-prs-content')!;
  let currentState: 'open' | 'closed' = 'open';

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#gh-prs-close')?.addEventListener('click', closeModal);

  const filterOpenBtn = modal.querySelector<HTMLElement>('#btn-prs-filter-open')!;
  const filterClosedBtn = modal.querySelector<HTMLElement>('#btn-prs-filter-closed')!;

  filterOpenBtn.addEventListener('click', () => {
    if (currentState === 'open') return;
    currentState = 'open';
    filterOpenBtn.classList.add('active');
    filterClosedBtn.classList.remove('active');
    loadPRs();
  });

  filterClosedBtn.addEventListener('click', () => {
    if (currentState === 'closed') return;
    currentState = 'closed';
    filterClosedBtn.classList.add('active');
    filterOpenBtn.classList.remove('active');
    loadPRs();
  });

  const loadPRs = async () => {
    contentEl.innerHTML = renderLoadingState({ title: 'Loading Pull Requests...', subtitle: `Fetching ${currentState} PRs` });
    try {
      const prs = await api.getPullRequests(owner, repo, currentState);
      if (prs.length === 0) {
        contentEl.innerHTML = renderEmptyState({
          icon: lucideIcons.pull,
          title: `No ${currentState === 'open' ? 'Open' : 'Closed'} Pull Requests`,
          message: currentState === 'open' ? 'There are no open pull requests in this repository.' : 'No closed pull requests found.',
          actionLabel: currentState === 'open' ? '+ Create Pull Request' : undefined,
          actionId: 'btn-empty-create-pr',
          actionVariant: 'success'
        });
        contentEl.querySelector('#btn-empty-create-pr')?.addEventListener('click', () => {
          promptCreatePR();
        });
        return;
      }

      contentEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${prs
            .map(
              (pr) => `
            <div class="gh-card gh-pr-item" data-number="${pr.number}" style="margin: 0; cursor: pointer; padding: 10px 12px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="color: ${pr.state === 'open' ? 'var(--gh-success)' : 'var(--gh-danger)'}; display: flex; align-items: center;">
                      ${lucideIcons.pull}
                    </span>
                    <span style="font-weight: 600; font-size: 13px; color: var(--gh-text); word-break: break-word;">${pr.title}</span>
                    <span style="font-size: 11px; color: var(--gh-text-muted);">#${pr.number}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--gh-text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span>by @${pr.user?.login || 'unknown'}</span>
                    <span>•</span>
                    <span class="gh-badge" style="font-size: 10px; padding: 1px 5px;">${pr.head.ref} &rarr; ${pr.base.ref}</span>
                    <span>•</span>
                    <span>${formatRelativeTime(pr.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      contentEl.querySelectorAll<HTMLElement>('.gh-pr-item').forEach((el) => {
        el.addEventListener('click', () => {
          const num = Number(el.dataset.number);
          const pr = prs.find((p) => p.number === num);
          if (pr) viewPRDetails(pr);
        });
      });
    } catch (err: any) {
      logger.error('Failed to load PRs:', err);
      contentEl.innerHTML = `<div class="gh-state-error" style="padding: 20px; text-align: center;"><p style="color: var(--gh-danger);">${err.message || 'Failed to load pull requests'}</p></div>`;
    }
  };

  const viewPRDetails = async (prSummary: GitHubPullRequest) => {
    contentEl.innerHTML = renderLoadingState({ title: `Loading PR #${prSummary.number}...` });

    try {
      const [pr, files] = await Promise.all([
        api.getPullRequest(owner, repo, prSummary.number),
        api.getPullRequestFiles(owner, repo, prSummary.number)
      ]);

      contentEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--gh-border); padding-bottom: 8px;">
            <button id="btn-pr-back-to-list" class="gh-btn gh-btn-sm gh-btn-secondary" style="padding: 4px 8px; font-size: 11px;">
              ${lucideIcons.back} Back to list
            </button>
            <div style="display: flex; gap: 6px;">
              ${
                pr.state === 'open'
                  ? `
                <button id="btn-merge-pr" class="gh-btn gh-btn-sm gh-btn-success" style="padding: 4px 8px; font-size: 11px;">
                  ${lucideIcons.gitMerge} Merge PR
                </button>
                <button id="btn-close-pr" class="gh-btn gh-btn-sm gh-btn-danger" style="padding: 4px 8px; font-size: 11px;">
                  ${lucideIcons.x} Close PR
                </button>
              `
                  : `<span class="gh-badge gh-badge-neutral" style="font-size: 11px;">Merged / Closed</span>`
              }
            </div>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span class="gh-badge ${pr.state === 'open' ? 'gh-badge-success' : 'gh-badge-danger'}" style="font-size: 11px;">
                ${pr.state === 'open' ? 'Open' : 'Closed'}
              </span>
              <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--gh-text); word-break: break-word;">${pr.title}</h3>
            </div>
            <p style="margin: 0; font-size: 11px; color: var(--gh-text-muted);">
              #${pr.number} from <code style="color: var(--gh-accent);">${pr.head.ref}</code> into <code style="color: var(--gh-accent);">${pr.base.ref}</code>
            </p>
          </div>

          <div class="gh-card gh-markdown-content" style="padding: 12px; margin: 0; background: var(--gh-surface-alt);">
            ${pr.body ? renderMarkdown(pr.body) : '<span style="font-style: italic; color: var(--gh-text-muted);">No description provided.</span>'}
          </div>

          <div>
            <h4 style="margin: 4px 0 8px 0; font-size: 12px; font-weight: 600; color: var(--gh-text-muted);">
              Changed Files (${files.length})
            </h4>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${files
                .map(
                  (f, idx) => `
                <div class="gh-card" style="padding: 8px 10px; margin: 0; font-size: 11.5px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                    <span style="font-family: monospace; color: var(--gh-text); word-break: break-all;">${f.filename}</span>
                    <div style="display: flex; gap: 4px; font-size: 10.5px; font-weight: 600;">
                      <span style="color: var(--gh-success);">+${f.additions}</span>
                      <span style="color: var(--gh-danger);">-${f.deletions}</span>
                    </div>
                  </div>
                  ${
                    f.patch
                      ? `<details style="margin-top: 6px;">
                          <summary style="cursor: pointer; color: var(--gh-accent); font-size: 10.5px;">View diff patch</summary>
                          <pre style="margin: 6px 0 0 0; padding: 8px; background: var(--gh-surface); border-radius: 4px; overflow-x: auto; font-size: 10.5px; font-family: monospace; white-space: pre; line-height: 1.3;">${escapeHtml(f.patch)}</pre>
                        </details>`
                      : ''
                  }
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      `;

      attachMarkdownEventHandlers(contentEl);

      contentEl.querySelector('#btn-pr-back-to-list')?.addEventListener('click', () => {
        loadPRs();
      });

      contentEl.querySelector('#btn-merge-pr')?.addEventListener('click', async () => {
        const confirm = await fluentConfirm({
          title: 'Merge Pull Request',
          message: `Are you sure you want to merge PR #${pr.number} (${pr.head.ref} -> ${pr.base.ref})?`,
          confirmText: 'Merge PR'
        });
        if (!confirm) return;

        try {
          showToast('Merging pull request...', 'info', 2000);
          await api.mergePullRequest(owner, repo, pr.number, 'squash');
          showToast(`PR #${pr.number} merged successfully!`, 'success', 3000);
          loadPRs();
        } catch (err: any) {
          logger.error('Failed to merge PR:', err);
          fluentAlert('Error', err.message || 'Failed to merge pull request');
        }
      });

      contentEl.querySelector('#btn-close-pr')?.addEventListener('click', async () => {
        const confirm = await fluentConfirm({
          title: 'Close Pull Request',
          message: `Close PR #${pr.number} without merging?`,
          confirmText: 'Close PR',
          danger: true
        });
        if (!confirm) return;

        try {
          showToast('Closing pull request...', 'info', 1500);
          await api.closePullRequest(owner, repo, pr.number);
          showToast(`PR #${pr.number} closed!`, 'success', 2000);
          loadPRs();
        } catch (err: any) {
          logger.error('Failed to close PR:', err);
          fluentAlert('Error', err.message || 'Failed to close pull request');
        }
      });
    } catch (err: any) {
      logger.error('Failed to view PR details:', err);
      contentEl.innerHTML = `<div class="gh-state-error" style="padding: 20px; text-align: center;"><p style="color: var(--gh-danger);">${err.message || 'Failed to load PR details'}</p></div>`;
    }
  };

  const promptCreatePR = () => {
    contentEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--gh-border); padding-bottom: 8px;">
          <button id="btn-cancel-create-pr" class="gh-btn gh-btn-sm gh-btn-secondary" style="padding: 4px 8px; font-size: 11px;">
            ${lucideIcons.back} Cancel
          </button>
          <span style="font-weight: 600; font-size: 13px;">New Pull Request</span>
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Title</label>
          <input type="text" id="new-pr-title" class="gh-input" placeholder="PR title" style="width: 100%; box-sizing: border-box; font-size: 12px;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Head Branch (source)</label>
            <input type="text" id="new-pr-head" class="gh-input" placeholder="e.g. feature-branch" style="width: 100%; box-sizing: border-box; font-size: 12px;">
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Base Branch (target)</label>
            <input type="text" id="new-pr-base" class="gh-input" value="${defaultBranch}" placeholder="e.g. main" style="width: 100%; box-sizing: border-box; font-size: 12px;">
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Description</label>
          <textarea id="new-pr-body" class="gh-input" placeholder="Describe the changes..." rows="5" style="width: 100%; box-sizing: border-box; resize: vertical; font-size: 12px; font-family: inherit;"></textarea>
        </div>

        <button id="btn-submit-new-pr" class="gh-btn gh-btn-block gh-btn-success" style="padding: 8px 14px; font-weight: 600; font-size: 12px; margin-top: 6px;">
          ${lucideIcons.plus} Create Pull Request
        </button>
      </div>
    `;

    contentEl.querySelector('#btn-cancel-create-pr')?.addEventListener('click', () => {
      loadPRs();
    });

    contentEl.querySelector('#btn-submit-new-pr')?.addEventListener('click', async () => {
      const titleInput = contentEl.querySelector<HTMLInputElement>('#new-pr-title');
      const headInput = contentEl.querySelector<HTMLInputElement>('#new-pr-head');
      const baseInput = contentEl.querySelector<HTMLInputElement>('#new-pr-base');
      const bodyInput = contentEl.querySelector<HTMLTextAreaElement>('#new-pr-body');

      const title = titleInput ? titleInput.value.trim() : '';
      const head = headInput ? headInput.value.trim() : '';
      const base = baseInput ? baseInput.value.trim() : defaultBranch;
      const body = bodyInput ? bodyInput.value.trim() : '';

      if (!title || !head || !base) {
        showToast('Please specify title, head, and base branch', 'error', 2000);
        return;
      }

      try {
        showToast('Creating pull request...', 'info', 2000);
        const created = await api.createPullRequest(owner, repo, title, head, base, body);
        showToast(`PR #${created.number} created!`, 'success', 2500);
        viewPRDetails(created);
      } catch (err: any) {
        logger.error('Failed to create PR:', err);
        fluentAlert('Error', err.message || 'Failed to create pull request');
      }
    });
  };

  modal.querySelector('#btn-create-new-pr')?.addEventListener('click', () => {
    promptCreatePR();
  });

  loadPRs();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
