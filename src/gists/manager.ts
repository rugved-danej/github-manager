import { getFileIcon, lucideIcons, isImageFile } from '../ui/icons';
import { showToast } from '../ui/toast';
import { fluentConfirm, fluentAlert } from '../ui/dialog';
import { logger } from '../utils/logger';
import { renderLoadingState, renderEmptyState, renderErrorState } from '../ui/states';
import type { GitHubAPI } from '../api/github';
import type { GitHubGist } from '../types/github';
import { openCreateGistModal, handleAddFileToGist } from './create';
import { handleDeleteGist, handleDeleteFile } from './delete';
import { handleEditDescription } from './edit';
import { handleOpenFile } from './open';

export type GistFilter = 'all' | 'secret' | 'public' | 'starred';

function enableHorizontalDrag(el: HTMLElement): void {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasDragged = false;

  let touchStartX = 0;
  let touchStartScrollLeft = 0;
  let touchMoved = false;

  el.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].pageX;
      touchStartScrollLeft = el.scrollLeft;
      touchMoved = false;
    },
    { passive: true }
  );

  el.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const currentX = e.touches[0].pageX;
      const diff = currentX - touchStartX;
      if (Math.abs(diff) > 5) {
        touchMoved = true;
        el.scrollLeft = touchStartScrollLeft - diff;
      }
    },
    { passive: true }
  );

  el.addEventListener('mousedown', (e) => {
    isDown = true;
    hasDragged = false;
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });

  el.addEventListener('mouseleave', () => {
    isDown = false;
  });

  el.addEventListener('mouseup', () => {
    isDown = false;
  });

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDragged = true;
      e.preventDefault();
      el.scrollLeft = scrollLeft - walk;
    }
  });

  el.addEventListener(
    'click',
    (e) => {
      if (hasDragged || touchMoved) {
        e.stopPropagation();
        hasDragged = false;
        touchMoved = false;
      }
    },
    true
  );
}

export class GistManager {
  api: GitHubAPI | null;
  gists: GitHubGist[];
  starredGists: GitHubGist[];
  starredIds: Set<string>;
  currentPage: number;
  starredPage: number;
  perPage: number;
  searchQuery: string;
  currentFilter: GistFilter;
  selectedOrg: string | null = null;
  onSwitchToPersonal?: () => void;

  constructor(api: GitHubAPI | null) {
    this.api = api;
    this.gists = [];
    this.starredGists = [];
    this.starredIds = new Set();
    this.currentPage = 1;
    this.starredPage = 1;
    this.perPage = 30;
    this.searchQuery = '';
    this.currentFilter = 'all';
  }

  setSelectedOrg(org: string | null): void {
    this.selectedOrg = org;
    const toolbar = document.querySelector<HTMLElement>('#gists-container .gh-toolbar');
    if (toolbar) {
      toolbar.style.display = org ? 'none' : 'block';
    }
    this.renderList();
  }

  setApi(api: GitHubAPI | null): void {
    this.api = api;
    this.gists = [];
    this.starredGists = [];
    this.starredIds.clear();
  }

