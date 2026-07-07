import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 7C — 배트 플립(빠던) (5초). 홈런 직후 KBO식 배트 플립.
 */
export const Scene07cBatFlip: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S07C.png" label="Scene 7C" title="배트 플립(빠던)" seconds={5} live />
    <Scoreboard homeScore={4} awayScore={0} inning="3회 말" count={{ balls: 0, strikes: 0, outs: 1 }} />
    <Subtitle kind="lower" text="압도적 성과에 터지는 빠던!" appearAt={20} />
  </AbsoluteFill>
);
