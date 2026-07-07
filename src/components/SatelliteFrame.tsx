import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, random } from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * 뉴스 위성 중계 프레임 오버레이 (Part 1의 핵심 치트키).
 * 네 귀퉁이 브래킷 + LIVE SATELLITE + 약한 노이즈/글리치 →
 * AI 특유의 어색함을 '위성 화질' 핑계로 덮는다.
 */
export interface SatelliteFrameProps {
  /** 좌상단 위치 라벨 (예: "AMERICANA — 위성 중계") */
  location: string;
  glitch?: boolean;
}

const Bracket: React.FC<{ pos: React.CSSProperties }> = ({ pos }) => (
  <div
    style={{
      position: "absolute",
      width: 90,
      height: 90,
      borderColor: "rgba(255,255,255,0.75)",
      ...pos,
    }}
  />
);

export const SatelliteFrame: React.FC<SatelliteFrameProps> = ({
  location,
  glitch = true,
}) => {
  const frame = useCurrentFrame();

  // 간헐적 글리치: 몇 프레임마다 살짝 밀림
  const g = glitch ? random(`glitch-${Math.floor(frame / 5)}`) : 0;
  const shiftX = g > 0.82 ? (g - 0.82) * 60 : 0;
  const flick = 0.5 + random(`flick-${Math.floor(frame / 4)}`) * 0.5;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 스캔라인 */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0.14) 1px, transparent 2px, transparent 4px)",
          opacity: 0.5,
          transform: `translateX(${shiftX}px)`,
          mixBlendMode: "multiply",
        }}
      />

      {/* 비네트 */}
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 300px rgba(0,0,0,0.55)",
        }}
      />

      {/* 코너 브래킷 */}
      <Bracket
        pos={{ top: 50, left: 50, borderTop: "5px solid", borderLeft: "5px solid" }}
      />
      <Bracket
        pos={{ top: 50, right: 50, borderTop: "5px solid", borderRight: "5px solid" }}
      />
      <Bracket
        pos={{ bottom: 50, left: 50, borderBottom: "5px solid", borderLeft: "5px solid" }}
      />
      <Bracket
        pos={{
          bottom: 50,
          right: 50,
          borderBottom: "5px solid",
          borderRight: "5px solid",
        }}
      />

      {/* LIVE SATELLITE (좌상단) */}
      <div
        style={{
          position: "absolute",
          top: 66,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: KR_FONT,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: COLORS.breakingRed,
            opacity: flick,
            boxShadow: `0 0 14px ${COLORS.breakingRed}`,
          }}
        />
        <span
          style={{
            color: COLORS.white,
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: 4,
          }}
        >
          LIVE
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.7)",
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 3,
          }}
        >
          SATELLITE
        </span>
      </div>

      {/* 위치 라벨(우상단) */}
      <div
        style={{
          position: "absolute",
          top: 70,
          right: 80,
          color: "rgba(255,255,255,0.85)",
          fontFamily: KR_FONT,
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: 2,
        }}
      >
        {location}
      </div>
    </AbsoluteFill>
  );
};
