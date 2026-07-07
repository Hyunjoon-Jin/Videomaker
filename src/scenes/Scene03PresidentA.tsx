import React from "react";
import { AbsoluteFill } from "remotion";
import { Placeholder } from "../components/Placeholder";
import { Subtitle } from "../components/Subtitle";
import { SatelliteFrame } from "../components/SatelliteFrame";
import { NameTag } from "../components/NameTag";
import { COLORS } from "../theme";

/**
 * Scene 3 — 가상 정상 축전 ① 아메리카나 합중국 대통령 (12초).
 * 배경: HeyGen 가상 대통령 아바타 → 플레이스홀더.
 * 오버레이: 위성 중계 프레임 + 네임택 + 하단 대형 자막(모두 실제 구현).
 */
export const Scene03PresidentA: React.FC = () => (
  <AbsoluteFill>
    <Placeholder
      label="Scene 3"
      title="아메리카나 합중국 대통령 (가상)"
      seconds={12}
      tone="neutral"
      note="HeyGen 가상 대통령 아바타 · 오렌지/퍼플 줄무늬 가상 국기 · 과장된 자신만만 톤. 실존 정치인 유사성 검수 필수."
    />
    <SatelliteFrame location="AMERICANA · 위성 중계" glitch />
    <NameTag role="아메리카나 합중국 대통령 (가상)" accent={COLORS.amberCaption} appearAt={18} />
    <Subtitle
      kind="lower"
      text="지난해 강남과 서부가 보여준 성과는, 그레이트, 정말 그레이트했습니다!"
      appearAt={40}
    />
  </AbsoluteFill>
);
