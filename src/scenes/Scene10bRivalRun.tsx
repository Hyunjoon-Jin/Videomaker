import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 10B — 상대의 반격 (6초).
 * RIVALS가 연속 득점하며 4-7로 역전 — 현재 빠진 '뒤지게 된 이유'를 채운다.
 */
export const Scene10bRivalRun: React.FC = () => {
  const frame = useCurrentFrame();
  const desat = interpolate(frame, [0, 24], [1, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: `saturate(${desat})` }}>
        <Plate img="scenes/S10B.png" label="Scene 10B" title="상대의 반격" seconds={6} live />
      </AbsoluteFill>
      <Scoreboard homeScore={4} awayScore={7} inning="7회 초" count={{ balls: 0, strikes: 0, outs: 1 }} />
      <Subtitle kind="lower" text="상대의 반격 — 순식간에 뒤집힌 스코어" appearAt={40} />
    </AbsoluteFill>
  );
};
