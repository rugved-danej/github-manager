export async function handleDeleteFile(manager, gistId, filename) {
  const confirm = await acode.confirm('Delete File', `Are you sure you want to delete ${filename}?`);
  if (!confirm) return;

  try {
    window.toast('Deleting file...', 2000);
    const updatedGist = await manager.api.deleteGistFile(gistId, filename);
    
    const index = manager.gists.findIndex(g => g.id === gistId);
    if (index !== -1) manager.gists[index] = updatedGist;
    manager.renderList();
    window.toast('File deleted!', 3000);
  } catch (err) { acode.alert('Error', err.message); }
}

export async function handleDeleteGist(manager, gistId) {
  const confirm = await acode.confirm('Delete Entire Gist', 'Are you sure you want to delete this ENTIRE gist? This cannot be undone.');
  if (!confirm) return;

  try {
    window.toast('Deleting gist...', 2000);
    await manager.api.deleteGist(gistId);
    
    manager.gists = manager.gists.filter(g => g.id !== gistId);
    manager.renderList();
    window.toast('Gist deleted!', 3000);
  } catch (err) { acode.alert('Error', err.message); }
}
