'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './client';

// ──────────────────────────────────────────────
// Query key helpers
// ──────────────────────────────────────────────

export const queryKeys = {
  user: ['user'] as const,
  authCapabilities: ['authCapabilities'] as const,
  notifications: (unread?: boolean) => ['notifications', { unread }] as const,
  unreadCount: ['notifications', 'unread-count'] as const,

  repoPolicy: ['repoPolicy'] as const,
  exploreRepos: (sort?: string) => ['explore', 'repos', { sort }] as const,
  userRepos: ['user', 'repos'] as const,
  userStarred: ['user', 'starred'] as const,
  userOrgs: ['user', 'orgs'] as const,
  sshKeys: ['user', 'ssh-keys'] as const,
  passkeys: ['user', 'passkeys'] as const,
  repo: (owner: string, repo: string) => ['repo', owner, repo] as const,
  repoStars: (owner: string, repo: string) => ['repo', owner, repo, 'stars'] as const,
  stargazers: (owner: string, repo: string) => ['repo', owner, repo, 'stargazers'] as const,
  repoForks: (owner: string, repo: string) => ['repo', owner, repo, 'forks'] as const,
  branches: (owner: string, repo: string) => ['repo', owner, repo, 'branches'] as const,
  tree: (owner: string, repo: string, ref: string, path?: string) =>
    ['repo', owner, repo, 'tree', ref, path] as const,
  blob: (owner: string, repo: string, ref: string, path: string) =>
    ['repo', owner, repo, 'blob', ref, path] as const,
  commits: (owner: string, repo: string, ref: string) =>
    ['repo', owner, repo, 'commits', ref] as const,
  commit: (owner: string, repo: string, hash: string) =>
    ['repo', owner, repo, 'commit', hash] as const,
  indexStatus: (owner: string, repo: string, ref: string) =>
    ['repo', owner, repo, 'index', ref] as const,
  entities: (owner: string, repo: string, ref: string, path: string) =>
    ['repo', owner, repo, 'entities', ref, path] as const,
  entityLog: (owner: string, repo: string, ref: string, key: string) =>
    ['repo', owner, repo, 'entity-log', ref, key] as const,
  entityBlame: (owner: string, repo: string, ref: string, key: string) =>
    ['repo', owner, repo, 'entity-blame', ref, key] as const,
  entityHistory: (owner: string, repo: string, ref: string) =>
    ['repo', owner, repo, 'entity-history', ref] as const,
  diff: (owner: string, repo: string, base: string, head: string) =>
    ['repo', owner, repo, 'diff', base, head] as const,
  semver: (owner: string, repo: string, base: string, head: string) =>
    ['repo', owner, repo, 'semver', base, head] as const,
  symbols: (owner: string, repo: string, ref: string, q?: string) =>
    ['repo', owner, repo, 'symbols', ref, q] as const,
  references: (owner: string, repo: string, ref: string, name: string) =>
    ['repo', owner, repo, 'references', ref, name] as const,
  callGraph: (owner: string, repo: string, ref: string, symbol: string) =>
    ['repo', owner, repo, 'callgraph', ref, symbol] as const,
  pullRequests: (owner: string, repo: string, state?: string) =>
    ['repo', owner, repo, 'pulls', { state }] as const,
  pullRequest: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'pulls', number] as const,
  prDiff: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'pulls', number, 'diff'] as const,
  mergePreview: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'pulls', number, 'merge-preview'] as const,
  mergeGate: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'pulls', number, 'merge-gate'] as const,
  prComments: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'pulls', number, 'comments'] as const,
  prReviews: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'pulls', number, 'reviews'] as const,
  prChecks: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'pulls', number, 'checks'] as const,
  branchProtection: (owner: string, repo: string, branch: string) =>
    ['repo', owner, repo, 'branch-protection', branch] as const,
  webhooks: (owner: string, repo: string) => ['repo', owner, repo, 'webhooks'] as const,
  webhook: (owner: string, repo: string, id: number) =>
    ['repo', owner, repo, 'webhooks', id] as const,
  webhookDeliveries: (owner: string, repo: string, webhookId: number) =>
    ['repo', owner, repo, 'webhooks', webhookId, 'deliveries'] as const,
  runnerTokens: (owner: string, repo: string) =>
    ['repo', owner, repo, 'runner-tokens'] as const,
  collaborators: (owner: string, repo: string) =>
    ['repo', owner, repo, 'collaborators'] as const,
  org: (org: string) => ['org', org] as const,
  orgMembers: (org: string) => ['org', org, 'members'] as const,
  orgRepos: (org: string) => ['org', org, 'repos'] as const,
  issues: (owner: string, repo: string, state?: string) =>
    ['repo', owner, repo, 'issues', { state }] as const,
  issue: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'issues', number] as const,
  issueComments: (owner: string, repo: string, number: number) =>
    ['repo', owner, repo, 'issues', number, 'comments'] as const,
} as const;

