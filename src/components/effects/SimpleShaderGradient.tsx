import { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh } from "ogl";
import { debugLog, debugError } from "../../lib/webglDebug";
import type { FallbackVariant } from "./WebGLGuard";

/**
 * Ultra-light gradient shader for devices where the heavy effects cannot
 * run (low-end GPUs, software rasterizers, lost contexts). One fullscreen
 * triangle, one draw call, mediump precision, no textures/FBOs/loops — the
 * cheapest thing a WebGL context can do, so it survives where the cinematic
 * shaders white out. Uses the same per-variant palette as the CSS fallback.
 */

type RGB = [number, number, number];

const rgb = (hexColor: string, intensity = 1): RGB => {
  const n = parseInt(hexColor.replace("#", ""), 16);
  return [
    (((n >> 16) & 255) / 255) * intensity,
    (((n >> 8) & 255) / 255) * intensity,
    ((n & 255) / 255) * intensity,
  ];
};

const PALETTES: Record<
  FallbackVariant | "default",
  { base: RGB; a: RGB; b: RGB; c: RGB; beam?: number }
> = {
  default: {
    base: rgb("#030305"),
    a: rgb("#5227ff", 0.7),
    b: rgb("#cf9eff", 0.4),
    c: rgb("#ff9ffc", 0.3),
  },
  beams: {
    base: rgb("#04040a"),
    a: rgb("#cf9eff", 0.45),
    b: rgb("#4044cc", 0.5),
    c: rgb("#cf9eff", 0.25),
  },
  molten: {
    base: rgb("#030308"),
    a: rgb("#4044cc", 0.65),
    b: rgb("#cf9eff", 0.35),
    c: rgb("#160c46", 1),
  },
  laser: {
    base: rgb("#030305"),
    a: rgb("#cf9eff", 0.75),
    b: rgb("#cf9eff", 0.5),
    c: rgb("#cf9eff", 0.38),
    beam: 1,
  },
  dither: {
    base: rgb("#120f17"),
    a: rgb("#f4f1ea", 0.2),
    b: rgb("#a78bfa", 0.38),
    c: rgb("#f4f1ea", 0.12),
  },
  ferro: {
    base: rgb("#04040a"),
    a: rgb("#cf9eff", 0.55),
    b: rgb("#cf9eff", 0.32),
    c: rgb("#cf9eff", 0.22),
  },
  siderays: {
    base: rgb("#030305"),
    a: rgb("#cf9eff", 0.45),
    b: rgb("#96c8ff", 0.38),
    c: rgb("#cf9eff", 0.22),
  },
  pillar: {
    base: rgb("#030305"),
    a: rgb("#5227ff", 0.65),
    b: rgb("#ff9ffc", 0.5),
    c: rgb("#5227ff", 0.3),
  },
};

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// mediump only (old Mali/Adreno fragment shaders default to mediump and
// choke on highp). Squared distances + 1/(1+d) falloff — no sqrt, no
// smoothstep, no loops. All intermediate values stay well under 2.0.
// Blob positions oscillate on integer multiples of uPhase so the loop
// wraps seamlessly; uPhase itself stays in [0, 2π) where mediump sin/cos
// is accurate on every GPU (large args = step/line artifacts on old ones).
const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform float uPhase;
uniform float uAspect;
uniform float uBeam;
uniform vec3 uBase;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
void main() {
  vec2 uv = vUv;
  float p = uPhase;
  // uBeam=0: scattered aurora blobs. uBeam=1: soft vertical beam column
  // (the hero's LaserFlow slot is a tall narrow box — scattered blobs
  // would sit almost entirely outside the visible viewport there).
  vec2 c1 = mix(
    vec2(0.24 + 0.05 * sin(p), 0.28 + 0.04 * cos(p)),
    vec2(0.50, 0.16),
    uBeam
  );
  vec2 c2 = mix(
    vec2(0.78 + 0.04 * cos(2.0 * p), 0.20 + 0.05 * sin(2.0 * p)),
    vec2(0.50 + 0.02 * sin(2.0 * p), 0.50),
    uBeam
  );
  vec2 c3 = mix(
    vec2(0.58 + 0.04 * sin(3.0 * p), 0.80 + 0.04 * cos(3.0 * p)),
    vec2(0.50, 0.84),
    uBeam
  );
  // Beam mode squeezes the blobs horizontally into a column.
  float fx = 1.0 + 1.6 * uBeam;
  vec2 da = vec2((uv.x - c1.x) * uAspect * fx, uv.y - c1.y);
  vec2 db = vec2((uv.x - c2.x) * uAspect * fx, uv.y - c2.y);
  vec2 dc = vec2((uv.x - c3.x) * uAspect * fx, uv.y - c3.y);
  vec3 col = uBase;
  col += uA / (1.0 + dot(da, da) * 9.0);
  col += uB / (1.0 + dot(db, db) * 11.0);
  col += uC / (1.0 + dot(dc, dc) * 10.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function SimpleShaderGradient({
  variant,
  onDead,
}: {
  variant?: FallbackVariant;
  /** Called when this shader cannot start or its context dies — caller should degrade to CSS. */
  onDead?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onDeadRef = useRef(onDead);
  onDeadRef.current = onDead;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let raf = 0;
    let cleanup: (() => void) | null = null;

    try {
      const palette = PALETTES[variant ?? "default"];
      const renderer = new Renderer({
        dpr: 1,
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
      const gl = renderer.gl;
      const canvas = gl.canvas;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      host.appendChild(canvas);

      const uniforms = {
        uPhase: { value: 0 },
        uAspect: { value: 1 },
        uBeam: { value: palette.beam ?? 0 },
        uBase: { value: palette.base },
        uA: { value: palette.a },
        uB: { value: palette.b },
        uC: { value: palette.c },
      };

      const geometry = new Triangle(gl);
      const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms });
      const mesh = new Mesh(gl, { geometry, program });

      const onCtxLost = (e: Event) => {
        e.preventDefault();
        debugError("SimpleShaderGradient", "context lost — degrade to CSS");
        onDeadRef.current?.();
      };
      canvas.addEventListener("webglcontextlost", onCtxLost, false);

      const updateSize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h);
        uniforms.uAspect.value = w / Math.max(1, h);
      };
      updateSize();
      const ro = new ResizeObserver(updateSize);
      ro.observe(host);

      const loop = (t: number) => {
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        // Phase stays in [0, 2π): seamless loop AND mediump-safe (old GPUs
        // produce step/line artifacts from sin/cos of large arguments).
        uniforms.uPhase.value = (t * 0.0001) % (Math.PI * 2);
        try {
          renderer.render({ scene: mesh });
        } catch (err) {
          debugError("SimpleShaderGradient", "render threw — degrade to CSS", err);
          cancelAnimationFrame(raf);
          onDeadRef.current?.();
        }
      };
      raf = requestAnimationFrame(loop);
      debugLog("SimpleShaderGradient", "mounted", { variant: variant ?? "default" });

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener("webglcontextlost", onCtxLost);
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
          /* ignore */
        }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };
    } catch (err) {
      debugError("SimpleShaderGradient", "init failed — degrade to CSS", err);
      onDeadRef.current?.();
    }

    return () => {
      cleanup?.();
    };
  }, [variant]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    />
  );
}
