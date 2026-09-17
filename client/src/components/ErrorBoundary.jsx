import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4 py-16 text-white">
          <div className="glass-panel relative mx-auto max-w-lg rounded-3xl p-8 text-center sm:p-10 border border-white/10 shadow-2xl">
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-red-500/15 blur-3xl" />
            <p className="text-xs font-black uppercase tracking-[0.25em] text-narmax-red">Error Encountered</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Something went wrong</h1>
            <p className="mt-4 text-sm text-zinc-400">
              An unexpected issue occurred while rendering this page. You can reload or return to the home screen.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl bg-narmax-cyan px-6 py-2.5 text-sm font-black text-black transition hover:brightness-110 shadow-lg shadow-cyan-500/20"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
