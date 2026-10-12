import { GitHubAPI } from './api/github';
import { GistManager } from './gists/manager';
import { RepoManager } from './repos/manager';
import { lucideIcons } from './ui/icons';
import { openCustomMenu, CustomSelectComponent, type MenuItem, type DropdownOption } from './ui/selectMenu';
import { fluentConfirm, fluentPrompt, fluentAlert } from './ui/dialog';
import { showToast } from './ui/toast';
import { logger } from './utils/logger';
import { AuthVault } from './storage/authVault';
import type { GitHubUser, GitHubAccount, GitHubOrg } from './types/github';
import { openAccountSettingsModal } from './features/accountSettingsModal';

export class GithubSidebar {
  readonly appId = 'github_manager_sidebar';
  readonly serviceId = 'github_manager_auth';
  readonly accountId = 'access_token';
  readonly tokenKey = 'github_manager_token';

  baseUrl = '';
  container: HTMLElement | null = null;
  api: GitHubAPI | null = null;
  token: string | null = null;
  currentUser: GitHubUser | null = null;
  orgs: GitHubOrg[] = [];
  selectedOrg: string | null = null;
  contextSelect: CustomSelectComponent | null = null;
  activeTab: 'repos' | 'gists' = 'repos';

  gistManager: GistManager;
  repoManager: RepoManager;

  refreshIntervalId: number | null = null;

  handleOffline: () => void;
  handleOnline: () => void;

  constructor() {
    this.gistManager = new GistManager(null);
    this.repoManager = new RepoManager(null);

    const savedTab = localStorage.getItem('gh_active_tab') as 'repos' | 'gists' | null;
    if (savedTab === 'repos' || savedTab === 'gists') {
      this.activeTab = savedTab;
    }

    this.handleOffline = () => {
      const el = document.getElementById('gh-offline-indicator');
      if (el) el.style.display = 'inline-flex';
    };
    this.handleOnline = () => {
      const el = document.getElementById('gh-offline-indicator');
      if (el) el.style.display = 'none';
      this.autoRefresh();
    };
  }

  getAccounts(): GitHubAccount[] {
    return AuthVault.getLocalAccounts();
  }

  saveAccounts(accounts: GitHubAccount[]): void {
    AuthVault.save(accounts, this.getActiveAccountId(), this.token);
  }

  getActiveAccountId(): string | null {
    return AuthVault.getLocalActiveId();
  }

  setActiveAccountId(id: string | null): void {
    if (id) {
      localStorage.setItem('gh_active_account_id', id);
    } else {
      localStorage.removeItem('gh_active_account_id');
    }
    AuthVault.save(this.getAccounts(), id, this.token);
  }

  getActiveAccount(): GitHubAccount | null {
    const accounts = this.getAccounts();
    if (accounts.length === 0) return null;
    const activeId = this.getActiveAccountId();
    if (activeId) {
      const found = accounts.find((a) => a.id === activeId || a.login === activeId);
      if (found) return found;
    }
    return accounts[0];
  }

  async init(): Promise<void> {
    const sideBarApps = acode.require('sidebarApps');

    const { token } = await AuthVault.recover();

    if (token) {
      this.token = token;
      try {
        await this.applyToken(token, false);
      } catch (e) {}
    }

    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('online', this.handleOnline);

    this.startAutoRefresh();

    sideBarApps.add(
      'icon github',
      this.appId,
      'Github Manager',
      (container: HTMLElement) => {
        container.classList.add('scroll');
        container.style.height = '100%';
        container.style.overflowY = 'auto';

        this.container = container;
        this.render();
        this.autoRefresh();
      },
      false,
      () => {
        this.render();
        this.autoRefresh();
      }
    );
  }

