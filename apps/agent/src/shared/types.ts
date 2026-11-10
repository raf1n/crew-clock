import type { Device, Project, Task } from '@crewclock/shared';

export interface LoginUser {
  id: string;
  name: string;
  email: string;
}

export interface SetupWorkspace {
  id: string;
  name: string;
  role: 'owner' | 'manager' | 'member';
}

export interface SetupResult {
  user: LoginUser;
  workspaces: SetupWorkspace[];
  deviceName: string;
}

export interface TimerState {
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  description: string | null;
  startedAt: string;
}

export interface PausedTimer {
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  description: string | null;
  pausedAt: string;
}

export interface AgentState {
  apiUrl: string;
  configured: boolean;
  deviceName: string;
  workspaceName: string | null;
  device: Device | null;
  timer: TimerState | null;
  pausedTimer: PausedTimer | null;
  pendingEntries: number;
  failedEntries: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface StartTimerInput {
  projectId: string;
  projectName: string;
  taskId?: string;
  taskTitle?: string;
  description?: string;
}

export type StopTimerReason =
  'manual' | 'idle' | 'suspend' | 'lock' | 'shutdown' | 'restart' | 'not-running';

export interface StopTimerResult {
  queued: boolean;
  reason: StopTimerReason;
}

export interface SyncResult {
  synced: number;
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface AgentApi {
  state(): Promise<AgentState>;
  subscribe(listener: (state: AgentState) => void): () => void;
  login(email: string, password: string): Promise<SetupResult>;
  registerDevice(workspaceId: string, deviceName: string): Promise<AgentState>;
  projects(): Promise<Project[]>;
  tasks(projectId: string): Promise<Task[]>;
  idleSeconds(): Promise<number>;
  startTimer(input: StartTimerInput): Promise<AgentState>;
  stopTimer(): Promise<StopTimerResult>;
  resumeTimer(): Promise<AgentState>;
  discardPaused(): Promise<AgentState>;
  syncNow(): Promise<SyncResult>;
  discardFailed(): Promise<AgentState>;
  signOut(): Promise<AgentState>;
}
