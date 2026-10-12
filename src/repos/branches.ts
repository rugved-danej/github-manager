import { CustomSelectComponent } from '../ui/selectMenu';
import { lucideIcons } from '../ui/icons';
import { fluentConfirm, fluentPrompt, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';
import type { RepoManager } from './manager';

export async function switchBranch(manager: RepoManager, newBranch: string): Promise<void> {
  if (!manager.currentRepo) return;
  manager.currentBranch = newBranch;
  await manager.openRepo(manager.currentRepo.owner, manager.currentRepo.repo, '', newBranch);
}

export async function loadBranches(manager: RepoManager, owner: string, repo: string): Promise<void> {
  if (!manager.api) return;
  try {
    const branches = await manager.api.getBranches(owner, repo);
    const branchWrap = document.getElementById('repo-branch-dropdown-wrap');
    if (branchWrap) {
      const options = branches.map((b) => ({
        value: b.name,
        label: b.name,
        icon: lucideIcons.branch
      }));

      if (manager.branchSelect) {
        manager.branchSelect.setOptions(options, manager.currentBranch);
      } else {
        manager.branchSelect = new CustomSelectComponent({
          container: branchWrap,
          id: 'repo-branch-select',
          prefixIcon: lucideIcons.branch,
          options,
          selectedValue: manager.currentBranch,
          onChange: (newBranch) => {
            manager.switchBranch(newBranch);
          }
        });
      }
    }
  } catch (err) {
    logger.error('Failed to load branches:', err);
  }
}

export async function handleCreateBranch(manager: RepoManager): Promise<void> {
  if (!manager.currentRepo || !manager.api) return;

  const newBranch = await fluentPrompt({
    title: 'New Branch Name',
    defaultValue: 'feature-branch',
    placeholder: 'Enter branch name...'
  });
  if (!newBranch) return;

  try {
    showToast(`Branching off ${manager.currentBranch}...`, 'info', 2000);
    await manager.api.createBranch(
      manager.currentRepo.owner,
      manager.currentRepo.repo,
      manager.currentBranch,
      newBranch
    );

    showToast('Branch created successfully!', 'success');

    manager.currentBranch = newBranch;
    await manager.loadBranches(manager.currentRepo.owner, manager.currentRepo.repo);
    await manager.switchBranch(newBranch);
  } catch (err: any) {
    logger.error('Failed to create branch:', err);
    fluentAlert('Error Creating Branch', err.message || String(err));
  }
}

export async function handleDeleteBranch(manager: RepoManager): Promise<void> {
  if (!manager.currentRepo || !manager.api) return;

  if (
    manager.currentBranch === 'main' ||
    manager.currentBranch === 'master' ||
    manager.currentBranch === manager.currentRepo.defaultBranch
  ) {
    fluentAlert(
      'Action Blocked',
      `Cannot delete the default/base branch (${manager.currentBranch}) from the app.`
    );
    return;
  }

  const confirm = await fluentConfirm({
    title: 'Delete Branch',
    message: `Are you sure you want to delete branch "${manager.currentBranch}"?`,
    confirmText: 'Delete Branch',
    danger: true
  });
  if (!confirm) return;

  try {
    showToast('Deleting branch...', 'info', 2000);
    await manager.api.deleteBranch(
      manager.currentRepo.owner,
      manager.currentRepo.repo,
      manager.currentBranch
    );
    showToast('Branch deleted!', 'success');

    manager.currentBranch = manager.currentRepo.defaultBranch;
    await manager.loadBranches(manager.currentRepo.owner, manager.currentRepo.repo);
    await manager.switchBranch(manager.currentRepo.defaultBranch);
  } catch (err: any) {
    logger.error('Failed to delete branch:', err);
    fluentAlert('Error Deleting Branch', err.message || String(err));
  }
}