  async applyToken(token: string, persist = true): Promise<GitHubUser> {
    this.api = new GitHubAPI(token);
    this.token = token;
    this.gistManager.setApi(this.api);
    this.repoManager.setApi(this.api);

    const user = await this.api.getUser();
    this.currentUser = user;
    this.repoManager.setCurrentUser(user);

    let orgs: GitHubOrg[] = [];
    try {
      orgs = await this.api.getUserOrgs();
    } catch (e) {}
    this.orgs = orgs;
    this.repoManager.setOrgs(orgs);
    this.updateContextSelect();

    if (persist) {
      const accounts = this.getAccounts();
      const existingIndex = accounts.findIndex((a) => a.id === user.login || a.login === user.login);
      const accountData: GitHubAccount = {
        id: user.login,
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        token,
        addedAt: Date.now()
      };

      if (existingIndex >= 0) {
        accounts[existingIndex] = accountData;
      } else {
        accounts.push(accountData);
      }

      await AuthVault.save(accounts, user.login, token);
    }

    return user;
  }

  startAutoRefresh(): void {
    if (this.refreshIntervalId) clearInterval(this.refreshIntervalId);
    this.refreshIntervalId = window.setInterval(() => {
      if (this.container && this.container.isConnected && this.container.offsetParent !== null) {
        this.autoRefresh();
      }
    }, 60000);
  }

  async autoRefresh(): Promise<void> {
    if (!this.api || !navigator.onLine) return;
    try {
      if (this.activeTab === 'repos') {
        await this.repoManager.loadRepos(false, true);
      } else {
        await this.gistManager.loadGists(false, true);
      }
    } catch (e) {}
  }

  showAccountSwitcher(anchorEl: HTMLElement): void {
    const accounts = this.getAccounts();
    const items: MenuItem[] = accounts.map((acc) => ({
      id: acc.id,
      label: `@${acc.login}`,
      sublabel: acc.name || 'GitHub Account',
      avatarUrl: acc.avatar_url,
      selected: acc.id === this.currentUser?.login,
      action: () => {
        if (acc.id !== this.currentUser?.login) {
          this.switchAccount(acc.id);
        }
      }
    }));

    items.push({
      id: '__add__',
      label: 'Add Another Account',
      icon: lucideIcons.userPlus,
      action: () => this.promptAddAccount(anchorEl)
    });

    if (accounts.length > 1) {
      items.push({
        id: '__remove__',
        label: 'Remove an Account',
        icon: lucideIcons.trash,
        danger: true,
        action: () => this.promptRemoveAccount(anchorEl)
      });
    }

    openCustomMenu(anchorEl, 'GitHub Accounts', items);
  }

  promptAddAccount(anchorEl: HTMLElement): void {
    openCustomMenu(anchorEl, 'Add GitHub Account', [
      {
        id: 'pat',
        label: 'Personal Access Token',
        sublabel: 'Token with repo & gist scopes',
        icon: lucideIcons.lock,
        action: async () => {
          const token = await fluentPrompt({
            title: 'GitHub Personal Access Token',
            placeholder: 'ghp_...',
            inputType: 'password'
          });
          if (token) await this.login(token.trim());
        }
      },
      {
        id: 'device',
        label: 'Login with GitHub (Browser)',
        sublabel: 'One-time device code flow',
        icon: lucideIcons.github,
        action: () => this.startDeviceFlowDialog()
      }
    ]);
  }

  promptRemoveAccount(anchorEl: HTMLElement): void {
    const accounts = this.getAccounts();
    const items: MenuItem[] = accounts.map((acc) => ({
      id: acc.id,
      label: `@${acc.login}`,
      sublabel: 'Tap to remove',
      avatarUrl: acc.avatar_url,
      danger: true,
      action: async () => {
        const confirmed = await fluentConfirm({
          title: 'Confirm Removal',
          message: `Remove account @${acc.login} from saved accounts?`,
          confirmText: 'Remove',
          danger: true
        });
        if (confirmed) await this.removeAccount(acc.id);
      }
    }));

    openCustomMenu(anchorEl, 'Remove Account', items);
  }

