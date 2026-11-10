import { roleAtLeast } from '@crewclock/shared';
import { Building2 } from 'lucide-react';
import { useState } from 'react';

import { useGetProjectsQuery } from '@/api/projectsApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectsPanel } from '@/features/projects/components/ProjectsPanel';
import { TasksPanel } from '@/features/projects/components/TasksPanel';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';

export function ProjectsPage() {
  const { workspace, isLoading } = useSelectedWorkspace();
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const { data: projectsPage, isLoading: loadingProjects } = useGetProjectsQuery(
    { workspaceId: workspace?.id ?? '' },
    { skip: !workspace },
  );

  if (isLoading || loadingProjects) {
    return <LoadingState />;
  }
  if (!workspace) {
    return (
      <EmptyState
        icon={Building2}
        title="No workspace"
        description="You are not a member of a workspace yet."
      />
    );
  }

  const projects = projectsPage?.items ?? [];
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const canManage = roleAtLeast(workspace.role, 'manager');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Organize work into projects and assign tasks to your team."
      />
      <ProjectsPanel
        workspaceId={workspace.id}
        projects={projects}
        selectedProjectId={selectedProjectId}
        canManage={canManage}
        onSelect={setSelectedProjectId}
      />
      <TasksPanel workspaceId={workspace.id} project={selectedProject} canManage={canManage} />
    </div>
  );
}
