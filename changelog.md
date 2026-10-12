# ChangeLogs

## [2.0.0] - 2026-10-12

### Added
- **Full TypeScript & Acodez Architecture**: Re-architected entire plugin into modular TypeScript with `@rvrugved/acodez` toolchain, strict type safety, and obfuscated production packaging.
- **Direct GitHub Suite**: Dedicated management for GitHub Issues, Pull Requests, Releases, and Actions CI/CD workflows directly in Acode.
- **Custom Structured Issue Templates**: Built-in support for structured YAML issue forms (Bug Reports, Feature Requests, Blank Issues) with interactive field validation.
- **Enhanced Gists System**: Complete rewrite supporting multi-file Gists, custom file picker selection ("From device file picker" and "From Acode file picker"), gist starring, forking, and direct sync.
- **Multi-Account & Organization Scope**: Switch between Personal user accounts and Organizations with dedicated icons, filtering, and org-isolated repositories.
- **Media & Image Viewer Engine**: Full support for images and GIFs in repositories and gists with pinch-to-zoom, pan bounds, and seamless Acode editor tab integration.
- **Native Fluent UI & Popovers**: Lightweight custom select popover menus with checkmarks, responsive 4-action card rows, 3-dots more menus, and zero horizontal scrolling.
- **GitHub Device Authorization Flow**: One-click "Open Browser" button for hassle-free GitHub device code authorization without manual copying/switching confusion.
- **4-Tier AuthVault**: Secure credential storage across localStorage, filesystem DATA_STORAGE, Android Keychain, and Acode settings.

### Changed
- **Star & Pin Workflow**: Re-architected starring and pinning with dedicated Lucide SVG icons, golden animated star indicators, and synchronized GitHub API state.
- **Error-Only Console Logging**: Suppressed informational and debug noise in console, strictly logging runtime errors.
- **Clean Zero-Comment Codebase**: Stripped all development comments and dead code across all source modules for maximum performance and lean bundle size.

---

## [1.2.4] - 2026-09-12

### 🛠️ Fixed
- **Branch Management**: Fixed errors `createBranch is not a function` and `deleteBranch is not a function` by properly implementing them in the GitHub API wrapper.
- **UI Refresh**: Fixed an issue where the branch dropdown wouldn't update instantly after creating or deleting a branch by bypassing the API cache and forcing a UI reload.

---
## [1.2.3] - 2026-05-27

### 🛠️ Fixed
- **Login Button**: Fixed the "Open Github Manager" button failure by replacing the missing editor command trigger with direct authentication methods inside the sidebar.

---

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
