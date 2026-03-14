export async function handleOpenFile(manager, gistId, filename) {
  try {
    window.toast('Fetching from GitHub...', 2000);
    const gistData = await manager.api.getGist(gistId);
    const content = gistData.files[filename]?.content || '';
    
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
