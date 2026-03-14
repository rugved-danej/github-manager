import { getFileIcon, tablerIcons, getRepoLanguageIcon } from '../icons.js';
import { handleCreateRepo } from './create.js';
import { handleCloneRepo } from './clone.js';
import { handleDeleteRepo } from './delete.js';
import { handlePushLocal } from './push.js';
import { handlePullLocal } from './pull.js';
import { openRepo, openFile, switchBranch, loadBranches, handleCreateBranch, handleDeleteBranch } from './browse.js';

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

  setApi(api) { 
    this.api = api; 
  }

  async render(container) {
    container.innerHTML = `
      <div id="repo-header" class="gh-mb-10" style="display:none; gap: 6px; flex-direction: column;">
        <div style="display: flex; gap: 6px;">
          <button id="btn-repo-back" class="gh-btn gh-btn-secondary" style="flex: 1; padding: 6px 4px;">← Back</button>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <select id="repo-branch-select" class="gh-input" style="margin-bottom: 0; padding: 4px; flex: 1;"></select>
          <button id="btn-create-branch" class="gh-btn gh-btn-success" style="padding: 4px 8px;" title="New Branch from current">+</button>
          <button id="btn-delete-branch" class="gh-btn gh-btn-danger" style="padding: 4px 8px;" title="Delete Current Branch">${tablerIcons.trash}</button>
        </div>
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
    container.querySelector('#btn-create-branch').onclick = () => this.handleCreateBranch();
    container.querySelector('#btn-delete-branch').onclick = () => this.handleDeleteBranch();
    
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
    
    const appSettings = acode.require('settings');
    const settings = appSettings.value['dev.rugved.githubmanager'] || { showPrivate: true };
    let filteredRepos = this.repos.filter(r => r.name.toLowerCase().includes(this.searchQuery));
    
    if (settings.showPrivate === false) {
        filteredRepos = filteredRepos.filter(r => !r.private);
    }

    if (filteredRepos.length === 0) {
      list.innerHTML = '<p class="gh-text-muted">No repositories match your search.</p>';
      return;
    }

    const pinnedNames = JSON.parse(localStorage.getItem('gh_pinned_repos') || '[]');
    const pinnedRepos = filteredRepos.filter(r => pinnedNames.includes(r.name));
    const unpinnedRepos = filteredRepos.filter(r => !pinnedNames.includes(r.name));
    const orderedRepos = [...pinnedRepos, ...unpinnedRepos];

    list.innerHTML = '';
    orderedRepos.forEach(repo => {
      const item = document.createElement('div');
      item.className = 'gh-gist-card'; 
      item.setAttribute('data-repo-name', repo.name);
      
      const badgeClass = repo.private ? 'gh-badge-private' : 'gh-badge-public';
      const canAdmin = repo.permissions && repo.permissions.admin;
      const isPinned = pinnedNames.includes(repo.name);
      
      item.innerHTML = `
        <div class="gh-gist-header">
          <span class="gh-gist-title browse-repo" style="cursor: pointer; text-decoration: underline;" title="Click to browse files">${isPinned ? `${tablerIcons.pin} ` : ''}${repo.name}</span>
          <span class="gh-badge ${badgeClass}">${repo.private ? 'Private' : 'Public'}</span>
        </div>
        <p class="gh-gist-desc" style="margin-bottom: 8px;">${repo.description || 'No description provided.'}</p>
        <p class="gh-gist-desc" style="display: flex; align-items: center; gap: 4px;">${getRepoLanguageIcon(repo.language)} ${repo.language || 'Plain Text'} • ${tablerIcons.star} ${repo.stargazers_count}</p>
        
        <div class="gh-gist-actions">
          <button class="gh-gist-action-btn gh-btn gh-btn-secondary toggle-pin" title="${isPinned ? 'Unpin' : 'Pin'}">${tablerIcons.pin} ${isPinned ? 'Unpin' : 'Pin'}</button>
          <button class="gh-gist-action-btn gh-btn gh-btn-secondary clone-repo" title="Clone to Device">${tablerIcons.download} Clone</button>
          <button class="gh-gist-action-btn gh-btn gh-btn-secondary pull-local-repo" title="Pull Remote Changes">${tablerIcons.pull} Pull</button>
          <button class="gh-gist-action-btn gh-btn gh-btn-success push-local-repo" title="Push Local Folder">${tablerIcons.rocket} Push</button>
          <button class="gh-gist-action-btn gh-btn gh-btn-secondary copy-repo-url" data-url="${repo.html_url}" title="Copy Repo URL">${tablerIcons.copy} Copy</button>
          ${canAdmin ? `<button class="gh-gist-action-btn gh-btn gh-btn-danger delete-repo" title="Delete Repo">${tablerIcons.trash} Delete</button>` : ''}
        </div>
      `;
      
      list.appendChild(item);

      item.querySelector('.toggle-pin').onclick = () => {
          let pins = JSON.parse(localStorage.getItem('gh_pinned_repos') || '[]');
          if (pins.includes(repo.name)) pins = pins.filter(p => p !== repo.name);
          else pins.push(repo.name);
          localStorage.setItem('gh_pinned_repos', JSON.stringify(pins));
          this.renderRepos();
      };
      
      item.querySelector('.browse-repo').onclick = () => this.openRepo(repo.owner.login, repo.name, '', repo.default_branch);
      item.querySelector('.clone-repo').onclick = () => this.handleCloneRepo(repo);
      item.querySelector('.pull-local-repo').onclick = () => this.handlePullLocal(repo);
      item.querySelector('.push-local-repo').onclick = () => this.handlePushLocal(repo);
      
      item.querySelector('.copy-repo-url').onclick = (e) => {
        const url = e.currentTarget.dataset.url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url);
        } else if (window.cordova && window.cordova.plugins && window.cordova.plugins.clipboard) {
          window.cordova.plugins.clipboard.copy(url);
        }
        window.toast('URL Copied!', 2000);
      };

      if (canAdmin) {
        item.querySelector('.delete-repo').onclick = () => this.handleDeleteRepo(repo.owner.login, repo.name);
      }
    });
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
    } catch(e) {}
    return ignoreRegexes;
  }

  async handleCreateRepo() { return handleCreateRepo(this); }
  async handleCloneRepo(repo) { return handleCloneRepo(this, repo); }
  async handleDeleteRepo(owner, repoName) { return handleDeleteRepo(this, owner, repoName); }
  async handlePullLocal(repo) { return handlePullLocal(this, repo); }
  async handlePushLocal(repo) { return handlePushLocal(this, repo); }
  
  async openRepo(owner, repo, path = '', branch = '') { return openRepo(this, owner, repo, path, branch); }
  async openFile(item) { return openFile(this, item); }
  async switchBranch(newBranch) { return switchBranch(this, newBranch); }
  async loadBranches(owner, repo) { return loadBranches(this, owner, repo); }
  
  async handleCreateBranch() { return handleCreateBranch(this); }
  async handleDeleteBranch() { return handleDeleteBranch(this); }
}
