import { contextBridge, ipcRenderer } from 'electron';

import type { AgentApi, AgentState, SetupResult, StartTimerInput } from '../shared/types';

const agent: AgentApi = {
  state: () => ipcRenderer.invoke('agent:state'),
  subscribe: (listener: (state: AgentState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: AgentState): void => {
      listener(state);
    };
    ipcRenderer.on('agent:state-changed', handler);
    return () => ipcRenderer.removeListener('agent:state-changed', handler);
  },
  login: (email: string, password: string) =>
    ipcRenderer.invoke('agent:login', { email, password }) as Promise<SetupResult>,
  registerDevice: (workspaceId: string, deviceName: string) =>
    ipcRenderer.invoke('agent:register-device', { workspaceId, deviceName }),
  projects: () => ipcRenderer.invoke('agent:projects'),
  tasks: (projectId: string) => ipcRenderer.invoke('agent:tasks', { projectId }),
  idleSeconds: () => ipcRenderer.invoke('agent:idle-seconds'),
  startTimer: (input: StartTimerInput) => ipcRenderer.invoke('agent:start-timer', input),
  stopTimer: () => ipcRenderer.invoke('agent:stop-timer'),
  resumeTimer: () => ipcRenderer.invoke('agent:resume-timer'),
  discardPaused: () => ipcRenderer.invoke('agent:discard-paused'),
  syncNow: () => ipcRenderer.invoke('agent:sync-now'),
  discardFailed: () => ipcRenderer.invoke('agent:discard-failed'),
  signOut: () => ipcRenderer.invoke('agent:sign-out'),
};

contextBridge.exposeInMainWorld('agent', agent);
