# Github Manager

A powerful, all-in-one GitHub integration for Acode. Manage your Gists and Repositories directly from your favorite mobile editor with a native-feeling UI.

## 🚀 Features

### 📦 Repository Management
- **Smart Cloning**: Download entire repositories directly to your device storage. It automatically sets up a `.git/config` for compatibility with external tools like Termux.
- **Push Local Folders**: Select a local folder on your device and push all changes back to GitHub in a single commit.
- **Repository Creation**: Create new repositories (Public or Private) and optionally initialize them with code from a local folder.
- **Branch Support**: Seamlessly switch between branches while browsing.
- **Secure Deletion**: Delete repositories directly from the app (requires appropriate token permissions).
- **Search & Filter**: Instantly find the repository you need with the real-time search bar.

### 📄 Gist Management
- **Create & Edit**: Quickly create Gists from active editor tabs or system files.
- **Two-Way Sync**: 'Open' Gist files directly into Acode tabs and 'Push' your edits back to GitHub with one click.
- **Multi-file Support**: Easily add or delete files within existing Gists.

### 🛠️ Advanced Integration
- **.gitignore Support**: Respects your local `.gitignore` rules when pushing folders or initializing repositories.
- **GitHub Primer UI**: Designed using GitHub's official color palette for a seamless dark-mode experience.
- **Persistent State**: Remembers your open/closed dropdown preferences across app restarts.

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
