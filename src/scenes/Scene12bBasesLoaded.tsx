import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Scoreboard } from "../components/Scoreboard";
import { LiveBug } from "../components/Broadcast";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * Scene 12B — 만루 (5초, 신규).
 * 1·2·3루 주자를 분할 화면으로 동시에 — 결의에 찬/집중하는 표정.
 * 각 패널이 순차로 슬라이드 인 → 스코어바(만루) + LIVE + 중계 자막.
 */
const RUNNERS = [
  { img: "scenes/S12B1.png", base: "1루" },
  { img: "scenes/S12B2.png", base: "2루" },
  { img: "scenes/S12B3.png", base: "3루" },
];

const Panel: React.FC<{ img: string; base: string; index: number }> = ({
  img,
  base,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - index * 6,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const slide = interpolate(enter, [0, 1], [120, 0]);
  const zoom = interpolate(frame, [0, 150], [1.12, 1.2]);

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        transform: `translateY(${slide}px)`,
        opacity: enter,
        borderLeft: index > 0 ? "3px solid rgba(255,255,255,0.9)" : "none",
      }}
    >
      <Img
        src={staticFile(img)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoom})`,
        }}
      />
      {/* 하단 스크림 + 베이스 라벨 */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 26%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 24,
          bottom: 22,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: KR_FONT,
        }}
      >
        <span
          style={{
            background: COLORS.homeRed,
            color: "#fff",
            fontWeight: 900,
            fontSize: 26,
            padding: "4px 14px",
            borderRadius: 4,
          }}
        >
          {base}
        </span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 22, opacity: 0.85 }}>
          주자
        </span>
      </div>
    </div>
  );
};

export const Scene12bBasesLoaded: React.FC = () => {
  const frame = useCurrentFrame();
  const capIn = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {RUNNERS.map((r, i) => (
          <Panel key={r.base} img={r.img} base={r.base} index={i} />
        ))}
      </div>

      <LiveBug />

      {/* 상단 중계 자막 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: capIn,
        }}
      >
        <div
          style={{
            marginTop: 96,
            background: "rgba(8,14,26,0.92)",
            borderBottom: `3px solid ${COLORS.homeRed}`,
            padding: "16px 44px",
            fontFamily: KR_FONT,
            fontWeight: 900,
            fontSize: 52,
            color: "#fff",
            letterSpacing: 1,
          }}
        >
          2사 만루 — 최대의 위기, 최고의 기회
        </div>
      </div>

      <Scoreboard
        homeScore={3}
        awayScore={5}
        inning="8회 말"
        bases={[true, true, true]}
        count={{ balls: 0, strikes: 0, outs: 2 }}
      />
    </AbsoluteFill>
  );
};
