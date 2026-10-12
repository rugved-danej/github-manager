# Github Manager

A powerful, all-in-one GitHub integration for Acode. Manage your Gists and Repositories directly from your favorite mobile editor with a native-feeling UI.

## 🚀 Features

### 📦 Repository Management
- **Conflict Management**: Integrated **Diff Viewer** allows you to see exactly what changed before you Pull or Push. Resolve conflicts by choosing between local or remote versions.
- **Smart Cloning & Pulling**: Sync remote repositories to local storage with visual progress bars. Includes `.git/config` generation for Termux compatibility.
- **Delta Sync Pushing**: Recursively uploads local folders using Git Trees API. Now includes a **Review Mode** to verify changes before syncing.
- **Branch Control**: Create, delete, and switch branches through a native dropdown menu.
- **Quick Commit**: Use `Ctrl-Shift-G` to instantly commit your current editor tab to GitHub.
- **Pinning**: Keep your most-used projects at the top of your list.

### 📄 Gist Management
- **Full CRUD Support**: Create, Edit, and Delete Gists or individual files within them.
- **Two-Way Sync**: Open Gists into Acode tabs and push edits back with a single click.

### 🛠️ Advanced Integration
- **IndexedDB Caching**: Faster load times and offline access to cached metadata.
- **Tabler Icons**: Beautiful, color-coded file icons based on language extensions.
- **Secure Auth**: Support for GitHub Device Flow and Keychain-encrypted token storage.

## 📥 Installation

1. Download the `plugin.zip` from the GitHub releases or the Acode Plugin Store.
2. In Acode, go to **Settings > Plugins**.
3. Click the **+** icon and select the zip file.

## 🔑 Setup

To use this plugin, you need a **GitHub Personal Access Token (Classic)**:
1. Go to [GitHub Token Settings](https://github.com/settings/tokens).
2. Generate a new token with `repo` and `gist` scopes. (If you want to delete repos, check the `delete_repo` scope).
3. Copy the token and paste it into the plugin's login prompt in the sidebar.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---
Built with ❤️ by [Rugved](https://rugveddanej.me)
