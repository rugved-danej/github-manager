export async function handleCloneRepo(manager, repo) {
  const fileBrowser = acode.require('fileBrowser');
  const fsOperation = acode.require('fsOperation');
  const appSettings = acode.require('settings');
  
  const targetCard = document.querySelector(`.gh-gist-card[data-repo-name="${repo.name}"]`);

  try {
    const defaultDir = appSettings.value['dev.rugved.githubmanager']?.defaultCloneDir;
    let dest;
    
    if (defaultDir) {
      dest = { url: defaultDir };
    } else {
      dest = await fileBrowser('folder', `Select location to clone ${repo.name}`);
    }
    
    if (!dest || !dest.url) return;

    let repoName = repo.name;
    let repoFolderUrl = dest.url + (dest.url.endsWith('/') ? '' : '/') + repoName;
    let isUnique = false;

    while (!isUnique) {
      const exists = await fsOperation(repoFolderUrl).exists();
      if (exists) {
        const suggestion = `${repoName}-clone`;
        const newName = await acode.prompt('Folder exists', '', 'text', { placeholder: suggestion });

        if (newName === null) return;
        
        repoName = newName.trim() || suggestion;
        repoFolderUrl = dest.url + (dest.url.endsWith('/') ? '' : '/') + repoName;
      } else {
        isUnique = true;
      }
    }

    const progressContainer = document.createElement('div');
    progressContainer.className = 'gh-progress-wrapper';
    progressContainer.innerHTML = `
      <div class="gh-progress-text">Initializing...</div>
      <div class="gh-progress-bar-bg">
        <div class="gh-progress-bar-fill" style="width: 0%"></div>
      </div>
    `;
    if (targetCard) targetCard.appendChild(progressContainer);

    const updateUI = (text, percent) => {
      progressContainer.querySelector('.gh-progress-text').textContent = text;
      progressContainer.querySelector('.gh-progress-bar-fill').style.width = `${percent}%`;
    };

    updateUI('Fetching tree...', 5);
    const branch = repo.default_branch || 'main';
    const treeData = await manager.api.getTree(repo.owner.login, repo.name, branch);
    
    if (!treeData || !treeData.tree) throw new Error('Empty or invalid repository');

    await fsOperation(dest.url).createDirectory(repoName);

    const items = treeData.tree;
    const dirs = items.filter(item => item.type === 'tree').sort((a, b) => a.path.length - b.path.length);
    const files = items.filter(item => item.type === 'blob');

    updateUI('Creating folders...', 15);
    for (let dir of dirs) {
      const parts = dir.path.split('/');
      const dirName = parts.pop();
      const parentPath = parts.join('/');
      const parentUrl = parentPath ? `${repoFolderUrl}/${parentPath}` : repoFolderUrl;
      try { await fsOperation(parentUrl).createDirectory(dirName); } catch(e) {} 
    }

    let count = 0;
    const downloadFile = async (file) => {
      const isBinary = file.path.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot)$/i);
      const content = await manager.api.downloadBlob(repo.owner.login, repo.name, file.sha, !!isBinary);
      
      const parts = file.path.split('/');
      const fileName = parts.pop();
      const parentPath = parts.join('/');
      const parentUrl = parentPath ? `${repoFolderUrl}/${parentPath}` : repoFolderUrl;
      
      await fsOperation(parentUrl).createFile(fileName, content);
      
      count++;
      const percent = Math.floor(15 + ((count / files.length) * 80));
      updateUI(`Cloning: ${count}/${files.length} files`, percent);
    };

    const concurrency = 5;
    for (let i = 0; i < files.length; i += concurrency) {
      const chunk = files.slice(i, i + concurrency);
      await Promise.all(chunk.map(f => downloadFile(f)));
    }

    try {
      await fsOperation(repoFolderUrl).createDirectory('.git');
      const gitConfigContent = `[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/${repo.owner.login}/${repo.name}.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`;
      await fsOperation(`${repoFolderUrl}/.git`).createFile('config', gitConfigContent);
    } catch(e) {}

    updateUI('Clone Complete!', 100);
    setTimeout(() => progressContainer.remove(), 3000);
    acode.alert('Clone Complete', `Cloned successfully to:\n📁 ${repoName}`);
    
  } catch (err) {
    const existingProgress = targetCard?.querySelector('.gh-progress-wrapper');
    if (existingProgress) existingProgress.remove();
    acode.alert('Clone Failed', err.message);
  }
}
