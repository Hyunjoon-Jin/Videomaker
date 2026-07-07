import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * Scene 11 — 약속의 8회 말 (10초).
 * 검은 화면 "8회 말" 타이핑(2s) → 일어서는 선수들 → 주먹 인사.
 * 심장박동 비트 시작(사운드) → Scene 12까지 하나의 긴장 곡선.
 */
const TITLE = "8회 말";

export const Scene11Eighth: React.FC = () => {
  const frame = useCurrentFrame();
  const chars = Math.floor(
    interpolate(frame, [10, 45], [0, TITLE.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const showType = frame < 66;
  const typeOut = interpolate(frame, [58, 66], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {frame >= 60 && (
        <AbsoluteFill>
          <Plate
            img="scenes/S11.png"
            label="Scene 11"
            title="약속의 8회 말"
            seconds={10}
          />
          <Scoreboard homeScore={3} awayScore={5} inning="8회 말" />
          <Subtitle
            kind="lower"
            text="약속의 8회 말. 우리가 가장 강해지는 시간입니다."
            appearAt={120}
          />
        </AbsoluteFill>
      )}

      {showType && (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: typeOut,
          }}
        >
          <div
            style={{
              fontFamily: KR_FONT,
              fontSize: 160,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: 8,
            }}
          >
            {TITLE.slice(0, chars)}
            <span style={{ color: COLORS.breakingRed }}>
              {chars < TITLE.length && frame % 16 < 8 ? "_" : ""}
            </span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
