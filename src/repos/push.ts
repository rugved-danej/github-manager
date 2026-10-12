import { showDiffViewer } from '../ui/diffViewer';
import { fluentConfirm, fluentPrompt, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';
import type { RepoManager } from './manager';
import type { GitHubRepo } from '../types/github';
import type { LocalFileEntry } from '../types/plugin';

export async function handlePushLocal(manager: RepoManager, repo: GitHubRepo): Promise<void> {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const fileBrowser = acode.require('fileBrowser');
  const fsOperation = acode.require('fsOperation');

  try {
    const dest = await fileBrowser('folder', `Select the local folder for ${repo.name} to push`);
    if (!dest || !dest.url) return;

    const gitConfigUrl = dest.url + (dest.url.endsWith('/') ? '' : '/') + '.git/config';
    try {
      const gitConfigContent = await fsOperation(gitConfigUrl).readFile('utf-8');
      const expectedRepoString = `${repo.owner.login}/${repo.name}`.toLowerCase();

      if (!gitConfigContent.toLowerCase().includes(expectedRepoString)) {
        fluentAlert(
          'Push Blocked',
          `Folder Mismatch! The .git/config does not belong to ${repo.owner.login}/${repo.name}.`
        );
        return;
      }
    } catch (e) {
      fluentAlert('Push Blocked', 'This folder is not a valid repository. Missing .git/config file.');
      return;
    }

    const message = await fluentPrompt({
      title: 'Commit Message',
      defaultValue: `Update ${repo.name} from Acode`,
      placeholder: 'Enter commit message...'
    });
    if (!message) return;

    showToast('Preparing Delta Sync...', 'info', 2000);

    const branch = repo.default_branch || 'main';
    const remoteFiles: Record<string, string> = {};

    try {
      const treeData = await manager.api.getTree(repo.owner.login, repo.name, branch);
      if (treeData && treeData.tree) {
        treeData.tree.forEach((f) => {
          if (f.type === 'blob') remoteFiles[f.path] = f.sha;
        });
      }
    } catch (e) {
      logger.warn('Could not fetch existing tree, proceeding with full push', e);
    }

    const readDirRecursive = async (folderUrl: string, currentPath = ''): Promise<LocalFileEntry[]> => {
      const list = await fsOperation(folderUrl).lsDir();
      let files: LocalFileEntry[] = [];

      for (const item of list) {
        if (item.name === '.git' || item.name === 'node_modules') continue;

        const relativePath = currentPath ? `${currentPath}/${item.name}` : item.name;

        if (item.isDirectory) {
          const subFiles = await readDirRecursive(item.url, relativePath);
          files = files.concat(subFiles);
        } else {
          try {
            const content = await fsOperation(item.url).readFile('utf-8');
            const cleanContent = content.replace(/\r\n/g, '\n');

            const remoteSha = remoteFiles[relativePath];
            if (remoteSha) {
              const encoder = new TextEncoder();
              const data = encoder.encode(cleanContent);
              const header = `blob ${data.length}\0`;
              const fullBuffer = new Uint8Array(header.length + data.length);
              fullBuffer.set(encoder.encode(header), 0);
              fullBuffer.set(data, header.length);

              const hashBuffer = await crypto.subtle.digest('SHA-1', fullBuffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const localSha = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

              if (localSha === remoteSha) {
                continue;
              }
            }

            files.push({
              path: relativePath,
              content: cleanContent
            });
          } catch (readErr) {
            logger.warn(`Skipping unreadable or binary file: ${relativePath}`, readErr);
          }
        }
      }
      return files;
    };

    let allFiles = await readDirRecursive(dest.url);

    if (allFiles.length === 0) {
      fluentAlert('Info', 'Everything is up-to-date. No changed files found to push.');
      return;
    }

    const review = await fluentConfirm({
      title: 'Review Changes',
      message: `Found ${allFiles.length} file(s) changed locally. Do you want to review diffs before pushing?`,
      confirmText: 'Review Diffs',
      cancelText: 'Skip Review'
    });

    if (review) {
      const filesToPush: LocalFileEntry[] = [];
      for (const f of allFiles) {
        const remoteSha = remoteFiles[f.path];
        let remoteContent = '';
        if (remoteSha) {
          showToast(`Fetching remote for ${f.path}...`, 'info', 1000);
          const blob = await manager.api.downloadBlob(repo.owner.login, repo.name, remoteSha, false);
          remoteContent = typeof blob === 'string' ? blob : new TextDecoder('utf-8').decode(blob);
        }

        const choice = await showDiffViewer(f.path, f.content, remoteContent);

        if (choice === 'local') {
          filesToPush.push(f);
        } else if (choice === 'remote') {
        } else {
          showToast('Push cancelled.', 'info', 2000);
          return;
        }
      }

      allFiles = filesToPush;
      if (allFiles.length === 0) {
        showToast('No files approved for pushing.', 'info', 2000);
        return;
      }
    }

    const confirmFinal = await fluentConfirm({
      title: 'Push to GitHub',
      message: `Push ${allFiles.length} file(s) to branch "${branch}" on repository ${repo.owner.login}/${repo.name}?`,
      confirmText: 'Push Now'
    });
    if (!confirmFinal) return;

    showToast(`Committing ${allFiles.length} changed files...`, 'info', 2000);

    await manager.api.commitMultipleFiles(repo.owner.login, repo.name, branch, message, allFiles);
    showToast('Pushed successfully to GitHub!', 'success');
  } catch (err: any) {
    logger.error('Push failed:', err);
    fluentAlert('Push Failed', err.message || String(err));
  }
}
