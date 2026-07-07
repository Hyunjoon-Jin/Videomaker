import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 7 — 홈런 몽타주: 대형 수주 (20초).
 * 배경: 업로드된 홈런 영상(clips/S07.mp4) 전체 재생.
 * 오버레이: 수주 실적 자막(득점) + 스코어바. 마지막 투런으로 최상강남 4점.
 */
const HITS = [
  { at: 30, main: "○○기관 42억 수주", sub: "시즌 첫 홈런포!", runs: 1 },
  { at: 240, main: "△△그룹 68억 수주", sub: "연타석 아치!", runs: 1 },
  { at: 440, main: "□□공사 91억 수주", sub: "대형 계약 투런포!", runs: 2 },
];

export const Scene07Homerun: React.FC = () => {
  const frame = useCurrentFrame();
  const score = HITS.filter((h) => frame >= h.at + 6).reduce((a, h) => a + h.runs, 0);
  const active = [...HITS].reverse().find((h) => frame >= h.at && frame < h.at + 130);

  return (
    <AbsoluteFill>
      <Plate
        img="scenes/S07.png"
        clip="clips/S07.mp4"
        label="Scene 7"
        title="홈런 몽타주"
        seconds={20}
        live
      />
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
