import { lucideIcons } from '../ui/icons';
import { fluentConfirm, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';
import type { GitHubAPI } from '../api/github';
import type { GitHubRepo, GitHubOrg } from '../types/github';

export async function openRepoSettingsModal(
  api: GitHubAPI,
  repo: GitHubRepo,
  orgs: GitHubOrg[] = [],
  onUpdated?: () => void
): Promise<void> {
  const modal = document.createElement('div');
  modal.className = 'gh-modal-backdrop';
  modal.innerHTML = `
    <div class="gh-modal-container" style="max-width: 460px; width: 95vw; height: auto; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="gh-modal-header">
        <div class="gh-modal-title">
          <span class="gh-modal-icon">${lucideIcons.settings}</span>
          <span class="gh-modal-text">${repo.name} - Settings</span>
        </div>
        <button id="gh-repo-settings-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px;">
        <div class="gh-card" style="margin: 0; padding: 12px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            ${lucideIcons.gitFork} Fork Repository
          </h4>
          <p style="margin: 0 0 10px 0; font-size: 11px; color: var(--gh-text-muted);">
            Create a copy of this repository on your personal or organization account.
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="btn-fork-repo" class="gh-btn gh-btn-primary" style="padding: 6px 12px; font-size: 11.5px; font-weight: 600;">
              ${lucideIcons.gitFork} Fork Repository
            </button>
          </div>
        </div>

        <div class="gh-card" style="margin: 0; padding: 12px; display: flex; flex-direction: column; gap: 10px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            ${lucideIcons.edit} Edit Repository Details
          </h4>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Description</label>
            <input type="text" id="repo-edit-desc" class="gh-input" value="${escapeHtml(repo.description || '')}" placeholder="Short repository description" style="width: 100%; box-sizing: border-box; font-size: 12px;">
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Website URL</label>
            <input type="url" id="repo-edit-homepage" class="gh-input" placeholder="https://example.com" style="width: 100%; box-sizing: border-box; font-size: 12px;">
          </div>

          <div style="padding-top: 6px; border-top: 1px solid var(--gh-border);">
            <button id="btn-save-repo-details" class="gh-btn gh-btn-block gh-btn-primary" style="padding: 7px 12px; font-size: 12px; font-weight: 600;">
              Save Changes
            </button>
          </div>
        </div>

        <div class="gh-card" style="margin: 0; padding: 12px; border-color: var(--gh-danger);">
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: var(--gh-danger); display: flex; align-items: center; gap: 6px;">
            ${lucideIcons.lock} Change Visibility
          </h4>
          <p style="margin: 0 0 10px 0; font-size: 11px; color: var(--gh-text-muted);">
            Currently: <strong>${repo.private ? 'Private' : 'Public'}</strong>.
            Making a repository private restricts access to collaborators only.
          </p>
          <button id="btn-toggle-visibility" class="gh-btn gh-btn-danger" style="padding: 6px 12px; font-size: 11.5px; font-weight: 600;">
            Change to ${repo.private ? 'Public' : 'Private'}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#gh-repo-settings-close')?.addEventListener('click', closeModal);

  modal.querySelector('#btn-fork-repo')?.addEventListener('click', async () => {
    const confirm = await fluentConfirm({
      title: 'Fork Repository',
      message: `Do you want to create a fork of ${repo.full_name}?`,
      confirmText: 'Fork'
    });
    if (!confirm) return;

    try {
      showToast('Creating fork on GitHub...', 'info', 2500);
      const forked = await api.forkRepo(repo.owner.login, repo.name);
      showToast(`Forked to ${forked.full_name}!`, 'success', 3000);
      if (onUpdated) onUpdated();
      closeModal();
    } catch (err: any) {
      logger.error('Failed to fork repository:', err);
      fluentAlert('Fork Error', err.message || 'Failed to fork repository');
    }
  });

  modal.querySelector('#btn-save-repo-details')?.addEventListener('click', async () => {
    const descInput = modal.querySelector<HTMLInputElement>('#repo-edit-desc');
    const homepageInput = modal.querySelector<HTMLInputElement>('#repo-edit-homepage');

    const description = descInput ? descInput.value.trim() : '';
    const homepage = homepageInput ? homepageInput.value.trim() : '';

    try {
      showToast('Saving repository changes...', 'info', 1500);
      await api.updateRepo(repo.owner.login, repo.name, {
        description,
        homepage: homepage || undefined
      });
      repo.description = description;
      showToast('Repository updated successfully!', 'success', 2000);
      if (onUpdated) onUpdated();
      closeModal();
    } catch (err: any) {
      logger.error('Failed to update repository:', err);
      fluentAlert('Error', err.message || 'Failed to update repository settings');
    }
  });

  modal.querySelector('#btn-toggle-visibility')?.addEventListener('click', async () => {
    const newPrivate = !repo.private;
    const confirm = await fluentConfirm({
      title: 'Change Repository Visibility',
      message: `Are you sure you want to change ${repo.name} to ${newPrivate ? 'Private' : 'Public'}?`,
      confirmText: `Make ${newPrivate ? 'Private' : 'Public'}`,
      danger: true
    });
    if (!confirm) return;

    try {
      showToast('Updating visibility...', 'info', 2000);
      await api.updateRepo(repo.owner.login, repo.name, { private: newPrivate });
      repo.private = newPrivate;
      showToast(`Repository is now ${newPrivate ? 'private' : 'public'}!`, 'success', 2500);
      if (onUpdated) onUpdated();
      closeModal();
    } catch (err: any) {
      logger.error('Failed to change visibility:', err);
      fluentAlert('Error', err.message || 'Failed to update visibility');
    }
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
