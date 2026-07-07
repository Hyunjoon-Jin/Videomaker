import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";
import { Globe } from "../components/Globe";

/**
 * Scene 1 — 속보 인트로 (5초, 100% 그래픽).
 * 지구본 회전 → 카메라 푸시인 가속(스케일+블러) → BREAKING NEWS 배너 스윕 →
 * 마지막 프레임 화이트 임팩트(다음 씬 하드컷 타이밍).
 */
export const Scene01Breaking: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();

  // 카메라 푸시인: 후반부 가속
  const scale = interpolate(frame, [0, durationInFrames], [1, 3.4], {
    easing: Easing.in(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const blur = interpolate(
    frame,
    [durationInFrames * 0.6, durationInFrames],
    [0, 14],
    { extrapolateLeft: "clamp" },
  );

  // 배너 스윕(좌→우 통과)
  const bannerX = interpolate(
    frame,
    [10, 30, durationInFrames - 25, durationInFrames - 8],
    [-width, 0, 0, width],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // 빛줄기
  const streak = (i: number) => {
    const p = interpolate(
      (frame + i * 13) % 45,
      [0, 45],
      [-300, width + 300],
    );
    return p;
  };

  // 마지막 화이트 임팩트
  const flash = interpolate(
    frame,
    [durationInFrames - 6, durationInFrames - 1],
    [0, 1],
    { extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, ${COLORS.studioNavy} 0%, ${COLORS.studioNavyDeep} 70%, #01060D 100%)`,
        overflow: "hidden",
      }}
    >
      {/* 빛줄기 */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${18 + i * 20}%`,
            left: streak(i),
            width: 420,
            height: 4,
            background: `linear-gradient(90deg, transparent, ${
              i % 2 ? COLORS.breakingRed : "#fff"
            }, transparent)`,
            opacity: 0.7,
            filter: "blur(1px)",
          }}
        />
      ))}

      {/* 지구본 (푸시인) */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
        }}
      >
        <Globe size={720} />
      </AbsoluteFill>

      {/* BREAKING NEWS 배너 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          width: "100%",
          transform: `translateX(${bannerX}px) translateY(-50%) skewX(-8deg)`,
          background: `linear-gradient(90deg, ${COLORS.breakingRedDeep}, ${COLORS.breakingRed})`,
          padding: "24px 0",
          boxShadow: "0 0 80px rgba(214,24,43,0.7)",
        }}
      >
        <div
          style={{
            transform: "skewX(8deg)",
            textAlign: "center",
            fontFamily: KR_FONT,
            color: "#fff",
            fontWeight: 900,
            fontSize: 120,
            letterSpacing: 12,
          }}
        >
          BREAKING NEWS
        </div>
      </div>

      {/* 화이트 임팩트 */}
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};
