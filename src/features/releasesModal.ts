import { lucideIcons } from '../ui/icons';
import { fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { formatRelativeTime } from '../utils/format';
import { logger } from '../utils/logger';
import { renderLoadingState, renderEmptyState } from '../ui/states';
import { renderMarkdown, attachMarkdownEventHandlers } from '../utils/markdown';
import type { GitHubAPI } from '../api/github';
import type { GitHubRelease } from '../types/github';

export async function openReleasesModal(
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
          <span class="gh-modal-icon">${lucideIcons.package}</span>
          <span class="gh-modal-text">${repo} - Releases</span>
        </div>
        <button id="gh-releases-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
      </div>

      <div style="display: flex; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--gh-border); align-items: center; justify-content: flex-end; flex-shrink: 0;">
        <button id="btn-create-new-release" class="gh-btn gh-btn-sm gh-btn-success" style="padding: 4px 10px; font-size: 11px;">
          ${lucideIcons.plus} New Release
        </button>
      </div>

      <div id="gh-releases-content" style="flex: 1; overflow-y: auto; padding: 12px;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const contentEl = modal.querySelector<HTMLElement>('#gh-releases-content')!;

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#gh-releases-close')?.addEventListener('click', closeModal);

  const loadReleases = async () => {
    contentEl.innerHTML = renderLoadingState({ title: 'Loading Releases...', subtitle: 'Fetching releases from GitHub' });
    try {
      const releases = await api.getReleases(owner, repo);
      if (releases.length === 0) {
        contentEl.innerHTML = renderEmptyState({
          icon: lucideIcons.package,
          title: 'No Releases Found',
          message: 'There are no published releases for this repository.',
          actionLabel: '+ Draft Release',
          actionId: 'btn-empty-create-release',
          actionVariant: 'success'
        });
        contentEl.querySelector('#btn-empty-create-release')?.addEventListener('click', () => {
          promptCreateRelease();
        });
        return;
      }

      contentEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${releases
            .map(
              (rel) => `
            <div class="gh-card" style="margin: 0; padding: 12px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="gh-badge gh-badge-primary" style="font-size: 11px; font-weight: 700;">${rel.tag_name}</span>
                    ${rel.prerelease ? `<span class="gh-badge" style="font-size: 10px; background: #e3b34122; color: #e3b341;">Pre-release</span>` : ''}
                    ${rel.draft ? `<span class="gh-badge" style="font-size: 10px; background: #88888822; color: var(--gh-text-muted);">Draft</span>` : ''}
                  </div>
                  <h4 style="margin: 4px 0 2px 0; font-size: 13.5px; font-weight: 600; color: var(--gh-text);">${rel.name || rel.tag_name}</h4>
                  <span style="font-size: 11px; color: var(--gh-text-muted);">released ${formatRelativeTime(rel.published_at || rel.created_at)}</span>
                </div>
              </div>

              ${
                rel.body
                  ? `<div class="gh-markdown-content" style="font-size: 11.5px; line-height: 1.4; color: var(--gh-text); margin: 6px 0; max-height: 120px; overflow-y: auto; background: var(--gh-surface-alt); padding: 6px 8px; border-radius: 4px;">${renderMarkdown(rel.body)}</div>`
                  : ''
              }

              <div style="margin-top: 8px; border-top: 1px solid var(--gh-border); padding-top: 8px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--gh-text-muted); display: block; margin-bottom: 4px;">Assets:</span>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  ${
                    rel.assets.length === 0
                      ? `<div style="display: flex; gap: 6px;">
                          <button class="gh-btn gh-btn-sm gh-btn-secondary download-source-btn" data-url="${rel.zipball_url}" style="font-size: 10.5px; padding: 3px 8px;">
                            ${lucideIcons.download} Source (.zip)
                          </button>
                          <button class="gh-btn gh-btn-sm gh-btn-secondary download-source-btn" data-url="${rel.tarball_url}" style="font-size: 10.5px; padding: 3px 8px;">
                            ${lucideIcons.download} Source (.tar.gz)
                          </button>
                        </div>`
                      : rel.assets
                          .map(
                            (asset) => `
                        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; padding: 3px 6px; background: var(--gh-surface-alt); border-radius: 4px;">
                          <span style="font-family: monospace; color: var(--gh-text); word-break: break-all;">${asset.name}</span>
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: var(--gh-text-muted); font-size: 10px;">${formatBytes(asset.size)}</span>
                            <button class="gh-btn gh-btn-sm gh-btn-primary download-asset-btn" data-url="${asset.browser_download_url}" style="padding: 2px 6px; font-size: 10px;">
                              ${lucideIcons.download}
                            </button>
                          </div>
                        </div>
                      `
                          )
                          .join('')
                  }
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      attachMarkdownEventHandlers(contentEl);

      contentEl.querySelectorAll<HTMLElement>('.download-asset-btn, .download-source-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = (btn as HTMLElement).dataset.url;
          if (url) {
            triggerDownload(url);
          }
        });
      });
    } catch (err: any) {
      logger.error('Failed to load releases:', err);
      contentEl.innerHTML = `<div class="gh-state-error" style="padding: 20px; text-align: center;"><p style="color: var(--gh-danger);">${err.message || 'Failed to load releases'}</p></div>`;
    }
  };

  const triggerDownload = (url: string) => {
    if ((window as any).system?.openInBrowser) {
      (window as any).system.openInBrowser(url);
    } else if ((window as any).cordova) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
    showToast('Download started in browser', 'info', 2500);
  };

  const promptCreateRelease = () => {
    contentEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--gh-border); padding-bottom: 8px;">
          <button id="btn-cancel-create-release" class="gh-btn gh-btn-sm gh-btn-secondary" style="padding: 4px 8px; font-size: 11px;">
            ${lucideIcons.back} Cancel
          </button>
          <span style="font-weight: 600; font-size: 13px;">New Release</span>
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Tag Version</label>
          <input type="text" id="new-rel-tag" class="gh-input" placeholder="e.g. v1.0.0" style="width: 100%; box-sizing: border-box; font-size: 12px;">
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Release Title</label>
          <input type="text" id="new-rel-title" class="gh-input" placeholder="e.g. Initial Release" style="width: 100%; box-sizing: border-box; font-size: 12px;">
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Release Notes</label>
          <textarea id="new-rel-body" class="gh-input" placeholder="Describe this release..." rows="5" style="width: 100%; box-sizing: border-box; resize: vertical; font-size: 12px; font-family: inherit;"></textarea>
        </div>

        <div style="display: flex; gap: 12px; font-size: 11.5px; align-items: center;">
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
            <input type="checkbox" id="new-rel-prerelease"> Pre-release
          </label>
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
            <input type="checkbox" id="new-rel-draft"> Save as Draft
          </label>
        </div>

        <button id="btn-submit-new-release" class="gh-btn gh-btn-block gh-btn-success" style="padding: 8px 14px; font-weight: 600; font-size: 12px; margin-top: 6px;">
          ${lucideIcons.plus} Publish Release
        </button>
      </div>
    `;

    contentEl.querySelector('#btn-cancel-create-release')?.addEventListener('click', () => {
      loadReleases();
    });

    contentEl.querySelector('#btn-submit-new-release')?.addEventListener('click', async () => {
      const tagInput = contentEl.querySelector<HTMLInputElement>('#new-rel-tag');
      const titleInput = contentEl.querySelector<HTMLInputElement>('#new-rel-title');
      const bodyInput = contentEl.querySelector<HTMLTextAreaElement>('#new-rel-body');
      const prereleaseInput = contentEl.querySelector<HTMLInputElement>('#new-rel-prerelease');
      const draftInput = contentEl.querySelector<HTMLInputElement>('#new-rel-draft');

      const tag = tagInput ? tagInput.value.trim() : '';
      const title = titleInput ? titleInput.value.trim() : '';
      const body = bodyInput ? bodyInput.value.trim() : '';
      const prerelease = !!prereleaseInput?.checked;
      const draft = !!draftInput?.checked;

      if (!tag) {
        showToast('Please enter a tag version', 'error', 2000);
        return;
      }

      try {
        showToast('Publishing release on GitHub...', 'info', 2000);
        await api.createRelease(owner, repo, tag, title, body, draft, prerelease);
        showToast(`Release ${tag} created!`, 'success', 2500);
        loadReleases();
      } catch (err: any) {
        logger.error('Failed to create release:', err);
        fluentAlert('Error', err.message || 'Failed to publish release');
      }
    });
  };

  modal.querySelector('#btn-create-new-release')?.addEventListener('click', () => {
    promptCreateRelease();
  });

  loadReleases();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
