import { lucideIcons, renderLanguageBadge } from '../ui/icons';
import { CustomSelectComponent } from '../ui/selectMenu';
import type { GitHubAPI } from '../api/github';
import type { GitHubRepo, RepoContext, GitHubContentItem, GitHubOrg, GitHubUser } from '../types/github';
import { handleCreateRepo } from './create';
import { handleCloneRepo } from './clone';
import { handleDeleteRepo } from './delete';
import { handlePushLocal } from './push';
import { handlePullLocal } from './pull';
import { openRepo, openFile } from './browse';
import { switchBranch, loadBranches, handleCreateBranch, handleDeleteBranch } from './branches';

export type RepoFilter = 'all' | 'pinned' | 'public' | 'private';

export class RepoManager {
  api: GitHubAPI | null;
  repos: GitHubRepo[];
  currentRepo: RepoContext | null;
  currentPath: string;
  currentBranch: string;
  currentPage: number;
  searchQuery: string;
  activeFilter: RepoFilter = 'all';

  currentUser: GitHubUser | null = null;
  orgs: GitHubOrg[] = [];
  selectedOrg: string | null = null;

  contextSelect: CustomSelectComponent | null = null;
  branchSelect: CustomSelectComponent | null = null;

  constructor(api: GitHubAPI | null) {
    this.api = api;
    this.repos = [];
    this.currentRepo = null;
    this.currentPath = '';
    this.currentBranch = '';
    this.currentPage = 1;
    this.searchQuery = '';
  }

  setApi(api: GitHubAPI | null): void {
    this.api = api;
  }

  setCurrentUser(user: GitHubUser | null): void {
    this.currentUser = user;
    this.updateContextSelect();
  }

  setOrgs(orgs: GitHubOrg[]): void {
    this.orgs = orgs;
    this.updateContextSelect();
  }

  updateContextSelect(): void {
    const contextWrap = document.getElementById('repo-context-dropdown-wrap');
    if (!contextWrap) return;
    const options = [
      { value: '', label: `Personal (@${this.currentUser?.login || 'me'})`, icon: lucideIcons.user },
      ...this.orgs.map((org) => ({ value: org.login, label: `Org: ${org.login}`, icon: lucideIcons.building }))
    ];
    if (this.contextSelect) {
      this.contextSelect.setOptions(options, this.selectedOrg || '');
    } else {
      this.contextSelect = new CustomSelectComponent({
        container: contextWrap,
        id: 'repo-context-select',
        prefixIcon: lucideIcons.building,
        options,
        selectedValue: this.selectedOrg || '',
        onChange: (val) => {
          this.selectedOrg = val || null;
          this.currentPage = 1;
          this.loadRepos();
        }
      });
    }
  }

