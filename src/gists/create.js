export async function handleCreateGist(manager) {
  const filename = await acode.prompt('Filename', 'example.js');
  if (!filename) return;
  
  const description = await acode.prompt('Description', 'Created via Acode');
  if (description === null) return;

  const visibility = await acode.select('Visibility', [['private', 'Private (Secret Gist)'], ['public', 'Public (Visible to everyone)']]);
  if (!visibility) return;
  
  const content = await manager.getSourceContent();
  if (!content) return;

  try {
    window.toast('Creating gist...', 2000);
    const newGist = await manager.api.createGist(description, filename, content, visibility === 'public');
    
    manager.gists.unshift(newGist);
    manager.renderList();
    window.toast('Gist created!', 3000);
  } catch (err) { acode.alert('Error', err.message); }
}

export async function handleAddFileToGist(manager, gistId) {
  const filename = await acode.prompt('New Filename', 'script.js');
  if (!filename) return;

  const content = await manager.getSourceContent();
  if (!content) return;

  try {
    window.toast('Adding file...', 2000);
    const updatedGist = await manager.api.updateGist(gistId, undefined, filename, content); 
    
    const index = manager.gists.findIndex(g => g.id === gistId);
    if (index !== -1) manager.gists[index] = updatedGist;
    manager.renderList();
    window.toast('File added!', 3000);
  } catch (err) { acode.alert('Error', err.message || 'Failed to add file.'); }
}
