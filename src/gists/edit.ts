import type { GistManager } from './manager';
import { fluentPrompt, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';

export async function handleEditDescription(
  manager: GistManager,
  gistId: string,
  currentDescription: string | null
): Promise<void> {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  const newDesc = await fluentPrompt({
    title: 'Edit Description',
    defaultValue: currentDescription || '',
    placeholder: 'Enter gist description...'
  });
  if (newDesc === null || newDesc === currentDescription) return;

  try {
    showToast('Updating description...', 'info', 2000);
    const updatedGist = await manager.api.updateGist(gistId, newDesc, undefined, undefined);

    const index = manager.gists.findIndex((g) => g.id === gistId);
    if (index !== -1) manager.gists[index] = updatedGist;
    manager.renderList();
    showToast('Description updated!', 'success');
  } catch (err: any) {
    logger.error('Failed to update gist description:', err);
    fluentAlert('Update Failed', err.message || 'Failed to update description.');
  }
}

