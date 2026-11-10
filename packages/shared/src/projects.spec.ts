import { createProjectSchema, updateProjectSchema } from './projects';
import { createTaskSchema, listTasksQuerySchema } from './tasks';

describe('project schemas', () => {
  it('trims the project name and allows a missing description', () => {
    const parsed = createProjectSchema.parse({ name: '  Website redesign  ' });

    expect(parsed).toEqual({ name: 'Website redesign' });
  });

  it('rejects an empty project update', () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
  });
});

describe('task schemas', () => {
  it('defaults new tasks to todo', () => {
    const parsed = createTaskSchema.parse({ title: 'Write the migration' });

    expect(parsed.status).toBe('todo');
  });

  it('rejects unknown task statuses', () => {
    expect(createTaskSchema.safeParse({ title: 'Task', status: 'blocked' }).success).toBe(false);
  });

  it('coerces pagination and filters from query strings', () => {
    const parsed = listTasksQuerySchema.parse({
      page: '2',
      limit: '50',
      status: 'in_progress',
      assigneeId: '3f4b2c1a-9d8e-4f7a-b6c5-d4e3f2a1b0c9',
    });

    expect(parsed).toEqual({
      page: 2,
      limit: 50,
      status: 'in_progress',
      assigneeId: '3f4b2c1a-9d8e-4f7a-b6c5-d4e3f2a1b0c9',
    });
  });
});
