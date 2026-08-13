import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { WarMap } from "./ProvinceMap";
import { TOTAL_MONTHS, monthLabel, warEventAt } from "./data/war";
import { battlesUpTo } from "./data/battles";
import { Shot, cameraAt } from "./mapcam";
import { C, FPS } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";

const HOOK = Math.round(4.5 * FPS);

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
/** 개월 → 프레임. 사건이 화면에 뜬 시점을 알아야 글자를 그때부터 쓴다. */
function frameOfMonth(m: number): number {
  let f = HOOK;
  for (let i = 0; i < LEGS.length; i++) {
    if (m <= LEGS[i].to) {
      const t = (m - LEGS[i].from) / (LEGS[i].to - LEGS[i].from);
      return f + Math.max(0, Math.min(1, t)) * LEG_FRAMES[i];
    }
    f += LEG_FRAMES[i];
  }
  return f;
}

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

/**
 * 카메라 샷.
 *
 * 부산에 상륙할 때는 부산으로, 한산도에서 이길 때는 남해로, 의주까지
 * 밀릴 때는 압록강 쪽으로 붙는다. 좌표는 지도 좌표계(0..1000)다.
 * LEGS가 프레임을 정하므로 at 값은 그 경계에서 가져왔다.
 */
const SHOTS: Shot[] = [
  { at: HOOK - 20, cx: 455, cy: 500, z: 1.5 },
  { at: HOOK + 34, cx: 600, cy: 790, z: 3.2 },    // 부산 상륙
  { at: HOOK + 110, cx: 470, cy: 600, z: 2.5 },   // 북상
  { at: HOOK + 180, cx: 500, cy: 800, z: 3.0 },   // 한산도
  { at: HOOK + 250, cx: 380, cy: 330, z: 2.3 },   // 평양·의주
  { at: HOOK + 400, cx: 440, cy: 520, z: 1.9 },   // 반격
  { at: HOOK + 560, cx: 430, cy: 700, z: 2.4 },   // 소강 — 남해안 왜성
  { at: HOOK + 700, cx: 380, cy: 700, z: 2.9 },   // 정유재란·명량
  { at: HOOK + 830, cx: 470, cy: 760, z: 2.6 },   // 노량
  { at: HOOK + 960, cx: 455, cy: 520, z: 1.7 },
];

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

  const cam = cameraAt(SHOTS, frame);
  /** 화면 픽셀 → 지도 단위. 확대해도 선과 글자가 굵어지지 않게 한다. */
  const u = (px: number) => px / (1.08 * cam.z);

  const accent = ev?.win ? "#4C7A9B" : C.drop;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      {/* BGM — scripts/make-bgm.py가 영상과 같은 구간 경계로 합성한다.
          내레이션이 없으므로 볼륨을 크게 잡아도 가릴 것이 없다. */}
      <Audio src={staticFile("bgm.wav")} volume={0.9} />

      {/* ── 지도 ── */}
      <AbsoluteFill style={{ opacity: mapIn }}>
        <WarMap month={month} reveal={mapIn} viewBox={cam.viewBox} u={u} />
      </AbsoluteFill>

      {/* 글자 자리 어둠 — 지도가 전면이라 이게 없으면 글자가 지도에 묻힌다 */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(12,10,8,0.93) 0%, rgba(12,10,8,0.55) 12%, rgba(12,10,8,0) 22%, rgba(12,10,8,0) 62%, rgba(12,10,8,0.7) 76%, rgba(12,10,8,0.94) 88%)",
          pointerEvents: "none",
        }}
      />

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
          {/* 사건 이름도 한 글자씩 쓴다. 통째로 나타났다 사라지면 눈이
              한 번에 훑고 끝나서 아무것도 안 남는다. */}
          <Typed
            text={ev.title}
            start={frameOfMonth(ev.month)}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 94,
              fontWeight: 900,
              lineHeight: 1.08,
              marginTop: 4,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          />
          <Typed
            text={ev.detail}
            start={frameOfMonth(ev.month) + Math.ceil((ev.title.length * 30) / 14) + 5}
            cps={26}
            style={{
              display: "block",
              color: "#BDB3A0",
              fontSize: 38,
              fontWeight: 500,
              marginTop: 8,
            }}
          />
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
          <div style={{ color: "#8A8070", fontSize: 20 }}>
            날짜는 음력 · 좌표는 실측값, 그 사이는 추정 (자세한 설명은 고정댓글)
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
            <Typed
              text="1592년 음력 5월 3일, 일본군 한양 입성"
              start={4}
              cps={30}
              style={{
                display: "block",
                color: C.dim,
                fontSize: 40,
                fontWeight: 700,
              }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="11"
                start={42}
                cps={8}
                style={{
                  color: C.dropHot,
                  fontSize: 275,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="개월"
                start={50}
                cps={8}
                style={{ color: C.text, fontSize: 92, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="일본군이 한양을 차지하고 있던 기간"
              start={72}
              cps={22}
              style={{
                display: "block",
                color: C.text,
                fontSize: 50,
                fontWeight: 700,
                marginTop: 10,
              }}
            />
          </div>        </AbsoluteFill>
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
