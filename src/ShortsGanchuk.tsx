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
  FIVE_KM2,
  G_EVENTS,
  SEOUL_TIMES,
  TANKER,
  TOTAL_KM2,
  ZONE_XY,
  areaUpTo,
  dikePath,
  polyPath,
  yearLabel,
} from "./data/ganchuk";
import { project } from "./data/places";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, SAFE_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(4.5 * FPS);

const BEATS = G_EVENTS.map((e) =>
  beatFor(e.year, { title: e.title, detail: e.detail }, e.impact ?? 0.4, FPS)
);
/**
 * creep을 0으로 둔다.
 *
 * 값이 연도라 체류 중에 조금이라도 나아가면 화면 위 숫자가 1984년
 * 자막 옆에서 1986년을 가리킨다. 다른 편은 값이 촘촘해서 티가 안 났지만
 * 여기서는 사건 사이가 열 해씩 벌어져 있어 바로 보인다.
 */
const SPANS = layoutBeats(BEATS, HOOK, 0);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(11 * FPS);
export const GANCHUK_DURATION = BODY_END + OUTRO;

function yearAt(frame: number): number {
  return valueAtBeats(SPANS, frame, 2010.6);
}

function frameOfEvent(i: number): number {
  return SPANS[i]?.t1 ?? HOOK;
}

const SHOTS: Shot[] = [
  { at: HOOK - 24, cx: 430, cy: 700, z: 2.2 },
  ...SPANS.flatMap((sp, i) => {
    const e = G_EVENTS[i];
    const z0 = ZONE_XY.find((d) => d.id === e.zone);
    const q = z0 ?? { x: 430, y: 700 };
    const z = e.zoom ?? 2.6;
    /*
     * 자막이 아래 3분의 1을 먹으므로 대상을 화면 가운데에 두면 가려진다.
     * 카메라 중심을 아래로 내려 대상이 위쪽 40% 자리에 앉게 한다.
     */
    const viewH = (1000 / z) * (1920 / 1080);
    const cy = q.y + viewH * 0.14;
    return [
      { at: sp.t1, cx: q.x, cy, z },
      { at: sp.t2, cx: q.x, cy, z },
    ];
  }),
  // 마무리 — 서해안 전체가 한 화면에 들어와야 직선들이 같이 보인다
  { at: BODY_END + Math.round(1.6 * FPS), cx: 420, cy: 700, z: 1.9 },
];

const LAND = "#231E16";
const COAST = "#4A4231";
/** 막은 선 — 바다 위에 그은 것이라 뭍과 다른 색이어야 한다 */
const DIKE = "#F0C877";
/** 아직 바다인 동안 */
const SEA = "#1B3A46";
const SEA_EDGE = "#3E6B80";
/** 막아서 생긴 땅. 뭍(#231E16)보다 밝게 둬야 '새로 생긴 것'으로 읽힌다. */
const MADE = "#8A6B33";
const EDGE = "#F0C877";

