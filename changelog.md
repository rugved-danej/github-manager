# ChangeLogs

## [1.1.0] - 2026-03-14

### 🚀 Added
- **Modular Architecture**: Complete refactor of the codebase into a clean, domain-driven structure (api, gists, repos).
- **Persistent Caching**: Integrated IndexedDB caching via `CacheDB` to reduce API calls and enable limited offline viewing of previously loaded repos and gists.
- **Quick Commit Command**: New global command (`Ctrl-Shift-G`) to commit the currently active file directly to any repository without opening the sidebar.
- **Enhanced UI Icons**: Integrated Tabler Icons and a dynamic `getFileIcon` system that colors icons based on file extensions (JS, TS, Python, etc.).
- **Repo Pinning**: Added the ability to pin favorite repositories to the top of the list.
- **Branch Management**: Added UI buttons to create and delete branches directly from the repository browser.

### 🛠️ Fixed
- **Large File Handling**: Improved `downloadBlob` logic to handle Base64 decoding for UTF-8 text files and raw buffers for binaries.
- **Progress Visibility**: Added a visual progress bar during Clone and Pull operations.
- **Token Security**: Integrated with Acode's `keychain` for more secure storage of Personal Access Tokens.

## [1.0.0] - 2026-03-13
- Initial Release.