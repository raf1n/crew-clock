import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Renderer error', error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="app centered">
          <div className="card">
            <h1>Something went wrong</h1>
            <p className="muted small">{this.state.error.message}</p>
            <button className="primary" type="button" onClick={() => window.location.reload()}>
              Reload agent
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
