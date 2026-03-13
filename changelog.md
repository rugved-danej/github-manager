# ChangeLogs

## [1.0.0] - 2026-03-13

### 🚀 Added (Initial Release)
- **Full Repository Integration**: Support for browsing, creating, and deleting repositories.
- **Local Syncing**: Added "Clone to Device" functionality that downloads full repo structures.
- **Bulk Pushing**: Introduced "Push Local Folder" which recursively uploads a local directory to a GitHub repository using the Git Trees API.
- **Git Compatibility**: Implementation of `.git/config` generation during clone for interoperability with standard Git clients.
- **.gitignore Logic**: Added a custom parser to exclude ignored files during push and initialization operations.
- **Gist Management**: Full CRUD operations for Gists, including the ability to push active Acode tabs directly to Gist files.
- **Advanced UI**: Searchable lists, pagination (100 items per page), and GitHub Primer dark theme styling.
- **Authentication**: Token-based login with persistent session handling.

### 🛠️ Fixed
- Optimized file downloading to handle binary vs. text files correctly, preventing editor crashes on large repos.
- Fixed CORS issues when downloading raw files by utilizing the GitHub Blobs API.
