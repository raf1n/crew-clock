import { hostname } from 'node:os';

import type { DevicePlatform, Device } from '@crewclock/shared';
import { createDeviceSchema } from '@crewclock/shared';

import type { SetupResult, SetupWorkspace } from '../../shared/types';
import type { ApiClient } from './api-client';
import type { AgentDatabase } from '../storage/database';
import { log } from '../lib/logger';
import { systemTimeZone } from '../lib/timezone';
import { protectToken } from '../storage/secure-store';

export function devicePlatform(): DevicePlatform {
  if (process.platform === 'darwin') {
    return 'macos';
  }
  if (process.platform === 'win32') {
    return 'windows';
  }
  return 'linux';
}

export class DeviceSetupService {
  private pendingAccessToken: string | null = null;
  private pendingWorkspaces: SetupWorkspace[] = [];

  constructor(
    private readonly db: AgentDatabase,
    private readonly api: ApiClient,
  ) {}

  async login(email: string, password: string): Promise<SetupResult> {
    const auth = await this.api.login(email, password, systemTimeZone());
    const workspaces = await this.api.listWorkspaces(auth.accessToken);

    this.pendingAccessToken = auth.accessToken;
    this.pendingWorkspaces = workspaces
      .filter((workspace) => workspace.role === 'member')
      .map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        role: workspace.role,
      }));

    log.info(`Agent sign-in succeeded for workspace count=${this.pendingWorkspaces.length}`);
    return {
      user: { id: auth.user.id, name: auth.user.name, email: auth.user.email },
      workspaces: this.pendingWorkspaces,
      deviceName: hostname(),
    };
  }

  async registerDevice(workspaceId: string, deviceName: string): Promise<Device> {
    if (!this.pendingAccessToken) {
      throw new Error('Sign in first');
    }

    const selected = this.pendingWorkspaces.find((workspace) => workspace.id === workspaceId);
    if (!selected) {
      throw new Error('Choose a workspace');
    }

    const input = createDeviceSchema.parse({
      name: deviceName,
      platform: devicePlatform(),
    });
    const result = await this.api.registerDevice(this.pendingAccessToken, selected.id, input);

    this.db.setSetting('deviceToken', protectToken(result.token));
    this.db.setSetting('device', JSON.stringify(result.device));
    this.db.setSetting('workspaceName', selected.name);
    this.db.deleteSetting('lastError');

    this.pendingAccessToken = null;
    this.pendingWorkspaces = [];
    log.info(`Device registered id=${result.device.id}`);
    return result.device;
  }

  clearPending(): void {
    this.pendingAccessToken = null;
    this.pendingWorkspaces = [];
  }
}