// ──────────────────────────────────────────────
// Auth hooks
// ──────────────────────────────────────────────

export function useAuthCapabilities() {
  return useQuery({
    queryKey: queryKeys.authCapabilities,
    queryFn: api.getAuthCapabilities,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { username: string; email: string }) =>
      api.register(data.username, data.email),
  });
}

export function useRequestMagicLink() {
  return useMutation({
    mutationFn: (email: string) => api.requestMagicLink(email),
  });
}

export function useVerifyMagicLink() {
  return useMutation({
    mutationFn: (token: string) => api.verifyMagicLink(token),
  });
}

export function useBeginSSHLogin() {
  return useMutation({
    mutationFn: (data: { username: string; fingerprint?: string }) =>
      api.beginSSHLogin(data.username, data.fingerprint),
  });
}

export function useFinishSSHLogin() {
  return useMutation({
    mutationFn: (data: { challengeId: string; signature: string; signatureFormat?: string }) =>
      api.finishSSHLogin(data.challengeId, data.signature, data.signatureFormat),
  });
}

export function useBeginWebAuthnRegistration() {
  return useMutation({ mutationFn: api.beginWebAuthnRegistration });
}

export function useFinishWebAuthnRegistration() {
  return useMutation({
    mutationFn: (data: { sessionId: string; credential: unknown }) =>
      api.finishWebAuthnRegistration(data.sessionId, data.credential),
  });
}

export function useBeginWebAuthnLogin() {
  return useMutation({
    mutationFn: (username: string) => api.beginWebAuthnLogin(username),
  });
}

export function useFinishWebAuthnLogin() {
  return useMutation({
    mutationFn: (data: { sessionId: string; credential: unknown }) =>
      api.finishWebAuthnLogin(data.sessionId, data.credential),
  });
}

export function useMintSSHBootstrapToken() {
  return useMutation({
    mutationFn: (ttlSeconds?: number) => api.mintSSHBootstrapToken(ttlSeconds),
  });
}

export function useRefreshToken() {
  return useMutation({ mutationFn: api.refreshToken });
}

export function useCreateInterestSignup() {
  return useMutation({
    mutationFn: (data: { email: string; name?: string; company?: string; message?: string; source?: string }) =>
      api.createInterestSignup(data),
  });
}

// ──────────────────────────────────────────────
// User hooks
// ──────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: api.getUser,
    enabled: !!api.getToken(),
    retry: false,
  });
}

export function useNotifications(unread?: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications(unread),
    queryFn: () => api.listNotifications(unread),
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: api.getUnreadNotificationsCount,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRepoCreationPolicy() {
  return useQuery({
    queryKey: queryKeys.repoPolicy,
    queryFn: api.getRepoCreationPolicy,
  });
}

export function useUserStarredRepos() {
  return useQuery({
    queryKey: queryKeys.userStarred,
    queryFn: api.listUserStarredRepos,
  });
}

// ──────────────────────────────────────────────
// Explore hooks
// ──────────────────────────────────────────────

export function useExploreRepos(sort?: string) {
  return useQuery({
    queryKey: queryKeys.exploreRepos(sort),
    queryFn: () => api.listExploreRepos(sort),
  });
}

// ──────────────────────────────────────────────
// Repository hooks
// ──────────────────────────────────────────────

export function useCreateRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; private?: boolean; init_readme?: boolean }) =>
      api.createRepo(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userRepos });
    },
  });
}

export function useForkRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; name?: string }) =>
      api.forkRepo(data.owner, data.repo, data.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userRepos });
    },
  });
}

