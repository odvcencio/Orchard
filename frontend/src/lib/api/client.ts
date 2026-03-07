'use client';

import type {
  APIUser,
  AuthCapabilities,
  AuthResponse,
  BlobResponse,
  BranchProtectionRule,
  CallGraphResponse,
  CheckRun,
  Collaborator,
  CommitSummary,
  DiffFile,
  EntityBlameInfo,
  EntityHistoryHit,
  HighlightPreviewResponse,
  EntityListResponse,
  EntityLogHit,
  Issue,
  IssueComment,
  MergeGate,
  MergePreviewResponse,
  Notification,
  Organization,
  OrgMember,
  PRComment,
  PRReview,
  PullRequest,
  ReferenceResult,
  RepoCreationPolicy,
  RepoIndexStatus,
  RepoStars,
  RepoStreamEvent,
  Repository,
  RunnerToken,
  RunnerTokenCreateResponse,
  SSHBootstrapToken,
  SSHKey,
  SemverRecommendation,

  SymbolResult,
  TreeEntry,
  PasskeyCredential,
  Webhook,
  WebhookDelivery,
} from './types';

// ──────────────────────────────────────────────
// Base URL & token management
// ──────────────────────────────────────────────

const BASE = '/api/v1';
const AUTH_TOKEN_EVENT = 'orchard:auth-token-change';

let token: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('orchard_token') : null;
let redirectingToLogin = false;

export function setToken(t: string | null) {
  token = t;
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem('orchard_token', t);
  else localStorage.removeItem('orchard_token');
  window.dispatchEvent(new Event(AUTH_TOKEN_EVENT));
}

export function getToken(): string | null {
  return token;
}

export function subscribeAuthTokenChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener();
  window.addEventListener(AUTH_TOKEN_EVENT, handler);
  return () => window.removeEventListener(AUTH_TOKEN_EVENT, handler);
}

// ──────────────────────────────────────────────
// Low-level fetch wrapper
// ──────────────────────────────────────────────

function isAuthRequest(path: string): boolean {
  return path.startsWith('/auth/');
}

function buildLoginRedirectPath(): string {
  if (typeof window === 'undefined') return '/login';
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const returnTo = window.location.pathname.startsWith('/login') ? '/' : current || '/';
  const params = new URLSearchParams({ session: 'expired' });
  if (returnTo && returnTo !== '/login') {
    params.set('returnTo', returnTo);
  }
  return `/login?${params.toString()}`;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authToken = token;
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (resp.status === 401 && !isAuthRequest(path)) {
    setToken(null);
    if (
      authToken &&
      typeof window !== 'undefined' &&
      !redirectingToLogin &&
      !window.location.pathname.startsWith('/login')
    ) {
      redirectingToLogin = true;
      window.location.assign(buildLoginRedirectPath());
    }
    throw new Error('authentication required');
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || resp.statusText);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json();
}

/** GET request */
export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

/** POST request */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

/** PUT request */
export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

/** PATCH request */
export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}

/** DELETE request */
export function del<T = void>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

// ──────────────────────────────────────────────
// Auth endpoints
// ──────────────────────────────────────────────

export function register(username: string, email: string) {
  return post<AuthResponse>('/auth/register', { username, email });
}

export function requestMagicLink(email: string) {
  return post<{ sent: boolean; token?: string; expires_at?: string }>('/auth/magic/request', { email });
}

export function verifyMagicLink(magicToken: string) {
  return post<AuthResponse>('/auth/magic/verify', { token: magicToken });
}

export function beginSSHLogin(username: string, fingerprint?: string) {
  return post<{ challenge_id: string; challenge: string; fingerprint: string; expires_at: string }>(
    '/auth/ssh/challenge',
    { username, fingerprint },
  );
}

