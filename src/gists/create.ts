import { lucideIcons } from '../ui/icons';
import { showToast } from '../ui/toast';
import { fluentAlert } from '../ui/dialog';
import { logger } from '../utils/logger';
import type { GistManager } from './manager';

export function openCreateGistModal(
  manager: GistManager,
  initialContent?: string,
  initialFilename?: string,
  initialIsPublic: boolean = false
): void {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  document.getElementById('gh-create-gist-modal')?.remove();

  const editorManager = window.editorManager || (window.acode?.require ? window.acode.require('editorManager') : null);
  const activeFile = editorManager?.activeFile;
  const defaultFilename = initialFilename || activeFile?.filename || 'snippet.js';

  let selectedVisibility = initialIsPublic ? 'public' : 'secret';
  let selectedSource: 'empty' | 'device' | 'acode' = 'empty';
  let pickedFile: { name: string; content: string } | null = null;

  const modal = document.createElement('div');
  modal.id = 'gh-create-gist-modal';
  modal.className = 'gh-modal-backdrop';

  modal.innerHTML = `
    <div class="gh-modal-container" style="max-width: 380px; width: 92vw;">
      <div class="gh-modal-header">
        <div class="gh-modal-title">
          <span class="gh-modal-icon">${lucideIcons.plus}</span>
          <span class="gh-modal-text">New Gist</span>
        </div>
        <button id="gh-gist-modal-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
      </div>

      <div class="gh-modal-body" style="flex-direction: column; align-items: stretch; gap: 10px; padding: 12px; max-height: 75vh;">
        <div class="gh-form-group">
          <label class="gh-form-label">Filename</label>
          <input type="text" id="gist-input-filename" class="gh-input" value="${defaultFilename}" placeholder="e.g. script.js, notes.md" autocomplete="off">
        </div>

        <div class="gh-form-group">
          <label class="gh-form-label">Description (optional)</label>
          <input type="text" id="gist-input-desc" class="gh-input" placeholder="What is this snippet for?" autocomplete="off">
        </div>

        <div class="gh-form-group">
          <label class="gh-form-label">Visibility</label>
          <div class="gh-pill-toggle">
            <button type="button" class="gh-pill-btn ${selectedVisibility === 'secret' ? 'active' : ''}" data-visibility="secret">
              ${lucideIcons.lock} Secret
            </button>
            <button type="button" class="gh-pill-btn ${selectedVisibility === 'public' ? 'active' : ''}" data-visibility="public">
              ${lucideIcons.globe} Public
            </button>
          </div>
        </div>

        ${
          !initialContent
            ? `
        <div class="gh-form-group">
          <label class="gh-form-label">Source Content</label>
          <div class="gh-pill-toggle stacked">
            <button type="button" class="gh-pill-btn active" data-source="empty">
              ${lucideIcons.file} <span>Empty File</span>
            </button>
            <button type="button" class="gh-pill-btn" data-source="device">
              ${lucideIcons.download} <span>From device file picker</span>
            </button>
            <button type="button" class="gh-pill-btn" data-source="acode">
              ${lucideIcons.folderOpen} <span>From Acode file picker</span>
            </button>
          </div>
        </div>
        `
            : ''
        }
      </div>

      <div class="gh-modal-footer">
        <button id="gh-gist-create-cancel" class="gh-btn gh-btn-sm gh-btn-secondary">Cancel</button>
        <button id="gh-gist-create-submit" class="gh-btn gh-btn-sm gh-btn-success">
          ${lucideIcons.plus} Create Gist
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const filenameInput = modal.querySelector<HTMLInputElement>('#gist-input-filename');
  const descInput = modal.querySelector<HTMLInputElement>('#gist-input-desc');
  const submitBtn = modal.querySelector<HTMLButtonElement>('#gh-gist-create-submit');

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#gh-gist-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#gh-gist-create-cancel')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelectorAll<HTMLButtonElement>('[data-visibility]').forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('[data-visibility]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedVisibility = btn.dataset.visibility || 'secret';
    });
  });

  modal.querySelectorAll<HTMLButtonElement>('[data-source]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const src = (btn.dataset.source || 'empty') as 'empty' | 'device' | 'acode';
      if (src === 'device') {
        const picked = await manager.pickFileFromDevice();
        if (picked) {
          pickedFile = picked;
          if (filenameInput) filenameInput.value = picked.name;
          showToast(`Loaded ${picked.name} from device`, 'info', 1500);
          modal.querySelectorAll('[data-source]').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedSource = src;
        }
      } else if (src === 'acode') {
        const picked = await manager.pickFileFromAcode();
        if (picked) {
          pickedFile = picked;
          if (filenameInput) filenameInput.value = picked.name;
          showToast(`Loaded ${picked.name} from Acode`, 'info', 1500);
          modal.querySelectorAll('[data-source]').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedSource = src;
        }
      } else {
        pickedFile = null;
        modal.querySelectorAll('[data-source]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSource = 'empty';
      }
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const filename = filenameInput?.value.trim();
      if (!filename) {
        showToast('Please specify a filename', 'warning');
        filenameInput?.focus();
        return;
      }

      const description = descInput?.value.trim() || 'Created via Acode';
      const isPublic = selectedVisibility === 'public';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';

      let content = '';
      if (initialContent) {
        content = initialContent;
      } else if (selectedSource === 'device') {
        if (!pickedFile) {
          pickedFile = await manager.pickFileFromDevice();
          if (!pickedFile) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${lucideIcons.plus} Create Gist`;
            return;
          }
        }
        content = pickedFile.content;
      } else if (selectedSource === 'acode') {
        if (!pickedFile) {
          pickedFile = await manager.pickFileFromAcode();
          if (!pickedFile) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${lucideIcons.plus} Create Gist`;
            return;
          }
        }
        content = pickedFile.content;
      } else {
        content = `// ${filename}\n`;
      }

      try {
        const newGist = await manager.api!.createGist(description, filename, content, isPublic);
        manager.gists.unshift(newGist);
        manager.renderList();
        closeModal();
        showToast('Gist created successfully!', 'success');
      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${lucideIcons.plus} Create Gist`;
        showToast(err.message || 'Failed to create gist', 'error');
      }
    });
  }

  filenameInput?.focus();
}

export function handleCreateGist(manager: GistManager): void {
  openCreateGistModal(manager);
}

export function handleCreateGistFromActiveFile(manager: GistManager, isPublic: boolean = false): void {
  if (!manager || !manager.api) {
    showToast('Please login to Github Manager first', 'error');
    return;
  }
  const editorManager = window.editorManager || (window.acode?.require ? window.acode.require('editorManager') : null);
  const activeFile = editorManager?.activeFile;
  if (!activeFile) {
    showToast('No active file open', 'warning');
    return;
  }
  const content = activeFile.session ? activeFile.session.getValue() : '';
  const filename = activeFile.filename || activeFile.name || 'snippet.txt';
  openCreateGistModal(manager, content, filename, isPublic);
}

export function handleCreateGistFromSelection(manager: GistManager, isPublic: boolean = false): void {
  if (!manager || !manager.api) {
    showToast('Please login to Github Manager first', 'error');
    return;
  }
  const editorManager = window.editorManager || (window.acode?.require ? window.acode.require('editorManager') : null);
  const activeFile = editorManager?.activeFile;
  const editor = editorManager?.editor;
  const selection = editor?.getSelectedText ? editor.getSelectedText() : '';

  if (!selection || !selection.trim()) {
    showToast('No text selected in editor', 'warning');
    return;
  }
  const filename = activeFile ? (activeFile.filename || activeFile.name) : 'snippet.txt';
  openCreateGistModal(manager, selection, filename, isPublic);
}

export async function handleAddFileToGist(manager: GistManager, gistId: string): Promise<void> {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  document.getElementById('gh-add-file-modal')?.remove();

  const editorManager = window.editorManager || (window.acode?.require ? window.acode.require('editorManager') : null);
  const activeFile = editorManager?.activeFile;
  const defaultFilename = activeFile?.filename || 'snippet.js';

  let selectedSource: 'empty' | 'device' | 'acode' = 'empty';
  let pickedFile: { name: string; content: string } | null = null;

  const modal = document.createElement('div');
  modal.id = 'gh-add-file-modal';
  modal.className = 'gh-modal-backdrop';

  modal.innerHTML = `
    <div class="gh-modal-container" style="max-width: 360px; width: 92vw;">
      <div class="gh-modal-header">
        <div class="gh-modal-title">
          <span class="gh-modal-icon">${lucideIcons.plus}</span>
          <span class="gh-modal-text">Add File to Gist</span>
        </div>
        <button id="gh-add-file-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
      </div>

      <div class="gh-modal-body" style="flex-direction: column; align-items: stretch; gap: 10px; padding: 12px;">
        <div class="gh-form-group">
          <label class="gh-form-label">New Filename</label>
          <input type="text" id="add-file-name" class="gh-input" value="${defaultFilename}" placeholder="e.g. helper.ts" autocomplete="off">
        </div>

        <div class="gh-form-group">
          <label class="gh-form-label">Source Content</label>
          <div class="gh-pill-toggle stacked">
            <button type="button" class="gh-pill-btn active" data-source="empty">
              ${lucideIcons.file} <span>Empty File</span>
            </button>
            <button type="button" class="gh-pill-btn" data-source="device">
              ${lucideIcons.download} <span>From device file picker</span>
            </button>
            <button type="button" class="gh-pill-btn" data-source="acode">
              ${lucideIcons.folderOpen} <span>From Acode file picker</span>
            </button>
          </div>
        </div>
      </div>

      <div class="gh-modal-footer">
        <button id="gh-add-file-cancel" class="gh-btn gh-btn-sm gh-btn-secondary">Cancel</button>
        <button id="gh-add-file-submit" class="gh-btn gh-btn-sm gh-btn-primary">
          ${lucideIcons.plus} Add File
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const filenameInput = modal.querySelector<HTMLInputElement>('#add-file-name');
  const submitBtn = modal.querySelector<HTMLButtonElement>('#gh-add-file-submit');

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#gh-add-file-close')?.addEventListener('click', closeModal);
  modal.querySelector('#gh-add-file-cancel')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelectorAll<HTMLButtonElement>('[data-source]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const src = (btn.dataset.source || 'empty') as 'empty' | 'device' | 'acode';
      if (src === 'device') {
        const picked = await manager.pickFileFromDevice();
        if (picked) {
          pickedFile = picked;
          if (filenameInput) filenameInput.value = picked.name;
          showToast(`Loaded ${picked.name} from device`, 'info', 1500);
          modal.querySelectorAll('[data-source]').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedSource = src;
        }
      } else if (src === 'acode') {
        const picked = await manager.pickFileFromAcode();
        if (picked) {
          pickedFile = picked;
          if (filenameInput) filenameInput.value = picked.name;
          showToast(`Loaded ${picked.name} from Acode`, 'info', 1500);
          modal.querySelectorAll('[data-source]').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedSource = src;
        }
      } else {
        pickedFile = null;
        modal.querySelectorAll('[data-source]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSource = 'empty';
      }
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const filename = filenameInput?.value.trim();
      if (!filename) {
        showToast('Please specify a filename', 'warning');
        filenameInput?.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding...';

      let content = '';
      if (selectedSource === 'device') {
        if (!pickedFile) {
          pickedFile = await manager.pickFileFromDevice();
          if (!pickedFile) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${lucideIcons.plus} Add File`;
            return;
          }
        }
        content = pickedFile.content;
      } else if (selectedSource === 'acode') {
        if (!pickedFile) {
          pickedFile = await manager.pickFileFromAcode();
          if (!pickedFile) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${lucideIcons.plus} Add File`;
            return;
          }
        }
        content = pickedFile.content;
      } else {
        content = `// ${filename}\n`;
      }

      try {
        const updatedGist = await manager.api!.updateGist(gistId, undefined, filename, content);
        const index = manager.gists.findIndex((g) => g.id === gistId);
        if (index !== -1) manager.gists[index] = updatedGist;
        manager.renderList();
        closeModal();
        showToast(`Added ${filename} to gist`, 'success');
      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${lucideIcons.plus} Add File`;
        showToast(err.message || 'Failed to add file', 'error');
      }
    });
  }

  filenameInput?.focus();
}
