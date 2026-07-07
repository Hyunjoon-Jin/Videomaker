import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";
import { LiveBug } from "../components/Broadcast";
import { KTWizMark } from "../components/KTWizMark";

/**
 * Scene 6B — 선발 라인업 소개 (8초, 그래픽).
 * 방송 라인업 카드 — 타순/포지션. 코드 그래픽이라 글자 깨짐 없음.
 */
const LINEUP = [
  { pos: "CF", name: "중견수" },
  { pos: "SS", name: "유격수" },
  { pos: "3B", name: "3루수" },
  { pos: "DH", name: "지명타자" },
  { pos: "1B", name: "1루수" },
  { pos: "LF", name: "좌익수" },
  { pos: "RF", name: "우익수" },
  { pos: "2B", name: "2루수" },
  { pos: "C", name: "포수" },
];

export const Scene06bLineup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.fieldGreen} 0%, #06140C 100%)`,
        fontFamily: KR_FONT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LiveBug />
      <div style={{ width: 1180, maxWidth: "86%" }}>
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            transform: `translateX(${interpolate(titleIn, [0, 1], [-40, 0])}px)`,
            opacity: titleIn,
            marginBottom: 28,
          }}
        >
          <div style={{ width: 10, height: 64, background: COLORS.homeRed }} />
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                color: COLORS.subtleGrey,
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: 6,
              }}
            >
              STARTING LINEUP
              <KTWizMark size={26} color="#fff" />
            </div>
            <div style={{ color: "#fff", fontSize: 60, fontWeight: 900 }}>
              최상강남 선발 라인업
            </div>
          </div>
        </div>

        {/* 라인업 행 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LINEUP.map((p, i) => {
            const rowIn = spring({
              frame: frame - 10 - i * 4,
              fps,
              config: { damping: 200, mass: 0.6 },
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: "rgba(6,12,20,0.82)",
                  borderLeft: `5px solid ${COLORS.homeRed}`,
                  padding: "12px 24px",
                  transform: `translateX(${interpolate(rowIn, [0, 1], [60, 0])}px)`,
                  opacity: rowIn,
                }}
              >
                <span
                  style={{
                    width: 44,
                    color: COLORS.gold,
                    fontSize: 34,
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    width: 70,
                    color: "#fff",
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: 1,
                  }}
                >
                  {p.pos}
                </span>
                <span style={{ color: COLORS.offWhite, fontSize: 30, fontWeight: 700 }}>
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
