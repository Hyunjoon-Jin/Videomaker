import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../theme";
import { KR_FONT, NUM_STYLE } from "../fonts";
import { KTWizMark } from "./KTWizMark";

/**
 * 프로야구 중계 스타일 코너 스코어버그 (우측 하단 상시 노출, Scene 6~13).
 * 실제 중계 그래픽처럼 팀·점수 + 이닝 + 주자(베이스) + 볼카운트(B/S/O)를 한 박스에.
 * 마스터 1개를 씬별 props(점수/이닝/카운트/주자)로만 바꿔 사용.
 */
export interface Count {
  balls: number; // 0-3
  strikes: number; // 0-2
  outs: number; // 0-2
}

export interface ScoreboardProps {
  home?: string;
  away?: string;
  homeScore: number;
  awayScore: number;
  inning: string; // "7회 초"
  count?: Count;
  bases?: [boolean, boolean, boolean]; // 1,2,3루
  /** 등장 애니메이션 여부 */
  appear?: boolean;
  /** 강조 펄스(예: Scene 10 스코어 공개) */
  emphasize?: boolean;
  opacity?: number;
}

const Dot: React.FC<{ on: boolean; color: string; size?: number }> = ({
  on,
  color,
  size = 13,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: on ? color : "rgba(255,255,255,0.16)",
      boxShadow: on ? `0 0 7px ${color}` : "none",
    }}
  />
);

const CountRow: React.FC<{ label: string; total: number; on: number; color: string }> = ({
  label,
  total,
  on,
  color,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span
      style={{
        color: COLORS.subtleGrey,
        fontSize: 15,
        fontWeight: 900,
        width: 13,
        fontFamily: KR_FONT,
      }}
    >
      {label}
    </span>
    {Array.from({ length: total }).map((_, i) => (
      <Dot key={i} on={i < on} color={color} />
    ))}
  </div>
);

const Diamond: React.FC<{ bases: [boolean, boolean, boolean] }> = ({ bases }) => {
  const base = (on: boolean, s: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 17,
        height: 17,
        transform: "rotate(45deg)",
        background: on ? COLORS.amberCaption : "rgba(255,255,255,0.18)",
        boxShadow: on ? `0 0 9px ${COLORS.amberCaption}` : "none",
        border: "1px solid rgba(0,0,0,0.4)",
        ...s,
      }}
    />
  );
  return (
    <div style={{ position: "relative", width: 52, height: 44 }}>
      {base(bases[1], { top: 0, left: 17 })}
      {base(bases[2], { top: 14, left: 1 })}
      {base(bases[0], { top: 14, right: 1 })}
    </div>
  );
};

const TeamRow: React.FC<{
  name: string;
  score: number;
  color: string;
  dot: boolean;
  mark?: boolean;
}> = ({ name, score, color, dot, mark }) => (
  <div style={{ display: "flex", alignItems: "stretch", height: 46 }}>
    <div style={{ width: 6, background: color }} />
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
        background: "rgba(10,15,24,0.94)",
        minWidth: 190,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dot ? COLORS.amberCaption : "transparent",
        }}
      />
      <span
        style={{
          color: COLORS.white,
          fontFamily: KR_FONT,
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: 1,
          flex: 1,
        }}
      >
        {name}
      </span>
      {mark && <KTWizMark size={17} color="#fff" />}
    </div>
    <div
      style={{
        width: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: color,
        color: COLORS.white,
        fontSize: 30,
        fontWeight: 900,
        ...NUM_STYLE,
      }}
    >
      {score}
    </div>
  </div>
);

export const Scoreboard: React.FC<ScoreboardProps> = ({
  home = "최상강남",
  away = "RIVALS",
  homeScore,
  awayScore,
  inning,
  count = { balls: 0, strikes: 0, outs: 0 },
  bases = [false, false, false],
  appear = true,
  emphasize = false,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = appear
    ? spring({ frame, fps, config: { damping: 200, mass: 0.7 } })
    : 1;
  const slide = interpolate(enter, [0, 1], [80, 0]);
  const pulse = emphasize
    ? 1 + Math.max(0, Math.sin((frame - 30) / 6)) * 0.06 * (frame > 30 && frame < 90 ? 1 : 0)
    : 1;

  // 홈 공격(말)일 때 홈 팀에 타격 표시 도트
  const homeAtBat = inning.includes("말");

  return (
    <div
      style={{
        position: "absolute",
        right: 46,
        bottom: 46,
        transform: `translateY(${slide}px) scale(${pulse})`,
        transformOrigin: "bottom right",
        opacity: opacity * enter,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.12)",
        fontFamily: KR_FONT,
      }}
    >
      {/* 팀 두 줄 — 프로야구 관례: 원정(초 공격) 위, 홈(말 공격) 아래 */}
      <TeamRow name={away} score={awayScore} color={COLORS.awayNavy} dot={!homeAtBat} />
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
      <TeamRow name={home} score={homeScore} color={COLORS.homeRed} dot={homeAtBat} mark />

      {/* 하단 스트립: 주자 + 이닝 + B/S/O */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 16px",
          background: "rgba(6,10,17,0.96)",
          borderTop: "2px solid " + COLORS.homeRed,
        }}
      >
        <Diamond bases={bases} />
        <div
          style={{
            color: COLORS.gold,
            fontWeight: 800,
            fontSize: 20,
            minWidth: 58,
          }}
        >
          {inning}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <CountRow label="B" total={3} on={count.balls} color={COLORS.fieldGreenLight} />
          <CountRow label="S" total={2} on={count.strikes} color={COLORS.amberCaption} />
          <CountRow label="O" total={2} on={count.outs} color={COLORS.homeRed} />
        </div>
      </div>
    </div>
  );
};
