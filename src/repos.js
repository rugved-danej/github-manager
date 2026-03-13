export class RepoManager {
  constructor(api) {
    this.api = api;
    this.repos = [];
    this.currentRepo = null; 
    this.currentPath = '';
    this.currentBranch = '';
    this.currentPage = 1;
    this.searchQuery = '';
  }

  setApi(api) { this.api = api; }

  async render(container) {
    container.innerHTML = `
      <div id="repo-header" class="gh-mb-10" style="display:none; gap: 6px; flex-direction: column;">
        <div style="display: flex; gap: 6px;">
          <button id="btn-repo-back" class="gh-btn gh-btn-secondary" style="flex: 1; padding: 6px 4px;">← Back</button>
        </div>
        <select id="repo-branch-select" class="gh-input" style="margin-bottom: 0; padding: 4px;"></select>
      </div>

      <div id="repo-main-actions">
        <button id="btn-create-repo" class="gh-btn gh-btn-block gh-btn-success gh-mb-10">New Repository</button>
        <input type="search" id="repo-search" class="gh-input" placeholder="Search repositories...">
      </div>

      <div id="repos-list" class="gh-text-muted">Loading repositories...</div>
      
      <div id="repo-load-more" class="gh-load-more">
        <button id="btn-repo-more" class="gh-btn gh-btn-block gh-btn-secondary">Load More</button>
      </div>
    `;

    this.currentPage = 1;
    this.currentRepo = null;
    this.currentPath = '';
    this.currentBranch = '';
    this.searchQuery = '';
    
    container.querySelector('#btn-repo-back').onclick = () => this.handleBack();
    container.querySelector('#btn-create-repo').onclick = () => this.handleCreateRepo();
    container.querySelector('#repo-branch-select').onchange = (e) => this.switchBranch(e.target.value);
    
    container.querySelector('#repo-search').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderRepos(); 
    });

    container.querySelector('#btn-repo-more').onclick = () => {
      this.currentPage++;
      const loadMoreBtn = container.querySelector('#btn-repo-more');
      loadMoreBtn.textContent = 'Loading...';
      this.loadRepos(true).then(() => { loadMoreBtn.textContent = 'Load More'; });
    };

    this.loadRepos();
  }

  async loadRepos(append = false) {
    const list = document.getElementById('repos-list');
    if (!list) return;

    try {
      if (!append) list.innerHTML = '<p class="gh-text-muted">Fetching repositories...</p>';
      
      const data = await this.api.getRepos(this.currentPage, 100);
      if (append) this.repos.push(...data); else this.repos = data;
      
      const loadMoreContainer = document.getElementById('repo-load-more');
      if (loadMoreContainer) loadMoreContainer.style.display = data.length === 100 ? 'block' : 'none';
      
      this.renderRepos();
    } catch (err) {
      if (!append) list.innerHTML = `<p class="gh-text-muted" style="color: #f85149;">Error: ${err.message}</p>`;
    }
  }

  renderRepos() {
    const list = document.getElementById('repos-list');
    if (!list) return;
    
    const filteredRepos = this.repos.filter(r => r.name.toLowerCase().includes(this.searchQuery));

    if (filteredRepos.length === 0) {
      list.innerHTML = '<p class="gh-text-muted">No repositories match your search.</p>';
      return;
    }

    list.innerHTML = '';
    filteredRepos.forEach(repo => {
      const item = document.createElement('div');
      item.className = 'gh-gist-card'; 
      
      const badgeClass = repo.private ? 'gh-badge-private' : 'gh-badge-public';
      const canAdmin = repo.permissions && repo.permissions.admin;
      
      item.innerHTML = `
        <div class="gh-gist-header">
          <span class="gh-gist-title browse-repo" style="cursor: pointer; text-decoration: underline;" title="Click to browse files">${repo.name}</span>
          <span class="gh-badge ${badgeClass}">${repo.private ? 'Private' : 'Public'}</span>
        </div>
        <p class="gh-gist-desc" style="margin-bottom: 8px;">${repo.description || 'No description provided.'}</p>
        <p class="gh-gist-desc">🟡 ${repo.language || 'Plain Text'} • ⭐ ${repo.stargazers_count}</p>
        
        <div class="gh-gist-actions">
          <button class="gh-gist-action-btn gh-btn gh-btn-secondary clone-repo" title="Clone to Device">📥 Clone</button>
          <button class="gh-gist-action-btn gh-btn gh-btn-success push-local-repo" title="Push Local Folder">🚀 Push</button>
          ${canAdmin ? '<button class="gh-gist-action-btn gh-btn gh-btn-danger delete-repo" title="Delete Repo">🗑️ Delete</button>' : ''}
        </div>
      `;
      
      list.appendChild(item);

      item.querySelector('.browse-repo').onclick = () => this.openRepo(repo.owner.login, repo.name, '', repo.default_branch);
      item.querySelector('.clone-repo').onclick = () => this.handleCloneRepo(repo);
      item.querySelector('.push-local-repo').onclick = () => this.handlePushLocal(repo);
      
      if (canAdmin) {
        item.querySelector('.delete-repo').onclick = () => this.handleDeleteRepo(repo.owner.login, repo.name);
      }
    });
  }

  async getIgnoreRules(rootUrl) {
    const fsOperation = acode.require('fsOperation');
    let ignoreRegexes = [];
    try {
      const gitignoreUrl = rootUrl + (rootUrl.endsWith('/') ? '' : '/') + '.gitignore';
      const gitignoreContent = await fsOperation(gitignoreUrl).readFile('utf8');
      
      ignoreRegexes = gitignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
           let r = line.replace(/[-[\]{}()+.,\\^$|#\s]/g, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
           if (r.startsWith('/')) {
             r = '^' + r.substring(1);
           } else {
             r = '(^|/)' + r;
           }
           if (r.endsWith('/')) {
             r = r.substring(0, r.length - 1) + '(/.*)?$';
           } else {
             r = r + '(/.*)?$';
           }
           return new RegExp(r);
        });
    } catch(e) {
    }
    return ignoreRegexes;
  }

  async handleCreateRepo() {
    const name = await acode.prompt('Repository Name', 'new-acode-repo');
    if (!name) return; 
    
    const description = await acode.prompt('Description', 'Created via Acode');
    if (description === null) return;

    const visibility = await acode.select('Visibility', [['public', 'Public'], ['private', 'Private']]);
    if (!visibility) return;

    try {
      window.toast('Creating repository...', 2000);
      const newRepo = await this.api.createRepo(name, description, visibility === 'private', true);
      this.repos.unshift(newRepo);
      this.renderRepos();
      window.toast('Repository created!', 3000);

      const addCode = await acode.confirm('Starting Code', 'Do you want to initialize this repository with code from a local folder?');
      if (addCode) {
        const fileBrowser = acode.require('fileBrowser');
        const fsOperation = acode.require('fsOperation');
        const dest = await fileBrowser('folder', 'Select the local folder');
        if (!dest || !dest.url) return;

        window.toast('Reading local folder...', 2000);
        
        const ignoreRules = await this.getIgnoreRules(dest.url);

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
          await this.api.commitMultipleFiles(newRepo.owner.login, newRepo.name, branch, 'Initial commit from Acode', allFiles);
          window.toast('Code pushed successfully!', 3000);
        }
      }
    } catch (err) { acode.alert('Error', err.message); }
  }

  async handleDeleteRepo(owner, repoName) {
    const confirm = await acode.prompt('Delete Repository', '', 'text', { placeholder: `Type "${repoName}" to confirm deletion. THIS CANNOT BE UNDONE.` });
    if (confirm !== repoName) {
      if (confirm !== null) window.toast('Repository name did not match. Cancelled.', 3000);
      return;
    }

    try {
      window.toast('Deleting repository...', 2000);
      await this.api.deleteRepo(owner, repoName);
      this.repos = this.repos.filter(r => !(r.name === repoName && r.owner.login === owner));
      this.renderRepos();
      window.toast('Repository deleted!', 3000);
    } catch (err) { acode.alert('Error', err.message); }
  }

  async handleCloneRepo(repo) {
    const fileBrowser = acode.require('fileBrowser');
    const fsOperation = acode.require('fsOperation');
    
    try {
      const dest = await fileBrowser('folder', `Select location to clone ${repo.name}`);
      if (!dest || !dest.url) return;

      window.toast('Fetching repository structure...', 2000);
      const branch = repo.default_branch || 'main';
      const treeData = await this.api.getTree(repo.owner.login, repo.name, branch);
      
      if (!treeData || !treeData.tree) throw new Error('Empty or invalid repository');

      const repoFolderUrl = dest.url + (dest.url.endsWith('/') ? '' : '/') + repo.name;
      const rootFs = fsOperation(dest.url);
      
      try {
        await rootFs.createDirectory(repo.name);
      } catch (e) {
        const confirm = await acode.confirm('Folder Exists', `The folder "${repo.name}" already exists. Proceed to overwrite files?`);
        if (!confirm) return;
      }

      const items = treeData.tree;
      const dirs = items.filter(item => item.type === 'tree').sort((a, b) => a.path.length - b.path.length);
      const files = items.filter(item => item.type === 'blob');

      window.toast('Creating folders...', 2000);
      for (let dir of dirs) {
        const parts = dir.path.split('/');
        const dirName = parts.pop();
        const parentPath = parts.join('/');
        const parentUrl = parentPath ? `${repoFolderUrl}/${parentPath}` : repoFolderUrl;
        
        try {
          await fsOperation(parentUrl).createDirectory(dirName);
        } catch(e) {} 
      }

      window.toast(`Downloading ${files.length} files...`, 2000);
      let count = 0;
      
      const downloadFile = async (file) => {
        const isBinary = file.path.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4|ttf|woff|woff2|eot)$/i);
        const content = await this.api.downloadBlob(repo.owner.login, repo.name, file.sha, !!isBinary);
        
        const parts = file.path.split('/');
        const fileName = parts.pop();
        const parentPath = parts.join('/');
        const parentUrl = parentPath ? `${repoFolderUrl}/${parentPath}` : repoFolderUrl;
        
        await fsOperation(parentUrl).createFile(fileName, content);
        
        count++;
        if (count % 5 === 0 || count === files.length) {
          window.toast(`Cloned ${count}/${files.length} files...`, 1000);
        }
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

      window.toast(`Cloned ${repo.name} successfully!`, 3000);
      acode.alert(
        'Clone Complete', 
        `Repository has been cloned successfully to your device:\n\n📁 ${dest.name}/${repo.name}\n\nTo view and edit it, please open this folder from your File Browser / Workspace.`
      );
      
    } catch (err) {
      acode.alert('Clone Failed', err.message);
    }
  }

  async handlePushLocal(repo) {
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

      window.toast('Reading local folder...', 2000);
      
      const ignoreRules = await this.getIgnoreRules(dest.url);
      
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
              files.push({ path: itemPath, content });
            } catch (e) {
              console.error('Skipping unreadable file:', itemPath);
            }
          }
        }
        return files;
      };

      const allFiles = await readDirRecursive(dest.url);
      
      if (allFiles.length === 0) {
        acode.alert('Info', 'No valid text files found to push.');
        return;
      }

      window.toast(`Committing ${allFiles.length} files...`, 2000);
      const branch = repo.default_branch || 'main';
      
      await this.api.commitMultipleFiles(repo.owner.login, repo.name, branch, message, allFiles);
      window.toast('Pushed successfully!', 3000);
      
    } catch (err) {
      acode.alert('Push Failed', err.message);
    }
  }

  async switchBranch(newBranch) {
    this.currentBranch = newBranch;
    this.openRepo(this.currentRepo.owner, this.currentRepo.repo, '', newBranch);
  }

  async loadBranches(owner, repo) {
    try {
      const branches = await this.api.getBranches(owner, repo);
      const select = document.getElementById('repo-branch-select');
      select.innerHTML = branches.map(b => `<option value="${b.name}" ${b.name === this.currentBranch ? 'selected' : ''}>${b.name}</option>`).join('');
    } catch (err) {}
  }

  async openRepo(owner, repo, path = '', branch = '') {
    if (!this.currentRepo || this.currentRepo.repo !== repo) {
      this.currentRepo = { owner, repo };
      this.currentBranch = branch || 'main';
      document.getElementById('repo-header').style.display = 'flex';
      document.getElementById('repo-main-actions').style.display = 'none';
      document.getElementById('repo-load-more').style.display = 'none';
      this.loadBranches(owner, repo); 
    }

    this.currentPath = path;
    const list = document.getElementById('repos-list');
    list.innerHTML = '<p class="gh-text-muted">Loading contents...</p>';

    try {
      const contents = await this.api.getRepoContents(owner, repo, path, this.currentBranch);
      list.innerHTML = '';
      
      contents.sort((a, b) => (b.type === 'dir') - (a.type === 'dir')).forEach(item => {
        const div = document.createElement('div');
        div.className = 'gh-gist-file';
        const isDir = item.type === 'dir';
        
        div.innerHTML = `
          <span class="gh-gist-file-name" title="${item.name}" style="cursor: pointer;">${isDir ? '📁' : '📄'} ${item.name}</span>
          ${isDir ? '' : `
          <div class="gh-gist-file-actions">
            <button class="gh-btn-icon gh-btn-icon-primary open-file" title="Open in Acode">Open</button>
          </div>
          `}
        `;
        
        div.querySelector('.gh-gist-file-name').onclick = () => {
          if (isDir) this.openRepo(owner, repo, item.path, this.currentBranch);
          else this.openFile(item);
        };

        if (!isDir) {
          div.querySelector('.open-file').onclick = () => this.openFile(item);
        }
        
        list.appendChild(div);
      });
    } catch (err) { list.innerHTML = `<p class="gh-text-muted" style="color: #f85149;">Error loading path. (Empty repository?)</p>`; }
  }

  async openFile(item) {
    if (item.name.match(/\.(png|jpe?g|gif|ico|zip|pdf|exe|bin|apk|mp3|mp4)$/i)) {
      acode.alert('Error', 'Cannot open binary files in the editor.');
      return;
    }

    try {
      window.toast('Downloading...', 2000);
      const res = await fetch(item.download_url);
      const text = await res.text();
      acode.newEditorFile(item.name, { text, isUnsaved: false, render: true });
      window.toast(`Opened ${item.name}`, 2000);
    } catch (err) { acode.alert('Error', 'Could not download file'); }
  }

  handleBack() {
    if (this.currentPath === '') {
      this.currentRepo = null;
      document.getElementById('repo-header').style.display = 'none';
      document.getElementById('repo-main-actions').style.display = 'block';
      this.renderRepos();
      
      const loadMoreContainer = document.getElementById('repo-load-more');
      if (loadMoreContainer) loadMoreContainer.style.display = (this.repos.length > 0 && this.repos.length % 100 === 0) ? 'block' : 'none';
    } else {
      const parts = this.currentPath.split('/');
      parts.pop();
      this.openRepo(this.currentRepo.owner, this.currentRepo.repo, parts.join('/'), this.currentBranch);
    }
  }
}
