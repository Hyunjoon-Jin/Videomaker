import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Placeholder } from "../components/Placeholder";
import { Scoreboard } from "../components/Scoreboard";

/**
 * Scene 12 — 2사 만루, 풀카운트 (15초).
 * 투수/타자/그립 클로즈업 교차(한 클립 아님) → 플레이스홀더.
 * 스코어바: 만루(베이스 3개 점등) + 풀카운트(B●●● / S●● / O●●).
 * 마지막 컷 직후 완전 정적 1초(사운드) → Scene 13.
 */
export const Scene12FullCount: React.FC = () => {
  const frame = useCurrentFrame();
  // 컷 리듬: 점점 짧아지는 교차편집을 라벨 교체로 암시
  const cuts = [
    { t: 0, k: "12-A · 투수 얼굴 클로즈업" },
    { t: 60, k: "12-B · 타자 눈빛 클로즈업" },
    { t: 120, k: "12-C · 배트 그립 (최고 위험 컷)" },
    { t: 165, k: "12-A · 투수" },
    { t: 195, k: "12-B · 타자" },
    { t: 220, k: "12-A" },
    { t: 235, k: "12-B" },
  ];
  const cur = [...cuts].reverse().find((c) => frame >= c.t) ?? cuts[0];

  // 마지막 1초 정적 → 블랙 다운
  const blackout = interpolate(frame, [420, 450], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Placeholder
        label="Scene 12"
        title="2사 만루, 풀카운트"
        seconds={15}
        tone="field"
        note={cur.k}
      />
      <Scoreboard
        homeScore={3}
        awayScore={5}
        inning="8회 말"
        bases={[true, true, true]}
        count={{ balls: 3, strikes: 2, outs: 2 }}
      />
      <AbsoluteFill style={{ background: "#000", opacity: blackout }} />
    </AbsoluteFill>
  );
};
