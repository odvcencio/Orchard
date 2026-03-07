'use client';

import { useState } from 'react';
import { Users, Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useOrgMembers, useAddOrgMember, useRemoveOrgMember } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';

interface OrgMembersTabProps {
  org: string;
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'owner':
      return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
}

function MembersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function AddMemberForm({
  org,
  onSuccess,
}: {
  org: string;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('member');
  const { mutate: addMember, isPending, error } = useAddOrgMember();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    addMember(
      { org, username: username.trim(), role },
      {
        onSuccess: () => {
          setUsername('');
          setRole('member');
          onSuccess();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div className="space-y-2">
          <Label htmlFor="member-username">Username</Label>
          <Input
            id="member-username"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-role">Role</Label>
          <select
            id="member-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isPending}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="member">Member</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <Button type="submit" disabled={isPending || !username.trim()} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {isPending ? 'Adding…' : 'Add Member'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to add member'}
        </p>
      )}
    </form>
  );
}

export function OrgMembersTab({ org }: OrgMembersTabProps) {
  const { data: members, isLoading } = useOrgMembers(org);
  const { mutate: removeMember } = useRemoveOrgMember();
  const [showForm, setShowForm] = useState(false);

  function handleRemove(username: string) {
    if (!window.confirm(`Remove ${username} from this organization?`)) return;
    removeMember({ org, username });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Manage who belongs to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <MembersSkeleton />
          ) : !members || members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Add members to give them access to this organization."
            />
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        {member.username.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{member.username}</span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs capitalize', roleBadgeClass(member.role))}
                        >
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(member.username)}
                    aria-label={`Remove member ${member.username}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Member</CardTitle>
          </CardHeader>
          <CardContent>
            <AddMemberForm org={org} onSuccess={() => setShowForm(false)} />
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="gap-2" onClick={() => setShowForm(true)}>
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      )}
    </div>
  );
}
