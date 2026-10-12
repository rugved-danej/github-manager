import { lucideIcons } from '../ui/icons';
import { fluentConfirm, fluentAlert } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { formatRelativeTime } from '../utils/format';
import { logger } from '../utils/logger';
import { renderLoadingState, renderEmptyState } from '../ui/states';
import { renderMarkdown, attachMarkdownEventHandlers } from '../utils/markdown';
import type { GitHubAPI } from '../api/github';
import type { GitHubIssue } from '../types/github';

interface IssueTemplateField {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  type: 'input' | 'textarea' | 'checkboxes';
  required?: boolean;
  options?: { label: string; checked?: boolean }[];
  defaultValue?: string;
}

interface IssueTemplate {
  id: string;
  name: string;
  filename: string;
  description: string;
  titlePrefix: string;
  icon: string;
  labels: string[];
  fields: IssueTemplateField[];
}

const BUILTIN_TEMPLATES: IssueTemplate[] = [
  {
    id: 'bug_report',
    name: 'Bug Report',
    filename: 'bug_report.yml',
    description: 'Create a structured report to help reproduce and fix bugs',
    titlePrefix: '[Bug]: ',
    icon: lucideIcons.bug,
    labels: ['bug'],
    fields: [
      {
        id: 'description',
        label: 'Describe the bug',
        description: 'A clear and concise description of what the bug is.',
        placeholder: 'What happened and what did you expect instead?',
        type: 'textarea',
        required: true
      },
      {
        id: 'steps',
        label: 'Steps to Reproduce',
        description: 'Steps to reproduce the behavior.',
        placeholder: '1. In Acode, open...\n2. Click on...\n3. Scroll to...\n4. See error',
        type: 'textarea',
        required: true
      },
      {
        id: 'expected',
        label: 'Expected behavior',
        placeholder: 'A clear and concise description of what you expected to happen.',
        type: 'textarea'
      },
      {
        id: 'environment',
        label: 'Environment',
        description: 'Acode version, Android OS version, and device model.',
        placeholder: 'e.g., Acode v1.11.0, Android 14, Samsung Galaxy S23',
        type: 'input',
        required: true
      },
      {
        id: 'logs',
        label: 'Relevant log output / Screenshots',
        description: 'Paste error stack traces, console messages, or image links.',
        placeholder: 'Paste console logs or stack trace here...',
        type: 'textarea'
      },
      {
        id: 'validations',
        label: 'Validation Checklist',
        type: 'checkboxes',
        options: [
          { label: 'I have checked that no similar issue currently exists', checked: true },
          { label: 'I am running the latest version of this plugin and Acode', checked: true }
        ]
      }
    ]
  },
  {
    id: 'feature_request',
    name: 'Feature Request',
    filename: 'feature_request.yml',
    description: 'Suggest an idea, capability, or user experience enhancement',
    titlePrefix: '[Feature]: ',
    icon: lucideIcons.lightbulb,
    labels: ['enhancement'],
    fields: [
      {
        id: 'problem',
        label: 'Problem Statement',
        description: 'Is your feature request related to a problem? Please describe.',
        placeholder: 'I am always frustrated when...',
        type: 'textarea',
        required: true
      },
      {
        id: 'solution',
        label: 'Proposed Solution',
        description: 'Describe the solution you would like.',
        placeholder: 'A clear and concise description of what should happen.',
        type: 'textarea',
        required: true
      },
      {
        id: 'alternatives',
        label: 'Alternatives Considered',
        description: 'Describe any alternative solutions or features you considered.',
        placeholder: 'Alternative approaches or workarounds...',
        type: 'textarea'
      },
      {
        id: 'context',
        label: 'Additional Context',
        description: 'Add any other context, mockup screenshots or examples.',
        placeholder: 'Additional context or notes...',
        type: 'textarea'
      },
      {
        id: 'contribution',
        label: 'Contribution',
        type: 'checkboxes',
        options: [
          { label: 'I would be interested in helping test or implement this feature', checked: false }
        ]
      }
    ]
  },
  {
    id: 'question_help',
    name: 'Question & Help',
    filename: 'question_or_help.yml',
    description: 'Ask questions about token setup, Git sync, or usage',
    titlePrefix: '[Question]: ',
    icon: lucideIcons.helpCircle,
    labels: ['question'],
    fields: [
      {
        id: 'question',
        label: 'Question / Topic',
        description: 'Describe what you would like to know or configure.',
        placeholder: 'How do I configure...\nWhat permissions are needed for...',
        type: 'textarea',
        required: true
      },
      {
        id: 'setup_details',
        label: 'Setup Details',
        description: 'Provide information about your token permissions, Termux, or repository setup.',
        placeholder: 'e.g., Device code login, Termux git 2.40...',
        type: 'textarea'
      },
      {
        id: 'environment',
        label: 'Environment',
        description: 'Acode version, Android OS version, and device model.',
        placeholder: 'e.g., Acode v1.11.0, Android 14',
        type: 'input'
      }
    ]
  },
  {
    id: 'blank',
    name: 'Blank Issue',
    filename: 'blank.yml',
    description: 'Create an issue from scratch with standard markdown',
    titlePrefix: '',
    icon: lucideIcons.fileText,
    labels: [],
    fields: [
      {
        id: 'body',
        label: 'Description',
        description: 'Describe your issue, question, or discussion in Markdown.',
        placeholder: 'Write your issue details here in Markdown...',
        type: 'textarea',
        required: true
      }
    ]
  }
];

