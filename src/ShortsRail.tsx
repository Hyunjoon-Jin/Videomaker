import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import provinces from "./data/provinces.json";
import {
  LINES,
  RailLine,
  cutLatAt,
  northmostAt,
  RAIL_EVENTS,
  partialPath,
  railEventAt,
  splitAt,
} from "./data/rail";
import { project } from "./data/places";
import { Shot, cameraAt, shotsFromEvents } from "./mapcam";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;
const VIEWBOX: string = provinces.viewBox;

const HOOK = Math.round(4.5 * FPS);

/**
 * 127년을 어떻게 배분하는가.
 * 등속으로 흘리면 노선이 몰린 1899~1945에 아무 시간도 안 돌아간다.
 * 선이 놓이는 구간은 느리게, 아무것도 안 놓이는 구간은 빠르게 간다.
 */
const LEGS: Array<{ from: number; to: number; secs: number }> = [
  { from: 1899, to: 1915, secs: 9 },   // 경인·경부·경의·호남·경원
  { from: 1915, to: 1944, secs: 7 },   // 함경·전라·중앙
  { from: 1944, to: 1954, secs: 6 },   // 분단과 전쟁 — 끊기는 구간
  { from: 1954, to: 2001, secs: 5 },   // 남쪽만 촘촘해진다
  { from: 2001, to: 2007, secs: 5 },   // 도라산과 KTX가 2년 사이에 몰려 있다
  { from: 2007, to: 2026, secs: 6 },   // 고속선 확장
];

const LEG_FRAMES = LEGS.map((l) => Math.round(l.secs * FPS));
const TAIL = Math.round(2 * FPS);
export const RAIL_DURATION = HOOK + LEG_FRAMES.reduce((a, b) => a + b, 0) + TAIL;

/**
 * 연도 → 프레임. yearAt의 역함수.
 *
 * 사건의 충격을 '몇 년 지났나'로 재면 구간마다 지속 시간이 달라진다.
 * 1954~2001 구간은 초당 9년이 흘러서 2년짜리 감쇠가 0.2초 만에 끝난다.
 * 프레임으로 재야 어느 구간에서든 같은 길이로 보인다.
 */
function frameOfYear(y: number): number {
  let f = HOOK;
  for (let i = 0; i < LEGS.length; i++) {
    if (y <= LEGS[i].to) {
      const t = (y - LEGS[i].from) / (LEGS[i].to - LEGS[i].from);
      return f + Math.max(0, Math.min(1, t)) * LEG_FRAMES[i];
    }
    f += LEG_FRAMES[i];
  }
  return f;
}

function yearAt(frame: number): number {
  let f = frame - HOOK;
  if (f <= 0) return LEGS[0].from;
  for (let i = 0; i < LEGS.length; i++) {
    if (f <= LEG_FRAMES[i]) {
      const t = f / LEG_FRAMES[i];
      return LEGS[i].from + (LEGS[i].to - LEGS[i].from) * t;
    }
    f -= LEG_FRAMES[i];
  }
  return LEGS[LEGS.length - 1].to;
}

/**
 * 카메라 샷 — 연표에서 만든다.
 *
 * 손으로 프레임을 찍으면 자막과 화면이 어긋난다. 사건이 뜨는 프레임과
 * 그 사건이 벌어진 좌표를 같은 곳에서 가져오면 어긋날 수가 없다.
 */
const SHOTS: Shot[] = shotsFromEvents(
  RAIL_EVENTS.filter((e) => e.focus).map((e) => {
    const q = project(e.focus![0], e.focus![1]);
    return { frame: Math.max(HOOK + 8, frameOfYear(e.year)), cx: q.x, cy: q.y, z: e.zoom ?? 2.2 };
  }),
  { lead: 18, hold: 30, first: { at: HOOK - 24, cx: 455, cy: 520, z: 1.5 } }
);

