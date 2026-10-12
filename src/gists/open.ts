import { isImageFile, getImageMime } from '../ui/icons';
import { openInAcodeImageTab, imageToDataUrl } from '../ui/imageViewer';
import { fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { logger } from '../utils/logger';
import { closeSidebar } from '../utils/format';
import type { GistManager } from './manager';

export async function handleOpenFile(
  manager: GistManager,
  gistId: string,
  filename: string
): Promise<void> {
  if (!manager.api) {
    fluentAlert('Error', 'API client not initialized. Please login first.');
    return;
  }

  try {
    showToast('Fetching from GitHub...', 'info', 2000);
    const gistData = await manager.api.getGist(gistId);
    const file = gistData.files[filename];
    if (!file) {
      fluentAlert('Error', 'File not found in gist.');
      return;
    }

    if (isImageFile(filename)) {
      showToast('Loading image...', 'info', 1500);
      const mime = getImageMime(filename);
      let imgSrc = '';

      if (file.raw_url && manager.api) {
        try {
          const rawBuffer = await manager.api.downloadRawUrl(file.raw_url);
          imgSrc = await imageToDataUrl(rawBuffer, mime);
        } catch {
          if (file.content) {
            imgSrc = await imageToDataUrl(file.content, mime);
          } else {
            imgSrc = file.raw_url;
          }
        }
      } else if (file.content) {
        imgSrc = await imageToDataUrl(file.content, mime);
      } else {
        imgSrc = file.raw_url;
      }

      const uri = `gist://${gistId}/${filename}`;
      const opened = openInAcodeImageTab(filename, imgSrc, uri);
      if (opened) {
        closeSidebar();
        showToast(`Opened ${filename} in editor`, 'success', 2000);
      } else {
        fluentAlert('Image Error', 'Could not open image in editor tab.');
      }
      return;
    }

    acode.newEditorFile(filename, {
      text: file.content || '',
      isUnsaved: false,
      render: true
    });
    closeSidebar();

    showToast(`Opened ${filename} in editor`, 'success', 2000);
  } catch (err: any) {
    logger.error('Failed to open gist file:', err);
    fluentAlert('Error', err.message || 'Failed to open file.');
  }
}
