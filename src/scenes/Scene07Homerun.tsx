import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";

/**
 * Scene 7 — 홈런 몽타주: 대형 수주 (20초).
 * 서로 다른 홈런 3컷 × 자막 1개씩(수주 실적 = 득점). 마지막 투런으로 최상강남 4점.
 */
const HITS = [
  { at: 30, img: "scenes/S07.png", main: "○○기관 42억 수주", sub: "시즌 첫 홈런포!", runs: 1 },
  { at: 240, img: "scenes/S072.png", main: "△△그룹 68억 수주", sub: "연타석 아치!", runs: 1 },
  { at: 440, img: "scenes/S073.png", main: "□□공사 91억 수주", sub: "대형 계약 투런포!", runs: 2 },
];

export const Scene07Homerun: React.FC = () => {
  const frame = useCurrentFrame();
  const score = HITS.filter((h) => frame >= h.at + 6).reduce((a, h) => a + h.runs, 0);
  // 현재 보여줄 홈런 컷(자막 리듬에 맞춰 이미지 전환)
  const shown = [...HITS].reverse().find((h) => frame >= h.at - 24) ?? HITS[0];
  const active = [...HITS].reverse().find((h) => frame >= h.at && frame < h.at + 130);

  return (
    <AbsoluteFill>
      <Plate
        key={shown.img}
        img={shown.img}
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
