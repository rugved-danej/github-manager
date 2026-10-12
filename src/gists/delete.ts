import type { GistManager } from './manager';
import { fluentConfirm, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';

export async function handleDeleteFile(
  manager: GistManager,
  gistId: string,
  filename: string
): Promise<void> {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const confirm = await fluentConfirm({
    title: 'Delete File',
    message: `Are you sure you want to delete ${filename}?`,
    confirmText: 'Delete',
    danger: true
  });
  if (!confirm) return;

  try {
    showToast('Deleting file...', 'info', 2000);
    const updatedGist = await manager.api.deleteGistFile(gistId, filename);

    const index = manager.gists.findIndex((g) => g.id === gistId);
    if (index !== -1) manager.gists[index] = updatedGist;
    manager.renderList();
    showToast('File deleted!', 'success');
  } catch (err: any) {
    logger.error('Failed to delete gist file:', err);
    fluentAlert('Delete Failed', err.message || String(err));
  }
}

export async function handleDeleteGist(manager: GistManager, gistId: string): Promise<void> {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const confirm = await fluentConfirm({
    title: 'Delete Entire Gist',
    message: 'Are you sure you want to delete this ENTIRE gist? This cannot be undone.',
    confirmText: 'Delete Gist',
    danger: true
  });
  if (!confirm) return;

  try {
    showToast('Deleting gist...', 'info', 2000);
    await manager.api.deleteGist(gistId);

    manager.gists = manager.gists.filter((g) => g.id !== gistId);
    manager.starredIds.delete(gistId);
    manager.starredGists = manager.starredGists.filter((g) => g.id !== gistId);
    manager.renderList();
    showToast('Gist deleted!', 'success');
  } catch (err: any) {
    logger.error('Failed to delete gist:', err);
    fluentAlert('Delete Failed', err.message || String(err));
  }
}
