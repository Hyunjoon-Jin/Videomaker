import React from "react";
import { AbsoluteFill } from "remotion";
import { Placeholder } from "../components/Placeholder";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 8 — 도루: 고객사 탈환 (10초).
 * 헤드퍼스트 슬라이딩 슬로모 → 세이프 콜. 스코어바에 도루/주자 표기.
 */
export const Scene08Steal: React.FC = () => (
  <AbsoluteFill>
    <Placeholder
      label="Scene 8"
      title="도루 · 고객사 탈환"
      seconds={10}
      tone="field"
      note="슬라이딩 4s → 세이프 콜 2s → 자막. (슬라이딩은 최다 테이크 필요 1순위 컷)"
    />
    <Scoreboard
      homeScore={3}
      awayScore={0}
      inning="5회 초"
      bases={[false, true, false]}
    />
    <Subtitle
      kind="lower"
      text="○○ 고객사 탈환 — 허를 찌른 도루, 세이프!"
      appearAt={150}
    />
  </AbsoluteFill>
);