export function useRepository(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.repo(owner, repo),
    queryFn: () => api.getRepo(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useUserRepos() {
  return useQuery({
    queryKey: queryKeys.userRepos,
    queryFn: api.listUserRepos,
  });
}

export function useRepoStars(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.repoStars(owner, repo),
    queryFn: () => api.getRepoStars(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useStarRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string }) => api.starRepo(data.owner, data.repo),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.repoStars(vars.owner, vars.repo) });
      qc.invalidateQueries({ queryKey: queryKeys.userStarred });
    },
  });
}

export function useUnstarRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string }) => api.unstarRepo(data.owner, data.repo),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.repoStars(vars.owner, vars.repo) });
      qc.invalidateQueries({ queryKey: queryKeys.userStarred });
    },
  });
}

export function useRepoStargazers(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.stargazers(owner, repo),
    queryFn: () => api.listRepoStargazers(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useRepoForks(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.repoForks(owner, repo),
    queryFn: () => api.listRepoForks(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useDeleteRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string }) => api.deleteRepo(data.owner, data.repo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userRepos });
    },
  });
}

// ──────────────────────────────────────────────
// Runner token hooks
// ──────────────────────────────────────────────

export function useRunnerTokens(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.runnerTokens(owner, repo),
    queryFn: () => api.listRepoRunnerTokens(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useCreateRunnerToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; name: string; expiresInHours?: number }) =>
      api.createRepoRunnerToken(data.owner, data.repo, data.name, data.expiresInHours),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.runnerTokens(vars.owner, vars.repo) });
    },
  });
}

export function useDeleteRunnerToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; id: number }) =>
      api.deleteRepoRunnerToken(data.owner, data.repo, data.id),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.runnerTokens(vars.owner, vars.repo) });
    },
  });
}

// ──────────────────────────────────────────────
// Code browsing hooks
// ──────────────────────────────────────────────

export function useTree(owner: string, repo: string, ref: string, path?: string) {
  return useQuery({
    queryKey: queryKeys.tree(owner, repo, ref, path),
    queryFn: () => api.listTree(owner, repo, ref, path),
    enabled: !!owner && !!repo && !!ref,
  });
}

export function useBranches(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.branches(owner, repo),
    queryFn: () => api.listBranches(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useBlob(owner: string, repo: string, ref: string, path: string) {
  return useQuery({
    queryKey: queryKeys.blob(owner, repo, ref, path),
    queryFn: () => api.getBlob(owner, repo, ref, path),
    enabled: !!owner && !!repo && !!ref && !!path,
  });
}

export function useCommits(owner: string, repo: string, ref: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.commits(owner, repo, ref),
    queryFn: () => api.listCommits(owner, repo, ref, limit),
    enabled: !!owner && !!repo && !!ref,
  });
}

export function useCommit(owner: string, repo: string, hash: string) {
  return useQuery({
    queryKey: queryKeys.commit(owner, repo, hash),
    queryFn: () => api.getCommit(owner, repo, hash),
    enabled: !!owner && !!repo && !!hash,
  });
}

// ──────────────────────────────────────────────
// Code intelligence hooks
// ──────────────────────────────────────────────

export function useRepoIndexStatus(owner: string, repo: string, ref: string) {
  return useQuery({
    queryKey: queryKeys.indexStatus(owner, repo, ref),
    queryFn: () => api.getRepoIndexStatus(owner, repo, ref),
    enabled: !!owner && !!repo && !!ref,
  });
}

export function useEntities(owner: string, repo: string, ref: string, path: string) {
  return useQuery({
    queryKey: queryKeys.entities(owner, repo, ref, path),
    queryFn: () => api.listEntities(owner, repo, ref, path),
    enabled: !!owner && !!repo && !!ref && !!path,
  });
}

export function useEntityLog(
  owner: string,
  repo: string,
  ref: string,
  key: string,
  path?: string,
  limit?: number,
) {
  return useQuery({
    queryKey: queryKeys.entityLog(owner, repo, ref, key),
    queryFn: () => api.getEntityLog(owner, repo, ref, key, path, limit),
    enabled: !!owner && !!repo && !!ref && !!key,
  });
}

export function useEntityBlame(
  owner: string,
  repo: string,
  ref: string,
  key: string,
  path?: string,
  limit?: number,
) {
  return useQuery({
    queryKey: queryKeys.entityBlame(owner, repo, ref, key),
    queryFn: () => api.getEntityBlame(owner, repo, ref, key, path, limit),
    enabled: !!owner && !!repo && !!ref && !!key,
  });
}

