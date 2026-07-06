import * as React from 'react';
import { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { reportError } from '../services/analytics';
import { mapError } from '../lib/errorMapper';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    reportError(error, 'ErrorBoundary:Uncaught');
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Attempt state recovery, if it fails again it will re-trigger
  };

  public render() {
    const { children } = this.props;
    if (this.state.hasError) {
      const errorMessage = mapError(this.state.error);

      return (
        <div className="w-full min-h-[450px] flex items-center justify-center p-6 bg-transparent select-none">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-black/5 p-8 text-center flex flex-col items-center space-y-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Something went wrong</h2>
              <p className="text-gray-500 font-medium text-sm leading-relaxed">{errorMessage}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-black uppercase tracking-wider rounded-xl text-white bg-[#6334FD] hover:bg-[#6334FD]/90 active:scale-95 transition-all shadow-lg shadow-indigo-100 cursor-pointer"
              >
                <RefreshCcw className="h-4 w-4 animate-spin-slow" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-black uppercase tracking-wider rounded-xl text-gray-700 bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all border border-gray-100 cursor-pointer"
              >
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
