import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Placeholder } from "../components/Placeholder";
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
      <Placeholder
        label="Scene 6"
        title="경기 시작"
        seconds={5}
        tone="field"
        note="Veo 야간 만원 야구장 드론 부감 하강샷 · 하강 모션 4~5초 사용 · 웅장한 브라스 + 관중 함성."
      />
      <Scoreboard
        homeScore={0}
        awayScore={0}
        inning="1회 초"
        opacity={sbIn}
      />
    </AbsoluteFill>
  );
};
