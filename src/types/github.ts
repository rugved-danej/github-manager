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
  id: string;
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
  fork?: boolean;
  owner: GitHubRepoOwner;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count?: number;
  language: string | null;
  updated_at?: string;
  created_at?: string;
  pushed_at?: string;
  size?: number;
  open_issues_count?: number;
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
  owner?: GitHubUser | null;
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

export interface GitHubIssueLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: GitHubUser;
  labels: GitHubIssueLabel[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  pull_request?: any;
  html_url: string;
}

export interface GitHubIssueComment {
  id: number;
  user: GitHubUser;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  merged_at?: string | null;
  html_url: string;
  head: {
    ref: string;
    sha: string;
    repo?: GitHubRepo;
  };
  base: {
    ref: string;
    sha: string;
  };
  mergeable?: boolean | null;
  comments?: number;
  commits?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

export interface GitHubPullFile {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at?: string;
  author: GitHubUser;
  assets: GitHubReleaseAsset[];
  tarball_url: string;
  zipball_url: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | null;
  event: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
}

export interface GitHubSSHKey {
  id: number;
  key: string;
  title: string;
  created_at: string;
  verified?: boolean;
}
