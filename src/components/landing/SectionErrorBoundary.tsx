import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Keeps a single landing section from unmounting the whole page.
 * The fallback keeps the same z-index + background as the section it
 * replaces so the stacked curtain scroll keeps working.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative z-[2] flex min-h-[50vh] w-full items-center justify-center bg-[#04040a] px-6 py-16 shadow-[0_-40px_80px_-20px_rgba(0,0,0,0.75)]">
          <p className="text-sm text-white/60">
            Something went wrong in this section.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
