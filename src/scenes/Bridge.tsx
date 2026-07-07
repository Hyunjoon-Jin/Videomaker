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
import { Subtitle } from "../components/Subtitle";

/**
 * 브릿지 — PART 1 → PART 2 전환 (3초).
 * 뉴스 스크린 그래픽 안으로 줌인 → 스크린 속 화면을 야구장 부감샷으로 교체(하드컷 없이).
 * 앵커 오프 멘트(TTS)를 자막으로 병기.
 */
export const Bridge: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // 스크린(창) 줌인: 작은 화면 → 풀스크린
  const zoom = interpolate(frame, [0, durationInFrames], [0.32, 1.15], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const round = interpolate(zoom, [0.32, 1], [24, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: COLORS.studioNavyDeep }}>
      {/* 뉴스룸 잔상 배경 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${COLORS.studioNavy}, ${COLORS.studioNavyDeep})`,
          opacity: interpolate(zoom, [0.32, 0.9], [1, 0]),
        }}
      />

      {/* 스크린 속 야구장(부감) — 플레이스홀더 그래픽 */}
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${zoom})`,
            borderRadius: round,
            overflow: "hidden",
            boxShadow: "0 0 120px rgba(0,0,0,0.6)",
            background: `radial-gradient(80% 80% at 50% 40%, ${COLORS.fieldGreenLight} 0%, ${COLORS.fieldGreen} 55%, #050D08 100%)`,
            border: zoom < 1 ? "3px solid rgba(255,255,255,0.25)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: KR_FONT,
              color: "rgba(255,255,255,0.5)",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 3,
              transform: `scale(${1 / zoom})`,
            }}
          >
            ▷ 야구장 부감샷 (Scene 6 연결)
          </div>
        </div>
      </AbsoluteFill>

      <Subtitle
        kind="lower"
        text="그렇다면 강남법인고객본부의 상반기, 어땠을까요?"
        appearAt={8}
      />
    </AbsoluteFill>
  );
};
