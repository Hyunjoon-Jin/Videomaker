import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { Subtitle } from "../components/Subtitle";
import { LiveBug } from "../components/Broadcast";

/**
 * Scene 7 — 홈런 몽타주: 대형 수주 (20초).
 * 배경: 업로드된 홈런 영상(clips/S07.mp4) 전체 재생.
 * 영상 좌상단에 박힌 'HOME RUN' 그래픽은 feather 마스크로 가리고, 그 위에 LIVE 버그.
 * 오버레이: 수주 실적 자막(득점) + 스코어바.
 */
const HITS = [
  { at: 30, main: "○○기관 42억 수주", sub: "시즌 첫 홈런포!", runs: 1 },
  { at: 240, main: "△△그룹 68억 수주", sub: "연타석 아치!", runs: 1 },
  { at: 440, main: "□□공사 55억 수주", sub: "우측 대형 아치!", runs: 1 },
];

export const Scene07Homerun: React.FC = () => {
  const frame = useCurrentFrame();
  const score = HITS.filter((h) => frame >= h.at + 6).reduce((a, h) => a + h.runs, 0);
  const active = [...HITS].reverse().find((h) => frame >= h.at && frame < h.at + 130);

  return (
    <AbsoluteFill>
      {/* LIVE 버그는 마스크 위에 다시 얹기 위해 Plate에서는 끔 */}
      <Plate img="scenes/S07.png" clip="clips/S07.mp4" label="Scene 7" title="홈런 몽타주" seconds={20} />

      {/* 영상 좌상단 원본 방송 그래픽(HOME RUN/스코어바) 블러 처리 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 560,
          height: 260,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "rgba(6,10,17,0.32)",
          WebkitMaskImage:
            "radial-gradient(115% 115% at 22% 32%, #000 84%, transparent 100%)",
          maskImage:
            "radial-gradient(115% 115% at 22% 32%, #000 84%, transparent 100%)",
        }}
      />

      <LiveBug />
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
