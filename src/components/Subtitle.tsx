import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * 통일 자막 시스템. 가이드: 자막은 전부 후반(여기)에서 얹고 Veo엔 no text.
 * - "newsbar": 뉴스 하단 자막바 (상단 빨강 라벨 + 하단 흰색 본문)
 * - "caption": 실적 임팩트 자막 (큰 옐로 + 작은 흰색, 스케일 팝)
 * - "lower": 일반 하단 대형 자막 (예능식 립싱크 커버 / 내레이션)
 */
export type SubtitleKind = "newsbar" | "caption" | "lower";

export interface SubtitleProps {
  kind: SubtitleKind;
  /** 상단 라벨(빨강) — newsbar 전용 */
  label?: string;
  /** 메인 텍스트 */
  text: string;
  /** 보조 텍스트(작게) — caption 전용 */
  sub?: string;
  /** 등장 시작 프레임(로컬) */
  appearAt?: number;
}

export const Subtitle: React.FC<SubtitleProps> = ({
  kind,
  label,
  text,
  sub,
  appearAt = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - appearAt;

  const enter = spring({
    frame: local,
    fps,
    config: { damping: 200, mass: 0.6 },
  });

  if (local < 0) return null;

  if (kind === "newsbar") {
    const slide = interpolate(enter, [0, 1], [80, 0]);
    return (
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          bottom: 90,
          transform: `translateY(${slide}px)`,
          opacity: enter,
          fontFamily: KR_FONT,
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            background: COLORS.breakingRed,
            color: COLORS.white,
            fontWeight: 900,
            fontSize: 40,
            letterSpacing: 4,
            padding: "0 40px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {label ?? "속보"}
        </div>
        <div
          style={{
            flex: 1,
            background: "rgba(8,14,26,0.92)",
            color: COLORS.white,
            fontWeight: 700,
            fontSize: 46,
            padding: "26px 44px",
            display: "flex",
            alignItems: "center",
            borderLeft: `4px solid ${COLORS.breakingRedDeep}`,
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  if (kind === "caption") {
    // 스케일 팝: 105% → 100%
    const pop = interpolate(enter, [0, 1], [1.08, 1]);
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 150,
          textAlign: "center",
          fontFamily: KR_FONT,
          transform: `scale(${pop})`,
          opacity: enter,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: COLORS.amberCaption,
            textShadow: "0 6px 30px rgba(0,0,0,0.8)",
            letterSpacing: -1,
          }}
        >
          {text}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: COLORS.white,
              marginTop: 12,
              textShadow: "0 4px 18px rgba(0,0,0,0.9)",
            }}
          >
            {sub}
          </div>
        )}
      </div>
    );
  }

  // lower
  const slide = interpolate(enter, [0, 1], [40, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 120,
        textAlign: "center",
        fontFamily: KR_FONT,
        transform: `translateY(${slide}px)`,
        opacity: enter,
        padding: "0 140px",
      }}
    >
      <span
        style={{
          display: "inline-block",
          background: "rgba(0,0,0,0.62)",
          color: COLORS.white,
          fontWeight: 700,
          fontSize: 52,
          lineHeight: 1.4,
          padding: "18px 44px",
          borderRadius: 10,
        }}
      >
        {text}
      </span>
    </div>
  );
};
