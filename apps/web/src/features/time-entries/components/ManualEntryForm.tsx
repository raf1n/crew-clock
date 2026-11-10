import { Plus } from 'lucide-react';

import { FormField } from '@/components/shared/FormField';
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

export interface ManualEntryValues {
  projectId: string;
  taskId: string;
  description: string;
  startedAt: string;
  endedAt: string;
}

export function ManualEntryForm({
  projects,
  tasks,
  values,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  projects: Option[];
  tasks: Option[];
  values: ManualEntryValues;
  isSubmitting: boolean;
  onChange: (field: keyof ManualEntryValues, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
      <FormField label="Project">
        <Select
          value={values.projectId || undefined}
          onValueChange={(value) => onChange('projectId', value)}
        >
          <SelectTrigger className="w-full">
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
      </FormField>

      <FormField label="Task">
        <Select
          value={values.taskId || 'none'}
          onValueChange={(value) => onChange('taskId', value === 'none' ? '' : value)}
          disabled={!values.projectId || tasks.length === 0}
        >
          <SelectTrigger className="w-full">
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
      </FormField>

      <FormField label="Start">
        <Input
          type="datetime-local"
          value={values.startedAt}
          onChange={(event) => onChange('startedAt', event.target.value)}
          required
        />
      </FormField>

      <FormField label="End">
        <Input
          type="datetime-local"
          value={values.endedAt}
          onChange={(event) => onChange('endedAt', event.target.value)}
          required
        />
      </FormField>

      <FormField label="Description" className="sm:col-span-2">
        <Input
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
        />
      </FormField>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          <Plus />
          {isSubmitting ? 'Adding…' : 'Add entry'}
        </Button>
      </div>
    </form>
  );
}
