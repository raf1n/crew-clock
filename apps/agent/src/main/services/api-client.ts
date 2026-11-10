import type {
  AuthResponse,
  CreateDeviceInput,
  CreateDeviceResult,
  Device,
  Project,
  Task,
  TimeEntry,
  WorkspaceMembership,
} from '@crewclock/shared';

import type { QueuedEntryPayload } from '../storage/database';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  token?: string;
  body?: unknown;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export class ApiClient {
  readonly baseUrl: string;

  constructor(baseUrl = process.env.CREWCLOCK_API_URL ?? 'http://localhost:3000/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  login(email: string, password: string, timezone?: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, timezone },
    });
  }

  listWorkspaces(token: string): Promise<WorkspaceMembership[]> {
    return this.request<WorkspaceMembership[]>('/workspaces', { token });
  }

  registerDevice(
    token: string,
    workspaceId: string,
    input: CreateDeviceInput,
  ): Promise<CreateDeviceResult> {
    return this.request<CreateDeviceResult>(`/workspaces/${workspaceId}/devices`, {
      method: 'POST',
      token,
      body: input,
    });
  }

  heartbeat(deviceToken: string, timezone?: string): Promise<Device> {
    return this.request<Device>('/agent/heartbeat', {
      method: 'POST',
      token: deviceToken,
      body: { timezone },
    });
  }

  listProjects(deviceToken: string): Promise<Project[]> {
    return this.request<Project[]>('/agent/projects', { token: deviceToken });
  }

  listTasks(deviceToken: string, projectId: string): Promise<Task[]> {
    return this.request<Task[]>(`/agent/tasks?projectId=${projectId}`, {
      token: deviceToken,
    });
  }

  createEntry(deviceToken: string, payload: QueuedEntryPayload): Promise<TimeEntry> {
    return this.request<TimeEntry>('/agent/time-entries', {
      method: 'POST',
      token: deviceToken,
      body: payload,
    });
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message = Array.isArray(body?.message)
        ? body.message.join(', ')
        : (body?.message ?? `Request failed with ${response.status}`);
      throw new ApiError(
        message,
        response.status,
        parseRetryAfter(response.headers.get('retry-after')),
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
