import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 11B — 마운드 작전 회의 (6초). 마지막 승부 전 전략.
 */
export const Scene11bMound: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S11B.png" label="Scene 11B" title="마운드 작전 회의" seconds={6} live />
    <Scoreboard homeScore={4} awayScore={7} inning="8회 말" bases={[false, false, false]} />
    <Subtitle kind="lower" text="마운드 회의 — 마지막 반격을 준비한다" appearAt={60} />
  </AbsoluteFill>
);
