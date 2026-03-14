export async function handlePushLocal(manager, repo) {
  const fileBrowser = acode.require('fileBrowser');
  const fsOperation = acode.require('fsOperation');
  
  try {
    const dest = await fileBrowser('folder', `Select the local folder for ${repo.name} to push`);
    if (!dest || !dest.url) return;

    const gitConfigUrl = dest.url + (dest.url.endsWith('/') ? '' : '/') + '.git/config';
    try {
      const gitConfigContent = await fsOperation(gitConfigUrl).readFile('utf8');
      const expectedRepoString = `${repo.owner.login}/${repo.name}`.toLowerCase();
      
      if (!gitConfigContent.toLowerCase().includes(expectedRepoString)) {
        acode.alert('Push Blocked', `Folder Mismatch! The .git/config does not belong to ${repo.owner.login}/${repo.name}.`);
        return;
      }
    } catch (e) {
      acode.alert('Push Blocked', 'This folder is not a valid repository. Missing .git/config file.');
      return;
    }

    const message = await acode.prompt('Commit Message', `Update ${repo.name} from Acode`);
    if (!message) return;

    window.toast('Preparing Delta Sync...', 2000);
    
    const branch = repo.default_branch || 'main';
    let remoteFiles = {};
    
    try {
      const treeData = await manager.api.getTree(repo.owner.login, repo.name, branch);
      if (treeData && treeData.tree) {
        treeData.tree.forEach(f => {
          if (f.type === 'blob') remoteFiles[f.path] = f.sha;
        });
      }
    } catch (e) {}
    
    const ignoreRules = await manager.getIgnoreRules(dest.url);

    const calculateGitSha = async (content) => {
      if (!window.crypto || !window.crypto.subtle) return null;
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const header = encoder.encode(`blob ${data.length}\0`);
      const combined = new Uint8Array(header.length + data.length);
      combined.set(header);
      combined.set(data, header.length);
      const hashBuffer = await crypto.subtle.digest('SHA-1', combined);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };
    
    const readDirRecursive = async (url, basePath = '') => {
      let files = [];
      const dir = await fsOperation(url).lsDir();
      
      for (let item of dir) {
        if (item.name === '.git' || item.name === '.gh-manager-sync.json') continue; 
        
        const itemPath = basePath ? `${basePath}/${item.name}` : item.name;
        
        if (ignoreRules.some(rx => rx.test(itemPath))) continue;
        
        if (item.isDirectory) {
          const subFiles = await readDirRecursive(item.url, itemPath);
          files = files.concat(subFiles);
        } else {
          if (item.name.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot)$/i)) continue;
          try {
            const content = await fsOperation(item.url).readFile('utf8');
            const localSha = await calculateGitSha(content);
            
            if (!localSha || remoteFiles[itemPath] !== localSha) {
              files.push({ path: itemPath, content });
            }
          } catch (e) {}
        }
      }
      return files;
    };

    const allFiles = await readDirRecursive(dest.url);
    
    if (allFiles.length === 0) {
      acode.alert('Info', 'Everything is up-to-date. No changed files found to push.');
      return;
    }

    window.toast(`Committing ${allFiles.length} changed files...`, 2000);
    
    await manager.api.commitMultipleFiles(repo.owner.login, repo.name, branch, message, allFiles);
    window.toast('Pushed successfully!', 3000);
    
  } catch (err) {
    acode.alert('Push Failed', err.message);
  }
}
