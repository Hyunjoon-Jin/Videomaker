import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { NameTag } from "../components/NameTag";
import { Subtitle } from "../components/Subtitle";
import { COLORS } from "../theme";

/**
 * Scene 6C — 감독 작전 지시 (6초).
 * 김봉균 부문장 = 최상강남 감독, 덕아웃에서 사인.
 */
export const Scene06cManager: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S06C.png" label="Scene 6C" title="감독 작전 지시" seconds={6} live />
    <NameTag name="김봉균" role="최상강남 감독" accent={COLORS.homeRed} appearAt={16} />
    <Scoreboard homeScore={0} awayScore={0} inning="1회 말" />
    <Subtitle kind="lower" text="벤치의 작전 — 하나된 팀워크로 승부한다" appearAt={70} />
  </AbsoluteFill>
);
