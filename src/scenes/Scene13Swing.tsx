import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Plate } from "../components/Plate";

/**
 * Scene 13 — 타격의 순간 (10초).
 * 정적 1초 → 임팩트 초슬로모 4s → 공 궤적 4s → 결과 미공개 블랙 페이드(여운).
 * "깡!" 타격음이 정적을 깨는 구조.
 */
export const Scene13Swing: React.FC = () => {
  const frame = useCurrentFrame();

  const label = frame < 120 ? "13-A · 임팩트 초슬로모" : "13-B · 뻗어가는 공 (여운)";

  // 공이 가장 밝게 빛나는 프레임 → 블랙 슬로 페이드
  const blackout = interpolate(frame, [255, 300], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 임팩트 순간 화이트 플릭
  const impact = interpolate(frame, [30, 36, 46], [0, 0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Plate img="scenes/S13.png" label="Scene 13" title={label} seconds={10} />
      <AbsoluteFill style={{ background: "#fff", opacity: impact }} />
      <AbsoluteFill style={{ background: "#000", opacity: blackout }} />
    </AbsoluteFill>
  );
};
