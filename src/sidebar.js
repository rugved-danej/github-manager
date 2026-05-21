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

   // remove previous sidebar app so no duplicate
   sideBarApps.remove(this.appId);

    // Keep the same ID but change the label to 'Github Companion'
    sideBarApps.add('icon github', this.appId, 'Github Companion', (container) => {
        container.classList.add('scroll');
        container.style.height = '100%';
        container.style.overflowY = 'auto';

        // i think we forgot max width, this stuff always goes beyond the container
        container.style.width = '100%'
        container.style.maxWidth = '100%'

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
    scrollContainer.className = 'gh-scroll scroll';
    scrollContainer.style.height = '100%';
    scrollContainer.style.width = '100%';
    scrollContainer.style.maxWidth = '100%';
    scrollContainer.style.overflowY = 'auto';

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
              Github Companion
              <span id="gh-offline-indicator" class="gh-badge gh-badge-offline" style="display: ${isOffline ? 'inline-block' : 'none'};">Offline</span>
            </h3>
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
          <h3 class="gh-title" style="margin-bottom: 16px;">Github Companion</h3>
          <p class="gh-text-muted" style="text-align: left; margin-bottom: 16px;">You are not logged in. Please open the Github Manager page to authenticate.</p>
          
          <button id="gh-open-manager-btn" class="gh-btn gh-btn-block gh-btn-success gh-mb-10">
            Open Github Manager
          </button>
        </div>
      `;
      this.container.appendChild(scrollContainer);

      scrollContainer.querySelector('#gh-open-manager-btn').addEventListener('click', () => {
        const editorManager = window.editorManager || acode.require('editorManager');
        if (editorManager && editorManager.editor && editorManager.editor.commands) {
          editorManager.editor.commands.exec('Github Manager');
        }
      });
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
      this.render(); // This ensures the sidebar updates when the page fires a login
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
    this.render(); // This ensures the sidebar updates when the page fires a logout
  }

  async destroy() {
    // 1. Clean up event listeners
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('online', this.handleOnline);
    
    // 2. Clear DOM container
    if (this.container) {
      this.container.innerHTML = '';
    }

    // 3. Safely require sideBarApps and remove the app
    const sideBarApps = acode.require('sidebarApps');
    if (sideBarApps) {
      sideBarApps.remove(this.appId);
    }

    // 4. Forcefully remove the icon from the DOM (Fixes the zombie icon issue)
    try {
      const appIcon = document.querySelector('.icon.github');
      if (appIcon) {
         // funny how I'm seeing this, but this is not how it works, it still doesn't remove.

        // Acode usually wraps sidebar icons in a container div/span that holds the click action.
        // We look for the parent wrapper to remove the entire clickable block.
        const wrapper = appIcon.closest(`[action="${this.appId}"]`) || 
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
