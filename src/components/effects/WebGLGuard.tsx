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
 * Lightweight animated stand-in rendered when WebGL is unavailable,
 * unsupported, or the device is mobile. Each variant mirrors the exact
 * palette of the desktop shader it replaces (see WebGLGuard.css).
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
 * Wraps a WebGL-dependent component so it degrades to a palette-matched
 * CSS fallback. On mobile (UA or ≤768px viewport) or when WebGL is
 * unavailable, the effect never mounts — the animated gradient renders
 * instead, so a failed shader can never leave a white section behind.
 */
export function withWebGLFallback<P extends object>(
  Component: ComponentType<P>,
  variant?: FallbackVariant,
) {
  function Wrapped(props: P) {
    const mobile = useIsMobile();
    const [webgl] = useState(isWebGLSupported);
    if (mobile || !webgl) {
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
