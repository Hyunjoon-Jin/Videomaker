import React from "react";
import { AbsoluteFill } from "remotion";
import { Placeholder } from "../components/Placeholder";
import { Subtitle } from "../components/Subtitle";
import { SatelliteFrame } from "../components/SatelliteFrame";
import { NameTag } from "../components/NameTag";
import { COLORS } from "../theme";

/**
 * Scene 4 — 가상 정상 축전 ② 유로피아 연방 총리 (12초).
 * Scene 3의 위성 프레임 포맷 재사용(네임택만 교체) — 반복이 '세계 각국' 느낌.
 * 톤은 Scene 3(과장)과 대비되는 차분함.
 */
export const Scene04PresidentB: React.FC = () => (
  <AbsoluteFill>
    <Placeholder
      label="Scene 4"
      title="유로피아 연방 총리 (가상)"
      seconds={12}
      tone="neutral"
      note="HeyGen 가상 총리 아바타 · 대리석 기둥 고전 집무실 · 파랑/금색 월계수 가상 국기 · 차분하고 품위 있는 톤."
    />
    <SatelliteFrame location="EUROPIA · 위성 중계" glitch />
    <NameTag role="유로피아 연방 총리 (가상)" accent={COLORS.gangnamNavyLight} appearAt={18} />
    <Subtitle
      kind="lower"
      text="두 강자가 한 팀이 되는 것. 그것은 유럽에서도 전례가 없는 일입니다."
      appearAt={40}
    />
  </AbsoluteFill>
);
