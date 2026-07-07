import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * Scene 9 — 삼진: 연속 수주 행진 (10초).
 * 투구→미트 임팩트+헛스윙 반복. K 마크가 하나씩 쌓이는 그래픽(실제 구현).
 */
const K_AT = [40, 95, 150, 205]; // K 누적 프레임

export const Scene09Strikeout: React.FC = () => {
  const frame = useCurrentFrame();
  const kCount = K_AT.filter((f) => frame >= f).length;

  return (
    <AbsoluteFill>
      <Plate img="scenes/S09.png" label="Scene 9" title="삼진 · 연속 수주" seconds={10} />

      {/* 관중 K 팻말 문법 — 누적 K 마크 */}
      <div
        style={{
          position: "absolute",
          top: 180,
          right: 90,
          display: "flex",
          gap: 16,
          fontFamily: KR_FONT,
        }}
      >
        {K_AT.map((_, i) => (
          <div
            key={i}
            style={{
              width: 76,
              height: 96,
              borderRadius: 10,
              background: i < kCount ? COLORS.amberCaption : "rgba(255,255,255,0.08)",
              color: i < kCount ? "#111" : "rgba(255,255,255,0.25)",
              border: "3px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              fontWeight: 900,
              transform: i < kCount ? "scale(1)" : "scale(0.86)",
              transition: "all 0.2s",
              boxShadow: i < kCount ? "0 0 24px rgba(246,196,69,0.55)" : "none",
            }}
          >
            K
          </div>
        ))}
      </div>

      <Scoreboard homeScore={3} awayScore={0} inning="6회 말" />
      <Subtitle kind="lower" text="연속 수주 행진 — 상대 타선 침묵!" appearAt={200} />
    </AbsoluteFill>
  );
};
