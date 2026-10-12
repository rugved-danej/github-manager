# Github Manager

A full-featured, native-feeling GitHub & Gist integration for Acode mobile editor. Manage your code repositories, issues, pull requests, releases, workflows, and gists directly from your mobile workspace without having to visit the GitHub website.

## Features

### Repository Management
- **Issue Tracker & Templates**: View open and closed issues, search and filter, post markdown comments, close/reopen issues, and create new issues using structured YAML templates (Bug Reports, Feature Requests, or Blank Issues).
- **Pull Requests**: Inspect open and closed pull requests, review file changes and diffs, and merge PRs directly from your phone.
- **Releases**: Browse releases, download binary assets directly to your device, and draft new release tags.
- **Actions (CI/CD)**: Check workflow run status, inspect job conclusions, and re-run failed workflow checks.
- **Repository Settings**: Modify repository details, default branch, privacy settings, and fork repositories.
- **Code Browser**: Browse folder trees, view file sizes, copy raw download links, and open files directly in Acode editor tabs.
- **Smart Cloning & Pulling**: Clone remote repositories to local storage with progress feedback and automatic `.git/config` generation for Termux compatibility.
- **Delta Sync Pushing**: Recursively upload local changes via Git Trees API with an optional Review Mode to inspect modifications before committing.
- **Conflict Resolution**: Integrated split Diff Viewer to compare local and remote changes with one-tap conflict resolution ("Accept Local" or "Accept Remote").
- **Branch Management**: Create, switch, and delete branches with live dropdown updates.
- **Quick Commit**: Press `Ctrl-Shift-G` to commit your current active editor tab straight to GitHub.
- **Starring & Pinning**: Pin your most critical projects to the top and star repositories with live GitHub synchronization and animated indicators.

### Gist Management
- **Full Gist Operations**: Create, view, edit, star, fork, and delete gists and individual files.
- **Multi-File Support**: Add or remove multiple files per gist with language syntax detection.
- **File Picker Integration**: Choose files using either the device file picker or Acode file picker.
- **Two-Way Synchronization**: Open any gist file into an Acode tab and push updates back in real time.
- **Local Clone**: Clone any gist to your device storage.

### Multi-Account & Organization Scope
- **Scope Switching**: Switch seamlessly between Personal repositories and Organization repositories.
- **Isolated Filtering**: View only personal repositories and gists in Personal mode; view organization repositories with zero clutter in Organization mode.
- **Adaptive Filter Bar**: Filter repositories by All, Pinned, Public, or Private with responsive pills that stretch across all screen widths.

### Media & Image Viewing
- **Rich Media Preview**: Preview images and animated GIFs (PNG, JPG, JPEG, GIF, SVG, WEBP, ICO) inside repository and gist directories.
- **Pinch-to-Zoom Engine**: Full touch pinch-to-zoom, pan boundaries, and zoom controls.
- **Editor Tab Integration**: Open media files directly in Acode editor tabs.

### Native Mobile UI & Architecture
- **Zero Horizontal Scrolling**: Adaptive mobile-first UI with responsive 4-action card rows and 3-dots more menu popovers.
- **Custom Select Menus**: Native Fluent popover selection dialogs with account avatars, icons, and custom tick checkmarks.
- **Device Authorization**: One-click "Open Browser" button for frictionless GitHub device code authentication.
- **4-Tier AuthVault**: Secure multi-layer credential persistence (localStorage, DATA_STORAGE filesystem, Android Cordova keychain, and Acode settings).
- **Error-Only Console**: Zero console spam; exclusively runtime errors are logged.
- **Full TypeScript**: Strict type safety compiled via `@rvrugved/acodez`.

## Installation

1. Download `plugin.zip` from GitHub Releases or install through the Acode Plugin Store.
2. In Acode, navigate to **Settings > Plugins**.
3. Select the **+** button, choose **From storage**, and select `plugin.zip`.

## Setup

Authenticate using either method:
- **Device Code Flow (Recommended)**: Click "Login with GitHub", then click "Open Browser" to confirm your authorization code.
- **Personal Access Token**: Enter a GitHub Personal Access Token (Classic or Fine-Grained) with the following scopes:
  - `repo` (Full control of private and public repositories)
  - `gist` (Create and manage gists)
  - `delete_repo` (Optional: required only if you want to delete repositories from Acode)
  - `workflow` (Optional: required for Actions CI/CD re-runs)

## License

This project is licensed under the [MIT License](LICENSE).

---
Developed by [Rugved](https://rugveddanej.me)
