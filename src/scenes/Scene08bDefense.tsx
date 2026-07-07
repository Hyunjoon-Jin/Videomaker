import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 8B — 호수비 다이빙 캐치 (8초). 위기 방어 = 리스크 대응.
 */
export const Scene08bDefense: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S08B.png" label="Scene 8B" title="호수비 · 위기 방어" seconds={8} live />
    <Scoreboard homeScore={4} awayScore={0} inning="5회 말" count={{ balls: 1, strikes: 2, outs: 2 }} />
    <Subtitle kind="lower" text="위기 방어 — 완벽한 호수비!" appearAt={130} />
  </AbsoluteFill>
);
