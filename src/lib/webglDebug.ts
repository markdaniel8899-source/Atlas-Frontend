/**
 * Mobile/production-safe WebGL diagnostics. All output is prefixed with
 * [WebGLDebug] so it can be filtered in the remote browser console.
 * These logs intentionally run in production builds too — the white-screen
 * issue only reproduces on deployed mobile devices.
 */

const TAG = "[WebGLDebug]";

export function debugLog(scope: string, message: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`${TAG} [${scope}] ${message}`, data);
  } else {
    console.log(`${TAG} [${scope}] ${message}`);
  }
}

export function debugError(scope: string, message: string, data?: unknown) {
  if (data !== undefined) {
    console.error(`${TAG} [${scope}] ${message}`, data);
  } else {
    console.error(`${TAG} [${scope}] ${message}`);
  }
}

let supportLogged = false;

/** Detects real WebGL support and logs it exactly once. */
export function logWebGLSupport(): boolean {
  if (supportLogged) {
    let cached = true;
    try {
      const c = document.createElement("canvas");
      cached = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      cached = false;
    }
    return cached;
  }
  supportLogged = true;

  let webgl2 = false;
  let webgl = false;
  let maxTexture = 0;
  let contextError: string | null = null;
  try {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    webgl2 = Boolean(gl2);
    const gl =
      gl2 ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    webgl = Boolean(gl);
    if (gl) {
      maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    }
  } catch (err) {
    contextError = err instanceof Error ? err.message : String(err);
  }

  const supported = webgl || webgl2;
  const payload = {
    supported,
    webgl,
    webgl2,
    maxTextureSize: maxTexture,
    devicePixelRatio: window.devicePixelRatio,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    contextError,
  };
  if (supported) {
    debugLog("WebGLSupport", "WebGL available", payload);
  } else {
    debugError("WebGLSupport", "NO WEBGL SUPPORT — CSS fallback will render", payload);
  }
  return supported;
}

/**
 * Logs the container's real dimensions plus the computed position/height of
 * the element and its parents (the classic "0-height / static parent" trap).
 * Emits console.error when the box is zero-sized.
 */
export function logContainerHealth(
  scope: string,
  el: HTMLElement | null,
): void {
  if (!el) {
    debugError(scope, "container ref is NULL (component not mounted?)");
    return;
  }

  const rect = el.getBoundingClientRect();
  const zero = rect.width < 1 || rect.height < 1;
  const box = {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    clientWidth: el.clientWidth,
    clientHeight: el.clientHeight,
    top: Math.round(rect.top),
  };
  if (zero) {
    debugError(
      scope,
      "ZERO-SIZE container — WebGL will render a white/blank box",
      box,
    );
  } else {
    debugLog(scope, "container dimensions", box);
  }

  const chain: Array<{
    el: string;
    position: string;
    height: string;
    width: string;
    display: string;
  }> = [];
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
    const cs = getComputedStyle(node);
    chain.push({
      el: depth === 0 ? `${node.tagName.toLowerCase()}.self` : node.tagName.toLowerCase(),
      position: cs.position,
      height: cs.height,
      width: cs.width,
      display: cs.display,
    });
  }
  debugLog(
    scope,
    "computed styles (self → 4 parents): position/height/width/display",
    chain,
  );
}

/** Measures the actual <canvas> after paint; errors when still 0×0. */
export function logCanvasSize(scope: string, root: HTMLElement | null): void {
  if (!root) return;
  requestAnimationFrame(() => {
    const canvas = root.querySelector("canvas");
    if (!canvas) {
      debugError(scope, "no <canvas> element found inside container");
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      debugError(scope, "<canvas> has ZERO size", {
        width: rect.width,
        height: rect.height,
        cssWidth: canvas.style.width,
        cssHeight: canvas.style.height,
      });
    } else {
      debugLog(scope, "<canvas> size after paint", {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bufferWidth: canvas.width,
        bufferHeight: canvas.height,
      });
    }
  });
}
