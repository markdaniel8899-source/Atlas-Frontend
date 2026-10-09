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
import { SimpleShaderGradient } from "./SimpleShaderGradient";

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
 * Wraps a WebGL-dependent component in a three-tier degradation ladder so
 * a section NEVER shows a white canvas:
 *
 *   1. HEAVY   — the real cinematic effect (desktop / capable GPUs).
 *   2. SIMPLE  — SimpleShaderGradient: a tiny mediump-safe gradient shader
 *               that runs even on low-end and software GPUs. Used when the
 *               device is detected as low-end up front, when the heavy
 *               effect throws, or when its context is lost mid-session.
 *   3. CSS     — the palette-matched static gradient, for devices where no
 *               WebGL context can be created at all.
 *
 * `webglcontextlost` never throws, so the ErrorBoundary alone can't see a
 * dead (white) canvas — a capture-phase window listener watches every canvas
 * inside this wrapper's subtree and steps the ladder down the moment one dies.
 */
export function withWebGLFallback<P extends object>(
  Component: ComponentType<P>,
  variant?: FallbackVariant,
) {
  const name = `withWebGLFallback(${Component.displayName || Component.name || "Component"})`;

  type Phase = "heavy" | "simple" | "css";

  function Wrapped(props: P) {
    const [webgl] = useState(isWebGLSupported);
    // Low-end / software-GPU devices start at the simple gradient shader.
    const [phase, setPhase] = useState<Phase>(() =>
      isLowEndWebGLDevice() ? "simple" : "heavy",
    );
    const hostRef = useRef<HTMLDivElement>(null);

    // webglcontextlost never bubbles — capture on window, then check whether
    // the dying canvas lives inside THIS wrapper's subtree (probe canvases
    // and other sections' canvases are ignored by the contains() check).
    useEffect(() => {
      const onContextLost = (e: Event) => {
        const canvas = e.target as HTMLCanvasElement | null;
        if (canvas && hostRef.current?.contains(canvas)) {
          debugError(name, "webglcontextlost inside subtree — stepping down", {
            variant: variant ?? "none",
          });
          setPhase((p) => (p === "heavy" ? "simple" : "css"));
        }
      };
      window.addEventListener("webglcontextlost", onContextLost, true);
      return () =>
        window.removeEventListener("webglcontextlost", onContextLost, true);
    }, []);

    useEffect(() => {
      debugLog(name, `mounted — phase: ${phase}`, {
        variant: variant ?? "none",
        webgl,
      });
    }, [webgl, variant, phase]);

    return (
      <div ref={hostRef} style={{ display: "contents" }}>
        {phase === "css" ? (
          <CssFallbackBackground variant={variant} />
        ) : phase === "simple" ? (
          <SimpleShaderGradient
            variant={variant}
            onDead={() => setPhase("css")}
          />
        ) : (
          <WebGLErrorBoundary
            fallback={
              <SimpleShaderGradient
                variant={variant}
                onDead={() => setPhase("css")}
              />
            }
          >
            <Component {...props} />
          </WebGLErrorBoundary>
        )}
      </div>
    );
  }
  Wrapped.displayName = name;
  return Wrapped;
}
