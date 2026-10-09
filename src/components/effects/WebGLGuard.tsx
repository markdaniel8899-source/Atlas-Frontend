import { Component, useEffect, useRef, useState } from "react";
import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { isMobile } from "../../lib/mobile";
import {
  debugLog,
  debugError,
  logWebGLSupport,
  isLowEndWebGLDevice,
} from "../../lib/webglDebug";
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
 * and swaps in the CSS fallback instead of leaving a white screen (or
 * unmounting the whole React tree). Dev builds also show an error chip.
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
      "WebGL effect threw — rendering CSS fallback",
      { error: error.message, stack: error.stack, componentStack: info.componentStack },
    );
  }

  render() {
    if (this.state.failed) {
      return (
        <>
          {this.props.fallback ?? <CssFallbackBackground />}
          {import.meta.env.DEV && (
            <div role="alert" className="webgl-debug-error">
              WebGL error: {this.state.message}
            </div>
          )}
        </>
      );
    }
    return this.props.children;
  }
}

/**
 * Wraps a WebGL-dependent component with two safety layers:
 *
 *  1. LOW-END GATE — budget devices (≤2 GB memory) and software-only GPUs
 *     (SwiftShader / llvmpipe) never mount the effect at all: heavy
 *     full-screen shaders overflow mediump precision or evict GPU contexts
 *     there, turning the canvas WHITE and washing out the whole section.
 *     They get the palette-matched CSS gradient fallback instead.
 *  2. RUNTIME SWAP — `webglcontextlost` does not throw, so the
 *     ErrorBoundary can never see it; a context that dies mid-session would
 *     leave a permanent white canvas. A capture-phase listener watches for
 *     context loss inside this wrapper's subtree and swaps in the CSS
 *     fallback the moment it happens.
 *
 * The effect still mounts when the basic support probe is unsure (mobile
 * false-negative history) — the ErrorBoundary stays as the last resort.
 */
export function withWebGLFallback<P extends object>(
  Component: ComponentType<P>,
  variant?: FallbackVariant,
) {
  const name = `withWebGLFallback(${Component.displayName || Component.name || "Component"})`;

  function Wrapped(props: P) {
    const [webgl] = useState(isWebGLSupported);
    const [lowEnd] = useState(isLowEndWebGLDevice);
    const [ctxLost, setCtxLost] = useState(false);
    const hostRef = useRef<HTMLDivElement>(null);

    // webglcontextlost never bubbles — capture on window, then check whether
    // the dying canvas lives inside THIS wrapper's subtree.
    useEffect(() => {
      const onContextLost = (e: Event) => {
        const canvas = e.target as HTMLCanvasElement | null;
        if (canvas && hostRef.current?.contains(canvas)) {
          debugError(
            name,
            "webglcontextlost inside this effect — swapping white canvas for CSS fallback",
            { variant: variant ?? "none" },
          );
          setCtxLost(true);
        }
      };
      window.addEventListener("webglcontextlost", onContextLost, true);
      return () =>
        window.removeEventListener("webglcontextlost", onContextLost, true);
    }, []);

    useEffect(() => {
      debugLog(
        name,
        lowEnd
          ? "mounted — LOW-END/SOFTWARE GPU detected, rendering CSS fallback"
          : `mounted — WebGL support: ${webgl}, rendering real effect`,
        { variant: variant ?? "none", ctxLost },
      );
    }, [webgl, variant, lowEnd, ctxLost]);

    if (lowEnd || ctxLost) {
      return <CssFallbackBackground variant={variant} />;
    }

    return (
      <div ref={hostRef} style={{ display: "contents" }}>
        <WebGLErrorBoundary
          fallback={<CssFallbackBackground variant={variant} />}
        >
          <Component {...props} />
        </WebGLErrorBoundary>
      </div>
    );
  }
  Wrapped.displayName = name;
  return Wrapped;
}
