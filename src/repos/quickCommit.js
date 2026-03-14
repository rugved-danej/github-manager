export async function handleQuickCommit(repoManager) {
  if (!repoManager || !repoManager.api) {
    acode.alert('Error', 'Please login to Github Manager first.');
    return;
  }
  
  const editorManager = window.editorManager || acode.require('editorManager');
  const activeFile = editorManager ? editorManager.activeFile : null;
  
  if (!activeFile) {
    acode.alert('Error', 'No active file open to commit.');
    return;
  }

  if (!repoManager.repos || repoManager.repos.length === 0) {
    acode.alert('Error', 'No repositories loaded. Please open the Github Manager sidebar first.');
    return;
  }

  const repoOptions = repoManager.repos.map(r => [r.name, r.name]);
  const repoName = await acode.select('Select Repository', repoOptions);
  if (!repoName) return;

  const repo = repoManager.repos.find(r => r.name === repoName);
  const branch = repo.default_branch || 'main';

  const filePath = await acode.prompt('File path in repo (e.g. src/main.js)', activeFile.name);
  if (!filePath) return;

  const message = await acode.prompt('Commit Message', `Quick commit: Update ${filePath}`);
  if (!message) return;

  const content = activeFile.session.getValue();

  try {
    window.toast('Quick Committing...', 2000);
    await repoManager.api.commitMultipleFiles(repo.owner.login, repo.name, branch, message, [
      { path: filePath, content: content }
    ]);
    window.toast('Committed successfully!', 3000);
  } catch (err) {
    acode.alert('Commit Failed', err.message);
  }
}
