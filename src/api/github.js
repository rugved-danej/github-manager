import { CacheDB } from './cache.js';

export class GitHubAPI {
  static CLIENT_ID = 'Ov23liHi0m8xDFMtJY1J';
  static PROXY_URL = 'https://githubmanager.rugveddanej007.workers.dev';

  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  static async requestDeviceCode() {
    const res = await fetch(`${this.PROXY_URL}/login/device/code`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.CLIENT_ID,
        scope: 'repo gist delete_repo'
      })
    });
    if (!res.ok) throw new Error('Failed to request device code');
    return res.json();
  }

  static async pollForToken(deviceCode) {
    const res = await fetch(`${this.PROXY_URL}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    });
    return res.json();
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  async getRateLimit() {
    const res = await fetch(`${this.baseUrl}/rate_limit`, { headers: this.getHeaders() });
    return res.json();
  }

  async _fetchWithCache(url, forceText = false) {
    const cleanUrl = url.replace(/([?&])t=\d+/, '');
    const cacheKey = btoa(cleanUrl).substring(0, 50);
    const cachedData = await CacheDB.get(cacheKey);

    if (!navigator.onLine) {
      if (cachedData) {
        window.toast('Working Offline', 2000);
        return cachedData;
      }
      throw new Error('No internet connection and no cached data available.');
    }

    try {
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);

      const data = forceText ? await res.text() : await res.json();
      await CacheDB.set(cacheKey, data);
      return data;
    } catch (err) {
      if (cachedData) {
        window.toast('Fetch failed. Loading cached version.', 3000);
        return cachedData;
      }
      throw err;
    }
  }

  async getUser() {
    return this._fetchWithCache(`${this.baseUrl}/user`);
  }

  async getGists(page = 1, perPage = 30) {
    return this._fetchWithCache(`${this.baseUrl}/gists?page=${page}&per_page=${perPage}`);
  }

  async getGist(gistId) {
    return this._fetchWithCache(`${this.baseUrl}/gists/${gistId}`);
  }

  async createGist(description, filename, content, isPublic = false) {
    const payload = { description, public: isPublic, files: { [filename]: { content } } };
    const res = await fetch(`${this.baseUrl}/gists`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to create gist');
    return res.json();
  }

  async updateGist(gistId, description, filename, content) {
    const payload = {};
    if (description !== undefined) payload.description = description;
    if (filename !== undefined && content !== undefined) payload.files = { [filename]: { content } };
    const res = await fetch(`${this.baseUrl}/gists/${gistId}`, { method: 'PATCH', headers: this.getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to update gist');
    return res.json();
  }

  async deleteGistFile(gistId, filename) {
    const payload = { files: { [filename]: null } };
    const res = await fetch(`${this.baseUrl}/gists/${gistId}`, { method: 'PATCH', headers: this.getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to delete file from gist');
    return res.json();
  }

  async deleteGist(gistId) {
    const res = await fetch(`${this.baseUrl}/gists/${gistId}`, { method: 'DELETE', headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to delete gist');
    return true;
  }

  async getRepos(page = 1, perPage = 100) {
    return this._fetchWithCache(`${this.baseUrl}/user/repos?sort=updated&page=${page}&per_page=${perPage}`);
  }

  async createRepo(name, description, isPrivate = false, autoInit = false) {
    const payload = { name, description, private: isPrivate, auto_init: autoInit };
    const res = await fetch(`${this.baseUrl}/user/repos`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to create repository');
    return res.json();
  }

  async deleteRepo(owner, repo) {
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, { method: 'DELETE', headers: this.getHeaders() });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) throw new Error('Forbidden. Missing "delete_repo" token scope.');
      throw new Error('Failed to delete repository');
    }
    return true;
  }

  async getBranches(owner, repo) {
    return this._fetchWithCache(`${this.baseUrl}/repos/${owner}/${repo}/branches?per_page=100`);
  }

  async getRepoContents(owner, repo, path = '', branch = '') {
    const refParam = branch ? `&ref=${branch}` : '';
    return this._fetchWithCache(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}?${refParam}`);
  }

  async getTree(owner, repo, branch) {
    return this._fetchWithCache(`${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  }

  async downloadBlob(owner, repo, sha, isBinary = false) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/blobs/${sha}`;
    const cacheKey = `blob_${sha}`;

    let data = await CacheDB.get(cacheKey);

    if (!data) {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
      if (!res.ok) throw new Error(`Failed to download file with SHA: ${sha}`);
      
      data = await res.arrayBuffer();
      await CacheDB.set(cacheKey, data);
    }

    if (!isBinary) {
      let text = typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
      
      if (text.trim().startsWith('{') && text.includes('"base64"')) {
        try {
          const json = JSON.parse(text);
          if (json.content && json.encoding === 'base64') {
            const binaryStr = atob(json.content.replace(/\n/g, ''));
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            text = new TextDecoder('utf-8').decode(bytes);
          }
        } catch (e) {}
      }
      return text;
    }

    if (isBinary && typeof data === 'string') {
        return new TextEncoder().encode(data).buffer;
    }

    return data;
  }

  async commitMultipleFiles(owner, repo, branch, message, files) {
    const refRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers: this.getHeaders() });
    if (!refRes.ok) throw new Error('Failed to get branch ref');
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    const commitRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers: this.getHeaders() });
    if (!commitRes.ok) throw new Error('Failed to get latest commit');
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    const tree = files.map(f => {
      if (f.deleted) return { path: f.path, mode: '100644', type: 'blob', sha: null };
      return { path: f.path, mode: '100644', type: 'blob', content: f.content };
    });

    const treeRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ base_tree: baseTreeSha, tree })
    });
    if (!treeRes.ok) throw new Error('Failed to create tree');
    const treeDataResponse = await treeRes.json();
    const newTreeSha = treeDataResponse.sha;

    const newCommitRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message, tree: newTreeSha, parents: [latestCommitSha] })
    });
    if (!newCommitRes.ok) throw new Error('Failed to create commit');
    const newCommitData = await newCommitRes.json();
    const newCommitSha = newCommitData.sha;

    const updateRefRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ sha: newCommitSha })
    });
    if (!updateRefRes.ok) throw new Error('Failed to update branch reference');
    return await updateRefRes.json();
  }
}
