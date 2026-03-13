import { GitHubAPI } from './api.js';
import { GistManager } from './gists.js';
import { RepoManager } from './repos.js';

export class GithubSidebar {
  constructor() {
    this.appId = 'github_manager_sidebar';
    this.tokenKey = 'github_manager_token';
    this.container = null;
    this.api = null;
    
    this.gistManager = new GistManager(null, () => this.render());
    this.repoManager = new RepoManager(null);
  }

  async init() {
    const sideBarApps = acode.require('sidebarApps');
    const token = localStorage.getItem(this.tokenKey);
    
    if (token) {
      this.api = new GitHubAPI(token);
      this.gistManager.setApi(this.api);
      this.repoManager.setApi(this.api);
    }

    sideBarApps.add('icon github', this.appId, 'Github Manager', (container) => {
        this.container = container;
        this.render();
    }, false, () => this.render());
  }

  async render() {
    if (!this.container) return;

    const token = localStorage.getItem(this.tokenKey);
    this.container.innerHTML = '';

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'gh-scroll';

    if (token) {
      if (!this.api) {
        this.api = new GitHubAPI(token);
        this.gistManager.setApi(this.api);
        this.repoManager.setApi(this.api);
      }

      // Restore dropdown states from localStorage
      const reposOpen = localStorage.getItem('gh_repos_open') !== 'false'; // Default to True
      const gistsOpen = localStorage.getItem('gh_gists_open') === 'true';  // Default to False

      scrollContainer.innerHTML = `
        <div class="gh-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 class="gh-title" style="margin: 0;">Github Manager</h3>
            <button id="gh-logout-btn" class="gh-btn gh-btn-danger" style="padding: 4px 8px; font-size: 11px;">Logout</button>
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

      // Save dropdown state when users open/close them
      scrollContainer.querySelector('#details-repos').addEventListener('toggle', (e) => localStorage.setItem('gh_repos_open', e.target.open));
      scrollContainer.querySelector('#details-gists').addEventListener('toggle', (e) => localStorage.setItem('gh_gists_open', e.target.open));
      scrollContainer.querySelector('#gh-logout-btn').addEventListener('click', () => this.logout());

      this.repoManager.render(scrollContainer.querySelector('#repos-container'));
      this.gistManager.render(scrollContainer.querySelector('#gists-container'));

    } else {
      scrollContainer.innerHTML = `
        <div class="gh-container">
          <h3 class="gh-title" style="margin-bottom: 16px;">Github Manager</h3>
          <p class="gh-text-muted" style="text-align: left;">Please enter a GitHub Personal Access Token to continue.</p>
          <details class="gh-details">
            <summary class="gh-summary">How to get a token?</summary>
            <ol class="gh-tutorial-list">
              <li>Open <a href="https://github.com/settings/tokens" target="_blank" class="gh-text-link">GitHub Tokens</a> in your browser.</li>
              <li>Click <strong>Generate new token (classic)</strong>.</li>
              <li>Give it a Note.</li>
              <li>Check <strong>all the boxes</strong> (scopes) to grant full access.</li>
              <li>Scroll down and click <strong>Generate token</strong>.</li>
              <li>Copy the token and paste it below.</li>
            </ol>
          </details>
          <input type="password" id="gh-token-input" class="gh-input" placeholder="ghp_xxxxxxxxxxxx">
          <button id="gh-login-btn" class="gh-btn gh-btn-block gh-btn-github">
            <span class="icon github"></span> Login to GitHub
          </button>
        </div>
      `;
      this.container.appendChild(scrollContainer);

      scrollContainer.querySelector('#gh-login-btn').addEventListener('click', () => {
        this.login(scrollContainer.querySelector('#gh-token-input').value);
      });
    }
  }

  async login(token) {
    if (!token) { acode.alert('Error', 'Please enter a token.'); return; }
    try {
      this.api = new GitHubAPI(token);
      const user = await this.api.getUser();
      localStorage.setItem(this.tokenKey, token);
      
      this.gistManager.setApi(this.api);
      this.repoManager.setApi(this.api);
      
      window.toast(`Logged in as ${user.login}`, 3000);
      this.render();
    } catch (error) {
      this.api = null; this.gistManager.setApi(null); this.repoManager.setApi(null);
      acode.alert('Login Failed', 'Invalid token.');
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.api = null; this.gistManager.setApi(null); this.repoManager.setApi(null);
    window.toast('Logged out successfully', 3000);
    this.render();
  }

  async destroy() {
    acode.require('sidebarApps').remove(this.appId);
  }
}
