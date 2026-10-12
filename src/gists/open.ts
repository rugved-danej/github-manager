import { isImageFile, getImageMime } from '../ui/icons';
import { openImageViewer, imageToDataUrl } from '../ui/imageViewer';
import type { GistManager } from './manager';

export async function handleOpenFile(
  manager: GistManager,
  gistId: string,
  filename: string
): Promise<void> {
  if (!manager.api) {
    acode.alert('Error', 'API client not initialized. Please login first.');
    return;
  }

  try {
    window.toast('Fetching from GitHub...', 2000);
    const gistData = await manager.api.getGist(gistId);
    const file = gistData.files[filename];
    if (!file) {
      acode.alert('Error', 'File not found in gist.');
      return;
    }

    if (isImageFile(filename)) {
      window.toast('Loading image...', 1500);
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

      openImageViewer(filename, imgSrc, {
        uri: `gist://${gistId}/${filename}`,
        downloadUrl: file.raw_url
      });
      return;
    }

    acode.newEditorFile(filename, {
      text: file.content || '',
      isUnsaved: false,
      render: true
    });

    window.toast(`Opened ${filename} in Acode`, 2000);
  } catch (err: any) {
    acode.alert('Error', err.message || 'Failed to open file.');
  }
}
