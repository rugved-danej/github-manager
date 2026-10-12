import { fluentPrompt, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';
import type { RepoManager } from './manager';

export async function handleDeleteRepo(manager: RepoManager, owner: string, repoName: string): Promise<void> {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const confirm = await fluentPrompt({
    title: 'Delete Repository',
    message: `Type "${repoName}" to confirm deletion.\nWarning: This cannot be undone!`,
    placeholder: repoName,
    confirmText: 'Delete Forever',
    danger: true
  });

  if (confirm !== repoName) {
    if (confirm !== null) showToast('Repository name did not match. Deletion cancelled.', 'warning', 3000);
    return;
  }

  try {
    showToast('Deleting repository...', 'info', 2000);
    await manager.api.deleteRepo(owner, repoName);
    manager.repos = manager.repos.filter((r) => !(r.name === repoName && r.owner.login === owner));
    manager.renderRepos();
    showToast('Repository deleted successfully!', 'success', 3000);
  } catch (err: any) {
    logger.error('Failed to delete repository:', err);
    fluentAlert('Delete Failed', err.message || String(err));
  }
}
