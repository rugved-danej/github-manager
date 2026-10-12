import plugin from '../plugin.json';
import { GithubSidebar } from './sidebar';
import { registerCommands, unregisterCommands } from './commands/index';
import style from './styles/main.scss';

class GithubManagerPlugin {
  baseUrl = '';
  $page!: Acode.WCPage;
  private styleId = `${plugin.id}-styles`;
  sidebar = new GithubSidebar();

  async init(
    $page: Acode.WCPage,
    _cacheFile?: Acode.FileSystem,
    _cacheFileUrl?: string
  ): Promise<void> {
    this.$page = $page;

    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.id = this.styleId;
    styleSheet.innerHTML = style;
    document.head.appendChild(styleSheet);

    // Initialize sidebar
    this.sidebar.baseUrl = this.baseUrl;
    await this.sidebar.init();

    // Register editor commands
    registerCommands(() => this.sidebar.repoManager);

    // Initialize plugin default settings
    const appSettings = acode.require('settings') as any;
    if (!appSettings.value[plugin.id]) {
      appSettings.update({ [plugin.id]: { showPrivate: true, defaultCloneDir: '' } });
    }
  }

  async destroy(): Promise<void> {
    // 1. Safe Command Removal
    unregisterCommands();

    // 2. Safe Sidebar Destruction
    try {
      await this.sidebar.destroy();
    } catch (e) {}

    // 3. Safe CSS Removal
    try {
      const styleSheet = document.getElementById(this.styleId);
      if (styleSheet) styleSheet.remove();
    } catch (e) {}
  }
}

if (window.acode) {
  const pluginInstance = new GithubManagerPlugin();

  window.acode.setPluginInit(
    plugin.id,
    async (baseUrl: string, $page: Acode.WCPage, { cacheFileUrl, cacheFile }: any) => {
      pluginInstance.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      await pluginInstance.init($page, cacheFile, cacheFileUrl);
    },
    {
      get list() {
        const appSettings = acode.require('settings') as any;
        return [
          {
            key: 'showPrivate',
            text: 'Show Private Repositories',
            checkbox: !!appSettings.value[plugin.id]?.showPrivate
          },
          {
            key: 'defaultCloneDir',
            text: 'Default Clone Directory',
            value: appSettings.value[plugin.id]?.defaultCloneDir || '',
            prompt: 'Folder URL'
          }
        ];
      },
      cb: (key: string, value: any) => {
        const appSettings = acode.require('settings') as any;
        const settings = appSettings.value[plugin.id] || {};
        settings[key] = value;
        appSettings.update({ [plugin.id]: settings });
        pluginInstance.sidebar.render();
      }
    }
  );

  window.acode.setPluginUnmount(plugin.id, () => {
    void pluginInstance.destroy();
  });
}
