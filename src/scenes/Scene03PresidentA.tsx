import React from "react";
import { AbsoluteFill } from "remotion";
import { Plate } from "../components/Plate";
import { Subtitle } from "../components/Subtitle";
import { SatelliteFrame } from "../components/SatelliteFrame";
import { NameTag } from "../components/NameTag";
import { COLORS } from "../theme";

/**
 * Scene 3 — 가상 정상 축전 ① 아메리카나 합중국 대통령 (12초).
 * 배경: Imagen 생성 가상 대통령 플레이트(실존 정치인 비유사 안전조건).
 * 오버레이: 위성 중계 프레임 + 네임택 + 하단 대형 자막.
 */
export const Scene03PresidentA: React.FC = () => (
  <AbsoluteFill>
    <Plate img="scenes/S03.png" label="Scene 3" title="아메리카나 대통령(가상)" seconds={12} />
    <SatelliteFrame location="AMERICANA · 위성 중계" glitch />
    <NameTag role="아메리카나 합중국 대통령 (가상)" accent={COLORS.amberCaption} appearAt={18} />
    <Subtitle
      kind="lower"
      text="지난해 강남과 서부가 보여준 성과는, 그레이트, 정말 그레이트했습니다!"
      appearAt={40}
    />
  </AbsoluteFill>
);
