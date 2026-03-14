import { getFileIcon, tablerIcons } from '../icons.js';
import { handleCreateGist, handleAddFileToGist } from './create.js';
import { handleDeleteGist, handleDeleteFile } from './delete.js';
import { handleEditDescription, handlePushFile } from './edit.js';
import { handleOpenFile } from './open.js';

export class GistManager {
  constructor(api) {
    this.api = api;
    this.gists = [];
    this.currentPage = 1;
    this.perPage = 30;
  }

  setApi(api) {
    this.api = api;
  }

  async render(container) {
    container.innerHTML = `
      <button id="btn-create-gist" class="gh-btn gh-btn-block gh-btn-success gh-mb-10">New Gist</button>
      <div id="gists-list" class="gh-text-muted">Loading gists...</div>
      <div id="load-more-container" class="gh-load-more">
        <button id="btn-load-more" class="gh-btn gh-btn-block gh-btn-secondary">Load More</button>
      </div>
    `;
    
    container.querySelector('#btn-create-gist').addEventListener('click', () => this.handleCreateGist());
    
    container.querySelector('#btn-load-more').addEventListener('click', () => {
      this.currentPage++;
      const loadMoreBtn = container.querySelector('#btn-load-more');
      loadMoreBtn.textContent = 'Loading...';
      this.loadGists(true).then(() => {
        loadMoreBtn.textContent = 'Load More';
      });
    });

    this.currentPage = 1;
    this.loadGists(false);
  }

  async loadGists(append = false) {
    const containerElement = document.getElementById('gists-list');
    if (!containerElement) return;

    try {
      if (!append) containerElement.innerHTML = '<p class="gh-text-muted">Fetching gists...</p>';

      const fetchedGists = await this.api.getGists(this.currentPage, this.perPage);
      
      if (!append) {
        this.gists = fetchedGists;
      } else {
        this.gists.push(...fetchedGists);
      }

      const loadMoreContainer = document.getElementById('load-more-container');
      if (loadMoreContainer) {
        loadMoreContainer.style.display = fetchedGists.length === this.perPage ? 'block' : 'none';
      }

      this.renderList();

    } catch (err) {
      if (!append) containerElement.innerHTML = '<p class="gh-text-muted" style="color: #f85149;">Failed to load gists.</p>';
    }
  }

  renderList() {
    const containerElement = document.getElementById('gists-list');
    if (!containerElement) return;

    if (this.gists.length === 0) {
      containerElement.innerHTML = '<p class="gh-text-muted">No gists found.</p>';
      return;
    }

    containerElement.innerHTML = '';
    
    this.gists.forEach(gist => {
      const filenames = Object.keys(gist.files);
      const mainTitle = gist.description || filenames[0] || 'Untitled Gist';
      
      const visibilityBadge = gist.public 
        ? '<span class="gh-badge gh-badge-public">Public</span>' 
        : '<span class="gh-badge gh-badge-private">Private</span>';

      const filesHtml = filenames.map(filename => `
        <div class="gh-gist-file">
          <span class="gh-gist-file-name" title="${filename}">   ${getFileIcon(filename, false)}    
          <span>${filename}</span> 
          </span>
          <div class="gh-gist-file-actions">
            <button class="gh-btn-icon gh-btn-icon-primary open-file" title="Open in Acode" data-filename="${filename}">Open</button>
            <button class="gh-btn-icon gh-btn-icon-success push-file" title="Push Active Tab to GitHub" data-filename="${filename}">Push</button>
            <button class="gh-btn-icon gh-btn-icon-danger delete-file" title="Delete File" data-filename="${filename}">Del</button>
          </div>
        </div>
      `).join('');

      const item = document.createElement('div');
      item.className = 'gh-gist-card';
      
      item.innerHTML = `
        <div class="gh-gist-header">
          <span class="gh-gist-title" title="${mainTitle}">${mainTitle}</span>
          ${visibilityBadge}
        </div>
        <p class="gh-gist-desc">${filenames.length} file(s)</p>
        
        <div class="gh-gist-files">
          ${filesHtml}
        </div>

        <div class="gh-gist-actions">
          <button class="gh-gist-action-btn gh-btn gh-btn-secondary add-file-to-gist">Add File</button>
          <button class="gh-gist-action-btn gh-btn gh-btn-secondary edit-gist-desc">Edit Desc</button>
          <button class="gh-gist-action-btn gh-btn gh-btn-secondary copy-gist-url" data-url="${gist.html_url}" title="Copy Gist URL">${tablerIcons.copy} Copy</button>
          <button class="gh-gist-action-btn gh-btn gh-btn-danger delete-gist">Delete</button>
        </div>
      `;
      
      containerElement.appendChild(item);

      item.querySelectorAll('.open-file').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleOpenFile(gist.id, e.target.dataset.filename));
      });
      
      item.querySelectorAll('.push-file').forEach(btn => {
        btn.addEventListener('click', (e) => this.handlePushFile(gist.id, e.target.dataset.filename));
      });
      
      item.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleDeleteFile(gist.id, e.target.dataset.filename));
      });

      item.querySelector('.copy-gist-url').addEventListener('click', (e) => {
        const url = e.currentTarget.dataset.url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url);
        } else if (window.cordova && window.cordova.plugins && window.cordova.plugins.clipboard) {
          window.cordova.plugins.clipboard.copy(url);
        }
        window.toast('URL Copied!', 2000);
      });

      item.querySelector('.add-file-to-gist').addEventListener('click', () => this.handleAddFileToGist(gist.id));
      item.querySelector('.edit-gist-desc').addEventListener('click', () => this.handleEditDescription(gist.id, gist.description));
      item.querySelector('.delete-gist').addEventListener('click', () => this.handleDeleteGist(gist.id));
    });
  }

  pickFileFromDevice() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => { acode.alert('Error', 'Failed to read file from device.'); resolve(null); };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  async getSourceContent() {
    const editorManager = window.editorManager || acode.require('editorManager');
    const openFiles = editorManager ? (editorManager.files || []) : [];
    const fileOptions = openFiles.map(f => [f.id, `Active Tab: ${f.name}`]);
    const sourceOptions = [
      ...fileOptions, 
      ['system_file', 'Pick from Device']
    ];

    const sourceId = await acode.select('Select Content Source', sourceOptions);
    if (!sourceId) return null;

    if (sourceId === 'system_file') return await this.pickFileFromDevice();
    
    const selectedFile = openFiles.find(f => f.id === sourceId);
    if (!selectedFile) {
      acode.alert('Error', 'File not found or closed.');
      return null;
    }
    return selectedFile.session.getValue();
  }

  async handleCreateGist() { return handleCreateGist(this); }
  async handleAddFileToGist(gistId) { return handleAddFileToGist(this, gistId); }
  async handleDeleteGist(gistId) { return handleDeleteGist(this, gistId); }
  async handleDeleteFile(gistId, filename) { return handleDeleteFile(this, gistId, filename); }
  async handleEditDescription(gistId, currentDesc) { return handleEditDescription(this, gistId, currentDesc); }
  async handlePushFile(gistId, filename) { return handlePushFile(this, gistId, filename); }
  async handleOpenFile(gistId, filename) { return handleOpenFile(this, gistId, filename); }
}
