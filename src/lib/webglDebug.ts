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
let probesInstalled = false;

// ONE shared probe canvas for the whole app. Creating a fresh canvas per
// check leaks WebGL contexts (browsers cap them at ~8-16 per page) and can
// evict LIVE effect contexts → dead static canvases on mobile.
let probeCanvas: HTMLCanvasElement | null = null;

function probeSupported(): boolean {
  if (!probeCanvas) probeCanvas = document.createElement("canvas");
  try {
    return Boolean(
      probeCanvas.getContext("webgl2") ||
        probeCanvas.getContext("webgl") ||
        probeCanvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

/**
 * Post-init runtime probes — catches the "init OK, screen goes white later"
 * failure mode:
 *  - webglcontextlost (capture phase; the event never bubbles) on ANY canvas
 *    → console.error the moment a context dies (dead context = white canvas)
 *  - a delayed sweep of every <canvas> on the page → final real sizes (the
 *    immediate post-paint probe can race R3F's first resize, e.g. Beams
 *    300x150 default)
 */
function installRuntimeProbes(): void {
  if (probesInstalled) return;
  probesInstalled = true;

  window.addEventListener(
    "webglcontextlost",
    (e) => {
      const ev = e as WebGLContextEvent;
      const canvas = e.target as HTMLCanvasElement | null;
      debugError("Runtime", "WEBCONTEXT LOST — this canvas turns WHITE/BLANK", {
        statusMessage: ev.statusMessage ?? "",
        canvas: canvas ? `${canvas.width}x${canvas.height}` : "unknown",
      });
    },
    true,
  );
  window.addEventListener(
    "webglcontextrestored",
    () => debugLog("Runtime", "webglcontextrestored — canvas should recover"),
    true,
  );

  // Final canvas sweep after everything has settled.
  window.setTimeout(() => {
    const canvases = Array.from(document.querySelectorAll("canvas"));
    debugLog(
      "Runtime",
      `final canvas sweep — ${canvases.length} canvas element(s) on page`,
      canvases.map((c, i) => {
        const rect = c.getBoundingClientRect();
        return {
          i,
          css: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          buffer: `${c.width}x${c.height}`,
          zero: rect.width < 1 || rect.height < 1,
        };
      }),
    );
  }, 2500);
}

let detailedProbed = false;

/**
 * Runs when the basic probe reports NO support: retries real context creation
 * while capturing the browser's `webglcontextcreationerror` message, so we
 * can tell a hardware/driver limit apart from a detection bug (false negative).
 */
export function logDetailedWebGLProbe(): void {
  if (detailedProbed) return;
  detailedProbed = true;

  const attempts: Array<{ name: string; attrs?: WebGLContextAttributes }> = [
    { name: "webgl2" },
    { name: "webgl" },
    { name: "webgl", attrs: { powerPreference: "high-performance" } },
    { name: "webgl", attrs: { antialias: true, alpha: true } },
    { name: "experimental-webgl" },
  ];

  for (const attempt of attempts) {
    const canvas = document.createElement("canvas");
    let creationError = "";
    const onCreationError = (e: Event) => {
      creationError =
        (e as WebGLContextEvent).statusMessage || "(no statusMessage)";
    };
    canvas.addEventListener("webglcontextcreationerror", onCreationError, false);

    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    let threw: string | null = null;
    try {
      gl = canvas.getContext(
        attempt.name,
        attempt.attrs,
      ) as WebGLRenderingContext | null;
    } catch (err) {
      threw = err instanceof Error ? err.message : String(err);
    }
    canvas.removeEventListener("webglcontextcreationerror", onCreationError);

    if (gl) {
      let renderer: string | "unknown" = "unknown";
      try {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        renderer = dbg
          ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string)
          : (gl.getParameter(gl.RENDERER) as string);
      } catch {
        /* ignore */
      }
      debugLog(
        "WebGLProbe",
        `${attempt.name} SUCCEEDED on retry — basic probe was a FALSE NEGATIVE`,
        { attrs: attempt.attrs ?? {}, renderer },
      );
      return;
    }
    debugError("WebGLProbe", `${attempt.name} context creation FAILED`, {
      attrs: attempt.attrs ?? {},
      browserCreationError: creationError || "(webglcontextcreationerror event did not fire)",
      exception: threw,
    });
  }
  debugError(
    "WebGLProbe",
    "all attempts failed — hardware/driver limit or WebGL blocked",
  );
}

/** Detects real WebGL support and logs it exactly once. */
export function logWebGLSupport(): boolean {
  if (supportLogged) {
    return probeSupported();
  }
  supportLogged = true;
  installRuntimeProbes();

  let webgl2 = false;
  let webgl = false;
  let maxTexture = 0;
  let contextError: string | null = null;
  try {
    if (!probeCanvas) probeCanvas = document.createElement("canvas");
    const gl2 = probeCanvas.getContext("webgl2");
    webgl2 = Boolean(gl2);
    const gl =
      gl2 ||
      (probeCanvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (probeCanvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
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
    debugError(
      "WebGLSupport",
      "NO WEBGL SUPPORT reported — running detailed probe (false-negative test)",
      payload,
    );
    logDetailedWebGLProbe();
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
