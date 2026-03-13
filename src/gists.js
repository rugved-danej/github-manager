export class GistManager {
  constructor(api) {
    this.api = api;
    this.gists = [];
    
    // Pagination state
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
    
    // Setup Load More
    container.querySelector('#btn-load-more').addEventListener('click', () => {
      this.currentPage++;
      const loadMoreBtn = container.querySelector('#btn-load-more');
      loadMoreBtn.textContent = 'Loading...';
      this.loadGists(true).then(() => {
        loadMoreBtn.textContent = 'Load More';
      });
    });

    // Reset pagination when re-rendered
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

      // Replaced 'Edit' with 'Open' and 'Push'
      const filesHtml = filenames.map(filename => `
        <div class="gh-gist-file">
          <span class="gh-gist-file-name" title="${filename}">📄 ${filename}</span>
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
          <button class="gh-gist-action-btn gh-btn gh-btn-danger delete-gist">Delete</button>
        </div>
      `;
      
      containerElement.appendChild(item);

      // Event Listeners for the new Open and Push buttons
      item.querySelectorAll('.open-file').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleOpenFile(gist.id, e.target.dataset.filename));
      });
      
      item.querySelectorAll('.push-file').forEach(btn => {
        btn.addEventListener('click', (e) => this.handlePushFile(gist.id, e.target.dataset.filename));
      });
      
      item.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleDeleteFile(gist.id, e.target.dataset.filename));
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

  // Simplified Source Picker (No more manual text modal)
  async getSourceContent() {
    const openFiles = window.editorManager?.files || [];
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

  // --- NATIVE ACODE EDITOR ACTIONS ---

    async handleOpenFile(gistId, filename) {
    try {
      window.toast('Fetching from GitHub...', 2000);
      const gistData = await this.api.getGist(gistId);
      const content = gistData.files[filename]?.content || '';
      
      // Correct Acode API for opening a new virtual file
      // format: acode.newEditorFile(filename, { text, isUnsaved, render })
      acode.newEditorFile(filename, { 
        text: content,
        isUnsaved: false,
        render: true
      });
      
      window.toast(`Opened ${filename} in Acode`, 2000);
    } catch (err) {
      acode.alert('Error', err.message || 'Failed to open file.');
    }
  }


  async handlePushFile(gistId, filename) {
    // Grab whatever file the user is currently looking at in Acode
    const activeFile = window.editorManager?.activeFile;
    if (!activeFile) {
      acode.alert('Error', 'No active tab is open in Acode to push.');
      return;
    }

    const confirm = await acode.confirm('Push to GitHub', `Push the code from your currently active tab to <b>${filename}</b> on GitHub?`);
    if (!confirm) return;

    const content = activeFile.session.getValue();

    try {
      window.toast('Pushing to GitHub...', 2000);
      const updatedGist = await this.api.updateGist(gistId, undefined, filename, content);
      
      const index = this.gists.findIndex(g => g.id === gistId);
      if (index !== -1) this.gists[index] = updatedGist;
      this.renderList();
      window.toast('Pushed successfully!', 3000);
    } catch (err) { 
      acode.alert('Error', err.message || 'Failed to update file.'); 
    }
  }

  // --- STANDARD GIST ACTIONS ---

  async handleCreateGist() {
    const filename = await acode.prompt('Filename', 'example.js');
    if (!filename) return;
    
    const description = await acode.prompt('Description', 'Created via Acode');
    if (description === null) return;

    const visibility = await acode.select('Visibility', [['private', 'Private (Secret Gist)'], ['public', 'Public (Visible to everyone)']]);
    if (!visibility) return;
    
    // Grabs from an Acode tab
    const content = await this.getSourceContent();
    if (!content) return;

    try {
      window.toast('Creating gist...', 2000);
      const newGist = await this.api.createGist(description, filename, content, visibility === 'public');
      
      this.gists.unshift(newGist);
      this.renderList();
      window.toast('Gist created!', 3000);
    } catch (err) { acode.alert('Error', err.message); }
  }

  async handleAddFileToGist(gistId) {
    const filename = await acode.prompt('New Filename', 'script.js');
    if (!filename) return;

    const content = await this.getSourceContent();
    if (!content) return;

    try {
      window.toast('Adding file...', 2000);
      const updatedGist = await this.api.updateGist(gistId, undefined, filename, content); 
      
      const index = this.gists.findIndex(g => g.id === gistId);
      if (index !== -1) this.gists[index] = updatedGist;
      this.renderList();
      window.toast('File added!', 3000);
    } catch (err) { acode.alert('Error', err.message || 'Failed to add file.'); }
  }

  async handleEditDescription(gistId, currentDescription) {
    const newDesc = await acode.prompt('Edit Description', currentDescription || '');
    if (newDesc === null || newDesc === currentDescription) return;

    try {
      window.toast('Updating description...', 2000);
      const updatedGist = await this.api.updateGist(gistId, newDesc, undefined, undefined);
      
      const index = this.gists.findIndex(g => g.id === gistId);
      if (index !== -1) this.gists[index] = updatedGist;
      this.renderList();
      window.toast('Description updated!', 3000);
    } catch (err) { acode.alert('Error', err.message || 'Failed to update description.'); }
  }

  async handleDeleteFile(gistId, filename) {
    const confirm = await acode.confirm('Delete File', `Are you sure you want to delete ${filename}?`);
    if (!confirm) return;

    try {
      window.toast('Deleting file...', 2000);
      const updatedGist = await this.api.deleteGistFile(gistId, filename);
      
      const index = this.gists.findIndex(g => g.id === gistId);
      if (index !== -1) this.gists[index] = updatedGist;
      this.renderList();
      window.toast('File deleted!', 3000);
    } catch (err) { acode.alert('Error', err.message); }
  }

  async handleDeleteGist(gistId) {
    const confirm = await acode.confirm('Delete Entire Gist', 'Are you sure you want to delete this ENTIRE gist? This cannot be undone.');
    if (!confirm) return;

    try {
      window.toast('Deleting gist...', 2000);
      await this.api.deleteGist(gistId);
      
      this.gists = this.gists.filter(g => g.id !== gistId);
      this.renderList();
      window.toast('Gist deleted!', 3000);
    } catch (err) { acode.alert('Error', err.message); }
  }
}
