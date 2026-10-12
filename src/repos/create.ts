import type { RepoManager } from './manager';
import type { LocalFileEntry } from '../types/plugin';

export async function handleCreateRepo(manager: RepoManager): Promise<void> {
  if (!manager.api) {
    acode.alert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const name = await acode.prompt('Repository Name', 'new-acode-repo');
  if (!name) return;

  const description = await acode.prompt('Description', 'Created via Acode');
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
    window.toast('Creating repository...', 2000);
    const newRepo = await manager.api.createRepo(name, description, visibility === 'private', true, targetOrg);
    manager.repos.unshift(newRepo);
    manager.renderRepos();
    window.toast('Repository created!', 3000);

    const addCode = await acode.confirm(
      'Starting Code',
      'Do you want to initialize this repository with code from a local folder?'
    );
    if (addCode) {
      const fileBrowser = acode.require('fileBrowser');
      const fsOperation = acode.require('fsOperation');
      const dest = await fileBrowser('folder', 'Select the local folder');
      if (!dest || !dest.url) return;

      window.toast('Reading local folder...', 2000);

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
            } catch (e) {}
          }
        }
        return files;
      };

      const allFiles = await readDirRecursive(dest.url);

      if (allFiles.length > 0) {
        window.toast(`Committing ${allFiles.length} files...`, 2000);
        const branch = newRepo.default_branch || 'main';
        await manager.api.commitMultipleFiles(
          newRepo.owner.login,
          newRepo.name,
          branch,
          'Initial commit from Acode',
          allFiles
        );
        window.toast('Code pushed successfully!', 3000);
      }
    }
  } catch (err: any) {
    acode.alert('Error', err.message || String(err));
  }
}
