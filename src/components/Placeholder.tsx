import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  random,
} from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * 실사/Veo 촬영 예정 씬을 대체하는 플레이스홀더.
 * 슬레이트(클래퍼보드) 느낌으로 씬 번호·제목·제작 방식·프롬프트 힌트를 노출한다.
 * 실제 소스가 나오면 이 컴포넌트만 <OffthreadVideo>로 교체하면 된다.
 */
export interface PlaceholderProps {
  label: string;
  title: string;
  seconds: number;
  note?: string;
  /** 화면 하단에 병기할 Veo/HeyGen 프롬프트 요약(선택) */
  promptHint?: string;
  /** 배경 톤: 뉴스(파랑) vs 야구(그린) */
  tone?: "news" | "field" | "neutral";
}

const toneBg: Record<string, [string, string]> = {
  news: [COLORS.studioNavy, COLORS.studioNavyDeep],
  field: [COLORS.fieldGreen, "#081410"],
  neutral: ["#161B22", "#0B0E13"],
};

export const Placeholder: React.FC<PlaceholderProps> = ({
  label,
  title,
  seconds,
  note,
  promptHint,
  tone = "neutral",
}) => {
  const frame = useCurrentFrame();
  const [c1, c2] = toneBg[tone];

  // 은은한 필름 그레인(결정론적 난수 — 렌더 재현성 보장)
  const grain = Array.from({ length: 40 }).map((_, i) => {
    const x = random(`gx-${i}`) * 100;
    const y = random(`gy-${i}`) * 100;
    const flick = 0.04 + random(`gf-${i}-${Math.floor(frame / 3)}`) * 0.06;
    return { x, y, o: flick };
  });

  // 코너 크롭 마크 깜빡임
  const rec = Math.sin(frame / 8) > 0 ? 1 : 0.25;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 120% at 50% 30%, ${c1} 0%, ${c2} 100%)`,
        fontFamily: KR_FONT,
        color: COLORS.offWhite,
      }}
    >
      {/* 그레인 */}
      <AbsoluteFill style={{ mixBlendMode: "overlay", pointerEvents: "none" }}>
        {grain.map((g, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${g.x}%`,
              top: `${g.y}%`,
              width: 3,
              height: 3,
              borderRadius: 2,
              background: "#fff",
              opacity: g.o,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* 슬레이트 카드 — 상단(스코어바)·하단(자막) 세이프존을 비워둔다 */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: "190px 120px 300px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1360,
            border: `3px dashed rgba(255,255,255,0.28)`,
            borderRadius: 20,
            padding: "54px 80px",
            background: "rgba(0,0,0,0.28)",
            backdropFilter: "blur(2px)",
          }}
        >
          {/* 상단: PLACEHOLDER 배지 + 러닝타임 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 44,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: COLORS.breakingRed,
                  opacity: rec,
                  boxShadow: `0 0 20px ${COLORS.breakingRed}`,
                }}
              />
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: 6,
                  color: COLORS.subtleGrey,
                }}
              >
                PLACEHOLDER · 실사/생성 예정
              </span>
            </div>
            <span
              style={{
                fontSize: 30,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                color: COLORS.gold,
              }}
            >
              {seconds}s
            </span>
          </div>

          {/* 씬 번호 */}
          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: 10,
              color: COLORS.gold,
              marginBottom: 10,
            }}
          >
            {label.toUpperCase()}
          </div>

          {/* 제목 */}
          <div
            style={{
              fontSize: 78,
              lineHeight: 1.12,
              fontWeight: 900,
              color: COLORS.white,
              textWrap: "balance",
              marginBottom: note ? 40 : 0,
            }}
          >
            {title}
          </div>

          {/* 제작 방식 */}
          {note && (
            <div
              style={{
                fontSize: 34,
                lineHeight: 1.5,
                fontWeight: 500,
                color: COLORS.offWhite,
                borderTop: "1px solid rgba(255,255,255,0.16)",
                paddingTop: 32,
              }}
            >
              {note}
            </div>
          )}

          {promptHint && (
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.5,
                color: COLORS.subtleGrey,
                marginTop: 24,
                fontFamily: "monospace",
              }}
            >
              {promptHint}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
