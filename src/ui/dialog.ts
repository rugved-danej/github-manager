import { lucideIcons } from './icons';
import { logger } from '../utils/logger';

export interface FluentConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: string;
}

export interface FluentPromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: 'text' | 'password';
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: string;
}

export interface FluentAlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  icon?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMessage(msg: string): string {
  if (!msg) return '';
  const allowed = msg
    .replace(/<br\s*\/?>/gi, '__BR__')
    .replace(/<b>/gi, '__B_OPEN__')
    .replace(/<\/b>/gi, '__B_CLOSE__')
    .replace(/<strong>/gi, '__B_OPEN__')
    .replace(/<\/strong>/gi, '__B_CLOSE__')
    .replace(/<code>/gi, '__CODE_OPEN__')
    .replace(/<\/code>/gi, '__CODE_CLOSE__')
    .replace(/<em>/gi, '__EM_OPEN__')
    .replace(/<\/em>/gi, '__EM_CLOSE__');
  const escaped = escapeHtml(allowed);
  return escaped
    .replace(/__BR__/g, '<br/>')
    .replace(/__B_OPEN__/g, '<b>')
    .replace(/__B_CLOSE__/g, '</b>')
    .replace(/__CODE_OPEN__/g, '<code>')
    .replace(/__CODE_CLOSE__/g, '</code>')
    .replace(/__EM_OPEN__/g, '<em>')
    .replace(/__EM_CLOSE__/g, '</em>')
    .replace(/\n/g, '<br/>');
}

export function fluentConfirm(
  titleOrOptions: string | FluentConfirmOptions,
  message = '',
  danger = false
): Promise<boolean> {
  const options: FluentConfirmOptions =
    typeof titleOrOptions === 'string'
      ? { title: titleOrOptions, message, danger }
      : titleOrOptions;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'gh-dialog-overlay';

    const confirmLabel = options.confirmText || (options.danger ? 'Delete' : 'Confirm');
    const cancelLabel = options.cancelText || 'Cancel';
    const confirmClass = options.danger ? 'gh-btn gh-btn-danger' : 'gh-btn gh-btn-primary';
    const icon = options.icon || (options.danger ? lucideIcons.trash : lucideIcons.alertCircle);

    overlay.innerHTML = `
      <div class="gh-dialog-box" role="dialog" aria-modal="true">
        <div class="gh-dialog-header">
          <div class="gh-dialog-title-group">
            <span class="gh-dialog-header-icon ${options.danger ? 'danger' : ''}">${icon}</span>
            <h3 class="gh-dialog-title">${escapeHtml(options.title)}</h3>
          </div>
          <button class="gh-dialog-close" aria-label="Close">${lucideIcons.x}</button>
        </div>
        <div class="gh-dialog-body">
          <p class="gh-dialog-message">${formatMessage(options.message)}</p>
        </div>
        <div class="gh-dialog-actions">
          <button class="gh-btn gh-btn-secondary gh-dialog-cancel">${escapeHtml(cancelLabel)}</button>
          <button class="${confirmClass} gh-dialog-confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeDialog = (result: boolean) => {
      overlay.classList.add('gh-dialog-hide');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 150);
    };

    const confirmBtn = overlay.querySelector<HTMLButtonElement>('.gh-dialog-confirm');
    const cancelBtn = overlay.querySelector<HTMLButtonElement>('.gh-dialog-cancel');
    const closeBtn = overlay.querySelector<HTMLButtonElement>('.gh-dialog-close');
    const dialogBox = overlay.querySelector<HTMLElement>('.gh-dialog-box');

    confirmBtn?.addEventListener('click', () => closeDialog(true));
    cancelBtn?.addEventListener('click', () => closeDialog(false));
    closeBtn?.addEventListener('click', () => closeDialog(false));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog(false);
    });

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', keyHandler);
        closeDialog(false);
      } else if (e.key === 'Enter') {
        window.removeEventListener('keydown', keyHandler);
        closeDialog(true);
      }
    };
    window.addEventListener('keydown', keyHandler);

    requestAnimationFrame(() => {
      overlay.classList.add('gh-dialog-show');
      confirmBtn?.focus();
    });
  });
}

export function fluentPrompt(
  titleOrOptions: string | FluentPromptOptions,
  defaultValue = '',
  placeholder = '',
  inputType: 'text' | 'password' = 'text'
): Promise<string | null> {
  const options: FluentPromptOptions =
    typeof titleOrOptions === 'string'
      ? { title: titleOrOptions, defaultValue, placeholder, inputType }
      : titleOrOptions;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'gh-dialog-overlay';

    const confirmLabel = options.confirmText || 'OK';
    const cancelLabel = options.cancelText || 'Cancel';
    const type = options.inputType || 'text';
    const icon = options.icon || lucideIcons.edit;

    const messageHtml = options.message
      ? `<p class="gh-dialog-message">${formatMessage(options.message)}</p>`
      : '';

    overlay.innerHTML = `
      <div class="gh-dialog-box" role="dialog" aria-modal="true">
        <div class="gh-dialog-header">
          <div class="gh-dialog-title-group">
            <span class="gh-dialog-header-icon">${icon}</span>
            <h3 class="gh-dialog-title">${escapeHtml(options.title)}</h3>
          </div>
          <button class="gh-dialog-close" aria-label="Close">${lucideIcons.x}</button>
        </div>
        <div class="gh-dialog-body">
          ${messageHtml}
          <div class="gh-dialog-input-wrap">
            <input
              type="${type}"
              class="gh-dialog-input"
              value="${escapeHtml(options.defaultValue || '')}"
              placeholder="${escapeHtml(options.placeholder || '')}"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
        </div>
        <div class="gh-dialog-actions">
          <button class="gh-btn gh-btn-secondary gh-dialog-cancel">${escapeHtml(cancelLabel)}</button>
          <button class="gh-btn gh-btn-primary gh-dialog-confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector<HTMLInputElement>('.gh-dialog-input');
    const confirmBtn = overlay.querySelector<HTMLButtonElement>('.gh-dialog-confirm');
    const cancelBtn = overlay.querySelector<HTMLButtonElement>('.gh-dialog-cancel');
    const closeBtn = overlay.querySelector<HTMLButtonElement>('.gh-dialog-close');

    const closeDialog = (val: string | null) => {
      overlay.classList.add('gh-dialog-hide');
      setTimeout(() => {
        overlay.remove();
        resolve(val);
      }, 150);
    };

    confirmBtn?.addEventListener('click', () => closeDialog(input?.value ?? ''));
    cancelBtn?.addEventListener('click', () => closeDialog(null));
    closeBtn?.addEventListener('click', () => closeDialog(null));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog(null);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        closeDialog(input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog(null);
      }
    });

    requestAnimationFrame(() => {
      overlay.classList.add('gh-dialog-show');
      input?.focus();
      input?.select();
    });
  });
}

