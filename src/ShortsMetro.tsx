import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  BY_SIDO,
  EAST,
  HOLD,
  HOOK_SEC,
  LAPS,
  LOOP,
  LOOP_KM,
  LOOP_STATIONS,
  NORTH,
  OUTRO_SEC,
  OUTSIDE,
  PATH_STATIONS,
  SEG,
  SOUTH,
  SPAN_KM,
  STATIONS,
  VOICE,
  VOICE_ESTIMATED,
} from "./data/metro";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, TEXT_X } from "./safe";

/** BGM은 나레이션이 온 뒤에 고른다 */
const HAS_BGM = false;

const BG = "#0E1418";
const LAND = "#2F2820";
/** 노선망 */
const RAIL = "#5E7C86";
const HOT = "#D4694F";
const INK = "#EDE5D4";
const DIM = "#8E8474";

const HOOK = Math.round(HOOK_SEC * FPS);

const SLOTS: Array<{ t0: number; t1: number }> = [];
{
  let f = HOOK;
  HOLD.forEach((h) => {
    const len = Math.round(h * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
export const METRO_DURATION = BODY_END + Math.round(OUTRO_SEC * FPS);

const ASPECT = 1920 / 1080;
/** 카메라가 겨누는 자리가 화면 세로 어디에 오는지 */
const CENTER_Y = 800;
const FLY = Math.round(0.8 * FPS);

interface Cam {
  cx: number;
  cy: number;
  w: number;
}

function fit(pts: [number, number][], pad: number, min: number): Cam {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    w: Math.max((x1 - x0) * pad, ((y1 - y0) * pad) / ASPECT, min),
  };
}

const ALL: [number, number][] = SEG.flatMap((s) => [
  [s[0], s[1]],
  [s[2], s[3]],
]) as [number, number][];

/* ── 걸음마다 카메라가 어디를 보나 ──
   21편은 좁은 데로 파고들었고 이 편은 반대로 **계속 빠진다.**
   자(2호선)를 화면에 먼저 크게 세워 두고, 그 자가 작아지는 것으로
   크기를 말한다. */
const AT: Cam[] = [
  fit(LOOP, 1.7, 40), // 1  2호선 — 자를 세운다
  fit([[SOUTH.x, SOUTH.y]], 1, 90), // 2  신창
  fit([[NORTH.x, NORTH.y]], 1, 90), // 3  연천
  fit([[EAST.x, EAST.y]], 1, 90), // 4  춘천
  fit(ALL, 1.24, 60), // 5  다 빠진다
];
const START = AT[0];

function blend(a: Cam, b: Cam, t: number, arc: number): Cam {
  const e =
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lift = Math.sin(Math.PI * e) * arc;
  return {
    cx: a.cx + (b.cx - a.cx) * e,
    cy: a.cy + (b.cy - a.cy) * e,
    w: Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * e + lift),
  };
}

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

function camAt(frame: number): Cam {
  if (frame < HOOK) return START;
  const i = Math.min(beatAt(frame), AT.length - 1);
  const from = i === 0 ? START : AT[i - 1];
  const t = (frame - SLOTS[i].t0) / FLY;
  /** 남 → 북 → 동으로 건너뛸 때만 살짝 띄운다 */
  const arc = i >= 2 && i <= 3 ? 0.28 : 0;
  return blend(from, AT[i], t, arc);
}

export const ShortsMetro: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 12, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const age = frame - SLOTS[bi].t0;
  const settle = interpolate(age, [FLY - 8, FLY + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cam = camAt(frame);
  const px = cam.w / 1080;
  const vx = cam.cx - cam.w / 2;
  const vy = cam.cy - CENTER_Y * px;
  const viewBox = `${vx} ${vy} ${cam.w} ${cam.w * ASPECT}`;
  /** 지도 좌표 → 화면 좌표. 이름표는 HTML로 얹는다 */
  const sx = (x: number) => (x - vx) / px;
  const sy = (y: number) => (y - vy) / px;

  /** 2호선을 붉게 짚는 걸음 */
  const loopOn = started && bi === 0 ? settle : bi > 0 ? 0.34 : 0;
  /** 신창~연천 자를 대는 걸음 */
  const spanOn =
    started && bi >= 4
      ? interpolate(age, [FLY, FLY + Math.round(0.9 * FPS)], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const ends = [
    { p: SOUTH, from: 1 },
    { p: NORTH, from: 2 },
    { p: EAST, from: 3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      {HAS_BGM && <Audio src={staticFile("bgm-mt.wav")} volume={0.4} />}
      {!VOICE_ESTIMATED &&
        VOICE.map((v, i) => {
          const at =
            i === 0 ? 0 : i <= SLOTS.length ? SLOTS[i - 1].t0 + 4 : BODY_END + 6;
          return (
            <Audio
              key={v.file}
              src={staticFile(v.file)}
              volume={(f) =>
                f >= at && f < at + Math.round(v.sec * FPS) + 4 ? 1 : 0
              }
            />
          );
        })}

      <svg
        viewBox={viewBox}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {REGIONS.map((r) => (
          <path key={r.code} d={r.d} fill={LAND} stroke={BG} strokeWidth={px} />
        ))}

        {/* 노선망 844구간. 0프레임부터 다 그려져 있다 */}
        {SEG.map((s, i) => (
          <line
            key={i}
            x1={s[0]}
            y1={s[1]}
            x2={s[2]}
            y2={s[3]}
            stroke={RAIL}
            strokeWidth={px * 3}
            strokeLinecap="round"
          />
        ))}

        {/* 2호선 순환선 — 이 편의 자 */}
        {loopOn > 0 && (
          <polyline
            points={LOOP.map((p) => `${p[0]},${p[1]}`).join(" ")}
            fill="none"
            stroke={HOT}
            strokeWidth={px * 6}
            strokeLinejoin="round"
            opacity={loopOn}
          />
        )}

        {/* 신창 ↔ 연천. 47km 눈금이 세 칸 찬다 */}
        {spanOn > 0 && (
          <g opacity={spanOn}>
            <line
              x1={SOUTH.x}
              y1={SOUTH.y}
              x2={SOUTH.x + (NORTH.x - SOUTH.x) * spanOn}
              y2={SOUTH.y + (NORTH.y - SOUTH.y) * spanOn}
              stroke={HOT}
              strokeWidth={px * 5}
              strokeLinecap="round"
            />
            {[1, 2, 3].map((k) => {
              const f = (k * LOOP_KM) / SPAN_KM;
              if (f > spanOn) return null;
              const x = SOUTH.x + (NORTH.x - SOUTH.x) * f;
              const y = SOUTH.y + (NORTH.y - SOUTH.y) * f;
              const dx = -(NORTH.y - SOUTH.y);
              const dy = NORTH.x - SOUTH.x;
              const n = Math.hypot(dx, dy);
              const L = px * 22;
              return (
                <line
                  key={k}
                  x1={x - (dx / n) * L}
                  y1={y - (dy / n) * L}
                  x2={x + (dx / n) * L}
                  y2={y + (dy / n) * L}
                  stroke={INK}
                  strokeWidth={px * 4}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        )}

        {/* 네 끝 */}
        {ends.map(
          ({ p, from }) =>
            started &&
            bi >= from && (
              <circle
                key={p.name}
                cx={p.x}
                cy={p.y}
                r={px * (bi === from ? 12 : 8)}
                fill={HOT}
                stroke={BG}
                strokeWidth={px * 3}
              />
            )
        )}
      </svg>

      {/* 이름표는 화면 좌표에 얹는다. 배율이 달라도 글자 크기가 안 흔들린다 */}
      {started &&
        ends.map(({ p, from }) => {
          if (bi < from) return null;
          const on = bi === from ? settle : 1;
          /** 오른쪽에 붙은 점은 이름표를 왼쪽으로 넘긴다.
              다 빠진 걸음에서 춘천이 화면 밖으로 잘렸다 */
          const flip = sx(p.x) > 680;
          return (
            <div
              key={p.name}
              style={{
                position: "absolute",
                ...(flip
                  ? { right: 1080 - sx(p.x) + 24, textAlign: "right" as const }
                  : { left: sx(p.x) + 24 }),
                top: sy(p.y) - 30,
                opacity: on,
                color: INK,
                fontWeight: 900,
                textShadow: `0 0 26px ${BG}, 0 0 10px ${BG}`,
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ fontSize: 44 }}>{p.name}</div>
              <div style={{ fontSize: 26, color: DIM }}>
                {p.sido} {p.sigungu}
              </div>
            </div>
          );
        })}

      {/* 글자 자리를 비운다 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 620,
          background: `linear-gradient(to bottom, ${BG}00 0%, ${BG}D9 38%, ${BG} 64%)`,
        }}
      />

      {/* ── 자막 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 52,
            opacity: settle,
          }}
        >
          {bi === 0 && (
            <>
              <div style={cap}>2호선 한 바퀴</div>
              <div style={big}>
                {LOOP_STATIONS}역 · {LOOP_KM}km
              </div>
              <div style={note}>여기서부터 이걸 자로 쓴다</div>
            </>
          )}
          {bi === 1 && (
            <>
              <div style={cap}>남쪽 끝</div>
              <div style={big}>
                {SOUTH.sido} {SOUTH.sigungu}
              </div>
            </>
          )}
          {bi === 2 && (
            <>
              <div style={cap}>북쪽 끝</div>
              <div style={big}>북위 {NORTH.lat}도</div>
              <div style={note}>38선보다 북쪽</div>
            </>
          )}
          {bi === 3 && (
            <>
              <div style={cap}>동쪽 끝</div>
              <div style={big}>
                {EAST.sido} {EAST.sigungu}
              </div>
            </>
          )}
          {bi >= 4 && (
            <>
              <div style={cap}>
                {SOUTH.name} ↔ {NORTH.name} 직선 {SPAN_KM}km
              </div>
              <div style={big}>2호선 {Math.floor(LAPS)}바퀴</div>
              <div style={note}>
                1호선 완행으로 {PATH_STATIONS}역
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 마무리는 질문으로 연다 ── */}
      {inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 52,
            opacity: outroIn,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 50,
              fontWeight: 900,
              lineHeight: 1.24,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div>
              역 {STATIONS}곳 가운데
            </div>
            <div>
              수도권 밖 <span style={{ color: HOT }}>{OUTSIDE.length}곳</span>
            </div>
          </div>
          <div
            style={{
              color: DIM,
              fontSize: 30,
              fontWeight: 700,
              marginTop: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            충남 {BY_SIDO["충남"]} · 강원 {BY_SIDO["강원"]}
          </div>
          <div
            style={{
              color: INK,
              fontSize: 46,
              fontWeight: 900,
              marginTop: 22,
              lineHeight: 1.2,
            }}
          >
            가장 멀리 가 보신 역은 어디인가요?
          </div>
        </div>
      )}

      {/* ── 훅 — 답이 아니라 질문이다 ── */}
      {hookOut > 0 && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 52,
            opacity: hookOut,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 78,
              fontWeight: 900,
              lineHeight: 1.18,
            }}
          >
            수도권 전철
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 78,
              fontWeight: 900,
              lineHeight: 1.18,
              marginTop: 4,
            }}
          >
            어디까지 갈까요?
          </div>
        </div>
      )}

      {/* 무엇을 세고 어디서 잰 값인지는 다 적는다 */}
      <div
        style={{
          position: "absolute",
          left: TEXT_X,
          right: SAFE_RIGHT,
          bottom: BOTTOM_INSET + 14,
          color: DIM,
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {inOutro
          ? "거리는 역 사이 직선"
          : `수도권 전철 ${STATIONS}역 · 거리는 역 사이 직선`}
      </div>

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};

const cap: React.CSSProperties = {
  color: DIM,
  fontSize: 36,
  fontWeight: 900,
};
const big: React.CSSProperties = {
  color: INK,
  fontSize: 84,
  fontWeight: 900,
  lineHeight: 1.06,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
};
const note: React.CSSProperties = {
  color: HOT,
  fontSize: 34,
  fontWeight: 900,
  marginTop: 8,
};
