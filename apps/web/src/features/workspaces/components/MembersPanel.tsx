import { ROLES, type Role } from '@crewclock/shared';
import { Check, Copy, UserPlus, X } from 'lucide-react';
import { useState } from 'react';

import {
  useAddMemberMutation,
  useCancelInvitationMutation,
  useCreateInvitationMutation,
  useGetMembersQuery,
  useListInvitationsQuery,
} from '@/api/workspacesApi';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/api-error';
import { formatDateTime, formatLabel } from '@/lib/format';

export function MembersPanel({ workspaceId, actorRole }: { workspaceId: string; actorRole: Role }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: members, isLoading } = useGetMembersQuery(workspaceId);
  const { data: invitations } = useListInvitationsQuery(workspaceId);
  const [createInvitation, { isLoading: inviting }] = useCreateInvitationMutation();
  const [cancelInvitation] = useCancelInvitationMutation();
  const [addMember] = useAddMemberMutation();

  const canAssignRoles = actorRole === 'owner';

  const handleInvite = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      const result = await createInvitation({
        workspaceId,
        body: { email, role: canAssignRoles ? role : 'member' },
      }).unwrap();
      setInviteLink(`${window.location.origin}/invite/${result.token}`);
      setEmail('');
      setRole('member');
      setCopied(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!inviteLink) {
      return;
    }
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  };

  const handleCancel = async (invitationId: string): Promise<void> => {
    setError(null);
    try {
      await cancelInvitation({ workspaceId, invitationId }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleRoleChange = async (memberEmail: string, nextRole: Role): Promise<void> => {
    setError(null);
    try {
      await addMember({
        workspaceId,
        body: { email: memberEmail, role: nextRole },
      }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Invite teammates by email. They join after opening the invite link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <ErrorAlert message={error} /> : null}

        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleInvite}>
          <Input
            className="flex-1"
            type="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {canAssignRoles ? (
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary" className="flex h-9 items-center px-3">
              Member
            </Badge>
          )}
          <Button type="submit" disabled={inviting}>
            <UserPlus />
            {inviting ? 'Creating…' : 'Create invite'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          No email delivery is configured yet — copy the invite link and share it. Owners can invite
          owners and managers; managers can invite members.
        </p>

        {inviteLink ? (
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm font-medium">Invite link</p>
            <div className="flex gap-2">
              <Input readOnly value={inviteLink} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={handleCopy}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Pending invitations</h3>
          {!invitations || invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatLabel(invitation.role)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(invitation.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Cancel invitation"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleCancel(invitation.id)}
                        >
                          <X />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Members</h3>
          {isLoading ? (
            <LoadingState />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar name={member.user.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{member.user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canAssignRoles ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleRoleChange(member.user.email, value as Role)
                            }
                          >
                            <SelectTrigger size="sm" className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {formatLabel(option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{formatLabel(member.role)}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(member.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