export function useEntityHistory(
  owner: string,
  repo: string,
  ref: string,
  opts: { stable_id?: string; name?: string; body_hash?: string; limit?: number },
) {
  return useQuery({
    queryKey: queryKeys.entityHistory(owner, repo, ref),
    queryFn: () => api.getEntityHistory(owner, repo, ref, opts),
    enabled: !!owner && !!repo && !!ref,
  });
}

export function useDiff(owner: string, repo: string, base: string, head: string) {
  return useQuery({
    queryKey: queryKeys.diff(owner, repo, base, head),
    queryFn: () => api.getDiff(owner, repo, base, head),
    enabled: !!owner && !!repo && !!base && !!head,
  });
}

export function useSemver(owner: string, repo: string, base: string, head: string) {
  return useQuery({
    queryKey: queryKeys.semver(owner, repo, base, head),
    queryFn: () => api.getSemver(owner, repo, base, head),
    enabled: !!owner && !!repo && !!base && !!head,
  });
}

export function useSearchSymbols(owner: string, repo: string, ref: string, q?: string) {
  return useQuery({
    queryKey: queryKeys.symbols(owner, repo, ref, q),
    queryFn: () => api.searchSymbols(owner, repo, ref, q),
    enabled: !!owner && !!repo && !!ref,
  });
}

export function useFindReferences(owner: string, repo: string, ref: string, name: string) {
  return useQuery({
    queryKey: queryKeys.references(owner, repo, ref, name),
    queryFn: () => api.findReferences(owner, repo, ref, name),
    enabled: !!owner && !!repo && !!ref && !!name,
  });
}

export function useCallGraph(
  owner: string,
  repo: string,
  ref: string,
  symbol: string,
  depth?: number,
  reverse?: boolean,
) {
  return useQuery({
    queryKey: queryKeys.callGraph(owner, repo, ref, symbol),
    queryFn: () => api.getCallGraph(owner, repo, ref, symbol, depth, reverse),
    enabled: !!owner && !!repo && !!ref && !!symbol,
  });
}

// ──────────────────────────────────────────────
// Pull request hooks
// ──────────────────────────────────────────────

export function usePullRequests(owner: string, repo: string, state?: string) {
  return useQuery({
    queryKey: queryKeys.pullRequests(owner, repo, state),
    queryFn: () => api.listPRs(owner, repo, state),
    enabled: !!owner && !!repo,
  });
}

export function usePullRequest(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.pullRequest(owner, repo, number),
    queryFn: () => api.getPR(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useCreatePR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      owner: string;
      repo: string;
      title: string;
      body?: string;
      source_branch: string;
      target_branch?: string;
    }) =>
      api.createPR(data.owner, data.repo, {
        title: data.title,
        body: data.body,
        source_branch: data.source_branch,
        target_branch: data.target_branch,
      }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.pullRequests(vars.owner, vars.repo) });
    },
  });
}

export function useUpdatePR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; number: number; title?: string; body?: string }) =>
      api.updatePR(data.owner, data.repo, data.number, { title: data.title, body: data.body }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.pullRequest(vars.owner, vars.repo, vars.number) });
    },
  });
}

export function usePRDiff(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.prDiff(owner, repo, number),
    queryFn: () => api.getPRDiff(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useMergePreview(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.mergePreview(owner, repo, number),
    queryFn: () => api.getMergePreview(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useMergeGate(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.mergeGate(owner, repo, number),
    queryFn: () => api.getMergeGate(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useMergePR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; number: number }) =>
      api.mergePR(data.owner, data.repo, data.number),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.pullRequest(vars.owner, vars.repo, vars.number) });
      qc.invalidateQueries({ queryKey: queryKeys.pullRequests(vars.owner, vars.repo) });
    },
  });
}

export function usePRComments(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.prComments(owner, repo, number),
    queryFn: () => api.listPRComments(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useCreatePRComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      owner: string;
      repo: string;
      number: number;
      body: string;
      file_path?: string;
      entity_key?: string;
      entity_stable_id?: string;
      line_number?: number;
      commit_hash?: string;
    }) =>
      api.createPRComment(data.owner, data.repo, data.number, {
        body: data.body,
        file_path: data.file_path,
        entity_key: data.entity_key,
        entity_stable_id: data.entity_stable_id,
        line_number: data.line_number,
        commit_hash: data.commit_hash,
      }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.prComments(vars.owner, vars.repo, vars.number) });
    },
  });
}

