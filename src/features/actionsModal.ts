import { lucideIcons } from '../ui/icons';
import { fluentConfirm, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { formatRelativeTime } from '../utils/format';
import { logger } from '../utils/logger';
import { renderLoadingState, renderEmptyState } from '../ui/states';
import type { GitHubAPI } from '../api/github';
import type { GitHubWorkflowRun } from '../types/github';

export async function openActionsModal(
  api: GitHubAPI,
  owner: string,
  repo: string
): Promise<void> {
  const modal = document.createElement('div');
  modal.className = 'gh-modal-backdrop';
  modal.innerHTML = `
    <div class="gh-modal-container" style="max-width: 480px; width: 95vw; height: 85vh; display: flex; flex-direction: column;">
      <div class="gh-modal-header">
        <div class="gh-modal-title">
          <span class="gh-modal-icon">${lucideIcons.play}</span>
          <span class="gh-modal-text">${repo} - Actions</span>
        </div>
        <button id="gh-actions-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
      </div>

      <div style="display: flex; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--gh-border); align-items: center; justify-content: flex-end; flex-shrink: 0;">
        <button id="btn-refresh-actions" class="gh-btn gh-btn-sm gh-btn-secondary" style="padding: 4px 10px; font-size: 11px;">
          ${lucideIcons.refresh} Refresh
        </button>
      </div>

      <div id="gh-actions-content" style="flex: 1; overflow-y: auto; padding: 12px;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const contentEl = modal.querySelector<HTMLElement>('#gh-actions-content')!;

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#gh-actions-close')?.addEventListener('click', closeModal);

  const loadWorkflowRuns = async () => {
    contentEl.innerHTML = renderLoadingState({ title: 'Loading Workflows...', subtitle: 'Fetching GitHub Actions runs' });
    try {
      const data = await api.getWorkflowRuns(owner, repo);
      const runs = data.workflow_runs || [];

      if (runs.length === 0) {
        contentEl.innerHTML = renderEmptyState({
          icon: lucideIcons.play,
          title: 'No Workflow Runs Found',
          message: 'No GitHub Actions workflows have run on this repository yet.'
        });
        return;
      }

      contentEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${runs
            .map((run) => {
              const isSuccess = run.conclusion === 'success';
              const isFailure = run.conclusion === 'failure';
              const isInProgress = run.status === 'in_progress';

              const icon = isSuccess
                ? lucideIcons.check
                : isFailure
                ? lucideIcons.alertCircle
                : isInProgress
                ? lucideIcons.refresh
                : lucideIcons.clock;

              const badgeColor = isSuccess
                ? 'var(--gh-success)'
                : isFailure
                ? 'var(--gh-danger)'
                : isInProgress
                ? 'var(--gh-accent)'
                : 'var(--gh-text-muted)';

              const statusText = run.conclusion || run.status;

              return `
              <div class="gh-card" style="margin: 0; padding: 10px 12px;">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                  <div style="min-width: 0; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                      <span style="color: ${badgeColor}; display: flex; align-items: center;">${icon}</span>
                      <span style="font-weight: 600; font-size: 13px; color: var(--gh-text); word-break: break-word;">${run.name || 'Workflow Run'}</span>
                      <span class="gh-badge" style="font-size: 10px; color: ${badgeColor}; border-color: ${badgeColor}44;">${statusText}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--gh-text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span>branch: <code style="color: var(--gh-accent);">${run.head_branch || 'main'}</code></span>
                      <span>•</span>
                      <span>trigger: ${run.event}</span>
                      <span>•</span>
                      <span>${formatRelativeTime(run.updated_at || run.created_at)}</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px;">
                    <button class="gh-btn-icon rerun-run-btn" data-run-id="${run.id}" title="Re-run workflow">
                      ${lucideIcons.refresh}
                    </button>
                    <button class="gh-btn-icon view-run-btn" data-url="${run.html_url}" title="View run in browser">
                      ${lucideIcons.externalLink}
                    </button>
                  </div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `;

      contentEl.querySelectorAll<HTMLElement>('.rerun-run-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const runId = Number(btn.dataset.runId);
          const confirm = await fluentConfirm({
            title: 'Re-run Workflow',
            message: `Do you want to re-run workflow run #${runId}?`,
            confirmText: 'Re-run'
          });
          if (!confirm) return;

          try {
            showToast('Triggering workflow re-run...', 'info', 1500);
            await api.rerunWorkflow(owner, repo, runId);
            showToast('Workflow re-run requested!', 'success', 2500);
            loadWorkflowRuns();
          } catch (err: any) {
            logger.error('Failed to rerun workflow:', err);
            fluentAlert('Error', err.message || 'Failed to re-run workflow');
          }
        });
      });

      contentEl.querySelectorAll<HTMLElement>('.view-run-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = btn.dataset.url;
          if (url) {
            if ((window as any).system?.openInBrowser) {
              (window as any).system.openInBrowser(url);
            } else {
              window.open(url, '_blank');
            }
          }
        });
      });
    } catch (err: any) {
      logger.error('Failed to load workflow runs:', err);
      contentEl.innerHTML = `<div class="gh-state-error" style="padding: 20px; text-align: center;"><p style="color: var(--gh-danger);">${err.message || 'Failed to load workflow runs'}</p></div>`;
    }
  };

  modal.querySelector('#btn-refresh-actions')?.addEventListener('click', () => {
    loadWorkflowRuns();
  });

  loadWorkflowRuns();
}
