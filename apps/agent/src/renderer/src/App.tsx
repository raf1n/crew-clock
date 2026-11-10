import { useCallback, useEffect, useState } from 'react';
import type { Project, Task } from '@crewclock/shared';

import type { AgentState, SetupResult } from '@shared/types';

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Something went wrong';
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

function formatElapsed(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((part) => String(part).padStart(2, '0')).join(':');
}

function formatWhen(value: string | null): string {
  if (!value) {
    return 'Not synced yet';
  }
  return new Date(value).toLocaleString();
}

function formatIdle(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export function App() {
  const [state, setState] = useState<AgentState | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [setup, setSetup] = useState<SetupResult | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [timerError, setTimerError] = useState<string | null>(null);
  const [timerBusy, setTimerBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [idleSeconds, setIdleSeconds] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const next = await window.agent.state();
      setState(next);
      setFatal(null);
    } catch (error) {
      setFatal(errorMessage(error));
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const next = await window.agent.projects();
      setProjects(next);
      setProjectsError(null);
      setProjectId((current) => current || next[0]?.id || '');
    } catch (error) {
      setProjectsError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 10_000);
    const unsubscribe = window.agent.subscribe((next) => setState(next));
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (!state?.configured) {
      return;
    }
    void loadProjects();
  }, [state?.configured, state?.device?.workspaceId, loadProjects]);

  useEffect(() => {
    if (!state?.timer) {
      return;
    }
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state?.timer]);

  useEffect(() => {
    if (!state?.timer) {
      setIdleSeconds(0);
      return;
    }
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const seconds = await window.agent.idleSeconds();
        if (active) {
          setIdleSeconds(seconds);
        }
      } catch {
        // Idle telemetry is best-effort.
      }
    };
    void load();
    const interval = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [state?.timer?.startedAt]);

  useEffect(() => {
    if (!state?.configured || !projectId) {
      setTasks([]);
      setTaskId('');
      return;
    }

    let active = true;
    window.agent
      .tasks(projectId)
      .then((next) => {
        if (!active) {
          return;
        }
        setTasks(next);
        setTaskId((current) => (next.some((task) => task.id === current) ? current : ''));
        setTasksError(null);
      })
      .catch((error) => {
        if (active) {
          setTasks([]);
          setTasksError(errorMessage(error));
        }
      });

    return () => {
      active = false;
    };
  }, [state?.configured, projectId]);

  const handleLogin = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSetupError(null);
    setSetupBusy(true);
    try {
      const result = await window.agent.login(email, password);
      setSetup(result);
      setWorkspaceId(result.workspaces[0]?.id ?? '');
      setDeviceName(result.deviceName);
    } catch (error) {
      setSetupError(errorMessage(error));
    } finally {
      setSetupBusy(false);
    }
  };

  const handleRegister = async (): Promise<void> => {
    setSetupError(null);
    setSetupBusy(true);
    try {
      await window.agent.registerDevice(workspaceId, deviceName);
      await refresh();
      await loadProjects();
    } catch (error) {
      setSetupError(errorMessage(error));
    } finally {
      setSetupBusy(false);
    }
  };

  const handleStart = async (): Promise<void> => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      setTimerError('Choose a project first');
      return;
    }
    const task = tasks.find((item) => item.id === taskId);
    setTimerError(null);
    setTimerBusy(true);
    try {
      await window.agent.startTimer({
        projectId: project.id,
        projectName: project.name,
        taskId: task?.id,
        taskTitle: task?.title,
        description,
      });
      setDescription('');
      setNotice(null);
      await refresh();
    } catch (error) {
      setTimerError(errorMessage(error));
    } finally {
      setTimerBusy(false);
    }
  };

  const handleStop = async (): Promise<void> => {
    setTimerError(null);
    setTimerBusy(true);
    try {
      const result = await window.agent.stopTimer();
      setNotice(result.queued ? 'Time entry queued for sync.' : 'Timer stopped.');
      await refresh();
    } catch (error) {
      setTimerError(errorMessage(error));
    } finally {
      setTimerBusy(false);
    }
  };

  const handleResume = async (): Promise<void> => {
    setTimerError(null);
    try {
      await window.agent.resumeTimer();
      setNotice('Tracking resumed.');
      await refresh();
    } catch (error) {
      setTimerError(errorMessage(error));
    }
  };

  const handleDiscardPaused = async (): Promise<void> => {
    if (!window.confirm('Discard the paused session?')) {
      return;
    }
    await window.agent.discardPaused();
    setNotice('Paused session discarded.');
    await refresh();
  };

  const handleSync = async (): Promise<void> => {
    try {
      const result = await window.agent.syncNow();
      setNotice(
        result.synced > 0
          ? `Synced ${result.synced} ${result.synced === 1 ? 'entry' : 'entries'}.`
          : 'Queue checked.',
      );
      await refresh();
    } catch (error) {
      setTimerError(errorMessage(error));
    }
  };

  const handleDiscardFailed = async (): Promise<void> => {
    if (
      !window.confirm(
        'Discard rejected entries? They will not be uploaded and their time will be lost.',
      )
    ) {
      return;
    }
    await window.agent.discardFailed();
    setNotice('Rejected entries discarded.');
    await refresh();
  };

  const handleSignOut = async (): Promise<void> => {
    if (!window.confirm('Sign out of this device? Unsent offline entries will be discarded.')) {
      return;
    }
    await window.agent.signOut();
    setSetup(null);
    setProjects([]);
    setTasks([]);
    setProjectId('');
    setTaskId('');
    setTasksError(null);
    setNotice(null);
    setPassword('');
    await refresh();
  };

  if (!state) {
    return (
      <div className="app centered">
        <p className="muted">{fatal ?? 'Loading agent…'}</p>
      </div>
    );
  }

  if (!state.configured) {
    return (
      <div className="app centered">
        <div className="card setup-card">
          <div className="brand brand-large">
            <span className="brand-dot" />
            <div>
              <h1>Crewclock</h1>
              <p className="muted">Desktop agent</p>
            </div>
          </div>

          <p className="muted small">
            Sign in, then register this computer as a tracking device. The device token stays on
            this machine and can be revoked from the dashboard.
          </p>

          {!setup ? (
            <form className="form" onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="primary" type="submit" disabled={setupBusy}>
                {setupBusy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <div className="form">
              <div className="signed-in">
                <span className="avatar">{setup.user.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <p className="strong">{setup.user.name}</p>
                  <p className="muted small">{setup.user.email}</p>
                </div>
              </div>

              <label>
                Workspace
                <select
                  value={workspaceId}
                  onChange={(event) => setWorkspaceId(event.target.value)}
                  disabled={setup.workspaces.length === 0}
                >
                  {setup.workspaces.length === 0 ? (
                    <option value="">No member workspaces</option>
                  ) : (
                    setup.workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              {setup.workspaces.length === 0 ? (
                <p className="muted small">
                  Ask a workspace owner to add you as a member before registering a tracking device.
                </p>
              ) : null}

              <label>
                Device name
                <input
                  value={deviceName}
                  onChange={(event) => setDeviceName(event.target.value)}
                  maxLength={100}
                />
              </label>

              <button
                className="primary"
                type="button"
                onClick={() => void handleRegister()}
                disabled={setupBusy || !workspaceId}
              >
                {setupBusy ? 'Registering…' : 'Register this device'}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  setSetup(null);
                  setSetupError(null);
                }}
              >
                Use another account
              </button>
            </div>
          )}

          {setupError ? <p className="error">{setupError}</p> : null}
          <p className="muted tiny">API: {state.apiUrl}</p>
        </div>
      </div>
    );
  }

  const timer = state.timer;
  const pausedTimer = state.pausedTimer;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <p className="strong">Crewclock</p>
            <p className="muted tiny">
              {state.workspaceName ?? 'Workspace'} · {state.device?.name ?? state.deviceName}
            </p>
          </div>
        </div>
        <button className="ghost small-button" type="button" onClick={() => void handleSignOut()}>
          Sign out
        </button>
      </header>

      {timer ? (
        <div className="tracking-banner">
          <span className="pulse" />
          <div className="tracking-copy">
            <p className="strong">Tracking · {timer.projectName}</p>
            <p className="muted tiny">{timer.taskTitle ? `Task: ${timer.taskTitle}` : 'No task'}</p>
            <p className="muted tiny">{timer.description ?? 'No description'}</p>
            <p className="muted tiny">
              {idleSeconds >= 30
                ? `Idle ${formatIdle(idleSeconds)} · auto-pauses at 5m`
                : 'Auto-pauses after 5m idle'}
            </p>
          </div>
          <span className="elapsed">{formatElapsed(timer.startedAt, now)}</span>
        </div>
      ) : pausedTimer ? (
        <div className="paused-banner">
          <span className="paused-dot" />
          <div className="tracking-copy">
            <p className="strong">Paused after idle · {pausedTimer.projectName}</p>
            <p className="muted tiny">
              {pausedTimer.taskTitle ? `Task: ${pausedTimer.taskTitle}` : 'No task'}
            </p>
            <p className="muted tiny">Resume keeps the same project and task.</p>
          </div>
          <div className="queue-actions">
            <button
              className="primary small-button"
              type="button"
              onClick={() => void handleResume()}
            >
              Resume
            </button>
            <button
              className="ghost small-button"
              type="button"
              onClick={() => void handleDiscardPaused()}
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="idle-banner">
          <span className="idle-dot" />
          <span>Idle — tracking is off</span>
        </div>
      )}

      {fatal ? <p className="error">{fatal}</p> : null}
      {state.lastError ? <p className="error">Sync: {state.lastError}</p> : null}
      {timerError ? <p className="error">{timerError}</p> : null}
      {projectsError ? <p className="error">Projects: {projectsError}</p> : null}
      {tasksError ? <p className="error">Tasks: {tasksError}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}

      <main className="content">
        <section className="card">
          <div className="section-head">
            <h2>
              {timer ? 'Current session' : pausedTimer ? 'Paused session' : 'Start a session'}
            </h2>
            {!timer && !pausedTimer ? (
              <button
                className="ghost small-button"
                type="button"
                onClick={() => void loadProjects()}
              >
                Refresh projects
              </button>
            ) : null}
          </div>

          {timer ? (
            <div className="session">
              <p className="muted small">Project</p>
              <p className="strong large">{timer.projectName}</p>
              {timer.taskTitle ? <p className="muted small">Task: {timer.taskTitle}</p> : null}
              <p className="muted small">
                Started {new Date(timer.startedAt).toLocaleTimeString()}
              </p>
              <button
                className="danger"
                type="button"
                onClick={() => void handleStop()}
                disabled={timerBusy}
              >
                {timerBusy ? 'Stopping…' : 'Stop timer'}
              </button>
            </div>
          ) : pausedTimer ? (
            <div className="session">
              <p className="muted small">Project</p>
              <p className="strong large">{pausedTimer.projectName}</p>
              {pausedTimer.taskTitle ? (
                <p className="muted small">Task: {pausedTimer.taskTitle}</p>
              ) : null}
              <p className="muted small">
                Paused at {new Date(pausedTimer.pausedAt).toLocaleTimeString()}
              </p>
              <div className="queue-actions">
                <button className="primary" type="button" onClick={() => void handleResume()}>
                  Resume tracking
                </button>
                <button className="ghost" type="button" onClick={() => void handleDiscardPaused()}>
                  Discard
                </button>
              </div>
            </div>
          ) : (
            <div className="form">
              <label>
                Project
                <select
                  value={projectId}
                  onChange={(event) => {
                    setProjectId(event.target.value);
                    setTaskId('');
                  }}
                  disabled={projects.length === 0}
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label>
                Task
                <select
                  value={taskId}
                  onChange={(event) => setTaskId(event.target.value)}
                  disabled={!projectId || tasks.length === 0}
                >
                  <option value="">No task</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                What are you working on?
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description"
                />
              </label>
              <button
                className="primary"
                type="button"
                onClick={() => void handleStart()}
                disabled={timerBusy || !projectId}
              >
                {timerBusy ? 'Starting…' : 'Start tracking'}
              </button>
            </div>
          )}
        </section>

        <section className="card compact">
          <div>
            <h2>Offline queue</h2>
            <p className="muted small">
              {state.pendingEntries === 0
                ? 'Everything is synced.'
                : `${state.pendingEntries} ${
                    state.pendingEntries === 1 ? 'entry' : 'entries'
                  } waiting to sync.`}
            </p>
            {state.failedEntries > 0 ? (
              <p className="error small">
                {state.failedEntries} rejected {state.failedEntries === 1 ? 'entry' : 'entries'}{' '}
                will not be retried.
              </p>
            ) : null}
          </div>
          <div className="queue-actions">
            <button className="ghost" type="button" onClick={() => void handleSync()}>
              Sync now
            </button>
            {state.failedEntries > 0 ? (
              <button className="ghost" type="button" onClick={() => void handleDiscardFailed()}>
                Discard failed
              </button>
            ) : null}
          </div>
          <p className="muted tiny">Last sync: {formatWhen(state.lastSyncedAt)}</p>
        </section>

        <p className="muted tiny">
          After 5 minutes idle, the agent pauses automatically. It resumes when you return within 10
          minutes; otherwise use Resume to continue the same project and task.
        </p>
      </main>
    </div>
  );
}