export function useDeletePRComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; number: number; commentId: number }) =>
      api.deletePRComment(data.owner, data.repo, data.number, data.commentId),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.prComments(vars.owner, vars.repo, vars.number) });
    },
  });
}

export function usePRReviews(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.prReviews(owner, repo, number),
    queryFn: () => api.listPRReviews(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useCreatePRReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      owner: string;
      repo: string;
      number: number;
      state: string;
      body?: string;
      commit_hash?: string;
    }) =>
      api.createPRReview(data.owner, data.repo, data.number, {
        state: data.state,
        body: data.body,
        commit_hash: data.commit_hash,
      }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.prReviews(vars.owner, vars.repo, vars.number) });
      qc.invalidateQueries({ queryKey: queryKeys.mergeGate(vars.owner, vars.repo, vars.number) });
    },
  });
}

export function usePRChecks(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.prChecks(owner, repo, number),
    queryFn: () => api.listPRChecks(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useUpsertPRCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      owner: string;
      repo: string;
      number: number;
      name: string;
      status?: string;
      conclusion?: string;
      details_url?: string;
      external_id?: string;
      head_commit?: string;
    }) =>
      api.upsertPRCheck(data.owner, data.repo, data.number, {
        name: data.name,
        status: data.status,
        conclusion: data.conclusion,
        details_url: data.details_url,
        external_id: data.external_id,
        head_commit: data.head_commit,
      }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.prChecks(vars.owner, vars.repo, vars.number) });
    },
  });
}

// ──────────────────────────────────────────────
// Branch protection hooks
// ──────────────────────────────────────────────

export function useBranchProtection(owner: string, repo: string, branch: string) {
  return useQuery({
    queryKey: queryKeys.branchProtection(owner, repo, branch),
    queryFn: () => api.getBranchProtection(owner, repo, branch),
    enabled: !!owner && !!repo && !!branch,
    retry: false,
  });
}

export function useSetBranchProtection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; branch: string; rule: Parameters<typeof api.setBranchProtection>[3] }) =>
      api.setBranchProtection(data.owner, data.repo, data.branch, data.rule),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.branchProtection(vars.owner, vars.repo, vars.branch) });
    },
  });
}

export function useDeleteBranchProtection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; branch: string }) =>
      api.deleteBranchProtection(data.owner, data.repo, data.branch),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.branchProtection(vars.owner, vars.repo, vars.branch) });
    },
  });
}

// ──────────────────────────────────────────────
// Webhook hooks
// ──────────────────────────────────────────────

export function useWebhooks(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.webhooks(owner, repo),
    queryFn: () => api.listWebhooks(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useWebhook(owner: string, repo: string, id: number) {
  return useQuery({
    queryKey: queryKeys.webhook(owner, repo, id),
    queryFn: () => api.getWebhook(owner, repo, id),
    enabled: !!owner && !!repo && id > 0,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      owner: string;
      repo: string;
      url: string;
      secret?: string;
      events?: string[];
      active?: boolean;
    }) =>
      api.createWebhook(data.owner, data.repo, {
        url: data.url,
        secret: data.secret,
        events: data.events,
        active: data.active,
      }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.webhooks(vars.owner, vars.repo) });
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; id: number }) =>
      api.deleteWebhook(data.owner, data.repo, data.id),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.webhooks(vars.owner, vars.repo) });
    },
  });
}

export function useWebhookDeliveries(owner: string, repo: string, webhookId: number) {
  return useQuery({
    queryKey: queryKeys.webhookDeliveries(owner, repo, webhookId),
    queryFn: () => api.listWebhookDeliveries(owner, repo, webhookId),
    enabled: !!owner && !!repo && webhookId > 0,
  });
}

export function usePingWebhook() {
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; webhookId: number }) =>
      api.pingWebhook(data.owner, data.repo, data.webhookId),
  });
}

export function useRedeliverWebhookDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; webhookId: number; deliveryId: number }) =>
      api.redeliverWebhookDelivery(data.owner, data.repo, data.webhookId, data.deliveryId),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.webhookDeliveries(vars.owner, vars.repo, vars.webhookId),
      });
    },
  });
}

