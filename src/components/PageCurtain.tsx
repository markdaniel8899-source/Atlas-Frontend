import type { AnchorHTMLAttributes } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { doubleCurtainNavigate } from "./DoubleCurtain";

/**
 * Every in-app navigation runs through the double curtain: two panels close
 * over the screen, the route swaps underneath, then they part again. One
 * animation, both directions — the single-panel curtain is gone.
 *
 * The reveal is driven by the route AnimatePresence's onExitComplete (wired
 * in App.tsx), with a fixed fallback in DoubleCurtain for navigations that
 * don't remount the route tree (same route group).
 */
export function curtainNavigate(
  navigate: NavigateFunction,
  to: string,
  opts?: { replace?: boolean },
): void {
  doubleCurtainNavigate(navigate, to, opts);
}

/**
 * Crawlable `<a href>` that plays the curtain before navigating (plain left
 * clicks only; modified clicks keep the browser default).
 */
export function CurtainLink({
  to,
  className,
  children,
  ...rest
}: {
  to: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const navigate = useNavigate();

  return (
    <a
      href={to}
      className={className}
      {...rest}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        curtainNavigate(navigate, to);
      }}
    >
      {children}
    </a>
  );
}
