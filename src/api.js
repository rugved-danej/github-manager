export class GitHubAPI {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  async getUser() {
    const res = await fetch(`${this.baseUrl}/user`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Invalid token');
    return res.json();
  }

  async getGists(page = 1, perPage = 30) {
    const res = await fetch(`${this.baseUrl}/gists?page=${page}&per_page=${perPage}&t=${Date.now()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch gists');
    return res.json();
  }

  async getGist(gistId) {
    const res = await fetch(`${this.baseUrl}/gists/${gistId}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch gist');
    return res.json();
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
    const res = await fetch(`${this.baseUrl}/user/repos?sort=updated&page=${page}&per_page=${perPage}&t=${Date.now()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch repositories');
    return res.json();
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
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/branches?per_page=100`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch branches');
    return res.json();
  }

  async getRepoContents(owner, repo, path = '', branch = '') {
    const refParam = branch ? `&ref=${branch}` : '';
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}?t=${Date.now()}${refParam}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch contents');
    return res.json();
  }

  async getTree(owner, repo, branch) {
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch repository tree');
    return res.json();
  }

  async downloadBlob(owner, repo, sha, isBinary = false) {
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/blobs/${sha}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });
    if (!res.ok) throw new Error(`Failed to download file with SHA: ${sha}`);
    
    if (isBinary) {
      return res.arrayBuffer();
    } else {
      return res.text();
    }
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