// ──────────────────────────────────────────────
// SSH key & passkey hooks
// ──────────────────────────────────────────────

export function useSSHKeys() {
  return useQuery({
    queryKey: queryKeys.sshKeys,
    queryFn: api.listSSHKeys,
  });
}

export function useCreateSSHKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; publicKey: string }) =>
      api.createSSHKey(data.name, data.publicKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sshKeys });
    },
  });
}

export function useDeleteSSHKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteSSHKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sshKeys });
    },
  });
}

export function usePasskeys() {
  return useQuery({
    queryKey: queryKeys.passkeys,
    queryFn: api.listPasskeys,
  });
}

// ──────────────────────────────────────────────
// Collaborator hooks
// ──────────────────────────────────────────────

export function useCollaborators(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.collaborators(owner, repo),
    queryFn: () => api.listCollaborators(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useAddCollaborator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; username: string; role?: string }) =>
      api.addCollaborator(data.owner, data.repo, data.username, data.role),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.collaborators(vars.owner, vars.repo) });
    },
  });
}

export function useRemoveCollaborator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; username: string }) =>
      api.removeCollaborator(data.owner, data.repo, data.username),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.collaborators(vars.owner, vars.repo) });
    },
  });
}

// ──────────────────────────────────────────────
// Organization hooks
// ──────────────────────────────────────────────

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; displayName?: string }) =>
      api.createOrg(data.name, data.displayName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
    },
  });
}

export function useOrg(org: string) {
  return useQuery({
    queryKey: queryKeys.org(org),
    queryFn: () => api.getOrg(org),
    enabled: !!org,
  });
}

export function useDeleteOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (org: string) => api.deleteOrg(org),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
    },
  });
}

export function useOrgMembers(org: string) {
  return useQuery({
    queryKey: queryKeys.orgMembers(org),
    queryFn: () => api.listOrgMembers(org),
    enabled: !!org,
  });
}

export function useAddOrgMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { org: string; username: string; role?: string }) =>
      api.addOrgMember(data.org, data.username, data.role),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.orgMembers(vars.org) });
    },
  });
}

export function useRemoveOrgMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { org: string; username: string }) =>
      api.removeOrgMember(data.org, data.username),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.orgMembers(vars.org) });
    },
  });
}

export function useOrgRepos(org: string) {
  return useQuery({
    queryKey: queryKeys.orgRepos(org),
    queryFn: () => api.listOrgRepos(org),
    enabled: !!org,
  });
}

export function useUserOrgs() {
  return useQuery({
    queryKey: queryKeys.userOrgs,
    queryFn: api.listUserOrgs,
  });
}

// ──────────────────────────────────────────────
// Issue hooks
// ──────────────────────────────────────────────

export function useIssues(owner: string, repo: string, state?: string) {
  return useQuery({
    queryKey: queryKeys.issues(owner, repo, state),
    queryFn: () => api.listIssues(owner, repo, state),
    enabled: !!owner && !!repo,
  });
}

export function useIssue(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.issue(owner, repo, number),
    queryFn: () => api.getIssue(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; title: string; body?: string }) =>
      api.createIssue(data.owner, data.repo, { title: data.title, body: data.body }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.issues(vars.owner, vars.repo) });
    },
  });
}

export function useUpdateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      owner: string;
      repo: string;
      number: number;
      title?: string;
      body?: string;
      state?: string;
    }) =>
      api.updateIssue(data.owner, data.repo, data.number, {
        title: data.title,
        body: data.body,
        state: data.state,
      }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.issue(vars.owner, vars.repo, vars.number) });
      qc.invalidateQueries({ queryKey: queryKeys.issues(vars.owner, vars.repo) });
    },
  });
}

export function useIssueComments(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.issueComments(owner, repo, number),
    queryFn: () => api.listIssueComments(owner, repo, number),
    enabled: !!owner && !!repo && number > 0,
  });
}

export function useCreateIssueComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; number: number; body: string }) =>
      api.createIssueComment(data.owner, data.repo, data.number, data.body),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.issueComments(vars.owner, vars.repo, vars.number) });
    },
  });
}

export function useDeleteIssueComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { owner: string; repo: string; number: number; commentId: number }) =>
      api.deleteIssueComment(data.owner, data.repo, data.number, data.commentId),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.issueComments(vars.owner, vars.repo, vars.number) });
    },
  });
}
