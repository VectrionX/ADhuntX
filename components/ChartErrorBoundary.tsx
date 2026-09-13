import React from 'react';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

export class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false };
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) {
      return (this as unknown as { props: ChartErrorBoundaryProps }).props.children;
    }

    return (
      <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-sm text-red-200">
        <p className="font-semibold">Dashboard charts could not be loaded.</p>
        <p className="mt-2 text-red-300/80">Reload the application to retry the chart download. Imported data will need to be loaded again.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-semibold text-red-100 hover:bg-red-500/20"
        >
          Reload application
        </button>
      </div>
    );
  }
}