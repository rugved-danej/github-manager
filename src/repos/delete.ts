import type { RepoManager } from './manager';

export async function handleDeleteRepo(manager: RepoManager, owner: string, repoName: string): Promise<void> {
  if (!manager.api) {
    acode.alert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const confirm = await acode.prompt('Delete Repository', '', 'text', {
    placeholder: `Type "${repoName}" to confirm deletion. THIS CANNOT BE UNDONE.`
  });
  if (confirm !== repoName) {
    if (confirm !== null) window.toast('Repository name did not match. Cancelled.', 3000);
    return;
  }

  try {
    window.toast('Deleting repository...', 2000);
    await manager.api.deleteRepo(owner, repoName);
    manager.repos = manager.repos.filter((r) => !(r.name === repoName && r.owner.login === owner));
    manager.renderRepos();
    window.toast('Repository deleted!', 3000);
  } catch (err: any) {
    acode.alert('Error', err.message || String(err));
  }
}
