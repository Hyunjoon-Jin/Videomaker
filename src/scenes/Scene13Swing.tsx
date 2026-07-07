import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Plate } from "../components/Plate";
import { KR_FONT } from "../fonts";
import { SHOW_SPEECH_SUBTITLES } from "../config";

/**
 * Scene 13 — 타격의 순간 (10초).
 * 정적 → 실제 타격 컨택(S13) → 공이 쭉쭉 뻗어 담장으로(S13B) →
 * 캐스터 "쭉— 쭉— 뻗습니다… 담장—!!" → 관중 환호 → FADE OUT (결과 미공개, 여운).
 * "이제 홈런 쳐서 역전하자!"의 희망으로 열어둔 채 끝낸다.
 */
export const Scene13Swing: React.FC = () => {
  const frame = useCurrentFrame();

  const showBall = frame >= 110;
  const ballIn = interpolate(frame, [110, 128], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 임팩트 화이트 플릭
  const impact = interpolate(frame, [30, 36, 48], [0, 0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 캐스터 자막 2단
  const cap1 = interpolate(frame, [120, 138], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cap2 = interpolate(frame, [205, 220], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 관중 환호 느낌의 밝기 상승 → FADE OUT
  const blackout = interpolate(frame, [255, 300], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 전반: 실제 타격 컨택 */}
      <Plate img="scenes/S13.png" label="Scene 13" title="타격의 순간" seconds={10} kenBurns={false} />

      {/* 후반: 공이 담장을 향해 */}
      {showBall && (
        <AbsoluteFill style={{ opacity: ballIn }}>
          <Plate img="scenes/S13B.png" kenBurns scrimTop={false} scrimBottom={false} />
        </AbsoluteFill>
      )}

      {/* 캐스터 자막(말) — 토글 */}
      {SHOW_SPEECH_SUBTITLES && cap1 > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 150,
            textAlign: "center",
            opacity: cap1 * (1 - blackout),
            fontFamily: KR_FONT,
          }}
        >
          <span
            style={{
              fontSize: 70,
              fontWeight: 900,
              color: "#fff",
              textShadow: "0 4px 24px rgba(0,0,0,0.9)",
              letterSpacing: 2,
            }}
          >
            {cap2 > 0 ? "쭉— 쭉— 뻗습니다… 담장—!!" : "쭉— 쭉— 뻗습니다…"}
          </span>
        </div>
      )}

      <AbsoluteFill style={{ background: "#fff", opacity: impact }} />
      <AbsoluteFill style={{ background: "#000", opacity: blackout }} />
    </AbsoluteFill>
  );
};
