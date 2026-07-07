import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

const BB_RED = "#E11B2C";

/**
 * Scene 14 — 엔딩 카피 (10초, 100% 그래픽 · Veo 불필요).
 * 타이핑 "강남법인에게 9회 말은 없습니다." → 홀드 →
 * "하나된 강남, B2B 최상!" 팝 등장 → KT 로고(승인 후 교체) 2초.
 * 폰트는 Scene 1 속보 자막과 동일 계열(수미상관).
 */
const LINE1 = "강남법인에게 9회 말은 없습니다";

export const Scene14Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1단계: 강한 메시지 임팩트 등장 (페이드아웃 직후)
  const line1In = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, stiffness: 240, mass: 0.8 },
  });
  const line1Scale = interpolate(line1In, [0, 1], [1.28, 1]);
  const line1Visible = frame < 150;
  const line1Out = interpolate(frame, [140, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 밑줄 스와이프
  const underline = interpolate(frame, [26, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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

      {/* 1단계: 강한 메시지 */}
      {line1Visible && frame < 240 && (
        <div
          style={{
            position: "absolute",
            opacity: Math.min(line1In, line1Out),
            transform: `scale(${line1Scale})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: -1.5,
              textShadow: "0 6px 40px rgba(0,0,0,0.7)",
            }}
          >
            {LINE1}
          </div>
          <div
            style={{
              width: 640 * underline,
              height: 8,
              background: COLORS.breakingRed,
              borderRadius: 4,
              boxShadow: `0 0 24px ${COLORS.breakingRed}`,
            }}
          />
        </div>
      )}

      {/* 2단계: 슬로건 (첨부 레퍼런스 — 플랫 타이포) */}
      {frame >= 150 && (
        <div
          style={{
            position: "absolute",
            transform: `scale(${0.86 + slogan * 0.14})`,
            opacity: Math.min(slogan, sloganOut),
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* BACK TO BACK */}
          <div
            style={{
              fontFamily: KR_FONT,
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 58,
              letterSpacing: 8,
              color: BB_RED,
            }}
          >
            BACK TO BACK
          </div>
          {/* 하나된 강남, B2B최상 */}
          <div
            style={{
              fontSize: 132,
              fontWeight: 900,
              letterSpacing: -2,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#C7CCD4" }}>하나된 강남, </span>
            <span style={{ color: BB_RED }}>B2B</span>
            <span style={{ color: "#fff" }}>최상</span>
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
