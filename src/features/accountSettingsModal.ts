import { lucideIcons } from '../ui/icons';
import { fluentConfirm, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { formatRelativeTime } from '../utils/format';
import { logger } from '../utils/logger';
import { renderLoadingState, renderEmptyState } from '../ui/states';
import type { GitHubAPI } from '../api/github';
import type { GitHubUser, GitHubSSHKey } from '../types/github';

export async function openAccountSettingsModal(
  api: GitHubAPI,
  currentUser: GitHubUser | null
): Promise<void> {
  const modal = document.createElement('div');
  modal.className = 'gh-modal-backdrop';
  modal.innerHTML = `
    <div class="gh-modal-container" style="max-width: 480px; width: 95vw; height: 85vh; display: flex; flex-direction: column;">
      <div class="gh-modal-header">
        <div class="gh-modal-title">
          <span class="gh-modal-icon">${lucideIcons.key}</span>
          <span class="gh-modal-text">Account & SSH Keys</span>
        </div>
        <button id="gh-account-settings-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px;">
        ${
          currentUser
            ? `
          <div class="gh-card" style="margin: 0; padding: 12px; display: flex; align-items: center; gap: 12px;">
            ${currentUser.avatar_url ? `<img src="${currentUser.avatar_url}" style="width: 44px; height: 44px; border-radius: 50%;" alt="">` : ''}
            <div>
              <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--gh-text);">${currentUser.name || currentUser.login}</h3>
              <p style="margin: 2px 0 0 0; font-size: 11.5px; color: var(--gh-text-muted);">@${currentUser.login}</p>
            </div>
          </div>
        `
            : ''
        }

        <div class="gh-card" style="margin: 0; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
              ${lucideIcons.key} SSH Keys
            </h4>
            <button id="btn-add-ssh-key" class="gh-btn gh-btn-sm gh-btn-success" style="padding: 4px 10px; font-size: 11px;">
              ${lucideIcons.plus} Add Key
            </button>
          </div>
          <p style="margin: 0 0 10px 0; font-size: 11px; color: var(--gh-text-muted);">
            Manage public SSH keys associated with your GitHub account.
          </p>

          <div id="gh-ssh-keys-list">${renderLoadingState({ title: 'Loading SSH Keys...' })}</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#gh-account-settings-close')?.addEventListener('click', closeModal);

  const keysListEl = modal.querySelector<HTMLElement>('#gh-ssh-keys-list')!;

  const loadKeys = async () => {
    keysListEl.innerHTML = renderLoadingState({ title: 'Loading SSH keys...' });
    try {
      const keys = await api.getSSHKeys();
      if (keys.length === 0) {
        keysListEl.innerHTML = renderEmptyState({
          icon: lucideIcons.key,
          title: 'No SSH Keys',
          message: 'No SSH keys registered on your GitHub account.'
        });
        return;
      }

      keysListEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${keys
            .map(
              (k) => `
            <div class="gh-card" style="margin: 0; padding: 8px 10px; background: var(--gh-surface-alt); font-size: 11px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <div style="min-width: 0; flex: 1;">
                <span style="font-weight: 600; color: var(--gh-text); display: block;">${k.title || 'Untitled Key'}</span>
                <span style="font-family: monospace; color: var(--gh-text-muted); font-size: 10px; word-break: break-all; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${k.key}
                </span>
                <span style="font-size: 10px; color: var(--gh-text-muted);">Added ${formatRelativeTime(k.created_at)}</span>
              </div>
              <button class="gh-btn-icon gh-btn-icon-danger delete-ssh-btn" data-id="${k.id}" data-title="${k.title || 'key'}" title="Delete SSH Key">
                ${lucideIcons.trash}
              </button>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      keysListEl.querySelectorAll<HTMLElement>('.delete-ssh-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const keyId = Number(btn.dataset.id);
          const keyTitle = btn.dataset.title;

          const confirm = await fluentConfirm({
            title: 'Delete SSH Key',
            message: `Are you sure you want to remove SSH key "${keyTitle}" from GitHub?`,
            confirmText: 'Delete',
            danger: true
          });
          if (!confirm) return;

          try {
            showToast('Deleting SSH key...', 'info', 1500);
            await api.deleteSSHKey(keyId);
            showToast('SSH key deleted!', 'success', 2000);
            loadKeys();
          } catch (err: any) {
            logger.error('Failed to delete SSH key:', err);
            fluentAlert('Error', err.message || 'Failed to delete SSH key');
          }
        });
      });
    } catch (err: any) {
      logger.error('Failed to load SSH keys:', err);
      keysListEl.innerHTML = `<div class="gh-state-error" style="padding: 12px; text-align: center;"><p style="color: var(--gh-danger);">${err.message || 'Failed to load SSH keys'}</p></div>`;
    }
  };

  const promptAddKey = () => {
    keysListEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--gh-border); padding-top: 8px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Key Title</label>
          <input type="text" id="new-ssh-title" class="gh-input" placeholder="e.g. My Phone Key" style="width: 100%; box-sizing: border-box; font-size: 12px;">
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Key Content (public key)</label>
          <textarea id="new-ssh-content" class="gh-input" placeholder="Begins with ssh-rsa, ssh-ed25519..." rows="4" style="width: 100%; box-sizing: border-box; resize: vertical; font-size: 11px; font-family: monospace;"></textarea>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <button id="btn-cancel-add-ssh" class="gh-btn gh-btn-secondary" style="flex: 1; padding: 6px; font-size: 11.5px;">
            Cancel
          </button>
          <button id="btn-save-add-ssh" class="gh-btn gh-btn-success" style="flex: 1; padding: 6px; font-size: 11.5px; font-weight: 600;">
            ${lucideIcons.plus} Add Key
          </button>
        </div>
      </div>
    `;

    keysListEl.querySelector('#btn-cancel-add-ssh')?.addEventListener('click', () => {
      loadKeys();
    });

    keysListEl.querySelector('#btn-save-add-ssh')?.addEventListener('click', async () => {
      const titleInput = keysListEl.querySelector<HTMLInputElement>('#new-ssh-title');
      const contentInput = keysListEl.querySelector<HTMLTextAreaElement>('#new-ssh-content');
      const title = titleInput ? titleInput.value.trim() : '';
      const key = contentInput ? contentInput.value.trim() : '';

      if (!title || !key) {
        showToast('Please specify title and public key content', 'error', 2000);
        return;
      }

      try {
        showToast('Adding SSH key to GitHub...', 'info', 2000);
        await api.createSSHKey(title, key);
        showToast('SSH key added successfully!', 'success', 2500);
        loadKeys();
      } catch (err: any) {
        logger.error('Failed to add SSH key:', err);
        fluentAlert('Error', err.message || 'Failed to add SSH key');
      }
    });
  };

  modal.querySelector('#btn-add-ssh-key')?.addEventListener('click', () => {
    promptAddKey();
  });

  loadKeys();
}
