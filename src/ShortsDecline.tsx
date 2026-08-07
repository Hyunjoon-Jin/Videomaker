import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { KoreaMap } from "./KoreaMap";
import { REGIONS } from "./data/regions";
import { END_YEAR, IS_REAL_DATA, START_YEAR, changeRatio } from "./data/population";
import { C, FPS } from "./theme";
import { loadFonts } from "./fonts";

loadFonts();

/** 40초 = 1200프레임 */
export const SHORT_DURATION = 40 * FPS;

const HOOK_END = 3 * FPS; // 0-3s   훅
const SCAN_END = 32 * FPS; // 3-32s  연도 진행
// 32-40s 마무리

/** 해당 연도에 1975년 대비 인구가 줄어든 시군구 수 */
function decliningCount(year: number): number {
  const y = Math.round(year);
  let n = 0;
  for (const r of REGIONS) if (changeRatio(y, r.code) < 0) n++;
  return n;
}

export const ShortsDecline: React.FC = () => {
  const frame = useCurrentFrame();

  // 연도 진행: 훅 구간은 1975 고정, 이후 2025까지 흐르고, 마무리 구간은 2025 고정
  const year = interpolate(frame, [HOOK_END, SCAN_END], [START_YEAR, END_YEAR], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const reveal = interpolate(frame, [10, HOOK_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const declining = decliningCount(year);
  const finalPush = interpolate(frame, [SCAN_END, SCAN_END + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {/* ── 상단 카피 ── */}
      <div style={{ position: "absolute", top: 120, left: 64, right: 64 }}>
        <div style={{ color: C.dim, fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>
          대한민국 시군구 인구
        </div>
        <div
          style={{
            color: C.text,
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 1.15,
            marginTop: 12,
          }}
        >
          50년 동안
          <br />
          어디가 사라졌나
        </div>
      </div>

      {/* ── 지도 ── */}
      <div
        style={{
          position: "absolute",
          top: 430,
          left: 40,
          right: 40,
          height: 1000,
        }}
      >
        <KoreaMap year={year} reveal={reveal} />
      </div>

      {/* ── 연도 (지도 위 대형 표시) ── */}
      <div
        style={{
          position: "absolute",
          top: 452,
          right: 64,
          color: C.text,
          fontSize: 130,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          opacity: reveal,
          textShadow: `0 0 40px ${C.bg}`,
        }}
      >
        {Math.round(year)}
      </div>

      {/* ── 하단 카운터 ── */}
      <div style={{ position: "absolute", bottom: 250, left: 64, right: 64 }}>
        <div style={{ color: C.dim, fontSize: 34, fontWeight: 700 }}>
          1975년보다 인구가 줄어든 지역
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 6 }}>
          <span
            style={{
              color: C.dropHot,
              fontSize: 150,
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
              transform: `scale(${1 + finalPush * 0.12})`,
              transformOrigin: "left bottom",
              display: "inline-block",
            }}
          >
            {declining}
          </span>
          <span style={{ color: C.text, fontSize: 56, fontWeight: 700 }}>
            / {REGIONS.length}곳
          </span>
        </div>
      </div>

      {/* ── 범례 ── */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 64,
          display: "flex",
          gap: 28,
          alignItems: "center",
          opacity: reveal,
        }}
      >
        <Legend color={C.drop} label="감소" />
        <Legend color={C.flat} label="유지" />
        <Legend color={C.grow} label="증가" />
      </div>

      {/* ── 출처 ── */}
      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 64,
          color: C.dim,
          fontSize: 24,
          fontWeight: 400,
        }}
      >
        경계: 통계청 2018 시군구 · 인구: {IS_REAL_DATA ? "KOSIS 주민등록인구" : "미연결"}
      </div>

      {/* ── 합성 데이터 경고 (실데이터 연결 시 자동으로 사라짐) ── */}
      {!IS_REAL_DATA && <SampleBadge />}
    </AbsoluteFill>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: color }} />
    <span style={{ color: C.dim, fontSize: 28, fontWeight: 700 }}>{label}</span>
  </div>
);

/**
 * 합성 데이터로 렌더 중임을 화면에 못박는 배지.
 * 이 파일럿이 실제 통계로 오해되는 일을 막기 위한 것이므로 임의로 끄지 말 것.
 */
const SampleBadge: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: `10px solid ${C.warn}`,
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 34,
        left: 0,
        right: 0,
        textAlign: "center",
        color: C.warn,
        fontSize: 32,
        fontWeight: 900,
        letterSpacing: 3,
      }}
    >
      샘플 데이터 · 실제 통계 아님
    </div>
  </>
);
