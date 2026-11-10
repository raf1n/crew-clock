import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Option } from '@/components/shared/types';

export function TimerForm({
  projects,
  tasks,
  projectId,
  taskId,
  description,
  isStarting,
  onProjectChange,
  onTaskChange,
  onDescriptionChange,
  onSubmit,
}: {
  projects: Option[];
  tasks: Option[];
  projectId: string;
  taskId: string;
  description: string;
  isStarting: boolean;
  onProjectChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
      onSubmit={onSubmit}
    >
      <Select
        value={projectId || undefined}
        onValueChange={onProjectChange}
        disabled={projects.length === 0}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={taskId || 'none'}
        onValueChange={(value) => onTaskChange(value === 'none' ? '' : value)}
        disabled={!projectId || tasks.length === 0}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="No task" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No task</SelectItem>
          {tasks.map((task) => (
            <SelectItem key={task.id} value={task.id}>
              {task.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="min-w-0 flex-1 sm:min-w-48"
        placeholder="What are you working on?"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />

      <Button type="submit" disabled={isStarting || projects.length === 0}>
        <Play />
        {isStarting ? 'Starting…' : 'Start'}
      </Button>
    </form>
  );
}
