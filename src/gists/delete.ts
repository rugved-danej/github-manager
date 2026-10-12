import type { GistManager } from './manager';

export async function handleDeleteFile(
  manager: GistManager,
  gistId: string,
  filename: string
): Promise<void> {
  if (!manager.api) {
    acode.alert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const confirm = await acode.confirm('Delete File', `Are you sure you want to delete ${filename}?`);
  if (!confirm) return;

  try {
    window.toast('Deleting file...', 2000);
    const updatedGist = await manager.api.deleteGistFile(gistId, filename);

    const index = manager.gists.findIndex((g) => g.id === gistId);
    if (index !== -1) manager.gists[index] = updatedGist;
    manager.renderList();
    window.toast('File deleted!', 3000);
  } catch (err: any) {
    acode.alert('Error', err.message || String(err));
  }
}

export async function handleDeleteGist(manager: GistManager, gistId: string): Promise<void> {
  if (!manager.api) {
    acode.alert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const confirm = await acode.confirm(
    'Delete Entire Gist',
    'Are you sure you want to delete this ENTIRE gist? This cannot be undone.'
  );
  if (!confirm) return;

  try {
    window.toast('Deleting gist...', 2000);
    await manager.api.deleteGist(gistId);

    manager.gists = manager.gists.filter((g) => g.id !== gistId);
    manager.renderList();
    window.toast('Gist deleted!', 3000);
  } catch (err: any) {
    acode.alert('Error', err.message || String(err));
  }
}