export function finishSSHLogin(challengeId: string, signature: string, signatureFormat?: string) {
  return post<AuthResponse>('/auth/ssh/verify', {
    challenge_id: challengeId,
    signature,
    signature_format: signatureFormat,
  });
}

export function beginWebAuthnRegistration() {
  return post<{ session_id: string; options: unknown }>('/auth/webauthn/register/begin');
}

export function finishWebAuthnRegistration(sessionId: string, credential: unknown) {
  return post<{ credential_id: string }>('/auth/webauthn/register/finish', {
    session_id: sessionId,
    credential,
  });
}

export function beginWebAuthnLogin(username: string) {
  return post<{ session_id: string; options: unknown }>('/auth/webauthn/login/begin', { username });
}

export function finishWebAuthnLogin(sessionId: string, credential: unknown) {
  return post<AuthResponse>('/auth/webauthn/login/finish', {
    session_id: sessionId,
    credential,
  });
}

export function getAuthCapabilities() {
  return get<AuthCapabilities>('/auth/capabilities');
}

export function mintSSHBootstrapToken(ttlSeconds?: number) {
  return post<SSHBootstrapToken>('/auth/ssh/bootstrap/token', ttlSeconds ? { ttl_seconds: ttlSeconds } : {});
}

export function createInterestSignup(data: {
  email: string;
  name?: string;
  company?: string;
  message?: string;
  source?: string;
}) {
  return post<unknown>('/interest-signups', data);
}

export function refreshToken() {
  return post<AuthResponse>('/auth/refresh');
}

// ──────────────────────────────────────────────
// User endpoints
// ──────────────────────────────────────────────

export function getUser() {
  return get<APIUser>('/user');
}

export function listNotifications(unread?: boolean) {
  const params = unread ? '?unread=true' : '';
  return get<Notification[]>(`/notifications${params}`);
}

