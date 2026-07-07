import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 7B — 관중 응원 (5초). KT 팬 함성/응원.
 */
export const Scene07bCrowd: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S07B.png" label="Scene 7B" title="관중 응원" seconds={5} live />
    <Scoreboard homeScore={4} awayScore={0} inning="3회 말" />
    <Subtitle kind="lower" text="관중석도 열광 — 강남 팬 총출동!" appearAt={18} />
  </AbsoluteFill>
);
