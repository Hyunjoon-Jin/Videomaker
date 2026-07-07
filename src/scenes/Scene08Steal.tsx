import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 8 — 도루: 고객사 탈환 (10초).
 * 헤드퍼스트 슬라이딩 슬로모 → 세이프 콜. 스코어바에 도루/주자 표기.
 */
export const Scene08Steal: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S08.png" label="Scene 8" title="도루 · 고객사 탈환" seconds={10} live motion="in" amount={0.12} atmosphere={{ tone: "warm", intensity: 0.7 }} />
    <Scoreboard
      homeScore={4}
      awayScore={0}
      inning="5회 초"
      bases={[false, true, false]}
      count={{ balls: 1, strikes: 1, outs: 1 }}
    />
    <Subtitle
      kind="lower"
      text="○○ 고객사 탈환 — 허를 찌른 도루, 세이프!"
      appearAt={150}
    />
  </AbsoluteFill>
);
