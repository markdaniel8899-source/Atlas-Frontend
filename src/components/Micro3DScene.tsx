import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import type { Group } from "three";

interface Placement {
  key: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  speed: number;
  color: string;
  wire: boolean;
  kind: "box" | "torus" | "ico" | "octa" | "tetra";
}

const PALETTE = ["#9db4ff", "#ffffff", "#6b7fd7", "#c9d4ff", "#4a5fa5"];

function buildPlacements(count: number): Placement[] {
  const out: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 7.13;
    const x = (Math.sin(seed) * 0.5 + 0.5) * 14 - 7;
    const y = (Math.cos(seed * 1.7) * 0.5 + 0.5) * 8 - 4;
    const z = -2 - ((i % 4) * 1.4);
    const kinds: Placement["kind"][] = ["box", "torus", "ico", "octa", "tetra"];
    out.push({
      key: i,
      position: [x, y, z],
      rotation: [seed * 0.4, seed * 0.7, seed * 0.2],
      scale: 0.55 + (i % 5) * 0.22,
      speed: 0.5 + (i % 4) * 0.25,
      color: PALETTE[i % PALETTE.length],
      wire: i % 4 === 3,
      kind: kinds[i % kinds.length],
    });
  }
  return out;
}

function Geometry({ kind }: { kind: Placement["kind"] }) {
  switch (kind) {
    case "box":
      return <boxGeometry args={[0.5, 0.5, 0.5]} />;
    case "torus":
      return <torusGeometry args={[0.4, 0.1, 12, 36]} />;
    case "ico":
      return <icosahedronGeometry args={[0.45, 0]} />;
    case "octa":
      return <octahedronGeometry args={[0.45, 0]} />;
    default:
      return <tetrahedronGeometry args={[0.5, 0]} />;
  }
}

function Scene({ reduced }: { reduced: boolean }) {
  const groupRef = useRef<Group>(null);
  const placements = useMemo(() => buildPlacements(16), []);
  const target = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => {
      scroll.current = window.scrollY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (reduced) return;
    const lerp = Math.min(1, delta * 3);
    g.rotation.y += (target.current.x * 0.18 - g.rotation.y) * lerp;
    g.rotation.x += (-target.current.y * 0.12 - g.rotation.x) * lerp;
    const targetY = scroll.current * 0.0022;
    g.position.y += (targetY - g.position.y) * lerp;
    g.position.x += (target.current.x * 0.35 - g.position.x) * lerp;
  });

  return (
    <group ref={groupRef}>
      {placements.map((p) => (
        <Float
          key={p.key}
          speed={reduced ? 0 : p.speed}
          rotationIntensity={reduced ? 0 : 0.5}
          floatIntensity={reduced ? 0 : 0.7}
        >
          <mesh position={p.position} rotation={p.rotation} scale={p.scale}>
            <Geometry kind={p.kind} />
            {p.wire ? (
              <meshBasicMaterial
                color={p.color}
                wireframe
                transparent
                opacity={0.3}
              />
            ) : (
              <meshStandardMaterial
                color={p.color}
                roughness={0.35}
                metalness={0.15}
                transparent
                opacity={0.75}
              />
            )}
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function Micro3DScene() {
  const reduced = useReducedMotion() ?? false;
  const location = useLocation();
  const [active, setActive] = useState(true);

  useEffect(() => {
    // Run through the route crossfade, then pause while opaque page
    // content covers the scene (only /login shows it at rest).
    setActive(true);
    if (location.pathname === "/login") return;
    const t = window.setTimeout(() => setActive(false), 1500);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    >
      <Canvas
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 9], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 6, 8]} intensity={0.9} />
        <pointLight position={[-6, -3, 4]} intensity={0.5} color="#9db4ff" />
        <Scene reduced={reduced} />
      </Canvas>
    </div>
  );
}
