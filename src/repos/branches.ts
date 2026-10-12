import { CustomSelectComponent } from '../ui/selectMenu';
import { lucideIcons } from '../ui/icons';
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
  } catch (err) {}
}

export async function handleCreateBranch(manager: RepoManager): Promise<void> {
  if (!manager.currentRepo || !manager.api) return;

  const newBranch = await acode.prompt('New Branch Name', 'feature-branch');
  if (!newBranch) return;

  try {
    window.toast(`Branching off ${manager.currentBranch}...`, 2000);
    await manager.api.createBranch(
      manager.currentRepo.owner,
      manager.currentRepo.repo,
      manager.currentBranch,
      newBranch
    );

    window.toast('Branch created successfully!', 3000);

    manager.currentBranch = newBranch;
    await manager.loadBranches(manager.currentRepo.owner, manager.currentRepo.repo);
    await manager.switchBranch(newBranch);
  } catch (err: any) {
    acode.alert('Error Creating Branch', err.message || String(err));
  }
}

export async function handleDeleteBranch(manager: RepoManager): Promise<void> {
  if (!manager.currentRepo || !manager.api) return;

  if (
    manager.currentBranch === 'main' ||
    manager.currentBranch === 'master' ||
    manager.currentBranch === manager.currentRepo.defaultBranch
  ) {
    acode.alert(
      'Action Blocked',
      `Cannot delete the default/base branch (${manager.currentBranch}) from the app.`
    );
    return;
  }

  const confirm = await acode.confirm(
    'Delete Branch',
    `Are you sure you want to delete branch <b>${manager.currentBranch}</b>?`
  );
  if (!confirm) return;

  try {
    window.toast('Deleting branch...', 2000);
    await manager.api.deleteBranch(
      manager.currentRepo.owner,
      manager.currentRepo.repo,
      manager.currentBranch
    );
    window.toast('Branch deleted!', 3000);

    manager.currentBranch = manager.currentRepo.defaultBranch;
    await manager.loadBranches(manager.currentRepo.owner, manager.currentRepo.repo);
    await manager.switchBranch(manager.currentRepo.defaultBranch);
  } catch (err: any) {
    acode.alert('Error Deleting Branch', err.message || String(err));
  }
}
