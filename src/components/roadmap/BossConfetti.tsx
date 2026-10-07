import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = [
  "#ff5fa2",
  "#a855f7",
  "#22d3ee",
  "#34d399",
  "#fde047",
  "#fb7185",
  "#60a5fa",
];

const COUNT = 34;

interface Piece {
  id: number;
  x: number;
  y: number;
  color: string;
  rotate: number;
  delay: number;
  round: boolean;
}

/** One-shot confetti burst shown when a Boss Level is completed. */
export function BossConfetti() {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: COUNT }, (_, index) => {
        const angle = (index / COUNT) * Math.PI * 2 + (index % 4) * 0.17;
        const distance = 130 + ((index * 53) % 190);
        return {
          id: index,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 80,
          color: COLORS[index % COLORS.length],
          rotate: 180 + ((index * 61) % 360),
          delay: (index % 6) * 0.035,
          round: index % 3 !== 0,
        };
      }),
    [],
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] grid place-items-center overflow-hidden"
    >
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: piece.x,
            y: [0, piece.y - 60, piece.y + 40],
            opacity: [0, 1, 1, 0],
            scale: 1,
            rotate: piece.rotate,
          }}
          transition={{ duration: 1.7, delay: piece.delay, ease: "easeOut" }}
          className="absolute"
          style={{
            background: piece.color,
            width: piece.round ? 10 : 7,
            height: piece.round ? 10 : 16,
            borderRadius: piece.round ? 9999 : 3,
            boxShadow: `0 0 12px ${piece.color}80`,
          }}
        />
      ))}
    </div>
  );
}
