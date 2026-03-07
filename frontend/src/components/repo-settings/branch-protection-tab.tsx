'use client';

import { useState } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useBranchProtection,
  useSetBranchProtection,
  useDeleteBranchProtection,
} from '@/lib/api/hooks';
import type { BranchProtectionRule } from '@/lib/api/types';

interface BranchProtectionTabProps {
  owner: string;
  repo: string;
  defaultBranch: string;
}

interface ToggleRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

interface BranchProtectionFormState {
  requireApprovals: boolean;
  requiredApprovals: number;
  requireStatusChecks: boolean;
  requireEntityOwnerApproval: boolean;
  requireSignedCommits: boolean;
}

interface BranchProtectionEditorProps {
  initialState: BranchProtectionFormState;
  defaultBranch: string;
  noRuleExists: boolean;
  canDelete: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (state: BranchProtectionFormState) => void;
  onDelete: () => void;
}

function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="relative shrink-0 mt-0.5">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <label
          htmlFor={id}
          className="block w-10 h-6 rounded-full cursor-pointer transition-colors bg-input peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
        >
          <span className="block w-4 h-4 mt-1 ml-1 rounded-full bg-background shadow transition-transform duration-200 peer-checked:translate-x-4" />
        </label>
      </div>
    </div>
  );
}

function ProtectionSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function toFormState(rule?: BranchProtectionRule | null): BranchProtectionFormState {
  return {
    requireApprovals: rule?.require_approvals ?? false,
    requiredApprovals: rule?.required_approvals || 1,
    requireStatusChecks: rule?.require_status_checks ?? false,
    requireEntityOwnerApproval: rule?.require_entity_owner_approval ?? false,
    requireSignedCommits: rule?.require_signed_commits ?? false,
  };
}

function formStateKey(defaultBranch: string, state: BranchProtectionFormState): string {
  return [
    defaultBranch,
    String(state.requireApprovals),
    String(state.requiredApprovals),
    String(state.requireStatusChecks),
    String(state.requireEntityOwnerApproval),
    String(state.requireSignedCommits),
  ].join(':');
}

function BranchProtectionEditor({
  initialState,
  defaultBranch,
  noRuleExists,
  canDelete,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
}: BranchProtectionEditorProps) {
  const [state, setState] = useState<BranchProtectionFormState>(initialState);

  function setRequiredApprovals(value: string) {
    const parsed = Number.parseInt(value, 10);
    const normalized = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed));
    setState((prev) => ({ ...prev, requiredApprovals: normalized }));
  }

  return (
    <div className="space-y-6">
      <div className="divide-y divide-border">
        <ToggleRow
          id="require-approvals"
          label="Require pull request approvals"
          description="Pull requests must be approved before merging"
          checked={state.requireApprovals}
          onChange={(requireApprovals) => {
            setState((prev) => ({ ...prev, requireApprovals }));
          }}
        />

        {state.requireApprovals && (
          <div className="py-3 pl-4">
            <Label htmlFor="required-approvals-count" className="text-sm text-muted-foreground">
              Required approvals
            </Label>
            <Input
              id="required-approvals-count"
              type="number"
              min={1}
              max={10}
              value={state.requiredApprovals}
              onChange={(e) => setRequiredApprovals(e.target.value)}
              className="mt-2 w-24"
            />
          </div>
        )}

        <ToggleRow
          id="require-status-checks"
          label="Require status checks to pass"
          description="All CI checks must pass before merging"
          checked={state.requireStatusChecks}
          onChange={(requireStatusChecks) => {
            setState((prev) => ({ ...prev, requireStatusChecks }));
          }}
        />

        <ToggleRow
          id="require-entity-owner"
          label="Require entity owner approval"
          description="Code owners must approve changes to their owned entities"
          checked={state.requireEntityOwnerApproval}
          onChange={(requireEntityOwnerApproval) => {
            setState((prev) => ({ ...prev, requireEntityOwnerApproval }));
          }}
        />

        <ToggleRow
          id="require-signed-commits"
          label="Require signed commits"
          description="All commits must be cryptographically signed"
          checked={state.requireSignedCommits}
          onChange={(requireSignedCommits) => {
            setState((prev) => ({ ...prev, requireSignedCommits }));
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => onSave(state)} disabled={isSaving || !defaultBranch}>
          {isSaving ? 'Saving…' : noRuleExists ? 'Create Protection Rule' : 'Save Changes'}
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Removing…' : 'Remove Protection'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function BranchProtectionTab({ owner, repo, defaultBranch }: BranchProtectionTabProps) {
  const { data: rule, isLoading, error } = useBranchProtection(owner, repo, defaultBranch);
  const { mutate: setProtection, isPending: isSaving } = useSetBranchProtection();
  const { mutate: deleteProtection, isPending: isDeleting } = useDeleteBranchProtection();

  const noRuleExists = !isLoading && (Boolean(error) || !rule);
  const initialState = toFormState(rule);
  const editorKey = formStateKey(defaultBranch, initialState);

  function handleSave(state: BranchProtectionFormState) {
    setProtection({
      owner,
      repo,
      branch: defaultBranch,
      rule: {
        enabled: true,
        require_approvals: state.requireApprovals,
        required_approvals: state.requireApprovals ? state.requiredApprovals : 0,
        require_status_checks: state.requireStatusChecks,
        require_entity_owner_approval: state.requireEntityOwnerApproval,
        require_signed_commits: state.requireSignedCommits,
      },
    });
  }

  function handleDelete() {
    if (!window.confirm(`Remove branch protection rules for ${defaultBranch}?`)) return;
    deleteProtection({ owner, repo, branch: defaultBranch });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Branch Protection</CardTitle>
              <CardDescription className="mt-1">
                Protection rules for{' '}
                <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">{defaultBranch}</code>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ProtectionSkeleton />
          ) : (
            <BranchProtectionEditor
              key={editorKey}
              initialState={initialState}
              defaultBranch={defaultBranch}
              noRuleExists={noRuleExists}
              canDelete={!noRuleExists && !!rule}
              isSaving={isSaving}
              isDeleting={isDeleting}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
