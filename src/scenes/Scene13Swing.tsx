import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Plate } from "../components/Plate";

/**
 * Scene 13 — 타격의 순간 (10초).
 * 정적 1초 → 실제 타격 컨택(초슬로모, S13) → 공이 밤하늘 저 멀리(S13B) →
 * 결과 미공개 블랙 페이드(여운). "깡!" 타격음이 정적을 깬다.
 */
export const Scene13Swing: React.FC = () => {
  const frame = useCurrentFrame();

  // 전반(타격) → 후반(공 궤적) 전환
  const showBall = frame >= 135;

  // 임팩트 순간 화이트 플릭
  const impact = interpolate(frame, [30, 36, 48], [0, 0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 궤적 전환 크로스 컷 살짝 페이드
  const ballIn = interpolate(frame, [135, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 공이 가장 밝은 프레임 → 블랙 슬로 페이드
  const blackout = interpolate(frame, [255, 300], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 전반: 실제 타격 컨택 */}
      <Plate
        img="scenes/S13.png"
        label="Scene 13"
        title="타격의 순간"
        seconds={10}
        kenBurns={false}
      />

      {/* 후반: 공이 저 멀리 */}
      {showBall && (
        <AbsoluteFill style={{ opacity: ballIn }}>
          <Plate img="scenes/S13B.png" kenBurns scrimTop={false} scrimBottom={false} />
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ background: "#fff", opacity: impact }} />
      <AbsoluteFill style={{ background: "#000", opacity: blackout }} />
    </AbsoluteFill>
  );
};
