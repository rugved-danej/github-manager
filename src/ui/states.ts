import { lucideIcons } from './icons';

export interface EmptyStateOptions {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionId?: string;
  actionVariant?: 'primary' | 'secondary' | 'success';
}

export interface LoadingStateOptions {
  title?: string;
  subtitle?: string;
}

export interface ErrorStateOptions {
  title?: string;
  message: string;
  retryId?: string;
}

export function renderLoadingState(options?: LoadingStateOptions): string {
  const title = options?.title || 'Loading...';
  const subtitle = options?.subtitle;

  return `
    <div class="gh-state-loading-wrap">
      <div class="gh-loading-box">
        <div class="gh-spinner-ring"></div>
        <div class="gh-loading-text">
          <span class="gh-loading-title">${title}</span>
          ${subtitle ? `<span class="gh-loading-subtitle">${subtitle}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

export const renderLoadingSkeleton = renderLoadingState;

export function renderEmptyState(options: EmptyStateOptions): string {
  const icon = options.icon || lucideIcons.inbox;
  const actionBtn = options.actionLabel && options.actionId
    ? `<button id="${options.actionId}" class="gh-btn gh-btn-sm gh-btn-${options.actionVariant || 'primary'} gh-empty-action">
        ${options.actionLabel}
       </button>`
    : '';

  return `
    <div class="gh-empty-state">
      <div class="gh-empty-icon-wrap">
        ${icon}
      </div>
      <h4 class="gh-empty-title">${options.title}</h4>
      <p class="gh-empty-desc">${options.message}</p>
      ${actionBtn}
    </div>
  `;
}

export function renderErrorState(options: ErrorStateOptions): string {
  const title = options.title || 'Something went wrong';
  const retryBtn = options.retryId
    ? `<button id="${options.retryId}" class="gh-btn gh-btn-sm gh-btn-secondary gh-empty-action">
        ${lucideIcons.refresh} Try Again
       </button>`
    : '';

  return `
    <div class="gh-empty-state gh-state-error">
      <div class="gh-empty-icon-wrap gh-error-icon">
        ${lucideIcons.alertCircle}
      </div>
      <h4 class="gh-empty-title">${title}</h4>
      <p class="gh-empty-desc">${options.message}</p>
      ${retryBtn}
    </div>
  `;
}
