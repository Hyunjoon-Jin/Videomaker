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
  CUT,
  FEEDS,
  PLANT_XY,
  P_EVENTS,
  SOUTH_KW,
  TOTAL_KW,
  radiusOf,
  yearLabel,
} from "./data/power";
import { project } from "./data/places";
import { Shot, cameraAt } from "./mapcam";
import { beatIndexAt, beatOf, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(4.5 * FPS);

const BEATS = P_EVENTS.map((e) =>
  beatOf(e.year, e.impact ?? 0.4, FPS, e.detail ? {} : { hold: 1.9, travel: 0.7 })
);
const SPANS = layoutBeats(BEATS, HOOK, 0.22);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(10 * FPS);
export const POWER_DURATION = BODY_END + OUTRO;

/** 마무리 — 해방 당시 설비를 남북으로 갈라 세운다 */
const SPLIT: Array<[string, string]> = [
  ["수력", "158만 6천kW · 그중 남한 6만 2천"],
  ["화력", "13만 7천kW · 전부 남한"],
  ["합계", "172만 3천kW · 남한 몫 11.5%"],
];

function yearAt(frame: number): number {
  return valueAtBeats(SPANS, frame, 1949);
}

function frameOfEvent(i: number): number {
  return SPANS[i]?.t1 ?? HOOK;
}

const SHOTS: Shot[] = [
  { at: HOOK - 24, cx: 470, cy: 500, z: 1.5 },
  ...SPANS.flatMap((sp, i) => {
    const e = P_EVENTS[i];
    if (!e.focus) return [];
    const q = project(e.focus[0], e.focus[1]);
    return [
      { at: sp.t1, cx: q.x, cy: q.y, z: e.zoom ?? 2.4 },
      { at: sp.t2, cx: q.x, cy: q.y, z: e.zoom ?? 2.4 },
    ];
  }),
  { at: BODY_END + Math.round(1.8 * FPS), cx: 462, cy: 560, z: 1.45 },
];

const LAND = "#221E16";
const COAST = "#4E4736";
/** 살아 있는 발전소 */
const LIVE = INK.flame;
/** 끊긴 뒤의 북측 */
const DEAD = "#6A6252";

export const ShortsPower: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const year = yearAt(frame);
  const cut = year >= CUT;
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? P_EVENTS[bi] : null;
  const near = bi >= 0 ? Math.max(0, 1 - (frame - SPANS[bi].t1) / 26) : 0;
  const impact = (ev?.impact ?? 0) * near;

  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const mapIn = interpolate(frame, [HOOK - 8, HOOK + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cam = cameraAt(SHOTS, frame);
  const u = (px: number) => px / (1.08 * cam.z);
  const labelFits = (x: number, chars: number) => {
    const w = u(20) * chars;
    return x - w > cam.x + u(16) && x + w < cam.x + cam.w - u(16);
  };

  /** 발전소는 살아 있는 동안 미세하게 뛴다 */
  const pulse = 1 + 0.05 * Math.sin(frame / 7);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-pw.wav")} volume={0.9} />

      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND} stroke={COAST} strokeWidth={u(1.6)} />
          ))}

          {/* 북에서 남으로 오던 전기. 실제 선로가 아니라 공급 관계다. */}
          {FEEDS.filter((f) => year >= f.from).map((f) => (
            <path
              key={f.id}
              d={f.d}
              fill="none"
              stroke={cut ? DEAD : LIVE}
              strokeWidth={u(cut ? 2.4 : 3.4)}
              strokeDasharray={cut ? `${u(10)} ${u(12)}` : undefined}
              strokeLinecap="round"
              opacity={cut ? 0.5 : 0.55}
            />
          ))}

          {PLANT_XY.filter((p) => year >= p.from).map((p) => {
            const off = p.north && cut;
            const r = u(radiusOf(p.kw)) * (off ? 1 : pulse);
            const col = off ? DEAD : p.ship ? INK.indigoHot : LIVE;
            return (
              <g key={p.name}>
                <circle cx={p.x} cy={p.y} r={r} fill={col} opacity={off ? 0.22 : 0.28} />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill="none"
                  stroke={col}
                  strokeWidth={u(3)}
                  opacity={off ? 0.6 : 1}
                />
                <circle cx={p.x} cy={p.y} r={u(4)} fill={col} />
                {labelFits(p.x, p.name.length) && (
                  <text
                    x={p.side === "left" ? p.x - r - u(9) : p.x + r + u(9)}
                    y={p.y + u(8) + u(p.dy ?? 0)}
                    textAnchor={p.side === "left" ? "end" : "start"}
                    fontSize={u(26)}
                    fontWeight={900}
                    fill={off ? "#8E8474" : p.ship ? "#9FC2DA" : "#FFE0A0"}
                    style={{ paintOrder: "stroke", stroke: "#100E0A", strokeWidth: u(6) }}
                  >
                    {p.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* 38선 — 이 편의 사건은 이 선을 넘어오던 전기가 끊긴 것이다 */}
          <line
            x1={0}
            y1={project(127, 38).y}
            x2={1000}
            y2={project(127, 38).y}
            stroke={cut ? INK.oxide : "#5A5344"}
            strokeWidth={u(cut ? 2.6 : 1.6)}
            strokeDasharray={`${u(11)} ${u(9)}`}
            opacity={cut ? 0.7 : 0.4}
          />
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,8,6,0.94) 0%, rgba(10,8,6,0.55) 12%, rgba(10,8,6,0) 22%, rgba(10,8,6,0) 60%, rgba(10,8,6,0.74) 76%, rgba(10,8,6,0.95) 88%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 44%, ${
            ev?.cut ? "rgba(179,58,43," : "rgba(217,116,31,"
          }${impact * 0.2}) 0%, rgba(0,0,0,0) 58%)`,
          pointerEvents: "none",
        }}
      />

      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", top: 104, left: 60, right: 60 }}>
          {/* 이 자리는 이 영상이 무엇을 보는 중인지 계속 말해준다.
              전에는 '한반도 발전설비'라고만 적혀 있어 연표처럼 읽혔다. */}
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {cut ? "북에서 오던 전기가 끊긴 뒤" : "전기를 만드는 곳"}
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {yearLabel(year)}
          </div>
        </div>
      )}

      {ev && mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 306, left: 60, right: 60 }}>
          <div style={{ color: ev.cut ? "#D4694F" : INK.flame, fontSize: 34, fontWeight: 900 }}>
            {ev.cut
              ? "1948년 5월 14일 정오"
              : year >= CUT
                ? "단전 이후"
                : ev.side === "north"
                  ? "북쪽"
                  : ev.side === "south"
                    ? "남쪽"
                    : "남과 북"}
          </div>
          <Typed
            text={ev.title}
            start={frameOfEvent(bi)}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.06,
              marginTop: 4,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          />
          {ev.detail && (
            <Typed
              text={ev.detail}
              start={frameOfEvent(bi) + Math.ceil((ev.title.length * 30) / 14) + 5}
              cps={26}
              style={{
                display: "block",
                color: "#BDB3A0",
                fontSize: 38,
                fontWeight: 500,
                marginTop: 8,
              }}
            />
          )}
        </div>
      )}

      {inOutro && (
        <>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(10,8,6,0) 26%, rgba(10,8,6,0.72) 42%, rgba(10,8,6,0.95) 56%)",
              opacity: outroIn,
              pointerEvents: "none",
            }}
          />
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              padding: "0 60px 232px",
              opacity: outroIn,
            }}
          >
            <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, marginBottom: 14 }}>
              해방 당시 한반도 발전설비
            </div>
            {SPLIT.map(([k, v], i) => (
              <div
                key={k}
                style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 6 }}
              >
                <span
                  style={{
                    color: C.dim,
                    fontSize: 38,
                    fontWeight: 700,
                    minWidth: 110,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    color: i === 2 ? C.text : INK.flame,
                    fontSize: 44,
                    fontWeight: 900,
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: "#3B342A", margin: "26px 0 16px" }} />
            <div style={{ color: C.text, fontSize: 50, fontWeight: 800, lineHeight: 1.34 }}>
              압록강 수풍 하나가 60만kW,
              <br />
              남한 전체를 합친 것의 세 배였다
            </div>
          </AbsoluteFill>
        </>
      )}

      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 62, left: 60, right: 60 }}>
          <div style={{ display: "flex", gap: 22, marginBottom: 10, flexWrap: "wrap" }}>
            <Key color={LIVE} label="가동 중" />
            <Key color={DEAD} label="끊긴 공급" />
            <Key color={INK.indigoHot} label="발전함" />
            <span style={{ color: C.dim, fontSize: 23, fontWeight: 700 }}>
              원 크기 = 설비용량
            </span>
          </div>
          <div style={{ color: "#8A8070", fontSize: 20 }}>
            용량과 연도는 기록값 · 선은 실제 선로가 아니라 공급 관계 (고정댓글)
          </div>
        </div>
      )}

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
              text="1948년 5월 14일 정오, 전기가 끊겼다"
              start={4}
              cps={30}
              style={{ display: "block", color: C.dim, fontSize: 40, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="11.5"
                start={40}
                cps={7}
                style={{
                  color: INK.flame,
                  fontSize: 240,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="%"
                start={52}
                cps={8}
                style={{ color: C.text, fontSize: 118, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="그때 남한에 있던 발전설비의 몫"
              start={70}
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

const Key: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <svg width={24} height={24}>
      <circle cx={12} cy={12} r={9} fill={color} opacity={0.28} />
      <circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={2.6} />
    </svg>
    <span style={{ color: "#BDB3A0", fontSize: 23, fontWeight: 700 }}>{label}</span>
  </div>
);
