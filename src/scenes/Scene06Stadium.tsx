import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";

/**
 * Scene 6 — 경기 시작 (5초).
 * 배경: Veo 야간 야구장 드론 부감 하강샷 → 플레이스홀더.
 * 이 씬부터 방송 스코어바 상시 노출(GANGNAM / RIVALS, 0-0, 1회초).
 */
export const Scene06Stadium: React.FC = () => {
  const frame = useCurrentFrame();
  const sbIn = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <Plate img="scenes/S06.png" label="Scene 6" title="경기 시작" seconds={5} live />
      <Scoreboard
        homeScore={0}
        awayScore={0}
        inning="1회 초"
        opacity={sbIn}
      />
    </AbsoluteFill>
  );
};