export const ShortsGanchuk: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const year = yearAt(frame);
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? G_EVENTS[bi] : null;
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

  const tanker = project(TANKER.lon, TANKER.lat);
  const shipOn = ev?.tanker ? Math.max(0.25, near) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-gc.wav")} volume={0.9} />

      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND} stroke={COAST} strokeWidth={u(1.6)} />
          ))}

          {ZONE_XY.map((z) => {
            const span = SPANS[G_EVENTS.findIndex((e) => e.zone === z.id)];
            if (!span) return null;
            // 방조제가 그어지고, 다 그어지면 갇힌 물이 땅으로 바뀐다.
            const draw = interpolate(frame, [span.t1, span.t1 + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const turn = interpolate(frame, [span.t1 + 18, span.t1 + 44], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            if (draw <= 0) return null;
            return (
              <g key={z.id}>
                {/* 갇힌 물 → 땅. 색이 바뀌는 것이 이 편의 전부다. */}
                <path
                  d={polyPath(z)}
                  fill={turn > 0 ? MADE : SEA}
                  opacity={0.25 + turn * 0.7}
                />
                {/* 테두리가 있어야 얼룩이 아니라 영역으로 읽힌다 */}
                <path
                  d={polyPath(z)}
                  fill="none"
                  stroke={turn > 0.3 ? EDGE : SEA_EDGE}
                  strokeWidth={u(2.2)}
                  strokeLinejoin="round"
                  opacity={0.5 + turn * 0.5}
                />
                {/* 사람이 그은 쪽만 굵게 */}
                <path
                  d={dikePath(z, draw)}
                  fill="none"
                  stroke={DIKE}
                  strokeWidth={u(9)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {turn > 0.6 && labelFits(z.x, z.name.length) && (
                  <text
                    x={z.x}
                    y={z.y + u(9) + u(z.dy ?? 0)}
                    textAnchor="middle"
                    fontSize={u(26)}
                    fontWeight={900}
                    fill="#F3E4BE"
                    style={{ paintOrder: "stroke", stroke: "#100E0A", strokeWidth: u(6) }}
                  >
                    {z.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* 1984년, 물길에 가라앉힌 22만 6천 톤 */}
          {shipOn > 0.02 && (
            <g transform={`translate(${tanker.x} ${tanker.y})`} opacity={shipOn}>
              <rect x={-u(16)} y={-u(4)} width={u(32)} height={u(8)} rx={u(3)} fill="#EDE5D4" />
              <rect x={u(5)} y={-u(10)} width={u(7)} height={u(7)} fill="#EDE5D4" />
            </g>
          )}
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,8,6,0.9) 0%, rgba(10,8,6,0.5) 14%, rgba(10,8,6,0) 26%, rgba(10,8,6,0) 56%, rgba(10,8,6,0.76) 74%, rgba(10,8,6,0.95) 88%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 연도 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: SAFE_X, right: SAFE_X }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            바다를 막아 만든 땅
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                color: C.text,
                fontSize: 96,
                fontWeight: 900,
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.round(areaUpTo(year)).toLocaleString()}
            </span>
            <span style={{ color: C.text, fontSize: 44, fontWeight: 800 }}>km²</span>
            <span style={{ color: C.dim, fontSize: 32, fontWeight: 700, marginLeft: 10 }}>
              {yearLabel(year)}
            </span>
          </div>
        </div>
      )}

      {/* ── 사건 ── */}
      {ev && mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 330, left: SAFE_X, right: SAFE_RIGHT }}>
          <div style={{ color: DIKE, fontSize: 34, fontWeight: 900 }}>
            {ev.kicker}
          </div>
          <Typed
            text={ev.title}
            start={frameOfEvent(bi)}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1.06,
              marginTop: 4,
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
              fontSize: 38,
              fontWeight: 500,
              marginTop: 8,
            }}
          />
        </div>
      )}

      {/* ── 고지 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: BOTTOM_INSET, left: SAFE_X, right: SAFE_RIGHT }}>
          <div style={{ color: "#8A8070", fontSize: 20, lineHeight: 1.4 }}>
            연도와 면적은 기록값 · 면은 만의 모양을 따르되 정밀 측량은 아니다
            <br />
            면적이 기록으로 확인되는 다섯 곳만 그렸다 (고정댓글)
          </div>
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(10,8,6,0) 24%, rgba(10,8,6,0.74) 40%, rgba(10,8,6,0.95) 54%)",
              opacity: outroIn,
              pointerEvents: "none",
            }}
          />
          <AbsoluteFill
            style={{ justifyContent: "flex-end", padding: `0 ${SAFE_X}px 200px`, opacity: outroIn }}
          >
            {/* 덩어리는 둘. 숫자 한 줄과 닫는 말. */}
            <div style={{ color: C.dim, fontSize: 32, fontWeight: 700, marginBottom: 10 }}>
              전국 간척지 누계 — 화면의 다섯은 {Math.round(FIVE_KM2)}km²
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
              <span
                style={{
                  color: DIKE,
                  fontSize: 128,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {TOTAL_KM2.toLocaleString()}
              </span>
              <span style={{ color: DIKE, fontSize: 54, fontWeight: 800 }}>km²</span>
              <span style={{ color: C.text, fontSize: 44, fontWeight: 700, marginLeft: 8 }}>
                서울 면적의 {SEOUL_TIMES.toFixed(1)}배
              </span>
            </div>

            <div style={{ height: 1, background: "#3B342A", margin: "30px 0 20px" }} />
            <div
              style={{
                color: C.text,
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1.34,
                opacity: interpolate(
                  frame,
                  [BODY_END + Math.round(2.2 * FPS), BODY_END + Math.round(2.8 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              서해안 지도에서 직선인 곳은
              <br />
              사람이 그은 선이다
            </div>
          </AbsoluteFill>
        </>
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
              text="1968년부터 서해를 막기 시작했다"
              start={4}
              cps={30}
              style={{ display: "block", color: C.dim, fontSize: 40, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="1,351"
                start={42}
                cps={9}
                style={{
                  color: DIKE,
                  fontSize: 250,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: -6,
                }}
              />
              <Typed
                text="km²"
                start={54}
                cps={8}
                style={{ color: C.text, fontSize: 88, fontWeight: 800, marginLeft: 10 }}
              />
            </div>
            <Typed
              text="바다를 막아 만든 땅, 서울 면적의 두 배가 넘는다"
              start={72}
              cps={22}
              style={{
                display: "block",
                color: C.text,
                fontSize: 44,
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
