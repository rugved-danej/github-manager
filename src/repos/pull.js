import { showDiffViewer } from './diff.js';

export async function handlePullLocal(manager, repo) {
  const fileBrowser = acode.require('fileBrowser');
  const fsOperation = acode.require('fsOperation');
  const targetCard = document.querySelector(`.gh-gist-card[data-repo-name="${repo.name}"]`);

  try {
    const dest = await fileBrowser('folder', `Select local folder to pull ${repo.name} into`);
    if (!dest || !dest.url) return;

    const gitConfigUrl = dest.url + (dest.url.endsWith('/') ? '' : '/') + '.git/config';
    try {
      const gitConfigContent = await fsOperation(gitConfigUrl).readFile('utf8');
      const expectedRepoString = `${repo.owner.login}/${repo.name}`.toLowerCase();
      
      if (!gitConfigContent.toLowerCase().includes(expectedRepoString)) {
        acode.alert('Pull Blocked', `Folder Mismatch! The .git/config does not belong to ${repo.owner.login}/${repo.name}.`);
        return;
      }
    } catch (e) {
      acode.alert('Pull Blocked', 'This folder is not a valid repository. Missing .git/config file.');
      return;
    }

    const progressContainer = document.createElement('div');
    progressContainer.className = 'gh-progress-wrapper';
    progressContainer.innerHTML = `
      <div class="gh-progress-text">Calculating differences...</div>
      <div class="gh-progress-bar-bg">
        <div class="gh-progress-bar-fill" style="width: 0%"></div>
      </div>
    `;
    if (targetCard) targetCard.appendChild(progressContainer);

    const updateUI = (text, percent) => {
      const textEl = progressContainer.querySelector('.gh-progress-text');
      const barEl = progressContainer.querySelector('.gh-progress-bar-fill');
      if (textEl) textEl.textContent = text;
      if (barEl) barEl.style.width = `${percent}%`;
    };

    const branch = repo.default_branch || 'main';
    const treeData = await manager.api.getTree(repo.owner.login, repo.name, branch);
    
    if (!treeData || !treeData.tree) throw new Error('Empty or invalid remote repository');

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

    const ignoreRules = await manager.getIgnoreRules(dest.url);
    let filesToDownload = [];
    let conflictFiles = [];
    const remoteFiles = treeData.tree.filter(f => f.type === 'blob');

    updateUI('Checking local files...', 10);

    for (let i = 0; i < remoteFiles.length; i++) {
      const f = remoteFiles[i];
      if (ignoreRules.some(rx => rx.test(f.path))) continue;

      const localFileUrl = dest.url + (dest.url.endsWith('/') ? '' : '/') + f.path;
      try {
        const isBinary = f.path.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot)$/i);
        if (isBinary) {
           filesToDownload.push(f);
           continue;
        }
        const content = await fsOperation(localFileUrl).readFile('utf8');
        const localSha = await calculateGitSha(content);
        
        if (localSha !== f.sha) {
          conflictFiles.push(f);
        }
      } catch (e) {
        filesToDownload.push(f);
      }
    }

    if (conflictFiles.length > 0) {
       progressContainer.remove();
       window.toast('Conflicts detected! Opening Diff Viewer...', 2000);

       for (let f of conflictFiles) {
           const localFileUrl = dest.url + (dest.url.endsWith('/') ? '' : '/') + f.path;
           const localContent = await fsOperation(localFileUrl).readFile('utf8');
           
           window.toast(`Fetching remote for ${f.path}...`, 1000);
           const remoteContent = await manager.api.downloadBlob(repo.owner.login, repo.name, f.sha, false);

           const choice = await showDiffViewer(f.path, localContent, remoteContent);

           if (choice === 'remote') {
               filesToDownload.push(f);
           } else if (choice === 'local') {
           } else {
               window.toast('Pull cancelled by user.', 2000);
               return; 
           }
       }
       if (targetCard) targetCard.appendChild(progressContainer);
    }

    if (filesToDownload.length === 0) {
      if(progressContainer.parentNode) progressContainer.remove();
      acode.alert('Info', 'Local folder is already up-to-date.');
      return;
    }

    updateUI(`Preparing to pull ${filesToDownload.length} files...`, 20);

    let count = 0;
    const downloadFile = async (file) => {
      const isBinary = file.path.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot)$/i);
      const content = await manager.api.downloadBlob(repo.owner.login, repo.name, file.sha, !!isBinary);
      
      const parts = file.path.split('/');
      const fileName = parts.pop();
      const parentPath = parts.join('/');
      
      const parentFolders = parentPath.split('/');
      let currentUrl = dest.url;
      
      for (let folder of parentFolders) {
        if (!folder) continue;
        try {
          await fsOperation(currentUrl).createDirectory(folder);
        } catch (e) {}
        currentUrl += (currentUrl.endsWith('/') ? '' : '/') + folder;
      }

      try {
         const fileUrl = currentUrl + (currentUrl.endsWith('/') ? '' : '/') + fileName;
         const exists = await fsOperation(fileUrl).exists();
         if (exists) {
           await fsOperation(fileUrl).writeFile(content);
         } else {
           await fsOperation(currentUrl).createFile(fileName, content);
         }
      } catch (e) {
         await fsOperation(currentUrl).createFile(fileName, content);
      }
      
      count++;
      const percent = Math.floor(20 + ((count / filesToDownload.length) * 80));
      updateUI(`Pulling: ${count}/${filesToDownload.length} files`, percent);
    };

    const concurrency = 5;
    for (let i = 0; i < filesToDownload.length; i += concurrency) {
      const chunk = filesToDownload.slice(i, i + concurrency);
      await Promise.all(chunk.map(f => downloadFile(f)));
    }

    updateUI('Pull Complete!', 100);
    setTimeout(() => { if(progressContainer.parentNode) progressContainer.remove(); }, 3000);
    window.toast(`Successfully pulled ${filesToDownload.length} files.`, 3000);

  } catch (err) {
    if (targetCard) {
      const existingProgress = targetCard.querySelector('.gh-progress-wrapper');
      if (existingProgress) existingProgress.remove();
    }
    acode.alert('Pull Failed', err.message);
  }
}
