import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Plate } from "../components/Plate";
import { Subtitle } from "../components/Subtitle";
import { NameTag } from "../components/NameTag";
import { COLORS } from "../theme";

/**
 * Scene 5 ★ — 김봉균 부문장님 축전 (20초, 메인).
 * 가상 정상 2명의 과장 → 부문장님의 진정성으로 톤 전환.
 * ⚠ 위성 글리치 프레임은 '여기서는 제거'하고 클린 풀스크린(가이드).
 * 배경: 실촬영(권장) 또는 HeyGen Photo Avatar + 우주정거장 합성 → 플레이스홀더.
 */
export const Scene05Bumunjang: React.FC = () => {
  const frame = useCurrentFrame();
  // 진심 톤: 잔잔한 페이드 인
  const glow = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <Plate
        img="scenes/S05.png"
        label="Scene 5 ★"
        title="김봉균 부문장 (우주정거장 배경)"
        seconds={20}
      />
      {/* 진정성 톤 — 창밖 지구 광원 느낌의 미세 블루 글로우 */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(70% 60% at 78% 40%, rgba(60,120,220,0.22), transparent 70%)",
          opacity: glow,
        }}
      />
      <NameTag name="김봉균" role="KT ○○부문장" accent={COLORS.rivalsRedLight} appearAt={30} />
      <Subtitle
        kind="lower"
        text="우리에게는, 뒷심이 있다는 것을. 하반기, 반드시 성과로 증명합시다."
        appearAt={60}
      />
    </AbsoluteFill>
  );
};
