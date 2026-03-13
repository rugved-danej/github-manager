import plugin from '../plugin.json';
import { GithubSidebar } from './sidebar.js';

// Importing CSS triggers esbuild to generate a main.css file automatically
import './styles.css'; 

if (window.acode) {
  const sidebar = new GithubSidebar();

  acode.setPluginInit(plugin.id, async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    sidebar.baseUrl = baseUrl;
    
    // Inject the bundled CSS file into the editor's head tag
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'github-manager-styles';
    link.href = baseUrl + 'main.css';
    document.head.appendChild(link);

    await sidebar.init();
  });

  acode.setPluginUnmount(plugin.id, () => {
    sidebar.destroy();
    
    // Clean up our CSS file when the plugin is uninstalled
    const link = document.getElementById('github-manager-styles');
    if (link) link.remove();
  });
}
