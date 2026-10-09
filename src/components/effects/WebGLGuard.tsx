import { Component, useEffect, useRef, useState } from "react";
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

/** Effect variant label — used only for diagnostics logs. */
export type FallbackVariant =
  | "beams"
  | "molten"
  | "laser"
  | "dither"
  | "ferro"
  | "siderays"
  | "pillar";

/**
 * The ONLY safety-net background: a solid dark box. Rendered exclusively
 * when a WebGL context genuinely fails to initialize (or dies mid-session) —
 * no animated CSS gradients, no shader stand-ins.
 */
export function SolidDarkBackground({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        background: "#000000",
        pointerEvents: "none",
      }}
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
 * Catches errors thrown while mounting/rendering a WebGL effect (context
 * creation failure, shader compile crash, etc.), logs it, and swaps in a
 * solid dark background instead of leaving a white screen (or unmounting
 * the whole React tree). Dev builds also show an error chip.
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
      "WebGL effect threw — rendering solid dark background",
      { error: error.message, stack: error.stack, componentStack: info.componentStack },
    );
  }

  render() {
    if (this.state.failed) {
      return (
        <>
          {this.props.fallback ?? <SolidDarkBackground />}
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
 * Safety net around a REAL WebGL effect. The effect mounts on every device
 * (desktop and mobile alike) — nothing is hidden, nothing degrades to CSS.
 *
 *  - React errors during mount/render (context creation failure, shader
 *    crash) are caught by the ErrorBoundary → solid dark background.
 *  - `webglcontextlost` never throws and never bubbles, so a capture-phase
 *    window listener watches this wrapper's subtree and swaps to the solid
 *    dark background the moment a canvas's context dies mid-session
 *    (prevents the classic white/blank canvas).
 */
export function withWebGLFallback<P extends object>(
  Component: ComponentType<P>,
  variant?: FallbackVariant,
) {
  const name = `withWebGLFallback(${Component.displayName || Component.name || "Component"})`;

  function Wrapped(props: P) {
    const [webgl] = useState(isWebGLSupported);
    const [contextLost, setContextLost] = useState(false);
    const hostRef = useRef<HTMLDivElement>(null);

    // webglcontextlost never bubbles — capture on window, then check whether
    // the dying canvas lives inside THIS wrapper's subtree (other sections'
    // canvases are ignored by the contains() check).
    useEffect(() => {
      const onContextLost = (e: Event) => {
        const canvas = e.target as HTMLCanvasElement | null;
        if (canvas && hostRef.current?.contains(canvas)) {
          debugError(name, "webglcontextlost inside subtree — solid dark background", {
            variant: variant ?? "none",
          });
          setContextLost(true);
        }
      };
      window.addEventListener("webglcontextlost", onContextLost, true);
      return () =>
        window.removeEventListener("webglcontextlost", onContextLost, true);
    }, []);

    useEffect(() => {
      debugLog(name, "mounted — real WebGL effect", {
        variant: variant ?? "none",
        webgl,
      });
    }, [webgl, variant]);

    if (contextLost) {
      return (
        <div ref={hostRef} style={{ display: "contents" }}>
          <SolidDarkBackground />
        </div>
      );
    }

    return (
      <div ref={hostRef} style={{ display: "contents" }}>
        <WebGLErrorBoundary>
          <Component {...props} />
        </WebGLErrorBoundary>
      </div>
    );
  }
  Wrapped.displayName = name;
  return Wrapped;
}
