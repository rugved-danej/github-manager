export async function handleCreateRepo(manager) {
  const name = await acode.prompt('Repository Name', 'new-acode-repo');
  if (!name) return; 
  
  const description = await acode.prompt('Description', 'Created via Acode');
  if (description === null) return;

  const visibility = await acode.select('Visibility', [['public', 'Public'], ['private', 'Private']]);
  if (!visibility) return;

  try {
    window.toast('Creating repository...', 2000);
    const newRepo = await manager.api.createRepo(name, description, visibility === 'private', true);
    manager.repos.unshift(newRepo);
    manager.renderRepos();
    window.toast('Repository created!', 3000);

    const addCode = await acode.confirm('Starting Code', 'Do you want to initialize this repository with code from a local folder?');
    if (addCode) {
      const fileBrowser = acode.require('fileBrowser');
      const fsOperation = acode.require('fsOperation');
      const dest = await fileBrowser('folder', 'Select the local folder');
      if (!dest || !dest.url) return;

      window.toast('Reading local folder...', 2000);
      
      const ignoreRules = await manager.getIgnoreRules(dest.url);

      const readDirRecursive = async (url, basePath = '') => {
        let files = [];
        const dir = await fsOperation(url).lsDir();
        for (let item of dir) {
          if (item.name === '.git' || item.name === '.gh-manager-sync.json') continue;
          
          const itemPath = basePath ? `${basePath}/${item.name}` : item.name;
          
          if (ignoreRules.some(rx => rx.test(itemPath))) continue;

          if (item.isDirectory) {
            files = files.concat(await readDirRecursive(item.url, itemPath));
          } else {
            if (item.name.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot)$/i)) continue;
            try {
              const content = await fsOperation(item.url).readFile('utf8');
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
        await manager.api.commitMultipleFiles(newRepo.owner.login, newRepo.name, branch, 'Initial commit from Acode', allFiles);
        window.toast('Code pushed successfully!', 3000);
      }
    }
  } catch (err) { acode.alert('Error', err.message); }
}
