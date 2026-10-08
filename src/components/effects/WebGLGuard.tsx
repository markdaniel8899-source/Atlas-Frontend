import { Component, useEffect, useState } from "react";
import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { isMobile } from "../../lib/mobile";
import { debugLog, debugError, logWebGLSupport } from "../../lib/webglDebug";
import "./WebGLGuard.css";

/** True when the browser can create a WebGL context at all (logged once). */
export function isWebGLSupported(): boolean {
  return logWebGLSupport();
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

/** Per-effect fallback variants — gradients use each effect's exact colors. */
export type FallbackVariant =
  | "beams"
  | "molten"
  | "laser"
  | "dither"
  | "ferro"
  | "siderays"
  | "pillar";

/**
 * Animated stand-in rendered only when WebGL is unsupported or an effect
 * crashes. Each variant mirrors the exact palette of the desktop shader it
 * replaces (see WebGLGuard.css).
 */
export function CssFallbackBackground({
  className = "",
  variant,
}: {
  className?: string;
  variant?: FallbackVariant;
}) {
  const variantClass = variant ? ` webgl-fallback--${variant}` : "";
  return (
    <div
      aria-hidden="true"
      className={`webgl-fallback${variantClass} ${className}`.trim()}
    />
  );
}

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface BoundaryState {
  failed: boolean;
  message: string;
}

/**
 * Catches any error thrown while mounting/rendering a WebGL effect, logs it,
 * and swaps in the CSS fallback plus a VISIBLE error chip instead of leaving
 * a white screen (or unmounting the whole React tree).
 */
export class WebGLErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, message: "" };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      failed: true,
      message: `${error.name}: ${error.message}`,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    debugError(
      "ErrorBoundary",
      "WebGL effect threw — rendering CSS fallback + visible error chip",
      { error: error.message, stack: error.stack, componentStack: info.componentStack },
    );
  }

  render() {
    if (this.state.failed) {
      return (
        <>
          {this.props.fallback ?? <CssFallbackBackground />}
          <div role="alert" className="webgl-debug-error">
            WebGL error: {this.state.message}
          </div>
        </>
      );
    }
    return this.props.children;
  }
}

/**
 * Wraps a WebGL-dependent component. The effect ALWAYS renders (desktop and
 * mobile alike); the guard only catches runtime failures (context loss,
 * shader errors) and devices without any WebGL support, degrading to the
 * palette-matched CSS gradient instead of crashing the section.
 */
export function withWebGLFallback<P extends object>(
  Component: ComponentType<P>,
  variant?: FallbackVariant,
) {
  function Wrapped(props: P) {
    const [webgl] = useState(isWebGLSupported);
    useEffect(() => {
      debugLog(
        `withWebGLFallback(${Component.displayName || Component.name || "Component"})`,
        webgl ? "mounted — WebGL supported, effect will render" : "mounted — NO WebGL, rendering CSS fallback",
      );
    }, [webgl]);
    if (!webgl) {
      return <CssFallbackBackground variant={variant} />;
    }
    return (
      <WebGLErrorBoundary fallback={<CssFallbackBackground variant={variant} />}>
        <Component {...props} />
      </WebGLErrorBoundary>
    );
  }
  Wrapped.displayName = `withWebGLFallback(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
}
