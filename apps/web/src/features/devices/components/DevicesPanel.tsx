import type { Device, DevicePlatform, Role } from '@crewclock/shared';
import { roleAtLeast } from '@crewclock/shared';
import { Laptop, MonitorSmartphone, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { useGetDevicesQuery, useRevokeDeviceMutation } from '@/api/devicesApi';
import { useGetMembersQuery } from '@/api/workspacesApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';

function platformLabel(platform: DevicePlatform): string {
  if (platform === 'macos') {
    return 'macOS';
  }
  if (platform === 'windows') {
    return 'Windows';
  }
  return 'Linux';
}

export function DevicesPanel({ workspaceId, actorRole }: { workspaceId: string; actorRole: Role }) {
  const [error, setError] = useState<string | null>(null);
  const { data: devices, isLoading } = useGetDevicesQuery(workspaceId);
  const { data: members } = useGetMembersQuery(workspaceId);
  const [revoke, { isLoading: revoking }] = useRevokeDeviceMutation();

  const canManage = roleAtLeast(actorRole, 'manager');
  const memberName = (userId: string): string =>
    members?.find((member) => member.userId === userId)?.user.name ?? userId;

  const handleRevoke = async (device: Device): Promise<void> => {
    if (!window.confirm(`Revoke "${device.name}"? The agent will lose access immediately.`)) {
      return;
    }
    setError(null);
    try {
      await revoke({ workspaceId, deviceId: device.id }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
        <CardDescription>
          Computers registered by the desktop agent. Revoked devices must be registered again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <ErrorAlert message={error} /> : null}
        {isLoading ? (
          <LoadingState />
        ) : !devices || devices.length === 0 ? (
          <EmptyState
            icon={MonitorSmartphone}
            title="No devices registered"
            description="A member can register this computer from the Crewclock desktop agent."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  {canManage ? <TableHead>Member</TableHead> : null}
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const revoked = Boolean(device.revokedAt) || !device.isActive;
                  return (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <Laptop className="size-4" />
                          </span>
                          <span className="font-medium">{device.name}</span>
                        </div>
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-muted-foreground">
                          {memberName(device.userId)}
                        </TableCell>
                      ) : null}
                      <TableCell>{platformLabel(device.platform)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={revoked ? 'secondary' : 'default'}
                          className={revoked ? undefined : 'bg-emerald-50 text-emerald-700'}
                        >
                          {revoked ? 'Revoked' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {device.lastSeenAt ? formatDateTime(device.lastSeenAt) : 'Never'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(device.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {revoked ? (
                          <span className="text-xs text-muted-foreground">Revoked</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={revoking}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => void handleRevoke(device)}
                          >
                            <ShieldAlert />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
