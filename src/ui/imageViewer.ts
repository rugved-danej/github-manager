import { lucideIcons } from './icons';

export interface ImageViewerOptions {
  uri?: string;
  onClose?: () => void;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to convert blob to data URL'));
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

export function arrayBufferToDataUrl(buffer: ArrayBuffer | Uint8Array, mime: string): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.length;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function imageToDataUrl(
  data: ArrayBuffer | Uint8Array | string,
  mime: string
): Promise<string> {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('data:')) return trimmed;
    if (trimmed.startsWith('{') && trimmed.includes('"content"')) {
      try {
        const json = JSON.parse(trimmed);
        if (json.content && json.encoding === 'base64') {
          return `data:${mime};base64,${json.content.replace(/\s+/g, '')}`;
        }
      } catch {}
    }
    return `data:${mime};base64,${trimmed.replace(/\s+/g, '')}`;
  }

  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  if (bytes.length > 0 && bytes[0] === 0x7B) {
    try {
      const text = new TextDecoder('utf-8').decode(bytes);
      const json = JSON.parse(text);
      if (json.content && json.encoding === 'base64') {
        return `data:${mime};base64,${json.content.replace(/\s+/g, '')}`;
      }
    } catch {}
  }

  try {
    const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
    return await blobToDataUrl(blob);
  } catch {
    return arrayBufferToDataUrl(bytes, mime);
  }
}

export function createAcodeImageContainer(imageSrc: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'image-container';
  Object.assign(container.style, {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#181a1f',
    touchAction: 'none',
    userSelect: 'none'
  });

  const imgEl = document.createElement('img');
  imgEl.src = imageSrc;
  Object.assign(imgEl.style, {
    maxWidth: '100%',
    maxHeight: '100%',
    transformOrigin: 'center',
    transform: 'scale(1) translate(0px, 0px)',
    transition: 'none',
    cursor: 'move',
    userSelect: 'none'
  });

  let scale = 1;
  let startX = 0;
  let startY = 0;
  let translateX = 0;
  let translateY = 0;
  let lastX = 0;
  let lastY = 0;

  function getBoundaries() {
    const containerRect = container.getBoundingClientRect();
    const imgRect = imgEl.getBoundingClientRect();
    const maxX = (imgRect.width * scale - containerRect.width) / (2 * scale);
    const maxY = (imgRect.height * scale - containerRect.height) / (2 * scale);

    return {
      maxX: Math.max(0, maxX),
      maxY: Math.max(0, maxY),
      minX: -Math.max(0, maxX),
      minY: -Math.max(0, maxY)
    };
  }

  function constrainTranslation() {
    const bounds = getBoundaries();
    translateX = Math.min(Math.max(translateX, bounds.minX), bounds.maxX);
    translateY = Math.min(Math.max(translateY, bounds.minY), bounds.maxY);
  }

  container.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const oldScale = scale;
      scale = Math.max(0.1, Math.min(5, scale + delta));

      const rect = imgEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleChange = scale / oldScale;
      translateX = mouseX - (mouseX - translateX) * scaleChange;
      translateY = mouseY - (mouseY - translateY) * scaleChange;

      constrainTranslation();
      imgEl.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    },
    { passive: false }
  );

  function onDrag(e: MouseEvent) {
    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;
    translateX += deltaX / scale;
    translateY += deltaY / scale;
    lastX = e.clientX;
    lastY = e.clientY;
    constrainTranslation();
    imgEl.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  }

  function onTouchDrag(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastX;
      const deltaY = touch.clientY - lastY;
      translateX += deltaX / scale;
      translateY += deltaY / scale;
      lastX = touch.clientX;
      lastY = touch.clientY;
      constrainTranslation();
      imgEl.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentX = Math.abs(touch1.clientX - touch2.clientX);
      const currentY = Math.abs(touch1.clientY - touch2.clientY);

      const startDist = Math.sqrt(startX * startX + startY * startY);
      const currentDist = Math.sqrt(currentX * currentX + currentY * currentY);

      const delta = (currentDist - startDist) / 100;
      scale = Math.max(0.1, Math.min(5, scale + delta));
      constrainTranslation();
      imgEl.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;

      startX = currentX;
      startY = currentY;
    }
  }

  function stopDrag() {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', onTouchDrag);
    document.removeEventListener('touchend', stopDrag);
  }

  function startDrag(e: MouseEvent | Touch) {
    lastX = e.clientX;
    lastY = e.clientY;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', onTouchDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
  }

  container.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 0) startDrag(e);
  });

  container.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0]);
      } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        startX = Math.abs(touch1.clientX - touch2.clientX);
        startY = Math.abs(touch1.clientY - touch2.clientY);
      }
    },
    { passive: true }
  );

  container.appendChild(imgEl);
  return container;
}

