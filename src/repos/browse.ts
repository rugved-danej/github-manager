import { getFileIcon, lucideIcons, isImageFile, getImageMime } from '../ui/icons';
import { openInAcodeImageTab, imageToDataUrl } from '../ui/imageViewer';
import { renderLoadingState, renderEmptyState, renderErrorState } from '../ui/states';
import { fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';
import { formatFileSize, copyToClipboard, closeSidebar } from '../utils/format';
import type { RepoManager } from './manager';
import type { GitHubContentItem } from '../types/github';

export async function openRepo(
  manager: RepoManager,
  owner: string,
  repo: string,
  path = '',
  branch = ''
): Promise<void> {
  if (!manager.currentRepo || manager.currentRepo.repo !== repo) {
    manager.currentRepo = { owner, repo, defaultBranch: branch || 'main' };
    manager.currentBranch = branch || 'main';

    const header = document.getElementById('repo-header');
    if (header) header.style.display = 'flex';

    const actions = document.getElementById('repo-main-actions');
    if (actions) actions.style.display = 'none';

    const loadMore = document.getElementById('repo-load-more');
    if (loadMore) loadMore.style.display = 'none';

    await manager.loadBranches(owner, repo);
    manager.updateStarUI(owner, repo);
    if (manager.api) {
      manager.api.isRepoStarred(owner, repo).then((isStarred) => {
        const key = `${owner}/${repo}`;
        if (isStarred) {
          manager.starredRepoNames.add(key);
          manager.starredRepoNames.add(repo);
        } else {
          manager.starredRepoNames.delete(key);
          manager.starredRepoNames.delete(repo);
        }
        manager.updateStarUI(owner, repo);
      });
    }
  } else {
    manager.updateStarUI(owner, repo);
  }

  manager.currentPath = path;
  manager.updateBreadcrumbs();

  const list = document.getElementById('repos-list');
  if (!list) return;

  list.innerHTML = renderLoadingState({
    title: 'Loading Folder Contents...',
    subtitle: `Browsing ${path || 'root repository directory'}`
  });

  if (!manager.api) {
    list.innerHTML = renderErrorState({
      title: 'Not Initialized',
      message: 'API client is not ready. Please check login.'
    });
    return;
  }

  try {
    const contents = await manager.api.getRepoContents(owner, repo, path, manager.currentBranch);
    list.innerHTML = '';

    if (contents.length === 0) {
      list.innerHTML = renderEmptyState({
        icon: lucideIcons.folderOpen,
        title: 'Folder is Empty',
        message: 'No files or folders found in this directory.'
      });
      return;
    }

    const card = document.createElement('div');
    card.className = 'gh-card';
    card.style.padding = '6px';

    contents
      .sort((a, b) => (b.type === 'dir' ? 1 : 0) - (a.type === 'dir' ? 1 : 0))
      .forEach((item) => {
        const div = document.createElement('div');
        div.className = 'gh-file-row';
        const isDir = item.type === 'dir';

        div.innerHTML = `
          <div class="gh-file-left" title="${item.name}">
            ${getFileIcon(item.name, isDir)}
            <span class="gh-file-name" style="${isDir ? 'font-weight: 600;' : ''}">${item.name}</span>
            ${!isDir && item.size ? `<span class="gh-file-size">${formatFileSize(item.size)}</span>` : ''}
          </div>
          <div class="gh-file-actions">
            ${
              isDir
                ? `<span style="color: var(--gh-text-muted); display: flex; align-items: center; opacity: 0.7;">${lucideIcons.chevronRight}</span>`
                : `
              <button class="gh-btn-icon copy-file-url" data-url="${item.download_url || ''}" title="Copy Raw Download URL">
                ${lucideIcons.copy}
              </button>
            `
            }
          </div>
        `;

        const leftEl = div.querySelector<HTMLElement>('.gh-file-left');
        if (leftEl) {
          leftEl.onclick = () => {
            if (isDir) manager.openRepo(owner, repo, item.path, manager.currentBranch);
            else manager.openFile(item);
          };
        }

        const copyBtn = div.querySelector<HTMLElement>('.copy-file-url');
        if (copyBtn) {
          copyBtn.onclick = async (e) => {
            e.stopPropagation();
            const url = (e.currentTarget as HTMLElement).dataset.url || '';
            const ok = await copyToClipboard(url);
            showToast(ok ? 'File download URL copied!' : 'Failed to copy URL', ok ? 'success' : 'error');
          };
        }

        card.appendChild(div);
      });

    list.appendChild(card);
  } catch (err: any) {
    list.innerHTML = renderErrorState({
      title: 'Failed to Load Folder',
      message: err?.message || 'Could not retrieve repository contents.'
    });
  }
}

export async function openFile(manager: RepoManager, item: GitHubContentItem): Promise<void> {
  if (!manager.currentRepo || !manager.api) return;

  if (isImageFile(item.name)) {
    try {
      showToast('Loading image...', 'info', 1500);
      let data: string | ArrayBuffer;
      try {
        data = await manager.api.downloadBlob(
          manager.currentRepo.owner,
          manager.currentRepo.repo,
          item.sha,
          true
        );
      } catch (blobErr) {
        if (item.download_url) {
          data = await manager.api.downloadRawUrl(item.download_url);
        } else {
          throw blobErr;
        }
      }

      if (typeof data !== 'string') {
        const bytes = new Uint8Array(data);
        if (bytes.length >= 7 && bytes[0] === 0x76 && bytes[1] === 0x65 && bytes[2] === 0x72) {
          const text = new TextDecoder('utf-8').decode(bytes.subarray(0, 30));
          if (text.startsWith('version https://git-lfs') && item.download_url) {
            try {
              data = await manager.api.downloadRawUrl(item.download_url);
            } catch {}
          }
        }
      }

      const mime = getImageMime(item.name);
      const imgSrc = await imageToDataUrl(data, mime);
      const uri = `github://${manager.currentRepo?.owner || ''}/${manager.currentRepo?.repo || ''}/${manager.currentBranch || 'main'}/${item.path || item.name}`;

      const opened = openInAcodeImageTab(item.name, imgSrc, uri);
      if (opened) {
        closeSidebar();
        showToast(`Opened ${item.name} in editor`, 'success', 2000);
      } else {
        fluentAlert('Image Error', 'Could not open image in editor tab.');
      }
      return;
    } catch (err: any) {
      logger.error('Failed to display image:', err);
      fluentAlert('Image Error', 'Could not display image: ' + (err.message || String(err)));
      return;
    }
  }

  if (item.name.match(/\.(zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot|iso|tar|gz)$/i)) {
    fluentAlert('Notice', 'Cannot edit binary files directly in the editor.');
    return;
  }

  try {
    showToast('Downloading...', 'info', 2000);

    const data = await manager.api.downloadBlob(
      manager.currentRepo.owner,
      manager.currentRepo.repo,
      item.sha,
      false
    );

    const text = typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);

    acode.newEditorFile(item.name, { text, isUnsaved: false, render: true });
    closeSidebar();
    showToast(`Opened ${item.name} in editor`, 'success', 2000);
  } catch (err: any) {
    logger.error('Failed to download file:', err);
    fluentAlert('Error', 'Could not download file: ' + (err.message || String(err)));
  }
}