export function getUnreadNotificationsCount() {
  return get<{ count: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: number) {
  return post<void>(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return post<void>('/notifications/read-all');
}

// ──────────────────────────────────────────────
// Explore
// ──────────────────────────────────────────────

export function listExploreRepos(sort?: string, page?: number, perPage?: number) {
  const params = new URLSearchParams();
  if (sort) params.set('sort', sort);
  if (page) params.set('page', String(page));
  if (perPage) params.set('per_page', String(perPage));
  const qs = params.toString();
  return get<Repository[]>(`/explore/repos${qs ? `?${qs}` : ''}`);
}

// ──────────────────────────────────────────────
// Repository endpoints
// ──────────────────────────────────────────────

export function createRepo(data: {
  name: string;
  description?: string;
  private?: boolean;
  init_readme?: boolean;
}) {
  return post<Repository>('/repos', data);
}

export function forkRepo(owner: string, repo: string, name?: string) {
  return post<Repository>(`/repos/${owner}/${repo}/forks`, name ? { name } : {});
}

export function listRepoForks(owner: string, repo: string) {
  return get<Repository[]>(`/repos/${owner}/${repo}/forks`);
}

export function listRepoRunnerTokens(owner: string, repo: string) {
  return get<RunnerToken[]>(`/repos/${owner}/${repo}/runners/tokens`);
}

export function createRepoRunnerToken(owner: string, repo: string, name: string, expiresInHours?: number) {
  return post<RunnerTokenCreateResponse>(`/repos/${owner}/${repo}/runners/tokens`, {
    name,
    expires_in_hours: expiresInHours ?? 0,
  });
}

export function deleteRepoRunnerToken(owner: string, repo: string, id: number) {
  return del(`/repos/${owner}/${repo}/runners/tokens/${id}`);
}

export function getRepo(owner: string, repo: string) {
  return get<Repository>(`/repos/${owner}/${repo}`);
}

export function listUserRepos() {
  return get<Repository[]>('/user/repos');
}

export function getRepoCreationPolicy() {
  return get<RepoCreationPolicy>('/user/repo-policy');
}

export function listUserStarredRepos() {
  return get<Repository[]>('/user/starred');
}

export function getRepoStars(owner: string, repo: string) {
  return get<RepoStars>(`/repos/${owner}/${repo}/stars`);
}

export function starRepo(owner: string, repo: string) {
  return put<RepoStars>(`/repos/${owner}/${repo}/star`);
}

export function unstarRepo(owner: string, repo: string) {
  return del<RepoStars>(`/repos/${owner}/${repo}/star`);
}

export function listRepoStargazers(owner: string, repo: string) {
  return get<{ id: number; username: string }[]>(`/repos/${owner}/${repo}/stargazers`);
}

// ──────────────────────────────────────────────
// Code browsing
// ──────────────────────────────────────────────

export function listTree(owner: string, repo: string, ref: string, path?: string) {
  const p = path ? `/${path}` : '';
  return get<TreeEntry[]>(`/repos/${owner}/${repo}/tree/${ref}${p}`);
}

export function listBranches(owner: string, repo: string) {
  return get<string[]>(`/repos/${owner}/${repo}/branches`);
}

export function getBlob(owner: string, repo: string, ref: string, path: string) {
  return get<BlobResponse>(`/repos/${owner}/${repo}/blob/${ref}/${path}`);
}

export function highlightSnippet(filename: string, source: string) {
  return post<HighlightPreviewResponse>('/highlight', { filename, source });
}

export function listCommits(owner: string, repo: string, ref: string, limit?: number) {
  const params = limit ? `?limit=${limit}` : '';
  return get<CommitSummary[]>(`/repos/${owner}/${repo}/commits/${ref}${params}`);
}

export function getCommit(owner: string, repo: string, hash: string) {
  return get<CommitSummary>(`/repos/${owner}/${repo}/commit/${hash}`);
}

// ──────────────────────────────────────────────
// Code intelligence & index
// ──────────────────────────────────────────────

export function getRepoIndexStatus(owner: string, repo: string, ref: string) {
  return get<RepoIndexStatus>(`/repos/${owner}/${repo}/index/status?ref=${encodeURIComponent(ref)}`);
}

export function listEntities(owner: string, repo: string, ref: string, path: string) {
  return get<EntityListResponse>(`/repos/${owner}/${repo}/entities/${ref}/${path}`);
}

export function getEntityLog(
  owner: string,
  repo: string,
  ref: string,
  key: string,
  path?: string,
  limit?: number,
) {
  const params = new URLSearchParams({ key });
  if (path) params.set('path', path);
  if (limit) params.set('limit', String(limit));
  return get<EntityLogHit[]>(`/repos/${owner}/${repo}/entity-log/${ref}?${params.toString()}`);
}

export function getEntityBlame(
  owner: string,
  repo: string,
  ref: string,
  key: string,
  path?: string,
  limit?: number,
) {
  const params = new URLSearchParams({ key });
  if (path) params.set('path', path);
  if (limit) params.set('limit', String(limit));
  return get<EntityBlameInfo>(`/repos/${owner}/${repo}/entity-blame/${ref}?${params.toString()}`);
}

export function getDiff(owner: string, repo: string, base: string, head: string) {
  return get<{
    base: string;
    head: string;
    summary: {
      total_changes: number;
      additions: number;
      removals: number;
      signature_changes: number;
      body_only_changes: number;
      other_changes: number;
    };
    files: { path: string; changes: unknown[] }[];
    semver?: SemverRecommendation;
  }>(`/repos/${owner}/${repo}/diff/${base}...${head}`);
}

// ──────────────────────────────────────────────
// Pull requests
// ──────────────────────────────────────────────

export function createPR(
  owner: string,
  repo: string,
  data: { title: string; body?: string; source_branch: string; target_branch?: string },
) {
  return post<PullRequest>(`/repos/${owner}/${repo}/pulls`, data);
}

export function listPRs(owner: string, repo: string, state?: string) {
  const params = state ? `?state=${state}` : '';
  return get<PullRequest[]>(`/repos/${owner}/${repo}/pulls${params}`);
}

export function getPR(owner: string, repo: string, number: number) {
  return get<PullRequest>(`/repos/${owner}/${repo}/pulls/${number}`);
}

export function updatePR(
  owner: string,
  repo: string,
  number: number,
  data: { title?: string; body?: string },
) {
  return patch<PullRequest>(`/repos/${owner}/${repo}/pulls/${number}`, data);
}

export function getPRDiff(owner: string, repo: string, number: number) {
  return get<{
    base: string;
    head: string;
    summary: unknown;
    files: DiffFile[];
  }>(`/repos/${owner}/${repo}/pulls/${number}/diff`);
}

export function getMergePreview(owner: string, repo: string, number: number) {
  return get<MergePreviewResponse>(`/repos/${owner}/${repo}/pulls/${number}/merge-preview`);
}

export function getMergeGate(owner: string, repo: string, number: number) {
  return get<MergeGate>(`/repos/${owner}/${repo}/pulls/${number}/merge-gate`);
}

export function mergePR(owner: string, repo: string, number: number) {
  return post<{ merge_commit: string; status: string }>(
    `/repos/${owner}/${repo}/pulls/${number}/merge`,
  );
}

export function listPRComments(owner: string, repo: string, number: number) {
  return get<PRComment[]>(`/repos/${owner}/${repo}/pulls/${number}/comments`);
}

export function createPRComment(
  owner: string,
  repo: string,
  number: number,
  data: {
    body: string;
    file_path?: string;
    entity_key?: string;
    entity_stable_id?: string;
    line_number?: number;
    commit_hash?: string;
  },
) {
  return post<PRComment>(`/repos/${owner}/${repo}/pulls/${number}/comments`, data);
}

export function deletePRComment(owner: string, repo: string, number: number, commentId: number) {
  return del(`/repos/${owner}/${repo}/pulls/${number}/comments/${commentId}`);
}

export function listPRReviews(owner: string, repo: string, number: number) {
  return get<PRReview[]>(`/repos/${owner}/${repo}/pulls/${number}/reviews`);
}

export function createPRReview(
  owner: string,
  repo: string,
  number: number,
  data: { state: string; body?: string; commit_hash?: string },
) {
  return post<PRReview>(`/repos/${owner}/${repo}/pulls/${number}/reviews`, data);
}

export function listPRChecks(owner: string, repo: string, number: number) {
  return get<CheckRun[]>(`/repos/${owner}/${repo}/pulls/${number}/checks`);
}

export function upsertPRCheck(
  owner: string,
  repo: string,
  number: number,
  data: {
    name: string;
    status?: string;
    conclusion?: string;
    details_url?: string;
    external_id?: string;
    head_commit?: string;
  },
) {
  return post<CheckRun>(`/repos/${owner}/${repo}/pulls/${number}/checks`, data);
}

// ──────────────────────────────────────────────
// Branch protection
// ──────────────────────────────────────────────

export function getBranchProtection(owner: string, repo: string, branch: string) {
  return get<BranchProtectionRule>(`/repos/${owner}/${repo}/branch-protection/${branch}`);
}

export function setBranchProtection(
  owner: string,
  repo: string,
  branch: string,
  data: Partial<Omit<BranchProtectionRule, 'id' | 'repo_id' | 'branch' | 'created_at' | 'updated_at'>>,
) {
  return put<BranchProtectionRule>(`/repos/${owner}/${repo}/branch-protection/${branch}`, data);
}

export function deleteBranchProtection(owner: string, repo: string, branch: string) {
  return del(`/repos/${owner}/${repo}/branch-protection/${branch}`);
}

// ──────────────────────────────────────────────
// Webhooks
// ──────────────────────────────────────────────

export function createWebhook(
  owner: string,
  repo: string,
  data: { url: string; secret?: string; events?: string[]; active?: boolean },
) {
  return post<Webhook>(`/repos/${owner}/${repo}/webhooks`, data);
}

export function listWebhooks(owner: string, repo: string) {
  return get<Webhook[]>(`/repos/${owner}/${repo}/webhooks`);
}

export function getWebhook(owner: string, repo: string, id: number) {
  return get<Webhook>(`/repos/${owner}/${repo}/webhooks/${id}`);
}

export function deleteWebhook(owner: string, repo: string, id: number) {
  return del(`/repos/${owner}/${repo}/webhooks/${id}`);
}

export function listWebhookDeliveries(owner: string, repo: string, webhookId: number) {
  return get<WebhookDelivery[]>(`/repos/${owner}/${repo}/webhooks/${webhookId}/deliveries`);
}

export function pingWebhook(owner: string, repo: string, webhookId: number) {
  return post<WebhookDelivery>(`/repos/${owner}/${repo}/webhooks/${webhookId}/ping`);
}

export function redeliverWebhookDelivery(
  owner: string,
  repo: string,
  webhookId: number,
  deliveryId: number,
) {
  return post<WebhookDelivery>(
    `/repos/${owner}/${repo}/webhooks/${webhookId}/deliveries/${deliveryId}/redeliver`,
  );
}

// ──────────────────────────────────────────────
// SSH keys & passkeys
// ──────────────────────────────────────────────

export function listSSHKeys() {
  return get<SSHKey[]>('/user/ssh-keys');
}

export function createSSHKey(name: string, publicKey: string) {
  return post<SSHKey>('/user/ssh-keys', { name, public_key: publicKey });
}

export function deleteSSHKey(id: number) {
  return del(`/user/ssh-keys/${id}`);
}

export function listPasskeys() {
  return get<PasskeyCredential[]>('/user/passkeys');
}

// ──────────────────────────────────────────────
// Collaborators
// ──────────────────────────────────────────────

export function listCollaborators(owner: string, repo: string) {
  return get<Collaborator[]>(`/repos/${owner}/${repo}/collaborators`);
}

export function addCollaborator(owner: string, repo: string, username: string, role?: string) {
  return post<Collaborator>(`/repos/${owner}/${repo}/collaborators`, { username, role: role ?? 'read' });
}

export function removeCollaborator(owner: string, repo: string, username: string) {
  return del(`/repos/${owner}/${repo}/collaborators/${username}`);
}

export function deleteRepo(owner: string, repo: string) {
  return del(`/repos/${owner}/${repo}`);
}

// ──────────────────────────────────────────────
// Organizations
// ──────────────────────────────────────────────

export function createOrg(name: string, displayName?: string) {
  return post<Organization>('/orgs', { name, display_name: displayName });
}

export function getOrg(org: string) {
  return get<Organization>(`/orgs/${org}`);
}

export function deleteOrg(org: string) {
  return del(`/orgs/${org}`);
}

export function listOrgMembers(org: string) {
  return get<OrgMember[]>(`/orgs/${org}/members`);
}

export function addOrgMember(org: string, username: string, role?: string) {
  return post<void>(`/orgs/${org}/members`, { username, role: role ?? 'member' });
}

export function removeOrgMember(org: string, username: string) {
  return del(`/orgs/${org}/members/${username}`);
}

export function listOrgRepos(org: string) {
  return get<Repository[]>(`/orgs/${org}/repos`);
}

export function listUserOrgs() {
  return get<Organization[]>('/user/orgs');
}

// ──────────────────────────────────────────────
// Code intelligence (search, references, graph)
// ──────────────────────────────────────────────

export function searchSymbols(owner: string, repo: string, ref: string, q?: string) {
  const params = q ? `?q=${encodeURIComponent(q)}` : '';
  return get<SymbolResult[]>(`/repos/${owner}/${repo}/symbols/${ref}${params}`);
}

export function findReferences(owner: string, repo: string, ref: string, name: string) {
  return get<ReferenceResult[]>(
    `/repos/${owner}/${repo}/references/${ref}?name=${encodeURIComponent(name)}`,
  );
}

export function getCallGraph(
  owner: string,
  repo: string,
  ref: string,
  symbol: string,
  depth?: number,
  reverse?: boolean,
) {
  const params = new URLSearchParams({ symbol });
  if (depth !== undefined) params.set('depth', String(depth));
  if (reverse) params.set('reverse', 'true');
  return get<CallGraphResponse>(`/repos/${owner}/${repo}/callgraph/${ref}?${params.toString()}`);
}

export function getEntityHistory(
  owner: string,
  repo: string,
  ref: string,
  opts: { stable_id?: string; name?: string; body_hash?: string; limit?: number },
) {
  const params = new URLSearchParams();
  if (opts.stable_id) params.set('stable_id', opts.stable_id);
  if (opts.name) params.set('name', opts.name);
  if (opts.body_hash) params.set('body_hash', opts.body_hash);
  if (opts.limit) params.set('limit', String(opts.limit));
  return get<EntityHistoryHit[]>(
    `/repos/${owner}/${repo}/entity-history/${ref}?${params.toString()}`,
  );
}

export function getSemver(owner: string, repo: string, base: string, head: string) {
  return get<SemverRecommendation>(`/repos/${owner}/${repo}/semver/${base}...${head}`);
}

// ──────────────────────────────────────────────
// Issues
// ──────────────────────────────────────────────

export function createIssue(owner: string, repo: string, data: { title: string; body?: string }) {
  return post<Issue>(`/repos/${owner}/${repo}/issues`, data);
}

export function listIssues(owner: string, repo: string, state?: string) {
  const params = state ? `?state=${state}` : '';
  return get<Issue[]>(`/repos/${owner}/${repo}/issues${params}`);
}

export function getIssue(owner: string, repo: string, number: number) {
  return get<Issue>(`/repos/${owner}/${repo}/issues/${number}`);
}

export function updateIssue(
  owner: string,
  repo: string,
  number: number,
  data: { title?: string; body?: string; state?: string },
) {
  return patch<Issue>(`/repos/${owner}/${repo}/issues/${number}`, data);
}

export function createIssueComment(owner: string, repo: string, number: number, body: string) {
  return post<IssueComment>(`/repos/${owner}/${repo}/issues/${number}/comments`, { body });
}

export function listIssueComments(owner: string, repo: string, number: number) {
  return get<IssueComment[]>(`/repos/${owner}/${repo}/issues/${number}/comments`);
}

export function deleteIssueComment(
  owner: string,
  repo: string,
  number: number,
  commentId: number,
) {
  return del(`/repos/${owner}/${repo}/issues/${number}/comments/${commentId}`);
}

// ──────────────────────────────────────────────
// Realtime SSE
// ──────────────────────────────────────────────

export function streamRepoEvents(
  owner: string,
  repo: string,
  onEvent: (event: RepoStreamEvent) => void,
  onError?: (err: Event) => void,
): () => void {
  const url = `${BASE}/repos/${owner}/${repo}/events`;
  const source = new EventSource(url);

  const handleMessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as RepoStreamEvent;
      onEvent(data);
    } catch {
      // ignore malformed events
    }
  };

  // SSE custom event types — listen generically via onmessage
  source.onmessage = handleMessage;

  // Also listen to named event types the server sends
  const eventTypes = [
    'pull_request.opened',
    'pull_request.merged',
    'issue.opened',
    'issue.edited',
    'issue.closed',
    'issue.reopened',
  ];
  for (const type of eventTypes) {
    source.addEventListener(type, handleMessage as EventListener);
  }

  source.onerror = (e) => {
    onError?.(e);
  };

  return () => source.close();
}
