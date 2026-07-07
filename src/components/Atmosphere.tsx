import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, random } from "remotion";

/**
 * 시네마틱 분위기 레이어 — 정지 이미지에 생명감.
 * 느리게 떠다니는 먼지/빛 입자 + 미세한 빛 플리커. 결정론적(렌더 재현).
 */
export interface AtmosphereProps {
  count?: number;
  tone?: "warm" | "cool" | "white";
  intensity?: number; // 0~1
}

const toneColor: Record<string, string> = {
  warm: "255,214,150",
  cool: "150,190,255",
  white: "255,255,255",
};

export const Atmosphere: React.FC<AtmosphereProps> = ({
  count = 34,
  tone = "white",
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const rgb = toneColor[tone];

  const motes = Array.from({ length: count }).map((_, i) => {
    const seedX = random(`ax-${i}`);
    const seedY = random(`ay-${i}`);
    const size = 2 + random(`as-${i}`) * 6;
    const speed = 0.15 + random(`av-${i}`) * 0.5;
    // 위로 천천히 떠오르며 좌우로 미세하게 흔들림
    const rise = ((seedY + (frame / durationInFrames) * speed) % 1.15) - 0.075;
    const sway = Math.sin((frame / 40) + i) * 0.6;
    const x = seedX * 100 + sway;
    const y = (1 - rise) * 100;
    const twinkle =
      0.15 + Math.abs(Math.sin(frame / 18 + i * 1.3)) * 0.55;
    return { x, y, size, o: twinkle };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {motes.map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: m.size,
            height: m.size,
            borderRadius: "50%",
            background: `rgba(${rgb},${m.o * intensity})`,
            filter: "blur(0.6px)",
            boxShadow: `0 0 ${m.size * 2}px rgba(${rgb},${m.o * 0.4 * intensity})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
