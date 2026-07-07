import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Plate } from "../components/Plate";
import { Scoreboard } from "../components/Scoreboard";
import { COLORS } from "../theme";
import { KR_FONT } from "../fonts";

/**
 * Scene 9 — 삼진: 연속 수주 행진 (10초).
 * 투수(수주왕·B2B) 던짐 → 라이벌 타자 '헛스윙' 반복 → K 누적. 컷이 점점 빨라짐.
 * 실제 헛스윙 컷을 반복해 삼진 잡는 실감을 살린다.
 */

// 투수 뒷면 이름/등번호 그래픽(AI 한글 뭉개짐 회피 — 깔끔하게 얹음).
const PitcherName: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: "53%",
      top: "34%",
      transform: "translateX(-50%) rotate(-6deg)",
      textAlign: "center",
      fontFamily: KR_FONT,
      color: "#141414",
      pointerEvents: "none",
    }}
  >
    {/* 이미지에 박힌 뭉개진 글자를 가리는 저지색 마스크 패치 */}
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: -6,
        transform: "translateX(-50%)",
        width: 250,
        height: 64,
        background:
          "radial-gradient(60% 100% at 50% 45%, #EDEDED 0%, #E2E2E2 70%, rgba(226,226,226,0) 100%)",
        filter: "blur(2px)",
      }}
    />
    <div style={{ position: "relative", fontSize: 48, fontWeight: 900, letterSpacing: 3 }}>
      수주왕
    </div>
    <div
      style={{
        position: "relative",
        fontSize: 128,
        fontWeight: 900,
        fontStyle: "italic",
        lineHeight: 1,
        marginTop: 6,
      }}
    >
      B2B
    </div>
  </div>
);

// 던짐 → 헛스윙 반복 몽타주 (컷이 점점 짧아짐)
type Beat = { s: number; kind: "pitch" | "whiff"; img?: string };
const BEATS: Beat[] = [
  { s: 0, kind: "pitch" },
  { s: 42, kind: "whiff", img: "scenes/S09B.png" },
  { s: 74, kind: "pitch" },
  { s: 106, kind: "whiff", img: "scenes/S09C.png" },
  { s: 136, kind: "pitch" },
  { s: 162, kind: "whiff", img: "scenes/S09B.png" },
  { s: 190, kind: "pitch" },
  { s: 212, kind: "whiff", img: "scenes/S09C.png" },
  { s: 242, kind: "whiff", img: "scenes/S09B.png" },
];
// 헛스윙 완료마다 K 하나
const K_AT = [66, 128, 184, 238];

export const Scene09Strikeout: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = [...BEATS].reverse().find((b) => frame >= b.s) ?? BEATS[0];
  const kCount = K_AT.filter((f) => frame >= f).length;
  // 미트 임팩트 순간 흔들림(헛스윙 직후)
  const shake = K_AT.some((f) => frame >= f && frame < f + 5) ? (frame % 2 ? 4 : -4) : 0;

  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      {beat.kind === "pitch" ? (
        <>
          <Plate img="scenes/S09.png" label="Scene 9" title="삼진 · 연속 수주" seconds={10} live kenBurns={false} />
          <PitcherName />
        </>
      ) : (
        <Plate key={beat.s} img={beat.img!} label="Scene 9" title="헛스윙!" seconds={10} live kenBurns={false} />
      )}

      {/* 관중 K 팻말 — 누적 K 마크 */}
      <div
        style={{
          position: "absolute",
          top: 150,
          right: 90,
          display: "flex",
          gap: 16,
          fontFamily: KR_FONT,
        }}
      >
        {K_AT.map((_, i) => (
          <div
            key={i}
            style={{
              width: 76,
              height: 96,
              borderRadius: 10,
              background: i < kCount ? COLORS.amberCaption : "rgba(255,255,255,0.08)",
              color: i < kCount ? "#111" : "rgba(255,255,255,0.25)",
              border: "3px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              fontWeight: 900,
              transform: i < kCount ? "scale(1)" : "scale(0.86)",
              boxShadow: i < kCount ? "0 0 24px rgba(246,196,69,0.55)" : "none",
            }}
          >
            K
          </div>
        ))}
      </div>

      <Scoreboard
        homeScore={4}
        awayScore={0}
        inning="6회 말"
        count={{ balls: 1, strikes: 2, outs: 2 }}
      />
    </AbsoluteFill>
  );
};
