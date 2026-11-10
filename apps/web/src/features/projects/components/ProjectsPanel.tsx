import { FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';

import type { Project } from '@crewclock/shared';

import { useCreateProjectMutation, useDeleteProjectMutation } from '@/api/projectsApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { ProjectCard } from './ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiErrorMessage } from '@/lib/api-error';

export function ProjectsPanel({
  workspaceId,
  projects,
  selectedProjectId,
  canManage,
  onSelect,
}: {
  workspaceId: string;
  projects: Project[];
  selectedProjectId: string;
  canManage: boolean;
  onSelect: (projectId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();

  const handleCreate = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      await createProject({
        workspaceId,
        body: { name, description: description || undefined },
      }).unwrap();
      setName('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleDelete = async (projectId: string): Promise<void> => {
    setError(null);
    try {
      await deleteProject({ workspaceId, projectId }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Organize work into projects and tasks.</CardDescription>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setShowForm((current) => !current)}>
            <Plus />
            {showForm ? 'Cancel' : 'New project'}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <ErrorAlert message={error} /> : null}

        {showForm ? (
          <form
            className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-[1fr_1.5fr_auto]"
            onSubmit={handleCreate}
          >
            <Input
              placeholder="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </form>
        ) : null}

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description={
              canManage
                ? 'Create a project to start assigning work and tracking time.'
                : 'A manager has not created any projects yet.'
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                selected={project.id === selectedProjectId}
                canManage={canManage}
                onSelect={() => onSelect(project.id)}
                onDelete={() => handleDelete(project.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
