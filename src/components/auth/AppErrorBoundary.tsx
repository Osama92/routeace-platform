import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Global Error Boundary - catches all unhandled React render errors.
 * Prevents blank screens; shows structured recovery UI.
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[AppErrorBoundary] Caught error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, retryCount: s.retryCount + 1 }));
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm">
              The system encountered an unexpected error. Your session is safe.
            </p>
            {this.state.error && (
              <p className="mt-3 text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 font-mono text-left truncate">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={this.handleGoHome}>
              Return to Home
            </Button>
          </div>
          {this.state.retryCount >= 2 && (
            <p className="text-xs text-muted-foreground">
              Persistent error detected. Please refresh the page or{" "}
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = "/auth";
                }}
                className="text-primary hover:underline"
              >
                clear session and re-login
              </button>
              .
            </p>
          )}
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
