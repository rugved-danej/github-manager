import { GitHubAPI } from './api/github.js';
import { GistManager } from './gists/manager.js';
import { RepoManager } from './repos/manager.js';

export class GithubSidebar {
  constructor() {
    this.appId = 'github_manager_sidebar';
    this.serviceId = 'github_manager_auth';
    this.accountId = 'access_token';
    this.tokenKey = 'github_manager_token';
    this.container = null;
    this.api = null;
    this.token = null;
    
    this.gistManager = new GistManager(null);
    this.repoManager = new RepoManager(null);

    this.handleOffline = () => {
      const el = document.getElementById('gh-offline-indicator');
      if (el) el.style.display = 'inline-block';
    };
    this.handleOnline = () => {
      const el = document.getElementById('gh-offline-indicator');
      if (el) el.style.display = 'none';
    };
  }

  async init() {
    const sideBarApps = acode.require('sidebarApps');
    const keychain = acode.require('keychain');
    
    let token = localStorage.getItem(this.tokenKey);
    try { 
      if (keychain) {
        const kcToken = await keychain.get(this.serviceId, this.accountId);
        if (kcToken) token = kcToken;
      }
    } catch(e) {}
    
    this.token = token;

    if (token) {
      this.api = new GitHubAPI(token);
      this.gistManager.setApi(this.api);
      this.repoManager.setApi(this.api);
    }

    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('online', this.handleOnline);

    sideBarApps.add('icon github', this.appId, 'Github Manager', (container) => {
        this.container = container;
        this.render();
    }, false, () => this.render());
  }

  async render() {
    if (!this.container) return;

    const keychain = acode.require('keychain');
    let token = this.token; 
    
    if (!token) {
      token = localStorage.getItem(this.tokenKey);
      try { 
        if (keychain) {
          const kcToken = await keychain.get(this.serviceId, this.accountId);
          if (kcToken) token = kcToken;
        }
      } catch(e) {}
      this.token = token;
    }
    
    this.container.innerHTML = '';

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'gh-scroll';

    if (token) {
      if (!this.api) {
        this.api = new GitHubAPI(token);
        this.gistManager.setApi(this.api);
        this.repoManager.setApi(this.api);
      }

      const reposOpen = localStorage.getItem('gh_repos_open') !== 'false';
      const gistsOpen = localStorage.getItem('gh_gists_open') === 'true';
      const isOffline = !navigator.onLine;

      scrollContainer.innerHTML = `
        <div class="gh-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 class="gh-title" style="margin: 0; display: flex; align-items: center;">
              Github Manager
              <span id="gh-offline-indicator" class="gh-badge gh-badge-offline" style="display: ${isOffline ? 'inline-block' : 'none'};">Offline</span>
            </h3>
            <div style="display: flex; gap: 6px;">
              <button id="gh-clear-cache-btn" class="gh-btn gh-btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Clear API Cache">Clear Cache</button>
              <button id="gh-logout-btn" class="gh-btn gh-btn-danger" style="padding: 4px 8px; font-size: 11px;">Logout</button>
            </div>
          </div>
          
          <details class="gh-dropdown" id="details-repos" ${reposOpen ? 'open' : ''}>
            <summary class="gh-dropdown-summary">Repositories</summary>
            <div id="repos-container" class="gh-dropdown-content"></div>
          </details>

          <details class="gh-dropdown" id="details-gists" ${gistsOpen ? 'open' : ''}>
            <summary class="gh-dropdown-summary">Gists</summary>
            <div id="gists-container" class="gh-dropdown-content"></div>
          </details>
        </div>
      `;
      this.container.appendChild(scrollContainer);

      scrollContainer.querySelector('#details-repos').addEventListener('toggle', (e) => localStorage.setItem('gh_repos_open', e.target.open));
      scrollContainer.querySelector('#details-gists').addEventListener('toggle', (e) => localStorage.setItem('gh_gists_open', e.target.open));
      
      scrollContainer.querySelector('#gh-clear-cache-btn').addEventListener('click', () => {
        try { 
          indexedDB.deleteDatabase('GitHubManagerCache'); 
          window.toast('Cache Cleared! Re-open repos to fetch fresh data.', 3000);
        } catch(e) {
          window.toast('Failed to clear cache.', 2000);
        }
      });
      
      scrollContainer.querySelector('#gh-logout-btn').addEventListener('click', () => this.logout());

      this.repoManager.render(scrollContainer.querySelector('#repos-container'));
      this.gistManager.render(scrollContainer.querySelector('#gists-container'));

      const footer = document.createElement('div');
      footer.style.cssText = 'padding: 12px; text-align: center; font-size: 11px; border-top: 1px solid var(--gh-border); margin-top: 20px;';
      footer.innerHTML = `<span class="gh-text-muted">API Limit: </span><span id="gh-api-limit" style="font-weight: 600; color: var(--gh-text);">Loading...</span>`;
      scrollContainer.querySelector('.gh-container').appendChild(footer);

      this.api.getRateLimit().then(data => {
        const limit = data.resources.core;
        const limitEl = document.getElementById('gh-api-limit');
        if (limitEl) {
          limitEl.textContent = `${limit.remaining} / ${limit.limit}`;
          if (limit.remaining < 500) limitEl.style.color = '#e3b341'; 
          if (limit.remaining < 100) limitEl.style.color = '#f85149'; 
        }
      }).catch(() => {
        const limitEl = document.getElementById('gh-api-limit');
        if (limitEl) limitEl.textContent = 'Unavailable';
      });

    } else {
      scrollContainer.innerHTML = `
        <div class="gh-container">
          <h3 class="gh-title" style="margin-bottom: 16px;">Github Manager</h3>
          <p class="gh-text-muted" style="text-align: left;">Authenticate to access your repositories and gists.</p>
          
          <div id="gh-device-flow-container">
            <button id="gh-login-device-btn" class="gh-btn gh-btn-block gh-btn-github gh-mb-10">
              <span class="icon github"></span> Login with GitHub
            </button>
            <div style="text-align: center; margin: 10px 0; color: var(--gh-text-muted); font-size: 12px;">OR</div>
          </div>

          <input type="password" id="gh-token-input" class="gh-input gh-mb-10" placeholder="Paste Personal Access Token">
          <button id="gh-login-btn" class="gh-btn gh-btn-block gh-btn-secondary">
            Login with Token
          </button>
          
          <span id="gh-generate-token-btn" class="gh-text-link" style="display: block; text-align: center; margin-top: 15px; font-size: 12px; cursor: pointer;">Generate Token Manually</span>
        </div>
      `;
      this.container.appendChild(scrollContainer);

      scrollContainer.querySelector('#gh-login-btn').addEventListener('click', () => {
        const inputToken = scrollContainer.querySelector('#gh-token-input').value.trim();
        this.login(inputToken);
      });
      
      scrollContainer.querySelector('#gh-generate-token-btn').addEventListener('click', () => {
        const url = 'https://github.com/settings/tokens/new?scopes=repo,gist,delete_repo';
        if (window.system && window.system.openInBrowser) {
          window.system.openInBrowser(url);
        } else if (window.cordova) {
          window.open(url, '_system');
        } else {
          window.open(url, '_blank');
        }
      });

      scrollContainer.querySelector('#gh-login-device-btn').addEventListener('click', () => {
        this.startDeviceFlow(scrollContainer);
      });
    }
  }

