import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { WarMap } from "./ProvinceMap";
import { TOTAL_MONTHS, monthLabel, warEventAt } from "./data/war";
import { battlesUpTo } from "./data/battles";
import { C, FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";

const HOOK = Math.round(2.4 * FPS);

/**
 * 7년을 어떻게 배분하는가.
 * 등속으로 흘리면 아무 일 없는 1594~1596이 전체의 절반을 먹는다.
 * 사건이 몰린 구간은 느리게, 소강기는 빠르게 — 구간별로 속도를 정한다.
 */
const LEGS: Array<{ from: number; to: number; secs: number }> = [
  { from: 0, to: 4, secs: 9 },    // 1592 개전~최대진출
  { from: 4, to: 12, secs: 8 },   // 1593 반격~수복
  { from: 12, to: 60, secs: 4 },  // 1594~96 소강 — 빠르게 흘린다
  { from: 60, to: 67, secs: 8 },  // 1597 정유재란~명량
  { from: 67, to: 79, secs: 6 },  // 1598 종결
];

const LEG_FRAMES = LEGS.map((l) => Math.round(l.secs * FPS));
export const WAR_DURATION = HOOK + LEG_FRAMES.reduce((a, b) => a + b, 0) + 30;

/** 프레임 → 개월. 구간별 속도가 다르지만 전체적으로는 단조 증가. */
function monthAt(frame: number): number {
  let f = frame - HOOK;
  if (f <= 0) return 0;
  for (let i = 0; i < LEGS.length; i++) {
    if (f <= LEG_FRAMES[i]) {
      const t = f / LEG_FRAMES[i];
      return LEGS[i].from + (LEGS[i].to - LEGS[i].from) * t;
    }
    f -= LEG_FRAMES[i];
  }
  return TOTAL_MONTHS;
}

export const ShortsWar: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const month = monthAt(frame);

  const ev = warEventAt(month);

  // 사건 직후에만 충격이 실린다
  const near = ev ? Math.max(0, 1 - (month - ev.month) * 2.2) : 0;
  const impact = (ev?.impact ?? 0) * near;

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mapIn = interpolate(frame, [HOOK - 8, HOOK + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const accent = ev?.win ? "#4C7A9B" : C.drop;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {/* BGM — scripts/make-bgm.py가 영상과 같은 구간 경계로 합성한다.
          내레이션이 없으므로 볼륨을 크게 잡아도 가릴 것이 없다. */}
      <Audio src={staticFile("bgm.wav")} volume={0.9} />

      {/* ── 지도 ── */}
      <div
        style={{
          position: "absolute",
          top: 360,
          left: 20,
          right: 20,
          height: 1040,
          opacity: mapIn,
        }}
      >
        <WarMap month={month} reveal={mapIn} />
      </div>

      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, ${
            ev?.win ? "rgba(76,122,155," : "rgba(179,58,43,"
          }${impact * 0.18}) 0%, rgba(0,0,0,0) 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── 연월 ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", top: 108, left: 60, right: 60 }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            임진왜란과 정유재란
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {monthLabel(month)}
          </div>
        </div>
      )}

      {/* ── 사건 ── */}
      {ev && mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 306, left: 60, right: 60 }}>
          <div style={{ color: accent, fontSize: 34, fontWeight: 900 }}>
            {ev.win ? "조선 승전" : ev.date}
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 94,
              fontWeight: 900,
              lineHeight: 1.08,
              marginTop: 4,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          >
            {ev.title}
          </div>
          <div style={{ color: "#BDB3A0", fontSize: 38, fontWeight: 500, marginTop: 8 }}>
            {ev.detail}
          </div>
        </div>
      )}

      {/* ── 진행 바 (7년) ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 226, left: 60, right: 60 }}>
          <div style={{ height: 7, background: "#2A241D" }}>
            <div
              style={{
                width: `${(month / TOTAL_MONTHS) * 100}%`,
                height: "100%",
                background: C.drop,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: C.dim,
              fontSize: 23,
              fontWeight: 700,
              marginTop: 9,
            }}
          >
            <span>1592</span>
            <span>7년</span>
            <span>1598</span>
          </div>
        </div>
      )}

      {/* ── 범례 · 고지 ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 62, left: 60, right: 60 }}>
          <div style={{ display: "flex", gap: 22, marginBottom: 10, flexWrap: "wrap" }}>
            <Key color="#7A2A20" label="일본군 점령" />
            <Key color="#7FA8C4" label="조선 승전" />
            <Key color="#D4694F" label="일본 승전" />
            <Key color="#7C8B52" label="의병" />
            <Key color="#C08A7A" label="왜성" />
            <span style={{ color: C.dim, fontSize: 25, fontWeight: 700 }}>
              전투 {battlesUpTo(month).length}
            </span>
          </div>
          <div style={{ color: "#5E5648", fontSize: 19, lineHeight: 1.5 }}>
전선 궤적의 경유지와 전투는 실좌표, 그 사이 잔굴곡은 생성한 것
            <br />
            날짜는 음력이다. 점선으로 두른 전라도는 1차 침공 때 지켜낸 도다
            <br />
            의병은 점령 지역이 아니라 기병지를 찍은 것이다
          </div>
        </div>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: C.bg,
            opacity: hookOut,
            justifyContent: "center",
            padding: "0 70px",
          }}
        >
          <div style={{ opacity: hookIn }}>
            <div style={{ color: C.dim, fontSize: 40, fontWeight: 700 }}>
              1592년 4월 13일, 부산
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginTop: 2,
              }}
            >
              <span
                style={{
                  color: C.dropHot,
                  fontSize: 290,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                20
              </span>
              <span style={{ color: C.text, fontSize: 96, fontWeight: 800 }}>일</span>
            </div>
            <div
              style={{
                color: C.text,
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 1.4,
                marginTop: 10,
              }}
            >
              만에 한양이 무너졌다
              <br />
              전쟁은 거기서 7년을 더 갔다
            </div>
          </div>
        </AbsoluteFill>
      )}
      <Grain />
    </AbsoluteFill>
  );
};

const Key: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: 24, height: 24, background: color }} />
    <span style={{ color: "#BDB3A0", fontSize: 25, fontWeight: 700 }}>{label}</span>
  </div>
);
