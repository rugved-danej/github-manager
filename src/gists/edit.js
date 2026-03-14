export async function handleEditDescription(manager, gistId, currentDescription) {
  const newDesc = await acode.prompt('Edit Description', currentDescription || '');
  if (newDesc === null || newDesc === currentDescription) return;

  try {
    window.toast('Updating description...', 2000);
    const updatedGist = await manager.api.updateGist(gistId, newDesc, undefined, undefined);
    
    const index = manager.gists.findIndex(g => g.id === gistId);
    if (index !== -1) manager.gists[index] = updatedGist;
    manager.renderList();
    window.toast('Description updated!', 3000);
  } catch (err) { acode.alert('Error', err.message || 'Failed to update description.'); }
}

export async function handlePushFile(manager, gistId, filename) {
  const editorManager = window.editorManager || acode.require('editorManager');
  const activeFile = editorManager ? editorManager.activeFile : null;
  
  if (!activeFile) {
    acode.alert('Error', 'No active tab is open in Acode to push.');
    return;
  }

  const confirm = await acode.confirm('Push to GitHub', `Push the code from your currently active tab to <b>${filename}</b> on GitHub?`);
  if (!confirm) return;

  const content = activeFile.session.getValue();

  try {
    window.toast('Pushing to GitHub...', 2000);
    const updatedGist = await manager.api.updateGist(gistId, undefined, filename, content);
    
    const index = manager.gists.findIndex(g => g.id === gistId);
    if (index !== -1) manager.gists[index] = updatedGist;
    manager.renderList();
    window.toast('Pushed successfully!', 3000);
  } catch (err) { 
    acode.alert('Error', err.message || 'Failed to update file.'); 
  }
}
