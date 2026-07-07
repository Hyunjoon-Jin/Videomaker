import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 7 — 홈런 몽타주: 대형 수주 (20초 = 8초 클립 3종 조립).
 * 배경: 타격→궤적→세리머니 Veo 클립 → 플레이스홀더.
 * 오버레이: 실적 임팩트 자막 + 홈런마다 GANGNAM 스코어 +1.
 */

// 수주 = 득점. 3건(마지막 투런)으로 최상강남 4점. 빠릿한 리듬 + 성과 워딩.
const HITS = [
  { at: 30, main: "○○기관 42억 수주", sub: "시즌 첫 홈런포!", runs: 1 },
  { at: 240, main: "△△그룹 68억 수주", sub: "연타석 아치!", runs: 1 },
  { at: 440, main: "□□공사 91억 수주", sub: "대형 계약 투런포!", runs: 2 },
];

export const Scene07Homerun: React.FC = () => {
  const frame = useCurrentFrame();
  // 등장한 수주의 득점 합산
  const score = HITS.filter((h) => frame >= h.at + 6).reduce((a, h) => a + h.runs, 0);
  const active = [...HITS].reverse().find((h) => frame >= h.at && frame < h.at + 110);

  return (
    <AbsoluteFill>
      <Plate img="scenes/S07.png" label="Scene 7" title="홈런 몽타주" seconds={20} live />
      <Scoreboard
        homeScore={score}
        awayScore={0}
        inning="3회 말"
        count={{ balls: 2, strikes: 1, outs: 1 }}
      />
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
