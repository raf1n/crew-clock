import type { TimeEntry } from '@crewclock/shared';
import { Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatDuration } from '@/lib/format';

export function TimeEntriesTable({
  entries,
  projectName,
  currentUserId,
  memberName,
  showActions = true,
  onDelete,
}: {
  entries: TimeEntry[];
  projectName: (id: string) => string;
  currentUserId?: string;
  memberName?: (userId: string) => string;
  showActions?: boolean;
  onDelete: (entryId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {memberName ? <TableHead>Member</TableHead> : null}
          <TableHead>Started</TableHead>
          <TableHead>Ended</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Description</TableHead>
          {showActions ? <TableHead className="text-right">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            {memberName ? (
              <TableCell className="font-medium">{memberName(entry.userId)}</TableCell>
            ) : null}
            <TableCell className="text-muted-foreground">
              {formatDateTime(entry.startedAt)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {entry.endedAt ? (
                formatDateTime(entry.endedAt)
              ) : (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                  Running
                </Badge>
              )}
            </TableCell>
            <TableCell className="font-medium tabular-nums">
              {entry.durationSeconds === null ? '—' : formatDuration(entry.durationSeconds)}
            </TableCell>
            <TableCell>{projectName(entry.projectId)}</TableCell>
            <TableCell className="max-w-64 truncate text-muted-foreground">
              {entry.description ?? '—'}
            </TableCell>
            {showActions ? (
              <TableCell className="text-right">
                {entry.userId === currentUserId ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete entry"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
