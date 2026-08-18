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
  STATIONS,
  partialPath,
  railEventAt,
  splitAt,
} from "./data/rail";
import { project } from "./data/places";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;
const VIEWBOX: string = provinces.viewBox;

const HOOK = Math.round(2.2 * FPS);

/**
 * 사건마다 시간을 준다.
 * 연도 구간에 초를 배분하면 도라산(2002)과 KTX(2004)가 0.6초 간격으로
 * 지나간다. 자막을 읽을 시간이 없다.
 */
/** 체류 시간은 자막 길이가 정한다 — beats.ts의 beatFor 주석 참고 */
const BEATS = RAIL_EVENTS.map((e) =>
  beatFor(e.year, { title: e.title, detail: e.detail }, e.impact ?? 0.4, FPS)
);
const SPANS = layoutBeats(BEATS, HOOK, 0.22);
/**
 * 마무리.
 *
 * 마지막 사건이 끝나자마자 화면이 꺼져서 뚝 끊기는 느낌이었다.
 * 태풍 편처럼 지금까지 본 것을 한 장으로 세우고 닫는다.
 */
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(9 * FPS);
export const RAIL_DURATION = BODY_END + OUTRO;

function yearAt(frame: number): number {
  return valueAtBeats(SPANS, frame, 2026);
}

/** 사건이 화면에 뜨는 프레임 = 카메라가 도착하는 프레임 */
function frameOfEvent(i: number): number {
  return SPANS[i]?.t1 ?? HOOK;
}

