import { fluentPrompt, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';
import type { RepoManager } from './manager';

export async function handleQuickCommit(repoManager: RepoManager | null): Promise<void> {
  if (!repoManager || !repoManager.api) {
    fluentAlert('Error', 'Please login to Github Manager first.');
    return;
  }

  const editorManager = window.editorManager || acode.require('editorManager');
  const activeFile = editorManager ? editorManager.activeFile : null;

  if (!activeFile) {
    fluentAlert('Error', 'No active file open to commit.');
    return;
  }

  if (!repoManager.repos || repoManager.repos.length === 0) {
    fluentAlert('Error', 'No repositories loaded. Please open the Github Manager sidebar first.');
    return;
  }

  const repoOptions: [string, string][] = repoManager.repos.map((r) => [r.name, r.name]);
  const repoName = await acode.select('Select Repository', repoOptions);
  if (!repoName) return;

  const repo = repoManager.repos.find((r) => r.name === repoName);
  if (!repo) return;

  const branch = repo.default_branch || 'main';

  const filePath = await fluentPrompt({
    title: 'File Path in Repo',
    defaultValue: activeFile.name,
    placeholder: 'e.g. src/main.js'
  });
  if (!filePath) return;

  const message = await fluentPrompt({
    title: 'Commit Message',
    defaultValue: `Quick commit: Update ${filePath}`,
    placeholder: 'Enter commit message...'
  });
  if (!message) return;

  const content = activeFile.session.getValue();

  try {
    showToast('Quick Committing...', 'info', 2000);
    await repoManager.api.commitMultipleFiles(repo.owner.login, repo.name, branch, message, [
      { path: filePath, content: content }
    ]);
    showToast('Committed successfully!', 'success');
  } catch (err: any) {
    logger.error('Quick commit failed:', err);
    fluentAlert('Commit Failed', err.message || String(err));
  }
}
