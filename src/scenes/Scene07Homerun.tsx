import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Placeholder } from "../components/Placeholder";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 7 — 홈런 몽타주: 대형 수주 (20초 = 8초 클립 3종 조립).
 * 배경: 타격→궤적→세리머니 Veo 클립 → 플레이스홀더.
 * 오버레이: 실적 임팩트 자막 + 홈런마다 GANGNAM 스코어 +1.
 */

// 수주 1건 = 약 5초 리듬(150f). 3건.
const HITS = [
  { at: 20, main: "○○기관 42억 수주", sub: "비거리 140m 장외 홈런!" },
  { at: 170, main: "△△그룹 68억 수주", sub: "우측 담장 훌쩍!" },
  { at: 330, main: "□□공사 55억 수주", sub: "쐐기 만루포!" },
];

export const Scene07Homerun: React.FC = () => {
  const frame = useCurrentFrame();
  // 자막 등장 시점마다 스코어 누적
  const score = HITS.filter((h) => frame >= h.at + 6).length;
  const active = [...HITS].reverse().find((h) => frame >= h.at && frame < h.at + 120);

  return (
    <AbsoluteFill>
      <Placeholder
        label="Scene 7"
        title="홈런 몽타주 · 대형 수주"
        seconds={20}
        tone="field"
        note="[타격 2s → 궤적 1.5s → 자막 임팩트] × 3건, 마지막 건만 세리머니. 속도 램프(타격 순간 20%) · 캐스터 샤우팅."
      />
      <Scoreboard homeScore={score} awayScore={0} inning="3회 말" />
      {active && (
        <Subtitle
          key={active.at}
          kind="caption"
          text={active.main}
          sub={active.sub}
          appearAt={active.at}
        />
      )}
    </AbsoluteFill>
  );
};
