import type { Project } from '@crewclock/shared';
import { ListTodo, Trash2 } from 'lucide-react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';

export function ProjectCard({
  project,
  selected,
  canManage,
  onSelect,
  onDelete,
}: {
  project: Project;
  selected: boolean;
  canManage: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={cn(
        'gap-3 py-4 transition-shadow hover:shadow-md',
        selected && 'ring-2 ring-primary',
      )}
    >
      <CardHeader>
        <CardTitle className="truncate">{project.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {project.description ?? 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Created {formatDateTime(project.createdAt)}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant={selected ? 'default' : 'outline'} size="sm" onClick={onSelect}>
          <ListTodo />
          Tasks
        </Button>
        {canManage ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 />
            Delete
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