export async function openIssuesModal(
  api: GitHubAPI,
  owner: string,
  repo: string
): Promise<void> {
  const modal = document.createElement('div');
  modal.className = 'gh-modal-backdrop';
  modal.innerHTML = `
    <div class="gh-modal-container" style="max-width: 480px; width: 95vw; height: 85vh; display: flex; flex-direction: column;">
      <div class="gh-modal-header">
        <div class="gh-modal-title">
          <span class="gh-modal-icon">${lucideIcons.issue}</span>
          <span class="gh-modal-text">${repo} - Issues</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button id="btn-issues-discussions" class="gh-btn-icon" title="Open GitHub Discussions">${lucideIcons.messageSquare}</button>
          <button id="gh-issues-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--gh-border); align-items: center; justify-content: space-between; flex-shrink: 0;">
        <div class="gh-filter-bar" style="margin: 0; padding: 0;">
          <button id="btn-issues-filter-open" class="gh-filter-pill active" data-state="open">
            ${lucideIcons.issue} Open
          </button>
          <button id="btn-issues-filter-closed" class="gh-filter-pill" data-state="closed">
            ${lucideIcons.check} Closed
          </button>
        </div>
        <button id="btn-create-new-issue" class="gh-btn gh-btn-sm gh-btn-success" style="padding: 4px 10px; font-size: 11px;">
          ${lucideIcons.plus} New Issue
        </button>
      </div>

      <div id="gh-issues-content" style="flex: 1; overflow-y: auto; padding: 12px;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const contentEl = modal.querySelector<HTMLElement>('#gh-issues-content')!;
  let currentState: 'open' | 'closed' = 'open';

  const closeModal = () => {
    modal.classList.add('gh-modal-closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#gh-issues-close')?.addEventListener('click', closeModal);
  modal.querySelector('#btn-issues-discussions')?.addEventListener('click', () => {
    const url = `https://github.com/${owner}/${repo}/discussions`;
    if ((window as any).system?.openInBrowser) (window as any).system.openInBrowser(url);
    else if ((window as any).cordova) window.open(url, '_system');
    else window.open(url, '_blank');
  });

  const filterOpenBtn = modal.querySelector<HTMLElement>('#btn-issues-filter-open')!;
  const filterClosedBtn = modal.querySelector<HTMLElement>('#btn-issues-filter-closed')!;

  filterOpenBtn.addEventListener('click', () => {
    if (currentState === 'open') return;
    currentState = 'open';
    filterOpenBtn.classList.add('active');
    filterClosedBtn.classList.remove('active');
    loadIssues();
  });

  filterClosedBtn.addEventListener('click', () => {
    if (currentState === 'closed') return;
    currentState = 'closed';
    filterClosedBtn.classList.add('active');
    filterOpenBtn.classList.remove('active');
    loadIssues();
  });

  const loadIssues = async () => {
    contentEl.innerHTML = renderLoadingState({ title: 'Loading Issues...', subtitle: `Fetching ${currentState} issues` });
    try {
      const issues = await api.getIssues(owner, repo, currentState);
      if (issues.length === 0) {
        contentEl.innerHTML = renderEmptyState({
          icon: lucideIcons.issue,
          title: `No ${currentState === 'open' ? 'Open' : 'Closed'} Issues`,
          message: currentState === 'open' ? 'There are no open issues in this repository.' : 'No closed issues found.',
          actionLabel: currentState === 'open' ? '+ Create Issue' : undefined,
          actionId: 'btn-empty-create-issue',
          actionVariant: 'success'
        });
        contentEl.querySelector('#btn-empty-create-issue')?.addEventListener('click', () => {
          promptChooseTemplate();
        });
        return;
      }

      contentEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${issues
            .map(
              (issue) => `
            <div class="gh-card gh-issue-item" data-number="${issue.number}" style="margin: 0; cursor: pointer; padding: 10px 12px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="color: ${issue.state === 'open' ? 'var(--gh-success)' : 'var(--gh-danger)'}; display: flex; align-items: center;">
                      ${issue.state === 'open' ? lucideIcons.issue : lucideIcons.check}
                    </span>
                    <span style="font-weight: 600; font-size: 13px; color: var(--gh-text); word-break: break-word;">${issue.title}</span>
                    <span style="font-size: 11px; color: var(--gh-text-muted);">#${issue.number}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--gh-text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span>by @${issue.user?.login || 'unknown'}</span>
                    <span>&bull;</span>
                    <span>${formatRelativeTime(issue.created_at)}</span>
                    ${issue.comments > 0 ? `<span>&bull;</span><span style="display: inline-flex; align-items: center; gap: 3px;">${lucideIcons.messageSquare} ${issue.comments}</span>` : ''}
                  </div>
                  ${
                    issue.labels && issue.labels.length > 0
                      ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                          ${issue.labels
                            .map(
                              (l) =>
                                `<span class="gh-badge" style="background: #${l.color}22; color: #${l.color}; border: 1px solid #${l.color}44; font-size: 10px; padding: 1px 6px;">${l.name}</span>`
                            )
                            .join('')}
                        </div>`
                      : ''
                  }
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      contentEl.querySelectorAll<HTMLElement>('.gh-issue-item').forEach((el) => {
        el.addEventListener('click', () => {
          const num = Number(el.dataset.number);
          const issue = issues.find((i) => i.number === num);
          if (issue) viewIssueDetails(issue);
        });
      });
    } catch (err: any) {
      logger.error('Failed to load issues:', err);
      contentEl.innerHTML = `<div class="gh-state-error" style="padding: 20px; text-align: center;"><p style="color: var(--gh-danger);">${err.message || 'Failed to load issues'}</p></div>`;
    }
  };

  const viewIssueDetails = async (issue: GitHubIssue) => {
    contentEl.innerHTML = renderLoadingState({ title: `Loading Issue #${issue.number}...` });

    try {
      const comments = await api.getIssueComments(owner, repo, issue.number);

      contentEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--gh-border); padding-bottom: 8px;">
            <button id="btn-issue-back-to-list" class="gh-btn gh-btn-sm gh-btn-secondary" style="padding: 4px 8px; font-size: 11px;">
              ${lucideIcons.back} Back to list
            </button>
            <div style="display: flex; gap: 6px;">
              <button id="btn-toggle-issue-state" class="gh-btn gh-btn-sm ${issue.state === 'open' ? 'gh-btn-danger' : 'gh-btn-success'}" style="padding: 4px 8px; font-size: 11px;">
                ${issue.state === 'open' ? `${lucideIcons.x} Close Issue` : `${lucideIcons.refresh} Reopen Issue`}
              </button>
            </div>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span class="gh-badge ${issue.state === 'open' ? 'gh-badge-success' : 'gh-badge-danger'}" style="font-size: 11px;">
                ${issue.state === 'open' ? 'Open' : 'Closed'}
              </span>
              <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--gh-text); word-break: break-word;">${issue.title}</h3>
            </div>
            <p style="margin: 0; font-size: 11px; color: var(--gh-text-muted);">
              #${issue.number} opened ${formatRelativeTime(issue.created_at)} by @${issue.user?.login || 'unknown'}
            </p>
          </div>

          <div class="gh-card gh-markdown-content" style="padding: 12px; margin: 0; background: var(--gh-surface-alt);">
            ${issue.body ? renderMarkdown(issue.body) : '<span style="font-style: italic; color: var(--gh-text-muted);">No description provided.</span>'}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <h4 style="margin: 4px 0; font-size: 12px; font-weight: 600; color: var(--gh-text-muted);">
              Comments (${comments.length})
            </h4>
            ${
              comments.length === 0
                ? '<p style="font-size: 11px; color: var(--gh-text-muted); margin: 4px 0;">No comments yet.</p>'
                : comments
                    .map(
                      (c) => `
              <div class="gh-card" style="padding: 10px; margin: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 11px; color: var(--gh-text-muted);">
                  <span style="font-weight: 600; color: var(--gh-text);">@${c.user?.login || 'unknown'}</span>
                  <span>${formatRelativeTime(c.created_at)}</span>
                </div>
                <div class="gh-markdown-content" style="font-size: 12px; line-height: 1.4; color: var(--gh-text); word-break: break-word;">
                  ${renderMarkdown(c.body)}
                </div>
              </div>
            `
                    )
                    .join('')
            }
          </div>

          <div style="margin-top: 6px; border-top: 1px solid var(--gh-border); padding-top: 10px;">
            <textarea id="gh-issue-comment-input" class="gh-input" placeholder="Leave a comment (supports Markdown)..." rows="3" style="width: 100%; box-sizing: border-box; resize: vertical; margin-bottom: 8px; font-family: inherit; font-size: 12px;"></textarea>
            <button id="btn-submit-issue-comment" class="gh-btn gh-btn-block gh-btn-primary" style="padding: 6px 12px; font-size: 12px; font-weight: 600;">
              ${lucideIcons.messageSquare} Comment
            </button>
          </div>
        </div>
      `;

      attachMarkdownEventHandlers(contentEl);

      contentEl.querySelector('#btn-issue-back-to-list')?.addEventListener('click', () => {
        loadIssues();
      });

      contentEl.querySelector('#btn-toggle-issue-state')?.addEventListener('click', async () => {
        const nextState = issue.state === 'open' ? 'closed' : 'open';
        const confirm = await fluentConfirm({
          title: nextState === 'closed' ? 'Close Issue' : 'Reopen Issue',
          message: `Are you sure you want to ${nextState} issue #${issue.number}?`,
          confirmText: nextState === 'closed' ? 'Close Issue' : 'Reopen Issue',
          danger: nextState === 'closed'
        });
        if (!confirm) return;

        try {
          showToast('Updating issue...', 'info', 1500);
          const updated = await api.updateIssueState(owner, repo, issue.number, nextState);
          showToast(`Issue #${issue.number} ${nextState}!`, 'success', 2000);
          viewIssueDetails(updated);
        } catch (err: any) {
          logger.error('Failed to update issue:', err);
          fluentAlert('Error', err.message || 'Failed to update issue state');
        }
      });

      contentEl.querySelector('#btn-submit-issue-comment')?.addEventListener('click', async () => {
        const input = contentEl.querySelector<HTMLTextAreaElement>('#gh-issue-comment-input');
        const text = input ? input.value.trim() : '';
        if (!text) {
          showToast('Comment cannot be empty', 'error', 2000);
          return;
        }

        try {
          showToast('Posting comment...', 'info', 1500);
          await api.createIssueComment(owner, repo, issue.number, text);
          showToast('Comment posted!', 'success', 2000);
          viewIssueDetails(issue);
        } catch (err: any) {
          logger.error('Failed to post comment:', err);
          fluentAlert('Error', err.message || 'Failed to post comment');
        }
      });
    } catch (err: any) {
      logger.error('Failed to view issue details:', err);
      contentEl.innerHTML = `<div class="gh-state-error" style="padding: 20px; text-align: center;"><p style="color: var(--gh-danger);">${err.message || 'Failed to load comments'}</p></div>`;
    }
  };

  const promptChooseTemplate = () => {
    contentEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--gh-border); padding-bottom: 8px;">
          <button id="btn-cancel-template-choose" class="gh-btn gh-btn-sm gh-btn-secondary" style="padding: 4px 8px; font-size: 11px;">
            ${lucideIcons.back} Cancel
          </button>
          <span style="font-weight: 600; font-size: 13px;">Choose Issue Template</span>
        </div>

        <div style="font-size: 11.5px; color: var(--gh-text-muted); margin-bottom: 4px;">
          Select a template to provide structured details for this issue:
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${BUILTIN_TEMPLATES.map(
            (tmpl) => `
            <div class="gh-card gh-template-item" data-id="${tmpl.id}" style="margin: 0; padding: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <div style="display: flex; align-items: flex-start; gap: 10px; min-width: 0; flex: 1;">
                <span style="display: flex; align-items: center; color: var(--gh-accent); margin-top: 2px;">
                  ${tmpl.icon}
                </span>
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 600; font-size: 13px; color: var(--gh-text);">${tmpl.name}</span>
                    <span class="gh-badge" style="font-size: 9.5px; padding: 1px 5px;">${tmpl.filename}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--gh-text-muted); margin-top: 2px; line-height: 1.3;">
                    ${tmpl.description}
                  </div>
                </div>
              </div>
              <button class="gh-btn gh-btn-sm gh-btn-secondary" style="padding: 4px 10px; font-size: 11px; white-space: nowrap;">
                Select
              </button>
            </div>
          `
          ).join('')}
        </div>
      </div>
    `;

    contentEl.querySelector('#btn-cancel-template-choose')?.addEventListener('click', () => {
      loadIssues();
    });

    contentEl.querySelectorAll<HTMLElement>('.gh-template-item').forEach((itemEl) => {
      itemEl.addEventListener('click', () => {
        const id = itemEl.dataset.id;
        const selected = BUILTIN_TEMPLATES.find((t) => t.id === id) || BUILTIN_TEMPLATES[0];
        renderTemplateForm(selected);
      });
    });
  };

  const renderTemplateForm = (template: IssueTemplate) => {
    let activeTab: 'form' | 'preview' = 'form';

    const buildMarkdown = (): string => {
      const parts: string[] = [];
      for (const field of template.fields) {
        if (field.type === 'input') {
          const input = contentEl.querySelector<HTMLInputElement>(`#field-${field.id}`);
          const val = input ? input.value.trim() : '';
          if (val) {
            parts.push(`### ${field.label}\n\n${val}`);
          }
        } else if (field.type === 'textarea') {
          const textarea = contentEl.querySelector<HTMLTextAreaElement>(`#field-${field.id}`);
          const val = textarea ? textarea.value.trim() : '';
          if (val) {
            if (field.id === 'logs') {
              parts.push(`### ${field.label}\n\n\`\`\`text\n${val}\n\`\`\``);
            } else {
              parts.push(`### ${field.label}\n\n${val}`);
            }
          }
        } else if (field.type === 'checkboxes') {
          const checkboxes = contentEl.querySelectorAll<HTMLInputElement>(`.chk-${field.id}`);
          const lines: string[] = [];
          checkboxes.forEach((chk) => {
            const lbl = chk.dataset.label || '';
            lines.push(`- [${chk.checked ? 'x' : ' '}] ${lbl}`);
          });
          if (lines.length > 0) {
            parts.push(`### ${field.label}\n\n${lines.join('\n')}`);
          }
        }
      }
      return parts.join('\n\n');
    };

    contentEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--gh-border); padding-bottom: 8px;">
          <button id="btn-back-to-templates" class="gh-btn gh-btn-sm gh-btn-secondary" style="padding: 4px 8px; font-size: 11px;">
            ${lucideIcons.back} Templates
          </button>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="gh-badge gh-badge-primary" style="font-size: 10.5px; padding: 2px 7px;">
              ${template.filename}
            </span>
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 4px;">Title</label>
          <input type="text" id="new-issue-title" class="gh-input" value="${template.titlePrefix}" placeholder="Issue title..." style="width: 100%; box-sizing: border-box; font-size: 12px;">
        </div>

        <div style="display: flex; gap: 6px; border-bottom: 1px solid var(--gh-border); padding-bottom: 6px;">
          <button id="btn-tab-form" class="gh-filter-pill active" style="font-size: 11px; padding: 3px 10px;">
            ${lucideIcons.fileText} Form
          </button>
          <button id="btn-tab-preview" class="gh-filter-pill" style="font-size: 11px; padding: 3px 10px;">
            ${lucideIcons.eye} Markdown Preview
          </button>
        </div>

        <div id="issue-tab-form-body" style="display: flex; flex-direction: column; gap: 10px;">
          ${template.fields
            .map((field) => {
              if (field.type === 'input') {
                return `
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 3px;">
                      ${field.label} ${field.required ? '<span style="color: var(--gh-danger);">*</span>' : ''}
                    </label>
                    ${field.description ? `<div style="font-size: 10.5px; color: var(--gh-text-muted); margin-bottom: 4px;">${field.description}</div>` : ''}
                    <input type="text" id="field-${field.id}" class="gh-input" placeholder="${field.placeholder || ''}" style="width: 100%; box-sizing: border-box; font-size: 12px;">
                  </div>
                `;
              } else if (field.type === 'textarea') {
                return `
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 3px;">
                      ${field.label} ${field.required ? '<span style="color: var(--gh-danger);">*</span>' : ''}
                    </label>
                    ${field.description ? `<div style="font-size: 10.5px; color: var(--gh-text-muted); margin-bottom: 4px;">${field.description}</div>` : ''}
                    <textarea id="field-${field.id}" class="gh-input" placeholder="${field.placeholder || ''}" rows="4" style="width: 100%; box-sizing: border-box; resize: vertical; font-size: 12px; font-family: inherit;"></textarea>
                  </div>
                `;
              } else if (field.type === 'checkboxes') {
                return `
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 600; color: var(--gh-text-muted); margin-bottom: 3px;">
                      ${field.label}
                    </label>
                    <div style="display: flex; flex-direction: column; gap: 6px; padding: 6px 0;">
                      ${(field.options || [])
                        .map(
                          (opt) => `
                        <label class="gh-task-item" style="cursor: pointer; user-select: none;">
                          <input type="checkbox" class="chk-${field.id}" data-label="${opt.label}" ${opt.checked ? 'checked' : ''}>
                          <span class="gh-task-text" style="font-size: 11.5px;">${opt.label}</span>
                        </label>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `;
              }
              return '';
            })
            .join('')}
        </div>

        <div id="issue-tab-preview-body" class="gh-card gh-markdown-content" style="display: none; padding: 12px; margin: 0; background: var(--gh-surface-alt); min-height: 120px;"></div>

        <button id="btn-submit-new-issue" class="gh-btn gh-btn-block gh-btn-success" style="padding: 8px 14px; font-weight: 600; font-size: 12px; margin-top: 6px;">
          ${lucideIcons.plus} Submit Issue (${template.name})
        </button>
      </div>
    `;

    const formBodyEl = contentEl.querySelector<HTMLElement>('#issue-tab-form-body')!;
    const previewBodyEl = contentEl.querySelector<HTMLElement>('#issue-tab-preview-body')!;
    const tabFormBtn = contentEl.querySelector<HTMLElement>('#btn-tab-form')!;
    const tabPreviewBtn = contentEl.querySelector<HTMLElement>('#btn-tab-preview')!;

    tabFormBtn.addEventListener('click', () => {
      activeTab = 'form';
      tabFormBtn.classList.add('active');
      tabPreviewBtn.classList.remove('active');
      formBodyEl.style.display = 'flex';
      previewBodyEl.style.display = 'none';
    });

    tabPreviewBtn.addEventListener('click', () => {
      activeTab = 'preview';
      tabPreviewBtn.classList.add('active');
      tabFormBtn.classList.remove('active');
      formBodyEl.style.display = 'none';
      previewBodyEl.style.display = 'block';

      const markdown = buildMarkdown();
      previewBodyEl.innerHTML = markdown
        ? renderMarkdown(markdown)
        : '<span style="font-style: italic; color: var(--gh-text-muted);">No content to preview yet. Fill out the form fields.</span>';
      attachMarkdownEventHandlers(previewBodyEl);
    });

    contentEl.querySelector('#btn-back-to-templates')?.addEventListener('click', () => {
      promptChooseTemplate();
    });

    contentEl.querySelector('#btn-submit-new-issue')?.addEventListener('click', async () => {
      const titleInput = contentEl.querySelector<HTMLInputElement>('#new-issue-title');
      const title = titleInput ? titleInput.value.trim() : '';

      if (!title || title === template.titlePrefix.trim()) {
        showToast('Please enter an issue title', 'error', 2000);
        return;
      }

      for (const field of template.fields) {
        if (field.required) {
          if (field.type === 'input') {
            const input = contentEl.querySelector<HTMLInputElement>(`#field-${field.id}`);
            if (!input || !input.value.trim()) {
              showToast(`Field "${field.label}" is required`, 'error', 2000);
              return;
            }
          } else if (field.type === 'textarea') {
            const textarea = contentEl.querySelector<HTMLTextAreaElement>(`#field-${field.id}`);
            if (!textarea || !textarea.value.trim()) {
              showToast(`Field "${field.label}" is required`, 'error', 2000);
              return;
            }
          }
        }
      }

      const body = buildMarkdown();

      try {
        showToast('Creating issue on GitHub...', 'info', 2000);
        const created = await api.createIssue(owner, repo, title, body, template.labels);
        showToast(`Issue #${created.number} created!`, 'success', 2500);
        viewIssueDetails(created);
      } catch (err: any) {
        logger.error('Failed to create issue:', err);
        fluentAlert('Error', err.message || 'Failed to create issue');
      }
    });
  };

  modal.querySelector('#btn-create-new-issue')?.addEventListener('click', () => {
    promptChooseTemplate();
  });

  loadIssues();
}
