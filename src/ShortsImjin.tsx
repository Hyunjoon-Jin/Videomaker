import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { KoreaMap } from "./KoreaMap";
import { MarchRoute } from "./MarchRoute";
import { DIVISIONS, TOTAL_DAYS, eventAt, fallenAt } from "./data/imjin";
import { C, FPS } from "./theme";
import { useFonts } from "./fonts";

/** 45초 */
export const IMJIN_DURATION = 45 * FPS;

const HOOK_END = 4 * FPS; // 0-4s   훅
const MARCH_END = 37 * FPS; // 4-37s  진격
// 37-45s 마무리

/** 함락지 주변으로 번지는 붉은 기운 — 거리 기반 감쇠 */
const FALL_TINT = "#7F1D1D";

export const ShortsImjin: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const day = interpolate(frame, [HOOK_END, MARCH_END], [0, TOTAL_DAYS], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const reveal = interpolate(frame, [10, HOOK_END + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fallen = fallenAt(day);
  const ev = eventAt(day);

  const outro = interpolate(frame, [MARCH_END, MARCH_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {/* ── 상단 ── */}
      <div style={{ position: "absolute", top: 110, left: 64, right: 64 }}>
        <div style={{ color: C.dim, fontSize: 32, fontWeight: 700, letterSpacing: 2 }}>
          1592년 · 임진왜란
        </div>
        <div
          style={{
            color: C.text,
            fontSize: 82,
            fontWeight: 900,
            lineHeight: 1.12,
            marginTop: 10,
          }}
        >
          부산에서 한양까지
          <br />
          단 20일
        </div>
      </div>

      {/* ── 지도 + 진격로 ── */}
      <div style={{ position: "absolute", top: 420, left: 30, right: 30, height: 1010 }}>
        <KoreaMap
          reveal={reveal}
          colorOf={(r) => (fallen.has(r.code) ? FALL_TINT : C.flat)}
        >
          {DIVISIONS.map((d) => (
            <MarchRoute key={d.id} division={d} day={day} />
          ))}
        </KoreaMap>
      </div>

      {/* ── 경과일 ── */}
      <div
        style={{
          position: "absolute",
          top: 436,
          right: 60,
          textAlign: "right",
          opacity: reveal,
        }}
      >
        <div
          style={{
            color: C.text,
            fontSize: 132,
            fontWeight: 900,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 40px ${C.bg}`,
          }}
        >
          D+{Math.floor(day)}
        </div>
      </div>

      {/* ── 사건 카드 (날짜 병기) ── */}
      {ev && (
        <div style={{ position: "absolute", bottom: 296, left: 64, right: 64 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ color: C.warn, fontSize: 40, fontWeight: 900 }}>
              {ev.solar}
            </span>
            <span style={{ color: C.dim, fontSize: 28, fontWeight: 700 }}>
              {ev.lunar}
            </span>
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 66,
              fontWeight: 900,
              marginTop: 4,
              transform: `scale(${1 + outro * 0.08})`,
              transformOrigin: "left bottom",
            }}
          >
            {ev.title}
          </div>
          <div style={{ color: C.dim, fontSize: 34, fontWeight: 500, marginTop: 6 }}>
            {ev.detail}
          </div>
        </div>
      )}

      {/* ── 3로 범례 ── */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          left: 64,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          opacity: reveal,
        }}
      >
        {DIVISIONS.map((d) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 6, borderRadius: 3, background: d.color }} />
            <span style={{ color: C.dim, fontSize: 27, fontWeight: 700 }}>
              {d.route} · {d.commander}
            </span>
          </div>
        ))}
      </div>

      {/* ── 출처 ── */}
      <div
        style={{
          position: "absolute",
          bottom: 68,
          left: 64,
          right: 64,
          color: C.dim,
          fontSize: 21,
          lineHeight: 1.45,
        }}
      >
        날짜 양력(음력 병기) · 경계는 현재 행정구역
        <br />
        진격로는 경유지를 이은 도식이며 실제 행군로가 아님
      </div>
    </AbsoluteFill>
  );
};
