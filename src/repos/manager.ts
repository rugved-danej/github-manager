import { lucideIcons, renderLanguageBadge } from '../ui/icons';
import { openCustomMenu, CustomSelectComponent, type MenuItem } from '../ui/selectMenu';
import { renderLoadingState, renderEmptyState, renderErrorState } from '../ui/states';
import { showToast } from '../ui/toast';
import { enableHorizontalDrag, formatRelativeTime, copyToClipboard } from '../utils/format';
import type { GitHubAPI } from '../api/github';
import type { GitHubRepo, RepoContext, GitHubContentItem, GitHubOrg, GitHubUser } from '../types/github';
import { handleCreateRepo } from './create';
import { handleCloneRepo } from './clone';
import { handleDeleteRepo } from './delete';
import { handlePushLocal } from './push';
import { handlePullLocal } from './pull';
import { openRepo, openFile } from './browse';
import { switchBranch, loadBranches, handleCreateBranch, handleDeleteBranch } from './branches';
import { openIssuesModal } from '../features/issuesModal';
import { openPullRequestsModal } from '../features/prsModal';
import { openReleasesModal } from '../features/releasesModal';
import { openActionsModal } from '../features/actionsModal';
import { openRepoSettingsModal } from '../features/repoSettingsModal';

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
  starredRepoNames: Set<string> = new Set();

  branchSelect: CustomSelectComponent | null = null;

  constructor(api: GitHubAPI | null) {
    this.api = api;
    this.repos = [];
    this.currentRepo = null;
    this.currentPath = '';
    this.currentBranch = '';
    this.currentPage = 1;
    this.searchQuery = '';
    this.starredRepoNames = new Set();
  }

  setApi(api: GitHubAPI | null): void {
    this.api = api;
  }

  setCurrentUser(user: GitHubUser | null): void {
    this.currentUser = user;
  }

  setOrgs(orgs: GitHubOrg[]): void {
    this.orgs = orgs;
  }

  setSelectedOrg(org: string | null): void {
    this.selectedOrg = org;
    this.currentPage = 1;
    this.loadRepos();
  }

  switchFilter(filter: RepoFilter): void {
    this.activeFilter = filter;
    const filterBar = document.getElementById('repo-filter-bar');
    if (filterBar) {
      filterBar.querySelectorAll('.gh-filter-pill').forEach((p) => {
        const btn = p as HTMLButtonElement;
        if (btn.dataset.filter === filter) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
    this.renderRepos();
  }

  updateFilterCounts(): void {
    const pinnedNames: string[] = JSON.parse(localStorage.getItem('gh_pinned_repos') || '[]');
    const totalAll = this.repos.length;
    const totalPinned = this.repos.filter((r) => pinnedNames.includes(r.name)).length;
    const totalPublic = this.repos.filter((r) => !r.private).length;
    const totalPrivate = this.repos.filter((r) => r.private).length;

    const elAll = document.getElementById('repo-count-all');
    if (elAll) elAll.textContent = String(totalAll);

    const elPinned = document.getElementById('repo-count-pinned');
    if (elPinned) elPinned.textContent = String(totalPinned);

    const elPublic = document.getElementById('repo-count-public');
    if (elPublic) elPublic.textContent = String(totalPublic);

    const elPrivate = document.getElementById('repo-count-private');
    if (elPrivate) elPrivate.textContent = String(totalPrivate);
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
        <div class="gh-repo-quick-strip">
          <button id="btn-nav-star" class="gh-btn gh-btn-sm gh-btn-secondary gh-btn-nav-item" title="Star on GitHub">
            ${lucideIcons.star} <span>Star</span>
          </button>
          <button id="btn-nav-issues" class="gh-btn gh-btn-sm gh-btn-secondary gh-btn-nav-item" title="Issues">
            ${lucideIcons.issue} <span>Issues</span>
          </button>
          <button id="btn-nav-prs" class="gh-btn gh-btn-sm gh-btn-secondary gh-btn-nav-item" title="Pull Requests">
            ${lucideIcons.pull} <span>PRs</span>
          </button>
          <button id="btn-nav-releases" class="gh-btn gh-btn-sm gh-btn-secondary gh-btn-nav-item gh-nav-wide-only" title="Releases">
            ${lucideIcons.package} <span>Releases</span>
          </button>
          <button id="btn-nav-more" class="gh-btn gh-btn-sm gh-btn-secondary gh-nav-more-btn" title="More Options">
            ${lucideIcons.moreVertical}
          </button>
        </div>
      </div>

      <!-- Main Repos Toolbar -->
      <div id="repo-main-actions">
        <button id="btn-create-repo" class="gh-btn gh-btn-block gh-btn-success" style="margin-bottom: 8px; padding: 7px 12px; font-weight: 600; font-size: 12px;">
          ${lucideIcons.plus}
          <span>New Repository</span>
        </button>

        <div class="gh-toolbar">
          <div class="gh-search-wrapper">
            <span class="gh-search-icon">${lucideIcons.search}</span>
            <input type="search" id="repo-search" class="gh-search-input" placeholder="Search repositories..." autocomplete="off" spellcheck="false">
            <button type="button" id="repo-search-clear" class="gh-search-clear" style="display: none;" aria-label="Clear search" title="Clear search">${lucideIcons.x}</button>
          </div>
          <div class="gh-filter-bar" id="repo-filter-bar" title="Scroll or swipe to view more filters">
            <button class="gh-filter-pill ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">
              ${lucideIcons.code} All <span class="gh-filter-count" id="repo-count-all">0</span>
            </button>
            <button class="gh-filter-pill ${this.activeFilter === 'pinned' ? 'active' : ''}" data-filter="pinned">
              ${lucideIcons.pin} Pinned <span class="gh-filter-count" id="repo-count-pinned">0</span>
            </button>
            <button class="gh-filter-pill ${this.activeFilter === 'public' ? 'active' : ''}" data-filter="public">
              ${lucideIcons.globe} Public <span class="gh-filter-count" id="repo-count-public">0</span>
            </button>
            <button class="gh-filter-pill ${this.activeFilter === 'private' ? 'active' : ''}" data-filter="private">
              ${lucideIcons.lock} Private <span class="gh-filter-count" id="repo-count-private">0</span>
            </button>
          </div>
        </div>
      </div>

      <div id="repos-list">${renderLoadingState({ title: 'Loading Repositories...', subtitle: 'Fetching your repositories' })}</div>
      
      <div id="repo-load-more" class="gh-load-more" style="margin-top: 10px; display: none;">
        <button id="btn-repo-more" class="gh-btn gh-btn-block gh-btn-secondary">Load More Repositories</button>
      </div>
    `;

    this.currentPage = 1;
    this.currentRepo = null;
    this.currentPath = '';
    this.currentBranch = '';
    this.searchQuery = '';
    this.branchSelect = null;

    const backBtn = container.querySelector<HTMLElement>('#btn-repo-back');
    if (backBtn) backBtn.onclick = () => this.handleBack();

    const createRepoBtn = container.querySelector<HTMLElement>('#btn-create-repo');
    if (createRepoBtn) createRepoBtn.onclick = () => this.handleCreateRepo();

    const createBranchBtn = container.querySelector<HTMLElement>('#btn-create-branch');
    if (createBranchBtn) createBranchBtn.onclick = () => this.handleCreateBranch();

    const deleteBranchBtn = container.querySelector<HTMLElement>('#btn-delete-branch');
    if (deleteBranchBtn) deleteBranchBtn.onclick = () => this.handleDeleteBranch();

    container.querySelector<HTMLElement>('#btn-nav-star')?.addEventListener('click', () => {
      if (this.currentRepo) {
        this.handleToggleStar(this.currentRepo.owner, this.currentRepo.repo);
      }
    });

    container.querySelector<HTMLElement>('#btn-nav-issues')?.addEventListener('click', () => {
      if (this.api && this.currentRepo) {
        openIssuesModal(this.api, this.currentRepo.owner, this.currentRepo.repo);
      }
    });

    container.querySelector<HTMLElement>('#btn-nav-prs')?.addEventListener('click', () => {
      if (this.api && this.currentRepo) {
        openPullRequestsModal(this.api, this.currentRepo.owner, this.currentRepo.repo, this.currentBranch || 'main');
      }
    });

    container.querySelector<HTMLElement>('#btn-nav-releases')?.addEventListener('click', () => {
      if (this.api && this.currentRepo) {
        openReleasesModal(this.api, this.currentRepo.owner, this.currentRepo.repo);
      }
    });

    container.querySelector<HTMLElement>('#btn-nav-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.api || !this.currentRepo) return;
      const anchor = container.querySelector<HTMLElement>('#btn-nav-more')!;
      const repoObj = this.repos.find((r) => r.name === this.currentRepo?.repo) || ({
        name: this.currentRepo.repo,
        full_name: `${this.currentRepo.owner}/${this.currentRepo.repo}`,
        owner: { login: this.currentRepo.owner },
        private: false,
        default_branch: this.currentBranch || 'main',
        html_url: `https://github.com/${this.currentRepo.owner}/${this.currentRepo.repo}`
      } as any);

      const items: MenuItem[] = [
        {
          id: 'releases',
          label: 'Releases',
          icon: lucideIcons.package,
          action: () => openReleasesModal(this.api!, this.currentRepo!.owner, this.currentRepo!.repo)
        },
        {
          id: 'actions',
          label: 'Actions (CI/CD)',
          icon: lucideIcons.play,
          action: () => openActionsModal(this.api!, this.currentRepo!.owner, this.currentRepo!.repo)
        },
        {
          id: 'settings',
          label: 'Repository Settings',
          icon: lucideIcons.settings,
          action: () => openRepoSettingsModal(this.api!, repoObj, this.orgs, () => this.loadRepos())
        },
        {
          id: 'discussions',
          label: 'Discussions',
          icon: lucideIcons.messageSquare,
          action: () => {
            const url = `https://github.com/${this.currentRepo!.owner}/${this.currentRepo!.repo}/discussions`;
            if ((window as any).system?.openInBrowser) (window as any).system.openInBrowser(url);
            else if ((window as any).cordova) window.open(url, '_system');
            else window.open(url, '_blank');
          }
        },
        {
          id: 'clone',
          label: 'Clone to Device',
          icon: lucideIcons.download,
          action: () => this.handleCloneRepo(repoObj)
        },
        {
          id: 'pull',
          label: 'Pull Remote Changes',
          icon: lucideIcons.pull,
          action: () => handlePullLocal(this, repoObj)
        },
        {
          id: 'push',
          label: 'Push Local Changes',
          icon: lucideIcons.rocket,
          action: () => handlePushLocal(this, repoObj)
        },
        {
          id: 'copy-url',
          label: 'Copy Repository URL',
          icon: lucideIcons.copy,
          action: () => {
            copyToClipboard(repoObj.html_url);
            showToast('Repository URL copied!', 'success');
          }
        }
      ];

      openCustomMenu(anchor, 'Repository Menu', items);
    });

    const searchInput = container.querySelector<HTMLInputElement>('#repo-search');
    const searchClear = container.querySelector<HTMLElement>('#repo-search-clear');

    const clearRepoSearch = (e?: Event) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      this.searchQuery = '';
      if (searchClear) {
        searchClear.classList.remove('visible');
        searchClear.style.display = 'none';
      }
      this.renderRepos();
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.searchQuery = query.toLowerCase().trim();
        if (searchClear) {
          if (this.searchQuery.length > 0) {
            searchClear.classList.add('visible');
            searchClear.style.display = 'inline-flex';
          } else {
            searchClear.classList.remove('visible');
            searchClear.style.display = 'none';
          }
        }
        this.renderRepos();
      });

      searchInput.addEventListener('search', () => {
        if (!searchInput.value) {
          clearRepoSearch();
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.searchQuery) {
          clearRepoSearch(e);
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('pointerdown', (e) => clearRepoSearch(e));
      searchClear.addEventListener('touchstart', (e) => clearRepoSearch(e), { passive: false });
      searchClear.addEventListener('click', (e) => clearRepoSearch(e));
    }

    const filterBar = container.querySelector<HTMLElement>('#repo-filter-bar');
    if (filterBar) {
      enableHorizontalDrag(filterBar);
      filterBar.querySelectorAll('.gh-filter-pill').forEach((pill) => {
        pill.addEventListener('click', (e) => {
          const filter = (e.currentTarget as HTMLElement).dataset.filter as RepoFilter;
          if (filter) this.switchFilter(filter);
        });
      });
    }

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

  async handleToggleStar(owner: string, repoName: string, btn?: HTMLElement): Promise<void> {
    if (!this.api) return;
    const key = `${owner}/${repoName}`;
    const isCurrentlyStarred = this.starredRepoNames.has(key) || this.starredRepoNames.has(repoName) || (btn ? btn.classList.contains('starred') : false);
    const repo = this.repos.find((r) => r.name === repoName);

    try {
      if (isCurrentlyStarred) {
        this.starredRepoNames.delete(key);
        this.starredRepoNames.delete(repoName);
        if (btn) {
          btn.classList.remove('starred');
          btn.title = 'Star repository';
          btn.innerHTML = lucideIcons.star;
        }
        if (repo) {
          repo.stargazers_count = Math.max(0, (repo.stargazers_count || 1) - 1);
        }
        await this.api.unstarRepo(owner, repoName);
        showToast(`Unstarred ${repoName}`, 'info', 1800);
      } else {
        this.starredRepoNames.add(key);
        this.starredRepoNames.add(repoName);
        if (btn) {
          btn.classList.add('starred');
          btn.title = 'Unstar repository';
          btn.innerHTML = lucideIcons.starFilled;
        }
        if (repo) {
          repo.stargazers_count = (repo.stargazers_count || 0) + 1;
        }
        await this.api.starRepo(owner, repoName);
        showToast(`Starred ${repoName}!`, 'success', 1800);
      }
      this.updateStarUI(owner, repoName);
    } catch {
      if (isCurrentlyStarred) {
        this.starredRepoNames.add(key);
        this.starredRepoNames.add(repoName);
      } else {
        this.starredRepoNames.delete(key);
        this.starredRepoNames.delete(repoName);
      }
      this.updateStarUI(owner, repoName);
      showToast('Failed to update star on GitHub', 'error', 2000);
    }
  }

  updateStarUI(owner: string, repoName: string): void {
    const key = `${owner}/${repoName}`;
    const isStarred = this.starredRepoNames.has(key) || this.starredRepoNames.has(repoName);
    const repo = this.repos.find((r) => r.name === repoName);

    const starBtns = document.querySelectorAll<HTMLElement>(`.toggle-star[data-repo="${repoName}"]`);
    starBtns.forEach((starBtn) => {
      if (isStarred) {
        starBtn.classList.add('starred');
        starBtn.title = 'Unstar repository';
        starBtn.innerHTML = lucideIcons.starFilled;
      } else {
        starBtn.classList.remove('starred');
        starBtn.title = 'Star repository';
        starBtn.innerHTML = lucideIcons.star;
      }
    });

    const starMetas = document.querySelectorAll<HTMLElement>(`.toggle-star-meta[data-repo="${repoName}"]`);
    starMetas.forEach((starMeta) => {
      starMeta.innerHTML = `${isStarred ? lucideIcons.starFilled : lucideIcons.star} <span class="gh-star-count">${repo?.stargazers_count ?? 0}</span>`;
      starMeta.title = isStarred ? 'Unstar repository' : 'Star repository';
    });

    const navStar = document.getElementById('btn-nav-star');
    if (navStar && this.currentRepo?.repo === repoName) {
      if (isStarred) {
        navStar.classList.add('starred');
        navStar.title = 'Unstar on GitHub';
        navStar.innerHTML = `${lucideIcons.starFilled} <span>Starred</span>`;
      } else {
        navStar.classList.remove('starred');
        navStar.title = 'Star on GitHub';
        navStar.innerHTML = `${lucideIcons.star} <span>Star</span>`;
      }
    }
  }

  async loadRepos(append = false, silent = false): Promise<void> {
    const list = document.getElementById('repos-list');
    if (!list) return;

    if (!this.api) {
      if (!append) {
        list.innerHTML = renderEmptyState({
          icon: lucideIcons.lock,
          title: 'Sign In Required',
          message: 'Please login to GitHub to view and browse your repositories.'
        });
      }
      return;
    }

    try {
      if (!append && !silent) {
        list.innerHTML = renderLoadingState({
          title: 'Fetching Repositories...',
          subtitle: 'Syncing with GitHub API'
        });
      }

      let data: GitHubRepo[] = [];
      if (this.selectedOrg) {
        data = await this.api.getOrgRepos(this.selectedOrg, this.currentPage, 100);
      } else {
        data = await this.api.getRepos(this.currentPage, 100, 'owner');
        if (this.currentUser?.login) {
          const userLogin = this.currentUser.login.toLowerCase();
          data = data.filter((r) => r.owner?.login?.toLowerCase() === userLogin);
        }
      }

      try {
        const starred = await this.api.getStarredRepos(1, 100);
        this.starredRepoNames = new Set([
          ...starred.map((r) => `${r.owner?.login || ''}/${r.name}`),
          ...starred.map((r) => r.name)
        ]);
      } catch {
      }

      if (append) this.repos.push(...data);
      else this.repos = data;

      const countBadge = document.getElementById('tab-repos-count');
      if (countBadge) countBadge.textContent = String(this.repos.length);

      const loadMoreContainer = document.getElementById('repo-load-more');
      if (loadMoreContainer) {
        loadMoreContainer.style.display = data.length === 100 ? 'block' : 'none';
      }

      this.renderRepos();
    } catch (err: any) {
      if (!append && !silent) {
        list.innerHTML = renderErrorState({
          title: 'Failed to Load Repositories',
          message: err?.message || 'Could not load repositories from GitHub.',
          retryId: 'btn-retry-repos'
        });
        list.querySelector('#btn-retry-repos')?.addEventListener('click', () => {
          this.loadRepos(false);
        });
      }
    }
  }

  renderRepos(): void {
    const list = document.getElementById('repos-list');
    if (!list) return;

    this.updateFilterCounts();

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
      if (this.searchQuery) {
        list.innerHTML = renderEmptyState({
          icon: lucideIcons.search,
          title: 'No Matching Repositories',
          message: `No repositories found matching "${this.searchQuery}".`,
          actionLabel: 'Clear Search',
          actionId: 'btn-empty-clear-repo-search',
          actionVariant: 'secondary'
        });
        list.querySelector('#btn-empty-clear-repo-search')?.addEventListener('click', () => {
          const searchInput = document.querySelector<HTMLInputElement>('#repo-search');
          if (searchInput) searchInput.value = '';
          this.searchQuery = '';
          const searchClear = document.querySelector<HTMLElement>('#repo-search-clear');
          if (searchClear) {
            searchClear.classList.remove('visible');
            searchClear.style.display = 'none';
          }
          this.renderRepos();
        });
        return;
      }

      if (this.activeFilter === 'pinned') {
        list.innerHTML = renderEmptyState({
          icon: lucideIcons.pin,
          title: 'No Pinned Repositories',
          message: 'Pin frequently accessed repositories from their action menus.',
          actionLabel: 'View All Repos',
          actionId: 'btn-empty-view-all-repos',
          actionVariant: 'secondary'
        });
        list.querySelector('#btn-empty-view-all-repos')?.addEventListener('click', () => {
          this.switchFilter('all');
        });
        return;
      }

      if (this.activeFilter === 'private') {
        list.innerHTML = renderEmptyState({
          icon: lucideIcons.lock,
          title: 'No Private Repositories',
          message: 'No private repositories found under this account.'
        });
        return;
      }

      if (this.activeFilter === 'public') {
        list.innerHTML = renderEmptyState({
          icon: lucideIcons.globe,
          title: 'No Public Repositories',
          message: 'No public repositories found under this account.'
        });
        return;
      }

      list.innerHTML = renderEmptyState({
        icon: lucideIcons.code,
        title: 'No Repositories Found',
        message: 'Create or clone a repository to get started.',
        actionLabel: '+ Create Repository',
        actionId: 'btn-empty-create-repo',
        actionVariant: 'success'
      });
      list.querySelector('#btn-empty-create-repo')?.addEventListener('click', () => {
        handleCreateRepo(this);
      });
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
      const repoKey = `${repo.owner.login}/${repo.name}`;
      const isStarred = this.starredRepoNames.has(repoKey) || this.starredRepoNames.has(repo.name);

      const visibilityBadge = repo.private
        ? `<span class="gh-badge gh-badge-private">${lucideIcons.lock} Private</span>`
        : `<span class="gh-badge gh-badge-public">${lucideIcons.globe} Public</span>`;

      const forkedBadge = repo.fork
        ? `<span class="gh-badge gh-badge-neutral">${lucideIcons.gitFork} Forked</span>`
        : '';

      const repoIcon = repo.fork ? lucideIcons.gitFork : lucideIcons.folderGit;

      item.innerHTML = `
        <div class="gh-card-header">
          <div class="gh-card-title-group">
            <span class="gh-card-repo-icon" title="${repo.fork ? 'Forked Repository' : 'Repository'}">
              ${repoIcon}
            </span>
            <span class="gh-card-title browse-repo" title="Browse ${repo.name}">
              ${repo.name}
            </span>
          </div>
          <div class="gh-badges">
            <button class="gh-btn-icon toggle-pin ${isPinned ? 'pinned' : ''}" data-repo="${repo.name}" title="${isPinned ? 'Unpin repository' : 'Pin repository to top'}">
              ${lucideIcons.pin}
            </button>
            <button class="gh-btn-icon toggle-star ${isStarred ? 'starred' : ''}" data-owner="${repo.owner.login}" data-repo="${repo.name}" title="${isStarred ? 'Unstar repository' : 'Star repository'}">
              ${isStarred ? lucideIcons.starFilled : lucideIcons.star}
            </button>
            ${forkedBadge}
            ${visibilityBadge}
          </div>
        </div>

        <p class="gh-card-desc">${repo.description || '<span style="font-style: italic; opacity: 0.6;">No description provided.</span>'}</p>
        
        <div class="gh-card-meta">
          ${renderLanguageBadge(repo.language)}
          <span class="gh-meta-item toggle-star-meta" data-owner="${repo.owner.login}" data-repo="${repo.name}" title="${isStarred ? 'Unstar repository' : 'Star repository'}">
            ${isStarred ? lucideIcons.starFilled : lucideIcons.star}
            <span class="gh-star-count">${repo.stargazers_count ?? 0}</span>
          </span>
          ${
            (repo.forks_count ?? 0) > 0
              ? `<span class="gh-meta-item" title="${repo.forks_count} forks">
                  ${lucideIcons.gitFork}
                  <span>${repo.forks_count}</span>
                </span>`
              : ''
          }
          ${
            repo.updated_at
              ? `<span class="gh-meta-item" title="Updated ${repo.updated_at}">
                  ${lucideIcons.clock}
                  <span>Updated ${formatRelativeTime(repo.updated_at)}</span>
                </span>`
              : ''
          }
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
          <button class="gh-btn gh-btn-success gh-card-action-btn push-local-repo" title="Push Local Changes">
            ${lucideIcons.rocket}
            <span>Push</span>
          </button>
          <button class="gh-btn gh-btn-secondary gh-card-action-btn manage-repo-hub" title="More Options">
            ${lucideIcons.moreVertical}
            <span>More</span>
          </button>
        </div>
      `;

      list.appendChild(item);

      const togglePinBtn = item.querySelector<HTMLElement>('.toggle-pin');
      if (togglePinBtn) {
        togglePinBtn.onclick = (e) => {
          e.stopPropagation();
          let pins: string[] = JSON.parse(localStorage.getItem('gh_pinned_repos') || '[]');
          const willPin = !pins.includes(repo.name);
          if (willPin) {
            pins.push(repo.name);
          } else {
            pins = pins.filter((p) => p !== repo.name);
          }
          localStorage.setItem('gh_pinned_repos', JSON.stringify(pins));
          showToast(willPin ? `Pinned ${repo.name}` : `Unpinned ${repo.name}`, 'info');
          this.renderRepos();
        };
      }

      const toggleStarBtn = item.querySelector<HTMLElement>('.toggle-star');
      if (toggleStarBtn) {
        toggleStarBtn.onclick = (e) => {
          e.stopPropagation();
          this.handleToggleStar(repo.owner.login, repo.name, toggleStarBtn);
        };
      }

      const toggleStarMeta = item.querySelector<HTMLElement>('.toggle-star-meta');
      if (toggleStarMeta) {
        toggleStarMeta.onclick = (e) => {
          e.stopPropagation();
          this.handleToggleStar(repo.owner.login, repo.name, toggleStarBtn || undefined);
        };
      }

      item.querySelectorAll<HTMLElement>('.browse-repo').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.openRepo(repo.owner.login, repo.name, '', repo.default_branch);
        };
      });

      const cloneRepoBtn = item.querySelector<HTMLElement>('.clone-repo');
      if (cloneRepoBtn) {
        cloneRepoBtn.onclick = (e) => {
          e.stopPropagation();
          this.handleCloneRepo(repo);
        };
      }

      const pushRepoBtn = item.querySelector<HTMLElement>('.push-local-repo');
      if (pushRepoBtn) {
        pushRepoBtn.onclick = (e) => {
          e.stopPropagation();
          this.handlePushLocal(repo);
        };
      }

      const hubBtn = item.querySelector<HTMLElement>('.manage-repo-hub');
      if (hubBtn) {
        hubBtn.onclick = (e) => {
          e.stopPropagation();
          if (!this.api) return;
          const items: MenuItem[] = [
            {
              id: 'issues',
              label: 'Issues',
              icon: lucideIcons.issue,
              badge: repo.open_issues_count ? String(repo.open_issues_count) : undefined,
              action: () => openIssuesModal(this.api!, repo.owner.login, repo.name)
            },
            {
              id: 'prs',
              label: 'Pull Requests',
              icon: lucideIcons.pull,
              action: () => openPullRequestsModal(this.api!, repo.owner.login, repo.name, repo.default_branch)
            },
            {
              id: 'releases',
              label: 'Releases',
              icon: lucideIcons.package,
              action: () => openReleasesModal(this.api!, repo.owner.login, repo.name)
            },
            {
              id: 'actions',
              label: 'Actions (CI/CD)',
              icon: lucideIcons.play,
              action: () => openActionsModal(this.api!, repo.owner.login, repo.name)
            },
            {
              id: 'pull',
              label: 'Pull Remote Changes',
              icon: lucideIcons.pull,
              action: () => this.handlePullLocal(repo)
            },
            {
              id: 'copy-url',
              label: 'Copy Repository URL',
              icon: lucideIcons.copy,
              action: async () => {
                const ok = await copyToClipboard(repo.html_url);
                if (ok) showToast('Repository URL copied to clipboard!', 'success');
              }
            },
            {
              id: 'settings',
              label: 'Repository Settings',
              icon: lucideIcons.settings,
              action: () => openRepoSettingsModal(this.api!, repo, this.orgs, () => this.loadRepos())
            },
            {
              id: 'discussions',
              label: 'Discussions',
              icon: lucideIcons.messageSquare,
              action: () => {
                const url = `https://github.com/${repo.owner.login}/${repo.name}/discussions`;
                if ((window as any).system?.openInBrowser) (window as any).system.openInBrowser(url);
                else if ((window as any).cordova) window.open(url, '_system');
                else window.open(url, '_blank');
              }
            }
          ];

          if (canAdmin) {
            items.push({
              id: 'delete',
              label: 'Delete Repository',
              icon: lucideIcons.trash,
              danger: true,
              action: () => this.handleDeleteRepo(repo.owner.login, repo.name)
            });
          }

          openCustomMenu(hubBtn, repo.name, items);
        };
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
