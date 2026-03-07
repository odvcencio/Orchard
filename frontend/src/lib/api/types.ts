// ──────────────────────────────────────────────
// Orchard API TypeScript interfaces
// Faithfully ported from Go models + handler response types
// ──────────────────────────────────────────────

// ── Auth & User ──────────────────────────────

export interface APIUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: APIUser;
}

export interface AuthCapabilities {
  magic_link_enabled: boolean;
  ssh_auth_enabled: boolean;
  ssh_bootstrap_enabled: boolean;
  ssh_bootstrap_mint_enabled: boolean;
  passkey_enabled: boolean;
  organizations_enabled: boolean;
  require_verified_email: boolean;
  require_passkey_enrollment: boolean;
}

export interface Notification {
  id: number;
  user_id: number;
  actor_id: number;
  actor_name?: string;
  type: string;
  title: string;
  body: string;
  resource_path?: string;
  repo_id?: number;
  pr_id?: number;
  issue_id?: number;
  read_at?: string;
  created_at: string;
}

// ── Repository ───────────────────────────────

export interface Repository {
  id: number;
  owner_user_id?: number;
  owner_org_id?: number;
  parent_repo_id?: number;
  parent_owner?: string;
  parent_name?: string;
  owner_name: string;
  name: string;
  description: string;
  default_branch: string;
  is_private: boolean;
  created_at: string;
  star_count?: number;
}

export interface RepoStars {
  count: number;
  starred: boolean;
}

export interface RepoCreationPolicy {
  can_create_public: boolean;
  can_create_private: boolean;
  public_repo_count: number;
  private_repo_count: number;
  max_public_repos: number;
  max_private_repos: number;
  restrict_to_public: boolean;
  require_private_plan: boolean;
  private_plan_eligible: boolean;
  public_reason?: string;
  private_reason?: string;
  reasons?: string[];
}

// ── Code Browsing ────────────────────────────

export interface TreeEntry {
  name: string;
  is_dir: boolean;
  blob_hash?: string;
  entity_list_hash?: string;
  subtree_hash?: string;
}

export interface HighlightRange {
  start_byte: number;
  end_byte: number;
  capture: string;
}

export interface EntityInfo {
  kind: string;
  name: string;
  decl_kind: string;
  receiver?: string;
  signature?: string;
  start_line: number;
  end_line: number;
  key: string;
  body_hash?: string;
}

export interface BlobResponse {
  hash: string;
  data: string; // base64-encoded bytes
  size: number;
  language?: string;
  highlights?: HighlightRange[];
  entities?: EntityInfo[];
}

export interface HighlightPreviewResponse {
  language?: string;
  highlights?: HighlightRange[];
}

export interface CommitSummary {
  hash: string;
  tree_hash: string;
  parents: string[];
  author: string;
  timestamp: number;
  message: string;
  signature?: string;
  verified: boolean;
  signer?: string;
}

// ── Code Intelligence ────────────────────────

export interface RepoIndexStatus {
  ref: string;
  commit_hash: string;
  indexed: boolean;
  queue_status: string;
  attempts: number;
  last_error?: string;
  updated_at: string;
}

export interface EntityDescriptor {
  key: string;
  kind: string;
  name: string;
  decl_kind: string;
  receiver?: string;
  signature?: string;
  start_line: number;
  end_line: number;
  body_hash: string;
}

export interface FileEntity {
  language: string;
  path: string;
  entities: EntityDescriptor[];
}

export interface EntityListResponse {
  language: string;
  path: string;
  entities: EntityDescriptor[];
}

export interface EntityLogHit {
  commit_hash: string;
  author: string;
  timestamp: number;
  message: string;
  path?: string;
  key: string;
}

export interface EntityBlameInfo {
  commit_hash: string;
  author: string;
  timestamp: number;
  message: string;
  path?: string;
  key: string;
}

// ── Diff & Semver ────────────────────────────

export interface DiffFileChange {
  type: string; // "added" | "removed" | "modified"
  classification: string;
  key: string;
  before?: EntityDescriptor;
  after?: EntityDescriptor;
}

export interface DiffFile {
  path: string;
  changes: DiffFileChange[];
}

// ── Pull Requests ────────────────────────────

export interface PullRequest {
  id: number;
  repo_id: number;
  number: number;
  title: string;
  body: string;
  state: string; // "open" | "closed" | "merged"
  author_id: number;
  author_name?: string;
  source_branch: string;
  target_branch: string;
  source_commit: string;
  target_commit: string;
  merge_commit?: string;
  merge_method?: string;
  created_at: string;
  merged_at?: string;
}

export interface MergeGate {
  allowed: boolean;
  reasons?: string[];
  entity_owner_approvals?: EntityOwnerApproval[];
}

export interface CheckRun {
  id: number;
  pr_id: number;
  name: string;
  status: string; // "queued" | "in_progress" | "completed"
  conclusion?: string;
  details_url?: string;
  external_id?: string;
  head_commit?: string;
  created_at: string;
  updated_at: string;
}

export interface EntityOwnerApproval {
  path: string;
  entity_key: string;
  required_owners?: string[];
  approved_by?: string[];
  missing_owners?: string[];
  unresolved_teams?: string[];
  satisfied: boolean;
}

