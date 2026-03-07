'use client';

import { CheckCircle2, XCircle, Circle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AuthCallout } from '@/components/shared/auth-callout';
import { useMergeGate, usePRChecks, useMergePR } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/use-auth';
import type { CheckRun, EntityOwnerApproval } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface MergeGateProps {
  owner: string;
  repo: string;
  prNumber: number;
  prState: string;
}

function CheckStatusIcon({ status, conclusion }: { status: string; conclusion?: string }) {
  if (status === 'completed') {
    if (conclusion === 'success') {
      return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
    }
    if (conclusion === 'failure' || conclusion === 'cancelled') {
      return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
  if (status === 'in_progress') {
    return <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function CheckRunRow({ check }: { check: CheckRun }) {
  const failed =
    check.status === 'completed' &&
    (check.conclusion === 'failure' || check.conclusion === 'cancelled');
  const inProgress = check.status === 'in_progress';

  return (
    <div className="flex items-center gap-2 py-1.5">
      <CheckStatusIcon status={check.status} conclusion={check.conclusion} />
      <span
        className={cn(
          'flex-1 min-w-0 truncate text-sm',
          failed ? 'text-red-300' : inProgress ? 'text-amber-300' : 'text-foreground/80',
        )}
      >
        {check.name}
      </span>
      {check.details_url && (
        <a
          href={check.details_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="View details"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function OwnerApprovalRow({ approval }: { approval: EntityOwnerApproval }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {approval.satisfied ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
      )}
      <span
        className={cn(
          'flex-1 min-w-0 truncate text-sm font-mono',
          !approval.satisfied ? 'text-red-300' : 'text-foreground/80',
        )}
      >
        {approval.entity_key}
      </span>
      {!approval.satisfied && approval.missing_owners && approval.missing_owners.length > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground">
          needs: {approval.missing_owners.join(', ')}
        </span>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}

export function MergeGate({ owner, repo, prNumber, prState }: MergeGateProps) {
  const { isAuthenticated } = useAuth();
  const { data: gate, isLoading: gateLoading } = useMergeGate(owner, repo, prNumber);
  const { data: checks, isLoading: checksLoading } = usePRChecks(owner, repo, prNumber);
  const mergePR = useMergePR();

  const isLoading = gateLoading || checksLoading;
  const isMerged = prState === 'merged';
  const isClosed = prState === 'closed';

  if (isLoading) return <LoadingSkeleton />;

  function handleMerge() {
    mergePR.mutate({ owner, repo, number: prNumber });
  }

  const canMerge = gate?.allowed && !isMerged && !isClosed;
  const returnTo = `/${owner}/${repo}/pulls/${prNumber}`;

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
        <h3 className="text-sm font-semibold text-foreground">Merge checklist</h3>
      </div>

      <div className="px-4 py-3 space-y-0.5">
        {/* Gate reasons */}
        {gate?.reasons && gate.reasons.length > 0 && (
          <>
            <div className="space-y-0.5">
              {gate.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1.5">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-sm text-red-300">{reason}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {gate?.allowed && (
          <div className="flex items-center gap-2 py-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-sm text-emerald-300">All requirements met</span>
          </div>
        )}

        {/* Entity owner approvals */}
        {gate?.entity_owner_approvals && gate.entity_owner_approvals.length > 0 && (
          <>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pb-1">
              Owner approvals
            </p>
            {gate.entity_owner_approvals.map((approval) => (
              <OwnerApprovalRow key={`${approval.path}:${approval.entity_key}`} approval={approval} />
            ))}
          </>
        )}

        {/* Check runs */}
        {checks && checks.length > 0 && (
          <>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pb-1">
              Checks
            </p>
            {checks.map((check) => (
              <CheckRunRow key={check.id} check={check} />
            ))}
          </>
        )}
      </div>

      {/* Merge button */}
      {!isMerged && !isClosed && (
        <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
          {isAuthenticated ? (
            <Button
              onClick={handleMerge}
              disabled={!canMerge || mergePR.isPending}
              className={cn(
                'w-full',
                canMerge
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'opacity-50 cursor-not-allowed',
              )}
            >
              {mergePR.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mergePR.isPending ? 'Merging...' : 'Merge pull request'}
            </Button>
          ) : (
            <AuthCallout
              title="Sign in to merge or review"
              description="Merge actions require authentication and repository permissions."
              returnTo={returnTo}
              actionLabel="Sign in"
            />
          )}
        </div>
      )}

      {isMerged && (
        <div className="px-4 py-3 border-t border-border/40 bg-violet-500/5">
          <p className="text-sm text-center text-violet-400 font-medium">
            Pull request merged
          </p>
        </div>
      )}

      {isClosed && !isMerged && (
        <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
          <p className="text-sm text-center text-muted-foreground">
            Pull request closed
          </p>
        </div>
      )}
    </div>
  );
}
