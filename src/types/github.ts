export interface GitHubUser {
  login: string;
  id: number;
  avatar_url?: string;
  html_url?: string;
  name?: string;
  email?: string;
}

export interface GitHubOrg {
  login: string;
  id: number;
  url: string;
  avatar_url?: string;
  description?: string | null;
}

export interface GitHubAccount {
  id: string; // username
  login: string;
  name?: string;
  avatar_url?: string;
  token: string;
  addedAt: number;
}

export interface GitHubRepoOwner {
  login: string;
  id?: number;
  avatar_url?: string;
}

export interface GitHubRepoPermissions {
  admin?: boolean;
  push?: boolean;
  pull?: boolean;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubRepoOwner;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  language: string | null;
  permissions?: GitHubRepoPermissions;
}

export interface GitHubGistFile {
  filename: string;
  type: string;
  language?: string | null;
  raw_url: string;
  size: number;
  content?: string;
}

export interface GitHubGist {
  id: string;
  description: string | null;
  public: boolean;
  html_url: string;
  files: Record<string, GitHubGistFile>;
  created_at: string;
  updated_at: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected?: boolean;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'tree' | 'blob' | 'commit';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
}

export interface GitHubRateLimitCore {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface GitHubRateLimit {
  resources: {
    core: GitHubRateLimitCore;
    search?: GitHubRateLimitCore;
    graphql?: GitHubRateLimitCore;
  };
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenPollResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface CommitFileInput {
  path: string;
  content?: string;
  deleted?: boolean;
}

export interface RepoContext {
  owner: string;
  repo: string;
  defaultBranch: string;
}