export interface PRComment {
  id: number;
  pr_id: number;
  author_id: number;
  author_name?: string;
  body: string;
  file_path?: string;
  entity_key?: string;
  entity_stable_id?: string;
  line_number?: number;
  commit_hash?: string;
  created_at: string;
}

export interface PRReview {
  id: number;
  pr_id: number;
  author_id: number;
  author_name?: string;
  state: string; // "approved" | "changes_requested" | "commented"
  body: string;
  commit_hash: string;
  created_at: string;
}

// ── Merge Preview ────────────────────────────

export interface MergePreviewStats {
  total_entities: number;
  unchanged: number;
  ours_modified: number;
  theirs_modified: number;
  both_modified: number;
  added: number;
  deleted: number;
  conflicts: number;
}

export interface MergePreviewFile {
  path: string;
  status: string; // "clean" | "conflict" | "added" | "deleted"
  conflict_count: number;
}

export interface MergePreviewResponse {
  has_conflicts: boolean;
  conflict_count: number;
  stats: MergePreviewStats;
  files: MergePreviewFile[];
}

// ── Branch Protection ────────────────────────

export interface BranchProtectionRule {
  id: number;
  repo_id: number;
  branch: string;
  enabled: boolean;
  require_approvals: boolean;
  required_approvals: number;
  require_status_checks: boolean;
  require_entity_owner_approval: boolean;
  require_lint_pass: boolean;
  require_no_new_dead_code: boolean;
  require_signed_commits: boolean;
  required_checks?: string[];
  created_at: string;
  updated_at: string;
}

// ── Webhooks ─────────────────────────────────

export interface Webhook {
  id: number;
  repo_id: number;
  url: string;
  events?: string[];
  active: boolean;
  has_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: number;
  repo_id: number;
  webhook_id: number;
  event: string;
  delivery_uid: string;
  attempt: number;
  status_code: number;
  success: boolean;
  error?: string;
  request_body?: string;
  response_body?: string;
  duration_ms: number;
  redelivery_of_id?: number;
  created_at: string;
}

// ── Runners ──────────────────────────────────

export interface RunnerToken {
  id: number;
  repo_id: number;
  name: string;
  token_prefix: string;
  created_by_user_id: number;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  revoked_at?: string;
}

export interface RunnerTokenCreateResponse {
  id: number;
  name: string;
  token: string;
  token_prefix: string;
  expires_at?: string;
  created_at: string;
}

// ── SSH Keys & Passkeys ──────────────────────

export interface SSHKey {
  id: number;
  user_id: number;
  name: string;
  fingerprint: string;
  public_key: string;
  key_type: string;
  created_at: string;
}

export interface PasskeyCredential {
  id: number;
  credential_id: string;
  created_at: string;
  last_used_at?: string;
}

export interface SSHBootstrapToken {
  bootstrap_token: string;
  expires_at: string;
  expires_in_seconds: number;
  username: string;
}

// ── Collaborators ────────────────────────────

export interface Collaborator {
  user_id: number;
  username: string;
  role: string; // "read" | "write" | "admin"
}

// ── Organizations ────────────────────────────

export interface Organization {
  id: number;
  name: string;
  display_name: string;
}

export interface OrgMember {
  org_id: number;
  user_id: number;
  username: string;
  role: string; // "owner" | "member"
}

// ── Code Intelligence (search, xref, graph) ──

export interface SymbolResult {
  file: string;
  kind: string;
  name: string;
  signature?: string;
  receiver?: string;
  start_line: number;
  end_line: number;
}

export interface ReferenceResult {
  file: string;
  kind: string;
  name: string;
  start_line: number;
  end_line: number;
  start_column: number;
  end_column: number;
}

export interface CallGraphEdge {
  caller_name: string;
  caller_file: string;
  callee_name: string;
  callee_file: string;
  count: number;
}

export interface CallGraphResponse {
  definitions: unknown[];
  edges: CallGraphEdge[];
}

// ── Entity History ───────────────────────────

export interface EntityHistoryHit {
  commit_hash: string;
  stable_id?: string;
  author: string;
  timestamp: number;
  message: string;
  path: string;
  entity_hash: string;
  kind: string;
  name: string;
  decl_kind: string;
  receiver?: string;
  body_hash: string;
}

// ── Semver ────────────────────────────────────

export interface SemverRecommendation {
  base: string;
  head: string;
  bump: string; // "none" | "patch" | "minor" | "major"
  breaking_changes?: string[];
  features?: string[];
  fixes?: string[];
}

// ── Issues ───────────────────────────────────

export interface Issue {
  id: number;
  repo_id: number;
  number: number;
  title: string;
  body: string;
  state: string; // "open" | "closed"
  author_id: number;
  author_name?: string;
  created_at: string;
  closed_at?: string;
}

export interface IssueComment {
  id: number;
  issue_id: number;
  author_id: number;
  author_name?: string;
  body: string;
  created_at: string;
}

// ── Realtime SSE ─────────────────────────────

export interface RepoStreamEvent {
  type: string;
  repo_id: number;
  occurred_at: string;
  payload?: Record<string, unknown>;
}