export function openInAcodeImageTab(filename: string, imageSrc: string, uri?: string): boolean {
  const fileUri = uri || `github://${filename}`;

  const em = (window as any).editorManager;
  if (em?.getFile) {
    const existing = em.getFile(fileUri, 'uri') || em.getFile(filename, 'name');
    if (existing && typeof existing.makeActive === 'function') {
      existing.makeActive();
      return true;
    }
  }

  const acodeObj = (window as any).acode;
  if (acodeObj && typeof acodeObj.newEditorFile === 'function') {
    const imageContainer = createAcodeImageContainer(imageSrc);
    acodeObj.newEditorFile(filename, {
      uri: fileUri,
      type: 'image',
      tabIcon: 'file file_type_image',
      content: imageContainer,
      render: true,
      hideQuickTools: true
    });
    return true;
  }

  return false;
}

export function openImageViewer(
  title: string,
  imageSrc: string,
  options: ImageViewerOptions = {}
): void {
  document.getElementById('gh-image-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'gh-image-modal';
  modal.className = 'gh-modal-backdrop';

  modal.innerHTML = `
    <div class="gh-modal-container">
      <div class="gh-modal-header">
        <div class="gh-modal-title" title="${title}">
          <span class="gh-modal-icon">${lucideIcons.image}</span>
          <span class="gh-modal-text">${title}</span>
        </div>
        <div class="gh-modal-actions">
          <button id="gh-modal-header-tab-btn" class="gh-btn-icon" title="Open in Acode Editor Tab">${lucideIcons.externalLink}</button>
          <button id="gh-modal-close-btn" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
        </div>
      </div>
      <div class="gh-modal-body">
        <div class="gh-modal-loading">
          <span class="gh-text-muted" style="font-size: 11px;">Loading preview...</span>
        </div>
        <img id="gh-modal-image" class="gh-modal-preview" src="${imageSrc}" alt="${title}" style="display: none;">
      </div>
      <div class="gh-modal-footer">
        <button id="gh-modal-footer-tab-btn" class="gh-btn gh-btn-sm gh-btn-primary">
          ${lucideIcons.externalLink} Open in Editor Tab
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const img = modal.querySelector<HTMLImageElement>('#gh-modal-image');
  const loading = modal.querySelector<HTMLElement>('.gh-modal-loading');

  const showImage = () => {
    if (loading) loading.style.display = 'none';
    if (img) img.style.display = 'block';
  };

  const showError = () => {
    if (loading) {
      loading.innerHTML = `
        <div style="text-align: center; padding: 14px 10px;">
          <p class="gh-text-muted" style="color: #f85149; font-size: 11.5px; margin: 0;">Failed to render image preview.</p>
        </div>
      `;
    }
  };

  if (img) {
    if (img.complete && img.naturalWidth > 0) {
      showImage();
    } else {
      img.onload = () => showImage();
      img.onerror = () => showError();
    }
  }

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => {
      modal.remove();
      if (imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
      if (options.onClose) options.onClose();
    }, 180);
  };

  modal.querySelector('#gh-modal-close-btn')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const openInTab = () => {
    const opened = openInAcodeImageTab(title, imageSrc, options.uri);
    if (opened) {
      if ((window as any).toast) {
        (window as any).toast(`Opened ${title} in editor tab`, 2000);
      }
      closeModal();
    } else {
      if ((window as any).toast) {
        (window as any).toast('Could not open tab in Acode', 2000);
      }
    }
  };

  modal.querySelector('#gh-modal-header-tab-btn')?.addEventListener('click', openInTab);
  modal.querySelector('#gh-modal-footer-tab-btn')?.addEventListener('click', openInTab);
}
