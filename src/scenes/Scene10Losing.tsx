import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 10 — 그러나… 뒤지는 스코어 (10초).
 * 침묵하는 덕아웃/관중석 → 스코어바 확대 애니메이션으로 RIVALS 리드 노출.
 * 이 씬만 채도를 확 빼서 침체 강조.
 */
export const Scene10Losing: React.FC = () => {
  const frame = useCurrentFrame();

  // 채도 -20 느낌
  const desat = interpolate(frame, [0, 30], [1, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: `saturate(${desat}) brightness(0.9)` }}>
        <Plate
          img="scenes/S10.png"
          label="Scene 10"
          title="뒤지는 스코어"
          seconds={10}
          live
        />
      </AbsoluteFill>
      <Scoreboard
        homeScore={3}
        awayScore={5}
        inning="7회 초"
        count={{ balls: 0, strikes: 0, outs: 2 }}
        emphasize
      />
      <Subtitle
        kind="lower"
        text="하지만 경기는… 아직 우리의 것이 아닙니다."
        appearAt={120}
      />
    </AbsoluteFill>
  );
};
