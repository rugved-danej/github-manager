# ChangeLogs

## [1.2.1] - 2026-03-21

### 🛠️ Fixed
- **Safe Cleanup**: Wrapped unmount lifecycle events (command removal, sidebar destruction, CSS removal, and storage cleanup) in `try...catch` blocks to prevent unhandled exceptions during the teardown process.
- **Sidebar Scrolling**: Added proper CSS classes and inline styles during sidebar initialization to ensure consistent vertical scrolling behavior.

---

## [1.2.0] - 2026-03-14

### 🚀 Added
- **Interactive Diff Viewer**: A new split-screen UI to compare local and remote file changes side-by-side.
- **Conflict Resolution**: Added "Accept Local" and "Accept Remote" actions in the Pull workflow to handle file mismatches safely.
- **Push Review Mode**: Added an optional confirmation to review diffs of changed files before committing them to GitHub.
- **Clear Cache UI**: A dedicated "Clear Cache" button in the sidebar for easier manual cache management.
- **Enhanced Dependencies**: Integrated the `diff` library to power line-by-line comparisons.

### 🛠️ Fixed
- **Improved File Opening**: Switched repository file browsing to use the `downloadBlob` method for better stability and encoding support.
- **Mobile Diff UI**: Optimized CSS to ensure the split-view diff viewer is usable on mobile screens.

---

## [1.1.0] - 2026-03-14

### 🚀 Added
- **Modular Architecture**: Refactored the codebase into a domain-driven structure (api, gists, repos).
- **Persistent Caching**: Integrated IndexedDB via `CacheDB` to reduce API calls and enable offline viewing.
- **Quick Commit Command**: Added `Ctrl-Shift-G` to commit the active file directly to any repository.
- **Enhanced UI Icons**: Integrated Tabler Icons and a dynamic `getFileIcon` system for color-coded file extensions.
- **Repo Pinning**: Added the ability to pin favorite repositories to the top of the list.
- **Branch Management**: Added UI buttons to create and delete branches from the repository browser.

### 🛠️ Fixed
- **Large File Handling**: Improved `downloadBlob` logic for Base64 decoding and binary buffer handling.
- **Progress Visibility**: Added visual progress bars for Clone and Pull operations.
- **Token Security**: Integrated with Acode's `keychain` for secure storage of Personal Access Tokens.

---

## [1.0.0] - 2026-03-13
- Initial Release.
