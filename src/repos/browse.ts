import { getFileIcon, lucideIcons, isImageFile, getImageMime } from '../ui/icons';
import { openImageViewer, imageToDataUrl } from '../ui/imageViewer';
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
  }

  manager.currentPath = path;
  manager.updateBreadcrumbs();

  const list = document.getElementById('repos-list');
  if (!list) return;

  list.innerHTML = '<p class="gh-text-muted" style="padding: 16px 0;">Loading contents...</p>';

  if (!manager.api) {
    list.innerHTML = '<p class="gh-text-muted" style="color: #f85149;">API client not initialized.</p>';
    return;
  }

  try {
    const contents = await manager.api.getRepoContents(owner, repo, path, manager.currentBranch);
    list.innerHTML = '';

    if (contents.length === 0) {
      list.innerHTML = '<p class="gh-text-muted" style="padding: 16px 0;">Folder is empty.</p>';
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
        const isImg = isImageFile(item.name);

        div.innerHTML = `
          <div class="gh-file-left" title="${item.name}">
            ${getFileIcon(item.name, isDir)}
            <span class="gh-file-name" style="${isDir ? 'font-weight: 600;' : ''}">${item.name}</span>
          </div>
          ${
            isDir
              ? ''
              : `
          <div class="gh-file-actions">
            <button class="gh-btn-icon gh-btn-icon-primary open-file" title="${isImg ? 'Preview Image' : 'Open in Acode'}">
              ${isImg ? lucideIcons.eye : lucideIcons.code}
            </button>
          </div>
          `
          }
        `;

        const leftEl = div.querySelector<HTMLElement>('.gh-file-left');
        if (leftEl) {
          leftEl.onclick = () => {
            if (isDir) manager.openRepo(owner, repo, item.path, manager.currentBranch);
            else manager.openFile(item);
          };
        }

        if (!isDir) {
          const openBtn = div.querySelector<HTMLElement>('.open-file');
          if (openBtn) {
            openBtn.onclick = () => manager.openFile(item);
          }
        }

        card.appendChild(div);
      });

    list.appendChild(card);
  } catch (err: any) {
    list.innerHTML = `<p class="gh-text-muted" style="color: #f85149; padding: 16px 0;">${err.message || 'Error loading path.'}</p>`;
  }
}

export async function openFile(manager: RepoManager, item: GitHubContentItem): Promise<void> {
  if (!manager.currentRepo || !manager.api) return;

  // Image files preview
  if (isImageFile(item.name)) {
    try {
      window.toast('Loading image...', 1500);
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

      // Check if Git LFS pointer text was returned
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

      openImageViewer(item.name, imgSrc, {
        uri: `github://${manager.currentRepo?.owner || ''}/${manager.currentRepo?.repo || ''}/${manager.currentBranch || 'main'}/${item.path || item.name}`,
        downloadUrl: item.download_url
      });
      return;
    } catch (err: any) {
      acode.alert('Image Error', 'Could not display image: ' + (err.message || String(err)));
      return;
    }
  }

  // Non-image binary check
  if (item.name.match(/\.(zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot|iso|tar|gz)$/i)) {
    acode.alert('Notice', 'Cannot edit binary files directly in the editor.');
    return;
  }

  try {
    window.toast('Downloading...', 2000);

    const data = await manager.api.downloadBlob(
      manager.currentRepo.owner,
      manager.currentRepo.repo,
      item.sha,
      false
    );

    const text = typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);

    acode.newEditorFile(item.name, { text, isUnsaved: false, render: true });
    window.toast(`Opened ${item.name}`, 2000);
  } catch (err: any) {
    acode.alert('Error', 'Could not download file: ' + (err.message || String(err)));
  }
}