  async render(container: HTMLElement): Promise<void> {
    container.innerHTML = `
      <!-- In-Repo Navigation Header -->
      <div id="repo-header" class="gh-repo-nav" style="display: none;">
        <div class="gh-nav-row" style="justify-content: space-between;">
          <button id="btn-repo-back" class="gh-btn gh-btn-secondary" style="padding: 4px 8px; font-size: 11px;">
            ${lucideIcons.back}
            <span>Back</span>
          </button>
          <div id="repo-breadcrumbs" class="gh-breadcrumbs"></div>
        </div>
        <div class="gh-branch-controls">
          <div id="repo-branch-dropdown-wrap" class="gh-custom-select-wrap" style="flex: 1; min-width: 0;"></div>
          <button id="btn-create-branch" class="gh-btn-icon gh-btn-icon-primary" title="Create New Branch">${lucideIcons.plus}</button>
          <button id="btn-delete-branch" class="gh-btn-icon gh-btn-icon-danger" title="Delete Branch">${lucideIcons.trash}</button>
        </div>
      </div>

      <!-- Main Repos Toolbar -->
      <div id="repo-main-actions">
        <button id="btn-create-repo" class="gh-btn gh-btn-block gh-btn-success" style="margin-bottom: 8px; padding: 7px 12px; font-weight: 600; font-size: 12px;">
          ${lucideIcons.plus}
          <span>New Repository</span>
        </button>

        <div class="gh-toolbar">
          <div class="gh-context-bar">
            <div id="repo-context-dropdown-wrap" class="gh-custom-select-wrap"></div>
          </div>

          <div class="gh-search-wrapper">
            <span class="gh-search-icon">${lucideIcons.search}</span>
            <input type="search" id="repo-search" class="gh-search-input" placeholder="Search repositories..." autocomplete="off" spellcheck="false">
            <button id="repo-search-clear" class="gh-search-clear" title="Clear search">${lucideIcons.x}</button>
          </div>
          <div class="gh-filter-chips">
            <button class="gh-chip ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="gh-chip ${this.activeFilter === 'pinned' ? 'active' : ''}" data-filter="pinned">Pinned</button>
            <button class="gh-chip ${this.activeFilter === 'public' ? 'active' : ''}" data-filter="public">Public</button>
            <button class="gh-chip ${this.activeFilter === 'private' ? 'active' : ''}" data-filter="private">Private</button>
          </div>
        </div>
      </div>

      <div id="repos-list" class="gh-text-muted">Loading repositories...</div>
      
      <div id="repo-load-more" class="gh-load-more" style="margin-top: 10px;">
        <button id="btn-repo-more" class="gh-btn gh-btn-block gh-btn-secondary">Load More Repositories</button>
      </div>
    `;

    this.currentPage = 1;
    this.currentRepo = null;
    this.currentPath = '';
    this.currentBranch = '';
    this.searchQuery = '';
    this.contextSelect = null;
    this.branchSelect = null;

    this.updateContextSelect();

    const backBtn = container.querySelector<HTMLElement>('#btn-repo-back');
    if (backBtn) backBtn.onclick = () => this.handleBack();

    const createRepoBtn = container.querySelector<HTMLElement>('#btn-create-repo');
    if (createRepoBtn) createRepoBtn.onclick = () => this.handleCreateRepo();

    const createBranchBtn = container.querySelector<HTMLElement>('#btn-create-branch');
    if (createBranchBtn) createBranchBtn.onclick = () => this.handleCreateBranch();

    const deleteBranchBtn = container.querySelector<HTMLElement>('#btn-delete-branch');
    if (deleteBranchBtn) deleteBranchBtn.onclick = () => this.handleDeleteBranch();

    const searchInput = container.querySelector<HTMLInputElement>('#repo-search');
    const searchClear = container.querySelector<HTMLElement>('#repo-search-clear');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase().trim();
        if (searchClear) searchClear.style.display = this.searchQuery ? 'inline-flex' : 'none';
        this.renderRepos();
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        searchClear.style.display = 'none';
        searchInput.focus();
        this.renderRepos();
      });
    }

    // Filter chip clicks
    container.querySelectorAll<HTMLElement>('.gh-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        container.querySelectorAll('.gh-chip').forEach((c) => c.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.activeFilter = (target.dataset.filter || 'all') as RepoFilter;
        this.renderRepos();
      });
    });

    const loadMoreBtn = container.querySelector<HTMLElement>('#btn-repo-more');
    if (loadMoreBtn) {
      loadMoreBtn.onclick = () => {
        this.currentPage++;
        loadMoreBtn.textContent = 'Loading...';
        this.loadRepos(true).then(() => {
          loadMoreBtn.textContent = 'Load More Repositories';
        });
      };
    }

    await this.loadRepos();
  }

  async loadRepos(append = false, silent = false): Promise<void> {
    const list = document.getElementById('repos-list');
    if (!list) return;

    if (!this.api) {
      if (!append) list.innerHTML = '<p class="gh-text-muted">Please login to view repositories.</p>';
      return;
    }

    try {
      if (!append && !silent) list.innerHTML = '<p class="gh-text-muted">Fetching repositories...</p>';

      const data = this.selectedOrg
        ? await this.api.getOrgRepos(this.selectedOrg, this.currentPage, 100)
        : await this.api.getRepos(this.currentPage, 100);

      if (append) this.repos.push(...data);
      else this.repos = data;

      // Update badge counter in tabs
      const countBadge = document.getElementById('tab-repos-count');
      if (countBadge) countBadge.textContent = String(this.repos.length);

      const loadMoreContainer = document.getElementById('repo-load-more');
      if (loadMoreContainer) {
        loadMoreContainer.style.display = data.length === 100 ? 'block' : 'none';
      }

      this.renderRepos();
    } catch (err: any) {
      if (!append && !silent) list.innerHTML = `<p class="gh-text-muted" style="color: #f85149;">Error: ${err.message || String(err)}</p>`;
    }
  }

  renderRepos(): void {
    const list = document.getElementById('repos-list');
    if (!list) return;

    const appSettings = acode.require('settings') as any;
    const settings = (appSettings.value as any)['dev.rugved.githubmanager'] || { showPrivate: true };

    let filteredRepos = this.repos.filter((r) => r.name.toLowerCase().includes(this.searchQuery));

    if (settings.showPrivate === false) {
      filteredRepos = filteredRepos.filter((r) => !r.private);
    }

    const pinnedNames: string[] = JSON.parse(localStorage.getItem('gh_pinned_repos') || '[]');

    if (this.activeFilter === 'pinned') {
      filteredRepos = filteredRepos.filter((r) => pinnedNames.includes(r.name));
    } else if (this.activeFilter === 'public') {
      filteredRepos = filteredRepos.filter((r) => !r.private);
    } else if (this.activeFilter === 'private') {
      filteredRepos = filteredRepos.filter((r) => r.private);
    }

    if (filteredRepos.length === 0) {
      list.innerHTML = '<p class="gh-text-muted" style="padding: 24px 0;">No repositories match your criteria.</p>';
      return;
    }

    const pinnedRepos = filteredRepos.filter((r) => pinnedNames.includes(r.name));
    const unpinnedRepos = filteredRepos.filter((r) => !pinnedNames.includes(r.name));
    const orderedRepos = [...pinnedRepos, ...unpinnedRepos];

    list.innerHTML = '';
    orderedRepos.forEach((repo) => {
      const item = document.createElement('div');
      item.className = 'gh-card';
      item.setAttribute('data-repo-name', repo.name);

      const canAdmin = !!(repo.permissions && repo.permissions.admin);
      const isPinned = pinnedNames.includes(repo.name);

      const visibilityBadge = repo.private
        ? `<span class="gh-badge gh-badge-private">${lucideIcons.lock} Private</span>`
        : `<span class="gh-badge gh-badge-public">${lucideIcons.globe} Public</span>`;

      item.innerHTML = `
        <div class="gh-card-header">
          <div class="gh-card-title-group">
            <span class="gh-card-title browse-repo" title="Browse files in ${repo.name}">
              ${repo.name}
            </span>
          </div>
          <div class="gh-badges">
            <button class="gh-btn-icon toggle-pin" title="${isPinned ? 'Unpin' : 'Pin'}" style="${isPinned ? 'color: var(--gh-warning);' : ''}">
              ${lucideIcons.pin}
            </button>
            ${visibilityBadge}
          </div>
        </div>

        <p class="gh-card-desc">${repo.description || 'No description provided.'}</p>
        
        <div class="gh-card-meta">
          ${renderLanguageBadge(repo.language)}
          <span class="gh-stars">
            ${lucideIcons.star}
            <span>${repo.stargazers_count}</span>
          </span>
        </div>
        
        <div class="gh-card-actions">
          <button class="gh-btn gh-btn-secondary gh-card-action-btn browse-repo" title="Browse Code Tree">
            ${lucideIcons.folderOpen}
            <span>Browse</span>
          </button>
          <button class="gh-btn gh-btn-secondary gh-card-action-btn clone-repo" title="Clone to Device">
            ${lucideIcons.download}
            <span>Clone</span>
          </button>
          <button class="gh-btn gh-btn-secondary gh-card-action-btn pull-local-repo" title="Pull Remote Changes">
            ${lucideIcons.pull}
            <span>Pull</span>
          </button>
          <button class="gh-btn gh-btn-success gh-card-action-btn push-local-repo" title="Push Local Changes">
            ${lucideIcons.rocket}
            <span>Push</span>
          </button>
          <button class="gh-btn gh-btn-secondary gh-card-action-btn copy-repo-url" data-url="${repo.html_url}" title="Copy URL">
            ${lucideIcons.copy}
            <span>Copy</span>
          </button>
          ${
            canAdmin
              ? `<button class="gh-btn gh-btn-danger gh-card-action-btn delete-repo" title="Delete Repository">${lucideIcons.trash} <span>Delete</span></button>`
              : ''
          }
        </div>
      `;

      list.appendChild(item);

      const togglePinBtn = item.querySelector<HTMLElement>('.toggle-pin');
      if (togglePinBtn) {
        togglePinBtn.onclick = () => {
          let pins: string[] = JSON.parse(localStorage.getItem('gh_pinned_repos') || '[]');
          if (pins.includes(repo.name)) pins = pins.filter((p) => p !== repo.name);
          else pins.push(repo.name);
          localStorage.setItem('gh_pinned_repos', JSON.stringify(pins));
          this.renderRepos();
        };
      }

      item.querySelectorAll<HTMLElement>('.browse-repo').forEach((btn) => {
        btn.onclick = () => this.openRepo(repo.owner.login, repo.name, '', repo.default_branch);
      });

      const cloneRepoBtn = item.querySelector<HTMLElement>('.clone-repo');
      if (cloneRepoBtn) cloneRepoBtn.onclick = () => this.handleCloneRepo(repo);

      const pullRepoBtn = item.querySelector<HTMLElement>('.pull-local-repo');
      if (pullRepoBtn) pullRepoBtn.onclick = () => this.handlePullLocal(repo);

      const pushRepoBtn = item.querySelector<HTMLElement>('.push-local-repo');
      if (pushRepoBtn) pushRepoBtn.onclick = () => this.handlePushLocal(repo);

      const copyUrlBtn = item.querySelector<HTMLElement>('.copy-repo-url');
      if (copyUrlBtn) {
        copyUrlBtn.onclick = (e) => {
          const url = (e.currentTarget as HTMLElement).dataset.url || repo.html_url;
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url);
          } else if ((window as any).cordova?.plugins?.clipboard) {
            (window as any).cordova.plugins.clipboard.copy(url);
          }
          window.toast('URL Copied to clipboard!', 2000);
        };
      }

      if (canAdmin) {
        const deleteBtn = item.querySelector<HTMLElement>('.delete-repo');
        if (deleteBtn) {
          deleteBtn.onclick = () => this.handleDeleteRepo(repo.owner.login, repo.name);
        }
      }
    });
  }

  updateBreadcrumbs(): void {
    const breadcrumbs = document.getElementById('repo-breadcrumbs');
    if (!breadcrumbs || !this.currentRepo) return;

    breadcrumbs.innerHTML = '';

    const rootCrumb = document.createElement('span');
    rootCrumb.className = 'gh-crumb';
    rootCrumb.textContent = this.currentRepo.repo;
    rootCrumb.onclick = () => this.openRepo(this.currentRepo!.owner, this.currentRepo!.repo, '', this.currentBranch);
    breadcrumbs.appendChild(rootCrumb);

    if (this.currentPath) {
      const parts = this.currentPath.split('/');
      let currentAccPath = '';

      parts.forEach((part, index) => {
        currentAccPath += (currentAccPath ? '/' : '') + part;
        const capturedPath = currentAccPath;

        const sep = document.createElement('span');
        sep.className = 'gh-crumb-sep';
        sep.textContent = '/';
        breadcrumbs.appendChild(sep);

        if (index === parts.length - 1) {
          const current = document.createElement('span');
          current.className = 'gh-crumb-current';
          current.textContent = part;
          breadcrumbs.appendChild(current);
        } else {
          const crumb = document.createElement('span');
          crumb.className = 'gh-crumb';
          crumb.textContent = part;
          crumb.onclick = () => this.openRepo(this.currentRepo!.owner, this.currentRepo!.repo, capturedPath, this.currentBranch);
          breadcrumbs.appendChild(crumb);
        }
      });
    }
  }

  handleBack(): void {
    if (this.currentPath === '') {
      this.currentRepo = null;
      const header = document.getElementById('repo-header');
      if (header) header.style.display = 'none';

      const actions = document.getElementById('repo-main-actions');
      if (actions) actions.style.display = 'block';

      this.renderRepos();

      const loadMoreContainer = document.getElementById('repo-load-more');
      if (loadMoreContainer) {
        loadMoreContainer.style.display =
          this.repos.length > 0 && this.repos.length % 100 === 0 ? 'block' : 'none';
      }
    } else {
      if (!this.currentRepo) return;
      const parts = this.currentPath.split('/');
      parts.pop();
      this.openRepo(this.currentRepo.owner, this.currentRepo.repo, parts.join('/'), this.currentBranch);
    }
  }

  async getIgnoreRules(rootUrl: string): Promise<RegExp[]> {
    const fsOperation = acode.require('fsOperation');
    let ignoreRegexes: RegExp[] = [];
    try {
      const gitignoreUrl = rootUrl + (rootUrl.endsWith('/') ? '' : '/') + '.gitignore';
      const gitignoreContent = await fsOperation(gitignoreUrl).readFile('utf-8');

      ignoreRegexes = gitignoreContent
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && !line.startsWith('#'))
        .map((line: string) => {
          let r = line
            .replace(/[-[\]{}()+.,\\^$|#\s]/g, '\\$&')
            .replace(/\\\*/g, '.*')
            .replace(/\\\?/g, '.');
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
    } catch (e) {}
    return ignoreRegexes;
  }

  async handleCreateRepo(): Promise<void> {
    return handleCreateRepo(this);
  }

  async handleCloneRepo(repo: GitHubRepo): Promise<void> {
    return handleCloneRepo(this, repo);
  }

  async handleDeleteRepo(owner: string, repoName: string): Promise<void> {
    return handleDeleteRepo(this, owner, repoName);
  }

  async handlePullLocal(repo: GitHubRepo): Promise<void> {
    return handlePullLocal(this, repo);
  }

  async handlePushLocal(repo: GitHubRepo): Promise<void> {
    return handlePushLocal(this, repo);
  }

  async openRepo(owner: string, repo: string, path = '', branch = ''): Promise<void> {
    return openRepo(this, owner, repo, path, branch);
  }

  async openFile(item: GitHubContentItem): Promise<void> {
    return openFile(this, item);
  }

  async switchBranch(newBranch: string): Promise<void> {
    return switchBranch(this, newBranch);
  }

  async loadBranches(owner: string, repo: string): Promise<void> {
    return loadBranches(this, owner, repo);
  }

  async handleCreateBranch(): Promise<void> {
    return handleCreateBranch(this);
  }

  async handleDeleteBranch(): Promise<void> {
    return handleDeleteBranch(this);
  }
}
