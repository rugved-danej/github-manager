export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (isNaN(diffSec) || diffSec < 0) return '';
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }
  if ((window as any).cordova?.plugins?.clipboard?.copy) {
    try {
      await new Promise<void>((resolve, reject) => {
        (window as any).cordova.plugins.clipboard.copy(text, resolve, reject);
      });
      return true;
    } catch (_) {}
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

export function enableHorizontalDrag(el: HTMLElement): void {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasDragged = false;

  let touchStartX = 0;
  let touchStartScrollLeft = 0;
  let touchMoved = false;

  el.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].pageX;
      touchStartScrollLeft = el.scrollLeft;
      touchMoved = false;
    },
    { passive: true }
  );

  el.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const currentX = e.touches[0].pageX;
      const diff = currentX - touchStartX;
      if (Math.abs(diff) > 5) {
        touchMoved = true;
        el.scrollLeft = touchStartScrollLeft - diff;
      }
    },
    { passive: true }
  );

  el.addEventListener('mousedown', (e) => {
    isDown = true;
    hasDragged = false;
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });

  el.addEventListener('mouseleave', () => {
    isDown = false;
  });

  el.addEventListener('mouseup', () => {
    isDown = false;
  });

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDragged = true;
      e.preventDefault();
      el.scrollLeft = scrollLeft - walk;
    }
  });

  el.addEventListener(
    'click',
    (e) => {
      if (hasDragged || touchMoved) {
        e.stopPropagation();
        hasDragged = false;
        touchMoved = false;
      }
    },
    true
  );
}

export function closeSidebar(): void {
  try {
    const sb =
      (window as any).sideBar ||
      (window.acode?.require ? window.acode.require('sideBar') || window.acode.require('sidebar') : null);
    if (sb && typeof sb.hide === 'function') {
      sb.hide();
      return;
    }
  } catch (_) {}

  try {
    const mask = document.querySelector<HTMLElement>('.sidebar-mask, .mask, #sidebar-mask');
    if (mask) mask.click();
  } catch (_) {}
}
