import { getFileIcon, lucideIcons, isImageFile } from '../ui/icons';
import type { GitHubAPI } from '../api/github';
import type { GitHubGist } from '../types/github';
import { handleCreateGist, handleAddFileToGist } from './create';
import { handleDeleteGist, handleDeleteFile } from './delete';
import { handleEditDescription, handlePushFile } from './edit';
import { handleOpenFile } from './open';

export class GistManager {
  api: GitHubAPI | null;
  gists: GitHubGist[];
  currentPage: number;
  perPage: number;
  searchQuery: string;

  constructor(api: GitHubAPI | null) {
    this.api = api;
    this.gists = [];
    this.currentPage = 1;
    this.perPage = 30;
    this.searchQuery = '';
  }

  setApi(api: GitHubAPI | null): void {
    this.api = api;
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
          <button id="gist-search-clear" class="gh-search-clear" title="Clear search">${lucideIcons.x}</button>
        </div>
      </div>

      <div id="gists-list" class="gh-text-muted">Loading gists...</div>
      
      <div id="load-more-container" class="gh-load-more" style="margin-top: 10px;">
        <button id="btn-load-more" class="gh-btn gh-btn-block gh-btn-secondary">Load More Gists</button>
      </div>
    `;

    const createGistBtn = container.querySelector<HTMLElement>('#btn-create-gist');
    if (createGistBtn) createGistBtn.addEventListener('click', () => this.handleCreateGist());

    const searchInput = container.querySelector<HTMLInputElement>('#gist-search');
    const searchClear = container.querySelector<HTMLElement>('#gist-search-clear');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase().trim();
        if (searchClear) searchClear.style.display = this.searchQuery ? 'inline-flex' : 'none';
        this.renderList();
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        searchClear.style.display = 'none';
        searchInput.focus();
        this.renderList();
      });
    }

    const loadMoreBtn = container.querySelector<HTMLElement>('#btn-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.currentPage++;
        loadMoreBtn.textContent = 'Loading...';
        this.loadGists(true).then(() => {
          loadMoreBtn.textContent = 'Load More Gists';
        });
      });
    }

    this.currentPage = 1;
    this.searchQuery = '';
    await this.loadGists(false);
  }

  async loadGists(append = false, silent = false): Promise<void> {
    const containerElement = document.getElementById('gists-list');
    if (!containerElement) return;

    if (!this.api) {
      if (!append) containerElement.innerHTML = '<p class="gh-text-muted">Please login to view gists.</p>';
      return;
    }

    try {
      if (!append && !silent) containerElement.innerHTML = '<p class="gh-text-muted">Fetching gists...</p>';

      const fetchedGists = await this.api.getGists(this.currentPage, this.perPage);

      if (!append) {
        this.gists = fetchedGists;
      } else {
        this.gists.push(...fetchedGists);
      }

      // Update badge counter in tabs
      const countBadge = document.getElementById('tab-gists-count');
      if (countBadge) countBadge.textContent = String(this.gists.length);

      const loadMoreContainer = document.getElementById('load-more-container');
      if (loadMoreContainer) {
        loadMoreContainer.style.display = fetchedGists.length === this.perPage ? 'block' : 'none';
      }

      this.renderList();
    } catch (err) {
      if (!append && !silent) {
        containerElement.innerHTML = '<p class="gh-text-muted" style="color: #f85149;">Failed to load gists.</p>';
      }
    }
  }

  renderList(): void {
    const containerElement = document.getElementById('gists-list');
    if (!containerElement) return;

    const query = this.searchQuery.trim().toLowerCase();
    const visibleGists = query
      ? this.gists.filter((g) => {
          const descMatch = (g.description || '').toLowerCase().includes(query);
          const fileMatch = Object.keys(g.files).some((f) => f.toLowerCase().includes(query));
          return descMatch || fileMatch;
        })
      : this.gists;

    if (visibleGists.length === 0) {
      containerElement.innerHTML = query
        ? '<p class="gh-text-muted" style="padding: 24px 0;">No matching gists found.</p>'
        : '<p class="gh-text-muted" style="padding: 24px 0;">No gists found.</p>';
      return;
    }

    containerElement.innerHTML = '';

    visibleGists.forEach((gist) => {
      const filenames = Object.keys(gist.files);
      const mainTitle = gist.description || filenames[0] || 'Untitled Gist';

      const visibilityBadge = gist.public
        ? `<span class="gh-badge gh-badge-public">${lucideIcons.globe} Public</span>`
        : `<span class="gh-badge gh-badge-private">${lucideIcons.lock} Secret</span>`;

      const filesHtml = filenames
        .map(
          (filename) => {
            const isImg = isImageFile(filename);
            return `
        <div class="gh-file-row">
          <div class="gh-file-left" title="${filename}" data-filename="${filename}" style="cursor: pointer;">
            ${getFileIcon(filename, false)}
            <span class="gh-file-name">${filename}</span>
          </div>
          <div class="gh-file-actions">
            <button class="gh-btn-icon gh-btn-icon-primary open-file" title="${isImg ? 'Preview Image' : 'Open in Acode'}" data-filename="${filename}">
              ${isImg ? lucideIcons.eye : lucideIcons.code}
            </button>
            <button class="gh-btn-icon push-file" style="color: var(--gh-success);" title="Push Active Tab to GitHub" data-filename="${filename}">
              ${lucideIcons.rocket}
            </button>
            <button class="gh-btn-icon gh-btn-icon-danger delete-file" title="Delete File" data-filename="${filename}">
              ${lucideIcons.trash}
            </button>
          </div>
        </div>
      `;
          }
        )
        .join('');

      const item = document.createElement('div');
      item.className = 'gh-card';

      item.innerHTML = `
        <div class="gh-card-header">
          <div class="gh-card-title-group">
            <span class="gh-card-title" title="${mainTitle}">${mainTitle}</span>
          </div>
          <div class="gh-badges">
            ${visibilityBadge}
          </div>
        </div>

        <p class="gh-card-desc">${filenames.length} file(s)</p>
        
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
            <span>Copy</span>
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

      item.querySelectorAll<HTMLElement>('.open-file').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const fn = (e.currentTarget as HTMLElement).dataset.filename;
          if (fn) this.handleOpenFile(gist.id, fn);
        });
      });

      item.querySelectorAll<HTMLElement>('.push-file').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const fn = (e.currentTarget as HTMLElement).dataset.filename;
          if (fn) this.handlePushFile(gist.id, fn);
        });
      });

      item.querySelectorAll<HTMLElement>('.delete-file').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const fn = (e.currentTarget as HTMLElement).dataset.filename;
          if (fn) this.handleDeleteFile(gist.id, fn);
        });
      });

      const copyUrlBtn = item.querySelector<HTMLElement>('.copy-gist-url');
      if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', (e) => {
          const url = (e.currentTarget as HTMLElement).dataset.url || gist.html_url;
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url);
          } else if ((window as any).cordova?.plugins?.clipboard) {
            (window as any).cordova.plugins.clipboard.copy(url);
          }
          window.toast('URL Copied to clipboard!', 2000);
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

  pickFileFromDevice(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (event) => resolve((event.target?.result as string) ?? null);
        reader.onerror = () => {
          acode.alert('Error', 'Failed to read file from device.');
          resolve(null);
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  async getSourceContent(): Promise<string | null> {
    const editorManager = window.editorManager || acode.require('editorManager');
    const openFiles = editorManager ? editorManager.files || [] : [];
    const fileOptions: [string, string][] = openFiles.map((f: any) => [f.id, `Active Tab: ${f.name}`]);
    const sourceOptions: [string, string][] = [
      ...fileOptions,
      ['system_file', 'Pick from Device']
    ];

    const sourceId = await acode.select('Select Content Source', sourceOptions);
    if (!sourceId) return null;

    if (sourceId === 'system_file') return await this.pickFileFromDevice();

    const selectedFile = openFiles.find((f: any) => f.id === sourceId);
    if (!selectedFile) {
      acode.alert('Error', 'File not found or closed.');
      return null;
    }
    return selectedFile.session.getValue();
  }

  async handleCreateGist(): Promise<void> {
    return handleCreateGist(this);
  }

  async handleAddFileToGist(gistId: string): Promise<void> {
    return handleAddFileToGist(this, gistId);
  }

  async handleDeleteGist(gistId: string): Promise<void> {
    return handleDeleteGist(this, gistId);
  }

  async handleDeleteFile(gistId: string, filename: string): Promise<void> {
    return handleDeleteFile(this, gistId, filename);
  }

  async handleEditDescription(gistId: string, currentDesc: string | null): Promise<void> {
    return handleEditDescription(this, gistId, currentDesc);
  }

  async handlePushFile(gistId: string, filename: string): Promise<void> {
    return handlePushFile(this, gistId, filename);
  }

  async handleOpenFile(gistId: string, filename: string): Promise<void> {
    return handleOpenFile(this, gistId, filename);
  }
}