const LANDF = "#302C22";
const COAST = "#5E5747";
/** 개통 후 살아 있는 선 */
const LIVE = "#D9A45E";
/** 고속선 */
const FAST = "#7FA8C4";
/** 끊긴 선 */
const DEAD = "#6A6252";

/** 노선이 다 그려지는 데 걸리는 연수 — 길이와 무관하게 같은 시간을 준다 */
const DRAW_YEARS = 1.6;
/** 분단 */
const CUT_YEAR = 1945;

export const ShortsRail: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const year = yearAt(frame);
  const ev = railEventAt(year);
  const north = northmostAt(year);
  const cut = year >= CUT_YEAR;
  /** 끊기는 순간의 충격 — 사건 직후에만 실린다 */
  const near = ev ? Math.max(0, 1 - (frame - frameOfYear(ev.year)) / 26) : 0;
  const impact = (ev?.impact ?? 0) * near;

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const mapIn = interpolate(frame, [HOOK - 8, HOOK + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cam = cameraAt(SHOTS, frame);
  /** 화면 픽셀 → 지도 단위. 확대해도 선과 글자가 굵어지지 않게 한다. */
  const u = (px: number) => px / (1.08 * cam.z);

  const nq = project(north.lon, north.lat);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-rail.wav")} volume={0.9} />

      {/* ── 지도 ── */}
      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LANDF} stroke={COAST} strokeWidth={u(1.8)} />
          ))}

          {/* 38선 — 이 편의 사건은 전부 이 선 위에서 일어난다 */}
          <line
            x1={228}
            y1={project(127, 38).y}
            x2={660}
            y2={project(127, 38).y}
            stroke={cut ? INK.oxide : "#4A4638"}
            strokeWidth={u(cut ? 3 : 1.8)}
            strokeDasharray={`${u(12)} ${u(10)}`}
            opacity={cut ? 0.75 : 0.4}
          />

          {LINES.map((l) => (
            <Line key={l.id} l={l} year={year} u={u} />
          ))}

          {/* 서울에서 갈 수 있는 최북단 */}
          <g>
            <circle
              cx={nq.x}
              cy={nq.y}
              r={u(9)}
              fill="none"
              stroke={INK.brass}
              strokeWidth={u(4)}
            />
            <circle cx={nq.x} cy={nq.y} r={u(3.4)} fill={INK.brass} />
            <text
              x={nq.x + u(north.name === "신의주" ? -17 : 17)}
              y={nq.y + u(9)}
              textAnchor={north.name === "신의주" ? "end" : "start"}
              fontSize={u(31)}
              fontWeight={900}
              fill={INK.brass}
              style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: u(6) }}
            >
              {north.name}
            </text>
          </g>
        </svg>
      </AbsoluteFill>

      {/* 글자 자리 어둠 — 지도가 전면이라 이게 없으면 글자가 지도에 묻힌다 */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(12,10,8,0.93) 0%, rgba(12,10,8,0.55) 12%, rgba(12,10,8,0) 22%, rgba(12,10,8,0) 60%, rgba(12,10,8,0.72) 75%, rgba(12,10,8,0.95) 88%)",
          pointerEvents: "none",
        }}
      />

      {/* 끊기는 순간에만 붉은 기운이 돈다 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 40%, rgba(179,58,43,${impact * (ev?.cut ? 0.2 : 0.08)}) 0%, rgba(0,0,0,0) 58%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── 연도 ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", top: 104, left: 60, right: 60 }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700 }}>
            한반도 철도
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
            {Math.floor(year)}년
          </div>
        </div>
      )}

      {/* ── 지표와 사건 ── */}
      {mapIn > 0.5 && ev && (
        <div style={{ position: "absolute", bottom: 300, left: 60, right: 60 }}>
          <div style={{ height: 1, background: "#3B342A", marginBottom: 14 }} />
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              color: C.dim,
              fontSize: 27,
              fontWeight: 700,
            }}
          >
            <span>서울에서 갈 수 있는 가장 북쪽</span>
            <span style={{ color: INK.brass, fontSize: 40, fontWeight: 900 }}>
              {north.name}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              북위 {north.lat.toFixed(2)}°
            </span>
          </div>
          <Typed
            text={ev.title}
            start={frameOfYear(ev.year)}
            cps={14}
            style={{
              display: "block",
              color: ev.cut ? INK.oxideHot : C.text,
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.08,
              marginTop: 12,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          />
          <Typed
            text={ev.detail}
            start={frameOfYear(ev.year) + Math.ceil((ev.title.length * 30) / 14) + 5}
            cps={26}
            style={{
              display: "block",
              color: "#BDB3A0",
              fontSize: 36,
              fontWeight: 500,
              marginTop: 6,
            }}
          />
        </div>
      )}

      {/* ── 범례와 고지 ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 62, left: 60, right: 60 }}>
          <div style={{ display: "flex", gap: 22, marginBottom: 10, flexWrap: "wrap" }}>
            <Key color={LIVE} label="운행 노선" />
            <Key color={FAST} label="고속선" />
            <Key color={DEAD} label="끊긴 구간" dashed />
          </div>
          <div style={{ color: "#8A8070", fontSize: 20 }}>
            연도는 전 구간 개통 기준 · 선형은 근사 (자세한 설명은 고정댓글)
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
              text="서울역에서 신의주행 표를 팔던"
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
                text="39"
                start={38}
                cps={8}
                style={{
                  color: INK.brass,
                  fontSize: 280,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="년"
                start={46}
                cps={8}
                style={{ color: C.text, fontSize: 94, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="1906년 경의선 개통에서 1945년까지"
              start={64}
              cps={22}
              style={{
                display: "block",
                color: C.text,
                fontSize: 50,
                fontWeight: 700,
                marginTop: 10,
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      <Grain />
    </AbsoluteFill>
  );
};

/**
 * 노선 하나.
 *
 * 개통 연도부터 길이 기준으로 자라난다. 한 번에 나타나면 '놓인' 것이
 * 아니라 '원래 있던' 것으로 보인다.
 *
 * 38선을 넘는 노선은 1945년에 이북 구간만 회색 점선으로 바뀐다.
 * 지우지 않는 이유는 선로가 사라진 게 아니라 못 가게 된 것이기 때문이다.
 */
const Line: React.FC<{
  l: RailLine;
  year: number;
  u: (px: number) => number;
}> = ({ l, year, u }) => {
  if (year < l.year) return null;
  const p = Math.min(1, (year - l.year) / DRAW_YEARS);
  const d = partialPath(l.pts, p);
  if (!d) return null;

  const cut = l.north && year >= CUT_YEAR && p >= 1;
  const color = l.fast ? FAST : LIVE;

  // 끊긴 노선은 경계에서 둘로 나눈다. 남쪽은 계속 다녔다.
  const parts = cut ? splitAt(l.pts, cutLatAt(year)) : null;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={u(l.fast ? 12 : 9)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.16}
      />
      {parts ? (
        <>
          <path
            d={parts.south}
            fill="none"
            stroke={color}
            strokeWidth={u(3.6)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 이북 구간 — 선로는 남아 있고 다니지 못할 뿐이다 */}
          <path
            d={parts.north}
            fill="none"
            stroke={DEAD}
            strokeWidth={u(3.4)}
            strokeDasharray={`${u(9)} ${u(10)}`}
            strokeLinecap="round"
            opacity={0.9}
          />
        </>
      ) : (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={u(l.fast ? 4.6 : 3.6)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
};

const Key: React.FC<{ color: string; label: string; dashed?: boolean }> = ({
  color,
  label,
  dashed,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <svg width={26} height={8}>
      <line
        x1={0}
        y1={4}
        x2={26}
        y2={4}
        stroke={color}
        strokeWidth={4}
        strokeDasharray={dashed ? "5 5" : undefined}
      />
    </svg>
    <span style={{ color: "#BDB3A0", fontSize: 24, fontWeight: 700 }}>{label}</span>
  </div>
);
