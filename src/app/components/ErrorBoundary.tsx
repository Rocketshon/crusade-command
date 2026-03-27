import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="text-5xl mb-2">x</div>
            <h1 className="text-2xl font-bold text-stone-100 tracking-wide">
              Something went wrong
            </h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-3 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold hover:bg-emerald-500/20 transition-colors"
              >
                Reload App
              </button>
              <button
                onClick={this.handleClearAndReload}
                className="w-full px-4 py-3 rounded border border-red-500/40 bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 transition-colors"
              >
                Clear Data &amp; Reload
              </button>
            </div>
            <p className="text-stone-600 text-xs">
              If the problem persists after reloading, try clearing data to reset the app.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
