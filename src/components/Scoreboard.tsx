import React from "react";
import { COLORS } from "../theme";
import { KR_FONT, NUM_STYLE } from "../fonts";

/**
 * 방송 중계 스타일 상단 스코어바 (Scene 6~13 상시 노출).
 * 가이드 원칙: 숫자 대신 점등 도트 = 방송 그래픽 문법. 전광판 실사 금지.
 * 마스터 1개를 만들어 씬별 숫자만 교체 — 여기서는 props로 구현.
 */
export interface Count {
  balls: number; // 0-3
  strikes: number; // 0-2
  outs: number; // 0-2
}

export interface ScoreboardProps {
  home?: string; // 우리 팀
  away?: string; // 상대
  homeScore: number;
  awayScore: number;
  inning: string; // "1회초", "8회 말" 등
  count?: Count; // 풀카운트 표기(선택)
  bases?: [boolean, boolean, boolean]; // 1,2,3루 주자
  /** 전체 스케일(Scene 10 확대 애니메이션 등) */
  scale?: number;
  opacity?: number;
}

const Dots: React.FC<{ total: number; on: number; color: string }> = ({
  total,
  on,
  color,
}) => (
  <div style={{ display: "flex", gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: i < on ? color : "rgba(255,255,255,0.18)",
          boxShadow: i < on ? `0 0 8px ${color}` : "none",
        }}
      />
    ))}
  </div>
);

const Diamond: React.FC<{ bases: [boolean, boolean, boolean] }> = ({
  bases,
}) => {
  // 2루(위), 3루(왼), 1루(오른) — 방송 다이아몬드 배치
  const base = (on: boolean, style: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 18,
        height: 18,
        transform: "rotate(45deg)",
        background: on ? COLORS.amberCaption : "rgba(255,255,255,0.2)",
        boxShadow: on ? `0 0 10px ${COLORS.amberCaption}` : "none",
        ...style,
      }}
    />
  );
  return (
    <div style={{ position: "relative", width: 58, height: 48 }}>
      {base(bases[1], { top: 0, left: 20 })}
      {base(bases[2], { top: 15, left: 2 })}
      {base(bases[0], { top: 15, right: 2 })}
    </div>
  );
};

const TeamCell: React.FC<{
  name: string;
  score: number;
  color: string;
}> = ({ name, score, color }) => (
  <div style={{ display: "flex", alignItems: "stretch" }}>
    <div
      style={{
        background: color,
        color: COLORS.white,
        fontFamily: KR_FONT,
        fontWeight: 900,
        fontSize: 30,
        letterSpacing: 2,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
      }}
    >
      {name}
    </div>
    <div
      style={{
        background: "rgba(0,0,0,0.55)",
        color: COLORS.white,
        minWidth: 60,
        padding: "0 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 40,
        fontWeight: 900,
        ...NUM_STYLE,
      }}
    >
      {score}
    </div>
  </div>
);

export const Scoreboard: React.FC<ScoreboardProps> = ({
  home = "GANGNAM",
  away = "RIVALS",
  homeScore,
  awayScore,
  inning,
  count,
  bases,
  scale = 1,
  opacity = 1,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: "50%",
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: "top center",
        opacity,
        display: "flex",
        alignItems: "stretch",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <TeamCell name={home} score={homeScore} color={COLORS.gangnamNavy} />

      {/* 이닝 */}
      <div
        style={{
          background: "rgba(10,16,26,0.95)",
          color: COLORS.gold,
          fontFamily: KR_FONT,
          fontWeight: 700,
          fontSize: 26,
          padding: "0 22px",
          display: "flex",
          alignItems: "center",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {inning}
      </div>

      <TeamCell name={away} score={awayScore} color={COLORS.rivalsRed} />

      {/* B/S/O + 다이아몬드(선택) */}
      {(count || bases) && (
        <div
          style={{
            background: "rgba(10,16,26,0.95)",
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "0 24px",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {bases && <Diamond bases={bases} />}
          {count && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                fontFamily: KR_FONT,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={label}>B</span>
                <Dots total={3} on={count.balls} color={COLORS.fieldGreenLight} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={label}>S</span>
                <Dots total={2} on={count.strikes} color={COLORS.amberCaption} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={label}>O</span>
                <Dots total={2} on={count.outs} color={COLORS.breakingRed} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const label: React.CSSProperties = {
  color: COLORS.subtleGrey,
  fontSize: 18,
  fontWeight: 900,
  width: 16,
};