  switchFilter(filter: GistFilter): void {
    this.currentFilter = filter;
    const filterBar = document.getElementById('gist-filter-bar');
    if (filterBar) {
      filterBar.querySelectorAll('.gh-filter-pill').forEach((p) => {
        const btn = p as HTMLButtonElement;
        if (btn.dataset.filter === filter) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }

    if (filter === 'starred' && this.starredGists.length === 0) {
      this.loadStarredGists(false);
    } else {
      this.renderList();
    }
  }

  async render(container: HTMLElement): Promise<void> {
    container.innerHTML = `
      <div class="gh-toolbar">
        <button id="btn-create-gist" class="gh-btn gh-btn-block gh-btn-success" style="padding: 7px 12px; font-weight: 600; font-size: 12px; margin-bottom: 8px;">
          ${lucideIcons.plus}
          <span>New Gist</span>
        </button>
        <div class="gh-search-wrapper">
          <span class="gh-search-icon">${lucideIcons.search}</span>
          <input type="search" id="gist-search" class="gh-search-input" placeholder="Search gists..." autocomplete="off" spellcheck="false">
          <button type="button" id="gist-search-clear" class="gh-search-clear" style="display: none;" aria-label="Clear search" title="Clear search">${lucideIcons.x}</button>
        </div>
        <div class="gh-filter-bar" id="gist-filter-bar" title="Scroll or swipe to view more filters">
          <button class="gh-filter-pill ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
            ${lucideIcons.fileCode} All <span class="gh-filter-count" id="count-all">${this.gists.length}</span>
          </button>
          <button class="gh-filter-pill ${this.currentFilter === 'secret' ? 'active' : ''}" data-filter="secret">
            ${lucideIcons.lock} Secret
          </button>
          <button class="gh-filter-pill ${this.currentFilter === 'public' ? 'active' : ''}" data-filter="public">
            ${lucideIcons.globe} Public
          </button>
          <button class="gh-filter-pill ${this.currentFilter === 'starred' ? 'active' : ''}" data-filter="starred">
            ${lucideIcons.starFilled} Starred <span class="gh-filter-count" id="count-starred">${this.starredIds.size}</span>
          </button>
        </div>
      </div>

      <div id="gists-list">${renderLoadingState({ title: 'Loading Gists...', subtitle: 'Fetching your snippets' })}</div>
      
      <div id="load-more-container" class="gh-load-more" style="margin-top: 10px; display: none;">
        <button id="btn-load-more" class="gh-btn gh-btn-block gh-btn-secondary">Load More Gists</button>
      </div>
    `;

    const createGistBtn = container.querySelector<HTMLElement>('#btn-create-gist');
    if (createGistBtn) createGistBtn.addEventListener('click', () => this.handleCreateGist());

    const searchInput = container.querySelector<HTMLInputElement>('#gist-search');
    const searchClear = container.querySelector<HTMLElement>('#gist-search-clear');

    const clearGistSearch = (e?: Event) => {
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
      this.renderList();
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
        this.renderList();
      });

      searchInput.addEventListener('search', () => {
        if (!searchInput.value) {
          clearGistSearch();
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.searchQuery) {
          clearGistSearch(e);
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('pointerdown', (e) => clearGistSearch(e));
      searchClear.addEventListener('touchstart', (e) => clearGistSearch(e), { passive: false });
      searchClear.addEventListener('click', (e) => clearGistSearch(e));
    }

    const filterBar = container.querySelector<HTMLElement>('#gist-filter-bar');
    if (filterBar) enableHorizontalDrag(filterBar);

    container.querySelectorAll<HTMLButtonElement>('.gh-filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const filter = pill.dataset.filter as GistFilter;
        if (!filter || filter === this.currentFilter) return;
        this.switchFilter(filter);
      });
    });

    const loadMoreBtn = container.querySelector<HTMLElement>('#btn-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        if (this.currentFilter === 'starred') {
          this.starredPage++;
          loadMoreBtn.textContent = 'Loading...';
          this.loadStarredGists(true).then(() => {
            loadMoreBtn.textContent = 'Load More Gists';
          });
        } else {
          this.currentPage++;
          loadMoreBtn.textContent = 'Loading...';
          this.loadGists(true).then(() => {
            loadMoreBtn.textContent = 'Load More Gists';
          });
        }
      });
    }

    this.currentPage = 1;
    this.starredPage = 1;
    this.searchQuery = '';
    await this.loadGists(false);
  }

  async loadGists(append = false, silent = false): Promise<void> {
    const containerElement = document.getElementById('gists-list');
    if (!containerElement) return;

    if (!this.api) {
      if (!append) {
        containerElement.innerHTML = renderEmptyState({
          icon: lucideIcons.lock,
          title: 'Sign In Required',
          message: 'Please login with your GitHub account to access your gists.'
        });
      }
      return;
    }

    if (this.selectedOrg) {
      const countBadge = document.getElementById('tab-gists-count');
      if (countBadge) countBadge.textContent = '0';
      this.renderList();
      return;
    }

    try {
      if (!append && !silent) {
        containerElement.innerHTML = renderLoadingState({
          title: 'Fetching Gists...',
          subtitle: 'Syncing with GitHub API'
        });
      }

      const [fetchedGists, starred] = await Promise.all([
        this.api.getGists(this.currentPage, this.perPage),
        this.starredIds.size === 0
          ? this.api.getStarredGists(1, 100).catch(() => [])
          : Promise.resolve([])
      ]);

      if (starred && starred.length > 0) {
        this.starredGists = starred;
        starred.forEach((g) => this.starredIds.add(g.id));
      }

      if (!append) {
        this.gists = fetchedGists;
      } else {
        this.gists.push(...fetchedGists);
      }

      const countBadge = document.getElementById('tab-gists-count');
      if (countBadge) countBadge.textContent = String(this.gists.length);

      const allCount = document.getElementById('count-all');
      if (allCount) allCount.textContent = String(this.gists.length);

      const starredCount = document.getElementById('count-starred');
      if (starredCount) starredCount.textContent = String(this.starredIds.size);

      const loadMoreContainer = document.getElementById('load-more-container');
      if (loadMoreContainer) {
        loadMoreContainer.style.display = fetchedGists.length === this.perPage ? 'block' : 'none';
      }

      this.renderList();
    } catch (err: any) {
      if (!append && !silent) {
        containerElement.innerHTML = renderErrorState({
          title: 'Failed to Load Gists',
          message: err?.message || 'Could not retrieve gists from GitHub. Please check your connection.',
          retryId: 'btn-retry-gists'
        });
        containerElement.querySelector('#btn-retry-gists')?.addEventListener('click', () => {
          this.loadGists(false);
        });
      }
    }
  }

  async loadStarredGists(append = false): Promise<void> {
    const containerElement = document.getElementById('gists-list');
    if (!containerElement || !this.api) return;

    try {
      if (!append) {
        containerElement.innerHTML = renderLoadingState({
          title: 'Fetching Starred Gists...',
          subtitle: 'Loading your favorite snippets'
        });
      }

      const fetched = await this.api.getStarredGists(this.starredPage, this.perPage);

      if (!append) {
        this.starredGists = fetched;
      } else {
        this.starredGists.push(...fetched);
      }

      fetched.forEach((g) => this.starredIds.add(g.id));

      const starredCount = document.getElementById('count-starred');
      if (starredCount) starredCount.textContent = String(this.starredIds.size);

      const loadMoreContainer = document.getElementById('load-more-container');
      if (loadMoreContainer) {
        loadMoreContainer.style.display = fetched.length === this.perPage ? 'block' : 'none';
      }

      this.renderList();
    } catch (err: any) {
      if (!append) {
        containerElement.innerHTML = renderErrorState({
          title: 'Failed to Load Starred Gists',
          message: err?.message || 'Could not retrieve starred gists from GitHub.',
          retryId: 'btn-retry-starred'
        });
        containerElement.querySelector('#btn-retry-starred')?.addEventListener('click', () => {
          this.loadStarredGists(false);
        });
      }
    }
  }

  renderList(): void {
    const containerElement = document.getElementById('gists-list');
    if (!containerElement) return;

    if (this.selectedOrg) {
      const loadMoreContainer = document.getElementById('load-more-container');
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';

      containerElement.innerHTML = renderEmptyState({
        icon: lucideIcons.building,
        title: 'No Organization Gists',
        message: `GitHub does not support gists for organizations (@${this.selectedOrg}). Gists are only available for personal user accounts.`,
        actionLabel: 'Switch to Personal',
        actionId: 'btn-switch-to-personal',
        actionVariant: 'secondary'
      });
      containerElement.querySelector('#btn-switch-to-personal')?.addEventListener('click', () => {
        if (this.onSwitchToPersonal) {
          this.onSwitchToPersonal();
        }
      });
      return;
    }

    let baseGists = this.gists;
    if (this.currentFilter === 'starred') {
      baseGists = this.starredGists;
    } else if (this.currentFilter === 'secret') {
      baseGists = this.gists.filter((g) => !g.public);
    } else if (this.currentFilter === 'public') {
      baseGists = this.gists.filter((g) => g.public);
    }

    const query = this.searchQuery.trim().toLowerCase();
    const visibleGists = query
      ? baseGists.filter((g) => {
          const descMatch = (g.description || '').toLowerCase().includes(query);
          const fileMatch = Object.keys(g.files).some((f) => f.toLowerCase().includes(query));
          return descMatch || fileMatch;
        })
      : baseGists;

    if (visibleGists.length === 0) {
      if (query) {
        containerElement.innerHTML = renderEmptyState({
          icon: lucideIcons.search,
          title: 'No Matching Snippets',
          message: `No gists found matching "${query}". Try different keywords.`,
          actionLabel: 'Clear Search',
          actionId: 'btn-empty-clear-search',
          actionVariant: 'secondary'
        });
        containerElement.querySelector('#btn-empty-clear-search')?.addEventListener('click', () => {
          const searchInput = document.querySelector<HTMLInputElement>('#gist-search');
          if (searchInput) searchInput.value = '';
          this.searchQuery = '';
          const searchClear = document.querySelector<HTMLElement>('#gist-search-clear');
          if (searchClear) {
            searchClear.classList.remove('visible');
            searchClear.style.display = 'none';
          }
          this.renderList();
        });
        return;
      }

      if (this.currentFilter === 'starred') {
        containerElement.innerHTML = renderEmptyState({
          icon: lucideIcons.star,
          title: 'No Starred Gists Yet',
          message: 'Star gists on GitHub to keep your most useful snippets pinned here.',
          actionLabel: 'View All Gists',
          actionId: 'btn-empty-view-all',
          actionVariant: 'secondary'
        });
        containerElement.querySelector('#btn-empty-view-all')?.addEventListener('click', () => {
          this.switchFilter('all');
        });
        return;
      }

      if (this.currentFilter === 'secret') {
        containerElement.innerHTML = renderEmptyState({
          icon: lucideIcons.lock,
          title: 'No Secret Gists',
          message: 'Secret gists are unlisted and accessible only via direct link or your account.',
          actionLabel: '+ Create Secret Gist',
          actionId: 'btn-empty-create-secret',
          actionVariant: 'primary'
        });
        containerElement.querySelector('#btn-empty-create-secret')?.addEventListener('click', () => {
          openCreateGistModal(this, undefined, undefined, false);
        });
        return;
      }

      if (this.currentFilter === 'public') {
        containerElement.innerHTML = renderEmptyState({
          icon: lucideIcons.globe,
          title: 'No Public Gists',
          message: 'Public snippets are open and discoverable by the developer community.',
          actionLabel: '+ Create Public Gist',
          actionId: 'btn-empty-create-public',
          actionVariant: 'primary'
        });
        containerElement.querySelector('#btn-empty-create-public')?.addEventListener('click', () => {
          openCreateGistModal(this, undefined, undefined, true);
        });
        return;
      }

      containerElement.innerHTML = renderEmptyState({
        icon: lucideIcons.fileCode,
        title: 'No Gists Found',
        message: 'Share code snippets, notes, and configs directly from Acode.',
        actionLabel: '+ Create New Gist',
        actionId: 'btn-empty-create-gist',
        actionVariant: 'success'
      });
      containerElement.querySelector('#btn-empty-create-gist')?.addEventListener('click', () => {
        this.handleCreateGist();
      });
      return;
    }

    containerElement.innerHTML = '';

    visibleGists.forEach((gist) => {
      const filenames = Object.keys(gist.files);
      const mainTitle = gist.description || filenames[0] || 'Untitled Gist';
      const isStarred = this.starredIds.has(gist.id);

      const visibilityBadge = gist.public
        ? `<span class="gh-badge gh-badge-public">${lucideIcons.globe} Public</span>`
        : `<span class="gh-badge gh-badge-private">${lucideIcons.lock} Secret</span>`;

      const filesHtml = filenames
        .map((filename) => {
          return `
        <div class="gh-file-row">
          <div class="gh-file-left" title="Click to open ${filename} in Acode" data-filename="${filename}" style="cursor: pointer;">
            ${getFileIcon(filename, false)}
            <span class="gh-file-name">${filename}</span>
          </div>
          <div class="gh-file-actions">
            <button class="gh-btn-icon copy-file-content" title="Copy Raw Code" data-filename="${filename}">
              ${lucideIcons.copy}
            </button>
            <button class="gh-btn-icon gh-btn-icon-danger delete-file" title="Delete File" data-filename="${filename}">
              ${lucideIcons.trash}
            </button>
          </div>
        </div>
      `;
        })
        .join('');

      const item = document.createElement('div');
      item.className = 'gh-card';

      item.innerHTML = `
        <div class="gh-card-header">
          <div class="gh-card-title-group">
            <span class="gh-card-title" title="${mainTitle}">${mainTitle}</span>
          </div>
          <div class="gh-badges">
            <button class="gh-btn-icon star-gist-btn ${isStarred ? 'starred' : ''}" title="${isStarred ? 'Unstar Gist' : 'Star Gist'}" data-gist-id="${gist.id}">
              ${isStarred ? lucideIcons.starFilled : lucideIcons.star}
            </button>
            ${visibilityBadge}
          </div>
        </div>

        <p class="gh-card-desc">${filenames.length} file(s) &bull; ${gist.owner?.login ? `@${gist.owner.login}` : ''}</p>
        
        <div style="background: var(--gh-bg); border-radius: var(--gh-radius-sm); padding: 4px; margin-bottom: 8px;">
          ${filesHtml}
        </div>

        <div class="gh-card-actions">
          <button class="gh-btn gh-btn-secondary gh-card-action-btn add-file-to-gist" title="Add File">
            ${lucideIcons.plus}
            <span>Add File</span>
          </button>
          <button class="gh-btn gh-btn-secondary gh-card-action-btn edit-gist-desc" title="Edit Description">
            ${lucideIcons.edit}
            <span>Edit</span>
          </button>
          <button class="gh-btn gh-btn-secondary gh-card-action-btn copy-gist-url" data-url="${gist.html_url}" title="Copy URL">
            ${lucideIcons.copy}
            <span>Copy URL</span>
          </button>
          <button class="gh-btn gh-btn-danger gh-card-action-btn delete-gist" title="Delete Gist">
            ${lucideIcons.trash}
            <span>Delete</span>
          </button>
        </div>
      `;

      containerElement.appendChild(item);

      item.querySelectorAll<HTMLElement>('.gh-file-left').forEach((el) => {
        el.addEventListener('click', (e) => {
          const fn = (e.currentTarget as HTMLElement).dataset.filename;
          if (fn) this.handleOpenFile(gist.id, fn);
        });
      });

      item.querySelectorAll<HTMLElement>('.copy-file-content').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const fn = (e.currentTarget as HTMLElement).dataset.filename;
          if (!fn) return;
          const fileObj = gist.files[fn];
          await this.handleCopyFileContent(fileObj, gist.id);
        });
      });

      item.querySelectorAll<HTMLElement>('.delete-file').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const fn = (e.currentTarget as HTMLElement).dataset.filename;
          if (fn) this.handleDeleteFile(gist.id, fn);
        });
      });

      const starBtn = item.querySelector<HTMLElement>('.star-gist-btn');
      if (starBtn) {
        starBtn.addEventListener('click', () => this.handleStarGist(gist.id, starBtn));
      }

      const copyUrlBtn = item.querySelector<HTMLElement>('.copy-gist-url');
      if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', async (e) => {
          const url = (e.currentTarget as HTMLElement).dataset.url || gist.html_url;
          let copied = false;
          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(url);
              copied = true;
            } catch (_) {}
          }
          if (!copied && (window as any).cordova?.plugins?.clipboard?.copy) {
            try {
              await new Promise<void>((resolve, reject) => {
                (window as any).cordova.plugins.clipboard.copy(url, resolve, reject);
              });
              copied = true;
            } catch (_) {}
          }
          if (!copied) {
            try {
              const ta = document.createElement('textarea');
              ta.value = url;
              ta.setAttribute('readonly', '');
              ta.style.position = 'fixed';
              ta.style.left = '-9999px';
              ta.style.top = '-9999px';
              document.body.appendChild(ta);
              ta.focus();
              ta.select();
              copied = document.execCommand('copy');
              ta.remove();
            } catch (_) {}
          }
          showToast(copied ? 'Gist URL copied to clipboard!' : 'Failed to copy URL', copied ? 'success' : 'error');
        });
      }

      const addFileBtn = item.querySelector<HTMLElement>('.add-file-to-gist');
      if (addFileBtn) addFileBtn.addEventListener('click', () => this.handleAddFileToGist(gist.id));

      const editDescBtn = item.querySelector<HTMLElement>('.edit-gist-desc');
      if (editDescBtn) editDescBtn.addEventListener('click', () => this.handleEditDescription(gist.id, gist.description));

      const deleteGistBtn = item.querySelector<HTMLElement>('.delete-gist');
      if (deleteGistBtn) deleteGistBtn.addEventListener('click', () => this.handleDeleteGist(gist.id));
    });
  }

  async handleStarGist(gistId: string, starBtn: HTMLElement): Promise<void> {
    if (!this.api) return;
    const isCurrentlyStarred = this.starredIds.has(gistId);

    if (isCurrentlyStarred) {
      this.starredIds.delete(gistId);
      this.starredGists = this.starredGists.filter((g) => g.id !== gistId);
      starBtn.innerHTML = lucideIcons.star;
      starBtn.classList.remove('starred');
      starBtn.title = 'Star Gist';
    } else {
      this.starredIds.add(gistId);
      const found = this.gists.find((g) => g.id === gistId);
      if (found && !this.starredGists.some((g) => g.id === gistId)) {
        this.starredGists.unshift(found);
      }
      starBtn.innerHTML = lucideIcons.starFilled;
      starBtn.classList.add('starred');
      starBtn.title = 'Unstar Gist';
    }

    const starredCount = document.getElementById('count-starred');
    if (starredCount) starredCount.textContent = String(this.starredIds.size);

    try {
      if (isCurrentlyStarred) {
        await this.api.unstarGist(gistId);
        showToast('Gist unstarred', 'info');
      } else {
        await this.api.starGist(gistId);
        showToast('Gist starred!', 'success');
      }

      if (this.currentFilter === 'starred' && isCurrentlyStarred) {
        this.renderList();
      }
    } catch (err: any) {
      logger.error('Failed to update gist star:', err);
      if (isCurrentlyStarred) {
        this.starredIds.add(gistId);
      } else {
        this.starredIds.delete(gistId);
      }
      this.renderList();
      showToast(err.message || 'Failed to update star', 'error');
    }
  }

  async handleCopyFileContent(file: any, gistId?: string): Promise<void> {
    try {
      let content = file.content;

      if (!content && gistId && this.api) {
        showToast('Fetching snippet...', 'info', 1000);
        try {
          const fullGist = await this.api.getGist(gistId);
          if (fullGist?.files?.[file.filename]?.content) {
            content = fullGist.files[file.filename].content;
            file.content = content;
          }
        } catch (fetchErr) {
          logger.warn('Could not fetch full gist via API, trying raw download fallback:', fetchErr);
        }
      }

      if (!content && file.raw_url && this.api) {
        showToast('Fetching snippet...', 'info', 1000);
        const buffer = await this.api.downloadRawUrl(file.raw_url);
        content = new TextDecoder('utf-8').decode(buffer);
        file.content = content;
      }

      if (typeof content !== 'string') {
        showToast('Could not fetch file content', 'error');
        return;
      }

      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(content);
          copied = true;
        } catch (_) {}
      }

      if (!copied && (window as any).cordova?.plugins?.clipboard?.copy) {
        try {
          await new Promise<void>((resolve, reject) => {
            (window as any).cordova.plugins.clipboard.copy(content, resolve, reject);
          });
          copied = true;
        } catch (_) {}
      }

      if (!copied) {
        try {
          const ta = document.createElement('textarea');
          ta.value = content;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          ta.style.top = '-9999px';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          copied = document.execCommand('copy');
          ta.remove();
        } catch (_) {}
      }

      if (copied) {
        showToast('Code copied to clipboard!', 'success');
      } else {
        throw new Error('Clipboard access denied');
      }
    } catch (err: any) {
      logger.error('Failed to copy code:', err);
      showToast('Failed to copy code: ' + (err.message || String(err)), 'error');
    }
  }

  pickFileFromDevice(): Promise<{ name: string; content: string } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (event) =>
          resolve({ name: file.name, content: (event.target?.result as string) ?? '' });
        reader.onerror = () => {
          logger.error('Failed to read file from device');
          fluentAlert('Error', 'Failed to read file from device.');
          resolve(null);
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  async pickFileFromAcode(): Promise<{ name: string; content: string } | null> {
    try {
      const fileBrowser = acode.require('fileBrowser');
      const fsOperation = acode.require('fsOperation');
      if (!fileBrowser || !fsOperation) {
        fluentAlert('Error', 'Acode fileBrowser not available.');
        return null;
      }
      const res = await fileBrowser('file', 'Select file for snippet');
      if (!res || !res.url) return null;
      const content = await fsOperation(res.url).readFile('utf-8');
      const name = res.name || res.url.split('/').pop() || 'snippet.txt';
      return { name, content: content || '' };
    } catch (err: any) {
      logger.error('Failed to pick file from Acode:', err);
      fluentAlert('Error', 'Could not open file from Acode: ' + (err.message || String(err)));
      return null;
    }
  }

  handleCreateGist(): void {
    openCreateGistModal(this);
  }

  handleAddFileToGist(gistId: string): Promise<void> {
    return handleAddFileToGist(this, gistId);
  }

  handleDeleteGist(gistId: string): Promise<void> {
    return handleDeleteGist(this, gistId);
  }

  handleDeleteFile(gistId: string, filename: string): Promise<void> {
    return handleDeleteFile(this, gistId, filename);
  }

  handleEditDescription(gistId: string, currentDesc: string | null): Promise<void> {
    return handleEditDescription(this, gistId, currentDesc);
  }

  handleOpenFile(gistId: string, filename: string): Promise<void> {
    return handleOpenFile(this, gistId, filename);
  }
}
