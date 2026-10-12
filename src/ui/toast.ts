import { lucideIcons } from './icons';
import { logger } from '../utils/logger';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

let toastContainer: HTMLElement | null = null;
let currentToastTimer: number | null = null;

function ensureToastContainer(): HTMLElement {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'gh-toast-container';
    toastContainer.className = 'gh-toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function getToastIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return lucideIcons.check;
    case 'error':
      return lucideIcons.x;
    case 'warning':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    case 'info':
    default:
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }
}

function detectToastType(message: string): ToastType {
  const lower = message.toLowerCase();
  if (
    lower.includes('success') ||
    lower.includes('created') ||
    lower.includes('copied') ||
    lower.includes('opened') ||
    lower.includes('saved') ||
    lower.includes('welcome')
  ) {
    return 'success';
  }
  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('cancelled') ||
    lower.includes('not found') ||
    lower.includes('removed')
  ) {
    return 'error';
  }
  if (lower.includes('warning') || lower.includes('conflict') || lower.includes('notice')) {
    return 'warning';
  }
  return 'info';
}

export function showToast(
  message: string,
  type?: ToastType,
  duration = 2400
): void {
  const container = ensureToastContainer();

  if (currentToastTimer) {
    window.clearTimeout(currentToastTimer);
    currentToastTimer = null;
  }
  container.innerHTML = '';

  const resolvedType = type || detectToastType(message);

  if (resolvedType === 'error') {
    logger.error(`Toast [Error]: ${message}`);
  } else if (resolvedType === 'warning') {
    logger.warn(`Toast [Warning]: ${message}`);
  } else {
    logger.info(`Toast [${resolvedType}]: ${message}`);
  }

  const toast = document.createElement('div');
  toast.className = `gh-toast gh-toast-${resolvedType}`;
  toast.innerHTML = `
    <span class="gh-toast-icon">${getToastIcon(resolvedType)}</span>
    <span class="gh-toast-message">${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('gh-toast-show');
  });

  currentToastTimer = window.setTimeout(() => {
    toast.classList.remove('gh-toast-show');
    toast.classList.add('gh-toast-hide');
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
        toastContainer = null;
      }
    }, 220);
  }, duration);
}

export function ghToast(message: string, duration?: number): void {
  showToast(message, undefined, duration);
}

let originalWindowToast: any = null;

export function initCustomToast(): void {
  if (typeof window !== 'undefined') {
    if (!originalWindowToast && (window as any).toast) {
      originalWindowToast = (window as any).toast;
    }
    (window as any).toast = (msg: string, duration?: number) => {
      ghToast(msg, duration);
    };
  }
}

export function restoreOriginalToast(): void {
  if (typeof window !== 'undefined' && originalWindowToast) {
    (window as any).toast = originalWindowToast;
    originalWindowToast = null;
  }
  if (toastContainer) {
    toastContainer.remove();
    toastContainer = null;
  }
}