export function fluentAlert(
  titleOrOptions: string | FluentAlertOptions,
  message = ''
): Promise<void> {
  const options: FluentAlertOptions =
    typeof titleOrOptions === 'string'
      ? { title: titleOrOptions, message }
      : titleOrOptions;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'gh-dialog-overlay';

    const confirmLabel = options.confirmText || 'OK';
    const isError = options.title.toLowerCase().includes('error') || options.title.toLowerCase().includes('failed');
    const icon = options.icon || (isError ? lucideIcons.alertCircle : lucideIcons.check);

    overlay.innerHTML = `
      <div class="gh-dialog-box" role="dialog" aria-modal="true">
        <div class="gh-dialog-header">
          <div class="gh-dialog-title-group">
            <span class="gh-dialog-header-icon ${isError ? 'danger' : ''}">${icon}</span>
            <h3 class="gh-dialog-title">${escapeHtml(options.title)}</h3>
          </div>
          <button class="gh-dialog-close" aria-label="Close">${lucideIcons.x}</button>
        </div>
        <div class="gh-dialog-body">
          <p class="gh-dialog-message">${formatMessage(options.message)}</p>
        </div>
        <div class="gh-dialog-actions">
          <button class="gh-btn gh-btn-primary gh-dialog-confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeDialog = () => {
      overlay.classList.add('gh-dialog-hide');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 150);
    };

    const confirmBtn = overlay.querySelector<HTMLButtonElement>('.gh-dialog-confirm');
    const closeBtn = overlay.querySelector<HTMLButtonElement>('.gh-dialog-close');

    confirmBtn?.addEventListener('click', closeDialog);
    closeBtn?.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog();
    });

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        window.removeEventListener('keydown', keyHandler);
        closeDialog();
      }
    };
    window.addEventListener('keydown', keyHandler);

    requestAnimationFrame(() => {
      overlay.classList.add('gh-dialog-show');
      confirmBtn?.focus();
    });
  });
}