  async startDeviceFlow(container) {
    const flowContainer = container.querySelector('#gh-device-flow-container');
    flowContainer.innerHTML = `<p class="gh-text-muted">Requesting code...</p>`;

    try {
      const data = await GitHubAPI.requestDeviceCode();
      
      flowContainer.innerHTML = `
        <div style="background: var(--gh-bg-secondary); border: 1px solid var(--gh-border); padding: 10px; border-radius: 6px; text-align: center; margin-bottom: 15px;">
          <p style="font-size: 12px; margin-bottom: 8px;">Enter this code on GitHub:</p>
          <h2 style="letter-spacing: 2px; color: var(--gh-link); margin: 0 0 10px 0;">${data.user_code}</h2>
          <button id="gh-open-browser-btn" class="gh-btn gh-btn-block gh-btn-success">Open Browser</button>
          <p class="gh-text-muted" style="margin-top: 8px; font-size: 10px;">Waiting for authorization...</p>
        </div>
      `;

      container.querySelector('#gh-open-browser-btn').addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data.user_code);
        
        if (window.system && window.system.openInBrowser) {
          window.system.openInBrowser(data.verification_uri);
        } else {
          window.open(data.verification_uri, '_system');
        }
        window.toast('Code copied to clipboard!', 2000);
      });

      let interval = data.interval;
      let polling = true;
      
      const stopPolling = () => { polling = false; };
      container.addEventListener('DOMNodeRemoved', stopPolling);

      while (polling) {
        await new Promise(resolve => setTimeout(resolve, interval * 1000));
        if (!polling) break;

        const pollData = await GitHubAPI.pollForToken(data.device_code);

        if (pollData.access_token) {
          polling = false;
          window.toast('Authorization successful!', 3000);
          this.login(pollData.access_token);
        } else if (pollData.error === 'authorization_pending') {
        } else if (pollData.error === 'slow_down') {
          interval += 5; 
        } else if (pollData.error === 'expired_token') {
          polling = false;
          acode.alert('Error', 'The device code expired. Please try again.');
          this.render();
        } else {
          polling = false;
          acode.alert('Error', pollData.error_description || 'Authorization failed.');
          this.render();
        }
      }

    } catch (err) {
      acode.alert('Device Flow Error', String(err.message || err));
      this.render();
    }
  }

  async login(token) {
    if (!token) { acode.alert('Error', 'Please enter a token.'); return; }
    try {
      this.api = new GitHubAPI(token);
      const user = await this.api.getUser();
      
      this.token = token;
      localStorage.setItem(this.tokenKey, token); 
      
      const keychain = acode.require('keychain');
      try {
        if (keychain) await keychain.set(this.serviceId, this.accountId, token);
      } catch (e) {}
      
      this.gistManager.setApi(this.api);
      this.repoManager.setApi(this.api);
      
      window.toast(`Logged in as ${user.login}`, 3000);
      this.render();
    } catch (error) {
      this.api = null; this.gistManager.setApi(null); this.repoManager.setApi(null); this.token = null;
      acode.alert('Login Failed', 'Invalid token or network error.');
    }
  }

  async logout() {
    this.token = null;
    localStorage.removeItem(this.tokenKey);
    
    const keychain = acode.require('keychain');
    try { if (keychain) await keychain.delete(this.serviceId, this.accountId); } catch(e) {}
    
    this.api = null; this.gistManager.setApi(null); this.repoManager.setApi(null);
    window.toast('Logged out successfully', 3000);
    this.render();
  }

  async destroy() {
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('online', this.handleOnline);
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
