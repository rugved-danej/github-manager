import plugin from '../plugin.json';
import { GithubSidebar } from './sidebar.js';
import { handleQuickCommit } from './repos/quickCommit.js';
import './styles.css';

if (window.acode) {
  const sidebar = new GithubSidebar();

  acode.setPluginInit(plugin.id, async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    sidebar.baseUrl = baseUrl;
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'github-manager-styles';
    link.href = baseUrl + 'main.css';
    document.head.appendChild(link);

    await sidebar.init();

    const editorManager = window.editorManager || acode.require('editorManager');
    if (editorManager && editorManager.editor) {
      editorManager.editor.commands.addCommand({
        name: 'Github Manager: Quick Commit',
        bindKey: { win: 'Ctrl-Shift-G', mac: 'Command-Shift-G' },
        exec: () => handleQuickCommit(sidebar.repoManager)
      });
    }

    const appSettings = acode.require('settings');
    if (!appSettings.value[plugin.id]) {
      appSettings.update({ [plugin.id]: { showPrivate: true, defaultCloneDir: '' } });
    }
  });

  acode.setPluginSettings(plugin.id, {
    get list() {
      const appSettings = acode.require('settings');
      return [
        { key: 'showPrivate', text: 'Show Private Repositories', checkbox: !!appSettings.value[plugin.id]?.showPrivate },
        { key: 'defaultCloneDir', text: 'Default Clone Directory', value: appSettings.value[plugin.id]?.defaultCloneDir || '', prompt: 'Folder URL' },
        { key: 'clearCache', text: 'Clear API Cache' }
      ];
    },
    cb: (key, value) => {
      if (key === 'clearCache') {
        try { indexedDB.deleteDatabase('GitHubManagerCache'); } catch(e) {}
        window.toast('Cache Cleared', 2000);
        return;
      }
      const appSettings = acode.require('settings');
      let settings = appSettings.value[plugin.id] || {};
      settings[key] = value;
      appSettings.update({ [plugin.id]: settings });
      sidebar.render();
    }
  });

  acode.setPluginUnmount(plugin.id, async () => {
    const editorManager = window.editorManager || acode.require('editorManager');
    if (editorManager && editorManager.editor) {
      editorManager.editor.commands.removeCommand('Github Manager: Quick Commit');
    }

    const sideBarApps = acode.require('sidebarApps');
    if (sideBarApps) {
      sideBarApps.remove(sidebar.appId);
    }

    await sidebar.destroy();
    
    const link = document.getElementById('github-manager-styles');
    if (link) link.remove();

    localStorage.removeItem('gh_repos_open');
    localStorage.removeItem('gh_gists_open');
    localStorage.removeItem('gh_pinned_repos');
    localStorage.removeItem('github_manager_token');

    try {
      indexedDB.deleteDatabase('GitHubManagerCache');
    } catch(e) {}

    const keychain = acode.require('keychain');
    try {
      if (keychain) await keychain.delete('github_manager_auth', 'access_token');
    } catch(e) {}

    const appSettings = acode.require('settings');
    const currentSettings = appSettings.value;
    if (currentSettings[plugin.id]) {
      delete currentSettings[plugin.id];
      appSettings.update(currentSettings);
    }
  });
}
