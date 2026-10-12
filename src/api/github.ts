import type {
  GitHubUser,
  GitHubOrg,
  GitHubRepo,
  GitHubGist,
  GitHubBranch,
  GitHubContentItem,
  GitHubTreeResponse,
  GitHubRateLimit,
  DeviceCodeResponse,
  TokenPollResponse,
  CommitFileInput
} from '../types/github';

export class GitHubAPI {
  static readonly CLIENT_ID = 'Ov23liHi0m8xDFMtJY1J';
  static readonly PROXY_URL = 'https://githubmanager.rugveddanej007.workers.dev';

  token: string;
  baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  static formatNetworkError(err: any): Error {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return new Error('You are currently offline. Please check your internet connection.');
    }
    const msg = String(err?.message || err);
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('network error') ||
      msg.includes('Load failed')
    ) {
      return new Error('Network request failed. Unable to reach GitHub. Please check your internet connection or proxy.');
    }
    if (msg.includes('timeout') || err?.name === 'AbortError') {
      return new Error('Request timed out. GitHub took too long to respond.');
    }
    return err instanceof Error ? err : new Error(msg);
  }

  static async requestDeviceCode(): Promise<DeviceCodeResponse> {
    try {
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
      if (!res.ok) {
        throw new Error(`Device code request failed (HTTP ${res.status})`);
      }
      return await res.json();
    } catch (err: any) {
      throw this.formatNetworkError(err);
    }
  }

  static async pollForToken(deviceCode: string): Promise<TokenPollResponse> {
    try {
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
      return await res.json();
    } catch (err: any) {
      throw this.formatNetworkError(err);
    }
  }

  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json'
    };
  }

  async request<T>(
    url: string,
    options: RequestInit = {},
    responseType: 'json' | 'text' | 'arrayBuffer' = 'json',
    timeoutMs = 30000
  ): Promise<T> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You are currently offline. Please check your internet connection.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const mergedHeaders: Record<string, string> = {
      ...this.getHeaders(),
      ...((options.headers as Record<string, string>) || {})
    };

    if (options.body && !mergedHeaders['Content-Type']) {
      mergedHeaders['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers: mergedHeaders,
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        let errMessage = '';
        try {
          const errData = await res.json();
          errMessage = errData.message || (errData.errors && errData.errors[0]?.message);
        } catch {
          try {
            errMessage = await res.text();
          } catch {}
        }

        if (res.status === 401) {
          throw new Error('Authentication failed (401). Your GitHub token may have expired or is invalid. Please log in again.');
        }
        if (res.status === 403) {
          const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
          if (rateLimitRemaining === '0') {
            throw new Error('GitHub API rate limit exceeded (403). Please wait or switch to another GitHub account.');
          }
          if (errMessage) throw new Error(`Access forbidden (403): ${errMessage}`);
          throw new Error('Access forbidden (403). Your token may not have permission for this repository/organization.');
        }
        if (res.status === 404) {
          throw new Error(errMessage || 'Resource not found on GitHub (404). Check repo name or permissions.');
        }
        if (res.status === 422) {
          throw new Error(errMessage ? `Validation error (422): ${errMessage}` : 'Validation error (422). Invalid repository or parameters.');
        }
        if (res.status >= 500) {
          throw new Error(`GitHub server error (${res.status}). GitHub servers may be experiencing issues.`);
        }

        throw new Error(errMessage || `GitHub API error: HTTP ${res.status}`);
      }

      if (responseType === 'arrayBuffer') {
        return (await res.arrayBuffer()) as unknown as T;
      }
      if (responseType === 'text') {
        return (await res.text()) as unknown as T;
      }
      return (await res.json()) as T;
    } catch (err: any) {
      clearTimeout(timer);
      throw GitHubAPI.formatNetworkError(err);
    }
  }

  async _fetch<T>(url: string, forceText = false): Promise<T> {
    return this.request<T>(url, {}, forceText ? 'text' : 'json');
  }

  async getRateLimit(): Promise<GitHubRateLimit> {
    return this.request<GitHubRateLimit>(`${this.baseUrl}/rate_limit`);
  }

  async getUser(): Promise<GitHubUser> {
    return this.request<GitHubUser>(`${this.baseUrl}/user`);
  }

  async getUserOrgs(): Promise<GitHubOrg[]> {
    return this.request<GitHubOrg[]>(`${this.baseUrl}/user/orgs`);
  }

  async getGists(page = 1, perPage = 30): Promise<GitHubGist[]> {
    return this.request<GitHubGist[]>(
      `${this.baseUrl}/gists?page=${page}&per_page=${perPage}&t=${Date.now()}`
    );
  }

  async getGist(gistId: string): Promise<GitHubGist> {
    return this.request<GitHubGist>(`${this.baseUrl}/gists/${gistId}?t=${Date.now()}`);
  }

  async createGist(description: string, filename: string, content: string, isPublic = false): Promise<GitHubGist> {
    const payload = { description, public: isPublic, files: { [filename]: { content } } };
    return this.request<GitHubGist>(`${this.baseUrl}/gists`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateGist(
    gistId: string,
    description?: string,
    filename?: string,
    content?: string
  ): Promise<GitHubGist> {
    const payload: Record<string, any> = {};
    if (description !== undefined) payload.description = description;
    if (filename !== undefined && content !== undefined) {
      payload.files = { [filename]: { content } };
    }
    return this.request<GitHubGist>(`${this.baseUrl}/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteGistFile(gistId: string, filename: string): Promise<GitHubGist> {
    const payload = { files: { [filename]: null } };
    return this.request<GitHubGist>(`${this.baseUrl}/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteGist(gistId: string): Promise<boolean> {
    await this.request<any>(`${this.baseUrl}/gists/${gistId}`, {
      method: 'DELETE'
    });
    return true;
  }

  async getRepos(page = 1, perPage = 100): Promise<GitHubRepo[]> {
    return this.request<GitHubRepo[]>(
      `${this.baseUrl}/user/repos?sort=updated&page=${page}&per_page=${perPage}&t=${Date.now()}`
    );
  }

  async getOrgRepos(org: string, page = 1, perPage = 100): Promise<GitHubRepo[]> {
    return this.request<GitHubRepo[]>(
      `${this.baseUrl}/orgs/${org}/repos?sort=updated&page=${page}&per_page=${perPage}&t=${Date.now()}`
    );
  }

  async createRepo(
    name: string,
    description: string,
    isPrivate = false,
    autoInit = false,
    org?: string
  ): Promise<GitHubRepo> {
    const payload = { name, description, private: isPrivate, auto_init: autoInit };
    const endpoint = org ? `${this.baseUrl}/orgs/${org}/repos` : `${this.baseUrl}/user/repos`;
    return this.request<GitHubRepo>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deleteRepo(owner: string, repo: string): Promise<boolean> {
    await this.request<any>(`${this.baseUrl}/repos/${owner}/${repo}`, {
      method: 'DELETE'
    });
    return true;
  }

  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    return this.request<GitHubBranch[]>(
      `${this.baseUrl}/repos/${owner}/${repo}/branches?per_page=100&t=${Date.now()}`
    );
  }

  async createBranch(owner: string, repo: string, baseBranch: string, newBranch: string): Promise<any> {
    const refData = await this.request<any>(
      `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${baseBranch}`
    );
    const sha = refData.object.sha;

    return this.request<any>(`${this.baseUrl}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: sha
      })
    });
  }

  async deleteBranch(owner: string, repo: string, branch: string): Promise<boolean> {
    await this.request<any>(`${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'DELETE'
    });
    return true;
  }

  async getRepoContents(owner: string, repo: string, path = '', branch = ''): Promise<GitHubContentItem[]> {
    const refParam = branch ? `&ref=${branch}` : '';
    return this.request<GitHubContentItem[]>(
      `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}?t=${Date.now()}${refParam}`
    );
  }

  async getTree(owner: string, repo: string, branch: string): Promise<GitHubTreeResponse> {
    return this.request<GitHubTreeResponse>(
      `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1&t=${Date.now()}`
    );
  }

  async downloadRawUrl(url: string): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(
      url,
      {
        headers: {
          'Accept': '*/*'
        }
      },
      'arrayBuffer'
    );
  }

  async downloadBlob(
    owner: string,
    repo: string,
    sha: string,
    isBinary = false
  ): Promise<string | ArrayBuffer> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/blobs/${sha}`;

    const data = await this.request<ArrayBuffer>(
      url,
      {
        headers: {
          'Accept': 'application/vnd.github.raw, application/vnd.github.v3.raw, application/json;q=0.9, */*;q=0.8'
        }
      },
      'arrayBuffer'
    );

    if (isBinary) {
      const rawData: unknown = data;
      if (typeof rawData === 'string') {
        const trimmed = rawData.trim();
        if (trimmed.startsWith('{')) {
          try {
            const json = JSON.parse(trimmed);
            if (json.content && json.encoding === 'base64') {
              const binaryStr = atob(json.content.replace(/\n/g, ''));
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              return bytes.buffer;
            }
          } catch {}
        }
        return new TextEncoder().encode(rawData).buffer;
      }

      // Check if ArrayBuffer contains JSON response from GitHub API
      const bytes = new Uint8Array(data);
      if (bytes.length > 0 && bytes[0] === 0x7B) {
        try {
          const text = new TextDecoder('utf-8').decode(bytes);
          const json = JSON.parse(text);
          if (json.content && json.encoding === 'base64') {
            const binaryStr = atob(json.content.replace(/\s+/g, ''));
            const decodedBytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              decodedBytes[i] = binaryStr.charCodeAt(i);
            }
            return decodedBytes.buffer;
          }
        } catch {}
      }

      return data;
    }

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

  async commitMultipleFiles(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: CommitFileInput[]
  ): Promise<any> {
    const refData = await this.request<any>(
      `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`
    );
    const latestCommitSha = refData.object.sha;

    const commitData = await this.request<any>(
      `${this.baseUrl}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`
    );
    const baseTreeSha = commitData.tree.sha;

    const tree = files.map((f) => {
      if (f.deleted) return { path: f.path, mode: '100644', type: 'blob', sha: null };
      return { path: f.path, mode: '100644', type: 'blob', content: f.content };
    });

    const treeDataResponse = await this.request<any>(
      `${this.baseUrl}/repos/${owner}/${repo}/git/trees`,
      {
        method: 'POST',
        body: JSON.stringify({ base_tree: baseTreeSha, tree })
      }
    );
    const newTreeSha = treeDataResponse.sha;

    const newCommitData = await this.request<any>(
      `${this.baseUrl}/repos/${owner}/${repo}/git/commits`,
      {
        method: 'POST',
        body: JSON.stringify({ message, tree: newTreeSha, parents: [latestCommitSha] })
      }
    );
    const newCommitSha = newCommitData.sha;

    return this.request<any>(
      `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ sha: newCommitSha })
      }
    );
  }
}
