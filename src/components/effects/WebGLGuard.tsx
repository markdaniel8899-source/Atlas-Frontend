import { Component, useEffect, useState } from "react";
import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { isMobile } from "../../lib/mobile";
import "./WebGLGuard.css";

/** True when the browser can create a WebGL context at all. */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

/** Reactive mobile check (re-evaluates on resize/orientation change). */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(isMobile);
  useEffect(() => {
    const onChange = () =>
      setMobile((prev) => {
        const next = isMobile();
        return next === prev ? prev : next;
      });
    window.addEventListener("resize", onChange, { passive: true });
    return () => window.removeEventListener("resize", onChange);
  }, []);
  return mobile;
}

/**
 * Lightweight animated-gradient stand-in rendered when WebGL is unavailable
 * or an effect crashes. Palette matches the app's void/indigo/lilac theme.
 */
export function CssFallbackBackground({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`webgl-fallback ${className}`.trim()}
      style={{ mixBlendMode: "screen" }}
    />
  );
}

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

/**
 * Catches any error thrown while mounting/rendering a WebGL effect and swaps
 * it for the CSS fallback instead of unmounting the whole React tree.
 */
export class WebGLErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("WebGL effect failed; showing CSS fallback.", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? <CssFallbackBackground />;
    }
    return this.props.children;
  }
}

/**
 * Wraps a WebGL-dependent component so it degrades to the CSS fallback.
 * On mobile (UA or ≤768px viewport) or when WebGL is unavailable, the
 * effect never mounts at all — the animated CSS gradient renders instead,
 * so a failed shader can never leave a white section behind.
 */
export function withWebGLFallback<P extends object>(Component: ComponentType<P>) {
  function Wrapped(props: P) {
    const mobile = useIsMobile();
    const [webgl] = useState(isWebGLSupported);
    if (mobile || !webgl) {
      return <CssFallbackBackground />;
    }
    return (
      <WebGLErrorBoundary>
        <Component {...props} />
      </WebGLErrorBoundary>
    );
  }
  Wrapped.displayName = `withWebGLFallback(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
}
