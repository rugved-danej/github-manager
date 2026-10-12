import { fluentConfirm, fluentPrompt, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';
import type { RepoManager } from './manager';
import type { LocalFileEntry } from '../types/plugin';

export async function handleCreateRepo(manager: RepoManager): Promise<void> {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const name = await fluentPrompt({
    title: 'Repository Name',
    defaultValue: 'new-acode-repo',
    placeholder: 'Enter repository name...'
  });
  if (!name) return;

  const description = await fluentPrompt({
    title: 'Repository Description',
    defaultValue: 'Created via Acode',
    placeholder: 'Enter repository description...'
  });
  if (description === null) return;

  const visibility = await acode.select('Visibility', [
    ['public', 'Public'],
    ['private', 'Private']
  ]);
  if (!visibility) return;

  let targetOrg = manager.selectedOrg || undefined;
  if (manager.orgs && manager.orgs.length > 0) {
    const ownerOptions: [string, string][] = [
      ['personal', `Personal (@${manager.currentUser?.login || 'user'})`]
    ];
    manager.orgs.forEach((o) => {
      ownerOptions.push([o.login, `Organization: ${o.login}`]);
    });
    const chosenOwner = await acode.select('Repository Owner', ownerOptions);
    if (!chosenOwner) return;
    targetOrg = chosenOwner === 'personal' ? undefined : chosenOwner;
  }

  try {
    showToast('Creating repository...', 'info', 2000);
    const newRepo = await manager.api.createRepo(name, description, visibility === 'private', true, targetOrg);
    manager.repos.unshift(newRepo);
    manager.renderRepos();
    showToast('Repository created!', 'success');

    const addCode = await fluentConfirm({
      title: 'Initialize with Code?',
      message: 'Do you want to initialize this repository with code from a local folder?',
      confirmText: 'Select Folder',
      cancelText: 'Skip'
    });
    if (addCode) {
      const fileBrowser = acode.require('fileBrowser');
      const fsOperation = acode.require('fsOperation');
      const dest = await fileBrowser('folder', 'Select the local folder');
      if (!dest || !dest.url) return;

      showToast('Reading local folder...', 'info', 2000);

      const ignoreRules = await manager.getIgnoreRules(dest.url);

      const readDirRecursive = async (url: string, basePath = ''): Promise<LocalFileEntry[]> => {
        let files: LocalFileEntry[] = [];
        const dir = await fsOperation(url).lsDir();
        for (const item of dir) {
          if (item.name === '.git' || item.name === '.gh-manager-sync.json') continue;

          const itemPath = basePath ? `${basePath}/${item.name}` : item.name;

          if (ignoreRules.some((rx) => rx.test(itemPath))) continue;

          if (item.isDirectory) {
            files = files.concat(await readDirRecursive(item.url, itemPath));
          } else {
            if (item.name.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot)$/i)) {
              continue;
            }
            try {
              const content = await fsOperation(item.url).readFile('utf-8');
              files.push({ path: itemPath, content });
            } catch (e) {
              logger.warn(`Could not read file ${itemPath}:`, e);
            }
          }
        }
        return files;
      };

      const allFiles = await readDirRecursive(dest.url);

      if (allFiles.length > 0) {
        showToast(`Committing ${allFiles.length} files...`, 'info', 2000);
        const branch = newRepo.default_branch || 'main';
        await manager.api.commitMultipleFiles(
          newRepo.owner.login,
          newRepo.name,
          branch,
          'Initial commit from Acode',
          allFiles
        );
        showToast('Code pushed successfully!', 'success');
      }
    }
  } catch (err: any) {
    logger.error('Failed to create repository:', err);
    fluentAlert('Error', err.message || String(err));
  }
}
