import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * Scene 14 — 엔딩 카피 (10초, 100% 그래픽 · Veo 불필요).
 * 타이핑 "강남법인에게 9회 말은 없습니다." → 홀드 →
 * "하나된 강남, B2B 최상!" 팝 등장 → KT 로고(승인 후 교체) 2초.
 * 폰트는 Scene 1 속보 자막과 동일 계열(수미상관).
 */
const LINE1 = "강남법인에게 9회 말은 없습니다.";
const LINE2 = "하나된 강남, B2B 최상!";

export const Scene14Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1단계: 타이핑 (0~90f)
  const typeEnd = 90;
  const chars = Math.floor(
    interpolate(frame, [10, typeEnd], [0, LINE1.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const line1Visible = frame < 150;
  const line1Out = interpolate(frame, [140, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const caret = Math.floor(frame / 8) % 2 === 0 && frame < typeEnd + 20;

  // 2단계: 슬로건 팝 (150f~)
  const popIn = spring({
    frame: frame - 150,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.8 },
  });
  const slogan = frame >= 150 ? popIn : 0;

  // 3단계: KT 로고 (240f~)
  const logoIn = interpolate(frame, [240, 258], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sloganOut = interpolate(frame, [236, 250], [1, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#000",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: KR_FONT,
      }}
    >
      {/* 미세 배경 광채 */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(30,60,120,0.35), transparent 70%)",
          opacity: interpolate(frame, [150, 180], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* 1단계: 타이핑 */}
      {line1Visible && frame < 240 && (
        <div
          style={{
            position: "absolute",
            opacity: line1Out,
            fontSize: 82,
            fontWeight: 700,
            color: COLORS.offWhite,
            letterSpacing: -1,
          }}
        >
          {LINE1.slice(0, chars)}
          <span
            style={{
              opacity: caret ? 1 : 0,
              color: COLORS.breakingRed,
              fontWeight: 400,
            }}
          >
            |
          </span>
        </div>
      )}

      {/* 2단계: 슬로건 */}
      {frame >= 150 && (
        <div
          style={{
            position: "absolute",
            transform: `scale(${0.8 + slogan * 0.2})`,
            opacity: Math.min(slogan, sloganOut),
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 128,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: -2,
              textShadow: `0 0 60px ${COLORS.gangnamNavyLight}`,
            }}
          >
            하나된 강남,
          </div>
          <div
            style={{
              fontSize: 128,
              fontWeight: 900,
              color: COLORS.amberCaption,
              letterSpacing: -2,
              textShadow: "0 0 60px rgba(246,196,69,0.6)",
            }}
          >
            B2B 최상!
          </div>
        </div>
      )}

      {/* 3단계: KT 로고 플레이스홀더 */}
      {frame >= 240 && (
        <div
          style={{
            position: "absolute",
            opacity: logoIn,
            transform: `translateY(${interpolate(logoIn, [0, 1], [20, 0])}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              border: `2px dashed ${COLORS.rivalsRedLight}`,
              borderRadius: 16,
              padding: "28px 60px",
              color: "#fff",
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: 8,
            }}
          >
            KT
          </div>
          <div style={{ color: COLORS.subtleGrey, fontSize: 24 }}>
            로고 사용 승인 확인 후 교체
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
