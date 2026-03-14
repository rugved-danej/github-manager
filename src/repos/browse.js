import { getFileIcon } from '../icons.js';

export async function switchBranch(manager, newBranch) {
  manager.currentBranch = newBranch;
  manager.openRepo(manager.currentRepo.owner, manager.currentRepo.repo, '', newBranch); 
}

export async function loadBranches(manager, owner, repo) {
  try {
    const branches = await manager.api.getBranches(owner, repo);
    const select = document.getElementById('repo-branch-select');
    select.innerHTML = branches.map(b => `<option value="${b.name}" ${b.name === manager.currentBranch ? 'selected' : ''}>${b.name}</option>`).join('');
  } catch (err) {}
}

export async function openRepo(manager, owner, repo, path = '', branch = '') {
  if (!manager.currentRepo || manager.currentRepo.repo !== repo) {
    manager.currentRepo = { owner, repo, defaultBranch: branch || 'main' };
    manager.currentBranch = branch || 'main';
    document.getElementById('repo-header').style.display = 'flex';
    document.getElementById('repo-main-actions').style.display = 'none';
    document.getElementById('repo-load-more').style.display = 'none';
    manager.loadBranches(owner, repo); 
  }

  manager.currentPath = path;
  const list = document.getElementById('repos-list');
  list.innerHTML = '<p class="gh-text-muted">Loading contents...</p>';

  try {
    const contents = await manager.api.getRepoContents(owner, repo, path, manager.currentBranch);
    list.innerHTML = '';
    
    contents.sort((a, b) => (b.type === 'dir') - (a.type === 'dir')).forEach(item => {
      const div = document.createElement('div');
      div.className = 'gh-gist-file';
      const isDir = item.type === 'dir';
      
      div.innerHTML = `
        <span class="gh-gist-file-name" title="${item.name}" style="cursor: pointer;">   ${getFileIcon(item.name, isDir)}    <span>${item.name}</span> </span>
        ${isDir ? '' : `
        <div class="gh-gist-file-actions">
          <button class="gh-btn-icon gh-btn-icon-primary open-file" title="Open in Acode">Open</button>
        </div>
        `}
      `;
      
      div.querySelector('.gh-gist-file-name').onclick = () => {
        if (isDir) manager.openRepo(owner, repo, item.path, manager.currentBranch);
        else manager.openFile(item);
      };

      if (!isDir) {
        div.querySelector('.open-file').onclick = () => manager.openFile(item);
      }
      
      list.appendChild(div);
    });
  } catch (err) { list.innerHTML = `<p class="gh-text-muted" style="color: #f85149;">Error loading path. (Empty repository?)</p>`; }
}

export async function openFile(manager, item) {
  if (item.name.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot)$/i)) {
    acode.alert('Error', 'Cannot open binary files in the editor.');
    return;
  }

  try {
    window.toast('Downloading...', 2000);
    
    const text = await manager.api.downloadBlob(
      manager.currentRepo.owner,
      manager.currentRepo.repo,
      item.sha,
      false
    );
    
    acode.newEditorFile(item.name, { text, isUnsaved: false, render: true });
    window.toast(`Opened ${item.name}`, 2000);
  } catch (err) { 
    acode.alert('Error', 'Could not download file: ' + err.message); 
  }
}

export async function handleCreateBranch(manager) {
  if (!manager.currentRepo) return;
  
  const newBranch = await acode.prompt('New Branch Name', 'feature-branch');
  if (!newBranch) return;

  try {
    window.toast(`Branching off ${manager.currentBranch}...`, 2000);
    await manager.api.createBranch(manager.currentRepo.owner, manager.currentRepo.repo, manager.currentBranch, newBranch);
    
    window.toast('Branch created successfully!', 3000);
    
    await manager.loadBranches(manager.currentRepo.owner, manager.currentRepo.repo);
    manager.switchBranch(newBranch);
  } catch (err) {
    acode.alert('Error Creating Branch', err.message);
  }
}

export async function handleDeleteBranch(manager) {
  if (!manager.currentRepo) return;
  
  if (manager.currentBranch === 'main' || manager.currentBranch === 'master' || manager.currentBranch === manager.currentRepo.defaultBranch) {
    acode.alert('Action Blocked', `Cannot delete the default/base branch (${manager.currentBranch}) from the app.`);
    return;
  }

  const confirm = await acode.confirm('Delete Branch', `Are you sure you want to delete branch <b>${manager.currentBranch}</b>?`);
  if (!confirm) return;

  try {
    window.toast('Deleting branch...', 2000);
    await manager.api.deleteBranch(manager.currentRepo.owner, manager.currentRepo.repo, manager.currentBranch);
    window.toast('Branch deleted!', 3000);
    
    manager.switchBranch(manager.currentRepo.defaultBranch);
  } catch (err) {
    acode.alert('Error Deleting Branch', err.message);
  }
}