/** 카메라 샷 — 이동 구간에 움직이고 체류 구간에 선다 */
const SHOTS: Shot[] = [
  { at: HOOK - 24, cx: 455, cy: 520, z: 1.5 },
  ...SPANS.flatMap((sp, i) => {
    const e = RAIL_EVENTS[i];
    if (!e.focus) return [];
    const q = project(e.focus[0], e.focus[1]);
    const z = e.zoom ?? 2.2;
    return [
      { at: sp.t1, cx: q.x, cy: q.y, z },
      { at: sp.t2, cx: q.x, cy: q.y, z },
    ];
  }),
  // 마무리 — 다시 전국으로 빠져 전체를 보여준다
  { at: SPANS[SPANS.length - 1].t2 + Math.round(1.6 * FPS), cx: 455, cy: 505, z: 1.52 },
];

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
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? RAIL_EVENTS[bi] : null;
  const north = northmostAt(year);
  const cut = year >= CUT_YEAR;
  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 끊기는 순간의 충격 — 사건 직후에만 실린다 */
  const near = bi >= 0 ? Math.max(0, 1 - (frame - SPANS[bi].t1) / 26) : 0;
  const impact = (ev?.impact ?? 0) * near;

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 훅 글자는 페이드인하지 않는다. 0프레임이 곧 완성된 화면이어야 한다. */
  const hookIn = 1;
  /**
   * 지도는 0프레임부터 떠 있다.
   *
   * 전에는 훅이 끝나는 4.5초까지 검은 화면이었다. 재보니 0초에 화면이
   * 0.0%, 1.5초에 1.0%, 2.5초에 2.1% 차 있었다. 피드에서 넘길지 말지는
   * 1~2초에 정해지는데 그 구간을 통째로 빈 화면으로 쓰고 있었다.
   *
   * 이제 첫 프레임이 완성된 그림이다. 훅 글자는 그 위에 얹힌다.
   */
  const mapIn = 1;
  /** 계기판·자막이 서는 시점 — 훅 글자가 걷히고 나서 */
  const uiOn = frame >= HOOK - 4;

  const cam = cameraAt(SHOTS, frame);
  /** 화면 픽셀 → 지도 단위. 확대해도 선과 글자가 굵어지지 않게 한다. */
  const u = (px: number) => px / (1.08 * cam.z);

  /**
   * 이 지점의 라벨을 그려도 되는가.
   * 역 이름은 지도 좌표에 고정돼 있어서, 카메라가 붙으면 화면 가장자리
   * 역들이 "신의" "광주송" 하고 잘린다. 잘린 글자는 정보가 아니라
   * 고장으로 보이므로 안 들어오면 아예 그리지 않는다.
   */
  const labelFits = (x: number, chars: number) => {
    const w = u(20) * chars;
    return x - w > cam.x + u(16) && x + w < cam.x + cam.w - u(16);
  };

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

          {/* 역 이름 — 이 편만 지명이 하나도 없어 화면이 비어 보였다 */}
          {STATIONS.filter((st) => year >= st.from && st.name !== north.name).map((st) => {
            const q = project(st.lon, st.lat);
            if (!labelFits(q.x, st.name.length)) return null;
            return (
              <g key={st.name}>
                <circle
                  cx={q.x}
                  cy={q.y}
                  r={u(st.major ? 5 : 3.6)}
                  fill={C.bg}
                  stroke={LIVE}
                  strokeWidth={u(st.major ? 3 : 2.2)}
                />
                <text
                  x={q.x + u(st.side === "left" ? -13 : 13)}
                  y={q.y + u(8 + (st.dy ?? 0))}
                  textAnchor={st.side === "left" ? "end" : "start"}
                  fontSize={u(st.major ? 30 : 26)}
                  fontWeight={st.major ? 900 : 700}
                  fill={st.major ? "#E8DCC4" : "#B7A98C"}
                  style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: u(6) }}
                >
                  {st.name}
                </text>
              </g>
            );
          })}

          {/* 경의선 종점 */}
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
      {uiOn && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: TEXT_X }}>
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
      {uiOn && ev && !inOutro && (
        <div style={{ position: "absolute", bottom: 330, left: TEXT_X, right: SAFE_RIGHT }}>
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
            <span>경의선 종점</span>
            <span style={{ color: INK.brass, fontSize: 40, fontWeight: 900 }}>
              {north.name}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              북위 {north.lat.toFixed(2)}°
            </span>
          </div>
          <Typed
            text={ev.title}
            start={frameOfEvent(bi)}
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
            start={frameOfEvent(bi) + Math.ceil((ev.title.length * 30) / 14) + 5}
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

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: `0 ${TEXT_X}px ${OUTRO_PAD}px`,
            opacity: outroIn,
          }}
        >
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, marginBottom: 12 }}>
            서울역에서 경의선을 타면 닿던 곳
          </div>
          {[
            ["1906", "신의주"],
            ["1945", "개성"],
            ["1953", "문산"],
            ["2002", "도라산"],
          ].map(([y, place]) => (
            <div
              key={y}
              style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 4 }}
            >
              <span
                style={{
                  color: C.dim,
                  fontSize: 40,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 130,
                }}
              >
                {y}
              </span>
              <span style={{ color: INK.brass, fontSize: 48, fontWeight: 900 }}>
                {place}
              </span>
            </div>
          ))}
          <div style={{ height: 1, background: "#3B342A", margin: "26px 0 16px" }} />
          <div
            style={{
              color: C.text,
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.34,
            }}
          >
            도라산역 승강장에는
            <br />
            개성과 평양 방면 표기가 그대로 있다
          </div>
        </AbsoluteFill>
      )}

      {/* ── 범례와 고지 ── */}
      {uiOn && (
        <div style={{ position: "absolute", bottom: BOTTOM_INSET, left: TEXT_X, right: SAFE_RIGHT }}>
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
            background:
              "linear-gradient(180deg, rgba(21,19,16,0.58) 0%, rgba(21,19,16,0.5) 60%, rgba(21,19,16,0.4) 100%)",
            opacity: hookOut,
            justifyContent: "center",
            padding: `0 ${TEXT_X}px`,
          }}
        >
          <div style={{ opacity: hookIn }}>
            <Typed
              text="서울역에서 신의주행 표를 팔던 건 39년"
              start={-20}
              cps={400}
              style={{
                display: "block",
                color: C.dim,
                fontSize: 38,
                fontWeight: 700,
              }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="81"
                start={-20}
                cps={400}
                style={{
                  color: INK.brass,
                  fontSize: 280,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="년"
                start={-20}
                cps={400}
                style={{ color: C.text, fontSize: 94, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="그 표를 팔지 못한 시간"
              start={-20}
              cps={400}
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
      {/* 넓게 깔리는 후광. 끊긴 뒤에는 남은 구간에만 둔다 —
          이북까지 운행색으로 깔면 회색 점선 밑이 노랗게 뜬다. */}
      <path
        d={parts ? parts.south : d}
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