  async switchAccount(id: string): Promise<void> {
    const accounts = this.getAccounts();
    const target = accounts.find((a) => a.id === id || a.login === id);
    if (!target) return;

    showToast(`Switching to @${target.login}...`, 'info', 1500);
    try {
      await this.applyToken(target.token, true);
      showToast(`Active: @${target.login}`, 'success', 2500);
      await this.render();
    } catch (err: any) {
      logger.error('Failed to switch account:', err);
      fluentAlert('Error', `Failed to switch to @${target.login}: ${err.message || String(err)}`);
    }
  }

  async removeAccount(id: string): Promise<void> {
    const accounts = this.getAccounts().filter((a) => a.id !== id && a.login !== id);
    const newActiveId = this.currentUser?.login === id ? (accounts[0]?.id || null) : this.getActiveAccountId();
    const newActiveToken = accounts.find((a) => a.id === newActiveId)?.token || null;
    await AuthVault.save(accounts, newActiveId, newActiveToken);

    if (this.currentUser?.login === id) {
      if (accounts.length > 0) {
        await this.switchAccount(accounts[0].id);
      } else {
        await this.logout(true);
      }
    } else {
      showToast(`Account @${id} removed`, 'info', 2000);
    }
  }

  async startDeviceFlowDialog(): Promise<void> {
    showToast('Requesting device code from GitHub...', 'info', 2000);
    try {
      const data = await GitHubAPI.requestDeviceCode();

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(data.user_code);
      }

      const openBrowser = () => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(data.user_code);
        }
        if ((window as any).system?.openInBrowser) {
          (window as any).system.openInBrowser(data.verification_uri);
        } else if ((window as any).cordova) {
          window.open(data.verification_uri, '_system');
        } else {
          window.open(data.verification_uri, '_blank');
        }
        showToast('Code copied! Authorize in browser.', 'info', 2500);
      };

      const modal = document.createElement('div');
      modal.className = 'gh-modal-backdrop';
      modal.innerHTML = `
        <div class="gh-modal-container" style="max-width: 360px; width: 92vw; text-align: center;">
          <div class="gh-modal-header" style="justify-content: space-between;">
            <div class="gh-modal-title">
              <span class="gh-modal-icon">${lucideIcons.github}</span>
              <span class="gh-modal-text">GitHub Authorization</span>
            </div>
            <button id="gh-auth-modal-close" class="gh-btn-icon" title="Close">${lucideIcons.x}</button>
          </div>
          <div class="gh-modal-body" style="flex-direction: column; align-items: center; gap: 10px; padding: 16px;">
            <p style="margin: 0; font-size: 11.5px; color: var(--gh-text-muted);">Enter this code on GitHub to authorize:</p>
            <div class="gh-device-code" style="font-size: 20px; font-weight: 700; letter-spacing: 2px; padding: 8px 18px; background: var(--gh-surface-alt); border: 1px dashed var(--gh-border); border-radius: var(--gh-radius-sm); color: var(--gh-accent); font-family: monospace;">${data.user_code}</div>
            <p style="margin: 0; font-size: 10.5px; color: var(--gh-text-muted);">(Code copied to clipboard)</p>
            <button id="gh-auth-open-browser-btn" class="gh-btn gh-btn-block gh-btn-success" style="padding: 10px 16px; font-weight: 600; font-size: 13px; margin-top: 6px;">
              ${lucideIcons.externalLink}
              <span>Open Browser</span>
            </button>
            <p class="gh-text-muted" style="margin: 8px 0 0 0; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="gh-badge gh-badge-offline" style="width: 6px; height: 6px; padding: 0; border-radius: 50%;"></span>
              Waiting for authorization...
            </p>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      let polling = true;
      const closeModal = () => {
        polling = false;
        modal.classList.add('gh-modal-closing');
        setTimeout(() => modal.remove(), 180);
      };

      modal.querySelector('#gh-auth-modal-close')?.addEventListener('click', closeModal);
      modal.querySelector('#gh-auth-open-browser-btn')?.addEventListener('click', () => {
        openBrowser();
      });

      let interval = data.interval;

      for (let attempts = 0; attempts < 60 && polling; attempts++) {
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));
        if (!polling) break;
        const pollData = await GitHubAPI.pollForToken(data.device_code);

        if (pollData.access_token) {
          polling = false;
          closeModal();
          showToast('GitHub connected successfully!', 'success', 3000);
          await this.login(pollData.access_token);
          return;
        } else if (pollData.error === 'authorization_pending') {
        } else if (pollData.error === 'slow_down') {
          interval += 5;
        } else if (pollData.error === 'expired_token') {
          polling = false;
          closeModal();
          fluentAlert('Error', 'The device code expired. Please try again.');
          return;
        } else {
          polling = false;
          closeModal();
          fluentAlert('Error', pollData.error_description || 'Authorization failed.');
          return;
        }
      }
    } catch (err: any) {
      logger.error('Device flow error:', err);
      fluentAlert('Device Flow Error', String(err.message || err));
    }
  }

  async render(): Promise<void> {
    if (!this.container) return;

    let token = this.token;
    if (!token) {
      const active = this.getActiveAccount();
      if (active) {
        token = active.token;
        this.token = token;
      }
    }

    this.container.innerHTML = '';

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'gh-scroll scroll';

    if (token) {
      if (!this.api) {
        try {
          await this.applyToken(token, false);
        } catch (e) {}
      }

      const isOffline = !navigator.onLine;
      const avatarSrc = this.currentUser?.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
      const displayName = this.currentUser?.name || this.currentUser?.login || 'GitHub User';
      const displayLogin = this.currentUser?.login ? `@${this.currentUser.login}` : '';

      scrollContainer.innerHTML = `
        <div class="gh-container">
          <!-- Fluent Profile Header with Multi-Account Switcher -->
          <div class="gh-profile-bar">
            <div id="gh-profile-info-trigger" class="gh-profile-info" title="Switch or manage GitHub accounts">
              <img id="gh-user-avatar" class="gh-avatar" src="${avatarSrc}" alt="Avatar">
              <div class="gh-user-names">
                <span id="gh-user-login" class="gh-login">
                  ${displayName}
                  <span class="gh-switch-caret">${lucideIcons.chevronDown}</span>
                </span>
                <span class="gh-fullname">${displayLogin}</span>
              </div>
              <span id="gh-offline-indicator" class="gh-badge gh-badge-offline" style="display: ${isOffline ? 'inline-flex' : 'none'};">Offline</span>
            </div>
            <div class="gh-header-actions">
              <button id="gh-account-settings-btn" class="gh-btn-icon" title="Account & SSH Keys">${lucideIcons.key}</button>
              <button id="gh-add-account-btn" class="gh-btn-icon" title="Add Another Account">${lucideIcons.userPlus}</button>
              <button id="gh-logout-btn" class="gh-btn-icon gh-btn-icon-danger" title="Logout">${lucideIcons.logout}</button>
            </div>
          </div>

          <!-- Fluent Global Context Selector (Personal vs Organizations) -->
          <div class="gh-context-bar" style="margin-bottom: 8px;">
            <div id="gh-global-context-wrap" class="gh-custom-select-wrap"></div>
          </div>

          <!-- Fluent Segmented Tabs -->
          <div class="gh-tabs">
            <button id="tab-repos" class="gh-tab ${this.activeTab === 'repos' ? 'active' : ''}">
              ${lucideIcons.code}
              <span>Repos</span>
              <span id="tab-repos-count" class="gh-tab-badge">...</span>
            </button>
            <button id="tab-gists" class="gh-tab ${this.activeTab === 'gists' ? 'active' : ''}">
              ${lucideIcons.pin}
              <span>Gists</span>
              <span id="tab-gists-count" class="gh-tab-badge">...</span>
            </button>
          </div>

          <!-- Tab Content Containers -->
          <div id="repos-container" style="display: ${this.activeTab === 'repos' ? 'block' : 'none'};"></div>
          <div id="gists-container" style="display: ${this.activeTab === 'gists' ? 'block' : 'none'};"></div>
        </div>
      `;
      this.container.appendChild(scrollContainer);

      const profileTrigger = scrollContainer.querySelector<HTMLElement>('#gh-profile-info-trigger');
      profileTrigger?.addEventListener('click', () => {
        this.showAccountSwitcher(profileTrigger);
      });

      const accountSettingsBtn = scrollContainer.querySelector<HTMLElement>('#gh-account-settings-btn');
      accountSettingsBtn?.addEventListener('click', () => {
        if (this.api) openAccountSettingsModal(this.api, this.currentUser);
      });

      const addAccountBtn = scrollContainer.querySelector<HTMLElement>('#gh-add-account-btn');
      addAccountBtn?.addEventListener('click', () => {
        this.promptAddAccount(addAccountBtn);
      });

      scrollContainer.querySelector<HTMLElement>('#gh-logout-btn')?.addEventListener('click', () => {
        this.logout();
      });

      const reposTab = scrollContainer.querySelector<HTMLElement>('#tab-repos');
      const gistsTab = scrollContainer.querySelector<HTMLElement>('#tab-gists');
      const reposContainer = scrollContainer.querySelector<HTMLElement>('#repos-container')!;
      const gistsContainer = scrollContainer.querySelector<HTMLElement>('#gists-container')!;

      const switchTab = (tab: 'repos' | 'gists') => {
        this.activeTab = tab;
        localStorage.setItem('gh_active_tab', tab);
        if (tab === 'repos') {
          reposTab?.classList.add('active');
          gistsTab?.classList.remove('active');
          reposContainer.style.display = 'block';
          gistsContainer.style.display = 'none';
        } else {
          gistsTab?.classList.add('active');
          reposTab?.classList.remove('active');
          gistsContainer.style.display = 'block';
          reposContainer.style.display = 'none';
        }
      };

      reposTab?.addEventListener('click', () => switchTab('repos'));
      gistsTab?.addEventListener('click', () => switchTab('gists'));

      this.repoManager.render(reposContainer);
      this.gistManager.render(gistsContainer);

      this.contextSelect = null;
      this.updateContextSelect();
      this.gistManager.onSwitchToPersonal = () => {
        this.switchContext(null);
      };
    } else {
      scrollContainer.innerHTML = `
        <div class="gh-container" style="display: flex; flex-direction: column; justify-content: center; min-height: 85%;">
          <div class="gh-auth-card">
            <div class="gh-auth-icon-wrap">
              ${lucideIcons.github}
            </div>
            <h2 class="gh-auth-title">GitHub Manager</h2>
            <p class="gh-auth-desc">Connect your GitHub account to manage repositories, branches, commits & gists directly inside Acode.</p>
            
            <div id="gh-device-flow-container">
              <button id="gh-login-device-btn" class="gh-btn gh-btn-block gh-btn-primary" style="padding: 10px 16px; font-weight: 600; font-size: 13px; margin-bottom: 14px;">
                ${lucideIcons.github}
                <span>Login with GitHub</span>
              </button>
            </div>

            <details class="gh-dropdown" style="text-align: left; margin-top: 10px;">
              <summary class="gh-dropdown-summary" style="font-size: 12px;">Or login with Personal Access Token</summary>
              <div class="gh-dropdown-content" style="padding-top: 10px;">
                <input type="password" id="gh-token-input" class="gh-input" placeholder="ghp_xxxxxxxxxxxx" style="margin-bottom: 8px;">
                <button id="gh-login-token-btn" class="gh-btn gh-btn-block gh-btn-secondary" style="margin-bottom: 10px;">
                  Login with Token
                </button>
                <div style="text-align: center;">
                  <span id="gh-generate-token-btn" class="gh-text-link" style="font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                    <span>Create token with repo & gist permissions</span>
                    ${lucideIcons.externalLink}
                  </span>
                </div>
              </div>
            </details>
          </div>
        </div>
      `;
      this.container.appendChild(scrollContainer);

      const loginTokenBtn = scrollContainer.querySelector<HTMLElement>('#gh-login-token-btn');
      if (loginTokenBtn) {
        loginTokenBtn.addEventListener('click', () => {
          const tokenInput = scrollContainer.querySelector<HTMLInputElement>('#gh-token-input');
          const inputToken = tokenInput ? tokenInput.value.trim() : '';
          this.login(inputToken);
        });
      }

      const generateTokenBtn = scrollContainer.querySelector<HTMLElement>('#gh-generate-token-btn');
      if (generateTokenBtn) {
        generateTokenBtn.addEventListener('click', () => {
          const url = 'https://github.com/settings/tokens/new?scopes=repo,gist,delete_repo&description=Acode+Github+Manager';
          if ((window as any).system?.openInBrowser) {
            (window as any).system.openInBrowser(url);
          } else if ((window as any).cordova) {
            window.open(url, '_system');
          } else {
            window.open(url, '_blank');
          }
        });
      }

      const loginDeviceBtn = scrollContainer.querySelector<HTMLElement>('#gh-login-device-btn');
      if (loginDeviceBtn) {
        loginDeviceBtn.addEventListener('click', () => {
          this.startDeviceFlow(scrollContainer);
        });
      }
    }
  }

  async startDeviceFlow(container: HTMLElement): Promise<void> {
    const flowContainer = container.querySelector<HTMLElement>('#gh-device-flow-container');
    if (!flowContainer) return;

    flowContainer.innerHTML = '<p class="gh-text-muted" style="margin: 12px 0;">Requesting one-time authorization code...</p>';

    try {
      const data = await GitHubAPI.requestDeviceCode();

      flowContainer.innerHTML = `
        <div class="gh-device-box">
          <p style="font-size: 12px; margin: 0 0 6px 0; color: var(--gh-text-muted);">Enter this code on GitHub:</p>
          <div class="gh-device-code">${data.user_code}</div>
          <button id="gh-open-browser-btn" class="gh-btn gh-btn-block gh-btn-success" style="padding: 9px 14px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${lucideIcons.externalLink}
            <span>Open Browser</span>
          </button>
          <p class="gh-text-muted" style="margin: 10px 0 0 0; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span class="gh-badge gh-badge-offline" style="width: 6px; height: 6px; padding: 0; border-radius: 50%;"></span>
            Waiting for approval...
          </p>
        </div>
      `;

      const openBrowserBtn = container.querySelector<HTMLElement>('#gh-open-browser-btn');
      if (openBrowserBtn) {
        openBrowserBtn.addEventListener('click', () => {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(data.user_code);
          }

          if ((window as any).system?.openInBrowser) {
            (window as any).system.openInBrowser(data.verification_uri);
          } else {
            window.open(data.verification_uri, '_system');
          }
          showToast('Code copied! Authorize in browser.', 'info', 2500);
        });
      }

      let interval = data.interval;
      let polling = true;

      const stopPolling = () => {
        polling = false;
      };
      container.addEventListener('DOMNodeRemoved', stopPolling);

      while (polling) {
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));
        if (!polling) break;

        const pollData = await GitHubAPI.pollForToken(data.device_code);

        if (pollData.access_token) {
          polling = false;
          showToast('GitHub connected successfully!', 'success', 3000);
          await this.login(pollData.access_token);
        } else if (pollData.error === 'authorization_pending') {
        } else if (pollData.error === 'slow_down') {
          interval += 5;
        } else if (pollData.error === 'expired_token') {
          polling = false;
          fluentAlert('Error', 'The device code expired. Please try again.');
          await this.render();
        } else {
          polling = false;
          fluentAlert('Error', pollData.error_description || 'Authorization failed.');
          await this.render();
        }
      }
    } catch (err: any) {
      logger.error('Device flow error:', err);
      fluentAlert('Device Flow Error', String(err.message || err));
      await this.render();
    }
  }

  async login(token: string): Promise<void> {
    if (!token) {
      fluentAlert('Error', 'Please enter a valid token.');
      return;
    }
    try {
      showToast('Authenticating...', 'info', 2000);
      const user = await this.applyToken(token, true);
      showToast(`Welcome @${user.login}!`, 'success', 3000);
      await this.render();
    } catch (error) {
      logger.error('Login failed:', error);
      fluentAlert('Login Failed', 'Invalid token or network error. Please try again.');
    }
  }

  async logout(forceAll = false): Promise<void> {
    const accounts = this.getAccounts();
    if (!forceAll && accounts.length > 1) {
      const confirm = await fluentConfirm({
        title: 'Logout',
        message: `Logout from @${this.currentUser?.login || 'current account'}?`,
        confirmText: 'Logout',
        danger: true
      });
      if (!confirm) return;

      if (this.currentUser) {
        await this.removeAccount(this.currentUser.login);
      }
      return;
    }

    if (!forceAll) {
      const confirm = await fluentConfirm({
        title: 'Logout GitHub Manager',
        message: 'Are you sure you want to log out and clear saved GitHub credentials?',
        confirmText: 'Log Out',
        danger: true
      });
      if (!confirm) return;
    }

    this.token = null;
    this.currentUser = null;
    await AuthVault.clearAll();

    this.api = null;
    this.gistManager.setApi(null);
    this.repoManager.setApi(null);
    this.repoManager.setCurrentUser(null);
    this.repoManager.setOrgs([]);
    this.selectedOrg = null;
    this.orgs = [];
    this.contextSelect = null;

    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    showToast('Logged out successfully', 'info', 2500);
    await this.render();
  }

  updateContextSelect(): void {
    const contextWrap = document.getElementById('gh-global-context-wrap');
    if (!contextWrap) return;

    const options: DropdownOption[] = [
      {
        value: '',
        label: this.currentUser?.login || 'me',
        icon: lucideIcons.user,
        avatarUrl: this.currentUser?.avatar_url
      },
      ...this.orgs.map((org) => ({
        value: org.login,
        label: org.login,
        icon: lucideIcons.building,
        avatarUrl: org.avatar_url
      }))
    ];

    if (this.contextSelect) {
      this.contextSelect.setOptions(options, this.selectedOrg || '');
    } else {
      this.contextSelect = new CustomSelectComponent({
        container: contextWrap,
        id: 'gh-global-context-select',
        prefixIcon: lucideIcons.building,
        options,
        selectedValue: this.selectedOrg || '',
        onChange: (val) => {
          this.switchContext(val || null);
        }
      });
    }
  }

  switchContext(org: string | null): void {
    this.selectedOrg = org;
    if (this.contextSelect) {
      this.contextSelect.setSelectedValue(org);
    }
    this.repoManager.setSelectedOrg(org);
    this.gistManager.setSelectedOrg(org);
    if (org && this.activeTab === 'gists') {
      const reposTab = document.querySelector<HTMLElement>('#tab-repos');
      reposTab?.click();
    }
    this.updateTabCounts();
  }

  updateTabCounts(): void {
    const reposCountBadge = document.getElementById('tab-repos-count');
    if (reposCountBadge) {
      reposCountBadge.textContent = String(this.repoManager.repos.length);
    }
    const gistsCountBadge = document.getElementById('tab-gists-count');
    if (gistsCountBadge) {
      if (this.selectedOrg) {
        gistsCountBadge.textContent = '0';
      } else {
        gistsCountBadge.textContent = String(this.gistManager.gists.length);
      }
    }
  }

  async destroy(): Promise<void> {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('online', this.handleOnline);

    if (this.container) {
      this.container.innerHTML = '';
    }

    const sideBarApps = acode.require('sidebarApps');
    if (sideBarApps) {
      sideBarApps.remove(this.appId);
    }

    try {
      const appIcon = document.querySelector('.icon.github');
      if (appIcon) {
        const wrapper =
          appIcon.closest(`[action="${this.appId}"]`) ||
          appIcon.closest(`[data-id="${this.appId}"]`) ||
          appIcon.parentElement;

        if (wrapper && wrapper !== document.body) {
          wrapper.remove();
        } else {
          appIcon.remove();
        }
      }
    } catch (e) {}
  }
}
